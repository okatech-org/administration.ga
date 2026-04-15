"use client";

/**
 * OrgRequestsTab — Liste paginée et filtrée des demandes d'une représentation
 *
 * Améliorations Phase A5 :
 *   - Filtre par statut (Select)
 *   - Pagination Convex (bouton « Charger plus »)
 *   - Lien « Voir tout » vers /admin/requests?orgId=...
 *   - États empty/loading propres
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/validators";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ClipboardList, ExternalLink, FileText, Filter, Loader2, Timer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";

interface OrgRequestsTabProps {
  orgId: Id<"orgs">;
}

type StatusFilter = "all" | (typeof STATUS_OPTIONS)[number]["value"];

const STATUS_OPTIONS = [
  { value: RequestStatus.Draft, label: "Brouillon" },
  { value: RequestStatus.Submitted, label: "Soumise" },
  { value: RequestStatus.Pending, label: "En attente" },
  { value: RequestStatus.UnderReview, label: "En revue" },
  { value: RequestStatus.InProduction, label: "En production" },
  { value: RequestStatus.Validated, label: "Validée" },
  { value: RequestStatus.AppointmentScheduled, label: "RDV planifié" },
  { value: RequestStatus.ReadyForPickup, label: "Prête au retrait" },
  { value: RequestStatus.Completed, label: "Terminée" },
  { value: RequestStatus.Rejected, label: "Rejetée" },
  { value: RequestStatus.Cancelled, label: "Annulée" },
] as const;

export function OrgRequestsTab({ orgId }: OrgRequestsTabProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === "fr" ? "fr" : "en";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const queryArgs =
    statusFilter === "all"
      ? { orgId }
      : { orgId, status: statusFilter };

  const {
    results: requests,
    status: paginationStatus,
    loadMore,
    isLoading,
  } = useAuthenticatedPaginatedQuery(
    api.functions.requests.listByOrg,
    queryArgs,
    { initialNumItems: 20 },
  );

  const isInitialLoading = isLoading && requests.length === 0;
  const canLoadMore = paginationStatus === "CanLoadMore";

  return (
    <FlatCard>
      <div className="p-3 lg:p-4 space-y-3">
        {/* En-tête + filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <SectionHeader
              icon={<ClipboardList className="h-4 w-4" />}
              title={t("superadmin.organizations.tabs.requests", "Demandes")}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "superadmin.organizations.requestsDesc",
                "Demandes de services pour cet organisme",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filtre statut */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lien « Voir tout » */}
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={`/admin/requests?orgId=${orgId}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Voir tout
              </a>
            </Button>
          </div>
        </div>

        {/* Liste */}
        {isInitialLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <>
            <div className="space-y-2">
              {requests.map((req: any) => (
                <button
                  key={req._id}
                  type="button"
                  className="w-full flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() =>
                    navigate({
                      to: "/requests/$requestId",
                      params: { requestId: req._id as Id<"requests"> },
                    })
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-mono truncate">
                        {req.reference || (req._id as string).slice(-8)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.user
                          ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim()
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Badge SLA si en retard (Phase C5) */}
                    <SlaBadge
                      createdAt={req._creationTime}
                      slaDays={
                        (req.service as { estimatedDays?: number } | undefined)
                          ?.estimatedDays
                      }
                    />
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5"
                    >
                      {String(
                        t(
                          `fields.requestStatus.options.${req.status}`,
                          req.status as string,
                        ),
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req._creationTime).toLocaleDateString(
                        lang === "fr" ? "fr-FR" : "en-US",
                        { day: "numeric", month: "short" },
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {canLoadMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMore(20)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Chargement…
                    </>
                  ) : (
                    "Charger 20 demandes de plus"
                  )}
                </Button>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              {requests.length} demande{requests.length > 1 ? "s" : ""} affichée
              {requests.length > 1 ? "s" : ""}
              {!canLoadMore && requests.length > 0 ? " (toutes)" : ""}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">
              {statusFilter === "all"
                ? t(
                    "superadmin.organizations.requestsEmpty",
                    "Aucune demande pour cet organisme",
                  )
                : "Aucune demande avec ce statut"}
            </p>
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="mt-2 text-xs"
              >
                Réinitialiser le filtre
              </Button>
            )}
          </div>
        )}
      </div>
    </FlatCard>
  );
}

// ─── Badge SLA : montre si la demande est en retard (Phase C5) ───
function SlaBadge({
  createdAt,
  slaDays,
}: {
  createdAt: number;
  slaDays?: number;
}) {
  if (!slaDays || slaDays <= 0) return null;

  const ageDays = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
  const remaining = slaDays - ageDays;
  const ratio = remaining / slaDays;

  // En retard : badge rouge
  if (remaining < 0) {
    const overdue = Math.floor(-remaining);
    return (
      <Badge
        variant="default"
        className="text-[9px] px-1.5 bg-rose-500/20 text-rose-700 border-rose-500/30 gap-0.5"
        title={`En retard de ${overdue} jour${overdue > 1 ? "s" : ""}`}
      >
        <AlertTriangle className="h-2.5 w-2.5" />+{overdue}j
      </Badge>
    );
  }

  // Proche du SLA (<20% restant) : badge orange
  if (ratio < 0.2) {
    return (
      <Badge
        variant="default"
        className="text-[9px] px-1.5 bg-amber-500/20 text-amber-700 border-amber-500/30 gap-0.5"
        title={`SLA : ${Math.floor(remaining)} jour(s) restants`}
      >
        <Timer className="h-2.5 w-2.5" />
        {Math.floor(remaining)}j
      </Badge>
    );
  }

  // Pas afficher si OK
  return null;
}
