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

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import {
  correspondanceTypeValidator,
  correspondancePriorityValidator,
  correspondanceStatusValidator,
  recipientStatusValidator,
  correspondanceDocumentValidator,
} from "../schemas/correspondance";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateReference(type: string): string {
  const year = new Date().getFullYear();
  const code = type.substring(0, 3).toUpperCase();
  const n = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `DIPL/${year}/${code}/${n}`;
}

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
    )),
  },
  handler: async (ctx, args) => {
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
      .collect();

    // Si pas de filtre spécifique, inclure aussi les "pending" (en attente d'approbation)
    if (!args.filterStatus) {
      const pending = await ctx.db
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
        .order("desc")
        .collect();
      items.push(...pending);
    }

    return _enrichWithUrls(ctx, items);
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
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_copy", (q) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("isCopy", true),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    if (args.recipientStatusFilter) {
      items = items.filter((i) => i.recipientStatus === args.recipientStatusFilter);
    }

    return _enrichWithUrls(ctx, items);
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
  },
  handler: async (ctx, args) => {
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
      .collect();

    if (args.filter === "non_lus") {
      const userId = ctx.user._id as string;
      items = items.filter((i) => !(i.readByIds ?? []).includes(userId));
    } else if (args.filter === "non_enregistres") {
      items = items.filter((i) => !i.arrivalReference);
    } else if (args.filter === "assignes_a_moi") {
      items = items.filter((i) => i.assignedToId === ctx.user._id);
    }

    return _enrichWithUrls(ctx, items);
  },
});

/**
 * CORBEILLE — Items soft-deleted.
 */
export const getCorbeille = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org", (q) =>
        q.eq("copyOwnerOrgId", args.orgId),
      )
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    return _enrichWithUrls(ctx, items);
  },
});

/**
 * Compteurs pour la navigation (badges).
 */
export const getEspaceCounts = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Brouillons (draft + pending, non-copie)
    const drafts = await ctx.db
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
      .collect();
    const pendings = await ctx.db
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
      .collect();

    // Envoyés (copies)
    const envoyes = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org_copy", (q) =>
        q.eq("copyOwnerOrgId", args.orgId).eq("isCopy", true),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Reçus
    const recus = await ctx.db
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
      .collect();

    // Non lus parmi les reçus
    const userId = ctx.user._id as string;
    const nonLus = recus.filter((i) => !(i.readByIds ?? []).includes(userId));

    // Corbeille
    const corbeille = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_owner_org", (q) =>
        q.eq("copyOwnerOrgId", args.orgId),
      )
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

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
    if (!item) throw new Error("Dossier de correspondance introuvable");
    if (item.status !== "draft") {
      throw new Error("Seul un brouillon peut être envoyé");
    }

    // Vérifier les documents
    const docs = item.documents ?? [];
    if (docs.length === 0 && item.attachments.length === 0) {
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
              const matchingRule = chainConfig.find((rule: any) => {
                if (rule.conditionType === "always") return true;
                if (rule.conditionType === "if_external" && item.primaryRecipientOrgId) return true;
                if (rule.conditionType === "if_recipient_rank_above") return true;
                return gradeOrder.indexOf(sup.grade) >= gradeOrder.indexOf(rule.roleMinimum);
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
async function _executeEnvoi(ctx: any, itemId: any, item: any, now: number) {
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
    recipientStatus: "recu",
    recipientStatusUpdatedAt: now,
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
    attachments: item.attachments ?? [],
    documents: (item.documents ?? []).map((d: any) => ({
      ...d,
      copyWatermark: false,
    })),
    confidentialite: item.confidentialite ?? "standard",
    parentItemId: item.parentItemId,
    dateReponseAttendue: item.dateReponseAttendue,
    readByIds: [],
    createdAt: now,
    updatedAt: now,
  });

  // Transformer l'item source en COPIE chez l'expéditeur
  await ctx.db.patch(itemId, {
    isCopy: true,
    status: "sent",
    sentAt: now,
    copyOwnerOrgId: item.copyOwnerOrgId ?? item.orgId,
    originalItemId: originalId,
    recipientStatus: "recu",
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
    comment: `Correspondance envoyée à ${item.recipientName}`,
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
    if (!item) throw new Error("Dossier introuvable");
    if (item.status !== "pending") {
      throw new Error("Ce dossier n'est pas en attente d'approbation");
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
    if (!item) throw new Error("Dossier introuvable");

    // Rejeter les étapes d'approbation pendantes
    const steps = await ctx.db
      .query("correspondanceApprovalSteps")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
    for (const step of steps.filter((s) => s.status === "pending")) {
      await ctx.db.patch(step._id, { status: "rejected", decidedAt: now });
    }

    await ctx.db.patch(args.itemId, {
      status: "draft",
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
    arrivalReference: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Correspondance introuvable");

    await ctx.db.patch(args.itemId, {
      arrivalReference: args.arrivalReference,
      arrivalDate: now,
      updatedAt: now,
    });

    // Synchroniser le recipientStatus vers la copie de l'expéditeur
    await _syncRecipientStatus(ctx, args.itemId, "recu", now);

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "VIEWED",
      actorId: ctx.user._id,
      actorName: ctx.user.name ?? ctx.user.email,
      comment: `Enregistré sous réf. d'arrivée : ${args.arrivalReference}`,
      isRead: true,
      createdAt: now,
    });
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
    if (!item) throw new Error("Correspondance introuvable");

    const org = await ctx.db.get(item.copyOwnerOrgId ?? item.orgId) as any;
    const reference = generateReference(args.type);

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
      attachments: [],
      documents: [],
      confidentialite: item.confidentialite ?? "standard",
      parentItemId: args.itemId,
      readByIds: [ctx.user._id as string],
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
async function _syncRecipientStatus(
  ctx: any,
  receivedItemId: any,
  newStatus: string,
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

    // URLs des documents enrichis
    const docsWithUrls = await Promise.all(
      (item.documents ?? []).map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );

    // URLs des attachments legacy
    const attachmentsWithUrls = await Promise.all(
      (item.attachments ?? []).map(async (att) => ({
        ...att,
        url: await ctx.storage.getUrl(att.storageId),
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
      attachments: attachmentsWithUrls,
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

// ═════════════════════════════════════════════════════════════════════════════
// HELPER — Enrichir avec les URLs de storage
// ═════════════════════════════════════════════════════════════════════════════

async function _enrichWithUrls(ctx: any, items: any[]) {
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
        documentCount: (item.documents ?? []).length || item.attachments?.length || 0,
      };
    }),
  );
}
