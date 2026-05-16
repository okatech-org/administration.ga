"use client"

import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { enUS, fr as frLocale } from "date-fns/locale"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Mail,
  MapPin,
  Printer,
  Share2,
  Ticket,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePreloadedQuery, type Preloaded } from "convex/react"
import { RichTextRenderer } from "@/components/common/rich-text-editor"
import { Button } from "@/components/ui/button"
import { getLocalizedValue } from "@/lib/i18n-utils"
import { cn } from "@/lib/utils"

// Brand glyphs (lucide-react 1.x dropped brand icons — inline SVGs)
function LinkedinGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}
function TwitterGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  )
}

type RelatedPost = {
  _id: string
  slug: string
  title: string
  titleI18n?: Record<string, string>
  excerpt: string
  excerptI18n?: Record<string, string>
  category: string
  subCategory?: string
  subCategoryI18n?: Record<string, string>
  publishedAt?: number
  coverImageUrl: string | null
}

function categoryPill(category: string) {
  return (
    {
      news: { label: "Actualité", className: "bg-[var(--gabon-blue-tint)] text-[var(--gabon-blue-hex)]" },
      event: { label: "Événement", className: "bg-amber-100 text-amber-800" },
      communique: {
        label: "Communiqué officiel",
        className: "bg-emerald-100 text-emerald-800",
      },
      other: { label: "Article", className: "bg-gray-100 text-gray-800" },
    }[category] ?? { label: category, className: "bg-gray-100 text-gray-800" }
  )
}

/** Extract h2[id] from the HTML content to build the sticky TOC. */
function useTocFromHtml(html: string) {
  return useMemo(() => {
    if (typeof window === "undefined") return [] as Array<{ id: string; label: string }>
    const doc = new DOMParser().parseFromString(html, "text/html")
    return Array.from(doc.querySelectorAll("h2[id]")).map((el) => ({
      id: el.id,
      label: el.textContent ?? "",
    }))
  }, [html])
}

/** Track the active TOC entry via IntersectionObserver. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (ids.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -65% 0px" },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])
  return active
}

/** Track scroll progress (0-100) for the reading-progress pill. */
function useScrollProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return setPct(100)
      setPct(Math.min(100, Math.round((window.scrollY / max) * 100)))
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])
  return pct
}

export function PostDetailClient({
  preloaded,
  related,
}: {
  preloaded: Preloaded<typeof api.functions.posts.getBySlug>
  related: RelatedPost[]
}) {
  const { t, i18n } = useTranslation()
  const post = usePreloadedQuery(preloaded)
  const lang = i18n.language ?? "fr"
  const dateLocale = lang.startsWith("en") ? enUS : frLocale

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t("news.notFound")}</h1>
          <Button asChild>
            <Link href="/news">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("news.backToList")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const title = getLocalizedValue(post.titleI18n ?? post.title, lang)
  const excerpt = getLocalizedValue(post.excerptI18n ?? post.excerpt, lang)
  const lede = getLocalizedValue(
    (post.ledeI18n ?? post.lede) as string | Record<string, string> | undefined,
    lang,
  )
  const content = getLocalizedValue(post.contentI18n ?? post.content, lang)
  const heroCaption = getLocalizedValue(
    post.heroImageCaptionI18n ?? post.heroImageCaption,
    lang,
  )
  const subCategory = getLocalizedValue(
    post.subCategoryI18n ?? post.subCategory,
    lang,
  )
  // Publisher = origin de la publication (toujours derive de l'org ou de
  // la plateforme). Les champs `authorName` / `authorRole` du post ne
  // servent que d'override editorial explicite quand ils sont renseignes,
  // mais ne fabriquent jamais un faux auteur par defaut.
  const publisherName =
    post.authorName ?? post.org?.name ?? "Consulat.ga"
  const publisherRole =
    post.authorRole ??
    (post.org ? "Service de communication" : "Plateforme officielle")
  const publisherHref = post.org ? `/reps/${post.org.slug}` : "/"
  const publisherLogoUrl = post.org?.logoUrl ?? null

  const isEvent = post.category === PostCategory.Event
  const isCommunique = post.category === PostCategory.Announcement
  const catPill = categoryPill(post.category)

  const toc = useTocFromHtml(content)
  const activeId = useActiveSection(toc.map((t) => t.id))
  const progress = useScrollProgress()

  const initials = publisherName
    .split(/[\s—-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, text: excerpt, url: window.location.href })
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 lg:py-10 max-w-6xl">
        {/* 01 Breadcrumb */}
        <nav
          aria-label="Fil d'Ariane"
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap"
        >
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <Link href="/news" className="hover:text-foreground">
            Actualités
          </Link>
          {subCategory && (
            <>
              <ChevronRight className="h-3 w-3 opacity-50" />
              <span>{subCategory}</span>
            </>
          )}
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="text-foreground font-medium truncate max-w-[40ch]">
            {title}
          </span>
        </nav>

        {/* 02 En-tête article */}
        <header className="mb-8">
          <div className="gabon-stripe h-1 w-24 rounded-full mb-5" />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={cn(
                "text-xs font-medium px-3 py-1 rounded-full",
                catPill.className,
              )}
            >
              {catPill.label}
            </span>
            {subCategory && (
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--surface)] border border-border">
                {subCategory}
              </span>
            )}
            {post.region && (
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--surface)] border border-border capitalize">
                {post.region.toLowerCase()}
              </span>
            )}
            {post.referenceNumber && (
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-mono">
                {post.referenceNumber}
              </span>
            )}
          </div>

          <h1 className="article-headline text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-5">
            {title}
          </h1>

          {(lede || excerpt) && (
            <p className="article-summary text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl mb-6">
              {lede || excerpt}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 pt-5 border-t">
            <Link
              href={publisherHref}
              className="flex items-center gap-3 group"
            >
              <div className="h-10 w-10 rounded-full bg-[var(--gabon-blue-tint)] text-[var(--gabon-blue-hex)] grid place-items-center text-xs font-semibold overflow-hidden">
                {publisherLogoUrl ? (
                  <Image
                    src={publisherLogoUrl}
                    alt={publisherName}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div>
                <div className="text-sm font-medium group-hover:text-[var(--gabon-blue-hex)]">
                  {publisherName}
                </div>
                {publisherRole && (
                  <div className="text-xs text-muted-foreground">
                    {publisherRole}
                  </div>
                )}
              </div>
            </Link>

            <span className="h-6 w-px bg-border" />

            {post.publishedAt && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(post.publishedAt), "d MMMM yyyy", {
                  locale: dateLocale,
                })}
              </span>
            )}
            {post.readingMinutes && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {post.readingMinutes} min de lecture
              </span>
            )}
            {post.location && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {post.location}
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Imprimer"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
              </Button>
              {isCommunique && post.documentUrl && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Télécharger en PDF"
                >
                  <a
                    href={post.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Partager"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* 03 Photo principale */}
        {post.coverImageUrl && (
          <figure className="mb-10">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted">
              <Image
                src={post.coverImageUrl}
                alt={heroCaption || title}
                fill
                sizes="(max-width: 1024px) 100vw, 1100px"
                priority
                className="object-cover"
              />
              {post.heroImageCredit && (
                <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] tracking-wide uppercase px-2 py-1 rounded">
                  {post.heroImageCredit}
                </span>
              )}
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-0 h-1 gabon-stripe"
              />
            </div>
            {heroCaption && (
              <figcaption className="mt-3 text-sm text-muted-foreground italic max-w-3xl">
                {heroCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* Event / Communique callouts kept inline (preserved from previous version) */}
        {isEvent && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8 max-w-3xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {post.eventStartAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium">{t("news.event.date")}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(
                        new Date(post.eventStartAt),
                        "EEEE d MMMM yyyy 'à' HH:mm",
                        { locale: dateLocale },
                      )}
                    </div>
                  </div>
                </div>
              )}
              {post.eventLocation && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {t("news.event.location")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {post.eventLocation}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {post.eventTicketUrl && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <Button asChild>
                  <a
                    href={post.eventTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    {t("news.event.getTickets")}
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        {isCommunique && post.documentUrl && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 mb-8 max-w-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <FileText className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {t("news.communique.document")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(
                    "news.communique.downloadHint",
                    "Téléchargez le document officiel au format PDF",
                  )}
                </div>
              </div>
              <Button asChild variant="outline">
                <a
                  href={post.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("common.download")}
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* 04 + 05 — Corps + Rail latéral */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
          <article className="min-w-0">
            <RichTextRenderer
              content={content}
              className="prose-lg max-w-none"
            />

            {/* Pied article : tags + share */}
            <div className="mt-12 pt-8 border-t flex flex-wrap items-center justify-between gap-4">
              {post.tags && post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="LinkedIn"
                  asChild
                >
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkedinGlyph className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="X / Twitter"
                  asChild
                >
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TwitterGlyph className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Copier le lien"
                  onClick={() =>
                    navigator.clipboard?.writeText(window.location.href)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Sources */}
            {post.sources && post.sources.length > 0 && (
              <div className="mt-8 p-5 rounded-xl bg-[var(--surface)] border">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                  Sources
                </h3>
                <ul className="space-y-2">
                  {post.sources.map((s) => (
                    <li key={s.url} className="flex items-start gap-2 text-sm">
                      <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--gabon-blue-hex)] hover:underline break-all"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Publisher card — derive de post.org (ou plateforme Consulat.ga) */}
            <div className="mt-8 p-5 rounded-xl border bg-[var(--surface)] flex items-start gap-4">
              <Link
                href={publisherHref}
                className="h-14 w-14 rounded-full bg-[var(--gabon-blue-tint)] text-[var(--gabon-blue-hex)] grid place-items-center text-base font-semibold shrink-0 overflow-hidden"
                aria-label={publisherName}
              >
                {publisherLogoUrl ? (
                  <Image
                    src={publisherLogoUrl}
                    alt={publisherName}
                    width={56}
                    height={56}
                    className="h-14 w-14 object-cover"
                  />
                ) : (
                  initials
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold">
                  <Link
                    href={publisherHref}
                    className="hover:text-[var(--gabon-blue-hex)]"
                  >
                    {publisherName}
                  </Link>
                </h4>
                {publisherRole && (
                  <div className="text-sm text-muted-foreground">
                    {publisherRole}
                  </div>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link
                  href={
                    post.org
                      ? `/news?org=${post.org.slug}`
                      : "/news"
                  }
                >
                  {post.org ? "Voir ses articles" : "Tous les articles"}
                </Link>
              </Button>
            </div>
          </article>

          {/* 05 Rail latéral */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1">
            {/* TOC */}
            {toc.length > 0 && (
              <div className="rounded-xl border bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Lecture</h4>
                  <span className="text-xs text-muted-foreground">
                    {progress}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted mb-4 overflow-hidden">
                  <div
                    className="h-full bg-[var(--gabon-blue-hex)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ul className="space-y-1.5">
                  {toc.map((item, idx) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={cn(
                          "flex items-start gap-2.5 text-sm px-2 py-1.5 rounded-md transition-colors",
                          activeId === item.id
                            ? "bg-[var(--gabon-blue-tint)] text-[var(--gabon-blue-hex)] font-medium"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <span className="font-mono text-xs tabular-nums mt-0.5 opacity-60">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="leading-snug">{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Share rail */}
            <div className="rounded-xl border bg-[var(--surface)] p-4">
              <h4 className="text-sm font-semibold mb-3">Partager</h4>
              <div className="space-y-1.5">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md hover:bg-muted"
                >
                  <LinkedinGlyph className="h-4 w-4 text-muted-foreground" />
                  LinkedIn
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md hover:bg-muted"
                >
                  <TwitterGlyph className="h-4 w-4 text-muted-foreground" />
                  X (Twitter)
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(title)}&body=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                  className="flex items-center gap-2.5 text-sm px-2 py-1.5 rounded-md hover:bg-muted"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Par e-mail
                </a>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(window.location.href)
                  }
                  className="flex w-full items-center gap-2.5 text-sm px-2 py-1.5 rounded-md hover:bg-muted text-left"
                >
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  Copier le lien
                </button>
              </div>
            </div>

            {/* Contact presse — masque pour l'instant (l'org doit exposer
                un email presse configurable avant de l'activer). */}
          </aside>
        </div>

        {/* 06 Suite à lire */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">
                Suite à <span className="text-[var(--gabon-blue-hex)]">lire</span>
                .
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/news">
                  Toutes les actualités
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((r) => {
                const rTitle = getLocalizedValue(r.titleI18n ?? r.title, lang)
                const rSub = getLocalizedValue(r.subCategoryI18n ?? r.subCategory, lang)
                const rCat = categoryPill(r.category)
                return (
                  <Link
                    key={r._id}
                    href={`/news/${r.slug}`}
                    className="group rounded-xl overflow-hidden border bg-[var(--surface)] hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[16/9] relative bg-muted">
                      {r.coverImageUrl && (
                        <Image
                          src={r.coverImageUrl}
                          alt={rTitle}
                          fill
                          sizes="(max-width: 768px) 100vw, 400px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full",
                            rCat.className,
                          )}
                        >
                          {rSub || rCat.label}
                        </span>
                        {r.publishedAt && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {format(new Date(r.publishedAt), "d MMM yyyy", {
                                locale: dateLocale,
                              })}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-semibold leading-snug group-hover:text-[var(--gabon-blue-hex)]">
                        {rTitle}
                      </h3>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* 07 Newsletter */}
        <NewsletterCallout />
      </main>
    </div>
  )
}

function NewsletterCallout() {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  return (
    <section className="mt-16 rounded-2xl border bg-[var(--surface-2)] p-8 md:p-10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
      <div>
        <h3 className="text-xl md:text-2xl font-bold mb-2">
          Recevez chaque vendredi la lettre du réseau consulaire.
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Actualités diplomatiques, communiqués officiels et événements à venir —
          directement dans votre boîte. Sans publicité, désinscription en un
          clic.
        </p>
      </div>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (email) setDone(true)
        }}
      >
        <input
          type="email"
          required
          placeholder="votre.adresse@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-2 rounded-md border bg-background min-w-[260px] text-sm"
        />
        <Button type="submit" size="sm" disabled={done}>
          {done ? "Merci !" : "S'abonner"}
        </Button>
      </form>
    </section>
  )
}
