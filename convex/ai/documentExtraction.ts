/**
 * Document Data Extraction for Registration Pre-fill
 * Analyzes multiple documents and extracts structured data for form pre-filling
 */
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { rateLimiter } from "./rateLimiter";
import type { Id } from "../_generated/dataModel";

// Comprehensive prompt for multi-document extraction
const EXTRACTION_PROMPT = `Tu es un expert en extraction de données à partir de documents administratifs.
Analyse tous les documents fournis et extrait les informations pour pré-remplir un formulaire d'inscription consulaire.

Retourne un JSON avec cette structure EXACTE:

{
  "basicInfo": {
    "firstName": "Prénom(s)",
    "lastName": "Nom de famille",
    "gender": "male" | "female" | null,
    "birthDate": "YYYY-MM-DD" ou null,
    "birthPlace": "Ville de naissance" ou null,
    "birthCountry": "Code ISO 2 lettres (ex: GA, FR, CM)" ou null,
    "nationality": "Code ISO 2 lettres" ou null,
    "nip": "Numéro d'Identification Personnel (NIP)" ou null,
    "nationalityAcquisition": "Birth" | "Marriage" | "Naturalization" | "Other" | null
  },
  "passportInfo": {
    "number": "Numéro du passeport" ou null,
    "issueDate": "YYYY-MM-DD" ou null,
    "expiryDate": "YYYY-MM-DD" ou null,
    "issuingAuthority": "Autorité de délivrance" ou null
  },
  "residencePermitInfo": {
    "number": "Numéro du titre de séjour" ou null,
    "permitType": "Type (carte de résident, carte de séjour temporaire, visa long séjour, etc.)" ou null,
    "issueDate": "YYYY-MM-DD" ou null,
    "expiryDate": "YYYY-MM-DD" ou null,
    "issuingAuthority": "Autorité émettrice (préfecture, OFII, etc.)" ou null,
    "issuingCountry": "Code ISO 2 lettres du pays émetteur" ou null
  },
  "familyInfo": {
    "maritalStatus": "Single" | "Married" | "Divorced" | "Widowed" | "CivilUnion" | "Cohabiting" | null,
    "fatherFirstName": "Prénom du père" ou null,
    "fatherLastName": "Nom du père" ou null,
    "motherFirstName": "Prénom de la mère" ou null,
    "motherLastName": "Nom de la mère" ou null,
    "spouseFirstName": "Prénom du conjoint" ou null,
    "spouseLastName": "Nom du conjoint" ou null
  },
  "contactInfo": {
    "street": "Adresse de résidence (numéro et rue)" ou null,
    "city": "Ville de résidence" ou null,
    "postalCode": "Code postal de résidence" ou null,
    "country": "Code ISO 2 lettres du pays de résidence" ou null,
    "homelandStreet": "Adresse au pays d'origine (rue)" ou null,
    "homelandCity": "Ville au pays d'origine" ou null,
    "homelandPostalCode": "Code postal au pays d'origine" ou null,
    "homelandCountry": "Code ISO 2 lettres du pays d'origine" ou null
  },
  "confidence": 0-100,
  "extractedFrom": ["passport", "birth_certificate", etc.],
  "warnings": ["Liste des problèmes ou informations incertaines"]
}

RÈGLES IMPORTANTES:
- Renvoie UNIQUEMENT le JSON, sans markdown ni texte
- Si un champ n'est pas trouvé, mets null
- Fusionne les informations de tous les documents
- Préfère les données du passeport car plus récentes
- Pour les dates, utilise TOUJOURS le format YYYY-MM-DD
- Pour les pays, utilise les codes ISO 2 lettres (GA=Gabon, FR=France, etc.)
- Pour gender: "male" ou "female" (pas "M" ou "F")
- Pour le passeport: extrais le numéro (MRZ ou face), les dates, et l'autorité de délivrance
- Pour le titre de séjour: extrais le numéro, le type (résident/temporaire/visa long séjour), les dates, l'autorité émettrice (préfecture, OFII…) et le pays émetteur
- Si un titre de séjour est présent, utilise son adresse pour pré-remplir contactInfo (pays de résidence = issuingCountry du titre)
- Pour nationalityAcquisition: détermine si la nationalité a été acquise par naissance ("Birth"), mariage ("Marriage"), naturalisation ("Naturalization") ou autre ("Other")
- Pour le NIP: c'est le Numéro d'Identification Personnel gabonais, souvent sur les documents d'identité
- Pour le statut matrimonial: extrais depuis l'acte de naissance ou tout document mentionnant la situation familiale
- Pour le conjoint: extrais le nom si mentionné dans les documents (acte de mariage, etc.)
- Pour l'adresse au pays d'origine: si un document mentionne une adresse au Gabon ou pays de nationalité`;

// Result type for extraction
export type RegistrationExtractionResult = {
  success: boolean;
  data: {
    basicInfo: {
      firstName?: string;
      lastName?: string;
      gender?: "male" | "female";
      birthDate?: string;
      birthPlace?: string;
      birthCountry?: string;
      nationality?: string;
      nip?: string;
      nationalityAcquisition?: string;
    };
    passportInfo: {
      number?: string;
      issueDate?: string;
      expiryDate?: string;
      issuingAuthority?: string;
    };
    residencePermitInfo: {
      number?: string;
      permitType?: string;
      issueDate?: string;
      expiryDate?: string;
      issuingAuthority?: string;
      issuingCountry?: string;
    };
    familyInfo: {
      maritalStatus?: string;
      fatherFirstName?: string;
      fatherLastName?: string;
      motherFirstName?: string;
      motherLastName?: string;
      spouseFirstName?: string;
      spouseLastName?: string;
    };
    contactInfo: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      homelandStreet?: string;
      homelandCity?: string;
      homelandPostalCode?: string;
      homelandCountry?: string;
    };
  };
  confidence: number;
  extractedFrom: string[];
  warnings: string[];
  error?: string;
};

/**
 * Extract registration data from multiple documents
 */
export const extractRegistrationData = action({
  args: {
    documentIds: v.array(v.id("documents")),
  },
  handler: async (
    ctx,
    { documentIds },
  ): Promise<RegistrationExtractionResult> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: "NOT_AUTHENTICATED",
      };
    }

    // Rate limiting
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
      key: identity.subject,
    });
    if (!ok) {
      const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: `RATE_LIMITED:Veuillez attendre ${waitSeconds} secondes.`,
      };
    }

    if (documentIds.length === 0) {
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: "NO_DOCUMENTS",
      };
    }

    try {
      // Fetch all documents and their files
      const documents = await Promise.all(
        documentIds.map(async (docId) => {
          const doc = await ctx.runQuery(api.functions.documents.getById, {
            documentId: docId,
          });
          return doc;
        }),
      );

      // Collect all image data from documents
      const imageContents: Array<{
        inlineData: { mimeType: string; data: string };
      }> = [];
      const documentTypes: string[] = [];

      for (const doc of documents) {
        if (!doc || !doc.files || doc.files.length === 0) continue;

        // Get first file from each document
        const file = doc.files[0];
        if (!file.storageId) continue;

        // Check if it's an image type
        const isImage = file.mimeType?.startsWith("image/");
        if (!isImage) continue;

        // Get file from storage
        const blob = await ctx.storage.get(file.storageId as Id<"_storage">);
        if (!blob) continue;

        // Convert to base64 using Web-standard API (no Node.js Buffer)
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        imageContents.push({
          inlineData: {
            mimeType: file.mimeType || "image/jpeg",
            data: base64,
          },
        });

        if (doc.documentType) {
          documentTypes.push(doc.documentType);
        }
      }

      if (imageContents.length === 0) {
        return {
          success: false,
          data: {
            basicInfo: {},
            passportInfo: {},
            residencePermitInfo: {},
            familyInfo: {},
            contactInfo: {},
          },
          confidence: 0,
          extractedFrom: [],
          warnings: [
            "Aucun document image trouvé. Seuls les fichiers PDF ne sont pas encore supportés pour l'analyse.",
          ],
          error: "NO_IMAGES",
        };
      }

      // Initialize Gemini
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Build content with all images + prompt
      const contents = [...imageContents, { text: EXTRACTION_PROMPT }];

      // Call Gemini with vision
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      // Parse response
      const responseText = response.text || "";

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
          data: {
            basicInfo: {},
            passportInfo: {},
            residencePermitInfo: {},
            familyInfo: {},
            contactInfo: {},
          },
          confidence: 0,
          extractedFrom: documentTypes,
          warnings: [
            "Impossible d'analyser les documents. Assurez-vous que les images sont claires et lisibles.",
          ],
          error: "PARSE_ERROR",
        };
      }

      // Extract and validate data
      const basicInfo = (parsed.basicInfo as Record<string, unknown>) || {};
      const passportInfoData =
        (parsed.passportInfo as Record<string, unknown>) || {};
      const residencePermitInfoData =
        (parsed.residencePermitInfo as Record<string, unknown>) || {};
      const familyInfo = (parsed.familyInfo as Record<string, unknown>) || {};
      const contactInfo = (parsed.contactInfo as Record<string, unknown>) || {};

      return {
        success: true,
        data: {
          basicInfo: {
            firstName: basicInfo.firstName as string | undefined,
            lastName: basicInfo.lastName as string | undefined,
            gender: basicInfo.gender as "male" | "female" | undefined,
            birthDate: basicInfo.birthDate as string | undefined,
            birthPlace: basicInfo.birthPlace as string | undefined,
            birthCountry: basicInfo.birthCountry as string | undefined,
            nationality: basicInfo.nationality as string | undefined,
            nip: basicInfo.nip as string | undefined,
            nationalityAcquisition: basicInfo.nationalityAcquisition as
              | string
              | undefined,
          },
          passportInfo: {
            number: passportInfoData.number as string | undefined,
            issueDate: passportInfoData.issueDate as string | undefined,
            expiryDate: passportInfoData.expiryDate as string | undefined,
            issuingAuthority: passportInfoData.issuingAuthority as
              | string
              | undefined,
          },
          residencePermitInfo: {
            number: residencePermitInfoData.number as string | undefined,
            permitType: residencePermitInfoData.permitType as
              | string
              | undefined,
            issueDate: residencePermitInfoData.issueDate as string | undefined,
            expiryDate: residencePermitInfoData.expiryDate as
              | string
              | undefined,
            issuingAuthority: residencePermitInfoData.issuingAuthority as
              | string
              | undefined,
            issuingCountry: residencePermitInfoData.issuingCountry as
              | string
              | undefined,
          },
          familyInfo: {
            maritalStatus: familyInfo.maritalStatus as string | undefined,
            fatherFirstName: familyInfo.fatherFirstName as string | undefined,
            fatherLastName: familyInfo.fatherLastName as string | undefined,
            motherFirstName: familyInfo.motherFirstName as string | undefined,
            motherLastName: familyInfo.motherLastName as string | undefined,
            spouseFirstName: familyInfo.spouseFirstName as string | undefined,
            spouseLastName: familyInfo.spouseLastName as string | undefined,
          },
          contactInfo: {
            street: contactInfo.street as string | undefined,
            city: contactInfo.city as string | undefined,
            postalCode: contactInfo.postalCode as string | undefined,
            country: contactInfo.country as string | undefined,
            homelandStreet: contactInfo.homelandStreet as string | undefined,
            homelandCity: contactInfo.homelandCity as string | undefined,
            homelandPostalCode: contactInfo.homelandPostalCode as
              | string
              | undefined,
            homelandCountry: contactInfo.homelandCountry as string | undefined,
          },
        },
        confidence: (parsed.confidence as number) || 0,
        extractedFrom: (parsed.extractedFrom as string[]) || documentTypes,
        warnings: (parsed.warnings as string[]) || [],
      };
    } catch (err) {
      console.error("Registration data extraction error:", err);
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: (err as Error).message,
      };
    }
  },
});

/**
 * Extract registration data from raw base64 images (no Convex documents needed).
 * Used during registration with deferred upload — files are stored locally in IndexedDB
 * and converted to base64 on the client before being sent here.
 */
export const extractRegistrationDataFromImages = action({
  args: {
    images: v.array(
      v.object({
        base64: v.string(),
        mimeType: v.string(),
      }),
    ),
  },
  handler: async (ctx, { images }): Promise<RegistrationExtractionResult> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: "NOT_AUTHENTICATED",
      };
    }

    // Rate limiting
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "aiChat", {
      key: identity.subject,
    });
    if (!ok) {
      const waitSeconds = Math.ceil((retryAfter ?? 0) / 1000);
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: `RATE_LIMITED:Veuillez attendre ${waitSeconds} secondes.`,
      };
    }

    if (images.length === 0) {
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: "NO_IMAGES",
      };
    }

    try {
      // Build image contents directly from base64 args
      const imageContents = images
        .filter((img) => img.mimeType.startsWith("image/"))
        .map((img) => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        }));

      if (imageContents.length === 0) {
        return {
          success: false,
          data: {
            basicInfo: {},
            passportInfo: {},
            residencePermitInfo: {},
            familyInfo: {},
            contactInfo: {},
          },
          confidence: 0,
          extractedFrom: [],
          warnings: [
            "Aucun document image trouvé. Seuls les fichiers PDF ne sont pas encore supportés pour l'analyse.",
          ],
          error: "NO_IMAGES",
        };
      }

      // Initialize Gemini
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Build content with all images + prompt
      const contents = [...imageContents, { text: EXTRACTION_PROMPT }];

      // Call Gemini with vision
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      // Parse response
      const responseText = response.text || "";

      let parsed: Record<string, unknown>;
      try {
        const jsonText = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsed = JSON.parse(jsonText);
      } catch {
        console.error("Failed to parse Gemini response:", responseText);
        return {
          success: false,
          data: {
            basicInfo: {},
            passportInfo: {},
            residencePermitInfo: {},
            familyInfo: {},
            contactInfo: {},
          },
          confidence: 0,
          extractedFrom: [],
          warnings: [
            "Impossible d'analyser les documents. Assurez-vous que les images sont claires et lisibles.",
          ],
          error: "PARSE_ERROR",
        };
      }

      // Extract and validate data
      const basicInfo = (parsed.basicInfo as Record<string, unknown>) || {};
      const passportInfoData =
        (parsed.passportInfo as Record<string, unknown>) || {};
      const residencePermitInfoData =
        (parsed.residencePermitInfo as Record<string, unknown>) || {};
      const familyInfo = (parsed.familyInfo as Record<string, unknown>) || {};
      const contactInfo = (parsed.contactInfo as Record<string, unknown>) || {};

      return {
        success: true,
        data: {
          basicInfo: {
            firstName: basicInfo.firstName as string | undefined,
            lastName: basicInfo.lastName as string | undefined,
            gender: basicInfo.gender as "male" | "female" | undefined,
            birthDate: basicInfo.birthDate as string | undefined,
            birthPlace: basicInfo.birthPlace as string | undefined,
            birthCountry: basicInfo.birthCountry as string | undefined,
            nationality: basicInfo.nationality as string | undefined,
            nip: basicInfo.nip as string | undefined,
            nationalityAcquisition: basicInfo.nationalityAcquisition as
              | string
              | undefined,
          },
          passportInfo: {
            number: passportInfoData.number as string | undefined,
            issueDate: passportInfoData.issueDate as string | undefined,
            expiryDate: passportInfoData.expiryDate as string | undefined,
            issuingAuthority: passportInfoData.issuingAuthority as
              | string
              | undefined,
          },
          residencePermitInfo: {
            number: residencePermitInfoData.number as string | undefined,
            permitType: residencePermitInfoData.permitType as
              | string
              | undefined,
            issueDate: residencePermitInfoData.issueDate as string | undefined,
            expiryDate: residencePermitInfoData.expiryDate as
              | string
              | undefined,
            issuingAuthority: residencePermitInfoData.issuingAuthority as
              | string
              | undefined,
            issuingCountry: residencePermitInfoData.issuingCountry as
              | string
              | undefined,
          },
          familyInfo: {
            maritalStatus: familyInfo.maritalStatus as string | undefined,
            fatherFirstName: familyInfo.fatherFirstName as string | undefined,
            fatherLastName: familyInfo.fatherLastName as string | undefined,
            motherFirstName: familyInfo.motherFirstName as string | undefined,
            motherLastName: familyInfo.motherLastName as string | undefined,
            spouseFirstName: familyInfo.spouseFirstName as string | undefined,
            spouseLastName: familyInfo.spouseLastName as string | undefined,
          },
          contactInfo: {
            street: contactInfo.street as string | undefined,
            city: contactInfo.city as string | undefined,
            postalCode: contactInfo.postalCode as string | undefined,
            country: contactInfo.country as string | undefined,
            homelandStreet: contactInfo.homelandStreet as string | undefined,
            homelandCity: contactInfo.homelandCity as string | undefined,
            homelandPostalCode: contactInfo.homelandPostalCode as
              | string
              | undefined,
            homelandCountry: contactInfo.homelandCountry as string | undefined,
          },
        },
        confidence: (parsed.confidence as number) || 0,
        extractedFrom: (parsed.extractedFrom as string[]) || [],
        warnings: (parsed.warnings as string[]) || [],
      };
    } catch (err) {
      console.error("Registration data extraction error:", err);
      return {
        success: false,
        data: {
          basicInfo: {},
          passportInfo: {},
          residencePermitInfo: {},
          familyInfo: {},
          contactInfo: {},
        },
        confidence: 0,
        extractedFrom: [],
        warnings: [],
        error: (err as Error).message,
      };
    }
  },
});
