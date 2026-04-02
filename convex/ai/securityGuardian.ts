/**
 * SENTINEL — Gardien IA de securite.
 *
 * Analyse horaire des signaux de securite via Gemini 2.5 Flash.
 * Classification automatique des menaces et declenchement
 * des contre-mesures (blocage IP, alertes CRITICAL).
 */

import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

const SYSTEM_PROMPT = `Tu es SENTINEL, expert cybersecurite pour le portail diplomatique et consulaire de la Republique Gabonaise.
Ce systeme gere des donnees souveraines : passeports, visas, actes d'etat civil, identites diplomatiques.

Analyse les signaux de securite et retourne UNIQUEMENT un JSON valide (pas de markdown) :
{
  "classification": "FAUX_POSITIF|RECONNAISSANCE|BRUTE_FORCE|INTRUSION|EXFILTRATION|DDOS|INSIDER_THREAT",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "probability": 0-100,
  "immediateAction": "MONITOR|BLOCK_24H|BLOCK_7D|ALERT_HUMAN",
  "reasoning": "explication courte en francais",
  "countermeasures": ["action1", "action2"],
  "attackerProfile": "bot|script_kiddie|organized|state_sponsored|insider|unknown"
}`;

/** Analyse horaire des signaux de securite recents. */
export const analyzeThreats = internalAction({
  args: {},
  handler: async (ctx) => {
    // 1. Recuperer les signaux de securite des dernieres 2 heures
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const signals = await ctx.runQuery(
      internal.ai.securityGuardian.queryRecentSignals,
      { since: twoHoursAgo },
    );

    if (signals.length === 0) return { status: "no_signals" };

    // 2. Analyser avec Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[SENTINEL] GEMINI_API_KEY manquant — analyse desactivee");
      return { status: "no_api_key" };
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { systemInstruction: SYSTEM_PROMPT },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyse ces ${signals.length} signaux de securite des 2 dernieres heures :\n${JSON.stringify(signals, null, 2)}`,
              },
            ],
          },
        ],
      });

      const candidate = response.candidates?.[0];
      let responseText = "";
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if ("text" in part && part.text) responseText += part.text;
        }
      }

      // Extraire le JSON de la reponse
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[SENTINEL] Pas de JSON dans la reponse Gemini");
        return { status: "parse_error", raw: responseText.slice(0, 200) };
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // 3. Executer les actions recommandees
      if (analysis.immediateAction === "BLOCK_24H" || analysis.immediateAction === "BLOCK_7D") {
        // Bloquer les IPs suspectes identifiees dans les signaux
        const suspectIps = new Set<string>();
        for (const sig of signals) {
          if (sig.payload?.ip) suspectIps.add(sig.payload.ip as string);
          if (sig.entiteId && sig.entiteType === "ip") suspectIps.add(sig.entiteId);
        }
        for (const ip of suspectIps) {
          await ctx.runMutation(internal.functions.autoDefense.recordThreatEvent, {
            ip,
            eventType: `SENTINEL_${analysis.immediateAction}`,
            metadata: { reasoning: analysis.reasoning },
          });
        }
      }

      if (analysis.severity === "CRITICAL" || analysis.immediateAction === "ALERT_HUMAN") {
        await ctx.runMutation(internal.limbique.emettreSignal, {
          type: "SENTINEL_THREAT_ALERT",
          source: "SENTINEL",
          payload: analysis,
          confiance: (analysis.probability ?? 50) / 100,
          priorite: "CRITICAL" as const,
          correlationId: crypto.randomUUID(),
        });
      }

      // 4. Logger l'analyse dans hippocampe
      await ctx.runMutation(internal.hippocampe.loguerAction, {
        action: "SENTINEL_ANALYSIS",
        categorie: "securite",
        entiteType: "system",
        entiteId: "sentinel",
        details: {
          avant: { signalCount: signals.length },
          apres: analysis,
        },
      });

      return { status: "analyzed", analysis };
    } catch (err: unknown) {
      console.error("[SENTINEL] Erreur analyse:", err);
      return { status: "error", message: String(err) };
    }
  },
});

/** Query interne pour les signaux recents (securite). */
export const queryRecentSignals = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, { since }) => {
    const SECURITY_TYPES = [
      "HONEYPOT_TRIGGERED",
      "CANARY_TRIGGERED",
      "PIN_LOCKED",
      "PIN_CRYPTO_FAILURE",
      "IP_AUTO_BLOCKED",
      "ALERTE_SYSTEME",
      "SESSION_UA_MISMATCH",
    ];

    const allRecent = await ctx.db
      .query("signaux")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", since))
      .order("desc")
      .take(100);

    return allRecent.filter((s) => SECURITY_TYPES.includes(s.type));
  },
});
