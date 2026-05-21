"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { getCountryFlag, getCountryName, getOrgTypeEmoji, getOrgTypeLabel } from "@/lib/country-utils"
import { Baby, Building2, Eye, Phone } from "lucide-react"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────
type ProfileRow = {
  _id: string
  userId: string
  userType?: string
  countryOfResidence?: string
  identity: {
    firstName?: string
    lastName?: string
    gender?: string
    birthDate?: number
    birthPlace?: string
  }
  family?: {
    maritalStatus?: string
  }
  contacts?: {
    mobile?: string
    phone?: string
    email?: string
  }
  user: { email: string; name?: string } | null
  avatarUrl?: string
  photoUrl?: string
  childCount: number
  managedByOrg: { _id: string; name: string; shortName?: string; type: string; country: string } | null
  signaledToOrg: { _id: string; name: string; shortName?: string; type: string; country: string } | null
}

// ── Display Maps ────────────────────────────────────────
export const USER_TYPE_DISPLAY: Record<string, { label: string; emoji: string; className: string }> = {
  long_stay: { label: "Résident", emoji: "", className: "bg-green-500/10 text-green-700 border-green-300 dark:text-green-400" },
  short_stay: { label: "De passage", emoji: "", className: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400" },
  visa_tourism: { label: "Visa tourisme", emoji: "", className: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
  visa_business: { label: "Visa affaires", emoji: "", className: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-400" },
  visa_long_stay: { label: "Visa long séjour", emoji: "", className: "bg-cyan-500/10 text-cyan-700 border-cyan-300 dark:text-cyan-400" },
  admin_services: { label: "Services admin", emoji: "", className: "bg-gray-500/10 text-gray-700 border-gray-300 dark:text-gray-400" },
}

export const GENDER_DISPLAY: Record<string, { label: string; emoji: string }> = {
  male: { label: "H", emoji: "" },
  female: { label: "F", emoji: "" },
}

export const MARITAL_STATUS_DISPLAY: Record<string, string> = {
  single: "Célibataire",
  married: "Marié(e)",
  divorced: "Divorcé(e)",
  widowed: "Veuf/ve",
  civil_union: "PACS",
  cohabiting: "Union libre",
}

// ── Helpers ──────────────────────────────────────────────
export function formatLastName(name?: string) {
  return name ? name.toUpperCase() : "NOM INCONNU";
}

export function formatFirstName(name?: string) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName.slice(0, 2).toUpperCase()
  if (email) return email.slice(0, 2).toUpperCase()
  return "??"
}

export function computeAge(birthTimestamp?: number): number | null {
  if (!birthTimestamp) return null
  const birth = new Date(birthTimestamp)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}


// ── Columns ──────────────────────────────────────────────

const photoCol: ColumnDef<ProfileRow> = {
  id: "photo",
  header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
  cell: ({ row }) => {
    const p = row.original
    const imgSrc = p.photoUrl || p.avatarUrl
    return (
      <Avatar className="h-9 w-9">
        <AvatarImage src={imgSrc} alt={p.identity?.firstName ?? "profil"} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
          {getInitials(p.identity?.firstName, p.identity?.lastName, p.user?.email)}
        </AvatarFallback>
      </Avatar>
    )
  },
  enableSorting: false,
}

const nameCol: ColumnDef<ProfileRow> = {
  id: "name",
  accessorFn: (row) => {
    const { firstName, lastName } = row.identity ?? {}
    const ln = lastName ? lastName.toUpperCase() : ""
    const fn = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : ""
    return `${ln} ${fn}`.trim() || row.user?.email || "—"
  },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
  cell: ({ row }) => {
    const p = row.original
    const lastName = formatLastName(p.identity?.lastName)
    const firstName = formatFirstName(p.identity?.firstName)
    const phone = p.contacts?.mobile || p.contacts?.phone

    return (
      <div className="min-w-0">
        <div className="font-bold text-sm truncate tracking-tight uppercase" title={lastName}>{lastName}</div>
        {firstName && (
          <div className="text-sm text-muted-foreground truncate" title={firstName}>{firstName}</div>
        )}
        <div className="mt-1">
          {phone ? (
             <a href={`tel:${phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-0.5 px-1.5 -ml-1.5 rounded hover:bg-primary/10">
                <Phone className="h-3 w-3" />
                <span>{phone}</span>
             </a>
          ) : (
             <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5">
                <Phone className="h-3 w-3 opacity-70" />
                <span>Numéro non renseigné</span>
             </div>
          )}
        </div>
      </div>
    )
  },
}

const infoCol: ColumnDef<ProfileRow> = {
  id: "info",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Infos" />,
  cell: ({ row }) => {
    const p = row.original
    const gender = p.identity?.gender ? GENDER_DISPLAY[p.identity.gender] : null
    const age = computeAge(p.identity?.birthDate)
    const marital = p.family?.maritalStatus ? MARITAL_STATUS_DISPLAY[p.family.maritalStatus] : null

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {gender && (
          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-muted/60" title={gender.label === "H" ? "Homme" : "Femme"}>
            <span>{gender.emoji}</span>
          </span>
        )}
        {age !== null && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted/60" title="Âge">
            {age} ans
          </span>
        )}
        {marital && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted/60 hidden xl:inline" title="Situation familiale">
            {marital}
          </span>
        )}
        {p.childCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10" title={`${p.childCount} enfant(s)`}>
            <Baby className="h-3 w-3" />
            {p.childCount}
          </span>
        )}
        {!gender && age === null && !marital && p.childCount === 0 && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    )
  },
  enableSorting: false,
}

const userTypeCol: ColumnDef<ProfileRow> = {
  id: "userType",
  accessorFn: (row) => row.userType,
  header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
  cell: ({ row }) => {
    const userType = row.original.userType
    if (!userType) return <span className="text-xs text-muted-foreground">—</span>
    const display = USER_TYPE_DISPLAY[userType]
    if (!display) return <Badge variant="outline" className="text-[10px]">{userType}</Badge>
    return (
      <Badge variant="outline" className={`text-[10px] ${display.className}`}>
        {display.emoji} {display.label}
      </Badge>
    )
  },
  filterFn: (row, id, value) => value === row.getValue(id),
}

const countryCol: ColumnDef<ProfileRow> = {
  id: "country",
  accessorFn: (row) => row.countryOfResidence,
  header: ({ column }) => <DataTableColumnHeader column={column} title="Pays" />,
  cell: ({ row }) => {
    const code = row.original.countryOfResidence
    if (!code) return <span className="text-muted-foreground">—</span>
    return (
      <span className="flex items-center gap-1.5 text-sm whitespace-nowrap">
        <span>{getCountryFlag(code)}</span>
        <span className="hidden lg:inline">{getCountryName(code)}</span>
      </span>
    )
  },
  filterFn: (row, id, value) => value === row.getValue(id),
}

const representationCol: ColumnDef<ProfileRow> = {
  id: "representation",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Représentation" />,
  cell: ({ row }) => {
    const org = row.original.managedByOrg || row.original.signaledToOrg
    if (!org) return <span className="text-xs text-muted-foreground">—</span>
    const isSignaled = !row.original.managedByOrg && !!row.original.signaledToOrg
    return (
      <div className="flex items-center gap-1.5 text-xs max-w-[200px]">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="font-medium truncate">{org.shortName || org.name}</div>
          <div className="text-muted-foreground text-[10px] truncate">
            {getOrgTypeEmoji(org.type)} {getOrgTypeLabel(org.type)}
            {isSignaled && " · En signalement"}
          </div>
        </div>
      </div>
    )
  },
  enableSorting: false,
}

const actionsCol: ColumnDef<ProfileRow> = {
  id: "actions",
  cell: ({ row }) => {
    return (
      <Link
        href={`/profiles/${row.original._id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Voir</span>
      </Link>
    )
  },
  enableSorting: false,
}

export const profileColumns: ColumnDef<ProfileRow>[] = [
  photoCol,
  nameCol,
  infoCol,
  userTypeCol,
  countryCol,
  representationCol,
  actionsCol,
]
