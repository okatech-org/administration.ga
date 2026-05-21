"use client"

import * as mapboxgl from "mapbox-gl"
import { useEffect, useRef } from "react"
import "mapbox-gl/dist/mapbox-gl.css"
import { MapPin } from "lucide-react"
import { MAPBOX_CONFIG } from "@/config/mapbox"
import { cn } from "@/lib/utils"

interface OrgLocationMapProps {
  lat: number
  lng: number
  label?: string
  zoom?: number
  className?: string
}

/**
 * Carte Mapbox compacte (rectangulaire) avec un pin unique pour la page de
 * détail d'une représentation. Style « light » warm-aligné, contrôles
 * minimaux, pin custom au style Consulat.ga.
 */
export function OrgLocationMap({
  lat,
  lng,
  label,
  zoom = 14,
  className,
}: OrgLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return
    if (!MAPBOX_CONFIG.accessToken) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_CONFIG.styleLight,
      center: [lng, lat],
      zoom,
      interactive: true,
      attributionControl: false,
      accessToken: MAPBOX_CONFIG.accessToken,
    })

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    )

    // Custom pin (style maquette)
    const el = document.createElement("div")
    el.style.cursor = "pointer"
    el.innerHTML = `
      <div style="position:relative;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="
          width:36px;height:36px;
          border-radius:50% 50% 50% 0;
          background:var(--gabon-blue-hex,#0072b9);
          transform:rotate(-45deg);
          display:grid;place-items:center;
          color:#fff;
          box-shadow:0 6px 18px rgba(11,79,156,.45);
          border:2.5px solid #fff;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg);">
            <path d="M3 9.5L12 2l9 7.5"/>
            <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>
            <path d="M9 21V12h6v9"/>
          </svg>
        </div>
        ${
          label
            ? `<span style="
              background:var(--surface,#fff);
              border:1px solid var(--border,#e6e2d8);
              padding:5px 12px;border-radius:100px;
              font-size:12px;font-weight:500;
              white-space:nowrap;
              box-shadow:var(--shadow-sm-proto, 0 1px 2px rgba(20,19,15,0.06));
              ">${label.replace(/[<>]/g, "")}</span>`
            : ""
        }
      </div>
    `

    new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map.current)

    return () => {
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  if (!MAPBOX_CONFIG.accessToken) {
    // Fallback élégant si pas de token
    return (
      <div
        className={cn(
          "relative h-[260px] rounded-2xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface-3,#f3efe4)] grid place-items-center",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-[color:var(--muted-foreground)]">
          <MapPin className="w-8 h-8" />
          <span className="text-[13px]">
            {label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative h-[260px] rounded-2xl overflow-hidden border border-[color:var(--border)]",
        className,
      )}
    >
      <div ref={mapContainer} className="w-full h-full" />
      <span
        className="absolute bottom-3 left-3 inline-flex items-center gap-2 bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-full px-3 py-1.5 text-[12px] text-[color:var(--muted-foreground)] shadow-sm"
        style={{ pointerEvents: "none" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gabon-blue-hex)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20" />
        </svg>
        {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
      </span>
    </div>
  )
}
