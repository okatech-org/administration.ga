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
  // Coût élevé (audio output ~$0.24/min), on limite à 1 nouvelle session toutes
  // les 30 secondes par utilisateur. La session active elle-même peut durer
  // tant que la connexion WebRTC tient — c'est l'établissement qui est rate-limité.
  aiRealtimeSession: {
    kind: "token bucket",
    rate: 2,
    period: MINUTE,
    capacity: 2,
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

  // ── Admin batch operations ──────────────────────────────────
  "admin:batch": {
    kind: "fixed window",
    rate: 5,
    period: HOUR,
  },
});
