import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "../_generated/server";
import { postCategoryValidator, postStatusValidator } from "../lib/validators";
import { requireAuth, requireBackOfficeAccess, getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { PostStatus, PostCategory } from "../lib/constants";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * List published posts with optional category filter
 */
export const list = query({
  args: {
    category: v.optional(postCategoryValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginatedResult = await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("status", PostStatus.Published))
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter by category on page if specified
    const filtered =
      args.category ?
        paginatedResult.page.filter((p) => p.category === args.category)
      : paginatedResult.page;

    // Get cover image URLs + author/org names for current page
    const postsWithImages = await Promise.all(
      filtered.map(async (post) => {
        const coverImageUrl =
          post.coverImageStorageId ?
            await ctx.storage.getUrl(post.coverImageStorageId)
          : null;
        const documentUrl =
          post.documentStorageId ?
            await ctx.storage.getUrl(post.documentStorageId)
          : null;

        const author = await ctx.db.get(post.authorId);
        const authorName = author?.name ?? null;
        const org = post.orgId ? await ctx.db.get(post.orgId) : null;
        const orgName = org?.name ?? null;

        return {
          ...post,
          coverImageUrl,
          documentUrl,
          authorName,
          orgName,
        };
      }),
    );

    return {
      ...paginatedResult,
      page: postsWithImages,
    };
  },
});

/**
 * Get latest posts for homepage
 */
export const getLatest = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 4;

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("status", PostStatus.Published))
      .order("desc")
      .take(limit);

    const postsWithImages = await Promise.all(
      posts.map(async (post) => {
        const coverImageUrl =
          post.coverImageStorageId ?
            await ctx.storage.getUrl(post.coverImageStorageId)
          : null;

        return {
          ...post,
          coverImageUrl,
        };
      }),
    );

    return postsWithImages;
  },
});

/**
 * Get a single post by slug (public)
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .filter((q) => q.eq(q.field("status"), PostStatus.Published))
      .unique();

    if (!post) return null;

    const coverImageUrl =
      post.coverImageStorageId ?
        await ctx.storage.getUrl(post.coverImageStorageId)
      : null;
    const documentUrl =
      post.documentStorageId ?
        await ctx.storage.getUrl(post.documentStorageId)
      : null;

    // Get org info if linked
    const org = post.orgId ? await ctx.db.get(post.orgId) : null;

    return {
      ...post,
      coverImageUrl,
      documentUrl,
      org: org ? { name: org.name, slug: org.slug } : null,
    };
  },
});

// ============================================================================
// SUPERADMIN QUERIES
// ============================================================================

/**
 * List all posts (superadmin only)
 */
export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);
    const paginatedResult = await ctx.db
      .query("posts")
      .order("desc")
      .paginate(args.paginationOpts);

    const postsWithDetails = await Promise.all(
      paginatedResult.page.map(async (post) => {
        const coverImageUrl =
          post.coverImageStorageId ?
            await ctx.storage.getUrl(post.coverImageStorageId)
          : null;

        const author = await ctx.db.get(post.authorId);
        const org = post.orgId ? await ctx.db.get(post.orgId) : null;

        return {
          ...post,
          coverImageUrl,
          authorName: author?.name ?? "Inconnu",
          orgName: org?.name ?? "Global",
        };
      }),
    );

    return {
      ...paginatedResult,
      page: postsWithDetails,
    };
  },
});

// ============================================================================
// DASHBOARD QUERIES (Org context)
// ============================================================================

/**
 * List posts for a specific organization (dashboard)
 */
export const listByOrg = query({
  args: {
    orgId: v.id("orgs"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Public-facing: only return published posts
    const paginatedResult = await ctx.db
      .query("posts")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter to published only — drafts/archived should not be public
    const publishedPosts = paginatedResult.page.filter(
      (post) => post.status === "published",
    );

    const postsWithImages = await Promise.all(
      publishedPosts.map(async (post) => {
        const coverImageUrl =
          post.coverImageStorageId ?
            await ctx.storage.getUrl(post.coverImageStorageId)
          : null;

        const author = await ctx.db.get(post.authorId);

        return {
          ...post,
          coverImageUrl,
          authorName: author?.name ?? "Inconnu",
        };
      }),
    );

    return {
      ...paginatedResult,
      page: postsWithImages,
    };
  },
});

/**
 * Get a single post by ID (for editing)
 */
export const getById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    // Public-facing: only expose published posts
    // Draft/archived posts should only be accessible via the authenticated listAll
    if (post.status !== "published") return null;

    const coverImageUrl =
      post.coverImageStorageId ?
        await ctx.storage.getUrl(post.coverImageStorageId)
      : null;
    const documentUrl =
      post.documentStorageId ?
        await ctx.storage.getUrl(post.documentStorageId)
      : null;

    return {
      ...post,
      coverImageUrl,
      documentUrl,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new post
 */
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: postCategoryValidator,
    coverImageStorageId: v.optional(v.id("_storage")),
    orgId: v.optional(v.id("orgs")),

    // Event-specific
    eventStartAt: v.optional(v.number()),
    eventEndAt: v.optional(v.number()),
    eventLocation: v.optional(v.string()),
    eventTicketUrl: v.optional(v.string()),

    // Communique-specific
    documentStorageId: v.optional(v.id("_storage")),

    // Optional: publish immediately
    publish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Auth check
    let user;
    if (args.orgId) {
      const result = await requireAuth(ctx);
      user = result;
      // Granular task check
      const membership = await getMembership(ctx, user._id, args.orgId);
      await assertCanDoTask(ctx, user, membership, "communication.publish");
    } else {
      // Global post requires superadmin
      user = await requireBackOfficeAccess(ctx);
    }

    // Validate communique has document
    if (
      args.category === PostCategory.Announcement &&
      !args.documentStorageId
    ) {
      throw error(
        ErrorCode.POST_DOCUMENT_REQUIRED,
        "Les communiqués officiels doivent avoir un document PDF joint",
      );
    }

    // Check slug uniqueness
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw error(
        ErrorCode.POST_SLUG_EXISTS,
        "Un article avec ce slug existe déjà",
      );
    }

    const now = Date.now();
    const status = args.publish ? PostStatus.Published : PostStatus.Draft;

    const postId = await ctx.db.insert("posts", {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      category: args.category,
      coverImageStorageId: args.coverImageStorageId,
      status,
      publishedAt: args.publish ? now : undefined,
      createdAt: now,
      orgId: args.orgId,
      authorId: user._id,

      // Event fields
      eventStartAt: args.eventStartAt,
      eventEndAt: args.eventEndAt,
      eventLocation: args.eventLocation,
      eventTicketUrl: args.eventTicketUrl,

      // Communique fields
      documentStorageId: args.documentStorageId,
    });

    await logCortexAction(ctx, {
      action: "CREATE_POST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "posts",
      entiteId: postId,
      userId: user._id,
      apres: { title: args.title, slug: args.slug, category: args.category, status },
      signalType: SIGNAL_TYPES.POST_CREE,
    });

    return postId;
  },
});

/**
 * Update an existing post
 */
export const update = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(postCategoryValidator),
    coverImageStorageId: v.optional(v.id("_storage")),

    // Event-specific
    eventStartAt: v.optional(v.number()),
    eventEndAt: v.optional(v.number()),
    eventLocation: v.optional(v.string()),
    eventTicketUrl: v.optional(v.string()),

    // Communique-specific
    documentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw error(ErrorCode.POST_NOT_FOUND, "Article non trouvé");
    }

    // Auth check
    if (post.orgId) {
      const user = await requireAuth(ctx);
      const membership = await getMembership(ctx, user._id, post.orgId);
      await assertCanDoTask(ctx, user, membership, "communication.publish");
    } else {
      await requireBackOfficeAccess(ctx);
    }

    // If slug is changing, check uniqueness
    if (args.slug && args.slug !== post.slug) {
      const existing = await ctx.db
        .query("posts")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .unique();

      if (existing) {
        throw error(
          ErrorCode.POST_SLUG_EXISTS,
          "Un article avec ce slug existe déjà",
        );
      }
    }

    // Validate communique has document
    const newCategory = args.category ?? post.category;
    const newDocumentId = args.documentStorageId ?? post.documentStorageId;

    if (newCategory === PostCategory.Announcement && !newDocumentId) {
      throw error(
        ErrorCode.POST_DOCUMENT_REQUIRED,
        "Les communiqués officiels doivent avoir un document PDF joint",
      );
    }

    const { postId, ...updates } = args;

    await ctx.db.patch(postId, {
      ...updates,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "UPDATE_POST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "posts",
      entiteId: postId,
      userId: post.authorId,
      avant: { title: post.title, slug: post.slug, category: post.category },
      apres: updates,
      signalType: SIGNAL_TYPES.POST_MODIFIE,
    });

    return postId;
  },
});

/**
 * Publish or unpublish a post
 */
export const setStatus = mutation({
  args: {
    postId: v.id("posts"),
    status: postStatusValidator,
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw error(ErrorCode.POST_NOT_FOUND, "Article non trouvé");
    }

    // Auth check
    if (post.orgId) {
      const user = await requireAuth(ctx);
      const membership = await getMembership(ctx, user._id, post.orgId);
      await assertCanDoTask(ctx, user, membership, "communication.publish");
    } else {
      await requireBackOfficeAccess(ctx);
    }

    // Validate communique has document before publishing
    if (
      args.status === PostStatus.Published &&
      post.category === PostCategory.Announcement &&
      !post.documentStorageId
    ) {
      throw error(
        ErrorCode.POST_DOCUMENT_REQUIRED,
        "Impossible de publier un communiqué sans document PDF",
      );
    }

    await ctx.db.patch(args.postId, {
      status: args.status,
      publishedAt:
        args.status === PostStatus.Published ? Date.now() : post.publishedAt,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "PUBLISH_POST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "posts",
      entiteId: args.postId,
      userId: post.authorId,
      avant: { status: post.status },
      apres: { status: args.status },
      signalType: SIGNAL_TYPES.POST_PUBLIE,
    });

    return args.postId;
  },
});

/**
 * Delete a post
 */
export const remove = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw error(ErrorCode.POST_NOT_FOUND, "Article non trouvé");
    }

    // Auth check
    if (post.orgId) {
      const user = await requireAuth(ctx);
      const membership = await getMembership(ctx, user._id, post.orgId);
      await assertCanDoTask(ctx, user, membership, "communication.publish");
    } else {
      await requireBackOfficeAccess(ctx);
    }

    // Delete associated files from storage
    if (post.coverImageStorageId) {
      await ctx.storage.delete(post.coverImageStorageId);
    }
    if (post.documentStorageId) {
      await ctx.storage.delete(post.documentStorageId);
    }

    await ctx.db.delete(args.postId);

    await logCortexAction(ctx, {
      action: "DELETE_POST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "posts",
      entiteId: args.postId,
      userId: post.authorId,
      avant: { title: post.title, slug: post.slug, category: post.category },
      signalType: SIGNAL_TYPES.POST_SUPPRIME,
    });

    return args.postId;
  },
});
