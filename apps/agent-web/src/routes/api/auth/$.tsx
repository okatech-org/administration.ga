import { createFileRoute } from "@tanstack/react-router";
import { handler } from "@/lib/auth-server";

// HTTP/1-only headers that crash the HTTP/2 dev server (HTTPS enables H2)
const FORBIDDEN_H2_HEADERS = [
	"transfer-encoding",
	"connection",
	"keep-alive",
	"upgrade",
];

/**
 * In dev, Convex (always HTTPS) sends cookies with the `__Secure-` prefix
 * and the `Secure` flag. Browsers may refuse these on `.local` domains
 * even with mkcert. Strip the prefix and the Secure flag so the browser
 * accepts and resends them reliably.
 */
function rewriteSetCookieForDev(raw: string): string {
	if (!import.meta.env.DEV) return raw;
	return raw
		.replaceAll("__Secure-", "")
		.replace(/;\s*Secure/gi, "");
}

/**
 * In dev, incoming browser cookies lack the `__Secure-` prefix (we stripped it
 * on the way out). But Convex/BetterAuth expects `__Secure-` names.
 * Re-add the prefix so the upstream handler can find the session cookies.
 */
function rewriteRequestCookiesForDev(request: Request): Request {
	if (!import.meta.env.DEV) return request;
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return request;

	const rewritten = cookieHeader.replace(
		/\bbetter-auth\.(session_token|convex_jwt)\b/g,
		"__Secure-better-auth.$1",
	);
	if (rewritten === cookieHeader) return request;

	const headers = new Headers(request.headers);
	headers.set("cookie", rewritten);
	return new Request(request.url, {
		method: request.method,
		headers,
		body: request.body,
		// @ts-expect-error duplex needed for streaming bodies
		duplex: "half",
	});
}

async function safeHandler(request: Request): Promise<Response> {
	try {
		const proxiedRequest = rewriteRequestCookiesForDev(request);
		const response = await handler(proxiedRequest);

		// Buffer the body — streaming responses break under Vite's HTTP/2 server
		const body = await response.arrayBuffer();

		// Clone headers, properly handling multi-value Set-Cookie
		const headers = new Headers();

		// Set-Cookie MUST be forwarded individually — Headers.entries()
		// combines them into one comma-separated string which browsers reject.
		const setCookies = (response.headers as any).getSetCookie?.() as string[] | undefined;
		if (setCookies && setCookies.length > 0) {
			for (const cookie of setCookies) {
				headers.append("set-cookie", rewriteSetCookieForDev(cookie));
			}
		}

		for (const [key, value] of response.headers.entries()) {
			const lk = key.toLowerCase();
			if (lk === "set-cookie") continue; // already handled above
			if (!FORBIDDEN_H2_HEADERS.includes(lk)) {
				headers.append(key, value);
			}
		}

		return new Response(body, {
			status: response.status,
			headers,
		});
	} catch (error) {
		console.error("[auth] handler error:", error);
		return Response.json(
			{ error: "Internal auth error" },
			{ status: 502 },
		);
	}
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) => safeHandler(request),
			POST: ({ request }: { request: Request }) => safeHandler(request),
		},
	},
});

