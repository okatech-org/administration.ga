import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRAVAIL.GA — Marché de l'emploi gabonais",
  description:
    "Trouvez un emploi ou un candidat au Gabon. Plateforme publique du marché de l'emploi gabonais — offres validées, partenaire officiel du PNPE (Pôle National de Promotion de l'Emploi).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B4D8C",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Fonts éditoriales — Inter (sans), Satoshi (display), JetBrains Mono (code) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;550;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900,901&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="travail-app antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
