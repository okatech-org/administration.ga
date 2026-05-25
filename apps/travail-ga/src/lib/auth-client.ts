"use client";

/**
 * Better Auth client pour TRAVAIL.GA (citoyen ordinaire).
 *
 * Authentification email OTP uniquement : 6 chiffres envoyés par email,
 * pas de mot de passe a memoriser. Suffit pour suivre ses candidatures
 * et ses annonces publiees comme particulier.
 */
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : undefined;

export const authClient = createAuthClient({
  baseURL: SITE_URL || undefined,
  fetchOptions: {
    get headers() {
      if (typeof window === "undefined") return undefined;
      return { "X-App-Language": "fr" };
    },
  },
  plugins: [convexClient(), crossDomainClient(), emailOTPClient()],
});
