"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { UserActionsCell } from "@/components/admin/user-actions-cell"
import type { Doc } from "@convex/_generated/dataModel"
import { getCountryFlag, getCountryName } from "@/lib/country-utils"
import { cn } from "@/lib/utils"
import { Building2 } from "lucide-react"

type User = Doc<"users">

const ROLE_DISPLAY: Record<string, { label: string; variant: "default" | "secondary" | "outline"; className?: string }> = {
  super_admin: { label: "Super Admin", variant: "default", className: "bg-amber-600 hover:bg-amber-700 text-white" },
  admin_system: { label: "Admin Système", variant: "default", className: "bg-violet-600 hover:bg-violet-700 text-white" },
  admin: { label: "Admin", variant: "default", className: "bg-blue-600 hover:bg-blue-700 text-white" },
  intel_agent: { label: "Agent Intel", variant: "default", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  education_agent: { label: "Agent Éducation", variant: "default", className: "bg-teal-600 hover:bg-teal-700 text-white" },
  user: { label: "Utilisateur", variant: "secondary" },
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName.slice(0, 2).toUpperCase()
  if (email) return email.slice(0, 2).toUpperCase()
  return "??"
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Avatar column (shared)
const avatarCol: ColumnDef<User> = {
  accessorKey: "profileImageUrl",
  header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
  cell: ({ row }) => {
    const user = row.original
    return (
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatarUrl} alt={user.email} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
          {getInitials(user.firstName, user.lastName, user.email)}
        </AvatarFallback>
      </Avatar>
    )
  },
  enableSorting: false,
}

// Name column (shared)
const nameCol: ColumnDef<User> = {
  id: "name",
  accessorFn: (row) =>
    row.firstName && row.lastName
      ? `${row.firstName} ${row.lastName}`
      : row.firstName || row.name || row.email,
  header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
  cell: ({ row }) => {
    const user = row.original
    const name = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.name || "—"
    return <span className="font-medium">{name}</span>
  },
}

const emailCol: ColumnDef<User> = {
  accessorKey: "email",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
}

const phoneCol: ColumnDef<User> = {
  accessorKey: "phone",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Téléphone" />,
  cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("phone") || "—"}</span>,
}

const roleCol: ColumnDef<User> = {
  accessorKey: "role",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Rôle" />,
  cell: ({ row }) => {
    const role = row.getValue("role") as string
    const display = ROLE_DISPLAY[role] || ROLE_DISPLAY.user
    return (
      <Badge variant={display.variant} className={cn(display.className)}>
        {display.label}
      </Badge>
    )
  },
  filterFn: (row, id, value) => value === row.getValue(id),
}

const countryCol: ColumnDef<User> = {
  accessorKey: "residenceCountry",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Pays" />,
  cell: ({ row }) => {
    const code = row.getValue("residenceCountry") as string
    if (!code) return <span className="text-muted-foreground">—</span>
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <span>{getCountryFlag(code)}</span>
        <span>{getCountryName(code)}</span>
      </span>
    )
  },
  filterFn: (row, id, value) => value === row.getValue(id),
}

const statusCol: ColumnDef<User> = {
  accessorKey: "isActive",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
  cell: ({ row }) => {
    const isActive = row.getValue("isActive") as boolean
    const deletedAt = (row.original as any).deletedAt
    
    if (deletedAt) {
      const daysRemaining = Math.max(0, 30 - Math.floor((Date.now() - deletedAt) / (1000 * 60 * 60 * 24)))
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-500/10 dark:text-red-400 text-[10px]">
             Corbeille
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {daysRemaining > 0 ? `${daysRemaining}j restants` : "Expirée"}
          </span>
        </div>
      )
    }
    
    return (
      <Badge variant={isActive ? "default" : "outline"}>
        {isActive ? "Actif" : "Inactif"}
      </Badge>
    )
  },
  filterFn: (row, id, value) => {
    const isActive = row.getValue(id) as boolean
    return value === String(isActive)
  },
}

const dateCol: ColumnDef<User> = {
  accessorKey: "createdAt",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Inscrit le" />,
  cell: ({ row }) => formatDate(row.getValue("createdAt") as number),
}

const actionsCol: ColumnDef<User> = {
  id: "actions",
  cell: ({ row }) => <UserActionsCell user={row.original} />,
}

// Affectation column (for Corps Administratif)
const affectationCol: ColumnDef<User> = {
  id: "affectation",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Affectation" />,
  cell: ({ row }) => {
    const info = (row.original as any).membershipInfo
    if (!info) return <span className="text-muted-foreground">—</span>
    return (
      <div className="flex items-center gap-2 text-sm max-w-[250px]">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          {info.positionTitle && (
            <div className="font-medium text-xs truncate">{info.positionTitle}</div>
          )}
          <div className="text-muted-foreground text-xs truncate">{info.orgName}</div>
          {info.totalMemberships > 1 && (
            <span className="text-[10px] text-muted-foreground">
              +{info.totalMemberships - 1} autre{info.totalMemberships > 2 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    )
  },
}

/** Standard columns (Tous, Back-Office, Utilisateurs, Inactifs) */
export const columns: ColumnDef<User>[] = [
  avatarCol,
  nameCol,
  emailCol,
  phoneCol,
  roleCol,
  countryCol,
  statusCol,
  dateCol,
  actionsCol,
]

/** Corps Administratif columns (adds Affectation, omits role) */
export const corpsAdminColumns: ColumnDef<User>[] = [
  avatarCol,
  nameCol,
  emailCol,
  phoneCol,
  affectationCol,
  countryCol,
  statusCol,
  actionsCol,
]
