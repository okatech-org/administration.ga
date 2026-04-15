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
