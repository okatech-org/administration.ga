"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export type CrumbItem = {
	label: string;
	href?: string;
};

/**
 * Barre d'outils sticky en haut de chaque page Dashboard V2.
 * Couche fil d'Ariane + bouton retour + actions à droite.
 *
 * - `breadcrumb` : tableau d'items {label, href?}. Le dernier item est
 *   rendu en couleur foncée (page courante), les autres en muted +
 *   `<Link>` cliquable si `href` fourni.
 * - `backHref` : si défini, le bouton flèche-gauche pointe dessus. Si
 *   null/undefined, pas de bouton retour.
 * - `right` : nœud libre pour les actions à droite (boutons, chips).
 */
export function DashboardToolbar({
	breadcrumb,
	backHref = "/",
	right,
}: {
	breadcrumb: CrumbItem[];
	backHref?: string | null;
	right?: ReactNode;
}) {
	const router = useRouter();
	return (
		<div className="v2-toolbar">
			<div className="left">
				{backHref !== null && (
					<button
						type="button"
						className="btn btn-icon btn-soft"
						aria-label="Retour"
						onClick={() => {
							if (backHref) router.push(backHref);
							else router.back();
						}}
					>
						<Icon name="ArrowLeft" size={16} />
					</button>
				)}
				<div className="v2-crumb">
					{breadcrumb.map((item, i) => {
						const last = i === breadcrumb.length - 1;
						return (
							<span key={`${item.label}-${i}`} className="row items-center" style={{ gap: 6 }}>
								{i > 0 && <Icon name="ChevronRight" size={12} />}
								{last ? (
									<span className="here">{item.label}</span>
								) : item.href ? (
									<Link href={item.href}>{item.label}</Link>
								) : (
									<span>{item.label}</span>
								)}
							</span>
						);
					})}
				</div>
			</div>
			{right && <div className="right">{right}</div>}
		</div>
	);
}
