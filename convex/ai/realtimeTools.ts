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
		description:
			"Ouvre l'onglet iChat (chat texte iAsted, transcription visible). " +
			"À INVOQUER UNIQUEMENT si l'utilisateur prononce explicitement « chat », « iChat », « discussion », " +
			"« messagerie » ou « fenêtre DE CHAT » (avec le qualificateur « de chat »). " +
			"NE PAS invoquer si l'utilisateur dit juste « fenêtre » (singulier, sans qualificateur) — utiliser `open_app_menu`. " +
			"NE PAS invoquer si l'utilisateur dit « fenêtre des contacts / d'appels / des réunions / vocale / des réglages » " +
			"— utiliser `open_iasted_tab` avec le tab correspondant.",
		parameters: { type: "object", properties: {}, required: [] },
	},
	{
		type: "function",
		name: "close_chat",
		description:
			"Ferme l'onglet iChat (chat texte) pour revenir au mode vocal pur. " +
			"Expressions : « ferme le chat », « ferme iChat », « ferme la fenêtre de chat », « masque le chat ».",
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
	{
		type: "function",
		name: "open_app_menu",
		description:
			"Ouvre l'ÉVENTAIL iAsted (CircleMenu fan) — déploie les 6 boutons d'accès rapide autour de la sphère : iChat, iContact, iAppel, iRéunion, iVocal, Réglages. " +
			"À INVOQUER quand l'utilisateur dit (variantes acceptées) : " +
			"« ouvre la fenêtre », « affiche la fenêtre », « montre la fenêtre », « déploie la fenêtre », « déroule la fenêtre » (singulier, SANS qualificateur « de chat / des contacts / d'appels / des réunions / vocale / des réglages »), " +
			"« ouvre une fenêtre », « affiche une fenêtre », « ouvre la / une fenêtre iAsted », " +
			"« ouvre tes options », « affiche tes options », « montre tes options », « donne-moi tes options », " +
			"« ouvre ses options », « affiche ses options », « montre ses options » (3e personne), " +
			"« ouvre mes options » (1re personne — l'utilisateur parle DE lui), " +
			"« ouvre l'éventail », « affiche l'éventail », « déploie l'éventail », « déroule l'éventail », " +
			"« ouvre tes fenêtres », « affiche tes fenêtres », « montre tes fenêtres », " +
			"« ouvre ton menu », « affiche ton menu », « montre ton menu », « déploie ton menu », « déroule ton menu », " +
			"« ouvre le menu » (sans possessif — action directe sur l'éventail, plus de demande de précision), " +
			"« ouvre ton panneau », « affiche ton panneau », « ouvre le panneau iAsted », " +
			"« qu'est-ce que tu sais faire » (en complément d'une réponse vocale), « montre-moi ce que tu peux faire ». " +
			"RÈGLE D'OR : le mot « fenêtre » SEUL (sans qualificateur explicite « de chat » / « des contacts » / « d'appels » / « des réunions » / « vocale » / « des réglages ») désigne TOUJOURS l'éventail iAsted. " +
			"De même, « le menu » seul désigne l'éventail (l'ancien comportement « demander précision » est supprimé : action directe). " +
			"NE PAS invoquer pour : « ouvre le chat » / « ouvre iChat » / « ouvre la fenêtre de chat » (utiliser `open_chat`), " +
			"« ouvre la fenêtre des contacts / d'appels / des réunions / vocale / des réglages » (utiliser `open_iasted_tab`), " +
			"« ouvre mes contacts / appels / réunions / réglages » (utiliser `open_iasted_tab`), " +
			"« ouvre le menu principal / la navigation latérale / la sidebar » (= menu latéral de l'application, hors-périmètre — répondre que ce n'est pas pilotable vocalement).",
		parameters: { type: "object", properties: {}, required: [] },
	},
	{
		type: "function",
		name: "open_iasted_tab",
		description:
			"Ouvre un onglet précis de l'iAsted. Utile pour basculer rapidement vers une fonction (contacts, appels, réunions, réglages, vocal, chat). " +
			"Onglets disponibles : 'ichat' (chat texte), 'icontact' (annuaire), 'icall' (appels et historique), 'imeeting' (réunions), 'ivoice' (iVocal — conversation vocale temps réel + transcription), 'isettings' (réglages). " +
			"Triggers vocaux (le mot « fenêtre » DOIT être qualifié pour cibler un onglet précis ; sinon utiliser `open_app_menu`) : " +
			"• tab='icontact' : « ouvre mes contacts », « affiche les contacts », « va dans les contacts », « ouvre la fenêtre des contacts / de contacts ». " +
			"• tab='icall' : « ouvre les appels », « affiche l'historique des appels », « ouvre la fenêtre d'appels / des appels ». " +
			"• tab='imeeting' : « ouvre les réunions », « va dans les réunions », « ouvre la fenêtre des réunions / de réunion ». " +
			"• tab='ivoice' : « ouvre iVocal », « ouvre le vocal », « ouvre la conversation vocale », « ouvre la transcription », « affiche la transcription vocale », « ouvre la fenêtre vocale / de transcription / de l'assistant vocal ». " +
			"• tab='isettings' : « ouvre les réglages », « affiche les paramètres », « ouvre la fenêtre des réglages / de réglages / des paramètres ». " +
			"• tab='ichat' : « ouvre la fenêtre de chat » / « va dans le chat » (équivalent à `open_chat` ; préférer `open_chat` pour la cohérence).",
		parameters: {
			type: "object",
			properties: {
				tab: {
					type: "string",
					description:
						"Identifiant de l'onglet à ouvrir : 'ichat' | 'icontact' | 'icall' | 'imeeting' | 'ivoice' | 'isettings'.",
				},
			},
			required: ["tab"],
		},
	},
	{
		type: "function",
		name: "toggle_mic_in_call",
		description:
			"Coupe ou active le microphone pendant un appel/réunion en cours (LiveKit). " +
			"Sans paramètre, bascule l'état courant (mute → unmute ou inverse). " +
			"À n'invoquer que si un appel est actif — sinon, prévenir l'utilisateur. " +
			"Expressions : « coupe mon micro », « mute », « réactive mon micro ».",
		parameters: {
			type: "object",
			properties: {
				enabled: {
					type: "boolean",
					description: "true = micro actif, false = micro coupé. Omettre pour toggle.",
				},
			},
			required: [],
		},
	},
	{
		type: "function",
		name: "toggle_camera_in_call",
		description:
			"Active ou coupe la caméra pendant un appel/réunion en cours. " +
			"Sans paramètre, bascule l'état courant. " +
			"Expressions : « active ma caméra », « coupe la vidéo », « éteins la caméra ».",
		parameters: {
			type: "object",
			properties: {
				enabled: {
					type: "boolean",
					description: "true = caméra active, false = caméra coupée. Omettre pour toggle.",
				},
			},
			required: [],
		},
	},
	{
		type: "function",
		name: "toggle_screen_share",
		description:
			"Démarre ou arrête le partage d'écran pendant un appel/réunion en cours. " +
			"Sans paramètre, bascule l'état courant. " +
			"Expressions : « partage mon écran », « arrête le partage ».",
		parameters: {
			type: "object",
			properties: {
				enabled: {
					type: "boolean",
					description: "true = démarre, false = arrête. Omettre pour toggle.",
				},
			},
			required: [],
		},
	},

	// ─── ACCESSIBILITÉ (toggle mode + form-filling UI) ───
	{
		type: "function",
		name: "set_accessibility_mode",
		description:
			"Active ou désactive le mode accessibilité (session persistante + cues audio non-vocaux). " +
			"Persisté en localStorage. La session sera reconnectée pour appliquer immédiatement. " +
			"Expressions : « active le mode accessibilité », « passe en mode accessibilité », « désactive l'accessibilité ».",
		parameters: {
			type: "object",
			properties: {
				enabled: {
					type: "boolean",
					description: "true = activer, false = désactiver.",
				},
			},
			required: ["enabled"],
		},
	},
	{
		type: "function",
		name: "read_page_summary",
		description:
			"Lit oralement le résumé de la page courante (titre, état, entités visibles, actions disponibles). " +
			"À UTILISER quand l'utilisateur dit : « lis-moi la page », « que vois-je à l'écran ? », " +
			"« décris-moi l'écran », « qu'est-ce qui est ouvert ? ». " +
			"Le résumé est dans le bloc CONTEXTE PAGE COURANT fourni à chaque message — paraphrasez-le brièvement.",
		parameters: { type: "object", properties: {}, required: [] },
	},
	{
		type: "function",
		name: "fill_form_field",
		description:
			"Remplit un champ de formulaire à la voix. Le `fieldId` doit être l'un de ceux listés dans le bloc CHAMPS DE FORMULAIRE. " +
			"Pour les selects/radios, `value` accepte soit la valeur exacte soit le label (fuzzy-match). " +
			"Pour les dates : ISO 8601 ou expression naturelle (« demain », « lundi prochain »). " +
			"Expressions : « remplis le prénom avec Jean », « mets la date au 15 mars », « coche la case consentement ».",
		parameters: {
			type: "object",
			properties: {
				fieldId: {
					type: "string",
					description: "Identifiant exact du champ (cf. CHAMPS DE FORMULAIRE).",
				},
				value: {
					description: "Valeur à appliquer. Type cohérent avec le champ (string/number/boolean/array).",
				},
			},
			required: ["fieldId", "value"],
		},
	},
	{
		type: "function",
		name: "clear_form_field",
		description:
			"Efface la valeur d'un champ de formulaire. Expressions : « efface le prénom », « vide le champ X ».",
		parameters: {
			type: "object",
			properties: {
				fieldId: { type: "string", description: "Identifiant du champ à effacer." },
			},
			required: ["fieldId"],
		},
	},
	{
		type: "function",
		name: "submit_form",
		description:
			"Soumet le formulaire courant. Si `formId` absent, soumet le formulaire principal. " +
			"Réutilise l'action `<formId>.submit` enregistrée par la page. " +
			"Expressions : « soumets le formulaire », « valide », « envoie ».",
		parameters: {
			type: "object",
			properties: {
				formId: {
					type: "string",
					description: "Identifiant du formulaire (optionnel — défaut : premier disponible).",
				},
			},
			required: [],
		},
	},
	{
		type: "function",
		name: "read_form_state",
		description:
			"Relit oralement les valeurs courantes de tous les champs d'un formulaire — pour vérification avant soumission. " +
			"Expressions : « relis-moi ce que j'ai saisi », « état du formulaire ».",
		parameters: {
			type: "object",
			properties: {
				formId: {
					type: "string",
					description: "Identifiant du formulaire (optionnel).",
				},
			},
			required: [],
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
	// ───────────────────────────────────────────────────────────
	// Communication & Orchestration (Phase 1 — Mode God)
	// ───────────────────────────────────────────────────────────
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "find_contact_by_name",
			description:
				"OUTIL UNIVERSEL de résolution d'identité — à utiliser AVANT TOUTE action " +
				"ciblant une personne (appel, message, réunion, ajout à un appel actif), " +
				"qu'il s'agisse d'un agent diplomatique, d'un admin back-office, d'un " +
				"RESSORTISSANT GABONAIS ou d'un profil ÉTRANGER. Couvre l'ensemble de " +
				"l'annuaire : équipe, Corps Diplomatique, profils consulaires, admins " +
				"plateforme — cross-org en back-office. Recherche tolérante aux accents, " +
				"à la casse et aux tirets : « pellen » matche « PELLEN-LAKOUMBA », " +
				"« sophie mbeng » matche « Sophie Mbeng ». Retourne jusqu'à 5 candidats — " +
				"si plusieurs résultats, demander à l'utilisateur de préciser. " +
				"NE PAS confondre avec `search_consular_registrations` qui interroge le " +
				"registre consulaire formel (inscription, n° de carte) et ne sert qu'à " +
				"la consultation administrative — pas à initier une action.",
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: "Nom partiel ou complet à rechercher (ex : 'Sophie', 'Mbeng', 'Marc Loussou', 'Pellen-Lakoumba').",
					},
					orgId: {
						type: "string",
						description: "ID Convex de l'organisation à scoper (optionnel — ignoré en surface backoffice qui scanne tout l'annuaire).",
					},
				},
				required: ["name"],
			},
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "launch_call_with_contact",
			description:
				"Lance un appel audio ou vidéo avec un contact identifié. Action attendue (pas de confirmation). " +
				"Le destinataire reçoit une notification d'appel entrant et le tonneau LiveKit s'ouvre.",
			parameters: {
				type: "object",
				properties: {
					targetUserId: {
						type: "string",
						description: "ID Convex du contact à appeler (obtenu via find_contact_by_name).",
					},
					mediaType: {
						type: "string",
						description: "'audio' (par défaut) ou 'video'.",
					},
				},
				required: ["targetUserId"],
			},
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "create_instant_meeting",
			description:
				"Crée et démarre immédiatement une réunion multi-participants (LiveKit). Demander confirmation orale avant exécution si > 2 participants.",
			parameters: {
				type: "object",
				properties: {
					title: {
						type: "string",
						description: "Titre de la réunion (défaut : 'Réunion instantanée').",
					},
					participantIds: {
						type: "array",
						description: "Liste des userIds des participants à inviter.",
						items: { type: "string" },
					},
					mediaType: {
						type: "string",
						description: "'audio' ou 'video' (défaut : 'video').",
					},
				},
				required: ["participantIds"],
			},
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "schedule_meeting",
			description:
				"Planifie une réunion dans le futur (statut 'scheduled'). Les participants reçoivent une notification de calendrier. " +
				"Demander confirmation orale (titre + horaire + participants) avant exécution.",
			parameters: {
				type: "object",
				properties: {
					title: {
						type: "string",
						description: "Titre de la réunion.",
					},
					participantIds: {
						type: "array",
						description: "Liste des userIds invités.",
						items: { type: "string" },
					},
					scheduledAt: {
						type: "string",
						description: "Horaire ISO (ex : '2026-05-16T15:00:00Z') ou expression relative résolue par l'agent.",
					},
					mediaType: {
						type: "string",
						description: "'audio' ou 'video' (défaut : 'video').",
					},
				},
				required: ["title", "participantIds", "scheduledAt"],
			},
		},
	},
	{
		requiredTask: "chats.send",
		tool: {
			type: "function",
			name: "send_quick_message",
			description:
				"Envoie un message texte rapide à un contact (P2P chat). " +
				"RÈGLE STRICTE : avant l'appel, relire le contenu à voix haute et attendre 'oui' / 'confirmé' / 'envoie' de l'utilisateur. " +
				"Si le contenu est ambigu (mention de personnes / chiffres / dates), demander précision.",
			parameters: {
				type: "object",
				properties: {
					targetUserId: {
						type: "string",
						description: "ID Convex du destinataire (obtenu via find_contact_by_name).",
					},
					content: {
						type: "string",
						description: "Contenu du message à envoyer.",
					},
				},
				required: ["targetUserId", "content"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "open_conversation_with_user",
			description:
				"Ouvre l'onglet iChat (chat texte) sur un contact spécifique (UI-only, pas d'envoi). " +
				"Expressions : « ouvre la conversation avec X », « affiche le chat avec X », « ouvre le chat avec X ».",
			parameters: {
				type: "object",
				properties: {
					targetUserId: {
						type: "string",
						description: "ID Convex du contact dont la conversation doit être ouverte.",
					},
				},
				required: ["targetUserId"],
			},
		},
	},

	// ─── Contrôle d'appel actif (raccrocher / ajouter / refuser / rappeler) ───
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "hangup_active_call",
			description:
				"Raccroche l'appel ou la réunion en cours pour l'utilisateur. " +
				"Résout automatiquement le meeting actif — pas besoin de meetingId. " +
				"Expressions : « raccroche », « termine l'appel », « quitte la réunion », « coupe l'appel ».",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "add_participant_to_active_call",
			description:
				"Ajoute un participant à l'appel/réunion actif. Le destinataire reçoit une notification d'invitation. " +
				"Utiliser find_contact_by_name AVANT pour résoudre l'identifiant. " +
				"Expressions : « ajoute X à l'appel », « invite Y à la réunion en cours ».",
			parameters: {
				type: "object",
				properties: {
					targetUserId: {
						type: "string",
						description: "ID Convex du contact à ajouter (obtenu via find_contact_by_name).",
					},
				},
				required: ["targetUserId"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "decline_incoming_call",
			description:
				"Refuse un appel entrant qui sonne actuellement. " +
				"Pour un appel direct (utilisateur à utilisateur), équivaut à quitter avant de décrocher. " +
				"Pour un appel org entrant, marque l'utilisateur comme ayant décliné (d'autres agents peuvent encore décrocher). " +
				"Expressions : « refuse cet appel », « décroche pas », « ignore ».",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "recall_missed_call",
			description:
				"Rappelle un appel manqué. Sans paramètre, rappelle le dernier appel manqué de toutes les lignes. " +
				"Avec callerName, filtre les manqués au nom correspondant et rappelle le plus récent. " +
				"Expressions : « rappelle » (dernier manqué), « rappelle Sophie » (manqué d'une personne précise).",
			parameters: {
				type: "object",
				properties: {
					callerName: {
						type: "string",
						description: "Nom partiel ou complet de l'appelant à rappeler (optionnel).",
					},
				},
				required: [],
			},
		},
	},

	// ─── Connaissance du corps diplomatique & annuaire ───
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "find_post_holder",
			description:
				"Identifie le titulaire d'un poste diplomatique précis (ambassadeur, consul, premier conseiller, etc.) " +
				"sans avoir besoin de son nom. Combine résolution par PAYS (juridiction) et/ou nom d'org. " +
				"À UTILISER pour : « Qui est l'ambassadeur du Gabon en Espagne ? », « Qui est le consul à Paris ? », " +
				"« Quel est le chef de mission à Madrid ? », « Qui dirige l'ambassade en France ? ». " +
				"Retourne user + position + org. Le modèle DOIT énoncer le titre formel (ex : « M. l'Ambassadeur X »).",
			parameters: {
				type: "object",
				properties: {
					role: {
						type: "string",
						description:
							"Rôle recherché en clair : « ambassadeur », « consul », « consul général », « premier conseiller », « haut-commissaire », « représentant permanent », « attaché », etc. La résolution fait du fuzzy-match sur code et titre.",
					},
					country: {
						type: "string",
						description:
							"Pays cible : nom en français (« Espagne », « France ») ou code ISO 2 lettres (« ES », « FR »). Couvre orgs implantées dans ce pays ET orgs dont la juridiction inclut ce pays.",
					},
					orgQuery: {
						type: "string",
						description:
							"Alternative au pays : recherche par nom partiel d'organisation (« Madrid », « Paris », « Présidence »).",
					},
					orgId: {
						type: "string",
						description: "Alternative : ID Convex de l'organisation cible si déjà résolue.",
					},
				},
				required: ["role"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "list_diplomatic_corps",
			description:
				"Liste les agents diplomatiques (corps diplomatique) d'une organisation, ou de toutes les représentations d'un pays. " +
				"À UTILISER pour : « Qui sont les agents à l'ambassade à Madrid ? », « Donne-moi le corps diplomatique en France », " +
				"« Liste les membres du consulat de Paris ». " +
				"Retourne par org : liste de membres avec position et niveau. Le modèle DOIT énumérer brièvement (3-5 noms max) puis proposer de filtrer.",
			parameters: {
				type: "object",
				properties: {
					orgId: {
						type: "string",
						description: "ID Convex de l'organisation (si déjà connu).",
					},
					country: {
						type: "string",
						description:
							"Pays (nom français ou code ISO 2) — liste toutes les représentations gabonaises dans ce pays.",
					},
					orgQuery: {
						type: "string",
						description: "Recherche par nom partiel d'organisation.",
					},
					limit: {
						type: "number",
						description: "Nombre max de membres par org (défaut : 30).",
					},
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "find_orgs_by_country",
			description:
				"Liste les représentations diplomatiques gabonaises présentes dans/pour un pays. " +
				"Inclut celles dont le pays est en juridiction étendue (consulat couvrant plusieurs pays). " +
				"À UTILISER pour : « Quelles représentations avons-nous en France ? », « Y a-t-il un consulat au Maroc ? », " +
				"« Quelles ambassades en Afrique du Sud ? ». Exclut les agences de renseignement (cloisonnement).",
			parameters: {
				type: "object",
				properties: {
					country: {
						type: "string",
						description: "Nom du pays en français ou code ISO 2 lettres.",
					},
					typeFilter: {
						type: "string",
						description:
							"Optionnel — filtrer par type : 'embassy', 'consulate', 'general_consulate', 'permanent_mission', 'high_commission', 'honorary_consulate'.",
					},
				},
				required: ["country"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "list_org_positions",
			description:
				"Liste tous les postes (occupés ou vacants) d'une organisation, triés par niveau hiérarchique (1 = chef de mission). " +
				"À UTILISER pour : « Quels postes existent à l'ambassade en Espagne ? », « Quelle est l'organisation du consulat de Paris ? », " +
				"« Y a-t-il un poste de premier secrétaire vacant ? ». Le modèle peut comparer occupants vs postes requis.",
			parameters: {
				type: "object",
				properties: {
					orgId: {
						type: "string",
						description: "ID Convex de l'organisation. Résoudre d'abord avec find_orgs_by_country ou find_org_by_name si nécessaire.",
					},
				},
				required: ["orgId"],
			},
		},
	},
	// ─── LECTURE VOCALE (Phase accessibilité — read-only queries) ───
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "read_notifications",
			description:
				"Lit les notifications de l'utilisateur — non lues d'abord. À UTILISER pour : " +
				"« lis-moi mes notifications », « qu'est-ce qu'il y a de nouveau ? », « as-je des notifications ? ». " +
				"PAGINATION : énumérer 5 max, proposer « dites suivant pour les 5 suivantes ».",
			parameters: {
				type: "object",
				properties: {
					limit: { type: "number", description: "Nombre max (défaut 5)." },
					unreadOnly: { type: "boolean", description: "true = non lues uniquement (défaut true)." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "read_pending_requests",
			description:
				"Lit les demandes consulaires en attente (mes assignations ou l'org active). " +
				"À UTILISER pour : « lis-moi les demandes en attente », « qu'est-ce qu'il y a à traiter ? », " +
				"« quel est mon backlog ? ». Énumère par priorité décroissante.",
			parameters: {
				type: "object",
				properties: {
					scope: { type: "string", description: "'mine' | 'org' (défaut 'mine')." },
					limit: { type: "number", description: "Défaut 5." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "read_correspondance_inbox",
			description:
				"Lit les correspondances entrantes prioritaires (status pending / under_review) de l'org active. " +
				"À UTILISER pour : « lis-moi la correspondance », « qu'est-ce qu'il y a dans la boîte ? », " +
				"« quels documents officiels sont arrivés ? ».",
			parameters: {
				type: "object",
				properties: {
					limit: { type: "number", description: "Défaut 5." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "read_today_agenda",
			description:
				"Lit les rendez-vous et réunions du jour. " +
				"À UTILISER pour : « qu'ai-je dans mon agenda ? », « lis-moi mon programme », " +
				"« quels RDV aujourd'hui ? », « quelle est ma prochaine réunion ? ».",
			parameters: {
				type: "object",
				properties: {
					includeAppointments: { type: "boolean", description: "Défaut true." },
					includeMeetings: { type: "boolean", description: "Défaut true." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "read_chat_thread",
			description:
				"Lit les N derniers messages d'un fil de discussion (chat). Si `targetUserId` absent, " +
				"prend la conversation la plus récente. À UTILISER pour : « lis-moi les derniers messages de X », " +
				"« reprends le fil avec Sophie », « qu'est-ce que j'ai écrit à Marc ? ».",
			parameters: {
				type: "object",
				properties: {
					targetUserId: { type: "string", description: "ID Convex du contact." },
					limit: { type: "number", description: "Nombre de messages (défaut 5)." },
				},
				required: [],
			},
		},
	},

	// ─── TRAITEMENT DE LA FILE (Process — actions mutatives gated) ───
	{
		requiredTask: "requests.validate",
		tool: {
			type: "function",
			name: "approve_request",
			description:
				"Valide une demande consulaire. RÈGLE : récap oral (numéro + bénéficiaire + service) et " +
				"attendre « oui » avant exécution. Expressions : « approuve cette demande », " +
				"« valide le dossier X », « confirme la demande de Bongo ».",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex de la demande." },
					comment: { type: "string", description: "Commentaire optionnel ajouté à l'historique." },
				},
				required: ["requestId"],
			},
		},
	},
	{
		requiredTask: "requests.validate",
		tool: {
			type: "function",
			name: "reject_request",
			description:
				"Refuse une demande consulaire. RÈGLE STRICTE : motif obligatoire + DOUBLE confirmation orale. " +
				"Étape 1 récap initial, attente « oui ». Étape 2 récap final, attente second « oui ». " +
				"Expressions : « refuse la demande X pour motif Y », « rejette le dossier de Bongo ».",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex de la demande." },
					reason: { type: "string", description: "Motif obligatoire (sera consigné en audit log)." },
				},
				required: ["requestId", "reason"],
			},
		},
	},
	{
		requiredTask: "requests.process",
		tool: {
			type: "function",
			name: "request_more_info",
			description:
				"Demande des compléments d'information au demandeur (notification + statut intermédiaire). " +
				"Expressions : « demande à X de fournir Y », « besoin de compléments pour le dossier Z ».",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex de la demande." },
					what: { type: "string", description: "Description des compléments demandés." },
				},
				required: ["requestId", "what"],
			},
		},
	},
	{
		requiredTask: "correspondance.approve",
		tool: {
			type: "function",
			name: "advance_correspondance_status",
			description:
				"Avance le statut d'une correspondance (validation / signature / envoi). RÈGLE : récap oral. " +
				"Expressions : « valide la correspondance X », « signe le télégramme Y ».",
			parameters: {
				type: "object",
				properties: {
					itemId: { type: "string", description: "ID Convex de la correspondance." },
					nextStatus: {
						type: "string",
						description: "Statut cible (ex : 'approved', 'signed', 'sent').",
					},
					comment: { type: "string", description: "Commentaire optionnel." },
				},
				required: ["itemId", "nextStatus"],
			},
		},
	},
	{
		requiredTask: "correspondance.archive",
		tool: {
			type: "function",
			name: "archive_correspondance",
			description:
				"Archive une correspondance traitée. Expressions : « archive le télégramme X », " +
				"« range cette correspondance ». Confirmation simple requise.",
			parameters: {
				type: "object",
				properties: {
					itemId: { type: "string", description: "ID Convex de la correspondance." },
				},
				required: ["itemId"],
			},
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "cancel_meeting",
			description:
				"Annule une réunion planifiée. Expressions : « annule ma réunion de 15h », " +
				"« supprime la réunion X ». Récap oral avant exécution.",
			parameters: {
				type: "object",
				properties: {
					meetingId: { type: "string", description: "ID Convex de la réunion." },
				},
				required: ["meetingId"],
			},
		},
	},
	{
		requiredTask: "meetings.create",
		tool: {
			type: "function",
			name: "reschedule_meeting",
			description:
				"Replanifie une réunion existante à une nouvelle date/heure. Confirmation orale.",
			parameters: {
				type: "object",
				properties: {
					meetingId: { type: "string", description: "ID Convex de la réunion." },
					newScheduledAt: {
						type: "string",
						description: "Nouvelle date/heure ISO 8601.",
					},
				},
				required: ["meetingId", "newScheduledAt"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "cancel_request",
			description:
				"Annule une demande consulaire (côté demandeur ou agent autorisé). Motif obligatoire. " +
				"Expressions : « annule la demande X ». Confirmation orale.",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex." },
					reason: { type: "string", description: "Motif." },
				},
				required: ["requestId", "reason"],
			},
		},
	},

	// ─── SURFACE CITOYEN — outils ressortissant ───
	// (exposés via une logique dédiée dans getToolsForUser, voir bas de fichier)
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "submit_consular_request_intent",
			description:
				"[CITOYEN] Démarre une demande consulaire (passeport, CNI, visa, légalisation, état civil). " +
				"Ouvre l'assistant de dépôt avec pré-remplissage. " +
				"Expressions : « dépose une demande de passeport », « je veux faire ma CNI », " +
				"« j'ai besoin d'une légalisation ».",
			parameters: {
				type: "object",
				properties: {
					serviceCode: {
						type: "string",
						description: "Code du service : 'passport', 'cni', 'visa', 'legalization', 'civil_status', 'consular_registration'.",
					},
				},
				required: ["serviceCode"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "track_my_request",
			description:
				"[CITOYEN/AGENT] Donne le statut d'une de mes demandes. Si `requestId` absent, prend la plus récente. " +
				"Lit le statut courant + prochaine étape + intervenants. " +
				"Expressions : « où en est ma demande ? », « quel est le statut de mon passeport ? ».",
			parameters: {
				type: "object",
				properties: {
					requestId: { type: "string", description: "ID Convex (optionnel)." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "book_my_appointment_intent",
			description:
				"[CITOYEN] Ouvre le flux de prise de rendez-vous consulaire. " +
				"Expressions : « prends-moi un rendez-vous », « je veux un RDV au consulat ».",
			parameters: {
				type: "object",
				properties: {
					orgId: { type: "string", description: "ID Convex du consulat (optionnel — résolu via résidence)." },
					serviceCode: { type: "string", description: "Code service souhaité." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "read_my_inbox",
			description:
				"[CITOYEN/AGENT] Lit ma boîte de messages (notifications + chats récents). " +
				"Expressions : « lis-moi ma boîte », « ai-je des messages ? ».",
			parameters: {
				type: "object",
				properties: {
					limit: { type: "number", description: "Défaut 5." },
				},
				required: [],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "call_my_consulate",
			description:
				"[CITOYEN] Lance un appel vers la ligne du consulat de juridiction de l'utilisateur. " +
				"Expressions : « appelle mon consulat », « j'ai besoin de parler à un agent ».",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},

	{
		requiredTask: "consular_registrations.view",
		tool: {
			type: "function",
			name: "search_consular_registrations",
			description:
				"Recherche dans l'annuaire des ressortissants gabonais inscrits au registre consulaire (adultes + enfants). " +
				"À UTILISER pour : « Trouve les ressortissants nommés Bongo », « Cherche M. Mbeng au consulat de Madrid », " +
				"« Combien d'inscrits au consulat de Paris ? » (compter via limit + résultat). " +
				"RÈGLE : confidentialité — ne JAMAIS divulguer numéro carte ou détails personnels sans confirmation que l'interlocuteur est bien le titulaire ou un agent autorisé.",
			parameters: {
				type: "object",
				properties: {
					searchQuery: {
						type: "string",
						description: "Nom ou prénom partiel à rechercher (min 2 caractères). Ou numéro de carte exact.",
					},
					orgId: {
						type: "string",
						description: "ID Convex du consulat. Par défaut : l'org active du caller. Préciser via find_orgs_by_country si recherche hors-périmètre.",
					},
					profileType: {
						type: "string",
						description: "'adult' | 'child' | 'all' (défaut : 'all').",
					},
				},
				required: ["searchQuery"],
			},
		},
	},

	// ───────────────────────────────────────────────────────────
	// Outils métier originaux (consultation, correspondance, etc.)
	// ───────────────────────────────────────────────────────────
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
			name: "query_platform_knowledge",
			description:
				"Recherche sémantique (RAG) dans la base de connaissance de la plateforme : organisations, services, FAQ, procédures, documents publiés. " +
				"Renvoie jusqu'à 5 extraits avec sources citables (sourceType + sourceId). " +
				"RÈGLE : citer toujours les sources à voix haute (ex : « selon la FAQ de l'ambassade de Paris... »).",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description:
							"Question ou mots-clés (ex : 'procédure légalisation acte naissance', 'services consulaires Madrid').",
					},
					sourceTypes: {
						type: "array",
						description:
							"Restreindre la recherche à certains types : 'org', 'position', 'service', 'workflow', 'doc', 'faq', 'intel_brief', 'procedure'.",
						items: { type: "string" },
					},
				},
				required: ["query"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "who_is_working_on",
			description:
				"Identifie qui travaille actuellement sur une entité métier (dossier, correspondance, cible diplomatique). " +
				"Retourne les memberships actifs avec position + dernière action.",
			parameters: {
				type: "object",
				properties: {
					entityType: {
						type: "string",
						description: "'request' / 'correspondance' / 'diplomatic_target'.",
					},
					entityId: {
						type: "string",
						description: "ID Convex de l'entité ou numéro lisible.",
					},
				},
				required: ["entityType", "entityId"],
			},
		},
	},
	{
		requiredTask: null,
		tool: {
			type: "function",
			name: "status_of",
			description:
				"Snapshot rapide de l'état d'une entité (statut workflow + prochaine étape + intervenants).",
			parameters: {
				type: "object",
				properties: {
					entityType: {
						type: "string",
						description: "'request' / 'correspondance' / 'meeting' / 'appointment'.",
					},
					entityId: {
						type: "string",
						description: "ID Convex de l'entité.",
					},
				},
				required: ["entityType", "entityId"],
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

	// ───────────────────────────────────────────────────────────
	// Administration plateforme (Phase 2 — Mode God complet)
	// Tools superadmin/admin pour piloter la plateforme à la voix.
	// Toutes les mutations Convex sous-jacentes appliquent déjà :
	//   - self-action guard (CANNOT_REMOVE_SELF)
	//   - SuperAdmin guard (impossible de modifier un SuperAdmin)
	//   - rank hierarchy (caller must outrank target)
	// L'agent vocal DOIT demander confirmation orale (récap) avant exécution.
	// ───────────────────────────────────────────────────────────
	{
		requiredTask: null,
		superadminOnly: false, // backofficeMutation suffit, pas besoin d'être superadmin
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "find_org_by_name",
			description:
				"Recherche une organisation par nom (ex : 'Ambassade Paris', 'Consulat Madrid'). " +
				"Retourne jusqu'à 5 candidats. À utiliser AVANT toute action ciblant une org.",
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: "Nom partiel ou complet à rechercher.",
					},
				},
				required: ["name"],
			},
		},
	},
	{
		requiredTask: null,
		superadminOnly: false,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "assign_role_to_user",
			description:
				"Modifie le rôle d'un utilisateur (user / sous_admin / admin / admin_system). " +
				"Le caller doit avoir un rang strictement supérieur au rôle cible. " +
				"RÈGLE : récapituler oralement (utilisateur cible + ancien rôle + nouveau rôle) et obtenir confirmation 'oui' avant exécution.",
			parameters: {
				type: "object",
				properties: {
					userId: {
						type: "string",
						description: "ID Convex de l'utilisateur (obtenu via find_contact_by_name).",
					},
					role: {
						type: "string",
						description: "Nouveau rôle : 'user', 'sous_admin', 'admin' ou 'admin_system'.",
					},
				},
				required: ["userId", "role"],
			},
		},
	},
	{
		requiredTask: null,
		superadminOnly: false,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "suspend_user",
			description:
				"Désactive un utilisateur (compte suspendu, ne peut plus se connecter). " +
				"RÈGLE STRICTE : double confirmation orale obligatoire — récap initial + récap final.",
			parameters: {
				type: "object",
				properties: {
					userId: {
						type: "string",
						description: "ID Convex de l'utilisateur.",
					},
					reason: {
						type: "string",
						description: "Motif de la suspension (sera enregistré dans l'audit log).",
					},
				},
				required: ["userId", "reason"],
			},
		},
	},
	{
		requiredTask: null,
		superadminOnly: false,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "reactivate_user",
			description:
				"Réactive un utilisateur précédemment suspendu. " +
				"Confirmation simple (récap utilisateur + 'confirmez la réactivation ?').",
			parameters: {
				type: "object",
				properties: {
					userId: {
						type: "string",
						description: "ID Convex de l'utilisateur.",
					},
				},
				required: ["userId"],
			},
		},
	},
	{
		requiredTask: null,
		superadminOnly: false,
		surfaceOnly: "backoffice",
		tool: {
			type: "function",
			name: "update_user_modules",
			description:
				"Met à jour la liste des modules accessibles à un utilisateur. " +
				"RÈGLE : récapituler oralement les modules ajoutés/retirés avant exécution.",
			parameters: {
				type: "object",
				properties: {
					userId: {
						type: "string",
						description: "ID Convex de l'utilisateur.",
					},
					modules: {
						type: "array",
						description: "Liste complète des codes de modules autorisés (ex : ['correspondance', 'documents']).",
						items: { type: "string" },
					},
				},
				required: ["userId", "modules"],
			},
		},
	},

	// ─── Tools superadmin (read-only redirect — phases ultérieures pour exécution réelle) ───
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
		surface: v.union(
			v.literal("agent"),
			v.literal("backoffice"),
			v.literal("citizen"),
		),
	},
	handler: async (ctx, { userId, orgId, surface }) => {
		const user = await ctx.db.get(userId);
		if (!user) return { tools: [], toolNames: [] };

		// Côté citoyen : UI tools + tools citoyen-spécifiques (libre-service consulaire).
		// Les business tools agent (consult_request, draft_correspondence, validations
		// de dossiers, etc.) restent hors-périmètre.
		const CITIZEN_BUSINESS_TOOLS = new Set([
			"submit_consular_request_intent",
			"track_my_request",
			"book_my_appointment_intent",
			"read_my_inbox",
			"call_my_consulate",
			// Lecture limitée : ses propres notifications + agenda
			"read_notifications",
			"read_today_agenda",
			"read_chat_thread",
			"cancel_request",
		]);
		if (surface === "citizen") {
			const tools: RealtimeVoiceTool[] = [...UI_TOOLS];
			for (const gated of BUSINESS_TOOLS) {
				if (CITIZEN_BUSINESS_TOOLS.has(gated.tool.name)) {
					tools.push(gated.tool);
				}
			}
			return { tools, toolNames: tools.map((t) => t.name) };
		}

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
