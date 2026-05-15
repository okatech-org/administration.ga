"use client"

import Image from "next/image"
import Link from "next/link"
import { Play } from "lucide-react"

interface VideoTutorialCardProps {
  href: string
  /** Cover image URL (optionnel — sinon pattern décoratif) */
  thumbnail?: string | null
  /** Variante de fond du placeholder si pas d'image */
  thumbTint?: "blue" | "green" | "yellow"
  /** "Épisode 01 · démarches" */
  episode?: string
  title: string
  /** "7:42" */
  duration?: string
  /** 0..100, ou undefined si pas de progression */
  progressPercent?: number
  /** Override label sous la barre */
  progressLabel?: string
}

const THUMB_PATTERNS = {
  blue: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, transparent), transparent), repeating-linear-gradient(45deg, var(--muted) 0 8px, color-mix(in oklch, var(--muted) 60%, transparent) 8px 16px)",
  green:
    "linear-gradient(135deg, color-mix(in oklch, var(--success) 10%, transparent), transparent), repeating-linear-gradient(45deg, var(--muted) 0 8px, color-mix(in oklch, var(--muted) 60%, transparent) 8px 16px)",
  yellow:
    "linear-gradient(135deg, color-mix(in oklch, var(--warning) 14%, transparent), transparent), repeating-linear-gradient(45deg, var(--muted) 0 8px, color-mix(in oklch, var(--muted) 60%, transparent) 8px 16px)",
} as const

function defaultLabel(percent?: number) {
  if (percent === undefined) return null
  if (percent === 0) return "Non commencé"
  if (percent >= 95) return "Terminé ✓ · revoir"
  return `${percent} % vu · reprendre`
}

export function VideoTutorialCard({
  href,
  thumbnail,
  thumbTint = "blue",
  episode,
  title,
  duration,
  progressPercent,
  progressLabel,
}: VideoTutorialCardProps) {
  const labelComputed = progressLabel ?? defaultLabel(progressPercent)
  const percent = Math.max(0, Math.min(100, progressPercent ?? 0))

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-px hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div
        className="relative aspect-video overflow-hidden border-b border-border"
        style={thumbnail ? undefined : { backgroundImage: THUMB_PATTERNS[thumbTint] }}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="absolute left-3 top-3 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            [ vidéo 16:9 ]
          </span>
        )}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 grid h-13 w-13 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition-all group-hover:scale-105 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
          style={{ width: "52px", height: "52px" }}
        >
          <Play className="h-5 w-5" fill="currentColor" stroke="none" />
        </span>
        {duration ? (
          <span className="absolute bottom-3 right-3 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-xs font-medium text-foreground">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 py-4">
        {episode ? (
          <div className="font-mono text-[11px] uppercase tracking-widest text-foreground/50">
            {episode}
          </div>
        ) : null}
        <h4 className="text-base font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h4>
        {labelComputed ? (
          <div className="mt-auto border-t border-dashed border-border pt-3.5">
            <div
              className="h-1 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {labelComputed}
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  )
}
