import { createFileRoute } from "@tanstack/react-router";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

/**
 * Dev-only sign-in proxy that performs the complete auth flow server-side:
 *   1. Calls Convex /dev/sign-in to get a tempPassword
 *   2. Calls Better Auth /api/auth/sign-in/email with the temp credentials
 *   3. Returns the session cookies to the browser
 *
 * This eliminates the need for the browser to make a second request,
 * and avoids Origin header issues in E2E tests.
 */
async function devSignInHandler(request: Request): Promise<Response> {
	if (!import.meta.env.DEV && import.meta.env.VITE_E2E_MODE !== "true") {
		return Response.json({ error: "Not available in production" }, { status: 403 });
	}

	try {
		const { email } = (await request.json()) as { email?: string };
		if (!email) {
			return Response.json({ error: "email required" }, { status: 400 });
		}

		const origin = request.headers.get("origin") || `http://localhost:3000`;

		// ── Step 1: Get temp credentials from Convex ──
		const devRes = await fetch(`${CONVEX_SITE_URL}/dev/sign-in`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
			},
			body: JSON.stringify({ email }),
		});

		if (!devRes.ok) {
			const text = await devRes.text();
			return Response.json(
				{ error: `Convex dev sign-in failed: ${text}` },
				{ status: devRes.status },
			);
		}

		const { tempPassword, error: devError } = await devRes.json();
		if (devError || !tempPassword) {
			return Response.json(
				{ error: devError || "No tempPassword returned" },
				{ status: 500 },
			);
		}

		// ── Step 2: Sign in via Better Auth (server-side) ──
		const authRes = await fetch(`${CONVEX_SITE_URL}/api/auth/sign-in/email`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
			},
			body: JSON.stringify({ email, password: tempPassword }),
		});

		// ── Step 3: Forward the entire response (including Set-Cookie) ──
		const authBody = await authRes.text();
		const headers = new Headers({ "Content-Type": "application/json" });

		// Forward Set-Cookie headers for session
		const setCookies = (authRes.headers as any).getSetCookie?.() as string[] | undefined;
		if (setCookies && setCookies.length > 0) {
			for (const cookie of setCookies) {
				headers.append("set-cookie", cookie);
			}
		} else {
			// Fallback for runtimes that don't support getSetCookie
			authRes.headers.forEach((value, key) => {
				if (key.toLowerCase() === "set-cookie") {
					headers.append("set-cookie", value);
				}
			});
		}

		return new Response(authBody, { status: authRes.status, headers });
	} catch (error) {
		console.error("[dev/sign-in] proxy error:", error);
		return Response.json({ error: "Proxy error" }, { status: 500 });
	}
}

export const Route = createFileRoute("/api/dev/sign-in")({
	server: {
		handlers: {
			POST: ({ request }: { request: Request }) => devSignInHandler(request),
		},
	},
});
