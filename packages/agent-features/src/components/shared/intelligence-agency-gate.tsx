"use client"

import type { ReactNode } from "react"
import { useOrg } from "../../shell/org-provider"
import { AccessGate } from "./access-gate"

const INTELLIGENCE_AGENCY_TYPE = "intelligence_agency"

interface IntelligenceAgencyGateProps {
	children: ReactNode
	fallback?: ReactNode
}

/**
 * Garde les routes du module Renseignement souverain (/agence/*).
 *
 * Bloque l'accès si :
 *   - l'organisme actif n'est pas de type `intelligence_agency`, OU
 *   - l'utilisateur n'a pas le module `intelligence` au moins en lecture.
 *
 * Côté backend, `assertCallerIsIntelAgency` applique la même règle ; ce
 * composant n'est qu'une couche UX (évite d'afficher une page vide en cas
 * d'erreur Convex).
 */
export function IntelligenceAgencyGate({
	children,
	fallback,
}: IntelligenceAgencyGateProps) {
	const { activeOrg, isLoading } = useOrg()

	if (isLoading) return null

	const isIntelAgency =
		(activeOrg as { type?: string } | null)?.type === INTELLIGENCE_AGENCY_TYPE

	const blocked = (
		<div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
			<div className="text-xs uppercase tracking-widest text-rose-500/80">
				Restreint
			</div>
			<h1 className="text-xl font-semibold text-foreground">
				Accès souverain requis
			</h1>
			<p className="text-sm text-muted-foreground">
				Le module de renseignement est cloisonné. Seuls les agents d'un
				organisme habilité peuvent y accéder.
			</p>
		</div>
	)

	if (!isIntelAgency) return <>{fallback ?? blocked}</>

	return (
		<AccessGate module="intelligence" minLevel="reader" fallback={fallback ?? blocked}>
			{children}
		</AccessGate>
	)
}
