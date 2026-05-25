"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"


interface AuditLogWithUser {
  _id: string
  _creationTime: number
  userId: string
  action: string
  targetType: string
  targetId: string
  details?: Record<string, unknown>
  createdAt: number
  user: {
    _id: string
    email: string
    firstName?: string
    lastName?: string
  } | null
}


function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}


function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return "??"
}


function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    user_created: "User Created",
    user_updated: "User Updated",
    user_disabled: "User Disabled",
    user_role_changed: "Role Changed",
    org_created: "Org Created",
    org_updated: "Org Updated",
    org_disabled: "Org Disabled",
    service_created: "Service Created",
    service_updated: "Service Updated",
    request_status_changed: "Request Status Changed",
  }
  return labels[action] || action
}

export const columns: ColumnDef<AuditLogWithUser>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => formatDate(row.getValue("createdAt") as number),
  },
  {
    id: "user",
    accessorFn: (row) => row.user?.email ?? "Unknown",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => {
      const log = row.original
      if (!log.user) return <span className="text-muted-foreground">Unknown</span>
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {getInitials(log.user.firstName, log.user.lastName, log.user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{log.user.email}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => {
      const action = row.getValue("action") as string
      return (
        <Badge variant="secondary">
          {getActionLabel(action)}
        </Badge>
      )
    },
  },
  {
    accessorKey: "targetType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target Type" />
    ),
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1 py-0.5 rounded">
        {row.getValue("targetType")}
      </code>
    ),
  },
  {
    accessorKey: "targetId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target ID" />
    ),
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1 py-0.5 rounded truncate max-w-32 block">
        {row.getValue("targetId")}
      </code>
    ),
  },
  {
    accessorKey: "details",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Details" />
    ),
    cell: ({ row }) => {
      const details = row.getValue("details") as Record<string, unknown> | undefined
      if (!details) return <span className="text-muted-foreground">—</span>
      return (
        <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-48 block truncate">
          {JSON.stringify(details)}
        </code>
      )
    },
  },
]
