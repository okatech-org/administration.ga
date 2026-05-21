"use client";

import { scrubPII } from "@workspace/posthog-shared/scrub-pii";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { PostHogIdentifier } from "./identifier";
import { PostHogPageviewTracker } from "./pageview-tracker";

if (
	typeof window !== "undefined" &&
	process.env.NEXT_PUBLIC_POSTHOG_KEY &&
	!posthog.__loaded // Prevent multiple initializations in dev
) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		person_profiles: "identified_only",
		capture_pageview: false,
		capture_exceptions: true,
		disable_session_recording: false,
		session_recording: {
			maskAllInputs: true,
			maskTextSelector: "[data-sensitive], [data-pii]",
			maskInputOptions: {
				password: true,
				email: true,
				tel: true,
				number: true,
			},
		},
		before_send: scrubPII,
	});
	posthog.register({ platform: "citizen" });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// If no key is present, just render children without the provider to avoid errors
	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
		return <>{children}</>;
	}

	return (
		<Provider client={posthog}>
			<PostHogIdentifier />
			<PostHogPageviewTracker />
			{children}
		</Provider>
	);
}
