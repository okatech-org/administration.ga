/**
 * useStreamingChat — consomme un stream Gemini via Convex avec ou sans tools.
 *
 * Deux entry points :
 *   - `start(prompt, systemPrompt?)` → stream texte pur (api.ai.adminChatStreaming.startTextStream).
 *     Utilisé par le « Explainer » (StreamingExplanationCard) — pas de tools, pas d'historique.
 *   - `startChat({ message, ... })` → stream complet avec tool calling
 *     (api.ai.adminChatStreaming.startChatStream). Le LLM peut appeler les
 *     read tools (résultats streamés au fur et à mesure dans `toolCalls`),
 *     les UI tools et les mutative tools sont retournés dans `actions` à la
 *     fin du stream — la confirmation/exécution est déléguée au composant
 *     qui consomme le hook (utiliser `api.ai.adminChat.executeAction`).
 *
 * Usage tools :
 *   const { text, toolCalls, actions, isStreaming, startChat } = useStreamingChat();
 *   await startChat({ message, conversationId, orgId, currentPage, pageContext });
 *   // À status="done", `actions` contient les UI/mutative actions à dispatcher.
 */

import { useCallback, useState } from "react";
import { useConvexActionQuery } from "@workspace/api/hooks";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export type StreamingAction = {
	type: string;
	args: Record<string, unknown>;
	requiresConfirmation: boolean;
	reason?: string;
};

export type StreamingToolCall = {
	name: string;
	args: unknown;
	result?: unknown;
	iteration: number;
};

export type StartChatArgs = {
	message: string;
	conversationId?: Id<"conversations">;
	orgId: Id<"orgs">;
	currentPage?: string;
	pageContext?: unknown;
	app?: "agent" | "backoffice";
};

export function useStreamingChat() {
	const [streamingChatId, setStreamingChatId] =
		useState<Id<"streamingChats"> | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);

	const { mutateAsync: startTextStream } = useConvexActionQuery(
		api.ai.adminChatStreaming.startTextStream,
	);
	const { mutateAsync: startChatStream } = useConvexActionQuery(
		api.ai.adminChatStreaming.startChatStream,
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

	const startChat = useCallback(
		async (args: StartChatArgs) => {
			setLocalError(null);
			setStreamingChatId(null);
			try {
				const { streamingChatId: id } = await startChatStream({
					message: args.message,
					conversationId: args.conversationId,
					orgId: args.orgId,
					currentPage: args.currentPage,
					pageContext: args.pageContext as never,
					app: args.app,
				});
				setStreamingChatId(id);
				return id;
			} catch (e) {
				setLocalError((e as Error).message);
				return null;
			}
		},
		[startChatStream],
	);

	const reset = useCallback(() => {
		setStreamingChatId(null);
		setLocalError(null);
	}, []);

	const isStreaming =
		streamingChatId !== null &&
		(stream === undefined || stream?.status === "streaming");

	const actions = (stream?.actions ?? []) as StreamingAction[];
	const toolCalls = (stream?.toolCalls ?? []) as StreamingToolCall[];

	return {
		text: stream?.content ?? "",
		isStreaming,
		isDone: stream?.status === "done",
		error: localError ?? stream?.error ?? null,
		streamingChatId,
		actions,
		toolCalls,
		start,
		startChat,
		reset,
	};
}
