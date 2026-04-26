/**
 * Admin Chat Streaming — variante streaming AVEC tool calling.
 *
 * USAGE :
 *   1. Frontend appelle `startChatStream({ message, orgId, app, ... })` → reçoit streamingChatId
 *   2. Frontend subscribe à `api.ai.streamingChats.getById({ id })` via useQuery
 *   3. Affichage incrémental : `content` se remplit, `toolCalls` se peuple à chaque tool exécuté
 *   4. À `status: "done"` → `actions[]` exposé pour les UI tools (navigateTo) et les
 *      mutative tools en attente de confirmation
 *
 * Boucle stream + tools (max MAX_TOOL_ITERATIONS) :
 *   - Stream → buffer text + collecte les functionCall parts
 *   - Si functionCalls : exécute les read tools, accumule UI/mutative actions, re-stream
 *   - Sinon : break
 *
 * Les UI tools (navigateTo, executePageAction) et mutative tools sont retournés
 * dans `actions` à la fin du stream — la confirmation/exécution est déléguée au
 * frontend (même pattern que `adminChat.chat`).
 *
 * `startTextStream` (legacy) reste exporté pour compat le temps de migrer les appelants.
 */

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	getAdminTools,
	ADMIN_MUTATIVE_TOOLS,
	ADMIN_UI_TOOLS,
	ADMIN_TOOL_PERMISSIONS,
	ADMIN_ALWAYS_AVAILABLE_TOOLS,
	type AdminAppScope,
} from "./adminTools";
import {
	buildAdminContextPrompt,
	pageContextValidator,
} from "./adminContext";
import {
	executeAdminReadTool,
	truncateToolResult,
} from "./adminToolExecutor";
import { rateLimiter } from "./rateLimiter";

const AI_MODEL = "gemini-2.5-flash";
const MAX_TOOL_ITERATIONS = 3;
const FLUSH_MS = 150;

const DEFAULT_SYSTEM_PROMPT = `Tu es l'Assistant IA du Système Consulaire (iAsted), dédié aux agents et personnel diplomatique du Consulat du Gabon.
Réponds dans la langue de l'utilisateur (français par défaut). Sois concis et professionnel.`;

type StreamingAction = {
	type: string;
	args: Record<string, unknown>;
	requiresConfirmation: boolean;
	reason?: string;
};

type ConversationMessage = {
	role: "user" | "assistant" | "tool";
	content: string;
	toolCalls?: Array<{ name: string; args: unknown; result?: unknown }>;
	timestamp: number;
};

/**
 * Streaming chat avec tool calling complet (parité avec api.ai.adminChat.chat).
 */
export const startChatStream = action({
	args: {
		message: v.string(),
		conversationId: v.optional(v.id("conversations")),
		orgId: v.id("orgs"),
		currentPage: v.optional(v.string()),
		pageContext: v.optional(pageContextValidator),
		app: v.optional(v.union(v.literal("agent"), v.literal("backoffice"))),
	},
	handler: async (
		ctx,
		{ message, conversationId, orgId, currentPage, pageContext, app },
	): Promise<{ streamingChatId: Id<"streamingChats"> }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("NOT_AUTHENTICATED");

		const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
			key: identity.subject,
		});
		if (!ok) {
			const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
			throw new Error(`RATE_LIMITED:Veuillez attendre ${waitSeconds} secondes.`);
		}

		const user = await ctx.runQuery(api.functions.users.getMe);
		if (!user) throw new Error("USER_NOT_FOUND");

		const streamingChatId: Id<"streamingChats"> = await ctx.runMutation(
			internal.ai.streamingChats.create,
			{ userId: user._id, conversationId },
		);

		await ctx.scheduler.runAfter(0, internal.ai.adminChatStreaming.runChatStream, {
			streamingChatId,
			conversationId,
			message,
			orgId,
			currentPage,
			pageContext,
			app: app ?? "agent",
		});

		return { streamingChatId };
	},
});

/**
 * Internal action — exécute la boucle stream + tool calling.
 */
export const runChatStream = internalAction({
	args: {
		streamingChatId: v.id("streamingChats"),
		conversationId: v.optional(v.id("conversations")),
		message: v.string(),
		orgId: v.id("orgs"),
		currentPage: v.optional(v.string()),
		pageContext: v.optional(pageContextValidator),
		app: v.union(v.literal("agent"), v.literal("backoffice")),
	},
	handler: async (
		ctx,
		{ streamingChatId, conversationId, message, orgId, currentPage, pageContext, app },
	) => {
		try {
			const apiKey = process.env.GEMINI_API_KEY;
			if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

			const user = await ctx.runQuery(api.functions.users.getMe);
			if (!user) throw new Error("USER_NOT_FOUND");

			const appScope: AdminAppScope = app;
			const adminTools = getAdminTools(appScope);

			const membership = await ctx.runQuery(
				api.functions.memberships.getMyMembership,
				{ orgId },
			);
			if (!membership) throw new Error("NO_MEMBERSHIP");

			const org = await ctx.runQuery(api.functions.orgs.getById, { orgId });

			let positionName = "Agent";
			if (membership.positionId) {
				const position = await ctx.runQuery(
					internal.ai.adminChat.getPosition,
					{ positionId: membership.positionId },
				);
				if (position) {
					positionName =
						typeof position.title === "object"
							? (position.title as Record<string, string>).fr || "Agent"
							: String(position.title);
				}
			}

			// Filter tools by permissions
			const permissionAllowedTools: typeof adminTools = [];
			for (const tool of adminTools) {
				const requiredTask = ADMIN_TOOL_PERMISSIONS[tool.name];
				if (!requiredTask) {
					permissionAllowedTools.push(tool);
					continue;
				}
				const allowed = await ctx.runQuery(
					internal.ai.adminChat.checkPermission,
					{ userId: user._id, orgId, taskCode: requiredTask },
				);
				if (allowed) permissionAllowedTools.push(tool);
			}

			// Narrow by page scope
			const allowedTools: typeof adminTools =
				pageContext && pageContext.scopedToolNames.length > 0
					? permissionAllowedTools.filter(
							(t) =>
								ADMIN_ALWAYS_AVAILABLE_TOOLS.includes(
									t.name as (typeof ADMIN_ALWAYS_AVAILABLE_TOOLS)[number],
								) || pageContext.scopedToolNames.includes(t.name),
					  )
					: permissionAllowedTools;

			const contextPrompt = buildAdminContextPrompt(
				{
					firstName: user.firstName,
					lastName: user.lastName,
					positionName,
					orgName: org?.name || "Inconnue",
					orgId,
				},
				currentPage,
				pageContext,
			);

			// Conversation history
			let history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
			if (conversationId) {
				const conversation = await ctx.runQuery(
					internal.ai.chat.getConversation,
					{ conversationId },
				);
				if (conversation) {
					history = conversation.messages
						.filter((m: ConversationMessage) => m.role !== "tool")
						.map((m: ConversationMessage) => ({
							role: m.role === "assistant" ? "model" : "user",
							parts: [{ text: m.content }],
						}));
				}
			}

			const { GoogleGenAI } = await import("@google/genai");
			const ai = new GoogleGenAI({ apiKey });

			const functionDeclarations = allowedTools.map((t) => ({
				name: t.name,
				description: t.description,
				parameters: t.parameters as Record<string, unknown>,
			}));

			// Initial contents — system prompt as first user/model exchange + history + new message
			const contents: Array<{
				role: string;
				parts: Array<Record<string, unknown>>;
			}> = [
				{
					role: "user",
					parts: [{ text: `[INSTRUCTIONS SYSTÈME] ${contextPrompt}` }],
				},
				{
					role: "model",
					parts: [
						{
							text: "Compris, je suis l'Assistant IA du système consulaire. Comment puis-je vous aider dans votre travail ?",
						},
					],
				},
				...history,
				{ role: "user", parts: [{ text: message }] },
			];

			const accumulatedActions: StreamingAction[] = [];
			const persistedToolCalls: Array<{
				name: string;
				args: unknown;
				result: unknown;
			}> = [];
			let finalText = "";

			// Streaming + tool loop
			let iteration = 0;
			let buffer = "";
			let lastFlush = Date.now();
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

			while (iteration < MAX_TOOL_ITERATIONS) {
				const stream = await ai.models.generateContentStream({
					model: AI_MODEL,
					contents: contents as Parameters<
						typeof ai.models.generateContentStream
					>[0]["contents"],
					config: {
						tools:
							functionDeclarations.length > 0
								? [{ functionDeclarations }]
								: undefined,
					},
				});

				let iterationText = "";
				const pendingFunctionCalls: Array<{
					name: string;
					args: Record<string, unknown>;
				}> = [];

				for await (const chunk of stream) {
					const candidate = chunk.candidates?.[0];
					if (!candidate?.content?.parts) continue;
					for (const part of candidate.content.parts) {
						if ("text" in part && part.text) {
							iterationText += part.text;
							buffer += part.text;
							if (Date.now() - lastFlush >= FLUSH_MS) {
								await flush();
							}
						}
						if ("functionCall" in part && part.functionCall) {
							pendingFunctionCalls.push({
								name: part.functionCall.name ?? "",
								args: (part.functionCall.args ?? {}) as Record<string, unknown>,
							});
						}
					}
				}
				await flush();
				finalText = iterationText.length > 0 ? iterationText : finalText;

				if (pendingFunctionCalls.length === 0) break;

				// Execute tools — read direct, UI/mutative → actions
				const functionResponseParts: Array<Record<string, unknown>> = [];
				for (const fc of pendingFunctionCalls) {
					if (!fc.name) continue;

					if (
						ADMIN_UI_TOOLS.includes(fc.name as (typeof ADMIN_UI_TOOLS)[number])
					) {
						accumulatedActions.push({
							type: fc.name,
							args: fc.args,
							requiresConfirmation: false,
							reason: fc.args.reason as string | undefined,
						});
						functionResponseParts.push({
							functionResponse: {
								name: fc.name,
								response: {
									output: {
										acknowledged: true,
										message: "Action UI déclenchée côté frontend.",
									},
								},
							},
						});
						await ctx.runMutation(internal.ai.streamingChats.appendToolCall, {
							id: streamingChatId,
							name: fc.name,
							args: fc.args,
							result: { acknowledged: true },
							iteration,
						});
						persistedToolCalls.push({
							name: fc.name,
							args: fc.args,
							result: { acknowledged: true },
						});
						continue;
					}

					if (
						ADMIN_MUTATIVE_TOOLS.includes(
							fc.name as (typeof ADMIN_MUTATIVE_TOOLS)[number],
						)
					) {
						accumulatedActions.push({
							type: fc.name,
							args: fc.args,
							requiresConfirmation: true,
						});
						functionResponseParts.push({
							functionResponse: {
								name: fc.name,
								response: {
									output: {
										status: "pending_confirmation",
										message: `Action "${fc.name}" en attente de confirmation utilisateur.`,
									},
								},
							},
						});
						await ctx.runMutation(internal.ai.streamingChats.appendToolCall, {
							id: streamingChatId,
							name: fc.name,
							args: fc.args,
							result: { status: "pending_confirmation" },
							iteration,
						});
						persistedToolCalls.push({
							name: fc.name,
							args: fc.args,
							result: { status: "pending_confirmation" },
						});
						continue;
					}

					// Read tool — exécution immédiate
					let toolResult: unknown;
					try {
						toolResult = await executeAdminReadTool(ctx, fc.name, fc.args, {
							orgId,
							user: {
								_id: user._id,
								firstName: user.firstName,
								lastName: user.lastName,
							},
							positionName,
							org,
						});
					} catch (err) {
						toolResult = { error: (err as Error).message };
					}
					functionResponseParts.push({
						functionResponse: {
							name: fc.name,
							response: { output: toolResult },
						},
					});
					await ctx.runMutation(internal.ai.streamingChats.appendToolCall, {
						id: streamingChatId,
						name: fc.name,
						args: fc.args,
						result: truncateToolResult(toolResult),
						iteration,
					});
					persistedToolCalls.push({
						name: fc.name,
						args: fc.args,
						result: toolResult,
					});
				}

				// Append model turn (functionCalls) + user turn (functionResponses) au contexte
				contents.push({
					role: "model",
					parts: pendingFunctionCalls.map((fc) => ({
						functionCall: { name: fc.name, args: fc.args },
					})),
				});
				contents.push({ role: "user", parts: functionResponseParts });

				iteration += 1;
			}

			// Fallback message si rien à dire mais des actions
			if (!finalText) {
				if (accumulatedActions.length > 0) {
					const uiActions = accumulatedActions.filter(
						(a) => !a.requiresConfirmation,
					);
					const confirmable = accumulatedActions.filter(
						(a) => a.requiresConfirmation,
					);
					if (uiActions.length > 0 && confirmable.length === 0) {
						finalText = "C'est parti !";
					} else if (confirmable.length > 0) {
						finalText =
							"Je peux effectuer cette action pour vous. Veuillez confirmer ci-dessous.";
					}
				} else {
					finalText =
						"Je suis désolé, je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?";
				}
				// Push the fallback into the streaming buffer so the frontend sees it
				await ctx.runMutation(internal.ai.streamingChats.appendChunk, {
					id: streamingChatId,
					chunk: finalText,
				});
			}

			// Persist conversation
			await ctx.runMutation(internal.ai.chat.saveMessage, {
				conversationId,
				userId: user._id,
				userMessage: message,
				assistantMessage: finalText,
				toolCalls: persistedToolCalls.map((tc) => ({
					name: tc.name,
					args: {},
					result: truncateToolResult(tc.result),
				})),
			});

			await ctx.runMutation(internal.ai.streamingChats.finalize, {
				id: streamingChatId,
				actions: accumulatedActions,
			});
		} catch (err) {
			await ctx.runMutation(internal.ai.streamingChats.failStream, {
				id: streamingChatId,
				error: (err as Error).message ?? "Unknown error",
			});
		}
	},
});

/**
 * @deprecated — variante texte-only conservée pour compat avec les anciens
 * appelants (StreamingExplanationCard "explainer" sans tools). Préférer
 * `startChatStream` qui supporte le tool calling.
 */
export const startTextStream = action({
	args: {
		prompt: v.string(),
		systemPrompt: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ prompt, systemPrompt },
	): Promise<{ streamingChatId: Id<"streamingChats"> }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("NOT_AUTHENTICATED");

		const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
			key: identity.subject,
		});
		if (!ok) {
			const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
			throw new Error(`RATE_LIMITED:Veuillez attendre ${waitSeconds} secondes.`);
		}

		const user = await ctx.runQuery(api.functions.users.getMe);
		if (!user) throw new Error("USER_NOT_FOUND");

		const streamingChatId: Id<"streamingChats"> = await ctx.runMutation(
			internal.ai.streamingChats.create,
			{ userId: user._id },
		);

		await ctx.scheduler.runAfter(0, internal.ai.adminChatStreaming.runTextStream, {
			streamingChatId,
			prompt,
			systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
		});

		return { streamingChatId };
	},
});

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

			let buffer = "";
			let lastFlush = Date.now();

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
