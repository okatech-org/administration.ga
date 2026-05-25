/**
 * Convex functions — Demandeurs d'Emploi (D.E) PNPE.
 *
 * Couvre l'inscription, la consultation et la modification du profil D.E.
 * Le D.E ne voit QUE son propre dossier (filtré par userId).
 * Les conseillers PNPE de son antenne le voient via Phase 5.
 *
 * Workflow validation :
 *   BROUILLON → EN_VALIDATION (D.E soumet) → ACTIF (conseiller valide).
 */
import { v } from "convex/values";
import { authQuery, authMutation } from "../../lib/customFunctions";
import {
  codeProvinceGaValidator,
  disponibiliteDEValidator,
  niveauEtudesValidator,
  programmeTypeValidator,
  statutDemandeurValidator,
  typeContratValidator,
} from "../../lib/validators/pnpe";

/** Récupère le profil D.E de l'utilisateur connecté (ou null s'il n'en a pas). */
export const getMine = authQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
  },
});

/**
 * Génère une URL signée d'upload pour le CV (PDF) du D.E.
 * Le client POST le fichier directement sur cette URL, récupère un
 * storageId, puis appelle `attachCv` pour lier au profil.
 */
export const generateCvUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Attache un CV (storageId Convex) au profil D.E. */
export const attachCv = authMutation({
  args: {
    demandeurId: v.id("demandeursEmploi"),
    cvStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) throw new Error("DEMANDEUR_NOT_FOUND");
    if (demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    // Supprime l'ancien CV s'il existe (économie de storage)
    if (demandeur.cvStorageId && demandeur.cvStorageId !== args.cvStorageId) {
      try {
        await ctx.storage.delete(demandeur.cvStorageId);
      } catch {
        // tolérant si déjà supprimé
      }
    }
    await ctx.db.patch(args.demandeurId, {
      cvStorageId: args.cvStorageId,
    });
    return { ok: true };
  },
});

/** Récupère l'URL signée de téléchargement du CV. */
export const getCvUrl = authQuery({
  args: { demandeurId: v.id("demandeursEmploi") },
  handler: async (ctx, args) => {
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur || !demandeur.cvStorageId) return null;
    return await ctx.storage.getUrl(demandeur.cvStorageId);
  },
});

/** Crée le profil D.E (inscription initiale, statut BROUILLON). */
export const create = authMutation({
  args: {
    nip: v.string(),
    nom: v.string(),
    prenoms: v.string(),
    email: v.string(),
    telephone: v.string(),
    telephoneWhatsApp: v.optional(v.string()),
    provinceResidence: codeProvinceGaValidator,
    antenneId: v.id("antennesPnpe"),
    preferenceProgramme: v.optional(programmeTypeValidator),
  },
  handler: async (ctx, args) => {
    // Vérif : pas déjà inscrit
    const existing = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (existing) {
      throw new Error("DEMANDEUR_ALREADY_REGISTERED");
    }
    // Vérif unicité NIP
    const nipExists = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_nip", (q) => q.eq("nip", args.nip))
      .unique();
    if (nipExists) {
      throw new Error("NIP_ALREADY_USED");
    }
    return await ctx.db.insert("demandeursEmploi", {
      userId: ctx.user._id,
      statutCompte: "BROUILLON",
      createdByUserId: ctx.user._id,
      ...args,
    });
  },
});

/** Met à jour le profil D.E (édition par le D.E lui-même). */
export const updateProfile = authMutation({
  args: {
    demandeurId: v.id("demandeursEmploi"),
    patch: v.object({
      dateNaissance: v.optional(v.number()),
      lieuNaissance: v.optional(v.string()),
      sexe: v.optional(v.union(v.literal("M"), v.literal("F"))),
      niveauEtudes: v.optional(niveauEtudesValidator),
      competences: v.optional(v.array(v.string())),
      disponibilite: v.optional(disponibiliteDEValidator),
      typeContratSouhaite: v.optional(v.array(typeContratValidator)),
      mobiliteGeographique: v.optional(v.array(codeProvinceGaValidator)),
      cvthequeVisible: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) throw new Error("DEMANDEUR_NOT_FOUND");
    if (demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN: not your profile");
    }
    await ctx.db.patch(args.demandeurId, args.patch);
    return { ok: true };
  },
});

/** Soumet le profil pour validation conseiller (BROUILLON → EN_VALIDATION). */
export const submitForValidation = authMutation({
  args: { demandeurId: v.id("demandeursEmploi") },
  handler: async (ctx, args) => {
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) throw new Error("DEMANDEUR_NOT_FOUND");
    if (demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    if (demandeur.statutCompte !== "BROUILLON") {
      throw new Error(`INVALID_TRANSITION: ${demandeur.statutCompte} → EN_VALIDATION`);
    }
    await ctx.db.patch(args.demandeurId, {
      statutCompte: "EN_VALIDATION",
    });
    return { ok: true };
  },
});

/** Liste des D.E pour un conseiller (utilisée Phase 5 par les agents PNPE). */
export const listByAntenne = authQuery({
  args: {
    antenneId: v.id("antennesPnpe"),
    statut: v.optional(statutDemandeurValidator),
  },
  handler: async (ctx, args) => {
    // TODO Phase 7 : vérifier que ctx.user est conseiller_pnpe de cette antenne.
    const q = args.statut
      ? ctx.db
          .query("demandeursEmploi")
          .withIndex("by_antenne_statut", (qb) =>
            qb.eq("antenneId", args.antenneId).eq("statutCompte", args.statut!),
          )
      : ctx.db
          .query("demandeursEmploi")
          .withIndex("by_antenne_statut", (qb) =>
            qb.eq("antenneId", args.antenneId),
          );
    return await q.collect();
  },
});

/** Action conseiller : valider un D.E (EN_VALIDATION → ACTIF). */
export const validateDemandeur = authMutation({
  args: {
    demandeurId: v.id("demandeursEmploi"),
  },
  handler: async (ctx, args) => {
    // TODO Phase 7 : vérifier rôle conseiller_pnpe / chef_antenne / direction.
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) throw new Error("DEMANDEUR_NOT_FOUND");
    if (demandeur.statutCompte !== "EN_VALIDATION") {
      throw new Error(
        `INVALID_TRANSITION: ${demandeur.statutCompte} → ACTIF`,
      );
    }
    await ctx.db.patch(args.demandeurId, {
      statutCompte: "ACTIF",
      dateValidation: Date.now(),
      valideParUserId: ctx.user._id,
    });
    return { ok: true };
  },
});
