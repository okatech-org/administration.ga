/**
 * Layout Espace Particulier — PNPE.GA.
 *
 * Pour les citoyens qui publient des annonces comme particuliers
 * (emploi domestique, garde d'enfants, jardinier…). Layout simplifie
 * sans sidebar : usage occasionnel, pas de modules metier.
 */
"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Home } from "lucide-react";

export default function ParticulierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground">
              G
            </div>
            <span className="font-display font-black text-lg tracking-tight">
              PNPE<span className="text-emerald-500">.GA</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/particulier"
              className="px-3 py-1.5 rounded-lg hover:bg-muted font-medium"
            >
              <Home className="size-4 inline mr-1" />
              Tableau de bord
            </Link>
            <Link
              href="/particulier/annonces"
              className="px-3 py-1.5 rounded-lg hover:bg-muted font-medium"
            >
              Mes annonces
            </Link>
            <a
              href="https://travail.ga/publier-annonce/particulier"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-primary-foreground font-medium"
            >
              <ExternalLink className="size-3.5" />
              Publier sur TRAVAIL.GA
            </a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {children}
      </main>
    </div>
  );
}
