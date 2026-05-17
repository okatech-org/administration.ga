/**
 * Phase → tokens design system
 *
 * Source de vérité unique pour les couleurs des 5 phases du pipeline.
 * Utilise EXCLUSIVEMENT les tokens semantic du design system OkaTech
 * (primary, warning, success, destructive, muted-foreground).
 *
 * Conformité CLAUDE.md : pas de couleurs Tailwind brutes (blue-500, amber-500, etc.).
 */

import {
	Target,
	BookOpen,
	Mail,
	FileText,
	Briefcase,
	type LucideIcon,
} from "lucide-react";

export type PipelinePhase =
	| "targeting"
	| "strategy"
	| "outreach"
	| "reporting"
	| "project";

export interface PhaseTheme {
	id: PipelinePhase;
	label: string;
	shortLabel: string;
	href: string;
	icon: LucideIcon;
	/** Classe Tailwind pour le texte coloré (token sémantique) */
	textClass: string;
	/** Classe Tailwind pour le fond léger (token sémantique avec /10) */
	bgClass: string;
	/** Classe combinée pour les badges (bg + text) */
	badgeClass: string;
	/** Classe pour les bordures en hover */
	borderHoverClass: string;
}

/**
 * Mapping sémantique des 5 phases sur les tokens du design system.
 *
 * Choix justifiés :
 * - targeting (début) → primary (bleu) : action de départ
 * - strategy → warning (amber) : phase de planification, attention requise
 * - outreach → primary (bleu, variante) : action externe en cours
 * - reporting → warning (amber, variante) : rapport en attente de revue
 * - project (final) → success (vert) : résultat validé
 *
 * Pour distinguer outreach/targeting et reporting/strategy, on s'appuie
 * sur l'icône et le contexte plutôt que sur la couleur seule.
 */
export const PHASE_THEMES: Record<PipelinePhase, PhaseTheme> = {
	targeting: {
		id: "targeting",
		label: "Cibles",
		shortLabel: "Cibles",
		href: "/affaires-diplomatiques/cibles",
		icon: Target,
		textClass: "text-primary",
		bgClass: "bg-primary/10",
		badgeClass: "bg-primary/15 text-primary",
		borderHoverClass: "hover:border-primary/30",
	},
	strategy: {
		id: "strategy",
		label: "Plan Stratégique",
		shortLabel: "Plans",
		href: "/affaires-diplomatiques/plans",
		icon: BookOpen,
		textClass: "text-warning",
		bgClass: "bg-warning/10",
		badgeClass: "bg-warning/15 text-warning",
		borderHoverClass: "hover:border-warning/30",
	},
	outreach: {
		id: "outreach",
		label: "Lettres",
		shortLabel: "Lettres",
		href: "/affaires-diplomatiques/lettres",
		icon: Mail,
		textClass: "text-primary",
		bgClass: "bg-primary/10",
		badgeClass: "bg-primary/15 text-primary",
		borderHoverClass: "hover:border-primary/30",
	},
	reporting: {
		id: "reporting",
		label: "Rapports",
		shortLabel: "Rapports",
		href: "/affaires-diplomatiques/rapports",
		icon: FileText,
		textClass: "text-warning",
		bgClass: "bg-warning/10",
		badgeClass: "bg-warning/15 text-warning",
		borderHoverClass: "hover:border-warning/30",
	},
	project: {
		id: "project",
		label: "Projets",
		shortLabel: "Projets",
		href: "/affaires-diplomatiques/projets",
		icon: Briefcase,
		textClass: "text-success",
		bgClass: "bg-success/10",
		badgeClass: "bg-success/15 text-success",
		borderHoverClass: "hover:border-success/30",
	},
} as const;

/** Phases ordonnées (pour rendu séquentiel du stepper). */
export const PHASE_ORDER: readonly PipelinePhase[] = [
	"targeting",
	"strategy",
	"outreach",
	"reporting",
	"project",
] as const;

export const PHASE_THEMES_ORDERED: readonly PhaseTheme[] = PHASE_ORDER.map(
	(id) => PHASE_THEMES[id],
);
