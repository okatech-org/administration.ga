/**
 * Gemini AI client + lightweight helpers shared across Convex actions.
 *
 * Centralized so that every AI feature (CV import, template generation,
 * future use cases) reuses the same client setup, error handling, and
 * JSON extraction. Keeps `convex/functions/*AI.ts` focused on prompts
 * and result shaping.
 *
 * Provider: Google Gemini 2.5 Flash via `@google/generative-ai`.
 * Required env: GEMINI_API_KEY.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/** Default model used by all helpers. Cheap, multimodal, fast. */
export const GEMINI_MODEL = "gemini-2.5-flash" as const;

/**
 * Lazily instantiate the Gemini client. Throws a clear error if the API key
 * is missing — never caught silently, so misconfiguration surfaces in logs.
 */
export function getGemini(): GoogleGenerativeAI {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
	return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate a text response from a single text prompt. Use this for
 * deterministic single-shot transformations (improve summary, translate,
 * suggest list, etc.).
 */
export async function generate(prompt: string): Promise<string> {
	const genAI = getGemini();
	const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
	const result = await model.generateContent(prompt);
	return result.response.text();
}

/**
 * Extract a JSON object from a Gemini response. Models often wrap JSON in
 * prose or markdown code fences; this regex finds the first `{...}` block
 * spanning lines and parses it.
 *
 * Throws if no JSON object is found or if parsing fails.
 */
export function extractJSON(text: string): unknown {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) throw new Error("No JSON found in AI response");
	return JSON.parse(match[0]);
}

export interface MultimodalGenerateOptions {
	/** Prompt sent to the model. Required. */
	prompt: string;
	/**
	 * Optional file to include as `inlineData`. The action must already have
	 * a public-readable URL (typically obtained from `ctx.storage.getUrl()`).
	 */
	fileUrl?: string;
	/** MIME type of the file (e.g. `application/pdf`, `image/png`). */
	fileMimeType?: string;
	/**
	 * Optional plain-text content to append after the prompt. Useful when
	 * passing serialized data alongside the prompt.
	 */
	text?: string;
}

/**
 * Generate a response that can include a file (PDF, image) and/or extra
 * text content. Falls back to text-only generation when no file is provided.
 *
 * Used by template-from-document AI flows and CV import.
 */
export async function multimodalGenerate(
	opts: MultimodalGenerateOptions,
): Promise<string> {
	const genAI = getGemini();
	const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

	if (opts.fileUrl) {
		const response = await fetch(opts.fileUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch file: ${response.statusText}`);
		}
		const arrayBuffer = await response.arrayBuffer();
		const base64Data = arrayBufferToBase64(arrayBuffer);
		const mimeType = opts.fileMimeType ?? "application/pdf";

		const parts: Array<
			| string
			| { inlineData: { mimeType: string; data: string } }
		> = [opts.prompt];
		if (opts.text) parts.push(opts.text);
		parts.push({ inlineData: { mimeType, data: base64Data } });

		const result = await model.generateContent(parts);
		return result.response.text();
	}

	const fullPrompt = opts.text ? `${opts.prompt}\n\n${opts.text}` : opts.prompt;
	const result = await model.generateContent(fullPrompt);
	return result.response.text();
}

/**
 * Convert an ArrayBuffer to a base64 string without using Buffer (Convex
 * actions run in a non-Node runtime where Buffer may not be available).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}
