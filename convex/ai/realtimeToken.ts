/**
 * realtimeToken — Génération d'un token éphémère OpenAI Realtime API (GA).
 *
 * Flux :
 *   1. Auth + RBAC (citoyen → refus côté backoffice ; superadmin → bypass)
 *   2. Rate-limiting (`aiRealtimeSession`)
 *   3. Build du system prompt diplomatique (cf. iastedRealtimePrompt.ts)
 *   4. Build du tools registry filtré par permissions (cf. realtimeTools.ts)
 *   5. Appel POST https://api.openai.com/v1/realtime/client_secrets (GA)
 *   6. Retour `{ ephemeralKey, sessionId, model, systemPrompt, tools, voice }`
 *
 * Sans OPENAI_API_KEY → retour `{ available: false, error: "NOT_CONFIGURED" }`
 * (fallback graceful, l'UI doit afficher le mode vocal comme indisponible).
 *
 * Le token éphémère expire en ~1 minute. La session WebRTC se prolonge
 * ensuite via DataChannel — c'est l'établissement initial qui est limité.
 */

// Runtime Node.js requis : le fetch vers OpenAI Realtime doit s'exécuter dans
// le runtime Node.js (pas le V8 isolate Convex) pour éviter des artefacts de
// sérialisation des headers/body qui faisaient échouer l'appel historiquement.
"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { rateLimiter } from "./rateLimiter";
import type { RealtimeSessionResponse, RealtimeVoice } from "./realtimeTypes";
import {
	DEFAULT_IASTED_LOCALE,
	isIastedLocaleSupported,
} from "../lib/iastedLocales";

// OpenAI Realtime — GA endpoint depuis le 12 mai 2026 (Beta retirée).
//   - Endpoint : POST /v1/realtime/client_secrets (était /v1/realtime/sessions)
//   - Body wrappé : { session: { type: "realtime", model, audio: {...}, ... } }
//   - Réponse flat : { value, expires_at, session: { id } }
// Modèle préféré : `gpt-realtime-mini` (Q4 2025) — 2–3× plus rapide et ~50 %
// moins cher que `gpt-realtime`, qualité équivalente sur conversation + tools.
// Fallback automatique sur `gpt-realtime` si la mini n'est pas dispo en GA.
const PREFERRED_MODEL = "gpt-realtime-mini";
const FALLBACK_MODEL = "gpt-realtime";
const DEFAULT_VOICE: RealtimeVoice = "ash";
const SUPPORTED_VOICES: ReadonlySet<RealtimeVoice> = new Set<RealtimeVoice>([
	"alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse",
]);

// Cache du modèle effectivement disponible au niveau du runtime Convex.
// Évite de re-tenter la mini puis le fallback à chaque appel — un retry par
// cold start (5–30 min) suffit pour absorber les changements de disponibilité.
let cachedActiveModel: typeof PREFERRED_MODEL | typeof FALLBACK_MODEL | null = null;

// Sprint 10 — H3 : A/B testing modèles via hash déterministe.
// `IASTED_AB_PERCENT_FULL` = % d'utilisateurs servis avec `gpt-realtime`
// (le reste reçoit `gpt-realtime-mini`). Default 0 = tout le monde sur
// mini. Hash deterministe sur userId garantit que le même user reçoit
// toujours le même modèle (pas de switch au milieu de la journée).
function hashStringToPercent(s: string): number {
	let h = 2166136261; // FNV-1a 32 bits
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return Math.abs(h >>> 0) % 100;
}

/**
 * Décide quel modèle servir à un user donné (A/B test deterministe).
 * Bypass total si `IASTED_AB_FORCE_MODEL` est défini (utile pour QA).
 */
function selectModelForUser(userId: string): typeof PREFERRED_MODEL | typeof FALLBACK_MODEL {
	const forced = process.env.IASTED_AB_FORCE_MODEL;
	if (forced === "gpt-realtime" || forced === "gpt-realtime-mini") {
		return forced as typeof PREFERRED_MODEL | typeof FALLBACK_MODEL;
	}
	const percentFull = Number(process.env.IASTED_AB_PERCENT_FULL ?? "0");
	if (!Number.isFinite(percentFull) || percentFull <= 0) {
		return PREFERRED_MODEL;
	}
	const bucket = hashStringToPercent(userId);
	return bucket < percentFull ? FALLBACK_MODEL : PREFERRED_MODEL;
}

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
		// ── Télémétrie latence — chronométrage des sous-étapes (ms) ──
		// Logs JSON-line préfixés [realtimeToken.timing] consultables via
		// `convex logs --grep "realtimeToken.timing"` pour comparer avant/après
		// chaque phase d'optimisation. Le surcoût de Date.now() est négligeable
		// (<0.1 ms) face aux centaines de ms mesurées.
		const tStart = Date.now();
		const timings: Record<string, number> = {};

		// ── 1. Auth ───────────────────────────────────────────────
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("NOT_AUTHENTICATED");
		}
		timings.auth_ms = Date.now() - tStart;

		// ── 2. Configuration check (fallback graceful) ────────────
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return {
				available: false,
				error: "NOT_CONFIGURED",
			};
		}

		// ── 3. Récupérer user + membership ────────────────────────
		const tQueryStart = Date.now();
		const user = await ctx.runQuery(api.functions.users.getMe);
		timings.q_getMe_ms = Date.now() - tQueryStart;
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

		// ── 5. Rate-limiting + queries parallèles (Phase 3 — Promise.all) ──
		// Optimisation latence : le rate limit et les 2 queries indépendantes
		// (tools registry, préférences voix) sont lancées en parallèle. Sans
		// `Promise.all`, ces 3 opérations totalisaient 150–400 ms en séquence.
		// `getMe` reste avant le batch parce que son résultat est requis pour
		// déduire `userId` ; `buildPrompt` reste après parce qu'il dépend de
		// `toolNames`.
		const tParallelStart = Date.now();
		const [rateLimitResult, toolsResult, voicePrefs] = await Promise.all([
			rateLimiter.limit(ctx, "aiRealtimeSession", { key: identity.subject }),
			ctx.runQuery(internal.ai.realtimeTools.getToolsForUser, {
				userId: user._id as Id<"users">,
				orgId: args.orgId,
				surface: args.surface,
			}),
			ctx.runQuery(
				(internal as any).ai.voicePreferences.getVoicePrefsForUser,
				{ userId: user._id as Id<"users"> },
			),
		]);
		timings.parallel_batch_ms = Date.now() - tParallelStart;

		const { ok, retryAfter } = rateLimitResult;
		if (!ok) {
			const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
			throw new Error(
				`RATE_LIMITED:Veuillez patienter ${waitSeconds} secondes avant de relancer une session vocale.`,
			);
		}

		const { tools, toolNames } = toolsResult;

		// ── 7. Résolution + validation de la locale ────────────────
		// Priorité : arg explicite > pref user > default. Si la valeur n'est
		// pas dans les 15 langues supportées (cf. lib/iastedLocales.ts), on
		// retombe silencieusement sur fr-FR — le client est responsable de
		// ne pas envoyer de codes invalides depuis le sélecteur Réglages.
		const requestedLocale =
			args.locale ?? voicePrefs?.preferredLocale ?? DEFAULT_IASTED_LOCALE;
		const locale = isIastedLocaleSupported(requestedLocale)
			? requestedLocale
			: DEFAULT_IASTED_LOCALE;

		// ── 8. Build du system prompt diplomatique ────────────────
		const tPromptStart = Date.now();
		const promptResult = await ctx.runQuery(
			internal.ai.iastedRealtimePrompt.buildPrompt,
			{
				userId: user._id as Id<"users">,
				orgId: args.orgId,
				surface: args.surface,
				toolNames,
				locale,
			},
		);
		timings.q_buildPrompt_ms = Date.now() - tPromptStart;

		// ── 8. Validation de la voix demandée ─────────────────────
		// Priorité : arg explicite > pref user > default.
		const userPreferred = voicePrefs?.preferredVoice as RealtimeVoice | undefined;
		const requestedVoice = (args.voice as RealtimeVoice | undefined) ?? userPreferred;
		const voice: RealtimeVoice =
			requestedVoice && SUPPORTED_VOICES.has(requestedVoice)
				? requestedVoice
				: DEFAULT_VOICE;

		// ── 9. Appel OpenAI Realtime API (GA shape) ───────────────
		// Endpoint GA : POST /v1/realtime/client_secrets avec body wrappé
		// `{ session: { type: "realtime", model, audio: {...}, ... } }`.
		// `audio.input.format` et `audio.output.format` sont des objets
		// `{ type: "audio/pcm", rate: 24000 }` (la string `"pcm16"` du
		// shape Beta est rejetée depuis le 12 mai 2026).
		//
		// VAD : `silence_duration_ms: 300` validé p50 < 700 ms en Ronde 3.
		// `IASTED_VAD_MODE=semantic_vad` (env Convex) bascule en semantic_vad
		// pour A/B test des hésitations diplomatiques.
		const turnDetection =
			process.env.IASTED_VAD_MODE === "semantic_vad"
				? {
					type: "semantic_vad",
					eagerness: "auto",
					interrupt_response: true,
					create_response: true,
				}
				: {
					type: "server_vad",
					threshold: 0.5,
					prefix_padding_ms: 300,
					silence_duration_ms: 300,
					interrupt_response: true,
					create_response: true,
				};

		const buildSessionBody = (model: string) => ({
			session: {
				type: "realtime",
				model,
				instructions: promptResult.prompt,
				tool_choice: "auto",
				tools,
				output_modalities: ["audio"],
				audio: {
					input: {
						format: { type: "audio/pcm", rate: 24000 },
						// `gpt-4o-mini-transcribe` : 2–3× plus rapide que whisper-1
						// (~120 ms vs ~300 ms), meilleur sur accents francophones
						// d'Afrique. `language` retiré pour auto-détection.
						transcription: { model: "gpt-4o-mini-transcribe" },
						turn_detection: turnDetection,
					},
					output: {
						format: { type: "audio/pcm", rate: 24000 },
						voice,
					},
				},
			},
		});

		const callOpenAI = (model: string) =>
			fetch("https://api.openai.com/v1/realtime/client_secrets", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(buildSessionBody(model)),
			});

		try {
			const tOpenAIStart = Date.now();
			// Sprint 10 — H3 : sélection A/B testing par userId.
			// Le cache reste prioritaire pour absorber les indisponibilités
			// globales du modèle préféré (cold start fallback).
			const abTestModel = selectModelForUser(String(user._id));
			let activeModel = cachedActiveModel ?? abTestModel;
			timings.ab_test_model = abTestModel === FALLBACK_MODEL ? 1 : 0;
			let response = await callOpenAI(activeModel);

			// Fallback automatique si la mini n'est pas disponible côté compte/GA.
			if (!response.ok && activeModel === PREFERRED_MODEL) {
				const probeBody = await response.text();
				const isModelError =
					probeBody.includes("model_not_found") ||
					probeBody.includes("invalid_model") ||
					(response.status === 404 && probeBody.includes("model"));
				if (isModelError) {
					console.warn(
						`[realtimeToken] ${PREFERRED_MODEL} indisponible, fallback sur ${FALLBACK_MODEL}`,
					);
					activeModel = FALLBACK_MODEL;
					response = await callOpenAI(activeModel);
				} else {
					// Non-modèle error : reconstruire un Response pour le bloc suivant.
					response = new Response(probeBody, {
						status: response.status,
						headers: response.headers,
					});
				}
			}

			timings.openai_session_ms = Date.now() - tOpenAIStart;

			if (!response.ok) {
				const errorBody = await response.text();
				console.error("[realtimeToken] OpenAI API error:", response.status, errorBody);
				// Branche défensive : ne devrait jamais firer post-GA (endpoint
				// Beta retiré le 12 mai 2026). Conservée pour robustesse.
				if (
					response.status === 400 &&
					errorBody.includes("beta_api_shape_disabled")
				) {
					return {
						available: false,
						error: "OPENAI_BETA_DISABLED",
					};
				}
				return {
					available: false,
					error: `OPENAI_ERROR_${response.status}`,
				};
			}

			// Mémoriser le modèle gagnant pour les appels suivants du runtime.
			cachedActiveModel = activeModel;

			// Réponse GA flat : `{ value, expires_at, session: { id } }`.
			const data = (await response.json()) as {
				value?: string;
				expires_at?: number;
				session?: { id?: string };
				// Compat défensive avec l'ancien shape Beta (jamais en GA).
				id?: string;
				client_secret?: { value?: string; expires_at?: number };
			};

			const ephemeralKey = data.value ?? data.client_secret?.value;
			const sessionId =
				data.session?.id ?? data.id ?? `sess_${Date.now()}`;
			if (!ephemeralKey) {
				return {
					available: false,
					error: "OPENAI_INVALID_RESPONSE",
				};
			}

			const expiresAtTs =
				data.expires_at ?? data.client_secret?.expires_at;
			const expiresAt = expiresAtTs
				? new Date(expiresAtTs * 1000).toISOString()
				: undefined;

			// ── 10. Persiste la session côté Convex (supervision + coût) ──
			// Optimisation latence (Phase 3) : fire-and-forget via scheduler.
			// `scheduler.runAfter(0, ...)` enqueue la mutation pour exécution
			// post-action, gain ~30-80 ms vs await direct, ET pas de warning
			// Convex « dangling promise » comme avec `void runMutation` qui
			// risquait d'être killé avant exécution (cf. Bug 4 fix).
			try {
				await ctx.scheduler.runAfter(
					0,
					internal.ai.realtimeSessions.insertActiveInternal,
					{
						externalSessionId: sessionId,
						userId: user._id as Id<"users">,
						orgId: args.orgId,
						surface: args.surface,
						model: activeModel,
						voice,
					},
				);
			} catch (sessionErr) {
				console.warn(
					"[realtimeToken] session tracking schedule failed:",
					sessionErr,
				);
			}

			// ── Log final timing — JSON-line pour parsing facile ────
			// Note : `m_insertActive_ms` n'est pas mesuré (la mutation est en
			// fire-and-forget après Phase 3) — c'est intentionnel : si on la
			// mesurait, on devrait l'attendre.
			timings.total_ms = Date.now() - tStart;
			console.log(
				"[realtimeToken.timing]",
				JSON.stringify({
					surface: args.surface,
					sessionId,
					promptChars: promptResult.prompt.length,
					toolCount: tools?.length ?? 0,
					...timings,
				}),
			);

			// Sprint 5 — G1 : lecture du status quota global (best-effort,
			// non bloquant). Le client peut afficher un toast informatif ou
			// adapter son comportement. Erreur silencieuse → quotaLevel null.
			let quotaLevel: "approaching" | "warning" | "exceeded" | null = null;
			let quotaRatio: number | undefined;
			try {
				const quota = await ctx.runQuery(
					internal.ai.realtimeSessions.getGlobalQuotaStatusInternal,
					{},
				);
				quotaLevel = quota?.level ?? null;
				quotaRatio = typeof quota?.ratio === "number" ? quota.ratio : undefined;
			} catch (qErr) {
				console.warn("[realtimeToken] quota check failed:", qErr);
			}

			return {
				available: true,
				ephemeralKey,
				sessionId,
				model: activeModel,
				systemPrompt: promptResult.prompt,
				tools,
				voice,
				expiresAt,
				locale,
				quotaLevel,
				quotaRatio,
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

/**
 * Keep-alive du runtime Node ou vit `realtimeToken.create`.
 *
 * Sans ping regulier, l'isolate Node Convex se met en sommeil apres ~10-15 min
 * d'inactivite et le prochain appel paie 1-3s de cold start (chargement V8 +
 * resolution des dependances) qui s'additionne au RTT OpenAI. Le cron declenche
 * cette no-op toutes les 4 min — sous le seuil de sommeil — pour que le premier
 * `create()` apres une periode calme demarre a chaud.
 *
 * Cout : negligeable (no-op + cache prime).
 */
export const keepAliveNodeRuntime = internalAction({
	args: {},
	handler: async () => {
		return { warm: true, at: Date.now() };
	},
});

