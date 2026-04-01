import { useMemo } from "react"
import { useAuthenticatedConvexQuery } from "./useConvexHooks"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

/**
 * Hook to check if the current user can perform a specific task in an org.
 * Uses the position-based RBAC system.
 */
export function useCanDoTask(orgId: Id<"orgs"> | undefined) {
  const { data: taskCodes, isPending } = useAuthenticatedConvexQuery(
    api.functions.permissions.getMyTasks,
    orgId ? { orgId } : "skip",
  )

  const taskSet = useMemo(() => new Set(taskCodes ?? []), [taskCodes])

  const canDo = useMemo(
    () =>
      (taskCode: string): boolean => {
        if (!taskCodes) return false
        return taskSet.has(taskCode)
      },
    [taskCodes, taskSet],
  )

  return {
    canDo,
    isReady: !isPending && taskCodes !== undefined,
    isPending,
    taskCodes: taskCodes ?? [],
  }
}
