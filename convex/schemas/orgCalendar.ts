import { defineTable } from "convex/server";
import { v } from "convex/values";
import { weeklyScheduleValidator } from "../lib/validators";

/**
 * Table orgCalendar — Configuration calendaire complète d'une représentation
 *
 * Regroupe :
 *   - serviceHours : horaires d'ouverture par service (ou default pour l'org)
 *   - holidays : jours fériés (Gabon + pays hôte + personnalisés)
 *   - exceptionalClosures : fermetures exceptionnelles ponctuelles
 *   - appointmentConfig : paramètres de réservation RDV
 *
 * Remplace/complète `orgs.openingHours` et `orgs.settings.appointmentBuffer/workingHours`
 * qui restent pour rétrocompatibilité (pattern widen).
 *
 * Cardinalité : 1:1 avec orgs (un seul document par org).
 */

// Un créneau horaire dans la semaine pour un service spécifique
export const serviceHoursEntryValidator = v.object({
  scopeType: v.union(
    v.literal("default"), // horaire par défaut de l'org
    v.literal("service"), // horaire spécifique à un service
  ),
  serviceId: v.optional(v.id("orgServices")), // requis si scopeType="service"
  schedule: weeklyScheduleValidator,
  notes: v.optional(v.string()),
});

// Jour férié (Gabon national, pays hôte, ou custom)
export const holidayValidator = v.object({
  date: v.string(), // ISO "2026-03-17"
  label: v.string(), // "Fête de l'Indépendance du Gabon"
  labelLocal: v.optional(v.string()), // traduction dans la langue du pays hôte
  recurring: v.boolean(), // se répète chaque année (même date)
  source: v.union(
    v.literal("gabon_national"), // jour férié officiel gabonais
    v.literal("host_country"), // jour férié du pays d'accueil
    v.literal("custom"), // ajout manuel
  ),
  closeServices: v.optional(v.array(v.string())), // codes services fermés (ou ["all"])
  showToPublic: v.optional(v.boolean()), // afficher sur la page publique
});

// Fermeture exceptionnelle (période non récurrente)
export const exceptionalClosureValidator = v.object({
  startDate: v.number(), // timestamp début
  endDate: v.number(), // timestamp fin
  reasonFr: v.string(),
  reasonEn: v.optional(v.string()),
  reasonLocal: v.optional(v.string()),
  showToPublic: v.boolean(),
  closeServices: v.optional(v.array(v.string())), // services affectés
  // Audit
  createdBy: v.optional(v.id("users")),
  createdAt: v.optional(v.number()),
});

// Paramètres de RDV
export const appointmentConfigValidator = v.object({
  defaultLeadTimeHours: v.number(), // délai minimum avant un RDV standard
  urgencyLeadTimeHours: v.optional(v.number()), // délai minimum pour RDV urgent
  maxAdvanceDays: v.number(), // max jours d'avance pour réserver (ex: 90)
  cancellationPolicyHours: v.optional(v.number()), // délai d'annulation sans pénalité
  sameDaySlots: v.optional(v.boolean()), // créneaux le jour même autorisés
  allowWaitlist: v.optional(v.boolean()), // file d'attente si plein
});

export const orgCalendarTable = defineTable({
  orgId: v.id("orgs"),

  // Horaires par service (ou default)
  serviceHours: v.array(serviceHoursEntryValidator),

  // Jours fériés
  holidays: v.array(holidayValidator),

  // Fermetures exceptionnelles
  exceptionalClosures: v.array(exceptionalClosureValidator),

  // Paramètres RDV
  appointmentConfig: appointmentConfigValidator,

  // Timezone (redondant avec orgs.timezone mais utile pour calculs calendaires)
  timezone: v.optional(v.string()),

  // Métadonnées
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_org", ["orgId"]);
