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

const NO_CONTEXT = `## CONTEXTE PAGE COURANT
Aucune page applicative active. Si l'utilisateur fait référence à un écran,
demandez-lui d'ouvrir le module concerné ou proposez une navigation via
\`navigate_to_module\`.`;

export function formatPageContextForVoice(
	snapshot: PageContextLike | null | undefined,
): string {
	if (!snapshot) return NO_CONTEXT;

	const lines: string[] = [];
	lines.push("## CONTEXTE PAGE COURANT");
	lines.push(`Page : ${snapshot.title} (${snapshot.pathname})`);
	lines.push(`Module : ${snapshot.module}`);
	if (snapshot.summary) {
		lines.push(`État : ${snapshot.summary}`);
	}

	if (snapshot.visibleEntities.length > 0) {
		lines.push("");
		lines.push(
			`Entités visibles (${snapshot.visibleEntities.length}) — utilisables comme paramètres d'action :`,
		);
		for (const entity of snapshot.visibleEntities) {
			lines.push(`- [${entity.type}] ${entity.label} (id: ${entity.id})`);
		}
	}

	if (snapshot.availableActions.length > 0) {
		lines.push("");
		lines.push(
			"Actions disponibles sur cette page (à déclencher via le tool `execute_page_action`) :",
		);
		for (const action of snapshot.availableActions) {
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
			"Règle : n'invoquez `execute_page_action` qu'avec un `actionId` listé ci-dessus. " +
				"Pour toute action marquée CONFIRMATION REQUISE, demandez d'abord oralement " +
				"à l'utilisateur, puis appelez l'action après son accord explicite.",
		);
	} else {
		lines.push("");
		lines.push(
			"Aucune action exécutable n'est déclarée par cette page. Vous pouvez répondre aux questions et naviguer, mais ne tentez pas `execute_page_action`.",
		);
	}

	return lines.join("\n");
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
