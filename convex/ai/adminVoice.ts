/**
 * AI Admin Voice Communication - Gemini Live API Integration
 *
 * Admin-specific voice backend providing session config and tool execution.
 * Read-only tools are executed here; mutative tools delegate to adminChat.executeAction.
 */
import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { api, internal } from "../_generated/api";
import {
  ADMIN_MUTATIVE_TOOLS,
  ADMIN_TOOL_PERMISSIONS,
  getAdminTools,
  type AdminAppScope,
} from "./adminTools";
import { executeAdminReadTool } from "./adminToolExecutor";

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
 * Get admin voice session configuration.
 *
 * Retourne aussi les `toolDeclarations` déjà résolues (description scopée par
 * app pour `navigateTo`) et déjà filtrées par permissions de l'agent — ainsi
 * le frontend n'a plus à manipuler le template `adminTools` brut.
 */
export const getAdminVoiceConfig = action({
  args: {
    orgId: v.optional(v.id("orgs")),
    app: v.optional(
      v.union(v.literal("agent"), v.literal("backoffice")),
    ),
  },
  handler: async (ctx, { orgId, app }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    const user = await ctx.runQuery(api.functions.users.getMe);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let personalizedPrompt = getAdminVoiceSystemPrompt();
    personalizedPrompt += `\n\nAGENT: ${user.firstName || ""} ${user.lastName || ""}`;

    // Construire les tool declarations scopées + filtrées par permissions.
    // Si l'appelant ne fournit pas orgId/app (legacy), on retombe sur le
    // template non-filtré pour préserver la compat.
    const appScope: AdminAppScope = app ?? "agent";
    const adminTools = getAdminTools(appScope);
    let toolDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }> = adminTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as Record<string, unknown>,
    }));

    if (orgId) {
      const filtered: typeof toolDeclarations = [];
      for (const decl of toolDeclarations) {
        const requiredTask = ADMIN_TOOL_PERMISSIONS[decl.name];
        if (!requiredTask) {
          filtered.push(decl);
          continue;
        }
        const allowed = await ctx.runQuery(
          internal.ai.adminChat.checkPermission,
          { userId: user._id, orgId, taskCode: requiredTask },
        );
        if (allowed) filtered.push(decl);
      }
      toolDeclarations = filtered;
    }

    // `endVoiceSession` est ajouté ici pour que le frontend n'ait plus à
    // patcher la liste après-coup (cf. ancien comportement).
    toolDeclarations.push({
      name: "endVoiceSession",
      description:
        "Termine la session vocale. Appelle cet outil quand l'agent dit au revoir ou veut arrêter.",
      parameters: { type: "object", properties: {} },
    });

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    return {
      model: VOICE_MODEL,
      wsUrl,
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: personalizedPrompt,
      },
      toolDeclarations,
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
      const user = await ctx.runQuery(api.functions.users.getMe);
      if (!user) {
        return { success: false, error: "USER_NOT_FOUND" };
      }

      const membership = await ctx.runQuery(
        api.functions.memberships.getMyMembership,
        { orgId },
      );
      const org = await ctx.runQuery(api.functions.orgs.getById, { orgId });

      let positionName = "Agent";
      if (membership?.positionId) {
        const position = await ctx.runQuery(
          internal.ai.adminChat.getPosition,
          { positionId: membership.positionId },
        );
        if (position) {
          positionName =
            typeof position.title === "object"
              ? (position.title as Record<string, string>).fr || "Agent"
              : String(position.title);
        }
      }

      const result = await executeAdminReadTool(
        ctx,
        toolName,
        (toolArgs ?? {}) as Record<string, unknown>,
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

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
});
