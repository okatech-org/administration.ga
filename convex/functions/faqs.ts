import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { faqCategoryValidator } from "../lib/validators";
import { requireBackOfficeAccess } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * List active FAQs (public)
 * Filters: featured, category. Sorted by order ASC.
 */
export const list = query({
  args: {
    featured: v.optional(v.boolean()),
    category: v.optional(faqCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let items;
    if (args.featured !== undefined) {
      items = await ctx.db
        .query("faqs")
        .withIndex("by_featured", (q) =>
          q.eq("featured", args.featured!).eq("isActive", true),
        )
        .collect();
    } else if (args.category) {
      items = await ctx.db
        .query("faqs")
        .withIndex("by_category_order", (q) =>
          q.eq("category", args.category!),
        )
        .collect();
      items = items.filter((it) => it.isActive);
    } else {
      items = await ctx.db
        .query("faqs")
        .withIndex("by_active_order", (q) => q.eq("isActive", true))
        .collect();
    }

    return items.sort((a, b) => a.order - b.order).slice(0, limit);
  },
});

/**
 * Full-text search on FAQ questions
 */
export const search = query({
  args: {
    q: v.string(),
    category: v.optional(faqCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const q = args.q.trim();
    if (!q) return [];

    return ctx.db
      .query("faqs")
      .withSearchIndex("search_qa", (b) => {
        let expr = b.search("question", q).eq("isActive", true);
        if (args.category) expr = expr.eq("category", args.category);
        return expr;
      })
      .take(limit);
  },
});

/**
 * Count active FAQs
 */
export const count = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("faqs")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();
    return all.length;
  },
});

// ============================================================================
// BACKOFFICE QUERIES
// ============================================================================

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireBackOfficeAccess(ctx);
    return ctx.db.query("faqs").order("desc").take(500);
  },
});

export const getById = query({
  args: { faqId: v.id("faqs") },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);
    return ctx.db.get(args.faqId);
  },
});

// ============================================================================
// MUTATIONS (Backoffice)
// ============================================================================

export const create = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    category: faqCategoryValidator,
    order: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);
    const now = Date.now();
    return ctx.db.insert("faqs", {
      question: args.question,
      answer: args.answer,
      category: args.category,
      order: args.order ?? 100,
      featured: args.featured ?? false,
      isActive: args.isActive ?? true,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    faqId: v.id("faqs"),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    category: v.optional(faqCategoryValidator),
    order: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);
    const faq = await ctx.db.get(args.faqId);
    if (!faq) throw error(ErrorCode.FAQ_NOT_FOUND, "FAQ non trouvée");
    const { faqId, ...updates } = args;
    await ctx.db.patch(faqId, { ...updates, updatedAt: Date.now() });
    return faqId;
  },
});

export const remove = mutation({
  args: { faqId: v.id("faqs") },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);
    const faq = await ctx.db.get(args.faqId);
    if (!faq) throw error(ErrorCode.FAQ_NOT_FOUND, "FAQ non trouvée");
    await ctx.db.delete(args.faqId);
    return args.faqId;
  },
});

/**
 * Seed initial FAQs from hardcoded faq-items.ts + maquette
 * Idempotent: skips if any FAQ already exists.
 *
 * Run via CLI: bunx convex run functions/faqs:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("faqs").first();
    if (existing) {
      return { skipped: true, reason: "FAQs already seeded" };
    }

    const now = Date.now();
    const items: Array<{
      question: string;
      answer: string;
      category: string;
      featured: boolean;
    }> = [
      {
        question:
          "Quels documents fournir pour une première inscription consulaire ?",
        answer:
          "Une pièce d'identité gabonaise en cours de validité (carte nationale ou passeport), un justificatif de domicile à l'étranger de moins de trois mois, deux photos d'identité aux normes ICAO, et l'acte de naissance si la pièce d'identité ne le mentionne pas. L'inscription peut désormais se faire entièrement en ligne sur ce portail.",
        category: "demarches_consulaires",
        featured: true,
      },
      {
        question:
          "Combien de temps prend la délivrance d'un passeport biométrique ?",
        answer:
          "Le délai standard est de 21 jours ouvrés en Europe et 28 jours sur les autres continents, à compter de la prise des données biométriques. Un circuit accéléré (7 jours) est disponible dans l'espace Schengen pour 60 € supplémentaires.",
        category: "demarches_consulaires",
        featured: true,
      },
      {
        question: "Puis-je voter aux élections gabonaises depuis l'étranger ?",
        answer:
          "Oui, à condition d'être inscrit au registre consulaire et de figurer sur la liste électorale de votre représentation. Le vote s'effectue dans les ambassades et consulats généraux. Pour les consulats honoraires, un vote par correspondance peut être organisé.",
        category: "demarches_consulaires",
        featured: true,
      },
      {
        question: "Mon enfant est né à l'étranger — quelle nationalité ?",
        answer:
          "Selon le droit gabonais, tout enfant né d'au moins un parent gabonais est gabonais à la naissance. Il convient de transcrire son acte de naissance étranger sur les registres consulaires — démarche gratuite, à effectuer dans un délai d'un an idéalement.",
        category: "etat_civil",
        featured: true,
      },
      {
        question: "Comment obtenir un visa pour voyager au Gabon ?",
        answer:
          "Les ressortissants étrangers obtiennent leur visa via l'ambassade ou le consulat compétent pour leur pays de résidence, ou via le portail e-Visa pour les nationalités éligibles. Le visa touristique est délivré sous 7 jours ouvrés ; les visas long séjour nécessitent un dossier complémentaire.",
        category: "demarches_consulaires",
        featured: true,
      },
      {
        question: "Quels sont les tarifs consulaires en vigueur ?",
        answer:
          "Les frais sont fixés par décret et révisés annuellement. Les principaux actes : inscription consulaire (gratuit), passeport biométrique (60 €), légalisation par document (15 €), acte d'état civil (gratuit pour les Gabonais, 20 € pour les transcriptions étrangères). Le tarif détaillé est disponible dans la rubrique Services.",
        category: "fiscalite",
        featured: true,
      },
      {
        question: "Comment renouveler mon passeport ?",
        answer:
          "Pour renouveler votre passeport, vous devez prendre rendez-vous au consulat et présenter votre ancien passeport, votre acte de naissance, et 2 photos d'identité récentes. Le délai de traitement est d'environ 3 à 4 semaines.",
        category: "demarches_consulaires",
        featured: false,
      },
      {
        question: "Que faire en cas de perte de passeport ?",
        answer:
          "En cas de perte ou de vol, vous devez d'abord faire une déclaration auprès des autorités de police locales. Ensuite, contactez le consulat pour faire une déclaration de perte et demander un laissez-passer ou un passeport d'urgence.",
        category: "demarches_consulaires",
        featured: false,
      },
    ];

    let order = 10;
    for (const item of items) {
      await ctx.db.insert("faqs", {
        question: item.question,
        answer: item.answer,
        category: item.category as never,
        order,
        featured: item.featured,
        isActive: true,
        updatedAt: now,
      });
      order += 10;
    }

    return { skipped: false, inserted: items.length };
  },
});
