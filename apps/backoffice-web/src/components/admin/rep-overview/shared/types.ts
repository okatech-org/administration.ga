import type { Id } from "@convex/_generated/dataModel";

/** Période de segmentation temporelle propagée aux widgets analytiques. */
export type OverviewPeriod = "today" | "7d" | "30d" | "90d";

/** Rôle lecteur du dashboard — pilote la visibilité de certains widgets. */
export type ViewerRole = "chefMission" | "superAdmin";

/** Sévérité d'une alerte opérationnelle. */
export type AlertSeverity = "critical" | "warning" | "info";

/** Types d'alertes supportés (miroir du validator serveur). */
export type AlertType =
	| "sla_breach"
	| "vacant_critical"
	| "registry_expiring"
	| "cards_pending"
	| "correspondance_overdue"
	| "approval_pending";

/** Forme d'une alerte telle que retournée par orgOverview.getOrgAlerts. */
export interface OrgAlert {
	type: AlertType;
	severity: AlertSeverity;
	count: number;
	label: string;
	ctaHref: string;
}

/** Forme d'un événement d'activité (miroir côté frontend). */
export interface ActivityEvent {
	_id: string;
	timestamp: number;
	actor: {
		_id: Id<"users"> | null;
		name: string;
		avatarUrl?: string;
	} | null;
	targetType: string;
	targetId: string;
	operation: "insert" | "update" | "delete" | "read";
	summary: string;
}

/** Check individuel du score de santé. */
export interface HealthCheck {
	key: string;
	label: string;
	passed: boolean;
	weight: number;
}
