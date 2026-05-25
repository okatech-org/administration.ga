import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import { E2ESignInBridge } from "@/components/auth/E2ESignInBridge"
import "./globals.css"

export const metadata: Metadata = {
  title: "PNPE — Pôle National de Promotion de l'Emploi | République Gabonaise",
  description:
    "Portail officiel du Pôle National de Promotion de l'Emploi (PNPE) du Gabon, héritier de l'ONE. Sous tutelle du Ministère du Travail, du Plein Emploi, du Dialogue Social et de la Formation Professionnelle. Mise en correspondance des demandeurs d'emploi et des employeurs, accompagnement à l'auto-emploi, suivi des contrats d'apprentissage et de professionnalisation.",
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
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <E2ESignInBridge />
      </body>
    </html>
  )
}
