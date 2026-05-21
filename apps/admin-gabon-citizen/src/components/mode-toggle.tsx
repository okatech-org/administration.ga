"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/**
 * Toggle binaire light ⇄ dark dans le footer.
 * Clic = bascule directe vers le thème opposé (pas de modale).
 *
 * Utilise `resolvedTheme` pour gérer correctement le cas où le thème est
 * "system" — on bascule alors vers l'opposé du thème système courant et
 * on quitte le mode "system" implicitement.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)

  // Évite le mismatch SSR/CSR : on attend d'être monté côté client pour
  // connaître le thème résolu, sinon on rend un placeholder neutre.
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"
  const nextLabel = isDark ? t("theme.light", "Mode clair") : t("theme.dark", "Mode sombre")

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )
      ) : (
        // Placeholder neutre pendant l'hydratation pour éviter le flicker
        <Sun className="size-5 opacity-0" />
      )}
      <span className="sr-only">{nextLabel}</span>
    </Button>
  )
}
