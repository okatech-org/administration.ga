/**
 * Triggers de dénormalisation pour le module /skills.
 *
 * Cascade :
 *   cv update          → sync cvSkillItems (insert/delete/patch level)
 *   cvSkillItems       → maj skillCatalogStats.declaredCount + byLevel
 *   profiles update    → sync aiSuggestedSkillItems + professionTitleStats
 *   aiSuggestedSkillItems → maj skillCatalogStats.aiCount
 *
 * Les aggregates `idempotentTrigger()` sur cvSkillItems / profiles /
 * aiSuggestedSkillItems sont enregistrés à part dans `triggers/index.ts`.
 */
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Change } from "convex-helpers/server/triggers";
import { SkillLevel } from "../lib/constants";

// Les handlers sont enregistrés dans `convex/triggers/index.ts` (pattern
// centralisé du projet).

type ChangeOf<T extends "cv" | "cvSkillItems" | "profiles" | "aiSuggestedSkillItems"> =
  Change<DataModel, T>;

type SkillLevelT = (typeof SkillLevel)[keyof typeof SkillLevel];

function emptyByLevel() {
  return {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    expert: 0,
  };
}

function canonicalSkillName(raw: string): { key: string; display: string } | null {
  const display = raw.trim();
  if (display.length === 0) return null;
  return { key: display.toLowerCase(), display };
}

function canonicalTitle(raw: string): { key: string; display: string } | null {
  const display = raw.trim();
  if (display.length === 0) return null;
  return { key: display.toLowerCase(), display };
}

/**
 * Upsert sur skillCatalogStats : crée le doc si absent, ou patch les
 * compteurs. Retourne la version courante.
 */
async function getOrCreateSkillStats(
  ctx: MutationCtx,
  key: string,
  display: string,
): Promise<Doc<"skillCatalogStats">> {
  const existing = await ctx.db
    .query("skillCatalogStats")
    .withIndex("by_name", (q) => q.eq("skillName", key))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("skillCatalogStats", {
    skillName: key,
    displayName: display,
    declaredCount: 0,
    aiCount: 0,
    byLevel: emptyByLevel(),
  });
  return (await ctx.db.get(id))!;
}

async function bumpSkillDeclared(
  ctx: MutationCtx,
  skillName: string,
  displayName: string,
  level: SkillLevelT,
  delta: 1 | -1,
) {
  const stats = await getOrCreateSkillStats(ctx, skillName, displayName);
  const nextDeclared = Math.max(0, stats.declaredCount + delta);
  const nextByLevel = { ...stats.byLevel };
  nextByLevel[level] = Math.max(0, nextByLevel[level] + delta);
  // Garbage-collect le doc si plus aucune référence (declared+ai = 0).
  if (nextDeclared === 0 && stats.aiCount === 0) {
    await ctx.db.delete(stats._id);
    return;
  }
  await ctx.db.patch(stats._id, {
    declaredCount: nextDeclared,
    byLevel: nextByLevel,
  });
}

async function bumpSkillAi(
  ctx: MutationCtx,
  skillName: string,
  displayName: string,
  delta: 1 | -1,
) {
  const stats = await getOrCreateSkillStats(ctx, skillName, displayName);
  const nextAi = Math.max(0, stats.aiCount + delta);
  if (stats.declaredCount === 0 && nextAi === 0) {
    await ctx.db.delete(stats._id);
    return;
  }
  await ctx.db.patch(stats._id, { aiCount: nextAi });
}

async function bumpProfessionTitle(
  ctx: MutationCtx,
  titleKey: string,
  titleDisplay: string,
  category: string | undefined,
  delta: 1 | -1,
) {
  const existing = await ctx.db
    .query("professionTitleStats")
    .withIndex("by_title", (q) => q.eq("titleLower", titleKey))
    .unique();
  if (!existing) {
    if (delta > 0) {
      await ctx.db.insert("professionTitleStats", {
        titleLower: titleKey,
        displayTitle: titleDisplay,
        count: 1,
        category,
      });
    }
    return;
  }
  const nextCount = Math.max(0, existing.count + delta);
  if (nextCount === 0) {
    await ctx.db.delete(existing._id);
    return;
  }
  await ctx.db.patch(existing._id, {
    count: nextCount,
    // Met à jour la catégorie majoritaire avec la dernière vue (simple,
    // bien suffisant — la catégorie d'un titre libre est très stable).
    ...(category !== undefined ? { category } : {}),
  });
}

// ─── CV → cvSkillItems sync ──────────────────────────────────────────
// Le trigger reçoit oldDoc / newDoc. On compare `cv.skills` set-wise pour
// inférer les inserts/deletes/patches sur cvSkillItems.

type CvSkill = Doc<"cv">["skills"][number];

function indexSkills(skills: CvSkill[]): Map<string, CvSkill> {
  const out = new Map<string, CvSkill>();
  for (const s of skills) {
    const c = canonicalSkillName(s.name);
    if (!c) continue;
    out.set(c.key, s);
  }
  return out;
}

export const cvDenormalizeTrigger = async (
  ctx: MutationCtx,
  change: ChangeOf<"cv">,
) => {
  const op = change.operation;
  const cvId = (change.newDoc?._id ?? change.oldDoc?._id) as Id<"cv">;
  const userId =
    (change.newDoc?.userId ?? change.oldDoc?.userId) as Id<"users"> | undefined;
  if (!userId) return;

  if (op === "delete") {
    // Supprime tous les cvSkillItems associés.
    const items = await ctx.db
      .query("cvSkillItems")
      .withIndex("by_cv", (q) => q.eq("cvId", cvId))
      .collect();
    for (const it of items) await ctx.db.delete(it._id);
    return;
  }

  const newSkills = indexSkills(change.newDoc?.skills ?? []);
  const oldSkills = indexSkills(change.oldDoc?.skills ?? []);

  // Existing items keyed by skillName lowercase
  const existingItems = await ctx.db
    .query("cvSkillItems")
    .withIndex("by_cv", (q) => q.eq("cvId", cvId))
    .collect();
  const existingByKey = new Map<string, Doc<"cvSkillItems">>();
  for (const it of existingItems) existingByKey.set(it.skillName, it);

  // 1. Deletes — keys in old but not in new
  for (const [key, _] of oldSkills) {
    if (!newSkills.has(key)) {
      const it = existingByKey.get(key);
      if (it) await ctx.db.delete(it._id);
    }
  }

  // 2. Inserts + level patches
  for (const [key, skill] of newSkills) {
    const canonical = canonicalSkillName(skill.name)!;
    const it = existingByKey.get(key);
    if (!it) {
      await ctx.db.insert("cvSkillItems", {
        userId,
        cvId,
        skillName: canonical.key,
        displayName: canonical.display,
        level: skill.level,
      });
    } else if (it.level !== skill.level || it.displayName !== canonical.display) {
      await ctx.db.patch(it._id, {
        level: skill.level,
        displayName: canonical.display,
      });
    }
  }
};

// ─── cvSkillItems → skillCatalogStats sync ──────────────────────────
export const cvSkillItemsStatsTrigger = async (
  ctx: MutationCtx,
  change: ChangeOf<"cvSkillItems">,
) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await bumpSkillDeclared(ctx, doc.skillName, doc.displayName, doc.level, 1);
    return;
  }
  if (change.operation === "delete") {
    const doc = change.oldDoc;
    await bumpSkillDeclared(ctx, doc.skillName, doc.displayName, doc.level, -1);
    return;
  }
  // update : si le level change, on décrémente l'ancien et incrémente le nouveau.
  const oldDoc = change.oldDoc;
  const newDoc = change.newDoc;
  if (oldDoc.skillName !== newDoc.skillName || oldDoc.level !== newDoc.level) {
    await bumpSkillDeclared(ctx, oldDoc.skillName, oldDoc.displayName, oldDoc.level, -1);
    await bumpSkillDeclared(ctx, newDoc.skillName, newDoc.displayName, newDoc.level, 1);
  }
};

// ─── profiles → aiSuggestedSkillItems + professionTitleStats sync ───
export const profilesDenormalizeTrigger = async (
  ctx: MutationCtx,
  change: ChangeOf<"profiles">,
) => {
  const op = change.operation;
  const profileId = (change.newDoc?._id ?? change.oldDoc?._id) as Id<"profiles">;
  const userId =
    (change.newDoc?.userId ?? change.oldDoc?.userId) as Id<"users"> | undefined;
  if (!userId) return;

  // ── 1. aiSuggestedSkillItems diff ──
  if (op === "delete") {
    const items = await ctx.db
      .query("aiSuggestedSkillItems")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();
    for (const it of items) await ctx.db.delete(it._id);
  } else {
    type Canon = { key: string; display: string };
    const newSuggested: Canon[] = (change.newDoc?.profession?.aiSuggestedSkills ?? [])
      .map(canonicalSkillName)
      .filter((c): c is Canon => c !== null);
    const newByKey = new Map<string, Canon>(newSuggested.map((c) => [c.key, c]));

    const existing = await ctx.db
      .query("aiSuggestedSkillItems")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();
    const existingByKey = new Map<string, Doc<"aiSuggestedSkillItems">>();
    for (const it of existing) existingByKey.set(it.skillName, it);

    for (const [key, it] of existingByKey) {
      if (!newByKey.has(key)) await ctx.db.delete(it._id);
    }
    for (const [key, c] of newByKey) {
      if (existingByKey.has(key)) {
        // Patch display si la casse a changé
        const cur = existingByKey.get(key)!;
        if (cur.displayName !== c.display) {
          await ctx.db.patch(cur._id, { displayName: c.display });
        }
      } else {
        await ctx.db.insert("aiSuggestedSkillItems", {
          userId,
          profileId,
          skillName: c.key,
          displayName: c.display,
        });
      }
    }
  }

  // ── 2. professionTitleStats diff ──
  const oldTitle = change.oldDoc?.profession?.title;
  const newTitle = op !== "delete" ? change.newDoc?.profession?.title : undefined;
  const oldCanon = oldTitle ? canonicalTitle(oldTitle) : null;
  const newCanon = newTitle ? canonicalTitle(newTitle) : null;
  if (oldCanon?.key !== newCanon?.key) {
    if (oldCanon) {
      await bumpProfessionTitle(
        ctx,
        oldCanon.key,
        oldCanon.display,
        change.oldDoc?.profession?.category,
        -1,
      );
    }
    if (newCanon) {
      await bumpProfessionTitle(
        ctx,
        newCanon.key,
        newCanon.display,
        change.newDoc?.profession?.category,
        1,
      );
    }
  } else if (
    newCanon &&
    change.newDoc?.profession?.category !==
      change.oldDoc?.profession?.category
  ) {
    // Même titre mais catégorie a changé → maj le category du stat doc.
    const stat = await ctx.db
      .query("professionTitleStats")
      .withIndex("by_title", (q) => q.eq("titleLower", newCanon.key))
      .unique();
    if (stat) {
      await ctx.db.patch(stat._id, {
        category: change.newDoc?.profession?.category,
      });
    }
  }
};

// ─── aiSuggestedSkillItems → skillCatalogStats sync ─────────────────
export const aiSuggestedItemsStatsTrigger = async (
  ctx: MutationCtx,
  change: ChangeOf<"aiSuggestedSkillItems">,
) => {
  if (change.operation === "insert") {
    const doc = change.newDoc;
    await bumpSkillAi(ctx, doc.skillName, doc.displayName, 1);
  } else if (change.operation === "delete") {
    const doc = change.oldDoc;
    await bumpSkillAi(ctx, doc.skillName, doc.displayName, -1);
  }
  // update sur aiSuggestedSkillItems : aucune logique côté stats — le
  // displayName patch suffit à lui-même.
};
