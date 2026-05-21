"use client"

import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  FileText,
  LayoutGrid,
  Loader2,
  Mail,
  Megaphone,
  Newspaper,
  Image as ImageIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useMutation,
  usePreloadedQuery,
  useQuery,
  type Preloaded,
} from "convex/react"
import {
  usePaginatedConvexQuery,
} from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

type UrlCategory = "news" | "event" | "communique"

const TABS: {
  id: UrlCategory | null
  labelKey: string
  fallback: string
  icon: typeof Newspaper
  category: (typeof PostCategory)[keyof typeof PostCategory] | null
}[] = [
  { id: null, labelKey: "news.categories.all", fallback: "Toutes", icon: LayoutGrid, category: null },
  { id: "news", labelKey: "news.categories.news", fallback: "Actualités", icon: Newspaper, category: PostCategory.News },
  { id: "event", labelKey: "news.categories.event", fallback: "Événements", icon: CalendarDays, category: PostCategory.Event },
  { id: "communique", labelKey: "news.categories.announcement", fallback: "Communiqués", icon: Megaphone, category: PostCategory.Announcement },
]

const ARTICLE_TONES = ["tone-blue", "tone-green", "tone-yellow", "tone-warm"] as const

const TONE_CLASSES: Record<(typeof ARTICLE_TONES)[number], { bg: string; fg: string }> = {
  "tone-blue": {
    bg: "bg-[linear-gradient(135deg,var(--gabon-blue-tint,_#e7eff9),var(--surface-2,_#fbfaf6))]",
    fg: "text-[var(--gabon-blue-hex)]",
  },
  "tone-green": {
    bg: "bg-[linear-gradient(135deg,var(--gabon-green-tint,_#e3f3e9),var(--surface-2,_#fbfaf6))]",
    fg: "text-[var(--gabon-green-hex)]",
  },
  "tone-yellow": {
    bg: "bg-[linear-gradient(135deg,var(--gabon-yellow-tint,_#fbf2cf),var(--surface-2,_#fbfaf6))]",
    fg: "text-[#a07c00]",
  },
  "tone-warm": {
    bg: "bg-[linear-gradient(135deg,var(--status-warning-tint,_#faedca),var(--surface-2,_#fbfaf6))]",
    fg: "text-[var(--status-warning,_#a16e00)]",
  },
}

const CATEGORY_PILL: Record<string, string> = {
  [PostCategory.News]:
    "bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)]",
  [PostCategory.Event]:
    "bg-[var(--status-warning-tint,_#faedca)] text-[var(--status-warning,_#a16e00)]",
  [PostCategory.Announcement]:
    "bg-[var(--status-success-tint,_#e3f1e8)] text-[var(--status-success,_#157a3d)]",
}

type Post = {
  _id: string
  slug: string
  title: string
  excerpt: string
  category: string
  coverImageUrl: string | null
  documentUrl?: string | null
  publishedAt?: number
  eventStartAt?: number
  eventLocation?: string
  authorName?: string | null
  orgName?: string | null
}

function urlCategoryToPostCategory(
  value: UrlCategory | null,
): (typeof PostCategory)[keyof typeof PostCategory] | undefined {
  if (!value) return undefined
  if (value === "communique") return PostCategory.Announcement
  if (value === "event") return PostCategory.Event
  return PostCategory.News
}

type TLike = (k: string, d?: string) => string

function categoryLabel(t: TLike, cat: string) {
  if (cat === PostCategory.News) return t("news.categories.news", "Actualité")
  if (cat === PostCategory.Event) return t("news.categories.event", "Événement")
  if (cat === PostCategory.Announcement)
    return t("news.categories.announcement", "Communiqué")
  return cat
}

export function NewsPageClient({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.functions.posts.list>
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get("category") as UrlCategory | null
  const selectedCategory = urlCategoryToPostCategory(category)

  const preloadedData = usePreloadedQuery(preloaded)

  const {
    results,
    isLoading,
    status: paginationStatus,
    loadMore,
  } = usePaginatedConvexQuery(
    api.functions.posts.list,
    { category: selectedCategory },
    { initialNumItems: 20 },
  )

  const posts = (
    results.length > 0 ? results : preloadedData.page
  ) as Post[]
  const canLoadMore = paginationStatus === "CanLoadMore"
  const showEmpty = !isLoading && posts.length === 0

  const handleCategoryChange = (id: UrlCategory | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id === null) params.delete("category")
    else params.set("category", id)
    router.replace(`/news${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    })
  }

  const counts = useMemo(() => {
    const c = {
      all: posts.length,
      news: 0,
      event: 0,
      announcement: 0,
    }
    posts.forEach((p) => {
      if (p.category === PostCategory.News) c.news++
      else if (p.category === PostCategory.Event) c.event++
      else if (p.category === PostCategory.Announcement) c.announcement++
    })
    return c
  }, [posts])

  const featured = useMemo(
    () =>
      posts.find((p) => p.category === PostCategory.News && p.coverImageUrl) ||
      posts.find((p) => p.category === PostCategory.News) ||
      posts[0],
    [posts],
  )

  const announcements = useMemo(
    () =>
      posts
        .filter((p) => p.category === PostCategory.Announcement)
        .slice(0, 4),
    [posts],
  )

  const articles = useMemo(
    () =>
      posts.filter(
        (p) =>
          p._id !== featured?._id &&
          p.category !== PostCategory.Event &&
          p.category !== PostCategory.Announcement,
      ),
    [posts, featured],
  )

  const events = useMemo(
    () =>
      posts
        .filter((p) => p.category === PostCategory.Event)
        .sort((a, b) => (a.eventStartAt ?? 0) - (b.eventStartAt ?? 0))
        .slice(0, 4),
    [posts],
  )

  const lastUpdate = useMemo(() => {
    const stamps = posts
      .map((p) => p.publishedAt)
      .filter((x): x is number => typeof x === "number")
    return stamps.length ? Math.max(...stamps) : null
  }, [posts])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[color:var(--foreground)] font-sans">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        {/* HERO */}
        <section className="pt-10 md:pt-14 pb-8">
          <div className="inline-flex h-[3px] w-14 rounded-full overflow-hidden">
            <span className="flex-1 bg-[var(--gabon-green-hex)]" />
            <span className="flex-1 bg-[var(--gabon-yellow-hex)]" />
            <span className="flex-1 bg-[var(--gabon-blue-hex)]" />
          </div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 mt-4 rounded-full bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] text-[13px] font-medium">
            {t("news.kicker", "Informations & actualités")}
          </span>
          <h1
            className="font-semibold tracking-[-0.025em] leading-[1.05] mt-4"
            style={{ fontSize: "clamp(40px, 5.2vw, 64px)" }}
          >
            {t("news.heroTitlePart1", "Actualités du ")}
            <span className="text-[var(--gabon-blue-hex)]">
              {t("news.heroTitleAccent", "réseau des administrations.")}
            </span>
          </h1>
          <p className="mt-5 text-[17px] leading-[1.55] text-[color:var(--muted-foreground)] max-w-[620px]">
            {t(
              "news.heroLede",
              "Dernières nouvelles, événements à venir et communiqués officiels du Ministère des Affaires étrangères et des administrations de la République Gabonaise.",
            )}
          </p>

          <div className="mt-7 pt-5 border-t border-[color:var(--border)] flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-[color:var(--muted-foreground)]">
            <span>
              <strong className="text-[color:var(--foreground)] font-semibold">
                {counts.news}
              </strong>{" "}
              {t("news.heroStatNews", "articles")}
            </span>
            <Dot />
            <span>
              <strong className="text-[color:var(--foreground)] font-semibold">
                {counts.event}
              </strong>{" "}
              {t("news.heroStatEvents", "événements à venir")}
            </span>
            <Dot />
            <span>
              <strong className="text-[color:var(--foreground)] font-semibold">
                {counts.announcement}
              </strong>{" "}
              {t("news.heroStatAnnouncements", "communiqués officiels")}
            </span>
            {lastUpdate && (
              <>
                <Dot />
                <span>
                  {t("news.heroLastUpdate", "Mise à jour :")}{" "}
                  <strong className="text-[color:var(--foreground)] font-semibold">
                    {format(new Date(lastUpdate), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </strong>
                </span>
              </>
            )}
          </div>
        </section>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => {
            const isActive =
              (category ?? null) === (tab.id ?? null) ||
              (!category && tab.id === null)
            const count =
              tab.id === null
                ? counts.all
                : tab.id === "news"
                  ? counts.news
                  : tab.id === "event"
                    ? counts.event
                    : counts.announcement
            const Icon = tab.icon
            return (
              <button
                key={tab.id ?? "all"}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition border",
                  isActive
                    ? "bg-[var(--gabon-blue-hex)] text-white border-transparent"
                    : "bg-[var(--surface,_#fff)] border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]",
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                {t(tab.labelKey, tab.fallback)}
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    isActive ? "opacity-70" : "opacity-60",
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {showEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* TOP ROW : featured + communiqués */}
            {(featured || announcements.length > 0) && (
              <section className="grid lg:grid-cols-[1.45fr_1fr] gap-6 mb-14">
                {featured && <Featured post={featured} />}
                {announcements.length > 0 && (
                  <AnnouncementsRail items={announcements} />
                )}
              </section>
            )}

            {/* ARTICLES GRID */}
            {articles.length > 0 && (
              <section className="mb-16">
                <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
                  <h2 className="text-[24px] font-semibold tracking-[-0.02em] flex items-baseline gap-3">
                    {t("news.latestSection", "Dernières publications")}
                    <span className="font-mono text-[12px] font-normal text-[color:var(--text-faint,_#9a9588)]">
                      {articles.length}{" "}
                      {t("news.latestSubtitle", "cette semaine")}
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {articles.map((post, i) => (
                    <ArticleCard
                      key={post._id}
                      post={post}
                      tone={ARTICLE_TONES[i % ARTICLE_TONES.length]}
                    />
                  ))}
                </div>
                {canLoadMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      type="button"
                      onClick={() => loadMore(20)}
                      className="inline-flex items-center gap-2 bg-[var(--surface,_#fff)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-full px-5 py-2.5 text-[14px] font-medium text-[color:var(--foreground)] transition"
                    >
                      {t("news.loadMore", "Charger plus")}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* AGENDA + side stack (newsletter + stats) */}
            <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-16">
              <Agenda events={events} />
              <div className="flex flex-col gap-4">
                <NewsletterCard />
                <StatsCard />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */

function Dot() {
  return (
    <span className="w-[4px] h-[4px] rounded-full bg-[color:var(--border-strong,_#d2cdbf)]" />
  )
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  )
}

function Featured({ post }: { post: Post }) {
  const { t } = useTranslation()
  const initials = (post.authorName || "DC")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const dateLabel = post.publishedAt
    ? format(new Date(post.publishedAt), "d MMMM yyyy", { locale: fr })
    : null

  return (
    <article className="relative flex flex-col bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl overflow-hidden">
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(to right, var(--gabon-green-hex) 0%, var(--gabon-green-hex) 33%, var(--gabon-yellow-hex) 33%, var(--gabon-yellow-hex) 66%, var(--gabon-blue-hex) 66%, var(--gabon-blue-hex) 100%)",
        }}
      />
      <div className="relative aspect-[16/9] bg-[var(--surface-3,_#f3efe4)] border-b border-[color:var(--border)] overflow-hidden">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 760px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[color:var(--text-faint,_#9a9588)]">
            <ImageIcon className="w-10 h-10 opacity-50" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 bg-[var(--gabon-blue-hex)] text-white px-3 py-1.5 rounded-full text-[12px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gabon-yellow-hex)]" />
          {t("news.featuredRibbon", "À la une")}
        </span>
      </div>
      <div className="p-7 md:p-8 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-[color:var(--muted-foreground)]">
          <Pill className={CATEGORY_PILL[post.category]}>
            {categoryLabel(t as unknown as TLike, post.category)}
          </Pill>
          {dateLabel && (
            <>
              <Dot />
              <span>{dateLabel}</span>
            </>
          )}
        </div>
        <h2 className="text-[24px] md:text-[28px] font-semibold tracking-[-0.02em] leading-[1.2]">
          <Link
            href={`/news/${post.slug}`}
            className="hover:text-[var(--gabon-blue-hex)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>
        <p className="text-[15px] leading-[1.55] text-[color:var(--muted-foreground)] max-w-[620px] line-clamp-3">
          {post.excerpt}
        </p>
        <div className="mt-1 pt-4 border-t border-[color:var(--border)] flex items-center justify-between">
          {post.authorName || post.orgName ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] grid place-items-center text-[12px] font-semibold">
                {initials}
              </div>
              <div className="text-[13px] leading-tight">
                {post.authorName && (
                  <div className="font-medium">{post.authorName}</div>
                )}
                {post.orgName && (
                  <div className="text-[12px] text-[color:var(--muted-foreground)]">
                    {post.orgName}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span />
          )}
          <Link
            href={`/news/${post.slug}`}
            className="inline-flex items-center gap-1.5 bg-[var(--surface,_#fff)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] rounded-full px-3.5 py-2 text-[13px] font-medium text-[color:var(--foreground)] transition"
          >
            {t("news.readArticle", "Lire l'article")}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function AnnouncementsRail({ items }: { items: Post[] }) {
  const { t } = useTranslation()
  return (
    <aside className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between pb-4 mb-1 border-b border-[color:var(--border)]">
        <h3 className="text-[15px] font-semibold tracking-[-0.005em]">
          {t("news.announcementsTitle", "Communiqués officiels")}
        </h3>
        <Link
          href="/news?category=communique"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--gabon-blue-hex)] hover:underline"
          scroll={false}
        >
          {t("news.viewAll", "Tous")}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>
      </div>
      {items.map((item, idx) => (
        <Link
          key={item._id}
          href={`/news/${item.slug}`}
          className={cn(
            "group py-3.5 flex flex-col gap-1.5",
            idx < items.length - 1 && "border-b border-dashed border-[color:var(--border)]",
          )}
        >
          <span className="inline-flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[color:var(--text-faint,_#9a9588)]">
            {item.publishedAt && (
              <span>
                {format(new Date(item.publishedAt), "d MMM yyyy", {
                  locale: fr,
                })}
              </span>
            )}
            {item.orgName && (
              <span className="text-[var(--gabon-blue-hex)] font-semibold">
                · {item.orgName}
              </span>
            )}
          </span>
          <span className="text-[14px] leading-[1.4] font-medium group-hover:text-[var(--gabon-blue-hex)] transition-colors">
            {item.title}
          </span>
        </Link>
      ))}
    </aside>
  )
}

function ArticleCard({
  post,
  tone,
}: {
  post: Post
  tone: (typeof ARTICLE_TONES)[number]
}) {
  const { t } = useTranslation()
  const toneClasses = TONE_CLASSES[tone]
  const dateLabel = post.publishedAt
    ? format(new Date(post.publishedAt), "d MMMM yyyy", { locale: fr })
    : null
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex flex-col bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl overflow-hidden transition hover:border-[var(--gabon-blue-hex)] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(20,19,15,.04),0_1px_2px_rgba(20,19,15,.04)]"
    >
      <div
        className={cn(
          "relative aspect-[16/9] border-b border-[color:var(--border)] grid place-items-center",
          toneClasses.bg,
          toneClasses.fg,
        )}
      >
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <Newspaper className="w-9 h-9 opacity-40" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex-1 p-5 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--muted-foreground)]">
          <Pill className={CATEGORY_PILL[post.category]}>
            {categoryLabel(t as unknown as TLike, post.category)}
          </Pill>
          {dateLabel && (
            <>
              <Dot />
              <span>{dateLabel}</span>
            </>
          )}
        </div>
        <h3 className="text-[16px] font-semibold tracking-[-0.005em] leading-[1.35] line-clamp-2">
          {post.title}
        </h3>
        <p className="text-[13px] leading-[1.5] text-[color:var(--muted-foreground)] line-clamp-2">
          {post.excerpt}
        </p>
        <div className="mt-auto pt-3 border-t border-dashed border-[color:var(--border)] flex items-center justify-between text-[12px] text-[color:var(--muted-foreground)]">
          {post.documentUrl ? (
            <span className="inline-flex items-center gap-1 text-[var(--status-success,_#157a3d)]">
              <FileText className="w-3.5 h-3.5" strokeWidth={2} />
              {t("news.documentAttached", "Document joint")}
            </span>
          ) : (
            <span>{t("news.readTime", "Lecture rapide")}</span>
          )}
          <span className="text-[var(--gabon-blue-hex)] font-medium inline-flex items-center gap-1">
            {t("news.read", "Lire")}
            <ArrowRight
              className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </span>
        </div>
      </div>
    </Link>
  )
}

function Agenda({ events }: { events: Post[] }) {
  const { t } = useTranslation()
  return (
    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <h3 className="text-[17px] font-semibold tracking-[-0.005em]">
          {t("news.agendaTitle", "Agenda & événements")}
          <span className="ml-2 font-mono text-[12px] font-normal text-[color:var(--text-faint,_#9a9588)]">
            · {events.length} {t("news.agendaUpcoming", "à venir")}
          </span>
        </h3>
        <Link
          href="/news?category=event"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--gabon-blue-hex)] hover:underline"
          scroll={false}
        >
          {t("news.viewAll", "Tout voir")}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>
      </div>
      <div className="flex flex-col">
        {events.length === 0 ? (
          <div className="px-6 pb-6 text-[13px] text-[color:var(--muted-foreground)]">
            {t("news.agendaEmpty", "Aucun événement à venir pour le moment.")}
          </div>
        ) : (
          events.map((ev, idx) => <EventRow key={ev._id} event={ev} first={idx === 0} />)
        )}
      </div>
    </div>
  )
}

function EventRow({ event, first }: { event: Post; first: boolean }) {
  const { t } = useTranslation()
  const date = event.eventStartAt ? new Date(event.eventStartAt) : null
  const month = date
    ? format(date, "LLL", { locale: fr }).replace(".", "")
    : "—"
  const day = date ? format(date, "dd") : "—"
  const time = date ? format(date, "HH'h'mm", { locale: fr }) : ""
  return (
    <Link
      href={`/news/${event.slug}`}
      className={cn(
        "grid grid-cols-[64px_1fr_auto] gap-[18px] items-center px-6 py-5 hover:bg-[color:var(--surface-2,_#fbfaf6)] transition-colors",
        !first && "border-t border-[color:var(--border)]",
      )}
    >
      <div className="flex flex-col items-center bg-[color:var(--surface-2,_#fbfaf6)] border border-[color:var(--border)] rounded-[10px] py-2 leading-none">
        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--gabon-blue-hex)] font-semibold mb-1">
          {month}
        </span>
        <span className="text-[22px] font-semibold tracking-[-0.02em]">
          {day}
        </span>
      </div>
      <div>
        <h4 className="text-[15px] font-semibold leading-[1.3]">{event.title}</h4>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--muted-foreground)]">
          {event.eventLocation && (
            <>
              <Calendar
                className="w-3.5 h-3.5 text-[color:var(--text-faint,_#9a9588)]"
                strokeWidth={2}
              />
              <span>{event.eventLocation}</span>
            </>
          )}
          {time && (
            <>
              <Dot />
              <span>{time}</span>
            </>
          )}
        </div>
      </div>
      <span className="text-[12px] font-medium text-[var(--gabon-blue-hex)] whitespace-nowrap">
        {t("news.eventCta", "S'inscrire →")}
      </span>
    </Link>
  )
}

function NewsletterCard() {
  const { t, i18n } = useTranslation()
  const subscribe = useMutation(api.functions.newsletter.subscribe)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already" | "error"
  >("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "loading") return
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus("loading")
    setErrorMsg(null)
    try {
      const result = await subscribe({
        email: trimmed,
        source: "news_page",
        language: (i18n.language?.startsWith("en") ? "en" : "fr") as
          | "fr"
          | "en",
      })
      if (result.alreadySubscribed) {
        setStatus("already")
      } else {
        setStatus("success")
      }
      setEmail("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus("error")
      setErrorMsg(
        msg.includes("INVALID_EMAIL")
          ? t("news.newsletterInvalid", "Adresse email invalide.")
          : t("news.newsletterError", "Échec de l'abonnement, réessayez."),
      )
    }
  }

  return (
    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-6">
      <div className="w-10 h-10 rounded-[10px] bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] grid place-items-center mb-3.5">
        <Mail className="w-5 h-5" strokeWidth={2} />
      </div>
      <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
        {t("news.newsletterTitle", "L'hebdomadaire diplomatique.")}
      </h3>
      <p className="mt-2 text-[13px] leading-[1.55] text-[color:var(--muted-foreground)]">
        {t(
          "news.newsletterDesc",
          "Recevez chaque vendredi l'essentiel de l'actualité du réseau des administrations — 4 minutes de lecture.",
        )}
      </p>
      {status === "success" || status === "already" ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-[14px] border border-[color:var(--status-success-tint,_#e3f1e8)] bg-[color:var(--status-success-tint,_#e3f1e8)] text-[var(--status-success,_#157a3d)] px-3 py-2.5 text-[13px]"
        >
          <Check className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.5} />
          <span>
            {status === "success"
              ? t(
                  "news.newsletterSuccess",
                  "Inscription confirmée — merci, vous recevrez le prochain numéro vendredi.",
                )
              : t(
                  "news.newsletterAlready",
                  "Cette adresse est déjà abonnée.",
                )}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2" noValidate>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            aria-label={t("news.newsletterEmailLabel", "Adresse email")}
            disabled={status === "loading"}
            className="flex-1 min-w-0 bg-[color:var(--surface-2,_#fbfaf6)] border border-[color:var(--border-strong,_#d2cdbf)] rounded-full px-4 py-2.5 text-[13px] text-[color:var(--foreground)] outline-none focus:border-[var(--gabon-blue-hex)] focus:shadow-[0_0_0_4px_rgba(11,79,156,.12)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading" || !email.trim()}
            className="inline-flex items-center gap-1.5 bg-[var(--gabon-blue-hex)] hover:bg-[var(--gabon-blue-deep,_#005a94)] disabled:opacity-60 text-white rounded-full px-4 py-2.5 text-[13px] font-medium transition"
          >
            {status === "loading" && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {t("news.newsletterCta", "S'abonner")}
          </button>
        </form>
      )}
      {status === "error" && errorMsg && (
        <p
          role="alert"
          className="mt-2 text-[12px] text-[var(--status-danger,_#b3261e)]"
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}

function StatsCard() {
  const { t } = useTranslation()
  const stats = useQuery(api.functions.publicStats.newsStats, {})

  if (!stats) {
    return (
      <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-6">
        <div className="h-5 w-40 rounded bg-[color:var(--surface-2,_#fbfaf6)] animate-pulse" />
        <div className="mt-3 h-3 w-32 rounded bg-[color:var(--surface-2,_#fbfaf6)] animate-pulse" />
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-6 w-14 rounded bg-[color:var(--surface-2,_#fbfaf6)] animate-pulse" />
              <div className="mt-2 h-3 w-24 rounded bg-[color:var(--surface-2,_#fbfaf6)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const items = [
    {
      value: stats.representations,
      label: t("news.statsRepresentations", "Représentations actives"),
    },
    {
      value: stats.news,
      label: t("news.statsNewsPublished", "Articles publiés"),
    },
    {
      value: stats.upcomingEvents,
      label: t("news.statsUpcomingEvents", "Événements à venir"),
    },
    {
      value: stats.announcements,
      label: t("news.statsAnnouncements", "Communiqués officiels"),
    },
  ]

  return (
    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-6">
      <h3 className="text-[15px] font-semibold">
        {t("news.numbersTitle", "Le réseau en chiffres.")}
      </h3>
      <p className="mt-1 text-[12px] text-[color:var(--muted-foreground)]">
        {t("news.numbersSub", "Indicateurs publics, mis à jour en temps réel.")}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        {items.map((s) => (
          <div key={s.label}>
            <div className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--gabon-blue-hex)] leading-none">
              {s.value.toLocaleString("fr-FR")}
            </div>
            <div className="mt-1.5 text-[11px] uppercase tracking-[0.06em] text-[color:var(--muted-foreground)] leading-[1.3]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-[color:var(--surface-2,_#fbfaf6)] border border-[color:var(--border)] grid place-items-center mx-auto mb-4">
        <Newspaper
          className="w-7 h-7 text-[color:var(--muted-foreground)]"
          strokeWidth={1.5}
        />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t("news.empty")}</h3>
      <p className="text-[color:var(--muted-foreground)]">
        {t(
          "news.emptyHint",
          "Revenez bientôt pour découvrir les dernières nouvelles.",
        )}
      </p>
    </div>
  )
}
