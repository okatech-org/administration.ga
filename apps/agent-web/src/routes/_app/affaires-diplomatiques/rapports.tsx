/**
 * Phase 4 : Rapports — Rapports à la hiérarchie
 */

import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  BarChart3,
  Sparkles,
  Loader2,
  FileDown,
} from "lucide-react";
import { useOrg } from "@/components/org/org-provider";
import { AIActionButton } from "@/components/diplomatic/AIActionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/rapports",
)({
  component: RapportsPhase,
});

const RECIPIENT_LABEL: Record<string, string> = {
  president: "Président",
  minister: "Ministre",
  secretary_general: "Secrétaire Général",
  direction: "Direction",
  other: "Autre",
};

const TYPE_LABEL: Record<string, string> = {
  activity: "Activité",
  situation: "Situation",
  mission: "Mission",
  economic: "Économique",
  security: "Sécurité",
  annual: "Annuel",
  other: "Autre",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-zinc-500/15 text-zinc-400" },
  pending_review: {
    label: "En révision",
    color: "bg-amber-500/15 text-amber-400",
  },
  approved: { label: "Approuvé", color: "bg-blue-500/15 text-blue-400" },
  submitted: {
    label: "Soumis",
    color: "bg-emerald-500/15 text-emerald-400",
  },
  archived: { label: "Archivé", color: "bg-zinc-500/15 text-zinc-400" },
};

function RapportsPhase() {
  const { activeOrgId } = useOrg();

  const { data: reports, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listReports,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reports?.length ?? 0} rapport(s)
        </p>
        <AIActionButton
          label="Compiler un rapport"
          icon={Sparkles}
          onClick={() => toast.info("Compilation IA bientôt disponible")}
        />
      </div>

      {/* Liste des rapports */}
      {!reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-violet-500/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Aucun rapport</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Préparez des rapports d'activité pour le Président, les Ministres et
            votre hiérarchie.
          </p>
          <Button disabled className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Compiler un rapport
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const status =
              STATUS_LABEL[report.status] ?? STATUS_LABEL.draft;
            return (
              <Card
                key={report._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {report.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[report.type] ?? report.type} • Pour :{" "}
                      {RECIPIENT_LABEL[report.recipient] ?? report.recipient}
                      {report.period && ` • ${report.period}`}
                    </p>
                    {report.aiGeneratedSummary && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-primary">
                        <Sparkles className="h-3 w-3" />
                        Résumé généré par l'IA
                      </div>
                    )}
                    {report.statistics && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[9px]"
                        >
                          {report.statistics.totalTargets} cibles
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[9px]"
                        >
                          {report.statistics.contactedTargets} contactées
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[9px]"
                        >
                          {report.statistics.projectsInitiated} projets
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(report.status === "approved" ||
                      report.status === "submitted") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() =>
                          toast.info("Export PDF bientôt disponible")
                        }
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                    <Badge className={cn("text-[9px]", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
