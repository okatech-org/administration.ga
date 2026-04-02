import { internalMutation } from "./_generated/server";
import { backofficeQuery } from "./lib/customFunctions";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { CORTEX, ROUTING_TABLE } from "./lib/types";
import { NotificationType } from "./lib/constants";

// ============================================================================
// SYSTÈME LIMBIQUE — Bus de signaux pondérés (CŒUR du NEOCORTEX)
// ============================================================================

/**
 * Émettre un signal dans le système nerveux.
 * Chaque signal est persisté puis immédiatement routé.
 */
export const emettreSignal = internalMutation({
  args: {
    type: v.string(),
    source: v.string(),
    destination: v.optional(v.string()),
    entiteType: v.optional(v.string()),
    entiteId: v.optional(v.string()),
    payload: v.any(),
    confiance: v.number(),
    priorite: v.union(
      v.literal("LOW"),
      v.literal("NORMAL"),
      v.literal("HIGH"),
      v.literal("CRITICAL"),
    ),
    correlationId: v.string(),
    parentSignalId: v.optional(v.id("signaux")),
    ttl: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const signalId = await ctx.db.insert("signaux", {
      ...args,
      traite: false,
      timestamp: Date.now(),
    });

    // Routage immédiat
    await ctx.scheduler.runAfter(0, internal.limbique.routerSignal, {
      signalId,
    });

    return signalId;
  },
});

/**
 * Router un signal vers le(s) cortex destination.
 * Utilise la table de routage (ROUTING_TABLE) ou le champ destination explicite.
 */
export const routerSignal = internalMutation({
  args: {
    signalId: v.id("signaux"),
  },
  handler: async (ctx, args) => {
    const signal = await ctx.db.get(args.signalId);
    if (!signal || signal.traite) return;

    // Déterminer les destinations
    let destinations: string[] = [];

    if (signal.destination) {
      // Destination explicite fournie par l'émetteur
      destinations = [signal.destination];
    } else {
      // Lookup dans la table de routage par type de signal
      destinations = ROUTING_TABLE[signal.type] ?? [];
    }

    // Dispatcher vers chaque cortex destination
    for (const dest of destinations) {
      switch (dest) {
        case CORTEX.AUDITIF:
          // Déclencher une notification si pertinent
          await ctx.scheduler.runAfter(
            0,
            internal.limbique.notifierViaAuditif,
            {
              signalType: signal.type,
              entiteType: signal.entiteType ?? "",
              entiteId: signal.entiteId ?? "",
              payload: signal.payload,
              priorite: signal.priorite,
            },
          );
          break;

        case CORTEX.HIPPOCAMPE:
          // Enregistrer dans les métriques pour analyse
          await ctx.scheduler.runAfter(
            0,
            internal.hippocampe.loguerAction,
            {
              action: `SIGNAL_${signal.type}`,
              categorie: "SYSTEME",
              entiteType: signal.entiteType ?? "signaux",
              entiteId: signal.entiteId ?? args.signalId,
              details: { avant: null, apres: signal.payload },
            },
          );
          break;

        case CORTEX.PLASTICITE:
          // Ajuster les poids si c'est un signal de feedback
          if (signal.type === "CONFIG_UPDATE") {
            await ctx.scheduler.runAfter(
              0,
              internal.plasticite.ajusterPoids,
              {
                signal: signal.type,
                regle: "config_change",
                reussite: true,
              },
            );
          }
          break;

        case CORTEX.VISUEL:
          // Le cortex visuel traite les médias (logging seulement pour l'instant)
          break;

        case CORTEX.MOTEUR:
          // Exécuter une action externe
          await ctx.scheduler.runAfter(
            0,
            internal.moteur.executerActionExterne,
            {
              actionType: signal.type,
              payload: signal.payload,
            },
          );
          break;

        case CORTEX.PREFRONTAL:
          // Signaux complexes nécessitant une décision
          break;
      }
    }

    // Alertes automatiques pour signaux CRITICAL
    if (signal.priorite === "CRITICAL" && !destinations.includes(CORTEX.AUDITIF)) {
      await ctx.scheduler.runAfter(
        0,
        internal.limbique.notifierViaAuditif,
        {
          signalType: signal.type,
          entiteType: signal.entiteType ?? "",
          entiteId: signal.entiteId ?? "",
          payload: signal.payload,
          priorite: "CRITICAL",
        },
      );
    }

    // Marquer comme traité
    await ctx.db.patch(args.signalId, { traite: true });
  },
});

/**
 * Helper interne : créer une notification in-app via le système existant.
 * Connecte le NEOCORTEX au système de notifications natif.
 */
export const notifierViaAuditif = internalMutation({
  args: {
    signalType: v.string(),
    entiteType: v.string(),
    entiteId: v.string(),
    payload: v.any(),
    priorite: v.string(),
  },
  handler: async (ctx, args) => {
    // Pour les signaux CRITICAL, notifier tous les superadmins
    if (args.priorite === "CRITICAL") {
      const superadmins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("isSuperadmin"), true))
        .collect();

      for (const admin of superadmins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          title: `[ALERTE] ${args.signalType}`,
          body: `Signal critique sur ${args.entiteType} (${args.entiteId})`,
          type: NotificationType.ImportantCommunication,
          isRead: false,
          link: args.entiteType === "requests" ? `/admin/requests/${args.entiteId}` : undefined,
          relatedId: args.entiteId,
          relatedType: args.entiteType,
          createdAt: Date.now(),
        });
      }
    }
  },
});

/**
 * Nettoyage des signaux traités au-delà de leur TTL.
 * Appelé quotidiennement par le cron circadien.
 */
export const nettoyerSignaux = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oldSignals = await ctx.db
      .query("signaux")
      .withIndex("by_non_traite", (q) => q.eq("traite", true))
      .collect();

    let deleted = 0;
    for (const sig of oldSignals) {
      const ttl = sig.ttl ?? 1000 * 60 * 60 * 24 * 7; // Default 7 jours
      if (now - sig.timestamp > ttl) {
        await ctx.db.delete(sig._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

/**
 * Lister les signaux non traités (monitoring temps réel).
 */
export const listerSignauxNonTraites = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("signaux")
      .withIndex("by_non_traite", (q) => q.eq("traite", false))
      .order("desc")
      .take(50);
  },
});
