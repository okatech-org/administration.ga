import { useConvexAuth, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

/**
 * Simple hook to get the current user's first organization.
 * In the desktop context, agents typically belong to one org (their consulate).
 */
export function useOrg() {
  const { isAuthenticated } = useConvexAuth()

  const memberships = useQuery(
    api.functions.memberships.listMyMemberships,
    isAuthenticated ? {} : "skip"
  )

  const firstMembership = memberships?.[0]
  const orgId: Id<"orgs"> | null = firstMembership?.orgId ?? null

  return {
    orgId,
    membership: firstMembership ?? null,
    isLoading: isAuthenticated && memberships === undefined,
  }
}
