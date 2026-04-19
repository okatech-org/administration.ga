/**
 * Anthropic (Claude) Provider Wrapper
 *
 * Utilise pour les taches de redaction diplomatique,
 * verification de conformite, detection de risques,
 * et toute capability qui beneficie d'un raisonnement
 * plus nuance que Gemini Flash.
 *
 * Features :
 *   - Support JSON-mode via parse stricte post-appel
 *   - Prompt caching (cacheControl: "ephemeral") pour reduire les couts
 *   - Tracking tokens + cout + latency
 *   - Timeout configurable
 *
 * Tarification Claude Sonnet 4.6 (2026-04, USD per 1M tokens) :
 *   - Input         : 3.00 $   (300 micro-cents/token)
 *   - Output        : 15.00 $  (1500 micro-cents/token)
 *   - Cache write   : 3.75 $   (375 micro-cents/token)
 *   - Cache read    : 0.30 $   (30 micro-cents/token)
 */

"use node";

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_PRICING = {
  "claude-sonnet-4-6": {
    inPerToken: 300,
    outPerToken: 1500,
    cacheWritePerToken: 375,
    cacheReadPerToken: 30,
  },
  "claude-haiku-4-5": {
    inPerToken: 100,
    outPerToken: 500,
    cacheWritePerToken: 125,
    cacheReadPerToken: 10,
  },
} as const;

export type AnthropicModel = keyof typeof ANTHROPIC_PRICING;

export interface AnthropicCallResult<T = unknown> {
  output: T;
  model: AnthropicModel;
  tokensIn: number;
  tokensOut: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costMicroCents: number;
  latencyMs: number;
}

export interface AnthropicCallOptions {
  model?: AnthropicModel;
  systemPrompt?: string;
  /** Si true : impose une reponse JSON et parse en sortie */
  jsonMode?: boolean;
  /** Taille max reponse (defaut 4096) */
  maxTokens?: number;
  /** Temperature (defaut 0.3 pour redaction diplomatique) */
  temperature?: number;
  /** Timeout en ms (defaut 45_000 — Claude plus lent que Gemini) */
  timeoutMs?: number;
  /** Active le prompt caching sur le systemPrompt */
  cacheSystemPrompt?: boolean;
}

const getClient = (): Anthropic => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configuree dans l'environnement Convex");
  }
  return new Anthropic({ apiKey });
};

const computeCostMicroCents = (
  model: AnthropicModel,
  tokensIn: number,
  tokensOut: number,
  cacheWrite: number,
  cacheRead: number,
): number => {
  const p = ANTHROPIC_PRICING[model];
  return (
    tokensIn * p.inPerToken +
    tokensOut * p.outPerToken +
    cacheWrite * p.cacheWritePerToken +
    cacheRead * p.cacheReadPerToken
  );
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
};

const parseJsonStrict = (text: string): unknown => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body);
};

/**
 * Appelle Claude et retourne la reponse + metriques de cout.
 */
export async function callClaude<T = unknown>(
  prompt: string,
  options: AnthropicCallOptions = {},
): Promise<AnthropicCallResult<T>> {
  const {
    model = "claude-sonnet-4-6",
    systemPrompt,
    jsonMode = false,
    maxTokens = 4096,
    temperature = 0.3,
    timeoutMs = 45_000,
    cacheSystemPrompt = false,
  } = options;

  const startedAt = Date.now();
  const client = getClient();

  const jsonInstruction = jsonMode
    ? "\n\nIMPORTANT: Reponds UNIQUEMENT avec un objet JSON valide, sans texte additionnel, sans markdown fences."
    : "";

  const systemParam = systemPrompt
    ? cacheSystemPrompt
      ? [{ type: "text" as const, text: systemPrompt + jsonInstruction, cache_control: { type: "ephemeral" as const } }]
      : systemPrompt + jsonInstruction
    : jsonInstruction || undefined;

  const response = await withTimeout(
    client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemParam,
      messages: [{ role: "user", content: prompt }],
    }),
    timeoutMs,
    `Claude(${model})`,
  );

  const latencyMs = Date.now() - startedAt;

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const usage = response.usage as Anthropic.Usage & {
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  };
  const tokensIn = usage.input_tokens ?? 0;
  const tokensOut = usage.output_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  const costMicroCents = computeCostMicroCents(
    model,
    tokensIn,
    tokensOut,
    cacheCreationTokens,
    cacheReadTokens,
  );

  const output = (jsonMode ? parseJsonStrict(text) : text) as T;

  return {
    output,
    model,
    tokensIn,
    tokensOut,
    cacheReadTokens,
    cacheCreationTokens,
    costMicroCents,
    latencyMs,
  };
}

export const AnthropicProvider = {
  call: callClaude,
  pricing: ANTHROPIC_PRICING,
};
