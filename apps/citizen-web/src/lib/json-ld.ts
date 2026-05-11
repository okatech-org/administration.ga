import { SITE_NAME, SITE_URL } from "./seo"

const PUBLISHER = {
  "@type": "GovernmentOrganization",
  name: "Ministère des Affaires Étrangères de la République Gabonaise",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icons/apple-icon-180x180.png`,
  },
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "Consulat République Gabonaise",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/apple-icon-180x180.png`,
    description:
      "Plateforme officielle des services consulaires de la République Gabonaise.",
    sameAs: [],
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["fr-FR", "en-US"],
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/services?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

type BreadcrumbItem = { name: string; path: string }

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  }
}

type ArticleInput = {
  title: string
  description: string
  slug: string
  image?: string
  publishedAt?: string | number | Date
  updatedAt?: string | number | Date
  authorName?: string
}

export function articleSchema(input: ArticleInput) {
  const url = `${SITE_URL}/news/${input.slug}`
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.publishedAt
      ? { datePublished: new Date(input.publishedAt).toISOString() }
      : {}),
    ...(input.updatedAt
      ? { dateModified: new Date(input.updatedAt).toISOString() }
      : {}),
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : PUBLISHER,
    publisher: PUBLISHER,
  }
}

type ServiceInput = {
  name: string
  description: string
  slug: string
  price?: number
  currency?: string
  category?: string
}

export function serviceSchema(input: ServiceInput) {
  const url = `${SITE_URL}/services/${input.slug}`
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Gabon" },
    ...(input.category ? { category: input.category } : {}),
    ...(input.price !== undefined
      ? {
          offers: {
            "@type": "Offer",
            price: input.price,
            priceCurrency: input.currency ?? "XAF",
            url,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  }
}

type GovernmentOfficeInput = {
  name: string
  slug: string
  description?: string
  street?: string
  city?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  openingHours?: string[]
}

export function governmentOfficeSchema(input: GovernmentOfficeInput) {
  const url = `${SITE_URL}/reps/${input.slug}`
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentOffice",
    name: input.name,
    url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.street || input.city || input.country
      ? {
          address: {
            "@type": "PostalAddress",
            ...(input.street ? { streetAddress: input.street } : {}),
            ...(input.city ? { addressLocality: input.city } : {}),
            ...(input.postalCode ? { postalCode: input.postalCode } : {}),
            ...(input.country ? { addressCountry: input.country } : {}),
          },
        }
      : {}),
    ...(input.latitude !== undefined && input.longitude !== undefined
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }
      : {}),
    ...(input.openingHours?.length
      ? { openingHours: input.openingHours }
      : {}),
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  }
}

type FaqItem = { question: string; answer: string }

export function faqPageSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}
