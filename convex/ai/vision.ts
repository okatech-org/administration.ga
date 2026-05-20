/**
 * vision — Analyse d'image multimodale via OpenAI Vision (gpt-4o-mini).
 *
 * Sprint 6 (Ronde 3) — Multi-modalité visuelle. Action consommée par :
 *   - `realtimeToolExecutor` (indirectement via le tool `capture_screen_region`),
 *   - Le client `useIAstedHost` après capture d'écran via `getDisplayMedia`.
 *
 * Architecture du flux vocal :
 *   1. L'agent appelle le tool `capture_screen_region({ what_to_focus })`.
 *   2. Le tool retourne `uiAction: { type: "request_screen_capture" }`.
 *   3. Le client capture le DOM/écran (getDisplayMedia natif).
 *   4. Le client appelle `ai.vision.describeImage({ imageBase64, focusHint })`.
 *   5. L'action passe par `gpt-4o-mini` Vision avec un prompt court.
 *   6. Le résultat texte est injecté dans la session vocale via `voice.sendText`.
 *   7. L'agent reçoit le texte comme un message user et répond.
 *
 * Coût ~$0.01 par appel (image low detail, prompt court, response 200 tokens).
 * Garde-fous : auth + rate-limit `aiRealtimeVision` (10/jour user, 3 rafale).
 * Surface restreinte à agent/backoffice (citoyen exclu) côté tool registry.
 */

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { rateLimiter } from "./rateLimiter";

const VISION_MODEL = "gpt-4o-mini";
const VISION_ENDPOINT = "https://api.openai.com/v1/chat/completions";
// Cap dur sur la taille de l'image base64 (post-encodage). 5 MB = ~7 MB base64.
const MAX_IMAGE_BASE64_BYTES = 7_000_000;

export const describeImage = action({
	args: {
		/** Image PNG/JPEG en data URL (`data:image/png;base64,...`). */
		imageBase64: v.string(),
		/** Hint contextuel pour orienter la description (1-2 phrases max). */
		focusHint: v.optional(v.string()),
		/**
		 * Mode de détail Vision. `low` = ~85 tokens, `high` = jusqu'à 765 tokens
		 * + résolution doublée. Default `low` pour borner le coût ; `high` pour
		 * lecture de texte fin (passeport, document scanné).
		 */
		detail: v.optional(v.union(v.literal("low"), v.literal("high"))),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ ok: boolean; description?: string; error?: string }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { ok: false, error: "NOT_AUTHENTICATED" };
		}
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return { ok: false, error: "NOT_CONFIGURED" };
		}

		// Rate limit dédié vision (10/jour/user, capacity 3 rafale).
		const { ok: rlOk, retryAfter } = await rateLimiter.limit(
			ctx,
			"aiRealtimeVision",
			{ key: identity.subject },
		);
		if (!rlOk) {
			const wait = Math.ceil((retryAfter ?? 0) / 60_000);
			return {
				ok: false,
				error: `RATE_LIMITED: Quota vision atteint. Réessayez dans ${wait} min.`,
			};
		}

		// Validation taille image.
		if (args.imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
			return {
				ok: false,
				error: `IMAGE_TOO_LARGE: ${(args.imageBase64.length / 1_000_000).toFixed(1)} MB > 7 MB max.`,
			};
		}
		// Normalise en data URL si juste base64.
		const imageUrl = args.imageBase64.startsWith("data:")
			? args.imageBase64
			: `data:image/png;base64,${args.imageBase64}`;

		// Prompt court et ciblé. Le hint utilisateur prime — sans hint,
		// on demande une description générale orientée action diplomatique.
		const focusInstruction = args.focusHint
			? `Focus particulier : ${args.focusHint}`
			: "Décris ce que tu vois en privilégiant les éléments actionnables pour un agent diplomatique ou consulaire (formulaires, dossiers, listes, alertes, statuts).";

		const tStart = Date.now();
		try {
			const response = await fetch(VISION_ENDPOINT, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: VISION_MODEL,
					messages: [
						{
							role: "system",
							content:
								"Tu es un assistant qui décrit des captures d'écran ou photos pour un agent vocal francophone. Réponds en français, en 2-4 phrases brèves, ton diplomatique. Pas de markdown, pas de listes — phrases simples lisibles à voix haute.",
						},
						{
							role: "user",
							content: [
								{
									type: "text",
									text: focusInstruction,
								},
								{
									type: "image_url",
									image_url: {
										url: imageUrl,
										detail: args.detail ?? "low",
									},
								},
							],
						},
					],
					max_tokens: 250,
					temperature: 0.4,
				}),
			});

			if (!response.ok) {
				const errorBody = await response.text().catch(() => "");
				console.error(
					"[vision.describeImage] OpenAI error:",
					response.status,
					errorBody.slice(0, 300),
				);
				return {
					ok: false,
					error: `OPENAI_ERROR_${response.status}`,
				};
			}

			const data = (await response.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
			};
			const description = data.choices?.[0]?.message?.content?.trim();
			if (!description) {
				return { ok: false, error: "EMPTY_RESPONSE" };
			}

			console.log(
				"[vision.describeImage] success",
				JSON.stringify({
					duration_ms: Date.now() - tStart,
					detail: args.detail ?? "low",
					image_size_kb: Math.round(args.imageBase64.length / 1024),
				}),
			);

			return { ok: true, description };
		} catch (e: any) {
			const msg = e?.message ?? "UNKNOWN";
			console.error("[vision.describeImage] fetch failure:", msg);
			return { ok: false, error: `NETWORK_ERROR: ${msg}` };
		}
	},
});
