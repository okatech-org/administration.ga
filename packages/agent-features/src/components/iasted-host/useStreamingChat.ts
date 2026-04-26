/**
 * useStreamingChat — consomme un stream texte Gemini via Convex.
 *
 * Pattern :
 *   1. Appelle `start(prompt)` → backend crée une streamingChats row + lance
 *      Gemini en stream + retourne l'ID
 *   2. Le hook subscribe à la row via useQuery (réactif Convex)
 *   3. Le `text` se met à jour à chaque chunk reçu
 *   4. `isStreaming` passe à false quand `status="done"` ou `"error"`
 *
 * Usage :
 *   const { text, isStreaming, error, start, reset } = useStreamingChat();
 *   await start("Résume cette demande en 3 points");
 *
 * Limitations v1 (cf. adminChatStreaming.ts) :
 *   - Pas de tools — pour les actions, utiliser useAdminAIChat (request/resp)
 *   - Pas d'historique — chaque appel est isolé
 */

import { useCallback, useState } from "react";
import { useConvexActionQuery } from "@workspace/api/hooks";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export type StreamingChatState = {
	text: string;
	isStreaming: boolean;
	error: string | null;
	streamingChatId: Id<"streamingChats"> | null;
};

export function useStreamingChat() {
	const [streamingChatId, setStreamingChatId] =
		useState<Id<"streamingChats"> | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);

	const { mutateAsync: startTextStream } = useConvexActionQuery(
		api.ai.adminChatStreaming.startTextStream,
	);

	const stream = useQuery(
		api.ai.streamingChats.getById,
		streamingChatId ? { id: streamingChatId } : "skip",
	);

	const start = useCallback(
		async (prompt: string, systemPrompt?: string) => {
			setLocalError(null);
			setStreamingChatId(null);
			try {
				const { streamingChatId: id } = await startTextStream({
					prompt,
					systemPrompt,
				});
				setStreamingChatId(id);
				return id;
			} catch (e) {
				setLocalError((e as Error).message);
				return null;
			}
		},
		[startTextStream],
	);

	const reset = useCallback(() => {
		setStreamingChatId(null);
		setLocalError(null);
	}, []);

	const isStreaming =
		streamingChatId !== null &&
		(stream === undefined || stream?.status === "streaming");

	return {
		text: stream?.content ?? "",
		isStreaming,
		error: localError ?? stream?.error ?? null,
		streamingChatId,
		start,
		reset,
	};
}
