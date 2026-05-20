/**
 * formatPageContextForVoice — sérialise un snapshot de contexte de page
 * en bloc texte injectable dans le `instructions` d'une session OpenAI
 * Realtime via `session.update`.
 *
 * Miroir vocal du contexte que le backend texte (`api.ai.adminChat.chat`)
 * formate déjà côté serveur. Garde la même sémantique pour que les deux
 * modalités déclenchent les mêmes `availableActions` via les mêmes IDs.
 *
 * Le typage est structurel — on accepte n'importe quel objet conforme à
 * `PageContextLike` (les champs sont compatibles avec `PageContextSnapshot`
 * de `@workspace/agent-features/stores/page-context-store`), pour éviter
 * de coupler ce package au monorepo agent-web.
 */

export interface PageEntityLike {
	id: string;
	type: string;
	label: string;
	data?: Record<string, unknown>;
}

export interface PageActionLike {
	id: string;
	label: string;
	description: string;
	requiresConfirmation?: boolean;
	permission?: string;
	params?: Record<string, unknown>;
}

export interface PageContextLike {
	module: string;
	pathname: string;
	title: string;
	summary: string;
	visibleEntities: PageEntityLike[];
	availableActions: PageActionLike[];
	scopedToolNames?: string[];
}

export interface ShellContextLike {
	summary?: string;
	availableActions: PageActionLike[];
}

export interface PanelContextLike {
	panelId: string;
	tabId: string;
	surface: "backoffice" | "agent" | "citizen";
	title: string;
	summary: string;
	visibleEntities: PageEntityLike[];
	availableActions: PageActionLike[];
}

/**
 * Description sérialisable d'un champ de formulaire pilotable par la voix.
 * Mirror du résultat de `pageContextStore.getFieldDescriptors()`.
 */
export interface FormFieldLike {
	id: string;
	type: string;
	label: string;
	formId?: string;
	required?: boolean;
	currentValue?: unknown;
	options?: Array<{ value: string; label: string }>;
}

const NO_CONTEXT = `## CONTEXTE PAGE COURANT
Aucune page applicative active. Si l'utilisateur fait référence à un écran,
demandez-lui d'ouvrir le module concerné ou proposez une navigation via
\`navigate_to_module\`.`;

/**
 * Sérialise le contexte courant (page + shell) en bloc texte injectable
 * dans le `instructions` d'une session OpenAI Realtime via `session.update`.
 *
 * Accepte deux formes d'entrée pour rétro-compatibilité :
 * - `formatPageContextForVoice(pageSnapshot)` — comportement initial
 * - `formatPageContextForVoice({ page, shell })` — fusion explicite
 */
export function formatPageContextForVoice(
	input:
		| PageContextLike
		| null
		| undefined
		| {
				page?: PageContextLike | null;
				shell?: ShellContextLike | null;
				panel?: PanelContextLike | null;
				fields?: FormFieldLike[] | null;
				/**
				 * Sprint 4 — B4 : drapeau d'appel/réunion LiveKit actif. Quand
				 * `true`, un bloc dédié est injecté en TÊTE du contexte pour
				 * que le modèle adopte immédiatement la « voix très brève »
				 * (cf. règle « COMPORTEMENT EN PRÉSENCE D'UN APPEL... » du
				 * system prompt).
				 */
				meetingInProgress?: boolean | null;
				/**
				 * Sprint 6 — C4 : texte extrait d'un document ouvert dans la
				 * page (typiquement un PDF via pdf.js). Quand fourni, un bloc
				 * `## DOCUMENT À L'ÉCRAN` est injecté pour permettre à l'agent
				 * de raisonner dessus sans nécessiter une capture vision. Le
				 * texte est tronqué automatiquement à 8 000 caractères (~ 2K
				 * tokens) pour borner le coût.
				 */
				documentText?: string | null;
		  },
): string {
	const { page, shell, panel, fields, meetingInProgress, documentText } =
		normalizeInput(input);

	const lines: string[] = [];

	// Sprint 4 — B4 : drapeau réunion en TÊTE pour priorité absolue.
	if (meetingInProgress === true) {
		lines.push("## MEETING_IN_PROGRESS");
		lines.push(
			"L'utilisateur est actuellement engagé dans un appel ou une réunion LiveKit. Activez la règle « COMPORTEMENT EN PRÉSENCE D'UN APPEL OU RÉUNION LIVEKIT » du préambule : voix très brève (1 phrase, 4-7 mots), aucune initiative, exécution silencieuse des tools de contrôle.",
		);
		lines.push("");
	}

	// Sprint 6 — C4 : texte de document ouvert (OCR contextuel automatique).
	if (documentText && documentText.trim().length > 0) {
		const truncated = documentText.trim().slice(0, 8000);
		const wasTruncated = documentText.trim().length > 8000;
		lines.push("## DOCUMENT À L'ÉCRAN");
		lines.push(
			"L'utilisateur a un document ouvert dans la page courante. Voici son contenu textuel (extrait automatiquement, peut contenir des erreurs OCR). Référez-vous-y pour répondre aux questions sur ce document sans avoir besoin de `capture_screen_region`.",
		);
		lines.push("");
		lines.push("```");
		lines.push(truncated);
		if (wasTruncated) {
			lines.push("...[document tronqué — fin non incluse]");
		}
		lines.push("```");
		lines.push("");
	}

	// ── Bloc shell (actions globales, toujours présent si déclaré) ──
	if (shell && shell.availableActions.length > 0) {
		lines.push("## ACTIONS GLOBALES (SHELL)");
		if (shell.summary) {
			lines.push(`État global : ${shell.summary}`);
		}
		lines.push(
			"Actions disponibles partout dans l'application (déclenchables via `execute_page_action`) :",
		);
		for (const action of shell.availableActions) {
			const confirm = action.requiresConfirmation
				? " — CONFIRMATION REQUISE"
				: "";
			lines.push(`- ${action.id} : ${action.description}${confirm}`);
			if (action.params && Object.keys(action.params).length > 0) {
				lines.push(`  paramètres : ${formatParamsSummary(action.params)}`);
			}
		}
		lines.push("");
	}

	// ── Bloc panel iAsted (overlay sur la page) ──
	// Priorité haute : c'est ce que l'utilisateur regarde en focus immédiat
	// (fenêtre flottante iAsted). Ses actionId sont préfixés par tab
	// (iappel.*, icontact.*, ichat.*, imeeting.*, isettings.*).
	if (panel) {
		lines.push(`## PANNEAU iASTED OUVERT (overlay sur la page)`);
		lines.push(`Onglet : ${panel.title} (tab=${panel.tabId}, surface=${panel.surface})`);
		if (panel.summary) {
			lines.push(`État : ${panel.summary}`);
		}
		if (panel.visibleEntities.length > 0) {
			lines.push("");
			lines.push(
				`Entités visibles dans le panneau (${panel.visibleEntities.length}) — utilisables comme paramètres :`,
			);
			for (const entity of panel.visibleEntities) {
				const dataHint = formatEntityData(entity.data);
				lines.push(
					`- [${entity.type}] ${entity.label} (id: ${entity.id})${dataHint}`,
				);
			}
		}
		if (panel.availableActions.length > 0) {
			lines.push("");
			lines.push(
				"Actions disponibles sur ce panneau (déclencher via `execute_page_action` avec l'`actionId` EXACT préfixé par le tab) :",
			);
			for (const action of panel.availableActions) {
				const confirm = action.requiresConfirmation
					? " — CONFIRMATION REQUISE"
					: "";
				lines.push(`- ${action.id} : ${action.description}${confirm}`);
				if (action.params && Object.keys(action.params).length > 0) {
					lines.push(`  paramètres : ${formatParamsSummary(action.params)}`);
				}
			}
			lines.push("");
			lines.push(
				"Règle : les commandes vocales métier (« filtre Back-Office », « cherche X », " +
					"« appelle-la », « efface la recherche ») ciblent CE panneau, pas la page derrière. " +
					"Les `actionId` du panel sont toujours préfixés (`iappel.*`, `icontact.*`, etc.). " +
					"Quand le panneau est fermé, ce bloc disparaît : les commandes retombent alors sur la page.",
			);
		}
		lines.push("");
	}

	// ── Bloc page courante ───────────────────────────────────────
	if (!page) {
		lines.push(NO_CONTEXT);
		return lines.join("\n");
	}

	lines.push("## CONTEXTE PAGE COURANT");
	lines.push(`Page : ${page.title} (${page.pathname})`);
	lines.push(`Module : ${page.module}`);
	if (page.summary) {
		lines.push(`État : ${page.summary}`);
	}

	if (page.visibleEntities.length > 0) {
		lines.push("");
		lines.push(
			`Entités visibles (${page.visibleEntities.length}) — utilisables comme paramètres d'action :`,
		);
		for (const entity of page.visibleEntities) {
			const dataHint = formatEntityData(entity.data);
			lines.push(
				`- [${entity.type}] ${entity.label} (id: ${entity.id})${dataHint}`,
			);
		}
	}

	if (page.availableActions.length > 0) {
		lines.push("");
		lines.push(
			"Actions disponibles sur cette page (à déclencher via le tool `execute_page_action`) :",
		);
		for (const action of page.availableActions) {
			const confirm = action.requiresConfirmation
				? " — CONFIRMATION REQUISE"
				: "";
			lines.push(`- ${action.id} : ${action.description}${confirm}`);
			if (action.params && Object.keys(action.params).length > 0) {
				lines.push(`  paramètres : ${formatParamsSummary(action.params)}`);
			}
		}
		lines.push("");
		lines.push(
			"Règle : n'invoquez `execute_page_action` qu'avec un `actionId` listé ci-dessus ou dans la section ACTIONS GLOBALES. " +
				"Pour toute action marquée CONFIRMATION REQUISE, demandez d'abord oralement " +
				"à l'utilisateur, puis appelez l'action après son accord explicite.",
		);
	} else {
		lines.push("");
		lines.push(
			"Aucune action exécutable n'est déclarée par cette page. Les actions globales restent utilisables.",
		);
	}

	// ── Bloc CHAMPS DE FORMULAIRE (dictée vocale) ──
	if (fields && fields.length > 0) {
		lines.push("");
		lines.push("## CHAMPS DE FORMULAIRE (dictée vocale)");
		lines.push(
			"Vous pouvez remplir ces champs à la voix via `fill_form_field(fieldId, value)`. " +
				"Pour les selects/radios, le système fait du fuzzy-match sur le `label` des options. " +
				"Soumettez via `submit_form(formId?)`. Effacez via `clear_form_field(fieldId)`.",
		);
		// Grouper par formId
		const byForm = new Map<string, FormFieldLike[]>();
		for (const f of fields) {
			const fid = f.formId ?? "default";
			if (!byForm.has(fid)) byForm.set(fid, []);
			byForm.get(fid)!.push(f);
		}
		for (const [formId, list] of byForm) {
			lines.push(`\nFormulaire « ${formId} » (${list.length} champs) :`);
			for (const f of list) {
				const req = f.required ? " [obligatoire]" : "";
				const cur =
					f.currentValue !== undefined && f.currentValue !== "" && f.currentValue !== null
						? ` (actuel : ${formatFieldValue(f.currentValue)})`
						: "";
				const opts =
					f.options && f.options.length > 0
						? ` — options : ${f.options
								.slice(0, 8)
								.map((o) => o.label)
								.join(", ")}${f.options.length > 8 ? "…" : ""}`
						: "";
				lines.push(
					`- ${f.id} [${f.type}] « ${f.label} »${req}${cur}${opts}`,
				);
			}
		}
	}

	return lines.join("\n");
}

function formatFieldValue(v: unknown): string {
	if (v === null || v === undefined) return "—";
	if (typeof v === "string") return v.length > 80 ? v.slice(0, 79) + "…" : v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	if (Array.isArray(v)) return `[${v.length} valeur(s)]`;
	return "{objet}";
}

function normalizeInput(
	input:
		| PageContextLike
		| null
		| undefined
		| {
				page?: PageContextLike | null;
				shell?: ShellContextLike | null;
				panel?: PanelContextLike | null;
				fields?: FormFieldLike[] | null;
				meetingInProgress?: boolean | null;
				documentText?: string | null;
		  },
): {
	page: PageContextLike | null;
	shell: ShellContextLike | null;
	panel: PanelContextLike | null;
	fields: FormFieldLike[] | null;
	meetingInProgress: boolean;
	documentText: string | null;
} {
	if (!input)
		return {
			page: null,
			shell: null,
			panel: null,
			fields: null,
			meetingInProgress: false,
			documentText: null,
		};
	// Discrimine la forme { page, shell, panel, fields } de la forme PageContextLike directe :
	// PageContextLike a forcément un `module` (string), { page, ... } non.
	if (typeof (input as PageContextLike).module === "string") {
		return {
			page: input as PageContextLike,
			shell: null,
			panel: null,
			fields: null,
			meetingInProgress: false,
			documentText: null,
		};
	}
	const obj = input as {
		page?: PageContextLike | null;
		shell?: ShellContextLike | null;
		panel?: PanelContextLike | null;
		fields?: FormFieldLike[] | null;
		meetingInProgress?: boolean | null;
		documentText?: string | null;
	};
	return {
		page: obj.page ?? null,
		shell: obj.shell ?? null,
		panel: obj.panel ?? null,
		fields: obj.fields ?? null,
		meetingInProgress: obj.meetingInProgress === true,
		documentText: obj.documentText ?? null,
	};
}

function formatEntityData(data: Record<string, unknown> | undefined): string {
	if (!data) return "";
	const keys = Object.keys(data);
	if (keys.length === 0) return "";
	const parts: string[] = [];
	for (const k of keys.slice(0, 5)) {
		const v = data[k];
		if (v == null) continue;
		if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
			parts.push(`${k}=${v}`);
		}
	}
	return parts.length > 0 ? ` { ${parts.join(", ")} }` : "";
}

function formatParamsSummary(params: Record<string, unknown>): string {
	const keys = Object.keys(params);
	if (keys.length === 0) return "{}";
	const summary = keys
		.map((k) => {
			const v = params[k];
			if (typeof v === "string") return `${k}: ${v}`;
			if (typeof v === "object" && v !== null) {
				const t = (v as { type?: unknown }).type;
				if (typeof t === "string") return `${k}: ${t}`;
			}
			return k;
		})
		.join(", ");
	return `{ ${summary} }`;
}
