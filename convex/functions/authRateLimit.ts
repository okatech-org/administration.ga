import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { rateLimiter } from "../ai/rateLimiter";

/**
 * Rate limit checks for auth-related HTTP endpoints.
 * Called from httpAction handlers via ctx.runMutation().
 */

/** Check rate limit for login attempts (keyed by email or IP). */
export const checkLoginRateLimit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "auth:login", { key });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});

/** Check rate limit for OTP sends (keyed by email). */
export const checkOtpSendRateLimit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "auth:otp:send", { key });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});

/** Check rate limit for PIN verification (keyed by email/phone). */
export const checkPinVerifyRateLimit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "auth:pin:verify", { key });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});

/** Check rate limit for dev sign-in (keyed by IP). */
export const checkDevSigninRateLimit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "dev:signin", { key });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});
