/**
 * Centre de Commandement — Synthèse IA
 *
 * Action one-shot qui prend la photo `getStats` et demande à Gemini un
 * résumé exécutif en Markdown. Pas de persistance — le résultat est
 * affiché dans un drawer côté front et oublié à la fermeture.
 */

"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

const getGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");
  return new GoogleGenerativeAI(apiKey);
};

const generateText = async (prompt: string): Promise<string> => {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Construit un payload texte compact à partir de l'objet `stats` retourné
 * par `getStats`. On ne donne au modèle que les chiffres clefs — pas les
 * tableaux complets — pour rester sous le contexte et éviter le bruit.
 */
function statsToPromptContext(stats: any): string {
  const sb: Record<string, number> = stats?.requests?.statusBreakdown ?? {};
  const pipeline = stats?.performance?.pipeline ?? {};
  const byCountry: Record<string, { count: number }> =
    stats?.deployment?.byCountry ?? {};
  const topCountries = Object.entries(byCountry)
    .map(([code, info]) => `${code}: ${info.count}`)
    .sort((a, b) => Number(b.split(": ")[1]) - Number(a.split(": ")[1]))
    .slice(0, 5)
    .join(", ");
  const criticalAlerts: any[] = stats?.security?.criticalAlerts ?? [];
  const securityEvents: any[] = stats?.security?.securityEvents ?? [];

  return [
    `# RÉSEAU`,
    `- Ressortissants enregistrés : ${stats?.users?.total ?? 0}`,
    `- Représentations actives : ${stats?.deployment?.activeOrgs ?? 0} / ${stats?.deployment?.totalOrgs ?? 0} (taux d'activation : ${stats?.deployment?.activationRate ?? 0} %)`,
    `- Pays couverts : ${stats?.deployment?.countriesCovered ?? 0}`,
    `- Effectifs déclarés : ${stats?.deployment?.totalStaff ?? 0}`,
    `- Top pays par nombre de postes : ${topCountries || "—"}`,
    ``,
    `# DEMANDES`,
    `- Total : ${stats?.requests?.total ?? 0}`,
    `- Taux de résolution : ${stats?.performance?.completionRate ?? 0} %`,
    `- En attente urgent : ${stats?.performance?.urgentPending ?? 0}`,
    `- Répartition pipeline : draft=${pipeline.draft ?? 0}, submitted=${pipeline.submitted ?? 0}, pending=${pipeline.pending ?? 0}, under_review=${pipeline.underReview ?? 0}, in_production=${pipeline.inProduction ?? 0}, validated=${pipeline.validated ?? 0}, ready_for_pickup=${pipeline.readyForPickup ?? 0}, completed=${pipeline.completed ?? 0}, rejected=${pipeline.rejected ?? 0}`,
    `- Statuts détaillés : ${Object.entries(sb).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`,
    ``,
    `# INSCRIPTIONS CONSULAIRES`,
    `- Total : ${stats?.registrations?.total ?? 0}`,
    `- Par statut : ${Object.entries(stats?.engagement?.registrationsByStatus ?? {}).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`,
    ``,
    `# DIASPORA & ÉCONOMIE`,
    `- Associations recensées : ${stats?.associations?.total ?? 0}`,
    `- Entreprises enregistrées : ${stats?.companies?.total ?? 0}`,
    ``,
    `# ENGAGEMENT`,
    `- Nouveaux comptes (7 j) : ${stats?.engagement?.newUsers7d ?? 0}`,
    `- Nouveaux comptes (30 j) : ${stats?.engagement?.newUsers30d ?? 0}`,
    ``,
    `# SÉCURITÉ`,
    `- État système : ${stats?.security?.systemHealth ?? "HEALTHY"}`,
    `- Signaux non traités (queue) : ${stats?.security?.queueDepth ?? 0}`,
    `- Alertes critiques (24 h) : ${criticalAlerts.length}`,
    `- Événements sécurité (24 h) : ${securityEvents.length}`,
    criticalAlerts.length
      ? `- Détail alertes : ${criticalAlerts.slice(0, 5).map((a) => `[${a.source}] ${a.message}`).join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Synthèse exécutive du Centre de Commandement.
 *
 * Retourne du Markdown structuré (titres `##`, listes, gras) prêt à être
 * rendu par `<SafeMarkdown>` côté front.
 */
export const generateDashboardSummary = action({
  args: {},
  handler: async (ctx): Promise<{ markdown: string; generatedAt: number }> => {
    const stats = await ctx.runQuery(api.functions.admin.getStats, {});
    const dataDump = statsToPromptContext(stats);

    const prompt = `Tu es l'analyste stratégique du Centre de Commandement du réseau diplomatique gabonais. Rédige une **synthèse exécutive** à destination d'un super-administrateur — quelqu'un qui veut comprendre l'état du réseau en 30 secondes.

DONNÉES BRUTES (instant T) :
${dataDump}

INSTRUCTIONS :
- Sortie en **Markdown** structuré, ~250-400 mots maximum.
- Structure attendue, dans cet ordre :
  1. **## En-tête** — 1 phrase qui résume l'état général (santé, charge, momentum).
  2. **## Points saillants** — 3 à 5 bullet points sur les faits qui méritent l'attention (positifs ET négatifs).
  3. **## Points de vigilance** — 2 à 3 bullets sur les risques / dérives à corriger (hors SLA, alertes, postes vacants, etc.).
  4. **## Recommandations** — 2 à 3 actions concrètes priorisées que l'admin peut lancer aujourd'hui.
- Style : sobre, factuel, voix active, pas de jargon marketing. Cite des chiffres précis quand utile.
- Pas de phrases creuses du genre « il est important de noter que… ». Va droit au but.
- N'invente AUCUN chiffre qui ne figure pas dans les données. Si une métrique manque, dis-le.

Réponds directement en Markdown, sans préambule.`;

    const markdown = await generateText(prompt);
    return { markdown, generatedAt: Date.now() };
  },
});
