import { useMemo } from "react";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Hook to check if the current user can perform a specific task in an org.
 *
 * Uses the position-based RBAC system:
 *   membership.positionId → position.tasks (stored in DB)
 *
 * @example
 * ```tsx
 * const { canDo, isReady } = useCanDoTask(orgId);
 * if (canDo("requests.validate")) { ... }
 * ```
 */
export function useCanDoTask(orgId: Id<"orgs"> | undefined) {
	const { data: taskCodes, isPending } = useAuthenticatedConvexQuery(
		api.functions.permissions.getMyTasks,
		orgId ? { orgId } : "skip",
	);

	const taskSet = useMemo(() => new Set(taskCodes ?? []), [taskCodes]);

	/**
	 * Check if the user can perform a specific task.
	 * Returns false while loading or if access is denied.
	 */
	const canDo = useMemo(
		() =>
			(taskCode: string): boolean => {
				if (!taskCodes) return false;
				return taskSet.has(taskCode);
			},
		[taskCodes, taskSet],
	);

	/**
	 * Check multiple tasks at once — returns true if user has ALL.
	 */
	const canDoAll = useMemo(
		() =>
			(...taskCodesArray: string[]): boolean => {
				if (!taskCodes) return false;
				return taskCodesArray.every((code) => taskSet.has(code));
			},
		[taskCodes, taskSet],
	);

	/**
	 * Check multiple tasks — returns true if user has ANY.
	 */
	const canDoAny = useMemo(
		() =>
			(...taskCodesArray: string[]): boolean => {
				if (!taskCodes) return false;
				return taskCodesArray.some((code) => taskSet.has(code));
			},
		[taskCodes, taskSet],
	);

	return {
		/** Check a single task */
		canDo,
		/** Check if user has ALL specified tasks */
		canDoAll,
		/** Check if user has ANY of the specified tasks */
		canDoAny,
		/** Whether the task data has loaded */
		isReady: !isPending && taskCodes !== undefined,
		/** Whether data is still loading */
		isPending,
		/** Raw list of all resolved task codes */
		taskCodes: taskCodes ?? [],
	};
}
