import { NextResponse } from "next/server"
import { boundsAround } from "@/lib/config"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get("address")
  const reverse = searchParams.get("reverse") === "true"
  const centerLat = searchParams.get("centerLat") ?? searchParams.get("lat")
  const centerLng = searchParams.get("centerLng") ?? searchParams.get("lng")
  const openCageKey = process.env.OPENCAGE_API_KEY || process.env.OPEN_CAGE_API_KEY

  // Reverse Geocoding Mode (lat/lng -> suggested address text)
  if (reverse && centerLat && centerLng) {
    if (openCageKey && openCageKey !== "YOUR_OPENCAGE_API_KEY_HERE") {
      try {
        const revUrl = `https://api.opencagedata.com/geocode/v1/json?q=${centerLat}+${centerLng}&key=${openCageKey}&limit=1&countrycode=in`
        const res = await fetch(revUrl)
        if (res.ok) {
          const data = await res.json()
          if (data.results && data.results.length > 0) {
            return NextResponse.json({
              displayName: data.results[0].formatted,
              provider: "OpenCage",
            })
          }
        }
      } catch (e) {
        console.warn("[reverse geocode] OpenCage failed", e)
      }
    }

    // Nominatim fallback reverse geocode
    try {
      const nomRevUrl = `https://nominatim.openstreetmap.org/reverse?lat=${centerLat}&lon=${centerLng}&format=json`
      const res = await fetch(nomRevUrl, {
        headers: { "User-Agent": "DirectRoots/1.0 (directroots-fyp@example.com)" },
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.display_name) {
          return NextResponse.json({
            displayName: data.display_name,
            provider: "Nominatim",
          })
        }
      }
    } catch (e) {
      console.warn("[reverse geocode] Nominatim failed", e)
    }

    return NextResponse.json({ displayName: `${centerLat}, ${centerLng}` })
  }

  // Forward Geocoding Mode (address -> coordinates)
  if (!address?.trim()) {
    return NextResponse.json({ error: "address query param is required" }, { status: 400 })
  }

  const cleanAddress = address.trim()

  let boundsParam = ""
  if (centerLat && centerLng && !isNaN(parseFloat(centerLat)) && !isNaN(parseFloat(centerLng))) {
    const boundsStr = boundsAround(parseFloat(centerLat), parseFloat(centerLng))
    boundsParam = `&bounds=${boundsStr}`
  }

  // 1. Primary: Try OpenCage API if key is present
  if (openCageKey && openCageKey !== "YOUR_OPENCAGE_API_KEY_HERE") {
    try {
      const encoded = encodeURIComponent(cleanAddress)
      const openCageUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encoded}&key=${openCageKey}&limit=1&countrycode=in${boundsParam}`
      const res = await fetch(openCageUrl)

      if (res.ok) {
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          const first = data.results[0]
          const { lat, lng } = first.geometry
          const formatted = first.formatted
          const confidence = first.confidence ?? 7
          const resultType = first.components?._type ?? "road"

          const lowPrecisionTypes = ["city", "state", "county", "country", "province", "region"]
          const isLowPrecision = lowPrecisionTypes.includes(resultType.toLowerCase()) || confidence < 5

          return NextResponse.json({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            displayName: formatted,
            confidence,
            type: resultType,
            lowPrecision: isLowPrecision,
            found: true,
            provider: "OpenCage",
          })
        }
      }
    } catch (err) {
      console.warn("[GET /api/geocode] OpenCage failed, falling back to Nominatim", err)
    }
  }

  // 2. Fallback: OpenStreetMap Nominatim
  try {
    const encoded = encodeURIComponent(cleanAddress)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "DirectRoots/1.0 (directroots-fyp@example.com)",
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      throw new Error(`Nominatim returned ${res.status}`)
    }

    const data = await res.json()

    if (!data || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null, found: false })
    }

    const { lat, lon, display_name, type, place_rank } = data[0]
    const confidence = place_rank ? Math.min(10, Math.max(1, Math.round(place_rank / 3))) : 5
    const lowPrecisionTypes = ["city", "state", "county", "country", "administrative"]
    const isLowPrecision = lowPrecisionTypes.includes((type || "").toLowerCase()) || confidence < 5

    return NextResponse.json({
      lat: parseFloat(lat),
      lng: parseFloat(lon),
      displayName: display_name,
      confidence,
      type: type || "unknown",
      lowPrecision: isLowPrecision,
      found: true,
      provider: "Nominatim",
    })
  } catch (error) {
    console.error("[GET /api/geocode] Geocoding failed", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}

