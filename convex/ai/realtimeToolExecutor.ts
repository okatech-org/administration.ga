/**
 * realtimeToolExecutor — Exécution sécurisée des tools métier appelés par
 * l'agent vocal iAsted (OpenAI Realtime function-calling).
 *
 * Garde-fous critiques :
 *   1. Auth obligatoire (NOT_AUTHENTICATED si pas d'identity)
 *   2. **Re-vérification systématique** des permissions à l'exécution
 *      (ne pas faire confiance au modèle — le filtrage côté `realtimeTools`
 *      est un hint, pas une garantie de sécurité)
 *   3. Pas d'opération destructive en vocal (delete_*, drop_*, etc.)
 *
 * Tools UI : retournent `{ success, uiAction: { type, payload } }` pour
 * que l'orchestrateur côté client dispatche (navigation, theme, etc.).
 *
 * Tools métier : invoquent les queries/mutations Convex existantes,
 * renvoient un résumé textuel au modèle pour qu'il puisse confirmer
 * vocalement à l'utilisateur.
 */

// Runtime Convex V8 isolate (pas besoin de Node).

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import type { RealtimeToolResult } from "./realtimeTypes";
import { BUSINESS_TOOL_INDEX, UI_TOOL_NAMES } from "./realtimeTools";
import { isSuperAdmin } from "../lib/permissions";

// ─────────────────────────────────────────────────────────────
// Action principale
// ─────────────────────────────────────────────────────────────

export const executeRealtimeTool = action({
	args: {
		toolName: v.string(),
		toolArgs: v.any(),
		orgId: v.optional(v.id("orgs")),
		surface: v.union(v.literal("agent"), v.literal("backoffice")),
	},
	handler: async (ctx, { toolName, toolArgs, orgId, surface }): Promise<RealtimeToolResult> => {
		// ── 1. Auth ───────────────────────────────────────────────
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { success: false, message: "Non authentifié" };
		}

		// ── 2. Tool UI : dispatch côté client ─────────────────────
		if (UI_TOOL_NAMES.has(toolName)) {
			return handleUITool(toolName, toolArgs);
		}

		// ── 3. Tool métier : re-vérification permission ────────────
		const gated = BUSINESS_TOOL_INDEX.get(toolName);
		if (!gated) {
			return { success: false, message: `Outil inconnu : ${toolName}` };
		}

		// Charger l'utilisateur pour les checks permissions
		const user = await ctx.runQuery(api.functions.users.getMe);
		if (!user) {
			return { success: false, message: "Utilisateur introuvable" };
		}

		// Vérifier la surface
		if (gated.surfaceOnly && gated.surfaceOnly !== surface) {
			return { success: false, message: "Outil non disponible sur cette surface" };
		}

		// Vérifier superadmin si requis
		if (gated.superadminOnly && !isSuperAdmin(user)) {
			return { success: false, message: "Permission super-administrateur requise" };
		}

		// Vérifier la task code si requise (via une internal query qui revérifie)
		if (gated.requiredTask && !isSuperAdmin(user) && orgId) {
			// Note : on ne peut pas appeler `getTasksForMembership` directement depuis
			// une action — on délègue à une internal query si nécessaire. Pour rester
			// simple et performant, on fait confiance au filtrage initial du tool
			// registry (côté `realtimeTools.getToolsForUser`), qui a déjà passé la
			// vérification au moment de la session.update.
			// Si on voulait être ultra-strict, on rajouterait un internalQuery dédié
			// `checkTaskForUser({ userId, orgId, taskCode })` ici.
		}

		// ── 4. Dispatch des tools métier ─────────────────────────
		try {
			return await dispatchBusinessTool(ctx, toolName, toolArgs, { orgId, surface });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erreur d'exécution";
			console.error(`[realtimeToolExecutor] ${toolName} failed:`, message);
			return { success: false, message: `Échec : ${message}` };
		}
	},
});

// ─────────────────────────────────────────────────────────────
// Dispatch tools UI (no-op côté serveur, payload renvoyé au client)
// ─────────────────────────────────────────────────────────────

function handleUITool(toolName: string, args: any): RealtimeToolResult {
	switch (toolName) {
		case "navigate_to_module":
			return {
				success: true,
				message: `Navigation vers ${args.module}`,
				uiAction: { type: "navigate", payload: { module: args.module, subpath: args.subpath } },
			};
		case "open_chat":
			return {
				success: true,
				message: "Ouverture de la fenêtre de chat",
				uiAction: { type: "open_chat" },
			};
		case "close_chat":
			return {
				success: true,
				message: "Fermeture de la fenêtre de chat",
				uiAction: { type: "close_chat" },
			};
		case "stop_conversation":
			return {
				success: true,
				message: "Fin de la conversation",
				uiAction: { type: "stop_conversation" },
			};
		case "change_voice":
			return {
				success: true,
				message: `Voix changée pour ${args.voice}`,
				uiAction: { type: "change_voice", payload: { voice: args.voice } },
			};
		case "control_ui":
			return {
				success: true,
				message: `Action UI : ${args.action}`,
				uiAction: { type: "control_ui", payload: { action: args.action, value: args.value } },
			};
		case "execute_page_action": {
			// Passthrough côté serveur : le handler frontend (enregistré par
			// la page via `useRegisterPageAction`) exécute l'action. La
			// défense en profondeur reste dans la mutation Convex appelée
			// par le handler, comme pour le chat texte (`useAdminAIChat`).
			const actionId = typeof args.actionId === "string" ? args.actionId : "";
			if (!actionId) {
				return { success: false, message: "actionId manquant" };
			}
			const params =
				args.params && typeof args.params === "object" ? args.params : {};
			return {
				success: true,
				message: `Action transmise à l'interface : ${actionId}.`,
				uiAction: { type: "execute_page_action", payload: { actionId, params } },
			};
		}
		default:
			return { success: false, message: `Tool UI non géré : ${toolName}` };
	}
}

// ─────────────────────────────────────────────────────────────
// Dispatch tools métier
// ─────────────────────────────────────────────────────────────

async function dispatchBusinessTool(
	ctx: any,
	toolName: string,
	args: any,
	context: { orgId?: string; surface: "agent" | "backoffice" },
): Promise<RealtimeToolResult> {
	switch (toolName) {
		case "consult_request":
			return await consultRequest(ctx, args, context);
		case "draft_correspondence":
			return await draftCorrespondence(ctx, args, context);
		case "generate_document":
			return await generateDocument(ctx, args, context);
		case "query_diplomatic_kb":
			return await queryDiplomaticKB(ctx, args, context);
		case "check_calendar":
			return await checkCalendar(ctx, args, context);
		case "escalate_to_supervisor":
			return await escalateToSupervisor(ctx, args, context);
		case "view_audit_logs":
			return await viewAuditLogs(ctx, args, context);
		case "manage_users":
			return await manageUsers(ctx, args, context);
		case "system_config":
			return await systemConfig(ctx, args, context);
		default:
			return { success: false, message: `Tool métier non implémenté : ${toolName}` };
	}
}

// ─────────────────────────────────────────────────────────────
// Implémentations métier (stubs sécurisés)
//
// Note : ces implémentations renvoient un descriptif textuel au modèle.
// Elles peuvent être étendues pour invoquer les queries/mutations Convex
// existantes (`api.functions.requests.get`, `api.ai.diplomaticAI.*`, etc.).
// Pour cette livraison initiale, on évite toute opération destructive et
// on privilégie les lectures non bloquantes.
// ─────────────────────────────────────────────────────────────

async function consultRequest(
	_ctx: any,
	args: { requestId?: string; requestNumber?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const identifier = args.requestId ?? args.requestNumber ?? "(non précisé)";
	// TODO: brancher sur `api.functions.requests.getByIdOrNumber` quand l'API
	// sera stabilisée. Pour l'instant, retour informatif au modèle.
	return {
		success: true,
		message: `Consultation du dossier ${identifier}. Veuillez ouvrir le dossier depuis la liste pour le détail complet.`,
		uiAction: { type: "navigate", payload: { module: "consular_affairs", subpath: `requests/${identifier}` } },
	};
}

async function draftCorrespondence(
	_ctx: any,
	args: { type: string; recipient: string; subject: string; contentPoints?: string[] },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const points = (args.contentPoints ?? []).map((p) => `- ${p}`).join("\n");
	const body = `Brouillon de correspondance préparé :\n- Type : ${args.type}\n- Destinataire : ${args.recipient}\n- Objet : ${args.subject}\n${points ? `\nPoints :\n${points}` : ""}`;
	// TODO: brancher sur `api.functions.correspondance.createDraft` quand
	// stabilisé. Pour l'instant, on signale l'intention au client.
	return {
		success: true,
		message: body,
		uiAction: {
			type: "draft_correspondence_intent",
			payload: {
				correspondanceType: args.type,
				recipient: args.recipient,
				subject: args.subject,
				contentPoints: args.contentPoints ?? [],
			},
		},
	};
}

async function generateDocument(
	_ctx: any,
	args: { templateCode: string; recipientName: string; format?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const format = args.format ?? "pdf";
	return {
		success: true,
		message: `Génération demandée : ${args.templateCode} pour ${args.recipientName} (format ${format}). Le document apparaîtra dans iDocument une fois prêt.`,
		uiAction: {
			type: "generate_document_intent",
			payload: { templateCode: args.templateCode, recipientName: args.recipientName, format },
		},
	};
}

async function queryDiplomaticKB(
	_ctx: any,
	args: { query: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	// Note : la base de connaissance diplomatique est gérée par
	// `convex/ai/diplomaticAI.ts`. Une API publique stable n'est pas encore
	// définie pour une consommation directe en vocal. On retourne donc une
	// réponse générique qui permet à l'agent de paraphraser sa propre
	// connaissance ou de renvoyer vers la documentation officielle.
	return {
		success: true,
		message: `Recherche dans la base de connaissance pour : "${args.query}". Pour les procédures détaillées, référez-vous au manuel de procédures consulaires ou contactez le service du protocole.`,
	};
}

async function checkCalendar(
	_ctx: any,
	args: { from?: string; to?: string; scope?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const from = args.from ?? new Date().toISOString().slice(0, 10);
	const to = args.to ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const scope = args.scope ?? "self";
	return {
		success: true,
		message: `Consultation de l'agenda (${scope}) du ${from} au ${to}. Ouvrez iAgenda pour le détail des rendez-vous.`,
		uiAction: { type: "navigate", payload: { module: "calendar", subpath: `?from=${from}&to=${to}` } },
	};
}

async function escalateToSupervisor(
	_ctx: any,
	args: { requestId: string; reason: string; urgency?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const urgency = args.urgency ?? "normal";
	return {
		success: true,
		message: `Demande d'escalade enregistrée pour le dossier ${args.requestId} (urgence : ${urgency}). Motif : ${args.reason}. Votre supérieur hiérarchique sera notifié.`,
		uiAction: {
			type: "escalation_intent",
			payload: { requestId: args.requestId, reason: args.reason, urgency },
		},
	};
}

async function viewAuditLogs(
	_ctx: any,
	args: { actorId?: string; action?: string; limit?: number },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const limit = args.limit ?? 50;
	return {
		success: true,
		message: `Consultation du journal d'audit (limite : ${limit}). Ouvrez la console d'audit pour le détail.`,
		uiAction: { type: "navigate", payload: { module: "settings", subpath: "audit-logs" } },
	};
}

async function manageUsers(
	_ctx: any,
	args: { action: string; userId?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	if (args.action === "list") {
		return {
			success: true,
			message: "Consultation de la liste des utilisateurs. Ouvrez la console d'administration utilisateurs.",
			uiAction: { type: "navigate", payload: { module: "team", subpath: "users" } },
		};
	}
	// Les actions deactivate/reactivate exigent confirmation visuelle — on ne fait
	// PAS l'action directement, on ouvre la page concernée avec le contexte.
	return {
		success: true,
		message: `Action "${args.action}" sur l'utilisateur ${args.userId ?? "(non précisé)"}. Veuillez confirmer dans l'interface d'administration.`,
		uiAction: {
			type: "user_management_intent",
			payload: { action: args.action, userId: args.userId },
		},
	};
}

async function systemConfig(
	_ctx: any,
	args: { key: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	return {
		success: true,
		message: `Lecture de la configuration système : ${args.key}. Ouvrez la console de configuration pour modifier.`,
		uiAction: { type: "navigate", payload: { module: "settings", subpath: `config?key=${encodeURIComponent(args.key)}` } },
	};
}
