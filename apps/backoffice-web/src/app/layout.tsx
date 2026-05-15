import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Admin - Consulat.ga | Back-office d'administration",
  description:
    "Back-office d'administration de la plateforme consulaire de la République Gabonaise.",
  icons: {
    apple: "/icons/apple-icon-180x180.png",
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
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
  // Providers est monté à la racine (pattern identique à citizen-web) pour
  // garantir que QueryClientProvider + ConvexBetterAuthProvider couvrent
  // TOUTES les routes (y compris /sign-in, hors du groupe (backoffice)).
  // Cf. packages/api/src/hooks.ts:94 : useAuthenticatedConvexQuery appelle
  // useQuery de @tanstack/react-query — sans QueryClient ancestor, tout
  // composant utilisant cette hook (ex: SuperadminGuard) plante en SSR.
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Polices diplomatiques — 7 pour titres + 7 pour corps (voir
            HEADING_FONTS / BODY_FONTS dans @workspace/document-editor). */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Cinzel:wght@400;600;700&family=Cardo:ital,wght@0,400;0,700;1,400&family=Spectral+SC:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap"
        />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
