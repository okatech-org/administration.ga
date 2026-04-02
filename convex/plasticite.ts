import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { backofficeQuery, superadminMutation } from "./lib/customFunctions";
import { internal } from "./_generated/api";

export const lireConfig = backofficeQuery({
  args: { cle: v.string() },
  handler: async (ctx, args) => {
    const conf = await ctx.db
      .query("configSysteme")
      .withIndex("by_cle", (q) => q.eq("cle", args.cle))
      .first();
    return conf?.valeur;
  },
});

export const ecrireConfig = superadminMutation({
  args: { 
    cle: v.string(), 
    valeur: v.any(), 
    description: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    // Assuming the user is admin
    const ident = await ctx.auth.getUserIdentity();
    const userId = ident?.subject ?? "system";

    const existing = await ctx.db
      .query("configSysteme")
      .withIndex("by_cle", (q) => q.eq("cle", args.cle))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        valeur: args.valeur,
        description: args.description,
        modifiePar: userId,
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.insert("configSysteme", {
        ...args,
        modifiePar: userId,
        timestamp: Date.now(),
      });
    }

    // Trigger plasticite update signal
    await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
      type: "CONFIG_UPDATE",
      source: "PLASTICITE",
      payload: { cle: args.cle, valeur: args.valeur },
      confiance: 1,
      priorite: "HIGH",
      correlationId: crypto.randomUUID(),
    });
  },
});

export const ajusterPoids = internalMutation({
  args: {
    signal: v.string(),
    regle: v.string(),
    reussite: v.boolean(),
  },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("poidsAdaptatifs")
      .withIndex("by_signal", (q) =>
        q.eq("signal", args.signal).eq("regle", args.regle)
      )
      .first();

    if (p) {
      // Algorithme de Lissage Exponentiel (Apprentissage par renforcement basique)
      const alpha = 0.15; // Taux d'apprentissage (learning rate)
      let nouveauPoids = p.poids;
      
      if (args.reussite) {
        nouveauPoids = (1 - alpha) * p.poids + alpha * 1.0;
      } else {
        nouveauPoids = (1 - alpha) * p.poids + alpha * 0.0;
      }

      // Eviter les extrêmes bloquants
      nouveauPoids = Math.max(0.01, Math.min(0.99, nouveauPoids));

      await ctx.db.patch(p._id, {
        poids: nouveauPoids,
        executionsReussies: args.reussite ? p.executionsReussies + 1 : p.executionsReussies,
        executionsEchouees: !args.reussite ? p.executionsEchouees + 1 : p.executionsEchouees,
        dernierAjustement: Date.now(),
      });
    } else {
      await ctx.db.insert("poidsAdaptatifs", {
        signal: args.signal,
        regle: args.regle,
        poids: args.reussite ? 0.8 : 0.4,
        executionsReussies: args.reussite ? 1 : 0,
        executionsEchouees: !args.reussite ? 1 : 0,
        dernierAjustement: Date.now(),
      });
    }
  },
});

export const lirePoidsAdaptatifs = backofficeQuery({
  args: { signal: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.signal) {
      return await ctx.db
        .query("poidsAdaptatifs")
        .withIndex("by_signal", (q) => q.eq("signal", args.signal!))
        .collect();
    }
    return await ctx.db.query("poidsAdaptatifs").collect();
  },
});

export const reevaluerPoidsGlobal = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Decay factor for unused weights over time (Oubli progressif)
    const decay = 0.01;
    const tousPoids = await ctx.db.query("poidsAdaptatifs").collect();
    
    for (const p of tousPoids) {
      // Si inactif depuis plus de 24h, on applique l'oubli
      if (Date.now() - p.dernierAjustement > 1000 * 60 * 60 * 24) {
        const nouveauPoids = p.poids * (1 - decay);
        await ctx.db.patch(p._id, {
          poids: Math.max(0.1, nouveauPoids) // Ne descend jamais à 0 complet pour garder une chance
        });
      }
    }
  }
});
