/**
 * Affaires Diplomatiques — Fonctions Convex
 *
 * Pipeline IA complet : Cibles → Plan → Lettre → Rapport → Projet
 * CRUD + logique pipeline pour les 6 tables diplomatiques.
 */

import { v } from "convex/values";
import { internalMutation as rawInternalMutation } from "../_generated/server";
import { authMutation, authQuery, superadminMutation, superadminQuery } from "../lib/customFunctions";
import {
  pipelinePhaseValidator,
  targetTypeValidator,
  targetStatusValidator,
  priorityValidator,
  strategicAnalysisValidator,
  projectFrameworkValidator,
} from "../schemas/diplomaticAffairs";
import { internal } from "../_generated/api";
import {
  diplomaticTargetsByOrg,
  diplomaticLettersByOrg,
  diplomaticPlansByOrg,
  diplomaticReportsByOrg,
  diplomaticProjectsByOrg,
} from "../lib/aggregates";

// ─── Matrice de transitions du pipeline ─────────────────────────────────────

const PIPELINE_TRANSITIONS: Record<string, string[]> = {
  targeting: ["strategy"],
  strategy: ["outreach", "targeting"],
  outreach: ["reporting", "strategy"],
  reporting: ["project", "outreach"],
  project: [],
};

// ═════════════════════════════════════════════════════════════════════════════
// CIBLES
// ═════════════════════════════════════════════════════════════════════════════

export const listTargets = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("archivedAt"), undefined),
        ),
      )
      .collect();
  },
});

/** Liste les cibles archivées par la représentation (pas supprimées) */
export const listArchivedTargets = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("archivedAt"), undefined),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();
  },
});

/** Restaure une cible archivée (remet en cible active) */
/** Restaure une cible archivée + ses documents reviennent de iArchive */
export const restoreTarget = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const target = await ctx.db.get(args.targetId);
    if (!target) throw new Error("Cible introuvable");

    // 1. Restaurer la cible
    await ctx.db.patch(args.targetId, {
      archivedAt: undefined,
      updatedAt: now,
    });

    // 2. Cascade : restaurer les plans lies
    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const plan of plans) {
      if (plan.deletedAt) {
        await ctx.db.patch(plan._id, { deletedAt: undefined, updatedAt: now });
      }
    }

    // 3. Cascade : restaurer les lettres liees
    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const letter of letters) {
      if (letter.deletedAt) {
        await ctx.db.patch(letter._id, { deletedAt: undefined, updatedAt: now });
      }
    }

    // 4. Cascade : restaurer les projets lies
    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const project of projects) {
      if (project.deletedAt) {
        await ctx.db.patch(project._id, { deletedAt: undefined, updatedAt: now });
      }
    }

    // 5. Restaurer les documents iDocument depuis iArchive
    const targetTag = `diplomatic:target:${args.targetId}`;
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .collect();
    const targetFolder = folders.find((f) => f.tags.includes(targetTag));

    if (targetFolder) {
      if (targetFolder.deletedAt) {
        await ctx.db.patch(targetFolder._id, {
          deletedAt: undefined,
          updatedAt: now,
        });
      }

      const docs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", targetFolder._id))
        .collect();
      for (const doc of docs) {
        if (doc.archivedAt) {
          await ctx.db.patch(doc._id, {
            archivedAt: undefined,
            archivedBy: undefined,
            archiveCategorySlug: undefined,
            updatedAt: now,
          });
        }
      }
    }
  },
});

/** Supprime definitivement une cible archivee → corbeille superadmin + cascade sur tout le pipeline */
export const permanentlyDeleteArchivedTarget = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const target = await ctx.db.get(args.targetId);
    if (!target?.archivedAt)
      throw new Error("La cible doit etre archivee avant d'etre supprimee");

    // 1. Mettre la cible en corbeille superadmin
    await ctx.db.patch(args.targetId, {
      deletedAt: now,
      updatedAt: now,
    });

    // 2. Cascade : supprimer les plans lies
    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const plan of plans) {
      if (!plan.deletedAt) {
        await ctx.db.patch(plan._id, { deletedAt: now, updatedAt: now });
      }
    }

    // 3. Cascade : supprimer les lettres liees
    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const letter of letters) {
      if (!letter.deletedAt) {
        await ctx.db.patch(letter._id, { deletedAt: now, updatedAt: now });
      }
    }

    // 4. Cascade : supprimer les projets lies
    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const project of projects) {
      if (!project.deletedAt) {
        await ctx.db.patch(project._id, { deletedAt: now, updatedAt: now });
      }
    }

    // 5. Cascade : nettoyer les rapports (retirer la reference)
    const allReports = await ctx.db
      .query("diplomaticReports")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .collect();
    for (const report of allReports) {
      if (report.targetIds?.includes(args.targetId)) {
        const newTargetIds = report.targetIds.filter(
          (id) => id !== args.targetId,
        );
        if (newTargetIds.length === 0 && !report.deletedAt) {
          await ctx.db.patch(report._id, { deletedAt: now, updatedAt: now });
        } else if (newTargetIds.length > 0) {
          await ctx.db.patch(report._id, {
            targetIds: newTargetIds,
            updatedAt: now,
          });
        }
      }
    }

    // 6. Supprimer le dossier cible dans documentFolders
    const targetTag = `diplomatic:target:${args.targetId}`;
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .collect();
    const targetFolder = folders.find((f) => f.tags.includes(targetTag));

    if (targetFolder) {
      await ctx.db.patch(targetFolder._id, {
        deletedAt: now,
        updatedAt: now,
      });

      // Supprimer aussi les documents diplomatiques du registre
      const dipDocs = await ctx.db
        .query("diplomaticDocuments")
        .withIndex("by_folder", (q) => q.eq("folderId", targetFolder._id))
        .collect();
      for (const dd of dipDocs) {
        if (!dd.deletedAt) {
          await ctx.db.patch(dd._id, { deletedAt: now });
        }
      }
    }
  },
});

export const getTargetsByPhase = authQuery({
  args: {
    orgId: v.id("orgs"),
    phase: pipelinePhaseValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org_pipeline", (q) =>
        q.eq("orgId", args.orgId).eq("pipelinePhase", args.phase),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const getTarget = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.targetId);
  },
});

export const createTarget = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    type: targetTypeValidator,
    sector: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    priority: priorityValidator,
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // Champs pipeline IA
    pipelinePhase: v.optional(pipelinePhaseValidator),
    opportunityScore: v.optional(v.number()),
    matchReason: v.optional(v.string()),
    aiDiscoveryData: v.optional(
      v.object({
        source: v.string(),
        searchQuery: v.string(),
        executivePriority: v.string(),
        aiConfidence: v.number(),
        discoveredAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Dedoublonnage : verifier si une cible ACTIVE (non-archivee, non-supprimee) existe deja
    const normalizedName = args.name.trim().toLowerCase();
    const existingTargets = await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeDuplicate = existingTargets.find(
      (t) =>
        t.name.trim().toLowerCase() === normalizedName &&
        !t.deletedAt &&
        !t.archivedAt,
    );
    if (activeDuplicate) {
      // Une cible active avec ce nom existe → retourner l'ID existant
      return activeDuplicate._id;
    }

    // Si une cible archivee/supprimee existe avec ce nom, on cree quand meme
    // une NOUVELLE cible (nouveau pipeline, pas d'anciens plans lies)

    const targetId = await ctx.db.insert("diplomaticTargets", {
      ...args,
      tags: args.tags ?? [],
      status: "identified",
      pipelinePhase: args.pipelinePhase ?? "targeting",
      notes: undefined,
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Hook : créer le dossier opérateur dans iDocument
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFolders.internalEnsureOperatorFolders,
      {
        orgId: args.orgId,
        targetId,
        targetName: args.name,
        sector: args.sector || "Autre",
        createdBy: ctx.user._id,
      },
    );

    return targetId;
  },
});

export const updateTarget = authMutation({
  args: {
    targetId: v.id("diplomaticTargets"),
    name: v.optional(v.string()),
    type: v.optional(targetTypeValidator),
    sector: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    status: v.optional(targetStatusValidator),
    priority: v.optional(priorityValidator),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    opportunityScore: v.optional(v.number()),
    matchReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { targetId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(targetId, patch);
  },
});

export const advancePhase = authMutation({
  args: {
    targetId: v.id("diplomaticTargets"),
    newPhase: pipelinePhaseValidator,
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (!target) throw new Error("Cible introuvable");

    const currentPhase = target.pipelinePhase ?? "targeting";
    const allowed = PIPELINE_TRANSITIONS[currentPhase] ?? [];
    if (!allowed.includes(args.newPhase)) {
      throw new Error(
        `Transition invalide : ${currentPhase} → ${args.newPhase}. Transitions autorisées : ${allowed.join(", ")}`,
      );
    }

    await ctx.db.patch(args.targetId, {
      pipelinePhase: args.newPhase,
      updatedAt: Date.now(),
    });

    // Hook : régénérer la fiche cible
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateTargetFiche,
      { targetId: args.targetId },
    );
  },
});

/** Archive une cible + ses documents vont dans iArchive */
export const deleteTarget = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const target = await ctx.db.get(args.targetId);
    if (!target) throw new Error("Cible introuvable");

    // 1. Archiver la cible
    await ctx.db.patch(args.targetId, {
      archivedAt: now,
      updatedAt: now,
    });

    // 2. Cascade : archiver les plans lies
    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const plan of plans) {
      if (!plan.deletedAt) {
        await ctx.db.patch(plan._id, { deletedAt: now, updatedAt: now });
      }
    }

    // 3. Cascade : archiver les lettres liees
    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const letter of letters) {
      if (!letter.deletedAt) {
        await ctx.db.patch(letter._id, { deletedAt: now, updatedAt: now });
      }
    }

    // 4. Cascade : archiver les projets lies
    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const project of projects) {
      if (!project.deletedAt) {
        await ctx.db.patch(project._id, { deletedAt: now, updatedAt: now });
      }
    }

    // 5. Cascade : archiver les rapports qui referencent cette cible
    //    (rapports multi-cibles — on ne supprime pas, on retire la reference)
    const allReports = await ctx.db
      .query("diplomaticReports")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    for (const report of allReports) {
      if (report.targetIds?.includes(args.targetId)) {
        const newTargetIds = report.targetIds.filter(
          (id) => id !== args.targetId,
        );
        // Si plus aucune cible active, archiver le rapport aussi
        if (newTargetIds.length === 0) {
          await ctx.db.patch(report._id, { deletedAt: now, updatedAt: now });
        } else {
          await ctx.db.patch(report._id, {
            targetIds: newTargetIds,
            updatedAt: now,
          });
        }
      }
    }

    // 6. Archiver les documents iDocument lies (les envoyer dans iArchive)
    const targetTag = `diplomatic:target:${args.targetId}`;
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    const targetFolder = folders.find((f) => f.tags.includes(targetTag));

    if (targetFolder) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_folder", (q) => q.eq("folderId", targetFolder._id))
        .collect();
      for (const doc of docs) {
        if (!doc.archivedAt) {
          await ctx.db.patch(doc._id, {
            archivedAt: now,
            archivedBy: ctx.user._id,
            archiveCategorySlug: "consulaire",
            updatedAt: now,
          });
        }
      }
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PIPELINE — Vues agrégées
// ═════════════════════════════════════════════════════════════════════════════

export const getPipelineOverview = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const targets = await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const phases = {
      targeting: 0,
      strategy: 0,
      outreach: 0,
      reporting: 0,
      project: 0,
      unassigned: 0,
    };

    for (const t of targets) {
      const phase = t.pipelinePhase;
      if (phase && phase in phases) {
        phases[phase as keyof typeof phases]++;
      } else {
        phases.unassigned++;
      }
    }

    return { total: targets.length, phases };
  },
});

export const getTargetPipeline = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (!target) return null;

    // Récupérer les éléments liés
    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return { target, plans, letters, projects };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PLANS STRATÉGIQUES
// ═════════════════════════════════════════════════════════════════════════════

export const listPlans = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const getPlansByTarget = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createPlan = authMutation({
  args: {
    orgId: v.id("orgs"),
    targetId: v.optional(v.id("diplomaticTargets")),
    title: v.string(),
    period: v.optional(v.string()),
    category: v.union(
      v.literal("bilateral"),
      v.literal("economic"),
      v.literal("cultural"),
      v.literal("security"),
      v.literal("multilateral"),
      v.literal("other"),
    ),
    summary: v.optional(v.string()),
    objectives: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          status: v.union(
            v.literal("planned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("cancelled"),
          ),
          deadline: v.optional(v.number()),
        }),
      ),
    ),
    aiGeneratedContent: v.optional(
      v.object({
        countryNeeds: v.array(v.string()),
        operatorCapabilities: v.array(v.string()),
        mutualBenefits: v.array(v.string()),
        negotiationPoints: v.array(v.string()),
        meetingAgenda: v.array(v.string()),
        risks: v.array(v.string()),
      }),
    ),
    strategicAnalysis: v.optional(strategicAnalysisValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const planId = await ctx.db.insert("diplomaticPlans", {
      ...args,
      objectives: args.objectives ?? [],
      status: "draft",
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Hook : générer les documents du plan dans le dossier cible
    if (args.targetId) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.diplomaticFoldersActions.generatePlanDocument,
        { planId, targetId: args.targetId },
      );
    }

    return planId;
  },
});

export const updatePlan = authMutation({
  args: {
    planId: v.id("diplomaticPlans"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived"),
      ),
    ),
    objectives: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          status: v.union(
            v.literal("planned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("cancelled"),
          ),
          deadline: v.optional(v.number()),
        }),
      ),
    ),
    aiGeneratedContent: v.optional(
      v.object({
        countryNeeds: v.array(v.string()),
        operatorCapabilities: v.array(v.string()),
        mutualBenefits: v.array(v.string()),
        negotiationPoints: v.array(v.string()),
        meetingAgenda: v.array(v.string()),
        risks: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { planId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(planId, patch);
  },
});

/** Regenere les documents (PPTX, DOCX, PDF) d'un plan existant */
export const regeneratePlanDocuments = authMutation({
  args: {
    planId: v.id("diplomaticPlans"),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan introuvable");
    if (!plan.targetId) throw new Error("Plan sans cible associee");

    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generatePlanDocument,
      { planId: args.planId, targetId: plan.targetId },
    );

    return { scheduled: true };
  },
});

export const deletePlan = authMutation({
  args: { planId: v.id("diplomaticPlans") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LETTRES DE CONTACT
// ═════════════════════════════════════════════════════════════════════════════

export const listLetters = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const getLettersByTarget = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createLetter = authMutation({
  args: {
    orgId: v.id("orgs"),
    targetId: v.optional(v.id("diplomaticTargets")),
    planId: v.optional(v.id("diplomaticPlans")),
    subject: v.string(),
    type: v.union(
      v.literal("introduction"),
      v.literal("follow_up"),
      v.literal("invitation"),
      v.literal("proposal"),
      v.literal("thank_you"),
      v.literal("other"),
    ),
    letterFormat: v.optional(
      v.union(
        v.literal("formal_letter"),
        v.literal("email"),
        v.literal("note_verbale"),
        v.literal("invitation"),
      ),
    ),
    recipientName: v.string(),
    recipientTitle: v.optional(v.string()),
    recipientOrg: v.optional(v.string()),
    content: v.optional(v.string()),
    aiDraftContent: v.optional(v.string()),
    meetingDetails: v.optional(
      v.object({
        proposedDate: v.optional(v.string()),
        proposedLocation: v.optional(v.string()),
        agenda: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const year = new Date().getFullYear();
    const n = crypto.randomUUID().replace(/-/g, "").substring(0, 5).toUpperCase();
    const reference = `LD/${year}/${n}`;

    return await ctx.db.insert("diplomaticLetters", {
      ...args,
      reference,
      status: "draft",
      attachments: [],
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLetter = authMutation({
  args: {
    letterId: v.id("diplomaticLetters"),
    subject: v.optional(v.string()),
    content: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientTitle: v.optional(v.string()),
    recipientOrg: v.optional(v.string()),
    meetingDetails: v.optional(
      v.object({
        proposedDate: v.optional(v.string()),
        proposedLocation: v.optional(v.string()),
        agenda: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { letterId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(letterId, patch);
  },
});

export const updateLetterStatus = authMutation({
  args: {
    letterId: v.id("diplomaticLetters"),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("sent"),
      v.literal("responded"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "sent") patch.sentAt = Date.now();
    if (args.status === "responded") patch.respondedAt = Date.now();
    await ctx.db.patch(args.letterId, patch);

    // Hook : générer les documents de la lettre approuvée
    if (args.status === "approved") {
      const letter = await ctx.db.get(args.letterId);
      if (letter?.targetId) {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.diplomaticFoldersActions.generateLetterDocument,
          { letterId: args.letterId, targetId: letter.targetId },
        );
      }
    }
  },
});

/** Déclenche la génération du DOCX pour une lettre (bouton UI) */
export const requestLetterDocxGeneration = authMutation({
  args: { letterId: v.id("diplomaticLetters") },
  handler: async (ctx, args) => {
    const letter = await ctx.db.get(args.letterId);
    if (!letter) throw new Error("Lettre introuvable");
    if (!letter.targetId) throw new Error("Lettre sans cible associee");

    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateLetterDocument,
      { letterId: args.letterId, targetId: letter.targetId },
    );

    return { scheduled: true };
  },
});

export const deleteLetter = authMutation({
  args: { letterId: v.id("diplomaticLetters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.letterId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORTS
// ═════════════════════════════════════════════════════════════════════════════

export const listReports = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createReport = authMutation({
  args: {
    orgId: v.id("orgs"),
    title: v.string(),
    type: v.union(
      v.literal("activity"),
      v.literal("situation"),
      v.literal("mission"),
      v.literal("economic"),
      v.literal("security"),
      v.literal("annual"),
      v.literal("other"),
    ),
    recipient: v.union(
      v.literal("president"),
      v.literal("minister"),
      v.literal("secretary_general"),
      v.literal("direction"),
      v.literal("other"),
    ),
    summary: v.optional(v.string()),
    content: v.optional(v.string()),
    period: v.optional(v.string()),
    targetIds: v.optional(v.array(v.id("diplomaticTargets"))),
    planIds: v.optional(v.array(v.id("diplomaticPlans"))),
    letterIds: v.optional(v.array(v.id("diplomaticLetters"))),
    aiGeneratedSummary: v.optional(v.string()),
    statistics: v.optional(
      v.object({
        totalTargets: v.number(),
        contactedTargets: v.number(),
        meetingsHeld: v.number(),
        projectsInitiated: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("diplomaticReports", {
      ...args,
      status: "draft",
      attachments: [],
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReport = authMutation({
  args: {
    reportId: v.id("diplomaticReports"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    content: v.optional(v.string()),
    aiGeneratedSummary: v.optional(v.string()),
    statistics: v.optional(
      v.object({
        totalTargets: v.number(),
        contactedTargets: v.number(),
        meetingsHeld: v.number(),
        projectsInitiated: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { reportId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(reportId, patch);
  },
});

export const updateReportStatus = authMutation({
  args: {
    reportId: v.id("diplomaticReports"),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("submitted"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "submitted") patch.submittedAt = Date.now();
    await ctx.db.patch(args.reportId, patch);

    // Hook : generer le PDF du rapport soumis (avec validation des cibles)
    if (args.status === "submitted") {
      const report = await ctx.db.get(args.reportId);
      if (report?.targetIds?.length) {
        for (const targetId of report.targetIds) {
          // Verifier que la cible existe encore et n'est pas supprimee
          const target = await ctx.db.get(targetId);
          if (!target || target.deletedAt || target.archivedAt) continue;
          await ctx.scheduler.runAfter(
            0,
            internal.functions.diplomaticFoldersActions.generateReportDocument,
            { reportId: args.reportId, targetId },
          );
        }
      }
    }
  },
});

export const deleteReport = authMutation({
  args: { reportId: v.id("diplomaticReports") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PROJETS DE COOPÉRATION
// ═════════════════════════════════════════════════════════════════════════════

export const listProjects = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const getProjectsByTarget = authQuery({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const getProject = authQuery({
  args: { projectId: v.id("diplomaticProjects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt) return null;
    return project;
  },
});

export const createProject = authMutation({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    planId: v.optional(v.id("diplomaticPlans")),
    reportId: v.optional(v.id("diplomaticReports")),
    title: v.string(),
    projectType: v.union(
      v.literal("cooperation_agreement"),
      v.literal("commercial_contract"),
      v.literal("technical_assistance"),
      v.literal("cultural_exchange"),
      v.literal("infrastructure"),
      v.literal("other"),
    ),
    description: v.optional(v.string()),
    objectives: v.optional(
      v.array(
        v.object({
          title: v.string(),
          status: v.union(
            v.literal("planned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("blocked"),
          ),
          deadline: v.optional(v.number()),
        }),
      ),
    ),
    stakeholders: v.optional(
      v.array(
        v.object({
          name: v.string(),
          role: v.string(),
          organization: v.string(),
          contact: v.optional(v.string()),
        }),
      ),
    ),
    budget: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const year = new Date().getFullYear();
    const n = crypto.randomUUID().replace(/-/g, "").substring(0, 5).toUpperCase();
    const reference = `PC/${year}/${n}`;

    const projectId = await ctx.db.insert("diplomaticProjects", {
      ...args,
      reference,
      objectives: args.objectives ?? [],
      stakeholders: args.stakeholders ?? [],
      status: "draft",
      attachments: [],
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Hook : générer le PDF automatiquement → dossier cible
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateProjectDocument,
      { projectId, targetId: args.targetId },
    );

    return projectId;
  },
});

/** Déclenche la génération du DOCX brouillon pour un projet (appelé par le bouton UI) */
export const requestProjectDocxGeneration = authMutation({
  args: { projectId: v.id("diplomaticProjects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");

    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateProjectDocxDraft,
      { projectId: args.projectId, targetId: project.targetId },
    );

    return { scheduled: true };
  },
});

/** Déclenche la génération du PDF pour un projet → dossier cible (appelé par le bouton UI) */
export const requestProjectPdfGeneration = authMutation({
  args: { projectId: v.id("diplomaticProjects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");

    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateProjectDocument,
      { projectId: args.projectId, targetId: project.targetId },
    );

    return { scheduled: true };
  },
});

/** Enregistre le cadre logique enrichi d'un projet et régénère le PDF associé */
export const enrichProjectWithFramework = authMutation({
  args: {
    projectId: v.id("diplomaticProjects"),
    framework: projectFrameworkValidator,
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");

    await ctx.db.patch(args.projectId, {
      projectFramework: args.framework,
      updatedAt: Date.now(),
    });

    // Régénérer le PDF du projet pour intégrer le cadre logique
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateProjectDocument,
      { projectId: args.projectId, targetId: project.targetId },
    );

    return { projectId: args.projectId };
  },
});

/** Déclenche la génération du PDF pour un rapport → dossier de la première cible référencée */
export const requestReportPdfGeneration = authMutation({
  args: { reportId: v.id("diplomaticReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Rapport introuvable");

    const targetId = report.targetIds?.[0];
    if (!targetId) {
      throw new Error(
        "Le rapport doit référencer au moins une cible pour être exporté",
      );
    }

    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticFoldersActions.generateReportDocument,
      { reportId: args.reportId, targetId },
    );

    return { scheduled: true };
  },
});

export const updateProject = authMutation({
  args: {
    projectId: v.id("diplomaticProjects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    objectives: v.optional(
      v.array(
        v.object({
          title: v.string(),
          status: v.union(
            v.literal("planned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("blocked"),
          ),
          deadline: v.optional(v.number()),
        }),
      ),
    ),
    stakeholders: v.optional(
      v.array(
        v.object({
          name: v.string(),
          role: v.string(),
          organization: v.string(),
          contact: v.optional(v.string()),
        }),
      ),
    ),
    budget: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(projectId, patch);
  },
});

export const updateProjectStatus = authMutation({
  args: {
    projectId: v.id("diplomaticProjects"),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_validation"),
      v.literal("validated"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("suspended"),
      v.literal("cancelled"),
    ),
    validatedBy: v.optional(v.string()),
    validationNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "validated") {
      patch.validatedBy = args.validatedBy;
      patch.validationDate = Date.now();
      if (args.validationNotes) patch.validationNotes = args.validationNotes;
    }
    await ctx.db.patch(args.projectId, patch);

    // Hook : générer les documents du projet validé
    if (args.status === "validated") {
      const project = await ctx.db.get(args.projectId);
      if (project?.targetId) {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.diplomaticFoldersActions.generateProjectDocument,
          { projectId: args.projectId, targetId: project.targetId },
        );
      }
    }
  },
});

export const deleteProject = authMutation({
  args: { projectId: v.id("diplomaticProjects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PRIORITÉS EXÉCUTIVES — Double niveau (global + local)
// ═════════════════════════════════════════════════════════════════════════════

const priorityItemValidator = v.object({
  title: v.string(),
  sector: v.string(),
  description: v.optional(v.string()),
  keywords: v.array(v.string()),
});

// ─── Global (superadmin — s'applique à toutes les représentations) ──────────

export const getGlobalPriorities = superadminQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();
  },
});

export const setGlobalPriorities = superadminMutation({
  args: {
    priorities: v.array(priorityItemValidator),
    defaultTargetsPerSearch: v.optional(v.number()),
    defaultTargetLimitPerYear: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        priorities: args.priorities,
        defaultTargetsPerSearch: args.defaultTargetsPerSearch,
        defaultTargetLimitPerYear: args.defaultTargetLimitPerYear,
        updatedAt: now,
      });
      return existing._id;
    }

    // Pour le global, orgId est celui de l'utilisateur courant mais ce n'est pas filtrant
    const firstOrg = await ctx.db.query("orgs").first();
    return await ctx.db.insert("diplomaticPriorities", {
      orgId: firstOrg!._id,
      createdBy: ctx.user._id,
      scope: "global",
      priorities: args.priorities,
      defaultTargetsPerSearch: args.defaultTargetsPerSearch,
      defaultTargetLimitPerYear: args.defaultTargetLimitPerYear,
      hostCountry: "Global",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── Local (par représentation — enrichit les globales) ─────────────────────

export const getLocalPriorities = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_org_scope", (q) =>
        q.eq("orgId", args.orgId).eq("scope", "local"),
      )
      .first();
  },
});

export const setLocalPriorities = authMutation({
  args: {
    orgId: v.id("orgs"),
    hostCountry: v.string(),
    hostCountryCode: v.optional(v.string()),
    coveredCountries: v.optional(
      v.array(v.object({ name: v.string(), code: v.optional(v.string()) })),
    ),
    priorities: v.array(priorityItemValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Lier aux priorités globales
    const globalPriorities = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();

    const existing = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_org_scope", (q) =>
        q.eq("orgId", args.orgId).eq("scope", "local"),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        priorities: args.priorities,
        hostCountry: args.hostCountry,
        hostCountryCode: args.hostCountryCode,
        coveredCountries: args.coveredCountries,
        globalPriorityId: globalPriorities?._id,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("diplomaticPriorities", {
      orgId: args.orgId,
      createdBy: ctx.user._id,
      scope: "local",
      globalPriorityId: globalPriorities?._id,
      priorities: args.priorities,
      hostCountry: args.hostCountry,
      hostCountryCode: args.hostCountryCode,
      coveredCountries: args.coveredCountries,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── Fusion (pour agent-web — global + local combinés) ──────────────────────

export const getPriorities = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Récupérer les priorités globales
    const globalDoc = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();

    // Récupérer les priorités locales de la représentation
    const localDoc = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_org_scope", (q) =>
        q.eq("orgId", args.orgId).eq("scope", "local"),
      )
      .first();

    if (!globalDoc && !localDoc) return null;

    // Fusionner : priorités globales + locales (sans doublons par titre)
    const globalPriorities = globalDoc?.priorities ?? [];
    const localPriorities = localDoc?.priorities ?? [];
    const globalTitles = new Set(globalPriorities.map((p) => p.title));

    const mergedPriorities = [
      ...globalPriorities,
      ...localPriorities.filter((p) => !globalTitles.has(p.title)),
    ];

    return {
      hostCountry: localDoc?.hostCountry ?? globalDoc?.hostCountry ?? "",
      hostCountryCode: localDoc?.hostCountryCode ?? globalDoc?.hostCountryCode,
      coveredCountries: localDoc?.coveredCountries ?? [],
      priorities: mergedPriorities,
      globalCount: globalPriorities.length,
      localCount: localPriorities.length,
      // Paramètres IA (provenant de la config globale)
      defaultTargetsPerSearch: globalDoc?.defaultTargetsPerSearch ?? 5,
      defaultTargetLimitPerYear: globalDoc?.defaultTargetLimitPerYear ?? 50,
      // Documents sources pour le contexte IA
      sourceDocuments: [
        ...(globalDoc?.sourceDocuments ?? []),
        ...(localDoc?.sourceDocuments ?? []),
      ],
    };
  },
});

// Alias pour compatibilité avec agent-web (formulaire de config)
export const setPriorities = authMutation({
  args: {
    orgId: v.id("orgs"),
    hostCountry: v.string(),
    hostCountryCode: v.optional(v.string()),
    priorities: v.array(priorityItemValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const globalPriorities = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();

    const existing = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_org_scope", (q) =>
        q.eq("orgId", args.orgId).eq("scope", "local"),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        priorities: args.priorities,
        hostCountry: args.hostCountry,
        hostCountryCode: args.hostCountryCode,
        globalPriorityId: globalPriorities?._id,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("diplomaticPriorities", {
      orgId: args.orgId,
      createdBy: ctx.user._id,
      scope: "local",
      globalPriorityId: globalPriorities?._id,
      priorities: args.priorities,
      hostCountry: args.hostCountry,
      hostCountryCode: args.hostCountryCode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// DOCUMENTS SOURCES — Base de connaissances
// ═════════════════════════════════════════════════════════════════════════════

const sourceDocumentArgs = {
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  aiSummary: v.optional(v.string()),
  extractedCount: v.optional(v.number()),
};

export const addGlobalSourceDocument = superadminMutation({
  args: sourceDocumentArgs,
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .first();

    if (!doc) throw new Error("Priorités globales non trouvées. Enregistrez d'abord des priorités.");

    const existing = doc.sourceDocuments ?? [];
    await ctx.db.patch(doc._id, {
      sourceDocuments: [
        ...existing,
        {
          storageId: args.storageId,
          filename: args.filename,
          mimeType: args.mimeType,
          sizeBytes: args.sizeBytes,
          uploadedAt: Date.now(),
          aiSummary: args.aiSummary,
          extractedCount: args.extractedCount,
        },
      ],
      updatedAt: Date.now(),
    });
  },
});

export const addLocalSourceDocument = authMutation({
  args: {
    orgId: v.id("orgs"),
    ...sourceDocumentArgs,
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("diplomaticPriorities")
      .withIndex("by_org_scope", (q) =>
        q.eq("orgId", args.orgId).eq("scope", "local"),
      )
      .first();

    if (!doc) throw new Error("Priorités locales non trouvées. Enregistrez d'abord des priorités.");

    const existing = doc.sourceDocuments ?? [];
    await ctx.db.patch(doc._id, {
      sourceDocuments: [
        ...existing,
        {
          storageId: args.storageId,
          filename: args.filename,
          mimeType: args.mimeType,
          sizeBytes: args.sizeBytes,
          uploadedAt: Date.now(),
          aiSummary: args.aiSummary,
          extractedCount: args.extractedCount,
        },
      ],
      updatedAt: Date.now(),
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// STATISTIQUES DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

export const getDashboardStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const ns = args.orgId;
    const activePrefix = { prefix: [0] as [number] };

    const targetStatuses = [
      "identified",
      "contacted",
      "in_discussion",
      "partnership",
      "inactive",
    ] as const;
    const letterStatuses = [
      "draft",
      "pending_approval",
      "approved",
      "sent",
      "responded",
      "archived",
    ] as const;

    const [
      targetsTotal,
      targetsByStatus,
      lettersTotal,
      lettersByStatus,
      plansTotal,
      plansActive,
      reportsTotal,
      reportsPending,
      projectsTotal,
      projectsActive,
      projectsValidated,
    ] = await Promise.all([
      diplomaticTargetsByOrg.count(ctx, { namespace: ns, bounds: activePrefix }),
      Promise.all(
        targetStatuses.map((s) =>
          diplomaticTargetsByOrg
            .count(ctx, { namespace: ns, bounds: { prefix: [0, s] } })
            .then((n) => [s, n] as const),
        ),
      ),
      diplomaticLettersByOrg.count(ctx, { namespace: ns, bounds: activePrefix }),
      Promise.all(
        letterStatuses.map((s) =>
          diplomaticLettersByOrg
            .count(ctx, { namespace: ns, bounds: { prefix: [0, s] } })
            .then((n) => [s, n] as const),
        ),
      ),
      diplomaticPlansByOrg.count(ctx, { namespace: ns, bounds: activePrefix }),
      diplomaticPlansByOrg.count(ctx, {
        namespace: ns,
        bounds: { prefix: [0, "active"] },
      }),
      diplomaticReportsByOrg.count(ctx, { namespace: ns, bounds: activePrefix }),
      diplomaticReportsByOrg.count(ctx, {
        namespace: ns,
        bounds: { prefix: [0, "pending_review"] },
      }),
      diplomaticProjectsByOrg.count(ctx, { namespace: ns, bounds: activePrefix }),
      diplomaticProjectsByOrg.count(ctx, {
        namespace: ns,
        bounds: { prefix: [0, "in_progress"] },
      }),
      diplomaticProjectsByOrg.count(ctx, {
        namespace: ns,
        bounds: { prefix: [0, "validated"] },
      }),
    ]);

    const toRecord = (pairs: ReadonlyArray<readonly [string, number]>) =>
      Object.fromEntries(pairs.filter(([, n]) => n > 0));

    return {
      targets: {
        total: targetsTotal,
        byStatus: toRecord(targetsByStatus),
        byPriority: {} as Record<string, number>,
        byPhase: {} as Record<string, number>,
      },
      letters: {
        total: lettersTotal,
        byStatus: toRecord(lettersByStatus),
      },
      plans: {
        total: plansTotal,
        active: plansActive,
      },
      reports: {
        total: reportsTotal,
        pending: reportsPending,
      },
      projects: {
        total: projectsTotal,
        active: projectsActive,
        validated: projectsValidated,
      },
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SUPERADMIN — Suppression de cibles
// ═════════════════════════════════════════════════════════════════════════════

/** Soft delete d'une cible (envoie dans la corbeille) */
export const superadminDeleteTarget = superadminMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (!target) throw new Error("Cible introuvable");

    await ctx.db.patch(args.targetId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { deleted: true, name: target.name };
  },
});

/** Purge (soft delete) toutes les cibles d'une représentation */
export const superadminPurgeTargets = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const targets = await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const now = Date.now();
    for (const target of targets) {
      await ctx.db.patch(target._id, { deletedAt: now, updatedAt: now });
    }

    return { scheduledCount: targets.length };
  },
});

/** Suppression définitive depuis la corbeille (hard delete) */
export const superadminPermanentlyDeleteTarget = superadminMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.functions.diplomaticAffairs.internalHardDeleteTarget,
      { targetId: args.targetId },
    );
    return { deleted: true };
  },
});

/** Hard delete interne d'une cible et toutes ses données associées */
export const internalHardDeleteTarget = rawInternalMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (!target) return;

    // 1. Supprimer les documents diplomatiques + fichiers storage
    const dipDocs = await ctx.db
      .query("diplomaticDocuments")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const doc of dipDocs) {
      try { await ctx.storage.delete(doc.storageId); } catch { /* fichier déjà supprimé */ }
      await ctx.db.delete(doc._id);
    }

    // 2. Supprimer le dossier documentFolders lié (via tag) — inclut ceux dans la poubelle
    const allFolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_org", (q) => q.eq("orgId", target.orgId))
      .collect();
    const targetTag = `diplomatic:target:${args.targetId}`;
    for (const f of allFolders) {
      if (f.tags.includes(targetTag)) {
        // Supprimer aussi les documents iDocument liés à ce dossier
        const folderDocs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("folderId", f._id))
          .collect();
        for (const doc of folderDocs) {
          for (const file of doc.files) {
            try { await ctx.storage.delete(file.storageId); } catch { /* déjà supprimé */ }
          }
          await ctx.db.delete(doc._id);
        }
        // Hard delete le dossier
        await ctx.db.delete(f._id);
      }
    }

    // 3. Supprimer les plans liés
    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const p of plans) await ctx.db.delete(p._id);

    // 4. Supprimer les lettres liées
    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const l of letters) await ctx.db.delete(l._id);

    // 5. Supprimer les projets liés
    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_target", (q) => q.eq("targetId", args.targetId))
      .collect();
    for (const p of projects) await ctx.db.delete(p._id);

    // 6. Supprimer la cible elle-même
    await ctx.db.delete(args.targetId);
  },
});

/** Liste toutes les cibles actives de toutes les orgs (superadmin) */
export const superadminListAllTargets = superadminQuery({
  args: {},
  handler: async (ctx) => {
    const targets = await ctx.db
      .query("diplomaticTargets")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return await Promise.all(
      targets.map(async (t) => {
        const org = await ctx.db.get(t.orgId);
        return { ...t, orgName: org?.name ?? "Inconnue", orgSlug: org?.slug ?? "" };
      }),
    );
  },
});

/** Liste tous les éléments supprimés (soft delete) de toutes les tables diplomatiques */
export const superadminListDeletedItems = superadminQuery({
  args: {},
  handler: async (ctx) => {
    const enrichWithOrg = async <T extends { orgId: any }>(items: T[]) =>
      Promise.all(
        items.map(async (item) => {
          const org = await ctx.db.get(item.orgId) as any;
          return { ...item, orgName: org?.name ?? "Inconnue" };
        }),
      );

    const targets = await ctx.db
      .query("diplomaticTargets")
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    const plans = await ctx.db
      .query("diplomaticPlans")
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    const letters = await ctx.db
      .query("diplomaticLetters")
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    const reports = await ctx.db
      .query("diplomaticReports")
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    const projects = await ctx.db
      .query("diplomaticProjects")
      .filter((q) => q.neq(q.field("deletedAt"), undefined))
      .collect();

    return {
      targets: await enrichWithOrg(targets),
      plans: await enrichWithOrg(plans),
      letters: await enrichWithOrg(letters),
      reports: await enrichWithOrg(reports),
      projects: await enrichWithOrg(projects),
    };
  },
});

/** Restaure une cible supprimée (remet deletedAt à undefined) */
export const superadminRestoreTarget = superadminMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.targetId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** Restaure un plan supprimé */
export const superadminRestorePlan = superadminMutation({
  args: { planId: v.id("diplomaticPlans") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** Restaure une lettre supprimée */
export const superadminRestoreLetter = superadminMutation({
  args: { letterId: v.id("diplomaticLetters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.letterId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** Restaure un rapport supprimé */
export const superadminRestoreReport = superadminMutation({
  args: { reportId: v.id("diplomaticReports") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** Restaure un projet supprimé */
export const superadminRestoreProject = superadminMutation({
  args: { projectId: v.id("diplomaticProjects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

