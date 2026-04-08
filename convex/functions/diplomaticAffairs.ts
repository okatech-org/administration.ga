/**
 * Affaires Diplomatiques — Fonctions Convex
 *
 * Pipeline IA complet : Cibles → Plan → Lettre → Rapport → Projet
 * CRUD + logique pipeline pour les 6 tables diplomatiques.
 */

import { v } from "convex/values";
import { authMutation, authQuery, superadminMutation, superadminQuery } from "../lib/customFunctions";
import {
  pipelinePhaseValidator,
  targetTypeValidator,
  targetStatusValidator,
  priorityValidator,
} from "../schemas/diplomaticAffairs";
import { internal } from "../_generated/api";

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
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
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

    // Dédoublonnage : vérifier si une cible avec le même nom existe déjà
    const normalizedName = args.name.trim().toLowerCase();
    const existingTargets = await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const duplicate = existingTargets.find(
      (t) => t.name.trim().toLowerCase() === normalizedName,
    );
    if (duplicate) {
      // Retourner l'ID existant au lieu de créer un doublon
      return duplicate._id;
    }

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

export const deleteTarget = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.targetId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
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

    // Hook : générer le PDF du rapport soumis
    if (args.status === "submitted") {
      const report = await ctx.db.get(args.reportId);
      if (report?.targetIds?.length) {
        for (const targetId of report.targetIds) {
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

    return await ctx.db.insert("diplomaticProjects", {
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
    const targets = await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const letters = await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const plans = await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const reports = await ctx.db
      .query("diplomaticReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const projects = await ctx.db
      .query("diplomaticProjects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return {
      targets: {
        total: targets.length,
        byStatus: groupBy(targets, "status"),
        byPriority: groupBy(targets, "priority"),
        byPhase: groupBy(targets, "pipelinePhase"),
      },
      letters: {
        total: letters.length,
        byStatus: groupBy(letters, "status"),
      },
      plans: {
        total: plans.length,
        active: plans.filter((p) => p.status === "active").length,
      },
      reports: {
        total: reports.length,
        pending: reports.filter((r) => r.status === "pending_review").length,
      },
      projects: {
        total: projects.length,
        active: projects.filter((p) => p.status === "in_progress").length,
        validated: projects.filter((p) => p.status === "validated").length,
      },
    };
  },
});

function groupBy<T extends Record<string, unknown>>(
  items: T[],
  key: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const val = (item[key] as string) ?? "unassigned";
    result[val] = (result[val] ?? 0) + 1;
  }
  return result;
}

