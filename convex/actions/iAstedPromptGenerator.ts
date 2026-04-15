"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * iAstedPromptGenerator — Action Gemini qui génère un systemPromptSuffix
 * contextualisé pour la persona iAsted d'une représentation (Phase C6)
 *
 * Inputs : nom de l'org, type, pays hôte, services actifs, chef de mission
 * Output : prompt Markdown rédigé professionnellement à utiliser dans
 * `orgIAstedConfig.systemPromptSuffix`.
 *
 * L'utilisateur peut ensuite éditer ce prompt avant de le sauvegarder.
 */

/**
 * Phase F2.3 — Guardrails pour valider le prompt généré par Gemini.
 * Vérifie la taille, détecte les patterns d'injection et les contenus
 * inappropriés avant de retourner le prompt.
 */
const MAX_PROMPT_LENGTH = 2000;
const INJECTION_PATTERNS = [
  /ignore (previous|above|all)/i,
  /disregard (previous|above|the)/i,
  /forget (previous|above|everything)/i,
  /system\s*:\s*/i,
  /<\|im_start\|>/i,
  /\[INST\]/i,
  /jailbreak/i,
  /act as (if you are|an unrestricted|a different)/i,
  /you are now/i,
  /new instructions/i,
];

export interface PromptValidationResult {
  valid: boolean;
  issues: string[];
}

export function validatePromptOutput(prompt: string): PromptValidationResult {
  const issues: string[] = [];

  if (!prompt || prompt.length === 0) {
    issues.push("empty_output");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    issues.push(`too_long_${prompt.length}_chars`);
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      issues.push(`injection_pattern_detected:${pattern.source}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export const generateDefaultPrompt = action({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args): Promise<{ prompt: string; validation: PromptValidationResult }> => {
    // Charger les données contextuelles de l'org
    const org = await ctx.runQuery(api.functions.orgs.getById, {
      orgId: args.orgId,
    });
    if (!org) throw new Error("Représentation introuvable");

    const orgServices = await ctx.runQuery(api.functions.services.listByOrg, {
      orgId: args.orgId,
    });

    const activeServices = (orgServices ?? [])
      .filter((s: { isActive?: boolean }) => s.isActive !== false)
      .map(
        (s: { service?: { name?: { fr?: string } } }) =>
          s.service?.name?.fr ?? "Service",
      )
      .slice(0, 10); // limite pour ne pas exploser le prompt

    // Construire le contexte
    const contextLines = [
      `Nom : ${org.name}`,
      `Type : ${org.type}`,
      `Pays d'accueil : ${org.country ?? "—"}`,
    ];
    if (org.protocol?.headOfMissionTitleFr) {
      contextLines.push(`Chef de poste : ${org.protocol.headOfMissionTitleFr}`);
    }
    if (org.jurisdiction?.primary?.length) {
      contextLines.push(
        `Juridiction : ${org.jurisdiction.primary.join(", ")}`,
      );
    }
    if (activeServices.length > 0) {
      contextLines.push(
        `Services actifs : ${activeServices.join(", ")}`,
      );
    }

    const metaPrompt = `Tu es un expert en rédaction de prompts pour assistants IA conversationnels.

Génère un "systemPromptSuffix" en français à ajouter au prompt système de Gemini pour personnaliser un assistant IA chatbot d'une représentation diplomatique du Gabon à l'étranger.

CONTEXTE DE LA REPRÉSENTATION :
${contextLines.join("\n")}

CONSIGNES :
- Rédige en français, ton professionnel et chaleureux
- 3 à 5 paragraphes maximum
- Mentionne le nom de la représentation et son rôle
- Liste 2-3 services prioritaires (depuis ceux fournis)
- Précise que l'assistant doit toujours rediriger vers un agent humain pour les cas urgents
- N'invente pas de procédures non mentionnées dans le contexte
- Format : Markdown sobre (titres ##, listes courtes)

GÉNÈRE LE PROMPT SYSTÈME :`;

    // Appel Gemini
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: metaPrompt }] }],
    });

    const generated = (result.text ?? "").trim();

    // Phase F2.3 — Valider le prompt généré avec guardrails
    const validation = validatePromptOutput(generated);

    // Si trop long, tronquer proprement au dernier paragraphe complet
    let finalPrompt = generated;
    if (generated.length > MAX_PROMPT_LENGTH) {
      const truncated = generated.substring(0, MAX_PROMPT_LENGTH);
      const lastParagraph = truncated.lastIndexOf("\n\n");
      finalPrompt = lastParagraph > 500
        ? truncated.substring(0, lastParagraph)
        : truncated;
    }

    return {
      prompt: finalPrompt,
      validation,
    };
  },
});
