import {
	defineEventHandler,
	getHeaders,
	getMethod,
	readRawBody,
	setResponseStatus,
	setResponseHeader,
	appendResponseHeader,
} from "h3";

/**
 * Proxy /api/auth/* → Convex CONVEX_SITE_URL/api/auth/*
 *
 * En dev, le plugin Vite `devApiProxy` dans vite.config.ts gere ce proxy.
 * En production (Nitro/Cloud Run), ce handler Nitro prend le relais.
 *
 * Le crossDomain plugin de Better Auth attend que les cookies
 * transitent par le meme domaine que le frontend (diplomate.ga).
 */
export default defineEventHandler(async (event) => {
	const CONVEX_SITE_URL =
		process.env.CONVEX_SITE_URL ||
		process.env.VITE_CONVEX_SITE_URL;

	if (!CONVEX_SITE_URL) {
		console.error("[auth-proxy] CONVEX_SITE_URL not configured");
		setResponseStatus(event, 503);
		return { error: "CONVEX_SITE_URL not configured" };
	}

	const method = getMethod(event);
	const path = event.path ?? "";

	// Construire les headers a forwarder (exclure les headers de transport)
	const incomingHeaders = getHeaders(event);
	const forwardHeaders: Record<string, string> = {};
	const skipHeaders = new Set([
		"transfer-encoding",
		"connection",
		"keep-alive",
		"upgrade",
		"host",
		"content-length",
	]);

	for (const [key, value] of Object.entries(incomingHeaders)) {
		if (value && !skipHeaders.has(key.toLowerCase())) {
			forwardHeaders[key] = value;
		}
	}
	forwardHeaders["host"] = new URL(CONVEX_SITE_URL).host;

	// Lire le body brut pour POST/PUT/PATCH
	let body: string | undefined;
	if (method !== "GET" && method !== "HEAD") {
		try {
			body = (await readRawBody(event)) ?? undefined;
		} catch {
			// Pas de body
		}
	}

	try {
		// Forward vers Convex
		const upstreamUrl = `${CONVEX_SITE_URL}${path}`;
		const upstream = await fetch(upstreamUrl, {
			method,
			headers: forwardHeaders,
			redirect: "manual",
			body: body || undefined,
		});

		// Propager le status
		setResponseStatus(event, upstream.status);

		// Propager les headers de reponse (sauf transport)
		upstream.headers.forEach((value, key) => {
			const lower = key.toLowerCase();
			if (lower === "transfer-encoding" || lower === "connection" || lower === "set-cookie") return;
			setResponseHeader(event, key, value);
		});

		// Propager les cookies Set-Cookie individuellement
		const setCookies = (upstream.headers as any).getSetCookie?.() as string[] | undefined;
		if (setCookies) {
			for (const cookie of setCookies) {
				appendResponseHeader(event, "Set-Cookie", cookie);
			}
		}

		// Retourner le body brut
		const responseText = await upstream.text();
		setResponseHeader(event, "content-length", String(Buffer.byteLength(responseText)));
		return responseText;
	} catch (error) {
		console.error("[auth-proxy] error:", error);
		setResponseStatus(event, 502);
		return { error: "Auth proxy error" };
	}
});
