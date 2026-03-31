/**
 * useOrgModules — Verifie si un module est actif pour l'org courante
 * et expose les capabilities (sous-modules) activees.
 *
 * Backward compat : si orgModuleConfig est absent, utilise modules[].
 * Si modules[] est aussi vide, tout est considere actif.
 */

import { useMemo, useCallback } from "react";
import { useOrg } from "@/components/org/org-provider";

export function useOrgModules() {
	const { activeOrgModules, activeOrgModuleConfig } = useOrg();

	const isModuleEnabled = useCallback(
		(moduleCode: string): boolean => {
			// V4 : Lire orgModuleConfig en priorite
			if (activeOrgModuleConfig && activeOrgModuleConfig.length > 0) {
				return activeOrgModuleConfig.some(
					(m) => m.moduleCode === moduleCode && m.enabled,
				);
			}
			// Fallback : ancien champ modules[]
			if (activeOrgModules && activeOrgModules.length > 0) {
				return activeOrgModules.includes(moduleCode);
			}
			// Si rien configure, tout est actif (backward compat)
			return true;
		},
		[activeOrgModules, activeOrgModuleConfig],
	);

	const getCapabilities = useCallback(
		(moduleCode: string): string[] => {
			if (!activeOrgModuleConfig || activeOrgModuleConfig.length === 0) {
				// Pas de config v4 → toutes capabilities actives par defaut
				return [];
			}
			const config = activeOrgModuleConfig.find(
				(m) => m.moduleCode === moduleCode,
			);
			return config?.capabilities ?? [];
		},
		[activeOrgModuleConfig],
	);

	const hasCapability = useCallback(
		(moduleCode: string, capability: string): boolean => {
			if (!activeOrgModuleConfig || activeOrgModuleConfig.length === 0) {
				// Pas de config v4 → toutes capabilities actives par defaut
				return true;
			}
			const config = activeOrgModuleConfig.find(
				(m) => m.moduleCode === moduleCode,
			);
			if (!config?.capabilities || config.capabilities.length === 0) {
				// Module configure sans capabilities specifiees → toutes actives
				return true;
			}
			return config.capabilities.includes(capability);
		},
		[activeOrgModuleConfig],
	);

	return {
		isModuleEnabled,
		getCapabilities,
		hasCapability,
		orgModules: activeOrgModules,
		orgModuleConfig: activeOrgModuleConfig,
	};
}
