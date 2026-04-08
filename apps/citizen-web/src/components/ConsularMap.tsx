import * as mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { api } from "@convex/_generated/api";
import { OrganizationType } from "@convex/lib/constants";
import { Loader2, Locate } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MAPBOX_CONFIG } from "@/config/mapbox";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// Coordinates for major cities (fallback if not in Convex metadata)
const CITY_COORDINATES: Record<string, [number, number]> = {
	// Europe
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
	// Africa
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
	// Americas
	Washington: [-77.0369, 38.9072],
	"New York": [-74.006, 40.7128],
	Ottawa: [-75.6972, 45.4215],
	Brasilia: [-47.9292, -15.8267],
	"Mexico City": [-99.1332, 19.4326],
	"Buenos Aires": [-58.3816, -34.6037],
	Havana: [-82.3666, 23.1136],
	// Asia
	Beijing: [116.4074, 39.9042],
	Tokyo: [139.6917, 35.6762],
	"New Delhi": [77.209, 28.6139],
	Riyadh: [46.6753, 24.7136],
	Seoul: [126.978, 37.5665],
	Ankara: [32.8597, 39.9334],
	Tehran: [51.389, 35.6892],
	// Middle East
	"Abu Dhabi": [54.3773, 24.4539],
	Doha: [51.5136, 25.2854],
	"Kuwait City": [47.9783, 29.3759],
	Beirut: [35.4955, 33.8886],
};

// ============================================================================
// TYPE CLASSIFICATION HELPERS
// ============================================================================

const EMBASSY_TYPES: string[] = [
	OrganizationType.Embassy,
	OrganizationType.HighCommission,
	OrganizationType.PermanentMission,
];

const CONSULATE_TYPES: string[] = [
	OrganizationType.GeneralConsulate,
];

function isEmbassyType(type: string): boolean {
	return EMBASSY_TYPES.includes(type);
}

function isConsulateType(type: string): boolean {
	return CONSULATE_TYPES.includes(type);
}

/** Resolve coordinates for a city name */
function resolveCoords(city: string | undefined): [number, number] | null {
	if (!city) return null;
	return (
		CITY_COORDINATES[city] ||
		CITY_COORDINATES[
			Object.keys(CITY_COORDINATES).find((k) => city.includes(k)) || ""
		] ||
		null
	);
}

// ============================================================================
// MARKER CONFIG
// ============================================================================

interface MarkerConfig {
	color: string;
	bgColor: string;
	typeName: string;
	iconSvg: string;
}

function getEmbassyConfig(t: (key: string) => string): MarkerConfig {
	const color = "rgb(16, 185, 129)";
	return {
		color,
		bgColor: "rgba(16, 185, 129, 0.15)",
		typeName: t("map.embassy"),
		iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
	};
}

function getConsulateConfig(t: (key: string) => string): MarkerConfig {
	const color = "rgb(59, 130, 246)";
	return {
		color,
		bgColor: "rgba(59, 130, 246, 0.15)",
		typeName: t("map.consulate"),
		iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
	};
}

// ============================================================================
// COMPONENT
// ============================================================================

interface ConsularMapProps {
	searchQuery?: string;
	className?: string;
}

export function ConsularMap({ searchQuery = "", className }: ConsularMapProps) {
	const { t } = useTranslation();
	const { theme } = useTheme();
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

	// Data sources
	const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});

	// Filters state
	const [filters, setFilters] = useState({
		embassy: true,
		consulate: true,
	});
	const [isLocating, setIsLocating] = useState(false);

	// Initialize Map
	useEffect(() => {
		if (!mapContainer.current) return;
		if (map.current) return;

		if (!MAPBOX_CONFIG.accessToken) {
			console.error("Mapbox token missing");
			return;
		}

		const isDark = theme === "dark";
		const style = isDark ? MAPBOX_CONFIG.styleDark : MAPBOX_CONFIG.styleLight;

		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: style,
			center: [20, 0],
			zoom: 1.5,
			projection: "globe" as any,
			interactive: true,
			attributionControl: false,
			accessToken: MAPBOX_CONFIG.accessToken,
		});

		map.current.on("style.load", () => {
			map.current?.setFog({
				color: isDark ? "rgb(10, 10, 20)" : "rgb(220, 220, 230)",
				"high-color": isDark ? "rgb(20, 20, 40)" : "rgb(180, 180, 200)",
				"horizon-blend": 0.05,
				"star-intensity": isDark ? 0.6 : 0,
			});
		});

		// Add navigation controls
		map.current.addControl(
			new mapboxgl.NavigationControl({ showCompass: false }),
			"top-left",
		);

		return () => {
			map.current?.remove();
			map.current = null;
		};
	}, [theme]);

	// ════════════════════════════════════════════════════════════════════════
	// ADD MARKERS (filtered by search and type)
	// ════════════════════════════════════════════════════════════════════════
	useEffect(() => {
		if (!map.current) return;

		// Clear existing markers
		markersRef.current.forEach((m) => m.remove());
		markersRef.current = [];

		const query = searchQuery.toLowerCase();

		// Helper: match search query against name, city, country
		const matchesSearch = (
			name: string,
			city?: string,
			country?: string,
		): boolean => {
			if (!query) return true;
			return (
				name.toLowerCase().includes(query) ||
				(city?.toLowerCase().includes(query) ?? false) ||
				(country?.toLowerCase().includes(query) ?? false)
			);
		};

		// Helper: create a marker on the map
		const addMarker = (
			coords: [number, number],
			config: MarkerConfig,
			name: string,
			addressLine: string,
			slug?: string,
			linkPrefix = "/reps",
		) => {
			const el = document.createElement("div");
			el.className = "custom-marker group cursor-pointer";

			el.innerHTML = `
				<div class="relative">
					<div class="absolute inset-0 rounded-full animate-ping opacity-20" style="background-color: ${config.color};"></div>
					<div class="relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 transition-transform hover:scale-110" 
						 style="background-color: ${config.bgColor}; backdrop-filter: blur(8px);">
						${config.iconSvg}
					</div>
					<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-800" 
						 style="background-color: ${config.color};"></div>
				</div>
			`;

			const detailLink = slug ? `${linkPrefix}/${slug}` : "#";

			const popup = new mapboxgl.Popup({
				offset: 30,
				closeButton: false,
				closeOnClick: false,
				className: "custom-mapbox-popup",
			}).setHTML(`
				<div class="font-sans min-w-[260px] bg-slate-950 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
					<div class="relative h-12 bg-linear-to-r from-slate-900 to-slate-800 flex items-center px-4 border-b border-slate-800">
						<span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider shadow-sm" style="background-color: ${config.color}">
							${config.typeName}
						</span>
					</div>
					<div class="p-4">
						<h3 class="font-bold text-sm text-white mb-2 leading-tight">${name}</h3>
						<p class="text-xs text-slate-400 flex items-start gap-1.5 mb-3">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0 opacity-70"><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
							<span class="leading-relaxed">${addressLine}</span>
						</p>
						<div class="grid grid-cols-2 gap-2">
							<a href="https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}" target="_blank" rel="noopener noreferrer" 
							   class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
							   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
							   ${t("map.directions")}
							</a>
							<a href="${detailLink}" 
							   class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-medium transition-colors">
							   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
							   ${t("map.details")}
							</a>
						</div>
					</div>
				</div>
			`);

			const marker = new mapboxgl.Marker(el)
				.setLngLat(coords)
				.setPopup(popup)
				.addTo(map.current!);

			// Hover tracking for marker + popup
			let isHoveringMarker = false;
			let isHoveringPopup = false;
			let hideTimeout: ReturnType<typeof setTimeout> | null = null;

			const showPopup = () => {
				if (hideTimeout) {
					clearTimeout(hideTimeout);
					hideTimeout = null;
				}
				popup.addTo(map.current!);

				const popupEl = popup.getElement();
				if (popupEl) {
					popupEl.addEventListener("mouseenter", () => {
						isHoveringPopup = true;
						if (hideTimeout) {
							clearTimeout(hideTimeout);
							hideTimeout = null;
						}
					});
					popupEl.addEventListener("mouseleave", () => {
						isHoveringPopup = false;
						scheduleHide();
					});
				}
			};

			const scheduleHide = () => {
				if (hideTimeout) clearTimeout(hideTimeout);
				hideTimeout = setTimeout(() => {
					if (!isHoveringMarker && !isHoveringPopup) {
						popup.remove();
					}
				}, 100);
			};

			el.addEventListener("mouseenter", () => {
				isHoveringMarker = true;
				showPopup();
			});
			el.addEventListener("mouseleave", () => {
				isHoveringMarker = false;
				scheduleHide();
			});
			el.addEventListener("click", () => {
				map.current?.flyTo({ center: coords, zoom: 5 });
			});

			markersRef.current.push(marker);
		};

		// ──────────────────────────────────────────────────────────────────────
		// 1) ORGS (embassies, consulates, and other diplomatic types)
		// ──────────────────────────────────────────────────────────────────────
		if (orgs) {
			orgs.forEach((org) => {
				const orgIsEmbassy = isEmbassyType(org.type);
				const orgIsConsulate = isConsulateType(org.type);

				// Skip unknown org types (third_party, other)
				if (!orgIsEmbassy && !orgIsConsulate) return;

				// Apply type filter
				if (orgIsEmbassy && !filters.embassy) return;
				if (orgIsConsulate && !filters.consulate) return;

				// Apply search filter
				if (!matchesSearch(org.name, org.address.city, org.address.country))
					return;

				const coords = resolveCoords(org.address.city);
				if (!coords) return;

				const config = orgIsEmbassy
					? getEmbassyConfig(t)
					: getConsulateConfig(t);

				const addressLine = org.address.street
					? `${org.address.street}, ${org.address.postalCode} ${org.address.city}`
					: `${org.address.city}, ${org.address.country}`;

				addMarker(coords, config, org.name, addressLine, org.slug, "/reps");
			});
		}

	}, [orgs, filters, t, searchQuery]);

	// Geolocation
	const handleLocate = () => {
		setIsLocating(true);
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const userPos: [number, number] = [
						pos.coords.longitude,
						pos.coords.latitude,
					];
					setIsLocating(false);
					toast.success(t("map.locationFound"));

					if (map.current) {
						if (userMarkerRef.current) userMarkerRef.current.remove();

						const el = document.createElement("div");
						el.innerHTML = `
						<div class="relative flex items-center justify-center w-6 h-6">
							<span class="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-30 animate-ping"></span>
							<div class="relative w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
						</div>
					`;

						userMarkerRef.current = new mapboxgl.Marker({ element: el })
							.setLngLat(userPos)
							.addTo(map.current);

						map.current.flyTo({ center: userPos, zoom: 10 });
					}
				},
				() => {
					setIsLocating(false);
					toast.error(t("map.locationError"));
				},
			);
		} else {
			setIsLocating(false);
			toast.error(t("map.locationUnsupported"));
		}
	};

	const toggleFilter = (key: keyof typeof filters) => {
		setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	return (
		<div
			className={cn(
				"relative w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-border bg-card/50 backdrop-blur-sm",
				className,
			)}
		>
			{/* Map Container */}
			<div ref={mapContainer} className="absolute inset-0 w-full h-full" />

			{/* Overlay Gradient */}
			<div className="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent pointer-events-none" />

			{/* Geolocation Button (Top Right) */}
			<Button
				variant="outline"
				size="icon"
				onClick={handleLocate}
				disabled={isLocating}
				className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-background/60 dark:bg-background/40 border-border backdrop-blur-md shadow-xl hover:bg-background z-10"
			>
				{isLocating ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Locate className="h-4 w-4" />
				)}
			</Button>

			{/* Zoom controls placeholder — Mapbox adds its own */}

			{/* Legend / Filters (Bottom) */}
			<div className="absolute bottom-4 left-4 right-4 flex gap-2 z-10">
				<button
					type="button"
					onClick={() => toggleFilter("embassy")}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md",
						filters.embassy
							? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
							: "bg-background/60 dark:bg-background/40 border border-border text-muted-foreground opacity-60",
					)}
				>
					<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
					{t("map.embassy")}
				</button>
				<button
					type="button"
					onClick={() => toggleFilter("consulate")}
					className={cn(
						"flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md",
						filters.consulate
							? "bg-blue-500/20 border border-blue-500/50 text-blue-600 dark:text-blue-400"
							: "bg-background/60 dark:bg-background/40 border border-border text-muted-foreground opacity-60",
					)}
				>
					<span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
					{t("map.consulate")}
				</button>
			</div>
		</div>
	);
}
