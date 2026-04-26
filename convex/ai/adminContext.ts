/**
 * Helpers partagés par toutes les modalités du chat admin (request/response,
 * streaming, voice). Centralise le validator de page-context, le system prompt
 * et la construction du prompt enrichi avec le contexte d'écran.
 */
import { v } from "convex/values";

export const ADMIN_SYSTEM_PROMPT = `Tu es l'Assistant IA du Système Consulaire, dédié aux agents et personnel diplomatique du Consulat du Gabon.

RÔLE:
Tu aides les agents consulaires dans leur travail quotidien : traitement des demandes, gestion du registre, rendez-vous, communication avec les citoyens.

COMPORTEMENT:
- Réponds dans la langue de l'utilisateur (français par défaut)
- Sois professionnel, efficace et précis
- Utilise TOUJOURS les outils pour accéder aux données réelles
- Ne jamais inventer d'informations
- Commence par utiliser getAgentContext pour comprendre la situation de l'agent
- Pour naviguer l'agent vers une page admin, utilise navigateTo

TRAITEMENT DES DEMANDES:
- Utilise getRequestsList pour voir les demandes filtrées par statut
- Utilise getPendingRequests pour les demandes en attente
- Utilise getRequestDetail pour voir le détail d'une demande
- Utilise updateRequestStatus pour changer le statut (nécessite confirmation)
- Utilise addNoteToRequest pour ajouter une note interne
- Utilise assignRequest pour assigner à un agent

REGISTRE CONSULAIRE:
- Utilise searchCitizens pour chercher un citoyen
- Utilise getCitizenProfile pour voir le profil détaillé
- Utilise getRegistryStats pour les statistiques du registre

RENDEZ-VOUS:
- Utilise getAppointmentsList pour voir les RDV
- Utilise manageAppointment pour confirmer/annuler/terminer un RDV

COMMUNICATION:
- Utilise getOrgMailInbox pour voir la boîte mail
- Utilise sendOrgMail pour envoyer un message officiel
- Utilise getOrgPosts pour voir les publications

ÉQUIPE:
- Utilise getTeamMembers pour voir l'équipe

IMPORTANT:
- Toutes les mutations nécessitent une confirmation de l'agent avant exécution
- Respecte strictement les permissions de l'agent — si un outil n'est pas disponible, explique que l'agent n'a pas la permission`;

// Validator pour le rich page context publié par usePageContext()
export const pageContextValidator = v.object({
  module: v.string(),
  pathname: v.string(),
  title: v.string(),
  summary: v.string(),
  visibleEntities: v.array(
    v.object({
      id: v.string(),
      type: v.string(),
      label: v.string(),
      data: v.optional(v.any()),
    }),
  ),
  availableActions: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      description: v.string(),
      requiresConfirmation: v.optional(v.boolean()),
      permission: v.optional(v.string()),
      params: v.optional(v.any()),
    }),
  ),
  scopedToolNames: v.array(v.string()),
  updatedAt: v.number(),
});

export type PageContextArg = {
  module: string;
  pathname: string;
  title: string;
  summary: string;
  visibleEntities: Array<{
    id: string;
    type: string;
    label: string;
    data?: unknown;
  }>;
  availableActions: Array<{
    id: string;
    label: string;
    description: string;
    requiresConfirmation?: boolean;
    permission?: string;
    params?: unknown;
  }>;
  scopedToolNames: string[];
  updatedAt: number;
};

export function buildPageContextSection(ctx?: PageContextArg | null): string {
  if (!ctx) return "";
  const lines: string[] = [];
  lines.push("\n\n## Contexte de l'écran actuel");
  lines.push(`Module: ${ctx.module} (${ctx.pathname})`);
  lines.push(`Titre: ${ctx.title}`);
  if (ctx.summary) lines.push(`Résumé: ${ctx.summary}`);

  if (ctx.visibleEntities.length > 0) {
    lines.push(`\nÉléments visibles (${ctx.visibleEntities.length}):`);
    for (const e of ctx.visibleEntities) {
      const dataPreview = e.data
        ? ` ${JSON.stringify(e.data).slice(0, 200)}`
        : "";
      lines.push(`- [${e.type}] ${e.label} (id: ${e.id})${dataPreview}`);
    }
  }

  if (ctx.availableActions.length > 0) {
    lines.push(`\nActions disponibles sur cette page:`);
    for (const a of ctx.availableActions) {
      const conf = a.requiresConfirmation ? " (confirmation requise)" : "";
      lines.push(`- ${a.id}: ${a.label} — ${a.description}${conf}`);
    }
    lines.push(
      `\nUtilise le tool 'executePageAction' avec l'actionId exact pour déclencher une de ces actions.`,
    );
  }

  lines.push(
    `\nQuand l'utilisateur dit "ce dossier", "cet élément", "celui-ci", base-toi sur les éléments visibles ci-dessus.`,
  );
  return lines.join("\n");
}

export type AdminAgentInfo = {
  firstName?: string;
  lastName?: string;
  positionName: string;
  orgName: string;
  orgId: string;
};

/**
 * Assemble le system prompt complet : base + identité de l'agent + page context.
 */
export function buildAdminContextPrompt(
  agent: AdminAgentInfo,
  currentPage: string | undefined,
  pageContext: PageContextArg | null | undefined,
): string {
  let prompt = ADMIN_SYSTEM_PROMPT;
  prompt += `\n\nAGENT ACTUEL:
- Nom: ${agent.firstName ?? ""} ${agent.lastName ?? ""}
- Poste: ${agent.positionName}
- Organisation: ${agent.orgName}
- OrgId: ${agent.orgId}`;
  if (currentPage) {
    prompt += `\n- Page actuelle: ${currentPage}`;
  }
  prompt += buildPageContextSection(pageContext);
  return prompt;
}
