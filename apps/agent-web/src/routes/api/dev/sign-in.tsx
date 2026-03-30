import { createFileRoute } from "@tanstack/react-router";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

/**
 * Strip `__Secure-` prefix from Set-Cookie values in dev so browsers
 * on `.local` domains with mkcert will persist and resend them.
 */
function rewriteSetCookieForDev(raw: string): string {
	if (!import.meta.env.DEV) return raw;
	return raw
		.replaceAll("__Secure-", "")
		.replace(/;\s*Secure/gi, "");
}

async function devSignInHandler(request: Request): Promise<Response> {
	if (!import.meta.env.DEV) {
		return Response.json({ error: "Not available in production" }, { status: 403 });
	}

	try {
		const body = await request.text();

		const res = await fetch(`${CONVEX_SITE_URL}/dev/sign-in`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Origin: request.headers.get("origin") ?? "",
			},
			body,
		});

		const data = await res.text();

		const headers = new Headers({ "Content-Type": "application/json" });

		// Forward Set-Cookie headers individually via getSetCookie()
		// to avoid the comma-concatenation bug from Headers.forEach/get
		const setCookies = (res.headers as any).getSetCookie?.() as string[] | undefined;
		if (setCookies && setCookies.length > 0) {
			for (const cookie of setCookies) {
				headers.append("set-cookie", rewriteSetCookieForDev(cookie));
			}
		} else {
			// Fallback for runtimes without getSetCookie
			const raw = res.headers.get("set-cookie");
			if (raw) headers.set("set-cookie", rewriteSetCookieForDev(raw));
		}

		return new Response(data, { status: res.status, headers });
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

