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
    alternateName: [
      "Consulat République Gabonaise",
      "Ministère des Affaires Étrangères du Gabon",
      "MAE Gabon",
    ],
    url: SITE_URL,
    logo: `${SITE_URL}/icons/apple-icon-180x180.png`,
    description:
      "Plateforme officielle des services consulaires de la République Gabonaise. Demandes en ligne de passeport, visa, état civil, inscription consulaire et légalisation pour la diaspora gabonaise.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Boulevard Triomphal Omar Bongo",
      addressLocality: "Libreville",
      addressCountry: "GA",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        areaServed: "Worldwide",
        availableLanguage: ["French", "English"],
      },
    ],
    areaServed: { "@type": "Country", name: "Gabon" },
    // Comptes officiels MAE Gabon — à valider/compléter avec le client
    sameAs: ["https://www.diplomatie.gouv.ga"],
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "fr-FR",
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
  basePath?: string // default "/news"
  image?: string
  publishedAt?: string | number | Date
  updatedAt?: string | number | Date
  authorName?: string
  articleSection?: string
  keywords?: string[] | string
  wordCount?: number
  inLanguage?: string
  speakable?: boolean
  techArticle?: boolean
}

export function articleSchema(input: ArticleInput) {
  const basePath = input.basePath ?? "/news"
  const url = `${SITE_URL}${basePath}/${input.slug}`
  const keywordsStr = Array.isArray(input.keywords)
    ? input.keywords.join(", ")
    : input.keywords
  return {
    "@context": "https://schema.org",
    "@type": input.techArticle ? ["Article", "TechArticle"] : "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: input.inLanguage ?? "fr-FR",
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.publishedAt
      ? { datePublished: new Date(input.publishedAt).toISOString() }
      : {}),
    ...(input.updatedAt
      ? { dateModified: new Date(input.updatedAt).toISOString() }
      : {}),
    ...(input.articleSection ? { articleSection: input.articleSection } : {}),
    ...(keywordsStr ? { keywords: keywordsStr } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : PUBLISHER,
    publisher: PUBLISHER,
    ...(input.speakable
      ? {
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".article-headline", ".article-summary"],
          },
        }
      : {}),
  }
}

type ServiceInput = {
  name: string
  description: string
  slug: string
  price?: number
  currency?: string
  category?: string
  serviceType?: string
}

export function serviceSchema(input: ServiceInput) {
  const url = `${SITE_URL}/services/${input.slug}`
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: input.name,
    description: input.description,
    url,
    provider: { "@id": `${SITE_URL}/#organization` },
    serviceOperator: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Gabon" },
    audience: {
      "@type": "Audience",
      audienceType: "Gabonese citizens and residents abroad",
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: url,
      availableLanguage: ["fr-FR", "en-US"],
    },
    inLanguage: "fr-FR",
    ...(input.category ? { category: input.category } : {}),
    ...(input.serviceType ? { serviceType: input.serviceType } : {}),
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
    inLanguage: "fr-FR",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".faq-question", ".faq-answer"],
    },
  }
}

type HowToStep = {
  name: string
  text: string
  url?: string
  image?: string
}

type HowToInput = {
  name: string
  description: string
  path: string
  steps: HowToStep[]
  totalTime?: string // ISO 8601 duration (ex "P15D", "PT2H")
  estimatedCost?: { currency: string; value: number }
  image?: string
  supply?: string[]
  tool?: string[]
}

export function howToSchema(input: HowToInput) {
  const url = `${SITE_URL}${input.path.startsWith("/") ? input.path : `/${input.path}`}`
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    url,
    inLanguage: "fr-FR",
    ...(input.image ? { image: input.image } : {}),
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    ...(input.estimatedCost
      ? {
          estimatedCost: {
            "@type": "MonetaryAmount",
            currency: input.estimatedCost.currency,
            value: input.estimatedCost.value,
          },
        }
      : {}),
    ...(input.supply?.length
      ? {
          supply: input.supply.map((s) => ({ "@type": "HowToSupply", name: s })),
        }
      : {}),
    ...(input.tool?.length
      ? {
          tool: input.tool.map((t) => ({ "@type": "HowToTool", name: t })),
        }
      : {}),
    step: input.steps.map((s, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
      ...(s.image ? { image: s.image } : {}),
    })),
    publisher: PUBLISHER,
  }
}

type CollectionItem = {
  name: string
  url: string
  description?: string
}

type CollectionPageInput = {
  name: string
  description: string
  path: string
  items: CollectionItem[]
  itemListType?: string
}

export function collectionPageSchema(input: CollectionPageInput) {
  const url = `${SITE_URL}${input.path.startsWith("/") ? input.path : `/${input.path}`}`
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    name: input.name,
    description: input.description,
    url,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      ...(input.itemListType ? { itemListOrder: input.itemListType } : {}),
      numberOfItems: input.items.length,
      itemListElement: input.items.slice(0, 30).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
        ...(item.description ? { description: item.description } : {}),
      })),
    },
  }
}
