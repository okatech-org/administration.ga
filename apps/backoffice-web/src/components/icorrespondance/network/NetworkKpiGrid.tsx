"use client";

/**
 * NetworkKpiGrid — KPI globaux du hub réseau iCorrespondance.
 *
 * Affiche les compteurs agrégés cross-org pour le super admin :
 * total correspondances, en cours, en attente, envoyées, archivées.
 * Les chiffres viennent de la query `correspondanceNetworkStats.getNetworkSummary`.
 */

import {
  Archive,
  CheckCircle2,
  Clock,
  Mail,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FlatCard } from "@/components/design-system/flat-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface NetworkKpiData {
  total: number;
  open: number;
  byStatus: Record<string, number>;
  orgsCount: number;
  orgsWithoutTraffic: number;
}

interface NetworkKpiGridProps {
  data: NetworkKpiData | undefined;
  isPending: boolean;
}

interface KpiTile {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  hint?: string;
}

export function NetworkKpiGrid({ data, isPending }: NetworkKpiGridProps) {
  const tiles: KpiTile[] = [
    {
      label: "Total réseau",
      value: data?.total ?? 0,
      icon: Mail,
      accent: "#475569",
      hint: data
        ? `${data.orgsCount} représentation${data.orgsCount > 1 ? "s" : ""}`
        : undefined,
    },
    {
      label: "Ouvertes",
      value: data?.open ?? 0,
      icon: Clock,
      accent: "#d97706",
      hint: "non finalisées",
    },
    {
      label: "En attente",
      value: data?.byStatus.pending ?? 0,
      icon: CheckCircle2,
      accent: "#2563eb",
      hint: "approbation requise",
    },
    {
      label: "Envoyées",
      value: data?.byStatus.sent ?? 0,
      icon: Send,
      accent: "#16a34a",
    },
    {
      label: "Archivées",
      value: data?.byStatus.archived ?? 0,
      icon: Archive,
      accent: "#64748b",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <FlatCard key={tile.label} className="relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
            style={{ background: tile.accent }}
          />
          <div className="p-4 pl-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {tile.label}
                </p>
                {isPending ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tracking-tight">
                    {tile.value.toLocaleString("fr-FR")}
                  </p>
                )}
                {tile.hint && !isPending ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {tile.hint}
                  </p>
                ) : null}
              </div>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${tile.accent}18` }}
              >
                <tile.icon
                  className="h-5 w-5"
                  style={{ color: tile.accent }}
                />
              </div>
            </div>
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
