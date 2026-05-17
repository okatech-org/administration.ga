"use client";

/**
 * NetworkHub — Page racine "iCorrespondance Réseau" pour le super admin.
 *
 * Compose les KPI agrégés cross-org + le tableau des représentations
 * (volumes + statut de configuration). Les actions opérationnelles et
 * de réglage par rep sont accessibles via les boutons de chaque ligne.
 */

import { api } from "@convex/_generated/api";
import { AlertCircle, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { NetworkKpiGrid } from "./NetworkKpiGrid";
import { RepresentationsTable } from "./RepresentationsTable";
import Link from "next/link";

export function NetworkHub() {
  const { data: summary, isPending: summaryPending } =
    useAuthenticatedConvexQuery(
      api.functions.correspondanceNetworkStats.getNetworkSummary,
      {},
    );

  const { data: configStatus, isPending: configPending } =
    useAuthenticatedConvexQuery(
      api.functions.correspondanceNetworkStats.getNetworkConfigStatus,
      {},
    );

  const networkReady = configStatus?.networkReady ?? true;

  return (
    <div className="space-y-6">
      {!configPending && !networkReady ? (
        <FlatCard className="border-amber-500/30">
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">
                Configuration réseau non initialisée
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Lancez la migration{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  migrations.initCorrespondanceNetworkConfig
                </code>{" "}
                depuis le dashboard Convex pour distribuer le catalogue
                standard et activer l'héritage réseau → représentation.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
            >
              <Link href="/icorrespondance/settings">
                <ServerCog className="h-4 w-4" /> Ouvrir les réglages
              </Link>
            </Button>
          </div>
        </FlatCard>
      ) : null}

      <NetworkKpiGrid data={summary?.summary} isPending={summaryPending} />

      <RepresentationsTable
        volumes={summary?.perOrg}
        configStatus={configStatus?.orgs}
        isPending={summaryPending || configPending}
      />
    </div>
  );
}
