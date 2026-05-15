/**
 * Migration : backfill des champs bilingues sur `posts` et `tutorials`.
 *
 * Pattern widen-migrate-narrow appliqué au pivot bilingue :
 *  - les schémas exposent désormais `titleI18n`, `excerptI18n`, `contentI18n`
 *    (et variantes `lede`, `heroImageCaption`, `subCategory`, `duration`)
 *    optionnels.
 *  - cette migration parcourt les enregistrements existants où le `*I18n`
 *    correspondant est absent, et le remplit en dupliquant la version FR
 *    actuelle (`titleI18n = { fr: title }`). L'EN sera ré-introduit
 *    quand le contenu sera retraduit côté éditorial.
 *
 * Idempotente : seuls les rows dont `*I18n` est `undefined` sont patchés ;
 * les rows déjà bilingues (seedés depuis JSON) sont laissés intacts.
 *
 * Usage :
 *   bunx convex run migrations/backfillArticlesGuidesI18n:run
 *   bunx convex run migrations/backfillArticlesGuidesI18n:run --prod
 */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const BATCH_SIZE = 50;

type Report = {
  posts: { patched: number; skipped: number };
  tutorials: { patched: number; skipped: number };
};

const fresh = (): Report => ({
  posts: { patched: 0, skipped: 0 },
  tutorials: { patched: 0, skipped: 0 },
});

/** Public kickoff. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[i18n-backfill] start");
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillArticlesGuidesI18n.processPosts,
      { report: fresh() },
    );
  },
});

/** @internal — paginate posts then chain. */
export const processPosts = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    report: v.any(),
  },
  handler: async (ctx, args) => {
    const report: Report = args.report;
    const page = await ctx.db.query("posts").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    for (const post of page.page) {
      const patch: Record<string, unknown> = {};
      if (!post.titleI18n && typeof post.title === "string") {
        patch.titleI18n = { fr: post.title };
      }
      if (!post.excerptI18n && typeof post.excerpt === "string") {
        patch.excerptI18n = { fr: post.excerpt };
      }
      if (!post.contentI18n && typeof post.content === "string") {
        patch.contentI18n = { fr: post.content };
      }
      if (!post.ledeI18n && typeof post.lede === "string") {
        patch.ledeI18n = { fr: post.lede };
      }
      if (
        !post.heroImageCaptionI18n &&
        typeof post.heroImageCaption === "string"
      ) {
        patch.heroImageCaptionI18n = { fr: post.heroImageCaption };
      }
      if (!post.subCategoryI18n && typeof post.subCategory === "string") {
        patch.subCategoryI18n = { fr: post.subCategory };
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(post._id, patch);
        report.posts.patched++;
      } else {
        report.posts.skipped++;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillArticlesGuidesI18n.processPosts,
        { cursor: page.continueCursor, report },
      );
    } else {
      console.log(
        `[i18n-backfill] posts done — patched=${report.posts.patched} skipped=${report.posts.skipped}`,
      );
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillArticlesGuidesI18n.processTutorials,
        { report },
      );
    }
  },
});

/** @internal — paginate tutorials. */
export const processTutorials = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    report: v.any(),
  },
  handler: async (ctx, args) => {
    const report: Report = args.report;
    const page = await ctx.db.query("tutorials").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    for (const tut of page.page) {
      const patch: Record<string, unknown> = {};
      if (!tut.titleI18n && typeof tut.title === "string") {
        patch.titleI18n = { fr: tut.title };
      }
      if (!tut.excerptI18n && typeof tut.excerpt === "string") {
        patch.excerptI18n = { fr: tut.excerpt };
      }
      if (!tut.contentI18n && typeof tut.content === "string") {
        patch.contentI18n = { fr: tut.content };
      }
      if (!tut.ledeI18n && typeof tut.lede === "string") {
        patch.ledeI18n = { fr: tut.lede };
      }
      if (!tut.durationI18n && typeof tut.duration === "string") {
        patch.durationI18n = { fr: tut.duration };
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(tut._id, patch);
        report.tutorials.patched++;
      } else {
        report.tutorials.skipped++;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillArticlesGuidesI18n.processTutorials,
        { cursor: page.continueCursor, report },
      );
    } else {
      console.log(
        `[i18n-backfill] tutorials done — patched=${report.tutorials.patched} skipped=${report.tutorials.skipped}`,
      );
      console.log(
        "[i18n-backfill] complete",
        JSON.stringify(report, null, 2),
      );
    }
  },
});
