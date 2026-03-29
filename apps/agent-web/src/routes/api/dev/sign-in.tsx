import { createFileRoute } from "@tanstack/react-router";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

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
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === "set-cookie") {
				headers.append("set-cookie", value);
			}
		});

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
