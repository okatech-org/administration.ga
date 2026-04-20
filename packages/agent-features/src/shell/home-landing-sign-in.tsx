/**
 * HomeLandingSignIn — Shell horizontal 5 volets (landing non-authentifié).
 *
 * Rendu lorsque l'utilisateur N'EST PAS authentifié. Fournit l'infrastructure
 * (scroll snap horizontal, Navbar sticky, dots, nav clavier, skip-link) et
 * délègue le RENDU des panneaux + Navbar à l'hôte via des props.
 *
 * Pourquoi DI : chaque host app (agent-web / agent-desktop) a son propre
 * Navbar et ses propres sections (HeroSection + SignInCard couplés à
 * `authClient`, motion/react, traductions custom). Les extraire dans le
 * package serait redondant et ajouterait un graphe d'imports peer lourd.
 */

"use client";

import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export interface HomeLandingSignInPanel {
	/** Clé stable utilisée pour l'aria-label des dots et la reconciliation React. */
	key: string;
	/** Label humain (FR) affiché au lecteur d'écran pour le dot correspondant. */
	label: string;
	/**
	 * Fonction render. Reçoit une ref à poser sur le **scroll panel** (pour
	 * que l'IntersectionObserver détecte quand il devient actif). Peut aussi
	 * recevoir `signInRef` pour que le Hero pose la ref sur sa carte de
	 * connexion (scroll-into-view depuis la Navbar).
	 */
	render: (args: {
		panelRef: React.RefObject<HTMLDivElement | null>;
		signInRef: React.RefObject<HTMLDivElement | null>;
		onNext: () => void;
	}) => ReactNode;
}

export interface HomeLandingSignInProps {
	/**
	 * Liste ordonnée des panneaux. Au moins 1, typiquement 5 pour la version
	 * full agent-web.
	 */
	panels: HomeLandingSignInPanel[];
	/**
	 * Navbar sticky — reçoit l'index du panneau actif, un callback navigate,
	 * et un callback pour scroller jusqu'au formulaire signIn dans le Hero.
	 */
	renderNavbar: (args: {
		activePanel: number;
		onNavigate: (index: number) => void;
		onScrollToSignIn: () => void;
	}) => ReactNode;
	/**
	 * Libellé a11y du skip-link (défaut "Aller au contenu principal").
	 */
	skipLinkLabel?: string;
	/**
	 * Instruction clavier pour lecteurs d'écran.
	 */
	keyboardHelpText?: string;
}

function Panel({
	children,
	panelRef,
}: {
	children: ReactNode;
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

export function HomeLandingSignIn({
	panels,
	renderNavbar,
	skipLinkLabel = "Aller au contenu principal",
	keyboardHelpText = "Utilisez les flèches gauche et droite pour naviguer entre les volets.",
}: HomeLandingSignInProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	// Ref vers la zone de connexion dans le Hero (premier panel typiquement)
	const signInRef = useRef<HTMLDivElement>(null);

	const panelCount = panels.length;
	const [activePanel, setActivePanel] = useState(0);

	// One ref per panel — allocate in a ref array. React hooks must be stable,
	// so we derive the array once based on panels length (assume panels count
	// is stable during a mount — host re-mounts if it changes).
	const panelRefsRef = useRef<Array<React.RefObject<HTMLDivElement | null>>>([]);
	if (panelRefsRef.current.length !== panelCount) {
		panelRefsRef.current = Array.from({ length: panelCount }, () => ({
			current: null,
		}));
	}
	const panelRefs = panelRefsRef.current;

	// Scroll vers le formulaire de connexion
	const scrollToSignIn = useCallback(() => {
		signInRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, []);

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
					if (entry?.isIntersecting) setActivePanel(i);
				},
				{ root: container, threshold: 0.5 },
			);

			observer.observe(el);
			observers.push(observer);
		});

		return () => observers.forEach((obs) => obs.disconnect());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [panelCount]);

	// Keyboard arrow navigation
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" && activePanel < panelCount - 1) {
				navigateToPanel(activePanel + 1);
			} else if (e.key === "ArrowLeft" && activePanel > 0) {
				navigateToPanel(activePanel - 1);
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [activePanel, navigateToPanel, panelCount]);

	return (
		<div className="relative">
			{/* WCAG 2.4.1 — Skip link (visible uniquement au focus clavier) */}
			<a href="#main-content" className="skip-link">
				{skipLinkLabel}
			</a>

			{/* Navbar — reçoit le panel actif pour adapter son style */}
			{renderNavbar({
				activePanel,
				onNavigate: navigateToPanel,
				onScrollToSignIn: scrollToSignIn,
			})}

			{/* WCAG — Instructions clavier pour lecteurs d'écran */}
			<div id="keyboard-help" className="sr-only">
				{keyboardHelpText}
			</div>

			{/* Horizontal scroll container — <main> pour sémantique */}
			<main
				id="main-content"
				ref={containerRef}
				className="flex snap-x snap-mandatory h-dvh overflow-x-scroll overflow-y-hidden landing-scroll-container hero-gradient-base"
				aria-describedby="keyboard-help"
			>
				{panels.map((panel, i) => {
					const panelRef = panelRefs[i]!;
					const onNext = () => navigateToPanel(i + 1);
					return (
						<Panel key={panel.key} panelRef={panelRef}>
							{panel.render({ panelRef, signInRef, onNext })}
						</Panel>
					);
				})}
			</main>

			{/* Panel progress dots (bottom center) — ARIA tablist */}
			<div
				className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2"
				role="tablist"
				aria-label="Navigation entre les volets"
			>
				{panels.map((panel, i) => (
					<button
						key={panel.key}
						type="button"
						role="tab"
						aria-selected={activePanel === i}
						aria-label={panel.label}
						onClick={() => navigateToPanel(i)}
						className="focus-ring p-1"
					>
						<div
							className={`rounded-full transition-all duration-300 ${
								activePanel === i
									? "w-6 h-2 bg-emerald-400"
									: "w-2 h-2 bg-white/40 hover:bg-white/60"
							}`}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
