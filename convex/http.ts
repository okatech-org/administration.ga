import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";
import { hashPassword } from "better-auth/crypto";
import { generateRandomString } from "better-auth/crypto";
import { validateWarehouseApiKey } from "./lib/warehouseAuth";
import { WAREHOUSE_TABLES } from "./functions/warehouse";

const http = httpRouter();

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
  const origin = request.headers.get("origin");
  const auth = createAuth(ctx, origin);
  return auth.handler(request);
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
    // ── Safety guard: only active when DEV_SIGNIN_ENABLED=true ──
    if (process.env.DEV_SIGNIN_ENABLED !== "true") {
      return new Response("Dev sign-in not enabled", { status: 403 });
    }

    const origin = request.headers.get("origin") ?? "";
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Credentials": "true",
    };

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
          JSON.stringify({ error: `No user found for ${email}` }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      const user = users[0];
      const userId = String(user._id ?? user.id);

      // 2. Find or create a credential account with a temp password
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

      // 3. Call Better Auth's sign-in handler with the temp password
      const auth = createAuth(ctx, origin);
      const siteUrl = process.env.SITE_URL ?? "https://localhost:3000";
      const signInRequest = new Request(`${siteUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": origin || siteUrl,
          "User-Agent": request.headers.get("user-agent") ?? "",
        },
        body: JSON.stringify({ email, password: tempPassword }),
      });

      const authResponse = await auth.handler(signInRequest);

      // 4. Clear the temp password (set back to null)
      const accountId = accounts[0]?._id ?? accounts[0]?.id;
      if (accountId) {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "account",
            where: [{ field: "_id", value: accountId }],
            update: { password: null },
          },
        } as any);
      }

      // 5. Relay the auth response (includes proper Set-Cookie headers)
      const responseBody = await authResponse.text();
      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "application/json");

      // Forward Set-Cookie headers from Better Auth's response
      // Use getSetCookie() to properly handle multiple cookies (session + CSRF)
      const cookies = (authResponse.headers as any).getSetCookie?.() as string[] | undefined;
      if (cookies && cookies.length > 0) {
        for (const cookie of cookies) {
          responseHeaders.append("Set-Cookie", cookie);
        }
      } else {
        // Fallback: single header forwarding
        const setCookieHeader = authResponse.headers.get("set-cookie");
        if (setCookieHeader) {
          responseHeaders.set("Set-Cookie", setCookieHeader);
        }
      }

      // Add CORS headers
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }

      return new Response(responseBody, {
        status: authResponse.status,
        headers: responseHeaders,
      });
    } catch (error: any) {
      console.error("[dev/sign-in] error:", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Internal error" }),
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
    const origin = request.headers.get("origin") ?? "*";
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
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
      return new Response(error.message || "Webhook error", { status: 400 });
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

export default http;
