"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CommunityEvent {
  _id: string;
  title: string;
  slug: string;
  category: string;
  location: string;
  date: number;
  status: string;
  createdAt: number;
  orgName: string;
  coverImageUrl: string | null;
}

const categoryConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  celebration: { label: "Célébration", variant: "default" },
  culture: { label: "Culture", variant: "secondary" },
  diplomacy: { label: "Diplomatie", variant: "outline" },
  sport: { label: "Sport", variant: "secondary" },
  charity: { label: "Charité", variant: "outline" },
};

export const eventsColumns: ColumnDef<CommunityEvent>[] = [
  {
    accessorKey: "title",
    header: "Titre",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 max-w-[300px]">
        {row.original.coverImageUrl ?
          <img
            src={row.original.coverImageUrl}
            alt=""
            className="h-10 w-16 rounded object-cover shrink-0"
          />
        : <div className="h-10 w-16 rounded bg-muted shrink-0" />}
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
      };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "location",
    header: "Lieu",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.location}</span>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {format(new Date(row.original.date), "d MMM yyyy", { locale: fr })}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "published" ? "default" : "outline"}
      >
        {row.original.status === "published" ?
          "Publié"
        : row.original.status === "draft" ?
          "Brouillon"
        : "Archivé"}
      </Badge>
    ),
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
            <Link
              to="/events/$eventId/edit"
              params={{ eventId: row.original._id }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`/community#events`}
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
];
