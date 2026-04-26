/**
 * Admin Chat Streaming — variante streaming pour les réponses texte pures.
 *
 * USAGE :
 *   1. Frontend appelle `startTextStream({ prompt })` → reçoit streamingChatId
 *   2. Frontend subscribe à `api.ai.streamingChats.getById({ id })` via useQuery
 *   3. Affichage incrémental jusqu'à `status: "done"`
 *
 * LIMITATIONS volontaires (v1) :
 *   - Pas de tool calling — l'objet retourné est text-only.
 *   - Pas de history conversation — chaque appel est isolé.
 *   - Pour le chat avec tools, continuer à utiliser `api.ai.adminChat.chat`
 *     (request/response) qui reste le path principal.
 *
 * Ce module sert à mesurer le gain de latence perçue avant d'investir
 * dans un streaming complet avec tools (qui nécessite buffering + parsing
 * des function calls dans le stream).
 */

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { rateLimiter } from "./rateLimiter";

const AI_MODEL = "gemini-2.5-flash";

/**
 * Démarre un stream texte. Retourne immédiatement l'ID de la row à
 * subscribe — le streaming continue en background via internalAction.
 */
export const startTextStream = action({
	args: {
		prompt: v.string(),
		systemPrompt: v.optional(v.string()),
	},
	handler: async (ctx, { prompt, systemPrompt }): Promise<{ streamingChatId: Id<"streamingChats"> }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("NOT_AUTHENTICATED");

		const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
			key: identity.subject,
		});
		if (!ok) {
			const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
			throw new Error(
				`RATE_LIMITED:Veuillez attendre ${waitSeconds} secondes.`,
			);
		}

		const user = await ctx.runQuery(api.functions.users.getMe);
		if (!user) throw new Error("USER_NOT_FOUND");

		const streamingChatId: Id<"streamingChats"> = await ctx.runMutation(
			internal.ai.streamingChats.create,
			{ userId: user._id },
		);

		// Lance le stream en background — l'action retourne immédiatement.
		await ctx.scheduler.runAfter(0, internal.ai.adminChatStreaming.runTextStream, {
			streamingChatId,
			prompt,
			systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
		});

		return { streamingChatId };
	},
});

const DEFAULT_SYSTEM_PROMPT = `Tu es l'Assistant IA du Système Consulaire (iAsted), dédié aux agents et personnel diplomatique du Consulat du Gabon.
Réponds dans la langue de l'utilisateur (français par défaut). Sois concis et professionnel.`;

/**
 * Internal action — exécute le streaming Gemini et append les chunks.
 * Tourne en background, max ~5 minutes (limite Convex actions).
 */
export const runTextStream = internalAction({
	args: {
		streamingChatId: v.id("streamingChats"),
		prompt: v.string(),
		systemPrompt: v.string(),
	},
	handler: async (ctx, { streamingChatId, prompt, systemPrompt }) => {
		try {
			const apiKey = process.env.GEMINI_API_KEY;
			if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
			const { GoogleGenAI } = await import("@google/genai");
			const ai = new GoogleGenAI({ apiKey });

			const stream = await ai.models.generateContentStream({
				model: AI_MODEL,
				contents: [
					{ role: "user", parts: [{ text: `[INSTRUCTIONS SYSTÈME] ${systemPrompt}` }] },
					{ role: "model", parts: [{ text: "Compris. Comment puis-je vous aider ?" }] },
					{ role: "user", parts: [{ text: prompt }] },
				],
			});

			// Batch les chunks (~150ms) pour éviter de hammer la DB Convex.
			let buffer = "";
			let lastFlush = Date.now();
			const FLUSH_MS = 150;

			const flush = async () => {
				if (!buffer) return;
				const chunk = buffer;
				buffer = "";
				lastFlush = Date.now();
				await ctx.runMutation(internal.ai.streamingChats.appendChunk, {
					id: streamingChatId,
					chunk,
				});
			};

			for await (const part of stream) {
				const text = part.text ?? "";
				if (!text) continue;
				buffer += text;
				if (Date.now() - lastFlush >= FLUSH_MS) {
					await flush();
				}
			}
			await flush();

			await ctx.runMutation(internal.ai.streamingChats.finalize, {
				id: streamingChatId,
				actions: [],
			});
		} catch (err) {
			await ctx.runMutation(internal.ai.streamingChats.failStream, {
				id: streamingChatId,
				error: (err as Error).message ?? "Unknown error",
			});
		}
	},
});
