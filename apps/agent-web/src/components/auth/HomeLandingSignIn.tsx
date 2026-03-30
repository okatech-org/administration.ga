/**
 * HomeLandingSignIn — Expérience 5 volets horizontale premium
 *
 * Rendu lorsque l'utilisateur N'EST PAS authentifié.
 * 5 panels full-screen scrollables horizontalement (CSS snap scroll).
 * Navigation via la Navbar et les points de progression.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { MissionsSection } from "@/components/landing/MissionsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { RessourcesPanel } from "@/components/landing/RessourcesPanel";
import { TutorielsPanel } from "@/components/landing/TutorielsPanel";

const PANEL_COUNT = 5;
const PANEL_LABELS = ["Accueil", "Missions", "Valeurs", "Ressources", "Tutoriels"];

// ─── Panel wrapper ──────────────────────────────────────────────────────────

function Panel({
	children,
	panelRef,
}: {
	children: React.ReactNode;
	panelRef: React.RefObject<HTMLDivElement | null>;
}) {
	return (
		<div
			ref={panelRef}
			className="w-screen shrink-0 snap-start overflow-y-auto h-dvh"
		>
			{children}
		</div>
	);
}

// ─── Main component ─────────────────────────────────────────────────────────

export function HomeLandingSignIn() {
	const containerRef = useRef<HTMLDivElement>(null);

	// One ref per panel
	const p0 = useRef<HTMLDivElement>(null);
	const p1 = useRef<HTMLDivElement>(null);
	const p2 = useRef<HTMLDivElement>(null);
	const p3 = useRef<HTMLDivElement>(null);
	const p4 = useRef<HTMLDivElement>(null);
	const panelRefs = [p0, p1, p2, p3, p4];

	const [activePanel, setActivePanel] = useState(0);

	// Navigate to a specific panel by index
	const navigateToPanel = useCallback((index: number) => {
		const container = containerRef.current;
		if (!container) return;
		container.scrollTo({
			left: index * window.innerWidth,
			behavior: "smooth",
		});
	}, []);

	// Detect active panel via IntersectionObserver
	useEffect(() => {
		const observers: IntersectionObserver[] = [];
		const container = containerRef.current;

		panelRefs.forEach((ref, i) => {
			const el = ref.current;
			if (!el || !container) return;

			const observer = new IntersectionObserver(
				(entries) => {
					const entry = entries[0];
					if (entry.isIntersecting) setActivePanel(i);
				},
				{ root: container, threshold: 0.5 },
			);

			observer.observe(el);
			observers.push(observer);
		});

		return () => observers.forEach((obs) => obs.disconnect());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Keyboard arrow navigation
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" && activePanel < PANEL_COUNT - 1) {
				navigateToPanel(activePanel + 1);
			} else if (e.key === "ArrowLeft" && activePanel > 0) {
				navigateToPanel(activePanel - 1);
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [activePanel, navigateToPanel]);

	return (
		<div className="relative">
			{/* Fixed Navbar — reçoit le panel actif pour adapter son style */}
			<Navbar activePanel={activePanel} onNavigate={navigateToPanel} />

			{/* Horizontal scroll container */}
			<div
				ref={containerRef}
				className="flex snap-x snap-mandatory h-dvh overflow-x-scroll overflow-y-hidden landing-scroll-container"
			>
				{/* Panel 1 — Accueil */}
				<Panel panelRef={p0}>
					<HeroSection onNext={() => navigateToPanel(1)} />
				</Panel>

				{/* Panel 2 — Missions */}
				<Panel panelRef={p1}>
					<MissionsSection />
				</Panel>

				{/* Panel 3 — Valeurs */}
				<Panel panelRef={p2}>
					<FeaturesSection />
				</Panel>

				{/* Panel 4 — Ressources */}
				<Panel panelRef={p3}>
					<RessourcesPanel />
				</Panel>

				{/* Panel 5 — Tutoriels */}
				<Panel panelRef={p4}>
					<TutorielsPanel />
				</Panel>
			</div>

			{/* Panel progress dots (bottom center) */}
			<div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
				{Array.from({ length: PANEL_COUNT }).map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => navigateToPanel(i)}
						aria-label={PANEL_LABELS[i]}
					>
						<div
							className={`rounded-full transition-all duration-300 ${
								activePanel === i
									? "w-6 h-2 bg-primary"
									: "w-2 h-2 bg-slate-400/40 hover:bg-slate-400/60"
							}`}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
