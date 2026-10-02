"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export default function DeliveryMap({ routeData }: { routeData: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || !routeData?.farmerLocation) return

    const { lat, lng } = routeData.farmerLocation

    // Initialize Map ONCE
    if (!mapRef.current) {
      if ((containerRef.current as any)._leaflet_id) {
        (containerRef.current as any)._leaflet_id = null
      }

      const map = L.map(containerRef.current).setView([lat, lng], 10)
      mapRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      layerGroupRef.current = L.layerGroup().addTo(map)
    }

    // Clear existing markers & polylines safely
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers()
    }

    const layerGroup = layerGroupRef.current!

    // Farmer marker (green farm icon)
    const farmerIcon = L.divIcon({
      html: `<div style="background:#16a34a;color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3)">🌾</div>`,
      className: "",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    L.marker([lat, lng], { icon: farmerIcon })
      .addTo(layerGroup)
      .bindPopup(`<b>Your Farm</b><br>${routeData.farmerAddress}`)

    const stops = routeData.stops ?? routeData.clusters?.[0]?.stops ?? []
    const routeGeometry = routeData.geometry ?? routeData.clusters?.[0]?.geometry

    // Draw real OSRM road geometry if available
    if (routeGeometry) {
      L.geoJSON(routeGeometry, {
        style: {
          color: "#16a34a",
          weight: 5,
          opacity: 0.85,
        },
      }).addTo(layerGroup)
    } else if (stops.length > 0) {
      // Fallback straight-line polyline if geometry missing
      const fallbackCoords: [number, number][] = [
        [lat, lng],
        ...stops.map((s: any) => [s.lat, s.lng] as [number, number]),
        [lat, lng],
      ]
      L.polyline(fallbackCoords, {
        color: "#16a34a",
        weight: 3,
        dashArray: "6 6",
      }).addTo(layerGroup)
    }

    // Render physical delivery stop markers
    stops.forEach((stop: any, si: number) => {
      const stopNumber = stop.stopIndex ?? si + 1
      const customerIcon = L.divIcon({
        html: `<div style="background:#2563eb;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3)">${stopNumber}</div>`,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      const orderInfo = stop.orders
        ? stop.orders.map((o: any) => `ORD-${String(o.orderId).padStart(3, "0")} (₹${o.total})`).join("<br>")
        : `ORD-${String(stop.orderId).padStart(3, "0")} (₹${stop.total})`

      L.marker([stop.lat, stop.lng], { icon: customerIcon })
        .addTo(layerGroup)
        .bindPopup(`
          <div style="min-width:180px">
            <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:4px;">Stop #${stopNumber}</span>
            <b style="display:block;margin-top:4px;font-size:14px">${stop.customerName}</b>
            <span style="color:#475569;font-size:12px;display:block;margin-bottom:6px">${stop.address}</span>
            <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px">
              <b>Stop Total: ₹${stop.total}</b><br>
              <small style="color:#64748b">${orderInfo}</small>
            </div>
          </div>
        `)
    })

    // Fit map bounds to encompass farm and all delivery stops
    const allPoints: [number, number][] = [
      [lat, lng],
      ...stops.map((s: any) => [s.lat, s.lng] as [number, number]),
    ]

    if (allPoints.length > 1 && mapRef.current) {
      mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] })
    }
  }, [routeData])

  // Cleanup map instance ONLY on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ height: "500px", width: "100%", borderRadius: "8px" }}
    />
  )
}