/**
 * CircleMenu — export public avec switcher `prefers-reduced-motion`.
 *
 * Le consumer importe toujours `CircleMenu` depuis ce barrel :
 *   import { CircleMenu } from "@workspace/iasted/components/circle-menu";
 *
 * Au runtime, le switcher choisit entre la variante animée et la variante
 * statique selon la préférence OS de l'utilisateur.
 */

"use client";

import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { CircleMenu as CircleMenuAnimated } from "./CircleMenu";
import { CircleMenuReducedMotion } from "./CircleMenu.reduced-motion";
import type { CircleMenuProps } from "./types";

export type { CircleMenuItemConfig, CircleMenuProps } from "./types";
export { IAstedTrigger3D, type IAstedTrigger3DProps } from "./IAstedTrigger3D";
export { IAstedButtonFull, type IAstedButtonFullProps } from "./IAstedButtonFull";
export {
	IAstedFanMenu,
	type IAstedFanMenuItem,
	type IAstedFanMenuProps,
} from "./IAstedFanMenu";

/**
 * CircleMenu — variante animée par défaut, statique si
 * `prefers-reduced-motion: reduce` est actif côté OS.
 */
export function CircleMenu(props: CircleMenuProps) {
	const reduced = useReducedMotion();

	if (reduced) {
		return <CircleMenuReducedMotion {...props} />;
	}
	return <CircleMenuAnimated {...props} />;
}

// Exports nominatifs (pour Storybook ou tests ciblant une variante particulière).
export { CircleMenuAnimated, CircleMenuReducedMotion };
