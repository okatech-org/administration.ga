import posthog from "posthog-js";

// Définition des événements et de leurs propriétés typées
export type AnalyticsEvents = {
	// 1. Authentification & Identité
	user_signed_up: { method: "email" | "google" | "idn"; profile_type?: string };
	user_logged_in: { method: "email_otp" | "password" | "sms_otp" | "google" | "idn"; profile_type?: string };
	user_logged_out: never; // Pas de propriétés requises
	password_reset_requested: never;

	// 2. Inscription Consulaire (Registration Wizard)
	registration_started: never;
	registration_step_viewed: { step_name: string };
	registration_step_completed: { step_name: string };
	registration_document_uploaded: { document_type: string };
	registration_ai_scan_used: {
		documents_scanned: number;
		fields_extracted: number;
		scan_duration_ms: number;
		confidence: number;
	};
	registration_ai_scan_failed: {
		error_type: "no_documents" | "rate_limited" | "extraction_error";
		documents_attempted: number;
	};
	registration_submitted: {
		marital_status?: string;
		has_children?: boolean;
		jurisdiction_country?: string;
	};

	// 3. Espace Citoyen (My Space)
	myspace_tab_viewed: { tab_name: string };
	myspace_profile_updated: never;
	myspace_preferences_updated: never;

	myspace_service_viewed: { service_type: string };
	myspace_request_started: { request_type: string };
	myspace_request_submitted: { request_type: string };
	myspace_request_document_uploaded: {
		request_type: string;
		document_type: string;
	};

	myspace_appointment_started: never;
	myspace_appointment_scheduled: {
		service_type?: string;
		office_location?: string;
		is_online_meeting?: boolean;
	};
	myspace_appointment_cancelled: never;

	myspace_vault_document_added: {
		file_extension: string;
		file_size_category?: string;
	};
	myspace_vault_document_shared: never;
	myspace_cv_generated: { template_used?: string };

	myspace_children_profile_added: never;
	myspace_company_registered: never;
	myspace_association_joined: never;
	myspace_support_ticket_created: never;

	// 4. Espace Agent (Admin)
	admin_dashboard_viewed: { view_name: string };
	admin_metrics_exported: never;

	admin_request_opened: { request_type?: string; current_status?: string };
	admin_request_status_changed: {
		request_type?: string;
		old_status?: string;
		new_status?: string;
	};
	admin_document_verified: {
		document_type?: string;
		verification_action: "accepted" | "rejected";
	};
	admin_internal_comment_added: never;
	admin_request_assigned: never;

	admin_appointment_managed: { action: "reschedule" | "cancel" | "confirm" };
	admin_livekit_call_started: never;
	admin_livekit_call_ended: { duration_seconds?: number };

	admin_team_member_invited: never;
	admin_service_configured: never;
	admin_post_published: never;
};

// Type helper pour rendre `properties` optionnel si l'événement n'attend aucune propriété
export type EventProperties<T extends keyof AnalyticsEvents> =
	AnalyticsEvents[T] extends never
		? [properties?: undefined]
		: [properties: AnalyticsEvents[T]];

/**
 * Fonction centrale pour traquer les événements dans toute l'application.
 * Elle assure le typage strict des événements et de leurs propriétés définies dans le plan de tracking.
 */
export const captureEvent = <T extends keyof AnalyticsEvents>(
	eventName: T,
	...[properties]: EventProperties<T>
) => {
	if (
		typeof window !== "undefined" &&
		process.env.NEXT_PUBLIC_POSTHOG_KEY
	) {
		try {
			posthog.capture(eventName, properties);
		} catch (error) {
			console.error("Failed to capture analytics event:", error);
		}
	}
};
