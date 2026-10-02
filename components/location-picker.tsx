"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Search, MapPin, Navigation, AlertTriangle, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const DEFAULT_CENTER_LAT = 17.91331 // Bidar default center
const DEFAULT_CENTER_LNG = 77.53011

interface LocationPickerProps {
  initialLat?: number | null
  initialLng?: number | null
  initialAddress?: string | null
  onConfirmLocation: (lat: number, lng: number, addressText?: string) => void
  confirmButtonText?: string
}

export default function LocationPicker({
  initialLat,
  initialLng,
  initialAddress,
  onConfirmLocation,
  confirmButtonText = "Confirm Pin Location",
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [lat, setLat] = useState<number>(initialLat && !isNaN(initialLat) ? initialLat : DEFAULT_CENTER_LAT)
  const [lng, setLng] = useState<number>(initialLng && !isNaN(initialLng) ? initialLng : DEFAULT_CENTER_LNG)
  const [addressInput, setAddressInput] = useState<string>(initialAddress || "")
  const [suggestedAddress, setSuggestedAddress] = useState<string>(initialAddress || "")

  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [lowPrecisionWarning, setLowPrecisionWarning] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Reverse geocode suggested address (non-blocking)
  const reverseGeocode = async (targetLat: number, targetLng: number) => {
    try {
      const res = await fetch(`/api/geocode?reverse=true&lat=${targetLat}&lng=${targetLng}`)
      if (res.ok) {
        const data = await res.json()
        if (data.displayName) {
          setSuggestedAddress(data.displayName)
          if (!addressInput) {
            setAddressInput(data.displayName)
          }
        }
      }
    } catch (e) {
      console.warn("Reverse geocoding failed", e)
    }
  }

  // Initialize Map and Marker once
  useEffect(() => {
    if (!containerRef.current) return

    if (!mapRef.current) {
      if ((containerRef.current as any)._leaflet_id) {
        (containerRef.current as any)._leaflet_id = null
      }

      const map = L.map(containerRef.current).setView([lat, lng], 13)
      mapRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      const pinIcon = L.divIcon({
        html: `<div style="background:#2563eb;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3)">📍</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map)
      markerRef.current = marker

      // Drag event handler
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng()
        setLat(parseFloat(pos.lat.toFixed(6)))
        setLng(parseFloat(pos.lng.toFixed(6)))
        reverseGeocode(pos.lat, pos.lng)
      })

      // Map click event handler
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: newLat, lng: newLng } = e.latlng
        setLat(parseFloat(newLat.toFixed(6)))
        setLng(parseFloat(newLng.toFixed(6)))
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng])
        }
        reverseGeocode(newLat, newLng)
      })
    }
  }, [])

  // Update map view & marker when lat/lng state changes programmatically
  const updateMapPosition = (newLat: number, newLng: number, zoomLevel = 14) => {
    setLat(parseFloat(newLat.toFixed(6)))
    setLng(parseFloat(newLng.toFixed(6)))
    if (mapRef.current) {
      mapRef.current.setView([newLat, newLng], zoomLevel)
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng])
    }
  }

  // Handle Forward Geocoding (Address Search)
  const handleAddressSearch = async () => {
    if (!addressInput.trim()) return
    setIsGeocoding(true)
    setLowPrecisionWarning(false)
    setGpsError(null)

    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput)}&lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found && data.lat && data.lng) {
          updateMapPosition(data.lat, data.lng, 15)
          setSuggestedAddress(data.displayName || addressInput)
          if (data.lowPrecision) {
            setLowPrecisionWarning(true)
          }
        } else {
          setGpsError("Address not found. Try entering landmark or city name.")
        }
      }
    } catch (e) {
      setGpsError("Geocoding service unavailable. Please drag the pin on map manually.")
    } finally {
      setIsGeocoding(false)
    }
  }

  // Handle GPS Current Location
  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported by your browser.")
      return
    }

    setIsGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        updateMapPosition(userLat, userLng, 16)
        reverseGeocode(userLat, userLng)
        setIsGpsLoading(false)
      },
      (err) => {
        setIsGpsLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location access denied. Please allow GPS permission in your browser or drag the pin manually.")
        } else {
          setGpsError("Could not retrieve GPS location. Please drag the pin on the map.")
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  // Confirm and Save Exact Pin Coordinates
  const handleConfirm = () => {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGpsError("Invalid latitude/longitude coordinates.")
      return
    }
    onConfirmLocation(lat, lng, suggestedAddress || addressInput)
  }

  const isUnconfirmedDefault = Math.abs(lat - DEFAULT_CENTER_LAT) < 0.0001 && Math.abs(lng - DEFAULT_CENTER_LNG) < 0.0001

  return (
    <div className="space-y-4 rounded-xl border border-[#6B8E23] bg-card p-4 shadow-sm">
      {/* Search Bar & GPS Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search city, colony or landmark..."
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddressSearch}
            disabled={isGeocoding}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={isGpsLoading}
          className="gap-2 shrink-0"
        >
          {isGpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-primary" />}
          Use My GPS Location
        </Button>
      </div>

      {/* Warnings & Alerts */}
      {lowPrecisionWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>We couldn't find your exact colony, please drag the pin to your exact location.</span>
        </div>
      )}

      {gpsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {gpsError}
        </div>
      )}

      {/* Map Container */}
      <div className="relative overflow-hidden rounded-lg border border-[#6B8E23]">
        <div ref={containerRef} style={{ height: "300px", width: "100%" }} />
        <div className="absolute bottom-2 left-2 z-[400] rounded-md bg-background/90 px-2 py-1 text-[11px] font-mono shadow-xs backdrop-blur">
          Pin: {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3 text-primary shrink-0" />
        Click or drag the blue marker to set your exact location.
      </p>

      {/* Confirm Button */}
      <Button 
        type="button" 
        onClick={handleConfirm} 
        disabled={isUnconfirmedDefault}
        className="w-full gap-2 font-semibold"
      >
        <Check className="h-4 w-4" />
        {isUnconfirmedDefault 
          ? "Drag pin to delivery location" 
          : `${confirmButtonText} (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
      </Button>
    </div>
  )
}
