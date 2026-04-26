/**
 * Admin AI Chat Action - Entry point for the consular agent AI assistant
 * Uses Google Gemini with function calling, filtered by agent permissions
 */
import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  getAdminTools,
  ADMIN_MUTATIVE_TOOLS,
  ADMIN_UI_TOOLS,
  ADMIN_TOOL_PERMISSIONS,
  ADMIN_ALWAYS_AVAILABLE_TOOLS,
  type AdminAppScope,
} from "./adminTools";
import { rateLimiter } from "./rateLimiter";
import { canDoTask } from "../lib/permissions";

const AI_MODEL = "gemini-2.5-flash";

// System prompt for consular agents
const ADMIN_SYSTEM_PROMPT = `Tu es l'Assistant IA du Système Consulaire, dédié aux agents et personnel diplomatique du Consulat du Gabon.

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

// Action types
type AdminAIAction = {
  type: string;
  args: Record<string, unknown>;
  requiresConfirmation: boolean;
  reason?: string;
};

type ConversationMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{ name: string; args: unknown; result?: unknown }>;
  timestamp: number;
};

type AdminChatResponse = {
  conversationId: Id<"conversations">;
  message: string;
  actions: AdminAIAction[];
};

// Validator for the rich page context published by usePageContext()
const pageContextValidator = v.object({
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

type PageContextArg = {
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

function buildPageContextSection(ctx?: PageContextArg | null): string {
  if (!ctx) return "";
  const lines: string[] = [];
  lines.push("\n\n## Contexte de l'écran actuel");
  lines.push(`Module: ${ctx.module} (${ctx.pathname})`);
  lines.push(`Titre: ${ctx.title}`);
  if (ctx.summary) lines.push(`Résumé: ${ctx.summary}`);

  if (ctx.visibleEntities.length > 0) {
    lines.push(`\nÉléments visibles (${ctx.visibleEntities.length}):`);
    for (const e of ctx.visibleEntities) {
      const dataPreview = e.data ? ` ${JSON.stringify(e.data).slice(0, 200)}` : "";
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

/**
 * Main admin chat action
 */
export const chat = action({
  args: {
    conversationId: v.optional(v.id("conversations")),
    message: v.string(),
    currentPage: v.optional(v.string()),
    pageContext: v.optional(pageContextValidator),
    orgId: v.id("orgs"),
    // App appelante — détermine le scope des routes exposées à `navigateTo`.
    // Optionnel pour compat avec les anciens clients ; défaut `"agent"`.
    app: v.optional(
      v.union(v.literal("agent"), v.literal("backoffice")),
    ),
  },
  handler: async (
    ctx,
    { conversationId, message, currentPage, pageContext, orgId, app },
  ): Promise<AdminChatResponse> => {
    const appScope: AdminAppScope = app ?? "agent";
    const adminTools = getAdminTools(appScope);
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Rate limiting: 30 messages/minute per agent (slightly higher than citizen)
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
      key: identity.subject,
    });
    if (!ok) {
      const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
      throw new Error(
        `RATE_LIMITED:Vous envoyez trop de messages. Veuillez attendre ${waitSeconds} secondes.`,
      );
    }

    // Get user and membership
    const user = await ctx.runQuery(api.functions.users.getMe);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const membership = await ctx.runQuery(
      api.functions.memberships.getMyMembership,
      { orgId },
    );
    if (!membership) {
      throw new Error("NO_MEMBERSHIP");
    }

    // Get org info
    const org = await ctx.runQuery(api.functions.orgs.getById, { orgId });

    // Get position info
    let positionName = "Agent";
    if (membership.positionId) {
      const position = await ctx.runQuery(
        internal.ai.adminChat.getPosition,
        { positionId: membership.positionId },
      );
      if (position) {
        positionName = typeof position.title === "object"
          ? (position.title as Record<string, string>).fr || "Agent"
          : String(position.title);
      }
    }

    // Filter tools based on agent's permissions
    // NOTE: canDoTask requires ctx.db (query/mutation context), not available in actions.
    // Use checkPermission internal query instead.
    const permissionAllowedTools: typeof adminTools = [];
    for (const tool of adminTools) {
      const requiredTask = ADMIN_TOOL_PERMISSIONS[tool.name];
      if (!requiredTask) {
        // UI tools and tools without permission requirements are always allowed
        permissionAllowedTools.push(tool);
        continue;
      }
      const allowed = await ctx.runQuery(
        internal.ai.adminChat.checkPermission,
        {
          userId: user._id,
          orgId,
          taskCode: requiredTask,
        },
      );
      if (allowed) {
        permissionAllowedTools.push(tool);
      }
    }

    // Then narrow down by page scope: if a pageContext is provided with
    // scopedToolNames, only expose ALWAYS_AVAILABLE + those scoped tools.
    // Otherwise, fall back to all permission-allowed tools.
    const allowedTools: typeof adminTools =
      pageContext && pageContext.scopedToolNames.length > 0
        ? permissionAllowedTools.filter(
            (t) =>
              ADMIN_ALWAYS_AVAILABLE_TOOLS.includes(
                t.name as (typeof ADMIN_ALWAYS_AVAILABLE_TOOLS)[number],
              ) || pageContext.scopedToolNames.includes(t.name),
          )
        : permissionAllowedTools;

    // Build context-aware system prompt
    let contextPrompt = ADMIN_SYSTEM_PROMPT;

    contextPrompt += `\n\nAGENT ACTUEL:
- Nom: ${user.firstName || ""} ${user.lastName || ""}
- Poste: ${positionName}
- Organisation: ${org?.name || "Inconnue"}
- OrgId: ${orgId}`;

    if (currentPage) {
      contextPrompt += `\n- Page actuelle: ${currentPage}`;
    }

    // Inject the rich page context (visible entities, available actions, etc.)
    contextPrompt += buildPageContextSection(pageContext);

    // Get conversation history
    let history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (conversationId) {
      const conversation = await ctx.runQuery(
        internal.ai.chat.getConversation,
        { conversationId },
      );
      if (conversation) {
        history = conversation.messages
          .filter((m: ConversationMessage) => m.role !== "tool")
          .map((m: ConversationMessage) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
      }
    }

    // Initialize Gemini
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const ai = new GoogleGenAI({ apiKey });

    const contents = [
      {
        role: "user",
        parts: [{ text: `[INSTRUCTIONS SYSTÈME] ${contextPrompt}` }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Compris, je suis l'Assistant IA du système consulaire. Comment puis-je vous aider dans votre travail ?",
          },
        ],
      },
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];

    // Prepare tool declarations
    const functionDeclarations = allowedTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as Record<string, unknown>,
    }));

    // Call Gemini with tools
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: contents as Parameters<
        typeof ai.models.generateContent
      >[0]["contents"],
      config: {
        tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error("No response from Gemini");
    }

    const actions: AdminAIAction[] = [];
    let responseText = "";
    const toolResults: Array<{ name: string; result: unknown }> = [];

    // Process response parts
    for (const part of candidate.content.parts) {
      if ("text" in part && part.text) {
        responseText += part.text;
      }

      if ("functionCall" in part && part.functionCall) {
        const name = part.functionCall.name;
        const args = (part.functionCall.args || {}) as Record<string, unknown>;

        if (!name) continue;

        // UI actions
        if (ADMIN_UI_TOOLS.includes(name as (typeof ADMIN_UI_TOOLS)[number])) {
          actions.push({
            type: name,
            args,
            requiresConfirmation: false,
            reason: args.reason as string,
          });
        }
        // Mutative tools → require confirmation
        else if (
          ADMIN_MUTATIVE_TOOLS.includes(
            name as (typeof ADMIN_MUTATIVE_TOOLS)[number],
          )
        ) {
          actions.push({
            type: name,
            args,
            requiresConfirmation: true,
          });
        }
        // Read-only tools → execute immediately
        else {
          try {
            let toolResult: unknown;

            // Helper to slim down a request object for AI consumption
            const slimRequest = (r: Record<string, unknown>) => ({
              _id: r._id,
              reference: r.reference,
              status: r.status,
              priority: r.priority,
              createdAt: r._creationTime,
              updatedAt: r.updatedAt,
              assignedTo: r.assignedTo,
              userName: r.user && typeof r.user === "object"
                ? `${(r.user as Record<string, unknown>).firstName || ""} ${(r.user as Record<string, unknown>).lastName || ""}`.trim()
                : undefined,
              userEmail: r.user && typeof r.user === "object"
                ? (r.user as Record<string, unknown>).email
                : undefined,
              serviceName: r.serviceName && typeof r.serviceName === "object"
                ? (r.serviceName as Record<string, string>).fr
                : r.serviceName,
            });

            switch (name) {
              case "getAgentContext": {
                const [requestStats, registryStats] = await Promise.all([
                  ctx.runQuery(api.functions.requests.getStatsByOrg, { orgId }),
                  ctx.runQuery(
                    api.functions.consularRegistrations.getStatsByOrg,
                    { orgId },
                  ),
                ]);
                toolResult = {
                  agent: {
                    name: `${user.firstName || ""} ${user.lastName || ""}`,
                    position: positionName,
                  },
                  organization: org?.name,
                  requestStats,
                  registryStats,
                };
                break;
              }

              case "getOrgDashboardStats": {
                const [requestStats, registryStats] = await Promise.all([
                  ctx.runQuery(api.functions.requests.getStatsByOrg, { orgId }),
                  ctx.runQuery(
                    api.functions.consularRegistrations.getStatsByOrg,
                    { orgId },
                  ),
                ]);
                toolResult = { requestStats, registryStats };
                break;
              }

              case "getRequestsList": {
                const typedArgs = args as { status?: string };
                // Get aggregate stats for total counts
                const stats = await ctx.runQuery(
                  api.functions.requests.getStatsByOrg,
                  { orgId },
                );
                // Get paginated list (slim, 10 items)
                const result = await ctx.runQuery(
                  api.functions.requests.listByOrg,
                  {
                    orgId,
                    status: typedArgs.status as any,
                    paginationOpts: { numItems: 10, cursor: null },
                  },
                );
                toolResult = {
                  stats: typedArgs.status
                    ? { count: stats.statusCounts[typedArgs.status] ?? 0 }
                    : stats,
                  requests: result.page.map((r: Record<string, unknown>) =>
                    slimRequest(r),
                  ),
                  hasMore: result.continueCursor !== null && !result.isDone,
                };
                break;
              }

              case "getRequestDetail": {
                const typedArgs = args as { requestId: string };
                let detail: unknown = await ctx.runQuery(
                  internal.functions.requests.internalGetByReferenceId,
                  { referenceId: typedArgs.requestId },
                );
                // Try by ID if reference didn't work
                if (!detail) {
                  try {
                    detail = await ctx.runQuery(
                      internal.functions.requests.internalGetById,
                      { requestId: typedArgs.requestId as Id<"requests"> },
                    );
                  } catch {
                    detail = null;
                  }
                }
                if (!detail) {
                  toolResult = { error: "Demande introuvable" };
                } else {
                  // For detail view, keep formData but strip service definitions
                  const d = detail as Record<string, unknown>;
                  toolResult = {
                    ...slimRequest(d),
                    formData: d.formData,
                    documents: Array.isArray(d.documents) ? d.documents.length : 0,
                    notes: d.notes,
                  };
                }
                break;
              }

              case "getPendingRequests": {
                // Use aggregates for counts
                const stats = await ctx.runQuery(
                  api.functions.requests.getStatsByOrg,
                  { orgId },
                );
                // Get slim paginated lists (10 items each)
                const [submittedResult, pendingResult] = await Promise.all([
                  ctx.runQuery(api.functions.requests.listByOrg, {
                    orgId,
                    status: "submitted" as any,
                    paginationOpts: { numItems: 10, cursor: null },
                  }),
                  ctx.runQuery(api.functions.requests.listByOrg, {
                    orgId,
                    status: "pending" as any,
                    paginationOpts: { numItems: 10, cursor: null },
                  }),
                ]);
                toolResult = {
                  submittedCount: stats.statusCounts.submitted ?? 0,
                  pendingCount: stats.statusCounts.pending ?? 0,
                  totalActionRequired:
                    (stats.statusCounts.submitted ?? 0) +
                    (stats.statusCounts.pending ?? 0),
                  submitted: submittedResult.page.map(
                    (r: Record<string, unknown>) => slimRequest(r),
                  ),
                  pending: pendingResult.page.map(
                    (r: Record<string, unknown>) => slimRequest(r),
                  ),
                  hasMoreSubmitted: !submittedResult.isDone,
                  hasMorePending: !pendingResult.isDone,
                };
                break;
              }

              case "getCitizenProfile": {
                const typedArgs = args as { profileId: string };
                toolResult = await ctx.runQuery(
                  api.functions.profiles.getProfileDetail,
                  { profileId: typedArgs.profileId as Id<"profiles"> },
                );
                break;
              }

              case "searchCitizens": {
                const typedArgs = args as { query: string };
                toolResult = await ctx.runQuery(
                  api.functions.consularRegistrations.searchRegistrations,
                  { orgId, searchQuery: typedArgs.query },
                );
                break;
              }

              case "getRegistryStats": {
                toolResult = await ctx.runQuery(
                  api.functions.consularRegistrations.getStatsByOrg,
                  { orgId },
                );
                break;
              }

              case "getAppointmentsList": {
                toolResult = await ctx.runQuery(
                  api.functions.appointments.listByOrg,
                  { orgId },
                );
                break;
              }

              case "getTeamMembers": {
                toolResult = await ctx.runQuery(
                  internal.ai.adminChat.getOrgMembers,
                  { orgId },
                );
                break;
              }

              case "getOrgMailInbox": {
                const typedArgs = args as { folder?: string };
                toolResult = (
                  await ctx.runQuery(api.functions.digitalMail.list, {
                    ownerId: orgId as any,
                    ownerType: "organization" as any,
                    folder: (typedArgs.folder as any) ?? undefined,
                    paginationOpts: { numItems: 10, cursor: null },
                  })
                ).page;
                break;
              }

              case "getRecentPayments": {
                try {
                  toolResult = await ctx.runQuery(
                    api.functions.requests.getStatsByOrg,
                    { orgId },
                  );
                } catch {
                  toolResult = { message: "Module paiements non disponible" };
                }
                break;
              }

              case "getOrgPosts": {
                const result = await ctx.runQuery(
                  api.functions.posts.listByOrg,
                  {
                    orgId,
                    paginationOpts: { numItems: 10, cursor: null },
                  },
                );
                // Strip heavy fields from posts
                toolResult = result.page.map(
                  (p: Record<string, unknown>) => ({
                    _id: p._id,
                    title: p.title,
                    slug: p.slug,
                    excerpt: p.excerpt,
                    category: p.category,
                    status: p.status,
                    publishedAt: p.publishedAt,
                    authorName: p.authorName,
                  }),
                );
                break;
              }

              default:
                toolResult = { error: `Unknown tool: ${name}` };
            }

            toolResults.push({ name, result: toolResult });
          } catch (err) {
            toolResults.push({
              name,
              result: { error: (err as Error).message },
            });
          }
        }
      }
    }

    // Continue conversation with tool results
    if (toolResults.length > 0 && !responseText) {
      const functionResponseParts = toolResults.map((tr) => ({
        functionResponse: {
          name: tr.name,
          response: { output: tr.result },
        },
      }));

      const followUpContents = [
        ...contents,
        { role: "model", parts: candidate.content.parts },
        { role: "user", parts: functionResponseParts },
      ];

      const followUp = await ai.models.generateContent({
        model: AI_MODEL,
        contents: followUpContents as Parameters<
          typeof ai.models.generateContent
        >[0]["contents"],
        config: {
          systemInstruction: contextPrompt,
        },
      });

      const followUpCandidate = followUp.candidates?.[0];
      if (followUpCandidate?.content?.parts) {
        for (const part of followUpCandidate.content.parts) {
          if ("text" in part && part.text) {
            responseText = part.text;
          }
        }
      }
    }

    // Fallback message
    if (!responseText) {
      if (actions.length > 0) {
        const uiActions = actions.filter((a) => !a.requiresConfirmation);
        const confirmableActions = actions.filter(
          (a) => a.requiresConfirmation,
        );

        if (uiActions.length > 0 && confirmableActions.length === 0) {
          responseText = "C'est parti !";
        } else if (confirmableActions.length > 0) {
          responseText =
            "Je peux effectuer cette action pour vous. Veuillez confirmer ci-dessous.";
        }
      } else {
        responseText =
          "Je suis désolé, je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?";
      }
    }

    // Save conversation — truncate tool results to avoid exceeding Convex's 1MB document limit
    const MAX_RESULT_SIZE = 2000; // chars per tool result
    const truncateResult = (result: unknown): unknown => {
      const json = JSON.stringify(result);
      if (json.length <= MAX_RESULT_SIZE) return result;
      // For arrays, keep count + first few items summary
      if (Array.isArray(result)) {
        return {
          _truncated: true,
          count: result.length,
          summary: result.slice(0, 3).map((item: Record<string, unknown>) => ({
            _id: item?._id,
            reference: item?.reference,
            status: item?.status,
            userName: item?.user && typeof item.user === "object" 
              ? `${(item.user as Record<string, unknown>).firstName || ""} ${(item.user as Record<string, unknown>).lastName || ""}` 
              : undefined,
            serviceName: item?.serviceName,
          })),
        };
      }
      // For objects, try to keep essential fields
      if (typeof result === "object" && result !== null) {
        const r = result as Record<string, unknown>;
        if (r.pending || r.submitted) {
          return {
            _truncated: true, 
            pendingCount: Array.isArray(r.pending) ? r.pending.length : 0,
            submittedCount: Array.isArray(r.submitted) ? r.submitted.length : 0,
            total: r.total,
          };
        }
      }
      return { _truncated: true, preview: json.slice(0, MAX_RESULT_SIZE) };
    };

    const newConversationId = await ctx.runMutation(
      internal.ai.chat.saveMessage,
      {
        conversationId,
        userId: user._id,
        userMessage: message,
        assistantMessage: responseText,
        toolCalls: toolResults.map((tr) => ({
          name: tr.name,
          args: {},
          result: truncateResult(tr.result),
        })),
      },
    );

    return {
      conversationId: newConversationId,
      message: responseText,
      actions,
    };
  },
});

/**
 * Execute an admin action after confirmation
 */
export const executeAction = action({
  args: {
    actionType: v.string(),
    actionArgs: v.any(),
    orgId: v.id("orgs"),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, { actionType, actionArgs, orgId, conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Validate action type
    if (
      !ADMIN_MUTATIVE_TOOLS.includes(
        actionType as (typeof ADMIN_MUTATIVE_TOOLS)[number],
      )
    ) {
      throw new Error(`Action '${actionType}' is not allowed`);
    }

    let result: { success: boolean; data?: unknown; error?: string };

    try {
      switch (actionType) {
        case "updateRequestStatus": {
          const typedArgs = actionArgs as {
            requestId: string;
            status: string;
            note?: string;
          };

          await ctx.runMutation(api.functions.requests.updateStatus, {
            requestId: typedArgs.requestId as Id<"requests">,
            status: typedArgs.status as any,
            note: typedArgs.note,
          });

          result = {
            success: true,
            data: {
              message: `Demande mise à jour → ${typedArgs.status}`,
            },
          };
          break;
        }

        case "addNoteToRequest": {
          const typedArgs = actionArgs as {
            requestId: string;
            content: string;
            isInternal?: boolean;
          };

          await ctx.runMutation(api.functions.requests.addNote, {
            requestId: typedArgs.requestId as Id<"requests">,
            content: typedArgs.content,
            isInternal: typedArgs.isInternal ?? true,
          });

          result = {
            success: true,
            data: { message: "Note ajoutée" },
          };
          break;
        }

        case "assignRequest": {
          const typedArgs = actionArgs as {
            requestId: string;
            agentId: string;
          };

          await ctx.runMutation(api.functions.requests.assign, {
            requestId: typedArgs.requestId as Id<"requests">,
            agentId: typedArgs.agentId as Id<"memberships">,
          });

          result = {
            success: true,
            data: { message: "Demande assignée" },
          };
          break;
        }

        case "manageAppointment": {
          const typedArgs = actionArgs as {
            appointmentId: string;
            action: string;
          };

          const appointmentId = typedArgs.appointmentId as Id<"appointments">;
          switch (typedArgs.action) {
            case "confirm":
              await ctx.runMutation(api.functions.slots.confirmAppointment, {
                appointmentId,
              });
              break;
            case "cancel":
              await ctx.runMutation(api.functions.slots.cancelAppointment, {
                appointmentId,
              });
              break;
            case "complete":
              await ctx.runMutation(api.functions.slots.completeAppointment, {
                appointmentId,
              });
              break;
            case "no_show":
              await ctx.runMutation(api.functions.slots.markNoShow, {
                appointmentId,
              });
              break;
            default:
              throw new Error(`Unknown appointment action: ${typedArgs.action}`);
          }

          result = {
            success: true,
            data: {
              message: `Rendez-vous ${typedArgs.action === "confirm" ? "confirmé" : typedArgs.action === "cancel" ? "annulé" : typedArgs.action === "complete" ? "terminé" : "marqué absent"}`,
            },
          };
          break;
        }

        case "sendOrgMail": {
          const typedArgs = actionArgs as {
            recipientOwnerId: string;
            subject: string;
            body: string;
          };

          await ctx.runMutation(api.functions.sendMail.send, {
            recipientOwnerId: typedArgs.recipientOwnerId as any,
            recipientOwnerType: "profile" as any,
            subject: typedArgs.subject,
            content: typedArgs.body,
            type: "email" as any,
            senderOwnerId: orgId as any,
            senderOwnerType: "organization" as any,
          });

          result = {
            success: true,
            data: { message: "Message envoyé" },
          };
          break;
        }

        default:
          throw new Error(`Unknown action: ${actionType}`);
      }
    } catch (err) {
      result = {
        success: false,
        error: (err as Error).message,
      };
    }

    // Log action execution
    if (conversationId) {
      await ctx.runMutation(internal.ai.chat.logActionExecution, {
        conversationId,
        actionType,
        actionArgs,
        result,
      });
    }

    return result;
  },
});

// ============ Helper queries ============

/**
 * Get position details
 */
export const getPosition = internalQuery({
  args: { positionId: v.id("positions") },
  handler: async (ctx, { positionId }) => {
    return await ctx.db.get(positionId);
  },
});

/**
 * Get org members for team listing
 */
export const getOrgMembers = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const activeMembers = memberships.filter((m) => m.deletedAt === undefined);

    const results = await Promise.all(
      activeMembers.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        const position = m.positionId ? await ctx.db.get(m.positionId) : null;
        return {
          membershipId: m._id,
          userId: m.userId,
          userName: user
            ? `${user.firstName || ""} ${user.lastName || ""}`
            : "Inconnu",
          email: user?.email,
          position: position
            ? typeof position.title === "object"
              ? (position.title as Record<string, string>).fr
              : String(position.title)
            : null,
        };
      }),
    );

    return results;
  },
});

/**
 * Check permission via internal query (for use in actions)
 */
export const checkPermission = internalQuery({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
    taskCode: v.string(),
  },
  handler: async (ctx, { userId, orgId, taskCode }) => {
    const user = await ctx.db.get(userId);
    if (!user) return false;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", userId).eq("orgId", orgId).eq("deletedAt", undefined),
      )
      .unique();

    return await canDoTask(ctx, user, membership, taskCode as any);
  },
});
