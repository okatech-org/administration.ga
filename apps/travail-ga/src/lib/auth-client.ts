"use client";

import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import {
  emailOTPClient,
  genericOAuthClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : undefined;

export const authClient = createAuthClient({
  baseURL: SITE_URL || undefined,
  plugins: [
    convexClient(),
    crossDomainClient(),
    genericOAuthClient(),
    emailOTPClient(),
    phoneNumberClient(),
  ],
});
