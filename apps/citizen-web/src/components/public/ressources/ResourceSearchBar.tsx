"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface ResourceSearchBarProps {
  placeholder?: string
  defaultValue?: string
  /** Si fourni, contrôle la valeur (mode contrôlé pour search inline) */
  value?: string
  onChange?: (v: string) => void
  /** Si fourni, override le submit par défaut (navigation /ressources?q=) */
  onSubmit?: (q: string) => void
  className?: string
}

/**
 * Pill input + CTA bleu — pattern de la maquette
 */
export function ResourceSearchBar({
  placeholder = "Que recherchez-vous ? — passeport, mariage, scolarité, fiscalité…",
  defaultValue,
  value,
  onChange,
  onSubmit,
  className,
}: ResourceSearchBarProps) {
  const router = useRouter()
  const [internal, setInternal] = useState(defaultValue ?? "")
  const v = value ?? internal

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = v.trim()
    if (onSubmit) {
      onSubmit(q)
    } else if (q) {
      router.replace(`/ressources?q=${encodeURIComponent(q)}`, {
        scroll: false,
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-7 max-w-[720px] ${className ?? ""}`}
    >
      <div className="flex items-center gap-3 rounded-full border border-border bg-card pl-5 pr-1.5 py-1.5 transition-shadow focus-within:border-primary focus-within:shadow-[0_0_0_4px_oklch(0.55_0.22_260_/_0.12)]">
        <Search aria-hidden className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={v}
          onChange={(e) => {
            const next = e.target.value
            if (onChange) onChange(next)
            else setInternal(next)
          }}
          placeholder={placeholder}
          aria-label="Rechercher dans les ressources"
          className="flex-1 min-w-0 border-0 bg-transparent text-base text-foreground placeholder:text-foreground/40 outline-none"
        />
        <Button type="submit" className="rounded-full px-4 h-10">
          Rechercher
        </Button>
      </div>
    </form>
  )
}
