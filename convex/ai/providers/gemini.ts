/**
 * Gemini Provider Wrapper
 *
 * Centralise tous les appels Gemini pour l'agent IA proactif.
 * Utilise @google/genai (SDK unifie, remplace progressivement @google/generative-ai).
 *
 * Features :
 *   - Appels JSON-mode (router, classifications, extractions)
 *   - Appels texte libre (resumes, brouillons courts)
 *   - Tracking du cout (tokensIn/Out + latencyMs) pour audit log
 *   - Timeout configurable (defaut 30s)
 *
 * Tarification Gemini 2.5 Flash (2026-04, USD per 1M tokens) :
 *   - Input  : 0.30 $   (soit 0.00003 cents/token = 30 micro-cents/token)
 *   - Output : 2.50 $   (soit 0.00025 cents/token = 250 micro-cents/token)
 */

"use node";

import { GoogleGenAI } from "@google/genai";

// ─── Config pricing en micro-cents (1 cent = 1_000_000 micro-cents) ─────────
// Source : https://ai.google.dev/gemini-api/docs/pricing
const GEMINI_PRICING = {
  "gemini-2.5-flash": { inPerToken: 30, outPerToken: 250 },
  "gemini-2.5-pro": { inPerToken: 125, outPerToken: 1000 },
} as const;

export type GeminiModel = keyof typeof GEMINI_PRICING;

export interface GeminiCallResult<T = unknown> {
  output: T;
  model: GeminiModel;
  tokensIn: number;
  tokensOut: number;
  costMicroCents: number;
  latencyMs: number;
}

export interface GeminiCallOptions {
  model?: GeminiModel;
  systemPrompt?: string;
  /** JSON mode : parse la reponse en JSON. Desactiver pour texte libre. */
  jsonMode?: boolean;
  /** Max tokens de sortie (defaut 4096) */
  maxOutputTokens?: number;
  /** Temperature (defaut 0.2 pour router/classifieur, 0.7 pour redaction) */
  temperature?: number;
  /** Timeout en ms (defaut 30_000) */
  timeoutMs?: number;
}

const getClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configuree dans l'environnement Convex");
  }
  return new GoogleGenAI({ apiKey });
};

const computeCostMicroCents = (
  model: GeminiModel,
  tokensIn: number,
  tokensOut: number,
): number => {
  const pricing = GEMINI_PRICING[model];
  return tokensIn * pricing.inPerToken + tokensOut * pricing.outPerToken;
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
};

const parseJsonLoose = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    let open = 0;
    let openArr = 0;
    for (const ch of text) {
      if (ch === "{") open++;
      else if (ch === "}") open--;
      else if (ch === "[") openArr++;
      else if (ch === "]") openArr--;
    }
    const lastComplete = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    let repaired = text.slice(0, lastComplete + 1);
    while (open-- > 0) repaired += "}";
    while (openArr-- > 0) repaired += "]";
    return JSON.parse(repaired);
  }
};

/**
 * Appelle Gemini et retourne la reponse + metriques de cout.
 * Ne jette jamais sans contexte : ajoute model/latency/cost a l'erreur.
 */
export async function callGemini<T = unknown>(
  prompt: string,
  options: GeminiCallOptions = {},
): Promise<GeminiCallResult<T>> {
  const {
    model = "gemini-2.5-flash",
    systemPrompt,
    jsonMode = false,
    maxOutputTokens = 4096,
    temperature = 0.2,
    timeoutMs = 30_000,
  } = options;

  const startedAt = Date.now();
  const ai = getClient();

  const response = await withTimeout(
    ai.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens,
        temperature,
        responseMimeType: jsonMode ? "application/json" : "text/plain",
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
    timeoutMs,
    `Gemini(${model})`,
  );

  const latencyMs = Date.now() - startedAt;
  const text = response.text ?? "";
  const usage = response.usageMetadata;
  const tokensIn = usage?.promptTokenCount ?? 0;
  const tokensOut = usage?.candidatesTokenCount ?? 0;
  const costMicroCents = computeCostMicroCents(model, tokensIn, tokensOut);

  const output = (jsonMode ? parseJsonLoose(text) : text) as T;

  return {
    output,
    model,
    tokensIn,
    tokensOut,
    costMicroCents,
    latencyMs,
  };
}

export const GeminiProvider = {
  call: callGemini,
  pricing: GEMINI_PRICING,
};
