import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";

if (
	typeof window !== "undefined" &&
	import.meta.env.VITE_POSTHOG_KEY &&
	!posthog.__loaded // Prevent multiple initializations in dev
) {
	posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
		api_host: import.meta.env.VITE_POSTHOG_HOST,
		person_profiles: "identified_only",
		capture_pageview: false,
	});
	posthog.register({ platform: "citizen" });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// If no key is present, just render children without the provider to avoid errors
	if (!import.meta.env.VITE_POSTHOG_KEY) {
		return <>{children}</>;
	}

	return <Provider client={posthog}>{children}</Provider>;
}
