/**
 * Configuration centralisee des statuts de dossiers (procedures administratives).
 * Equivalent de request-status-config.ts pour les dossierProcedures.
 */

import {
	AlertTriangle,
	Archive,
	CheckCircle2,
	Clock,
	Edit3,
	FileText,
	type LucideIcon,
	Pause,
	XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DossierStatus =
	| "brouillon"
	| "en_cours"
	| "en_attente"
	| "suspendu"
	| "valide"
	| "rejete"
	| "clos"
	| "archive";

export type DemarcheSubFilter = "tous" | "en_cours" | "en_attente" | "termines";

export interface DossierStatusConfig {
	label: string;
	i18nKey: string;
	icon: LucideIcon;
	/** Classe pour le texte du statut */
	color: string;
	/** Classe pour le background (badges, cards) */
	bgColor: string;
	/** Classe pour la bordure gauche accent des cards */
	borderColor: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

export const DOSSIER_STATUS_CONFIG: Record<DossierStatus, DossierStatusConfig> = {
	brouillon: {
		label: "Brouillon",
		i18nKey: "dossier.statuses.brouillon",
		icon: Edit3,
		color: "text-muted-foreground",
		bgColor: "bg-muted",
		borderColor: "border-l-muted-foreground/30",
	},
	en_cours: {
		label: "En cours",
		i18nKey: "dossier.statuses.en_cours",
		icon: Clock,
		color: "text-primary",
		bgColor: "bg-primary/10",
		borderColor: "border-l-primary",
	},
	en_attente: {
		label: "En attente",
		i18nKey: "dossier.statuses.en_attente",
		icon: AlertTriangle,
		color: "text-warning",
		bgColor: "bg-warning/10",
		borderColor: "border-l-warning",
	},
	suspendu: {
		label: "Suspendu",
		i18nKey: "dossier.statuses.suspendu",
		icon: Pause,
		color: "text-warning",
		bgColor: "bg-warning/10",
		borderColor: "border-l-warning",
	},
	valide: {
		label: "Valide",
		i18nKey: "dossier.statuses.valide",
		icon: CheckCircle2,
		color: "text-success",
		bgColor: "bg-success/10",
		borderColor: "border-l-success",
	},
	rejete: {
		label: "Rejete",
		i18nKey: "dossier.statuses.rejete",
		icon: XCircle,
		color: "text-destructive",
		bgColor: "bg-destructive/10",
		borderColor: "border-l-destructive",
	},
	clos: {
		label: "Clos",
		i18nKey: "dossier.statuses.clos",
		icon: FileText,
		color: "text-muted-foreground",
		bgColor: "bg-muted",
		borderColor: "border-l-muted-foreground/30",
	},
	archive: {
		label: "Archive",
		i18nKey: "dossier.statuses.archive",
		icon: Archive,
		color: "text-muted-foreground",
		bgColor: "bg-muted",
		borderColor: "border-l-muted-foreground/30",
	},
};

// ─── Sous-filtres "Mes Demarches" ───────────────────────────────────────────

export const DEMARCHE_FILTER_TABS: { key: DemarcheSubFilter; labelKey: string; fallback: string }[] = [
	{ key: "tous", labelKey: "demarches.filters.all", fallback: "Tous" },
	{ key: "en_cours", labelKey: "demarches.filters.inProgress", fallback: "En cours" },
	{ key: "en_attente", labelKey: "demarches.filters.pending", fallback: "En attente" },
	{ key: "termines", labelKey: "demarches.filters.completed", fallback: "Termines" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Filtre les dossiers selon le sous-filtre selectionne */
export function matchDossierFilter(status: DossierStatus, filter: DemarcheSubFilter): boolean {
	if (filter === "tous") return true;
	if (filter === "en_cours") return status === "en_cours" || status === "brouillon";
	if (filter === "en_attente") return status === "en_attente" || status === "suspendu";
	return status === "valide" || status === "rejete" || status === "clos" || status === "archive";
}

/** Filtre les requests selon le sous-filtre selectionne */
export function matchRequestFilter(status: string, filter: DemarcheSubFilter): boolean {
	if (filter === "tous") return true;
	if (filter === "en_cours") return ["submitted", "processing", "draft", "under_review", "in_production"].includes(status);
	if (filter === "en_attente") return ["action_required", "pending_documents", "pending", "appointment_scheduled"].includes(status);
	return ["completed", "approved", "rejected", "cancelled", "validated", "ready_for_pickup"].includes(status);
}

/** Calcule l'information de deadline a partir d'un timestamp */
export function getDeadlineInfo(dateLimite?: number): {
	label: string;
	color: string;
	urgent: boolean;
} | null {
	if (!dateLimite) return null;
	const now = Date.now();
	const daysLeft = Math.ceil((dateLimite - now) / 86400000);
	if (daysLeft < 0) return { label: "En retard", color: "text-destructive", urgent: true };
	if (daysLeft <= 3) return { label: `${daysLeft}j restant${daysLeft > 1 ? "s" : ""}`, color: "text-warning", urgent: true };
	return { label: `${daysLeft}j restants`, color: "text-muted-foreground", urgent: false };
}

/** Formate un timestamp en date francaise courte */
export function formatDateFr(ts: number): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(ts));
}

/**
 * Calcule le pourcentage de progression d'une request selon son statut.
 * Utile pour la barre de progression dans DemarcheProgressCard.
 */
export function getRequestProgressPercent(status: string): number {
	const progressMap: Record<string, number> = {
		draft: 5,
		submitted: 20,
		pending: 35,
		under_review: 50,
		in_production: 70,
		validated: 80,
		appointment_scheduled: 75,
		ready_for_pickup: 90,
		completed: 100,
		approved: 100,
		rejected: 100,
		cancelled: 100,
	};
	return progressMap[status] ?? 0;
}

/** Verifie si un statut de request necessite une action de l'utilisateur */
export function requestRequiresUserAction(status: string): boolean {
	return ["draft", "action_required", "pending_documents", "appointment_scheduled", "ready_for_pickup"].includes(status);
}
