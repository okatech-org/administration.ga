/**
 * AI Voice Communication - Gemini Live API Integration
 *
 * Architecture:
 * - Backend: Provides session configuration and ephemeral tokens
 * - Frontend: Connects directly to Gemini Live API via WebSocket
 *
 * The Gemini Live API expects:
 * - Audio input: PCM 16-bit, 16kHz, mono
 * - Audio output: PCM 16-bit, 24kHz, mono
 */
import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { api, internal } from "../_generated/api";

// Voice model for real-time audio (from official Gemini Live API docs)
const VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// System instructions for voice assistant — locale-aware
function getVoiceSystemPrompt(locale: string): string {
  if (locale === "en") {
    return `You are the Voice Assistant for the Consulate of Gabon in France.

VOICE BEHAVIOR:
- Speak naturally, like a friendly consular agent
- Keep responses concise (max 2-3 sentences) since this is a voice conversation
- Use a professional yet warm tone
- Always respond in English

CAPABILITIES:
- Provide info about consulate hours and services
- Explain procedures (passport, consular card, legalization)
- Give general information
- Perform actions (create requests, update profile, manage CV) with user confirmation

ACTION CONFIRMATION:
- When you call a tool that modifies data, a confirmation button appears on screen
- Tell the user: "I'll need you to confirm this action using the button on your screen"
- Wait for the confirmation response before continuing
- If confirmed, announce that it's done
- If cancelled, say the action was cancelled

ENDING THE CONVERSATION:
- When the user says "thanks", "goodbye", "bye", "see you later" or wants to stop
- Call the endVoiceSession tool IMMEDIATELY — do NOT say goodbye before calling it
- After calling endVoiceSession, say a brief farewell (the session will close once you finish speaking)`;
  }

  return `Tu es l'Assistant Vocal du Consulat du Gabon en France.

COMPORTEMENT VOCAL:
- Parle naturellement, comme un agent consulaire amical
- Réponds de façon concise (max 2-3 phrases) car c'est une conversation vocale
- Utilise un ton professionnel mais chaleureux
- Réponds toujours en français

CAPACITÉS:
- Renseigner sur les horaires et services du consulat
- Expliquer les procédures (passeport, carte consulaire, légalisation)
- Donner des informations générales
- Effectuer des actions (créer des demandes, modifier le profil, gérer le CV) avec confirmation de l'utilisateur

CONFIRMATION DES ACTIONS:
- Quand tu appelles un outil qui modifie des données, un bouton de confirmation s'affiche à l'écran
- Annonce à l'utilisateur: "Je vais vous demander de confirmer cette action via le bouton qui s'affiche à l'écran"
- Attends la réponse de confirmation avant de continuer
- Si l'utilisateur confirme, annonce que c'est fait
- Si l'utilisateur annule, dis que l'action a été annulée

FIN DE CONVERSATION:
- Quand l'utilisateur dit "merci", "au revoir", "salut", "à bientôt" ou veut arrêter la conversation
- Appelle l'outil endVoiceSession IMMÉDIATEMENT — ne dis PAS au revoir avant de l'appeler
- Après avoir appelé endVoiceSession, dis un bref au revoir (la session se fermera une fois que tu auras fini de parler)`;
}

/**
 * Get voice session configuration
 * Returns the config needed to connect to Gemini Live API
 */
export const getVoiceConfig = action({
  args: {
    locale: v.optional(v.string()),
  },
  handler: async (ctx, { locale }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Get user info for personalization
    const user = await ctx.runQuery(api.functions.users.getMe);

    // Get API key (will be used client-side via ephemeral token in production)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Build personalized system instruction
    let personalizedPrompt = getVoiceSystemPrompt(locale || "fr");
    if (user) {
      personalizedPrompt += `\n\nUTILISATEUR: ${user.firstName || ""} ${user.lastName || ""}`;
    }

    // Gemini Live API WebSocket URL
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    return {
      model: VOICE_MODEL,
      wsUrl,
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: personalizedPrompt,
      },
      // Audio format specifications for frontend
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
 * Check if voice is available for the current user
 * (rate limiting, feature flags, etc.)
 */
export const isVoiceAvailable = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { available: false, reason: "not_authenticated" };
    }

    // Check if API key is configured
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    if (!hasApiKey) {
      return { available: false, reason: "not_configured" };
    }

    return { available: true };
  },
});

import { MUTATIVE_TOOLS } from "./tools";

/**
 * Execute a tool call from the voice assistant
 * Takes a tool name and arguments, executes the appropriate query/mutation
 * Returns a JSON-serializable result
 *
 * Read-only tools are executed directly, mutative tools return
 * a message to use the text chat instead (no confirmation UI in voice)
 */
export const executeVoiceTool = action({
  args: {
    toolName: v.string(),
    toolArgs: v.any(),
  },
  handler: async (
    ctx,
    { toolName, toolArgs },
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "NOT_AUTHENTICATED" };
    }

    // Mutative tools: delegate to executeAction from chat.ts which has all case handlers
    if ((MUTATIVE_TOOLS as readonly string[]).includes(toolName)) {
      try {
        const result = await ctx.runAction(api.ai.chat.executeAction, {
          actionType: toolName,
          actionArgs: toolArgs,
        });
        return result;
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    try {
      let result: unknown;

      switch (toolName) {
        // ============ GENERAL READ-ONLY ============
        case "getUserContext": {
          const profile = await ctx.runQuery(api.functions.profiles.getMine);
          const consularCard = await ctx.runQuery(
            api.functions.consularCard.getMyCard,
          );
          const activeRequest = await ctx.runQuery(
            api.functions.requests.getLatestActive,
          );
          const unreadCount = await ctx.runQuery(
            api.functions.notifications.getUnreadCount,
          );
          result = {
            profile,
            consularCard,
            activeRequest,
            unreadNotifications: unreadCount,
          };
          break;
        }

        case "getProfile":
          result = await ctx.runQuery(api.functions.profiles.getMine);
          break;

        case "getNotifications": {
          const args = toolArgs as { limit?: number };
          result = (
            await ctx.runQuery(api.functions.notifications.list, {
              paginationOpts: {
                numItems: args.limit ?? 10,
                cursor: null,
              },
            })
          ).page;
          break;
        }

        case "getUnreadNotificationCount":
          result = await ctx.runQuery(
            api.functions.notifications.getUnreadCount,
          );
          break;

        case "getRequests":
          result = (
            await ctx.runQuery(api.functions.requests.listMine, {
              paginationOpts: { numItems: 25, cursor: null },
            })
          ).page;
          break;

        case "getRequestDetails": {
          const args = toolArgs as { requestId: string };
          result = await ctx.runQuery(internal.functions.requests.internalGetById, {
            requestId: args.requestId as any,
          });
          break;
        }

        case "getServices":
          result = await ctx.runQuery(api.functions.services.listCatalog, {});
          break;

        case "getServicesByCountry": {
          const args = toolArgs as { country?: string; category?: string };
          let country = args.country;
          if (!country) {
            const profile = await ctx.runQuery(api.functions.profiles.getMine);
            country = profile?.countryOfResidence ?? "FR";
          }
          result = await ctx.runQuery(api.functions.services.listByCountry, {
            country,
            category: args.category as any,
          });
          break;
        }

        case "getOrganizationInfo": {
          const profile = await ctx.runQuery(api.functions.profiles.getMine);
          const country = profile?.countryOfResidence ?? "FR";
          const orgs = await ctx.runQuery(
            api.functions.orgs.listByJurisdiction,
            {
              residenceCountry: country,
            },
          );
          result = orgs?.[0] ?? null;
          break;
        }

        case "getAppointments":
          result = await ctx.runQuery(
            api.functions.appointments.listByUser,
            {},
          );
          break;

        case "getLatestNews": {
          const args = toolArgs as { limit?: number };
          result = await ctx.runQuery(api.functions.posts.getLatest, {
            limit: args.limit ?? 5,
          });
          break;
        }

        case "getMyConsularCard":
          result = await ctx.runQuery(api.functions.consularCard.getMyCard);
          break;

        // ============ iBOÎTE READ-ONLY ============
        case "getMyMailboxes":
          result = await ctx.runQuery(
            api.functions.digitalMail.getAccountsWithUnread,
          );
          break;

        case "getMailInbox": {
          const args = toolArgs as { mailboxId: string; limit?: number };
          result = await ctx.runQuery(api.functions.digitalMail.list, {
            ownerId: args.mailboxId as any,
            paginationOpts: {
              numItems: args.limit ?? 20,
              cursor: null,
            },
          });
          break;
        }

        case "getMailMessage": {
          const args = toolArgs as { id: string };
          result = await ctx.runQuery(api.functions.digitalMail.getById, {
            id: args.id as any,
          });
          break;
        }

        // ============ ASSOCIATIONS READ-ONLY ============
        case "getMyAssociations":
          result = await ctx.runQuery(api.functions.associations.getMine);
          break;

        case "getAssociationDetails": {
          const args = toolArgs as { id: string };
          result = await ctx.runQuery(api.functions.associations.getById, {
            id: args.id as any,
          });
          break;
        }

        case "getAssociationInvites":
          result = await ctx.runQuery(
            api.functions.associations.getPendingInvites,
          );
          break;

        // ============ COMPANIES READ-ONLY ============
        case "getMyCompanies":
          result = await ctx.runQuery(api.functions.companies.getMine);
          break;

        case "getCompanyDetails": {
          const args = toolArgs as { id: string };
          result = await ctx.runQuery(api.functions.companies.getById, {
            id: args.id as any,
          });
          break;
        }

        // ============ CV READ-ONLY ============
        case "getMyCV":
          result = await ctx.runQuery(api.functions.cv.getMine);
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
