/**
 * Convex functions — Offres publiques TRAVAIL.GA / PNPE.
 *
 * Couvre les 3 types d'émetteurs :
 *  - ENTREPRISE (entreprises commerciales avec NIF/RCCM)
 *  - ADMINISTRATION (organismes publics référencés dans `orgs`)
 *  - PARTICULIER (personnes physiques — emploi domestique, jardinier, etc.)
 *
 * Et la consultation publique multi-source.
 */
import { v } from "convex/values";
import { query } from "../../_generated/server";
import { authMutation } from "../../lib/customFunctions";
import { addressValidator } from "../../lib/validators";
import {
  codeNAFGabonValidator,
  codeProvinceGaValidator,
  typeContratValidator,
} from "../../lib/validators/pnpe";

// ─── Création d'offre par une ADMINISTRATION ──────────────────

/**
 * Crée une offre publiée par une administration publique (orgId existant
 * dans la table `orgs`). Statut initial : EN_VALIDATION (conseiller PNPE
 * valide ensuite — workflow allégé car l'org est pré-vérifiée).
 */
export const createByAdministration = authMutation({
  args: {
    orgId: v.id("orgs"),
    titre: v.string(),
    description: v.string(),
    missions: v.optional(v.array(v.string())),
    profilRecherche: v.optional(v.string()),
    typeContrat: typeContratValidator,
    dureeMois: v.optional(v.number()),
    secteurActivite: v.optional(codeNAFGabonValidator),
    lieuTravail: v.object({
      province: codeProvinceGaValidator,
      ville: v.string(),
      adresse: v.optional(addressValidator),
      teletravail: v.optional(
        v.union(v.literal("NON"), v.literal("PARTIEL"), v.literal("TOTAL")),
      ),
    }),
    salaire: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        devise: v.string(),
        periodicite: v.union(
          v.literal("HORAIRE"),
          v.literal("MENSUEL"),
          v.literal("ANNUEL"),
        ),
      }),
    ),
    dateExpiration: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("ORG_NOT_FOUND");

    // Vérif : l'utilisateur courant est membre actif de cette org
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
      )
      .collect();
    const activeMembership = membership.find((m) => !m.deletedAt);
    if (!activeMembership) {
      throw new Error(
        "FORBIDDEN: vous devez être membre actif de l'organisation",
      );
    }

    // Référence : ADM/YYYY/<ORG_SLUG_TAIL>/<TIMESTAMP>
    const year = new Date().getFullYear();
    const slugTail = org.slug.slice(-6).toUpperCase();
    const ts = Date.now().toString().slice(-6);
    const reference = `ADM/${year}/${slugTail}/${ts}`;

    return await ctx.db.insert("offresEmploi", {
      typeEmployeur: "ADMINISTRATION",
      orgId: args.orgId,
      reference,
      statut: "EN_VALIDATION",
      nbVues: 0,
      nbCandidatures: 0,
      createdByUserId: ctx.user._id,
      titre: args.titre,
      description: args.description,
      missions: args.missions,
      profilRecherche: args.profilRecherche,
      typeContrat: args.typeContrat,
      dureeMois: args.dureeMois,
      secteurActivite: args.secteurActivite,
      lieuTravail: args.lieuTravail,
      salaire: args.salaire,
      dateExpiration: args.dateExpiration,
    });
  },
});

// ─── Création d'offre par un PARTICULIER ──────────────────────

/**
 * Crée une offre publiée par un particulier (personne physique).
 * Cas d'usage : emploi domestique, garde d'enfants, jardinier, aide à
 * domicile, cours particuliers, etc.
 *
 * Pas de vérification entreprise. Statut initial EN_VALIDATION + modération
 * PNPE renforcée (anti-fraude).
 */
export const createByParticulier = authMutation({
  args: {
    particulierInfo: v.object({
      nom: v.string(),
      prenoms: v.string(),
      email: v.string(),
      telephone: v.string(),
      nip: v.optional(v.string()),
    }),
    titre: v.string(),
    description: v.string(),
    missions: v.optional(v.array(v.string())),
    typeContrat: typeContratValidator,
    dureeMois: v.optional(v.number()),
    lieuTravail: v.object({
      province: codeProvinceGaValidator,
      ville: v.string(),
      adresse: v.optional(addressValidator),
      teletravail: v.optional(
        v.union(v.literal("NON"), v.literal("PARTIEL"), v.literal("TOTAL")),
      ),
    }),
    salaire: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        devise: v.string(),
        periodicite: v.union(
          v.literal("HORAIRE"),
          v.literal("MENSUEL"),
          v.literal("ANNUEL"),
        ),
      }),
    ),
    dateExpiration: v.number(),
  },
  handler: async (ctx, args) => {
    // Référence : PAR/YYYY/<USER_TAIL>/<TIMESTAMP>
    const year = new Date().getFullYear();
    const userTail = ctx.user._id.slice(-6).toUpperCase();
    const ts = Date.now().toString().slice(-6);
    const reference = `PAR/${year}/${userTail}/${ts}`;

    return await ctx.db.insert("offresEmploi", {
      typeEmployeur: "PARTICULIER",
      particulierInfo: {
        ...args.particulierInfo,
        userId: ctx.user._id,
      },
      reference,
      statut: "EN_VALIDATION",
      nbVues: 0,
      nbCandidatures: 0,
      signalements: {
        count: 0,
        flaggedForReview: false,
      },
      createdByUserId: ctx.user._id,
      titre: args.titre,
      description: args.description,
      missions: args.missions,
      typeContrat: args.typeContrat,
      dureeMois: args.dureeMois,
      lieuTravail: args.lieuTravail,
      salaire: args.salaire,
      dateExpiration: args.dateExpiration,
    });
  },
});

// ─── Liste publique multi-source ──────────────────────────────

/**
 * Liste publique de TOUTES les offres `PUBLIEE` quel que soit le type
 * d'émetteur. Filtres optionnels par type, secteur, contrat, province.
 *
 * Pas d'auth. Utilisé par TRAVAIL.GA pour le catalogue grand public.
 */
export const listAllPublished = query({
  args: {
    typeEmployeur: v.optional(
      v.union(
        v.literal("ENTREPRISE"),
        v.literal("ADMINISTRATION"),
        v.literal("PARTICULIER"),
      ),
    ),
    secteur: v.optional(codeNAFGabonValidator),
    typeContrat: v.optional(typeContratValidator),
    province: v.optional(codeProvinceGaValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Récupère par type si filtré, sinon toutes les offres PUBLIEE
    const offres = args.typeEmployeur
      ? await ctx.db
          .query("offresEmploi")
          .withIndex("by_type_statut", (q) =>
            q
              .eq("typeEmployeur", args.typeEmployeur!)
              .eq("statut", "PUBLIEE"),
          )
          .order("desc")
          .take(limit * 2)
      : await ctx.db
          .query("offresEmploi")
          .withIndex("by_statut", (q) => q.eq("statut", "PUBLIEE"))
          .order("desc")
          .take(limit * 2);

    let filtered = offres;
    if (args.secteur) {
      filtered = filtered.filter((o) => o.secteurActivite === args.secteur);
    }
    if (args.typeContrat) {
      filtered = filtered.filter((o) => o.typeContrat === args.typeContrat);
    }
    if (args.province) {
      filtered = filtered.filter(
        (o) => o.lieuTravail.province === args.province,
      );
    }
    return filtered.slice(0, limit);
  },
});

/**
 * Détail enrichi d'une offre par référence — inclut l'identité de
 * l'émetteur résolue (entreprise, org, ou particulier).
 */
export const getByReferenceEnriched = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const offre = await ctx.db
      .query("offresEmploi")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!offre) return null;

    let emetteur: {
      type: string;
      nom: string;
      details?: Record<string, unknown>;
    } = { type: offre.typeEmployeur, nom: "Anonyme" };

    if (offre.typeEmployeur === "ENTREPRISE" && offre.employeurId) {
      const emp = await ctx.db.get(offre.employeurId);
      if (emp) {
        emetteur = {
          type: "ENTREPRISE",
          nom: emp.raisonSociale,
          details: {
            secteur: emp.secteurActivite,
            tailleEntreprise: emp.tailleEntreprise,
          },
        };
      }
    } else if (offre.typeEmployeur === "ADMINISTRATION" && offre.orgId) {
      const org = await ctx.db.get(offre.orgId);
      if (org) {
        emetteur = {
          type: "ADMINISTRATION",
          nom: org.name,
          details: { slug: org.slug, orgType: org.type },
        };
      }
    } else if (
      offre.typeEmployeur === "PARTICULIER" &&
      offre.particulierInfo
    ) {
      emetteur = {
        type: "PARTICULIER",
        nom: `${offre.particulierInfo.prenoms} ${offre.particulierInfo.nom}`,
        details: {
          contact: {
            email: offre.particulierInfo.email,
            telephone: offre.particulierInfo.telephone,
          },
        },
      };
    }

    return { ...offre, emetteur };
  },
});

// ─── Signalement (anti-fraude pour offres PARTICULIER) ───────

/**
 * Signaler une offre suspecte (offres PARTICULIER majoritairement).
 * Incrémente le compteur ; au seuil 3, l'offre est flaggée pour
 * modération conseiller.
 */
export const signaler = authMutation({
  args: {
    offreId: v.id("offresEmploi"),
    motif: v.string(),
  },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");

    const prev = offre.signalements ?? { count: 0, flaggedForReview: false };
    const newCount = prev.count + 1;
    await ctx.db.patch(args.offreId, {
      signalements: {
        count: newCount,
        lastSignaledAt: Date.now(),
        flaggedForReview: newCount >= 3,
      },
      // metadata pour stocker les motifs (lectur conseiller)
      metadata: {
        ...(offre.metadata as object | undefined),
        signalementsMotifs: [
          ...(((offre.metadata as { signalementsMotifs?: string[] })?.signalementsMotifs) ?? []),
          `${new Date().toISOString()} — ${args.motif}`,
        ],
      },
    });
    return { ok: true, count: newCount };
  },
});
