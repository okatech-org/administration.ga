import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";

if (
	typeof window !== "undefined" &&
	process.env.NEXT_PUBLIC_POSTHOG_KEY &&
	!posthog.__loaded // Prevent multiple initializations in dev
) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		person_profiles: "identified_only",
		capture_pageview: false,
	});
	posthog.register({ platform: "users" });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// If no key is present, just render children without the provider to avoid errors
	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
		return <>{children}</>;
	}

	return <Provider client={posthog}>{children}</Provider>;
}
