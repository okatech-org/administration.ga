import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { createAuth } from "./betterAuth/auth";
import { hashPassword } from "better-auth/crypto";
import { generateRandomString } from "better-auth/crypto";
import { validateWarehouseApiKey } from "./lib/warehouseAuth";
import { getTrustedClientIp } from "./lib/httpSecurity";
import { validateAllSecrets } from "./lib/startupChecks";
import { WAREHOUSE_TABLES } from "./functions/warehouse";
import { verifyAppointmentIcalToken, buildAppointmentIcs } from "./lib/ical";
import { resolveAssetForDownload } from "./functions/releases";

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

const AUTH_PATH = "/api/auth";

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
  const response = await auth.handler(request);
  
  if (response.status === 500) {
    const errorBody = await response.clone().text();
    console.error("[BetterAuth 500 Error]:", errorBody);
    await ctx.runMutation(internal.functions.warehouse.logAccess, {
      tableName: "better_auth_debug",
      rowCount: 1,
      cursor: null,
    }).catch(() => {}); // Optional fallback to log to convex db if console.error is hard to see
  }
  
  return response;
});

http.route({ pathPrefix: `${AUTH_PATH}/`, method: "GET", handler: authRequestHandler });
http.route({ pathPrefix: `${AUTH_PATH}/`, method: "POST", handler: authRequestHandler });
http.route({
  pathPrefix: `${AUTH_PATH}/`,
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const headers = buildPreflightHeaders(request.headers.get("origin"));
    return new Response(null, { status: 204, headers });
  }),
});

http.route({
  path: "/api/debug-auth-error",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const logs = await ctx.runQuery(internal.functions.warehouse.paginatedTableExport, {
        tableName: "auditLog",
        cursor: null,
        limit: 50,
      });
      return new Response(JSON.stringify(logs), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    } catch (e: any) {
      return new Response(e.message, { status: 500 });
    }
  }),
});

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

      // 2. Resolve email — for phone-based PIN login, look up the user's email
      // from the consulat `users` table (indexed by phone).
      let email = body.email;
      if (!email && body.phone) {
        email = await ctx.runQuery(internal.functions.pin.getEmailByPhone, {
          phone: body.phone,
        }) as string | null ?? undefined;
        if (!email) {
          return new Response(
            JSON.stringify({ error: "User not found in auth system" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      }
      if (!email) {
        return new Response(
          JSON.stringify({ error: "email or phone required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
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

// ============================================================================
// SPRINT 6 — LiveKit Egress webhook
// ============================================================================
// Reçoit les callbacks de LiveKit quand un egress (recording/voicemail)
// se termine. Le filepath encode le type : "recordings/{id}.mp4" pour
// callRecordings, "voicemails/{id}.ogg" pour voicemails.
//
// Signature HMAC validée via header `Authorization` (pattern LiveKit
// WebhookReceiver). Sans secret configuré, on loggue et on ignore.
// ============================================================================

http.route({
  path: "/webhooks/livekit-egress",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (isPayloadTooLarge(request, 2_000_000)) {
      return new Response("Payload too large", { status: 413 });
    }

    const webhookSecret = process.env.LIVEKIT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn("[SPRINT6][STUB] LiveKit webhook secret missing — ignoring");
      return new Response("Webhook disabled", { status: 503 });
    }

    const rawBody = await request.text();
    let event: {
      event?: string;
      egressInfo?: {
        egressId?: string;
        status?: string;
        startedAt?: number | string;
        endedAt?: number | string;
        fileResults?: Array<{
          filepath?: string;
          location?: string;
          size?: number;
          duration?: number | string;
        }>;
      };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // NOTE : LiveKit expose WebhookReceiver côté Node pour valider la signature.
    // Ici on est en runtime V8 donc on fait une validation minimale via header.
    // La validation crypto complète peut se faire côté internalAction si besoin.
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.includes(webhookSecret)) {
      // Validation simple : token partagé (suffisant pour MVP, à durcir plus tard)
      return new Response("Unauthorized", { status: 401 });
    }

    if (event.event !== "egress_ended") {
      // Autres events (started, updated) — on ignore pour l'instant
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const info = event.egressInfo;
    if (!info?.egressId) {
      return new Response("Missing egressId", { status: 400 });
    }

    const fileResult = info.fileResults?.[0];
    const filepath = fileResult?.filepath ?? "";
    const durationMs = fileResult?.duration
      ? Math.round(Number(fileResult.duration) * 1000)
      : undefined;

    // Télécharger le fichier uploadé par LiveKit (si location est une URL publique)
    let storageId: string | undefined;
    if (fileResult?.location) {
      try {
        const fileResp = await fetch(fileResult.location);
        if (fileResp.ok) {
          const blob = await fileResp.blob();
          const id = await ctx.storage.store(blob);
          storageId = id;
        }
      } catch (e) {
        console.error("[SPRINT6] egress file download failed:", e);
      }
    }

    // Routing : "recordings/..." → callRecordings, "voicemails/..." → voicemails
    const isVoicemail = filepath.startsWith("voicemails/");
    const failureReason =
      info.status === "EGRESS_FAILED" ? "LiveKit egress failed" : undefined;

    if (isVoicemail) {
      await ctx.runMutation(internal.functions.voicemails.completeEgress, {
        egressId: info.egressId,
        storageId: storageId as any,
        durationMs,
        failureReason,
      });
    } else {
      await ctx.runMutation(internal.functions.callRecordings.completeEgress, {
        egressId: info.egressId,
        storageId: storageId as any,
        durationMs,
        failureReason,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// iCal (.ics) export — signed token, no session required
// URL: /ical/appointment/{appointmentId}.ics?token=...
// ============================================================================

http.route({
  pathPrefix: "/ical/appointment/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const tail = url.pathname.split("/ical/appointment/")[1] ?? "";
    const appointmentId = tail.replace(/\.ics$/i, "");
    const token = url.searchParams.get("token") ?? "";

    if (!appointmentId || !token) {
      return new Response("Missing token", { status: 400 });
    }

    const verified = await verifyAppointmentIcalToken(token);
    if (!verified || verified.appointmentId !== appointmentId) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    const data = await ctx.runQuery(
      internal.functions.slots.getAppointmentForIcal,
      { appointmentId: appointmentId as any },
    );
    if (!data || !data.appointment) {
      return new Response("Not found", { status: 404 });
    }

    const { appointment, org, serviceName } = data;
    const appUrl = process.env.APP_URL || "https://consulat.ga";
    const address = org?.address
      ? [org.address.street, org.address.city, org.address.country]
          .filter(Boolean)
          .join(", ")
      : "";
    const summary = `RDV ${serviceName ?? "Consulat"} — ${org?.name ?? "Consulat"}`;

    const startMin = appointment.time.split(":").map(Number);
    const endDate = new Date(0, 0, 0, startMin[0], startMin[1] + (appointment.durationMinutes ?? 30));
    const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

    const status: "confirmed" | "cancelled" | "tentative" =
      appointment.status === "cancelled" || appointment.status === "no_show"
        ? "cancelled"
        : appointment.status === "pending"
          ? "tentative"
          : "confirmed";

    const ics = buildAppointmentIcs({
      appointmentId,
      date: appointment.date,
      startTime: appointment.time,
      endTime,
      summary,
      description: `Rendez-vous ${serviceName ?? ""} à ${org?.name ?? "Consulat"}`,
      location: address,
      url: `${appUrl}/my-space/appointments/${appointmentId}`,
      status,
    });

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment-${appointmentId}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  }),
});

// ============================================================================
// Desktop release downloads — proxy vers GitHub Releases
// ============================================================================
//
// GET /releases/download?asset=<filename>
//   → stream du binaire depuis GitHub (public ou privé via GITHUB_TOKEN env).
//     URL publique sans auth ni CORS (ouverte aux navigateurs + wget/curl).
//
// Voir `convex/functions/releases.ts` pour la metadata action `getLatest`.
// ============================================================================

http.route({
  path: "/releases/download",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const assetName = url.searchParams.get("asset");

    if (!assetName || assetName.length > 256) {
      return new Response("Missing or invalid ?asset= parameter", {
        status: 400,
      });
    }

    let resolved: Awaited<ReturnType<typeof resolveAssetForDownload>>;
    try {
      resolved = await resolveAssetForDownload(assetName);
    } catch (err) {
      console.error("releases proxy: failed to resolve asset", err);
      return new Response("Upstream registry unavailable", { status: 502 });
    }

    if (!resolved) {
      return new Response("Asset not found in latest release", { status: 404 });
    }

    const upstreamHeaders: Record<string, string> = {
      Accept: "application/octet-stream",
      "User-Agent": "consulat-agent-release-proxy",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) upstreamHeaders.Authorization = `Bearer ${token}`;

    // Strategy: GitHub returns a 302 → pre-signed S3 URL (valid ~5 min) when you
    // request an asset with Accept: octet-stream. We capture that Location and
    // re-emit it as our own 302. The browser/updater downloads directly from S3,
    // bypassing Convex HTTP action's 20 MiB response cap. The token never leaks
    // (it's only used for the metadata lookup), and the signed URL works without
    // auth for the download itself.
    //
    // For .yml/.yaml updater metadata (tiny), streaming inline would also be
    // fine, but a redirect works identically for electron-updater which follows
    // redirects automatically.
    let upstream: Response;
    try {
      upstream = await fetch(resolved.url, {
        headers: upstreamHeaders,
        redirect: "manual",
      });
    } catch (err) {
      console.error("releases proxy: upstream fetch failed", err);
      return new Response("Failed to contact GitHub", { status: 502 });
    }

    // GitHub redirects 302 → signed S3 URL. Anything else = error.
    const signedUrl = upstream.headers.get("location");
    if (upstream.status < 300 || upstream.status >= 400 || !signedUrl) {
      console.error(
        "releases proxy: expected redirect, got",
        upstream.status,
        upstream.statusText,
      );
      return new Response("Upstream did not return a download URL", {
        status: 502,
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        // Short cache — signed URL is valid only a few minutes, and we want
        // clients to hit our endpoint again to get a fresh one.
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// ============================================================================
// iCorrespondance — Webhook email entrant
// ----------------------------------------------------------------------------
// Reçoit un payload JSON générique d'un parser inbound (Resend Inbound Parse,
// Postmark, SendGrid Inbound Parse, ou relais SMTP custom). Crée un dossier
// de correspondance reçu dans l'org cible.
//
// Sécurité : header `X-Inbound-Secret` doit matcher CORRESPONDANCE_INBOUND_SECRET.
// Sans secret configuré côté serveur, le webhook est désactivé (503).
//
// Payload attendu :
//   {
//     "orgId": "..." (optionnel, sinon résolu via to.email),
//     "messageId": "..." (optionnel, pour la dédup),
//     "from": { "email": "...", "name": "..." },
//     "to": { "email": "...", "name": "..." },
//     "subject": "...",
//     "text": "...",
//     "html": "...",
//     "attachments": [{ "filename": "...", "mimeType": "...", "contentBase64": "..." }]
//   }
// ============================================================================

http.route({
  path: "/webhooks/correspondance-inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Limite à 30 Mo (un email avec PJ peut être lourd).
    if (isPayloadTooLarge(request, 30_000_000)) {
      return new Response("Payload too large", { status: 413 });
    }

    const inboundSecret = process.env.CORRESPONDANCE_INBOUND_SECRET;
    if (!inboundSecret) {
      console.warn("[icorrespondance] CORRESPONDANCE_INBOUND_SECRET missing — webhook disabled");
      return new Response("Webhook disabled", { status: 503 });
    }

    const provided = request.headers.get("x-inbound-secret") ?? "";
    if (provided !== inboundSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Validation minimale (la mutation revalidera via les validators Convex)
    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.from?.email ||
      !payload.to?.email ||
      typeof payload.subject !== "string"
    ) {
      return new Response("Missing required fields (from.email, to.email, subject)", {
        status: 400,
      });
    }

    // Upload des pièces jointes (base64 → storage). httpAction peut faire
    // storage.store, contrairement aux mutations.
    const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
    const MAX_ATTACHMENTS = 20;
    const incoming = Array.isArray(payload.attachments) ? payload.attachments : [];
    if (incoming.length > MAX_ATTACHMENTS) {
      return new Response(
        JSON.stringify({
          ok: false,
          reason: "too_many_attachments",
          message: `Max ${MAX_ATTACHMENTS} pièces jointes, reçu ${incoming.length}.`,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }

    const uploadedAttachments: Array<{
      storageId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];

    for (const att of incoming) {
      if (
        !att ||
        typeof att.filename !== "string" ||
        typeof att.mimeType !== "string" ||
        typeof att.contentBase64 !== "string"
      ) {
        return new Response("Invalid attachment shape", { status: 400 });
      }
      let bytes: Uint8Array;
      try {
        const binary = atob(att.contentBase64);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      } catch {
        return new Response(
          `Invalid base64 for attachment ${att.filename}`,
          { status: 400 },
        );
      }
      if (bytes.length > MAX_ATTACHMENT_SIZE) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "attachment_too_large",
            message: `Pièce jointe ${att.filename} : ${bytes.length} octets (max ${MAX_ATTACHMENT_SIZE}).`,
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        );
      }
      const blob = new Blob([bytes as BlobPart], { type: att.mimeType });
      const storageId = await ctx.storage.store(blob);
      uploadedAttachments.push({
        storageId: storageId as string,
        filename: att.filename,
        mimeType: att.mimeType,
        sizeBytes: bytes.length,
      });
    }

    try {
      const result = await ctx.runMutation(
        internal.functions.correspondanceInbound.ingestInboundEmail,
        {
          orgId: payload.orgId,
          messageId: payload.messageId,
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          attachments: uploadedAttachments as any,
        },
      );

      return new Response(JSON.stringify(result), {
        status: (result as any).ok === false ? 422 : 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[icorrespondance] Inbound webhook error:", err);
      return new Response(
        JSON.stringify({ ok: false, error: err?.message ?? "internal_error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

// ============================================================================
// PNPE Auto-Emploi — webhooks partenaires (Phase 7.6)
// ============================================================================
//
// Reçoit les notifications de statut depuis Ediandza (formation BMC) et
// ANPI-Gabon (formalisation) pour synchroniser l'état des programmes
// Auto-Emploi côté PNPE.
//
// Sécurité : signature HMAC obligatoire en production. Le secret est partagé
// avec le partenaire (EDIANDZA_WEBHOOK_SECRET / ANPI_WEBHOOK_SECRET) ; le
// header `X-Signature` doit contenir le HMAC-SHA256 du corps brut.
// En dev (PNPE_MOCK_INTEGRATIONS=1), la signature n'est pas vérifiée.

async function verifyHmacSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  // Web Crypto API (disponible dans le runtime Convex / Node récent)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expected || signature === `sha256=${expected}`;
}

// ─── Ediandza webhook ────────────────────────────────────────────────
//
// Payload attendu (à valider à la signature du protocole) :
// {
//   "event": "formation.statut_change" | "formation.completion",
//   "parcoursId": "EDIANDZA-XXX",
//   "statutSuivi": "EN_COURS" | "TERMINE" | "ABANDON",
//   "note"?: 17
// }
http.route({
  path: "/integrations/ediandza/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const mockMode = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    const secret = process.env.EDIANDZA_WEBHOOK_SECRET;
    const rawBody = await request.text();

    if (!mockMode) {
      if (!secret) {
        return new Response(
          JSON.stringify({ ok: false, error: "webhook_not_configured" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      const signature = request.headers.get("x-signature");
      const valid = await verifyHmacSignature(rawBody, signature, secret);
      if (!valid) {
        return new Response(
          JSON.stringify({ ok: false, error: "invalid_signature" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    let payload: {
      event?: string;
      parcoursId?: string;
      statutSuivi?: "INSCRIT" | "EN_COURS" | "TERMINE" | "ABANDON";
      note?: number;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_json" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!payload.parcoursId || !payload.statutSuivi) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const programme = await ctx.runQuery(
      (internal as any).functions.pnpe.autoEmploi.getByEdiandzaParcoursId,
      { ediandzaParcoursId: payload.parcoursId },
    );

    if (!programme) {
      return new Response(
        JSON.stringify({ ok: false, error: "programme_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const prevFormation = programme.formationBMC;
    if (!prevFormation) {
      return new Response(
        JSON.stringify({ ok: false, error: "formation_bmc_missing" }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }

    await ctx.runMutation(
      (internal as any).functions.pnpe.autoEmploi.setEdiandzaParcoursId,
      {
        programmeId: programme._id,
        ediandzaParcoursId: payload.parcoursId,
        formationBMC: {
          sessionId: prevFormation.sessionId,
          dateDebut: prevFormation.dateDebut,
          dateFin: prevFormation.dateFin,
          statutSuivi: payload.statutSuivi,
          note: payload.note ?? prevFormation.note,
        },
      },
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ─── ANPI-Gabon webhook ──────────────────────────────────────────────
//
// Payload attendu :
// {
//   "event": "dossier.statut_change" | "dossier.immatriculation",
//   "dossierId": "ANPI-XXX",
//   "statutDossier": "RECU" | "INSTRUCTION" | "VALIDATION" | "IMMATRICULATION" | "REJET",
//   "companyImmatriculation"?: { "rccm": "...", "nif": "..." }
// }
http.route({
  path: "/integrations/anpi/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const mockMode = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    const secret = process.env.ANPI_WEBHOOK_SECRET;
    const rawBody = await request.text();

    if (!mockMode) {
      if (!secret) {
        return new Response(
          JSON.stringify({ ok: false, error: "webhook_not_configured" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }
      const signature = request.headers.get("x-signature");
      const valid = await verifyHmacSignature(rawBody, signature, secret);
      if (!valid) {
        return new Response(
          JSON.stringify({ ok: false, error: "invalid_signature" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    let payload: {
      event?: string;
      dossierId?: string;
      statutDossier?:
        | "RECU"
        | "INSTRUCTION"
        | "VALIDATION"
        | "IMMATRICULATION"
        | "REJET";
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_json" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!payload.dossierId || !payload.statutDossier) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const programme = await ctx.runQuery(
      (internal as any).functions.pnpe.autoEmploi.getByAnpiDossierId,
      { anpiDossierId: payload.dossierId },
    );

    if (!programme) {
      return new Response(
        JSON.stringify({ ok: false, error: "programme_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Avance le programme en LANCEMENT uniquement à l'IMMATRICULATION
    // effective (la validation ANPI seule ne suffit pas — l'activité doit
    // être immatriculée pour être considérée comme lancée).
    const avancer = payload.statutDossier === "IMMATRICULATION";

    await ctx.runMutation(
      (internal as any).functions.pnpe.autoEmploi.setAnpiDossierId,
      {
        programmeId: programme._id,
        anpiDossierId: payload.dossierId,
        avancerEnLancement: avancer,
      },
    );

    return new Response(
      JSON.stringify({ ok: true, advanced: avancer }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

export default http;
