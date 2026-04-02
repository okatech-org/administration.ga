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

export default crons;
