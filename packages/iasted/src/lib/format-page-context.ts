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
		| { page?: PageContextLike | null; shell?: ShellContextLike | null },
): string {
	const { page, shell } = normalizeInput(input);

	const lines: string[] = [];

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

	return lines.join("\n");
}

function normalizeInput(
	input:
		| PageContextLike
		| null
		| undefined
		| { page?: PageContextLike | null; shell?: ShellContextLike | null },
): { page: PageContextLike | null; shell: ShellContextLike | null } {
	if (!input) return { page: null, shell: null };
	// Discrimine la forme { page, shell } de la forme PageContextLike directe :
	// PageContextLike a forcément un `module` (string), { page, shell } non.
	if (typeof (input as PageContextLike).module === "string") {
		return { page: input as PageContextLike, shell: null };
	}
	const obj = input as { page?: PageContextLike | null; shell?: ShellContextLike | null };
	return { page: obj.page ?? null, shell: obj.shell ?? null };
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
