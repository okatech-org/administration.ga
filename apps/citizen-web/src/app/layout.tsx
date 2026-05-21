import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import { JsonLd } from "@/components/seo/JsonLd"
import { organizationSchema, websiteSchema } from "@/lib/json-ld"
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Mes démarches administratives | République Gabonaise`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "République Gabonaise" }],
  creator: "République Gabonaise",
  publisher: "République Gabonaise",
  keywords: [
    "administration Gabon",
    "démarches administratives",
    "état civil Gabon",
    "carte nationale d'identité",
    "fiscalité Gabon",
    "urbanisme Gabon",
    "services publics gabonais",
    "citoyens gabonais",
    "entreprises Gabon",
    "République Gabonaise",
  ],
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fr_FR",
    title: `${SITE_NAME} — Démarches administratives digitalisées`,
    description:
      "Plateforme officielle des démarches administratives de la République Gabonaise pour les citoyens et entreprises.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Mes démarches`,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    apple: "/icons/apple-icon-180x180.png",
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
  manifest: "/icons/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3b82f6",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
