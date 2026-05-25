// Re-export from the shared package so captureEvent is identical on web and desktop.
export { captureEvent } from "@workspace/agent-features/lib/analytics"
export type { AnalyticsEvents, EventProperties } from "@workspace/agent-features/lib/analytics"
