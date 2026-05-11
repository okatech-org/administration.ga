"use client"

import Link from "next/link"
import { Shield } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ModeToggle } from "./mode-toggle"

export const Footer = () => {
  const { t } = useTranslation()

  return (
    <footer className="w-full border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold">{t("footer.brand.name")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("footer.brand.description")}
            </p>
          </div>

          <nav aria-label="Services consulaires">
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/services" className="hover:text-foreground transition-colors">
                  Catalogue des services
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="hover:text-foreground transition-colors">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/formulaires" className="hover:text-foreground transition-colors">
                  Formulaires à télécharger
                </Link>
              </li>
              <li>
                <Link href="/reps" className="hover:text-foreground transition-colors">
                  Représentations diplomatiques
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Ressources">
            <h4 className="font-semibold mb-4">Ressources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/news" className="hover:text-foreground transition-colors">
                  Actualités
                </Link>
              </li>
              <li>
                <Link href="/ressources" className="hover:text-foreground transition-colors">
                  Guides et tutoriels
                </Link>
              </li>
              <li>
                <Link href="/ressources/guides/arrivee" className="hover:text-foreground transition-colors">
                  Guide d'arrivée au Gabon
                </Link>
              </li>
              <li>
                <Link href="/ressources/guides/retour" className="hover:text-foreground transition-colors">
                  Guide de retour
                </Link>
              </li>
              <li>
                <Link href="/ressources/guides/vie-pratique" className="hover:text-foreground transition-colors">
                  Vie pratique
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors">
                  Foire aux questions
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Informations légales">
            <h4 className="font-semibold mb-4">À propos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/mentions-legales" className="hover:text-foreground transition-colors">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-foreground transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/accessibilite" className="hover:text-foreground transition-colors">
                  Accessibilité
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="max-w-6xl mx-auto mt-8 md:mt-12 pt-6 md:pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <ModeToggle />
        </div>
      </div>
    </footer>
  )
}
