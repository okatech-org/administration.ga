import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";
import { hashPassword } from "better-auth/crypto";
import { generateRandomString } from "better-auth/crypto";
import { validateWarehouseApiKey } from "./lib/warehouseAuth";
import { getTrustedClientIp } from "./lib/httpSecurity";
import { validateAllSecrets } from "./lib/startupChecks";
import { WAREHOUSE_TABLES } from "./functions/warehouse";

// ── Verification securite au chargement du module ──
validateAllSecrets();

const http = httpRouter();

// ============================================================================
// CORS — Validated origin whitelist (no wildcard fallback)
// ============================================================================

/** Parse trusted origins from environment (same source as Better Auth config). */
const ALLOWED_ORIGINS = new Set(
  (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

// In dev mode, also allow localhost variants
if (process.env.DEV_SIGNIN_ENABLED === "true") {
  for (const port of [3000, 3001, 3002, 3003]) {
    ALLOWED_ORIGINS.add(`http://localhost:${port}`);
    ALLOWED_ORIGINS.add(`https://localhost:${port}`);
  }
}

/**
 * Build CORS headers only for trusted origins.
 * Returns empty object for unknown origins — browser will block the request.
 */
function buildCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
  };
}

/** Build CORS preflight headers for trusted origins. */
function buildPreflightHeaders(requestOrigin: string | null): Record<string, string> {
  const cors = buildCorsHeaders(requestOrigin);
  if (!cors["Access-Control-Allow-Origin"]) return {};
  return {
    ...cors,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// ── Verification IP bloquee — systeme de defense automatique ──
// Tarpit adaptatif : delai exponentiel selon le score de menace
function computeTarpitDelay(score: number): number {
  // score 0 → 0ms | score 50 → 5s | score 100 → 10s | score 200+ → 30s max
  return Math.min(Math.floor(score * 100), 30_000);
}

async function checkIpBlock(
  ctx: { runQuery: (fn: any, args: any) => Promise<any> },
  request: Request,
): Promise<Response | null> {
  const ip = getTrustedClientIp(request);
  const { blocked, score } = (await ctx.runQuery(
    internal.functions.autoDefense.isIpBlocked,
    { ip },
  )) as { blocked: boolean; score: number };
  if (blocked) {
    // Tarpit adaptatif : plus le score est eleve, plus le delai est long
    const delay = computeTarpitDelay(score);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

// ── Validation taille payload — protection anti-DoS ──
function isPayloadTooLarge(request: Request, maxBytes = 50_000): boolean {
  const contentLength = request.headers.get("content-length");
  return !!contentLength && parseInt(contentLength, 10) > maxBytes;
}

// ── Detection production — garde independante de DEV_SIGNIN_ENABLED ──
const PRODUCTION_DOMAINS = ["consulat.ga", "diplomate.ga", "admin.consulat.ga"];
function isProductionDeployment(): boolean {
  const siteUrl = process.env.CONVEX_SITE_URL ?? "";
  return PRODUCTION_DOMAINS.some((d) => siteUrl.includes(d));
}

// ============================================================================
// Better Auth route handlers (manual registration for dynamic crossDomain)
// ============================================================================
// We register routes manually instead of using `authComponent.registerRoutes`
// so we can pass the request Origin to `createAuth`, allowing crossDomain's
// `siteUrl` to match the calling app (citizen, agent, or backoffice).

const AUTH_PATH = "/api/my-auth";

// OIDC well-known redirect (required for Convex JWT validation)
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    const url = `${process.env.CONVEX_SITE_URL}${AUTH_PATH}/convex/.well-known/openid-configuration`;
    return Response.redirect(url);
  }),
});

const authRequestHandler = httpAction(async (ctx, request) => {
  const proxiedCtx = {
    ...ctx,
    runQuery: async (ref: any, args: any) => {
      let strippedArgs = args;
      if (args && args.where) {
        const processClause = (w: any) => {
          if (w && typeof w === 'object' && 'mode' in w) {
            const { mode, ...rest } = w;
            return rest;
          }
          return w;
        };
        strippedArgs = { ...args };
        if (Array.isArray(args.where)) {
          strippedArgs.where = args.where.map(processClause);
        } else {
          strippedArgs.where = processClause(args.where);
        }
      }
      return ctx.runQuery(ref, strippedArgs);
    },
    runMutation: async (ref: any, args: any) => {
      let strippedArgs = args;
      if (args) {
        const processClause = (w: any) => {
          if (w && typeof w === 'object' && 'mode' in w) {
            const { mode, ...rest } = w;
            return rest;
          }
          return w;
        };
        strippedArgs = { ...args };
        if (args.where) {
          strippedArgs.where = Array.isArray(args.where) 
            ? args.where.map(processClause) 
            : processClause(args.where);
        }
        if (args.input && args.input.where) {
          strippedArgs.input = { ...args.input };
          strippedArgs.input.where = Array.isArray(args.input.where) 
            ? args.input.where.map(processClause) 
            : processClause(args.input.where);
        }
      }
      return ctx.runMutation(ref, strippedArgs);
    }
  };

  const origin = request.headers.get("origin");
  const auth = createAuth(proxiedCtx as any, origin);
  const rewrittenUrl = request.url.replace("/api/my-auth", "/api/auth");
  const newRequest = new Request(rewrittenUrl, request);
  return auth.handler(newRequest);
});

http.route({ pathPrefix: `${AUTH_PATH}/`, method: "GET", handler: authRequestHandler });
http.route({ pathPrefix: `${AUTH_PATH}/`, method: "POST", handler: authRequestHandler });

// ============================================================================
// DEV-ONLY: Passwordless sign-in for the Dev Account Switcher
// Sets a temp password → calls Better Auth sign-in → clears the password.
// ============================================================================
http.route({
  path: "/dev/sign-in",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // ── Double garde : desactive si non explicitement active OU si en production ──
    if (process.env.DEV_SIGNIN_ENABLED !== "true" || isProductionDeployment()) {
      return new Response("Not available", { status: 403 });
    }

    const origin = request.headers.get("origin");
    const corsHeaders = buildCorsHeaders(origin);

    // ── IP bloquee ? ──
    const ipBlockResponse = await checkIpBlock(ctx, request);
    if (ipBlockResponse) return ipBlockResponse;

    // ── Validation taille payload ──
    if (isPayloadTooLarge(request, 10_000)) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Rate limiting ──
    const ip = getTrustedClientIp(request);
    const { ok, retryAfter } = await ctx.runMutation(internal.functions.authRateLimit.checkDevSigninRateLimit, { key: ip }) as any;
    if (!ok) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter), ...corsHeaders },
      });
    }

    const { email } = (await request.json()) as { email?: string };
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    try {
      // 1. Find the user
      const usersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "user",
          where: [{ field: "email", value: email }],
          paginationOpts: { numItems: 1, cursor: null },
        },
      );
      const users = ((usersResult as any)?.page ?? usersResult ?? []) as any[];
      if (users.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      const user = users[0];
      const userId = String(user._id ?? user.id);

      // 2. Ensure emailVerified is true (required because requireEmailVerification: true)
      if (!user.emailVerified) {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            where: [{ field: "_id", value: user._id ?? user.id }],
            update: { emailVerified: true },
          },
        } as any);
      }

      // 3. Find or create a credential account with a temp password
      const tempPassword = "__dev_temp_" + crypto.randomUUID();
      const accountsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "account",
          where: [
            { field: "userId", value: userId },
            { field: "providerId", value: "credential" },
          ],
          paginationOpts: { numItems: 1, cursor: null },
        },
      );
      const accounts = ((accountsResult as any)?.page ?? accountsResult ?? []) as any[];

      // Hash the temp password using Better Auth's scrypt hasher
      const hashedPassword = await hashPassword(tempPassword);

      if (accounts.length > 0) {
        // Update existing credential account with temp password
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "account",
            where: [{ field: "_id", value: accounts[0]._id ?? accounts[0].id }],
            update: { password: hashedPassword },
          },
        } as any);
      } else {
        // Create a credential account
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "account",
            data: {
              userId,
              providerId: "credential",
              accountId: userId,
              password: hashedPassword,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        } as any);
      }

      // 4. Schedule cleanup of temp password after 30s
      const accountId = accounts[0]?._id ?? accounts[0]?.id ?? null;
      await ctx.scheduler.runAfter(30_000, internal.functions.roleConfig.clearTempPassword, {
        accountId,
      });

      // 5. Return the tempPassword — the client will use authClient.signIn.email()
      // which goes through the /api/auth/* proxy → crossDomain flow for proper cookies.
      return new Response(
        JSON.stringify({ email, tempPassword }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    } catch (error: any) {
      console.error("[dev/sign-in] error:", error);
      return new Response(
        JSON.stringify({ error: "Authentication service error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  }),
});

// CORS preflight for /dev/sign-in
http.route({
  path: "/dev/sign-in",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const headers = buildPreflightHeaders(request.headers.get("origin"));
    return new Response(null, { status: 204, headers });
  }),
});

// ============================================================================
// PIN-based sign-in: verify PIN and create session via temp password technique
// Same pattern as /dev/sign-in but for production PIN-based authentication
// ============================================================================
http.route({
  path: "/api/auth/pin-session",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const corsHeaders = buildCorsHeaders(origin);

    // ── IP bloquee ? ──
    const ipBlockResponse = await checkIpBlock(ctx, request);
    if (ipBlockResponse) return ipBlockResponse;

    // ── Validation taille payload ──
    if (isPayloadTooLarge(request, 10_000)) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await request.json()) as { email?: string; phone?: string; pin?: string };
    if (!body.pin || (!body.email && !body.phone)) {
      return new Response(JSON.stringify({ error: "email/phone and pin required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Rate limiting (keyed by email or phone) ──
    const rateLimitKey = body.email || body.phone || "unknown";
    const { ok: rlOk, retryAfter: rlRetry } = await ctx.runMutation(
      internal.functions.authRateLimit.checkPinVerifyRateLimit,
      { key: rateLimitKey },
    ) as any;
    if (!rlOk) {
      return new Response(JSON.stringify({ error: "Too many attempts" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rlRetry), ...corsHeaders },
      });
    }

    try {
      // 1. Verify PIN via the pin.verifyPin mutation
      const result = await ctx.runMutation(internal.functions.pin.verifyPin, {
        email: body.email,
        phone: body.phone,
        pin: body.pin,
      }) as any;

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error, attemptsRemaining: result.attemptsRemaining }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      // 2. Find the Better Auth user by authId
      const email = body.email;
      if (!email) {
        // Pour les connexions par téléphone, on doit d'abord trouver l'email
        const userByPhone = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "user",
            where: [{ field: "email", value: email ?? "" }],
            paginationOpts: { numItems: 1, cursor: null },
          },
        );
        // Fallback: PIN par téléphone nécessite un flux différent
        return new Response(
          JSON.stringify({ error: "Phone PIN login not yet supported via HTTP" }),
          { status: 501, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      const usersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "user",
          where: [{ field: "email", value: email }],
          paginationOpts: { numItems: 1, cursor: null },
        },
      );
      const users = ((usersResult as any)?.page ?? usersResult ?? []) as any[];
      if (users.length === 0) {
        return new Response(
          JSON.stringify({ error: "User not found in auth system" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      const user = users[0];
      const userId = String(user._id ?? user.id);

      // 3. Set temp password (same technique as dev sign-in)
      const tempPassword = "__pin_temp_" + crypto.randomUUID();
      const hashedTempPwd = await hashPassword(tempPassword);

      const accountsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "account",
          where: [
            { field: "userId", value: userId },
            { field: "providerId", value: "credential" },
          ],
          paginationOpts: { numItems: 1, cursor: null },
        },
      );
      const accounts = ((accountsResult as any)?.page ?? accountsResult ?? []) as any[];

      if (accounts.length > 0) {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "account",
            where: [{ field: "_id", value: accounts[0]._id ?? accounts[0].id }],
            update: { password: hashedTempPwd },
          },
        } as any);
      } else {
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "account",
            data: {
              userId,
              providerId: "credential",
              accountId: userId,
              password: hashedTempPwd,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        } as any);
      }

      // 4. Clean up temp password after 30s
      await ctx.scheduler.runAfter(30_000, internal.functions.roleConfig.clearTempPassword, {
        accountId: accounts[0]?._id ?? accounts[0]?.id ?? null,
      });

      // 5. Return temp password for client to complete sign-in via Better Auth
      return new Response(
        JSON.stringify({ email, tempPassword }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    } catch (err: any) {
      console.error("[pin-session] error:", err);
      return new Response(
        JSON.stringify({ error: "Authentication service error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  }),
});

// CORS preflight for /api/auth/pin-session
http.route({
  path: "/api/auth/pin-session",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const headers = buildPreflightHeaders(request.headers.get("origin"));
    return new Response(null, { status: 204, headers });
  }),
});

// ============================================================================
// Desktop app auth: generate OTT and redirect to deep link
// Called from the browser after the user signs in on diplomate.ga.
// The session cookie must be present (user is already authenticated).
// ============================================================================
http.route({
  path: "/desktop/generate-ott",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const auth = createAuth(ctx, origin);

    // Validate the user's session via Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.session) {
      // Not authenticated — redirect to sign-in with desktop flag
      const siteUrl = process.env.SITE_URL ?? "https://diplomate.ga";
      return Response.redirect(`${siteUrl}/sign-in?from=desktop`, 302);
    }

    // ── Rate limiting — cle basee sur le token de session ──
    const rateLimitKey = session.session.token.slice(0, 16);
    const { ok: rlOk, retryAfter: rlRetry } = await ctx.runMutation(
      internal.functions.authRateLimit.checkOttGenerateRateLimit,
      { key: rateLimitKey },
    ) as { ok: boolean; retryAfter: number };
    if (!rlOk) {
      return new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rlRetry / 1000)) },
      });
    }

    // Generate a one-time token linked to this session
    const token = generateRandomString(32);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "verification",
        data: {
          value: session.session.token,
          identifier: `one-time-token:${token}`,
          expiresAt: expiresAt.getTime(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    } as any);

    // Redirect to the Tauri deep link with the OTT
    return Response.redirect(`diplomate://auth?ott=${token}`, 302);
  }),
});

/**
 * Stripe Webhook Handler
 * Handles payment confirmations from Stripe
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Stripe payloads sont typiquement <100KB
    if (isPayloadTooLarge(request, 500_000)) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const signature = request.headers.get("stripe-signature");
    const payload = await request.text();

    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    try {
      await ctx.runAction(internal.functions.payments.handleWebhook, {
        payload,
        signature,
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      return new Response(JSON.stringify({ error: "Webhook processing error" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================================================
// PostHog Data Warehouse: paginated table export endpoints
// ============================================================================

const warehouseHandler = httpAction(async (ctx, request) => {
  // 1. Auth
  if (!validateWarehouseApiKey(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Rate limit
  const { ok, retryAfter } = await ctx.runMutation(
    internal.functions.warehouse.checkWarehouseRateLimit,
    {},
  );
  if (!ok) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfter / 1000)),
      },
    });
  }

  // 3. Extract table name from path: /warehouse/v1/{tableName}
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const tableName = segments[segments.length - 1];

  // 4. Parse query params
  const cursorParam = url.searchParams.get("cursor");
  const cursor = cursorParam !== null ? Number(cursorParam) : null;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 1000), 5000);

  // 5. Fetch data
  const data = await ctx.runQuery(
    internal.functions.warehouse.paginatedTableExport,
    { tableName, cursor, limit },
  );

  // 6. Audit log (fire-and-forget via scheduler to not block response)
  await ctx.runMutation(internal.functions.warehouse.logAccess, {
    tableName,
    rowCount: data.results.length,
    cursor,
  });

  // 7. Return PostHog-compatible response
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

for (const tableName of WAREHOUSE_TABLES) {
  http.route({
    path: `/warehouse/v1/${tableName}`,
    method: "GET",
    handler: warehouseHandler,
  });
}

// ============================================================================
// Honeypot routes — detection des scanners et attaquants automatises
// Chemins courants testes par les bots ; un acces = IP suspecte
// ============================================================================

const HONEYPOT_PATHS = [
  "/admin/login", "/wp-admin", "/wp-login.php",
  "/.env", "/.git/config", "/config.json",
  "/api/v1/admin", "/phpmyadmin", "/xmlrpc.php",
];

const honeypotHandler = httpAction(async (ctx, request) => {
  const ip = getTrustedClientIp(request);
  const url = new URL(request.url);

  await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
    type: "HONEYPOT_TRIGGERED",
    source: "SECURITE",
    entiteType: "ip",
    entiteId: ip,
    payload: {
      path: url.pathname,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      ip,
    },
    confiance: 1,
    priorite: "HIGH",
    correlationId: crypto.randomUUID(),
  });

  // Enregistrer dans le systeme de defense automatique
  await ctx.runMutation(internal.functions.autoDefense.recordThreatEvent, {
    ip,
    eventType: "HONEYPOT_TRIGGERED",
    metadata: { path: url.pathname },
  });

  // Tarpit : ralentir l'attaquant (3s de delai)
  await new Promise((r) => setTimeout(r, 3000));
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

for (const path of HONEYPOT_PATHS) {
  http.route({ path, method: "GET", handler: honeypotHandler });
}

// ============================================================================
// Canary token — alerte critique si des donnees volees sont utilisees
// Un acces a /canary/{id} signifie qu'un token injecte a ete declenche
// ============================================================================

http.route({
  pathPrefix: "/canary/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const tokenId = url.pathname.split("/canary/")[1] ?? "unknown";
    const ip = getTrustedClientIp(request);

    await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
      type: "CANARY_TRIGGERED",
      source: "SECURITE",
      entiteType: "canary",
      entiteId: tokenId,
      payload: {
        tokenId,
        ip,
        userAgent: request.headers.get("user-agent") ?? "unknown",
        triggeredAt: Date.now(),
      },
      confiance: 1,
      priorite: "CRITICAL",
      correlationId: crypto.randomUUID(),
    });

    // Enregistrer dans le systeme de defense automatique
    await ctx.runMutation(internal.functions.autoDefense.recordThreatEvent, {
      ip,
      eventType: "CANARY_TRIGGERED",
      metadata: { tokenId },
    });

    // Reponse silencieuse pour ne pas alerter l'attaquant
    return new Response("", { status: 200 });
  }),
});

export default http;
