"use client"

import { useEffect, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Barre de progression fine en haut de page pendant la navigation.
 * Simule un chargement progressif avec animation fluide.
 */
export function NavigationProgress({ className }: { className?: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Phase 1 : montée rapide à 30%
    const t1 = setTimeout(() => setProgress(30), 50)
    // Phase 2 : progression vers 60%
    const t2 = setTimeout(() => setProgress(60), 300)
    // Phase 3 : ralentissement vers 85%
    const t3 = setTimeout(() => setProgress(85), 800)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-transparent",
        className,
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
