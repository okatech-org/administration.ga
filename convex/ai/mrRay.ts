/**
 * Mr Ray — Agent IA du Standard consulaire.
 *
 * Premier répondeur sur les threads "standard". Répond aux questions courantes
 * (démarches, horaires, documents) et escalade aux agents humains si nécessaire.
 * Ses messages sont insérés dans chatMessages (P2P) pour que les agents puissent
 * voir la conversation et prendre le relais.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const AI_MODEL = "gemini-2.5-flash";

const MR_RAY_SYSTEM_PROMPT = `Tu es Mr Ray, l'assistant du Standard du Consulat du Gabon. Tu es le premier point de contact pour les citoyens gabonais et les usagers des services consulaires.

PERSONNALITÉ:
- Accueillant, chaleureux et professionnel
- Tu parles comme un agent d'accueil bienveillant
- Tu te présentes toujours comme "Mr Ray, du Standard"
- Réponds dans la langue de l'utilisateur (français par défaut)

COMPÉTENCES:
- Informations sur les démarches consulaires (passeport, carte consulaire, état civil, visa)
- Horaires et coordonnées du consulat
- Orientation vers le bon service
- Documents nécessaires pour chaque démarche
- Prise de rendez-vous (orientation)

INFORMATIONS CONSULAT:
- Consulat Général du Gabon en France
- Adresse: 26 bis, avenue Raphaël, 75016 Paris
- Horaires d'ouverture: Lundi-Vendredi, 9h-13h / 14h30-17h
- Tél: +33 1 42 99 68 68

DOCUMENTS COURANTS:
- Carte consulaire: photo d'identité, passeport, justificatif de domicile, formulaire
- Passeport: ancienne pièce d'identité, acte de naissance, 2 photos, timbre fiscal
- Visa: passeport valide, formulaire, photos, justificatifs selon type de visa
- État civil: acte de naissance ou mariage gabonais, pièce d'identité

RÈGLES:
- Sois concis (2-4 phrases max par réponse)
- Si la question est complexe ou nécessite un traitement personnalisé, propose de transférer à un agent
- Ne jamais inventer d'informations
- Pour les cas urgents (perte de passeport, rapatriement), orienter vers le numéro d'urgence
- Tu ne peux PAS effectuer de démarches administratives directement`;

/**
 * Génère une réponse IA pour un thread standard et l'insère dans les messages.
 * Appelée via scheduler depuis initiateStandardChat ou sendMessage.
 */
export const generateReply = internalAction({
  args: {
    chatId: v.id("chats"),
    citizenMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Récupérer l'historique récent du thread pour le contexte
    const recentMessages = await ctx.runQuery(
      internal.ai.mrRay.getThreadHistory,
      { chatId: args.chatId, limit: 10 },
    );

    // Construire l'historique pour Gemini
    const history = (recentMessages ?? [])
      .filter((m: any) => m.type === "text")
      .map((m: any) => ({
        role: m.isMrRay ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    // Initialiser Gemini
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.functions.chats.insertMrRayMessage, {
        chatId: args.chatId,
        content: "Désolé, le service est temporairement indisponible. Un agent vous répondra prochainement.",
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents = [
      { role: "user", parts: [{ text: `[INSTRUCTIONS SYSTÈME] ${MR_RAY_SYSTEM_PROMPT}` }] },
      { role: "model", parts: [{ text: "Compris, je suis Mr Ray du Standard du Consulat du Gabon. Je suis prêt à accueillir les citoyens." }] },
      ...history,
      // Si le dernier message n'est pas déjà le message citoyen, l'ajouter
      ...(history.length === 0 || history[history.length - 1]?.role !== "user"
        ? [{ role: "user", parts: [{ text: args.citizenMessage }] }]
        : []),
    ];

    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: contents as Parameters<typeof ai.models.generateContent>[0]["contents"],
      });

      const candidate = response.candidates?.[0];
      let responseText = "";

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if ("text" in part && part.text) {
            responseText += part.text;
          }
        }
      }

      if (!responseText) {
        responseText = "Bonjour, je suis Mr Ray du Standard. Comment puis-je vous aider aujourd'hui ?";
      }

      // Insérer la réponse dans le thread P2P
      await ctx.runMutation(internal.functions.chats.insertMrRayMessage, {
        chatId: args.chatId,
        content: responseText,
      });
    } catch (e) {
      console.error("Mr Ray AI error:", e);
      await ctx.runMutation(internal.functions.chats.insertMrRayMessage, {
        chatId: args.chatId,
        content: "Je rencontre un problème technique. Un agent du Standard vous répondra rapidement.",
      });
    }
  },
});

/**
 * Query interne pour récupérer l'historique d'un thread (contexte Mr Ray).
 */
import { internalQuery } from "../_generated/server";

const MR_RAY_EMAIL = "assistant-admin2@consulatdugabon.fr";

export const getThreadHistory = internalQuery({
  args: {
    chatId: v.id("chats"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat_created", (q: any) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(limit);

    // Trouver Mr Ray pour identifier ses messages
    const mrRay = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", MR_RAY_EMAIL))
      .first();

    return messages.reverse().map((m) => ({
      content: m.content,
      type: m.type,
      isMrRay: mrRay ? m.senderId === mrRay._id : false,
    }));
  },
});
