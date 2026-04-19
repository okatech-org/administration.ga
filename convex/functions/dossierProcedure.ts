/**
 * Dossier de Procédure — Convex Functions
 *
 * Gestion complète des procédures administratives multi-étapes :
 * - Configuration des TypeDemarche (backoffice)
 * - CRUD Dossier (création, consultation, suppression)
 * - Gestion des pièces (upload, validation, rejet)
 * - Workflow engine (avancement, renvoi, suspension, clôture)
 * - Journal d'audit immuable
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";
import { assertCanDoTask, canDoTask } from "../lib/permissions";
import { TaskCode, type TaskCodeValue } from "../lib/taskCodes";
import { isPublicUser } from "../lib/userCategory";
import type { Id } from "../_generated/dataModel";
import {
  demarcheCategoryValidator,
  dossierStatusValidator,
  confidentialiteValidator,
  pieceFormatValidator,
  fournisseurTypeValidator,
  transitionActionValidator,
} from "../schemas/dossierProcedure";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Atomic counter: get the next sequential number for a named counter.
 * Convex mutations are serialized so this is safe.
 */
async function nextCounter(
  ctx: any,
  counterName: string,
): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", counterName))
    .unique();

  const nextValue = (counter?.value ?? 0) + 1;

  if (counter) {
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    await ctx.db.insert("counters", { name: counterName, value: nextValue });
  }

  return nextValue;
}

/**
 * Parse a reference pattern and generate a reference string.
 * Supported tokens: {YYYY}, {YY}, {TYPE}, {ORG}, {SEQ:N}
 */
function generateReferenceFromPattern(
  pattern: string,
  typeCode: string,
  orgCode: string,
  seq: number,
): string {
  const now = new Date();
  return pattern
    .replace("{YYYY}", String(now.getFullYear()))
    .replace("{YY}", String(now.getFullYear()).slice(2))
    .replace("{TYPE}", typeCode.toUpperCase())
    .replace("{ORG}", orgCode.toUpperCase())
    .replace(/\{SEQ:(\d+)\}/g, (_, digits) =>
      String(seq).padStart(parseInt(digits), "0"),
    );
}

/**
 * Log an action to the journal.
 */
async function logJournal(
  ctx: any,
  dossierId: any,
  action: string,
  detail?: any,
) {
  await ctx.db.insert("journalActions", {
    dossierId,
    action,
    actorId: ctx.user._id,
    actorName: ctx.user.name ?? ctx.user.email,
    detail,
    createdAt: Date.now(),
  });
}

/**
 * Vérifie qu'un citoyen est le propriétaire (demandeur) du dossier.
 * Utilisé pour bypass du check TaskCode sur les mutations de constitution
 * (createDossier, submitDossier, uploadPiece) — le citoyen n'a pas de
 * membership dans une org consulaire, il construit son propre dossier.
 */
async function isDossierOwner(
  ctx: any,
  dossier: any,
): Promise<boolean> {
  if (dossier.demandeurId !== ctx.user._id) return false;
  // Un agent peut aussi être demandeur d'un dossier : on ne considère "owner"
  // (bypass RBAC) que si l'utilisateur est une catégorie B (citoyen, sans
  // membership dans aucune org consulaire).
  return await isPublicUser(ctx, ctx.user._id);
}

/**
 * Vérifie que l'utilisateur courant a bien le TaskCode requis dans l'org
 * porteuse du dossier. Bypass pour citoyen-propriétaire (voir isDossierOwner).
 *
 * Usage type :
 *   await assertDossierTask(ctx, dossier, TaskCode.correspondance.transmit);
 */
async function assertDossierTask(
  ctx: any,
  dossier: any,
  taskCode: TaskCodeValue,
  { allowOwner = false }: { allowOwner?: boolean } = {},
): Promise<void> {
  if (allowOwner && (await isDossierOwner(ctx, dossier))) return;

  const orgId = dossier.organismeActuelId ?? dossier.organismePorteurId;
  if (!orgId) {
    throw error(
      ErrorCode.INVALID_ARGUMENT,
      "Dossier sans organisme porteur — action impossible",
    );
  }
  const membership = await getMembership(ctx, ctx.user._id, orgId as Id<"orgs">);
  await assertCanDoTask(ctx, ctx.user, membership, taskCode);
}

/**
 * Version lecture : accepte soit la propriété citoyen, soit une membership
 * dans l'org avec `correspondance.view`. Utilisée dans les queries.
 */
async function canReadDossier(
  ctx: any,
  dossier: any,
): Promise<boolean> {
  if (await isDossierOwner(ctx, dossier)) return true;
  const orgId = dossier.organismeActuelId ?? dossier.organismePorteurId;
  if (!orgId) return false;
  const membership = await getMembership(ctx, ctx.user._id, orgId as Id<"orgs">);
  return await canDoTask(
    ctx,
    ctx.user,
    membership,
    TaskCode.correspondance.view,
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TYPE DEMARCHE — Configuration (backoffice)
// ═════════════════════════════════════════════════════════════════════════════

/** List active TypeDemarche for an org */
export const listTypeDemarches = authQuery({
  args: {
    orgId: v.id("orgs"),
    category: v.optional(demarcheCategoryValidator),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("typeDemarches")
      .withIndex("by_org_active", (q: any) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      );

    const results = await query.collect();

    if (args.category) {
      return results.filter((td: any) => td.category === args.category);
    }
    return results;
  },
});

/** List all TypeDemarche (including inactive) for admin */
export const listAllTypeDemarches = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("typeDemarches")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/** Get a single TypeDemarche by ID */
export const getTypeDemarche = authQuery({
  args: { id: v.id("typeDemarches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id) as any;
  },
});

/** Create a new TypeDemarche */
export const createTypeDemarche = authMutation({
  args: {
    orgId: v.id("orgs"),
    code: v.string(),
    label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
    description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
    category: demarcheCategoryValidator,
    referencePattern: v.string(),
    piecesRequises: v.array(v.object({
      code: v.string(),
      label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
      description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
      fournisseur: fournisseurTypeValidator,
      fournisseurOrgId: v.optional(v.id("orgs")),
      signataireRole: v.optional(v.string()),
      signataireOrgId: v.optional(v.id("orgs")),
      format: pieceFormatValidator,
      required: v.boolean(),
    })),
    etapesParcours: v.array(v.object({
      ordre: v.number(),
      code: v.string(),
      label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
      organismeType: v.optional(v.string()),
      organismeId: v.optional(v.id("orgs")),
      roleRequired: v.optional(v.string()),
      delaiJours: v.optional(v.number()),
      actionsAutorisees: v.array(v.string()),
      conditionPassage: v.optional(v.string()),
    })),
    confidentialite: confidentialiteValidator,
    delaiGlobalJours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Configuration des types = admin procédure.
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.correspondance.configure,
    );

    const now = Date.now();

    // Check unique code within org
    const existing = await ctx.db
      .query("typeDemarches")
      .withIndex("by_org_code", (q: any) =>
        q.eq("orgId", args.orgId).eq("code", args.code),
      )
      .first();

    if (existing && !existing.deletedAt) {
      throw new Error(`TypeDemarche with code "${args.code}" already exists in this org`);
    }

    return await ctx.db.insert("typeDemarches", {
      orgId: args.orgId,
      createdBy: ctx.user._id,
      code: args.code,
      label: args.label,
      description: args.description,
      category: args.category,
      referencePattern: args.referencePattern,
      piecesRequises: args.piecesRequises,
      etapesParcours: args.etapesParcours,
      confidentialite: args.confidentialite,
      delaiGlobalJours: args.delaiGlobalJours,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update a TypeDemarche */
export const updateTypeDemarche = authMutation({
  args: {
    id: v.id("typeDemarches"),
    label: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
    description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
    category: v.optional(demarcheCategoryValidator),
    referencePattern: v.optional(v.string()),
    piecesRequises: v.optional(v.array(v.object({
      code: v.string(),
      label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
      description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
      fournisseur: fournisseurTypeValidator,
      fournisseurOrgId: v.optional(v.id("orgs")),
      signataireRole: v.optional(v.string()),
      signataireOrgId: v.optional(v.id("orgs")),
      format: pieceFormatValidator,
      required: v.boolean(),
    }))),
    etapesParcours: v.optional(v.array(v.object({
      ordre: v.number(),
      code: v.string(),
      label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
      organismeType: v.optional(v.string()),
      organismeId: v.optional(v.id("orgs")),
      roleRequired: v.optional(v.string()),
      delaiJours: v.optional(v.number()),
      actionsAutorisees: v.array(v.string()),
      conditionPassage: v.optional(v.string()),
    }))),
    confidentialite: v.optional(confidentialiteValidator),
    delaiGlobalJours: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.get(args.id)) as any;
    if (!existing) throw error(ErrorCode.NOT_FOUND, "TypeDemarche non trouvé");
    const membership = await getMembership(ctx, ctx.user._id, existing.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.correspondance.configure,
    );

    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) updates[key] = val;
    }
    await ctx.db.patch(id, updates as any);
  },
});

/** Soft-deactivate a TypeDemarche */
export const deactivateTypeDemarche = authMutation({
  args: { id: v.id("typeDemarches") },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.get(args.id)) as any;
    if (!existing) throw error(ErrorCode.NOT_FOUND, "TypeDemarche non trouvé");
    const membership = await getMembership(ctx, ctx.user._id, existing.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.correspondance.configure,
    );

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// DOSSIER — CRUD
// ═════════════════════════════════════════════════════════════════════════════

/** Create a new Dossier de Procédure */
export const createDossier = authMutation({
  args: {
    orgId: v.id("orgs"),
    typeDemarcheId: v.id("typeDemarches"),
    demandeurId: v.optional(v.id("users")),
    demandeurProfileId: v.optional(v.id("profiles")),
    metadata: v.optional(v.any()),
    priorite: v.optional(v.union(
      v.literal("normal"),
      v.literal("urgent"),
      v.literal("confidentiel"),
    )),
  },
  handler: async (ctx, args) => {
    const effectiveDemandeurId = args.demandeurId ?? ctx.user._id;

    // RBAC : bypass pour un citoyen qui crée son propre dossier ; sinon
    // exiger TaskCode.correspondance.create sur l'org porteuse.
    const isSelfCitizen =
      effectiveDemandeurId === ctx.user._id &&
      (await isPublicUser(ctx, ctx.user._id));
    if (!isSelfCitizen) {
      const membership = await getMembership(ctx, ctx.user._id, args.orgId);
      await assertCanDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.correspondance.create,
      );
    }

    const now = Date.now();

    // Load TypeDemarche config
    const typeDemarche = await ctx.db.get(args.typeDemarcheId) as any;
    if (!typeDemarche || !typeDemarche.isActive) {
      throw new Error("TypeDemarche not found or inactive");
    }

    // Get org for reference generation
    const org = await ctx.db.get(args.orgId) as any;
    const orgCode = org?.slug ?? "ORG";

    // Generate reference from pattern
    const counterName = `dossier_${args.orgId}_${typeDemarche.code}_${new Date().getFullYear()}`;
    const seq = await nextCounter(ctx, counterName);
    const reference = generateReferenceFromPattern(
      typeDemarche.referencePattern,
      typeDemarche.code,
      orgCode,
      seq,
    );

    // Find the first step
    const sortedSteps = [...typeDemarche.etapesParcours].sort(
      (a: any, b: any) => a.ordre - b.ordre,
    );
    const firstStep = sortedSteps[0];
    if (!firstStep) {
      throw new Error("TypeDemarche has no steps defined");
    }

    // Compute deadline
    const dateLimite = typeDemarche.delaiGlobalJours
      ? now + typeDemarche.delaiGlobalJours * 86400000
      : undefined;

    // Create the dossier
    const dossierId = await ctx.db.insert("dossierProcedures", {
      orgId: args.orgId,
      typeDemarcheId: args.typeDemarcheId,
      createdBy: ctx.user._id,
      demandeurId: args.demandeurId ?? ctx.user._id,
      demandeurProfileId: args.demandeurProfileId,
      reference,
      status: "brouillon",
      etapeCouranteCode: firstStep.code,
      etapeCouranteOrdre: firstStep.ordre,
      organismeActuelId: firstStep.organismeId ?? args.orgId,
      confidentialite: typeDemarche.confidentialite,
      priorite: args.priorite ?? "normal",
      dateDepot: now,
      dateLimite,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    // Create dossierPieces for all required pieces
    for (const piece of typeDemarche.piecesRequises) {
      await ctx.db.insert("dossierPieces", {
        dossierId,
        pieceCode: piece.code,
        label: piece.label,
        status: "manquant",
        required: piece.required,
        fournisseur: piece.fournisseur,
        fournisseurOrgId: piece.fournisseurOrgId,
        updatedAt: now,
      });
    }

    // Log creation in journal
    await logJournal(ctx, dossierId, "DOSSIER_CREATED", {
      typeDemarche: typeDemarche.code,
      reference,
      demandeurId: args.demandeurId ?? ctx.user._id,
    });

    // Log initial transition
    await ctx.db.insert("dossierTransitions", {
      dossierId,
      etapeDepart: "",
      etapeArrivee: firstStep.code,
      action: "creer",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      organismeDestId: firstStep.organismeId ?? args.orgId,
      commentaire: "Dossier créé",
      createdAt: now,
    });

    return dossierId;
  },
});

/** Get a full dossier with pieces and current step info */
export const getDossier = authQuery({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const dossier = await ctx.db.get(args.dossierId) as any;
    if (!dossier || dossier.deletedAt) return null;

    // Vérifier l'accès : owner (citoyen) ou membership dans l'org porteuse.
    // Un membre de l'org avec correspondance.view peut consulter ; un
    // citoyen ne peut lire que son propre dossier.
    if (!(await canReadDossier(ctx, dossier))) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas accès à ce dossier",
      );
    }

    // Get pieces with storage URLs
    const pieces = await ctx.db
      .query("dossierPieces")
      .withIndex("by_dossier", (q: any) => q.eq("dossierId", args.dossierId))
      .collect();

    const piecesWithUrls = await Promise.all(
      pieces.map(async (p: any) => ({
        ...p,
        url: p.storageId ? await ctx.storage.getUrl(p.storageId) : null,
      })),
    );

    // Get TypeDemarche for step info
    const typeDemarche = await ctx.db.get(dossier.typeDemarcheId) as any;

    // Get demandeur info
    const demandeur = await ctx.db.get(dossier.demandeurId) as any;

    // Get agent info
    const agent = dossier.agentTraitantId
      ? await ctx.db.get(dossier.agentTraitantId) as any
      : null;

    return {
      ...dossier,
      pieces: piecesWithUrls,
      typeDemarche: typeDemarche
        ? {
            code: typeDemarche.code,
            label: typeDemarche.label,
            category: typeDemarche.category,
            etapesParcours: typeDemarche.etapesParcours,
            piecesRequises: typeDemarche.piecesRequises,
          }
        : null,
      demandeur: demandeur
        ? { name: demandeur.name, email: demandeur.email }
        : null,
      agentTraitant: agent
        ? { name: agent.name, email: agent.email }
        : null,
    };
  },
});

/** List dossiers for an org with filters */
export const listDossiers = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(dossierStatusValidator),
    typeDemarcheId: v.optional(v.id("typeDemarches")),
    agentTraitantId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // RBAC : exige `correspondance.view` dans l'org cible.
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.correspondance.view,
    );

    let items;

    if (args.status) {
      items = await ctx.db
        .query("dossierProcedures")
        .withIndex("by_org_status", (q: any) =>
          q.eq("orgId", args.orgId).eq("status", args.status),
        )
        .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
        .collect();
    } else {
      items = await ctx.db
        .query("dossierProcedures")
        .withIndex("by_org_deleted", (q: any) =>
          q.eq("orgId", args.orgId).eq("deletedAt", undefined),
        )
        .collect();
    }

    if (args.typeDemarcheId) {
      items = items.filter((d: any) => d.typeDemarcheId === args.typeDemarcheId);
    }
    if (args.agentTraitantId) {
      items = items.filter((d: any) => d.agentTraitantId === args.agentTraitantId);
    }

    // Enrich with type labels
    const enriched = await Promise.all(
      items.map(async (d: any) => {
        const td = await ctx.db.get(d.typeDemarcheId) as any;
        const demandeur = await ctx.db.get(d.demandeurId) as any;
        return {
          ...d,
          typeLabel: td?.label ?? { fr: "?" },
          typeCode: td?.code ?? "?",
          demandeurName: demandeur?.name ?? demandeur?.email ?? "?",
        };
      }),
    );

    return enriched;
  },
});

/** List dossiers for current user (citizen view) */
export const listMyDossiers = authQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("dossierProcedures")
      .withIndex("by_demandeur", (q: any) =>
        q.eq("demandeurId", ctx.user._id),
      )
      .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const enriched = await Promise.all(
      items.map(async (d: any) => {
        const td = await ctx.db.get(d.typeDemarcheId) as any;
        return {
          ...d,
          typeLabel: td?.label ?? { fr: "?" },
          typeCode: td?.code ?? "?",
          etapeLabel: td?.etapesParcours?.find(
            (e: any) => e.code === d.etapeCouranteCode,
          )?.label ?? { fr: "?" },
        };
      }),
    );

    return enriched;
  },
});

/** Soft-delete a dossier (brouillon only) */
export const deleteDossier = authMutation({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const dossier = await ctx.db.get(args.dossierId) as any;
    if (!dossier) throw new Error("Dossier not found");
    if (dossier.status !== "brouillon") {
      throw new Error("Can only delete dossiers in brouillon status");
    }
    // Un citoyen peut supprimer son propre brouillon ; un agent nécessite admin.
    await assertDossierTask(
      ctx,
      dossier,
      TaskCode.correspondance.admin,
      { allowOwner: true },
    );
    await ctx.db.patch(args.dossierId, { deletedAt: Date.now() });
    await logJournal(ctx, args.dossierId, "DOSSIER_DELETED");
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PIECES — Upload, Validate, Reject
// ═════════════════════════════════════════════════════════════════════════════

/** Upload a piece (document) for a dossier */
export const uploadPiece = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    pieceCode: v.string(),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) throw error(ErrorCode.NOT_FOUND, "Dossier non trouvé");
    // Citoyen propriétaire OU agent avec correspondance.create.
    await assertDossierTask(
      ctx,
      dossier,
      TaskCode.correspondance.create,
      { allowOwner: true },
    );

    const now = Date.now();

    const piece = await ctx.db
      .query("dossierPieces")
      .withIndex("by_dossier", (q: any) => q.eq("dossierId", args.dossierId))
      .filter((q: any) => q.eq(q.field("pieceCode"), args.pieceCode))
      .first();

    if (!piece) throw new Error(`Piece "${args.pieceCode}" not found for this dossier`);

    await ctx.db.patch(piece._id, {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      status: "fourni",
      uploadedAt: now,
      updatedAt: now,
    });

    await logJournal(ctx, args.dossierId, "PIECE_UPLOADED", {
      pieceCode: args.pieceCode,
      filename: args.filename,
    });
  },
});

/** Validate a piece */
export const validatePiece = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    pieceCode: v.string(),
    commentaire: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) throw error(ErrorCode.NOT_FOUND, "Dossier non trouvé");
    // Validation = agent validateur uniquement (correspondance.approve).
    await assertDossierTask(ctx, dossier, TaskCode.correspondance.approve);

    const now = Date.now();

    const piece = await ctx.db
      .query("dossierPieces")
      .withIndex("by_dossier", (q: any) => q.eq("dossierId", args.dossierId))
      .filter((q: any) => q.eq(q.field("pieceCode"), args.pieceCode))
      .first();

    if (!piece) throw new Error("Piece not found");
    if (piece.status !== "fourni") {
      throw new Error("Can only validate a piece with status 'fourni'");
    }

    await ctx.db.patch(piece._id, {
      status: "valide",
      validatedBy: ctx.user._id,
      validatedAt: now,
      updatedAt: now,
    });

    await logJournal(ctx, args.dossierId, "PIECE_VALIDATED", {
      pieceCode: args.pieceCode,
      commentaire: args.commentaire,
    });
  },
});

/** Reject a piece */
export const rejectPiece = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    pieceCode: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) throw error(ErrorCode.NOT_FOUND, "Dossier non trouvé");
    await assertDossierTask(ctx, dossier, TaskCode.correspondance.approve);

    const now = Date.now();

    const piece = await ctx.db
      .query("dossierPieces")
      .withIndex("by_dossier", (q: any) => q.eq("dossierId", args.dossierId))
      .filter((q: any) => q.eq(q.field("pieceCode"), args.pieceCode))
      .first();

    if (!piece) throw new Error("Piece not found");

    await ctx.db.patch(piece._id, {
      status: "rejete",
      rejectionReason: args.reason,
      validatedBy: ctx.user._id,
      validatedAt: now,
      updatedAt: now,
    });

    await logJournal(ctx, args.dossierId, "PIECE_REJECTED", {
      pieceCode: args.pieceCode,
      reason: args.reason,
    });
  },
});

/** List pieces for a dossier with storage URLs */
export const listPieces = authQuery({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) return [];
    if (!(await canReadDossier(ctx, dossier))) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas accès à ce dossier",
      );
    }

    const pieces = await ctx.db
      .query("dossierPieces")
      .withIndex("by_dossier", (q: any) => q.eq("dossierId", args.dossierId))
      .collect();

    return await Promise.all(
      pieces.map(async (p: any) => ({
        ...p,
        url: p.storageId ? await ctx.storage.getUrl(p.storageId) : null,
      })),
    );
  },
});

/** Generate a storage upload URL (for piece upload) */
export const generateUploadUrl = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW ENGINE
// ═════════════════════════════════════════════════════════════════════════════

/** Submit a brouillon dossier to start the workflow */
export const submitDossier = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    commentaire: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dossier = await ctx.db.get(args.dossierId) as any;
    if (!dossier) throw new Error("Dossier not found");
    if (dossier.status !== "brouillon") {
      throw new Error("Can only submit a dossier in brouillon status");
    }

    // Le demandeur citoyen peut soumettre son propre dossier ;
    // un agent nécessite correspondance.create.
    await assertDossierTask(
      ctx,
      dossier,
      TaskCode.correspondance.create,
      { allowOwner: true },
    );

    await ctx.db.patch(args.dossierId, {
      status: "en_cours",
      updatedAt: now,
    });

    await ctx.db.insert("dossierTransitions", {
      dossierId: args.dossierId,
      etapeDepart: dossier.etapeCouranteCode,
      etapeArrivee: dossier.etapeCouranteCode,
      action: "soumettre",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      organismeSourceId: dossier.organismeActuelId,
      commentaire: args.commentaire ?? "Dossier soumis",
      createdAt: now,
    });

    await logJournal(ctx, args.dossierId, "DOSSIER_SUBMITTED", {
      etape: dossier.etapeCouranteCode,
    });
  },
});

/**
 * Advance the dossier to the next step.
 * Core workflow engine: validates action, creates transit copy, moves to next step.
 *
 * **Règle métier 2** (spec §9) : Transmission bloquée si pièces obligatoires
 * manquantes, sauf dérogation d'un administrateur via `forceIncomplete: true`
 * (qui exige `TaskCode.correspondance.admin`).
 */
export const advanceStep = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    action: transitionActionValidator,
    commentaire: v.optional(v.string()),
    targetOrganismeId: v.optional(v.id("orgs")),
    /** Si true, bypass la check de pièces obligatoires. Réservé admin. */
    forceIncomplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dossier = await ctx.db.get(args.dossierId) as any;
    if (!dossier) throw new Error("Dossier not found");

    if (!["en_cours", "en_attente"].includes(dossier.status)) {
      throw new Error(`Cannot advance dossier in status "${dossier.status}"`);
    }

    // RBAC : chaque type d'action exige un TaskCode spécifique (spec §3.2).
    // Les actions de transition sont **toujours** réservées aux agents — un
    // citoyen ne peut pas `valider`, `transmettre`, etc.
    const taskForAction: Record<string, TaskCodeValue> = {
      transmettre: TaskCode.correspondance.transmit,
      valider: TaskCode.correspondance.approve,
      signer: TaskCode.correspondance.sign,
      rejeter: TaskCode.correspondance.approve,
      retourner: TaskCode.correspondance.approve,
      suspendre: TaskCode.correspondance.supervise,
      reprendre: TaskCode.correspondance.supervise,
      clore: TaskCode.correspondance.admin,
      archiver: TaskCode.correspondance.admin,
      commenter: TaskCode.correspondance.view,
      // creer/soumettre ne devraient pas passer par advanceStep mais par
      // createDossier/submitDossier — on les mappe sur create par sécurité.
      creer: TaskCode.correspondance.create,
      soumettre: TaskCode.correspondance.create,
    };
    const requiredTask =
      taskForAction[args.action] ?? TaskCode.correspondance.transmit;
    await assertDossierTask(ctx, dossier, requiredTask);

    // Load TypeDemarche to get workflow config
    const typeDemarche = await ctx.db.get(dossier.typeDemarcheId) as any;
    if (!typeDemarche) throw new Error("TypeDemarche not found");

    const sortedSteps = [...typeDemarche.etapesParcours].sort(
      (a: any, b: any) => a.ordre - b.ordre,
    );
    const currentStepIdx = sortedSteps.findIndex(
      (s: any) => s.code === dossier.etapeCouranteCode,
    );
    if (currentStepIdx === -1) throw new Error("Current step not found in parcours");

    const currentStep = sortedSteps[currentStepIdx];

    // Validate the action is allowed at this step
    if (!currentStep.actionsAutorisees.includes(args.action)) {
      throw new Error(
        `Action "${args.action}" is not allowed at step "${currentStep.code}". Allowed: ${currentStep.actionsAutorisees.join(", ")}`,
      );
    }

    // **Règle métier 2** : pour `transmettre` ou `valider`, vérifier que
    // toutes les pièces obligatoires sont présentes (status "fourni" ou
    // "valide"). Un admin peut déroger via `forceIncomplete: true`.
    if (args.action === "transmettre" || args.action === "valider") {
      const requiredPieces = typeDemarche.piecesRequises.filter(
        (p: any) => p.required,
      );
      if (requiredPieces.length > 0) {
        if (args.forceIncomplete) {
          // Dérogation admin — exiger correspondance.admin.
          await assertDossierTask(
            ctx,
            dossier,
            TaskCode.correspondance.admin,
          );
        } else {
          const pieces = await ctx.db
            .query("dossierPieces")
            .withIndex("by_dossier", (q: any) =>
              q.eq("dossierId", args.dossierId),
            )
            .collect();
          const missing: string[] = [];
          for (const required of requiredPieces) {
            const found = pieces.find(
              (p: any) =>
                p.pieceCode === required.code &&
                (p.status === "fourni" || p.status === "valide"),
            );
            if (!found) {
              missing.push(required.label?.fr ?? required.code);
            }
          }
          if (missing.length > 0) {
            throw error(
              ErrorCode.INVALID_ARGUMENT,
              `Pièce${missing.length > 1 ? "s" : ""} obligatoire${missing.length > 1 ? "s" : ""} manquante${missing.length > 1 ? "s" : ""} : ${missing.join(", ")}. Complétez le dossier avant transmission.`,
            );
          }
        }
      }
    }

    // Handle different actions
    if (args.action === "transmettre" || args.action === "valider") {
      // Create a passage copy for the current org
      if (dossier.organismeActuelId) {
        await ctx.db.insert("copiesPassage", {
          dossierId: args.dossierId,
          organismeId: dossier.organismeActuelId,
          etapeCode: dossier.etapeCouranteCode,
          agentId: ctx.user._id,
          droitsCopie: true,
          droitsImpression: true,
          marque: `COPIE — Passage le ${new Date(now).toLocaleDateString("fr-FR")}`,
          createdAt: now,
        });
      }

      // Move to next step
      const nextStepIdx = currentStepIdx + 1;
      if (nextStepIdx >= sortedSteps.length) {
        // Final step — close the dossier
        await ctx.db.patch(args.dossierId, {
          status: "valide",
          dateValidation: now,
          updatedAt: now,
        });

        await ctx.db.insert("dossierTransitions", {
          dossierId: args.dossierId,
          etapeDepart: currentStep.code,
          action: args.action,
          actorId: ctx.user._id,
          actorName: ctx.user.name ?? ctx.user.email,
          organismeSourceId: dossier.organismeActuelId,
          commentaire: args.commentaire ?? "Dossier validé — dernière étape",
          createdAt: now,
        });

        await logJournal(ctx, args.dossierId, "DOSSIER_VALIDATED", {
          etapeFinale: currentStep.code,
        });
      } else {
        const nextStep = sortedSteps[nextStepIdx];
        const nextOrgId = args.targetOrganismeId ?? nextStep.organismeId ?? dossier.orgId;

        await ctx.db.patch(args.dossierId, {
          etapeCouranteCode: nextStep.code,
          etapeCouranteOrdre: nextStep.ordre,
          organismeActuelId: nextOrgId,
          agentTraitantId: undefined,
          updatedAt: now,
          dateLimite: nextStep.delaiJours
            ? now + nextStep.delaiJours * 86400000
            : dossier.dateLimite,
        });

        await ctx.db.insert("dossierTransitions", {
          dossierId: args.dossierId,
          etapeDepart: currentStep.code,
          etapeArrivee: nextStep.code,
          action: args.action,
          actorId: ctx.user._id,
          actorName: ctx.user.name ?? ctx.user.email,
          organismeSourceId: dossier.organismeActuelId,
          organismeDestId: nextOrgId,
          commentaire: args.commentaire,
          createdAt: now,
        });

        await logJournal(ctx, args.dossierId, "STEP_ADVANCED", {
          from: currentStep.code,
          to: nextStep.code,
          action: args.action,
        });
      }
    } else if (args.action === "rejeter") {
      await ctx.db.patch(args.dossierId, {
        status: "rejete",
        updatedAt: now,
      });

      await ctx.db.insert("dossierTransitions", {
        dossierId: args.dossierId,
        etapeDepart: currentStep.code,
        action: "rejeter",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        organismeSourceId: dossier.organismeActuelId,
        commentaire: args.commentaire ?? "Dossier rejeté",
        createdAt: now,
      });

      await logJournal(ctx, args.dossierId, "DOSSIER_REJECTED", {
        etape: currentStep.code,
        reason: args.commentaire,
      });
    } else if (args.action === "retourner") {
      // Return to previous step
      const prevStepIdx = Math.max(0, currentStepIdx - 1);
      const prevStep = sortedSteps[prevStepIdx];

      await ctx.db.patch(args.dossierId, {
        etapeCouranteCode: prevStep.code,
        etapeCouranteOrdre: prevStep.ordre,
        organismeActuelId: prevStep.organismeId ?? dossier.orgId,
        status: "en_cours",
        updatedAt: now,
      });

      await ctx.db.insert("dossierTransitions", {
        dossierId: args.dossierId,
        etapeDepart: currentStep.code,
        etapeArrivee: prevStep.code,
        action: "retourner",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        organismeSourceId: dossier.organismeActuelId,
        organismeDestId: prevStep.organismeId ?? dossier.orgId,
        commentaire: args.commentaire ?? "Renvoyé à l'étape précédente",
        createdAt: now,
      });

      await logJournal(ctx, args.dossierId, "STEP_RETURNED", {
        from: currentStep.code,
        to: prevStep.code,
        reason: args.commentaire,
      });
    } else if (args.action === "suspendre") {
      await ctx.db.patch(args.dossierId, {
        status: "suspendu",
        updatedAt: now,
      });

      await ctx.db.insert("dossierTransitions", {
        dossierId: args.dossierId,
        etapeDepart: currentStep.code,
        action: "suspendre",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        commentaire: args.commentaire,
        createdAt: now,
      });

      await logJournal(ctx, args.dossierId, "DOSSIER_SUSPENDED", {
        etape: currentStep.code,
        reason: args.commentaire,
      });
    } else if (args.action === "reprendre") {
      await ctx.db.patch(args.dossierId, {
        status: "en_cours",
        updatedAt: now,
      });

      await ctx.db.insert("dossierTransitions", {
        dossierId: args.dossierId,
        etapeDepart: currentStep.code,
        etapeArrivee: currentStep.code,
        action: "reprendre",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        commentaire: args.commentaire,
        createdAt: now,
      });

      await logJournal(ctx, args.dossierId, "DOSSIER_RESUMED", {
        etape: currentStep.code,
      });
    }
  },
});

/** Close a dossier administratively */
export const closeDossier = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    commentaire: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dossier = await ctx.db.get(args.dossierId) as any;
    if (!dossier) throw new Error("Dossier not found");

    // Clôture = admin procédure uniquement (règle spec §3.2 « Arrêter le
    // processus = administrateur de procédure uniquement »).
    await assertDossierTask(ctx, dossier, TaskCode.correspondance.admin);

    // **Règle métier 7** : la clôture est irréversible. Bloquer toute
    // tentative de re-clôture ou de re-patch d'un dossier déjà clos/archivé.
    if (["clos", "archive"].includes(dossier.status)) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Dossier déjà clôturé — la clôture est irréversible",
      );
    }

    await ctx.db.patch(args.dossierId, {
      status: "clos",
      dateCloture: now,
      updatedAt: now,
    });

    await ctx.db.insert("dossierTransitions", {
      dossierId: args.dossierId,
      etapeDepart: dossier.etapeCouranteCode,
      action: "clore",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      commentaire: args.commentaire ?? "Dossier clôturé",
      createdAt: now,
    });

    await logJournal(ctx, args.dossierId, "DOSSIER_CLOSED", {
      reason: args.commentaire,
    });
  },
});

/** Archive a validated/closed dossier */
export const archiveDossier = authMutation({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dossier = await ctx.db.get(args.dossierId) as any;
    if (!dossier) throw new Error("Dossier not found");

    await assertDossierTask(ctx, dossier, TaskCode.correspondance.admin);

    // Guard anti-double-archivage : la transition est irréversible.
    if (dossier.status === "archive") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Dossier déjà archivé",
      );
    }
    if (!["valide", "clos", "rejete"].includes(dossier.status)) {
      throw new Error("Can only archive validated, closed, or rejected dossiers");
    }

    await ctx.db.patch(args.dossierId, {
      status: "archive",
      updatedAt: now,
    });

    await logJournal(ctx, args.dossierId, "DOSSIER_ARCHIVED");
  },
});

/** Assign an agent to handle the dossier at current step */
export const assignAgent = authMutation({
  args: {
    dossierId: v.id("dossierProcedures"),
    agentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) throw error(ErrorCode.NOT_FOUND, "Dossier non trouvé");
    // Assigner un agent = rôle superviseur (règle spec §3.2).
    await assertDossierTask(ctx, dossier, TaskCode.correspondance.supervise);

    const agent = await ctx.db.get(args.agentId) as any;

    await ctx.db.patch(args.dossierId, {
      agentTraitantId: args.agentId,
      updatedAt: Date.now(),
    });

    await logJournal(ctx, args.dossierId, "AGENT_ASSIGNED", {
      agentId: args.agentId,
      agentName: agent?.name ?? agent?.email,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL & HISTORY
// ═════════════════════════════════════════════════════════════════════════════

/** Get full audit journal for a dossier */
export const getJournal = authQuery({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) return [];
    if (!(await canReadDossier(ctx, dossier))) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas accès au journal de ce dossier",
      );
    }
    return await ctx.db
      .query("journalActions")
      .withIndex("by_dossier_created", (q: any) =>
        q.eq("dossierId", args.dossierId),
      )
      .order("asc")
      .collect();
  },
});

/** Get workflow transitions for a dossier */
export const getTransitions = authQuery({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) return [];
    if (!(await canReadDossier(ctx, dossier))) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas accès à l'historique de ce dossier",
      );
    }
    return await ctx.db
      .query("dossierTransitions")
      .withIndex("by_dossier_created", (q: any) =>
        q.eq("dossierId", args.dossierId),
      )
      .order("asc")
      .collect();
  },
});

/** Get passage copies for a dossier */
export const getCopiesPassage = authQuery({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("copiesPassage")
      .withIndex("by_dossier", (q: any) => q.eq("dossierId", args.dossierId))
      .collect();
  },
});

/** Get passage copies visible to an org (their read-only archive) */
export const getCopiesForOrg = authQuery({
  args: { organismeId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Exige un membership dans l'org avec correspondance.view.
    const membership = await getMembership(
      ctx,
      ctx.user._id,
      args.organismeId,
    );
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.correspondance.view,
    );

    const copies = await ctx.db
      .query("copiesPassage")
      .withIndex("by_organisme", (q: any) =>
        q.eq("organismeId", args.organismeId),
      )
      .collect();

    // Enrich with dossier info
    return await Promise.all(
      copies.map(async (c: any) => {
        const dossier = await ctx.db.get(c.dossierId) as any;
        return {
          ...c,
          dossierReference: dossier?.reference ?? "?",
          dossierStatus: dossier?.status ?? "?",
        };
      }),
    );
  },
});

/**
 * **Règle métier 9** (spec §9) : toute consultation d'un dossier
 * confidentiel ou secret doit être tracée dans le journal d'audit.
 *
 * Les queries Convex sont réactives et pures (pas de side-effects). Le
 * frontend appelle donc cette mutation explicitement lors du mount d'une
 * page détail quand `dossier.confidentialite` est "confidentiel" ou
 * "secret". Pour un dossier standard, rien n'est loggé (no-op silencieux).
 *
 * Pattern côté client :
 * ```ts
 * useEffect(() => {
 *   if (dossier && ["confidentiel", "secret"].includes(dossier.confidentialite)) {
 *     logDossierView({ dossierId: dossier._id }).catch(() => {});
 *   }
 * }, [dossier?._id, dossier?.confidentialite]);
 * ```
 */
export const logDossierView = authMutation({
  args: { dossierId: v.id("dossierProcedures") },
  handler: async (ctx, args) => {
    const dossier = (await ctx.db.get(args.dossierId)) as any;
    if (!dossier) return;

    // Pas de log pour les dossiers standards — seule la consultation des
    // dossiers sensibles est auditée (règle 9).
    if (!["confidentiel", "secret"].includes(dossier.confidentialite)) return;

    // Vérifier d'abord que l'utilisateur a bien accès — on ne logge pas
    // un accès illégitime, on le rejette.
    if (!(await canReadDossier(ctx, dossier))) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas accès à ce dossier",
      );
    }

    await logJournal(ctx, args.dossierId, "DOSSIER_VIEWED", {
      confidentialite: dossier.confidentialite,
      reference: dossier.reference,
    });
  },
});
