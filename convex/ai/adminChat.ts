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
import {
  buildAdminContextPrompt,
  pageContextValidator,
} from "./adminContext";
import {
  executeAdminReadTool,
  truncateToolResult,
} from "./adminToolExecutor";
import { rateLimiter } from "./rateLimiter";
import { canDoTask } from "../lib/permissions";

const AI_MODEL = "gemini-2.5-flash";

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

    // Build context-aware system prompt (shared with streaming + voice)
    const contextPrompt = buildAdminContextPrompt(
      {
        firstName: user.firstName,
        lastName: user.lastName,
        positionName,
        orgName: org?.name || "Inconnue",
        orgId,
      },
      currentPage,
      pageContext,
    );

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
            const toolResult = await executeAdminReadTool(
              ctx,
              name,
              args,
              {
                orgId,
                user: {
                  _id: user._id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                },
                positionName,
                org,
              },
            );
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
          result: truncateToolResult(tr.result),
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
  handler: async (ctx, { actionType, actionArgs, orgId: _orgId, conversationId }) => {
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
