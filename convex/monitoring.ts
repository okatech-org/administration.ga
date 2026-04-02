import { internalMutation } from "./_generated/server";
import { backofficeQuery } from "./lib/customFunctions";
import { internal } from "./_generated/api";
import { SIGNAL_TYPES } from "./lib/types";

// ============================================================================
// MONITORING — Santé du système nerveux NEOCORTEX
// ============================================================================

/**
 * Vérifier la santé du système.
 * Appelé toutes les 5 minutes par le cron circadien.
 * Émet une alerte si la queue de signaux déborde.
 */
export const verifierSanteSysteme = internalMutation({
  args: {},
  handler: async (ctx) => {
    const untreated = await ctx.db
      .query("signaux")
      .withIndex("by_non_traite", (q) => q.eq("traite", false))
      .collect();

    const queueCount = untreated.length;

    // Enregistrer la métrique de santé
    await ctx.db.insert("metriques", {
      nom: "queue_depth",
      valeur: queueCount,
      unite: "signals",
      periode: "5m",
      dimensions: { cortex: "limbique" },
      timestamp: Date.now(),
    });

    // Alerte si la queue est trop profonde
    if (queueCount > 100) {
      await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
        type: SIGNAL_TYPES.ALERTE_SYSTEME,
        source: "MONITORING",
        payload: {
          message: `Queue de signaux élevée: ${queueCount} non traités`,
          queueCount,
          seuil: 100,
        },
        confiance: 1,
        priorite: "CRITICAL" as const,
        correlationId: crypto.randomUUID(),
      });
    }

    return { queueCount, status: queueCount > 50 ? "DEGRADED" : "HEALTHY" };
  },
});

/**
 * Dashboard data pour le widget frontend.
 * Agrège toutes les métriques NEOCORTEX en un seul appel.
 */
export const getDashboardData = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    // Signaux en attente (limbique)
    const signauxEnAttente = await ctx.db
      .query("signaux")
      .withIndex("by_non_traite", (q) => q.eq("traite", false))
      .order("desc")
      .take(100);

    // Actions récentes (hippocampe)
    const actionsRecentes = await ctx.db
      .query("historiqueActions")
      .withIndex("by_timestamp")
      .order("desc")
      .take(20);

    // Métriques système
    const metriques = await ctx.db
      .query("metriques")
      .withIndex("by_nom")
      .order("desc")
      .take(20);

    // Poids adaptatifs (plasticité)
    const poidsAdaptatifs = await ctx.db.query("poidsAdaptatifs").take(50);

    // Stats par type de signal (top 5 des dernières 24h)
    const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;
    const recentSignals = await ctx.db
      .query("signaux")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneDayAgo))
      .collect();

    const signalCounts: Record<string, number> = {};
    for (const sig of recentSignals) {
      signalCounts[sig.type] = (signalCounts[sig.type] ?? 0) + 1;
    }
    const topSignalTypes = Object.entries(signalCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Stats par catégorie d'action (hippocampe)
    const recentActions = await ctx.db
      .query("historiqueActions")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneDayAgo))
      .collect();

    const actionCounts: Record<string, number> = {};
    for (const act of recentActions) {
      actionCounts[act.categorie] = (actionCounts[act.categorie] ?? 0) + 1;
    }

    const queueCount = signauxEnAttente.length;

    return {
      signauxEnAttente,
      actionsRecentes,
      metriques,
      poidsAdaptatifs,
      topSignalTypes,
      actionCounts,
      totalSignaux24h: recentSignals.length,
      totalActions24h: recentActions.length,
      sante: {
        status: queueCount > 50 ? "DEGRADED" : "HEALTHY",
        queueCount,
      },
    };
  },
});
