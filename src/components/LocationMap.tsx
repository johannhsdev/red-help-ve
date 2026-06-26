import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { cn } from "../lib/utils"

export interface MapPoint {
  latitude: number
  longitude: number
  label?: string
}

interface LocationMapProps {
  value?: MapPoint | null
  markers?: MapPoint[]
  onChange?: (point: MapPoint) => void
  className?: string
}

const VENEZUELA_CENTER: [number, number] = [8.0019, -66.1109]

function pinIcon(color = "#ef4444") {
  return L.divIcon({
    className: "",
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
    html: `
      <div style="
        width:28px;
        height:28px;
        border-radius:999px 999px 999px 0;
        background:${color};
        border:3px solid white;
        box-shadow:0 8px 18px rgba(0,0,0,.35);
        transform:rotate(-45deg);
      ">
        <div style="
          width:8px;
          height:8px;
          margin:7px auto;
          border-radius:999px;
          background:white;
        "></div>
      </div>
    `,
  })
}

export function LocationMap({ value, markers = [], onChange, className }: LocationMapProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return

    const map = L.map(nodeRef.current, {
      center: VENEZUELA_CENTER,
      zoom: 6,
      scrollWheelZoom: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = layer

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !onChange) return

    const handleClick = (event: L.LeafletMouseEvent) => {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    }

    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [onChange])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    markers.forEach((marker) => {
      const item = L.marker([marker.latitude, marker.longitude], {
        icon: pinIcon("#f97316"),
      }).addTo(layer)
      if (marker.label) item.bindPopup(marker.label)
    })

    if (value) {
      const selected = L.marker([value.latitude, value.longitude], {
        icon: pinIcon("#dc2626"),
        draggable: Boolean(onChange),
      }).addTo(layer)

      if (value.label) selected.bindPopup(value.label)
      if (onChange) {
        selected.on("dragend", () => {
          const position = selected.getLatLng()
          onChange({ latitude: position.lat, longitude: position.lng })
        })
      }

      map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 15))
      return
    }

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]))
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 })
    }
  }, [markers, onChange, value])

  return (
    <div
      ref={nodeRef}
      className={cn("relative z-0 h-72 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[#101010]", className)}
    />
  )
}
