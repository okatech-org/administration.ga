/**
 * buildCircleMenuItems — construit les items du CircleMenu selon la surface.
 *
 * MODÈLE UNIFIÉ (basé sur citizen-web original) :
 * Les 4 items sont IDENTIQUES entre citizen, agent, backoffice et agent-desktop :
 * - TOP    : Mr Ray / Dashboard (rose)    → ouvre la page fullscreen `/iasted`
 * - RIGHT  : iChat (vert émeraude)         → ouvre tab iChat
 * - BOTTOM : iAppel (bleu Gabon)           → ouvre tab iAppel
 * - LEFT   : iContact (ambre)              → ouvre tab iContact
 *
 * L'ordre de `items[]` est CRITIQUE — `pointOnCircle` place i=0 au TOP,
 * i=1 à RIGHT, i=2 à BOTTOM, i=3 à LEFT.
 *
 * Seul le LABEL du premier item varie selon la surface (Mr Ray vs Accueil),
 * pour respecter la sémantique de chaque contexte tout en gardant la même
 * identité visuelle.
 */

import type { ReactNode } from "react";
import {
	Bot,
	Contact,
	Headphones,
	MessageSquare,
	Phone,
	Settings,
} from "lucide-react";
import type { CircleMenuItemConfig } from "../components/circle-menu/types";
import type { IAstedSurface, IAstedTabId } from "../types/iasted";

export interface BuildCircleMenuItemsOptions {
	/** Surface appelante. */
	surface: IAstedSurface;
	/** Rôle effectif de l'utilisateur. */
	role?: "citizen" | "agent" | "admin" | "admin_system" | "super_admin";
	/**
	 * Ouvre la fenêtre compacte sur un tab donné.
	 * Injecté par le consumer (app).
	 */
	openWithTab: (tabId: IAstedTabId) => void;
	/**
	 * Action "expand" (route vers page fullscreen).
	 * Injecté par le consumer (app).
	 */
	expand?: () => void;
	/**
	 * Résolveur i18n optionnel (ex : t depuis react-i18next).
	 * Retourne `labelKey` + fallback.
	 */
	resolveLabel?: (labelKey: string, fallback: string) => string;
}

const iconProps = { size: 18, className: "text-white" };

/**
 * Label du premier item (TOP, rose) selon la surface.
 * - citizen : "Mr Ray" (agent humain)
 * - agent / backoffice / agent-desktop : "Accueil" ou "Dashboard" (même sémantique d'expand)
 */
function firstItemLabel(
	surface: IAstedSurface,
	resolveLabel?: (key: string, fallback: string) => string,
): { label: string; icon: typeof Headphones } {
	const t = resolveLabel ?? ((_k: string, f: string) => f);
	switch (surface) {
		case "citizen":
			return { label: t("iasted.circle.mrRay", "Mr Ray"), icon: Headphones };
		case "agent":
		case "agent-desktop":
			return { label: t("iasted.circle.dashboard", "Accueil"), icon: Bot };
		case "backoffice":
			return { label: t("iasted.circle.dashboard", "Accueil"), icon: Settings };
		default:
			return { label: "Accueil", icon: Bot };
	}
}

/**
 * Point d'entrée unique — produit toujours 4 items dans le MÊME ORDRE et
 * MÊMES COULEURS pour toutes les surfaces :
 *
 *   [0] TOP    — rose  — label surface-specific (Mr Ray / Accueil) — onClick: expand
 *   [1] RIGHT  — vert  — iChat
 *   [2] BOTTOM — bleu  — iAppel
 *   [3] LEFT   — ambre — iContact
 *
 * Le paramètre `role` est actuellement inutilisé mais conservé dans l'API pour
 * permettre des ajustements futurs (ex : masquer iAppel si le rôle n'a pas
 * la permission). Aujourd'hui, tous les rôles voient les mêmes 4 items.
 */
export function buildCircleMenuItems(
	options: BuildCircleMenuItemsOptions,
): CircleMenuItemConfig[] {
	const { surface, openWithTab, expand, resolveLabel } = options;
	const t = resolveLabel ?? ((_k: string, f: string) => f);
	const first = firstItemLabel(surface, resolveLabel);
	const FirstIcon = first.icon;

	return [
		// [0] TOP — rose — expand fullscreen (ou fallback ichat si pas d'expand)
		{
			label: first.label,
			icon: <FirstIcon {...iconProps} />,
			className: "bg-rose-500 hover:bg-rose-400",
			onClick: expand ?? (() => openWithTab("ichat")),
		},
		// [1] RIGHT — vert émeraude — iChat
		{
			label: t("iasted.circle.ichat", "iChat"),
			icon: <MessageSquare {...iconProps} />,
			className: "bg-emerald-600 hover:bg-emerald-500",
			onClick: () => openWithTab("ichat"),
		},
		// [2] BOTTOM — bleu Gabon — iAppel
		{
			label: t("iasted.circle.icall", "iAppel"),
			icon: <Phone {...iconProps} />,
			className: "bg-gabon-blue hover:brightness-110",
			onClick: () => openWithTab("icall"),
		},
		// [3] LEFT — ambre — iContact
		{
			label: t("iasted.circle.icontact", "iContact"),
			icon: <Contact {...iconProps} />,
			className: "bg-amber-500 hover:bg-amber-400",
			onClick: () => openWithTab("icontact"),
		},
	];
}

/** Icône du trigger par défaut (Bot blanc sur fond vert émeraude). */
export function defaultTriggerIcon(_surface: IAstedSurface): ReactNode {
	return <Bot size={22} className="text-white" />;
}

/**
 * Classe Tailwind du trigger — **vert émeraude unifié** sur toutes les surfaces.
 *
 * Le modèle de référence (citizen-web original, screenshot utilisateur) utilise
 * `bg-emerald-600`. Pour garantir la cohérence visuelle inter-apps demandée,
 * cette classe est identique pour citizen / agent / backoffice / agent-desktop.
 */
export function defaultTriggerClassName(_surface: IAstedSurface): string {
	return "bg-emerald-600 hover:bg-emerald-500";
}
