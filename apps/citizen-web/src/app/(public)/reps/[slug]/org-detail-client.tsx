"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Copy,
  Download,
  FileText,
  MapPin,
  Phone,
  Route,
  Shield,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useConvexAuth,
  usePreloadedQuery,
  useQuery,
  type Preloaded,
} from "convex/react"
import { Lock } from "lucide-react"
import { FlagIcon } from "@/components/ui/flag-icon"
import type { CountryCode } from "@convex/lib/constants"
import { cn } from "@/lib/utils"

const OrgLocationMap = dynamic(
  () =>
    import("@/components/OrgLocationMap").then((m) => ({
      default: m.OrgLocationMap,
    })),
  { ssr: false },
)

/* ───────── Constantes d'affichage ───────── */

const TYPE_LABELS: Record<string, string> = {
  embassy: "Ambassade",
  high_representation: "Haute Représentation",
  general_consulate: "Consulat Général",
  high_commission: "Haut-Commissariat",
  permanent_mission: "Mission Permanente",
  honorary_consulate: "Consulat honoraire",
  third_party: "Partenaire",
}

const REGIONAL_ROLE_LABELS: Record<string, string> = {
  regional_seat_europe: "Siège régional · Europe",
  regional_seat_africa: "Siège régional · Afrique",
  regional_seat_americas: "Siège régional · Amériques",
  regional_seat_asia_oceania: "Siège régional · Asie-Pacifique",
  regional_seat_middle_east: "Siège régional · Moyen-Orient",
}

const OP_MODE_LABELS: Record<string, string> = {
  full_exercise: "Plein exercice",
  limited_exercise: "Exercice limité",
  honorary: "Honoraire",
  antenna: "Antenne",
}

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  passport: "Passeport",
  visa: "Visa",
  civil_status: "État civil",
  registration: "Inscription consulaire",
  certification: "Certification",
  legalization: "Légalisation",
  transcript: "Transcription",
  travel_document: "Titre de voyage",
  assistance: "Assistance",
  declaration: "Déclaration",
  identity: "Identité",
  emergency: "Urgence",
  notification: "Notification",
  other: "Autre",
}

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const
type DayKey = (typeof DAY_ORDER)[number]
const DAY_LABELS: Record<DayKey, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
}

const CONTACT_LABELS: Record<string, string> = {
  phone_main: "Standard",
  phone_emergency: "Urgences (24/7)",
  phone_visas: "Téléphone — Visas",
  phone_consular: "Téléphone — Consulaire",
  email_main: "Email — accueil",
  email_visas: "Email — visas",
  email_consular: "Email — consulaire",
  email_press: "Email — presse",
  fax: "Fax",
  other: "Autre",
}

const COUNTRY_LABELS: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  US: "États-Unis",
  GB: "Royaume-Uni",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  CH: "Suisse",
  CA: "Canada",
  GA: "Gabon",
  CN: "Chine",
  SN: "Sénégal",
  MA: "Maroc",
  PT: "Portugal",
  RU: "Russie",
  JP: "Japon",
  IN: "Inde",
  KR: "Corée du Sud",
  CM: "Cameroun",
  CD: "RDC",
  CG: "Congo",
  TG: "Togo",
  TN: "Tunisie",
  EG: "Égypte",
  ET: "Éthiopie",
  ZA: "Afrique du Sud",
  AO: "Angola",
  DZ: "Algérie",
  ML: "Mali",
  CI: "Côte d'Ivoire",
  NG: "Nigeria",
  ST: "São Tomé",
  GQ: "Guinée Équatoriale",
  GN: "Guinée",
  BJ: "Bénin",
  GH: "Ghana",
  LY: "Libye",
  RW: "Rwanda",
}

/* ───────── Helpers ───────── */

function formatHourSlot(
  slot: { open?: string; close?: string; closed?: boolean } | undefined,
): string {
  if (!slot || slot.closed) return "Fermé"
  if (slot.open && slot.close) return `${slot.open} – ${slot.close}`
  return "—"
}

function isOpenNow(
  schedule: Record<string, { open?: string; close?: string; closed?: boolean }> | null,
  key: DayKey,
): { open: boolean; closeAt?: string } {
  if (!schedule) return { open: false }
  const today = schedule[key]
  if (!today || today.closed || !today.open || !today.close)
    return { open: false }
  const now = new Date()
  const [oh, om] = today.open.split(":").map(Number)
  const [ch, cm] = today.close.split(":").map(Number)
  const nm = now.getHours() * 60 + now.getMinutes()
  return {
    open: nm >= oh * 60 + om && nm < ch * 60 + cm,
    closeAt: today.close,
  }
}

function todayKey(): DayKey {
  const idx = new Date().getDay() // 0=dim
  const map: DayKey[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]
  return map[idx]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function regionFromCountry(c: string | undefined): {
  label: string
  slug: string
} {
  if (!c) return { label: "", slug: "" }
  const europe = ["FR", "BE", "DE", "ES", "IT", "GB", "PT", "RU", "CH"]
  const africa = [
    "GA",
    "ZA",
    "DZ",
    "AO",
    "BJ",
    "CM",
    "CG",
    "CI",
    "EG",
    "ET",
    "GQ",
    "GN",
    "LY",
    "MA",
    "NG",
    "CD",
    "SN",
    "TG",
    "TN",
    "RW",
    "ST",
    "ML",
    "GH",
  ]
  const americas = ["US", "CA", "BR", "MX", "AR", "CU"]
  const asia = ["CN", "IN", "JP", "KR", "TR", "IR"]
  if (europe.includes(c)) return { label: "Europe", slug: "europe" }
  if (africa.includes(c)) return { label: "Afrique", slug: "africa" }
  if (americas.includes(c)) return { label: "Amériques", slug: "americas" }
  if (asia.includes(c)) return { label: "Asie & Océanie", slug: "asia" }
  return { label: "Moyen-Orient", slug: "middle_east" }
}

/* ───────── Types ───────── */

type Channel = {
  kind: string
  value: string
  label?: string
  available247?: boolean
  order?: number
}

type PublicDetails = {
  _id: Id<"orgs">
  slug: string
  name: string
  type: string
  phone?: string
  email?: string
  fax?: string
  website?: string
  staffCount?: number
  jurisdictionNotes?: string
  identityExtended?: {
    operationalMode?: string
    regionalRole?: string
    tags?: string[]
  }
  branding?: {
    publicDescription?: { fr?: string; en?: string }
    socialLinks?: {
      facebook?: string
      twitter?: string
      linkedin?: string
      instagram?: string
      youtube?: string
    }
    accessInfo?: {
      transportFr?: string
      walkingTimeMinutes?: number
      parkingNotesFr?: string
      accessibilityNotesFr?: string
    }
  }
  contacts?: { channels: Channel[] }
  _derived: {
    address: {
      street: string
      city: string
      postalCode?: string
      country: string
      coordinates?: { lat: number; lng: number }
    }
    schedule: Record<
      string,
      { open?: string; close?: string; closed?: boolean }
    > | null
    logoUrl: string | null
    timezone: string
    upcomingClosure: {
      startDate: number
      endDate: number
      reasonFr: string
    } | null
    holidays: Array<{ date: string; label: string }>
    parentOrgName: string | null
  }
}

/* ────────────────────────────────────────────────────────────────── */
/* COMPOSANT PRINCIPAL                                                 */
/* ────────────────────────────────────────────────────────────────── */

export function OrgDetailClient({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.functions.orgsPublic.publicDetails>
}) {
  const { t } = useTranslation()
  const { isAuthenticated } = useConvexAuth()
  const org = usePreloadedQuery(preloaded) as PublicDetails | null

  const orgIdArg = org ? { orgId: org._id } : "skip"
  const staff = useQuery(
    api.functions.orgsPublic.publicStaff,
    orgIdArg as { orgId: Id<"orgs"> },
  )
  const callAvail = useQuery(
    api.functions.orgsPublic.callAvailability,
    orgIdArg as { orgId: Id<"orgs"> },
  )
  const documents = useQuery(
    api.functions.orgsPublic.publicDocuments,
    orgIdArg as { orgId: Id<"orgs"> },
  )
  const orgStats = useQuery(
    api.functions.orgsPublic.publicOrgStats,
    orgIdArg as { orgId: Id<"orgs"> },
  )
  const services = useQuery(
    api.functions.orgsPublic.publicServices,
    org ? { orgId: org._id, limit: 6 } : "skip",
  )
  const subReps = useQuery(
    api.functions.orgsPublic.subRepresentations,
    orgIdArg as { orgId: Id<"orgs"> },
  )
  const callLines = useQuery(
    api.functions.orgsPublic.publicCallLines,
    orgIdArg as { orgId: Id<"orgs"> },
  )
  const orgPosts = useQuery(
    api.functions.posts.listByOrg,
    org
      ? { orgId: org._id, paginationOpts: { numItems: 3, cursor: null } }
      : "skip",
  )

  if (!org) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-[color:var(--muted-foreground)]">
        {t("orgs.notFound", "Représentation introuvable.")}
      </div>
    )
  }

  const today = todayKey()
  const status = isOpenNow(org._derived.schedule, today)
  const countryName =
    COUNTRY_LABELS[org._derived.address.country] ?? org._derived.address.country
  const region = regionFromCountry(org._derived.address.country)

  const phoneMain =
    org.contacts?.channels.find((c) => c.kind === "phone_main")?.value ??
    org.phone

  const tags = org.identityExtended?.tags ?? []
  const regionalRoleLabel = org.identityExtended?.regionalRole
    ? REGIONAL_ROLE_LABELS[org.identityExtended.regionalRole]
    : null
  const opModeLabel = org.identityExtended?.operationalMode
    ? OP_MODE_LABELS[org.identityExtended.operationalMode]
    : null

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[color:var(--foreground)] font-sans">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 pb-16">
        {/* BREADCRUMB */}
        <nav
          aria-label="Fil d'Ariane"
          className="mt-6 mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-[color:var(--muted-foreground)]"
        >
          <Link href="/" className="hover:text-[color:var(--foreground)] hover:underline">
            {t("orgs.breadcrumb.home", "Accueil")}
          </Link>
          <BreadcrumbSep />
          <Link
            href="/reps"
            className="hover:text-[color:var(--foreground)] hover:underline"
          >
            {t("orgs.breadcrumb.network", "Réseau mondial")}
          </Link>
          {region.label && (
            <>
              <BreadcrumbSep />
              <Link
                href={`/reps?region=${region.slug}`}
                className="hover:text-[color:var(--foreground)] hover:underline"
                scroll={false}
              >
                {region.label}
              </Link>
            </>
          )}
          <BreadcrumbSep />
          <span className="text-[color:var(--foreground)] font-medium">
            {countryName}
          </span>
          <BreadcrumbSep />
          <span className="text-[color:var(--foreground)] font-medium">
            {org.name}
          </span>
        </nav>

        {/* HERO */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end py-2 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2.5 bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-full px-3.5 py-1.5 text-[13px] font-medium">
                <span className="w-7 h-5 rounded-[3px] overflow-hidden ring-1 ring-black/5 shadow-sm shrink-0 bg-[color:var(--surface-2,_#fbfaf6)]">
                  <FlagIcon
                    countryCode={org._derived.address.country as CountryCode}
                    size={28}
                    className="w-full !h-full object-cover rounded-none"
                  />
                </span>
                {countryName}
              </span>
              <Pill
                tone="info"
                text={`${TYPE_LABELS[org.type] ?? org.type}${opModeLabel ? " · " + opModeLabel : ""}`}
              />
              {regionalRoleLabel && (
                <Pill tone="yellow" text={regionalRoleLabel} />
              )}
              {tags.map((tag) => (
                <Pill key={tag} tone="muted" text={tag} />
              ))}
            </div>
            <h1
              className="font-semibold tracking-[-0.025em] leading-[1.05] mt-4"
              style={{ fontSize: "clamp(36px, 4.6vw, 56px)" }}
            >
              {org.name}
              {org.jurisdictionNotes && (
                <span className="block text-[color:var(--muted-foreground)] font-normal mt-2 tracking-[-0.01em] text-[0.55em]">
                  {org.jurisdictionNotes}
                </span>
              )}
            </h1>

            <div className="mt-4 flex items-start gap-2.5 text-[15px] text-[color:var(--muted-foreground)] leading-[1.5]">
              <MapPin
                className="w-[18px] h-[18px] text-[var(--gabon-blue-hex)] mt-0.5 shrink-0"
                strokeWidth={2}
              />
              <span>
                {org._derived.address.street}
                {org._derived.address.postalCode
                  ? ` · ${org._derived.address.postalCode}`
                  : ""}
                {org._derived.address.city ? ` ${org._derived.address.city}` : ""}
                {org.branding?.accessInfo?.transportFr && (
                  <>
                    <br />
                    <span className="text-[13px] text-[color:var(--text-faint,_#9a9588)]">
                      {org.branding.accessInfo.transportFr}
                    </span>
                  </>
                )}
              </span>
            </div>

            <div className="mt-5 pt-4 border-t border-[color:var(--border)] flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[color:var(--muted-foreground)]">
              {status.open ? (
                <span className="inline-flex items-center gap-2 text-[var(--status-success,_#157a3d)] font-semibold">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--status-success,_#157a3d)]"
                    style={{
                      boxShadow:
                        "0 0 0 3px var(--status-success-tint, #e3f1e8)",
                    }}
                  />
                  {t("orgs.detail.open", "Ouvert")}
                  {status.closeAt && (
                    <span className="text-[color:var(--muted-foreground)] font-normal">
                      · {t("orgs.detail.closesAt", "ferme à")} {status.closeAt}
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-[color:var(--text-faint,_#9a9588)] font-semibold">
                  <span
                    className="w-2 h-2 rounded-full bg-[color:var(--text-faint,_#9a9588)]"
                    style={{ boxShadow: "0 0 0 3px var(--border)" }}
                  />
                  {t("orgs.detail.closed", "Fermé")}
                </span>
              )}
              {phoneMain && (
                <>
                  <DotSep />
                  <span>
                    {t("orgs.detail.phone", "Téléphone")} :{" "}
                    <strong className="font-mono font-medium text-[color:var(--foreground)]">
                      {phoneMain}
                    </strong>
                  </span>
                </>
              )}
              {org.staffCount && (
                <>
                  <DotSep />
                  <span>
                    {t("orgs.detail.staff", "Effectif")} :{" "}
                    <strong className="font-medium text-[color:var(--foreground)]">
                      {org.staffCount} {t("orgs.detail.agents", "agents")}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* HERO ACTIONS */}
          <aside className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-5 flex flex-col gap-2.5">
            <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] text-[13px] font-medium mb-1">
              {t("orgs.detail.quickActions", "Actions rapides")}
            </span>
            <ActionBtn
              primary
              icon={<Phone className="w-4 h-4" strokeWidth={2} />}
              label={t("orgs.detail.callOnline", "Appeler en ligne")}
              suffix={
                !isAuthenticated
                  ? undefined
                  : callAvail?.status === "offline"
                    ? t("orgs.detail.noAgent", "0 en ligne")
                    : undefined
              }
              disabled={
                !isAuthenticated || callAvail?.status === "offline"
              }
              authRequired={!isAuthenticated}
              onClick={() => {
                // Scroll vers le call widget en sidebar (où l'utilisateur
                // choisit la ligne à appeler).
                const target = document.getElementById("call-widget")
                if (!target) return
                const scrollContainer =
                  document.getElementById("main-scrollable-area") ??
                  document.documentElement
                const containerRect = scrollContainer.getBoundingClientRect()
                const targetRect = target.getBoundingClientRect()
                const offsetTop =
                  scrollContainer.scrollTop +
                  targetRect.top -
                  containerRect.top -
                  96
                if (
                  scrollContainer === document.documentElement ||
                  scrollContainer === document.scrollingElement
                ) {
                  window.scrollTo({ top: offsetTop, behavior: "smooth" })
                } else {
                  ;(scrollContainer as HTMLElement).scrollTop = offsetTop
                  ;(scrollContainer as HTMLElement).scrollTo?.({
                    top: offsetTop,
                    behavior: "smooth",
                  })
                }
              }}
            />
            <ActionBtn
              icon={
                <Calendar
                  className="w-4 h-4 text-[var(--gabon-blue-hex)]"
                  strokeWidth={2}
                />
              }
              label={t("orgs.detail.bookAppointment", "Prendre rendez-vous")}
              href={isAuthenticated ? "/my-space/iagenda" : undefined}
              disabled={!isAuthenticated}
              authRequired={!isAuthenticated}
            />
            <ActionBtn
              icon={
                <Shield
                  className="w-4 h-4 text-[var(--gabon-blue-hex)]"
                  strokeWidth={2}
                />
              }
              label={t("orgs.detail.viewServices", "Voir les services proposés")}
              href="#services"
            />
            {!isAuthenticated && (
              <p className="text-[11px] text-[color:var(--muted-foreground)] leading-[1.4] mt-1 inline-flex items-start gap-1.5">
                <Lock className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={2} />
                <span>
                  {t(
                    "orgs.detail.loginRequiredHint",
                    "Connexion requise pour appeler ou prendre rendez-vous.",
                  )}{" "}
                  <Link
                    href="/auth"
                    className="text-[var(--gabon-blue-hex)] hover:underline font-medium"
                  >
                    {t("orgs.detail.signIn", "Se connecter")}
                  </Link>
                </span>
              </p>
            )}
            {org._derived.address.coordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${org._derived.address.coordinates.lat},${org._derived.address.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-[var(--gabon-blue-hex)] hover:underline px-2 py-1.5 mt-1"
              >
                <Route className="w-3.5 h-3.5" strokeWidth={2} />
                {t("orgs.detail.directions", "Itinéraire & transports")}
              </a>
            )}
          </aside>
        </section>

        {/* MAP */}
        {org._derived.address.coordinates && (
          <section className="mb-8">
            <OrgLocationMap
              lat={org._derived.address.coordinates.lat}
              lng={org._derived.address.coordinates.lng}
              label={org.name}
            />
          </section>
        )}

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-4">
            <PCard
              icon={<Phone className="w-4 h-4" />}
              title={t("orgs.detail.contactSection", "Coordonnées")}
            >
              <ContactsGrid org={org} />
            </PCard>

            <PCard
              icon={<Calendar className="w-4 h-4" />}
              title={t("orgs.detail.hours", "Horaires d'ouverture au public")}
              right={
                <span className="text-[12px] text-[color:var(--muted-foreground)]">
                  {org._derived.timezone}
                </span>
              }
            >
              <HoursGrid
                schedule={org._derived.schedule}
                today={today}
                upcomingClosure={org._derived.upcomingClosure}
              />
            </PCard>

            <div id="services" className="scroll-mt-24">
              <PCard
                icon={<Shield className="w-4 h-4" />}
                title={t("orgs.detail.services", "Services proposés")}
                count={services?.length}
                link={{
                  href: "/services",
                  label: t("orgs.detail.allServices", "Tous les services"),
                }}
              >
                <ServicesGrid services={services} />
              </PCard>
            </div>

            {staff && staff.length > 0 && (
              <PCard
                icon={<Users className="w-4 h-4" />}
                title={t("orgs.detail.staff", "Personnel diplomatique")}
              >
                <StaffGrid staff={staff} />
              </PCard>
            )}

            {orgPosts && orgPosts.page.length > 0 && (
              <PCard
                icon={<FileText className="w-4 h-4" />}
                title={t("orgs.detail.localNews", "Actualités locales")}
                link={{
                  href: "/news",
                  label: t("orgs.detail.allNews", "Toutes les actualités"),
                }}
              >
                <LocalNewsList posts={orgPosts.page} />
              </PCard>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            <CallWidget
              callAvail={callAvail}
              phoneMain={phoneMain}
              lines={callLines}
              isAuthenticated={isAuthenticated}
            />
            {!isAuthenticated && <InviteCard />}
            {orgStats && <QuickStats stats={orgStats} />}
            {documents && documents.length > 0 && (
              <DocumentsList docs={documents} />
            )}
            {subReps && subReps.length > 0 && <SubRepsList items={subReps} />}
          </aside>
        </div>
      </div>
    </div>
  )
}

/* ───────── Sub-components ───────── */

function BreadcrumbSep() {
  return <span className="opacity-50">›</span>
}

function DotSep() {
  return <span className="opacity-40">•</span>
}

function Pill({
  text,
  tone,
}: {
  text: string
  tone: "info" | "yellow" | "muted"
}) {
  const cls =
    tone === "info"
      ? "bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)]"
      : tone === "yellow"
        ? "bg-[var(--gabon-yellow-tint,_#fbf2cf)] text-[#8a6b00]"
        : "bg-[var(--surface,_#fff)] border border-[color:var(--border)] text-[color:var(--muted-foreground)]"
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium",
        cls,
      )}
    >
      {text}
    </span>
  )
}

function ActionBtn({
  icon,
  label,
  suffix,
  primary,
  href,
  disabled,
  authRequired,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  suffix?: string
  primary?: boolean
  href?: string
  disabled?: boolean
  authRequired?: boolean
  onClick?: () => void
}) {
  const isDisabled = disabled === true
  const isAnchor = href?.startsWith("#")
  const className = cn(
    "inline-flex items-center justify-start gap-2 rounded-full px-4 py-3 text-[14px] font-medium transition min-h-[48px]",
    primary
      ? "bg-[var(--gabon-blue-hex)] hover:bg-[var(--gabon-blue-deep,_#005a94)] text-white"
      : "bg-[var(--surface,_#fff)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] text-[color:var(--foreground)]",
    isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
  )
  const right = suffix ? (
    <span
      className={cn(
        "ml-auto px-2 py-0.5 rounded-full text-[11px] font-medium",
        primary ? "bg-white/20" : "bg-[color:var(--surface-2,_#fbfaf6)]",
      )}
    >
      {suffix}
    </span>
  ) : authRequired ? (
    <span
      className={cn(
        "ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
        primary ? "bg-white/20 text-white" : "bg-[color:var(--surface-2,_#fbfaf6)] text-[color:var(--muted-foreground)]",
      )}
      title="Connexion requise"
    >
      <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />
    </span>
  ) : null
  const content = (
    <>
      {icon}
      {label}
      {right}
    </>
  )
  if (href && !isDisabled) {
    if (isAnchor) {
      // Smooth scroll to in-page anchor — tient compte du conteneur de scroll
      // custom (#main-scrollable-area) utilisé par PublicLayout desktop.
      return (
        <a
          href={href}
          onClick={(e) => {
            const target = document.querySelector(href) as HTMLElement | null
            if (!target) return
            e.preventDefault()
            const scrollContainer =
              document.getElementById("main-scrollable-area") ??
              document.scrollingElement ??
              document.documentElement
            const containerRect = scrollContainer.getBoundingClientRect()
            const targetRect = target.getBoundingClientRect()
            const offsetTop =
              scrollContainer.scrollTop + targetRect.top - containerRect.top - 96 // 96px = scroll-mt-24
            // Double-scroll : assignement direct (immédiat) puis scrollTo
            // smooth en cas d'interception. Le first hit pose la position ;
            // le second peut animer s'il est supporté.
            if (scrollContainer === document.documentElement || scrollContainer === document.scrollingElement) {
              window.scrollTo({ top: offsetTop, behavior: "smooth" })
            } else {
              ;(scrollContainer as HTMLElement).scrollTop = offsetTop
              ;(scrollContainer as HTMLElement).scrollTo?.({ top: offsetTop, behavior: "smooth" })
            }
            history.replaceState(null, "", href)
          }}
          className={className}
        >
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  )
}

function PCard({
  icon,
  title,
  count,
  right,
  link,
  children,
}: {
  icon: React.ReactNode
  title: string
  count?: number
  right?: React.ReactNode
  link?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-6">
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-[18px] font-semibold tracking-[-0.005em] inline-flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] grid place-items-center">
            {icon}
          </span>
          {title}
          {count !== undefined && (
            <span className="font-mono text-[12px] text-[color:var(--text-faint,_#9a9588)] font-normal ml-1">
              {count}
            </span>
          )}
        </h2>
        {link ? (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--gabon-blue-hex)] hover:underline"
          >
            {link.label}
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        ) : (
          right
        )}
      </div>
      {children}
    </section>
  )
}

function ContactsGrid({ org }: { org: PublicDetails }) {
  const channels = useMemo<Channel[]>(() => {
    if (org.contacts && org.contacts.channels.length > 0) {
      return [...org.contacts.channels].sort(
        (a, b) => (a.order ?? 99) - (b.order ?? 99),
      )
    }
    const fb: Channel[] = []
    if (org.phone) fb.push({ kind: "phone_main", value: org.phone, order: 1 })
    if (org.email) fb.push({ kind: "email_main", value: org.email, order: 10 })
    if (org.fax) fb.push({ kind: "fax", value: org.fax, order: 20 })
    return fb
  }, [org])

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {channels.map((c, i) => (
        <ContactCard
          key={`${c.kind}-${i}`}
          kind={c.kind}
          value={c.value}
          available247={c.available247}
          label={c.label}
        />
      ))}
      {org.website && (
        <CoordRow label="Site officiel" value={org.website} href={org.website} />
      )}
      {org.branding?.socialLinks &&
        Object.values(org.branding.socialLinks).some(Boolean) && (
          <CoordSocial socials={org.branding.socialLinks} />
        )}
    </div>
  )
}

function ContactCard({
  kind,
  value,
  available247,
  label,
}: {
  kind: string
  value: string
  available247?: boolean
  label?: string
}) {
  const isEmail = kind.startsWith("email")
  const isPhone = kind.startsWith("phone") || kind === "fax"
  const displayLabel = label ?? CONTACT_LABELS[kind] ?? CONTACT_LABELS.other
  const href = isEmail
    ? `mailto:${value}`
    : isPhone
      ? `tel:${value.replace(/\s/g, "")}`
      : value
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (typeof window === "undefined") return
    void window.navigator.clipboard?.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="border border-[color:var(--border)] rounded-xl p-3.5 flex flex-col gap-1">
      <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)] font-medium">
        {displayLabel}
        {available247 && (
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--gabon-yellow-tint,_#fbf2cf)] text-[#8a6b00] text-[9px] font-semibold tracking-normal">
            24/7
          </span>
        )}
      </span>
      <a
        href={href}
        className={cn(
          "text-[14px] font-medium break-words",
          isPhone || kind === "fax" ? "font-mono" : "",
          isEmail ? "text-[var(--gabon-blue-hex)] hover:underline" : "",
        )}
      >
        {value}
      </a>
      {(isPhone || kind === "fax") && (
        <button
          type="button"
          onClick={handleCopy}
          className="self-end mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color:var(--surface-2,_#fbfaf6)] border border-[color:var(--border)] text-[11px] text-[color:var(--text-faint,_#9a9588)] hover:text-[color:var(--foreground)] transition"
        >
          <Copy className="w-3 h-3" strokeWidth={2} />
          {copied ? "Copié" : "Copier"}
        </button>
      )}
    </div>
  )
}

function CoordRow({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="border border-[color:var(--border)] rounded-xl p-3.5 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)] font-medium">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-medium text-[var(--gabon-blue-hex)] hover:underline break-words"
        >
          {value}
        </a>
      ) : (
        <span className="text-[14px] font-medium break-words">{value}</span>
      )}
    </div>
  )
}

function CoordSocial({
  socials,
}: {
  socials: {
    facebook?: string
    twitter?: string
    linkedin?: string
    instagram?: string
    youtube?: string
  }
}) {
  const entries = [
    ["facebook", "Facebook", socials.facebook],
    ["twitter", "X / Twitter", socials.twitter],
    ["linkedin", "LinkedIn", socials.linkedin],
    ["instagram", "Instagram", socials.instagram],
    ["youtube", "YouTube", socials.youtube],
  ] as const
  return (
    <div className="border border-[color:var(--border)] rounded-xl p-3.5 flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)] font-medium">
        Réseaux sociaux
      </span>
      <div className="flex flex-wrap gap-1.5">
        {entries
          .filter(([, , url]) => Boolean(url))
          .map(([key, label, url]) => (
            <a
              key={key}
              href={url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--gabon-blue-hex)] text-[12px] text-[color:var(--muted-foreground)] hover:text-[var(--gabon-blue-hex)] transition"
            >
              {label}
            </a>
          ))}
      </div>
    </div>
  )
}

function HoursGrid({
  schedule,
  today,
  upcomingClosure,
}: {
  schedule: PublicDetails["_derived"]["schedule"]
  today: DayKey
  upcomingClosure: PublicDetails["_derived"]["upcomingClosure"]
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-x-6">
        {DAY_ORDER.map((d) => {
          const slot = schedule?.[d]
          const isToday = d === today
          const isClosed = !slot || slot.closed
          return (
            <div
              key={d}
              className={cn(
                "flex justify-between items-center py-3 border-b border-[color:var(--border)] text-[14px]",
                "last-of-type:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0",
                isToday && "text-[var(--gabon-blue-hex)] font-semibold",
                isClosed && !isToday && "text-[color:var(--muted-foreground)]",
              )}
            >
              <span className="font-medium">
                {DAY_LABELS[d]}
                {isToday && (
                  <span className="font-normal text-[color:var(--muted-foreground)]">
                    {" "}
                    · aujourd'hui
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "font-mono text-[13px]",
                  isToday
                    ? "text-[var(--gabon-blue-hex)]"
                    : isClosed
                      ? "text-[color:var(--text-faint,_#9a9588)]"
                      : "text-[color:var(--muted-foreground)]",
                )}
              >
                {formatHourSlot(slot)}
              </span>
            </div>
          )
        })}
      </div>
      {upcomingClosure && (
        <div className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--status-warning-tint,_#faedca)] text-[var(--status-warning,_#a16e00)] text-[13px]">
          <Calendar className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
          <div>
            <strong>Fermeture exceptionnelle</strong> —{" "}
            {new Date(upcomingClosure.startDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            : {upcomingClosure.reasonFr}
          </div>
        </div>
      )}
    </>
  )
}

function ServicesGrid({
  services,
}: {
  services:
    | Array<{
        orgServiceId: string
        slug: string
        nameI18n: { fr?: string; en?: string }
        category: string
        estimatedDays: number
      }>
    | undefined
}) {
  if (!services) {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[64px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2,_#fbfaf6)] animate-pulse"
          />
        ))}
      </div>
    )
  }
  if (services.length === 0) {
    return (
      <p className="text-[13px] text-[color:var(--muted-foreground)]">
        Aucun service disponible publiquement pour le moment.
      </p>
    )
  }
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {services.map((s) => (
        <Link
          key={s.orgServiceId}
          href={`/services/${s.slug}`}
          className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 p-3 border border-[color:var(--border)] rounded-xl hover:border-[var(--gabon-blue-hex)] hover:bg-[color:var(--surface-2,_#fbfaf6)] transition"
        >
          <span className="w-9 h-9 rounded-lg bg-[color:var(--surface-2,_#fbfaf6)] grid place-items-center text-[color:var(--foreground)]">
            <FileText className="w-[18px] h-[18px]" strokeWidth={2} />
          </span>
          <div>
            <h4 className="text-[14px] font-semibold leading-tight">
              {s.nameI18n.fr ?? s.nameI18n.en ?? "Service"}
            </h4>
            <div className="text-[12px] text-[color:var(--muted-foreground)] mt-0.5">
              {SERVICE_CATEGORY_LABELS[s.category] ?? s.category}
              {s.estimatedDays ? ` · ${s.estimatedDays} j` : ""}
            </div>
          </div>
          <ChevronRight
            className="w-3.5 h-3.5 text-[color:var(--text-faint,_#9a9588)] group-hover:text-[var(--gabon-blue-hex)] transition"
            strokeWidth={2}
          />
        </Link>
      ))}
    </div>
  )
}

function StaffGrid({
  staff,
}: {
  staff: Array<{
    membershipId: string
    name: string
    titleFr: string | null
    photoUrl: string | null
  }>
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {staff.map((s) => (
        <div
          key={s.membershipId}
          className="flex items-center gap-3 p-3 border border-[color:var(--border)] rounded-xl"
        >
          {s.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.photoUrl}
              alt={s.name}
              className="w-11 h-11 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="w-11 h-11 rounded-full bg-[var(--gabon-blue-tint,_#e7eff9)] text-[var(--gabon-blue-hex)] grid place-items-center font-semibold text-[14px] shrink-0">
              {getInitials(s.name)}
            </span>
          )}
          <div className="min-w-0">
            <h4 className="text-[14px] font-semibold truncate">{s.name}</h4>
            {s.titleFr && (
              <div className="text-[12px] text-[color:var(--muted-foreground)] truncate">
                {s.titleFr}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function LocalNewsList({
  posts,
}: {
  posts: Array<{
    _id: string
    slug: string
    title: string
    category: string
    publishedAt?: number
  }>
}) {
  const MONTH_FR = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Août",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ]
  const cat: Record<string, string> = {
    news: "Actualité",
    event: "Événement",
    announcement: "Communiqué",
  }
  return (
    <div>
      {posts.map((p, i) => {
        const d = p.publishedAt ? new Date(p.publishedAt) : null
        return (
          <Link
            key={p._id}
            href={`/news/${p.slug}`}
            className={cn(
              "group grid grid-cols-[80px_1fr_auto] gap-3.5 items-center py-3",
              i > 0 && "border-t border-[color:var(--border)]",
            )}
          >
            <div className="bg-[color:var(--surface-2,_#fbfaf6)] border border-[color:var(--border)] rounded-lg px-2 py-1.5 text-center leading-none">
              <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[var(--gabon-blue-hex)]">
                {d ? MONTH_FR[d.getMonth()] : "—"}
              </div>
              <div className="text-[18px] font-semibold mt-1 tracking-[-0.02em]">
                {d ? d.getDate() : "—"}
              </div>
            </div>
            <div>
              <h4 className="text-[14px] font-medium leading-[1.4] group-hover:text-[var(--gabon-blue-hex)]">
                {p.title}
              </h4>
              <div className="text-[12px] text-[color:var(--muted-foreground)] mt-1">
                {cat[p.category] ?? p.category}
              </div>
            </div>
            <ChevronRight
              className="w-3.5 h-3.5 text-[color:var(--text-faint,_#9a9588)]"
              strokeWidth={2}
            />
          </Link>
        )
      })}
    </div>
  )
}

function CallWidget({
  callAvail,
  phoneMain,
  lines,
  isAuthenticated,
}: {
  callAvail:
    | {
        status: "available" | "offline"
        agentsOnline: number
      }
    | undefined
  phoneMain?: string
  lines:
    | Array<{
        _id: string
        label: string
        description: string | null
        agentsOnline: number
        isDefault: boolean
      }>
    | undefined
  isAuthenticated: boolean
}) {
  const isOnline = callAvail?.status === "available"
  const hasLines = Array.isArray(lines) && lines.length > 0

  return (
    <div
      id="call-widget"
      className="relative rounded-2xl p-5 text-white overflow-hidden scroll-mt-24"
      style={{
        background:
          "linear-gradient(135deg, var(--gabon-blue-hex) 0%, var(--gabon-blue-deep,_#005a94) 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          top: "-40%",
          right: "-20%",
          width: 280,
          height: 280,
          background:
            "radial-gradient(circle, rgba(241,197,49,.25), transparent 70%)",
        }}
      />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[0.1em] text-white/70 font-medium">
          Appel en ligne
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOnline ? "bg-[#4cc47a]" : "bg-white/60",
            )}
            style={
              isOnline
                ? { boxShadow: "0 0 0 3px rgba(76,196,122,.3)" }
                : undefined
            }
          />
          {isOnline ? "Disponible" : "Hors ligne"}
        </span>
      </div>
      <h3 className="relative z-10 text-[18px] font-semibold tracking-[-0.01em] leading-[1.25]">
        {hasLines
          ? "Choisissez une ligne à appeler."
          : "Aucune ligne d'appel disponible."}
      </h3>
      {callAvail && (
        <div className="relative z-10 mt-2.5 text-[13px] text-white/75 inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" strokeWidth={2} />
          <strong className="text-white font-medium">
            {callAvail.agentsOnline}
          </strong>{" "}
          agent{callAvail.agentsOnline > 1 ? "s" : ""} en ligne
        </div>
      )}

      {/* Liste des lignes */}
      {hasLines && (
        <ul className="relative z-10 mt-4 flex flex-col gap-1.5">
          {lines!.map((line) => {
            const canCall = isAuthenticated && line.agentsOnline > 0
            return (
              <li key={line._id}>
                <button
                  type="button"
                  disabled={!canCall}
                  title={
                    !isAuthenticated
                      ? "Connexion requise"
                      : line.agentsOnline === 0
                        ? "Aucun agent en ligne sur cette ligne"
                        : undefined
                  }
                  className={cn(
                    "w-full inline-flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-medium transition",
                    canCall
                      ? "bg-white/12 hover:bg-white/20 text-white border border-white/20"
                      : "bg-white/5 text-white/60 border border-white/10 cursor-not-allowed",
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      line.agentsOnline > 0 ? "bg-[#4cc47a]" : "bg-white/40",
                    )}
                    style={
                      line.agentsOnline > 0
                        ? { boxShadow: "0 0 0 3px rgba(76,196,122,.3)" }
                        : undefined
                    }
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">
                      {line.label}
                      {line.isDefault && (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.08em] text-white/60 font-normal">
                          défaut
                        </span>
                      )}
                    </span>
                    {line.description && (
                      <span className="block text-[12px] text-white/60 font-normal truncate">
                        {line.description}
                      </span>
                    )}
                  </span>
                  <Phone
                    className={cn(
                      "w-4 h-4 shrink-0",
                      canCall ? "text-white" : "text-white/40",
                    )}
                    strokeWidth={2}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!hasLines && lines !== undefined && (
        <p className="relative z-10 mt-3 text-[12px] text-white/60 leading-[1.5]">
          Cette représentation n'a pas encore configuré de lignes d'appel
          publiques.
        </p>
      )}
      <div className="relative z-10 mt-3.5 pt-3.5 border-t border-white/15 text-[11px] text-white/60 leading-[1.45] flex items-start gap-2">
        <Shield
          className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/60"
          strokeWidth={2}
        />
        Appel chiffré de bout en bout via Consulat.ga — gratuit depuis n'importe quel pays.
      </div>
      {phoneMain && (
        <div className="relative z-10 mt-2 text-[12px] text-white/75">
          Ou par téléphone :{" "}
          <a
            href={`tel:${phoneMain.replace(/\s/g, "")}`}
            className="font-mono font-medium text-white"
          >
            {phoneMain}
          </a>
        </div>
      )}
    </div>
  )
}

function InviteCard() {
  return (
    <div className="rounded-2xl p-5 bg-[var(--gabon-blue-tint,_#e7eff9)] border border-transparent">
      <h3 className="text-[15px] font-semibold text-[var(--gabon-blue-hex)]">
        Vous résidez dans cette circonscription ?
      </h3>
      <p className="mt-2 text-[13px] leading-[1.5] text-[color:var(--foreground)]">
        L'inscription consulaire vous donne accès à l'assistance, au vote et à
        la délivrance simplifiée de documents officiels.
      </p>
      <Link
        href="/register"
        className="mt-3.5 inline-flex w-full items-center justify-center gap-2 bg-[var(--gabon-blue-hex)] hover:bg-[var(--gabon-blue-deep,_#005a94)] text-white rounded-full px-4 py-2.5 text-[14px] font-medium transition"
      >
        Commencer mon inscription
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
      </Link>
    </div>
  )
}

function QuickStats({
  stats,
}: {
  stats: {
    citizensAttached: number
    servicesOffered: number
    onlineServices: number
    publishedNews: number
  }
}) {
  const rows = [
    { label: "Citoyens rattachés", value: stats.citizensAttached },
    { label: "Services proposés", value: stats.servicesOffered },
    { label: "Démarches en ligne", value: stats.onlineServices },
    { label: "Actualités publiées", value: stats.publishedNews },
  ]
  return (
    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold mb-3.5">
        La représentation en chiffres
      </h3>
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={cn(
            "flex justify-between items-baseline py-2.5 text-[13px]",
            i > 0 && "border-t border-[color:var(--border)]",
          )}
        >
          <span className="text-[color:var(--muted-foreground)]">{r.label}</span>
          <span className="font-semibold tabular-nums">
            {r.value.toLocaleString("fr-FR")}
          </span>
        </div>
      ))}
    </div>
  )
}

function DocumentsList({
  docs,
}: {
  docs: Array<{
    _id: string
    title: string
    category: string
    sizeBytes: number
    mimeType: string
    downloadUrl: string | null
  }>
}) {
  return (
    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold">Documents à télécharger</h3>
      <p className="mt-2 mb-3 text-[13px] text-[color:var(--muted-foreground)] leading-[1.5]">
        Formulaires officiels, brochures et listes de pièces à fournir.
      </p>
      <div>
        {docs.map((d, i) => (
          <a
            key={d._id}
            href={d.downloadUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            download
            className={cn(
              "group flex items-center gap-2.5 py-2.5 text-[13px]",
              i > 0 && "border-t border-dashed border-[color:var(--border)]",
            )}
          >
            <Download
              className="w-4 h-4 text-[var(--gabon-blue-hex)] shrink-0"
              strokeWidth={2}
            />
            <span className="flex-1 font-medium group-hover:text-[var(--gabon-blue-hex)]">
              {d.title}
            </span>
            <span className="font-mono text-[11px] text-[color:var(--text-faint,_#9a9588)]">
              PDF · {formatBytes(d.sizeBytes)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

function SubRepsList({
  items,
}: {
  items: Array<{
    id: string
    slug: string | null
    name: string
    type: string
    city: string | null
    country: string
  }>
}) {
  return (
    <div className="bg-[var(--surface,_#fff)] border border-[color:var(--border)] rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold">Autres représentations</h3>
      <p className="mt-2 mb-3 text-[13px] text-[color:var(--muted-foreground)] leading-[1.5]">
        Consulats honoraires et antennes régionales.
      </p>
      <div>
        {items.map((it, i) => {
          const inner = (
            <>
              <MapPin
                className="w-4 h-4 text-[color:var(--text-faint,_#9a9588)] shrink-0"
                strokeWidth={2}
              />
              <span className="flex-1 font-medium group-hover:text-[var(--gabon-blue-hex)]">
                {it.name}
                {it.city ? ` · ${it.city}` : ""}
              </span>
              <ChevronRight
                className="w-3 h-3 text-[color:var(--text-faint,_#9a9588)]"
                strokeWidth={2}
              />
            </>
          )
          const cls = cn(
            "group flex items-center gap-2.5 py-2.5 text-[13px]",
            i > 0 && "border-t border-dashed border-[color:var(--border)]",
          )
          return it.slug ? (
            <Link key={it.id} href={`/reps/${it.slug}`} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={it.id} className={cls}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
