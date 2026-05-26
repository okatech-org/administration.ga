/**
 * seedPnpeDevData — Données factices PNPE pour développement / démo.
 *
 * Idempotent : skip si des entités du même type existent déjà.
 *
 * INVOCATION
 *   internal.seeds.pnpe.seedPnpeDevData.run
 *
 * Note : pour gagner du temps en MVP, ce seed crée un échantillon réduit
 * (5 D.E + 3 employeurs + 5 offres + 8 candidatures) que les développeurs
 * peuvent étoffer manuellement ou via un script ultérieur.
 */
import { internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { CountryCode } from "../../lib/countryCodeValidator";

const NOMS = [
  "ONDIMBA",
  "OBAME",
  "NTOUTOUME",
  "MBA",
  "MOUKEGNI",
  "NGUEMA",
  "OBIANG",
  "BONGO",
];
const PRENOMS = [
  "Jean",
  "Marie",
  "Paul",
  "Sophie",
  "André",
  "Léa",
  "Pierre",
  "Sylvie",
];

const SECTEURS = [
  "BTP_CONSTRUCTION",
  "COMMERCE",
  "TELECOMS_NUMERIQUE",
  "TRANSPORT_LOGISTIQUE",
  "SERVICES_AUX_ENTREPRISES",
] as const;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Trouve antenne Libreville (rattachement par défaut)
    const antenne = await ctx.db
      .query("antennesPnpe")
      .withIndex("by_slug", (q) => q.eq("slug", "antenne-libreville"))
      .unique();
    if (!antenne) {
      return {
        status: "missing_antenne",
        message:
          "Antennes PNPE non seedées. Lancer seeds.pnpe.seedAntennesPnpe.run d'abord.",
      };
    }

    const adminUser = await ctx.db.query("users").first();
    if (!adminUser) {
      return { status: "no_user" };
    }

    // Skip si déjà 5+ D.E factices créés
    const existingDE = await ctx.db
      .query("demandeursEmploi")
      .take(5);
    if (existingDE.length >= 5) {
      return { status: "already_seeded", count: existingDE.length };
    }

    // ─── Création 5 D.E factices ─────────────────────────────
    const demandeurIds: Id<"demandeursEmploi">[] = [];
    for (let i = 0; i < 5; i++) {
      const nip = `9999${(1000 + i).toString().padStart(4, "0")}`;
      const id = await ctx.db.insert("demandeursEmploi", {
        userId: adminUser._id, // dev : tous rattachés à l'admin
        nip,
        nom: NOMS[i % NOMS.length],
        prenoms: PRENOMS[i % PRENOMS.length],
        email: `demo.de.${i + 1}@pnpe.demo.administration.ga`,
        telephone: `+241050000${i.toString().padStart(2, "0")}`,
        provinceResidence: "ESTUAIRE",
        antenneId: antenne._id,
        statutCompte: i === 0 ? "BROUILLON" : i < 3 ? "EN_VALIDATION" : "ACTIF",
        createdByUserId: adminUser._id,
      });
      demandeurIds.push(id);
    }

    // ─── Création 3 employeurs factices ──────────────────────
    const employeurIds: Id<"employeurs">[] = [];
    for (let i = 0; i < 3; i++) {
      const nif = `EMP${(20000 + i).toString()}`;
      const id = await ctx.db.insert("employeurs", {
        userId: adminUser._id,
        raisonSociale: `Entreprise Démo ${i + 1} SARL`,
        nif,
        secteurActivite: SECTEURS[i % SECTEURS.length],
        tailleEntreprise: i === 0 ? "GE" : i === 1 ? "PME" : "TPE",
        effectif: i === 0 ? 350 : i === 1 ? 25 : 5,
        adresseSiege: {
          street: `Avenue Démo ${i + 1}`,
          city: "Libreville",
          postalCode: "",
          country: CountryCode.GA,
        },
        provinceSiege: "ESTUAIRE",
        representantLegal: {
          nom: NOMS[(i + 3) % NOMS.length],
          prenoms: PRENOMS[(i + 3) % PRENOMS.length],
          fonction: "DRH",
          email: `rh${i + 1}@demo.pnpe.administration.ga`,
          telephone: "+241050000000",
        },
        statutVerification: "VERIFIE",
        createdByUserId: adminUser._id,
      });
      employeurIds.push(id);
    }

    // ─── Création 5 offres publiées ──────────────────────────
    const now = Date.now();
    const oneMonth = 30 * 24 * 3600 * 1000;
    const offreIds: Id<"offresEmploi">[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await ctx.db.insert("offresEmploi", {
        typeEmployeur: "ENTREPRISE",
        employeurId: employeurIds[i % employeurIds.length],
        reference: `OE/2026/DEMO/${(1000 + i).toString()}`,
        titre: [
          "Développeur Web Full-Stack",
          "Chef de chantier BTP",
          "Commercial terrain",
          "Comptable confirmé",
          "Chauffeur poids lourds",
        ][i],
        description:
          "Offre démo seedée pour le développement et la démo. Voir les Phases 2-9.",
        typeContrat: i === 4 ? "CDD" : "CDI",
        secteurActivite: SECTEURS[i % SECTEURS.length],
        lieuTravail: {
          province: "ESTUAIRE",
          ville: "Libreville",
        },
        dateExpiration: now + oneMonth,
        datePublication: now,
        statut: "PUBLIEE",
        nbVues: 0,
        nbCandidatures: 0,
        createdByUserId: adminUser._id,
      });
      offreIds.push(id);
    }

    // ─── Création 8 candidatures factices ────────────────────
    let candidaturesCount = 0;
    const STATUTS = [
      "ENVOYEE",
      "VUE",
      "PRESELECTIONNEE",
      "ENTRETIEN",
      "RETENUE",
      "NON_RETENUE",
    ] as const;
    for (let i = 0; i < 8; i++) {
      const offreId = offreIds[i % offreIds.length];
      const demandeurId = demandeurIds[i % demandeurIds.length];
      // Skip si déjà candidaté (unicité)
      const exists = await ctx.db
        .query("candidatures")
        .withIndex("by_offre_demandeur", (q) =>
          q.eq("offreId", offreId).eq("demandeurId", demandeurId),
        )
        .unique();
      if (exists) continue;
      const statut = STATUTS[i % STATUTS.length];
      await ctx.db.insert("candidatures", {
        typeCandidature: "DEMANDEUR_INSCRIT",
        offreId,
        demandeurId,
        cvStorageId: adminUser._id as unknown as Id<"_storage">, // fake (codegen-permissif)
        statut,
        historiqueStatuts: [
          {
            statut: "ENVOYEE",
            date: now - i * 24 * 3600 * 1000,
            auteurUserId: adminUser._id,
          },
        ],
        createdByUserId: adminUser._id,
      });
      candidaturesCount++;
    }

    return {
      status: "done",
      demandeurs: demandeurIds.length,
      employeurs: employeurIds.length,
      offres: offreIds.length,
      candidatures: candidaturesCount,
    };
  },
});
