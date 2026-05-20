import { betterAuth } from "better-auth/minimal";
import { emailOTP, genericOAuth, phoneNumber } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
// TRIGGER REBUILD GLOBAL PATCH ALL
import authConfig from "../auth.config";
import { components, internal } from "../_generated/api";
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
const parseTrustedOrigins = () => {
  const origins = (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
    
  if (process.env.DEV_SIGNIN_ENABLED === "true") {
    for (const port of [3000, 3001, 3002, 3003]) {
      origins.push(`http://localhost:${port}`);
      origins.push(`https://localhost:${port}`);
      origins.push(`https://diplomate.local:${port}`);
    }
  }
  return origins;
};

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

// ============================================================================
// Client Session Plugin — extends session to 30 days for the Electron desktop app
// ============================================================================
//
// Web clients keep the global 7-day / 1-day defaults. The Electron renderer adds
// `x-client-type: desktop` on every Better Auth request (see
// apps/agent-desktop/src/renderer/src/lib/auth-client.ts). On session creation
// paths and on /get-session refresh, this plugin rewrites `expiresAt` to now+30d
// and re-sets the session cookie with the corresponding maxAge so the browser
// cookie matches the server-side row.

const DESKTOP_SESSION_EXPIRES_SECONDS = 60 * 60 * 24 * 30; // 30 days
// The effective refresh cadence is driven by the global `session.updateAge`
// (1 day). On every /get-session that crosses the updateAge threshold, Better
// Auth calls internalAdapter.updateSession; our `after` hook then stamps the
// desktop 30d window back on top, so the session rolls forward as long as the
// user stays active — a 7d idle window would elapse well before the 30d cap.

/** Paths that create or refresh a session and therefore need the desktop expiry override. */
const DESKTOP_SESSION_PATHS = new Set<string>([
  "/sign-in/email-otp",
  "/sign-up/email-otp",
  "/sign-in/email",
  "/sign-up/email",
  "/phone-number/verify",
  "/callback/:id", // OAuth (IDN) callback — Better Auth dispatches this path name
  "/oauth2/callback/:providerId",
  "/get-session",
]);

const clientSessionPlugin = (): BetterAuthPlugin => ({
  id: "client-session",
  hooks: {
    after: [
      {
        // Match any path that either creates or refreshes a session. We also
        // short-circuit on the x-client-type header so non-desktop traffic
        // never pays for the extra lookup/write.
        matcher: (ctx) => {
          const clientType =
            ctx.request?.headers?.get("x-client-type") ??
            ctx.headers?.get("x-client-type");
          if (clientType !== "desktop") return false;
          const path = ctx.path ?? "";
          if (DESKTOP_SESSION_PATHS.has(path)) return true;
          // OAuth callback paths are dynamic (/callback/:id) — match the prefix.
          return path.startsWith("/callback/") || path.startsWith("/oauth2/callback/");
        },
        handler: createAuthMiddleware(async (ctx) => {
          // `newSession` is populated after session-creating endpoints
          // (sign-in, sign-up, OAuth callback, phone verify).
          // On /get-session during a rolling refresh, Better Auth re-runs
          // updateSession internally and keeps the updated row on
          // `ctx.context.session`. We prefer newSession, fall back to session.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const target: any = ctx.context.newSession ?? ctx.context.session;
          const token: string | undefined = target?.session?.token;
          if (!token) return;

          const newExpiresAt = new Date(
            Date.now() + DESKTOP_SESSION_EXPIRES_SECONDS * 1000,
          );
          const updatedSession = await ctx.context.internalAdapter.updateSession(token, {
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
          });
          if (!updatedSession) return;

          // Re-issue the cookie with the 30d maxAge so the browser cookie
          // matches the persisted session row.
          const maxAge = (updatedSession.expiresAt.valueOf() - Date.now()) / 1000;
          await setSessionCookie(
            ctx,
            { session: updatedSession, user: target?.user },
            false,
            { maxAge },
          );
        }),
      },
    ],
  },
});

// ============================================================================
// OTP-verified plugin — replaces the legacy client-side `markOtpVerified` call.
// ============================================================================
//
// Better Auth runs an `after` hook on the OTP session-creating endpoints, so we
// can stamp `lastOtpVerifiedAt` (and reset the PIN lock state) at the moment
// the session is created. This removes the previous race where the client
// fired an authMutation before the Convex JWT was attached to the WebSocket.

const OTP_VERIFIED_PATHS = new Set<string>([
  "/sign-in/email-otp",
  "/phone-number/verify",
  // Inscription : verifyEmail ne crée pas de session — on retrouve l'utilisateur
  // par email dans le handler ci-dessous.
  "/email-otp/verify-email",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ctx wraps multiple Convex contexts
const otpVerifiedPlugin = (ctx: any): BetterAuthPlugin => ({
  id: "otp-verified",
  hooks: {
    after: [
      {
        matcher: (hookCtx) => OTP_VERIFIED_PATHS.has(hookCtx.path ?? ""),
        handler: createAuthMiddleware(async (hookCtx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const target: any = hookCtx.context.newSession ?? hookCtx.context.session;
          let authId: string | undefined = target?.user?.id;

          // /email-otp/verify-email ne crée pas forcément de session
          // (autoSignInAfterVerification désactivé). On retrouve l'utilisateur
          // par email transmis dans le body.
          if (!authId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const email: string | undefined = (hookCtx as any).body?.email
              ?.toLowerCase?.();
            if (!email) return;
            const found = await hookCtx.context.internalAdapter.findUserByEmail(
              email,
            );
            authId = found?.user?.id;
          }

          if (!authId) return;
          try {
            await ctx.runMutation(
              internal.functions.pin.markOtpVerifiedByAuthId,
              { authId },
            );
          } catch (err) {
            console.error("[Auth OTP] markOtpVerifiedByAuthId failed:", err);
          }
        }),
      },
    ],
  },
});

export const createAuth = (ctx: GenericCtx<DataModel>, requestOrigin?: string | null) => {
  const isDev = process.env.DEV_SIGNIN_ENABLED === "true";

  return betterAuth({
    appName: "Consulat.ga",
    // CONVEX_SITE_URL is automatically provided by Convex in all environments.
    baseURL: process.env.CONVEX_SITE_URL,
    secret: validateAuthSecret(),
    session: {
      // 7-day sessions with daily refresh. The 30-min Convex JWT
      // provides the real authorization boundary and revocation window.
      expiresIn: 60 * 60 * 24 * 7, // 7 days (604,800s) — Better Auth default
      updateAge: 60 * 60 * 24, // 1 day (86,400s) — Better Auth default
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
    database: authComponent.adapter({
      ...ctx,
      runQuery: async (ref: any, args: any) => {
        if (args && args.where) {
          const processClause = (w: any) => {
            if (w && typeof w === 'object' && 'mode' in w) {
              const { mode, ...rest } = w;
              return rest;
            }
            return w;
          };
          if (Array.isArray(args.where)) {
            args.where = args.where.map(processClause);
          } else {
            args.where = processClause(args.where);
          }
        }
        return ctx.runQuery(ref, args);
      },
      runMutation: async (ref: any, args: any) => {
        if (args && args.where) {
          const processClause = (w: any) => {
            if (w && typeof w === 'object' && 'mode' in w) {
              const { mode, ...rest } = w;
              return rest;
            }
            return w;
          };
          if (Array.isArray(args.where)) {
            args.where = args.where.map(processClause);
          } else {
            args.where = processClause(args.where);
          }
        }
        if (args && args.input && args.input.where) {
          const processClause = (w: any) => {
            if (w && typeof w === 'object' && 'mode' in w) {
              const { mode, ...rest } = w;
              return rest;
            }
            return w;
          };
          if (Array.isArray(args.input.where)) {
            args.input.where = args.input.where.map(processClause);
          } else {
            args.input.where = processClause(args.input.where);
          }
        }
        return (ctx as any).runMutation(ref, args);
      }
    } as any),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @convex-dev/better-auth type mismatch with better-auth generics
      convex({
        authConfig,
        jwt: {
          // Convex JWT valid for 30 minutes (hardened from 1h).
          // The ConvexBetterAuthProvider auto-refreshes before expiry
          // using the Better Auth session cookie.
          expirationSeconds: 60 * 30, // 30 minutes
        },
      }) as any,
      crossDomain({
        // Dynamic per-request: each app gets redirected to its own origin
        siteUrl: resolveSiteUrl(requestOrigin),
      }),

      // ── Client-type session extension (Electron desktop → 30d) ─────
      clientSessionPlugin(),

      // ── Mark OTP verified server-side (refreshes 90-day PIN timer) ──
      // Fires after Better Auth has created the session for an OTP flow,
      // so the user's identity is already available — no client-side race.
      otpVerifiedPlugin(ctx),

      // ── Email OTP ──────────────────────────────────────────────────
      emailOTP({
        otpLength: 6,
        expiresIn: 300, // 5 minutes
        async sendVerificationOTP({ email, otp, type }, reqCtx) {
          const origin = reqCtx?.request?.headers?.get("origin") ?? null;
          const platform = detectPlatform(origin);
          const lang = detectLangFromHeaders(reqCtx?.request?.headers as Headers | undefined);
          const { subject, html } = otpEmail({ otp, type, platform, lang });

          const sender = fromEmail(platform);

          try {
            await resend.sendEmail(ctx as any, {
              from: sender,
              to: email,
              subject,
              html,
            });
          } catch (err: any) {
            console.error(`[OTP] ❌ Failed to send OTP email to ${email}:`, err?.message ?? err);
            throw err; // relancer pour que Better Auth retourne une erreur au client
          }
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
 * Purge toutes les JWKS du component betterAuth.
 *
 * A utiliser quand BETTER_AUTH_SECRET a change et que les JWKS existantes
 * ne peuvent plus etre dechiffrees ("BetterAuthError: Failed to decrypt
 * private key"). Apres la purge, Better Auth regenere automatiquement une
 * nouvelle JWKS chiffree avec le secret courant a la prochaine requete
 * sur /api/auth/convex/token.
 *
 * Effet de bord : tous les JWT Convex existants sont invalides (Better Auth
 * les regenerera apres reconnexion). Les cookies de session Better Auth
 * restent valides.
 */
export const purgeJwks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = (await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: { model: "jwks" as any },
      paginationOpts: { numItems: 1000, cursor: null },
    })) as { count: number; isDone: boolean };
    return result;
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

