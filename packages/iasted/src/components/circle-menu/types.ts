/**
 * Types du CircleMenu partagé.
 *
 * Extraits de apps/citizen-web/src/components/ui/circle-menu.tsx (bit-exact).
 */

import type { ReactNode } from "react";

export interface CircleMenuItemConfig {
	label: string;
	icon: ReactNode;
	href?: string;
	onClick?: () => void;
	/** Classe Tailwind de fond (ex : "bg-rose-500", "bg-gabon-blue"). */
	className?: string;
}

export interface CircleMenuProps {
	items: CircleMenuItemConfig[];
	/** Icône du trigger central. */
	openIcon?: ReactNode;
	/** Classe Tailwind du trigger (défaut : "bg-foreground"). */
	triggerClassName?: string;
	/** Classe Tailwind par défaut des items (override par item.className). */
	itemClassName?: string;
	/** Auto-open au mount (utile pour dashboard-first). */
	defaultOpen?: boolean;
	/** Callback après la séquence close complète. */
	onCloseComplete?: () => void;
	/** Callback quand le trigger est cliqué alors que le menu est ouvert. */
	onTriggerClick?: () => void;
}
