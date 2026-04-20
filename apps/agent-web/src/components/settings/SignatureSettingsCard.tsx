// Re-export the shared implementation so the standalone `/settings/signature`
// route (and any other callsite that still imports via `@/components/...`)
// reaches the same component as the migrated /settings page.
export { SignatureSettingsCard } from "@workspace/agent-features/features/settings"
