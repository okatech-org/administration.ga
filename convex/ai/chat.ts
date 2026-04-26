/**
 * AI Chat Action - Main entry point for the AI assistant
 * Uses Google Gemini with function calling
 */
import { v } from "convex/values";
import {
  action,
  internalQuery,
  internalMutation,
  query,
} from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { tools, MUTATIVE_TOOLS, UI_TOOLS, type AIAction } from "./tools";
import { rateLimiter } from "./rateLimiter";
import { generateRoutesPromptSection } from "./routes_manifest";

// Use gemini-2.5-flash for all AI requests
const AI_MODEL = "gemini-2.5-flash";

// System prompt for the AI assistant - persona and behavior only
const SYSTEM_PROMPT = `Tu es l'Assistant IA du Consulat du Gabon en France. Tu aides les citoyens gabonais et les usagers du consulat avec leurs démarches administratives.

COMPORTEMENT:
- Réponds dans la langue de l'utilisateur
- Sois poli, professionnel et bienveillant
- Utilise TOUJOURS les outils mis à ta disposition pour accéder aux données réelles
- Ne jamais inventer d'informations - appelle les fonctions pour récupérer les vraies données
- Pour naviguer l'utilisateur vers une page, utilise la fonction navigateTo
- Quand l'utilisateur te donne des informations personnelles (prénom, nom, date de naissance, etc.), utilise fillForm pour pré-remplir le formulaire avec ces données
- Guide l'utilisateur étape par étape dans ses démarches

UTILISATION DE FILLFORM:
Quand l'utilisateur fournit des informations comme "je m'appelle Jean Dupont, né le 15/03/1985":
1. Utilise fillForm avec formId="profile" et les champs extraits (firstName, lastName, birthDate en YYYY-MM-DD)
2. Mets navigateFirst=true pour rediriger vers le formulaire
3. Le formulaire sera automatiquement pré-rempli pour l'utilisateur

iBOÎTE (MESSAGERIE INTERNE):
- Utilise getMyMailboxes pour lister toutes les boîtes mail de l'utilisateur avec leurs compteurs non-lus
- Utilise getMailInbox pour lister les messages d'une boîte spécifique (profil, organisation, association ou entreprise)
- Utilise getMailMessage pour lire le contenu complet d'un message
- Utilise sendMail pour envoyer un message interne (nécessite confirmation de l'utilisateur)
- Utilise markMailRead pour marquer un message comme lu

ASSOCIATIONS:
- Utilise getMyAssociations pour lister les associations de l'utilisateur
- Utilise getAssociationDetails pour voir les détails d'une association (membres, type, etc.)
- Utilise getAssociationInvites pour voir les invitations en attente
- Utilise createAssociation pour créer une nouvelle association (nécessite confirmation)
- Utilise respondToAssociationInvite pour accepter/refuser une invitation (nécessite confirmation)

ENTREPRISES:
- Utilise getMyCompanies pour lister les entreprises de l'utilisateur
- Utilise getCompanyDetails pour voir les détails d'une entreprise (membres, secteur, etc.)
- Utilise createCompany pour créer une nouvelle entreprise (nécessite confirmation)

CV CONSULAIRE (iVC):
- Utilise getMyCV pour récupérer le CV complet de l'utilisateur
- Utilise updateCV pour mettre à jour les informations générales du CV (titre, résumé, contact)
- Utilise addCVExperience pour ajouter une expérience professionnelle
- Utilise addCVEducation pour ajouter une formation
- Utilise addCVSkill pour ajouter une compétence (niveaux: beginner, intermediate, advanced, expert)
- Utilise addCVLanguage pour ajouter une langue (niveaux CECRL: A1, A2, B1, B2, C1, C2, native)
- Utilise improveCVSummary pour améliorer le résumé professionnel avec l'IA
- Utilise suggestCVSkills pour obtenir des suggestions de compétences basées sur le CV
- Utilise optimizeCV pour optimiser le CV pour une offre d'emploi
- Utilise generateCoverLetter pour générer une lettre de motivation
- Utilise getCVATSScore pour analyser la compatibilité ATS du CV`;

// Message type from conversations schema
type ConversationMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{ name: string; args: unknown; result?: unknown }>;
  timestamp: number;
};

// Return type for chat action
type ChatResponse = {
  conversationId: Id<"conversations">;
  message: string;
  actions: AIAction[];
};

/**
 * Main chat action
 */
export const chat = action({
  args: {
    conversationId: v.optional(v.id("conversations")),
    message: v.string(),
    currentPage: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { conversationId, message, currentPage },
  ): Promise<ChatResponse> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Rate limiting: 20 messages/minute per user
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
      key: identity.subject,
    });
    if (!ok) {
      const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
      throw new Error(
        `RATE_LIMITED:Vous envoyez trop de messages. Veuillez attendre ${waitSeconds} secondes.`,
      );
    }

    // Get user info for context
    const user = await ctx.runQuery(api.functions.users.getMe);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;

    // Add user info
    contextPrompt += `\n\nUTILISATEUR ACTUEL:
- Nom: ${user.firstName || ""} ${user.lastName || ""}
- Email: ${user.email}`;

    // Add current page
    if (currentPage) {
      contextPrompt += `\n- Page actuelle: ${currentPage}`;
    }

    // Add available routes — cette action ne sert que citizen-web,
    // donc on scope toujours sur l'app "citizen" (PUBLIC + MY_SPACE).
    contextPrompt += generateRoutesPromptSection("citizen");

    // Get conversation history if exists
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

    // Build the request contents with system instruction as first message
    const contents = [
      {
        role: "user",
        parts: [{ text: `[INSTRUCTIONS SYSTÈME] ${contextPrompt}` }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Compris, je suis l'Assistant IA du Consulat du Gabon. Comment puis-je vous aider ?",
          },
        ],
      },
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];

    // All tools declared in tools.ts are available to authenticated users
    // Tool permissions are controlled at declaration level (tools.ts)
    const userTools = tools;

    // Prepare tool declarations for Gemini
    const functionDeclarations = userTools.map((t) => ({
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
        tools: [{ functionDeclarations }],
      },
    });

    // Process the response
    const candidate = response.candidates?.[0];

    if (!candidate?.content?.parts) {
      throw new Error("No response from Gemini");
    }

    const actions: AIAction[] = [];
    let responseText = "";
    const toolResults: Array<{ name: string; result: unknown }> = [];

    // Process each part of the response
    for (const part of candidate.content.parts) {
      if ("text" in part && part.text) {
        responseText += part.text;
      }

      if ("functionCall" in part && part.functionCall) {
        const name = part.functionCall.name;
        const args = (part.functionCall.args || {}) as Record<string, unknown>;

        if (!name) continue;

        // Check if it's a UI action (don't execute, send to frontend)
        if (UI_TOOLS.includes(name as (typeof UI_TOOLS)[number])) {
          actions.push({
            type: name,
            args: args,
            requiresConfirmation: false,
            reason: args.reason as string,
          });
        }
        // Check if it requires confirmation
        else if (
          MUTATIVE_TOOLS.includes(name as (typeof MUTATIVE_TOOLS)[number])
        ) {
          actions.push({
            type: name,
            args: args,
            requiresConfirmation: true,
          });
        }
        // Execute read-only tools immediately
        else {
          try {
            let toolResult: unknown;

            switch (name) {
              case "getProfile":
                toolResult = await ctx.runQuery(api.functions.profiles.getMine);
                break;
              case "getServices":
                toolResult = await ctx.runQuery(
                  api.functions.services.listCatalog,
                  {},
                );
                break;
              case "getRequests":
                toolResult = (
                  await ctx.runQuery(api.functions.requests.listMine, {
                    paginationOpts: { numItems: 25, cursor: null },
                  })
                ).page;
                break;
              case "getAppointments":
                toolResult = await ctx.runQuery(
                  api.functions.appointments.listByUser,
                  {},
                );
                break;
              case "getNotifications":
                toolResult = (
                  await ctx.runQuery(api.functions.notifications.list, {
                    paginationOpts: {
                      numItems: (args as { limit?: number }).limit ?? 10,
                      cursor: null,
                    },
                  })
                ).page;
                break;
              case "getUnreadNotificationCount":
                toolResult = await ctx.runQuery(
                  api.functions.notifications.getUnreadCount,
                );
                break;
              case "getUserContext": {
                // Combine profile, consular card, active request, and notification count
                const [profile, consularCard, activeRequest, unreadCount] =
                  await Promise.all([
                    ctx.runQuery(api.functions.profiles.getMine),
                    ctx.runQuery(api.functions.consularCard.getMyCard),
                    ctx.runQuery(api.functions.requests.getLatestActive),
                    ctx.runQuery(api.functions.notifications.getUnreadCount),
                  ]);
                toolResult = {
                  profile,
                  consularCard,
                  activeRequest,
                  unreadNotifications: unreadCount,
                };
                break;
              }
              case "getServicesByCountry": {
                const typedArgs = args as {
                  country?: string;
                  category?: string;
                };
                // If no country provided, get user's country of residence first
                let country = typedArgs.country;
                if (!country) {
                  const profile = await ctx.runQuery(
                    api.functions.profiles.getMine,
                  );
                  country = profile?.countryOfResidence ?? "FR";
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                toolResult = await ctx.runQuery(
                  api.functions.services.listByCountry,
                  {
                    country,
                    category: typedArgs.category as any,
                  },
                );
                break;
              }
              case "getOrganizationInfo": {
                const typedArgs = args as { orgId?: string };
                if (typedArgs.orgId) {
                  toolResult = await ctx.runQuery(api.functions.orgs.getById, {
                    orgId: typedArgs.orgId as Id<"orgs">,
                  });
                } else {
                  // Get user's profile to find their country, then get the org for that country
                  const profile = await ctx.runQuery(
                    api.functions.profiles.getMine,
                  );
                  const country = profile?.countryOfResidence ?? "FR";
                  const orgs = await ctx.runQuery(
                    api.functions.orgs.listByJurisdiction,
                    {
                      residenceCountry: country,
                    },
                  );
                  toolResult = orgs?.[0] ?? null;
                }
                break;
              }
              case "getLatestNews":
                toolResult = await ctx.runQuery(api.functions.posts.getLatest, {
                  limit: (args as { limit?: number }).limit ?? 5,
                });
                break;
              case "getMyAssociations":
                toolResult = await ctx.runQuery(
                  api.functions.associations.getMine,
                );
                break;
              case "getMyConsularCard":
                toolResult = await ctx.runQuery(
                  api.functions.consularCard.getMyCard,
                );
                break;
              case "getRequestDetails": {
                const typedArgs = args as { requestId: string };
                toolResult = await ctx.runQuery(
                  internal.functions.requests.internalGetByReferenceId,
                  {
                    referenceId: typedArgs.requestId,
                  },
                );
                break;
              }

              // ============ iBOÎTE TOOLS ============
              case "getMyMailboxes":
                toolResult = await ctx.runQuery(
                  api.functions.digitalMail.getAccountsWithUnread,
                );
                break;
              case "getMailInbox": {
                const typedArgs = args as {
                  ownerId?: string;
                  ownerType?: string;
                  folder?: string;
                };
                // If no ownerId, get user's profile first
                let mailOwnerId = typedArgs.ownerId;
                let mailOwnerType = typedArgs.ownerType;
                if (!mailOwnerId) {
                  const profile = await ctx.runQuery(
                    api.functions.profiles.getMine,
                  );
                  if (profile) {
                    mailOwnerId = profile._id;
                    mailOwnerType = "profile";
                  }
                }
                toolResult = (
                  await ctx.runQuery(api.functions.digitalMail.list, {
                    ownerId: mailOwnerId as any,
                    ownerType: mailOwnerType as any,
                    folder: (typedArgs.folder as any) ?? undefined,
                    paginationOpts: { numItems: 20, cursor: null },
                  })
                ).page;
                break;
              }
              case "getMailMessage": {
                const typedArgs = args as { id: string };
                toolResult = await ctx.runQuery(
                  api.functions.digitalMail.getById,
                  {
                    id: typedArgs.id as any,
                  },
                );
                break;
              }

              // ============ COMPANIES TOOLS ============
              case "getMyCompanies":
                toolResult = await ctx.runQuery(
                  api.functions.companies.getMine,
                );
                break;
              case "getCompanyDetails": {
                const typedArgs = args as { id: string };
                toolResult = await ctx.runQuery(
                  api.functions.companies.getById,
                  {
                    id: typedArgs.id as any,
                  },
                );
                break;
              }

              // ============ ASSOCIATIONS TOOLS (enhanced) ============
              case "getAssociationDetails": {
                const typedArgs = args as { id: string };
                toolResult = await ctx.runQuery(
                  api.functions.associations.getById,
                  {
                    id: typedArgs.id as any,
                  },
                );
                break;
              }
              case "getAssociationInvites":
                toolResult = await ctx.runQuery(
                  api.functions.associations.getPendingInvites,
                );
                break;

              // ============ CV TOOLS ============
              case "getMyCV":
                toolResult = await ctx.runQuery(api.functions.cv.getMine);
                break;
              default:
                toolResult = { error: `Unknown tool: ${name}` };
            }

            toolResults.push({ name, result: toolResult });
          } catch (error) {
            toolResults.push({
              name,
              result: { error: (error as Error).message },
            });
          }
        }
      }
    }

    // If we executed tools, we need to continue the conversation with results
    if (toolResults.length > 0 && !responseText) {
      // Each function response should be a separate part
      const functionResponseParts = toolResults.map((tr) => ({
        functionResponse: {
          name: tr.name,
          response: { output: tr.result },
        },
      }));

      // Continue the conversation with tool results
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

    // Fallback message - but if actions are returned, provide appropriate context
    if (!responseText) {
      if (actions.length > 0) {
        // Actions were returned, so the AI did respond - no error
        const uiActions = actions.filter((a) => !a.requiresConfirmation);
        const confirmableActions = actions.filter(
          (a) => a.requiresConfirmation,
        );

        if (uiActions.length > 0 && confirmableActions.length === 0) {
          // Only UI actions - will be executed automatically
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
    const MAX_RESULT_SIZE = 2000;
    const truncateResult = (result: unknown): unknown => {
      const json = JSON.stringify(result);
      if (json.length <= MAX_RESULT_SIZE) return result;
      if (Array.isArray(result)) {
        return {
          _truncated: true,
          count: result.length,
          summary: result.slice(0, 3).map((item: Record<string, unknown>) => ({
            _id: item?._id,
            reference: item?.reference,
            status: item?.status,
            serviceName: item?.serviceName,
          })),
        };
      }
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
 * Internal query to get conversation history
 */
export const getConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db.get(conversationId);
  },
});

/**
 * Internal mutation to save messages
 */
export const saveMessage = internalMutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    userId: v.id("users"),
    userMessage: v.string(),
    assistantMessage: v.string(),
    toolCalls: v.array(
      v.object({
        name: v.string(),
        args: v.any(),
        result: v.optional(v.any()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const now = Date.now();

    if (args.conversationId) {
      // Update existing conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      await ctx.db.patch(args.conversationId, {
        messages: [
          ...conversation.messages,
          {
            role: "user" as const,
            content: args.userMessage,
            timestamp: now,
          },
          {
            role: "assistant" as const,
            content: args.assistantMessage,
            toolCalls: args.toolCalls.length > 0 ? args.toolCalls : undefined,
            timestamp: now,
          },
        ],
        updatedAt: now,
      });

      return args.conversationId;
    } else {
      // Create new conversation
      return await ctx.db.insert("conversations", {
        userId: args.userId,
        messages: [
          {
            role: "user" as const,
            content: args.userMessage,
            timestamp: now,
          },
          {
            role: "assistant" as const,
            content: args.assistantMessage,
            toolCalls: args.toolCalls.length > 0 ? args.toolCalls : undefined,
            timestamp: now,
          },
        ],
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Query to list user's conversations
 */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("conversations")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .order("desc")
      .take(20);
  },
});

/**
 * Execute a confirmed action (mutative tool)
 * Called by frontend after user confirms the action
 */
export const executeAction = action({
  args: {
    actionType: v.string(),
    actionArgs: v.any(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, { actionType, actionArgs, conversationId }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Validate that this is an allowed mutative action
    if (
      !MUTATIVE_TOOLS.includes(actionType as (typeof MUTATIVE_TOOLS)[number])
    ) {
      throw new Error(`Action '${actionType}' is not allowed`);
    }

    let result: { success: boolean; data?: unknown; error?: string };

    try {
      switch (actionType) {
        case "createRequest": {
          const serviceSlug = actionArgs.serviceSlug as string;
          const submitNow = actionArgs.submitNow as boolean | undefined;

          // Get user's profile to determine their registered org
          const profile = await ctx.runQuery(api.functions.profiles.getMine);

          // Get consular registrations for this profile
          const registrations = await ctx.runQuery(
            api.functions.consularRegistrations.listByProfile,
          );
          const activeRegistration = registrations?.[0];

          if (!profile || !activeRegistration) {
            throw new Error(
              "Vous devez être inscrit à un consulat pour créer une demande.",
            );
          }

          const orgId = activeRegistration.orgId;

          // Find the service by slug
          const service = await ctx.runQuery(api.functions.services.getBySlug, {
            slug: serviceSlug,
          });

          if (!service) {
            throw new Error(`Service '${serviceSlug}' introuvable`);
          }

          // Find the org service (service activated for user's org)
          const orgService = await ctx.runQuery(
            api.functions.services.getByOrgAndService,
            {
              orgId: orgId,
              serviceId: service._id,
            },
          );

          if (!orgService) {
            throw new Error(
              `Le service '${serviceSlug}' n'est pas disponible dans votre consulat`,
            );
          }

          // Create the request
          const requestId = await ctx.runMutation(
            api.functions.requests.create,
            {
              orgServiceId: orgService._id,
              submitNow: submitNow ?? false,
            },
          );

          result = {
            success: true,
            data: {
              requestId,
              message:
                submitNow ? "Demande créée et soumise" : "Brouillon créé",
            },
          };
          break;
        }

        case "cancelRequest": {
          const requestId = actionArgs.requestId as string;

          await ctx.runMutation(api.functions.requests.cancel, {
            requestId: requestId as Id<"requests">,
          });

          result = {
            success: true,
            data: { message: "Demande annulée" },
          };
          break;
        }

        // ============ iBOÎTE MUTATIONS ============
        case "sendMail": {
          const typedArgs = actionArgs as {
            recipientOwnerId: string;
            recipientOwnerType: string;
            subject: string;
            body: string;
            senderOwnerId?: string;
            senderOwnerType?: string;
          };

          await ctx.runMutation(api.functions.sendMail.send, {
            recipientOwnerId: typedArgs.recipientOwnerId as any,
            recipientOwnerType: typedArgs.recipientOwnerType as any,
            subject: typedArgs.subject,
            content: typedArgs.body,
            type: "email" as any,
            ...(typedArgs.senderOwnerId ?
              {
                senderOwnerId: typedArgs.senderOwnerId as any,
                senderOwnerType: typedArgs.senderOwnerType as any,
              }
            : {}),
          });

          result = {
            success: true,
            data: { message: "Message envoyé avec succès" },
          };
          break;
        }

        case "markMailRead": {
          const typedArgs = actionArgs as { id: string };

          await ctx.runMutation(api.functions.digitalMail.markRead, {
            id: typedArgs.id as any,
          });

          result = {
            success: true,
            data: { message: "Message marqué comme lu" },
          };
          break;
        }

        // ============ ASSOCIATIONS MUTATIONS ============
        case "createAssociation": {
          const typedArgs = actionArgs as {
            name: string;
            associationType: string;
            description?: string;
            email?: string;
            phone?: string;
          };

          const associationId = await ctx.runMutation(
            api.functions.associations.create,
            {
              name: typedArgs.name,
              associationType: typedArgs.associationType as any,
              description: typedArgs.description,
              email: typedArgs.email,
              phone: typedArgs.phone,
            },
          );

          result = {
            success: true,
            data: {
              associationId,
              message: `Association "${typedArgs.name}" créée avec succès`,
            },
          };
          break;
        }

        case "respondToAssociationInvite": {
          const typedArgs = actionArgs as {
            associationId: string;
            accept: boolean;
          };

          await ctx.runMutation(api.functions.associations.respondToInvite, {
            associationId: typedArgs.associationId as any,
            accept: typedArgs.accept,
          });

          result = {
            success: true,
            data: {
              message:
                typedArgs.accept ? "Invitation acceptée" : "Invitation refusée",
            },
          };
          break;
        }

        // ============ ENTREPRISES MUTATIONS ============
        case "createCompany": {
          const typedArgs = actionArgs as {
            name: string;
            legalName?: string;
            companyType: string;
            activitySector: string;
            description?: string;
            email?: string;
            phone?: string;
          };

          const companyId = await ctx.runMutation(
            api.functions.companies.create,
            {
              name: typedArgs.name,
              legalName: typedArgs.legalName,
              companyType: typedArgs.companyType as any,
              activitySector: typedArgs.activitySector as any,
              description: typedArgs.description,
              email: typedArgs.email,
              phone: typedArgs.phone,
            },
          );

          result = {
            success: true,
            data: {
              companyId,
              message: `Entreprise "${typedArgs.name}" créée avec succès`,
            },
          };
          break;
        }

        // ============ CV MUTATIONS ============
        case "updateCV": {
          const typedArgs = actionArgs as {
            title?: string;
            objective?: string;
            summary?: string;
            email?: string;
            phone?: string;
            address?: string;
            portfolioUrl?: string;
            linkedinUrl?: string;
            isPublic?: boolean;
          };

          await ctx.runMutation(api.functions.cv.upsert, typedArgs);

          result = {
            success: true,
            data: { message: "CV mis à jour avec succès" },
          };
          break;
        }

        case "addCVExperience": {
          const typedArgs = actionArgs as {
            title: string;
            company: string;
            location?: string;
            startDate: string;
            endDate?: string;
            current: boolean;
            description?: string;
          };

          await ctx.runMutation(api.functions.cv.addExperience, typedArgs);

          result = {
            success: true,
            data: {
              message: `Expérience "${typedArgs.title}" chez ${typedArgs.company} ajoutée`,
            },
          };
          break;
        }

        case "addCVEducation": {
          const typedArgs = actionArgs as {
            degree: string;
            school: string;
            location?: string;
            startDate: string;
            endDate?: string;
            current: boolean;
            description?: string;
          };

          await ctx.runMutation(api.functions.cv.addEducation, typedArgs);

          result = {
            success: true,
            data: {
              message: `Formation "${typedArgs.degree}" à ${typedArgs.school} ajoutée`,
            },
          };
          break;
        }

        case "addCVSkill": {
          const typedArgs = actionArgs as {
            name: string;
            level: string;
          };

          await ctx.runMutation(api.functions.cv.addSkill, {
            name: typedArgs.name,
            level: typedArgs.level as any,
          });

          result = {
            success: true,
            data: {
              message: `Compétence "${typedArgs.name}" ajoutée`,
            },
          };
          break;
        }

        case "addCVLanguage": {
          const typedArgs = actionArgs as {
            name: string;
            level: string;
          };

          await ctx.runMutation(api.functions.cv.addLanguage, {
            name: typedArgs.name,
            level: typedArgs.level as any,
          });

          result = {
            success: true,
            data: {
              message: `Langue "${typedArgs.name}" ajoutée`,
            },
          };
          break;
        }

        // ============ CV AI ACTIONS ============
        case "improveCVSummary": {
          const typedArgs = actionArgs as { language?: string };

          // Get current CV first
          const cv = await ctx.runQuery(api.functions.cv.getMine);
          if (!cv) {
            result = {
              success: false,
              error: "Aucun CV trouvé. Créez d'abord votre CV.",
            };
            break;
          }

          const formatCVContext = (cv: any) => {
            const parts = [];
            if (cv.title) parts.push(`Titre: ${cv.title}`);
            if (cv.summary) parts.push(`Résumé actuel: ${cv.summary}`);
            if (cv.experiences?.length) {
              parts.push(
                `Expériences: ${cv.experiences.map((e: any) => `${e.title} chez ${e.company}`).join(", ")}`,
              );
            }
            if (cv.education?.length) {
              parts.push(
                `Formations: ${cv.education.map((e: any) => `${e.degree} à ${e.school}`).join(", ")}`,
              );
            }
            if (cv.skills?.length) {
              parts.push(
                `Compétences: ${cv.skills.map((s: any) => s.name).join(", ")}`,
              );
            }
            return parts.join("\n");
          };

          const cvContext = formatCVContext(cv);
          const improved = await ctx.runAction(
            api.functions.cvAI.improveSummary,
            {
              summary: cv.summary ?? "",
              cvContext,
              language: typedArgs.language ?? "fr",
            },
          );

          // Auto-apply the improved summary
          await ctx.runMutation(api.functions.cv.upsert, {
            summary: improved.improvedSummary,
          });

          result = {
            success: true,
            data: {
              message: "Résumé professionnel amélioré et appliqué",
              improvedSummary: improved.improvedSummary,
            },
          };
          break;
        }

        case "suggestCVSkills": {
          const typedArgs = actionArgs as { language?: string };

          const cv2 = await ctx.runQuery(api.functions.cv.getMine);
          if (!cv2) {
            result = {
              success: false,
              error: "Aucun CV trouvé. Créez d'abord votre CV.",
            };
            break;
          }

          const formatCtx = (cv: any) => {
            const parts = [];
            if (cv.title) parts.push(`Titre: ${cv.title}`);
            if (cv.experiences?.length) {
              parts.push(
                `Expériences: ${cv.experiences.map((e: any) => `${e.title} chez ${e.company}: ${e.description || ""}`).join("; ")}`,
              );
            }
            if (cv.skills?.length) {
              parts.push(
                `Compétences actuelles: ${cv.skills.map((s: any) => s.name).join(", ")}`,
              );
            }
            return parts.join("\n");
          };

          const suggestions = await ctx.runAction(
            api.functions.cvAI.suggestSkills,
            {
              cvContext: formatCtx(cv2),
              existingSkills: cv2.skills?.map((s) => s.name) ?? [],
              language: typedArgs.language ?? "fr",
            },
          );

          result = {
            success: true,
            data: {
              message: `${suggestions.suggestions.length} compétences suggérées`,
              suggestions: suggestions.suggestions,
            },
          };
          break;
        }

        case "optimizeCV": {
          const typedArgs = actionArgs as {
            jobDescription: string;
            language?: string;
          };

          const cv3 = await ctx.runQuery(api.functions.cv.getMine);
          if (!cv3) {
            result = {
              success: false,
              error: "Aucun CV trouvé. Créez d'abord votre CV.",
            };
            break;
          }

          const formatCtx3 = (cv: any) => {
            const parts = [];
            if (cv.title) parts.push(`Titre: ${cv.title}`);
            if (cv.summary) parts.push(`Résumé: ${cv.summary}`);
            if (cv.experiences?.length) {
              parts.push(
                `Expériences: ${cv.experiences.map((e: any) => `${e.title} chez ${e.company}: ${e.description || ""}`).join("; ")}`,
              );
            }
            if (cv.skills?.length) {
              parts.push(
                `Compétences: ${cv.skills.map((s: any) => s.name).join(", ")}`,
              );
            }
            return parts.join("\n");
          };

          const optimization = await ctx.runAction(
            api.functions.cvAI.optimizeForJob,
            {
              cvContext: formatCtx3(cv3),
              jobDescription: typedArgs.jobDescription,
              language: typedArgs.language ?? "fr",
            },
          );

          result = {
            success: true,
            data: {
              message: `Score de correspondance: ${optimization.matchScore}%`,
              ...optimization,
            },
          };
          break;
        }

        case "generateCoverLetter": {
          const typedArgs = actionArgs as {
            jobTitle: string;
            companyName: string;
            style?: string;
            additionalInfo?: string;
            language?: string;
          };

          const cv4 = await ctx.runQuery(api.functions.cv.getMine);
          if (!cv4) {
            result = {
              success: false,
              error: "Aucun CV trouvé. Créez d'abord votre CV.",
            };
            break;
          }

          const formatCtx4 = (cv: any) => {
            const parts = [];
            if (cv.firstName || cv.lastName)
              parts.push(`Nom: ${cv.firstName ?? ""} ${cv.lastName ?? ""}`);
            if (cv.title) parts.push(`Titre: ${cv.title}`);
            if (cv.summary) parts.push(`Résumé: ${cv.summary}`);
            if (cv.experiences?.length) {
              parts.push(
                `Expériences: ${cv.experiences.map((e: any) => `${e.title} chez ${e.company}: ${e.description || ""}`).join("; ")}`,
              );
            }
            if (cv.skills?.length) {
              parts.push(
                `Compétences: ${cv.skills.map((s: any) => s.name).join(", ")}`,
              );
            }
            return parts.join("\n");
          };

          const letter = await ctx.runAction(
            api.functions.cvAI.generateCoverLetter,
            {
              cvContext: formatCtx4(cv4),
              jobTitle: typedArgs.jobTitle,
              companyName: typedArgs.companyName,
              style: typedArgs.style ?? "formal",
              additionalInfo: typedArgs.additionalInfo,
              language: typedArgs.language ?? "fr",
            },
          );

          result = {
            success: true,
            data: {
              message: "Lettre de motivation générée",
              coverLetter: letter.coverLetter,
            },
          };
          break;
        }

        case "getCVATSScore": {
          const typedArgs = actionArgs as {
            targetJob?: string;
            language?: string;
          };

          const cv5 = await ctx.runQuery(api.functions.cv.getMine);
          if (!cv5) {
            result = {
              success: false,
              error: "Aucun CV trouvé. Créez d'abord votre CV.",
            };
            break;
          }

          const formatCtx5 = (cv: any) => {
            const parts = [];
            if (cv.title) parts.push(`Titre: ${cv.title}`);
            if (cv.summary) parts.push(`Résumé: ${cv.summary}`);
            if (cv.experiences?.length) {
              parts.push(
                `Expériences: ${cv.experiences.map((e: any) => `${e.title} chez ${e.company}: ${e.description || ""}`).join("; ")}`,
              );
            }
            if (cv.education?.length) {
              parts.push(
                `Formations: ${cv.education.map((e: any) => `${e.degree} à ${e.school}`).join("; ")}`,
              );
            }
            if (cv.skills?.length) {
              parts.push(
                `Compétences: ${cv.skills.map((s: any) => s.name).join(", ")}`,
              );
            }
            if (cv.languages?.length) {
              parts.push(
                `Langues: ${cv.languages.map((l: any) => `${l.name} (${l.level})`).join(", ")}`,
              );
            }
            return parts.join("\n");
          };

          const atsResult = await ctx.runAction(api.functions.cvAI.atsScore, {
            cvContext: formatCtx5(cv5),
            targetJob: typedArgs.targetJob,
            language: typedArgs.language ?? "fr",
          });

          result = {
            success: true,
            data: {
              message: `Score ATS: ${atsResult.score}/100`,
              ...atsResult,
            },
          };
          break;
        }

        default:
          throw new Error(`Unknown action: ${actionType}`);
      }
    } catch (error) {
      result = {
        success: false,
        error: (error as Error).message,
      };
    }

    // If we have a conversationId, log the action execution
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

/**
 * Internal mutation to log action execution in conversation
 */
export const logActionExecution = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    actionType: v.string(),
    actionArgs: v.any(),
    result: v.object({
      success: v.boolean(),
      data: v.optional(v.any()),
      error: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    const now = Date.now();
    const toolMessage = {
      role: "tool" as const,
      content:
        args.result.success ?
          `Action ${args.actionType} exécutée: ${JSON.stringify(args.result.data)}`
        : `Erreur ${args.actionType}: ${args.result.error}`,
      toolCalls: [
        {
          name: args.actionType,
          args: args.actionArgs,
          result: args.result,
        },
      ],
      timestamp: now,
    };

    await ctx.db.patch(args.conversationId, {
      messages: [...conversation.messages, toolMessage],
      updatedAt: now,
    });
  },
});
