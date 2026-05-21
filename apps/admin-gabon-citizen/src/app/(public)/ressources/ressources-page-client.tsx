"use client"

import { api } from "@convex/_generated/api"
import {
  TutorialBadge,
  TutorialCategory,
  TutorialType,
} from "@convex/lib/constants"
import {
  BookOpen,
  CreditCard,
  FileText,
  GraduationCap,
  Plane,
  Shield,
  ShieldCheck,
  Users,
  Globe,
  Stamp,
  Vote,
  Wallet,
  HeartPulse,
  Home,
  IdCard,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useConvexAuth } from "convex/react"
import { useConvexQuery } from "@/integrations/convex/hooks"
import { useLocationContext } from "@/contexts/LocationContext"

import { PublicHero } from "@/components/public/ressources/PublicHero"
import { ResourceSearchBar } from "@/components/public/ressources/ResourceSearchBar"
import { PopularSearchTags } from "@/components/public/ressources/PopularSearchTags"
import { HeroStatsRow } from "@/components/public/ressources/HeroStatsRow"
import { LocationPromptCard } from "@/components/public/ressources/LocationPromptCard"
import { SectionHeading } from "@/components/public/ressources/SectionHeading"
import {
  GuideCard,
  type GuideCardIconTint,
} from "@/components/public/ressources/GuideCard"
import { CategoryChips, type CategoryChip } from "@/components/public/ressources/CategoryChips"
import { ProcedureList, type ProcedureItem } from "@/components/public/ressources/ProcedureList"
import { VideoTutorialCard } from "@/components/public/ressources/VideoTutorialCard"
import { PublicFAQ } from "@/components/public/ressources/PublicFAQ"

const POPULAR_SEARCHES = [
  "Renouveler son passeport",
  "Acte de naissance",
  "Mariage à l'étranger",
  "Bourses scolaires",
  "Carte consulaire",
]

const FEATURED_CATEGORY_TINTS: Record<string, GuideCardIconTint> = {
  [TutorialCategory.ConsularProcedures]: "primary",
  [TutorialCategory.Administrative]: "primary",
  [TutorialCategory.CivilStatus]: "amber",
  [TutorialCategory.EducationGrants]: "primary",
  [TutorialCategory.PracticalLife]: "success",
  [TutorialCategory.Taxation]: "warning",
  [TutorialCategory.ReturnGabon]: "warning",
  [TutorialCategory.Travel]: "primary",
  [TutorialCategory.Entrepreneurship]: "primary",
}

const PROCEDURE_ICONS: Record<string, typeof FileText> = {
  [TutorialCategory.ConsularProcedures]: IdCard,
  [TutorialCategory.Administrative]: FileText,
  [TutorialCategory.CivilStatus]: Stamp,
  [TutorialCategory.EducationGrants]: GraduationCap,
  [TutorialCategory.PracticalLife]: Home,
  [TutorialCategory.Taxation]: Wallet,
  [TutorialCategory.ReturnGabon]: Plane,
  [TutorialCategory.Travel]: Globe,
  [TutorialCategory.Entrepreneurship]: Users,
}

function formatUpdatedAt(ts?: number) {
  if (!ts) return ""
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
    }).format(new Date(ts))
  } catch {
    return ""
  }
}

function buildGuideMeta(tutorial: {
  readingMinutes?: number
  duration?: string
  publishedAt?: number
  updatedAt?: number
  type: string
}) {
  const parts: string[] = []
  if (tutorial.readingMinutes) {
    parts.push(`Lecture ${tutorial.readingMinutes} min`)
  } else if (tutorial.duration && tutorial.type === TutorialType.Video) {
    parts.push(tutorial.duration)
  }
  const ts = tutorial.updatedAt ?? tutorial.publishedAt
  if (ts) parts.push(`mis à jour le ${formatUpdatedAt(ts)}`)
  return parts.join(" · ")
}

function buildStepLabel(t: {
  stepCount?: number
  type: string
  badges?: TutorialBadge[]
}) {
  if (t.badges?.includes(TutorialBadge.Essential)) return "Essentiel"
  if (t.badges?.includes(TutorialBadge.Express)) return "Express"
  if (t.stepCount) return `${t.stepCount} étapes`
  if (t.type === TutorialType.Article) return "Fiche"
  return undefined
}

export default function RessourcesPageClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const category = (params.get("category") as TutorialCategory | null) ?? null
  const queryText = params.get("q") ?? ""

  const { country } = useLocationContext()
  const { isAuthenticated } = useConvexAuth()

  // Featured guides (Section 3)
  const { data: featured } = useConvexQuery(
    api.functions.tutorials.listFeatured,
    { countryCode: country ?? undefined, limit: 6 },
  )

  // Stats agrégées (hero + chips count)
  const { data: stats } = useConvexQuery(
    api.functions.resources.stats,
    {},
  )

  // Liste filtrée (procédures) ou search
  const { data: filteredList } = useConvexQuery(
    api.functions.tutorials.list,
    queryText ? "skip" : { category: category ?? undefined, limit: 20 },
  )
  const { data: searchResults } = useConvexQuery(
    api.functions.tutorials.search,
    queryText ? { q: queryText, limit: 20 } : "skip",
  )
  const listForSection = queryText ? searchResults : filteredList

  // Tutoriels vidéo (Section 5)
  const { data: videos } = useConvexQuery(
    api.functions.tutorials.list,
    { limit: 12 },
  )
  const videoList = useMemo(
    () => (videos ?? []).filter((v) => v.type === TutorialType.Video).slice(0, 3),
    [videos],
  )

  // Progression utilisateur — seulement si authentifié
  const videoIds = useMemo(() => videoList.map((v) => v._id), [videoList])
  const { data: progressMap } = useConvexQuery(
    api.functions.tutorialProgress.myProgress,
    isAuthenticated && videoIds.length > 0 ? { tutorialIds: videoIds } : "skip",
  )

  // FAQ
  const { data: faqs } = useConvexQuery(api.functions.faqs.list, {
    featured: true,
    limit: 6,
  })

  // Catégories chips
  const categoryChips: CategoryChip[] = useMemo(() => {
    const counts = stats?.byCategory ?? {}
    const desired = [
      TutorialCategory.ConsularProcedures,
      TutorialCategory.CivilStatus,
      TutorialCategory.PracticalLife,
      TutorialCategory.EducationGrants,
      TutorialCategory.Taxation,
      TutorialCategory.ReturnGabon,
    ] as const
    return desired
      .filter((c) => (counts[c] ?? 0) > 0 || c === TutorialCategory.ConsularProcedures)
      .map((value) => ({
        value,
        label: t(`academy.categories.${value}`, value),
        count: counts[value] ?? 0,
      }))
  }, [stats, t])

  return (
    <div className="bg-background min-h-screen">
      {/* === Section 1 — Hero === */}
      <PublicHero
        kicker="Ressources & informations"
        title="Guides, démarches et"
        titleAccent="tutoriels."
        lede="Retrouvez les informations essentielles pour vos démarches consulaires, votre vie pratique à l'étranger, la scolarité de vos enfants — accompagnées de tutoriels vidéo et d'une foire aux questions."
      >
        <ResourceSearchBar defaultValue={queryText} />
        <PopularSearchTags items={POPULAR_SEARCHES} />
        <HeroStatsRow />
      </PublicHero>

      {/* === Section 2 — Location prompt === */}
      <LocationPromptCard />

      {/* === Section 3 — Guides personnalisés === */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-18 pt-10">
        <SectionHeading
          title="Vos guides"
          titleAccent="personnalisés."
          lede="Sélection de démarches consulaires fréquentes, adaptée à votre situation et à votre représentation de rattachement."
          allHref="/ressources?all=guides"
          allLabel="Tous les guides"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(featured ?? []).map((tut) => {
            const tint = FEATURED_CATEGORY_TINTS[tut.category] ?? "primary"
            const Icon = PROCEDURE_ICONS[tut.category] ?? FileText
            return (
              <GuideCard
                key={tut._id}
                href={`/ressources/${tut.slug}`}
                icon={Icon}
                iconTint={tint}
                stepLabel={buildStepLabel(tut)}
                title={tut.title}
                description={tut.excerpt}
                meta={buildGuideMeta(tut)}
              />
            )
          })}
          {(featured?.length ?? 0) === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Aucun guide marqué « featured » pour l'instant — passez le drapeau{" "}
              <code>featured: true</code> sur quelques tutoriels depuis le backoffice.
            </div>
          ) : null}
        </div>
      </section>

      {/* === Section 4 — Toutes les démarches === */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-18 pt-10">
        <SectionHeading
          title="Toutes les"
          titleAccent="démarches."
          lede={`${stats?.tutorialsCount ?? "—"} fiches et procédures, organisées par thématique. Filtrez par catégorie pour affiner.`}
          allHref="/services"
          allLabel="Catalogue des services"
        />
        <CategoryChips
          items={categoryChips}
          total={stats?.tutorialsCount}
          paramName="category"
        />
        <ProcedureList
          items={(listForSection ?? []).map<ProcedureItem>((tut) => ({
            id: tut._id,
            href: `/ressources/${tut.slug}`,
            icon: PROCEDURE_ICONS[tut.category] ?? FileText,
            title: tut.title,
            subMeta: [
              tut.stepCount ? `${tut.stepCount} étapes` : "Fiche",
              tut.readingMinutes ? `${tut.readingMinutes} min` : "—",
            ].filter((s) => s !== "—"),
            badge: tut.badges?.includes(TutorialBadge.Updated)
              ? { label: "Mis à jour", tone: "info" }
              : tut.badges?.includes(TutorialBadge.Express)
              ? { label: "Express", tone: "success" }
              : tut.badges?.includes(TutorialBadge.Essential)
              ? { label: "Essentiel", tone: "warning" }
              : undefined,
          }))}
        />
      </section>

      {/* === Section 5 — Tutoriels vidéo === */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-18 pt-10">
        <SectionHeading
          title="Tutoriels en"
          titleAccent="vidéo."
          lede="Cours pas-à-pas de 5 à 12 minutes, sous-titrés en français, anglais, portugais et arabe."
          allHref="/ressources?type=video"
          allLabel="Voir la chaîne complète"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videoList.map((v, idx) => {
            const tint = (["blue", "green", "yellow"] as const)[idx % 3]
            const progress = progressMap?.[v._id]
            return (
              <VideoTutorialCard
                key={v._id}
                href={`/ressources/${v.slug}`}
                thumbnail={v.coverImageUrl ?? undefined}
                thumbTint={tint}
                episode={
                  v.category
                    ? `Épisode ${String(idx + 1).padStart(2, "0")} · ${t(
                        `academy.categories.${v.category}`,
                        v.category,
                      )}`
                    : undefined
                }
                title={v.title}
                duration={v.duration}
                progressPercent={isAuthenticated ? progress?.percent ?? 0 : undefined}
              />
            )
          })}
          {videoList.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Aucun tutoriel vidéo publié pour l'instant.
            </div>
          ) : null}
        </div>
      </section>

      {/* === Section 6 — FAQ === */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-18 pt-10 pb-20">
        <SectionHeading
          title="Foire aux"
          titleAccent="questions."
          lede="Les réponses aux questions les plus fréquemment posées par les ressortissants gabonais et leurs partenaires."
          allHref="/faq"
          allLabel="Toutes les questions"
        />
        <PublicFAQ
          items={(faqs ?? []).map((f) => ({
            id: f._id,
            question: f.question,
            answer: f.answer,
          }))}
        />
      </section>
    </div>
  )
}
