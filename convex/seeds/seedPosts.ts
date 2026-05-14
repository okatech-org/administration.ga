/**
 * Seed posts (actualités, événements, communiqués) pour la page publique /news.
 *
 * Usage :
 *   bunx convex run seeds/seedPosts:seedPosts
 *
 * Idempotent : skip un post si son `slug` existe déjà.
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { PostCategory, PostStatus } from "../lib/constants";

type SeedPost = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: PostCategory;
  publishedDaysAgo?: number; // negative = future
  eventStartInDays?: number;
  eventLocation?: string;
  orgSlugHint?: string;
};

const SEED: SeedPost[] = [
  // ───── NEWS (actualités) ─────
  {
    title:
      "Ouverture officielle du nouveau Consulat général à Houston, Texas.",
    slug: "ouverture-consulat-houston",
    excerpt:
      "À l'occasion de la mission diplomatique conduite par le Ministre des Affaires étrangères, le Gabon inaugure sa quatrième représentation aux États-Unis. La nouvelle structure desservira les ressortissants de la région du Golfe du Mexique.",
    content:
      "<p>À l'occasion de la mission diplomatique conduite par le Ministre des Affaires étrangères, le Gabon inaugure sa quatrième représentation aux États-Unis.</p><p>La nouvelle structure desservira les ressortissants de la région du Golfe du Mexique et facilitera les démarches consulaires pour près de 4 200 Gabonais établis dans le sud-ouest américain.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 2,
  },
  {
    title: "Accord bilatéral avec le Sénégal sur la mobilité étudiante.",
    slug: "accord-senegal-mobilite-etudiante",
    excerpt:
      "800 bourses croisées sur cinq ans, premier programme post-CEEAC d'envergure régionale.",
    content:
      "<p>800 bourses croisées sur cinq ans entre le Gabon et le Sénégal, premier programme post-CEEAC d'envergure régionale.</p><p>Les disciplines prioritaires : santé publique, ingénierie pétrolière, agro-industrie.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 5,
  },
  {
    title:
      "Renouvellement de passeport : délais réduits à 7 jours en Europe.",
    slug: "passeport-delais-7-jours-europe",
    excerpt:
      "Nouveau circuit logistique opéré depuis Paris pour l'ensemble des consulats de l'espace Schengen.",
    content:
      "<p>Nouveau circuit logistique opéré depuis Paris pour l'ensemble des consulats de l'espace Schengen. Le délai moyen passe de 21 à 7 jours ouvrés.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 6,
  },
  {
    title:
      "Le Gabon élu vice-président du Conseil exécutif de l'Union Africaine.",
    slug: "gabon-vice-president-conseil-ua",
    excerpt:
      "Une responsabilité de deux ans pour porter l'agenda climatique et migratoire du continent.",
    content:
      "<p>Le Gabon a été élu vice-président du Conseil exécutif de l'Union Africaine pour un mandat de deux ans.</p><p>Cette responsabilité positionne le pays au cœur des dossiers climat et migration.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 8,
  },
  {
    title:
      "Avis aux voyageurs : situation sécuritaire au Sahel, recommandations actualisées.",
    slug: "avis-voyageurs-sahel-2026",
    excerpt:
      "Mise à jour des conseils aux ressortissants gabonais en mission ou en transit dans la bande sahélienne.",
    content:
      "<p>Le Ministère des Affaires étrangères actualise ses recommandations à l'attention des ressortissants gabonais voyageant ou résidant dans la bande sahélienne.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 10,
  },
  {
    title:
      "Rencontres de la diaspora : 4 villes, 4 dialogues — programme 2026.",
    slug: "rencontres-diaspora-2026",
    excerpt:
      "Paris, Bruxelles, Montréal, Washington — cycle de consultations citoyennes du Ministre.",
    content:
      "<p>Le Ministre engage en 2026 un cycle de consultations citoyennes dans quatre villes : Paris, Bruxelles, Montréal et Washington.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 12,
  },
  {
    title:
      "Consulat.ga v3 — l'identité consulaire entièrement dématérialisée.",
    slug: "consulat-ga-v3-dematerialisation",
    excerpt:
      "Pré-remplissage IA, suivi de dossier temps réel, signature électronique : tour d'horizon.",
    content:
      "<p>La plateforme Consulat.ga entre dans sa version 3 avec une expérience entièrement dématérialisée pour les usagers.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 15,
  },
  {
    title:
      "Coopération universitaire : convention-cadre signée avec l'Université de Coimbra.",
    slug: "convention-coimbra",
    excerpt:
      "Mobilité enseignants-chercheurs et co-diplomation en sciences politiques et droit international.",
    content:
      "<p>Le Gabon et le Portugal renforcent leur coopération universitaire via une convention-cadre signée à Coimbra.</p>",
    category: PostCategory.News,
    publishedDaysAgo: 20,
  },

  // ───── EVENTS (événements à venir) ─────
  {
    title: "Fête nationale — réception officielle.",
    slug: "fete-nationale-2026-paris",
    excerpt:
      "Réception officielle à l'Ambassade du Gabon à Paris. Sur invitation.",
    content:
      "<p>L'Ambassade du Gabon à Paris organise sa réception officielle à l'occasion de la Fête nationale.</p>",
    category: PostCategory.Event,
    eventStartInDays: 8,
    eventLocation: "Ambassade · Paris",
  },
  {
    title: "Atelier : nouvelle procédure de passeport biométrique.",
    slug: "atelier-passeport-biometrique-bruxelles",
    excerpt:
      "Session d'information ouverte au public, présentielle et en ligne, sur la nouvelle procédure.",
    content:
      "<p>Le Consulat de Bruxelles organise un atelier d'information sur la nouvelle procédure de passeport biométrique.</p>",
    category: PostCategory.Event,
    eventStartInDays: 14,
    eventLocation: "Consulat · Bruxelles",
  },
  {
    title: "Forum économique Gabon — Belgique.",
    slug: "forum-economique-gabon-belgique",
    excerpt:
      "Rencontres B2B, panels sectoriels (mines, agro, énergie) et soirée de networking.",
    content:
      "<p>Forum économique annuel entre opérateurs économiques gabonais et belges, au Cercle de Lorraine à Bruxelles.</p>",
    category: PostCategory.Event,
    eventStartInDays: 21,
    eventLocation: "Cercle de Lorraine · Bruxelles",
  },
  {
    title: "Dialogue citoyen — édition Amériques.",
    slug: "dialogue-citoyen-washington",
    excerpt:
      "Échange direct entre le Ministre et la diaspora gabonaise du continent américain.",
    content:
      "<p>Dialogue citoyen direct entre le Ministre des Affaires étrangères et la diaspora gabonaise d'Amérique du Nord.</p>",
    category: PostCategory.Event,
    eventStartInDays: 28,
    eventLocation: "Ambassade · Washington D.C.",
  },

  // ───── ANNOUNCEMENTS (communiqués officiels) ─────
  {
    title:
      "Suspension temporaire de la délivrance des visas long-séjour pour la République Centrafricaine.",
    slug: "communique-2026-118-visas-rca",
    excerpt:
      "À compter du 13 mai 2026 et jusqu'à nouvel ordre, la délivrance des visas long-séjour pour la République Centrafricaine est suspendue.",
    content:
      "<p>Le Ministère des Affaires étrangères communique : à compter du 13 mai 2026 et jusqu'à nouvel ordre, la délivrance des visas long-séjour pour la République Centrafricaine est suspendue.</p><p>Les demandes en cours d'instruction sont maintenues.</p>",
    category: PostCategory.Announcement,
    publishedDaysAgo: 1,
  },
  {
    title:
      "Réorganisation administrative du Consulat de Casablanca — cellule biométrique.",
    slug: "communique-2026-115-casablanca-biometrique",
    excerpt:
      "Création d'une cellule biométrique dédiée à l'enrôlement des passeports nouvelle génération.",
    content:
      "<p>Le Consulat général à Casablanca crée une cellule biométrique dédiée à l'enrôlement des passeports nouvelle génération.</p>",
    category: PostCategory.Announcement,
    publishedDaysAgo: 3,
  },
  {
    title:
      "Nomination de Mme Yvette Mboumba aux fonctions de Consul général à Pointe-Noire.",
    slug: "communique-2026-112-nomination-pointe-noire",
    excerpt:
      "Madame Yvette Mboumba est nommée Consul général de la République Gabonaise à Pointe-Noire.",
    content:
      "<p>Par décret, Madame Yvette Mboumba est nommée Consul général de la République Gabonaise à Pointe-Noire, République du Congo.</p>",
    category: PostCategory.Announcement,
    publishedDaysAgo: 6,
  },
  {
    title:
      "Tarifs consulaires 2026 — actualisation des frais de chancellerie en zone euro.",
    slug: "communique-2026-108-tarifs-zone-euro",
    excerpt:
      "Mise à jour de la grille tarifaire applicable dans l'ensemble des représentations en zone euro.",
    content:
      "<p>Mise à jour de la grille tarifaire applicable dans l'ensemble des représentations consulaires de la zone euro.</p>",
    category: PostCategory.Announcement,
    publishedDaysAgo: 8,
  },
];

export const seedPosts = mutation({
  args: {
    orgId: v.optional(v.id("orgs")),
  },
  handler: async (ctx, args) => {
    // Trouve un user pour l'auteur — superadmin ou premier user dispo
    const superadmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isSuperadmin"), true))
      .first();
    const author =
      superadmin ?? (await ctx.db.query("users").first());

    if (!author) {
      throw new Error(
        "Aucun utilisateur disponible — créer d'abord un compte (seeds/seedDevAuthUsers).",
      );
    }

    // Org optionnelle : si non passée, prend la première active
    let orgId = args.orgId;
    if (!orgId) {
      const org = await ctx.db
        .query("orgs")
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      orgId = org?._id;
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const post of SEED) {
      try {
        const existing = await ctx.db
          .query("posts")
          .withIndex("by_slug", (q) => q.eq("slug", post.slug))
          .first();
        if (existing) {
          results.skipped++;
          continue;
        }

        const publishedAt =
          post.publishedDaysAgo !== undefined
            ? now - post.publishedDaysAgo * DAY
            : now;

        const eventStartAt =
          post.eventStartInDays !== undefined
            ? now + post.eventStartInDays * DAY
            : undefined;

        await ctx.db.insert("posts", {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          status: PostStatus.Published,
          publishedAt,
          createdAt: now,
          updatedAt: now,
          orgId,
          authorId: author._id,
          eventStartAt,
          eventLocation: post.eventLocation,
        });
        results.created++;
      } catch (err) {
        results.errors.push(
          `${post.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return results;
  },
});
