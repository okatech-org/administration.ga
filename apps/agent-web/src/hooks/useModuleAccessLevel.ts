/**
 * useModuleAccessLevel — Détecte le niveau d'accès effectif par module.
 *
 * Utilise les task codes résolus depuis useCanDoTask pour déterminer
 * si l'utilisateur a un accès reader, editor ou admin sur chaque module.
 *
 * @example
 * ```tsx
 * const { getAccessLevel, isReadOnly } = useModuleAccessLevel(orgId);
 * if (isReadOnly("requests")) { // Masquer les boutons d'action }
 * ```
 */

import { useMemo } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { MODULE_ACCESS_TASKS } from "@convex/lib/moduleCodes";
import type { ModuleAccessLevel } from "@convex/lib/moduleCodes";
import { useCanDoTask } from "./useCanDoTask";

export function useModuleAccessLevel(orgId: Id<"orgs"> | undefined) {
	const { canDo, isReady, isPending } = useCanDoTask(orgId);

	/**
	 * Détermine le niveau d'accès effectif pour un module.
	 * Teste chaque niveau de MODULE_ACCESS_TASKS[module] du plus élevé au plus bas.
	 * Retourne le niveau le plus élevé dont TOUS les tasks sont présents.
	 */
	const getAccessLevel = useMemo(
		() =>
			(moduleCode: string): ModuleAccessLevel | null => {
				if (!isReady) return null;

				const mapping = MODULE_ACCESS_TASKS[moduleCode];
				if (!mapping) return null;

				// Tester du plus élevé au plus bas
				const levels: ModuleAccessLevel[] = ["admin", "editor", "reader"];
				for (const level of levels) {
					const requiredTasks = mapping[level];
					if (!requiredTasks || requiredTasks.length === 0) continue;

					const hasAll = requiredTasks.every((task) => canDo(task));
					if (hasAll) return level;
				}

				return null;
			},
		[isReady, canDo],
	);

	/**
	 * Vérifie si l'utilisateur a un accès lecture seule sur un module.
	 */
	const isReadOnly = useMemo(
		() =>
			(moduleCode: string): boolean => {
				const level = getAccessLevel(moduleCode);
				return level === "reader";
			},
		[getAccessLevel],
	);

	/**
	 * Vérifie si l'utilisateur a au moins le niveau demandé.
	 */
	const hasMinLevel = useMemo(
		() =>
			(moduleCode: string, minLevel: ModuleAccessLevel): boolean => {
				const level = getAccessLevel(moduleCode);
				if (!level) return false;
				const levelValues: Record<ModuleAccessLevel, number> = { reader: 1, editor: 2, admin: 3 };
				return levelValues[level] >= levelValues[minLevel];
			},
		[getAccessLevel],
	);

	return {
		/** Niveau d'accès effectif pour un module (null = pas d'accès) */
		getAccessLevel,
		/** true si le module est en lecture seule */
		isReadOnly,
		/** true si l'utilisateur a au moins le niveau spécifié */
		hasMinLevel,
		/** Proxy vers canDo pour les vérifications atomiques */
		canDo,
		/** Données chargées ? */
		isReady,
		isPending,
	};
}
