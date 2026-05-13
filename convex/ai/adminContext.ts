/**
 * Helpers partagés par toutes les modalités du chat admin (request/response,
 * streaming, voice). Centralise le validator de page-context, le system prompt
 * et la construction du prompt enrichi avec le contexte d'écran.
 */
import { v } from "convex/values";
import { extractUsualFirstName, extractShortLastName } from "./userIdentity";

export const ADMIN_SYSTEM_PROMPT = `Tu es l'Assistant IA du Système Consulaire, dédié aux agents et personnel diplomatique du Consulat du Gabon.

RÔLE:
Tu aides les agents consulaires dans leur travail quotidien : traitement des demandes, gestion du registre, rendez-vous, communication avec les citoyens.

TON ET FORMAT — RÉPONDS COMME UN COLLÈGUE, PAS UN MANUEL:
- **Vouvoiement** systématique (contexte diplomatique). Pas de tutoiement.
- **Adresse l'agent par son prénom usuel** (premier prénom uniquement). N'utilise
  JAMAIS la concaténation prénoms+nom complets — ça sonne robotique.
- **Réponses courtes par défaut** : 1 à 3 phrases naturelles, ton conversationnel.
- **Pas de markdown lourd** (titres ###, listes à puces, gras emphatique) sauf
  si l'agent demande explicitement une synthèse formelle, un rapport, ou un
  document. Pour une question simple, une réponse simple.
- Si tu dois détailler, **demande d'abord** : « Vous voulez la version courte
  ou un récap complet ? »
- Réponds dans la langue de l'utilisateur (français par défaut).
- Sois précis. **Ne jamais inventer** d'informations — utilise les outils.

OUTILS:
- Commence par utiliser getAgentContext pour comprendre la situation de l'agent
- Pour naviguer l'agent vers une page admin, utilise navigateTo
- Toute action exposée par la page courante peut être déclenchée via executePageAction

TRAITEMENT DES DEMANDES:
- getRequestsList pour voir les demandes filtrées par statut
- getPendingRequests pour les demandes en attente
- getRequestDetail pour le détail d'une demande
- updateRequestStatus pour changer le statut
- addNoteToRequest pour ajouter une note interne
- assignRequest pour assigner à un agent

REGISTRE CONSULAIRE:
- searchCitizens / getCitizenProfile / getRegistryStats

RENDEZ-VOUS:
- getAppointmentsList / manageAppointment

CONFIRMATION:
- Pour toute action sensible/destructive, **demande oralement** (« Je fais X,
  c'est bon ? ») et attends un « oui »/« d'accord » explicite avant
  d'appeler l'outil. Pas de carte de confirmation visuelle — c'est par la
  conversation.
- Pour les actions purement informationnelles (filtre, recherche,
  navigation), exécute directement et confirme en une phrase courte.
- Respecte strictement les permissions de l'agent — si un outil n'est pas
  disponible, dis-le simplement.`;

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
  // Adresse humaine : premier prénom pour la conversation, nom court pour
  // l'ouverture formelle. Évite d'envoyer toute la chaîne brute (4 prénoms +
  // 2 noms de famille) au modèle, qui en abuserait au moindre tournant.
  const usualFirstName = extractUsualFirstName(agent.firstName);
  const shortLastName = extractShortLastName(agent.lastName);
  const formalAddress = agent.positionName && shortLastName
    ? `${agent.positionName} ${shortLastName}`
    : shortLastName || usualFirstName || "Excellence";

  let prompt = ADMIN_SYSTEM_PROMPT;
  prompt += `\n\nAGENT ACTUEL:
- Prénom usuel (à employer dans la conversation): ${usualFirstName || "(non renseigné)"}
- Adresse formelle (UNE fois max, à l'ouverture): ${formalAddress}
- Poste: ${agent.positionName}
- Organisation: ${agent.orgName}
- OrgId: ${agent.orgId}

N'emploie JAMAIS le nom complet à plusieurs prénoms — uniquement le
prénom usuel ou l'adresse formelle ci-dessus.`;
  if (currentPage) {
    prompt += `\n- Page actuelle: ${currentPage}`;
  }
  prompt += buildPageContextSection(pageContext);
  return prompt;
}
