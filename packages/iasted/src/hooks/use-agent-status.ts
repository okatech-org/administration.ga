/**
 * useAgentStatus — dérivation et gestion du statut étendu (online/busy/away/offline/dnd).
 *
 * **Phase 3 approach (data-source-agnostic)** :
 * - Côté lecture : consomme un `AgentPresenceSnapshot` fourni par le consumer
 *   (ex : via `useQuery(api.functions.agentPresence.byUserAndOrg)` côté agent-web).
 * - Côté écriture DND : stocke le timestamp `dndUntil` localement (localStorage)
 *   tant que le schema Convex ne l'a pas. Quand Sprint 7+ ajoutera le champ,
 *   le consumer appellera simplement une mutation additionnelle.
 * - Le hook ne **crée pas** de mutation Convex : c'est la responsabilité du consumer
 *   (le package reste découplé du runtime Convex de l'app).
 *
 * Garanties :
 * - `AgentPresenceSnapshot.status` n'est JAMAIS mutée ici ; on dérive `dnd` uniquement.
 * - La clé localStorage `iasted.dnd.<userId>` contient un timestamp ISO ou rien.
 * - Respecte SSR (pas d'accès window côté serveur).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
	type AgentPresenceSnapshot,
	type AgentStatusExtended,
	deriveExtendedStatus,
} from "../types/agent-presence";

export interface UseAgentStatusOptions {
	/** ID utilisateur courant (pour namespacer le localStorage DND). */
	userId: string;
	/** Snapshot presence lu par le consumer (Convex query). */
	presence?: AgentPresenceSnapshot | null;
	/** Timestamp serveur (pour éviter dérive d'horloge). Défaut : Date.now(). */
	now?: number;
}

export interface UseAgentStatusResult {
	/** Statut étendu final (incl. dnd dérivé). */
	status: AgentStatusExtended;
	/** Timestamp UNIX d'expiration DND (si actif). */
	dndUntil: number | undefined;
	/** Active le mode DND jusqu'à un timestamp donné (ms UNIX). */
	setDndUntil: (expiresAt: number | null) => void;
	/** Clear immédiat du DND. */
	clearDnd: () => void;
	/** Dérive une durée restante en secondes (ou 0 si pas en DND). */
	dndRemainingSeconds: number;
}

const STORAGE_PREFIX = "iasted.dnd.";

function readDndFromStorage(userId: string): number | undefined {
	if (typeof window === "undefined") return undefined;
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
		if (!raw) return undefined;
		const parsed = Number.parseInt(raw, 10);
		return Number.isFinite(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function writeDndToStorage(userId: string, value: number | null): void {
	if (typeof window === "undefined") return;
	try {
		const key = `${STORAGE_PREFIX}${userId}`;
		if (value === null) {
			window.localStorage.removeItem(key);
		} else {
			window.localStorage.setItem(key, String(value));
		}
	} catch {
		// localStorage indisponible (Safari privé, quota), fail silently.
	}
}

export function useAgentStatus({
	userId,
	presence,
	now: explicitNow,
}: UseAgentStatusOptions): UseAgentStatusResult {
	const [localDndUntil, setLocalDndUntil] = useState<number | undefined>(undefined);

	// Hydrate depuis localStorage au mount
	useEffect(() => {
		const persisted = readDndFromStorage(userId);
		if (persisted !== undefined) {
			setLocalDndUntil(persisted);
		}
	}, [userId]);

	const now = explicitNow ?? Date.now();

	// Priorité : snapshot.dndUntil (futur Convex) → localStorage.
	const effectiveDndUntil = presence?.dndUntil ?? localDndUntil;
	const dndActive = effectiveDndUntil !== undefined && effectiveDndUntil > now;

	const status: AgentStatusExtended = presence
		? deriveExtendedStatus(
				{ status: presence.status, dndUntil: effectiveDndUntil },
				now,
			)
		: "offline";

	const setDndUntil = useCallback(
		(expiresAt: number | null) => {
			setLocalDndUntil(expiresAt ?? undefined);
			writeDndToStorage(userId, expiresAt);
		},
		[userId],
	);

	const clearDnd = useCallback(() => {
		setLocalDndUntil(undefined);
		writeDndToStorage(userId, null);
	}, [userId]);

	const dndRemainingSeconds = dndActive
		? Math.max(0, Math.floor((effectiveDndUntil! - now) / 1000))
		: 0;

	return {
		status,
		dndUntil: dndActive ? effectiveDndUntil : undefined,
		setDndUntil,
		clearDnd,
		dndRemainingSeconds,
	};
}
