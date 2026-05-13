/**
 * realtimeToken — Génération d'un token éphémère OpenAI Realtime API.
 *
 * Flux :
 *   1. Auth + RBAC (citoyen → refus côté backoffice ; superadmin → bypass)
 *   2. Rate-limiting (`aiRealtimeSession`)
 *   3. Build du system prompt diplomatique (cf. iastedRealtimePrompt.ts)
 *   4. Build du tools registry filtré par permissions (cf. realtimeTools.ts)
 *   5. Appel POST https://api.openai.com/v1/realtime/sessions
 *   6. Retour `{ ephemeralKey, sessionId, systemPrompt, tools, voice }`
 *
 * Sans OPENAI_API_KEY → retour `{ available: false, error: "NOT_CONFIGURED" }`
 * (fallback graceful, l'UI doit afficher le mode vocal comme indisponible).
 *
 * Le token éphémère expire en ~1 minute. La session WebRTC se prolonge
 * ensuite via DataChannel — c'est l'établissement initial qui est limité.
 */

// Pas de `"use node"` : on reste dans le runtime Convex V8 isolate, qui
// supporte `fetch` natif et l'accès à `process.env`. Cela évite la
// dépendance Node.js sur le deployment local et accélère le démarrage.

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { rateLimiter } from "./rateLimiter";
import type { RealtimeSessionResponse, RealtimeVoice } from "./realtimeTypes";

const DEFAULT_MODEL = "gpt-4o-realtime-preview-2024-12-17";
const DEFAULT_VOICE: RealtimeVoice = "ash";
const SUPPORTED_VOICES: ReadonlySet<RealtimeVoice> = new Set<RealtimeVoice>([
	"alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse",
]);

export const create = action({
	args: {
		surface: v.union(
			v.literal("agent"),
			v.literal("backoffice"),
			v.literal("citizen"),
		),
		orgId: v.optional(v.id("orgs")),
		voice: v.optional(v.string()),
		locale: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<RealtimeSessionResponse> => {
		// ── 1. Auth ───────────────────────────────────────────────
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("NOT_AUTHENTICATED");
		}

		// ── 2. Configuration check (fallback graceful) ────────────
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return {
				available: false,
				error: "NOT_CONFIGURED",
			};
		}

		// ── 3. Récupérer user + membership ────────────────────────
		const user = await ctx.runQuery(api.functions.users.getMe);
		if (!user) {
			throw new Error("USER_NOT_FOUND");
		}

		// ── 4. RBAC selon la surface ──────────────────────────────
		// agent-web : tout agent authentifié peut activer le mode vocal
		// backoffice-web : doit être admin/superadmin
		if (args.surface === "backoffice") {
			const isAdmin =
				user.isSuperadmin === true ||
				user.role === "super_admin" ||
				user.role === "admin_system" ||
				user.role === "admin" ||
				user.role === "sous_admin";
			if (!isAdmin) {
				throw new Error("INSUFFICIENT_PERMISSIONS");
			}
		}

		// ── 5. Rate-limiting (1 nouvelle session / 30s / user) ─────
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiRealtimeSession", {
			key: identity.subject,
		});
		if (!ok) {
			const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
			throw new Error(
				`RATE_LIMITED:Veuillez patienter ${waitSeconds} secondes avant de relancer une session vocale.`,
			);
		}

		// ── 6. Build du tools registry filtré par permissions ─────
		const { tools, toolNames } = await ctx.runQuery(
			internal.ai.realtimeTools.getToolsForUser,
			{
				userId: user._id as Id<"users">,
				orgId: args.orgId,
				surface: args.surface,
			},
		);

		// ── 7. Build du system prompt diplomatique ────────────────
		const promptResult = await ctx.runQuery(
			internal.ai.iastedRealtimePrompt.buildPrompt,
			{
				userId: user._id as Id<"users">,
				orgId: args.orgId,
				surface: args.surface,
				toolNames,
				locale: args.locale,
			},
		);

		// ── 8. Validation de la voix demandée ─────────────────────
		const requestedVoice = args.voice as RealtimeVoice | undefined;
		const voice: RealtimeVoice =
			requestedVoice && SUPPORTED_VOICES.has(requestedVoice)
				? requestedVoice
				: DEFAULT_VOICE;

		// ── 9. Appel OpenAI Realtime API ──────────────────────────
		try {
			const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: DEFAULT_MODEL,
					voice,
					instructions: promptResult.prompt,
					tool_choice: "auto",
					tools,
					input_audio_format: "pcm16",
					output_audio_format: "pcm16",
					input_audio_transcription: { model: "whisper-1" },
					turn_detection: {
						type: "server_vad",
						threshold: 0.5,
						prefix_padding_ms: 300,
						silence_duration_ms: 700,
					},
				}),
			});

			if (!response.ok) {
				const errorBody = await response.text();
				console.error("[realtimeToken] OpenAI API error:", response.status, errorBody);
				return {
					available: false,
					error: `OPENAI_ERROR_${response.status}`,
				};
			}

			const data = (await response.json()) as {
				id?: string;
				client_secret?: { value?: string; expires_at?: number };
			};

			const ephemeralKey = data.client_secret?.value;
			const sessionId = data.id;
			if (!ephemeralKey || !sessionId) {
				return {
					available: false,
					error: "OPENAI_INVALID_RESPONSE",
				};
			}

			const expiresAt = data.client_secret?.expires_at
				? new Date(data.client_secret.expires_at * 1000).toISOString()
				: undefined;

			return {
				available: true,
				ephemeralKey,
				sessionId,
				model: DEFAULT_MODEL,
				systemPrompt: promptResult.prompt,
				tools,
				voice,
				expiresAt,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
			console.error("[realtimeToken] Fetch failure:", message);
			return {
				available: false,
				error: `NETWORK_ERROR:${message}`,
			};
		}
	},
});
