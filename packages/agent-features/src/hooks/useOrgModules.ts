/**
 * useOrgModules — Verifie si un module est actif pour l'org courante
 * et expose les capabilities (sous-modules) activees.
 *
 * Backward compat : si orgModuleConfig est absent, utilise modules[].
 * Si modules[] est aussi vide, tout est considere actif.
 */

import { useCallback } from "react"
import { useOrg } from "../shell/org-provider"

export function useOrgModules() {
	const { activeOrgModules, activeOrgModuleConfig } = useOrg()

	const isModuleEnabled = useCallback(
		(moduleCode: string): boolean => {
			if (activeOrgModuleConfig && activeOrgModuleConfig.length > 0) {
				return activeOrgModuleConfig.some(
					(m) => m.moduleCode === moduleCode && m.enabled,
				)
			}
			if (activeOrgModules && activeOrgModules.length > 0) {
				return activeOrgModules.includes(moduleCode)
			}
			return true
		},
		[activeOrgModules, activeOrgModuleConfig],
	)

	const getCapabilities = useCallback(
		(moduleCode: string): string[] => {
			if (!activeOrgModuleConfig || activeOrgModuleConfig.length === 0) {
				return []
			}
			const config = activeOrgModuleConfig.find(
				(m) => m.moduleCode === moduleCode,
			)
			return config?.capabilities ?? []
		},
		[activeOrgModuleConfig],
	)

	const hasCapability = useCallback(
		(moduleCode: string, capability: string): boolean => {
			if (!activeOrgModuleConfig || activeOrgModuleConfig.length === 0) {
				return true
			}
			const config = activeOrgModuleConfig.find(
				(m) => m.moduleCode === moduleCode,
			)
			if (!config?.capabilities || config.capabilities.length === 0) {
				return true
			}
			return config.capabilities.includes(capability)
		},
		[activeOrgModuleConfig],
	)

	return {
		isModuleEnabled,
		getCapabilities,
		hasCapability,
		orgModules: activeOrgModules,
		orgModuleConfig: activeOrgModuleConfig,
	}
}
