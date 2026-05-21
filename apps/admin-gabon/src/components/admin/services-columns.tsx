"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { Doc } from "@convex/_generated/dataModel";
import { ServiceActionsCell } from "./service-actions-cell";

type CommonService = Doc<"services">;

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    passport: "Passport",
    visa: "Visa",
    civil_status: "Civil Status",
    registration: "Registration",
    legalization: "Legalization",
    emergency: "Emergency",
    other: "Other",
  };
  return labels[category] || category;
}

export const columns: ColumnDef<CommonService>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name.fr}</span>
    ),
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Slug" />
    ),
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1 py-0.5 rounded">
        {row.getValue("slug")}
      </code>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      return <Badge variant="secondary">{getCategoryLabel(category)}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value === row.getValue(id);
    },
  },
  {
    id: "documents",
    accessorFn: (row) => row.joinedDocuments?.length ?? 0,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Documents" />
    ),
    cell: ({ row }) => {
      const count = row.getValue("documents") as number;
      return <Badge variant="outline">{count} required</Badge>;
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ServiceActionsCell service={row.original} />,
  },
];
