/**
 * buildCircleMenuItems — construit les items du CircleMenu.
 *
 * Refonte 2026-04-26 : 3 items en arc haut-gauche (cf. CircleMenu.tsx).
 * Composition surface-dépendante :
 *
 * - **citizen** : Mr Ray (rose, expand /iasted) + iChat + iAppel
 * - **agent / backoffice / agent-desktop** : iChat + iAppel + iContact
 *
 * L'ordre détermine la position dans l'arc (cf. `pointOnArc` dans CircleMenu.tsx) :
 * [0] = haut, [1] = haut-gauche, [2] = gauche.
 */

import type { ReactNode } from "react";
import { Bot, Contact, Headphones, MessageSquare, Phone } from "lucide-react";
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
	 * Action « expand » (route vers la page fullscreen `/iasted`).
	 * Utilisée par l'item « Mr Ray » sur la surface citizen.
	 */
	expand?: () => void;
	/**
	 * Résolveur i18n optionnel (ex : t depuis react-i18next).
	 * Retourne `labelKey` + fallback.
	 */
	resolveLabel?: (labelKey: string, fallback: string) => string;
}

const iconProps = { size: 18, className: "text-white" };

export function buildCircleMenuItems(
	options: BuildCircleMenuItemsOptions,
): CircleMenuItemConfig[] {
	const { surface, openWithTab, expand, resolveLabel } = options;
	const t = resolveLabel ?? ((_k: string, f: string) => f);

	const iChat: CircleMenuItemConfig = {
		label: t("iasted.circle.ichat", "iChat"),
		icon: <MessageSquare {...iconProps} />,
		className: "bg-emerald-600 hover:bg-emerald-500",
		onClick: () => openWithTab("ichat"),
	};
	const iAppel: CircleMenuItemConfig = {
		label: t("iasted.circle.icall", "iAppel"),
		icon: <Phone {...iconProps} />,
		className: "bg-gabon-blue hover:brightness-110",
		onClick: () => openWithTab("icall"),
	};
	const iContact: CircleMenuItemConfig = {
		label: t("iasted.circle.icontact", "iContact"),
		icon: <Contact {...iconProps} />,
		className: "bg-amber-500 hover:bg-amber-400",
		onClick: () => openWithTab("icontact"),
	};

	if (surface === "citizen") {
		const mrRay: CircleMenuItemConfig = {
			label: t("iasted.circle.mrRay", "Mr Ray"),
			icon: <Headphones {...iconProps} />,
			className: "bg-rose-500 hover:bg-rose-400",
			onClick: expand ?? (() => openWithTab("ichat")),
		};
		// citizen : Mr Ray + iChat + iAppel (pas d'iContact)
		return [mrRay, iChat, iAppel];
	}

	// agent / backoffice / agent-desktop : iChat + iAppel + iContact
	return [iChat, iAppel, iContact];
}

/** Icône du trigger par défaut (Bot blanc sur fond vert émeraude). */
export function defaultTriggerIcon(_surface: IAstedSurface): ReactNode {
	return <Bot size={22} className="text-white" />;
}

/**
 * Classe Tailwind du trigger — vert émeraude unifié sur toutes les surfaces.
 */
export function defaultTriggerClassName(_surface: IAstedSurface): string {
	return "bg-emerald-600 hover:bg-emerald-500";
}
