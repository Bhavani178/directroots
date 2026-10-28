import { NextResponse } from "next/server"
import { boundsAround } from "@/lib/config"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  // Rate limit: max 25 geocode requests per minute per IP
  const rateLimit = checkRateLimit(req, "geocode", 25, 60)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many location requests. Please wait ${rateLimit.retryAfter} seconds.` },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(req.url)
  const address = searchParams.get("address")
  const reverse = searchParams.get("reverse") === "true"
  const rawCenterLat = searchParams.get("centerLat") ?? searchParams.get("lat")
  const rawCenterLng = searchParams.get("centerLng") ?? searchParams.get("lng")
  const openCageKey = process.env.OPENCAGE_API_KEY || process.env.OPEN_CAGE_API_KEY

  // Validate coordinates if provided
  let centerLat: number | null = null
  let centerLng: number | null = null
  if (rawCenterLat && rawCenterLng) {
    const parsedLat = parseFloat(rawCenterLat)
    const parsedLng = parseFloat(rawCenterLng)
    if (
      !isNaN(parsedLat) &&
      !isNaN(parsedLng) &&
      parsedLat >= -90 &&
      parsedLat <= 90 &&
      parsedLng >= -180 &&
      parsedLng <= 180
    ) {
      centerLat = parsedLat
      centerLng = parsedLng
    }
  }

  // Reverse Geocoding Mode (lat/lng -> address text)
  if (reverse && centerLat !== null && centerLng !== null) {
    if (openCageKey && openCageKey !== "YOUR_OPENCAGE_API_KEY_HERE") {
      try {
        const revUrl = `https://api.opencagedata.com/geocode/v1/json?q=${centerLat}+${centerLng}&key=${openCageKey}&limit=1&countrycode=in`
        const res = await fetch(revUrl, { signal: AbortSignal.timeout(4000) })
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
        console.warn("[reverse geocode] OpenCage request failed, falling back")
      }
    }

    // Nominatim fallback reverse geocode
    try {
      const nomRevUrl = `https://nominatim.openstreetmap.org/reverse?lat=${centerLat}&lon=${centerLng}&format=json`
      const res = await fetch(nomRevUrl, {
        headers: { "User-Agent": "DirectRoots/1.0 (directroots-market@example.com)" },
        signal: AbortSignal.timeout(4000),
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
      console.warn("[reverse geocode] Nominatim request failed")
    }

    return NextResponse.json({ displayName: `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}` })
  }

  // Forward Geocoding Mode (address -> coordinates)
  if (!address || typeof address !== "string" || !address.trim()) {
    return NextResponse.json({ error: "A valid address parameter is required" }, { status: 400 })
  }

  const cleanAddress = address.trim().slice(0, 200) // Cap query length

  let boundsParam = ""
  if (centerLat !== null && centerLng !== null) {
    const boundsStr = boundsAround(centerLat, centerLng)
    boundsParam = `&bounds=${boundsStr}`
  }

  // 1. Primary: Try OpenCage API if key is present
  if (openCageKey && openCageKey !== "YOUR_OPENCAGE_API_KEY_HERE") {
    try {
      const encoded = encodeURIComponent(cleanAddress)
      const openCageUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encoded}&key=${openCageKey}&limit=1&countrycode=in${boundsParam}`
      const res = await fetch(openCageUrl, { signal: AbortSignal.timeout(4000) })

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
      console.warn("[GET /api/geocode] OpenCage failed, falling back")
    }
  }

  // 2. Fallback: OpenStreetMap Nominatim
  try {
    const encoded = encodeURIComponent(cleanAddress)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "DirectRoots/1.0 (directroots-market@example.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return NextResponse.json({ lat: null, lng: null, found: false })
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
    console.error("[GET /api/geocode] Geocoding service error")
    return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 503 })
  }
}
