"use client";

import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

/**
 * Garantit que :
 * 1) `useConvexAuth().isAuthenticated === true` (JWT propagé au WS Convex), ET
 * 2) `ensureUser({})` mutation a complété (row Convex `users` existe).
 *
 * Le filet de sécurité `AuthSync` du provider reste en place pour les autres
 * routes ; ce hook est utilisé localement par OtpPhase pour bloquer la
 * transition vers la suite du wizard tant que l'utilisateur Convex n'est pas
 * effectivement disponible.
 */
export function useAuthSyncWait() {
	const { isAuthenticated } = useConvexAuth();
	const ensureUser = useMutation(api.functions.users.ensureUser);
	const authReadyRef = useRef(isAuthenticated);

	useEffect(() => {
		authReadyRef.current = isAuthenticated;
	}, [isAuthenticated]);

	const waitForSync = useCallback(
		async (opts?: { timeoutMs?: number }) => {
			const timeoutMs = opts?.timeoutMs ?? 5000;
			const start = Date.now();
			while (!authReadyRef.current && Date.now() - start < timeoutMs) {
				await new Promise((r) => setTimeout(r, 50));
			}
			if (!authReadyRef.current) {
				throw new Error("auth_timeout");
			}
			await ensureUser({});
		},
		[ensureUser],
	);

	return { waitForSync, isAuthenticated };
}
