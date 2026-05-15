/**
 * User iAsted Voice Preferences Schema
 *
 * Préférences personnelles per-user (cross-org) pour l'agent vocal iAsted.
 * Distinct de `userAIPreferences` qui gère l'IA proactive par membership/org.
 *
 * Une row par userId. Mise à jour depuis le panneau Réglages de la fenêtre
 * flottante iAsted. Consommée par :
 *   - `realtimeToken.create` (voix par défaut, speech rate, langue)
 *   - `iastedRealtimePrompt.buildPrompt` (customPersona, formalité)
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const voicePrefsValidator = v.object({
  /** Voix OpenAI Realtime préférée (ash / alloy / echo / coral / shimmer / verse / ballad / sage). */
  preferredVoice: v.string(),
  /** Vitesse de lecture audio (0.5..2.0, défaut 1.0). */
  speechRate: v.number(),
  /** Push-to-talk (true) vs always-on (false). */
  pushToTalk: v.boolean(),
  /** Saluer automatiquement à l'ouverture de la session vocale. */
  autoGreet: v.boolean(),
  /**
   * Persona personnalisé injecté au début du system prompt
   * (ex : « Réponses très courtes, pas de formules de politesse »).
   */
  customPersona: v.optional(v.string()),
  /** Niveau de formalité. */
  formality: v.union(
    v.literal("standard"),
    v.literal("formal"),
    v.literal("relaxed"),
  ),
  /** Locale préférée (ex : "fr-FR"). */
  preferredLocale: v.optional(v.string()),
  /** Exiger confirmation orale explicite avant chaque action mutative. */
  requireConfirmation: v.boolean(),
});

export const userIastedVoicePrefsTable = defineTable({
  userId: v.id("users"),
  voicePrefs: voicePrefsValidator,
  /**
   * Hotkeys customisables (mapping action → combinaison clavier).
   * Ex : { "toggle_voice": "cmd+shift+v", "open_chat": "cmd+shift+c" }.
   */
  hotkeys: v.optional(v.record(v.string(), v.string())),
  updatedAt: v.number(),
}).index("by_user", ["userId"]);
