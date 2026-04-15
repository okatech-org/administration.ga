/**
 * Dimensions & breakpoints tokens pour le module iAsted.
 *
 * Source : patterns observés dans les 3 *IAstedWindow.tsx* existants.
 * DS v3 §13 (Responsive Breakpoints) : mobile-first, les tailles mobile sont la référence.
 */

// ─────────────────────────────────────────────────────────────
// WindowShell — dimensions
// ─────────────────────────────────────────────────────────────

export const WINDOW_SIZES = {
	/** Largeur desktop (popup ancrée bottom-right). */
	desktopWidth: 420,
	/** Hauteur desktop (clamp CSS : min(640px, calc(100vh - 100px))). */
	desktopHeight: 640,
	/** Offset vertical par rapport au bottom (px, pour laisser respirer au-dessus du navbar). */
	desktopBottomOffset: 100,
	/** Mobile : 100dvh - navbar. Viewport dynamic height. */
	mobileHeightCss: "100dvh",
	/** Citizen mobile preset : fenêtre plus basse (85dvh) pour laisser voir le dashboard derrière. */
	citizenMobileHeightCss: "85dvh",
} as const;

// ─────────────────────────────────────────────────────────────
// Z-index — couches iAsted
// ─────────────────────────────────────────────────────────────

export const Z_INDEX = {
	/** WindowShell (base). */
	window: 50,
	/** FAB CircleMenu (au-dessus du window quand fermé). */
	fab: 50,
	/** Drawer fiche citoyen 360° (Phase 3). */
	drawer: 60,
	/** Modale interne (ex : macros panel). */
	modal: 70,
	/** Toast / sonner. */
	toast: 80,
} as const;

// ─────────────────────────────────────────────────────────────
// Breakpoints (alignés Tailwind v4 config)
// ─────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
	/** sm: 640px */
	sm: 640,
	/** md: 768px */
	md: 768,
	/** lg: 1024px */
	lg: 1024,
	/** xl: 1280px */
	xl: 1280,
} as const;

// ─────────────────────────────────────────────────────────────
// Avatars (DS v3 §5.12)
// ─────────────────────────────────────────────────────────────

export const AVATAR_SIZES = {
	/** Hero mobile (80px). */
	heroMobile: 80,
	/** Hero desktop (120px). */
	heroDesktop: 120,
	/** Sidebar / petit (36px). */
	small: 36,
	/** Bottom sheet (40px). */
	medium: 40,
	/** Agent roster stack (32px). */
	roster: 32,
} as const;

export const IASTED_SIZES = {
	window: WINDOW_SIZES,
	zIndex: Z_INDEX,
	breakpoints: BREAKPOINTS,
	avatar: AVATAR_SIZES,
} as const;
