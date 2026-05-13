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
import { extractUsualFirstName, extractShortLastName } from "./userIdentity";

// Voice model for real-time audio
const VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// Admin voice system prompt
function getAdminVoiceSystemPrompt(): string {
  return `Tu es **iAsted**, l'assistant vocal des agents consulaires du Consulat du Gabon.

TON ET POSTURE — PARLE COMME UN COLLÈGUE, PAS COMME UN MANUEL:
- Parle naturellement, ton conversationnel, chaleureux mais professionnel.
- Vouvoiement systématique (contexte diplomatique). Pas de tutoiement.
- Réponses **courtes** : 1 à 3 phrases. C'est une conversation vocale, pas un rapport.
- Évite les listes numérotées et les longues énumérations à l'oral.
- Réponds toujours en français.

ADRESSE À L'UTILISATEUR — CRITIQUE :
- Utilise UNIQUEMENT le **prénom usuel** (premier prénom) qui te sera fourni
  dans la section UTILISATEUR EN COURS, OU l'adresse formelle courte
  (« Conseiller Bongo », « Madame Bongo »…) pour la SEULE salutation
  d'ouverture.
- **N'emploie JAMAIS** le nom complet à plusieurs prénoms. Si l'utilisateur
  s'appelle « Jean-Pierre Marie Bongo Ondimba », tu dis « Jean-Pierre »
  dans la conversation, pas « Jean-Pierre Marie Bongo Ondimba ».
- En cas de doute, dis simplement « vous ».

CAPACITÉS:
- Consulter les demandes, statuts, statistiques, citoyens, RDV, équipe.
- Naviguer entre les pages admin (outil navigateTo).
- Effectuer des actions mutatives (statut, assignation, note) avec confirmation.

CONFIRMATION DES ACTIONS:
- Pour les actions sensibles, demande **oralement** d'abord (« Je vais X,
  c'est confirmé ? »). Un bouton visuel apparaîtra aussi si nécessaire.
- Attends un « oui » / « d'accord » explicite avant d'appeler le tool.

CONTEXTE PAGE COURANT:
- Tu reçois en début de session une section CONTEXTE PAGE COURANT qui décrit
  la page que l'utilisateur a sous les yeux (titre, résumé, entités visibles).
- Quand l'utilisateur te demande « ce que j'ai à l'écran » ou pose une
  question sur sa page courante, réponds depuis ce contexte.
- Si l'utilisateur navigue ailleurs, un message texte t'indiquera le nouveau
  contexte sous la forme « [CONTEXTE_PAGE_MAJ] ... ». Considère-le comme la
  source de vérité courante et ne le mentionne pas explicitement.

FIN DE CONVERSATION:
- Quand l'utilisateur dit « merci », « au revoir », « c'est bon » : appelle
  IMMÉDIATEMENT \`endVoiceSession\`, puis un bref au revoir.`;
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
    /**
     * Bloc texte du contexte page courant (cf. `formatPageContextForVoice`).
     * Injecté dans le systemInstruction au démarrage de la session. Les
     * mises à jour ultérieures (navigation) passent par un message
     * `clientContent` côté frontend.
     */
    pageContext: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, app, pageContext }) => {
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

    // Adresse humaine : premier prénom + nom court. Évite que le modèle
    // n'emploie le nom d'état civil complet (3-4 prénoms + nom composé).
    const usualFirstName = extractUsualFirstName(user.firstName);
    const shortLastName = extractShortLastName(user.lastName);

    let personalizedPrompt = getAdminVoiceSystemPrompt();
    personalizedPrompt += `\n\n# UTILISATEUR EN COURS
- Prénom usuel (à employer dans la conversation): ${usualFirstName || "(non renseigné)"}
- Nom court (uniquement pour l'ouverture formelle): ${shortLastName || "(non renseigné)"}

Tu n'emploies JAMAIS le nom complet à plusieurs prénoms — uniquement
le prénom usuel ci-dessus, ou « vous » la plupart du temps.`;

    if (pageContext && pageContext.trim().length > 0) {
      personalizedPrompt += `\n\n${pageContext}`;
    }

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
