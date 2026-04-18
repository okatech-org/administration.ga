"use client";

/**
 * Bouton partagé par toutes les bubbles contextuelles. Reproduit le style
 * visuel des contrôles Pages : neutre au repos, fond `primary/15` actif.
 * `preventDefault` au mousedown empêche la perte de focus / sélection de
 * l'éditeur — important pour que les commandes Tiptap s'appliquent au
 * bloc courant.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";

export interface BubbleButtonProps {
	icon: LucideIcon;
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
}

export function BubbleButton({
	icon: Icon,
	label,
	active,
	disabled,
	onClick,
}: BubbleButtonProps): ReactElement {
	return (
		<button
			type="button"
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
			disabled={disabled}
			title={label}
			aria-label={label}
			aria-pressed={active}
			data-active={active ? "true" : undefined}
			className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
		>
			<Icon size={16} />
		</button>
	);
}

export function BubbleDivider(): ReactElement {
	return <div aria-hidden className="mx-0.5 h-5 w-px bg-border/60" />;
}
