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
  /**
   * Mode accessibilité — session vocale persistante + cues audio non-vocaux
   * pour les utilisateurs sans clavier/écran. Quand `mode === true` :
   *   - La session reste ouverte indéfiniment (pas d'auto-disconnect).
   *   - Le raccourci clavier `Option+Space` toggle la session.
   *   - Cues audio (bips) signalent : écoute / réflexion / exécuté / erreur.
   */
  accessibility: v.optional(
    v.object({
      mode: v.boolean(),
      audioCues: v.boolean(),
      keyboardShortcut: v.optional(v.string()),
    }),
  ),
  /**
   * Sprint 2 — E1 : onboarding vocal au 1ᵉʳ login.
   * Quand `false` (ou absent), la prochaine session vocale ouvre un
   * scripted intro pour guider l'utilisateur. Le flag est flippé à
   * `true` par `markVoiceOnboarded` après la 1ʳᵉ session réussie.
   */
  hasOnboardedVoice: v.optional(v.boolean()),
  /**
   * Sprint 2 — E3 : longueur de réponse par défaut.
   * - `short` : 1-3 phrases (default, optimal pour la voix).
   * - `medium` : 4-8 phrases.
   * - `long` : pas de limite, l'agent répond de manière exhaustive.
   * Injecté dans le prompt pour guider la verbosité.
   */
  responseLength: v.optional(
    v.union(v.literal("short"), v.literal("medium"), v.literal("long")),
  ),
  /**
   * Sprint 1 — D4 : autoriser l'adaptation automatique de la vitesse
   * de parole de l'agent au débit de l'utilisateur. Désactivable pour
   * les utilisateurs qui veulent un débit fixe via `speechRate`.
   */
  adaptiveSpeechRateEnabled: v.optional(v.boolean()),
  /**
   * Sprint 4 — B1 : briefing matinal vocal.
   * Quand `true` (default), la 1ʳᵉ session vocale d'une journée déclenche
   * automatiquement une proposition de briefing (courriers urgents,
   * RDV du jour, rappels dus). Désactivable pour les utilisateurs qui
   * préfèrent une session muette par défaut.
   */
  morningBriefingEnabled: v.optional(v.boolean()),
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
