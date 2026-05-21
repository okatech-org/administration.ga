import { scrubPII } from "@workspace/posthog-shared/scrub-pii";
import { PostHog } from "posthog-node";

const APP_NAME = "citizen-web";

let posthogClient: PostHog | null = null;

function getPostHog(): PostHog | null {
	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
	if (!posthogClient) {
		posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
			host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
			flushAt: 1,
			flushInterval: 0,
			before_send: scrubPII,
		});
	}
	return posthogClient;
}

export function register() {
	getPostHog();
}

export const onRequestError = async (
	err: unknown,
	request: {
		path: string;
		method: string;
		headers: { [key: string]: string | undefined };
	},
	context: {
		routerKind: "Pages Router" | "App Router";
		routePath: string;
		routeType: "render" | "route" | "action" | "middleware";
	},
) => {
	const ph = getPostHog();
	if (!ph) return;
	try {
		const distinctId =
			request.headers["x-posthog-distinct-id"] ?? "anonymous-server";
		ph.captureException(err as Error, distinctId, {
			app: APP_NAME,
			runtime: process.env.NEXT_RUNTIME,
			route: context.routePath,
			route_kind: context.routerKind,
			route_type: context.routeType,
			method: request.method,
			path: request.path,
		});
		await ph.flush();
	} catch {
		// swallow — never let the error reporter break the request
	}
};
