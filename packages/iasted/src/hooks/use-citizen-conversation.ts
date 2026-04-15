/**
 * useCitizenConversation — wrapper générique pour résoudre la conversation
 * active d'un citoyen + la liste de ses agents assignés.
 *
 * ⚠ Ce hook est **data-source-agnostic** : il attend des fetchers injectés
 * par le consumer (citizen-web) pour ne pas coupler packages/iasted à un
 * schema Convex spécifique. Phase 2 l'utilise comme glue entre les tabs
 * existants et les nouveaux composants partagés (AgentRoster, etc.).
 *
 * Modèle multi-agents :
 * - Le schema Convex actuel est P2P (1 conversation ↔ 1 otherUser).
 * - Le hook retourne `assignedAgentIds: string[]` avec 1 élément pour préserver
 *   l'API future quand Sprint 7+ ajoutera `assignedAgentIds[]` côté backend.
 * - Le consumer peut fournir une liste complète directement.
 */

"use client";

import { useMemo } from "react";

export interface CitizenConversationInput {
	/** ID de la conversation active (chat), ou undefined si pas encore créée. */
	conversationId?: string;
	/** ID de l'interlocuteur principal (agent). */
	primaryAgentId?: string;
	/**
	 * Liste optionnelle d'agents assignés (futur multi-agent).
	 * Si fournie, elle écrase `primaryAgentId`.
	 */
	assignedAgentIds?: string[];
	/** ID de l'organisation liée (ex : consulat, ambassade). */
	orgId?: string;
	/** Métadonnées optionnelles (ex : label "Mr Ray — Standard"). */
	label?: string;
}

export interface CitizenConversationState {
	conversationId: string | undefined;
	assignedAgentIds: string[];
	orgId: string | undefined;
	label: string | undefined;
	hasAssignedAgent: boolean;
	isMultiAgent: boolean;
}

/**
 * Normalise l'input en un state stable pour les composants consumers.
 * Usage :
 *
 *   const conversation = useCitizenConversation({
 *     conversationId: chat?._id,
 *     primaryAgentId: chat?.otherUserId,
 *     orgId: chat?.orgId,
 *     label: "Mr Ray — Standard",
 *   });
 */
export function useCitizenConversation(
	input: CitizenConversationInput,
): CitizenConversationState {
	return useMemo<CitizenConversationState>(() => {
		const assignedAgentIds = input.assignedAgentIds
			? input.assignedAgentIds.filter((id): id is string => Boolean(id))
			: input.primaryAgentId
				? [input.primaryAgentId]
				: [];

		return {
			conversationId: input.conversationId,
			assignedAgentIds,
			orgId: input.orgId,
			label: input.label,
			hasAssignedAgent: assignedAgentIds.length > 0,
			isMultiAgent: assignedAgentIds.length > 1,
		};
	}, [
		input.conversationId,
		input.primaryAgentId,
		input.orgId,
		input.label,
		input.assignedAgentIds,
	]);
}
