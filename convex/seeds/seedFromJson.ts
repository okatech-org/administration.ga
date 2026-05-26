/**
 * Seed depuis les JSON officiels — Consulat.ga
 *
 * Charge le contenu éditorial (services, news, tutoriels, FAQ, events
 * communautaires) depuis les 5 fichiers JSON co-localisés dans `./data/`.
 *
 * Source : agent IA avec sourcing officiel (consulatdugabon.fr, dgdi.ga,
 * diplomatie.gouv.ga, justice.gouv.ga, journal-officiel.ga). Voir
 * `convex/seeds/data/SOURCES.md` pour la traçabilité complète.
 *
 * Le JSON produit par l'agent est bilingue ({fr, en}) sur tous les champs
 * texte. Les tables `posts`, `tutorials`, `faqs`, `communityEvents` ont
 * actuellement des champs `v.string()` brut → on aplatit au FR à
 * l'injection (l'EN sera réintroduit le jour où les schémas seront
 * migrés vers `localizedStringValidator`).
 *
 * Le JSON utilise aussi des `joinedDocuments.type` inventés (`photo`,
 * `vaccination`, `ticket`…) qui ne sont pas dans l'enum
 * `DetailedDocumentType` → mappés vers la valeur valide la plus proche
 * (cf. DOC_TYPE_MAP) ou `other_official_document` en fallback.
 *
 * Usage dev   : bunx convex run seeds/seedFromJson:run
 * Usage prod  : bunx convex run seeds/seedFromJson:run --prod
 *
 * Idempotent — re-exécution sûre :
 *  - services : patch des champs éditoriaux uniquement (n'écrase pas les
 *    données fonctionnelles existantes — name, description, formSchema…)
 *  - news/tutos/events : skip si slug existe déjà
 *  - faqs : skip si (category, question) existe déjà
 */
import { mutation } from "../_generated/server";
import { PostCategory, PostStatus } from "../lib/constants";

import servicesData from "./data/services.json";
import newsData from "./data/news.json";
import tutorialsData from "./data/tutorials.json";
import faqsData from "./data/faqs.json";
import eventsData from "./data/events.json";

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

type Localized = { fr: string; en?: string };

const isLocalized = (x: unknown): x is Localized =>
  typeof x === "object" && x !== null && "fr" in x && typeof (x as { fr: unknown }).fr === "string";

/** Aplatit {fr, en} → fr (pour les schémas qui veulent v.string()). */
const pickFr = (x: unknown): string => {
  if (typeof x === "string") return x;
  if (isLocalized(x)) return x.fr;
  return "";
};

/**
 * Extrait la variante I18n {fr, en} a partir d'un champ JSON qui peut etre :
 *  - string monolingue → undefined (rien a stocker)
 *  - { fr, en } → renvoye tel quel (avec fr garanti, en optionnel)
 * Utilise pour les champs jumeaux `titleI18n`, `excerptI18n`, etc.
 */
const pickI18n = (x: unknown): Record<string, string> | undefined => {
  if (!isLocalized(x)) return undefined;
  const out: Record<string, string> = { fr: x.fr };
  if (x.en) out.en = x.en;
  return out;
};

/** Mapping des `joinedDocuments.type` inventés par l'agent vers l'enum officiel. */
const DOC_TYPE_MAP: Record<string, string> = {
  accommodation: "hosting_certificate",
  address_attestation: "proof_of_address",
  agent_id: "national_id_card",
  authenticity_certificate: "other_official_document",
  birth_certificates: "birth_certificate",
  coffin_closure: "other_official_document",
  consular_card: "other_official_document",
  death_certificate_full: "death_certificate",
  deceased_passport: "passport",
  divorce_decree: "divorce_judgment",
  documents: "other_official_document",
  driving_license: "driver_license",
  envelope: "other_official_document",
  form: "cerfa_form",
  form_marriage: "cerfa_form",
  id_card: "national_id_card",
  income: "pay_slip",
  insurance: "other_official_document",
  invitation: "other_official_document",
  letter: "handwritten_request",
  loss_declaration: "other_official_document",
  mandate: "power_of_attorney",
  matrimonial_regime: "other_official_document",
  mission_order: "other_official_document",
  naturalisation_decree: "naturalization_file",
  parents_id: "national_id_card",
  passport_copy: "passport",
  passport_pages: "passport",
  pension_document: "retirement_pension_certificate",
  photo: "identity_photo",
  previous_passport: "passport",
  request_letter: "handwritten_request",
  residence_proof: "proof_of_address",
  scholarship_attestation: "other_official_document",
  service_certificate: "other_official_document",
  spouses_id: "national_id_card",
  student_card: "school_certificate",
  ticket: "other_official_document",
  transport_authorisation: "other_official_document",
  vaccination: "medical_certificate",
  witnesses: "other_official_document",
  witnesses_id: "national_id_card",
  work_attestation: "work_certificate",
  work_or_school: "work_certificate",
};

const normalizeDocType = (raw: string): string =>
  DOC_TYPE_MAP[raw] ?? raw;

// ────────────────────────────────────────────────────────────────────────
// Mutation
// ────────────────────────────────────────────────────────────────────────

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const report = {
      services: { patched: 0, missing: [] as string[], docTypeFallbacks: 0 },
      news: { inserted: 0, skipped: 0 },
      tutorials: { inserted: 0, skipped: 0 },
      faqs: { inserted: 0, skipped: 0 },
      events: { inserted: 0, skipped: 0 },
    };

    // Résolution auteur + org pour news/tutos/events
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

    // ── 1. SERVICES — patch des champs éditoriaux ─────────────────────
    for (const raw of servicesData as Array<Record<string, unknown>>) {
      const slug = raw.slug as string;
      const service = await ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!service) {
        report.services.missing.push(slug);
        continue;
      }

      // Strip parasites + clés non patchables
      const {
        slug: _s,
        category: _c,
        status: _st,
        isActive: _ia,
        sources: _src,
        joinedDocuments: rawDocs,
        availableModes: rawModes,
        ...editorial
      } = raw as Record<string, unknown>;

      // Normaliser les types de documents
      const joinedDocuments = Array.isArray(rawDocs)
        ? rawDocs.map((d) => {
            const doc = d as Record<string, unknown>;
            const original = doc.type as string;
            const normalized = normalizeDocType(original);
            if (normalized !== original) report.services.docTypeFallbacks++;
            return { ...doc, type: normalized };
          })
        : undefined;

      // `availableModes[].description` est requis par le schéma mais l'agent
      // l'a parfois omis (46 entrées sur ~120) → fallback sur `title`, ou
      // sur un texte générique dérivé du `mode` si `title` est aussi absent.
      const MODE_FALLBACK_DESC: Record<string, Localized> = {
        online: { fr: "Démarche en ligne", en: "Online procedure" },
        in_person: { fr: "Dépôt en personne au consulat", en: "In-person submission at the consulate" },
        postal: { fr: "Dossier par correspondance", en: "Postal application" },
      };
      const availableModes = Array.isArray(rawModes)
        ? rawModes.map((m) => {
            const mode = m as Record<string, unknown>;
            if (mode.description) return mode;
            const fallback =
              (mode.title as Localized | undefined) ??
              MODE_FALLBACK_DESC[mode.mode as string] ??
              MODE_FALLBACK_DESC.in_person;
            return { ...mode, description: fallback };
          })
        : undefined;

      const patch: Record<string, unknown> = {
        ...editorial,
        updatedAt: now,
      };
      if (joinedDocuments) patch.joinedDocuments = joinedDocuments;
      if (availableModes) patch.availableModes = availableModes;

      await ctx.db.patch(service._id, patch);
      report.services.patched++;
    }

    // ── 2. NEWS / POSTS ───────────────────────────────────────────────
    type RawArticleSource =
      | string
      | { label?: string; url: string };
    type RawPost = {
      title: unknown;
      slug: string;
      excerpt: unknown;
      content: unknown;
      category: string;
      publishedAt?: number;
      createdAt?: number;
      eventStartAt?: number;
      eventEndAt?: number;
      eventLocation?: unknown;
      eventTicketUrl?: string;
      // Champs editoriaux etendus (maquette Article.html)
      lede?: unknown;
      heroImageCaption?: unknown;
      heroImageCredit?: string;
      readingMinutes?: number;
      location?: string;
      subCategory?: unknown;
      region?: string;
      tags?: string[];
      sources?: RawArticleSource[];
      referenceNumber?: string;
      authorName?: string;
      authorRole?: string;
    };
    for (const raw of newsData as RawPost[]) {
      const existing = await ctx.db
        .query("posts")
        .withIndex("by_slug", (q) => q.eq("slug", raw.slug))
        .first();
      if (existing) {
        report.news.skipped++;
        continue;
      }
      const normalizedSources = raw.sources
        ? raw.sources.map((s) =>
            typeof s === "string"
              ? { label: new URL(s).hostname.replace(/^www\./, ""), url: s }
              : { label: s.label ?? s.url, url: s.url },
          )
        : undefined;
      await ctx.db.insert("posts", {
        title: pickFr(raw.title),
        titleI18n: pickI18n(raw.title),
        slug: raw.slug,
        excerpt: pickFr(raw.excerpt),
        excerptI18n: pickI18n(raw.excerpt),
        content: pickFr(raw.content),
        contentI18n: pickI18n(raw.content),
        category: raw.category as PostCategory,
        status: PostStatus.Published,
        publishedAt: raw.publishedAt ?? now,
        createdAt: raw.createdAt ?? now,
        updatedAt: now,
        authorId: author._id,
        orgId,
        eventStartAt: raw.eventStartAt,
        eventEndAt: raw.eventEndAt,
        eventLocation: raw.eventLocation ? pickFr(raw.eventLocation) : undefined,
        eventTicketUrl: raw.eventTicketUrl,
        // Editorial extensions
        lede: raw.lede ? pickFr(raw.lede) : undefined,
        ledeI18n: pickI18n(raw.lede),
        heroImageCaption: raw.heroImageCaption
          ? pickFr(raw.heroImageCaption)
          : undefined,
        heroImageCaptionI18n: pickI18n(raw.heroImageCaption),
        heroImageCredit: raw.heroImageCredit,
        readingMinutes: raw.readingMinutes,
        location: raw.location,
        subCategory: raw.subCategory ? pickFr(raw.subCategory) : undefined,
        subCategoryI18n: pickI18n(raw.subCategory),
        region: raw.region,
        tags: raw.tags,
        sources: normalizedSources,
        referenceNumber: raw.referenceNumber,
        authorName: raw.authorName,
        authorRole: raw.authorRole,
      });
      report.news.inserted++;
    }

    // ── 3. TUTORIALS ──────────────────────────────────────────────────
    type RawLocalizedOrString = unknown;
    type RawPrerequisite = {
      title: RawLocalizedOrString;
      description?: RawLocalizedOrString;
      requirement: "required" | "optional" | "ifAvailable";
    };
    type RawStep = {
      number: number;
      title: RawLocalizedOrString;
      durationLabel?: RawLocalizedOrString;
      locationLabel?: RawLocalizedOrString;
      body?: RawLocalizedOrString;
    };
    type RawFee = {
      label: RawLocalizedOrString;
      description?: RawLocalizedOrString;
      delay?: RawLocalizedOrString;
      amount: string;
      badge?: string;
    };
    type RawDelay = {
      region: string;
      label: RawLocalizedOrString;
      description: RawLocalizedOrString;
      speed: "fast" | "standard" | "long";
    };
    type RawFaqItem = {
      question: RawLocalizedOrString;
      answer: RawLocalizedOrString;
    };
    type RawProcedureSummary = {
      steps?: RawLocalizedOrString;
      delay?: RawLocalizedOrString;
      fees?: RawLocalizedOrString;
      location?: RawLocalizedOrString;
    };
    type RawTutorial = {
      title: RawLocalizedOrString;
      slug: string;
      excerpt: RawLocalizedOrString;
      content: RawLocalizedOrString;
      category: string;
      type: string;
      duration?: RawLocalizedOrString;
      readingMinutes?: number;
      stepCount?: number;
      badges?: string[];
      featured?: boolean;
      countryCode?: string;
      videoUrl?: string;
      publishedAt?: number;
      createdAt?: number;
      // Champs etendus (maquette Guide.html)
      lede?: RawLocalizedOrString;
      procedureSummary?: RawProcedureSummary;
      prerequisites?: RawPrerequisite[];
      steps?: RawStep[];
      fees?: RawFee[];
      delays?: RawDelay[];
      faqItems?: RawFaqItem[];
      relatedServiceSlug?: string;
      sources?: Array<string | { label?: string; url: string }>;
      availableLocales?: string[];
    };

    const mapLocalizedString = (x: RawLocalizedOrString) => ({
      v: pickFr(x),
      i18n: pickI18n(x),
    });
    const mapPrerequisite = (p: RawPrerequisite) => {
      const t = mapLocalizedString(p.title);
      const d = mapLocalizedString(p.description);
      return {
        title: t.v,
        titleI18n: t.i18n,
        description: p.description ? d.v : undefined,
        descriptionI18n: d.i18n,
        requirement: p.requirement,
      };
    };
    const mapStep = (s: RawStep) => {
      const t = mapLocalizedString(s.title);
      const dur = mapLocalizedString(s.durationLabel);
      const loc = mapLocalizedString(s.locationLabel);
      const body = mapLocalizedString(s.body);
      return {
        number: s.number,
        title: t.v,
        titleI18n: t.i18n,
        durationLabel: s.durationLabel ? dur.v : undefined,
        durationLabelI18n: dur.i18n,
        locationLabel: s.locationLabel ? loc.v : undefined,
        locationLabelI18n: loc.i18n,
        body: s.body ? body.v : undefined,
        bodyI18n: body.i18n,
      };
    };
    const mapFee = (f: RawFee) => {
      const lab = mapLocalizedString(f.label);
      const desc = mapLocalizedString(f.description);
      const del = mapLocalizedString(f.delay);
      return {
        label: lab.v,
        labelI18n: lab.i18n,
        description: f.description ? desc.v : undefined,
        descriptionI18n: desc.i18n,
        delay: f.delay ? del.v : undefined,
        delayI18n: del.i18n,
        amount: f.amount,
        badge: f.badge,
      };
    };
    const mapDelay = (d: RawDelay) => {
      const lab = mapLocalizedString(d.label);
      const desc = mapLocalizedString(d.description);
      return {
        region: d.region,
        label: lab.v,
        labelI18n: lab.i18n,
        description: desc.v,
        descriptionI18n: desc.i18n,
        speed: d.speed,
      };
    };
    const mapFaqItem = (f: RawFaqItem) => {
      const q = mapLocalizedString(f.question);
      const a = mapLocalizedString(f.answer);
      return {
        question: q.v,
        questionI18n: q.i18n,
        answer: a.v,
        answerI18n: a.i18n,
      };
    };
    const mapProcedureSummary = (s: RawProcedureSummary) => {
      const steps = mapLocalizedString(s.steps);
      const delay = mapLocalizedString(s.delay);
      const fees = mapLocalizedString(s.fees);
      const location = mapLocalizedString(s.location);
      return {
        steps: s.steps ? steps.v : undefined,
        stepsI18n: steps.i18n,
        delay: s.delay ? delay.v : undefined,
        delayI18n: delay.i18n,
        fees: s.fees ? fees.v : undefined,
        feesI18n: fees.i18n,
        location: s.location ? location.v : undefined,
        locationI18n: location.i18n,
      };
    };

    for (const raw of tutorialsData as RawTutorial[]) {
      const existing = await ctx.db
        .query("tutorials")
        .withIndex("by_slug", (q) => q.eq("slug", raw.slug))
        .first();
      if (existing) {
        report.tutorials.skipped++;
        continue;
      }

      // Resolve related service by slug → id
      let relatedServiceId: string | undefined;
      if (raw.relatedServiceSlug) {
        const svc = await ctx.db
          .query("services")
          .withIndex("by_slug", (q) =>
            q.eq("slug", raw.relatedServiceSlug as string),
          )
          .first();
        if (svc) relatedServiceId = svc._id;
      }

      const normalizedSources = raw.sources
        ? raw.sources.map((s) =>
            typeof s === "string"
              ? { label: new URL(s).hostname.replace(/^www\./, ""), url: s }
              : { label: s.label ?? s.url, url: s.url },
          )
        : undefined;

      const dur = mapLocalizedString(raw.duration);
      const lede = mapLocalizedString(raw.lede);

      await ctx.db.insert("tutorials", {
        title: pickFr(raw.title),
        titleI18n: pickI18n(raw.title),
        slug: raw.slug,
        excerpt: pickFr(raw.excerpt),
        excerptI18n: pickI18n(raw.excerpt),
        content: pickFr(raw.content),
        contentI18n: pickI18n(raw.content),
        category: raw.category as never,
        type: raw.type as never,
        duration: raw.duration ? dur.v : undefined,
        durationI18n: dur.i18n,
        readingMinutes: raw.readingMinutes,
        stepCount: raw.stepCount ?? raw.steps?.length,
        badges: raw.badges as never,
        featured: raw.featured,
        countryCode: raw.countryCode,
        videoUrl: raw.videoUrl,
        status: PostStatus.Published as never,
        publishedAt: raw.publishedAt ?? now,
        createdAt: raw.createdAt ?? now,
        updatedAt: now,
        authorId: author._id,
        // Editorial extensions
        lede: raw.lede ? lede.v : undefined,
        ledeI18n: lede.i18n,
        procedureSummary: raw.procedureSummary
          ? mapProcedureSummary(raw.procedureSummary)
          : undefined,
        prerequisites: raw.prerequisites?.map(mapPrerequisite),
        steps: raw.steps?.map(mapStep),
        fees: raw.fees?.map(mapFee),
        delays: raw.delays?.map(mapDelay),
        faqItems: raw.faqItems?.map(mapFaqItem),
        relatedServiceId: relatedServiceId as never,
        sources: normalizedSources,
        availableLocales: raw.availableLocales,
      });
      report.tutorials.inserted++;
    }

    // ── 4. FAQ ────────────────────────────────────────────────────────
    type RawFaq = {
      question: unknown;
      answer: unknown;
      category: string;
      order?: number;
      featured?: boolean;
      isActive?: boolean;
      updatedAt?: number;
    };
    for (const raw of faqsData as RawFaq[]) {
      const question = pickFr(raw.question);
      const existing = await ctx.db
        .query("faqs")
        .withIndex("by_category_order", (q) => q.eq("category", raw.category as never))
        .filter((q) => q.eq(q.field("question"), question))
        .first();
      if (existing) {
        report.faqs.skipped++;
        continue;
      }
      await ctx.db.insert("faqs", {
        question,
        answer: pickFr(raw.answer),
        category: raw.category as never,
        order: raw.order ?? 0,
        featured: raw.featured ?? false,
        isActive: raw.isActive ?? true,
        updatedAt: raw.updatedAt ?? now,
      });
      report.faqs.inserted++;
    }

    // ── 5. COMMUNITY EVENTS ───────────────────────────────────────────
    type RawEvent = {
      title: unknown;
      slug: string;
      description?: unknown;
      date: number;
      location: unknown;
      category: string;
      status?: string;
      createdAt?: number;
    };
    for (const raw of eventsData as RawEvent[]) {
      const existing = await ctx.db
        .query("communityEvents")
        .withIndex("by_slug", (q) => q.eq("slug", raw.slug))
        .first();
      if (existing) {
        report.events.skipped++;
        continue;
      }
      await ctx.db.insert("communityEvents", {
        title: pickFr(raw.title),
        slug: raw.slug,
        description: raw.description ? pickFr(raw.description) : undefined,
        date: raw.date,
        location: pickFr(raw.location),
        category: raw.category,
        status: (raw.status ?? "published") as never,
        createdAt: raw.createdAt ?? now,
        orgId,
      });
      report.events.inserted++;
    }

    return report;
  },
});
