/**
 * Adaptateurs OCR pour les courriers entrants scannés.
 *
 * Architecture identique à celle de la signature qualifiée : interface
 * commune + mock par défaut + adapter par provider à brancher.
 *
 * Configuration via env vars Convex :
 *   OCR_PROVIDER : "mock" | "tesseract" | "textract" | "google-document-ai"
 *   OCR_API_KEY  : clé API du provider (si applicable)
 *   OCR_REGION   : région AWS (Textract) ou GCP (Document AI), si applicable
 *
 * Les implémentations Tesseract local / AWS Textract / Google Document AI
 * sont à brancher dans `getOcrProvider`. Le mock par défaut renvoie un
 * texte vide, ce qui rend l'OCR idempotent en dev (pas de side-effect).
 */

export interface OcrRequest {
  /** Bytes du PDF ou de l'image à océriser. */
  bytes: ArrayBuffer;
  /** MIME type — l'adapter peut router selon le format. */
  mimeType: string;
  /** Nom de fichier d'origine (pour debug / logs côté provider). */
  filename: string;
  /** Langues attendues (ISO 639-1) — utilisé par Tesseract et Textract. */
  languages?: string[];
}

export interface OcrResult {
  /** Texte extrait, déjà concaténé page par page avec sauts de ligne. */
  text: string;
  /** Score de confiance global 0–1 si le provider l'expose. */
  confidence?: number;
  /** Nombre de pages traitées. */
  pageCount?: number;
  /** Provider qui a produit le résultat (pour traçabilité). */
  provider: string;
}

export interface OcrProvider {
  readonly id: string;
  extractText(req: OcrRequest): Promise<OcrResult | { error: string }>;
}

// ── Mock provider (par défaut en dev) ─────────────────────────────────────

class MockOcrProvider implements OcrProvider {
  readonly id = "mock";
  async extractText(req: OcrRequest): Promise<OcrResult> {
    return {
      text: "",
      confidence: 0,
      pageCount: 0,
      provider: this.id,
    };
  }
}

// ── Sélection à partir de l'env Convex ────────────────────────────────────

export function getOcrProvider(): OcrProvider {
  const providerId = process.env.OCR_PROVIDER ?? "mock";
  switch (providerId) {
    case "mock":
      return new MockOcrProvider();
    // Brancher ici les implémentations réelles :
    //   case "tesseract":
    //     return new TesseractOcrProvider({ languages: ["fra", "eng"] });
    //   case "textract":
    //     return new TextractOcrProvider({
    //       region: process.env.OCR_REGION!,
    //       apiKey: process.env.OCR_API_KEY!,
    //     });
    //   case "google-document-ai":
    //     return new GoogleDocumentAiProvider({
    //       projectId: process.env.GCP_PROJECT_ID!,
    //       processorId: process.env.OCR_PROCESSOR_ID!,
    //     });
    default:
      console.warn(
        `[ocr] Provider inconnu "${providerId}", fallback sur mock.`,
      );
      return new MockOcrProvider();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

const OCR_SUPPORTED_MIMES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
]);

export function isOcrSupportedMime(mime: string | undefined): boolean {
  if (!mime) return false;
  return OCR_SUPPORTED_MIMES.has(mime.toLowerCase());
}
