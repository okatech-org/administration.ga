"use client";

/**
 * RequestsRegistryTab — Onglet « Demandes & Registre » fusionné (Phase B3)
 *
 * Sous-tabs :
 *   - Demandes en cours (réutilise OrgRequestsTab Phase A5)
 *   - Registre consulaire (KPI + lien vers gestion centrale)
 *   - Stats SLA (placeholder Phase C)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { Calendar, ClipboardList, ExternalLink, FileText, IdCard, LayoutGrid, TrendingUp, Users } from "lucide-react";
import { OrgRequestsTab } from "@/components/admin/requests/OrgRequestsTab";
import { CategoryBreakdownCard } from "@/components/admin/requests-registry/CategoryBreakdownCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export interface RequestsRegistryTabProps {
  orgId: Id<"orgs">;
}

export function RequestsRegistryTab({ orgId }: RequestsRegistryTabProps) {
  return (
    <Tabs defaultValue="requests">
      <TabsList className="grid grid-cols-3 sm:inline-flex h-auto p-1 bg-[#F4F3ED] dark:bg-[#171616]">
        <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
          <ClipboardList className="h-4 w-4" />
          Demandes
        </TabsTrigger>
        <TabsTrigger value="registry" className="gap-1.5 text-xs sm:text-sm">
          <IdCard className="h-4 w-4" />
          Registre consulaire
        </TabsTrigger>
        <TabsTrigger value="sla" className="gap-1.5 text-xs sm:text-sm">
          <TrendingUp className="h-4 w-4" />
          SLA & Performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="requests" className="mt-4">
        <OrgRequestsTab orgId={orgId} />
      </TabsContent>

      <TabsContent value="registry" className="mt-4">
        <RegistrySection orgId={orgId} />
      </TabsContent>

      <TabsContent value="sla" className="mt-4">
        <SlaPlaceholder />
      </TabsContent>
    </Tabs>
  );
}

// ─── Section Registre Consulaire ──────────────────────────────
function RegistrySection({ orgId }: { orgId: Id<"orgs"> }) {
  const { data: registryStats } = useAuthenticatedConvexQuery(
    api.functions.consularRegistrations.getStatsByOrg,
    { orgId },
  );
  const { data: categoryBreakdown } = useAuthenticatedConvexQuery(
    api.functions.consularRegistrations.getStatsByCategoryForOrg,
    { orgId },
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <RegistryKpiCard
          icon={Users}
          label="Total inscrits"
          value={registryStats?.total ?? "—"}
          accent="#6366f1"
        />
        <RegistryKpiCard
          icon={Calendar}
          label="Demandes en cours"
          value={registryStats?.requested ?? "—"}
          accent="#f59e0b"
        />
        <RegistryKpiCard
          icon={IdCard}
          label="Cartes actives"
          value={registryStats?.active ?? "—"}
          accent="#10b981"
        />
        <RegistryKpiCard
          icon={FileText}
          label="Cartes expirées"
          value={registryStats?.expired ?? "—"}
          accent="#ef4444"
        />
      </div>

      {/* Phase E.5 — Breakdown par catégorie de service */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <FlatCard>
          <div className="p-4">
            <SectionHeader
              icon={<LayoutGrid className="h-4 w-4 text-indigo-600" />}
              title="Répartition par catégorie"
            />
            <p className="text-xs text-muted-foreground mb-3">
              Inscriptions consulaires groupées par catégorie de service (actifs
              / demandés / expirés).
            </p>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {categoryBreakdown.slice(0, 7).map((item) => (
                <CategoryBreakdownCard key={item.category} stats={item} />
              ))}
            </div>
          </div>
        </FlatCard>
      )}

      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<IdCard className="h-4 w-4" />}
            title="Registre consulaire central"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Le registre centralisé permet de gérer les inscriptions, demandes et
            renouvellements de cartes consulaires pour cette représentation.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/affaires-consulaires">
              <ExternalLink className="h-3 w-3 mr-1.5" />
              Ouvrir le registre central
            </Link>
          </Button>
        </div>
      </FlatCard>
    </div>
  );
}

function RegistryKpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <FlatCard className="relative overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ background: accent }}
      />
      <div className="p-3 pl-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${accent}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
      </div>
    </FlatCard>
  );
}

// ─── Placeholder SLA & Performance ────────────────────────────
function SlaPlaceholder() {
  return (
    <FlatCard>
      <div className="p-6 text-center text-muted-foreground">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">SLA & Performance</p>
        <p className="text-xs mt-2 max-w-md mx-auto">
          Métriques détaillées des délais de traitement, taux de respect du SLA
          par service, alertes des demandes en retard.
        </p>
        <Badge variant="secondary" className="mt-3 text-[10px]">
          Disponible en Phase C5
        </Badge>
      </div>
    </FlatCard>
  );
}
