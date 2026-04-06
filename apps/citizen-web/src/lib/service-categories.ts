/**
 * Configuration centralisee des categories de services consulaires.
 * Source unique pour tous les fichiers qui affichent des categories.
 */

import { ServiceCategory } from "@convex/lib/constants";
import {
	BookOpen,
	BookOpenCheck,
	Building2,
	FileCheck,
	FileText,
	Globe,
	type LucideIcon,
	ShieldAlert,
	SlidersHorizontal,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryConfig {
	id: string;
	icon: LucideIcon;
	labelKey: string;
}

export interface CategoryStyle {
	/** Classe CSS pour l'icone (ex: "stat-icon-blue") */
	iconClass: string;
	/** Classe CSS pour le background de l'icone (ex: "stat-icon-blue") — meme valeur, le stat-icon-* gere les deux */
	bgClass: string;
	/** Fallback Tailwind — pour les contextes qui ne supportent pas stat-icon-* */
	color: string;
	bgColor: string;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

/** Liste ordonnee de toutes les categories avec "Tous" en premier */
export const SERVICE_CATEGORIES: CategoryConfig[] = [
	{ id: "ALL", icon: SlidersHorizontal, labelKey: "services.category.all" },
	{ id: ServiceCategory.Passport, icon: BookOpenCheck, labelKey: "services.category.passport" },
	{ id: ServiceCategory.Visa, icon: Globe, labelKey: "services.category.visa" },
	{ id: ServiceCategory.CivilStatus, icon: FileText, labelKey: "services.category.civilStatus" },
	{ id: ServiceCategory.Registration, icon: BookOpen, labelKey: "services.category.registration" },
	{ id: ServiceCategory.Certification, icon: FileCheck, labelKey: "services.category.certification" },
	{ id: ServiceCategory.Assistance, icon: ShieldAlert, labelKey: "services.category.assistance" },
	{ id: ServiceCategory.Declaration, icon: Building2, labelKey: "services.category.declaration" },
];

/** Categories sans "Tous" — pour les filtres qui ne proposent pas "tout afficher" */
export const SERVICE_CATEGORIES_WITHOUT_ALL = SERVICE_CATEGORIES.filter(
	(c) => c.id !== "ALL",
);

/** Map directe id → LucideIcon */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
	SERVICE_CATEGORIES_WITHOUT_ALL.map((c) => [c.id, c.icon]),
);

/**
 * Styles visuels par categorie.
 * Utilise les classes stat-icon-* du design system (globals.css)
 * + fallback Tailwind pour les contextes legacy (page publique /services).
 */
export const CATEGORY_STYLE_MAP: Record<string, CategoryStyle> = {
	[ServiceCategory.Passport]: {
		iconClass: "stat-icon-blue",
		bgClass: "stat-icon-blue",
		color: "text-[oklch(0.55_0.15_250)]",
		bgColor: "bg-[oklch(0.55_0.15_250/0.12)]",
	},
	[ServiceCategory.Identity]: {
		iconClass: "stat-icon-blue",
		bgClass: "stat-icon-blue",
		color: "text-[oklch(0.55_0.15_250)]",
		bgColor: "bg-[oklch(0.55_0.15_250/0.12)]",
	},
	[ServiceCategory.Visa]: {
		iconClass: "stat-icon-green",
		bgClass: "stat-icon-green",
		color: "text-[oklch(0.52_0.17_145)]",
		bgColor: "bg-[oklch(0.52_0.17_145/0.12)]",
	},
	[ServiceCategory.CivilStatus]: {
		iconClass: "stat-icon-orange",
		bgClass: "stat-icon-orange",
		color: "text-[oklch(0.65_0.20_35)]",
		bgColor: "bg-[oklch(0.65_0.20_35/0.12)]",
	},
	[ServiceCategory.Registration]: {
		iconClass: "stat-icon-purple",
		bgClass: "stat-icon-purple",
		color: "text-[oklch(0.55_0.20_290)]",
		bgColor: "bg-[oklch(0.55_0.20_290/0.12)]",
	},
	[ServiceCategory.Certification]: {
		iconClass: "stat-icon-orange",
		bgClass: "stat-icon-orange",
		color: "text-[oklch(0.65_0.20_35)]",
		bgColor: "bg-[oklch(0.65_0.20_35/0.12)]",
	},
	[ServiceCategory.Assistance]: {
		iconClass: "stat-icon-orange",
		bgClass: "stat-icon-orange",
		color: "text-destructive",
		bgColor: "bg-destructive/10",
	},
	[ServiceCategory.Declaration]: {
		iconClass: "stat-icon-purple",
		bgClass: "stat-icon-purple",
		color: "text-[oklch(0.55_0.20_290)]",
		bgColor: "bg-[oklch(0.55_0.20_290/0.12)]",
	},
	[ServiceCategory.Other]: {
		iconClass: "",
		bgClass: "",
		color: "text-muted-foreground",
		bgColor: "bg-muted",
	},
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Recupere la config complete pour une categorie donnee */
export function getCategoryConfig(category: string): {
	icon: LucideIcon;
	style: CategoryStyle;
	labelKey: string;
} {
	const cat = SERVICE_CATEGORIES_WITHOUT_ALL.find((c) => c.id === category);
	const style = CATEGORY_STYLE_MAP[category] ?? CATEGORY_STYLE_MAP[ServiceCategory.Other];
	return {
		icon: cat?.icon ?? FileText,
		style,
		labelKey: cat?.labelKey ?? "services.category.other",
	};
}
