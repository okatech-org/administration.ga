import { useLocation } from "@tanstack/react-router";
import posthog from "posthog-js";
import { useEffect } from "react";

export function PostHogPageviewTracker() {
	const location = useLocation();

	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			import.meta.env.VITE_POSTHOG_KEY
		) {
			posthog.capture("$pageview", {
				$current_url: window.location.href,
				$pathname: location.pathname,
			});
		}
	}, [location.pathname]);

	return null;
}
