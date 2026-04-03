import { betterAuth } from "better-auth/minimal";
import { emailOTP, genericOAuth, phoneNumber } from "better-auth/plugins";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import authConfig from "../auth.config";
import { components } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { resend } from "../functions/notifications";
import { sendSms } from "../lib/bird";
import { detectPlatform, fromEmail } from "../lib/platform";
import { otpEmail, detectLangFromHeaders } from "../lib/emailTemplates";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";

// Better Auth Component Client
export const authComponent = createClient<DataModel>(components.betterAuth);

// ============================================================================
// Better Auth Instance Factory
// ============================================================================

/** Trusted origins parsed once from the environment. */
const parseTrustedOrigins = () =>
  (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Derive the crossDomain `siteUrl` from the request Origin header.
 *
 * The crossDomain plugin uses siteUrl to rewrite relative callback URLs
 * (e.g. OAuth redirects). By deriving it from the requester's origin,
 * each app (citizen, agent, backoffice) gets redirected back to itself.
 *
 * Falls back to SITE_URL env → "https://consulat.ga" (citizen).
 */
function resolveSiteUrl(origin?: string | null): string {
  if (origin) {
    try {
      const url = new URL(origin);
      return url.origin; // e.g. "https://admin.consulat.ga"
    } catch { /* invalid origin, use fallback */ }
  }
  return process.env.SITE_URL ?? "https://consulat.ga";
}

/** Valide que BETTER_AUTH_SECRET est present et suffisamment long. */
function validateAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("[Auth] BETTER_AUTH_SECRET est manquant. Le serveur ne peut pas demarrer sans secret.");
  }
  if (secret.length < 32) {
    throw new Error(
      `[Auth] BETTER_AUTH_SECRET trop court (${secret.length} chars). Minimum 32 requis.`,
    );
  }
  return secret;
}

export const createAuth = (ctx: GenericCtx<DataModel>, requestOrigin?: string | null) => {
  const isDev = process.env.DEV_SIGNIN_ENABLED === "true";

  return betterAuth({
    appName: "Consulat.ga",
    // CONVEX_SITE_URL is automatically provided by Convex in all environments.
    baseURL: process.env.CONVEX_SITE_URL,
    secret: validateAuthSecret(),
    session: {
      // 8-hour sessions — appropriate for a diplomatic portal handling
      // sensitive data (passports, identities, consular cards).
      expiresIn: 60 * 60 * 8, // 8 hours in seconds
      // Refresh at 50% of session lifetime (every 4 hours of active use).
      updateAge: 60 * 60 * 4, // 4 hours in seconds
    },
    trustedOrigins: isDev
      ? (request) => {
          const origins = parseTrustedOrigins();
          const reqOrigin = request?.headers?.get("origin");
          if (reqOrigin) {
            try {
              const url = new URL(reqOrigin);
              if (
                url.hostname === "localhost" ||
                url.hostname === "127.0.0.1" ||
                url.hostname.endsWith(".local")
              ) {
                origins.push(reqOrigin);
              }
            } catch { /* ignore */ }
          }
          return origins;
        }
      : parseTrustedOrigins(),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    advanced: {
      // Convex always runs on HTTPS → Better Auth infers Secure cookies.
      // Dev clients connect via http://localhost proxy → force non-secure.
      useSecureCookies: isDev ? false : undefined,
    },
    plugins: [
      convex({
        authConfig,
        jwt: {
          // Convex JWT valid for 30 minutes (hardened from 1h).
          // The ConvexBetterAuthProvider auto-refreshes before expiry
          // using the Better Auth session cookie.
          expirationSeconds: 60 * 30, // 30 minutes
        },
      }),
      crossDomain({
        // Dynamic per-request: each app gets redirected to its own origin
        siteUrl: resolveSiteUrl(requestOrigin),
      }),

      // ── Email OTP ──────────────────────────────────────────────────
      emailOTP({
        otpLength: 6,
        expiresIn: 300, // 5 minutes
        async sendVerificationOTP({ email, otp, type }, reqCtx) {
          const origin = reqCtx?.request?.headers?.get("origin") ?? null;
          const platform = detectPlatform(origin);
          const lang = detectLangFromHeaders(reqCtx?.request?.headers as Headers | undefined);
          const { subject, html } = otpEmail({ otp, type, platform, lang });

          await resend.sendEmail(ctx as any, {
            from: fromEmail(platform),
            to: email,
            subject,
            html,
          });
        },
      }),

      // ── IDN OAuth ──────────────────────────────────────────────────
      genericOAuth({
        config: [
          {
            providerId: "idn",
            clientId: process.env.IDN_CLIENT_ID!,
            clientSecret: process.env.IDN_CLIENT_SECRET!,
            discoveryUrl: process.env.IDN_DISCOVERY_URL!,
            scopes: ["openid", "profile", "email"],
          },
        ],
      }),

      // ── Phone OTP (SMS via Bird) ───────────────────────────────────
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          if (!process.env.BIRD_API_KEY) {
            console.log("[Auth SMS] BIRD_API_KEY not configured, skipping");
            return;
          }
          try {
            await sendSms(
              phone,
              `Consulat.ga — Votre code de connexion : ${code}. Valable 5 minutes.`,
            );
          } catch (err) {
            console.error("[Auth SMS] Failed to send OTP:", err);
          }
        },
      }),
    ],
  });
};

// ============================================================================
// Exported queries / mutations
// ============================================================================

/** Get the current authenticated user (for client-side checks). */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});

/**
 * Reset BetterAuth credential passwords to null, in batches.
 * Returns { done, reset, skipped, remaining } so the script can loop.
 */
export const resetAllPasswords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "account",
      where: [{ field: "providerId", value: "credential" }],
      paginationOpts: { numItems: 10000, cursor: null },
    })) as any;
    const accounts = (result?.page ?? result ?? []) as any[];

    const withPassword = accounts.filter((a: any) => a.password);
    const batch = withPassword.slice(0, 50);
    let reset = 0;

    for (const account of batch) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "account",
          where: [{ field: "_id", value: account._id }],
          update: { password: null },
        },
      });
      reset++;
    }

    return {
      done: withPassword.length <= 50,
      total: accounts.length,
      reset,
      skipped: accounts.length - withPassword.length,
      remaining: Math.max(0, withPassword.length - 50),
    };
  },
});

