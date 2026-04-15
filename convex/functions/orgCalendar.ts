import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { weeklyScheduleValidator } from "../lib/validators";
import {
  serviceHoursEntryValidator,
  holidayValidator,
  exceptionalClosureValidator,
  appointmentConfigValidator,
} from "../schemas/orgCalendar";

/**
 * Calendar functions — Horaires par service, jours fériés, fermetures exceptionnelles
 * et paramètres RDV par représentation.
 *
 * Pattern : cardinalité 1:1 avec `orgs` → on récupère ou crée le document à la volée.
 */

// Jours fériés gabonais officiels (préchargés via seed pour toute nouvelle org)
const GABON_NATIONAL_HOLIDAYS_DEFAULTS = [
  { date: "2026-01-01", label: "Jour de l'An", recurring: true },
  { date: "2026-03-12", label: "Journée de la Rénovation", recurring: true },
  { date: "2026-05-01", label: "Fête du Travail", recurring: true },
  { date: "2026-08-16", label: "Veille de l'Indépendance", recurring: true },
  { date: "2026-08-17", label: "Fête de l'Indépendance", recurring: true },
  { date: "2026-11-01", label: "Toussaint", recurring: true },
  { date: "2026-12-25", label: "Noël", recurring: true },
];

/**
 * Récupère la configuration calendrier d'une org (crée un document par défaut si inexistant).
 */
export const getByOrg = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const calendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    return calendar;
  },
});

/**
 * Upsert complet de la configuration calendrier. Utilisé pour remplacer
 * intégralement la config (import, reset, clone depuis template).
 */
export const upsert = authMutation({
  args: {
    orgId: v.id("orgs"),
    serviceHours: v.array(serviceHoursEntryValidator),
    holidays: v.array(holidayValidator),
    exceptionalClosures: v.array(exceptionalClosureValidator),
    appointmentConfig: appointmentConfigValidator,
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const existing = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const payload = {
      orgId: args.orgId,
      serviceHours: args.serviceHours,
      holidays: args.holidays,
      exceptionalClosures: args.exceptionalClosures,
      appointmentConfig: args.appointmentConfig,
      timezone: args.timezone,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };

    let calendarId;
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      calendarId = existing._id;
    } else {
      calendarId = await ctx.db.insert("orgCalendar", payload);
    }

    await logCortexAction(ctx, {
      action: "UPSERT_ORG_CALENDAR",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgCalendar",
      entiteId: calendarId,
      userId: ctx.user._id,
      apres: { orgId: args.orgId },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return calendarId;
  },
});

/**
 * Initialise un calendrier par défaut pour une org (appelé à la création).
 * Charge les jours fériés gabonais officiels et des horaires standards.
 */
export const initializeDefaults = authMutation({
  args: {
    orgId: v.id("orgs"),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const existing = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (existing) return existing._id;

    // Horaires par défaut : lundi-vendredi 9h-17h
    const defaultSchedule = {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { closed: true },
      sunday: { closed: true },
      notes: "Horaires standards, ajustables",
    };

    const calendarId = await ctx.db.insert("orgCalendar", {
      orgId: args.orgId,
      serviceHours: [
        {
          scopeType: "default",
          schedule: defaultSchedule,
        },
      ],
      holidays: GABON_NATIONAL_HOLIDAYS_DEFAULTS.map((h) => ({
        ...h,
        source: "gabon_national" as const,
        showToPublic: true,
      })),
      exceptionalClosures: [],
      appointmentConfig: {
        defaultLeadTimeHours: 24,
        urgencyLeadTimeHours: 2,
        maxAdvanceDays: 90,
        cancellationPolicyHours: 24,
        sameDaySlots: false,
        allowWaitlist: false,
      },
      timezone: args.timezone,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return calendarId;
  },
});

/**
 * Ajoute un jour férié.
 */
export const addHoliday = authMutation({
  args: {
    orgId: v.id("orgs"),
    holiday: holidayValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const calendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!calendar) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Calendrier non initialisé pour cette représentation",
      );
    }

    // Éviter les doublons sur (date, label)
    const exists = calendar.holidays.some(
      (h) => h.date === args.holiday.date && h.label === args.holiday.label,
    );
    if (exists) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Ce jour férié existe déjà pour cette date",
      );
    }

    await ctx.db.patch(calendar._id, {
      holidays: [...calendar.holidays, args.holiday],
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    // Phase F1.1 — Audit trail
    await logCortexAction(ctx, {
      action: "ADD_HOLIDAY",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgCalendar",
      entiteId: calendar._id,
      userId: ctx.user._id,
      apres: {
        orgId: args.orgId,
        holidayDate: args.holiday.date,
        holidayLabel: args.holiday.label,
      },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return calendar._id;
  },
});

/**
 * Supprime un jour férié par (date, label).
 */
export const removeHoliday = authMutation({
  args: {
    orgId: v.id("orgs"),
    date: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const calendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!calendar) return null;

    await ctx.db.patch(calendar._id, {
      holidays: calendar.holidays.filter(
        (h) => !(h.date === args.date && h.label === args.label),
      ),
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    // Phase F1.1 — Audit trail
    await logCortexAction(ctx, {
      action: "REMOVE_HOLIDAY",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgCalendar",
      entiteId: calendar._id,
      userId: ctx.user._id,
      apres: {
        orgId: args.orgId,
        holidayDate: args.date,
        holidayLabel: args.label,
      },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return calendar._id;
  },
});

/**
 * Ajoute une fermeture exceptionnelle.
 */
export const addExceptionalClosure = authMutation({
  args: {
    orgId: v.id("orgs"),
    closure: exceptionalClosureValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const calendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!calendar) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Calendrier non initialisé pour cette représentation",
      );
    }

    if (args.closure.endDate <= args.closure.startDate) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "La date de fin doit être postérieure à la date de début",
      );
    }

    const closureWithAudit = {
      ...args.closure,
      createdBy: ctx.user._id,
      createdAt: Date.now(),
    };

    await ctx.db.patch(calendar._id, {
      exceptionalClosures: [
        ...calendar.exceptionalClosures,
        closureWithAudit,
      ],
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    // Phase F1.1 — Audit trail
    await logCortexAction(ctx, {
      action: "ADD_EXCEPTIONAL_CLOSURE",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgCalendar",
      entiteId: calendar._id,
      userId: ctx.user._id,
      apres: {
        orgId: args.orgId,
        startDate: args.closure.startDate,
        endDate: args.closure.endDate,
        reasonFr: args.closure.reasonFr,
      },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return calendar._id;
  },
});

/**
 * Met à jour les paramètres RDV uniquement.
 */
export const updateAppointmentConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    appointmentConfig: appointmentConfigValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const calendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!calendar) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Calendrier non initialisé pour cette représentation",
      );
    }

    await ctx.db.patch(calendar._id, {
      appointmentConfig: args.appointmentConfig,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    // Phase F1.1 — Audit trail
    await logCortexAction(ctx, {
      action: "UPDATE_APPOINTMENT_CONFIG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgCalendar",
      entiteId: calendar._id,
      userId: ctx.user._id,
      apres: {
        orgId: args.orgId,
        appointmentConfig: args.appointmentConfig,
      },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return calendar._id;
  },
});

/**
 * Met à jour les horaires pour un scope (default ou service spécifique).
 */
export const updateServiceHours = authMutation({
  args: {
    orgId: v.id("orgs"),
    scopeType: v.union(v.literal("default"), v.literal("service")),
    serviceId: v.optional(v.id("orgServices")),
    schedule: weeklyScheduleValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    if (args.scopeType === "service" && !args.serviceId) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "serviceId requis pour scopeType=service",
      );
    }

    const calendar = await ctx.db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!calendar) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Calendrier non initialisé pour cette représentation",
      );
    }

    const entry = {
      scopeType: args.scopeType,
      serviceId: args.serviceId,
      schedule: args.schedule,
      notes: args.notes,
    };

    // Remplace ou ajoute l'entrée correspondante au scope
    const matchIdx = calendar.serviceHours.findIndex((e) =>
      args.scopeType === "default"
        ? e.scopeType === "default"
        : e.scopeType === "service" && e.serviceId === args.serviceId,
    );

    const newServiceHours = [...calendar.serviceHours];
    if (matchIdx >= 0) {
      newServiceHours[matchIdx] = entry;
    } else {
      newServiceHours.push(entry);
    }

    await ctx.db.patch(calendar._id, {
      serviceHours: newServiceHours,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    // Phase F1.1 — Audit trail
    await logCortexAction(ctx, {
      action: "UPDATE_SERVICE_HOURS",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgCalendar",
      entiteId: calendar._id,
      userId: ctx.user._id,
      apres: {
        orgId: args.orgId,
        scopeType: args.scopeType,
        serviceId: args.serviceId,
      },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return calendar._id;
  },
});
