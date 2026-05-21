/**
 * Feature flags — agent-web
 *
 * Centralise les flags Next.js publics pour éviter les tests `process.env.X === "1"`
 * dispersés. Chaque flag respecte le pattern Sprint 6 :
 *   - Désactivé par défaut quand la feature nécessite infra externe (egress, push).
 *   - Activé par défaut quand la feature ne coûte rien (whisper/barge-in logique).
 *
 * Les tests E2E peuvent forcer un flag via `NEXT_PUBLIC_FEATURE_X=1` au moment du run.
 */

export const FEATURES = {
  /** Centre d'Appels multi-lignes (existant, Sprint 5) */
  callCenter: process.env.NEXT_PUBLIC_FEATURE_CALL_CENTER !== "0",
  /** Enregistrement d'appel + voicemail via LiveKit Egress — coûte cloud */
  egress: process.env.NEXT_PUBLIC_FEATURE_EGRESS === "1",
  /** Notifications push (Web Push API + VAPID) — nécessite clés */
  push: process.env.NEXT_PUBLIC_FEATURE_PUSH === "1",
  /** Whisper / Barge-in superviseur — logique pure LiveKit, pas de coût */
  supervisionWhisper: process.env.NEXT_PUBLIC_FEATURE_SUPERVISION_WHISPER !== "0",
  /** Mode E2E : expose DevAccountSwitcher même hors dev */
  e2eMode: process.env.NEXT_PUBLIC_E2E_MODE === "true",
} as const;

export type FeatureFlag = keyof typeof FEATURES;

/**
 * Helper typé pour tester un flag.
 * Préféré à l'accès direct `FEATURES.egress` dans le JSX pour la lisibilité.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag];
}
