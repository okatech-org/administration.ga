"use client";

import { api } from "@convex/_generated/api";
import { useConvexAuth } from "convex/react";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export function PostHogIdentifier() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { data: user } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		isAuthenticated ? {} : "skip",
	);
	const identifiedRef = useRef<string | null>(null);

	useEffect(() => {
		if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			return;
		}

		if (!isAuthenticated && !isLoading) {
			if (identifiedRef.current) {
				posthog.reset();
				identifiedRef.current = null;
			}
			return;
		}

		if (user?._id && identifiedRef.current !== user._id) {
			posthog.identify(user._id, {
				email: user.email ?? undefined,
				name: user.name ?? undefined,
				firstName: user.firstName ?? undefined,
				lastName: user.lastName ?? undefined,
			});
			identifiedRef.current = user._id;
		}
	}, [isAuthenticated, isLoading, user]);

	return null;
}
