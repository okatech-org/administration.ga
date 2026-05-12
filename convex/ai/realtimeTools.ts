/**
 * realtimeTools — Registry des tools exposés à iAsted en mode vocal Realtime.
 *
 * Chaque tool est filtré par permissions (TaskCode) avant d'être envoyé à
 * OpenAI Realtime via la `session.update` initiale. Le filtrage côté UI
 * limite ce que le modèle peut invoquer, mais le `realtimeToolExecutor`
 * **re-vérifie systématiquement** les permissions à l'exécution.
 *
 * Format de retour : tableau de tools au format OpenAI Realtime function-calling
 * `{ type: "function", name, description, parameters: { type, properties, required } }`.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getTasksForMembership, isSuperAdmin } from "../lib/permissions";
import type { RealtimeVoiceTool } from "./realtimeTypes";

// ─────────────────────────────────────────────────────────────
// Tools UI (toujours disponibles, exécution côté client)
// ─────────────────────────────────────────────────────────────

const UI_TOOLS: RealtimeVoiceTool[] = [
	{
		type: "function",
		name: "navigate_to_module",
		description:
			"Navigue vers un module métier de l'application (ex : ouvrir iCorrespondance, l'agenda, la liste des dossiers consulaires).",
		parameters: {
			type: "object",
			properties: {
				module: {
					type: "string",
					description:
						"Code du module : 'correspondence', 'consular_affairs', 'diplomatic_affairs', 'calendar', 'documents', 'messaging', 'team', 'settings'.",
				},
				subpath: {
					type: "string",
					description: "Sous-chemin optionnel (ex : 'requests/new', 'inbox').",
				},
			},
			required: ["module"],
		},
	},
	{
		type: "function",
		name: "open_chat",
		description: "Ouvre la fenêtre de chat texte iAsted (transcription visible).",
		parameters: { type: "object", properties: {}, required: [] },
	},
	{
		type: "function",
		name: "close_chat",
		description: "Ferme la fenêtre de chat texte pour revenir au mode vocal pur.",
		parameters: { type: "object", properties: {}, required: [] },
	},
	{
		type: "function",
		name: "stop_conversation",
		description: "Termine la conversation vocale (raccroche). À utiliser quand l'utilisateur dit 'arrête', 'merci', 'au revoir'.",
		parameters: { type: "object", properties: {}, required: [] },
	},
	{
		type: "function",
		name: "change_voice",
		description: "Change la voix de l'agent. Voix disponibles : alloy, ash, ballad, coral, echo, sage, shimmer, verse.",
		parameters: {
			type: "object",
			properties: {
				voice: {
					type: "string",
					description: "Identifiant de la voix.",
				},
			},
			required: ["voice"],
		},
	},
	{
		type: "function",
		name: "control_ui",
		description:
			"Contrôle des éléments d'interface. Actions : 'set_theme_dark', 'set_theme_light', 'toggle_theme', 'set_speech_rate' (value entre '0.5' et '2.0').",
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", description: "Code de l'action à exécuter." },
				value: { type: "string", description: "Valeur optionnelle (ex : '1.3' pour speech_rate)." },
			},
			required: ["action"],
		},
	},
	{
		type: "function",
		name: "execute_page_action",
		description:
			"Déclenche une action déclarée par la page courante (cf. liste fournie dans la section 'Actions disponibles' du CONTEXTE PAGE COURANT). " +
			"À n'invoquer que pour un actionId présent dans cette liste. " +
			"Pour toute action marquée CONFIRMATION REQUISE, demandez d'abord oralement à l'utilisateur, puis appelez l'action uniquement après son accord explicite.",
		parameters: {
			type: "object",
			properties: {
				actionId: {
					type: "string",
					description: "Identifiant exact de l'action tel qu'annoncé dans le contexte page.",
				},
				params: {
					type: "object",
					description: "Paramètres à transmettre au handler frontend (clés/valeurs libres, doivent correspondre au schéma annoncé pour l'action).",
				},
			},
			required: ["actionId"],
		},
	},
];

// ─────────────────────────────────────────────────────────────
// Tools métier (filtrés par permissions)
// ─────────────────────────────────────────────────────────────

interface GatedTool {
	tool: RealtimeVoiceTool;
	/** Task code requis. `null` = pas de gating supplémentaire (auth suffisante). */
	requiredTask: string | null;
	/** Si défini, le tool n'est exposé QUE sur cette surface. */
	surfaceOnly?: "agent" | "backoffice";
	/** Si true, exige le statut superadmin. */
	superadminOnly?: boolean;
}

const BUSINESS_TOOLS: GatedTool[] = [
	{
		requiredTask: "requests.view",
		tool: {
			type: "function",
			name: "consult_request",
			description: "Consulte un dossier consulaire (passeport, CNI, visa, légalisation) par identifiant ou par numéro.",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex du dossier (commence par 'k7...'). Optionnel si requestNumber fourni." },
					requestNumber: { type: "string", description: "Numéro de dossier visible par le citoyen (ex : 'CONS-2026-001234')." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: "correspondance.create",
		tool: {
			type: "function",
			name: "draft_correspondence",
			description:
				"Rédige un brouillon de correspondance officielle (note verbale, lettre, télégramme). Le brouillon est créé en statut 'draft', l'utilisateur doit le valider manuellement.",
			parameters: {
				type: "object",
				properties: {
					type: { type: "string", description: "Type : 'note_verbale', 'lettre_officielle', 'telegramme', 'accuse_reception'." },
					recipient: { type: "string", description: "Destinataire (nom et qualité, ex : 'Ambassade de France')." },
					subject: { type: "string", description: "Objet de la correspondance." },
					contentPoints: { type: "array", description: "Points clés à développer.", items: { type: "string" } },
				},
				required: ["type", "recipient", "subject"],
			},
		},
	},
	{
		requiredTask: "documents.generate",
		tool: {
			type: "function",
			name: "generate_document",
			description: "Génère un document officiel (attestation, certificat, laissez-passer) au format PDF ou DOCX.",
			parameters: {
				type: "object",
				properties: {
					templateCode: { type: "string", description: "Code du template (ex : 'attestation_residence', 'laissez_passer_consulaire')." },
					recipientName: { type: "string", description: "Nom du bénéficiaire." },
					format: { type: "string", description: "Format de sortie : 'pdf' (défaut) ou 'docx'." },
				},
				required: ["templateCode", "recipientName"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "query_diplomatic_kb",
			description:
				"Interroge la base de connaissance diplomatique (procédures, conventions, réglementations, accords bilatéraux). Renvoie un résumé sourcé.",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "Question ou mots-clés (ex : 'procédure légalisation acte de naissance')." },
				},
				required: ["query"],
			},
		},
	},
	{
		requiredTask: "calendar.view",
		tool: {
			type: "function",
			name: "check_calendar",
			description: "Consulte l'agenda de l'utilisateur ou de son équipe sur une période donnée.",
			parameters: {
				type: "object",
				properties: {
					from: { type: "string", description: "Date de début ISO (ex : '2026-05-12'). Défaut : aujourd'hui." },
					to: { type: "string", description: "Date de fin ISO. Défaut : +7 jours." },
					scope: { type: "string", description: "'self' (moi uniquement) ou 'team' (mon équipe). Défaut : 'self'." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: "requests.process",
		tool: {
			type: "function",
			name: "escalate_to_supervisor",
			description: "Escalade un dossier vers le supérieur hiérarchique avec motif et niveau d'urgence.",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex du dossier à escalader." },
					reason: { type: "string", description: "Motif d'escalade (en clair, sera consigné)." },
					urgency: { type: "string", description: "'normal', 'high', 'critical'. Défaut : 'normal'." },
				},
				required: ["requestId", "reason"],
			},
		},
	},

	// ─── Tools backoffice exclusifs ───
	{
		requiredTask: null,
		superadminOnly: true,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "view_audit_logs",
			description: "[Backoffice] Consulte les journaux d'audit avec filtres optionnels.",
			parameters: {
				type: "object",
				properties: {
					actorId: { type: "string", description: "Filtre par utilisateur acteur." },
					action: { type: "string", description: "Filtre par type d'action (ex : 'request.approve')." },
					limit: { type: "number", description: "Nombre max de résultats. Défaut : 50." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		superadminOnly: true,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "manage_users",
			description: "[Backoffice / SuperAdmin] Liste, désactive ou réactive un utilisateur. Aucune suppression définitive autorisée par cette voie.",
			parameters: {
				type: "object",
				properties: {
					action: { type: "string", description: "'list', 'deactivate', 'reactivate'." },
					userId: { type: "string", description: "ID utilisateur (requis sauf pour 'list')." },
				},
				required: ["action"],
			},
		},
	},
	{
		requiredTask: null,
		superadminOnly: true,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "system_config",
			description: "[Backoffice / SuperAdmin] Lecture seule des paramètres système (modules activés, feature flags, quotas).",
			parameters: {
				type: "object",
				properties: {
					key: { type: "string", description: "Clé de configuration à lire (ex : 'modules.enabled')." },
				},
				required: ["key"],
			},
		},
	},
];

// ─────────────────────────────────────────────────────────────
// Query : retourne les tools autorisés pour un utilisateur donné
// ─────────────────────────────────────────────────────────────

export const getToolsForUser = internalQuery({
	args: {
		userId: v.id("users"),
		orgId: v.optional(v.id("orgs")),
		surface: v.union(v.literal("agent"), v.literal("backoffice")),
	},
	handler: async (ctx, { userId, orgId, surface }) => {
		const user = await ctx.db.get(userId);
		if (!user) return { tools: [], toolNames: [] };

		// Résoudre les tasks de l'utilisateur sur son org active
		let resolvedTasks = new Set<string>();
		if (orgId) {
			const membership = await ctx.db
				.query("memberships")
				.withIndex("by_user_org_deletedAt", (q) =>
					q.eq("userId", userId as Id<"users">).eq("orgId", orgId).eq("deletedAt", undefined),
				)
				.unique();
			if (membership) {
				resolvedTasks = await getTasksForMembership(ctx, membership);
			}
		}

		const userIsSuperadmin = isSuperAdmin(user);
		const tools: RealtimeVoiceTool[] = [...UI_TOOLS];

		for (const gated of BUSINESS_TOOLS) {
			// Filtre surface
			if (gated.surfaceOnly && gated.surfaceOnly !== surface) continue;
			// Filtre superadmin
			if (gated.superadminOnly && !userIsSuperadmin) continue;
			// Filtre task
			if (gated.requiredTask && !userIsSuperadmin && !resolvedTasks.has(gated.requiredTask)) continue;
			tools.push(gated.tool);
		}

		return {
			tools,
			toolNames: tools.map((t) => t.name),
		};
	},
});

// ─────────────────────────────────────────────────────────────
// Helper exporté pour usage par le toolExecutor
// ─────────────────────────────────────────────────────────────

export const BUSINESS_TOOL_INDEX: ReadonlyMap<string, GatedTool> = new Map(
	BUSINESS_TOOLS.map((g) => [g.tool.name, g]),
);

export const UI_TOOL_NAMES: ReadonlySet<string> = new Set(UI_TOOLS.map((t) => t.name));
