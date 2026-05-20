/**
 * Rate limiter configuration — centralised for the entire backend.
 *
 * Keyed by use-case. Each HTTP handler / mutation calls
 *   rateLimiter.limit(ctx, "key", { key: identifier })
 * where `identifier` is an IP, userId, or email.
 */
import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // ── AI ───────────────────────────────────────────────────────
  // 20 messages per minute per user, small burst
  aiChat: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },

  // Chat public (page /services & autres pages publiques) — visiteurs anonymes.
  // 1 question / 24h par sessionId. Au-delà → invitation à se connecter.
  aiChatPublicGuest: {
    kind: "fixed window",
    rate: 1,
    period: 24 * HOUR,
    capacity: 1,
  },

  // Chat public — utilisateurs connectés. 10 questions / 24h par userId.
  aiChatPublicUser: {
    kind: "fixed window",
    rate: 10,
    period: 24 * HOUR,
    capacity: 10,
  },

  // Inscription pre-fill par invité (avant signup). Coût Gemini ≈ $0.02-0.05
  // par appel, on limite à 5 par heure par sessionId client. Suffit pour 1-2
  // ré-essais en cas de doc mal cadré sans permettre l'abus.
  aiPrefillGuest: {
    kind: "token bucket",
    rate: 5,
    period: HOUR,
    capacity: 2,
  },

  // Realtime voice sessions (OpenAI gpt-4o-realtime via WebRTC).
  // Coût élevé (audio output ~$0.24/min), on limite à 10 nouvelles sessions
  // par minute par utilisateur. Capacity 5 permet une rafale (test/debug) sans
  // bloquer immédiatement après un faux-départ. La session active elle-même
  // peut durer tant que la connexion WebRTC tient — c'est l'établissement
  // qui est rate-limité.
  aiRealtimeSession: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 5,
  },

  // Tool calls vocaux. Garde-fou contre boucle / amplification : 60 invocations
  // par minute par utilisateur, capacity 20 pour absorber les rafales légitimes
  // (ex : enchaînement find_contact → launch_call → toggle_mic en 3s).
  aiRealtimeToolCall: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 20,
  },

  // Mutations vocales (actions destructives ou impactantes). Budget journalier
  // pour éviter qu'une session compromise valide des centaines de dossiers.
  // 200/jour permet largement un usage normal (~25 dossiers/jour pour 8h).
  aiRealtimeMutation: {
    kind: "token bucket",
    rate: 200,
    period: 24 * HOUR,
    capacity: 30,
  },

  // Sprint 6 — vision API. Capture d'écran + analyse GPT-4o Vision.
  // Coût ~$0.01 par capture (gpt-4o-mini en mode "low" detail). Budget
  // strict pour borner la dépense — 10/jour soft (capacité rafale 3) et
  // ~300/jour hard via le budget mensuel global G1. Réservé aux surfaces
  // agent + backoffice (citoyen exclu côté `realtimeTools.getToolsForUser`).
  aiRealtimeVision: {
    kind: "token bucket",
    rate: 10,
    period: 24 * HOUR,
    capacity: 3,
  },

  // ── Auth — brute-force protection ───────────────────────────
  // Login: 5 attempts per 15 min per email/IP
  "auth:login": {
    kind: "token bucket",
    rate: 5,
    period: 15 * MINUTE,
    capacity: 5,
  },
  // OTP send: 3 per 5 min per email (prevent SMS/email flood)
  "auth:otp:send": {
    kind: "token bucket",
    rate: 3,
    period: 5 * MINUTE,
    capacity: 3,
  },
  // PIN verify: 5 per 5 min per email/phone
  "auth:pin:verify": {
    kind: "token bucket",
    rate: 5,
    period: 5 * MINUTE,
    capacity: 5,
  },
  // Dev sign-in (when enabled): 10 per min per IP
  "dev:signin": {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
  // Desktop OTT generation: 5 per 5 min per session
  "auth:ott:generate": {
    kind: "token bucket",
    rate: 5,
    period: 5 * MINUTE,
    capacity: 5,
  },

  // ── Warehouse / data export ──────────────────────────────────
  // PostHog Data Warehouse sync: 60 requests per minute
  warehouseSync: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 10,
  },

  // ── Affaires Diplomatiques — actions IA Gemini ──────────────
  // Découverte de cibles (10 cibles par appel × Gemini lourd).
  // Limite stricte pour éviter d'épuiser le quota et de spammer la DB.
  "diplomatic:discover": {
    kind: "token bucket",
    rate: 5,
    period: HOUR,
    capacity: 2,
  },
  // Plan stratégique (mode complet ~ 50 Ko JSON, plus coûteux que les autres).
  "diplomatic:strategy": {
    kind: "token bucket",
    rate: 20,
    period: HOUR,
    capacity: 5,
  },
  // Autres actions IA standard (enrich, draftLetter, compileReport, structureProject).
  "diplomatic:standard": {
    kind: "token bucket",
    rate: 30,
    period: HOUR,
    capacity: 10,
  },
  // Extraction de priorités depuis document (PDF/Markdown).
  "diplomatic:extract": {
    kind: "token bucket",
    rate: 15,
    period: HOUR,
    capacity: 5,
  },

  // ── Admin batch operations ──────────────────────────────────
  "admin:batch": {
    kind: "fixed window",
    rate: 5,
    period: HOUR,
  },
});
