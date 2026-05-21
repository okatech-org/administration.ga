"use client";

/**
 * TeamTab — Onglet « Équipe » unifié (Phase B1)
 *
 * Fusion des anciens onglets « Membres » et « Postes » avec 3 vues :
 *   - Liste : tous les membres avec leur poste, modifiables en place
 *   - Organigramme : vue hiérarchique par grade (réutilise OrgPositionsTab)
 *   - Vacants : postes sans occupant + action « Affecter »
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LayoutGrid, List, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgPositionsTab } from "@/components/dashboard/org-positions-tab";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { TeamListView } from "./TeamListView";
import { VacantPositionsView } from "./VacantPositionsView";

export interface TeamTabProps {
  orgId: Id<"orgs">;
}

export function TeamTab({ orgId }: TeamTabProps) {
  const [view, setView] = useState<"list" | "chart" | "vacant">("list");
  const { t } = useTranslation();

  const { data: orgChart } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    { orgId },
  );

  const vacantCount = orgChart?.vacantPositions ?? 0;
  const filledCount = orgChart?.filledPositions ?? 0;
  const totalCount = orgChart?.totalPositions ?? 0;

  return (
    <div className="space-y-3">
      {/* Switch de vue */}
      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList className="grid grid-cols-3 sm:inline-flex h-auto p-1 bg-[#F4F3ED] dark:bg-[#171616]">
          <TabsTrigger value="list" className="gap-1.5 text-xs sm:text-sm">
            <List className="h-4 w-4" />
            {t("superadmin.team.viewList", "Vue liste")}
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5 text-xs sm:text-sm">
            <LayoutGrid className="h-4 w-4" />
            {t("superadmin.team.viewOrgChart", "Organigramme")}
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                {filledCount}/{totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vacant" className="gap-1.5 text-xs sm:text-sm">
            <UserPlus className="h-4 w-4" />
            {t("superadmin.team.viewVacant", "Postes vacants")}
            {vacantCount > 0 && (
              <Badge
                variant="default"
                className="ml-1 text-[10px] h-4 px-1 bg-amber-500/20 text-amber-700"
              >
                {vacantCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <TeamListView orgId={orgId} />
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <OrgPositionsTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="vacant" className="mt-4">
          <VacantPositionsView orgId={orgId} />
        </TabsContent>
      </Tabs>

      {/* Bandeau pédagogique */}
      <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-blue-700 dark:text-blue-400">
        <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>{t("superadmin.team.banner.title", "Équipe unifiée :")}</strong>{" "}
          {t(
            "superadmin.team.banner.description",
            "les anciens onglets « Membres » et « Postes » ont fusionné. Utilise « Vue liste » pour gérer les agents et leurs rôles, « Organigramme » pour configurer les permissions par poste, ou « Postes vacants » pour affecter rapidement.",
          )}
        </p>
      </div>
    </div>
  );
}
