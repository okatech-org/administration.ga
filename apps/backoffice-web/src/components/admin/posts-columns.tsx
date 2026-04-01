"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Post {
  _id: string
  title: string
  slug: string
  category: string
  status: string
  publishedAt?: number
  createdAt: number
  authorName: string
  orgName: string
  coverImageUrl: string | null
}

const categoryConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  news: { label: "Actualité", variant: "secondary" },
  event: { label: "Événement", variant: "default" },
  communique: { label: "Communiqué", variant: "outline" },
}

export const postsColumns: ColumnDef<Post>[] = [
  {
    accessorKey: "title",
    header: "Titre",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 max-w-[300px]">
        {row.original.coverImageUrl ? (
          <img
            src={row.original.coverImageUrl}
            alt=""
            className="h-10 w-16 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-16 rounded bg-muted shrink-0" />
        )}
        <span className="font-medium truncate">{row.original.title}</span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Catégorie",
    cell: ({ row }) => {
      const config = categoryConfig[row.original.category] ?? {
        label: row.original.category,
        variant: "secondary" as const,
      }
      return <Badge variant={config.variant}>{config.label}</Badge>
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "orgName",
    header: "Représentation",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.orgName}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "published" ? "default" : "outline"}>
        {row.original.status === "published" ? "Publié" : "Brouillon"}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "authorName",
    header: "Auteur",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const date = row.original.publishedAt ?? row.original.createdAt
      return (
        <span className="text-muted-foreground">
          {format(new Date(date), "d MMM yyyy", { locale: fr })}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/posts/$postId/edit" params={{ postId: row.original._id }}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`/news/${row.original.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir sur le site
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
