/**
 * Feature flags — agent-web / agent-desktop
 *
 * Centralise les flags Next.js publics pour éviter les tests `process.env.X === "1"`
 * dispersés. Chaque flag respecte le pattern Sprint 6 :
 *   - Désactivé par défaut quand la feature nécessite infra externe (egress, push).
 *   - Activé par défaut quand la feature ne coûte rien (whisper/barge-in logique).
 *
 * `process` n'existe pas dans le renderer Electron — on lit l'env via un proxy
 * qui retombe sur `{}` quand `process` est absent, pour rester compatible
 * agent-web (Next.js, remplacement build-time) et agent-desktop (Vite renderer).
 */

const ENV: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};

export const FEATURES = {
  /** Centre d'Appels multi-lignes (existant, Sprint 5) */
  callCenter: ENV.NEXT_PUBLIC_FEATURE_CALL_CENTER !== "0",
  /** Enregistrement d'appel + voicemail via LiveKit Egress — coûte cloud */
  egress: ENV.NEXT_PUBLIC_FEATURE_EGRESS === "1",
  /** Notifications push (Web Push API + VAPID) — nécessite clés */
  push: ENV.NEXT_PUBLIC_FEATURE_PUSH === "1",
  /** Whisper / Barge-in superviseur — logique pure LiveKit, pas de coût */
  supervisionWhisper: ENV.NEXT_PUBLIC_FEATURE_SUPERVISION_WHISPER !== "0",
  /** Mode E2E : expose DevAccountSwitcher même hors dev */
  e2eMode: ENV.NEXT_PUBLIC_E2E_MODE === "true",
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag];
}
