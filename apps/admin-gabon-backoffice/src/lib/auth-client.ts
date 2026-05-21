"use client"

import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins"
import {
  emailOTPClient,
  genericOAuthClient,
  phoneNumberClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : undefined

export const authClient = createAuthClient({
  baseURL: SITE_URL || undefined,
  fetchOptions: {
    get headers() {
      if (typeof window === "undefined") return undefined
      return { "X-App-Language": localStorage.getItem("i18nextLng") ?? "fr" }
    },
  },
  plugins: [
    convexClient(),
    crossDomainClient(),
    genericOAuthClient(),
    emailOTPClient(),
    phoneNumberClient(),
  ],
})
