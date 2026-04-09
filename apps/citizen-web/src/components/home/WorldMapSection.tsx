"use client"

import * as mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { api } from "@convex/_generated/api";
import { OrganizationType } from "@convex/lib/constants";
import Link from "next/link";
import { ArrowRight, Globe, Loader2, Locate } from "lucide-react";
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
	// Americas
	Washington: [-77.0369, 38.9072],
	"New York": [-74.006, 40.7128],
	Ottawa: [-75.6972, 45.4215],
	Brasilia: [-47.9292, -15.8267],
	// Asia
	Beijing: [116.4074, 39.9042],
	Tokyo: [139.6917, 35.6762],
	"New Delhi": [77.209, 28.6139],
	Riyadh: [46.6753, 24.7136],
};

export function WorldMapSection() {
	const { t } = useTranslation();
	const { theme } = useTheme();
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
	const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});

	// Filters state
	const [filters, setFilters] = useState({
		embassy: true,
		consulate: true,
		company: true,
	});
	const [isLocating, setIsLocating] = useState(false);

	// Initialize Map
	useEffect(() => {
		if (!mapContainer.current) return;
		if (map.current) return;

		if (!MAPBOX_CONFIG.accessToken) {
			console.warn("Mapbox token missing — set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local");
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

		// Cleanup
		return () => {
			map.current?.remove();
			map.current = null;
		};
	}, [theme]);

	// Add Markers
	useEffect(() => {
		if (!map.current || !orgs) return;

		// Clear existing markers
		markersRef.current.forEach((m) => m.remove());
		markersRef.current = [];

		orgs.forEach((org) => {
			// Check filter
			const isEmbassy = org.type === OrganizationType.Embassy;
			const isConsulate = org.type === OrganizationType.GeneralConsulate;
			// TODO: Add Company and Association types when available
			if (isEmbassy && !filters.embassy) return;
			if (isConsulate && !filters.consulate) return;

			const city = org.address.city;
			const coords =
				CITY_COORDINATES[city] ||
				CITY_COORDINATES[
					Object.keys(CITY_COORDINATES).find((k) => city.includes(k)) || ""
				];

			if (coords) {
				const el = document.createElement("div");
				el.className = "custom-marker group cursor-pointer";

				// Colors and icons based on type
				let color: string, bgColor: string, iconSvg: string, typeName: string;

				if (isEmbassy) {
					color = "rgb(16, 185, 129)"; // emerald-500
					bgColor = "rgba(16, 185, 129, 0.15)";
					typeName = t("map.embassy");
					// Building2 icon from Lucide
					iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
				} else {
					color = "rgb(59, 130, 246)"; // blue-500
					bgColor = "rgba(59, 130, 246, 0.15)";
					typeName = t("map.consulate");
					// Building icon from Lucide
					iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`;
				}

				el.innerHTML = `
          <div class="relative">
            <div class="absolute inset-0 rounded-full animate-ping opacity-20" style="background-color: ${color};"></div>
            <div class="relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 transition-transform hover:scale-110" 
                 style="background-color: ${bgColor}; backdrop-filter: blur(8px);">
              ${iconSvg}
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-800" 
                 style="background-color: ${color};"></div>
          </div>
        `;

				const addressLine = org.address.street
					? `${org.address.street}, ${org.address.postalCode} ${city}`
					: `${city}, ${org.address.country}`;

				const popup = new mapboxgl.Popup({
					offset: 30,
					closeButton: false,
					closeOnClick: false,
					className: "custom-mapbox-popup",
				}).setHTML(`
          <div class="font-sans min-w-[260px] bg-slate-950 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
            <div class="relative h-12 bg-linear-to-r from-slate-900 to-slate-800 flex items-center px-4 border-b border-slate-800">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider shadow-sm" style="background-color: ${color}">
                ${typeName}
              </span>
            </div>
            <div class="p-4">
              <h3 class="font-bold text-sm text-white mb-2 leading-tight">${org.name}</h3>
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
                <a href="/reps/${org.slug}" 
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

				// Track hover state for both marker and popup
				let isHoveringMarker = false;
				let isHoveringPopup = false;
				let hideTimeout: ReturnType<typeof setTimeout> | null = null;

				const showPopup = () => {
					if (hideTimeout) {
						clearTimeout(hideTimeout);
						hideTimeout = null;
					}
					popup.addTo(map.current!);

					// Add hover listeners to popup element after it's added
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
					}, 100); // Small delay to allow moving to popup
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
			}
		});
	}, [orgs, filters, t]);

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
		<section className="py-24 bg-background text-foreground overflow-hidden relative border-t border-border">
			{/* Background Glow */}
			<div className="absolute top-1/2 right-0 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

			<div className="container mx-auto px-6 relative z-10">
				<div className="grid lg:grid-cols-5 gap-12 items-center">
					{/* Content Left (2/5 = 40%) */}
					<div className="lg:col-span-2 relative">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground mb-6 backdrop-blur-sm">
							<Globe className="w-3.5 h-3.5 text-primary" />
							<span>Réseau Diplomatique</span>
						</div>

						<h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-foreground">
							{t("map.title")}
						</h2>

						<p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
							{t("map.subtitle")}
						</p>

						<div className="grid grid-cols-2 gap-4 mb-10">
							<div className="p-4 rounded-2xl bg-card border border-border backdrop-blur-sm">
								<div className="text-3xl font-bold text-foreground mb-1">
									50+
								</div>
								<div className="text-sm text-muted-foreground">
									{t("map.stats.representations")}
								</div>
							</div>
							<div className="p-4 rounded-2xl bg-card border border-border backdrop-blur-sm">
								<div className="text-3xl font-bold text-emerald-500 dark:text-emerald-400 mb-1">
									24/7
								</div>
								<div className="text-sm text-muted-foreground">
									{t("map.stats.assistance")}
								</div>
							</div>
						</div>

						<Button asChild size="lg" className="h-14 px-8 rounded-full">
							<Link href="/reps?view=grid">
								{t("map.explore")} <ArrowRight className="ml-2 w-5 h-5" />
							</Link>
						</Button>
					</div>

					{/* Map Right (3/5 = 60%) - Floating Card Effect */}
					<div className="lg:col-span-3 relative h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-border bg-card/50 backdrop-blur-sm group">
						{/* Map Container */}
						<div
							ref={mapContainer}
							className="absolute inset-0 w-full h-full grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
						/>

						{/* Overlay Gradient */}
						<div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent pointer-events-none" />

						{/* Geolocation Button (Top Right) */}
						<Button
							variant="outline"
							size="icon"
							onClick={handleLocate}
							disabled={isLocating}
							className="absolute top-6 right-6 h-12 w-12 rounded-xl bg-background/60 dark:bg-background/40 border-border backdrop-blur-md shadow-xl hover:bg-background"
						>
							{isLocating ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Locate className="h-5 w-5" />
							)}
						</Button>

						{/* Legend / Filters (Bottom) */}
						<div className="absolute bottom-6 left-6 right-6 flex gap-2">
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
							<button
								type="button"
								onClick={() => toggleFilter("company")}
								className={cn(
									"flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md",
									filters.company
										? "bg-amber-500/20 border border-amber-500/50 text-amber-600 dark:text-amber-400"
										: "bg-background/60 dark:bg-background/40 border border-border text-muted-foreground opacity-60",
								)}
							>
								<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
								{t("map.company")}
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
