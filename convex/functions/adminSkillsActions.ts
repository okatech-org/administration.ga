/**
 * Actions write du module super-admin /skills.
 *
 *   - `runAiEnrichment` : déclenche un run global d'enrichissement IA
 *     (wrap de `migrations/backfillProfessionSkills.run`) avec écriture
 *     du résultat dans `aiEnrichmentRuns`.
 *   - `enrichOne` : enrichit un profil ciblé via Gemini.
 *   - `classifyManually` : override manuel de la catégorie d'un profil
 *     (et clear des suggestions IA pour repartir d'une page blanche).
 *   - `sendReengagement` : envoie email + crée notif in-app pour relancer
 *     un utilisateur sur ses suggestions IA non validées.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import {
  superadminAction,
  superadminMutation,
} from "../lib/customFunctions";
import { NotificationType, SkillLevel } from "../lib/constants";
import {
  PROFESSION_CATEGORY_VALUES,
  ProfessionCategory,
  type ProfessionCategoryValue,
} from "../lib/validators";
import { extractJSON, generate } from "../lib/ai/gemini";
import { resend } from "./notifications";

// ════════════════════════════════════════════════════════════════════
// 1. runAiEnrichment — Run IA global avec tracking dans aiEnrichmentRuns
// ════════════════════════════════════════════════════════════════════

// Crée une row "running" dans aiEnrichmentRuns ; retourne l'_id.
export const startRun = internalMutation({
  args: {
    triggeredBy: v.union(
      v.literal("manual"),
      v.literal("scheduled"),
      v.literal("one_off"),
    ),
    triggeredByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiEnrichmentRuns", {
      startedAt: Date.now(),
      processed: 0,
      success: 0,
      failed: 0,
      triggeredBy: args.triggeredBy,
      triggeredByUserId: args.triggeredByUserId,
      status: "running",
    });
  },
});

// Patch la row avec les compteurs finaux + status.
export const completeRun = internalMutation({
  args: {
    runId: v.id("aiEnrichmentRuns"),
    counts: v.object({
      total: v.number(),
      skippedAlreadyEnriched: v.number(),
      skippedNoTitle: v.number(),
      aiSuccess: v.number(),
      aiFailed: v.number(),
      profilesPatched: v.number(),
      cvsEnriched: v.number(),
    }),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return;
    const finishedAt = Date.now();
    await ctx.db.patch(args.runId, {
      finishedAt,
      processed: args.counts.total,
      success: args.counts.aiSuccess,
      failed: args.counts.aiFailed,
      skippedAlreadyEnriched: args.counts.skippedAlreadyEnriched,
      skippedNoTitle: args.counts.skippedNoTitle,
      profilesPatched: args.counts.profilesPatched,
      cvsEnriched: args.counts.cvsEnriched,
      durationMs: finishedAt - run.startedAt,
      status: args.errorMessage ? "failed" : "completed",
      ...(args.errorMessage ? { errorMessage: args.errorMessage } : {}),
    });
  },
});

/**
 * Action publique super-admin : lance un run IA + écrit la row.
 * Exposée à l'UI via `api.functions.adminSkillsActions.runAiEnrichment`.
 *
 * Le wrapping isole les compteurs : on ne dépend pas du return type
 * exact de l'action interne (qui pourrait évoluer).
 */
type BackfillCounts = {
  total: number;
  skippedAlreadyEnriched: number;
  skippedNoTitle: number;
  aiSuccess: number;
  aiFailed: number;
  profilesPatched: number;
  cvsEnriched: number;
};

export const runAiEnrichment = superadminAction({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    delayMs: v.optional(v.number()),
  },
  // Annotation explicite : Convex génère des types récursifs sur les
  // self-references via `internal.…`, le compilateur perd la trace.
  handler: async (ctx, args): Promise<{ runId: string; counts: BackfillCounts }> => {
    const runId: string = await ctx.runMutation(
      internal.functions.adminSkillsActions.startRun,
      { triggeredBy: "manual" },
    );
    try {
      const counts: BackfillCounts = await ctx.runAction(
        internal.migrations.backfillProfessionSkills.run,
        {
          dryRun: args.dryRun ?? false,
          limit: args.limit,
          delayMs: args.delayMs,
        },
      );
      await ctx.runMutation(
        internal.functions.adminSkillsActions.completeRun,
        { runId: runId as any, counts },
      );
      return { runId, counts };
    } catch (err) {
      await ctx.runMutation(
        internal.functions.adminSkillsActions.completeRun,
        {
          runId: runId as any,
          counts: {
            total: 0,
            skippedAlreadyEnriched: 0,
            skippedNoTitle: 0,
            aiSuccess: 0,
            aiFailed: 0,
            profilesPatched: 0,
            cvsEnriched: 0,
          },
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      );
      throw err;
    }
  },
});

// ════════════════════════════════════════════════════════════════════
// 2. enrichOne — enrichissement IA ciblé sur 1 profil
// ════════════════════════════════════════════════════════════════════

function buildPrompt(title: string): string {
  const categories = PROFESSION_CATEGORY_VALUES.join(", ");
  return `Tu es un expert RH. À partir d'un intitulé de métier libre saisi par un Gabonais de la diaspora, retourne UN JSON strict (aucun texte hors JSON, aucun bloc markdown).

Intitulé saisi : "${title}"

Catégories autorisées (choisir EXACTEMENT UNE valeur de cette liste) :
${categories}

Règles :
- "category" doit être l'une des valeurs ci-dessus, en minuscules, exactement. Si rien ne correspond clairement, utilise "autre".
- "skills" : 6 à 10 compétences typiques de ce métier, en français, concrètes et filtrables (ex: "Soins infirmiers", "Suturage" plutôt que "Travail d'équipe"). Mélange compétences techniques et transverses si pertinent. Sans niveaux, sans doublons, sans phrases.

Réponds UNIQUEMENT en JSON :
{
  "category": "...",
  "skills": ["...", "..."]
}`;
}

// Lit le profile.title pour l'action (sans accès db direct depuis l'action).
export const getEnrichmentTitle = internalMutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;
    return {
      userId: profile.userId,
      title: profile.profession?.title?.trim() ?? null,
    };
  },
});

export const enrichOne = superadminAction({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    // 1. Récupère le title.
    const probe = await ctx.runMutation(
      internal.functions.adminSkillsActions.getEnrichmentTitle,
      { profileId: args.profileId },
    );
    if (!probe || !probe.title) {
      throw new Error("Profile has no profession.title to enrich");
    }
    // 2. Appel Gemini.
    let category: ProfessionCategoryValue = ProfessionCategory.other;
    let skills: string[] = [];
    try {
      const raw = await generate(buildPrompt(probe.title));
      const parsed = extractJSON(raw) as {
        category?: unknown;
        skills?: unknown;
      };
      const catRaw =
        typeof parsed.category === "string"
          ? parsed.category.toLowerCase().trim()
          : "";
      category = (PROFESSION_CATEGORY_VALUES as readonly string[]).includes(
        catRaw,
      )
        ? (catRaw as ProfessionCategoryValue)
        : ProfessionCategory.other;
      if (Array.isArray(parsed.skills)) {
        const seen = new Set<string>();
        for (const s of parsed.skills) {
          if (typeof s !== "string") continue;
          const trimmed = s.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          skills.push(trimmed);
        }
      }
    } catch (err) {
      throw new Error(
        `Gemini call failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (skills.length === 0) {
      throw new Error("Gemini returned no usable skills");
    }
    // 3. Patch côté DB.
    await ctx.runMutation(
      internal.functions.adminSkillsActions.applyEnrichment,
      {
        profileId: args.profileId,
        category,
        skills,
      },
    );
    return { category, skills };
  },
});

// Mutation interne qui patche profession + merge CV skills si CV existe.
export const applyEnrichment = internalMutation({
  args: {
    profileId: v.id("profiles"),
    category: v.string(),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return;
    const profession = profile.profession ?? {};
    await ctx.db.patch(args.profileId, {
      profession: {
        ...profession,
        category: args.category as ProfessionCategoryValue,
        aiSuggestedSkills: args.skills,
        aiEnrichedAt: Date.now(),
      },
    });
    // Merge dans le CV (si présent) — niveau default intermediate, sans doublon.
    const cv = await ctx.db
      .query("cv")
      .withIndex("by_user", (q) => q.eq("userId", profile.userId))
      .unique();
    if (!cv) return;
    const existing = new Set(
      (cv.skills ?? []).map((s) => s.name.toLowerCase().trim()),
    );
    const toAdd = args.skills
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && !existing.has(n.toLowerCase()));
    if (toAdd.length === 0) return;
    await ctx.db.patch(cv._id, {
      skills: [
        ...(cv.skills ?? []),
        ...toAdd.map((name) => ({ name, level: SkillLevel.Intermediate })),
      ],
      updatedAt: Date.now(),
    });
  },
});

// ════════════════════════════════════════════════════════════════════
// 3. classifyManually — override manuel de la catégorie
// ════════════════════════════════════════════════════════════════════
// Utilisé sur les "AI failures" (Tab Santé) où l'IA n'arrive pas à
// catégoriser un métier libre. Le super-admin force la catégorie et on
// efface les suggestions IA (qui étaient vides ou inutilisables).

const professionCategoryArgValidator = v.union(
  ...PROFESSION_CATEGORY_VALUES.map((c) => v.literal(c)),
);

export const classifyManually = superadminMutation({
  args: {
    profileId: v.id("profiles"),
    category: professionCategoryArgValidator,
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profile not found");
    const profession = profile.profession ?? {};
    await ctx.db.patch(args.profileId, {
      profession: {
        ...profession,
        category: args.category,
        // On garde aiEnrichedAt pour ne pas re-déclencher un run, mais on
        // efface les aiSuggestedSkills si elles étaient vides (le triggers
        // se charge de la dénormalisation).
        aiEnrichedAt: profession.aiEnrichedAt ?? Date.now(),
      },
    });
  },
});

// ════════════════════════════════════════════════════════════════════
// 4. sendReengagement — email + notif pour relancer l'utilisateur
// ════════════════════════════════════════════════════════════════════
// Cible : profils ayant au moins 1 aiSuggestedSkill non validée dans
// leur CV. L'idée est de leur proposer de revoir et valider ces
// suggestions pour enrichir leur visibilité.

export const sendReengagement = superadminAction({
  args: {
    profileId: v.id("profiles"),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ctxInfo = await ctx.runMutation(
      internal.functions.adminSkillsActions.prepareReengagement,
      { profileId: args.profileId },
    );
    if (!ctxInfo) throw new Error("Profile or user not found");
    if (!ctxInfo.email) throw new Error("User has no email");

    const subject = "Validez vos compétences suggérées · Consulat.ga";
    const body = `
      <p>Bonjour ${ctxInfo.firstName ?? ""},</p>
      <p>
        Sur la base de votre métier déclaré <strong>${ctxInfo.profession ?? ""}</strong>,
        nous avons suggéré <strong>${ctxInfo.suggestedCount}</strong> compétences
        à ajouter à votre CV consulaire.
      </p>
      <p>
        En validant ces suggestions, vous augmentez vos chances d'être contacté(e)
        pour des opportunités de coopération entre le Gabon et votre pays de résidence.
      </p>
      ${args.customMessage ? `<p>${args.customMessage}</p>` : ""}
      <p>
        <a href="https://consulat.ga/my-space/cv" style="color:#0b4f9c;">
          Voir mes suggestions →
        </a>
      </p>
    `;
    try {
      await resend.sendEmail(ctx, {
        from: "Consulat.ga <no-reply@consulat.ga>",
        to: ctxInfo.email,
        subject,
        html: body,
      });
    } catch (err) {
      // L'email peut échouer (Resend down, etc.) — on continue avec la
      // notif in-app pour ne pas bloquer le re-engagement.
      console.error("[skills] sendReengagement email failed:", err);
    }
    await ctx.runMutation(
      internal.functions.notifications.createNotification,
      {
        userId: ctxInfo.userId,
        type: NotificationType.ActionRequired,
        title: "Validez vos compétences suggérées",
        body: `${ctxInfo.suggestedCount} compétences ont été suggérées pour votre CV consulaire. Cliquez pour les vérifier.`,
        link: "/my-space/cv",
      },
    );
    return { ok: true };
  },
});

// Internal helper : hydrate le contexte nécessaire au mail + notif.
export const prepareReengagement = internalMutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;
    const user = await ctx.db.get(profile.userId);
    if (!user) return null;
    return {
      userId: profile.userId,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      profession: profile.profession?.title ?? null,
      suggestedCount: profile.profession?.aiSuggestedSkills?.length ?? 0,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 5. sendReengagementBatchBySkill — relance par lot tous les profils
//    ayant une `aiSuggestedSkillItem` pour ce skill (canonical key).
// ════════════════════════════════════════════════════════════════════
// Limite hard-coded à 200 destinataires pour éviter les abus. Au-delà,
// faire passer par un job dédié.

export const listSkillBatch = internalMutation({
  args: { skillName: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("aiSuggestedSkillItems")
      .withIndex("by_skillName", (q) => q.eq("skillName", args.skillName))
      .take(args.limit);
    // Dédup par profileId (un même profile pourrait avoir le skill deux fois
    // en théorie via dénormalisation).
    const seen = new Set<string>();
    const profileIds: import("../_generated/dataModel").Id<"profiles">[] = [];
    for (const it of items) {
      const key = String(it.profileId);
      if (seen.has(key)) continue;
      seen.add(key);
      profileIds.push(it.profileId);
    }
    return profileIds;
  },
});

export const sendReengagementBatchBySkill = superadminAction({
  args: {
    skillName: v.string(),
    customMessage: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ targeted: number; sent: number; failed: number }> => {
    const limit = Math.min(args.limit ?? 200, 200);
    const profileIds: import("../_generated/dataModel").Id<"profiles">[] =
      await ctx.runMutation(
        internal.functions.adminSkillsActions.listSkillBatch,
        { skillName: args.skillName.toLowerCase().trim(), limit },
      );
    let sent = 0;
    let failed = 0;
    for (const profileId of profileIds) {
      try {
        await ctx.runAction(
          internal.functions.adminSkillsActions.sendOneReengagement,
          { profileId, customMessage: args.customMessage },
        );
        sent++;
      } catch (err) {
        console.error("[skills] sendReengagementBatchBySkill: one failed", err);
        failed++;
      }
    }
    return { targeted: profileIds.length, sent, failed };
  },
});

// Internal mirror du flux `sendReengagement` pour réutilisation depuis
// le batch sans re-passer par superadminAction (qui re-checke
// l'identité à chaque appel — coûteux dans une boucle).
export const sendOneReengagement = internalAction({
  args: {
    profileId: v.id("profiles"),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ctxInfo = await ctx.runMutation(
      internal.functions.adminSkillsActions.prepareReengagement,
      { profileId: args.profileId },
    );
    if (!ctxInfo || !ctxInfo.email) return;
    try {
      await resend.sendEmail(ctx, {
        from: "Consulat.ga <no-reply@consulat.ga>",
        to: ctxInfo.email,
        subject: "Validez vos compétences suggérées · Consulat.ga",
        html: `
          <p>Bonjour ${ctxInfo.firstName ?? ""},</p>
          <p>Sur la base de votre métier <strong>${ctxInfo.profession ?? ""}</strong>,
          nous avons suggéré ${ctxInfo.suggestedCount} compétences à ajouter à votre CV.</p>
          ${args.customMessage ? `<p>${args.customMessage}</p>` : ""}
          <p><a href="https://consulat.ga/my-space/cv">Voir mes suggestions →</a></p>
        `,
      });
    } catch (err) {
      console.error("[skills] sendOneReengagement email failed:", err);
    }
    await ctx.runMutation(
      internal.functions.notifications.createNotification,
      {
        userId: ctxInfo.userId,
        type: NotificationType.ActionRequired,
        title: "Validez vos compétences suggérées",
        body: `${ctxInfo.suggestedCount} compétences suggérées sont en attente de validation.`,
        link: "/my-space/cv",
      },
    );
  },
});
