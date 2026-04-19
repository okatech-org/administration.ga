"use client"

import posthog from "posthog-js"
import { PostHogProvider as Provider } from "posthog-js/react"
import { PostHogIdentifier } from "./identifier"
import { PostHogPageviewTracker } from "./pageview-tracker"

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  !posthog.__loaded
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
  })
  posthog.register({ platform: "agent" })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <Provider client={posthog}>
      <PostHogIdentifier />
      <PostHogPageviewTracker />
      {children}
    </Provider>
  )
}
