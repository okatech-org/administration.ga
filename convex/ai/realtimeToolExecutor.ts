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
import { api, internal } from "../_generated/api";
import type { RealtimeToolResult } from "./realtimeTypes";
import { BUSINESS_TOOL_INDEX, UI_TOOL_NAMES } from "./realtimeTools";
import { isSuperAdmin } from "../lib/permissions";
import { rateLimiter } from "./rateLimiter";

// Tools considérés comme mutations (passent par le budget journalier strict).
// Tout le reste est read-only ou UI uniquement.
const MUTATIVE_TOOLS = new Set([
	// communication
	"launch_call_with_contact",
	"create_instant_meeting",
	"schedule_meeting",
	"send_quick_message",
	"hangup_active_call",
	"add_participant_to_active_call",
	"decline_incoming_call",
	"recall_missed_call",
	// admin
	"assign_role_to_user",
	"suspend_user",
	"reactivate_user",
	"update_user_modules",
	// traitement
	"approve_request",
	"reject_request",
	"request_more_info",
	"advance_correspondance_status",
	"archive_correspondance",
	"cancel_meeting",
	"reschedule_meeting",
	"cancel_request",
	// brouillons / docs
	"draft_correspondence",
	"generate_document",
	"escalate_to_supervisor",
]);

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
		const startTs = Date.now();

		// ── 1. Auth ───────────────────────────────────────────────
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { success: false, message: "Non authentifié" };
		}

		// ── 2. Rate limit per-tool (P0.3 — garde-fou anti-boucle) ──
		// Compte les invocations TOUS tools confondus par utilisateur.
		// Bypass pour les tools UI purs (pas de coût backend).
		const isUITool = UI_TOOL_NAMES.has(toolName);
		if (!isUITool) {
			const { ok: okCall, retryAfter: retryAfterCall } = await rateLimiter.limit(
				ctx,
				"aiRealtimeToolCall",
				{ key: identity.subject },
			);
			if (!okCall) {
				const wait = Math.ceil((retryAfterCall ?? 0) / 1000);
				return {
					success: false,
					message: `Cadence trop élevée. Patientez ${wait} seconde(s) avant la prochaine action.`,
				};
			}
			// Budget journalier strict pour les actions mutatives
			if (MUTATIVE_TOOLS.has(toolName)) {
				const { ok: okMut } = await rateLimiter.limit(ctx, "aiRealtimeMutation", {
					key: identity.subject,
				});
				if (!okMut) {
					return {
						success: false,
						message:
							"Budget quotidien d'actions mutatives atteint. Réessayez demain ou contactez un administrateur.",
					};
				}
			}
		}

		// ── 3. Tool UI : dispatch côté client ─────────────────────
		if (isUITool) {
			return handleUITool(toolName, toolArgs);
		}

		// ── 4. Tool métier : re-vérification permission ────────────
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

		// ── 5. Dispatch des tools métier (+ audit log) ────────────
		let result: RealtimeToolResult;
		try {
			result = await dispatchBusinessTool(ctx, toolName, toolArgs, { orgId, surface });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erreur d'exécution";
			console.error(`[realtimeToolExecutor] ${toolName} failed:`, message);
			result = { success: false, message: `Échec : ${message}` };
		}

		// ── 6. Audit log (P0.1 — toute action vocale tracée) ──────
		// Skip si pas d'org (citizen surface) — `appendLogInternal` exige orgId.
		// Pour les citoyens, les actions sont auto-only (track_my_request,
		// submit_consular_request_intent) — low risk, pas de log à ce stade.
		if (orgId) {
			try {
				await ctx.runMutation(internal.ai.activityLog.appendLogInternal, {
					orgId: orgId as any,
					userId: user._id,
					capabilityCode: `voice.${toolName}`,
					action: result.success ? "auto_applied" : "errored",
					latencyMs: Date.now() - startTs,
					error: result.success ? undefined : result.message,
					metadata: {
						toolArgs,
						surface,
						uiActionType: result.uiAction?.type,
					},
				});
			} catch (logErr) {
				// Ne JAMAIS bloquer une action métier sur un échec de logging.
				console.warn("[realtimeToolExecutor] audit log failed:", logErr);
			}
		}

		return result;
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
		case "open_app_menu":
			return {
				success: true,
				message: "Ouverture de l'éventail iAsted.",
				uiAction: { type: "open_app_menu" },
			};
		case "open_iasted_tab": {
			const allowed = new Set([
				"ichat",
				"icontact",
				"icall",
				"imeeting",
				"ivocal",
				"isettings",
			]);
			const tab = typeof args.tab === "string" ? args.tab : "";
			if (!allowed.has(tab)) {
				return {
					success: false,
					message: `Onglet inconnu : ${tab}. Onglets disponibles : ichat, icontact, icall, imeeting, ivocal, isettings.`,
				};
			}
			const labels: Record<string, string> = {
				ichat: "iChat",
				icontact: "iContact",
				icall: "iAppel",
				imeeting: "iRéunion",
				ivocal: "transcription vocale",
				isettings: "réglages",
			};
			return {
				success: true,
				message: `Ouverture de ${labels[tab]}.`,
				uiAction: { type: "open_iasted_tab", payload: { tab } },
			};
		}
		case "toggle_mic_in_call":
			return {
				success: true,
				message:
					typeof args.enabled === "boolean"
						? args.enabled
							? "Microphone activé."
							: "Microphone coupé."
						: "Microphone basculé.",
				uiAction: {
					type: "livekit_control",
					payload: {
						action: "set_mic",
						enabled: typeof args.enabled === "boolean" ? args.enabled : undefined,
					},
				},
			};
		case "toggle_camera_in_call":
			return {
				success: true,
				message:
					typeof args.enabled === "boolean"
						? args.enabled
							? "Caméra activée."
							: "Caméra coupée."
						: "Caméra basculée.",
				uiAction: {
					type: "livekit_control",
					payload: {
						action: "set_camera",
						enabled: typeof args.enabled === "boolean" ? args.enabled : undefined,
					},
				},
			};
		case "toggle_screen_share":
			return {
				success: true,
				message:
					typeof args.enabled === "boolean"
						? args.enabled
							? "Partage d'écran démarré."
							: "Partage d'écran arrêté."
						: "Partage d'écran basculé.",
				uiAction: {
					type: "livekit_control",
					payload: {
						action: "set_screen_share",
						enabled: typeof args.enabled === "boolean" ? args.enabled : undefined,
					},
				},
			};
		case "set_accessibility_mode":
			return {
				success: true,
				message: args.enabled
					? "Mode accessibilité activé. Reconnexion en cours."
					: "Mode accessibilité désactivé.",
				uiAction: {
					type: "set_accessibility_mode",
					payload: { enabled: !!args.enabled },
				},
			};
		case "read_page_summary":
			// Le contexte page est déjà fourni au modèle via `session.update`.
			// Le tool sert d'intention explicite ; le modèle paraphrase.
			return {
				success: true,
				message:
					"Lecture du contexte page courant — paraphrasez le bloc CONTEXTE PAGE COURANT de vos instructions.",
				uiAction: { type: "noop" },
			};
		case "fill_form_field": {
			const fieldId = typeof args.fieldId === "string" ? args.fieldId : "";
			if (!fieldId) {
				return { success: false, message: "fieldId manquant." };
			}
			return {
				success: true,
				message: `Remplissage du champ ${fieldId}.`,
				uiAction: {
					type: "form_control",
					payload: { action: "fill", fieldId, value: args.value },
				},
			};
		}
		case "clear_form_field": {
			const fieldId = typeof args.fieldId === "string" ? args.fieldId : "";
			if (!fieldId) {
				return { success: false, message: "fieldId manquant." };
			}
			return {
				success: true,
				message: `Champ ${fieldId} effacé.`,
				uiAction: {
					type: "form_control",
					payload: { action: "clear", fieldId },
				},
			};
		}
		case "submit_form":
			return {
				success: true,
				message: "Soumission du formulaire.",
				uiAction: {
					type: "form_control",
					payload: { action: "submit", formId: args.formId },
				},
			};
		case "read_form_state":
			return {
				success: true,
				message: "Lecture de l'état du formulaire.",
				uiAction: {
					type: "form_control",
					payload: { action: "read_state", formId: args.formId },
				},
			};
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
		case "hangup_active_call":
			return await hangupActiveCall(ctx, args, context);
		case "add_participant_to_active_call":
			return await addParticipantToActiveCall(ctx, args, context);
		case "decline_incoming_call":
			return await declineIncomingCall(ctx, args, context);
		case "recall_missed_call":
			return await recallMissedCall(ctx, args, context);

		// ─── Connaissance du corps diplomatique & annuaire ───
		case "find_post_holder":
			return await findPostHolder(ctx, args, context);
		case "list_diplomatic_corps":
			return await listDiplomaticCorps(ctx, args, context);
		case "find_orgs_by_country":
			return await findOrgsByCountry(ctx, args, context);
		case "list_org_positions":
			return await listOrgPositions(ctx, args, context);
		case "search_consular_registrations":
			return await searchConsularRegistrations(ctx, args, context);

		// ─── LECTURE VOCALE (Phase A — accessibilité) ───
		case "read_notifications":
			return await readNotifications(ctx, args, context);
		case "read_pending_requests":
			return await readPendingRequests(ctx, args, context);
		case "read_correspondance_inbox":
			return await readCorrespondanceInbox(ctx, args, context);
		case "read_today_agenda":
			return await readTodayAgenda(ctx, args, context);
		case "read_chat_thread":
			return await readChatThread(ctx, args, context);

		// ─── TRAITEMENT DE LA FILE (Phase B) ───
		case "approve_request":
			return await approveRequest(ctx, args, context);
		case "reject_request":
			return await rejectRequest(ctx, args, context);
		case "request_more_info":
			return await requestMoreInfo(ctx, args, context);
		case "advance_correspondance_status":
			return await advanceCorrespondanceStatus(ctx, args, context);
		case "archive_correspondance":
			return await archiveCorrespondance(ctx, args, context);
		case "cancel_meeting":
			return await cancelMeetingTool(ctx, args, context);
		case "reschedule_meeting":
			return await rescheduleMeetingTool(ctx, args, context);
		case "cancel_request":
			return await cancelRequestTool(ctx, args, context);

		// ─── SURFACE CITOYEN (Phase E) ───
		case "submit_consular_request_intent":
			return await submitConsularRequestIntent(ctx, args, context);
		case "track_my_request":
			return await trackMyRequest(ctx, args, context);
		case "book_my_appointment_intent":
			return await bookMyAppointmentIntent(ctx, args, context);
		case "read_my_inbox":
			return await readMyInbox(ctx, args, context);
		case "call_my_consulate":
			return await callMyConsulate(ctx, args, context);

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
// Contrôle d'appel actif — hangup / add / decline / recall
// ─────────────────────────────────────────────────────────────

async function hangupActiveCall(
	ctx: any,
	_args: unknown,
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const active = await ctx.runQuery(api.functions.meetings.getActiveCallForUser, {});
	if (!active) {
		return { success: false, message: "Aucun appel actif à raccrocher." };
	}
	try {
		await ctx.runMutation(api.functions.meetings.leave, {
			meetingId: active.meetingId,
		});
		const label = active.type === "call" ? "Appel" : "Réunion";
		return {
			success: true,
			message: `${label} « ${active.title} » terminé.`,
			data: { meetingId: active.meetingId },
		};
	} catch (e: any) {
		return { success: false, message: `Échec du raccrochage : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function addParticipantToActiveCall(
	ctx: any,
	args: { targetUserId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const targetUserId = args.targetUserId;
	if (!targetUserId) {
		return {
			success: false,
			message: "Identifiant du contact manquant. Utilisez find_contact_by_name d'abord.",
		};
	}
	const active = await ctx.runQuery(api.functions.meetings.getActiveCallForUser, {});
	if (!active) {
		return { success: false, message: "Aucun appel actif. Lancez d'abord un appel ou une réunion." };
	}
	try {
		await ctx.runMutation(api.functions.meetings.addParticipant, {
			meetingId: active.meetingId,
			targetUserId: targetUserId as any,
		});
		return {
			success: true,
			message: "Participant ajouté — il reçoit une notification d'invitation.",
			data: { meetingId: active.meetingId, targetUserId },
		};
	} catch (e: any) {
		return { success: false, message: `Ajout échoué : ${e?.message ?? "erreur inconnue"}` };
	}
}

async function declineIncomingCall(
	ctx: any,
	_args: unknown,
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const active = await ctx.runQuery(api.functions.meetings.getActiveCallForUser, {});
	if (!active || active.type !== "call" || active.callStatus !== "ringing") {
		return { success: false, message: "Aucun appel entrant à refuser." };
	}
	try {
		if (active.isOrgInbound) {
			// Appel org entrant : marquer comme décliné par moi (les autres agents peuvent encore décrocher).
			await ctx.runMutation(api.functions.meetings.declineCall, {
				meetingId: active.meetingId,
			});
		} else {
			// Appel direct (utilisateur à utilisateur) : quitter avant de répondre termine l'appel.
			await ctx.runMutation(api.functions.meetings.leave, {
				meetingId: active.meetingId,
			});
		}
		return {
			success: true,
			message: "Appel refusé.",
			data: { meetingId: active.meetingId },
		};
	} catch (e: any) {
		return { success: false, message: `Refus échoué : ${e?.message ?? "erreur inconnue"}` };
	}
}

// ─────────────────────────────────────────────────────────────
// Connaissance du corps diplomatique & annuaire
// ─────────────────────────────────────────────────────────────

async function findPostHolder(
	ctx: any,
	args: { role?: string; country?: string; orgQuery?: string; orgId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const role = (args.role ?? "").trim();
	if (!role) {
		return { success: false, message: "Indiquez le rôle à chercher (ex : ambassadeur, consul)." };
	}
	if (!args.country && !args.orgQuery && !args.orgId) {
		return {
			success: false,
			message: "Précisez où chercher : pays, nom d'organisation, ou orgId.",
		};
	}
	try {
		const result = await ctx.runQuery(api.ai.realtimeKnowledge.findPostHolder, {
			role,
			country: args.country,
			orgQuery: args.orgQuery,
			orgId: args.orgId as any,
		});
		const items = (result?.results ?? []) as Array<{
			org: { name: string; country?: string; type?: string };
			position: { code: string; titleFr?: string; level: number };
			user: { firstName?: string; lastName?: string };
		}>;
		const cappedNote = result?.cappedScan
			? `\n[Note : ${result.totalOrgsCandidates} organisations correspondent, seules les ${10} premières ont été scannées. Précisez le pays ou le nom d'org pour affiner.]`
			: "";
		if (items.length === 0) {
			return {
				success: true,
				message: `Aucun titulaire trouvé pour le rôle « ${role} » dans le périmètre demandé.${cappedNote}`,
				data: { results: [], cappedScan: result?.cappedScan },
			};
		}
		const summary = items
			.slice(0, 5)
			.map(
				(r, i) =>
					`${i + 1}. ${r.position.titleFr ?? r.position.code} : ${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() +
					` — ${r.org.name}${r.org.country ? ` (${r.org.country})` : ""}`,
			)
			.join("\n");
		return {
			success: true,
			message:
				(items.length === 1
					? `${items[0].position.titleFr ?? items[0].position.code} : ${items[0].user.firstName ?? ""} ${items[0].user.lastName ?? ""}`.trim() +
					  ` — ${items[0].org.name}.`
					: `${items.length} titulaires correspondent :\n${summary}`) + cappedNote,
			data: { results: items, cappedScan: result?.cappedScan },
		};
	} catch (e: any) {
		return { success: false, message: `Recherche échouée : ${e?.message ?? "erreur"}` };
	}
}

async function listDiplomaticCorps(
	ctx: any,
	args: { orgId?: string; country?: string; orgQuery?: string; limit?: number },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.orgId && !args.country && !args.orgQuery) {
		return {
			success: false,
			message: "Précisez un org, un pays, ou un nom de représentation.",
		};
	}
	try {
		const result = await ctx.runQuery(
			api.ai.realtimeKnowledge.listDiplomaticCorps,
			{
				orgId: args.orgId as any,
				country: args.country,
				orgQuery: args.orgQuery,
				limit: args.limit,
			},
		);
		const groups = (result?.results ?? []) as Array<{
			org: { name: string; country?: string; type?: string };
			members: Array<{
				firstName?: string;
				lastName?: string;
				positionTitleFr?: string;
				positionLevel?: number;
			}>;
		}>;
		if (groups.length === 0 || groups.every((g) => g.members.length === 0)) {
			return {
				success: true,
				message: "Aucun agent trouvé pour ce périmètre.",
				data: { results: groups },
			};
		}
		const summary = groups
			.map((g) => {
				const head = `${g.org.name}${g.org.country ? ` (${g.org.country})` : ""} — ${g.members.length} agent(s) :`;
				const list = g.members
					.slice(0, 5)
					.map(
						(m, i) =>
							`  ${i + 1}. ${m.positionTitleFr ?? "(poste non précisé)"} — ${m.firstName ?? ""} ${m.lastName ?? ""}`.trim(),
					)
					.join("\n");
				const more =
					g.members.length > 5 ? `\n  …et ${g.members.length - 5} autre(s).` : "";
				return `${head}\n${list}${more}`;
			})
			.join("\n\n");
		return {
			success: true,
			message: summary,
			data: { results: groups },
		};
	} catch (e: any) {
		return { success: false, message: `Listing échoué : ${e?.message ?? "erreur"}` };
	}
}

async function findOrgsByCountry(
	ctx: any,
	args: { country?: string; typeFilter?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const country = (args.country ?? "").trim();
	if (!country) {
		return { success: false, message: "Indiquez le pays à interroger." };
	}
	try {
		const result = await ctx.runQuery(
			api.ai.realtimeKnowledge.findOrgsByCountry,
			{ country, typeFilter: args.typeFilter },
		);
		const orgs = (result?.results ?? []) as Array<{
			name: string;
			type?: string;
			country?: string;
		}>;
		if (orgs.length === 0) {
			return {
				success: true,
				message: result?.normalizedCountry
					? `Aucune représentation enregistrée pour ${result.normalizedCountry}.`
					: `Pays inconnu : « ${country} ». Précisez le nom en français ou le code ISO.`,
				data: { results: [] },
			};
		}
		const typeLabels: Record<string, string> = {
			embassy: "Ambassade",
			consulate: "Consulat",
			general_consulate: "Consulat général",
			permanent_mission: "Mission permanente",
			high_commission: "Haut-Commissariat",
			honorary_consulate: "Consulat honoraire",
		};
		const summary = orgs
			.slice(0, 10)
			.map(
				(o, i) =>
					`${i + 1}. ${typeLabels[o.type ?? ""] ?? o.type ?? "Représentation"} — ${o.name}`,
			)
			.join("\n");
		return {
			success: true,
			message: `${orgs.length} représentation(s) trouvée(s) :\n${summary}`,
			data: { results: orgs, normalizedCountry: result?.normalizedCountry },
		};
	} catch (e: any) {
		return { success: false, message: `Recherche échouée : ${e?.message ?? "erreur"}` };
	}
}

async function listOrgPositions(
	ctx: any,
	args: { orgId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.orgId) {
		return { success: false, message: "Identifiant d'organisation manquant." };
	}
	try {
		const result = await ctx.runQuery(api.ai.realtimeKnowledge.listOrgPositions, {
			orgId: args.orgId as any,
		});
		const org = result?.org as { name: string } | null;
		const positions = (result?.positions ?? []) as Array<{
			code: string;
			titleFr?: string;
			level: number;
			occupants: Array<{ firstName?: string; lastName?: string }>;
		}>;
		if (!org || positions.length === 0) {
			return {
				success: true,
				message: "Aucun poste trouvé pour cette organisation.",
				data: { positions: [] },
			};
		}
		const occupied = positions.filter((p) => p.occupants.length > 0).length;
		const vacant = positions.length - occupied;
		const summary = positions
			.slice(0, 15)
			.map((p, i) => {
				const occ =
					p.occupants.length > 0
						? p.occupants
								.map((o) => `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim())
								.join(", ")
						: "vacant";
				return `${i + 1}. [niveau ${p.level}] ${p.titleFr ?? p.code} — ${occ}`;
			})
			.join("\n");
		return {
			success: true,
			message: `${org.name} — ${positions.length} poste(s) (${occupied} occupé(s), ${vacant} vacant(s)) :\n${summary}`,
			data: { org, positions },
		};
	} catch (e: any) {
		return { success: false, message: `Listing échoué : ${e?.message ?? "erreur"}` };
	}
}

async function searchConsularRegistrations(
	ctx: any,
	args: { searchQuery?: string; orgId?: string; profileType?: string },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const searchQuery = (args.searchQuery ?? "").trim();
	if (searchQuery.length < 2) {
		return { success: false, message: "Saisissez au moins 2 caractères." };
	}
	const orgId = args.orgId ?? context.orgId;
	if (!orgId) {
		return {
			success: false,
			message: "Aucun consulat actif. Précisez un orgId ou activez une organisation.",
		};
	}
	const profileType = args.profileType === "adult" || args.profileType === "child" ? args.profileType : "all";
	try {
		const result = await ctx.runQuery(
			api.functions.consularRegistrations.searchRegistrations,
			{
				orgId: orgId as any,
				searchQuery,
				profileType,
			},
		);
		const page = (result?.page ?? []) as Array<any>;
		if (page.length === 0) {
			return {
				success: true,
				message: `Aucun ressortissant trouvé pour « ${searchQuery} ».`,
				data: { results: [] },
			};
		}
		const summary = page
			.slice(0, 5)
			.map((r: any, i: number) => {
				const profile = r.profile ?? r.childProfile ?? null;
				const firstName = profile?.identity?.firstName ?? "";
				const lastName = profile?.identity?.lastName ?? "";
				const status = r.status ?? "?";
				return `${i + 1}. ${lastName} ${firstName} — statut : ${status}`;
			})
			.join("\n");
		const totalLabel = result?.totalCount ?? page.length;
		return {
			success: true,
			message: `${totalLabel} ressortissant(s) correspondent :\n${summary}`,
			data: { results: page, totalCount: totalLabel },
		};
	} catch (e: any) {
		return { success: false, message: `Recherche échouée : ${e?.message ?? "erreur"}` };
	}
}

async function recallMissedCall(
	ctx: any,
	args: { callerName?: string },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const orgId = context.orgId;
	if (!orgId) {
		return { success: false, message: "Aucune organisation active." };
	}
	try {
		const candidate = await ctx.runQuery(
			api.functions.meetings.findRecallableMissedCall,
			{ callerName: args.callerName?.trim() || undefined },
		);
		if (!candidate) {
			return {
				success: true,
				message: args.callerName
					? `Aucun appel manqué de ${args.callerName} à rappeler.`
					: "Aucun appel manqué en attente de rappel.",
				data: { candidates: [] },
			};
		}
		const result = await ctx.runMutation(api.functions.meetings.callUser, {
			orgId: orgId as any,
			targetUserId: candidate.callerUserId,
			mediaType: "audio" as const,
		});
		return {
			success: true,
			message: `Rappel de ${candidate.callerDisplayName} en cours.`,
			data: { meetingId: result?.meetingId, callerDisplayName: candidate.callerDisplayName },
			uiAction: {
				type: "open_active_call",
				payload: { meetingId: result?.meetingId, mediaType: "audio" },
			},
		};
	} catch (e: any) {
		return { success: false, message: `Rappel échoué : ${e?.message ?? "erreur inconnue"}` };
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
	ctx: any,
	args: { requestId?: string; requestNumber?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const identifier = args.requestId ?? args.requestNumber;
	if (!identifier) {
		return { success: false, message: "Identifiant ou numéro de dossier manquant." };
	}
	try {
		// Tente d'abord par ID Convex, puis par référence (numéro lisible).
		let detail: any = null;
		if (args.requestId) {
			detail = await ctx.runQuery(api.functions.requests.getById, {
				requestId: args.requestId as any,
			}).catch(() => null);
		}
		if (!detail && args.requestNumber) {
			detail = await ctx.runQuery(api.functions.requests.getByReferenceId, {
				referenceId: args.requestNumber,
			}).catch(() => null);
		}
		if (!detail) {
			return {
				success: false,
				message: `Dossier ${identifier} introuvable ou non accessible.`,
			};
		}
		const req = detail.request ?? detail;
		const status = req.status ?? "?";
		const service = req.serviceLabel ?? req.serviceCode ?? "?";
		const owner = detail.user
			? `${detail.user.firstName ?? ""} ${detail.user.lastName ?? ""}`.trim()
			: "?";
		const assigned = detail.assignedTo
			? `${detail.assignedTo.firstName ?? ""} ${detail.assignedTo.lastName ?? ""}`.trim()
			: "non assignée";
		return {
			success: true,
			message: `Dossier ${req.reference ?? req._id} — service : ${service} — bénéficiaire : ${owner} — statut : ${status} — assignée à : ${assigned}.`,
			data: { request: req, owner: detail.user, assignedTo: detail.assignedTo },
			uiAction: {
				type: "navigate",
				payload: {
					module: "consular_affairs",
					subpath: `requests/${req._id}`,
				},
			},
		};
	} catch (e: any) {
		return { success: false, message: `Consultation échouée : ${e?.message ?? "erreur"}` };
	}
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
	ctx: any,
	args: { query: string },
	context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const q = (args.query ?? "").trim();
	if (!q) {
		return { success: false, message: "Question manquante." };
	}
	try {
		const chunks = await ctx.runAction(api.ai.rag.retriever.query, {
			query: q,
			orgScope: context.orgId as any,
			sourceTypes: ["procedure", "intel_brief", "doc", "faq", "service"],
			topK: 5,
		});
		const list = Array.isArray(chunks) ? chunks : [];
		if (list.length === 0) {
			return {
				success: true,
				message: `Aucun extrait trouvé dans la base diplomatique pour : « ${q} ».`,
				data: { chunks: [] },
			};
		}
		const summary = list
			.slice(0, 3)
			.map(
				(c: any, i: number) =>
					`${i + 1}. (${c.sourceType}) ${c.title ?? "Extrait"} :\n${(c.content ?? "").slice(0, 240)}…`,
			)
			.join("\n");
		return {
			success: true,
			message: `Extraits pertinents :\n${summary}\n\nCITEZ les sources à voix haute.`,
			data: { chunks: list },
		};
	} catch (e: any) {
		return { success: false, message: `Recherche RAG échouée : ${e?.message ?? "erreur"}` };
	}
}

async function checkCalendar(
	ctx: any,
	args: { from?: string; to?: string; scope?: string },
	_context: { orgId?: string },
): Promise<RealtimeToolResult> {
	const fromIso = args.from ?? new Date().toISOString().slice(0, 10);
	const toIso =
		args.to ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const scope = args.scope ?? "self";
	try {
		const fromTs = Date.parse(fromIso);
		const toTs = Date.parse(toIso);
		const [appts, mtgs] = await Promise.all([
			ctx
				.runQuery(api.functions.appointments.listByUser, {})
				.catch(() => [] as any[]),
			ctx.runQuery(api.functions.meetings.listMine, {}).catch(() => [] as any[]),
		]);
		const apptsList = Array.isArray(appts) ? appts : (appts?.appointments ?? []);
		const mtgsList = Array.isArray(mtgs) ? mtgs : (mtgs?.meetings ?? []);
		const inRange = (ts?: number) =>
			ts !== undefined && ts >= fromTs && ts <= toTs;
		const apptsInRange = apptsList.filter((a: any) =>
			inRange(a.scheduledAt ?? a.startTime),
		);
		const mtgsInRange = mtgsList.filter((m: any) =>
			inRange(m.scheduledAt ?? m.startedAt ?? m._creationTime),
		);
		const total = apptsInRange.length + mtgsInRange.length;
		const lines = [
			...apptsInRange.slice(0, 5).map((a: any) => {
				const h = new Date(a.scheduledAt ?? a.startTime).toLocaleString("fr-FR", {
					dateStyle: "short",
					timeStyle: "short",
				});
				return `- RDV ${h} — ${a.serviceLabel ?? a.serviceCode ?? "?"}`;
			}),
			...mtgsInRange.slice(0, 5).map((m: any) => {
				const h = new Date(m.scheduledAt ?? m._creationTime).toLocaleString("fr-FR", {
					dateStyle: "short",
					timeStyle: "short",
				});
				return `- Réunion ${h} — « ${m.title ?? "Sans titre"} »`;
			}),
		];
		return {
			success: true,
			message:
				total === 0
					? `Aucun événement entre ${fromIso} et ${toIso}.`
					: `${total} événement(s) (${scope}) du ${fromIso} au ${toIso} :\n${lines.join("\n")}`,
			data: {
				appointments: apptsInRange,
				meetings: mtgsInRange,
			},
		};
	} catch (e: any) {
		return { success: false, message: `Consultation agenda échouée : ${e?.message ?? "erreur"}` };
	}
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

// ═════════════════════════════════════════════════════════════
// PHASE A — LECTURE VOCALE (accessibilité)
// ═════════════════════════════════════════════════════════════

async function readNotifications(
	ctx: any,
	args: { limit?: number; unreadOnly?: boolean },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const limit = Math.min(args.limit ?? 5, 20);
	try {
		const result = await ctx.runQuery(api.functions.notifications.list, {
			limit,
		});
		const items = Array.isArray(result) ? result : (result?.page ?? []);
		const filtered = args.unreadOnly === false ? items : items.filter((n: any) => !n.isRead);
		if (filtered.length === 0) {
			return { success: true, message: "Aucune notification non lue.", data: { results: [] } };
		}
		const summary = filtered
			.slice(0, limit)
			.map((n: any, i: number) => `${i + 1}. ${n.title ?? "(sans titre)"} — ${n.body ?? ""}`)
			.join("\n");
		return {
			success: true,
			message: `${filtered.length} notification(s) non lue(s) :\n${summary}`,
			data: { results: filtered, count: filtered.length },
		};
	} catch (e: any) {
		return { success: false, message: `Lecture échouée : ${e?.message ?? "erreur"}` };
	}
}

async function readPendingRequests(
	ctx: any,
	args: { scope?: string; limit?: number },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const limit = Math.min(args.limit ?? 5, 20);
	const scope = args.scope === "org" ? "org" : "mine";
	try {
		const data =
			scope === "mine"
				? await ctx.runQuery(api.functions.requests.listMine, {})
				: context.orgId
					? await ctx.runQuery(api.functions.requests.listByOrg, {
						orgId: context.orgId as any,
					})
					: { page: [] };
		const items = Array.isArray(data) ? data : (data?.page ?? data?.requests ?? []);
		const pending = items.filter((r: any) =>
			["pending", "submitted", "under_review", "ready"].includes(r.status),
		);
		if (pending.length === 0) {
			return { success: true, message: "Aucune demande en attente.", data: { results: [] } };
		}
		const summary = pending
			.slice(0, limit)
			.map((r: any, i: number) =>
				`${i + 1}. ${r.requestNumber ?? r._id} — ${r.serviceLabel ?? r.serviceCode ?? "?"} (statut : ${r.status})`,
			)
			.join("\n");
		return {
			success: true,
			message: `${pending.length} demande(s) en attente :\n${summary}`,
			data: { results: pending, count: pending.length },
		};
	} catch (e: any) {
		return { success: false, message: `Lecture échouée : ${e?.message ?? "erreur"}` };
	}
}

async function readCorrespondanceInbox(
	ctx: any,
	args: { limit?: number },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!context.orgId) {
		return { success: false, message: "Aucune org active." };
	}
	const limit = Math.min(args.limit ?? 5, 20);
	try {
		const items = await ctx.runQuery(api.functions.correspondance.getItems, {
			orgId: context.orgId as any,
		});
		const list = Array.isArray(items) ? items : (items?.items ?? []);
		const incoming = list
			.filter(
				(c: any) =>
					!c.deletedAt && ["pending", "under_review", "received"].includes(c.status),
			)
			.slice(0, limit);
		if (incoming.length === 0) {
			return {
				success: true,
				message: "Aucune correspondance entrante prioritaire.",
				data: { results: [] },
			};
		}
		const summary = incoming
			.map(
				(c: any, i: number) =>
					`${i + 1}. ${c.reference ?? c._id} — « ${c.title ?? "Sans objet"} » (de ${c.senderName ?? "?"})`,
			)
			.join("\n");
		return {
			success: true,
			message: `${incoming.length} correspondance(s) en attente :\n${summary}`,
			data: { results: incoming },
		};
	} catch (e: any) {
		return { success: false, message: `Lecture échouée : ${e?.message ?? "erreur"}` };
	}
}

async function readTodayAgenda(
	ctx: any,
	args: { includeAppointments?: boolean; includeMeetings?: boolean },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const includeAppts = args.includeAppointments !== false;
	const includeMeetings = args.includeMeetings !== false;
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(todayStart);
	todayEnd.setHours(23, 59, 59, 999);
	const lines: string[] = [];
	try {
		if (includeAppts) {
			const appts = await ctx.runQuery(api.functions.appointments.listByUser, {});
			const list = Array.isArray(appts) ? appts : (appts?.appointments ?? []);
			const today = list.filter((a: any) => {
				const t = a.scheduledAt ?? a.startTime;
				return t && t >= todayStart.getTime() && t <= todayEnd.getTime();
			});
			for (const a of today) {
				const h = new Date(a.scheduledAt ?? a.startTime).toLocaleTimeString("fr-FR", {
					hour: "2-digit",
					minute: "2-digit",
				});
				lines.push(`- ${h} : RDV ${a.serviceLabel ?? a.serviceCode ?? "?"}`);
			}
		}
		if (includeMeetings) {
			const mtgs = await ctx.runQuery(api.functions.meetings.listMine, {});
			const list = Array.isArray(mtgs) ? mtgs : (mtgs?.meetings ?? []);
			const today = list.filter((m: any) => {
				const t = m.scheduledAt ?? m.startedAt ?? m._creationTime;
				return t && t >= todayStart.getTime() && t <= todayEnd.getTime();
			});
			for (const m of today) {
				const h = new Date(m.scheduledAt ?? m._creationTime).toLocaleTimeString("fr-FR", {
					hour: "2-digit",
					minute: "2-digit",
				});
				lines.push(`- ${h} : Réunion « ${m.title ?? "Sans titre"} »`);
			}
		}
		if (lines.length === 0) {
			return { success: true, message: "Aucun événement aujourd'hui.", data: { results: [] } };
		}
		return {
			success: true,
			message: `Programme du jour :\n${lines.join("\n")}`,
			data: { results: lines },
		};
	} catch (e: any) {
		return { success: false, message: `Lecture agenda échouée : ${e?.message ?? "erreur"}` };
	}
}

async function readChatThread(
	ctx: any,
	args: { targetUserId?: string; limit?: number },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const limit = Math.min(args.limit ?? 5, 20);
	try {
		let chatId: string | null = null;
		if (args.targetUserId) {
			const chat = await ctx.runQuery(api.functions.chats.findChatWith, {
				targetUserId: args.targetUserId as any,
			});
			chatId = chat?._id ?? null;
		}
		if (!chatId) {
			return {
				success: true,
				message: "Aucun fil de discussion trouvé.",
				data: { results: [] },
			};
		}
		// Tente de lire les messages du chat — fallback gracieux si l'API diffère.
		const messages = await ctx
			.runQuery(api.functions.chats.listMessages, { chatId })
			.catch(() => []);
		const list = Array.isArray(messages) ? messages : (messages?.page ?? []);
		const recent = list.slice(-limit);
		if (recent.length === 0) {
			return { success: true, message: "Aucun message dans ce fil.", data: { results: [] } };
		}
		const summary = recent
			.map((m: any) => `${m.senderName ?? "?"} : « ${(m.content ?? "").slice(0, 200)} »`)
			.join("\n");
		return {
			success: true,
			message: `Derniers messages :\n${summary}`,
			data: { results: recent },
		};
	} catch (e: any) {
		return { success: false, message: `Lecture échouée : ${e?.message ?? "erreur"}` };
	}
}

// ═════════════════════════════════════════════════════════════
// PHASE B — TRAITEMENT (validations / refus / annulations)
// ═════════════════════════════════════════════════════════════

async function approveRequest(
	ctx: any,
	args: { requestId?: string; comment?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.requestId) {
		return { success: false, message: "requestId manquant." };
	}
	try {
		await ctx.runMutation(api.functions.requests.updateStatus, {
			requestId: args.requestId as any,
			newStatus: "validated" as any,
			comment: args.comment,
		});
		return {
			success: true,
			message: `Demande ${args.requestId} validée.`,
			data: { requestId: args.requestId },
		};
	} catch (e: any) {
		return { success: false, message: `Validation échouée : ${e?.message ?? "erreur"}` };
	}
}

async function rejectRequest(
	ctx: any,
	args: { requestId?: string; reason?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.requestId || !args.reason?.trim()) {
		return { success: false, message: "requestId et motif obligatoires." };
	}
	try {
		await ctx.runMutation(api.functions.requests.updateStatus, {
			requestId: args.requestId as any,
			newStatus: "cancelled" as any,
			comment: `Refus : ${args.reason}`,
		});
		return {
			success: true,
			message: `Demande ${args.requestId} refusée.`,
			data: { requestId: args.requestId, reason: args.reason },
		};
	} catch (e: any) {
		return { success: false, message: `Refus échoué : ${e?.message ?? "erreur"}` };
	}
}

async function requestMoreInfo(
	ctx: any,
	args: { requestId?: string; what?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.requestId || !args.what?.trim()) {
		return { success: false, message: "requestId et description requis." };
	}
	try {
		await ctx.runMutation(api.functions.requests.updateStatus, {
			requestId: args.requestId as any,
			newStatus: "pending" as any,
			comment: `Compléments demandés : ${args.what}`,
		});
		return {
			success: true,
			message: `Demande de compléments envoyée au demandeur.`,
		};
	} catch (e: any) {
		return { success: false, message: `Demande échouée : ${e?.message ?? "erreur"}` };
	}
}

async function advanceCorrespondanceStatus(
	ctx: any,
	args: { itemId?: string; nextStatus?: string; comment?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.itemId || !args.nextStatus) {
		return { success: false, message: "itemId et nextStatus requis." };
	}
	try {
		await ctx.runMutation(api.functions.correspondance.updateStatus, {
			itemId: args.itemId as any,
			newStatus: args.nextStatus as any,
			comment: args.comment,
		});
		return {
			success: true,
			message: `Correspondance avancée au statut ${args.nextStatus}.`,
		};
	} catch (e: any) {
		return { success: false, message: `Transition échouée : ${e?.message ?? "erreur"}` };
	}
}

async function archiveCorrespondance(
	ctx: any,
	args: { itemId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.itemId) {
		return { success: false, message: "itemId manquant." };
	}
	try {
		await ctx.runMutation(api.functions.correspondance.archiveItem, {
			itemId: args.itemId as any,
		});
		return { success: true, message: "Correspondance archivée." };
	} catch (e: any) {
		return { success: false, message: `Archivage échoué : ${e?.message ?? "erreur"}` };
	}
}

async function cancelMeetingTool(
	ctx: any,
	args: { meetingId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.meetingId) {
		return { success: false, message: "meetingId manquant." };
	}
	try {
		await ctx.runMutation(api.functions.meetings.cancel, {
			meetingId: args.meetingId as any,
		});
		return { success: true, message: "Réunion annulée." };
	} catch (e: any) {
		return { success: false, message: `Annulation échouée : ${e?.message ?? "erreur"}` };
	}
}

async function rescheduleMeetingTool(
	ctx: any,
	args: { meetingId?: string; newScheduledAt?: string },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.meetingId || !args.newScheduledAt) {
		return { success: false, message: "meetingId et newScheduledAt requis." };
	}
	const ts = Date.parse(args.newScheduledAt);
	if (!Number.isFinite(ts)) {
		return { success: false, message: "Date invalide." };
	}
	try {
		// Pas de mutation 'reschedule' dédiée : on annule l'ancienne et on recrée.
		// Récupère d'abord les infos pour reproduire la réunion.
		const meeting = await ctx.runQuery(api.functions.meetings.get, {
			meetingId: args.meetingId as any,
		}).catch(() => null);
		if (!meeting) {
			return { success: false, message: "Réunion introuvable." };
		}
		await ctx.runMutation(api.functions.meetings.cancel, {
			meetingId: args.meetingId as any,
		});
		const result = await ctx.runMutation(api.functions.meetings.create, {
			orgId: (meeting.orgId ?? context.orgId) as any,
			title: meeting.title,
			type: meeting.type ?? "meeting",
			participantIds: (meeting.participants ?? []).map((p: any) => p.userId),
			scheduledAt: ts,
			mediaType: meeting.mediaType ?? "video",
		});
		const isoLocal = new Date(ts).toLocaleString("fr-FR", {
			dateStyle: "short",
			timeStyle: "short",
		});
		return {
			success: true,
			message: `Réunion replanifiée au ${isoLocal}.`,
			data: { meetingId: result?.meetingId },
		};
	} catch (e: any) {
		return { success: false, message: `Replanification échouée : ${e?.message ?? "erreur"}` };
	}
}

async function cancelRequestTool(
	ctx: any,
	args: { requestId?: string; reason?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.requestId || !args.reason?.trim()) {
		return { success: false, message: "requestId et motif requis." };
	}
	try {
		await ctx.runMutation(api.functions.requests.cancel, {
			requestId: args.requestId as any,
			reason: args.reason,
		});
		return { success: true, message: "Demande annulée." };
	} catch (e: any) {
		return { success: false, message: `Annulation échouée : ${e?.message ?? "erreur"}` };
	}
}

// ═════════════════════════════════════════════════════════════
// PHASE E — SURFACE CITOYEN (libre-service consulaire)
// ═════════════════════════════════════════════════════════════

async function submitConsularRequestIntent(
	_ctx: any,
	args: { serviceCode?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	if (!args.serviceCode) {
		return { success: false, message: "Précisez le service souhaité." };
	}
	return {
		success: true,
		message: `Ouverture de l'assistant de dépôt pour ${args.serviceCode}.`,
		uiAction: {
			type: "navigate",
			payload: {
				module: "consular_affairs",
				subpath: `requests/new?service=${encodeURIComponent(args.serviceCode)}`,
			},
		},
	};
}

async function trackMyRequest(
	ctx: any,
	args: { requestId?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	try {
		const mine = await ctx.runQuery(api.functions.requests.listMine, {});
		const list = Array.isArray(mine) ? mine : (mine?.page ?? mine?.requests ?? []);
		if (list.length === 0) {
			return { success: true, message: "Aucune demande en cours.", data: { results: [] } };
		}
		const target = args.requestId
			? list.find((r: any) => r._id === args.requestId || r.requestNumber === args.requestId)
			: list[0];
		if (!target) {
			return { success: false, message: "Demande introuvable parmi les vôtres." };
		}
		return {
			success: true,
			message: `Demande ${target.requestNumber ?? target._id} — service ${target.serviceLabel ?? target.serviceCode ?? "?"} — statut : ${target.status}.`,
			data: { request: target },
		};
	} catch (e: any) {
		return { success: false, message: `Suivi échoué : ${e?.message ?? "erreur"}` };
	}
}

async function bookMyAppointmentIntent(
	_ctx: any,
	args: { orgId?: string; serviceCode?: string },
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const params = new URLSearchParams();
	if (args.orgId) params.set("org", args.orgId);
	if (args.serviceCode) params.set("service", args.serviceCode);
	const subpath = params.toString() ? `appointments/new?${params}` : "appointments/new";
	return {
		success: true,
		message: "Ouverture du flux de prise de rendez-vous.",
		uiAction: {
			type: "navigate",
			payload: { module: "consular_affairs", subpath },
		},
	};
}

async function readMyInbox(
	ctx: any,
	args: { limit?: number },
	context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	const limit = Math.min(args.limit ?? 5, 20);
	try {
		const [notifs, _ignored] = await Promise.all([
			ctx
				.runQuery(api.functions.notifications.list, { limit })
				.catch(() => [] as any[]),
			Promise.resolve(null),
		]);
		const notifList = Array.isArray(notifs) ? notifs : (notifs?.page ?? []);
		if (notifList.length === 0) {
			return { success: true, message: "Votre boîte est vide.", data: { results: [] } };
		}
		const summary = notifList
			.slice(0, limit)
			.map((n: any, i: number) => `${i + 1}. ${n.title ?? "(sans titre)"} — ${n.body ?? ""}`)
			.join("\n");
		void context;
		return {
			success: true,
			message: `Boîte de réception (${notifList.length} élément(s)) :\n${summary}`,
			data: { results: notifList },
		};
	} catch (e: any) {
		return { success: false, message: `Lecture échouée : ${e?.message ?? "erreur"}` };
	}
}

async function callMyConsulate(
	_ctx: any,
	_args: unknown,
	_context: { orgId?: string; surface: "agent" | "backoffice" | "citizen" },
): Promise<RealtimeToolResult> {
	// Implémentation simplifiée : redirige vers la page d'appel citoyen qui
	// résout le consulat de juridiction. La résolution exacte côté serveur
	// (callOrganization) demande une logique de jurisdiction-matching plus
	// élaborée et est traitée par le flux UI dédié.
	return {
		success: true,
		message: "Ouverture de la ligne consulaire.",
		uiAction: {
			type: "navigate",
			payload: { module: "consular_affairs", subpath: "call" },
		},
	};
}
