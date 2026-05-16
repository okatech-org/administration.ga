/**
 * Seed showcase : article « Houston » entierement rempli, avec tous les
 * blocs editoriaux des nodes Tiptap custom (keyFacts, pullquote, callout
 * info/ok/warn, figure). Demontre le niveau maximal de richesse atteignable
 * cote contribution.
 *
 * Usage :
 *   bunx convex run seeds/seedShowcaseArticle:run
 *
 * Idempotent : si le slug existe deja, on patch le contenu (les champs
 * editoriaux + le HTML enrichi) sans toucher aux autres entrees.
 */
import { mutation } from "../_generated/server";
import { PostCategory, PostStatus } from "../lib/constants";

const SLUG = "houston-showcase-2026";

// Le contenu HTML reproduit l'integralite des blocs maquette Article.html :
// lead + h2/p + keyFacts + pullquote + callout info + figure + callout ok +
// h2/p + callout warn + h2/p. Toutes les classes correspondent au selecteurs
// Tailwind du RichTextRenderer (apps/citizen-web/src/components/common/
// rich-text-editor.tsx).
const CONTENT_FR = `
<p class="lead">Inauguré le 11 mai 2026 par le Ministre des Affaires étrangères, le Consulat général à Houston marque l'aboutissement de dix-huit mois de préparation diplomatique, juridique et logistique. Ce nouveau poste devient le quatrième consulat gabonais sur le continent américain, après ceux de Washington, New York et Montréal.</p>

<h2 id="contexte">Un ancrage économique stratégique</h2>

<p>Le choix de Houston répond à une double logique : la présence d'une diaspora gabonaise estimée à 4 200 personnes dans les sept États couverts (Texas, Oklahoma, Louisiane, Arkansas, Tennessee, Mississippi, Alabama), et l'importance économique de la zone — premier hub énergétique des États-Unis et porte d'entrée vers le marché latino-américain.</p>

<div class="keyfacts">
  <div class="kf"><div class="kf-v">4 200</div><div class="kf-l">Ressortissants recensés</div></div>
  <div class="kf"><div class="kf-v">7 États</div><div class="kf-l">Couverture juridictionnelle</div></div>
  <div class="kf"><div class="kf-v">12 agents</div><div class="kf-l">Équipe diplomatique</div></div>
</div>

<p>L'antenne consulaire fonctionnera initialement avec une équipe de douze personnes — Consul général, vice-consul, deux officiers d'état civil, deux agents passeport, un agent visa, trois personnels d'appui et deux gardes de sécurité — sous l'autorité de M. Jean-Marie Mbouemboué, diplomate de carrière nommé par décret présidentiel le 28 février 2026.</p>

<blockquote class="pullquote">
  <p>Houston symbolise la nouvelle ambition diplomatique gabonaise : être présent là où l'économie, la diaspora et l'influence se rencontrent.</p>
  <cite>S.E. le Ministre des Affaires étrangères, allocution d'inauguration</cite>
</blockquote>

<h2 id="services">Services consulaires disponibles dès l'ouverture</h2>

<p>Le poste offre dès son ouverture l'ensemble des services consulaires standards : passeport biométrique, état civil, légalisations, assistance aux ressortissants, visas. La prise de rendez-vous est ouverte sur Consulat.ga depuis le 6 mai.</p>

<div class="callout" data-variant="info">
  <h4>Réaffectation de juridiction</h4>
  <p>Les ressortissants des sept États du Sud sont automatiquement rattachés à Houston depuis le 12 mai 2026. Les dossiers en cours de traitement à Washington ont été transférés sous huit jours par valise diplomatique.</p>
</div>

<figure class="figure">
  <img src="https://images.unsplash.com/photo-1496715976403-7e36dc43f17b?w=1600&q=80" alt="Skyline de Houston au crépuscule" />
  <span class="credit">© Houston Visitors Bureau</span>
  <figcaption>Le quartier d'affaires de Houston, troisième place pétrolière mondiale, abritera le nouveau Consulat général gabonais.</figcaption>
</figure>

<h2 id="economie">Un guichet économique intégré</h2>

<p>Au-delà des fonctions consulaires classiques, le poste héberge une antenne du <strong>Conseil Présidentiel d'Investissement</strong>, dont la vocation est d'accompagner les opérateurs économiques texans intéressés par les opportunités d'investissement au Gabon — notamment dans l'énergie, les mines et les services pétroliers en aval.</p>

<div class="callout" data-variant="ok">
  <h4>Prendre rendez-vous</h4>
  <p>Les ressortissants couverts peuvent dès maintenant prendre rendez-vous pour leurs démarches consulaires sur leur espace personnel Consulat.ga. Premier créneau disponible : 20 mai 2026.</p>
</div>

<h2 id="suite">Et après ?</h2>

<p>Le plan « Réseau 2030 » prévoit l'ouverture de trois autres postes consulaires d'ici la fin du quinquennat : <strong>Atlanta</strong> (2027), <strong>Vancouver</strong> (2028) et <strong>Mexico</strong> (2029). Cette feuille de route accompagne la stratégie de densification du maillage diplomatique gabonais sur le continent américain.</p>

<div class="callout" data-variant="warn">
  <h4>Période transitoire</h4>
  <p>Jusqu'au 30 juin 2026, le standard téléphonique fonctionne en mode partiel (lundi-mercredi-vendredi, 9h-13h heure locale). Pour toute urgence consulaire en dehors de ces créneaux, contacter la permanence Washington au +1 202 797 1000.</p>
</div>

<p>Avec cette ouverture, le Gabon dispose désormais de 32 représentations consulaires actives à travers le monde, dont 8 sur le continent américain. Une étape de plus vers l'objectif affiché : « un consulat à moins de trois heures de route pour 95 % de la diaspora gabonaise » d'ici 2030.</p>
`.trim();

const CONTENT_EN = `
<p class="lead">Inaugurated on 11 May 2026 by the Minister of Foreign Affairs, the Consulate-General in Houston marks the culmination of eighteen months of diplomatic, legal and logistical preparation. The post becomes Gabon's fourth consulate in the Americas, after Washington, New York and Montreal.</p>

<h2 id="context">A strategic economic anchor</h2>

<p>Houston was chosen for two reasons: a Gabonese diaspora estimated at 4,200 people across the seven covered states (Texas, Oklahoma, Louisiana, Arkansas, Tennessee, Mississippi, Alabama), and the economic weight of the area — leading energy hub of the United States and gateway to the Latin American market.</p>

<div class="keyfacts">
  <div class="kf"><div class="kf-v">4,200</div><div class="kf-l">Registered nationals</div></div>
  <div class="kf"><div class="kf-v">7 states</div><div class="kf-l">Jurisdictional coverage</div></div>
  <div class="kf"><div class="kf-v">12 staff</div><div class="kf-l">Diplomatic team</div></div>
</div>

<blockquote class="pullquote">
  <p>Houston embodies Gabon's renewed diplomatic ambition: being present where the economy, the diaspora and influence meet.</p>
  <cite>H.E. the Minister of Foreign Affairs, inauguration address</cite>
</blockquote>

<h2 id="services">Services available from day one</h2>

<div class="callout" data-variant="info">
  <h4>Jurisdiction reassignment</h4>
  <p>Nationals of the seven southern states are automatically attached to Houston as of 12 May 2026.</p>
</div>

<h2 id="next">What's next?</h2>

<p>The « Réseau 2030 » plan provides for three additional consular posts by the end of the term: <strong>Atlanta</strong> (2027), <strong>Vancouver</strong> (2028) and <strong>Mexico City</strong> (2029).</p>
`.trim();

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const superadmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isSuperadmin"), true))
      .first();
    const author = superadmin ?? (await ctx.db.query("users").first());
    if (!author) {
      throw new Error(
        "Aucun utilisateur disponible — créer d'abord un compte (seeds/seedDevAuthUsers).",
      );
    }
    const firstOrg = await ctx.db
      .query("orgs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    const orgId = firstOrg?._id;
    const now = Date.now();

    const titleFr =
      "Le Gabon ouvre son nouveau Consulat général à Houston, Texas";
    const titleEn = "Gabon opens its new Consulate-General in Houston, Texas";
    const excerptFr =
      "Inauguré le 11 mai 2026, le Consulat général à Houston couvre 7 États du Sud des États-Unis et 4 200 ressortissants gabonais.";
    const excerptEn =
      "Inaugurated on 11 May 2026, the Consulate-General in Houston covers seven southern US states and 4,200 registered Gabonese nationals.";
    const ledeFr =
      "Avec l'ouverture du Consulat général à Houston, le Gabon densifie sa présence diplomatique sur le continent américain — première étape concrète du plan « Réseau 2030 » porté par le MAEAI.";
    const ledeEn =
      "With the opening of the Consulate-General in Houston, Gabon densifies its diplomatic footprint in the Americas — the first concrete milestone of the MAEAI-led « Réseau 2030 » plan.";
    const heroCaptionFr =
      "Le Ministre des Affaires étrangères, accompagné de la délégation diplomatique gabonaise, lors de la cérémonie d'inauguration du Consulat général de Houston, le 11 mai 2026.";
    const heroCaptionEn =
      "The Minister of Foreign Affairs and the Gabonese diplomatic delegation at the inauguration of the Consulate-General in Houston on 11 May 2026.";

    const fields = {
      title: titleFr,
      titleI18n: { fr: titleFr, en: titleEn },
      slug: SLUG,
      excerpt: excerptFr,
      excerptI18n: { fr: excerptFr, en: excerptEn },
      content: CONTENT_FR,
      contentI18n: { fr: CONTENT_FR, en: CONTENT_EN },
      category: PostCategory.News,
      status: PostStatus.Published,
      publishedAt: 1747353600000,
      updatedAt: now,
      authorId: author._id,
      orgId,

      // Editorial extensions
      lede: ledeFr,
      ledeI18n: { fr: ledeFr, en: ledeEn },
      heroImageCaption: heroCaptionFr,
      heroImageCaptionI18n: { fr: heroCaptionFr, en: heroCaptionEn },
      heroImageCredit: "© MAEAI / Reuters",
      readingMinutes: 6,
      location: "Houston, Texas",
      subCategory: "Diplomatie",
      subCategoryI18n: { fr: "Diplomatie", en: "Diplomacy" },
      region: "AMERIQUES",
      tags: [
        "diplomatie",
        "houston",
        "etats-unis",
        "reseau-2030",
        "economie",
        "amerique-du-sud",
      ],
      sources: [
        {
          label: "maeai.ga",
          url: "https://www.maeai.ga/reseau-2030-feuille-de-route",
        },
        {
          label: "Union Sonapresse",
          url: "https://www.union.sonapresse.com/fr/diplomatie-houston-inauguration",
        },
      ],
      referenceNumber: "N° 2026-118",
      // Pas d'override `authorName` / `authorRole` : le publisher est
      // automatiquement derive de `post.org` (premier org actif du seed)
      // ou « Consulat.ga » si la publication est globale (orgId null).
      // explicit `undefined` pour effacer un eventuel reliquat de re-run.
      authorName: undefined,
      authorRole: undefined,
    };

    // Idempotent : on supprime puis recree pour purger les anciens
    // champs (Convex db.patch ne supprime pas les champs absents du patch).
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", SLUG))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    const postId = await ctx.db.insert("posts", {
      ...fields,
      createdAt: now,
    });
    return { mode: existing ? "recreated" : "inserted", slug: SLUG, postId };
  },
});
