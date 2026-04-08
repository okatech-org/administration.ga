/**
 * Phase 5 : Projets — Projets de coopération après validation haute autorité
 */

import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Shield,
} from "lucide-react";
import { useOrg } from "@/components/org/org-provider";
import { AIActionButton } from "@/components/diplomatic/AIActionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/projets",
)({
  component: ProjetsPhase,
});

const PROJECT_TYPE_LABEL: Record<string, string> = {
  cooperation_agreement: "Accord de coopération",
  commercial_contract: "Contrat commercial",
  technical_assistance: "Assistance technique",
  cultural_exchange: "Échange culturel",
  infrastructure: "Infrastructure",
  other: "Autre",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  draft: {
    label: "Brouillon",
    color: "bg-zinc-500/15 text-zinc-400",
    icon: AlertCircle,
  },
  pending_validation: {
    label: "En attente de validation",
    color: "bg-amber-500/15 text-amber-400",
    icon: Clock,
  },
  validated: {
    label: "Validé",
    color: "bg-blue-500/15 text-blue-400",
    icon: Shield,
  },
  in_progress: {
    label: "En cours",
    color: "bg-cyan-500/15 text-cyan-500",
    icon: Clock,
  },
  completed: {
    label: "Terminé",
    color: "bg-emerald-500/15 text-emerald-400",
    icon: CheckCircle2,
  },
  suspended: {
    label: "Suspendu",
    color: "bg-amber-500/15 text-amber-400",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Annulé",
    color: "bg-red-500/15 text-red-400",
    icon: XCircle,
  },
};

function ProjetsPhase() {
  const { activeOrgId } = useOrg();

  const { data: projects, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listProjects,
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
          {projects?.length ?? 0} projet(s) de coopération
        </p>
        <AIActionButton
          label="Structurer un projet"
          icon={Sparkles}
          onClick={() =>
            toast.info("Sélectionnez d'abord une cible avec un rapport validé")
          }
        />
      </div>

      {/* Liste des projets */}
      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-emerald-500/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Aucun projet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Après validation par la haute autorité, établissez des contrats et
            accords de coopération.
          </p>
          <Button disabled className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Structurer un projet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((project) => {
            const config =
              STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
            const StatusIcon = config.icon;
            return (
              <Card
                key={project._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="text-[10px]">
                          {project.reference} •{" "}
                          {PROJECT_TYPE_LABEL[project.projectType] ??
                            project.projectType}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={cn("text-[9px] shrink-0", config.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Objectifs */}
                  {project.objectives.length > 0 && (
                    <div className="space-y-1">
                      {project.objectives.slice(0, 3).map((obj, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div
                            className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              obj.status === "completed"
                                ? "bg-emerald-400"
                                : obj.status === "in_progress"
                                  ? "bg-blue-400"
                                  : obj.status === "blocked"
                                    ? "bg-red-400"
                                    : "bg-zinc-400",
                            )}
                          />
                          <span className="truncate">{obj.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stakeholders */}
                  {project.stakeholders.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {project.stakeholders.slice(0, 3).map((s, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[8px]"
                        >
                          {s.name} ({s.role})
                        </Badge>
                      ))}
                      {project.stakeholders.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{project.stakeholders.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Validation */}
                  {project.validatedBy && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-500">
                      <Shield className="h-3 w-3" />
                      Validé par {project.validatedBy}
                    </div>
                  )}

                  {project.budget && (
                    <p className="text-[10px] text-muted-foreground">
                      Budget : {project.budget}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
