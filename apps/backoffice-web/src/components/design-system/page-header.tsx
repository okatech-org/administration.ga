"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** Page title */
  title: ReactNode
  /** Optional subtitle displayed below the title */
  subtitle?: ReactNode
  /** Optional icon displayed before the title — wrapped in a colored box automatically */
  icon?: ReactNode
  /** Background class for the icon box (legacy ; ignoré par le V2 qui utilise un cadre neutre). */
  iconBgClass?: string
  /** Actions to display on the right side */
  actions?: ReactNode
  /** Show a back button that navigates to the previous page */
  showBackButton?: boolean
  /** Custom back button handler (defaults to router.history.back()) */
  onBack?: () => void
}

/**
 * PageHeader — drop-in compat de l'ancien composant Slate v3.
 *
 * Sous le capot, rend le design language V2 (warm-beige) : cadre 44×44
 * blanc/border, titre IBM Plex 22px, sous-titre muted. L'API d'origine
 * est préservée pour ne pas toucher les 40 pages qui l'importent.
 *
 * Le bouton "Retour" est conservé (variante `showBackButton`) ; les
 * autres icônes/actions sont rendues telles quelles dans le slot droit.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  iconBgClass,
  actions,
  showBackButton = false,
  onBack,
}: PageHeaderProps) {
  const router = useRouter()
  const handleBack = () => {
    if (onBack) onBack()
    else router.back()
  }

  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-4 md:flex-row",
      )}
    >
      <div className="flex items-start gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="mt-1 -ml-1"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {icon && (
          <div
            className={cn("rounded-xl shrink-0", iconBgClass)}
            style={{
              width: 44,
              height: 44,
              background: iconBgClass ? undefined : "var(--surface)",
              border: "1px solid var(--border-strong)",
              display: "grid",
              placeItems: "center",
              color: "var(--text)",
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--text)",
              fontFamily: "var(--font-v2, inherit)",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              style={{
                marginTop: 2,
                fontSize: 13,
                color: "var(--text-muted)",
                fontFamily: "var(--font-v2, inherit)",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
