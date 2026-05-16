import type { Metadata } from "next"

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://consulat.ga"

export const SITE_NAME = "Consulat.ga"

export const DEFAULT_DESCRIPTION =
  "Plateforme officielle des services consulaires de la République Gabonaise. Demandes de passeport, visa, état civil, inscription consulaire et légalisation de documents en ligne."

export const DEFAULT_OG_IMAGE = "/opengraph-image"

type LocalizedString = string | Record<string, string> | undefined | null

export function pickLocalized(value: LocalizedString, lang = "fr"): string {
  if (!value) return ""
  if (typeof value === "string") return value
  const normalized = (lang ?? "fr").split("-")[0].toLowerCase()
  if (normalized === "en" && value.en) return value.en
  return value.fr || Object.values(value)[0] || ""
}

type BuildMetadataInput = {
  title: string
  description: string
  path: string
  image?: string
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  noindex?: boolean
  languages?: Record<string, string>
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
  languages,
}: BuildMetadataInput): Metadata {
  const url = path.startsWith("/") ? path : `/${path}`
  const ogImage = image ?? DEFAULT_OG_IMAGE

  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type,
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fr_FR",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  }
}
