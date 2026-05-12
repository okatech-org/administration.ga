"use client"

import {
  AlertCircle,
  ArrowRightLeft,
  Phone,
  PhoneOff,
  Video,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { PriorityBadge, type CallPriority } from "./PriorityBadge"

export interface CallCardData {
  _id: string
  _creationTime: number
  caller: {
    name: string
    nip: string | null
    avatarUrl: string | null
  }
  lineLabel: string | null
  lineColor: string | null
  priority: CallPriority
  mediaType: "audio" | "video"
  hasOpenRequests: boolean
  openRequestsCount: number
  incomingMs: number
  isFocused?: boolean
  wasRedirected?: boolean
  originalLineLabel?: string | null
}

/**
 * Carte d'appel entrant — affichée dans la file d'attente.
 * Design neumorphique : stripe gauche colorée selon la ligne, dot de priorité animé,
 * hover + focus states respectant les tokens.
 */
export function CallCard({
  call,
  onPickup,
  onDecline,
  onFocus,
  isPickingUp = false,
  isFocused = false,
}: {
  call: CallCardData
  onPickup: () => void
  onDecline: () => void
  onFocus?: () => void
  isPickingUp?: boolean
  isFocused?: boolean
}) {
  const { t } = useTranslation()

  // Timer live (chaque seconde, reset si la carte disparaît)
  const [seconds, setSeconds] = useState(Math.floor(call.incomingMs / 1000))
  useEffect(() => {
    const baseMs = Date.now() - call.incomingMs
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - baseMs) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [call.incomingMs])

  const initials =
    call.caller.name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  const stripeColor = call.lineColor ?? "transparent"

  // Format chrono : 0:24 / 1:12 (mm:ss) — plus lisible qu'un texte "X s"
  // qui s'enroule dans les vues étroites.
  const elapsed = (() => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, "0")}`
  })()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onFocus?.()
        }
      }}
      className={cn(
        "group relative w-full cursor-pointer overflow-hidden rounded-xl border bg-card text-left transition-all",
        "hover:bg-muted/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
        isFocused && "bg-muted/30 ring-2 ring-primary/40",
        call.priority === "urgent" && "border-destructive/50"
      )}
    >
      {/* Stripe couleur ligne — bandeau vertical sur toute la hauteur */}
      <span
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ backgroundColor: stripeColor }}
        aria-hidden
      />

      {/* ─── Section haute : avatar + identité ────────────────────
          Avatar à gauche, nom + ligne dédiée à droite occupant TOUTE
          la largeur restante. Le chrono et les actions descendent au
          footer pour ne plus voler de place au nom. */}
      <div className="flex items-start gap-3 px-3 pt-2.5">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={call.caller.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
              call.priority === "urgent"
                ? "animate-pulse bg-destructive"
                : "bg-primary"
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-[13.5px] leading-tight font-semibold"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {call.caller.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {call.lineLabel ?? t("callCenter.card.noLine", "Sans ligne")}
            {call.caller.nip && ` · ${call.caller.nip}`}
          </p>
        </div>
      </div>

      {/* ─── Badges optionnels (priorité / dossiers / redirection) ─── */}
      {(call.priority !== "normal" ||
        call.hasOpenRequests ||
        call.wasRedirected) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
          {call.priority !== "normal" && (
            <PriorityBadge priority={call.priority} />
          )}
          {call.hasOpenRequests && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-2.5 w-2.5" />
              {t("callCenter.card.openDossiers", {
                count: call.openRequestsCount,
              })}
            </span>
          )}
          {call.wasRedirected && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              title={
                call.originalLineLabel
                  ? t("callCenter.card.redirectedFrom", {
                      line: call.originalLineLabel,
                    })
                  : t("callCenter.card.redirected")
              }
            >
              <ArrowRightLeft className="h-2.5 w-2.5" />
              {t("callCenter.card.redirected")}
            </span>
          )}
        </div>
      )}

      {/* ─── Footer : chrono à gauche, actions à droite ───────────── */}
      <div className="mt-2 flex items-center justify-between px-3 pb-2.5">
        <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
          {elapsed}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDecline()
            }}
            title={t("callCenter.action.decline")}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={(e) => {
              e.stopPropagation()
              onPickup()
            }}
            disabled={isPickingUp}
            title={t("callCenter.action.pickup")}
          >
            {call.mediaType === "video" ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
