/**
 * Server-side analytics events for PostHog.
 * These events are captured from Convex actions and crons,
 * enabling PostHog alerting on critical business events.
 */
export type ServerAnalyticsEvents = {
  // Documents
  server_document_verification_failed: { documentId: string; reason: string };

  // Health check (cron-emitted summaries for alerting)
  server_health_stale_requests: { count: number; oldestDays: number };
  server_health_pending_verifications: { count: number; oldestHours: number };
};
