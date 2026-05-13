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

const CLUSTER_COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed"]

export default function DeliveryMap({ routeData }: { routeData: any }) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!routeData?.farmerLocation) return

    const { lat, lng } = routeData.farmerLocation

    // Init map
    const map = L.map(containerRef.current).setView([lat, lng], 12)
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map)

    // Farmer marker (green)
    const farmerIcon = L.divIcon({
      html: `<div style="background:#16a34a;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">🌱</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })

    L.marker([lat, lng], { icon: farmerIcon })
      .addTo(map)
      .bindPopup(`<b>Your Farm</b><br>${routeData.farmerAddress}`)

    // Draw each cluster
    routeData.clusters?.forEach((cluster: any, ci: number) => {
      const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length]
      const routeCoords: [number, number][] = [
        [lat, lng], // start from farm
        ...cluster.stops.map((s: any) => [s.lat, s.lng] as [number, number]),
        [lat, lng], // return to farm
      ]

      // Draw route line
      L.polyline(routeCoords, {
        color,
        weight: 3,
        opacity: 0.8,
        dashArray: "8 4",
      }).addTo(map)

      // Customer markers
      cluster.stops.forEach((stop: any, si: number) => {
        const customerIcon = L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${si + 1}</div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        L.marker([stop.lat, stop.lng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`
            <b>${stop.customerName}</b><br>
            ${stop.address}<br>
            <b>₹${stop.total}</b> — ORD-${String(stop.orderId).padStart(3, "0")}
          `)
      })
    })

    // Fit map to all markers
    const allPoints: [number, number][] = [
      [lat, lng],
      ...(routeData.clusters?.flatMap((c: any) =>
        c.stops.map((s: any) => [s.lat, s.lng] as [number, number])
      ) ?? []),
    ]
    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] })
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [routeData])

  return (
    <div
      ref={containerRef}
      style={{ height: "500px", width: "100%", borderRadius: "8px" }}
    />
  )
}