"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** Page title */
  title: ReactNode
  /** Optional subtitle displayed below the title */
  subtitle?: ReactNode
  /** Optional icon displayed before the title — wrapped in a colored box automatically */
  icon?: ReactNode
  /** Background class for the icon box. Defaults to "bg-foreground/8 dark:bg-foreground/5". */
  iconBgClass?: string
  /** Actions to display on the right side */
  actions?: ReactNode
  /** Show a back button that navigates to the previous page */
  showBackButton?: boolean
  /** Custom back button handler (defaults to router.history.back()) */
  onBack?: () => void
}

/**
 * Page header — Design System v3.0 "Slate Trust & Authority".
 * Animated entry, icon in colored box, title, subtitle, and action slots.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  iconBgClass = "bg-foreground/8 dark:bg-foreground/5",
  actions,
  showBackButton = false,
  onBack,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-start justify-between gap-4 md:flex-row"
    >
      <div className="flex items-start gap-2">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="mt-0.5 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
            {icon && (
              <div className={cn("rounded-lg p-1.5", iconBgClass)}>{icon}</div>
            )}
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </motion.div>
  )
}
