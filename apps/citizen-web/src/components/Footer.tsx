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
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold">{t("footer.brand.name")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("footer.brand.description")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">
              {t("footer.officialLinks.title")}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/services" className="hover:text-foreground transition-colors">
                  {t("footer.officialLinks.ministry")}
                </Link>
              </li>
              <li>
                <Link href="/reps?view=grid" className="hover:text-foreground transition-colors">
                  {t("footer.officialLinks.embassy")}
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-foreground transition-colors">
                  {t("footer.officialLinks.consular")}
                </Link>
              </li>
            </ul>
          </div>
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
