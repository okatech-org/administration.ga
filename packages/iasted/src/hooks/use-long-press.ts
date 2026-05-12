/**
 * useLongPress — Hook utilitaire de détection du maintien long.
 *
 * Pattern partagé : maintien ≥ `delay` ms sur un bouton déclenche `callback`.
 * Le tap court (relâchement avant `delay`) n'est pas intercepté ici — le
 * consumer gère le clic normal via `onClick` du composant.
 *
 * Renvoie des handlers `onPointerDown` / `onPointerUp` / `onPointerCancel`
 * prêts à brancher sur un `<button>` ou n'importe quel élément interactif.
 *
 * Le flag `longPressTriggered` permet au consumer d'annuler le `onClick`
 * qui suivrait un long-press (cf. CircleMenu pour un exemple).
 */

"use client";

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";

export interface UseLongPressOptions {
	/** Seuil de détection en millisecondes. Défaut : 350. */
	delay?: number;
	/** Émet une vibration haptique (15ms) au déclenchement si supporté. Défaut : true. */
	vibration?: boolean;
	/** Désactive complètement la détection (le callback ne sera jamais appelé). */
	disabled?: boolean;
}

export interface UseLongPressResult<T extends HTMLElement = HTMLElement> {
	onPointerDown: (event: ReactPointerEvent<T>) => void;
	onPointerUp: (event: ReactPointerEvent<T>) => void;
	onPointerCancel: (event: ReactPointerEvent<T>) => void;
	onPointerLeave: (event: ReactPointerEvent<T>) => void;
	/**
	 * Ref qui devient `true` immédiatement après le déclenchement du long-press
	 * et reste vrai jusqu'au prochain `onClick` (que le consumer doit alors annuler).
	 * Méthode `consume()` pour le remettre à false.
	 */
	wasTriggered: { current: boolean; consume: () => boolean };
}

export function useLongPress<T extends HTMLElement = HTMLElement>(
	callback: () => void,
	{ delay = 350, vibration = true, disabled = false }: UseLongPressOptions = {},
): UseLongPressResult<T> {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const triggeredRef = useRef(false);
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const onPointerDown = useCallback(() => {
		if (disabled) return;
		triggeredRef.current = false;
		clearTimer();
		timerRef.current = setTimeout(() => {
			triggeredRef.current = true;
			if (vibration && typeof navigator !== "undefined" && navigator.vibrate) {
				try { navigator.vibrate(15); } catch { /* ignore */ }
			}
			callbackRef.current();
		}, delay);
	}, [disabled, delay, vibration, clearTimer]);

	const onPointerUp = useCallback(() => clearTimer(), [clearTimer]);

	useEffect(() => () => clearTimer(), [clearTimer]);

	const wasTriggered = {
		get current() { return triggeredRef.current; },
		consume() {
			const was = triggeredRef.current;
			triggeredRef.current = false;
			return was;
		},
	} as { current: boolean; consume: () => boolean };

	return {
		onPointerDown,
		onPointerUp,
		onPointerCancel: onPointerUp,
		onPointerLeave: onPointerUp,
		wasTriggered,
	};
}
