import { api } from "@convex/_generated/api"
import { fetchQuery } from "convex/nextjs"
import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

export const revalidate = 3600

type Route = {
  path: string
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority?: number
  lastModified?: Date
}

const STATIC_ROUTES: Route[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/news", changeFrequency: "daily", priority: 0.8 },
  { path: "/reps", changeFrequency: "monthly", priority: 0.8 },
  { path: "/ressources", changeFrequency: "weekly", priority: 0.8 },
  { path: "/ressources/guides/arrivee", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ressources/guides/retour", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ressources/guides/vie-pratique", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/tarifs", changeFrequency: "monthly", priority: 0.7 },
  { path: "/formulaires", changeFrequency: "monthly", priority: 0.6 },
]

function toUrl(route: Route): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${route.path}`,
    lastModified: route.lastModified ?? new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }
}

type Entry = { slug: string; updatedAt: number }
type SitemapEntries = {
  services: Entry[]
  posts: Entry[]
  orgs: Entry[]
  tutorials: Entry[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let entries: SitemapEntries = {
    services: [],
    posts: [],
    orgs: [],
    tutorials: [],
  }

  try {
    entries = await fetchQuery(api.functions.seo.getSitemapEntries, {})
  } catch (error) {
    console.error("[sitemap] Failed to fetch Convex entries", error)
  }

  const dynamicRoutes: Route[] = [
    ...entries.services.map((s: Entry) => ({
      path: `/services/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      lastModified: new Date(s.updatedAt),
    })),
    ...entries.posts.map((p: Entry) => ({
      path: `/news/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: new Date(p.updatedAt),
    })),
    ...entries.orgs.map((o: Entry) => ({
      path: `/reps/${o.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      lastModified: new Date(o.updatedAt),
    })),
    ...entries.tutorials.map((t: Entry) => ({
      path: `/ressources/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      lastModified: new Date(t.updatedAt),
    })),
  ]

  return [...STATIC_ROUTES, ...dynamicRoutes].map(toUrl)
}
