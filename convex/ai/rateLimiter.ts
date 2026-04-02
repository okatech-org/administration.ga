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
