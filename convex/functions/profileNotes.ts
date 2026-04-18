import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";

export const listByProfile = authQuery({
  args: {
    profileId: v.union(v.id("profiles"), v.id("childProfiles")),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "citizen_profiles.view",
    );

    const notes = await ctx.db
      .query("profileNotes")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .collect();

    return await Promise.all(
      notes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          author: author
            ? {
                _id: author._id,
                firstName: author.firstName,
                lastName: author.lastName,
              }
            : null,
        };
      }),
    );
  },
});

export const create = authMutation({
  args: {
    profileId: v.union(v.id("profiles"), v.id("childProfiles")),
    orgId: v.id("orgs"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    if (!content) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "citizen_profiles.manage",
    );

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw error(ErrorCode.PROFILE_NOT_FOUND);
    }

    return await ctx.db.insert("profileNotes", {
      profileId: args.profileId,
      authorId: ctx.user._id,
      content,
      createdAt: Date.now(),
    });
  },
});

export const remove = authMutation({
  args: {
    noteId: v.id("profileNotes"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw error(ErrorCode.NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "citizen_profiles.manage",
    );

    if (note.authorId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.delete(args.noteId);
    return args.noteId;
  },
});
