import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

export function useDashboard(orgId: Id<"orgs"> | null) {
  const queueStats = useQuery(
    api.functions.printJobs.queueStats,
    orgId ? { orgId } : "skip"
  )

  const recentJobs = useQuery(
    api.functions.printJobs.listByOrg,
    orgId ? { orgId } : "skip"
  )

  const registrationStats = useQuery(
    api.functions.consularRegistrations.getStatsByOrg,
    orgId ? { orgId } : "skip"
  )

  return {
    queueStats: queueStats ?? { queued: 0, printing: 0, failed: 0, total: 0 },
    recentJobs: (recentJobs ?? []).slice(0, 5),
    registrationStats: registrationStats ?? null,
    isLoading: queueStats === undefined || recentJobs === undefined,
  }
}
