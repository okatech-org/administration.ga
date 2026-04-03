/**
 * AI Admin Voice Communication - Gemini Live API Integration
 *
 * Admin-specific voice backend providing session config and tool execution.
 * Read-only tools are executed here; mutative tools delegate to adminChat.executeAction.
 */
import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { ADMIN_MUTATIVE_TOOLS } from "./adminTools";

// Voice model for real-time audio
const VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// Admin voice system prompt
function getAdminVoiceSystemPrompt(): string {
  return `Tu es l'Assistant Vocal pour les agents consulaires du Consulat du Gabon.

COMPORTEMENT VOCAL:
- Parle naturellement, comme un collègue professionnel
- Réponds de façon concise (max 2-3 phrases) car c'est une conversation vocale
- Utilise un ton professionnel mais chaleureux
- Réponds toujours en français

CAPACITÉS:
- Consulter les demandes en attente et leur statut
- Donner les statistiques du tableau de bord
- Chercher des citoyens dans le registre
- Consulter les rendez-vous et l'équipe
- Naviguer entre les pages admin
- Effectuer des actions (changer statut, assigner, noter) avec confirmation

CONFIRMATION DES ACTIONS:
- Quand tu appelles un outil qui modifie des données, un bouton de confirmation s'affiche à l'écran
- Annonce à l'agent: "Je vais vous demander de confirmer cette action via le bouton qui s'affiche"
- Attends la réponse de confirmation avant de continuer

FIN DE CONVERSATION:
- Quand l'agent dit "merci", "au revoir", "c'est bon" ou veut arrêter
- Appelle l'outil endVoiceSession IMMÉDIATEMENT
- Après l'appel, dis un bref au revoir`;
}

/**
 * Get admin voice session configuration
 */
export const getAdminVoiceConfig = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    const user = await ctx.runQuery(api.functions.users.getMe);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let personalizedPrompt = getAdminVoiceSystemPrompt();
    if (user) {
      personalizedPrompt += `\n\nAGENT: ${user.firstName || ""} ${user.lastName || ""}`;
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    return {
      model: VOICE_MODEL,
      wsUrl,
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: personalizedPrompt,
      },
      audioFormat: {
        input: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          mimeType: "audio/pcm;rate=16000",
        },
        output: {
          sampleRate: 24000,
          channels: 1,
          bitDepth: 16,
        },
      },
    };
  },
});

/**
 * Check if admin voice is available
 */
export const isAdminVoiceAvailable = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { available: false, reason: "not_authenticated" };
    }
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    if (!hasApiKey) {
      return { available: false, reason: "not_configured" };
    }
    return { available: true };
  },
});

/**
 * Execute an admin tool call from the voice assistant.
 * Read-only tools run here; mutative tools delegate to adminChat.executeAction.
 */
export const executeAdminVoiceTool = action({
  args: {
    toolName: v.string(),
    toolArgs: v.any(),
    orgId: v.id("orgs"),
  },
  handler: async (
    ctx,
    { toolName, toolArgs, orgId },
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "NOT_AUTHENTICATED" };
    }

    // Mutative tools → delegate to existing adminChat.executeAction
    if (
      (ADMIN_MUTATIVE_TOOLS as readonly string[]).includes(toolName)
    ) {
      try {
        const result = await ctx.runAction(
          api.ai.adminChat.executeAction,
          {
            actionType: toolName,
            actionArgs: toolArgs,
            orgId,
          },
        );
        return result;
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    try {
      // Helper to slim down requests
      const slimRequest = (r: Record<string, unknown>) => ({
        _id: r._id,
        reference: r.reference,
        status: r.status,
        userName:
          r.user && typeof r.user === "object"
            ? `${(r.user as Record<string, unknown>).firstName || ""} ${(r.user as Record<string, unknown>).lastName || ""}`.trim()
            : undefined,
        serviceName: r.serviceName,
      });

      let result: unknown;

      switch (toolName) {
        case "getAgentContext": {
          const user = await ctx.runQuery(api.functions.users.getMe);
          const [requestStats, registryStats] = await Promise.all([
            ctx.runQuery(api.functions.requests.getStatsByOrg, { orgId }),
            ctx.runQuery(
              api.functions.consularRegistrations.getStatsByOrg,
              { orgId },
            ),
          ]);
          result = {
            agent: `${user?.firstName || ""} ${user?.lastName || ""}`,
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
          result = { requestStats, registryStats };
          break;
        }

        case "getRequestsList": {
          const args = toolArgs as { status?: string };
          const stats = await ctx.runQuery(
            api.functions.requests.getStatsByOrg,
            { orgId },
          );
          const listResult = await ctx.runQuery(
            api.functions.requests.listByOrg,
            {
              orgId,
              status: args.status as any,
              paginationOpts: { numItems: 5, cursor: null },
            },
          );
          result = {
            stats: args.status
              ? { count: stats.statusCounts[args.status] ?? 0 }
              : stats,
            requests: listResult.page.map((r: Record<string, unknown>) =>
              slimRequest(r),
            ),
          };
          break;
        }

        case "getPendingRequests": {
          const stats = await ctx.runQuery(
            api.functions.requests.getStatsByOrg,
            { orgId },
          );
          result = {
            submittedCount: stats.statusCounts.submitted ?? 0,
            pendingCount: stats.statusCounts.pending ?? 0,
            total:
              (stats.statusCounts.submitted ?? 0) +
              (stats.statusCounts.pending ?? 0),
          };
          break;
        }

        case "getRequestDetail": {
          const args = toolArgs as { requestId: string };
          let detail: unknown = await ctx.runQuery(
            internal.functions.requests.internalGetByReferenceId,
            { referenceId: args.requestId },
          );
          if (!detail) {
            try {
              detail = await ctx.runQuery(internal.functions.requests.internalGetById, {
                requestId: args.requestId as Id<"requests">,
              });
            } catch {
              detail = null;
            }
          }
          if (!detail) {
            result = { error: "Demande introuvable" };
          } else {
            result = slimRequest(detail as Record<string, unknown>);
          }
          break;
        }

        case "searchCitizens": {
          const args = toolArgs as { query: string };
          result = await ctx.runQuery(
            api.functions.consularRegistrations.searchRegistrations,
            { orgId, searchQuery: args.query },
          );
          break;
        }

        case "getRegistryStats":
          result = await ctx.runQuery(
            api.functions.consularRegistrations.getStatsByOrg,
            { orgId },
          );
          break;

        case "getAppointmentsList":
          result = await ctx.runQuery(
            api.functions.appointments.listByOrg,
            { orgId },
          );
          break;

        case "getTeamMembers":
          result = await ctx.runQuery(
            internal.ai.adminChat.getOrgMembers,
            { orgId },
          );
          break;

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
});
