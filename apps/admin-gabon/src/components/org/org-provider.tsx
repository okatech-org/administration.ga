// Re-export from the shared package so every consumer (old imports via
// `@/components/org/org-provider` and new imports via
// `@workspace/agent-features/shell`) references the same OrgContext instance.
export { OrgProvider, useOrg } from "@workspace/agent-features/shell"
