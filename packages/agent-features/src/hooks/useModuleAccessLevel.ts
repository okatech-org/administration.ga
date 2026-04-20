import { useMemo } from "react"
import type { Id } from "@convex/_generated/dataModel"
import { MODULE_ACCESS_TASKS } from "@convex/lib/moduleCodes"
import type { ModuleAccessLevel } from "@convex/lib/moduleCodes"
import { useCanDoTask } from "./useCanDoTask"

export function useModuleAccessLevel(orgId: Id<"orgs"> | undefined) {
	const { canDo, isReady, isPending } = useCanDoTask(orgId)

	const getAccessLevel = useMemo(
		() =>
			(moduleCode: string): ModuleAccessLevel | null => {
				if (!isReady) return null

				const mapping = MODULE_ACCESS_TASKS[moduleCode]
				if (!mapping) return null

				const levels: ModuleAccessLevel[] = ["admin", "editor", "reader"]
				for (const level of levels) {
					const requiredTasks = mapping[level]
					if (!requiredTasks || requiredTasks.length === 0) continue

					const hasAll = requiredTasks.every((task) => canDo(task))
					if (hasAll) return level
				}

				return null
			},
		[isReady, canDo],
	)

	const isReadOnly = useMemo(
		() =>
			(moduleCode: string): boolean => {
				const level = getAccessLevel(moduleCode)
				return level === "reader"
			},
		[getAccessLevel],
	)

	const hasMinLevel = useMemo(
		() =>
			(moduleCode: string, minLevel: ModuleAccessLevel): boolean => {
				const level = getAccessLevel(moduleCode)
				if (!level) return false
				const levelValues: Record<ModuleAccessLevel, number> = {
					reader: 1,
					editor: 2,
					admin: 3,
				}
				return levelValues[level] >= levelValues[minLevel]
			},
		[getAccessLevel],
	)

	return {
		getAccessLevel,
		isReadOnly,
		hasMinLevel,
		canDo,
		isReady,
		isPending,
	}
}
