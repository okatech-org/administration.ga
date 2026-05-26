import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useState, useMemo } from "react"

export function useRegistry(orgId: Id<"orgs"> | null) {
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const stats = useQuery(
    api.functions.consularRegistrations.getStatsByOrg,
    orgId ? { orgId } : "skip"
  )

  const readyForPrint = useQuery(
    api.functions.consularRegistrations.getReadyForPrint,
    orgId
      ? { orgId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  )

  // paginatedListByOrg uses custom aggregate pagination with cursor/pageSize
  const paginatedResult = useQuery(
    api.functions.consularRegistrations.paginatedListByOrg,
    orgId
      ? {
          orgId,
          pageSize: 100,
          cursor,
        }
      : "skip"
  )

  const registrations = useMemo(() => {
    return paginatedResult?.page ?? []
  }, [paginatedResult])

  return {
    stats: stats ?? null,
    readyForPrint: readyForPrint ?? [],
    registrations,
    isLoading: stats === undefined,
    hasMore: !!paginatedResult?.nextCursor,
    loadMore: () => {
      if (paginatedResult?.nextCursor) {
        setCursor(paginatedResult.nextCursor)
      }
    },
  }
}
