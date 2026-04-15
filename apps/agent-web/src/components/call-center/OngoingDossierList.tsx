"use client";

import { FileText, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface OpenRequestSummary {
  _id: string;
  reference: string;
  status: string;
  priority: string;
  serviceLabel: string;
  hasActions: boolean;
  lastUpdateAt: number;
}

/**
 * Liste des dossiers ouverts du citoyen (onglet principal du drawer).
 * Un clic ouvrira la fiche complète (Sprint 1 : navigation via l'état parent).
 */
export function OngoingDossierList({
  requests,
  closedCount,
  onOpenRequest,
}: {
  requests: OpenRequestSummary[];
  closedCount: number;
  onOpenRequest?: (requestId: string) => void;
}) {
  const { t } = useTranslation();

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
          <FileText className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">
          {t("callCenter.drawer.dossiers.empty")}
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {t("callCenter.drawer.dossiers.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
          {t("callCenter.drawer.dossiers.openCount", {
            count: requests.length,
          })}
        </span>
        {closedCount > 0 && (
          <span className="text-[10px] text-muted-foreground/60">
            {t("callCenter.drawer.dossiers.closedCount", { count: closedCount })}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {requests.map((r) => {
          const isUrgent =
            r.priority === "urgent" || r.priority === "critical";
          return (
            <li key={r._id}>
              <button
                type="button"
                onClick={() => onOpenRequest?.(r._id)}
                className={cn(
                  "group flex w-full items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                  isUrgent && "border-destructive/40",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    isUrgent
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold">
                      {r.reference}
                    </span>
                    {isUrgent && (
                      <Flag className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-foreground/80">
                    {r.serviceLabel}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                      {r.status}
                    </Badge>
                    {r.hasActions && (
                      <Badge className="h-4 border-0 bg-amber-500/15 px-1.5 text-[9px] text-amber-700 dark:text-amber-400">
                        {t("callCenter.drawer.dossiers.actionsPending")}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
