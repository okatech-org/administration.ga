"use client";

/**
 * RepresentationsTable — Liste des représentations avec statut iCorrespondance.
 *
 * Croise les données :
 *  - `correspondanceNetworkStats.getNetworkSummary.perOrg` (volumes)
 *  - `correspondanceNetworkStats.getNetworkConfigStatus.orgs` (config)
 *
 * Chaque ligne propose deux raccourcis :
 *  - "Exploiter" → /icorrespondance/operate (pré-sélectionne l'org)
 *  - "Régler" → /icorrespondance/settings (pré-sélectionne l'org)
 */

import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OrgVolume {
  orgId: Id<"orgs">;
  orgName: string;
  orgType?: string;
  country?: string;
  total: number;
  open: number;
}

interface OrgConfigStatus {
  orgId: Id<"orgs">;
  orgName: string;
  typesConfigured: number;
  typesActive: number;
  hasOwnReferencePattern: boolean;
  configCompleteness: number;
}

interface RepresentationsTableProps {
  volumes: OrgVolume[] | undefined;
  configStatus: OrgConfigStatus[] | undefined;
  isPending: boolean;
}

function StatusBadge({ completeness }: { completeness: number }) {
  if (completeness >= 75) {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Configurée
      </Badge>
    );
  }
  if (completeness > 0) {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
        <AlertTriangle className="h-3 w-3" /> Partielle
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-slate-500/15 text-slate-700 hover:bg-slate-500/20 dark:text-slate-300">
      <AlertTriangle className="h-3 w-3" /> À configurer
    </Badge>
  );
}

export function RepresentationsTable({
  volumes,
  configStatus,
  isPending,
}: RepresentationsTableProps) {
  if (isPending || !volumes || !configStatus) {
    return (
      <FlatCard className="p-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </FlatCard>
    );
  }

  // Merge volumes + config status sur orgId
  const configByOrg = new Map(configStatus.map((c) => [c.orgId, c]));
  const rows = volumes
    .map((v) => ({
      ...v,
      config: configByOrg.get(v.orgId),
    }))
    .sort((a, b) => b.total - a.total || a.orgName.localeCompare(b.orgName));

  if (rows.length === 0) {
    return (
      <FlatCard className="p-8 text-center text-sm text-muted-foreground">
        Aucune représentation accessible.
      </FlatCard>
    );
  }

  return (
    <FlatCard className="overflow-hidden">
      <div className="border-b border-[color:var(--border-soft)] px-4 py-3">
        <h3 className="text-sm font-semibold">Représentations du réseau</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {rows.length} représentation{rows.length > 1 ? "s" : ""} — volumes et
          conformité de configuration.
        </p>
      </div>
      <div className="divide-y divide-[color:var(--border-soft)]">
        {rows.map((row) => {
          const completeness = row.config?.configCompleteness ?? 0;
          return (
            <div
              key={row.orgId}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-500/10">
                <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.orgName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.country ?? "—"} · {row.orgType ?? "—"}
                </p>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-xs uppercase text-muted-foreground">
                  Total
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {row.total.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-xs uppercase text-muted-foreground">
                  Ouvertes
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    row.open > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground",
                  )}
                >
                  {row.open.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="hidden lg:block">
                <StatusBadge completeness={completeness} />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  title="Régler la configuration"
                >
                  <Link
                    href={`/icorrespondance/settings?orgId=${row.orgId}`}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden xl:inline">Régler</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  title="Exploiter cette représentation"
                >
                  <Link href={`/icorrespondance/operate?orgId=${row.orgId}`}>
                    <span className="hidden md:inline">Exploiter</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </FlatCard>
  );
}
