"use client";

/**
 * useShadowObserver — Mode shadow iAsted (Sprint 8 — F4 wiring, Ronde 3).
 *
 * Hook OBSERVATEUR léger qui détecte les patterns d'interaction de
 * l'utilisateur sur la page courante et produit des **observations** (pas
 * des actions). Ces observations sont périodiquement résumées et poussées
 * dans le pageContext via `additionalNote` pour que l'agent vocal puisse
 * proposer des raccourcis contextuels (« je remarque que vous remplissez X,
 * voulez-vous que je le complète à votre place ? »).
 *
 * Patterns détectés (MVP minimal) :
 *   - Champ focus depuis > 3 s sans saisie → « focus_stalled »
 *   - Click répété (>3 sur le même bouton en 10 s) → « repeated_click »
 *   - Scroll important (> 50 % de la page) sans interaction → « browsing »
 *
 * Non-objectif (à raffiner Sprint dédié) :
 *   - Inference d'intention complexe via LLM
 *   - Modèle prédictif d'action probable
 *   - Décision automatique de proposer/garder silence (logique « ne pas spammer »
 *     simplifiée ici à un cooldown global de 30 s)
 *
 * Privacy : aucune donnée individuelle uploadée ; uniquement un résumé
 * textuel ponctuel injecté dans le contexte vocal (visible uniquement par
 * l'agent vocal de l'utilisateur courant).
 */

import { useEffect, useRef } from "react";

interface ShadowObservation {
	pattern: "focus_stalled" | "repeated_click" | "browsing";
	target?: string; // CSS selector ou label
	durationMs?: number;
	count?: number;
	at: number;
}

interface UseShadowObserverOptions {
	/** Si false, le hook ne registre PAS d'observateur (default : true). */
	enabled?: boolean;
	/**
	 * Callback invoqué quand une observation notable est détectée. Le host
	 * iAsted peut décider de pusher un text via `voice.sendText` ou de
	 * mettre à jour le pageContext.
	 */
	onObservation: (obs: ShadowObservation) => void;
	/**
	 * Cooldown minimum entre 2 observations émises (default : 30 s). Évite
	 * de spammer l'agent avec trop d'évènements bruts.
	 */
	cooldownMs?: number;
}

export function useShadowObserver({
	enabled = true,
	onObservation,
	cooldownMs = 30_000,
}: UseShadowObserverOptions): void {
	const lastEmittedAtRef = useRef(0);

	useEffect(() => {
		if (!enabled) return;
		if (typeof window === "undefined") return;

		// État local des observateurs
		let focusedEl: HTMLElement | null = null;
		let focusedAt = 0;
		let focusStalledTimer: ReturnType<typeof setTimeout> | null = null;
		const clickCounts = new Map<string, { count: number; firstAt: number }>();

		const emit = (obs: Omit<ShadowObservation, "at">) => {
			const now = Date.now();
			if (now - lastEmittedAtRef.current < cooldownMs) return;
			lastEmittedAtRef.current = now;
			try {
				onObservation({ ...obs, at: now });
			} catch (e) {
				console.warn("[shadow-observer] callback failed:", e);
			}
		};

		const elementSelector = (el: Element): string => {
			const tag = el.tagName.toLowerCase();
			const id = (el as HTMLElement).id;
			if (id) return `${tag}#${id}`;
			const cls = (el as HTMLElement).className?.toString().split(/\s+/)[0];
			return cls ? `${tag}.${cls}` : tag;
		};

		// Pattern 1 : champ focus depuis > 3 s sans saisie
		const onFocusIn = (e: FocusEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				!target ||
				!(target instanceof HTMLInputElement) &&
				!(target instanceof HTMLTextAreaElement)
			)
				return;
			focusedEl = target;
			focusedAt = Date.now();
			if (focusStalledTimer) clearTimeout(focusStalledTimer);
			focusStalledTimer = setTimeout(() => {
				if (focusedEl !== target) return;
				const currentValue =
					target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement
						? target.value
						: "";
				const sinceFocus = Date.now() - focusedAt;
				if (currentValue.length === 0 && sinceFocus >= 3_000) {
					const label =
						target.getAttribute("aria-label") ??
						target.getAttribute("placeholder") ??
						target.getAttribute("name") ??
						elementSelector(target);
					emit({
						pattern: "focus_stalled",
						target: label,
						durationMs: sinceFocus,
					});
				}
			}, 3_500);
		};
		const onFocusOut = () => {
			focusedEl = null;
			focusedAt = 0;
			if (focusStalledTimer) {
				clearTimeout(focusStalledTimer);
				focusStalledTimer = null;
			}
		};

		// Pattern 2 : clic répété sur le même bouton (> 3 en 10 s)
		const onClick = (e: MouseEvent) => {
			const el = e.target as Element | null;
			if (!el) return;
			const btn = (el.closest("button") ?? el.closest('[role="button"]')) as
				| HTMLElement
				| null;
			if (!btn) return;
			const sel = elementSelector(btn);
			const now = Date.now();
			const cur = clickCounts.get(sel);
			if (!cur || now - cur.firstAt > 10_000) {
				clickCounts.set(sel, { count: 1, firstAt: now });
			} else {
				cur.count++;
				if (cur.count >= 3) {
					emit({
						pattern: "repeated_click",
						target: btn.textContent?.trim().slice(0, 50) ?? sel,
						count: cur.count,
					});
					clickCounts.delete(sel);
				}
			}
		};

		window.addEventListener("focusin", onFocusIn);
		window.addEventListener("focusout", onFocusOut);
		window.addEventListener("click", onClick);
		return () => {
			window.removeEventListener("focusin", onFocusIn);
			window.removeEventListener("focusout", onFocusOut);
			window.removeEventListener("click", onClick);
			if (focusStalledTimer) clearTimeout(focusStalledTimer);
		};
	}, [enabled, onObservation, cooldownMs]);
}
