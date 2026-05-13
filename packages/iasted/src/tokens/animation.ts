/**
 * Animation tokens — source unique de vérité pour tous les composants iAsted.
 *
 * Référence audit : docs/audits/2026-04-15_iasted_audit.md §4
 * Référence DS v3 : .claude/skills/consulat-design-system/CITIZEN_DESIGN_SYSTEM_V3.md §10
 *
 * Primitives extraites bit-exact de apps/citizen-web/src/components/ui/circle-menu.tsx
 * et des patterns `type: "spring"` observés dans les 3 *IAstedWindow* existants.
 *
 * IMPORTANT : ne pas modifier sans référer à l'audit. Toute évolution des springs
 * casse le rythme visuel et la signature identitaire du module iAsted.
 */

import type { Transition } from "motion/react";

// ─────────────────────────────────────────────────────────────
// CircleMenu — constantes extraites bit-exact
// ─────────────────────────────────────────────────────────────

export const CIRCLE_MENU = {
	/** Taille d'un item orbital (px). */
	itemSize: 48,
	/** Taille du container expansé (px). */
	containerSize: 250,
	/** Délai entre items à l'ouverture (s). */
	openStagger: 0.05,
	/** Délai entre items à la fermeture (s). */
	closeStagger: 0.12,
	/** Durée d'une oscillation du shake (s). */
	shakeDuration: 0.15,
	/** Spring appliqué aux items orbitaux. */
	springItems: { type: "spring", stiffness: 180, damping: 22 } as const satisfies Transition,
	/** Spring appliqué au trigger central. */
	springTrigger: { type: "spring", stiffness: 200, damping: 18 } as const satisfies Transition,
	/** Durée de l'orbit (blur + rotate) en fonction du nombre d'items. */
	orbitDuration: (itemCount: number) => 0.12 * (itemCount + 2),
	/** Décalage max du trigger (shake). */
	shakeOffset: 1.5,
	// ── Refonte 2026-04-26 : arc haut-gauche + gooey blob ──
	/** Angle de départ de l'arc (rad) — π = ouest. */
	arcStart: Math.PI,
	/** Angle de fin de l'arc (rad) — 3π/2 = nord. */
	arcEnd: (3 * Math.PI) / 2,
	/** Distance trigger ↔ centre item (px). */
	arcRadius: 118,
	// ── Presets de layout (mai 2026) ──
	// `corner` : arc quart-de-cercle, trigger ancré bottom-right de l'écran.
	//   Pour ≥4 items, on étend légèrement l'arc + on augmente le rayon afin
	//   d'éviter le chevauchement et les labels coupés par le bord d'écran.
	// `fan`   : arc demi-cercle qui s'ouvre vers le haut, trigger centré
	//   (typique mobile). Items distribués symétriquement de gauche à droite
	//   en passant par le haut.
	arcLayouts: {
		corner: {
			start: Math.PI,
			end: (3 * Math.PI) / 2,
			radius: 118,
			// Si plus de 3 items, on étend l'arc de 15° et on agrandit le rayon
			// pour libérer de l'espace.
			startWide: Math.PI - Math.PI / 24,
			endWide: (3 * Math.PI) / 2 + Math.PI / 12,
			radiusWide: 144,
		},
		fan: {
			// π → 2π = de gauche, à travers le haut, jusqu'à droite
			start: Math.PI,
			end: 2 * Math.PI,
			radius: 130,
			startWide: Math.PI,
			endWide: 2 * Math.PI,
			radiusWide: 145,
		},
	},
	/** Stagger réduit pour deploy organique rapide (s). */
	organicStagger: 0.05,
	/** Spring d'émergence des items (overshoot léger, ~+100 ms vs version précédente). */
	springItemsOrganic: { type: "spring", stiffness: 240, damping: 17, mass: 0.7 } as const satisfies Transition,
	/** Spring du trigger — scale subtil, sans dance. */
	springTriggerSubtle: { type: "spring", stiffness: 240, damping: 22 } as const satisfies Transition,
	/** Filtre SVG goo (metaball) — stdDeviation/threshold renforcés pour effet gluant prononcé. */
	goo: {
		filterId: "iasted-goo",
		stdDeviation: 12,
		colorMatrix: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12",
	},
} as const;

// ─────────────────────────────────────────────────────────────
// Window — shell principal (WindowShell)
// ─────────────────────────────────────────────────────────────

export const WINDOW_MOTION = {
	initial: { opacity: 0, y: "100%" },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: "100%" },
	transition: { type: "spring", stiffness: 320, damping: 28 } as const satisfies Transition,
} as const;

// ─────────────────────────────────────────────────────────────
// Tab indicator — indicator underline partagé entre apps (layoutId)
// ─────────────────────────────────────────────────────────────

export const TAB_INDICATOR_MOTION = {
	layoutId: "iasted-tab-indicator",
	transition: { type: "spring", stiffness: 400, damping: 30 } as const satisfies Transition,
} as const;

// ─────────────────────────────────────────────────────────────
// Drawer — fiche citoyen 360° (Phase 3)
// ─────────────────────────────────────────────────────────────

export const DRAWER_MOTION = {
	initial: { x: "100%" },
	animate: { x: 0 },
	exit: { x: "100%" },
	transition: { type: "spring", stiffness: 320, damping: 28 } as const satisfies Transition,
} as const;

// ─────────────────────────────────────────────────────────────
// Message bubble — entrance
// ─────────────────────────────────────────────────────────────

export const MESSAGE_MOTION = {
	initial: { opacity: 0, y: 8, scale: 0.96 },
	animate: { opacity: 1, y: 0, scale: 1 },
	transition: { type: "spring", stiffness: 400, damping: 30 } as const satisfies Transition,
} as const;

// ─────────────────────────────────────────────────────────────
// Reduced-motion fallback — WCAG 2.1 AA
// ─────────────────────────────────────────────────────────────

/**
 * Transition sans animation (pour `prefers-reduced-motion: reduce`).
 * À composer avec les presets ci-dessus via spread : `{ ...WINDOW_MOTION, transition: REDUCED_MOTION.transition }`.
 */
export const REDUCED_MOTION = {
	transition: { duration: 0 } as const satisfies Transition,
	/** Variante CircleMenu : fade+scale 150ms, pas de shake/orbit. */
	circleMenuFadeScale: {
		initial: { opacity: 0, scale: 0.9 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.9 },
		transition: { duration: 0.15, ease: "easeOut" } as const satisfies Transition,
	},
} as const;

// ─────────────────────────────────────────────────────────────
// Export unifié (sugar)
// ─────────────────────────────────────────────────────────────

export const IASTED_ANIMATION = {
	window: WINDOW_MOTION,
	tabIndicator: TAB_INDICATOR_MOTION,
	drawer: DRAWER_MOTION,
	circleMenu: CIRCLE_MENU,
	message: MESSAGE_MOTION,
	reducedMotion: REDUCED_MOTION,
} as const;
