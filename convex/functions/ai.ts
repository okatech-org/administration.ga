import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal } from "../_generated/api";

/**
 * AI Service for analyzing requests using Gemini
 */

// Initialize Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Analysis prompt template
 */
const getAnalysisPrompt = (data: {
  serviceName: string;
  requiredDocuments: string[];
  providedDocuments: string[];
  providedDocumentsDetails: Array<{
    filename: string;
    documentType: string;
    mimeType: string;
  }>;
  formDataText: string;
}) => `Tu es un assistant consulaire expert. Analyse cette demande de service consulaire.

## Service demandé
${data.serviceName}

## Documents requis par le service
${data.requiredDocuments.length > 0 ? data.requiredDocuments.map((d) => `- ${d}`).join("\n") : "Aucun document requis spécifié"}

## Documents fournis par le demandeur
${
  data.providedDocumentsDetails.length > 0 ?
    data.providedDocumentsDetails
      .map(
        (d) =>
          `- Type déclaré: "${d.documentType}" | Fichier: "${d.filename}" | Format: ${d.mimeType}`,
      )
      .join("\n")
  : "Aucun document fourni"
}

## Données du formulaire (champs avec leurs valeurs)
${data.formDataText || "(Aucune donnée de formulaire)"}

## Instructions d'analyse
Analyse cette demande et vérifie :
1. **Documents manquants** : Compare les documents requis avec ceux fournis. Le "type déclaré" doit correspondre à un document requis.
2. **Correspondance des documents** : Vérifie si le type déclaré par l'utilisateur correspond logiquement au fichier uploadé (ex: un PDF nommé "passport_scan.pdf" déclaré comme "Passeport" est cohérent).
3. **Formulaire** : Les champs sont-ils remplis correctement ? Y a-t-il des valeurs incohérentes ou manquantes ?
4. **Anomalies** : Détecte toute incohérence (dates invalides, texte non pertinent, etc.)

## Format de réponse (JSON uniquement)
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour :
{
  "status": "complete" | "incomplete" | "review_needed",
  "documentAnalysis": {
    "matched": ["liste des documents requis qui ont été fournis correctement"],
    "missing": ["liste des documents requis mais non fournis"],
    "suspicious": ["documents dont le type déclaré ne semble pas correspondre au fichier"]
  },
  "formAnalysis": {
    "missingFields": ["champs obligatoires non remplis ou avec valeurs vides"],
    "invalidValues": ["champs avec des valeurs incohérentes ou suspectes"]
  },
  "issues": ["autres problèmes détectés"],
  "summary": "résumé concis de l'analyse en français (max 3 phrases)",
  "confidence": 0-100,
  "suggestedAction": "upload_document" | "complete_info" | "confirm_info" | null,
  "actionMessage": "message clair et actionnable pour le citoyen si action requise"
}`;

interface AnalysisResult {
  status: "complete" | "incomplete" | "review_needed";
  documentAnalysis: {
    matched: string[];
    missing: string[];
    suspicious: string[];
  };
  formAnalysis: {
    missingFields: string[];
    invalidValues: string[];
  };
  issues: string[];
  summary: string;
  confidence: number;
  suggestedAction: "upload_document" | "complete_info" | "confirm_info" | null;
  actionMessage: string | null;
}

/**
 * Build formatted analysis note from AI response
 */
function buildAnalysisNote(analysis: AnalysisResult): string {
  const sections: string[] = [
    `**Analyse IA automatique**\n\n${analysis.summary}`,
  ];

  // Document analysis
  const docAnalysis = analysis.documentAnalysis;
  if (docAnalysis?.missing?.length > 0) {
    sections.push(
      `\n\n** Documents manquants:**\n${docAnalysis.missing.map((d: string) => `- ${d}`).join("\n")}`,
    );
  }
  if (docAnalysis?.suspicious?.length > 0) {
    sections.push(
      `\n\n** Documents à vérifier:**\n${docAnalysis.suspicious.map((d: string) => `- ${d}`).join("\n")}`,
    );
  }
  if (docAnalysis?.matched?.length > 0) {
    sections.push(
      `\n\n** Documents fournis:**\n${docAnalysis.matched.map((d: string) => `- ${d}`).join("\n")}`,
    );
  }

  // Form analysis
  const formAnalysis = analysis.formAnalysis;
  if (formAnalysis?.missingFields?.length > 0) {
    sections.push(
      `\n\n** Champs manquants:**\n${formAnalysis.missingFields.map((f: string) => `- ${f}`).join("\n")}`,
    );
  }
  if (formAnalysis?.invalidValues?.length > 0) {
    sections.push(
      `\n\n** Valeurs invalides:**\n${formAnalysis.invalidValues.map((f: string) => `- ${f}`).join("\n")}`,
    );
  }

  // Other issues
  if (analysis.issues?.length > 0) {
    sections.push(
      `\n\n**ℹ Points d'attention:**\n${analysis.issues.map((i: string) => `- ${i}`).join("\n")}`,
    );
  }

  return sections.join("");
}

/**
 * Analyze a request using Gemini AI
 * Triggered automatically when a request is submitted
 */
export const analyzeRequest = internalAction({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args): Promise<void> => {
    // Fetch request data
    const request = await ctx.runQuery(internal.functions.ai.getRequestData, {
      requestId: args.requestId,
    });

    if (!request) {
      console.error(`Request ${args.requestId} not found for AI analysis`);
      return;
    }

    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      const prompt = getAnalysisPrompt({
        serviceName: request.serviceName,
        requiredDocuments: request.requiredDocuments,
        providedDocuments: request.providedDocuments,
        providedDocumentsDetails: request.providedDocumentsDetails || [],
        formDataText: request.formDataText || "",
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      let analysis: AnalysisResult;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        analysis = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("Failed to parse AI response:", responseText);
        analysis = {
          status: "review_needed",
          documentAnalysis: { matched: [], missing: [], suspicious: [] },
          formAnalysis: { missingFields: [], invalidValues: [] },
          issues: ["Erreur lors de l'analyse automatique"],
          summary:
            "L'analyse automatique n'a pas pu être complétée. Vérification manuelle requise.",
          confidence: 0,
          suggestedAction: null,
          actionMessage: null,
        };
      }

      // Create AI note with analysis results
      const noteContent = buildAnalysisNote(analysis);
      await ctx.runMutation(internal.functions.ai.createAINote, {
        requestId: args.requestId,
        content: noteContent,
        analysisType: "completeness",
        confidence: analysis.confidence,
      });

      // If critical issues found, trigger action required
      const missingDocs = analysis.documentAnalysis?.missing || [];
      if (
        analysis.suggestedAction &&
        analysis.actionMessage &&
        analysis.status === "incomplete"
      ) {
        // Build a label→slug map from the original joinedDocumentTypes
        const joinedDocs = request.joinedDocumentTypes || [];
        const labelToSlugMap = new Map<string, { type: string; label: { fr: string; en?: string }; required: boolean }>();
        for (const jd of joinedDocs) {
          const frLabel = (jd.label as { fr?: string })?.fr || jd.type;
          const enLabel = (jd.label as { en?: string })?.en;
          const entry: { type: string; label: { fr: string; en?: string }; required: boolean } = {
            type: jd.type,
            label: { fr: frLabel, ...(enLabel ? { en: enLabel } : {}) },
            required: jd.required,
          };
          labelToSlugMap.set(frLabel.toLowerCase(), entry);
          labelToSlugMap.set(jd.type.toLowerCase(), entry);
        }

        const mappedDocTypes =
          missingDocs.length > 0
            ? missingDocs.map((docLabel) => {
                // Try to find the matching joinedDoc by label or slug
                const matched = labelToSlugMap.get(docLabel.toLowerCase());
                if (matched) {
                  return {
                    type: matched.type,
                    label: matched.label,
                    required: matched.required,
                  };
                }
                // Fallback: use other_official_document with the AI label
                return {
                  type: "other_official_document",
                  label: { fr: docLabel, en: docLabel },
                  required: true,
                };
              })
            : undefined;

        await ctx.runMutation(internal.functions.ai.triggerActionRequired, {
          requestId: args.requestId,
          type: analysis.suggestedAction,
          message: analysis.actionMessage,
          documentTypes: mappedDocTypes,
        });
      }

      console.log(
        `AI analysis completed for request ${args.requestId}:`,
        analysis.status,
      );
    } catch (error) {
      console.error(`AI analysis failed for request ${args.requestId}:`, error);

      // Create error note
      await ctx.runMutation(internal.functions.ai.createAINote, {
        requestId: args.requestId,
        content: `**Analyse IA - Erreur**\n\nL'analyse automatique n'a pas pu être effectuée. Vérification manuelle recommandée.`,
        analysisType: "completeness",
        confidence: 0,
      });
    }
  },
});

/**
 * Internal query to get request data for analysis
 */
export const getRequestData = internalQuery({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    // Get service info
    const orgService = await ctx.db.get(request.orgServiceId);
    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

    // Get documents with their types
    const documents = await Promise.all(
      (request.documents || []).map(async (docId) => {
        const doc = await ctx.db.get(docId);
        const firstFile = doc?.files?.[0];
        return {
          filename: firstFile?.filename || "Document sans nom",
          documentType: doc?.documentType || "type_inconnu",
          mimeType: firstFile?.mimeType || "",
        };
      }),
    );

    // Transform formData to human-readable text for AI prompt
    const formDataText = formatFormDataForPrompt(
      request.formData || {},
      service?.formSchema,
    );

    // Get required documents from formSchema.joinedDocuments
    const joinedDocs = service?.formSchema?.joinedDocuments ?? [];

    return {
      serviceName: service?.name?.fr || service?.name?.en || "Service inconnu",
      requiredDocuments: joinedDocs.map(
        (d: { label?: { fr?: string; en?: string }; type: string }) =>
          d.label?.fr || d.type,
      ),
      // Raw joinedDocs with type slugs for mapping AI labels back to slugs
      joinedDocumentTypes: joinedDocs.map(
        (d: { label?: { fr?: string; en?: string }; type: string; required?: boolean }) => ({
          type: d.type,
          label: d.label || { fr: d.type, en: d.type },
          required: d.required ?? false,
        }),
      ),
      providedDocuments: documents.map(
        (d) => `${d.documentType} (${d.filename})`,
      ),
      providedDocumentsDetails: documents,
      formDataText, // Human-readable text for AI prompt
      rawFormData: request.formData || {},
    };
  },
});

/**
 * Transform formData to human-readable text format for AI prompt
 * This avoids Convex serialization issues with non-ASCII characters in object keys
 */
function formatFormDataForPrompt(
  formData: Record<string, unknown>,
  formSchema?: {
    sections?: Array<{
      id: string;
      title: { fr?: string; en?: string };
      fields?: Array<{ id: string; label: { fr?: string; en?: string } }>;
    }>;
  } | null,
): string {
  if (!formSchema?.sections) {
    return JSON.stringify(formData, null, 2);
  }

  const lines: string[] = [];

  for (const [sectionId, sectionData] of Object.entries(formData)) {
    const sectionSchema = formSchema.sections.find((s) => s.id === sectionId);

    const sectionLabel = sectionSchema?.title?.fr || sectionId;
    lines.push(`\n### ${sectionLabel}`);

    if (typeof sectionData === "object" && sectionData !== null) {
      for (const [fieldId, fieldValue] of Object.entries(
        sectionData as Record<string, unknown>,
      )) {
        const fieldSchema = sectionSchema?.fields?.find(
          (f) => f.id === fieldId,
        );
        const fieldLabel = fieldSchema?.label?.fr || fieldId;
        const displayValue = fieldValue ?? "(non renseigné)";
        lines.push(`- **${fieldLabel}**: ${displayValue}`);
      }
    } else {
      lines.push(`- ${sectionData}`);
    }
  }

  return lines.join("\n");
}

/**
 * Internal mutation to create AI note
 */
export const createAINote = internalMutation({
  args: {
    requestId: v.id("requests"),
    content: v.string(),
    analysisType: v.union(
      v.literal("completeness"),
      v.literal("document_check"),
      v.literal("data_validation"),
    ),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentNotes", {
      requestId: args.requestId,
      content: args.content,
      source: "ai",
      aiAnalysisType: args.analysisType,
      aiConfidence: args.confidence,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to trigger action required from AI analysis
 */
export const triggerActionRequired = internalMutation({
  args: {
    requestId: v.id("requests"),
    type: v.union(
      v.literal("upload_document"),
      v.literal("complete_info"),
      v.literal("confirm_info"),
    ),
    message: v.string(),
    documentTypes: v.optional(v.array(v.object({
      type: v.string(),
      label: v.optional(v.any()),
      required: v.optional(v.boolean()),
    }))),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return;

    const existingActions = (request as any).actionsRequired ?? [];

    // Skip if an action of this type already exists and is not completed
    const hasPendingOfSameType = existingActions.some(
      (a: any) => a.type === args.type && !a.completedAt,
    );
    if (hasPendingOfSameType) return;

    const actionId = crypto.randomUUID().slice(0, 12);

    await ctx.db.patch(args.requestId, {
      actionsRequired: [
        ...existingActions,
        {
          id: actionId,
          type: args.type,
          message: args.message,
          documentTypes: args.documentTypes,
          createdAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    });
  },
});
