/**
 * embeddingService — Wrapper autour de l'API d'embeddings OpenAI.
 *
 * Utilise `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens).
 * Conçu pour être appelé depuis des actions Convex (indexer, retriever).
 *
 * Robustesse :
 *   - Retry exponentiel 3 fois sur 429/5xx.
 *   - Truncation client-side à 8K tokens (estimation 4 chars/token).
 *   - Batching jusqu'à 100 textes par appel.
 *
 * Renvoie `null` si la clé OpenAI n'est pas configurée — l'indexer doit
 * traiter ce cas comme une no-op silencieuse (RAG indisponible).
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
const MAX_CHARS_PER_TEXT = 32_000; // ≈ 8K tokens
const MAX_BATCH = 100;

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding: number[] }>;
  error?: { message?: string };
}

function truncate(text: string): string {
  if (text.length <= MAX_CHARS_PER_TEXT) return text;
  return text.slice(0, MAX_CHARS_PER_TEXT);
}

async function callOpenAIEmbeddings(
  apiKey: string,
  texts: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  let attempt = 0;
  const maxAttempts = 3;
  let lastError: Error | null = null;

  while (attempt < maxAttempts) {
    try {
      const res = await fetch(OPENAI_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          input: texts.map(truncate),
          dimensions: DEFAULT_DIMENSIONS,
        }),
        signal,
      });

      if (res.status === 429 || res.status >= 500) {
        // Retryable
        const backoffMs = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
        attempt += 1;
        continue;
      }

      const body = (await res.json()) as OpenAIEmbeddingResponse;
      if (!res.ok || !body.data) {
        const message = body.error?.message ?? `HTTP ${res.status}`;
        throw new Error(`OpenAI embeddings failed : ${message}`);
      }
      return body.data.map((d) => d.embedding);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Unknown error");
      attempt += 1;
      if (attempt >= maxAttempts) break;
      const backoffMs = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError ?? new Error("OpenAI embeddings : échec après retries");
}

export const embedTexts = internalAction({
  args: {
    texts: v.array(v.string()),
  },
  handler: async (_ctx, { texts }): Promise<number[][] | null> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    if (texts.length === 0) return [];

    // Batch par MAX_BATCH pour éviter de dépasser les limites OpenAI.
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      batches.push(texts.slice(i, i + MAX_BATCH));
    }

    const all: number[][] = [];
    for (const batch of batches) {
      const out = await callOpenAIEmbeddings(apiKey, batch);
      all.push(...out);
    }
    return all;
  },
});
