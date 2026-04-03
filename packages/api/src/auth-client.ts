import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import {
	emailOTPClient,
	genericOAuthClient,
	phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Use the browser origin so API calls always match the current protocol (HTTP/HTTPS)
const SITE_URL =
	typeof window !== "undefined"
		? window.location.origin
		: (import.meta as any).env.VITE_SITE_URL;

export const authClient = createAuthClient({
	baseURL: SITE_URL || undefined,
	fetchOptions: {
		get headers() {
			if (typeof window === "undefined") return undefined;
			return { "X-App-Language": localStorage.getItem("i18nextLng") ?? "fr" };
		},
	},
	plugins: [
		convexClient(),
		crossDomainClient(),
		genericOAuthClient(),
		emailOTPClient(),
		phoneNumberClient(),
	],
});
