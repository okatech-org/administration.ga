"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

export function PostHogPageviewTracker() {
	const pathname = usePathname();

	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			process.env.NEXT_PUBLIC_POSTHOG_KEY
		) {
			posthog.capture("$pageview", {
				$current_url: window.location.href,
				$pathname: pathname,
			});
		}
	}, [pathname]);

	return null;
}
