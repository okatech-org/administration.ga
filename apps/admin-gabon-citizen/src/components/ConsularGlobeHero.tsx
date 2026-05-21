"use client"

import * as mapboxgl from "mapbox-gl"
import { useEffect, useRef } from "react"
import "mapbox-gl/dist/mapbox-gl.css"
import { useRouter } from "next/navigation"
import { api } from "@convex/_generated/api"
import { OrganizationType } from "@convex/lib/constants"
import { MAPBOX_CONFIG } from "@/config/mapbox"
import { useConvexQuery } from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

const CITY_COORDINATES: Record<string, [number, number]> = {
  Paris: [2.3522, 48.8566],
  London: [-0.1278, 51.5074],
  Berlin: [13.405, 52.52],
  Brussels: [4.3517, 50.8503],
  Madrid: [-3.7038, 40.4168],
  Rome: [12.4964, 41.9028],
  Lisbon: [-9.1393, 38.7223],
  Moscow: [37.6173, 55.7558],
  Geneva: [6.1432, 46.2044],
  Bern: [7.4474, 46.948],
  Libreville: [9.4673, 0.4162],
  Pretoria: [28.2293, -25.7479],
  Algiers: [3.0588, 36.7538],
  Luanda: [13.2343, -8.8383],
  Rabat: [-6.8498, 34.0209],
  Cairo: [31.2357, 30.0444],
  Dakar: [-17.4677, 14.7167],
  Abidjan: [-4.0083, 5.3599],
  Yaounde: [11.5174, 3.848],
  Brazzaville: [15.2429, -4.2634],
  Malabo: [8.7832, 3.75],
  Conakry: [-13.6785, 9.6412],
  Lome: [1.2255, 6.1319],
  Tunis: [10.1658, 36.8065],
  Kigali: [29.8739, -1.9403],
  "São Tomé": [6.6131, 0.1864],
  Lagos: [3.3792, 6.5244],
  Addis: [38.7578, 9.0227],
  Tripoli: [13.1913, 32.8872],
  Cotonou: [2.3912, 6.3703],
  Washington: [-77.0369, 38.9072],
  "New York": [-74.006, 40.7128],
  Ottawa: [-75.6972, 45.4215],
  Brasilia: [-47.9292, -15.8267],
  "Mexico City": [-99.1332, 19.4326],
  "Buenos Aires": [-58.3816, -34.6037],
  Havana: [-82.3666, 23.1136],
  Beijing: [116.4074, 39.9042],
  Tokyo: [139.6917, 35.6762],
  "New Delhi": [77.209, 28.6139],
  Riyadh: [46.6753, 24.7136],
  Seoul: [126.978, 37.5665],
  Ankara: [32.8597, 39.9334],
  Tehran: [51.389, 35.6892],
  "Abu Dhabi": [54.3773, 24.4539],
  Doha: [51.5136, 25.2854],
  "Kuwait City": [47.9783, 29.3759],
  Beirut: [35.4955, 33.8886],
}

function resolveCoords(city?: string): [number, number] | null {
  if (!city) return null
  return (
    CITY_COORDINATES[city] ||
    CITY_COORDINATES[
      Object.keys(CITY_COORDINATES).find((k) => city.includes(k)) || ""
    ] ||
    null
  )
}

const EMBASSY_TYPES: string[] = [
  OrganizationType.Embassy,
  OrganizationType.HighRepresentation,
  OrganizationType.HighCommission,
  OrganizationType.PermanentMission,
]

function classify(type: string): "embassy" | "consulate" | "other" {
  if (EMBASSY_TYPES.includes(type)) return "embassy"
  if (
    type === OrganizationType.GeneralConsulate ||
    type === "consulate" ||
    type === "honorary_consulate"
  )
    return "consulate"
  return "other"
}

export function ConsularGlobeHero({ className }: { className?: string }) {
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const { data: orgs } = useConvexQuery(api.functions.orgs.list, {})

  useEffect(() => {
    if (!mapContainer.current || map.current) return
    if (!MAPBOX_CONFIG.accessToken) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_CONFIG.styleLight,
      center: [10, 5],
      zoom: 1.2,
      projection: "globe" as never,
      interactive: true,
      attributionControl: false,
      accessToken: MAPBOX_CONFIG.accessToken,
    })

    map.current.on("style.load", () => {
      map.current?.setFog({
        color: "rgb(247, 246, 242)",
        "high-color": "rgb(220, 215, 205)",
        "horizon-blend": 0.08,
        "star-intensity": 0,
      })
      map.current?.resize()
    })

    const ro = new ResizeObserver(() => {
      map.current?.resize()
    })
    ro.observe(mapContainer.current)

    return () => {
      ro.disconnect()
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || !orgs) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Libreville marker (siège) — yellow with pulse
    const librevilleEl = document.createElement("div")
    librevilleEl.innerHTML = `
      <div class="relative -translate-x-1/2 -translate-y-1/2">
        <span class="absolute inset-0 rounded-full" style="animation: hero-globe-pulse 2.4s ease-out infinite; border:2px solid var(--gabon-yellow-hex, #f1c531); width:18px; height:18px;"></span>
        <span class="block rounded-full" style="width:16px; height:16px; background: var(--gabon-yellow-hex, #f1c531); box-shadow: 0 0 0 6px rgba(241,197,49,.25), 0 0 0 1px rgba(0,0,0,.1) inset;"></span>
      </div>
    `
    librevilleEl.style.cursor = "pointer"
    librevilleEl.title = "Libreville · siège"
    const libreville = new mapboxgl.Marker({ element: librevilleEl, anchor: "center" })
      .setLngLat([9.4673, 0.4162])
      .addTo(map.current)
    markersRef.current.push(libreville)

    orgs.forEach((org) => {
      const kind = classify(org.type)
      if (kind === "other") return
      const coords = resolveCoords(org.address.city)
      if (!coords) return

      const isEmbassy = kind === "embassy"
      const el = document.createElement("div")
      const size = isEmbassy ? 14 : 12
      const color = isEmbassy
        ? "var(--gabon-blue-hex, #0072b9)"
        : "var(--gabon-green-hex, #0a8a3b)"
      const ring = isEmbassy
        ? "rgba(11,79,156,.18)"
        : "rgba(10,138,59,.18)"
      el.innerHTML = `
        <span class="block rounded-full transition-transform hover:scale-125" style="width:${size}px; height:${size}px; background:${color}; box-shadow: 0 0 0 4px ${ring}, 0 0 0 1px rgba(255,255,255,.7) inset;"></span>
      `
      el.style.cursor = "pointer"
      el.style.transform = "translate(-50%, -50%)"
      el.title = `${org.address.city || org.name} — ${org.address.country || ""}`
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        if (org.slug) router.push(`/reps/${org.slug}`)
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(coords)
        .addTo(map.current!)
      markersRef.current.push(marker)
    })
  }, [orgs, router])

  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[520px] ml-auto rounded-full overflow-hidden",
        className,
      )}
      style={{
        boxShadow:
          "inset -40px -60px 120px rgba(20,19,15,.18), inset 30px 40px 80px rgba(255,255,255,.6), 0 30px 80px -30px rgba(20,19,15,.25)",
      }}
    >
      <div ref={mapContainer} className="w-full h-full" />
      <style>{`@keyframes hero-globe-pulse {
        0% { opacity: .8; transform: scale(1); }
        100% { opacity: 0; transform: scale(4); }
      }`}</style>
    </div>
  )
}
