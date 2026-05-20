/**
 * Voice Preferences — CRUD pour `userIastedVoicePrefs`.
 *
 * Préférences per-user (cross-org) consommées par :
 *   - `realtimeToken.create` (voix par défaut, vitesse, locale)
 *   - `iastedRealtimePrompt.buildPrompt` (customPersona, formality)
 *   - `BackofficeSettingsTab` (UI dans la fenêtre flottante)
 */

import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { voicePrefsValidator } from "../schemas/userIastedVoicePrefs";
import { DEFAULT_IASTED_LOCALE } from "../lib/iastedLocales";

const DEFAULT_PREFS = {
  preferredVoice: "ash",
  speechRate: 1.0,
  pushToTalk: false,
  autoGreet: true,
  customPersona: undefined,
  formality: "standard" as const,
  preferredLocale: DEFAULT_IASTED_LOCALE,
  requireConfirmation: true,
  // Sprint 2 (Ronde 3) — nouveaux defaults.
  hasOnboardedVoice: false,
  responseLength: "short" as const,
  adaptiveSpeechRateEnabled: true,
  // Sprint 4 (Ronde 3) — proactivité opt-in par défaut.
  morningBriefingEnabled: true,
};

// ─────────────────────────────────────────────────────────────
// Lecture publique (utilisé par le panneau Settings côté frontend)
// ─────────────────────────────────────────────────────────────

export const getMyVoicePreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const row = await ctx.db
      .query("userIastedVoicePrefs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return row?.voicePrefs ?? DEFAULT_PREFS;
  },
});

// ─────────────────────────────────────────────────────────────
// Mise à jour (depuis le panneau Settings)
// ─────────────────────────────────────────────────────────────

export const updateMyVoicePreferences = mutation({
  args: {
    voicePrefs: voicePrefsValidator,
  },
  handler: async (ctx, { voicePrefs }) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userIastedVoicePrefs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { voicePrefs, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("userIastedVoicePrefs", {
      userId: user._id,
      voicePrefs,
      updatedAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────
// Internal — lecture sans auth (utilisé par realtimeToken + prompt)
// ─────────────────────────────────────────────────────────────

export const getVoicePrefsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("userIastedVoicePrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return row?.voicePrefs ?? DEFAULT_PREFS;
  },
});

// ─────────────────────────────────────────────────────────────
// Sessions actives + révocation (pour le panneau Sécurité)
// ─────────────────────────────────────────────────────────────

export const listMyActiveVoiceSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_user" as any, (q: any) => q.eq("userId", user._id))
      .take(50);
  },
});

export const revokeAllMyVoiceSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const rows = await ctx.db
      .query("aiAgentPresence")
      .withIndex("by_user" as any, (q: any) => q.eq("userId", user._id))
      .collect();
    for (const r of rows) {
      await ctx.db.delete(r._id);
    }
    return rows.length;
  },
});

// ─────────────────────────────────────────────────────────────
// Sprint 2 — E1 : Onboarding flag
// ─────────────────────────────────────────────────────────────

/**
 * Marque la 1ʳᵉ session vocale comme terminée. Le prochain démarrage
 * iAsted n'inclura plus le bloc onboarding dans le prompt. Idempotent.
 */
export const markVoiceOnboarded = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userIastedVoicePrefs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    if (existing) {
      if (existing.voicePrefs.hasOnboardedVoice === true) return; // idempotent
      // Merge avec DEFAULT_PREFS AVANT existing : un ancien record écrit
      // avant l'ajout d'un champ requis du validator (ex. requireConfirmation)
      // serait rejeté par le patch strict sinon. Les valeurs existantes
      // prennent toujours le pas, seul le champ manquant est comblé.
      await ctx.db.patch(existing._id, {
        voicePrefs: { ...DEFAULT_PREFS, ...existing.voicePrefs, hasOnboardedVoice: true },
        updatedAt: now,
      });
      return;
    }
    // Pas encore de row : crée avec les defaults + flag onboardé.
    await ctx.db.insert("userIastedVoicePrefs", {
      userId: user._id,
      voicePrefs: { ...DEFAULT_PREFS, hasOnboardedVoice: true },
      updatedAt: now,
    });
  },
});
