/**
 * Request Status UI Configuration
 *
 * Reusable status badge configuration for frontend components.
 * Uses i18n translation keys for labels.
 */

import { RequestStatus } from "@convex/lib/constants";

export interface StatusConfig {
	/** Translation key for i18n (e.g., "requests.statuses.draft") */
	i18nKey: string;
	/** Fallback label if translation is missing */
	fallback: string;
	/** CSS classes for the badge */
	className: string;
	/** Badge variant */
	variant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Complete status configuration for UI display
 */
export const REQUEST_STATUS_CONFIG: Record<RequestStatus, StatusConfig> = {
	// === Création ===
	[RequestStatus.Draft]: {
		i18nKey: "requests.statuses.draft",
		fallback: "Brouillon",
		className: "bg-gray-100 text-gray-700 border-gray-200",
		variant: "outline",
	},

	// === Traitement ===
	[RequestStatus.Submitted]: {
		i18nKey: "requests.statuses.submitted",
		fallback: "Soumise",
		className: "bg-green-100 text-green-700 border-green-200",
		variant: "default",
	},
	[RequestStatus.Pending]: {
		i18nKey: "requests.statuses.pending",
		fallback: "En attente",
		className: "bg-yellow-100 text-yellow-700 border-yellow-200",
		variant: "secondary",
	},
	[RequestStatus.UnderReview]: {
		i18nKey: "requests.statuses.under_review",
		fallback: "En examen",
		className: "bg-blue-100 text-blue-700 border-blue-200",
		variant: "secondary",
	},
	[RequestStatus.InProduction]: {
		i18nKey: "requests.statuses.in_production",
		fallback: "En production",
		className: "bg-purple-100 text-purple-700 border-purple-200",
		variant: "secondary",
	},

	// === Finalisation ===
	[RequestStatus.Validated]: {
		i18nKey: "requests.statuses.validated",
		fallback: "Validée",
		className: "bg-green-100 text-green-700 border-green-200",
		variant: "default",
	},
	[RequestStatus.Rejected]: {
		i18nKey: "requests.statuses.rejected",
		fallback: "Rejetée",
		className: "bg-red-100 text-red-700 border-red-200",
		variant: "destructive",
	},
	[RequestStatus.AppointmentScheduled]: {
		i18nKey: "requests.statuses.appointment_scheduled",
		fallback: "RDV planifié",
		className: "bg-indigo-100 text-indigo-700 border-indigo-200",
		variant: "secondary",
	},
	[RequestStatus.ReadyForPickup]: {
		i18nKey: "requests.statuses.ready_for_pickup",
		fallback: "Prête à retirer",
		className: "bg-teal-100 text-teal-700 border-teal-200",
		variant: "default",
	},

	// === Terminal ===
	[RequestStatus.Completed]: {
		i18nKey: "requests.statuses.completed",
		fallback: "Terminée",
		className: "bg-green-100 text-green-700 border-green-200",
		variant: "default",
	},
	[RequestStatus.Cancelled]: {
		i18nKey: "requests.statuses.cancelled",
		fallback: "Annulée",
		className: "bg-gray-100 text-gray-500 border-gray-200",
		variant: "outline",
	},
};

/**
 * Get the className for a status badge
 */
export function getStatusClassName(status: RequestStatus): string {
	return REQUEST_STATUS_CONFIG[status]?.className ?? "";
}

/**
 * Get the badge variant for a status
 */
export function getStatusVariant(
	status: RequestStatus,
): StatusConfig["variant"] {
	return REQUEST_STATUS_CONFIG[status]?.variant ?? "secondary";
}

/**
 * Check if a status requires user action
 */
export function statusRequiresUserAction(status: RequestStatus): boolean {
	return [
		RequestStatus.Draft,
		RequestStatus.AppointmentScheduled,
		RequestStatus.ReadyForPickup,
	].includes(status);
}

/**
 * Check if a status is terminal (no further changes expected)
 */
export function isTerminalStatus(status: RequestStatus): boolean {
	return [
		RequestStatus.Completed,
		RequestStatus.Cancelled,
		RequestStatus.Rejected,
	].includes(status);
}
