import { api } from "@convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { useConvexQuery } from "@/integrations/convex/hooks";

const CACHE_KEY = "user_country_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CountryCache {
	country: string;
	timestamp: number;
}

/**
 * Hook to get the user's country of residence.
 *
 * Priority:
 * 1. Authenticated user → profile.countryOfResidence
 * 2. Unauthenticated user → IP geolocation (cached 24h)
 *
 * @returns { country: CountryCode | null, isLoading: boolean }
 */
export function useUserCountry() {
	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

	// Query for user profile (only when authenticated)
	const { data: profileData } = useConvexQuery(
		api.functions.profiles.getMyProfileSafe,
		{},
	);

	const [ipCountry, setIpCountry] = useState<string | null>(null);
	const [ipLoading, setIpLoading] = useState(false);

	// IP Geolocation for unauthenticated users
	useEffect(() => {
		// Only fetch IP geolocation if not authenticated
		if (authLoading || isAuthenticated) return;

		// Check cache first
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) {
			try {
				const parsed: CountryCache = JSON.parse(cached);
				if (Date.now() - parsed.timestamp < CACHE_DURATION) {
					setIpCountry(parsed.country);
					return;
				}
			} catch {
				localStorage.removeItem(CACHE_KEY);
			}
		}

		// Fetch IP geolocation
		setIpLoading(true);
		fetch("https://ipapi.co/json/")
			.then((res) => res.json())
			.then((data) => {
				if (data.country_code) {
					const country = data.country_code as string;
					setIpCountry(country);
					// Cache the result
					localStorage.setItem(
						CACHE_KEY,
						JSON.stringify({ country, timestamp: Date.now() }),
					);
				}
			})
			.catch(() => {
				// Silently fail - country will be null
				console.warn("Failed to fetch IP geolocation");
			})
			.finally(() => {
				setIpLoading(false);
			});
	}, [isAuthenticated, authLoading]);

	// Determine which country to use
	if (authLoading) {
		return { country: null, isLoading: true };
	}

	if (isAuthenticated && profileData?.status === "ready") {
		// Use profile country of residence
		return {
			country: profileData.profile?.countryOfResidence ?? null,
			isLoading: false,
		};
	}

	if (isAuthenticated && profileData === undefined) {
		// Still loading profile
		return { country: null, isLoading: true };
	}

	// Use IP geolocation
	return {
		country: ipCountry,
		isLoading: ipLoading,
	};
}
