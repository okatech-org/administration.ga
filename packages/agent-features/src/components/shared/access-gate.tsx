"use client"

import type { ReactNode } from "react"
import type { ModuleAccessLevel } from "@convex/lib/moduleCodes"
import { useModuleAccessLevel } from "../../hooks/useModuleAccessLevel"
import { useOrg } from "../../shell/org-provider"

interface AccessGateProps {
	module: string
	minLevel: ModuleAccessLevel
	children: ReactNode
	fallback?: ReactNode
}

export function AccessGate({
	module,
	minLevel,
	children,
	fallback = null,
}: AccessGateProps) {
	const { activeOrgId } = useOrg()
	const { hasMinLevel, isReady } = useModuleAccessLevel(activeOrgId ?? undefined)

	if (!isReady) return null
	if (!hasMinLevel(module, minLevel)) return <>{fallback}</>
	return <>{children}</>
}

export function useModuleAccess(moduleCode: string) {
	const { activeOrgId } = useOrg()
	const { getAccessLevel, isReadOnly, hasMinLevel, canDo, isReady } =
		useModuleAccessLevel(activeOrgId ?? undefined)

	return {
		level: isReady ? getAccessLevel(moduleCode) : null,
		readOnly: isReady ? isReadOnly(moduleCode) : true,
		hasMin: (minLevel: ModuleAccessLevel) =>
			isReady && hasMinLevel(moduleCode, minLevel),
		canDo,
		isReady,
	}
}
