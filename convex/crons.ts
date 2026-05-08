import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// NOTE: refresh-org-stats cron removed — stats are now computed in real-time
// via the Aggregate component (requestsByOrg, membershipsByOrg, orgServicesByOrg).

// Check for expiring documents daily
crons.daily(
  "check-expiring-documents",
  { hourUTC: 8, minuteUTC: 0 }, // Run at 8am UTC
  internal.crons.expiration.checkDocuments,
);

// Send appointment reminders daily at 9am UTC (10am Paris)
crons.daily(
  "send-appointment-reminders",
  { hourUTC: 9, minuteUTC: 0 },
  internal.functions.notifications.sendAppointmentReminders,
);

// Expire stale waitlist offers (default TTL 30 min) and promote next in FIFO
crons.interval(
  "expire-waitlist-offers",
  { minutes: 5 },
  internal.functions.appointmentWaitlist.expireOffers,
);

// --- NEOCORTEX ---
// Rythme Circadien : Nettoyage quotidien des signaux > TTL
crons.daily(
  "neocortex_nettoyage_quotidien",
  { hourUTC: 2, minuteUTC: 0 },
  internal.limbique.nettoyerSignaux
);

// Agrégation horaire des métriques (Hippocampe)
crons.hourly(
  "neocortex_calcul_metriques",
  { minuteUTC: 0 },
  internal.hippocampe.calculerMetriques
);

// Monitoring / Santé système (Toutes les 5 minutes)
crons.interval(
  "neocortex_monitoring_sante",
  { minutes: 5 },
  internal.monitoring.verifierSanteSysteme
);

// Réévaluation des poids adaptatifs (Plasticité — oubli progressif)
crons.daily(
  "neocortex_reevaluation_poids",
  { hourUTC: 3, minuteUTC: 0 },
  internal.plasticite.reevaluerPoidsGlobal
);

// PostHog health check: daily summary events for alerting
crons.daily(
  "posthog-health-check",
  { hourUTC: 7, minuteUTC: 0 },
  internal.actions.posthogHealthCheck.run,
);

// --- iCorrespondance ---
// Vérification SLA : correspondances en retard (quotidien 7h UTC = 8h Paris)
crons.daily(
  "correspondance_check_sla",
  { hourUTC: 7, minuteUTC: 30 },
  internal.crons.correspondanceSla.checkOverdueSla,
);

// --- SENTINEL AI ---
// Analyse horaire des signaux de securite via Gemini
crons.hourly(
  "sentinel_security_analysis",
  { minuteUTC: 15 },
  internal.ai.securityGuardian.analyzeThreats,
);

// --- AUTO-DEFENSE ---
// Decay quotidien des scores de menace (-10%/jour)
crons.daily(
  "autodefense_decay",
  { hourUTC: 4, minuteUTC: 0 },
  internal.functions.autoDefense.decayScores,
);

// Nettoyage des blocages IP expires
crons.daily(
  "autodefense_cleanup",
  { hourUTC: 4, minuteUTC: 30 },
  internal.functions.autoDefense.cleanupExpired,
);

// --- iAppel (Calls) ---
// Cleanup stale calls every 30 seconds (initiating/ringing timeouts)
crons.interval(
  "cleanup-stale-calls",
  { seconds: 30 },
  internal.functions.meetings.cleanupStaleCalls,
  {},
);

// --- Centre d'Appels (Sprint 2+) ---
// Auto-termine les appels parqués depuis > 30 min
// (l'agent a quitté, le citoyen attend dans le vide). Crée une ligne missedCalls
// pour activer le workflow de callback.
crons.interval(
  "cleanup-parked-calls",
  { minutes: 1 },
  internal.functions.callCenter.cleanupParkedCalls,
  {},
);

// IVR Fallback : bascule les appels stagnants vers la ligne de secours
// (fallbackCallLineId) ou crée une notification selon callLines.fallbackAction.
// Intervalle court (15s) pour réagir vite à la saturation d'une ligne.
crons.interval(
  "process-call-fallbacks",
  { seconds: 15 },
  internal.functions.callCenter.processCallFallbacks,
  {},
);

// Recalcul horaire des stats par ligne (totalCalls, missedCalls, avgResponse)
// Affiché dans la gestion des lignes — pas critique temps réel.
crons.hourly(
  "refresh-call-lines-stats",
  { minuteUTC: 15 },
  internal.functions.callCenter.refreshCallLinesStats,
  {},
);

// --- Agent Presence ---
// Mark agents with stale heartbeats as offline (every 60s)
crons.interval(
  "cleanup-stale-presence",
  { seconds: 60 },
  internal.functions.agentPresence.cleanupStalePresence,
  {},
);

// --- Sprint 6 : Auto-sync agent presence with weekly schedules ---
// Toutes les 5 min : pour chaque agentSchedule actif, aligner agentPresence
// sur la plage horaire courante (timezone de l'org respectée).
crons.interval(
  "match-agent-schedules-to-presence",
  { minutes: 5 },
  internal.functions.agentSchedules.matchAgentSchedulesToPresence,
  {},
);

// --- Sprint 6 : Purge recordings expirés (rétention 90j par défaut) ---
// Supprime le storage physique pour les callRecordings dont retentionUntil
// est dépassé. La row reste en base avec deletedAt défini (audit).
crons.daily(
  "cleanup-expired-call-recordings",
  { hourUTC: 3, minuteUTC: 0 },
  internal.functions.callRecordings.cleanupExpired,
  {},
);

// --- iChat (Mr Ray) ---
// Libère les threads standard revendiqués par un agent qui n'a pas répondu
// depuis >48h : Mr Ray pourra reprendre la main au prochain message citoyen.
crons.daily(
  "reset-stale-claimed-chats",
  { hourUTC: 5, minuteUTC: 0 },
  internal.functions.chats.resetStaleClaimedThreads,
  {},
);

// Purge les indicateurs typing expirés (TTL 6s). Cadence 1 min suffit —
// les queries filtrent déjà sur expiresAt côté lecture, ce cron évite
// seulement l'accumulation de rows mortes en base.
crons.interval(
  "purge-expired-chat-typing",
  { minutes: 1 },
  internal.functions.chats.purgeExpiredTyping,
  {},
);

// --- iArchive ---
// Verification quotidienne des retentions d'archivage (8h30 UTC = 9h30 Paris)
crons.daily(
  "check-archive-expiration",
  { hourUTC: 8, minuteUTC: 30 },
  internal.crons.archiveExpiration.checkArchiveExpiration,
);

// --- AI Assistant Proactif ---
// Purge presences IA stale (> 5 min sans heartbeat)
crons.interval(
  "ai_assistant_presence_cleanup",
  { minutes: 5 },
  internal.ai.contextStore.cleanupStalePresencesInternal,
);

// Expiration des suggestions IA (au-dela de leur expiresAt)
crons.hourly(
  "ai_assistant_suggestions_expire",
  { minuteUTC: 45 },
  internal.ai.suggestions.expireSuggestionsInternal,
);

// Balayage idle workflows : detecte les demandes/dossiers stagnants
// et pousse des suggestions de triage.
crons.interval(
  "ai_assistant_scheduled_sweeper",
  { minutes: 30 },
  internal.ai.scheduledSweeper.sweep,
);

// --- Renseignement souverain : évaluation périodique des règles d'alerte ---
// Toutes les 15 min : pour chaque règle d'alerte active, vérifie si la
// condition est satisfaite (Phase 1 : watchlist_match) et crée une
// `intelligenceAlerts` à destination des memberships notifiés.
crons.interval(
  "evaluate-intelligence-alerts",
  { minutes: 15 },
  internal.functions.intelligenceAlerts.evaluateRules,
);

// --- Renseignement souverain : recalcul hebdo des enclaves GEOINT ---
// Pour chaque org intelligence_agency, applique DBSCAN (epsilon=2km,
// minPts=5) sur les profils géolocalisés et persiste un snapshot dans
// `intelligenceEnclaves`. Recalcul hebdo le lundi 4h UTC.
crons.weekly(
  "recompute-intelligence-enclaves",
  { dayOfWeek: "monday", hourUTC: 4, minuteUTC: 0 },
  internal.functions.intelligenceGeoint.recomputeAllEnclaves,
);

// --- Phase D1 : sync legacy orgs fields (horaire) ---
// Maintient la synchronisation entre champs plats historiques (address,
// headOfMission, jurisdictionCountries, openingHours) et nouveaux sous-objets
// structurés (addresses, protocol, jurisdiction, orgCalendar).
// Idempotent — peut être exécuté sans risque.
crons.interval(
  "sync-legacy-org-fields",
  { hours: 1 },
  internal.functions.migrations.syncLegacyOrgFields,
);

export default crons;
