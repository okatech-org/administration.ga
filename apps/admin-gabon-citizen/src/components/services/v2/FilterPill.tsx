import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function FilterPill({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon?: LucideIcon
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-150",
        active
          ? "border-[var(--pub-ink-900)] bg-[var(--pub-ink-900)] text-[var(--pub-bg)]"
          : "border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] hover:border-[var(--pub-border-strong)] hover:text-[var(--pub-text)]",
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "ml-0.5 font-mono text-[11px]",
            active ? "opacity-70" : "opacity-60",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
