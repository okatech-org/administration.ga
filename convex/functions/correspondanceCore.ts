/**
 * iCorrespondance — Fonctions refondues (Core)
 *
 * Implémente la logique métier réelle de la correspondance diplomatique :
 * - La correspondance est un DOSSIER qui se DÉPLACE
 * - L'original part au destinataire, l'expéditeur conserve une COPIE
 * - 3 espaces exclusifs : Brouillons / Envoyés / Reçus
 * - Chaîne d'approbation hiérarchique multi-niveaux
 * - Suivi côté expéditeur (recipientStatus)
 *
 * Ce fichier REMPLACE progressivement les fonctions de correspondance.ts
 */

import { type Infer, v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  correspondanceTypeValidator,
  correspondancePriorityValidator,
  correspondanceStatusValidator,
  recipientStatusValidator,
  correspondanceDocumentValidator,
  returnedCategoryValidator,
} from "../schemas/correspondance";
import {
  MailFolder,
  MailOwnerType,
  MailSenderType,
  MailType,
} from "../lib/constants";
import {
  requireCorrespondanceAccess,
  generateSequentialReference,
  generateArrivalReference,
  generateDepartureReference,
  assertConfidentialityClearance,
  filterByConfidentialityClearance,
  buildCorrespondanceSearchText,
} from "../lib/correspondanceHelpers";
import { isSuperAdmin } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";

// ═════════════════════════════════════════════════════════════════════════════
// ESPACES DE TRAVAIL — Requêtes par espace exclusif
// ═════════════════════════════════════════════════════════════════════════════

/**
 * BROUILLONS — Correspondances en cours de rédaction.
 * Condition : copyOwnerOrgId == myOrg AND isCopy != true AND status == "draft"
 */
export const getBrouillons = authQuery({
  args: {
    orgId: v.id("orgs"),
    filterStatus: v.optional(v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("rejected"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const max = args.limit ?? 100;
    const items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_status", (q) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("status", args.filterStatus ?? "draft"),
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("isCopy"), true),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .order("desc")
      .take(max);

    // Si pas de filtre spécifique, inclure aussi pending + rejected
    if (!args.filterStatus) {
      for (const status of ["pending", "rejected"] as const) {
        const extra = await ctx.db
          .query("correspondanceItems")
          .withIndex("by_owner_org_status", (q) =>
            q.eq("copyOwnerOrgId", args.orgId).eq("status", status),
          )
          .filter((q) =>
            q.and(
              q.neq(q.field("isCopy"), true),
              q.eq(q.field("deletedAt"), undefined),
            ),
          )
          .order("desc")
          .take(max);
        items.push(...extra);
      }
    }

    const allowed = await filterByConfidentialityClearance(ctx, ctx.user, items);
    return _enrichWithUrls(ctx, allowed);
  },
});

/**
 * ENVOYÉS — Copies des correspondances expédiées (lecture seule, dossier gris).
 * Condition : copyOwnerOrgId == myOrg AND isCopy == true
 * Filtrable par recipientStatus.
 */
export const getEnvoyes = authQuery({
  args: {
    orgId: v.id("orgs"),
    recipientStatusFilter: v.optional(recipientStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const max = args.limit ?? 100;
    let items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_copy", (q) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("isCopy", true),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(max);

    if (args.recipientStatusFilter) {
      items = items.filter((i) => i.recipientStatus === args.recipientStatusFilter);
    }

    const allowed = await filterByConfidentialityClearance(ctx, ctx.user, items);
    return _enrichWithUrls(ctx, allowed);
  },
});

/**
 * REÇUS — Originaux reçus d'autres organismes.
 * Condition : copyOwnerOrgId == myOrg AND isCopy != true AND status == "received"
 */
export const getRecus = authQuery({
  args: {
    orgId: v.id("orgs"),
    filter: v.optional(v.union(
      v.literal("non_lus"),
      v.literal("non_enregistres"),
      v.literal("assignes_a_moi"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const max = args.limit ?? 100;
    let items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_status", (q) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("status", "received"),
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("isCopy"), true),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .order("desc")
      .take(max);

    if (args.filter === "non_lus") {
      const userId = ctx.user._id as string;
      items = items.filter((i) => !(i.readByIds ?? []).includes(userId));
    } else if (args.filter === "non_enregistres") {
      items = items.filter((i) => !i.arrivalReference);
    } else if (args.filter === "assignes_a_moi") {
      items = items.filter((i) => i.assignedToId === ctx.user._id);
    }

    const allowed = await filterByConfidentialityClearance(ctx, ctx.user, items);
    return _enrichWithUrls(ctx, allowed);
  },
});

/**
 * CORBEILLE — Items soft-deleted.
 */
export const getCorbeille = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");
    const max = args.limit ?? 100;
    const items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org", (q) =>
        q.eq("copyOwnerOrgId", args.orgId),
      )
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(max);

    return _enrichWithUrls(ctx, items);
  },
});

/**
 * Compteurs pour la navigation (badges).
 */
export const getEspaceCounts = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireCorrespondanceAccess(ctx, ctx.user, args.orgId, "view");

    // Cap : 500 par compteur. Au-delà, l'UI affiche "500+". Évite de charger
    // 10k rows pour calculer un badge. Compromis pragmatique en attendant
    // un agrégat serveur dédié (via Convex @convex-dev/aggregate).
    const CAP = 500;

    // ── Parallélisation : 5 queries en un round-trip ──
    const [drafts, pendings, envoyes, recus, corbeille] = await Promise.all([
      ctx.db
        .query("correspondanceItems")
        .withIndex("by_owner_org_status", (q) =>
          q.eq("copyOwnerOrgId", args.orgId).eq("status", "draft"),
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("isCopy"), true),
            q.eq(q.field("deletedAt"), undefined),
          ),
        )
        .take(CAP),
      ctx.db
        .query("correspondanceItems")
        .withIndex("by_owner_org_status", (q) =>
          q.eq("copyOwnerOrgId", args.orgId).eq("status", "pending"),
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("isCopy"), true),
            q.eq(q.field("deletedAt"), undefined),
          ),
        )
        .take(CAP),
      ctx.db
        .query("correspondanceItems")
        .withIndex("by_owner_org_copy", (q) =>
          q.eq("copyOwnerOrgId", args.orgId).eq("isCopy", true),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(CAP),
      ctx.db
        .query("correspondanceItems")
        .withIndex("by_owner_org_status", (q) =>
          q.eq("copyOwnerOrgId", args.orgId).eq("status", "received"),
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("isCopy"), true),
            q.eq(q.field("deletedAt"), undefined),
          ),
        )
        .take(CAP),
      ctx.db
        .query("correspondanceItems")
        .withIndex("by_owner_org", (q) => q.eq("copyOwnerOrgId", args.orgId))
        .filter((q) => q.neq(q.field("deletedAt"), undefined))
        .take(CAP),
    ]);

    const userId = ctx.user._id as string;
    const nonLus = recus.filter((i) => !(i.readByIds ?? []).includes(userId));

    return {
      brouillons: drafts.length + pendings.length,
      envoyes: envoyes.length,
      recus: recus.length,
      nonLus: nonLus.length,
      corbeille: corbeille.length,
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ENVOI — Le cœur du mécanisme
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Envoyer une correspondance.
 *
 * C'est l'action principale. Elle :
 * 1. Vérifie si une chaîne d'approbation est nécessaire
 * 2. Si oui → status "pending", crée les ApprovalSteps
 * 3. Si non → exécute l'envoi effectif (copie + original)
 */
export const sendCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier de correspondance introuvable");
    if (item.status !== "draft") {
      throw error(ErrorCode.VALIDATION_ERROR, "Seul un brouillon peut être envoyé");
    }

    // Contrôle d'accès org
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "transmit");

    // Vérifier les documents
    const docs = item.documents ?? [];
    if (docs.length === 0) {
      throw new Error("Un dossier de correspondance doit contenir au moins un document");
    }

    // Charger la config du type pour savoir si approbation requise
    let requiresApproval = item.requiresApproval;
    if (item.orgId) {
      const typeConfig = await ctx.db
        .query("correspondanceTypeConfigs")
        .withIndex("by_org_type", (q: any) =>
          q.eq("orgId", item.orgId).eq("typeCode", item.type),
        )
        .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
        .first();

      if (typeConfig?.workflowConfig?.requiresApproval) {
        requiresApproval = true;

        // Résoudre la chaîne d'approbation via la hiérarchie des rôles
        const chainConfig = typeConfig.workflowConfig.approvalChain ?? [];
        const autoRoute = typeConfig.workflowConfig.autoRouteByHierarchy ?? false;

        if (autoRoute || chainConfig.length > 0) {
          // Trouver le membership de l'expéditeur
          const senderMembership = await ctx.db
            .query("memberships")
            .withIndex("by_user_org_deletedAt", (q: any) =>
              q.eq("userId", ctx.user._id).eq("orgId", item.orgId).eq("deletedAt", undefined),
            )
            .first();

          const senderPosition = senderMembership?.positionId
            ? await ctx.db.get(senderMembership.positionId)
            : null;
          const senderGrade = (senderPosition as any)?.grade ?? "agent";

          // Hiérarchie des grades (du plus bas au plus haut)
          const gradeOrder = ["external", "agent", "secretary", "counselor", "deputy_chief", "chief"];
          const senderGradeIndex = gradeOrder.indexOf(senderGrade);

          // Trouver les positions supérieures dans l'org
          const allPositions = await ctx.db
            .query("positions")
            .withIndex("by_org", (q: any) => q.eq("orgId", item.orgId).eq("isActive", true))
            .collect();

          // Filtrer les positions de grade supérieur
          const superiorPositions = allPositions
            .filter((p: any) => {
              const pGradeIndex = gradeOrder.indexOf(p.grade ?? "agent");
              return pGradeIndex > senderGradeIndex;
            })
            .sort((a: any, b: any) => {
              return gradeOrder.indexOf(a.grade ?? "agent") - gradeOrder.indexOf(b.grade ?? "agent");
            });

          // Trouver les occupants de ces positions pour construire la chaîne
          const resolvedChain: Array<{ approverId: any; approverName: string; approverRole: string; ordre: number }> = [];

          for (let i = 0; i < superiorPositions.length; i++) {
            const sup = superiorPositions[i] as any;

            // Vérifier la condition (si la chaîne a des conditions)
            if (chainConfig.length > 0) {
              // La position supérieure doit correspondre à au moins une règle
              const matchingRule = chainConfig.find((rule: any) => {
                // Le grade de cette position doit être >= au roleMinimum de la règle
                const meetsMinimumGrade = gradeOrder.indexOf(sup.grade ?? "agent") >= gradeOrder.indexOf(rule.roleMinimum);
                if (!meetsMinimumGrade) return false;

                // Vérifier la condition d'activation
                if (rule.conditionType === "always") return true;
                if (rule.conditionType === "if_external") {
                  // Vérifie que le destinataire est d'une org DIFFÉRENTE de l'expéditeur
                  return item.primaryRecipientOrgId && item.primaryRecipientOrgId !== item.orgId;
                }
                if (rule.conditionType === "if_recipient_rank_above") {
                  // Compare le grade du destinataire avec la valeur de condition
                  // Si pas de conditionValue, considérer comme "au-dessus de agent"
                  const thresholdGrade = rule.conditionValue ?? "agent";
                  // On ne peut pas connaître le grade du destinataire ici sans query
                  // supplémentaire. Par sécurité, si la condition est configurée,
                  // on l'active pour les destinataires externes.
                  return item.primaryRecipientOrgId && item.primaryRecipientOrgId !== item.orgId;
                }
                return false;
              });
              if (!matchingRule) continue;
            }

            // Trouver le membre qui occupe cette position
            const occupant = await ctx.db
              .query("memberships")
              .filter((q: any) =>
                q.and(
                  q.eq(q.field("orgId"), item.orgId),
                  q.eq(q.field("positionId"), sup._id),
                  q.eq(q.field("deletedAt"), undefined),
                ),
              )
              .first();

            if (occupant && occupant.userId !== ctx.user._id) {
              const user = await ctx.db.get(occupant.userId);
              resolvedChain.push({
                approverId: occupant.userId,
                approverName: user?.name ?? user?.email ?? "Supérieur",
                approverRole: sup.grade ?? "agent",
                ordre: resolvedChain.length + 1,
              });
            }
          }

          // Créer les étapes d'approbation dans la table
          if (resolvedChain.length > 0) {
            for (const step of resolvedChain) {
              await ctx.db.insert("correspondanceApprovalSteps", {
                itemId: args.itemId,
                ordre: step.ordre,
                approverId: step.approverId,
                approverName: step.approverName,
                approverRole: step.approverRole,
                status: "pending",
                createdAt: now,
              });
            }

            // Assigner le premier approbateur
            await ctx.db.patch(args.itemId, {
              currentHolderId: resolvedChain[0].approverId,
            });
          }
        }
      }
    }

    if (requiresApproval && !item.approvedById) {
      // Route vers approbation — ne pas encore envoyer
      await ctx.db.patch(args.itemId, {
        status: "pending",
        requiresApproval: true,
        updatedAt: now,
      });

      // Trouver le premier approbateur pour le log
      const firstStep = await ctx.db
        .query("correspondanceApprovalSteps")
        .withIndex("by_item_ordre", (q: any) => q.eq("itemId", args.itemId).eq("ordre", 1))
        .first();

      const firstApprover = firstStep ? await ctx.db.get(firstStep.approverId) : null;

      await ctx.db.insert("correspondanceWorkflowSteps", {
        itemId: args.itemId,
        stepType: "SENT_FOR_APPROVAL",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        targetId: firstStep?.approverId,
        targetName: firstApprover?.name ?? firstApprover?.email ?? "Approbateur",
        comment: `Soumis pour approbation hiérarchique`,
        isRead: false,
        createdAt: now,
      });

      return { status: "pending_approval", itemId: args.itemId };
    }

    // Envoi effectif
    return await _executeEnvoi(ctx, args.itemId, item, now);
  },
});

/**
 * Exécution effective de l'envoi :
 * 1. L'item source devient la COPIE (isCopy=true, status=sent)
 * 2. Un ORIGINAL est créé chez le destinataire (isCopy=false, status=received)
 */
async function _executeEnvoi(
  ctx: MutationCtx & { user: Doc<"users"> },
  itemId: Id<"correspondanceItems">,
  item: Doc<"correspondanceItems">,
  now: number,
) {
  // Créer l'ORIGINAL chez le destinataire
  const recipientOrgId = item.primaryRecipientOrgId ?? item.orgId;

  const originalId = await ctx.db.insert("correspondanceItems", {
    orgId: recipientOrgId,
    copyOwnerOrgId: recipientOrgId,
    isCopy: false,
    createdBy: item.createdBy,
    reference: item.reference,
    title: item.title,
    type: item.type,
    priority: item.priority,
    status: "received",
    direction: "incoming",
    senderName: item.senderName,
    senderOrg: item.senderOrg,
    senderEmail: item.senderEmail,
    senderUserId: item.senderUserId,
    recipientName: item.recipientName,
    recipientOrg: item.recipientOrg,
    recipientEmail: item.recipientEmail,
    primaryRecipientId: item.primaryRecipientId,
    primaryRecipientOrgId: item.primaryRecipientOrgId,
    comment: item.comment,
    tags: item.tags ?? [],
    requiresApproval: false,
    documents: (item.documents ?? []).map((d: any) => ({
      ...d,
      copyWatermark: false,
    })),
    confidentialite: item.confidentialite ?? "standard",
    parentItemId: item.parentItemId,
    dateReponseAttendue: item.dateReponseAttendue,
    readByIds: [],
    searchText: buildCorrespondanceSearchText({
      title: item.title,
      reference: item.reference,
      senderName: item.senderName,
      senderOrg: item.senderOrg,
      recipientName: item.recipientName,
      recipientOrg: item.recipientOrg,
      comment: item.comment,
      tags: item.tags,
    }),
    createdAt: now,
    updatedAt: now,
  });

  // Générer le numéro de registre de départ
  const departureRef = await generateDepartureReference(ctx, item.copyOwnerOrgId ?? item.orgId);

  // Transformer l'item source en COPIE chez l'expéditeur
  await ctx.db.patch(itemId, {
    isCopy: true,
    status: "sent",
    sentAt: now,
    copyOwnerOrgId: item.copyOwnerOrgId ?? item.orgId,
    originalItemId: originalId,
    recipientStatus: "en_transit",
    recipientStatusUpdatedAt: now,
    // Marquer les documents comme copies avec filigrane
    documents: (item.documents ?? []).map((d: any) => ({
      ...d,
      copyWatermark: true,
    })),
    updatedAt: now,
  });

  // Dupliquer les destinataires pour l'original
  const recipients = await ctx.db
    .query("correspondanceRecipients")
    .withIndex("by_item", (q: any) => q.eq("itemId", itemId))
    .collect();
  for (const r of recipients) {
    await ctx.db.insert("correspondanceRecipients", {
      itemId: originalId,
      userId: r.userId,
      orgId: r.orgId,
      role: r.role,
      name: r.name,
      email: r.email,
      positionTitle: r.positionTitle,
      orgName: r.orgName,
      createdAt: now,
    });
  }

  // Log workflow sur la copie
  await ctx.db.insert("correspondanceWorkflowSteps", {
    itemId: itemId,
    stepType: "SENT_EMAIL",
    actorId: ctx.user._id,
    actorName: ctx.user.name ?? ctx.user.email,
    comment: `Correspondance envoyée à ${item.recipientName} (Réf. départ : ${departureRef})`,
    isRead: true,
    createdAt: now,
  });

  // Log workflow sur l'original
  await ctx.db.insert("correspondanceWorkflowSteps", {
    itemId: originalId,
    stepType: "CREATED",
    actorId: ctx.user._id,
    actorName: ctx.user.name ?? ctx.user.email,
    comment: `Correspondance reçue de ${item.senderName}`,
    isRead: false,
    createdAt: now,
  });

  // Envoyer une notification email si le destinataire a un email
  // et que c'est un envoi vers une org externe
  if (item.recipientEmail && item.primaryRecipientOrgId !== item.orgId) {
    await ctx.scheduler.runAfter(
      0,
      internal.functions.correspondanceEmail.sendCorrespondanceEmail,
      {
        recipientEmail: item.recipientEmail,
        reference: item.reference,
        title: item.title,
        type: item.type,
        priority: item.priority,
        senderName: item.senderName,
        senderOrg: item.senderOrg ?? "",
        recipientName: item.recipientName,
        comment: item.comment,
        hasAttachments: (item.documents ?? []).length > 0,
        attachmentCount: (item.documents ?? []).length,
        itemId: originalId,
      },
    );
  }

  // Cross-module : créer une entrée iBoîte côté destinataire pour unifier le
  // badge non-lu de l'agent. Le clic sur cette entrée redirigera vers
  // /icorrespondance/<originalId> (ctx `threadId` porte l'itemId).
  if (item.primaryRecipientOrgId && item.primaryRecipientOrgId !== item.orgId) {
    const previewText = item.comment
      ? item.comment.slice(0, 200)
      : `Nouvelle correspondance reçue (${item.type})`;
    await ctx.db.insert("digitalMail", {
      userId: ctx.user._id,
      ownerId: item.primaryRecipientOrgId,
      ownerType: MailOwnerType.Organization,
      type: MailType.Letter,
      folder: MailFolder.Inbox,
      sender: {
        name: item.senderName,
        type: MailSenderType.Organization,
        entityId: item.orgId,
        entityType: MailOwnerType.Organization,
      },
      subject: `[Correspondance] ${item.title}`,
      preview: previewText,
      content: item.comment ?? "",
      isRead: false,
      isStarred: false,
      threadId: originalId,
      // Route-back : le client iBoîte redirige vers /icorrespondance/<itemId>
      // au clic, plutôt que d'ouvrir le viewer mail classique.
      linkedCorrespondanceItemId: originalId,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Filigrane "COPIE" sur les PDFs de la copie expéditeur (asynchrone).
  // Ne bloque pas l'envoi : si le watermarking échoue, la copie reste lisible
  // mais sans filigrane visuel.
  await ctx.scheduler.runAfter(
    0,
    internal.functions.correspondanceWatermark.applyWatermarksToCopy,
    { copyItemId: itemId },
  );

  return { status: "sent", copyId: itemId, originalId };
}

// ═════════════════════════════════════════════════════════════════════════════
// APPROBATION — Chaîne hiérarchique
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Approuver une correspondance dans la chaîne.
 * Si c'est le dernier approbateur → déclenche l'envoi effectif.
 */
export const approveAndSend = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");
    if (item.status !== "pending") {
      throw error(ErrorCode.VALIDATION_ERROR, "Ce dossier n'est pas en attente d'approbation");
    }

    // Contrôle d'accès
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "approve");

    // Vérifier que l'utilisateur est le currentHolder
    if (item.currentHolderId && item.currentHolderId !== ctx.user._id && !isSuperAdmin(ctx.user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Seul le détenteur actuel peut approuver ce dossier");
    }

    // Chercher les étapes d'approbation pendantes
    const steps = await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();

    const pendingStep = steps
      .sort((a, b) => a.ordre - b.ordre)
      .find((s) => s.status === "pending");

    if (pendingStep) {
      // Valider cette étape
      await ctx.db.patch(pendingStep._id, {
        status: "approved",
        comment: args.comment,
        decidedAt: now,
      });

      // Vérifier s'il reste des étapes
      const nextPending = steps
        .sort((a, b) => a.ordre - b.ordre)
        .find((s) => s.status === "pending" && s._id !== pendingStep._id);

      if (nextPending) {
        // Passer au prochain approbateur
        await ctx.db.patch(args.itemId, {
          currentHolderId: nextPending.approverId,
          updatedAt: now,
        });

        await ctx.db.insert("correspondanceWorkflowSteps", {
          itemId: args.itemId,
          stepType: "APPROVED",
          actorId: ctx.user._id,
          actorName: ctx.user.name ?? ctx.user.email,
          targetId: nextPending.approverId,
          targetName: nextPending.approverName,
          comment: args.comment ?? "Approuvé, transmis au prochain approbateur",
          isRead: false,
          createdAt: now,
        });

        return { status: "next_approver", nextApproverId: nextPending.approverId };
      }
    }

    // Dernier approbateur ou pas de chaîne → approbation complète + envoi
    await ctx.db.patch(args.itemId, {
      status: "approved",
      approvedById: ctx.user._id,
      approvedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "APPROVED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: args.comment ?? "Approuvé — envoi en cours",
      isRead: true,
      createdAt: now,
    });

    // Déclencher l'envoi effectif
    return await _executeEnvoi(ctx, args.itemId, item, now);
  },
});

/**
 * Rejeter une correspondance (retour au brouillon).
 */
export const rejectCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Dossier introuvable");

    // Contrôle d'accès
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "approve");

    // Vérifier que l'utilisateur est le currentHolder
    if (item.currentHolderId && item.currentHolderId !== ctx.user._id && !isSuperAdmin(ctx.user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Seul le détenteur actuel peut rejeter ce dossier");
    }

    // Rejeter les étapes d'approbation pendantes
    const steps = await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
    for (const step of steps.filter((s) => s.status === "pending")) {
      await ctx.db.patch(step._id, { status: "rejected", decidedAt: now });
    }

    await ctx.db.patch(args.itemId, {
      status: "rejected",
      currentHolderId: item.createdBy,
      updatedAt: now,
    });

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "REJECTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: item.createdBy,
      comment: args.reason,
      isRead: false,
      createdAt: now,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// RÉCEPTION — Cycle de traitement côté destinataire
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Enregistrer une correspondance reçue (attribution numéro d'arrivée).
 * Met à jour le recipientStatus sur la COPIE de l'expéditeur.
 */
export const registerIncoming = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    arrivalReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");

    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    // Auto-générer le numéro d'arrivée si non fourni
    const ref = args.arrivalReference ?? await generateArrivalReference(ctx, orgId);

    await ctx.db.patch(args.itemId, {
      arrivalReference: ref,
      arrivalDate: now,
      searchText: buildCorrespondanceSearchText({
        title: item.title,
        reference: item.reference,
        senderName: item.senderName,
        senderOrg: item.senderOrg,
        recipientName: item.recipientName,
        recipientOrg: item.recipientOrg,
        comment: item.comment,
        tags: item.tags,
        arrivalReference: ref,
      }),
      updatedAt: now,
    });

    // Synchroniser le recipientStatus vers la copie de l'expéditeur
    await _syncRecipientStatus(ctx, args.itemId, "recu", now);

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "REGISTERED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Enregistré sous réf. d'arrivée : ${ref}`,
      isRead: true,
      createdAt: now,
    });

    // Accusé de réception côté expéditeur : log dans la timeline de la copie
    // + email à l'expéditeur si une adresse est connue.
    const senderCopy = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_original", (q: any) => q.eq("originalItemId", args.itemId))
      .first();

    if (senderCopy) {
      await ctx.db.insert("correspondanceWorkflowSteps", {
        itemId: senderCopy._id,
        stepType: "REGISTERED",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        comment: `Accusé de réception — Reçu et enregistré par ${item.recipientOrg ?? item.recipientName} sous réf. ${ref}`,
        isRead: false,
        createdAt: now,
      });
    }

    if (item.senderEmail) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.correspondanceEmail.sendAcknowledgmentEmail,
        {
          senderEmail: item.senderEmail,
          senderName: item.senderName,
          reference: item.reference,
          arrivalReference: ref,
          title: item.title,
          recipientOrg: item.recipientOrg ?? ctx.user.name ?? "Organisation destinataire",
          receivedAt: now,
          copyItemId: senderCopy?._id,
        },
      );
    }
  },
});

/**
 * Assigner une correspondance reçue à un agent pour traitement.
 */
/**
 * Répondre à une correspondance reçue.
 * Crée une nouvelle correspondance en brouillon liée (parentItemId),
 * avec expéditeur/destinataire inversés.
 */
export const respondToCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    title: v.string(),
    type: correspondanceTypeValidator,
    priority: v.optional(correspondancePriorityValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");

    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "create");

    const org = await ctx.db.get(orgId) as any;
    const reference = await generateSequentialReference(ctx, args.type, orgId);

    // Créer la réponse en brouillon avec expéditeur/destinataire inversés
    const responseId = await ctx.db.insert("correspondanceItems", {
      orgId: item.copyOwnerOrgId ?? item.orgId,
      copyOwnerOrgId: item.copyOwnerOrgId ?? item.orgId,
      isCopy: false,
      createdBy: ctx.user._id,
      reference,
      title: args.title,
      type: args.type,
      priority: args.priority ?? item.priority,
      status: "draft",
      direction: "outgoing",
      // Inversé : le destinataire original devient l'expéditeur
      senderName: item.recipientName,
      senderOrg: item.recipientOrg,
      senderEmail: item.recipientEmail,
      senderUserId: ctx.user._id,
      recipientName: item.senderName,
      recipientOrg: item.senderOrg,
      recipientEmail: item.senderEmail,
      primaryRecipientId: item.senderUserId,
      primaryRecipientOrgId: item.orgId,
      comment: `En réponse à ${item.reference}`,
      tags: ["réponse"],
      requiresApproval: false,
      documents: [],
      confidentialite: item.confidentialite ?? "standard",
      parentItemId: args.itemId,
      readByIds: [ctx.user._id as string],
      searchText: buildCorrespondanceSearchText({
        title: args.title,
        reference,
        senderName: item.recipientName,
        senderOrg: item.recipientOrg,
        recipientName: item.senderName,
        recipientOrg: item.senderOrg,
        comment: `En réponse à ${item.reference}`,
        tags: ["réponse"],
      }),
      createdAt: now,
      updatedAt: now,
    });

    // Synchroniser le recipientStatus → "repondu" sur la copie expéditeur original
    await _syncRecipientStatus(ctx, args.itemId, "repondu", now);

    return { responseId };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// TRANSMETTRE — Forward du dossier vers un agent ou une autre organisation
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Transmettre une correspondance reçue vers un autre destinataire.
 *
 * Deux modes selon que la cible est dans la même org que le détenteur courant :
 *   - **Assignation intra-org** : target.kind === "agent" ET agent du même org →
 *     patch `assignedToId` de la source, `recipientStatus → en_attente`.
 *     Pas de bordereau (transmission interne).
 *   - **Forward cross-org** : sinon → crée un NEW original chez le receveur
 *     (`isCopy=false`, `status=received`, `senderName` = nom org forwarder) +
 *     une COPY chez le forwarder (`isCopy=true`, `status=sent`). La source
 *     existe toujours et son `recipientStatus` passe à `transmis`. Bordereau
 *     PDF planifié de manière asynchrone si `includeBordereau !== false`.
 *
 * Habilitations confidentielles :
 *   - Si confidentialite ∈ {confidentiel, secret} ET cible = autre org →
 *     `confirmConfidential === true` est requis (défense en profondeur côté
 *     backend, le warning UI étant côté front).
 */
export const transmitCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    target: v.union(
      v.object({
        kind: v.literal("agent"),
        agentId: v.id("users"),
        agentOrgId: v.id("orgs"),
      }),
      v.object({
        kind: v.literal("org"),
        orgId: v.id("orgs"),
        userId: v.optional(v.id("users")),
      }),
    ),
    comment: v.optional(v.string()),
    documentIndices: v.optional(v.array(v.number())),
    priority: v.optional(correspondancePriorityValidator),
    includeBordereau: v.optional(v.boolean()),
    confirmConfidential: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<
    | { mode: "assigned"; assignedToId: Id<"users"> }
    | {
        mode: "forwarded";
        forwardedOriginalId: Id<"correspondanceItems">;
        forwardCopyId: Id<"correspondanceItems">;
        newReference: string;
        departureRef: string;
      }
  > => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) {
      throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    }
    if (item.isCopy === true) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Impossible de transmettre une copie. Seul l'original peut être transmis.",
      );
    }
    if (item.status !== "received") {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Seule une correspondance reçue peut être transmise.",
      );
    }

    const sourceOrgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, sourceOrgId, "transmit");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    // Résolution de l'org cible
    const targetOrgId: Id<"orgs"> =
      args.target.kind === "agent" ? args.target.agentOrgId : args.target.orgId;

    // ─── MODE 1 : Assignation intra-org (même org, cible agent) ───
    if (args.target.kind === "agent" && targetOrgId === sourceOrgId) {
      const agent = await ctx.db.get(args.target.agentId);
      if (!agent) {
        throw error(ErrorCode.NOT_FOUND, "Agent introuvable");
      }
      await ctx.db.patch(args.itemId, {
        assignedToId: args.target.agentId,
        updatedAt: now,
      });
      await _syncRecipientStatus(ctx, args.itemId, "en_attente", now);
      await ctx.db.insert("correspondanceWorkflowSteps", {
        itemId: args.itemId,
        stepType: "TRANSMITTED",
        actorId: ctx.user._id,
        actorName: ctx.user.name ?? ctx.user.email,
        targetId: args.target.agentId,
        targetName: agent.name ?? agent.email,
        comment:
          args.comment?.trim()
            ? `Assigné à ${agent.name ?? "agent"} — ${args.comment.trim()}`
            : `Assigné à ${agent.name ?? "agent"} pour traitement`,
        isRead: false,
        createdAt: now,
      });
      return { mode: "assigned", assignedToId: args.target.agentId };
    }

    // ─── MODE 2 : Forward cross-org ───
    // Garde de confidentialité (défense en profondeur côté backend)
    const level = item.confidentialite ?? "standard";
    if ((level === "confidentiel" || level === "secret") && args.confirmConfidential !== true) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "La transmission d'une correspondance confidentielle nécessite une confirmation explicite.",
      );
    }

    // Sélection des documents à transmettre
    const allDocs = item.documents ?? [];
    const indices = args.documentIndices ?? allDocs.map((_, i) => i);
    const selectedDocs = indices
      .filter((i) => i >= 0 && i < allDocs.length)
      .map((i) => allDocs[i])
      .filter((d): d is NonNullable<typeof d> => d !== undefined);
    if (selectedDocs.length === 0) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Au moins un document doit être transmis.",
      );
    }

    const targetOrg = await ctx.db.get(targetOrgId);
    if (!targetOrg) {
      throw error(ErrorCode.NOT_FOUND, "Organisation destinataire introuvable");
    }

    const forwardingOrg = await ctx.db.get(sourceOrgId);
    const forwardingOrgName = forwardingOrg?.name ?? "—";

    // Destinataire utilisateur cible (optionnel)
    const targetUserId: Id<"users"> | undefined =
      args.target.kind === "agent" ? args.target.agentId : args.target.userId;
    const targetUser = targetUserId ? await ctx.db.get(targetUserId) : null;

    // Références
    const newReference = await generateSequentialReference(
      ctx,
      item.type,
      sourceOrgId,
    );
    const departureRef = await generateDepartureReference(ctx, sourceOrgId);

    const priority = args.priority ?? item.priority;
    const baseComment = `Transmis par ${forwardingOrgName}. Origine : ${item.senderName} (${item.reference}).`;
    const fullComment = args.comment?.trim()
      ? `${baseComment} ${args.comment.trim()}`
      : baseComment;
    const tags = Array.from(
      new Set([...(item.tags ?? []), "transmis", `from:${item.reference}`]),
    );

    // ── Création de l'ORIGINAL côté receveur ──
    const forwardedOriginalId = await ctx.db.insert("correspondanceItems", {
      orgId: targetOrgId,
      copyOwnerOrgId: targetOrgId,
      isCopy: false,
      createdBy: ctx.user._id,
      reference: newReference,
      title: item.title,
      type: item.type,
      priority,
      status: "received",
      direction: "incoming",
      // Sender = nous (l'org qui transmet). Provenance d'origine dans le commentaire/tags.
      senderName: forwardingOrgName,
      senderOrg: forwardingOrgName,
      senderEmail: ctx.user.email,
      senderUserId: ctx.user._id,
      recipientName: targetUser?.name ?? targetOrg.name ?? "—",
      recipientOrg: targetOrg.name,
      recipientEmail: targetUser?.email,
      primaryRecipientId: targetUserId,
      primaryRecipientOrgId: targetOrgId,
      comment: fullComment,
      tags,
      requiresApproval: false,
      documents: selectedDocs.map((d) => ({ ...d, copyWatermark: false })),
      confidentialite: item.confidentialite ?? "standard",
      parentItemId: args.itemId,
      readByIds: [],
      searchText: buildCorrespondanceSearchText({
        title: item.title,
        reference: newReference,
        senderName: forwardingOrgName,
        senderOrg: forwardingOrgName,
        recipientName: targetUser?.name ?? targetOrg.name,
        recipientOrg: targetOrg.name,
        comment: fullComment,
        tags,
      }),
      createdAt: now,
      updatedAt: now,
    });

    // ── Création de la COPIE côté forwarder ──
    const forwardCopyId = await ctx.db.insert("correspondanceItems", {
      orgId: sourceOrgId,
      copyOwnerOrgId: sourceOrgId,
      isCopy: true,
      originalItemId: forwardedOriginalId,
      createdBy: ctx.user._id,
      reference: newReference,
      title: item.title,
      type: item.type,
      priority,
      status: "sent",
      direction: "outgoing",
      senderName: forwardingOrgName,
      senderOrg: forwardingOrgName,
      senderEmail: ctx.user.email,
      senderUserId: ctx.user._id,
      recipientName: targetUser?.name ?? targetOrg.name ?? "—",
      recipientOrg: targetOrg.name,
      recipientEmail: targetUser?.email,
      primaryRecipientId: targetUserId,
      primaryRecipientOrgId: targetOrgId,
      comment: fullComment,
      tags,
      requiresApproval: false,
      documents: selectedDocs.map((d) => ({ ...d, copyWatermark: true })),
      confidentialite: item.confidentialite ?? "standard",
      parentItemId: args.itemId,
      readByIds: [ctx.user._id as string],
      recipientStatus: "en_transit",
      recipientStatusUpdatedAt: now,
      sentAt: now,
      searchText: buildCorrespondanceSearchText({
        title: item.title,
        reference: newReference,
        senderName: forwardingOrgName,
        senderOrg: forwardingOrgName,
        recipientName: targetUser?.name ?? targetOrg.name,
        recipientOrg: targetOrg.name,
        comment: fullComment,
        tags,
      }),
      createdAt: now,
      updatedAt: now,
    });

    // ── Patch de la source : recipientStatus → "transmis" (sur la copie sender d'origine) ──
    await _syncRecipientStatus(ctx, args.itemId, "transmis", now);

    // ── Recipients table (juste le primaire ici, pas de CC sur les forward) ──
    if (targetUserId) {
      await ctx.db.insert("correspondanceRecipients", {
        itemId: forwardedOriginalId,
        userId: targetUserId,
        orgId: targetOrgId,
        role: "primary",
        name: targetUser?.name ?? targetOrg.name ?? "—",
        email: targetUser?.email,
        orgName: targetOrg.name ?? "—",
        createdAt: now,
      });
    }

    // ── Workflow steps : source + nouvelle copie + nouvel original ──
    const transmitComment =
      level === "confidentiel" || level === "secret"
        ? `Transmis à ${targetOrg.name ?? "—"} (Réf. départ : ${departureRef}, nouvelle réf. : ${newReference}) — confidentielle, confirmation utilisateur`
        : `Transmis à ${targetOrg.name ?? "—"} (Réf. départ : ${departureRef}, nouvelle réf. : ${newReference})`;

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "TRANSMITTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: targetUserId,
      targetName: targetUser?.name ?? targetOrg.name,
      comment: transmitComment,
      isRead: false,
      createdAt: now,
    });
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: forwardCopyId,
      stepType: "TRANSMITTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: targetUserId,
      targetName: targetUser?.name ?? targetOrg.name,
      comment: transmitComment,
      isRead: true,
      createdAt: now,
    });
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: forwardedOriginalId,
      stepType: "CREATED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Reçu par transmission de ${forwardingOrgName} — origine ${item.reference}`,
      isRead: false,
      createdAt: now,
    });

    // ── iBoîte : badge unread chez le receveur ──
    const previewText = fullComment.slice(0, 200);
    await ctx.db.insert("digitalMail", {
      userId: ctx.user._id,
      ownerId: targetOrgId,
      ownerType: MailOwnerType.Organization,
      type: MailType.Letter,
      folder: MailFolder.Inbox,
      sender: {
        name: forwardingOrgName,
        type: MailSenderType.Organization,
        entityId: sourceOrgId,
        entityType: MailOwnerType.Organization,
      },
      subject: `[Correspondance transmise] ${item.title}`,
      preview: previewText,
      content: fullComment,
      isRead: false,
      isStarred: false,
      threadId: forwardedOriginalId,
      linkedCorrespondanceItemId: forwardedOriginalId,
      createdAt: now,
      updatedAt: now,
    });

    // ── Bordereau PDF asynchrone (défaut ON, sauf désactivation explicite) ──
    if (args.includeBordereau !== false) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.correspondanceTransmissionBordereau
          .generateTransmissionBordereau,
        { forwardCopyId },
      );
    }

    return {
      mode: "forwarded",
      forwardedOriginalId,
      forwardCopyId,
      newReference,
      departureRef,
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// RENVOYER À L'EXPÉDITEUR — Retour avec motif (refus, demande de complément)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Renvoyer une correspondance reçue à son expéditeur d'origine avec un motif.
 *
 * Crée une nouvelle correspondance chez l'expéditeur d'origine (qui apparaît
 * dans ses « Reçus »), avec tag `["renvoi", category]` et commentaire formaté.
 * La source est marquée comme `archived` et `recipientStatus → retourne` sur
 * la copie sender pour signaler le retour.
 */
export const returnToSender = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    reason: v.string(),
    category: returnedCategoryValidator,
  },
  handler: async (ctx, args): Promise<{
    returnedOriginalId: Id<"correspondanceItems">;
    returnCopyId: Id<"correspondanceItems">;
  }> => {
    const now = Date.now();
    const reason = args.reason.trim();
    if (reason.length < 10) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Le motif du renvoi doit faire au moins 10 caractères.",
      );
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) {
      throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    }
    if (item.isCopy === true) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Impossible de renvoyer une copie. Seul l'original peut être retourné.",
      );
    }
    if (item.status !== "received") {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Seule une correspondance reçue peut être renvoyée.",
      );
    }

    const sourceOrgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, sourceOrgId, "transmit");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    // Résolution de l'expéditeur d'origine
    const senderOrgId = item.orgId; // l'org qui a créé le dossier à l'origine
    const senderOrg = await ctx.db.get(senderOrgId);
    const forwardingOrg = await ctx.db.get(sourceOrgId);
    const forwardingOrgName = forwardingOrg?.name ?? "—";

    if (!item.senderUserId && !item.senderEmail) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Impossible de renvoyer : aucun expéditeur identifié sur cette correspondance.",
      );
    }

    const newReference = await generateSequentialReference(
      ctx,
      item.type,
      sourceOrgId,
    );

    const baseComment = `RENVOI [${args.category}] — ${reason} (origine : ${item.reference})`;
    const tags = Array.from(
      new Set([...(item.tags ?? []), "renvoi", args.category]),
    );

    // ── Création de l'ORIGINAL côté expéditeur d'origine (retour) ──
    const returnedOriginalId = await ctx.db.insert("correspondanceItems", {
      orgId: senderOrgId,
      copyOwnerOrgId: senderOrgId,
      isCopy: false,
      createdBy: ctx.user._id,
      reference: newReference,
      title: `[Renvoi] ${item.title}`,
      type: item.type,
      priority: item.priority,
      status: "received",
      direction: "incoming",
      senderName: forwardingOrgName,
      senderOrg: forwardingOrgName,
      senderEmail: ctx.user.email,
      senderUserId: ctx.user._id,
      recipientName: item.senderName,
      recipientOrg: item.senderOrg,
      recipientEmail: item.senderEmail,
      primaryRecipientId: item.senderUserId,
      primaryRecipientOrgId: senderOrgId,
      comment: baseComment,
      tags,
      requiresApproval: false,
      documents: (item.documents ?? []).map((d) => ({
        ...d,
        copyWatermark: false,
      })),
      confidentialite: item.confidentialite ?? "standard",
      parentItemId: args.itemId,
      readByIds: [],
      returnedReason: reason,
      returnedCategory: args.category,
      searchText: buildCorrespondanceSearchText({
        title: `[Renvoi] ${item.title}`,
        reference: newReference,
        senderName: forwardingOrgName,
        senderOrg: forwardingOrgName,
        recipientName: item.senderName,
        recipientOrg: item.senderOrg,
        comment: baseComment,
        tags,
      }),
      createdAt: now,
      updatedAt: now,
    });

    // ── Création de la COPIE côté forwarder (notre trace du renvoi) ──
    const returnCopyId = await ctx.db.insert("correspondanceItems", {
      orgId: sourceOrgId,
      copyOwnerOrgId: sourceOrgId,
      isCopy: true,
      originalItemId: returnedOriginalId,
      createdBy: ctx.user._id,
      reference: newReference,
      title: `[Renvoi] ${item.title}`,
      type: item.type,
      priority: item.priority,
      status: "sent",
      direction: "outgoing",
      senderName: forwardingOrgName,
      senderOrg: forwardingOrgName,
      senderEmail: ctx.user.email,
      senderUserId: ctx.user._id,
      recipientName: item.senderName,
      recipientOrg: item.senderOrg,
      recipientEmail: item.senderEmail,
      primaryRecipientId: item.senderUserId,
      primaryRecipientOrgId: senderOrgId,
      comment: baseComment,
      tags,
      requiresApproval: false,
      documents: (item.documents ?? []).map((d) => ({
        ...d,
        copyWatermark: true,
      })),
      confidentialite: item.confidentialite ?? "standard",
      parentItemId: args.itemId,
      readByIds: [ctx.user._id as string],
      recipientStatus: "en_transit",
      recipientStatusUpdatedAt: now,
      sentAt: now,
      returnedReason: reason,
      returnedCategory: args.category,
      searchText: buildCorrespondanceSearchText({
        title: `[Renvoi] ${item.title}`,
        reference: newReference,
        senderName: forwardingOrgName,
        senderOrg: forwardingOrgName,
        recipientName: item.senderName,
        recipientOrg: item.senderOrg,
        comment: baseComment,
        tags,
      }),
      createdAt: now,
      updatedAt: now,
    });

    // ── Patch source : archivée + recipientStatus → retourne ──
    await ctx.db.patch(args.itemId, {
      status: "archived",
      returnedReason: reason,
      returnedCategory: args.category,
      updatedAt: now,
    });
    await _syncRecipientStatus(ctx, args.itemId, "retourne", now);

    // ── Workflow steps : source + nouveau original + nouvelle copie ──
    const targetSenderName = item.senderName;
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "RETURNED_TO_SENDER",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: item.senderUserId,
      targetName: targetSenderName,
      comment: `Renvoyé à ${targetSenderName} (${args.category}) — ${reason}`,
      isRead: false,
      createdAt: now,
    });
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: returnCopyId,
      stepType: "RETURNED_TO_SENDER",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: item.senderUserId,
      targetName: targetSenderName,
      comment: `Renvoyé à ${targetSenderName} (${args.category}) — ${reason}`,
      isRead: true,
      createdAt: now,
    });
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: returnedOriginalId,
      stepType: "CREATED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Renvoi reçu de ${forwardingOrgName} — origine ${item.reference} (${args.category})`,
      isRead: false,
      createdAt: now,
    });

    // ── iBoîte : badge unread chez l'expéditeur d'origine ──
    if (senderOrgId && senderOrg) {
      await ctx.db.insert("digitalMail", {
        userId: ctx.user._id,
        ownerId: senderOrgId,
        ownerType: MailOwnerType.Organization,
        type: MailType.Letter,
        folder: MailFolder.Inbox,
        sender: {
          name: forwardingOrgName,
          type: MailSenderType.Organization,
          entityId: sourceOrgId,
          entityType: MailOwnerType.Organization,
        },
        subject: `[Renvoi] ${item.title}`,
        preview: baseComment.slice(0, 200),
        content: baseComment,
        isRead: false,
        isStarred: false,
        threadId: returnedOriginalId,
        linkedCorrespondanceItemId: returnedOriginalId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { returnedOriginalId, returnCopyId };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// BORDEREAU DE TRANSMISSION PAR DOSSIER — Helpers internes
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lecture interne des données nécessaires à la génération du bordereau PDF
 * par dossier. Appelée depuis l'action `generateTransmissionBordereau`.
 *
 * `forwardCopyId` est l'identifiant de la copie côté forwarder (créée par
 * `transmitCorrespondance` en mode forward). C'est sur cette copie que le
 * `transmissionBordereauStorageId` sera apposé.
 */
export const _collectTransmissionBordereauData = internalQuery({
  args: { forwardCopyId: v.id("correspondanceItems") },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { error: string }
    | {
        forwardingOrgName: string;
        forwardingActorName: string;
        recipientName: string;
        recipientOrgName: string;
        recipientEmail?: string;
        newReference: string;
        originalReference: string;
        originalSenderName: string;
        transmissionComment: string;
        confidentialite: string;
        documents: Array<{
          ordre: number;
          label?: string;
          filename: string;
          mimeType: string;
          sizeBytes: number;
          isMainDocument: boolean;
        }>;
        transmittedAt: number;
      }
  > => {
    const copy = await ctx.db.get(args.forwardCopyId);
    if (!copy) return { error: "Copie forwarder introuvable" };
    if (copy.isCopy !== true) {
      return { error: "L'item fourni n'est pas une copie forwarder" };
    }

    const sourceId = copy.parentItemId;
    const source = sourceId ? await ctx.db.get(sourceId) : null;

    const forwardingOrg = await ctx.db.get(copy.copyOwnerOrgId ?? copy.orgId);
    const actor = await ctx.db.get(copy.createdBy);

    const documents = (copy.documents ?? [])
      .map((d, i) => ({
        ordre: d.ordre ?? i + 1,
        label: d.label,
        filename: d.filename,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        isMainDocument: !!d.isMainDocument,
      }))
      .sort((a, b) => a.ordre - b.ordre);

    return {
      forwardingOrgName: forwardingOrg?.name ?? "—",
      forwardingActorName: actor?.name ?? actor?.email ?? "—",
      recipientName: copy.recipientName,
      recipientOrgName: copy.recipientOrg ?? "—",
      recipientEmail: copy.recipientEmail,
      newReference: copy.reference,
      originalReference: source?.reference ?? "—",
      originalSenderName: source?.senderName ?? "—",
      transmissionComment: copy.comment ?? "",
      confidentialite: copy.confidentialite ?? "standard",
      documents,
      transmittedAt: copy.sentAt ?? copy.createdAt,
    };
  },
});

/**
 * Patch interne du `transmissionBordereauStorageId` après génération du PDF.
 */
export const _setBordereauStorageId = internalMutation({
  args: {
    forwardCopyId: v.id("correspondanceItems"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.forwardCopyId, {
      transmissionBordereauStorageId: args.storageId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * URL signée du bordereau de transmission pour téléchargement.
 * Renvoie `null` si le bordereau n'a pas encore été généré ou si l'item
 * n'en a pas (cas d'une assignation intra-org).
 */
export const getTransmissionBordereauUrl = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args): Promise<string | null> => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return null;

    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    if (!item.transmissionBordereauStorageId) return null;
    return await ctx.storage.getUrl(item.transmissionBordereauStorageId);
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SYNCHRONISATION recipientStatus
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Met à jour le recipientStatus sur la copie de l'expéditeur
 * quand l'état change côté destinataire.
 *
 * Cherche la copie liée via originalItemId et met à jour son recipientStatus.
 */
type RecipientStatus = Infer<typeof recipientStatusValidator>;

async function _syncRecipientStatus(
  ctx: MutationCtx,
  receivedItemId: Id<"correspondanceItems">,
  newStatus: RecipientStatus,
  now: number,
) {
  // L'item reçu est l'original. Trouver la copie de l'expéditeur.
  const receivedItem = await ctx.db.get(receivedItemId);
  if (!receivedItem) return;

  // Chercher la copie qui pointe vers cet original
  // La copie a originalItemId == receivedItemId
  const copies = await ctx.db
    .query("correspondanceItems")
    .withIndex("by_original", (q: any) => q.eq("originalItemId", receivedItemId))
    .collect();

  for (const copy of copies) {
    await ctx.db.patch(copy._id, {
      recipientStatus: newStatus,
      recipientStatusUpdatedAt: now,
      updatedAt: now,
    });
  }

  // Aussi chercher par référence si pas de lien direct
  // (pour les items créés avant la refonte)
  if (copies.length === 0 && receivedItem.reference) {
    const byRef = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_copy", (q: any) =>
        q.eq("copyOwnerOrgId", receivedItem.orgId !== receivedItem.copyOwnerOrgId
          ? receivedItem.orgId : undefined)
          .eq("isCopy", true),
      )
      .collect();

    const matchingCopy = byRef.find((c: any) => c.reference === receivedItem.reference);
    if (matchingCopy) {
      await ctx.db.patch(matchingCopy._id, {
        recipientStatus: newStatus,
        recipientStatusUpdatedAt: now,
        originalItemId: receivedItemId,
        updatedAt: now,
      });
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DÉTAIL D'UN DOSSIER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtenir un dossier de correspondance complet avec ses documents et URLs.
 */
export const getDossier = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return null;

    // Contrôle d'accès
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    // URLs des documents enrichis
    const docsWithUrls = await Promise.all(
      (item.documents ?? []).map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );

    // Historique workflow
    const workflowSteps = await ctx.db
      .query("correspondanceWorkflowSteps")
      .withIndex("by_item_created", (q) => q.eq("itemId", args.itemId))
      .order("asc")
      .collect();

    // Étapes d'approbation
    const approvalSteps = await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();

    // Destinataires
    const recipients = await ctx.db
      .query("correspondanceRecipients")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();

    // Réponses (thread)
    const replies = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_parent", (q) => q.eq("parentItemId", args.itemId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return {
      ...item,
      documents: docsWithUrls,
      workflowSteps,
      approvalSteps: approvalSteps.sort((a, b) => a.ordre - b.ordre),
      recipients,
      replies: replies.map((r) => ({
        _id: r._id,
        reference: r.reference,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  },
});

/**
 * Obtenir les étapes d'approbation d'un dossier (chaîne hiérarchique).
 */
export const getApprovalSteps = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return [];

    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");

    return await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// HELPER — Enrichir avec les URLs de storage
// ═════════════════════════════════════════════════════════════════════════════

async function _enrichWithUrls(ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } }, items: Doc<"correspondanceItems">[]) {
  return await Promise.all(
    items.map(async (item) => {
      const docsWithUrls = await Promise.all(
        (item.documents ?? []).map(async (doc: any) => ({
          ...doc,
          url: await ctx.storage.getUrl(doc.storageId),
        })),
      );
      return {
        ...item,
        documents: docsWithUrls,
        documentCount: (item.documents ?? []).length,
      };
    }),
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INTERNAL — Helpers pour le watermarking asynchrone
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lecture interne d'un item pour l'action de watermark.
 * Pas de contrôle d'accès — appelée depuis une action système.
 */
export const _getItemForWatermark = internalQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return null;
    return { documents: item.documents ?? [] };
  },
});

/**
 * Lecture interne pour la pipeline OCR (Sprint 4 — D1).
 *
 * Retourne les pièces jointes du dossier + le commentaire/searchText courants
 * pour que l'action OCR puisse fusionner le texte extrait sans perdre les
 * champs déjà saisis.
 */
export const _getItemForOcr = internalQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return null;
    return {
      documents: item.documents ?? [],
      title: item.title,
      reference: item.reference,
      senderName: item.senderName,
      senderOrg: item.senderOrg,
      recipientName: item.recipientName,
      recipientOrg: item.recipientOrg,
      comment: item.comment,
      tags: item.tags ?? [],
      arrivalReference: item.arrivalReference,
    };
  },
});

/**
 * Enregistre le résultat de la pipeline OCR : ajoute le texte extrait au
 * `searchText` (concaténation) et au `comment` quand il est vide. Idempotent
 * — on n'ajoute pas deux fois le même fragment OCR (détecté via tag).
 */
export const _recordOcrResult = internalMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    extractedText: v.string(),
    provider: v.string(),
    pageCount: v.optional(v.number()),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return { ok: false };
    const existingTags = item.tags ?? [];
    if (existingTags.includes("ocr-processed")) {
      return { ok: false, reason: "already-processed" };
    }
    const newTags = [...existingTags, "ocr-processed", `ocr:${args.provider}`];
    const trimmedExtract = args.extractedText.trim();
    const newComment =
      !item.comment || item.comment === "(corps vide)" || item.comment.length < 20
        ? trimmedExtract || item.comment
        : item.comment;
    const newSearchText = [item.searchText ?? "", trimmedExtract]
      .filter(Boolean)
      .join(" ")
      .slice(0, 8000); // Convex search index handles up to ~8KB efficiently
    await ctx.db.patch(args.itemId, {
      tags: newTags,
      comment: newComment,
      searchText: newSearchText,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "TRANSMITTED",
      actorId: (item.copyOwnerOrgId ?? item.orgId) as any,
      actorName: `OCR (${args.provider})`,
      comment: `Texte extrait par OCR — ${trimmedExtract.length} caractère(s)${
        args.pageCount ? `, ${args.pageCount} page(s)` : ""
      }${args.confidence ? `, confiance ${(args.confidence * 100).toFixed(0)}%` : ""}.`,
      isRead: true,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/**
 * Lecture interne pour le bordereau d'envoi postal.
 * Charge tous les courriers sortants (copies expéditeur) d'une org sur la période.
 */
export const _collectPostalManifestData = internalQuery({
  args: {
    orgId: v.id("orgs"),
    dateFrom: v.number(),
    dateTo: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { error: string }
    | {
        orgName: string;
        operatorName: string;
        items: Array<{
          reference: string;
          title: string;
          type: string;
          recipientName: string;
          recipientOrg?: string;
          recipientEmail?: string;
          sentAt?: number;
          createdAt: number;
        }>;
      }
  > => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return { error: "Organisation introuvable" };

    const userIdentity = await ctx.auth.getUserIdentity();
    let operatorName = "—";
    if (userIdentity) {
      const userId = userIdentity.subject.split("|")[0] as Id<"users">;
      const user = await ctx.db.get(userId);
      operatorName = user?.name ?? user?.email ?? "—";
    }

    // Tous les items envoyés (copies expéditeur, isCopy=true) dans la fenêtre
    const all = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_copy", (q: any) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("isCopy", true),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const inWindow = all
      .filter((i: any) => {
        const ts = i.sentAt ?? i.createdAt;
        return ts >= args.dateFrom && ts <= args.dateTo;
      })
      .sort((a: any, b: any) => (a.sentAt ?? a.createdAt) - (b.sentAt ?? b.createdAt));

    return {
      orgName: org.name ?? "—",
      operatorName,
      items: inWindow.map((i: any) => ({
        reference: i.reference,
        title: i.title,
        type: i.type,
        recipientName: i.recipientName,
        recipientOrg: i.recipientOrg,
        recipientEmail: i.recipientEmail,
        sentAt: i.sentAt,
        createdAt: i.createdAt,
      })),
    };
  },
});

/**
 * Collecteur de données pour le bordereau de transmission INTERNE.
 *
 * Liste les courriers ASSIGNÉS au sein de l'organisation sur une période,
 * éventuellement filtrés par agent destinataire (`assignedToId`).
 * Sert d'attestation de transmission inter-services à signer par
 * l'expéditeur du registre courrier et l'agent récepteur.
 */
export const _collectInternalManifestData = internalQuery({
  args: {
    orgId: v.id("orgs"),
    dateFrom: v.number(),
    dateTo: v.number(),
    assignedToId: v.optional(v.id("users")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { error: string }
    | {
        orgName: string;
        operatorName: string;
        assignedAgentName?: string;
        items: Array<{
          reference: string;
          arrivalReference?: string;
          title: string;
          type: string;
          senderName: string;
          senderOrg?: string;
          assignedToName?: string;
          assignedAt?: number;
          createdAt: number;
        }>;
      }
  > => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return { error: "Organisation introuvable" };

    const userIdentity = await ctx.auth.getUserIdentity();
    let operatorName = "—";
    if (userIdentity) {
      const userId = userIdentity.subject.split("|")[0] as Id<"users">;
      const user = await ctx.db.get(userId);
      operatorName = user?.name ?? user?.email ?? "—";
    }

    let assignedAgentName: string | undefined;
    if (args.assignedToId) {
      const u = await ctx.db.get(args.assignedToId);
      assignedAgentName = (u as any)?.name ?? (u as any)?.email;
    }

    // Items reçus par l'org et assignés (assignedToId défini), dans la fenêtre.
    const all = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_status", (q: any) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("status", "received"),
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("isCopy"), true),
          q.eq(q.field("deletedAt"), undefined),
          q.neq(q.field("assignedToId"), undefined),
        ),
      )
      .collect();

    const filtered = all.filter((i: any) => {
      if (args.assignedToId && i.assignedToId !== args.assignedToId) return false;
      const ts = i.updatedAt ?? i.createdAt;
      return ts >= args.dateFrom && ts <= args.dateTo;
    });

    // Enrichir avec le nom de l'agent
    const enriched = await Promise.all(
      filtered.map(async (i: any) => {
        const u = i.assignedToId ? await ctx.db.get(i.assignedToId) : null;
        return {
          reference: i.reference,
          arrivalReference: i.arrivalReference,
          title: i.title,
          type: i.type,
          senderName: i.senderName,
          senderOrg: i.senderOrg,
          assignedToName:
            (u as any)?.name ?? (u as any)?.email ?? undefined,
          assignedAt: i.updatedAt,
          createdAt: i.createdAt,
        };
      }),
    );

    enriched.sort((a, b) => (a.assignedAt ?? a.createdAt) - (b.assignedAt ?? b.createdAt));

    return {
      orgName: org.name ?? "—",
      operatorName,
      assignedAgentName,
      items: enriched,
    };
  },
});

/**
 * Lecture interne pour la signature électronique.
 * Vérifie l'autorisation et retourne le document à signer + l'identité du signataire.
 */
export const _getItemForSigning = internalQuery({
  args: {
    itemId: v.id("correspondanceItems"),
    documentIndex: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { error: string }
    | {
        item: { reference: string; title: string };
        doc: { storageId: string; filename: string; mimeType: string; label?: string };
        signer: { id: Id<"users">; name: string; title?: string; orgId: Id<"orgs">; orgName: string };
      }
  > => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return { error: "Dossier introuvable" };

    const docs = item.documents ?? [];
    if (args.documentIndex < 0 || args.documentIndex >= docs.length) {
      return { error: "Index de document invalide" };
    }
    const doc = docs[args.documentIndex];

    // Identité du signataire courant
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) return { error: "Non authentifié" };
    const userId = userIdentity.subject.split("|")[0] as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user) return { error: "Utilisateur introuvable" };

    // Autorisation : créateur, approbateur courant, ou super admin
    const isCreator = item.createdBy === user._id;
    const isApprover = item.currentHolderId === user._id;
    const superAdmin = isSuperAdmin(user);
    if (!isCreator && !isApprover && !superAdmin) {
      return {
        error:
          "Seul le créateur, l'approbateur courant ou un super-admin peut signer ce document.",
      };
    }

    // Position + org du signataire pour le tampon
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q: any) =>
        q.eq("userId", user._id).eq("orgId", orgId).eq("deletedAt", undefined),
      )
      .first();
    let signerTitle: string | undefined;
    if (membership?.positionId) {
      const position = (await ctx.db.get(membership.positionId)) as any;
      const t = position?.title;
      signerTitle = typeof t === "string" ? t : t?.fr;
    }
    const org = await ctx.db.get(orgId);

    return {
      item: { reference: item.reference, title: item.title },
      doc: {
        storageId: doc.storageId,
        filename: doc.filename,
        mimeType: doc.mimeType,
        label: doc.label,
      },
      signer: {
        id: user._id,
        name: user.name ?? user.email ?? "Signataire",
        title: signerTitle,
        orgId,
        orgName: org?.name ?? "—",
      },
    };
  },
});

/**
 * Persiste un enregistrement de signature et remplace le storageId du document
 * par sa version scellée dans `item.documents`.
 */
export const _recordSignature = internalMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    documentIndex: v.number(),
    originalStorageId: v.id("_storage"),
    sealedStorageId: v.id("_storage"),
    documentLabel: v.optional(v.string()),
    signerId: v.id("users"),
    signerName: v.string(),
    signerTitle: v.optional(v.string()),
    signerOrgId: v.id("orgs"),
    signerOrgName: v.string(),
    documentHash: v.string(),
    serialNumber: v.string(),
    signedAt: v.number(),
    signatureLevel: v.optional(
      v.union(v.literal(1), v.literal(2), v.literal(3)),
    ),
    qualifiedProvider: v.optional(v.string()),
    qualifiedProviderRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const signatureId = await ctx.db.insert("correspondanceSignatures", {
      itemId: args.itemId,
      originalStorageId: args.originalStorageId,
      sealedStorageId: args.sealedStorageId,
      documentLabel: args.documentLabel,
      signerId: args.signerId,
      signerName: args.signerName,
      signerTitle: args.signerTitle,
      signerOrgId: args.signerOrgId,
      signerOrgName: args.signerOrgName,
      documentHash: args.documentHash,
      serialNumber: args.serialNumber,
      signedAt: args.signedAt,
      signatureLevel: args.signatureLevel,
      qualifiedProvider: args.qualifiedProvider,
      qualifiedProviderRef: args.qualifiedProviderRef,
    });

    // Remplacer le storageId du document signé par sa version scellée
    const item = await ctx.db.get(args.itemId);
    if (item) {
      const docs = [...(item.documents ?? [])];
      if (args.documentIndex >= 0 && args.documentIndex < docs.length) {
        docs[args.documentIndex] = {
          ...docs[args.documentIndex],
          storageId: args.sealedStorageId,
        };
        await ctx.db.patch(args.itemId, { documents: docs, updatedAt: args.signedAt });
      }
    }

    // Trace dans le workflow audit
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "APPROVED",
      actorId: args.signerId,
      actorName: args.signerName,
      comment: `Document signé électroniquement (sceau ${args.serialNumber})`,
      isRead: true,
      createdAt: args.signedAt,
    });

    return { signatureId };
  },
});

/**
 * Liste les signatures apposées sur un dossier (pour affichage UI).
 */
export const listSignatures = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return [];
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    return await ctx.db
      .query("correspondanceSignatures")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
  },
});

/**
 * Lecture interne pour la génération PDF officielle.
 * Charge l'item, sa config de type et le nom de l'org.
 */
export const _getItemForPdfGeneration = internalQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) return null;

    const typeConfig = await ctx.db
      .query("correspondanceTypeConfigs")
      .withIndex("by_org_type", (q: any) =>
        q.eq("orgId", item.orgId).eq("typeCode", item.type),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    const org = await ctx.db.get(item.orgId);

    return {
      item: {
        reference: item.reference,
        title: item.title,
        type: item.type,
        senderName: item.senderName,
        senderOrg: item.senderOrg,
        recipientName: item.recipientName,
        recipientOrg: item.recipientOrg,
        comment: item.comment,
        createdAt: item.createdAt,
      },
      typeConfig: typeConfig
        ? {
            headerConfig: typeConfig.headerConfig,
          }
        : null,
      orgName: org?.name ?? null,
    };
  },
});

/**
 * Attache un PDF généré comme document principal du dossier.
 * Si un PDF généré existait déjà (même nom de fichier suffixé `_generated`),
 * il est remplacé.
 */
export const _attachGeneratedPdf = internalMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    storageId: v.id("_storage"),
    filename: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return { replaced: false };
    const now = Date.now();
    const existing = item.documents ?? [];

    // Détecter un PDF officiel précédemment généré (label spécifique)
    const generatedIdx = existing.findIndex(
      (d) => d.label === "Document officiel généré",
    );

    const newDoc = {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: "application/pdf",
      sizeBytes: args.sizeBytes,
      uploadedAt: now,
      documentType: "lettre",
      label: "Document officiel généré",
      ordre: 1,
      isMainDocument: true,
    };

    let newDocuments;
    if (generatedIdx >= 0) {
      // Remplacement : archiver l'ancien dans `versions[]` au lieu de
      // supprimer le blob (Phase 5 — versioning + audit trail).
      const old = existing[generatedIdx];
      const previousVersions = (old as any).versions ?? [];
      newDocuments = [...existing];
      newDocuments[generatedIdx] = {
        ...newDoc,
        versions: [
          ...previousVersions,
          {
            storageId: old.storageId,
            filename: old.filename,
            mimeType: old.mimeType,
            sizeBytes: old.sizeBytes,
            uploadedAt: old.uploadedAt,
            reason: "regenerated-official-pdf",
          },
        ],
      } as typeof newDoc & { versions: any[] };
    } else {
      // Nouveau : pousser en tête, décaler les autres en perdant le flag main
      newDocuments = [
        newDoc,
        ...existing.map((d, i) => ({ ...d, ordre: i + 2, isMainDocument: false })),
      ];
    }

    await ctx.db.patch(args.itemId, {
      documents: newDocuments,
      updatedAt: now,
    });

    return { replaced: generatedIdx >= 0 };
  },
});

/**
 * Remplace les storageId des documents PDF d'une copie par leurs versions
 * filigranées. Conserve l'ordre et toutes les métadonnées.
 */
export const _replaceWatermarkedStorageIds = internalMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    updates: v.array(
      v.object({
        oldStorageId: v.string(),
        newStorageId: v.id("_storage"),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;
    const map = new Map(args.updates.map((u) => [u.oldStorageId, u.newStorageId]));
    const newDocs = (item.documents ?? []).map((doc) => {
      const next = map.get(doc.storageId);
      if (!next) return doc;
      // Phase 5 — versioning : archiver l'original (avant filigrane) dans
      // `versions[]` plutôt que de l'écraser silencieusement.
      const previousVersions = (doc as any).versions ?? [];
      return {
        ...doc,
        storageId: next,
        versions: [
          ...previousVersions,
          {
            storageId: doc.storageId,
            filename: doc.filename,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            uploadedAt: doc.uploadedAt,
            reason: "watermark-applied",
          },
        ],
      };
    });
    await ctx.db.patch(args.itemId, {
      documents: newDocs,
      updatedAt: Date.now(),
    });
  },
});
