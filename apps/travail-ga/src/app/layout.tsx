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
  themeColor: "#0072B9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
