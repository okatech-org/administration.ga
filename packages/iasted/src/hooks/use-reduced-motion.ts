/**
 * useReducedMotion — détection SSR-safe de `prefers-reduced-motion: reduce`.
 *
 * Obligation WCAG 2.1 AA : les animations potentiellement vestibulaires
 * (rotation, shake, orbit) DOIVENT être désactivées quand l'utilisateur
 * exprime cette préférence OS.
 *
 * Pourquoi pas `useReducedMotion` de `motion/react` ?
 * - motion/react expose une détection similaire mais couplée au package motion.
 * - Ici on veut un hook utilisable partout (WindowShell, drawer, bubble, etc.),
 *   sans forcer l'import de motion dans les consumers minimalistes.
 *
 * Comportement :
 * - SSR : retourne `false` (pas de crash, fallback côté client après hydratation).
 * - Client : souscrit à `matchMedia` et met à jour en cas de changement OS.
 */

"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState<boolean>(false);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
			return;
		}

		const mq = window.matchMedia(QUERY);
		setReduced(mq.matches);

		const handler = (event: MediaQueryListEvent) => {
			setReduced(event.matches);
		};

		// `addEventListener` est le chemin moderne ; fallback `addListener` pour anciens Safari.
		if (typeof mq.addEventListener === "function") {
			mq.addEventListener("change", handler);
			return () => mq.removeEventListener("change", handler);
		}
		// Legacy API (Safari < 14)
		type LegacyMediaQueryList = MediaQueryList & {
			addListener: (handler: (e: MediaQueryListEvent) => void) => void;
			removeListener: (handler: (e: MediaQueryListEvent) => void) => void;
		};
		const legacyMq = mq as LegacyMediaQueryList;
		legacyMq.addListener(handler);
		return () => legacyMq.removeListener(handler);
	}, []);

	return reduced;
}
