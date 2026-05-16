"use client";

import type { ReactNode } from "react";
import { Icon } from "./icon";

/**
 * Bloc titre de page Dashboard V2 : icône carrée + titre + sous-titre
 * + actions optionnelles à droite. Réutilisable sur toutes les pages.
 */
export function PageHeader({
	icon = "LayoutDashboard",
	title,
	subtitle,
	actions,
}: {
	icon?: string;
	title: string;
	subtitle?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "space-between",
				gap: 16,
				flexWrap: "wrap",
			}}
		>
			<div className="row items-center" style={{ gap: 14 }}>
				<div
					style={{
						width: 44,
						height: 44,
						borderRadius: 12,
						background: "var(--surface)",
						border: "1px solid var(--border)",
						display: "grid",
						placeItems: "center",
						color: "var(--text)",
					}}
				>
					<Icon name={icon} size={20} />
				</div>
				<div>
					<h1>{title}</h1>
					{subtitle && (
						<div className="text-sm text-muted" style={{ marginTop: 2 }}>
							{subtitle}
						</div>
					)}
				</div>
			</div>
			{actions && (
				<div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
					{actions}
				</div>
			)}
		</div>
	);
}
