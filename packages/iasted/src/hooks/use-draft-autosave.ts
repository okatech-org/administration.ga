/**
 * useDraftAutosave — persistance automatique d'un brouillon de message chat.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase γ.
 *
 * Contrat data-source-agnostic : le consumer fournit les mutations/queries
 * Convex via les callbacks. Permet de câbler citizen / agent / backoffice sur
 * la même logique sans coupler le package à un backend spécifique.
 *
 * Usage :
 *   const { value, setValue, flush } = useDraftAutosave({
 *     chatId,
 *     initialValue: savedDraft?.content ?? "",
 *     saveDraft: (content) => saveDraftMutation({ chatId, content }),
 *     clearDraft: () => clearDraftMutation({ chatId }),
 *     debounceMs: 3000,
 *   });
 *
 * - Autosave débounced (3s par défaut).
 * - `flush()` à appeler après envoi effectif → clear côté backend.
 * - Vide `content.trim() === ""` → clear automatique (évite rows orphelines).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseDraftAutosaveOptions {
	/** Clé de déduplication — typiquement le chatId. */
	chatId: string | undefined;
	/** Brouillon initial (chargé côté consumer via getDraft). */
	initialValue?: string;
	/** Mutation de sauvegarde. Reçoit le contenu à jour. */
	saveDraft: (content: string) => Promise<unknown>;
	/** Mutation de suppression (optionnelle — appelée sur flush et sur contenu vide). */
	clearDraft?: () => Promise<unknown>;
	/** Délai de débounce (ms) avant persistance. Défaut 3000. */
	debounceMs?: number;
}

export interface UseDraftAutosaveResult {
	value: string;
	setValue: (v: string) => void;
	/** À appeler après envoi effectif du message (clear côté backend). */
	flush: () => Promise<void>;
	/** État de synchronisation ("idle" | "pending" | "saving" | "saved"). */
	status: "idle" | "pending" | "saving" | "saved";
}

export function useDraftAutosave({
	chatId,
	initialValue = "",
	saveDraft,
	clearDraft,
	debounceMs = 3000,
}: UseDraftAutosaveOptions): UseDraftAutosaveResult {
	const [value, setValueState] = useState<string>(initialValue);
	const [status, setStatus] =
		useState<UseDraftAutosaveResult["status"]>("idle");

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedValueRef = useRef<string>(initialValue);
	const chatIdRef = useRef<string | undefined>(chatId);

	// Re-synchronisation si le chatId change (changement de conversation)
	useEffect(() => {
		if (chatIdRef.current !== chatId) {
			chatIdRef.current = chatId;
			setValueState(initialValue);
			lastSavedValueRef.current = initialValue;
			setStatus("idle");
		}
	}, [chatId, initialValue]);

	const doSave = useCallback(
		async (content: string) => {
			if (!chatId) return;
			if (content === lastSavedValueRef.current) {
				setStatus("saved");
				return;
			}
			setStatus("saving");
			try {
				if (content.trim().length === 0 && clearDraft) {
					await clearDraft();
				} else {
					await saveDraft(content);
				}
				lastSavedValueRef.current = content;
				setStatus("saved");
			} catch {
				setStatus("idle");
			}
		},
		[chatId, saveDraft, clearDraft],
	);

	const setValue = useCallback(
		(next: string) => {
			setValueState(next);
			setStatus("pending");
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				void doSave(next);
			}, debounceMs);
		},
		[debounceMs, doSave],
	);

	// Nettoyage du timer à l'unmount
	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const flush = useCallback(async () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (clearDraft && chatId) {
			setStatus("saving");
			try {
				await clearDraft();
				lastSavedValueRef.current = "";
				setStatus("saved");
			} catch {
				setStatus("idle");
			}
		}
		setValueState("");
	}, [clearDraft, chatId]);

	return { value, setValue, flush, status };
}
