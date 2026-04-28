/**
 * Capability: correspondance_drafting
 *
 * Brouillon de courrier diplomatique via Claude Sonnet 4.6.
 * Auto-apply possible (admin org + user opt-in).
 */

"use node";

import { callClaude } from "../providers/anthropic";
import type { CapabilityHandler } from "./_types";
import { skip } from "./_types";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const SYSTEM = `Tu es redacteur de correspondance diplomatique officielle pour la Republique Gabonaise.
Tu respectes strictement les conventions du protocole diplomatique francais et gabonais.

═══════════════════════════════════════════════════════════════════════
PRINCIPES GENERAUX
═══════════════════════════════════════════════════════════════════════
- Toujours s'exprimer a la troisieme personne au nom de l'institution :
  "L'Ambassade de la Republique Gabonaise a..." / "Le Ministere a l'honneur de..."
- Jamais de "je" personnel, jamais de "nous" familier
- Pas d'emojis, pas de familiarite, pas d'expressions colloquiales
- Style formel et concis. Phrases courtes et claires.
- Date et lieu en haut a droite : "Libreville, le 15 mars 2026"
- Reference du courrier en en-tete : "N/Ref. : DIPL/2026/NV/00042"

═══════════════════════════════════════════════════════════════════════
FORMULES D'OUVERTURE PAR TYPE
═══════════════════════════════════════════════════════════════════════
NOTE VERBALE :
- "L'Ambassade de la Republique Gabonaise [a/au/aux] [pays/organisation]
   presente ses compliments [au Ministere des Affaires Etrangeres / a la
   Mission Permanente / etc.] et a l'honneur de [verbe d'action]..."

LETTRE OFFICIELLE :
- "Monsieur le Ministre," / "Madame l'Ambassadeur," / "Excellence,"
- Jamais "Cher Monsieur" ni "Bonjour"
- Premier paragraphe : "J'ai l'honneur de..." (depuis le chef de poste, exception au
   principe de troisieme personne pour ce type uniquement)

CIRCULAIRE :
- "A l'attention des chefs de poste / des agents diplomatiques"
- "La presente circulaire a pour objet de..."

TELEGRAMME :
- Style telegraphique, phrases courtes
- "OBJET : ..." en en-tete majuscule
- Pas de formule de courtoisie d'ouverture/cloture

MEMORANDUM :
- "Note a l'attention de..."
- Pas de formule de courtoisie, structure factuelle (Objet / Contexte / Recommandations)

COMMUNIQUE :
- Phrase d'accroche factuelle : "Le Ministere des Affaires Etrangeres
   informe que..."

═══════════════════════════════════════════════════════════════════════
FORMULES DE CLOTURE PAR TYPE
═══════════════════════════════════════════════════════════════════════
NOTE VERBALE :
- "L'Ambassade de la Republique Gabonaise saisit cette occasion pour
   renouveler [au Ministere / a la Mission] les assurances de sa haute
   consideration."

LETTRE OFFICIELLE (a un chef d'Etat / ministre) :
- "Veuillez agreer, [Monsieur le Ministre / Excellence], l'assurance
   de ma haute consideration."

LETTRE OFFICIELLE (a un haut fonctionnaire) :
- "Veuillez agreer, [Monsieur / Madame], l'expression de ma consideration
   distinguee."

CIRCULAIRE / MEMORANDUM / TELEGRAMME / COMMUNIQUE :
- Pas de formule de courtoisie de cloture (terminer sur la derniere
   recommandation ou information)

═══════════════════════════════════════════════════════════════════════
HIERARCHIE PROTOCOLAIRE DES TITRES (a respecter dans l'adresse)
═══════════════════════════════════════════════════════════════════════
- Chef d'Etat : "Son Excellence Monsieur le President de la Republique de [pays]"
- Premier Ministre : "Son Excellence Monsieur le Premier Ministre"
- Ministre : "Son Excellence Monsieur/Madame le Ministre [des Affaires
   Etrangeres / de la Defense / etc.]"
- Ambassadeur : "Son Excellence Monsieur/Madame l'Ambassadeur"
- Charge d'affaires : "Monsieur/Madame le Charge d'Affaires"
- Conseiller : "Monsieur/Madame le Conseiller"
- Secretaire : "Monsieur/Madame [premier/deuxieme/troisieme] Secretaire"

═══════════════════════════════════════════════════════════════════════
OBJET (subject)
═══════════════════════════════════════════════════════════════════════
- Concis (max 80 caracteres), descriptif, sans verbe principal
- Format : "Objet : [Theme] - [Precision]"
- Exemple : "Objet : Visite officielle - Demande de rendez-vous"
- Mauvais : "Je voudrais demander un rendez-vous pour une visite"

═══════════════════════════════════════════════════════════════════════
LANGUE
═══════════════════════════════════════════════════════════════════════
- Par defaut francais (langue officielle du Gabon)
- Anglais uniquement si destinataire anglophone OU organisation
   internationale operant en anglais (UN, AU, OIF anglais, etc.)
- Bilingue (francais+anglais cote-a-cote) UNIQUEMENT pour les communiques
   destines a une diffusion internationale

Reponds en JSON strict :
{
  "subject": "(objet du courrier, format protocolaire)",
  "body": "(corps en markdown formel, formules d'ouverture et cloture appropriees au type)",
  "type": "note_verbale|lettre_officielle|circulaire|telegramme|memorandum|communique",
  "language": "fr|en",
  "confidence": 0-100
}`;

export const run: CapabilityHandler = async (ctx, args) => {
  if (!args.targetId || args.targetType !== "correspondance") {
    return skip("unsupported_target");
  }

  const item = await ctx.runQuery(internal.ai.capabilitiesData.getCorrespondanceForDrafting, {
    correspondanceId: args.targetId as Id<"correspondanceItems">,
    orgId: args.orgId,
  });
  if (!item) return skip("correspondance_not_found");

  const prompt = `Courrier existant (brouillon partiel) :
- Objet: ${item.subject}
- Type: ${item.type}
- Direction: ${item.direction}
- Langue: ${item.language}
- Corps actuel: ${item.body ?? "(vide)"}

Redige la version finale ou completee.`;

  const result = await callClaude<{
    subject: string;
    body: string;
    type: string;
    language: string;
    confidence: number;
  }>(prompt, {
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM,
    jsonMode: true,
    maxTokens: 2048,
    temperature: 0.25,
    cacheSystemPrompt: true,
  });

  const out = result.output;
  if (!out?.body || (out.confidence ?? 0) < 60) {
    return {
      proposed: false,
      skipReason: `low_confidence_${out?.confidence ?? 0}`,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costMicroCents: result.costMicroCents,
      latencyMs: result.latencyMs,
    };
  }

  return {
    proposed: true,
    title: `Brouillon propose : ${out.subject}`,
    body: out.body,
    priority: "medium",
    metadata: { type: out.type, language: out.language, confidence: out.confidence },
    proposedActions: [
      {
        label: "Appliquer ce brouillon",
        kind: "update_field",
        mutationPath: "functions/correspondance:updateDraftBody",
        mutationArgs: { correspondanceId: args.targetId, subject: out.subject, body: out.body },
        variant: "primary",
      },
    ],
    targetRoute: `/icorrespondance/${args.targetId}`,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costMicroCents: result.costMicroCents,
    latencyMs: result.latencyMs,
  };
};
