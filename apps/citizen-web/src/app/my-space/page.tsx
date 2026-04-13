"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity */

import { api } from "@convex/_generated/api"
import Link from "next/link"
import { differenceInYears, format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ArrowRight,
  Baby,
  Briefcase,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  GraduationCap,
  Languages,
  MapPin,
  Megaphone,
  Pencil,
  Phone,
  Plus,
  Star,
  User,
  Users,
  Wrench,
  Info,
  X,
  AlertTriangle,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AssistanceContactsWidget } from "@/components/my-space/assistance-contacts-widget"
import { ConsularCardWidget } from "@/components/my-space/consular-card-widget"
import { FlatCard } from "@/components/my-space/flat-card"
import { RequestCard } from "@/components/my-space/request-card"
import { AppointmentCard } from "@/components/my-space/appointment-card"
import { MySpaceHeader } from "@/components/my-space/my-space-wrapper"
import { MobileCallFAB } from "@/components/my-space/mobile-call-fab"
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ProfileHeroSkeleton } from "@/components/skeletons"
import {
  useAuthenticatedConvexQuery,
  useConvexQuery,
} from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

function getAge(bd?: string | number | null): number | null {
  if (!bd) return null
  try {
    return differenceInYears(new Date(), new Date(bd))
  } catch {
    return null
  }
}
function formatPhone(phone?: string | null): string {
  if (!phone) return "—"
  const c = phone.replace(/\s+/g, "")
  if (c.startsWith("+33") && c.length === 12)
    return `+33 (0) ${c[3]} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8, 10)} ${c.slice(10, 12)}`
  if (c.startsWith("+241") && c.length >= 11)
    return `+241 ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8, 10)} ${c.slice(10, 12)}`
  return phone
}

// FlatCard is now imported from @/components/my-space/flat-card

// ═════════════════════════════════════════════════════════════
// Carousel for active requests — horizontal snap scroll, one card at a time
function ActiveRequestsCarousel({
  requests,
}: {
  requests: Array<{
    _id: any
    _creationTime: number
    status: string
    reference?: string
    service?: { name?: Record<string, string> } | null
    org?: { name?: string } | null
  }>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const scrollToIndex = useCallback(
    (idx: number) => {
      const el = scrollRef.current
      if (!el) return
      const child = el.children[idx] as HTMLElement
      if (child) {
        el.scrollTo({ left: child.offsetLeft, behavior: "smooth" })
      }
    },
    []
  )

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !el.children.length) return
    const scrollLeft = el.scrollLeft
    const childWidth = (el.children[0] as HTMLElement).offsetWidth
    const idx = Math.round(scrollLeft / childWidth)
    setCurrentIndex(Math.min(idx, requests.length - 1))
  }, [requests.length])

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="disable-scrollbars flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto"
      >
        {requests.map((req) => (
          <div key={req._id} className="w-full shrink-0 snap-start">
            <RequestCard request={req as any} />
          </div>
        ))}
      </div>
      {requests.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-citizen-s2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
          </button>
          <div className="flex items-center gap-1.5">
            {requests.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <button
            onClick={() =>
              scrollToIndex(Math.min(requests.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === requests.length - 1}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-citizen-s2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// Carousel for appointments — same pattern as requests carousel
function AppointmentsCarousel({
  appointments,
}: {
  appointments: Array<any>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const scrollToIndex = useCallback(
    (idx: number) => {
      const el = scrollRef.current
      if (!el) return
      const child = el.children[idx] as HTMLElement
      if (child) {
        el.scrollTo({ left: child.offsetLeft, behavior: "smooth" })
      }
    },
    []
  )

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !el.children.length) return
    const scrollLeft = el.scrollLeft
    const childWidth = (el.children[0] as HTMLElement).offsetWidth
    const idx = Math.round(scrollLeft / childWidth)
    setCurrentIndex(Math.min(idx, appointments.length - 1))
  }, [appointments.length])

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="disable-scrollbars flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto"
      >
        {appointments.map((apt: any) => (
          <div key={apt._id} className="w-full shrink-0 snap-start">
            <AppointmentCard appointment={apt} compact showActions={false} />
          </div>
        ))}
      </div>
      {appointments.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-citizen-s2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
          </button>
          <div className="flex items-center gap-1.5">
            {appointments.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <button
            onClick={() =>
              scrollToIndex(Math.min(appointments.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === appointments.length - 1}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-citizen-s2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
export default function UserDashboard() {
  const { t, i18n } = useTranslation()
  const [showConsularCard, setShowConsularCard] = useState(false)
  const [showDossierDetails, setShowDossierDetails] = useState(false)

  const { data: profile, isPending } = useAuthenticatedConvexQuery(
    api.functions.profiles.getMine,
    {}
  )
  const { data: activeRequests } = useAuthenticatedConvexQuery(
    api.functions.requests.listMyActive,
    {}
  )
  const { data: appointments } = useAuthenticatedConvexQuery(
    api.functions.appointments.listByUser,
    {}
  )
  const { data: posts } = useConvexQuery(api.functions.posts.getLatest, {
    limit: 3,
  })

  const { data: cvData } = useAuthenticatedConvexQuery(
    api.functions.cv.getMine,
    {}
  )
  const { data: childProfiles } = useAuthenticatedConvexQuery(
    api.functions.childProfiles.getMine,
    {}
  )

  // Photo d'identite : resolution fiable (lien direct OU recherche par type, plus recent en priorite)
  const { data: identityPhotoUrl } = useAuthenticatedConvexQuery(
    api.functions.documents.getMyIdentityPhotoUrl,
    {}
  )

  const today = new Date().toISOString().split("T")[0]
  const upcomingAppointments = useMemo(() => {
    if (!appointments) return []
    return (appointments as any[]).filter(
      (a) => a.date && a.date >= today && a.status !== "cancelled" && a.status !== "completed" && a.status !== "no_show"
    )
  }, [appointments, today])

  const children = (childProfiles ?? []) as any[]
  const p = profile as any
  const identity = p?.identity
  const contacts = p?.contacts
  const addresses = p?.addresses
  const firstName = identity?.firstName ?? ""
  const lastName = identity?.lastName ?? ""
  const avatarUrl = identityPhotoUrl ?? p?.avatarUrl

  const cvScore = (() => {
    if (!cvData) return 0
    let f = [
      cvData.firstName,
      cvData.lastName,
      cvData.title,
      cvData.summary,
      cvData.email,
      cvData.phone,
    ].filter(Boolean).length
    f += [
      cvData.experiences,
      cvData.education,
      cvData.skills,
      cvData.languages,
    ].filter((a: any) => a?.length > 0).length
    return Math.round((f / 10) * 100)
  })()

  const dossierItems = [
    {
      label: "Identité",
      done: !!(
        identity?.firstName &&
        identity?.lastName &&
        identity?.birthDate &&
        identity?.birthPlace
      ),
      icon: <User className="h-3 w-3" />,
      alertText: "Identité à compléter",
    },
    {
      label: "Passeport",
      done: !!p?.passportInfo?.number,
      icon: <FileText className="h-3 w-3" />,
      alert: (() => {
        if (!p?.passportInfo?.expiryDate) return null
        const daysLeft = Math.ceil(
          (new Date(p.passportInfo.expiryDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
        if (daysLeft < 0) return { type: "expired" as const, text: "Expiré" }
        if (daysLeft < 90)
          return { type: "warning" as const, text: `Expire dans ${daysLeft}j` }
        return null
      })(),
      alertText: "Passeport manquant",
    },
    {
      label: "Contact & Adresse",
      done: !!(contacts?.phone && addresses?.residence?.city),
      icon: <MapPin className="h-3 w-3" />,
      alertText: "Contact ou adresse à compléter",
    },
    {
      label: "Famille",
      done: !!p?.family?.maritalStatus,
      icon: <Users className="h-3 w-3" />,
      alertText: "Situation familiale à compléter",
    },
    {
      label: "Profession",
      done: !!p?.profession?.title,
      icon: <Briefcase className="h-3 w-3" />,
      alertText: "Profession à compléter",
    },
    {
      label: "Contact d'urgence",
      done: !!(contacts?.emergencyResidence || contacts?.emergencyHomeland),
      icon: <Phone className="h-3 w-3" />,
      alertText: "Contact d'urgence à ajouter",
    },
  ]

  const completionScore = (() => {
    if (!profile) return 0
    const done = dossierItems.filter((i) => i.done).length
    return Math.round((done / dossierItems.length) * 100)
  })()

  const activeAlerts = [
    ...dossierItems
      .filter((item) => !item.done)
      .map((item) => ({
        type: "warning" as const,
        text: item.alertText,
        icon: item.icon,
      })),
    ...dossierItems
      .filter((item) => item.alert && item.alert.type === "expired")
      .map((item) => ({
        type: "error" as const,
        text: "Passeport expiré !",
        icon: item.icon,
      })),
    ...dossierItems
      .filter(
        (item) => item.alert && item.alert.type === "warning" && item.done
      )
      .map((item) => ({
        type: "warning" as const,
        text: item.alert!.text,
        icon: item.icon,
      })),
  ]

  const isProfileLoading = isPending || profile === undefined

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <MySpaceHeader />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mt-3 min-h-0 flex-1 overflow-hidden md:mt-4"
      >
        {/* Desktop/Tablet : grille responsive — 2 colonnes (md) → 3 colonnes (lg) */}
        <div className="hidden h-full gap-5 overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-12">
          {/* ─── COL 1: Hero & Carte — md:col-auto, lg:3/12 ─── */}
          <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-3">
            {/* ── Mobile : Hero compact avec photo à gauche + boutons Ma Carte/iCV ── */}
            {isProfileLoading ? (
              <div className="md:hidden">
                <ProfileHeroSkeleton />
              </div>
            ) : (
              <FlatCard className="relative shrink-0 md:hidden">
                <div className="flex flex-col gap-3 p-3 min-[400px]:p-4">
                  {/* Row : Photo + Infos */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 shrink-0 bg-muted">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-primary text-2xl font-bold text-white">
                        {firstName?.[0]}
                        {lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      {/* Matricule + Badge userType */}
                      <div className="mb-1 flex shrink-0 flex-col gap-1.5">
                        <div className="flex items-center">
                          {p?.matricule && (
                            <span className="font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase min-[400px]:text-sm">
                              {p.matricule}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {p?.userType && (
                            <span className="rounded-lg bg-amber-500/35 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 min-[400px]:text-[10px] dark:bg-amber-500/15 dark:text-amber-400">
                              {p.userType === "long_stay"
                                ? "Long séjour"
                                : p.userType === "short_stay"
                                  ? "Court séjour"
                                  : "De passage"}
                            </span>
                          )}
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            {completionScore}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <h2 className="truncate text-base leading-none font-black text-foreground uppercase">
                          {lastName}
                        </h2>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground capitalize">
                        {firstName}
                      </p>
                      {contacts?.phone && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate font-medium">
                            {formatPhone(contacts.phone)}
                          </span>
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="ml-auto h-5 w-5 shrink-0 rounded-full hover:bg-citizen-s2"
                          >
                            <Link href="/my-space/profile/edit">
                              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Row : Boutons Ma Carte + Mon iCV */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                      onClick={() => setShowConsularCard(true)}
                    >
                      <Eye className="h-3 w-3" />
                      Ma Carte
                      {p?.consularCard?.cardNumber &&
                        p.consularCard.cardExpiresAt > Date.now() && (
                          <Badge
                            variant="secondary"
                            className="h-4 bg-green-500/25 px-1 py-0 text-[10px] font-medium text-green-700 dark:text-green-400"
                          >
                            Active
                          </Badge>
                        )}
                      {p?.consularCard?.cardNumber &&
                        p.consularCard.cardExpiresAt <= Date.now() && (
                          <Badge
                            variant="secondary"
                            className="h-4 bg-rose-500/10 px-1 py-0 text-[10px] font-medium text-rose-600 dark:text-rose-400"
                          >
                            Expirée
                          </Badge>
                        )}
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                    >
                      <Link href="/my-space/cv">
                        <Briefcase className="h-3 w-3" />
                        {cvData ? "Mon iCV" : "Créer iCV"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </FlatCard>
            )}

            {/* ── Desktop : Hero vertical centré ── */}
            {isProfileLoading ? (
              <div className="hidden md:block">
                <ProfileHeroSkeleton />
              </div>
            ) : (
              <FlatCard className="relative hidden shrink-0 md:block">
                <div className="relative flex flex-col p-4">
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-bold text-muted-foreground">
                      {completionScore}%
                    </span>
                  </div>
                  <div className="mb-4 flex justify-center">
                    <Avatar className="h-[120px] w-[120px] bg-muted">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-primary text-3xl font-bold text-white">
                        {firstName?.[0]}
                        {lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="mb-1.5 flex flex-col items-center text-center">
                    <h2 className="text-lg leading-none font-black text-foreground uppercase">
                      {lastName}
                    </h2>
                    <p className="mt-1 text-base font-medium text-muted-foreground capitalize">
                      {firstName}
                    </p>
                  </div>
                  {contacts?.phone && (
                    <div className="mt-4 w-full rounded-lg bg-citizen-s4 p-2.5">
                      <div className="flex items-center gap-2.5 text-sm font-medium">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm font-bold">
                          {formatPhone(contacts.phone)}
                        </span>
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 rounded-full hover:bg-citizen-s2"
                        >
                          <Link href="/my-space/profile/edit">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </FlatCard>
            )}

            {/* ── Desktop : Carte Consulaire seule (iCV dans col3) ── */}
            <FlatCard className="hidden shrink-0 md:block">
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                    <div className="rounded-md bg-citizen-s2 p-1">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {t("mySpace.consularCard.title")}
                  </span>
                  {p?.consularCard?.cardNumber &&
                    p.consularCard.cardExpiresAt > Date.now() && (
                      <Badge
                        variant="secondary"
                        className="h-5 bg-green-500/25 px-1.5 py-0 text-xs font-medium text-green-700 dark:text-green-400"
                      >
                        Active
                      </Badge>
                    )}
                  {p?.consularCard?.cardNumber &&
                    p.consularCard.cardExpiresAt <= Date.now() && (
                      <Badge
                        variant="secondary"
                        className="h-5 bg-rose-500/10 px-1.5 py-0 text-xs font-medium text-rose-600 dark:text-rose-400"
                      >
                        Expirée
                      </Badge>
                    )}
                </div>
                {p?.consularCard?.cardNumber ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 h-7 w-full gap-2 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                    onClick={() => setShowConsularCard(true)}
                  >
                    <Eye className="h-3 w-3" />
                    Voir ma carte
                  </Button>
                ) : (
                  <div className="py-1 text-center">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">
                      Pas encore de carte
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full gap-1.5 rounded-lg text-xs font-semibold"
                      onClick={() => setShowConsularCard(true)}
                    >
                      <Eye className="h-3 w-3" />
                      Voir le statut
                    </Button>
                  </div>
                )}
              </div>
            </FlatCard>

            {/* À vérifier — déplacé dans col1 quand dossier 100% et pas d'enfant */}
            {completionScore === 100 &&
              children.length === 0 &&
              activeAlerts.length > 0 && (
                <FlatCard className="hidden shrink-0 md:block">
                  <div className="flex flex-col p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                        <div className="rounded-md bg-rose-500/10 p-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        À vérifier
                      </span>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                        {activeAlerts.length}
                      </span>
                    </div>

                    {/* Détails enrichis */}
                    <div className="flex flex-col gap-2.5">
                      {/* Détail passeport si expiré ou bientôt */}
                      {p?.passportInfo?.expiryDate &&
                        (() => {
                          const expiryDate = new Date(p.passportInfo.expiryDate)
                          const daysDiff = Math.ceil(
                            (expiryDate.getTime() - Date.now()) / 86400000
                          )
                          if (daysDiff >= 90) return null
                          const isExpired = daysDiff < 0
                          const absDays = Math.abs(daysDiff)
                          const durationText =
                            absDays > 365
                              ? `${Math.floor(absDays / 365)} an${Math.floor(absDays / 365) > 1 ? "s" : ""} et ${Math.floor((absDays % 365) / 30)} mois`
                              : absDays > 30
                                ? `${Math.floor(absDays / 30)} mois et ${absDays % 30} jour${absDays % 30 > 1 ? "s" : ""}`
                                : `${absDays} jour${absDays > 1 ? "s" : ""}`

                          return (
                            <Link
                              href="/my-space/services-demarches"
                              className="flex flex-col rounded-xl border border-rose-500/10 bg-rose-500/6 p-3.5 transition-colors hover:bg-rose-500/10"
                            >
                              <div className="mb-3 flex items-center gap-2">
                                <div className="rounded-lg bg-rose-500/10 p-1.5">
                                  <FileText className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                                </div>
                                <span className="text-sm font-bold text-foreground">
                                  Passeport
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {isExpired ? "Expiré depuis" : "Expire dans"}
                                </span>
                                <span
                                  className={cn(
                                    "font-bold",
                                    isExpired
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  )}
                                >
                                  {durationText}
                                </span>
                              </div>
                            </Link>
                          )
                        })()}
                    </div>
                  </div>
                </FlatCard>
              )}

            {/* Mon iCV — déplacé dans col1 quand dossier 100% */}
            {completionScore === 100 && (
              <FlatCard className="hidden shrink-0 md:block">
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <div className="rounded-md bg-citizen-s2 p-1">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                      </div>
                      Mon iCV
                    </span>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-citizen-s2"
                    >
                      <Link href="/my-space/cv">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>
                  {cvData ? (
                    <>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            ref={(el) => {
                              if (el) el.style.width = `${cvScore}%`
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-primary dark:text-primary">
                          {cvScore}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            icon: Star,
                            l: "Exp.",
                            c: (cvData as any).experiences?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                          {
                            icon: GraduationCap,
                            l: "Form.",
                            c: (cvData as any).education?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                          {
                            icon: Wrench,
                            l: "Comp.",
                            c: (cvData as any).skills?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                          {
                            icon: Languages,
                            l: "Langues",
                            c: (cvData as any).languages?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                        ].map((i) => (
                          <div
                            key={i.l}
                            className="flex items-center gap-2 rounded-lg bg-citizen-s4 p-2 text-xs"
                          >
                            <i.icon className={cn("h-3 w-3", i.color)} />
                            <span className="flex-1 text-muted-foreground">
                              {i.l}
                            </span>
                            <span className="font-bold">{i.c}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 w-full rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                    >
                      <Link href="/my-space/cv">Créer mon CV</Link>
                    </Button>
                  )}
                </div>
              </FlatCard>
            )}

            {/* Mon Dossier — Masqué quand complet à 100% */}
            {completionScore < 100 && (
              <FlatCard className="flex flex-1 shrink-0 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-foreground/5 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-citizen-s2 p-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">
                      Mon Dossier
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          completionScore >= 80
                            ? "bg-green-500/80"
                            : completionScore >= 50
                              ? "bg-amber-500/70"
                              : "bg-rose-500/70"
                        )}
                        ref={(el) => {
                          if (el) el.style.width = `${completionScore}%`
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {completionScore}% complété
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-citizen-s4 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded bg-background p-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-muted-foreground">
                          État du dossier
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {completionScore === 100 ? "Complet" : "Incomplet"}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97] md:h-7"
                      onClick={() => setShowDossierDetails(true)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> Voir l&apos;état
                    </Button>
                  </div>
                </div>
              </FlatCard>
            )}

            {/* Enfants — affiché uniquement si des enfants existent */}
            {children.length > 0 && (
              <FlatCard className="flex shrink-0 flex-col">
                <div className="flex flex-col p-3 md:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                      <div className="rounded-md bg-citizen-s2 p-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      Enfants
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-xs"
                          >
                            Compte strictement dédié aux enfants mineurs de
                            moins de 18 ans ou majeurs sous tutelle, ne pouvant
                            pas utiliser un appareil de navigation.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="rounded-full bg-citizen-s2 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                      {children.length}
                    </span>
                  </div>
                  <div className="citizen-scrollbar flex snap-x gap-3 overflow-x-auto pb-2.5">
                    {children.map((child: any) => {
                      const ca = getAge(child.identity?.birthDate)
                      return (
                        <Link
                          key={child._id}
                          href={`/my-space/children/${child._id}`}
                          className="flex min-w-[85%] flex-1 shrink-0 snap-start items-center gap-3 rounded-lg bg-citizen-s4 p-2.5 pr-4 transition-colors hover:bg-citizen-s4/80 md:min-w-[220px]"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-citizen-s2">
                            <Baby className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm leading-tight font-bold text-muted-foreground">
                              {child.identity?.firstName}{" "}
                              {child.identity?.lastName}
                            </p>
                            <p className="mt-0.5 text-xs leading-tight font-medium text-muted-foreground">
                              {ca !== null ? `${ca} ans` : "—"}
                            </p>
                          </div>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </FlatCard>
            )}
          </div>

          {/* ─── COL 2: Données Profil — md:col-auto, lg:5/12 ─── */}
          <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-5">
            {/* Démarches en cours — carousel horizontal */}
            <FlatCard
              className={cn(
                "flex shrink-0 flex-col md:flex-1",
                !(activeRequests && activeRequests.length > 0) &&
                  !(upcomingAppointments.length > 0) &&
                  "order-2 md:order-0"
              )}
            >
              <div className="flex flex-1 flex-col p-3 md:p-4">
                <div className="mb-2 flex shrink-0 items-center justify-between md:mb-3">
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                    <div className="rounded-md bg-citizen-s2 p-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    Démarches en cours
                    {activeRequests && activeRequests.length > 0 && (
                      <span className="rounded-full bg-citizen-s2 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                        {activeRequests.length}
                      </span>
                    )}
                  </span>
                  {activeRequests && activeRequests.length > 0 && (
                    <Link
                      href="/my-space/services-demarches?tab=demarches"
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t("mySpace.requests.viewAll", "Tout voir")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {activeRequests && activeRequests.length > 0 ? (
                  <ActiveRequestsCarousel requests={activeRequests} />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-citizen-s4 py-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-citizen-s2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("mySpace.requests.empty", "Aucune démarche en cours")}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="h-8 rounded-lg bg-primary px-4 text-xs font-medium text-white hover:bg-primary/90"
                    >
                      <Link href="/my-space/services-demarches">{t("mySpace.requests.newRequest", "Nouvelle démarche")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </FlatCard>

            {/* Rendez-vous */}
            <FlatCard
              className={cn(
                "flex shrink-0 flex-col md:flex-1",
                !(activeRequests && activeRequests.length > 0) &&
                  !(upcomingAppointments.length > 0) &&
                  "order-3 md:order-0"
              )}
            >
              <div className="flex flex-1 flex-col p-3 md:p-4">
                <div className="mb-2 flex shrink-0 items-center justify-between md:mb-3">
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                    <div className="rounded-md bg-citizen-s2 p-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    RDV
                    {upcomingAppointments.length > 0 && (
                      <span className="rounded-full bg-citizen-s2 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                        {upcomingAppointments.length}
                      </span>
                    )}
                  </span>
                  <Link
                    href="/my-space/iagenda?tab=prendre-rdv"
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("mySpace.appointments.viewAll", "iAgenda")}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {upcomingAppointments.length > 0 ? (
                  <AppointmentsCarousel appointments={upcomingAppointments} />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-citizen-s4 py-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                      <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("mySpace.appointments.empty", "Aucun rendez-vous")}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="h-8 rounded-lg bg-primary px-4 text-xs font-medium text-white hover:bg-primary/90"
                    >
                      <Link href="/my-space/iagenda?tab=prendre-rdv">{t("mySpace.appointments.book", "Prendre RDV")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </FlatCard>

            {/* Contact d'urgence et Représentations — monte en premier s'il n'y a pas d'activité */}
            <div
              className={cn(
                "shrink-0 md:flex-1",
                !(activeRequests && activeRequests.length > 0) &&
                  !(upcomingAppointments.length > 0) &&
                  "order-1 md:order-0"
              )}
            >
              <AssistanceContactsWidget />
            </div>
          </div>

          {/* ─── COL 3: Activity Widgets — hidden on tablet, lg:4/12 ─── */}
          <div className="citizen-scrollbar stagger-children hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex lg:col-span-4">
            {/* Notifications (Horizontal scroll) — masqué quand déplacé vers col1 */}
            {activeAlerts.length > 0 &&
              !(completionScore === 100 && children.length === 0) && (
                <FlatCard className="shrink-0 overflow-hidden">
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                        <div className="rounded-md bg-rose-500/10 p-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        À vérifier
                      </span>
                    </div>
                    <div className="citizen-scrollbar disable-scrollbars flex snap-x gap-2.5 overflow-x-auto pb-1.5">
                      {activeAlerts.map((alert, idx) => (
                        <Link
                          key={idx}
                          href="/my-space/settings?tab=dossier"
                          className={cn(
                            "flex shrink-0 snap-start items-center gap-3 rounded-lg p-2.5 transition-opacity hover:opacity-80",
                            alert.type === "error"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                              alert.type === "error"
                                ? "bg-rose-500/20"
                                : "bg-amber-500/20"
                            )}
                          >
                            {alert.icon}
                          </div>
                          <span className="pr-2 text-xs font-bold whitespace-nowrap">
                            {alert.text}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </FlatCard>
              )}

            {/* Mon iCV — desktop uniquement (mobile dans col1), masqué quand déplacé vers col1 */}
            {completionScore < 100 && (
              <FlatCard className="hidden shrink-0 lg:block">
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <div className="rounded-md bg-citizen-s2 p-1">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                      </div>
                      Mon iCV
                    </span>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-citizen-s2"
                    >
                      <Link href="/my-space/cv">
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>
                  {cvData ? (
                    <>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            ref={(el) => {
                              if (el) el.style.width = `${cvScore}%`
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-primary dark:text-primary">
                          {cvScore}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            icon: Star,
                            l: "Exp.",
                            c: (cvData as any).experiences?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                          {
                            icon: GraduationCap,
                            l: "Form.",
                            c: (cvData as any).education?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                          {
                            icon: Wrench,
                            l: "Comp.",
                            c: (cvData as any).skills?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                          {
                            icon: Languages,
                            l: "Langues",
                            c: (cvData as any).languages?.length ?? 0,
                            color: "text-muted-foreground",
                          },
                        ].map((i) => (
                          <div
                            key={i.l}
                            className="flex items-center gap-2 rounded-lg bg-citizen-s4 p-2 text-xs"
                          >
                            <i.icon className={cn("h-3 w-3", i.color)} />
                            <span className="flex-1 text-muted-foreground">
                              {i.l}
                            </span>
                            <span className="font-bold">{i.c}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 w-full rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                    >
                      <Link href="/my-space/cv">Créer mon CV</Link>
                    </Button>
                  )}
                </div>
              </FlatCard>
            )}

            {/* Actualités — desktop uniquement, mobile sur page 2 */}
            <FlatCard className="hidden flex-1 flex-col overflow-hidden lg:flex">
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <div className="rounded-md bg-citizen-s2 p-1">
                      <Megaphone className="h-3 w-3 text-muted-foreground" />
                    </div>
                    Actualités
                  </span>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97] md:h-7"
                  >
                    <Link href="/news">Tout voir</Link>
                  </Button>
                </div>
                {posts && posts.length > 0 ? (
                  <div className="citizen-scrollbar flex-1 space-y-2.5 overflow-y-auto pr-1">
                    {posts.slice(0, 2).map((post: any) => (
                      <Link
                        key={post._id}
                        href={`/news/${post.slug}`}
                        className="group block rounded-lg bg-citizen-s4 p-3 transition-colors hover:bg-citizen-s4/80"
                      >
                        <p className="mb-1 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary dark:group-hover:text-blue-400">
                          {post.title}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          {format(
                            new Date(post.publishedAt ?? post._creationTime),
                            "dd MMM yyyy",
                            { locale: fr }
                          )}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    Aucune annonce
                  </p>
                )}
              </div>
            </FlatCard>
          </div>
        </div>

        {/* ═══ Mobile : flux vertical unique ═══ */}
        <div
          className="citizen-scrollbar flex h-full flex-col gap-2.5 overflow-y-auto pb-4 md:hidden"
        >
              {/* Mobile alert banner — scrolls with content */}
              {activeAlerts.length > 0 && (
                <Link
                  href="/my-space/settings?tab=dossier"
                  className="flex shrink-0 items-center gap-2.5 overflow-hidden rounded-xl bg-rose-500/10 px-3 py-2.5 transition-colors hover:bg-rose-500/15"
                >
                  <div className="shrink-0 rounded-md bg-rose-500/15 p-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="flex-1 truncate text-xs font-bold text-rose-600 dark:text-rose-400">
                    {activeAlerts.length === 1
                      ? activeAlerts[0].text
                      : `${activeAlerts.length} éléments à vérifier`}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-rose-500/60" />
                </Link>
              )}

              {/* Hero mobile — modèle vertical */}
              <FlatCard className="relative shrink-0">
                <div className="flex h-full flex-col p-3 min-[400px]:p-4">
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <div className="flex items-center">
                      {p?.matricule && (
                        <span className="font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase min-[400px]:text-sm">
                          {p.matricule}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p?.userType && (
                        <span className="rounded-lg bg-amber-500/35 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 min-[400px]:text-[10px] dark:bg-amber-500/15 dark:text-amber-400">
                          {p.userType === "long_stay"
                            ? "Long séjour"
                            : p.userType === "short_stay"
                              ? "Court séjour"
                              : "De passage"}
                        </span>
                      )}
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        {completionScore}%
                      </span>
                    </div>
                  </div>

                  {/* Zone centrale flex : Photo + Nom + Tel */}
                  <div className="my-2 flex min-h-0 flex-1 items-center gap-4">
                    <Avatar className="h-16 w-16 shrink-0 bg-muted min-[400px]:h-20 min-[400px]:w-20">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-primary text-2xl font-bold text-white min-[400px]:text-3xl">
                        {firstName?.[0]}
                        {lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h2 className="truncate text-lg leading-tight font-black text-foreground uppercase">
                        {lastName}
                      </h2>
                      <p className="truncate text-sm font-medium text-muted-foreground capitalize">
                        {firstName}
                      </p>
                      {contacts?.phone && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 truncate font-semibold text-foreground">
                            {formatPhone(contacts.phone)}
                          </span>
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 shrink-0 rounded-full hover:bg-citizen-s2"
                          >
                            <Link href="/my-space/profile/edit">
                              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="grid shrink-0 grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1.5 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                      onClick={() => setShowConsularCard(true)}
                    >
                      <Eye className="h-3 w-3" />
                      Ma Carte
                      {p?.consularCard?.cardNumber &&
                        p.consularCard.cardExpiresAt > Date.now() && (
                          <Badge
                            variant="secondary"
                            className="h-4 bg-green-500/25 px-1 py-0 text-[10px] font-medium text-green-700 dark:text-green-400"
                          >
                            Active
                          </Badge>
                        )}
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-9 gap-1.5 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground transition-transform hover:bg-citizen-s3/80 active:scale-[0.97]"
                    >
                      <Link href="/my-space/cv">
                        <Briefcase className="h-3 w-3" />
                        {cvData ? "Mon iCV" : "Créer iCV"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </FlatCard>

              {/* Démarches mobile — carousel */}
              <FlatCard className="shrink-0">
                <div className="flex flex-col p-3">
                  <div className="mb-2 flex shrink-0 items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                      <div className="rounded-md bg-citizen-s2 p-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      Démarches en cours
                      {activeRequests && activeRequests.length > 0 && (
                        <span className="rounded-full bg-citizen-s2 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                          {activeRequests.length}
                        </span>
                      )}
                    </span>
                    {activeRequests && activeRequests.length > 0 && (
                      <Link
                        href="/my-space/services-demarches?tab=demarches"
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {t("mySpace.requests.viewAll", "Tout voir")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  {activeRequests && activeRequests.length > 0 ? (
                    <ActiveRequestsCarousel requests={activeRequests} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-citizen-s4 py-6">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-citizen-s2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("mySpace.requests.empty", "Aucune démarche en cours")}
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="h-7 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        <Link href="/services">{t("mySpace.requests.newRequest", "Nouvelle démarche")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </FlatCard>

              {/* RDV mobile */}
              <FlatCard className="shrink-0">
                <div className="flex flex-col p-3">
                  <div className="mb-2 flex shrink-0 items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                      <div className="rounded-md bg-citizen-s2 p-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      RDV
                      {upcomingAppointments.length > 0 && (
                        <span className="rounded-full bg-citizen-s2 px-2 py-0.5 text-xs font-bold text-muted-foreground">
                          {upcomingAppointments.length}
                        </span>
                      )}
                    </span>
                    <Link
                      href="/my-space/iagenda?tab=prendre-rdv"
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t("mySpace.appointments.viewAll", "iAgenda")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  {upcomingAppointments.length > 0 ? (
                    <AppointmentsCarousel appointments={upcomingAppointments} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-citizen-s4 py-6">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("mySpace.appointments.empty", "Aucun rendez-vous")}
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="h-7 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        <Link href="/my-space/iagenda?tab=prendre-rdv">{t("mySpace.appointments.book", "Prendre RDV")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </FlatCard>

              {/* Actualités mobile — dans le flux vertical */}
              <FlatCard className="shrink-0">
                <div className="flex flex-col p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <div className="rounded-md bg-citizen-s2 p-1">
                        <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      Actualités
                    </span>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg bg-citizen-s3 px-3 text-xs font-medium text-foreground hover:bg-citizen-s3/80"
                    >
                      <Link href="/news">Tout voir</Link>
                    </Button>
                  </div>
                  {posts && posts.length > 0 ? (
                    <div className="space-y-2.5">
                      {posts.map((post: any) => (
                        <Link
                          key={post._id}
                          href={`/news/${post.slug}`}
                          className="group block rounded-xl bg-citizen-s4 p-3 transition-colors hover:bg-citizen-s4/80"
                        >
                          <p className="mb-1 line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary dark:group-hover:text-blue-400">
                            {post.title}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {format(
                              new Date(post.publishedAt ?? post._creationTime),
                              "dd MMM yyyy",
                              { locale: fr }
                            )}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Aucune annonce
                    </p>
                  )}
                </div>
              </FlatCard>
        </div>
      </motion.div>

      {/* Bouton flottant Appeler — mobile uniquement */}
      <MobileCallFAB variant="horizontal" />

      {/* Floating Consular Card Dialog */}
      <AnimatePresence>
        {showConsularCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowConsularCard(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="flat-card-border absolute -top-2 -right-2 z-10 h-8 w-8 rounded-full border bg-card hover:bg-muted"
                onClick={() => setShowConsularCard(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <ConsularCardWidget profile={profile} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Dossier Details Dialog */}
      <AnimatePresence>
        {showDossierDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDossierDetails(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-none bg-secondary shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/50 bg-background/5 p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-citizen-s2 p-1.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">État de mon dossier</h3>
                    <p className="text-xs text-muted-foreground">
                      Progression : {completionScore}%
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={() => setShowDossierDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="citizen-scrollbar overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {dossierItems.map((item) => (
                    <div
                      key={item.label}
                      className="relative flex flex-col items-center gap-1.5 rounded-xl bg-citizen-s4 px-2 py-3 text-center"
                    >
                      <div
                        className={cn(
                          "rounded-md p-1",
                          item.done
                            ? "text-primary dark:text-primary"
                            : "text-muted-foreground/50"
                        )}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={cn(
                          "text-xs leading-tight",
                          item.done
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.done ? (
                        <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/12">
                          <svg
                            className="h-3 w-3 text-primary dark:text-primary"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-muted-foreground/20" />
                      )}
                      {item.alert && (
                        <span
                          className={cn(
                            "mt-1 rounded-full px-1.5 py-0.5 text-xs font-bold",
                            item.alert.type === "expired"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600"
                          )}
                        >
                          {item.alert.text}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t bg-muted p-4">
                {completionScore < 100 && (
                  <Button
                    asChild
                    size="sm"
                    variant="default"
                    className="h-8 bg-primary text-xs text-white hover:bg-primary/90"
                  >
                    <Link href="/my-space/settings?tab=dossier">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Mettre à jour
                      mon dossier
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
