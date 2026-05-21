"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { DashboardToolbar, type CrumbItem } from "./dashboard-toolbar";
import { NotificationsBell } from "./notifications-bell";

/**
 * Labels par segment d'URL. Pour les segments dynamiques (ex. `/users/[userId]`)
 * on retombe sur le segment tronqué.
 */
const SEGMENT_LABELS: Record<string, string> = {
	"": "Back-office",
	users: "Utilisateurs",
	skills: "Compétences & Métiers",
	reps: "Administrations",
	"corps-diplomatique": "Cadres Administratifs",
	profiles: "Profils",
	requests: "Demandes",
	services: "Services",
	settings: "Paramètres",
	support: "Support",
	posts: "Actualités",
	tutorials: "Tutoriels",
	events: "Événements",
	associations: "Associations",
	"audit-logs": "Journaux d'audit",
	monitoring: "Monitoring",
	config: "Configuration",
	templates: "Modèles",
	positions: "Postes",
	modules: "Modules",
	representations: "Administrations",
	"print-settings": "Impression",
	"affaires-consulaires": "Démarches administratives",
	"affaires-diplomatiques": "Pilotage stratégique",
	icorrespondance: "iCorrespondance",
	idocument: "iDocument",
	iagenda: "iAgenda",
	appointments: "Rendez-vous",
	reports: "Rapports",
	branding: "Branding",
	edit: "Édition",
	new: "Nouveau",
	"form-builder": "Form Builder",
	versions: "Versions",
	ai: "IA",
	contacts: "Contacts",
};

/**
 * Décide si un segment ressemble à un identifiant dynamique (UUID, ObjectId,
 * convex Id…). Dans ce cas on l'affiche tronqué et on saute le label.
 */
function isLikelyId(segment: string): boolean {
	if (segment.length >= 16 && /^[a-z0-9]+$/i.test(segment)) return true;
	if (/^[0-9a-f-]{20,}$/i.test(segment)) return true;
	return false;
}

function labelFor(segment: string): string {
	if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]!;
	if (isLikelyId(segment)) {
		return `…${segment.slice(-6)}`;
	}
	// Capitalise + remplace les tirets par espaces pour les segments inconnus.
	return segment
		.replace(/[-_]/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Breadcrumb auto-généré depuis le pathname. Affiché en haut de chaque
 * page du back-office par le `BackofficeLayout`. Masqué à la racine `/`
 * (le tableau de bord n'a pas besoin de fil d'Ariane).
 */
export function AutoBreadcrumb() {
	const { t: _t } = useTranslation();
	const pathname = usePathname() ?? "/";

	const crumbs: CrumbItem[] = useMemo(() => {
		// Racine : pas de breadcrumb.
		if (pathname === "/" || pathname === "") return [];
		const parts = pathname.split("/").filter(Boolean);
		const items: CrumbItem[] = [{ label: "Back-office", href: "/" }];
		let acc = "";
		for (let i = 0; i < parts.length; i++) {
			const seg = parts[i]!;
			acc += `/${seg}`;
			const isLast = i === parts.length - 1;
			items.push({
				label: labelFor(seg),
				// Le dernier item n'est pas cliquable (page courante), les
				// autres pointent vers leur niveau.
				href: isLast ? undefined : acc,
			});
		}
		return items;
	}, [pathname]);

	// Même à la racine on veut la cloche → render toujours, mais sans crumb
	// si on est sur `/`.
	const effectiveCrumbs: CrumbItem[] =
		crumbs.length === 0
			? [{ label: "Back-office", href: "/" }, { label: "Centre de Commandement" }]
			: crumbs;

	return (
		<DashboardToolbar
			breadcrumb={effectiveCrumbs}
			backHref={null}
			right={
				<>
					{/* Slot pour les actions injectées par la page courante via
					    `<ToolbarSlot>`. `display:contents` rend le span
					    transparent au flex parent. */}
					<span data-toolbar-slot style={{ display: "contents" }} />
					<NotificationsBell />
				</>
			}
		/>
	);
}
