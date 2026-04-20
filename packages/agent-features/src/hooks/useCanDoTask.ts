import { useMemo } from "react"
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

/**
 * Hook to check if the current user can perform a specific task in an org.
 *
 * Uses the position-based RBAC system:
 *   membership.positionId → position.tasks (stored in DB)
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

	const canDoAll = useMemo(
		() =>
			(...taskCodesArray: string[]): boolean => {
				if (!taskCodes) return false
				return taskCodesArray.every((code) => taskSet.has(code))
			},
		[taskCodes, taskSet],
	)

	const canDoAny = useMemo(
		() =>
			(...taskCodesArray: string[]): boolean => {
				if (!taskCodes) return false
				return taskCodesArray.some((code) => taskSet.has(code))
			},
		[taskCodes, taskSet],
	)

	return {
		canDo,
		canDoAll,
		canDoAny,
		isReady: !isPending && taskCodes !== undefined,
		isPending,
		taskCodes: taskCodes ?? [],
	}
}
