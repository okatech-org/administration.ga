/**
 * seedAntennesPnpe — création des 7 antennes régionales PNPE.
 *
 * Source : référentiel PNPE (mai 2026). Lambaréné en ouverture (février 2026).
 * Idempotent : ne recrée pas une antenne si son slug existe déjà.
 *
 * INVOCATION
 *   internal.seeds.pnpe.seedAntennesPnpe.run
 */
import { internalMutation } from "../../_generated/server";

type AntenneInput = {
  slug: string;
  nom: string;
  province:
    | "ESTUAIRE"
    | "HAUT_OGOOUE"
    | "MOYEN_OGOOUE"
    | "NGOUNIE"
    | "NYANGA"
    | "OGOOUE_IVINDO"
    | "OGOOUE_LOLO"
    | "OGOOUE_MARITIME"
    | "WOLEU_NTEM";
  ville: string;
  ville_adresse: string;
  telephone?: string;
  email?: string;
  statut: "OPERATIONNELLE" | "EN_OUVERTURE" | "SUSPENDUE" | "FERMEE";
  dateOuverture?: number;
};

const ANTENNES: AntenneInput[] = [
  {
    slug: "antenne-libreville",
    nom: "Antenne PNPE de Libreville (Siège)",
    province: "ESTUAIRE",
    ville: "Libreville",
    ville_adresse: "Boulevard Triomphal Omar Bongo, Libreville",
    telephone: "+241 01 00 00 00",
    email: "libreville@pnpe.ga",
    statut: "OPERATIONNELLE",
    dateOuverture: new Date("2005-01-01").getTime(),
  },
  {
    slug: "antenne-franceville",
    nom: "Antenne PNPE de Franceville",
    province: "HAUT_OGOOUE",
    ville: "Franceville",
    ville_adresse: "Centre-ville, Franceville",
    telephone: "+241 06 67 00 00",
    email: "franceville@pnpe.ga",
    statut: "OPERATIONNELLE",
  },
  {
    slug: "antenne-lambarene",
    nom: "Antenne PNPE de Lambaréné",
    province: "MOYEN_OGOOUE",
    ville: "Lambaréné",
    ville_adresse: "Centre-ville, Lambaréné",
    telephone: "+241 06 58 00 00",
    email: "lambarene@pnpe.ga",
    statut: "EN_OUVERTURE",
    dateOuverture: new Date("2026-02-01").getTime(),
  },
  {
    slug: "antenne-koulamoutou",
    nom: "Antenne PNPE de Koulamoutou",
    province: "OGOOUE_LOLO",
    ville: "Koulamoutou",
    ville_adresse: "Centre-ville, Koulamoutou",
    telephone: "+241 06 69 00 00",
    email: "koulamoutou@pnpe.ga",
    statut: "OPERATIONNELLE",
  },
  {
    slug: "antenne-port-gentil",
    nom: "Antenne PNPE de Port-Gentil",
    province: "OGOOUE_MARITIME",
    ville: "Port-Gentil",
    ville_adresse: "Centre-ville, Port-Gentil",
    telephone: "+241 05 55 00 00",
    email: "portgentil@pnpe.ga",
    statut: "OPERATIONNELLE",
  },
  {
    slug: "antenne-tchibanga",
    nom: "Antenne PNPE de Tchibanga",
    province: "NYANGA",
    ville: "Tchibanga",
    ville_adresse: "Centre-ville, Tchibanga",
    telephone: "+241 07 88 00 00",
    email: "tchibanga@pnpe.ga",
    statut: "OPERATIONNELLE",
  },
  {
    slug: "antenne-oyem",
    nom: "Antenne PNPE de Oyem",
    province: "WOLEU_NTEM",
    ville: "Oyem",
    ville_adresse: "Centre-ville, Oyem",
    telephone: "+241 07 98 00 00",
    email: "oyem@pnpe.ga",
    statut: "OPERATIONNELLE",
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Trouve un utilisateur pour `createdByUserId` (premier admin disponible)
    const adminUser = await ctx.db.query("users").first();
    if (!adminUser) {
      return {
        status: "no_user",
        message: "Aucun utilisateur en base — créer un admin d'abord.",
      };
    }

    let created = 0;
    let skipped = 0;
    for (const a of ANTENNES) {
      const existing = await ctx.db
        .query("antennesPnpe")
        .withIndex("by_slug", (q) => q.eq("slug", a.slug))
        .unique();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("antennesPnpe", {
        slug: a.slug,
        nom: a.nom,
        province: a.province,
        ville: a.ville,
        adresse: {
          street: a.ville_adresse,
          city: a.ville,
          country: "GA",
        },
        telephone: a.telephone,
        email: a.email,
        statut: a.statut,
        dateOuverture: a.dateOuverture,
        createdByUserId: adminUser._id,
      });
      created++;
    }

    return {
      status: "done",
      created,
      skipped,
      total: ANTENNES.length,
    };
  },
});
