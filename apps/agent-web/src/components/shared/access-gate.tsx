/**
 * AccessGate — Composant declaratif pour conditionner l'affichage
 * par niveau d'acces module (reader/editor/admin).
 *
 * @example
 * ```tsx
 * <AccessGate module="documents" minLevel="editor">
 *   <Button>Upload</Button>
 * </AccessGate>
 * ```
 */

import type { ReactNode } from "react";
import type { ModuleAccessLevel } from "@convex/lib/moduleCodes";
import { useModuleAccessLevel } from "@/hooks/useModuleAccessLevel";
import { useOrg } from "@/components/org/org-provider";

interface AccessGateProps {
	/** Module code (ex: "documents", "requests") */
	module: string;
	/** Niveau minimum requis */
	minLevel: ModuleAccessLevel;
	children: ReactNode;
	/** Contenu affiché si acces insuffisant (defaut: rien) */
	fallback?: ReactNode;
}

export function AccessGate({ module, minLevel, children, fallback = null }: AccessGateProps) {
	const { activeOrgId } = useOrg();
	const { hasMinLevel, isReady } = useModuleAccessLevel(activeOrgId ?? undefined);

	if (!isReady) return null;
	if (!hasMinLevel(module, minLevel)) return <>{fallback}</>;
	return <>{children}</>;
}

/**
 * Hook utilitaire pour obtenir directement les fonctions d'acces
 * pour un module specifique dans un composant.
 */
export function useModuleAccess(moduleCode: string) {
	const { activeOrgId } = useOrg();
	const { getAccessLevel, isReadOnly, hasMinLevel, canDo, isReady } =
		useModuleAccessLevel(activeOrgId ?? undefined);

	return {
		/** Niveau effectif pour ce module */
		level: isReady ? getAccessLevel(moduleCode) : null,
		/** true si le module est en lecture seule */
		readOnly: isReady ? isReadOnly(moduleCode) : true,
		/** true si le niveau est >= minLevel */
		hasMin: (minLevel: ModuleAccessLevel) => isReady && hasMinLevel(moduleCode, minLevel),
		/** Peut effectuer un task code specifique */
		canDo,
		isReady,
	};
}
