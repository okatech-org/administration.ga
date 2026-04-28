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
export const assignCorrespondance = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    agentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");
    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "transmit");

    const agent = await ctx.db.get(args.agentId) as any;

    await ctx.db.patch(args.itemId, {
      assignedToId: args.agentId,
      updatedAt: now,
    });

    // Synchroniser le recipientStatus → "en_attente"
    await _syncRecipientStatus(ctx, args.itemId, "en_attente", now);

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "TRANSMITTED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      targetId: args.agentId,
      targetName: agent?.name ?? agent?.email,
      comment: `Assigné à ${agent?.name ?? "agent"} pour traitement`,
      isRead: false,
      createdAt: now,
    });
  },
});

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
    const reference = await generateSequentialReference(ctx, args.type);

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
      // Remplacement : supprimer l'ancien storage pour libérer
      const oldStorageId = existing[generatedIdx].storageId;
      try {
        await ctx.storage.delete(oldStorageId);
      } catch {
        // ignore : le blob a peut-être déjà été supprimé
      }
      newDocuments = [...existing];
      newDocuments[generatedIdx] = newDoc;
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
      return next ? { ...doc, storageId: next } : doc;
    });
    await ctx.db.patch(args.itemId, {
      documents: newDocs,
      updatedAt: Date.now(),
    });
  },
});
