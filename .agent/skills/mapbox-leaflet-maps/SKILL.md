---
name: "Mapbox & Leaflet Maps"
description: "Intégration cartes interactives avec Mapbox GL JS et Leaflet pour données géospatiales, choroplèthes, et routage"
activation: "map, mapbox, leaflet, geospatial, choropleth, geocoding, directions, geojson, marker, routing"
projects: ["mairie.ga", "consulat.ga", "idetude.ga", "secretariat-general-gouv"]
---

# Mapbox & Leaflet Maps Integration

Skill complet pour intégrer des cartes interactives. Couvre Mapbox GL JS, Leaflet, géocodage, routage, et données géospatiales.

## Installation et Configuration

### Dépendances Mapbox

```bash
npm install mapbox-gl react-map-gl @mapbox/mapbox-gl-draw @mapbox/mapbox-gl-geocoder
npm install -D @types/mapbox-gl
```

### Dépendances Leaflet

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### Variables d'environnement

```env
# Mapbox (clé publique, restreinte)
VITE_MAPBOX_ACCESS_TOKEN=pk_live_xxxxx
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk_live_xxxxx

# Mapbox Secret (backend only)
MAPBOX_SECRET_TOKEN=sk_live_xxxxx

# Données géospatiales
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
```

## Mapbox GL JS Setup

### Provider Mapbox

```typescript
// src/providers/MapboxProvider.tsx
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { ReactNode } from 'react'

// Initialiser token Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

export function MapboxProvider({ children }: { children: ReactNode }) {
  if (!mapboxgl.accessToken) {
    console.warn('Mapbox token non configuré')
  }

  return <>{children}</>
}
```

### Composant Mapbox basique

```tsx
// src/components/maps/MapboxMap.tsx
import { useEffect, useRef, useState } from 'react'
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapboxMapProps {
  center?: [number, number] // [lng, lat]
  zoom?: number
  style?: string
  onMapLoad?: (map: mapboxgl.Map) => void
  children?: React.ReactNode
}

export function MapboxMap({
  center = [15.3136, 2.1495], // Gabon par défaut
  zoom = 4,
  style = 'mapbox://styles/mapbox/light-v11',
  onMapLoad,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style,
      center: center,
      zoom: zoom,
      pitch: 0,
      bearing: 0,
    })

    map.current.on('load', () => {
      setLoaded(true)
      onMapLoad?.(map.current!)
    })

    return () => {
      map.current?.remove()
    }
  }, [center, zoom, style])

  return (
    <div ref={mapContainer} className="w-full h-full" />
  )
}
```

### Wrapper react-map-gl

```tsx
// src/components/maps/Map.tsx
import React, { useState } from 'react'
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
} from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapProps {
  initialViewState?: {
    longitude: number
    latitude: number
    zoom: number
  }
  children?: React.ReactNode
  style?: string
}

export function MapComponent({
  initialViewState = {
    longitude: 15.3136,
    latitude: 2.1495,
    zoom: 4,
  },
  children,
  style = 'mapbox://styles/mapbox/light-v11',
}: MapProps) {
  const [viewState, setViewState] = useState(initialViewState)

  return (
    <Map
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle={style}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
    >
      <NavigationControl position="top-left" />
      <GeolocateControl position="top-left" />
      <FullscreenControl position="top-left" />

      {children}
    </Map>
  )
}
```

## Marqueurs et Popups

### Marqueur simple

```tsx
// src/components/maps/MapMarker.tsx
import { Marker, Popup } from 'react-map-gl'
import { useState } from 'react'

interface MapMarkerProps {
  latitude: number
  longitude: number
  title: string
  description?: string
  color?: string
  onClick?: () => void
}

export function MapMarker({
  latitude,
  longitude,
  title,
  description,
  color = '#3b82f6',
  onClick,
}: MapMarkerProps) {
  const [showPopup, setShowPopup] = useState(false)

  return (
    <>
      <Marker
        longitude={longitude}
        latitude={latitude}
        color={color}
        onClick={(e) => {
          e.originalEvent.stopPropagation()
          setShowPopup(!showPopup)
          onClick?.()
        }}
      />

      {showPopup && (
        <Popup
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          closeButton={true}
          onClose={() => setShowPopup(false)}
        >
          <div className="space-y-2">
            <h3 className="font-semibold">{title}</h3>
            {description && <p className="text-sm text-gray-600">{description}</p>}
          </div>
        </Popup>
      )}
    </>
  )
}
```

### Cluster de marqueurs

```tsx
// src/components/maps/ClusteredMarkers.tsx
import { useEffect, useMemo } from 'react'
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl'
import { useState } from 'react'
import type { GeoJSON } from 'mapbox-gl'

interface ClusteredMarkersProps {
  points: Array<{
    id: string
    longitude: number
    latitude: number
    title: string
  }>
}

export function ClusteredMarkers({ points }: ClusteredMarkersProps) {
  const [selectedCluster, setSelectedCluster] = useState<any>(null)
  const [viewState, setViewState] = useState({
    longitude: 15.3136,
    latitude: 2.1495,
    zoom: 4,
  })

  const geojson: GeoJSON.FeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
        properties: {
          id: p.id,
          title: p.title,
        },
      })),
    }),
    [points]
  ) as any

  return (
    <Map
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
    >
      <Source
        id="points"
        type="geojson"
        data={geojson}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        {/* Clusters non-zoomed */}
        <Layer
          id="clusters"
          type="circle"
          source="points"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': '#3b82f6',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40,
            ],
          }}
        />

        {/* Texte cluster */}
        <Layer
          id="cluster-count"
          type="symbol"
          source="points"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12,
          }}
          paint={{
            'text-color': '#fff',
          }}
        />

        {/* Points non-clustered */}
        <Layer
          id="unclustered-point"
          type="circle"
          source="points"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': '#ef4444',
            'circle-radius': 8,
          }}
        />
      </Source>
    </Map>
  )
}
```

## GeoJSON et Couches

### Afficher GeoJSON

```tsx
// src/components/maps/GeoJsonLayer.tsx
import { useEffect } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import type { GeoJSON } from 'mapbox-gl'

interface GeoJsonLayerProps {
  geojson: GeoJSON.FeatureCollection
  layerId: string
  fillColor?: string
  strokeColor?: string
  onFeatureClick?: (feature: GeoJSON.Feature) => void
}

export function GeoJsonLayer({
  geojson,
  layerId,
  fillColor = '#3b82f6',
  strokeColor = '#1e40af',
  onFeatureClick,
}: GeoJsonLayerProps) {
  return (
    <Source id={layerId} type="geojson" data={geojson}>
      <Layer
        id={`${layerId}-fill`}
        type="fill"
        source={layerId}
        paint={{
          'fill-color': fillColor,
          'fill-opacity': 0.5,
        }}
        onClick={(e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0] as GeoJSON.Feature)
          }
        }}
      />

      <Layer
        id={`${layerId}-stroke`}
        type="line"
        source={layerId}
        paint={{
          'line-color': strokeColor,
          'line-width': 2,
        }}
      />
    </Source>
  )
}
```

## Choroplèthes (Données administratives)

### Carte choroplèthe Gabon

```tsx
// src/components/maps/GabonChoropleth.tsx
import { useEffect, useState } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import type { GeoJSON } from 'mapbox-gl'

interface ChoropethData {
  province: string
  value: number
}

interface GabonChoropethProps {
  data: ChoropethData[]
  onProvinceClick?: (province: string) => void
}

export function GabonChoropleth({
  data,
  onProvinceClick,
}: GabonChoropethProps) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 15.3136,
    latitude: 2.1495,
    zoom: 5,
  })

  useEffect(() => {
    // Charger les limites administratives Gabon
    // Source: OpenStreetMap nominatim ou GeoJSON statique
    fetchGabonBoundaries()
  }, [])

  const fetchGabonBoundaries = async () => {
    try {
      // Utiliser GeoJSON hébergé ou charger depuis Convex
      const response = await fetch('/data/gabon-provinces.geojson')
      const data = await response.json()

      // Enrichir avec les données
      const enriched = {
        ...data,
        features: data.features.map((feature: GeoJSON.Feature) => {
          const provinceName = feature.properties?.name
          const value = data.find((d: ChoropethData) => d.province === provinceName)?.value || 0

          return {
            ...feature,
            properties: {
              ...feature.properties,
              value,
            },
          }
        }),
      }

      setGeojson(enriched)
    } catch (error) {
      console.error('Erreur chargement limites Gabon:', error)
    }
  }

  const getColorForValue = (value: number, max: number) => {
    const ratio = value / max
    if (ratio < 0.2) return '#fee5d9'
    if (ratio < 0.4) return '#fcae91'
    if (ratio < 0.6) return '#fb6a4a'
    if (ratio < 0.8) return '#de2d26'
    return '#a50f15'
  }

  if (!geojson) return <div>Chargement carte...</div>

  const maxValue = Math.max(...geojson.features.map((f: any) => f.properties.value))

  return (
    <Map
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
    >
      <Source id="provinces" type="geojson" data={geojson}>
        <Layer
          id="provinces-fill"
          type="fill"
          paint={{
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#ffeda0',
              [
                'interpolate',
                ['linear'],
                ['get', 'value'],
                0,
                '#fee5d9',
                maxValue,
                '#a50f15',
              ],
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.9,
              0.7,
            ],
          }}
          onClick={(e) => {
            if (e.features && e.features[0]) {
              onProvinceClick?.(e.features[0].properties.name)
            }
          }}
          onMouseEnter={() => {
            // Hover effect
          }}
        />

        <Layer
          id="provinces-stroke"
          type="line"
          paint={{
            'line-color': '#627BC1',
            'line-width': 1,
          }}
        />
      </Source>

      {/* Légende */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded shadow-lg z-10">
        <h3 className="font-semibold mb-2">Légende</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#fee5d9' }} />
            <span>0 - {(maxValue * 0.2).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#fcae91' }} />
            <span>{(maxValue * 0.2).toFixed(0)} - {(maxValue * 0.4).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#fb6a4a' }} />
            <span>{(maxValue * 0.4).toFixed(0)} - {(maxValue * 0.6).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#de2d26' }} />
            <span>{(maxValue * 0.6).toFixed(0)} - {(maxValue * 0.8).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: '#a50f15' }} />
            <span>{(maxValue * 0.8).toFixed(0)} - {maxValue.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </Map>
  )
}
```

## Géocodage

### Composant Géocodage (Forward + Reverse)

```tsx
// src/components/maps/Geocoder.tsx
import { useRef, useState } from 'react'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { MapComponent } from './Map'

interface GeocoderProps {
  onLocationSelect?: (location: {
    name: string
    longitude: number
    latitude: number
  }) => void
}

export function Geocoder({ onLocationSelect }: GeocoderProps) {
  const geocoderContainer = useRef<HTMLDivElement>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
          },
        }
      )

      const data = await response.json()
      setSearchResults(data.features)
    } catch (error) {
      console.error('Erreur géocodage:', error)
    }
  }

  const handleSelectResult = (feature: any) => {
    const [longitude, latitude] = feature.geometry.coordinates
    onLocationSelect?.({
      name: feature.place_name,
      longitude,
      latitude,
    })
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Chercher une adresse..."
        onChange={(e) => {
          if (e.target.value.length > 2) {
            handleSearch(e.target.value)
          }
        }}
        className="w-full p-2 border rounded"
      />

      {searchResults.length > 0 && (
        <ul className="bg-white border rounded shadow">
          {searchResults.map((result, idx) => (
            <li
              key={idx}
              onClick={() => handleSelectResult(result)}
              className="p-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
            >
              {result.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Reverse géocodage
export async function reverseGeocode(
  longitude: number,
  latitude: number
): Promise<string> {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
      },
    }
  )

  const data = await response.json()
  return data.features[0]?.place_name || `${latitude}, ${longitude}`
}
```

## Routage et Directions

### Afficher itinéraires

```tsx
// src/components/maps/DirectionsLayer.tsx
import { useEffect, useState } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import type { GeoJSON } from 'mapbox-gl'

interface DirectionsLayerProps {
  origin: [number, number] // [lng, lat]
  destination: [number, number]
  profile?: 'driving' | 'walking' | 'cycling'
}

export function DirectionsLayer({
  origin,
  destination,
  profile = 'driving',
}: DirectionsLayerProps) {
  const [route, setRoute] = useState<GeoJSON.FeatureCollection | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 15.3136,
    latitude: 2.1495,
    zoom: 4,
  })

  useEffect(() => {
    fetchRoute()
  }, [origin, destination, profile])

  const fetchRoute = async () => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
          },
        }
      )

      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const routeFeature: GeoJSON.Feature = {
          type: 'Feature',
          geometry: data.routes[0].geometry,
          properties: {
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
          },
        }

        setRoute({
          type: 'FeatureCollection',
          features: [routeFeature],
        })

        // Centrer sur itinéraire
        const bounds = calculateBounds(data.routes[0].geometry.coordinates)
        setViewState({
          ...viewState,
          ...bounds,
        })
      }
    } catch (error) {
      console.error('Erreur routage:', error)
    }
  }

  const calculateBounds = (coordinates: any[]) => {
    let minLng = coordinates[0][0],
      maxLng = coordinates[0][0]
    let minLat = coordinates[0][1],
      maxLat = coordinates[0][1]

    coordinates.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    })

    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2
    const zoom = 10

    return { longitude: centerLng, latitude: centerLat, zoom }
  }

  return (
    <Map
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
    >
      {route && (
        <Source id="route" type="geojson" data={route}>
          <Layer
            id="route"
            type="line"
            paint={{
              'line-color': '#3b82f6',
              'line-width': 4,
            }}
          />
        </Source>
      )}
    </Map>
  )
}
```

## Intégration Supabase PostGIS

### Requêtes géospatiales

```typescript
// lib/supabase-geo.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

// Rechercher points proches
export async function findNearbyPoints(
  longitude: number,
  latitude: number,
  radiusKm: number
) {
  const { data, error } = await supabase.rpc('nearby_points', {
    lon: longitude,
    lat: latitude,
    radius_km: radiusKm,
  })

  if (error) throw error
  return data
}

// Requête SQL PostGIS directe (Convex)
export const getNearbyPlaces = authQuery({
  args: {
    longitude: v.number(),
    latitude: v.number(),
    radiusKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Utiliser Supabase depuis Convex
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/nearby_places`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          lon: args.longitude,
          lat: args.latitude,
          radius_km: args.radiusKm || 10,
        }),
      }
    )

    return await response.json()
  },
})

// Fonction PostGIS SQL (à créer dans Supabase)
/*
CREATE OR REPLACE FUNCTION nearby_points(
  lon FLOAT,
  lat FLOAT,
  radius_km FLOAT DEFAULT 10
)
RETURNS TABLE(id UUID, name TEXT, geom GEOMETRY) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.geom
  FROM places p
  WHERE ST_DWithin(
    p.geom::geography,
    ST_Point(lon, lat)::geography,
    radius_km * 1000
  )
  ORDER BY ST_Distance(p.geom::geography, ST_Point(lon, lat)::geography);
END;
$$ LANGUAGE plpgsql;
*/
```

## Leaflet (Alternative légère)

### Setup Leaflet basique

```tsx
// src/components/maps/LeafletMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LeafletMapProps {
  center?: LatLngExpression
  zoom?: number
}

export function LeafletMap({
  center = [2.1495, 15.3136] as LatLngExpression,
  zoom = 4,
}: LeafletMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      <Marker position={center}>
        <Popup>
          Gabon <br /> Centre approximatif
        </Popup>
      </Marker>
    </MapContainer>
  )
}
```

### Couche GeoJSON Leaflet

```tsx
// src/components/maps/LeafletGeoJSON.tsx
import { useEffect } from 'react'
import { GeoJSON as LeafletGeoJSON } from 'react-leaflet'
import type { GeoJSON } from 'geojson'

interface LeafletGeoJSONProps {
  geojson: GeoJSON
  onEachFeature?: (feature: GeoJSON.Feature, layer: any) => void
}

export function LeafletGeoJSON({
  geojson,
  onEachFeature,
}: LeafletGeoJSONProps) {
  return (
    <LeafletGeoJSON
      data={geojson}
      onEachFeature={onEachFeature}
      style={{
        color: '#3b82f6',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.5,
      }}
    />
  )
}
```

## Outils Dessin (Mapbox GL Draw)

```tsx
// src/components/maps/DrawingTools.tsx
import { useEffect, useRef, useState } from 'react'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import mapboxgl from 'mapbox-gl'

interface DrawingToolsProps {
  mapInstance: mapboxgl.Map
  onDraw?: (features: GeoJSON.Feature[]) => void
}

export function useDrawingTools(mapInstance: mapboxgl.Map) {
  const drawRef = useRef<MapboxDraw | null>(null)

  useEffect(() => {
    if (!mapInstance) return

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: true,
        point: true,
        trash: true,
      },
    })

    mapInstance.addControl(drawRef.current)

    const handleDraw = () => {
      const features = drawRef.current?.getAll()
      console.log('Features drawn:', features)
    }

    mapInstance.on('draw.create', handleDraw)
    mapInstance.on('draw.update', handleDraw)
    mapInstance.on('draw.delete', handleDraw)

    return () => {
      mapInstance.off('draw.create', handleDraw)
      mapInstance.off('draw.update', handleDraw)
      mapInstance.off('draw.delete', handleDraw)
      mapInstance.removeControl(drawRef.current!)
    }
  }, [mapInstance])

  return {
    getDrawingMode: () => drawRef.current?.getMode() || 'simple_select',
    getDrawnFeatures: () => drawRef.current?.getAll().features || [],
    deleteAll: () => drawRef.current?.deleteAll(),
  }
}
```

## Cartes Offline avec Tuiles

```typescript
// lib/offline-tiles.ts
// Pour utiliser des tuiles offline (MBTiles format)

export async function downloadMapTiles(
  bounds: [number, number, number, number], // [minLng, minLat, maxLng, maxLat]
  zooms: [number, number], // [minZoom, maxZoom]
  outputPath: string
) {
  // Utiliser omt-downloader ou script custom
  // Pour production, considérer des services comme Mapbox tiling ou TileServer GL
  console.log('Télécharger tuiles:', bounds, zooms)
}

// Serveur tiles local (TileServer GL)
/*
docker run -it -v /data:/data -p 8080:8080 maptiler/tileserver-gl

Puis accéder aux tuiles via:
http://localhost:8080/data/tileset.json
*/
```

## Optimisation Performance

### Viewport-only rendering

```tsx
// src/hooks/useViewportGeoJSON.ts
import { useEffect, useState } from 'react'
import type { GeoJSON } from 'mapbox-gl'

interface ViewportGeoJSONProps {
  allFeatures: GeoJSON.Feature[]
  bounds: {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
  }
}

export function useViewportGeoJSON({
  allFeatures,
  bounds,
}: ViewportGeoJSONProps) {
  const [visibleFeatures, setVisibleFeatures] = useState<
    GeoJSON.Feature[]
  >([])

  useEffect(() => {
    // Filtrer features dans le viewport
    const visible = allFeatures.filter((feature) => {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates
        return (
          lng >= bounds.minLng &&
          lng <= bounds.maxLng &&
          lat >= bounds.minLat &&
          lat <= bounds.maxLat
        )
      }
      // Pour polygones/lignes, simplifier la vérification
      return true
    })

    setVisibleFeatures(visible)
  }, [allFeatures, bounds])

  return {
    visibleFeatures,
    geojson: {
      type: 'FeatureCollection',
      features: visibleFeatures,
    } as GeoJSON.FeatureCollection,
  }
}
```

### Debounce updates

```typescript
export function useDebouncedMapUpdate(
  callback: () => void,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback()
    }, delay)
  }
}
```

## Anti-patterns à éviter

```typescript
// ❌ JAMAIS charger tout GeoJSON d'un coup
const allCommunesGabon = await fetch('/gabon-communes.geojson')
// Si 10,000+ features, la carte gèlera!

// ✅ À faire : charger par viewport ou zoom
if (zoom > 8) {
  const visibleCommunesOnly = await getVisibleFeatures(viewport)
}

// ❌ JAMAIS exposer token Mapbox secret côté client
const response = await fetch(`/api/tiles`, {
  headers: { 'Mapbox-Secret': process.env.MAPBOX_SECRET_TOKEN }
})

// ✅ À faire : proxy backend
const response = await fetch('/api/proxy-tiles')
// Backend vérifie auth puis appelle Mapbox avec secret

// ❌ JAMAIS logger les coordonnées sensibles
console.log('User location:', userLatitude, userLongitude)

// ✅ À faire : logs génériques
console.log('User location updated')

// ❌ JAMAIS utiliser zoom libre sur données PostGIS
const allPoints = await supabase.from('points').select()

// ✅ À faire : requête spatiale
const nearbyPoints = await supabase.rpc('nearby_points', {
  lat: viewportCenter.lat,
  lng: viewportCenter.lng,
})
```

## Tests

```typescript
// tests/maps.test.ts
import { describe, it, expect } from 'vitest'
import { reverseGeocode } from '@/lib/geocoding'

describe('Maps Integration', () => {
  it('devrait géocoder une position', async () => {
    const address = await reverseGeocode(15.3136, 2.1495)
    expect(address).toBeDefined()
    expect(typeof address).toBe('string')
  })

  it('devrait valider limites Gabon', () => {
    const bounds = {
      minLng: 8.6,
      maxLng: 18.1,
      minLat: -4.0,
      maxLat: 2.3,
    }

    const testPoint = [15.3136, 2.1495]
    expect(testPoint[0]).toBeGreaterThanOrEqual(bounds.minLng)
    expect(testPoint[0]).toBeLessThanOrEqual(bounds.maxLng)
  })
})
```

## Ressources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [Leaflet Documentation](https://leafletjs.com/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Gabon Administrative Boundaries](https://www.geoboundaries.org/)
