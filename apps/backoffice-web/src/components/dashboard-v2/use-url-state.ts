"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Sync local state to a URL search param without provoquer reload.
 *
 * - Lit la valeur courante depuis `?key=…`.
 * - Quand on appelle `setValue(next)`, le param est *écrit* via
 *   `router.replace({ scroll: false })` — pas de re-fetch SSR ni de saut
 *   de scroll. Si `next === defaultValue`, le param est *supprimé* de
 *   l'URL pour garder les URLs propres lors d'un clear.
 *
 * Idéal pour des filtres/recherches partagés en URL : recharger, ouvrir
 * dans un autre onglet, copier-coller le lien — tout remonte le même état.
 *
 * Note : la source de vérité est l'URL elle-même. Pas de state local
 * intermédiaire — chaque changement provoque un re-render via la
 * `useSearchParams()` réactive de Next.
 */
export function useUrlState<T extends string>(
	key: string,
	defaultValue: T,
): [T, (next: T) => void] {
	const router = useRouter();
	const searchParams = useSearchParams();

	const current = (searchParams.get(key) as T | null) ?? defaultValue;

	const setValue = useCallback(
		(next: T) => {
			const params = new URLSearchParams(searchParams.toString());
			if (next === defaultValue || next === "" || next == null) {
				params.delete(key);
			} else {
				params.set(key, next);
			}
			const qs = params.toString();
			const pathname = window.location.pathname;
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, searchParams, key, defaultValue],
	);

	return [current, setValue];
}

/**
 * Boolean variant — sérialise comme `"1"` quand `true`, supprime sinon.
 */
export function useUrlBoolean(key: string): [boolean, (next: boolean) => void] {
	const router = useRouter();
	const searchParams = useSearchParams();

	const current = searchParams.get(key) === "1";

	const setValue = useCallback(
		(next: boolean) => {
			const params = new URLSearchParams(searchParams.toString());
			if (next) {
				params.set(key, "1");
			} else {
				params.delete(key);
			}
			const qs = params.toString();
			const pathname = window.location.pathname;
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, searchParams, key],
	);

	return [current, setValue];
}

/**
 * Reset utilitaire — supprime un ensemble de clés en un appel pour les
 * boutons "Réinitialiser les filtres". Préserve les clés non listées
 * (typiquement `tab` qui doit survivre au reset).
 */
export function useUrlReset() {
	const router = useRouter();
	const searchParams = useSearchParams();

	return useCallback(
		(keysToDelete: string[]) => {
			const params = new URLSearchParams(searchParams.toString());
			for (const k of keysToDelete) params.delete(k);
			const qs = params.toString();
			const pathname = window.location.pathname;
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, searchParams],
	);
}
