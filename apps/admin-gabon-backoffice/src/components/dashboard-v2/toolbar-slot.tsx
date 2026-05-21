"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Portail vers le slot d'actions de la top-bar du back-office.
 *
 * `AutoBreadcrumb` rend un nœud `<span data-toolbar-slot>` (en
 * `display:contents` pour rester transparent au flex parent). Les pages
 * peuvent monter `<ToolbarSlot>` pour téléporter du contenu dans ce slot
 * sans toucher au layout — utile pour les actions spécifiques à une page
 * (ex. dashboard : pill santé + bouton refresh à côté de la cloche).
 *
 * ```tsx
 * <ToolbarSlot>
 *   <SystemHealthPill />
 *   <button className="btn btn-sm btn-soft">Rafraîchir</button>
 * </ToolbarSlot>
 * ```
 *
 * Pourquoi un portail plutôt qu'un Context+state ? Le contenu injecté
 * change à chaque render de la page (JSX = nouvelle identité), ce qui
 * provoquerait un setState→re-render en boucle dans un schéma context.
 * Les portails évitent ce problème : ils déplacent le DOM mais laissent
 * la propagation React normale.
 */
export function ToolbarSlot({ children }: { children: ReactNode }) {
	const [target, setTarget] = useState<Element | null>(null);

	useEffect(() => {
		if (typeof document === "undefined") return;
		let cancelled = false;
		const tryAttach = () => {
			if (cancelled) return;
			const el = document.querySelector("[data-toolbar-slot]");
			if (el) {
				setTarget(el);
			} else {
				requestAnimationFrame(tryAttach);
			}
		};
		tryAttach();
		return () => {
			cancelled = true;
		};
	}, []);

	if (!target) return null;
	return createPortal(<>{children}</>, target);
}
