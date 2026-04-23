/**
 * Document Analysis with Gemini Vision
 * Analyzes passport and other documents to extract data
 */
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { rateLimiter } from "./rateLimiter";

// Prompt for passport analysis
const PASSPORT_ANALYSIS_PROMPT = `Analyse cette image de passeport et extrais les informations suivantes au format JSON strict:

{
  "documentType": "passport",
  "isValid": true/false,
  "confidence": 0-100,
  "extractedData": {
    "firstName": "Prénom(s)",
    "lastName": "Nom de famille",
    "birthDate": "YYYY-MM-DD",
    "birthPlace": "Lieu de naissance",
    "nationality": "Nationalité (code ISO 2 lettres, ex: GA pour Gabon, FR pour France)",
    "gender": "M ou F",
    "passportNumber": "Numéro du passeport",
    "issueDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD",
    "issuingAuthority": "Autorité émettrice"
  },
  "warnings": ["Liste des problèmes détectés: document expiré, mauvaise qualité, etc."]
}

RÈGLES:
- Renvoie UNIQUEMENT le JSON, sans markdown ni texte supplémentaire
- Si un champ n'est pas lisible, mets null
- isValid=false si le document est expiré, illisible ou suspect
- confidence indique la confiance globale (0-100)
- Les dates DOIVENT être au format YYYY-MM-DD`;

// Prompt for residence permit (titre de séjour) analysis
const RESIDENCE_PERMIT_ANALYSIS_PROMPT = `Analyse cette image de titre de séjour / carte de résident et extrais les informations suivantes au format JSON strict:

{
  "documentType": "residence_permit",
  "isValid": true/false,
  "confidence": 0-100,
  "extractedData": {
    "firstName": "Prénom(s)",
    "lastName": "Nom de famille",
    "birthDate": "YYYY-MM-DD",
    "nationality": "Nationalité (code ISO 2 lettres, ex: GA pour Gabon, FR pour France)",
    "gender": "M ou F",
    "permitNumber": "Numéro du titre de séjour",
    "permitType": "Type (carte de résident, carte de séjour temporaire, visa long séjour, etc.)",
    "issueDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD",
    "issuingAuthority": "Autorité émettrice (préfecture, OFII, etc.)",
    "issuingCountry": "Pays émetteur (code ISO 2 lettres)",
    "address": "Adresse mentionnée sur le titre"
  },
  "warnings": ["Liste des problèmes détectés: document expiré, mauvaise qualité, etc."]
}

RÈGLES:
- Renvoie UNIQUEMENT le JSON, sans markdown ni texte supplémentaire
- Si un champ n'est pas lisible, mets null
- isValid=false si le document est expiré, illisible ou suspect
- confidence indique la confiance globale (0-100)
- Les dates DOIVENT être au format YYYY-MM-DD`;

// Prompt for generic document analysis
const DOCUMENT_ANALYSIS_PROMPT = `Analyse ce document et identifie son type. Extrais les informations pertinentes au format JSON:

{
  "documentType": "passport|id_card|birth_certificate|proof_of_address|residence_permit|photo|other",
  "isValid": true/false,
  "confidence": 0-100,
  "description": "Description brève du document",
  "extractedData": {},
  "warnings": []
}

Renvoie UNIQUEMENT le JSON, sans markdown ni texte supplémentaire.`;

export type DocumentAnalysisResult = {
  success: boolean;
  documentType: string;
  isValid: boolean;
  confidence: number;
  extractedData: Record<string, unknown>;
  warnings: string[];
  error?: string;
};

/**
 * Analyze a document image with Gemini Vision
 */
export const analyzeDocument = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
    documentType: v.optional(v.string()), // "passport", "id_card", etc.
  },
  handler: async (ctx, { imageBase64, mimeType, documentType }): Promise<DocumentAnalysisResult> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        documentType: "unknown",
        isValid: false,
        confidence: 0,
        extractedData: {},
        warnings: [],
        error: "NOT_AUTHENTICATED",
      };
    }

    // Rate limiting
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", { 
      key: identity.subject 
    });
    if (!ok) {
      const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
      return {
        success: false,
        documentType: "unknown",
        isValid: false,
        confidence: 0,
        extractedData: {},
        warnings: [],
        error: `RATE_LIMITED:Veuillez attendre ${waitSeconds} secondes.`,
      };
    }

    try {
      // Initialize Gemini
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Choose prompt based on document type
      const prompt =
        documentType === "passport"
          ? PASSPORT_ANALYSIS_PROMPT
          : documentType === "residence_permit"
            ? RESIDENCE_PERMIT_ANALYSIS_PROMPT
            : DOCUMENT_ANALYSIS_PROMPT;

      // Build content with image
      const contents = [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ];

      // Call Gemini with vision
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: contents,
      });

      // Parse response
      const responseText = response.text || "";
      
      // Try to parse JSON from response
      let parsed: Record<string, unknown>;
      try {
        // Remove any markdown code blocks if present
        const jsonText = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsed = JSON.parse(jsonText);
      } catch {
        console.error("Failed to parse Gemini response:", responseText);
        return {
          success: false,
          documentType: "unknown",
          isValid: false,
          confidence: 0,
          extractedData: {},
          warnings: ["Impossible d'analyser le document. Assurez-vous que l'image est claire et lisible."],
          error: "PARSE_ERROR",
        };
      }

      return {
        success: true,
        documentType: (parsed.documentType as string) || "unknown",
        isValid: (parsed.isValid as boolean) ?? false,
        confidence: (parsed.confidence as number) ?? 0,
        extractedData: (parsed.extractedData as Record<string, unknown>) || {},
        warnings: (parsed.warnings as string[]) || [],
      };

    } catch (err) {
      console.error("Document analysis error:", err);
      return {
        success: false,
        documentType: "unknown",
        isValid: false,
        confidence: 0,
        extractedData: {},
        warnings: [],
        error: (err as Error).message,
      };
    }
  },
});

/**
 * Analyze a document from Convex storage
 */
export const analyzeStoredDocument = action({
  args: {
    storageId: v.id("_storage"),
    documentType: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, documentType }): Promise<DocumentAnalysisResult> => {
    // Get the file from storage
    const blob = await ctx.storage.get(storageId);
    if (!blob) {
      return {
        success: false,
        documentType: "unknown",
        isValid: false,
        confidence: 0,
        extractedData: {},
        warnings: [],
        error: "FILE_NOT_FOUND",
      };
    }

    // Convert to base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Get mime type from blob
    const mimeType = blob.type || "image/jpeg";

    // Call the analysis action
    return await ctx.runAction(api.ai.documentAnalysis.analyzeDocument, {
      imageBase64: base64,
      mimeType,
      documentType,
    });
  },
});
