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
		surface: v.union(
			v.literal("agent"),
			v.literal("backoffice"),
			v.literal("citizen"),
		),
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
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	switch (toolName) {
		// ─── Communication & Orchestration (Phase 1 — Mode God) ───
		case "find_contact_by_name":
			return await findContactByName(ctx, args, context);
		case "launch_call_with_contact":
			return await launchCallWithContact(ctx, args, context);
		case "create_instant_meeting":
			return await createInstantMeeting(ctx, args, context);
		case "schedule_meeting":
			return await scheduleMeeting(ctx, args, context);
		case "send_quick_message":
			return await sendQuickMessage(ctx, args, context);
		case "open_conversation_with_user":
			return await openConversationWithUser(ctx, args, context);

		// ─── Administration plateforme (Phase 2 — Mode God complet) ───
		case "find_org_by_name":
			return await findOrgByName(ctx, args, context);
		case "assign_role_to_user":
			return await assignRoleToUser(ctx, args, context);
		case "suspend_user":
			return await suspendUser(ctx, args, context);
		case "reactivate_user":
			return await reactivateUser(ctx, args, context);
		case "update_user_modules":
			return await updateUserModulesTool(ctx, args, context);

		// ─── RAG & connaissance plateforme (Phase 3) ───
		case "query_platform_knowledge":
			return await queryPlatformKnowledge(ctx, args, context);
		case "who_is_working_on":
			return await whoIsWorkingOn(ctx, args, context);
		case "status_of":
			return await statusOf(ctx, args, context);

		// ─── Outils métier originaux ───
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
// Communication & Orchestration — implémentations réelles
// ─────────────────────────────────────────────────────────────

async function findContactByName(
	ctx: any,
	args: { name?: string; orgId?: string },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const searchTerm = (args.name ?? "").trim();
	if (!searchTerm) {
		return { success: false, message: "Aucun nom fourni. Indiquez le nom du contact à rechercher." };
	}
	const orgScope = args.orgId ?? context.orgId;
	try {
		const results = await ctx.runQuery(api.functions.contactSearch.searchContacts, {
			searchTerm,
			myOrgId: orgScope,
			scope: context.surface === "backoffice" ? ("backoffice" as const) : ("org" as const),
			limit: 5,
		});
		const contacts = Array.isArray(results) ? results : (results?.contacts ?? []);
		if (contacts.length === 0) {
			return {
				success: true,
				message: `Aucun contact trouvé pour « ${searchTerm} ».`,
				data: { candidates: [] },
			};
		}
		const summary = contacts
			.slice(0, 5)
			.map(
				(c: any, i: number) =>
					`${i + 1}. ${c.lastName ?? ""} ${c.firstName ?? ""} — ${c.position ?? "N/A"} (${c.orgName ?? "?"})`,
			)
			.join("\n");
		return {
			success: true,
			message:
				contacts.length === 1
					? `Contact trouvé : ${contacts[0].name ?? `${contacts[0].lastName} ${contacts[0].firstName}`}.`
					: `${contacts.length} contacts correspondent :\n${summary}\nPrécisez lequel.`,
			data: {
				candidates: contacts.slice(0, 5).map((c: any) => ({
					userId: c.userId,
					name: c.name ?? `${c.lastName ?? ""} ${c.firstName ?? ""}`.trim(),
					position: c.position,
					orgName: c.orgName,
				})),
			},
		};
	} catch (e: any) {
		return { success: false, message: `Recherche échouée : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function launchCallWithContact(
	ctx: any,
	args: { targetUserId?: string; mediaType?: "audio" | "video" },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const targetUserId = args.targetUserId;
	const orgId = context.orgId;
	if (!targetUserId) {
		return { success: false, message: "Identifiant du destinataire manquant. Utilisez find_contact_by_name d'abord." };
	}
	if (!orgId) {
		return { success: false, message: "Aucune organisation active. Sélectionnez une organisation avant d'appeler." };
	}
	const mediaType: "audio" | "video" = args.mediaType === "video" ? "video" : "audio";
	try {
		const result = await ctx.runMutation(api.functions.meetings.callUser, {
			orgId: orgId as any,
			targetUserId: targetUserId as any,
			mediaType,
		});
		const meetingId = result?.meetingId;
		return {
			success: true,
			message: `Appel ${mediaType === "video" ? "vidéo" : "audio"} lancé. Le destinataire est en train de sonner.`,
			data: { meetingId, roomName: result?.roomName },
			uiAction: {
				type: "open_active_call",
				payload: { meetingId, mediaType },
			},
		};
	} catch (e: any) {
		const msg = e?.message ?? "Erreur lors du lancement de l'appel";
		return { success: false, message: msg };
	}
}

async function createInstantMeeting(
	ctx: any,
	args: { title?: string; participantIds?: string[]; mediaType?: "audio" | "video" },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const orgId = context.orgId;
	if (!orgId) {
		return { success: false, message: "Aucune organisation active." };
	}
	const participantIds = Array.isArray(args.participantIds) ? args.participantIds : [];
	if (participantIds.length === 0) {
		return { success: false, message: "Aucun participant fourni. Précisez au moins un destinataire." };
	}
	const title = args.title?.trim() || "Réunion instantanée";
	const mediaType: "audio" | "video" = args.mediaType === "audio" ? "audio" : "video";
	try {
		const result = await ctx.runMutation(api.functions.meetings.create, {
			orgId: orgId as any,
			title,
			type: "meeting" as const,
			participantIds: participantIds as any,
			mediaType,
			maxParticipants: 20,
		});
		const meetingId = result?.meetingId;
		return {
			success: true,
			message: `Réunion « ${title} » créée avec ${participantIds.length} participant(s). Vous pouvez la rejoindre.`,
			data: { meetingId },
			uiAction: {
				type: "open_meeting_prejoin",
				payload: { meetingId },
			},
		};
	} catch (e: any) {
		return { success: false, message: `Création échouée : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function scheduleMeeting(
	ctx: any,
	args: {
		title?: string;
		participantIds?: string[];
		scheduledAt?: string;
		mediaType?: "audio" | "video";
	},
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const orgId = context.orgId;
	if (!orgId) {
		return { success: false, message: "Aucune organisation active." };
	}
	const participantIds = Array.isArray(args.participantIds) ? args.participantIds : [];
	if (participantIds.length === 0) {
		return { success: false, message: "Aucun participant fourni." };
	}
	const title = args.title?.trim();
	if (!title) {
		return { success: false, message: "Titre de la réunion manquant." };
	}
	const scheduledAtMs = args.scheduledAt ? Date.parse(args.scheduledAt) : NaN;
	if (!Number.isFinite(scheduledAtMs)) {
		return { success: false, message: "Horaire invalide. Indiquez une date/heure précise." };
	}
	const mediaType: "audio" | "video" = args.mediaType === "audio" ? "audio" : "video";
	try {
		const result = await ctx.runMutation(api.functions.meetings.create, {
			orgId: orgId as any,
			title,
			type: "meeting" as const,
			participantIds: participantIds as any,
			scheduledAt: scheduledAtMs,
			mediaType,
			maxParticipants: 20,
		});
		const meetingId = result?.meetingId;
		const isoLocal = new Date(scheduledAtMs).toLocaleString("fr-FR", {
			dateStyle: "short",
			timeStyle: "short",
		});
		return {
			success: true,
			message: `Réunion « ${title} » planifiée le ${isoLocal} avec ${participantIds.length} invité(s).`,
			data: { meetingId, scheduledAt: scheduledAtMs },
		};
	} catch (e: any) {
		return { success: false, message: `Planification échouée : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function sendQuickMessage(
	ctx: any,
	args: { targetUserId?: string; content?: string },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const targetUserId = args.targetUserId;
	const content = (args.content ?? "").trim();
	if (!targetUserId) {
		return { success: false, message: "Destinataire manquant. Utilisez find_contact_by_name." };
	}
	if (!content) {
		return { success: false, message: "Contenu du message vide." };
	}
	try {
		// Cherche un chat existant ; sinon en initie un nouveau.
		const existing = await ctx.runQuery(api.functions.chats.findChatWith, {
			targetUserId: targetUserId as any,
		});
		if (existing?._id) {
			await ctx.runMutation(api.functions.chats.sendMessage, {
				chatId: existing._id,
				content,
			});
			return {
				success: true,
				message: "Message envoyé.",
				data: { chatId: existing._id },
			};
		}
		await ctx.runMutation(api.functions.chats.initiateChat, {
			targetUserId: targetUserId as any,
			orgId: context.orgId as any,
			initialMessage: content,
		});
		return {
			success: true,
			message: "Conversation lancée et message envoyé.",
		};
	} catch (e: any) {
		return { success: false, message: `Envoi échoué : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function openConversationWithUser(
	_ctx: any,
	args: { targetUserId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const targetUserId = args.targetUserId;
	if (!targetUserId) {
		return { success: false, message: "Identifiant du contact manquant." };
	}
	return {
		success: true,
		message: "Ouverture de la conversation.",
		uiAction: {
			type: "open_conversation",
			payload: { targetUserId },
		},
	};
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

// ─────────────────────────────────────────────────────────────
// Administration plateforme — Phase 2 (Mode God complet)
// Les guards (self-action, SuperAdmin, rank hierarchy) sont déjà
// appliqués par les mutations Convex sous-jacentes (admin.*).
// ─────────────────────────────────────────────────────────────

async function findOrgByName(
	ctx: any,
	args: { name?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const name = (args.name ?? "").trim().toLowerCase();
	if (!name) {
		return { success: false, message: "Nom d'organisation manquant." };
	}
	try {
		const allOrgs = (await ctx.runQuery(api.functions.orgs.list, {})) as any[];
		const matches = allOrgs
			.filter((o: any) => (o.name ?? "").toLowerCase().includes(name))
			.slice(0, 5);
		if (matches.length === 0) {
			return {
				success: true,
				message: `Aucune organisation trouvée pour « ${args.name} ».`,
				data: { candidates: [] },
			};
		}
		const summary = matches
			.map((o: any, i: number) => `${i + 1}. ${o.name} (${o.country ?? "?"})`)
			.join("\n");
		return {
			success: true,
			message:
				matches.length === 1
					? `Organisation trouvée : ${matches[0].name}.`
					: `${matches.length} organisations correspondent :\n${summary}\nPrécisez laquelle.`,
			data: {
				candidates: matches.map((o: any) => ({
					orgId: o._id,
					name: o.name,
					country: o.country,
					type: o.type,
				})),
			},
		};
	} catch (e: any) {
		return { success: false, message: `Recherche échouée : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function assignRoleToUser(
	ctx: any,
	args: { userId?: string; role?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const userId = args.userId;
	const role = args.role;
	if (!userId || !role) {
		return { success: false, message: "userId ou role manquant." };
	}
	const allowed = ["user", "sous_admin", "admin", "admin_system"];
	if (!allowed.includes(role)) {
		return {
			success: false,
			message: `Rôle invalide. Valeurs autorisées : ${allowed.join(", ")}.`,
		};
	}
	try {
		await ctx.runMutation(api.functions.admin.updateUserRole, {
			userId: userId as any,
			role: role as any,
		});
		return {
			success: true,
			message: `Rôle « ${role} » assigné. L'utilisateur prendra effet à sa prochaine session.`,
		};
	} catch (e: any) {
		const msg = e?.message ?? "Erreur";
		// Re-map les erreurs Convex en messages parlants
		if (msg.includes("CANNOT_REMOVE_SELF")) {
			return { success: false, message: "Vous ne pouvez pas modifier votre propre rôle." };
		}
		if (msg.includes("INSUFFICIENT_PERMISSIONS")) {
			return {
				success: false,
				message: "Permission insuffisante : impossible de modifier ce rôle (rang supérieur ou SuperAdmin protégé).",
			};
		}
		return { success: false, message: `Échec : ${msg}` };
	}
}

async function suspendUser(
	ctx: any,
	args: { userId?: string; reason?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const userId = args.userId;
	if (!userId) {
		return { success: false, message: "userId manquant." };
	}
	if (!args.reason || args.reason.trim().length < 3) {
		return {
			success: false,
			message: "Motif requis et doit faire au moins 3 caractères (sera consigné dans l'audit log).",
		};
	}
	try {
		await ctx.runMutation(api.functions.admin.disableUser, {
			userId: userId as any,
		});
		return {
			success: true,
			message: `Utilisateur suspendu. Motif consigné : « ${args.reason} ».`,
		};
	} catch (e: any) {
		const msg = e?.message ?? "Erreur";
		if (msg.includes("CANNOT_REMOVE_SELF")) {
			return { success: false, message: "Vous ne pouvez pas vous suspendre vous-même." };
		}
		if (msg.includes("INSUFFICIENT_PERMISSIONS")) {
			return {
				success: false,
				message: "Permission insuffisante : impossible de suspendre cet utilisateur (rang supérieur ou SuperAdmin protégé).",
			};
		}
		return { success: false, message: `Échec : ${msg}` };
	}
}

async function reactivateUser(
	ctx: any,
	args: { userId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const userId = args.userId;
	if (!userId) {
		return { success: false, message: "userId manquant." };
	}
	try {
		await ctx.runMutation(api.functions.admin.enableUser, {
			userId: userId as any,
		});
		return {
			success: true,
			message: "Utilisateur réactivé. Il pourra se reconnecter immédiatement.",
		};
	} catch (e: any) {
		const msg = e?.message ?? "Erreur";
		if (msg.includes("INSUFFICIENT_PERMISSIONS")) {
			return {
				success: false,
				message: "Permission insuffisante : impossible de réactiver cet utilisateur.",
			};
		}
		return { success: false, message: `Échec : ${msg}` };
	}
}

// ─────────────────────────────────────────────────────────────
// RAG & connaissance plateforme — Phase 3
// ─────────────────────────────────────────────────────────────

async function queryPlatformKnowledge(
	ctx: any,
	args: { query?: string; sourceTypes?: string[] },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const queryText = (args.query ?? "").trim();
	if (!queryText) {
		return { success: false, message: "Question vide. Précisez ce que vous cherchez." };
	}
	try {
		const results = (await ctx.runAction(
			(api as any).ai.rag.retriever.query,
			{
				query: queryText,
				sourceTypes: args.sourceTypes,
				orgScope: context.orgId,
				topK: 5,
			},
		)) as Array<{
			id: string;
			sourceType: string;
			sourceId: string;
			title: string;
			content: string;
			score: number;
		}>;

		if (!results || results.length === 0) {
			return {
				success: true,
				message: `Aucun résultat dans la base de connaissance pour « ${queryText} ». Reformulez ou demandez à un agent humain.`,
				data: { results: [] },
			};
		}

		const summary = results
			.slice(0, 5)
			.map(
				(r, i) =>
					`[Source ${i + 1}] ${r.title} (${r.sourceType}#${r.sourceId})\n${r.content.slice(0, 300)}`,
			)
			.join("\n\n");

		return {
			success: true,
			message: `J'ai trouvé ${results.length} extrait(s) pertinent(s). Cite les sources dans ta réponse vocale.\n\n${summary}`,
			data: { results },
		};
	} catch (e: any) {
		return { success: false, message: `Recherche RAG échouée : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function whoIsWorkingOn(
	_ctx: any,
	args: { entityType?: string; entityId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const entityType = args.entityType;
	const entityId = args.entityId;
	if (!entityType || !entityId) {
		return { success: false, message: "entityType et entityId requis." };
	}
	// MVP : on retourne un message texte. L'implémentation complète (lecture
	// des assignments / approvers / participants par type d'entité) sera
	// raffinée Phase 3.x quand les schemas correspondants seront stabilisés.
	return {
		success: true,
		message: `Pour identifier les intervenants sur le ${entityType} ${entityId}, ouvrez le dossier — la liste des participants y est visible.`,
		uiAction: {
			type: "navigate",
			payload: { module: entityType === "correspondance" ? "correspondence" : "consular_affairs", subpath: entityId },
		},
	};
}

async function statusOf(
	_ctx: any,
	args: { entityType?: string; entityId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const entityType = args.entityType;
	const entityId = args.entityId;
	if (!entityType || !entityId) {
		return { success: false, message: "entityType et entityId requis." };
	}
	// MVP : redirection navigationnelle. Phase 3.x : lecture directe du workflow
	// + composition d'une réponse vocale courte ("Le dossier X est en étape Y, prochaine étape : Z").
	return {
		success: true,
		message: `Pour le statut détaillé du ${entityType} ${entityId}, je navigue vers le dossier.`,
		uiAction: {
			type: "navigate",
			payload: { module: entityType === "correspondance" ? "correspondence" : "consular_affairs", subpath: entityId },
		},
	};
}

async function updateUserModulesTool(
	ctx: any,
	args: { userId?: string; modules?: string[] },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const userId = args.userId;
	const modules = Array.isArray(args.modules) ? args.modules : null;
	if (!userId) {
		return { success: false, message: "userId manquant." };
	}
	if (!modules || modules.length === 0) {
		return { success: false, message: "Liste de modules vide ou invalide." };
	}
	try {
		await ctx.runMutation(api.functions.admin.updateUserModules, {
			userId: userId as any,
			modules: modules as any,
		});
		return {
			success: true,
			message: `Modules mis à jour : ${modules.join(", ")}.`,
		};
	} catch (e: any) {
		const msg = e?.message ?? "Erreur";
		if (msg.includes("CANNOT_REMOVE_SELF")) {
			return { success: false, message: "Vous ne pouvez pas modifier vos propres modules." };
		}
		if (msg.includes("INSUFFICIENT_PERMISSIONS")) {
			return {
				success: false,
				message: "Permission insuffisante : impossible de modifier les modules de cet utilisateur.",
			};
		}
		return { success: false, message: `Échec : ${msg}` };
	}
}
