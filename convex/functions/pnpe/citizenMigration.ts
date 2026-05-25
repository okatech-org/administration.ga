/**
 * Migration progressive Citoyen ordinaire → Demandeur d'Emploi (D.E) PNPE.
 *
 * Logique métier (cf. recommandation produit) :
 *  - 1 à 2 candidatures : reste citoyen ordinaire (compte Better Auth basique)
 *  - 3+ candidatures sur 30 jours : invitation à devenir D.E
 *  - 5+ candidatures sans migration : soft block "Complétez votre profil D.E"
 *
 * Justification : évite la friction signup (un user qui poste à 1 garde
 * d'enfants n'a pas besoin de NIP+formation), évite la pollution de base
 * D.E avec des fantômes, donne la mission d'accompagnement PNPE aux profils
 * actifs (3+ candidatures = chercheur sérieux).
 */
import { v } from "convex/values";
import { authQuery, authMutation } from "../../lib/customFunctions";
import { codeProvinceGaValidator } from "../../lib/validators/pnpe";

const SEUIL_INVITATION = 3;
const SEUIL_SOFT_BLOCK = 5;
const FENETRE_JOURS = 30;
const FENETRE_MS = FENETRE_JOURS * 24 * 60 * 60 * 1000;

/**
 * Statut de migration du user connecté.
 *
 * Renvoie :
 *  - mode "DEMANDEUR" si le user a déjà un profil D.E
 *  - mode "CITOYEN" sinon, avec count des candidatures sur 30j et flags
 *    inviteToMigrate / softBlock
 */
export const migrationStatus = authQuery({
  args: {},
  handler: async (ctx) => {
    // Si déjà D.E inscrit, mode plein
    const demandeur = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (demandeur) {
      return {
        mode: "DEMANDEUR" as const,
        demandeurId: demandeur._id,
        statut: demandeur.statutCompte,
      };
    }

    // Citoyen ordinaire : compte les candidatures sur 30 jours
    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_applicant_user", (q) =>
        q.eq("applicantUserId", ctx.user._id),
      )
      .collect();

    const now = Date.now();
    const recent = candidatures.filter(
      (c) => now - c._creationTime < FENETRE_MS,
    );

    const totalCandidatures = candidatures.length;
    const recentCount = recent.length;

    return {
      mode: "CITOYEN" as const,
      demandeurId: null,
      totalCandidatures,
      recentCount,
      inviteToMigrate: recentCount >= SEUIL_INVITATION,
      softBlock: recentCount >= SEUIL_SOFT_BLOCK,
      seuilInvitation: SEUIL_INVITATION,
      seuilSoftBlock: SEUIL_SOFT_BLOCK,
      fenetreJours: FENETRE_JOURS,
    };
  },
});

/**
 * Liste les candidatures du citoyen connecté (vue `/mon-compte/candidatures`).
 * Inclut le titre de l'offre et son statut pour affichage.
 */
export const listMyCandidatures = authQuery({
  args: {},
  handler: async (ctx) => {
    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_applicant_user", (q) =>
        q.eq("applicantUserId", ctx.user._id),
      )
      .order("desc")
      .collect();

    return Promise.all(
      candidatures.map(async (c) => {
        const offre = await ctx.db.get(c.offreId);
        return {
          ...c,
          offre: offre
            ? {
                reference: offre.reference,
                titre: offre.titre,
                statut: offre.statut,
                lieuTravail: offre.lieuTravail,
                typeContrat: offre.typeContrat,
                typeEmployeur: offre.typeEmployeur,
              }
            : null,
        };
      }),
    );
  },
});

/**
 * Migration du compte citoyen vers profil D.E PNPE complet.
 *
 * Pré-remplit les champs avec les données déjà connues (issues des
 * `applicantContact` des candidatures précédentes). Le D.E est créé en
 * statut BROUILLON — il faut le compléter et le soumettre pour validation
 * conseiller.
 */
export const migrateToDemandeur = authMutation({
  args: {
    nip: v.string(),
    nom: v.string(),
    prenoms: v.string(),
    email: v.string(),
    telephone: v.string(),
    telephoneWhatsApp: v.optional(v.string()),
    provinceResidence: codeProvinceGaValidator,
    antenneId: v.id("antennesPnpe"),
  },
  handler: async (ctx, args) => {
    // Vérif : pas déjà D.E
    const existing = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (existing) {
      throw new Error("DEJA_DEMANDEUR");
    }

    // Vérif unicité NIP
    const nipExists = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_nip", (q) => q.eq("nip", args.nip))
      .unique();
    if (nipExists) {
      throw new Error("NIP_DEJA_UTILISE");
    }

    // Crée le profil D.E (BROUILLON)
    const demandeurId = await ctx.db.insert("demandeursEmploi", {
      userId: ctx.user._id,
      nip: args.nip,
      nom: args.nom,
      prenoms: args.prenoms,
      email: args.email,
      telephone: args.telephone,
      telephoneWhatsApp: args.telephoneWhatsApp,
      provinceResidence: args.provinceResidence,
      antenneId: args.antenneId,
      statutCompte: "BROUILLON",
      createdByUserId: ctx.user._id,
    });

    // Bascule toutes les candidatures CITOYEN_ORDINAIRE existantes vers
    // DEMANDEUR_INSCRIT en attachant le nouveau demandeurId. Permet au
    // user de ne pas perdre l'historique de ses postulations.
    const existingCandidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_applicant_user", (q) =>
        q.eq("applicantUserId", ctx.user._id),
      )
      .collect();

    for (const c of existingCandidatures) {
      if (c.typeCandidature === "CITOYEN_ORDINAIRE") {
        await ctx.db.patch(c._id, {
          typeCandidature: "DEMANDEUR_INSCRIT",
          demandeurId,
        });
      }
    }

    return {
      ok: true,
      demandeurId,
      candidaturesMigrees: existingCandidatures.length,
    };
  },
});

/**
 * Pre-remplit le formulaire de migration à partir des candidatures
 * existantes (dernière candidature CITOYEN_ORDINAIRE comme source).
 */
export const getMigrationPrefill = authQuery({
  args: {},
  handler: async (ctx) => {
    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_applicant_user", (q) =>
        q.eq("applicantUserId", ctx.user._id),
      )
      .order("desc")
      .collect();

    const lastCitizen = candidatures.find(
      (c) =>
        c.typeCandidature === "CITOYEN_ORDINAIRE" && c.applicantContact,
    );

    if (!lastCitizen?.applicantContact) {
      return null;
    }

    return {
      nom: lastCitizen.applicantContact.nom,
      prenoms: lastCitizen.applicantContact.prenoms,
      email: lastCitizen.applicantContact.email,
      telephone: lastCitizen.applicantContact.telephone,
      niveauEtudesText: lastCitizen.applicantContact.niveauEtudes,
      experienceText: lastCitizen.applicantContact.experienceText,
    };
  },
});
