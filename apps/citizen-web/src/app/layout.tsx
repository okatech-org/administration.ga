import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Consulat.ga - Services Consulaires | République Gabonaise",
  description:
    "Plateforme officielle des services consulaires de la République Gabonaise. Demandes de passeport, visa, état civil, inscription consulaire et légalisation de documents en ligne.",
  openGraph: {
    title: "Consulat.ga - Services Consulaires Digitalisés",
    description:
      "Plateforme officielle des services consulaires de la République Gabonaise pour les citoyens à l'étranger.",
    type: "website",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
