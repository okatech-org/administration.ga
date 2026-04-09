/**
 * Phase 5 : Projets — Projets de cooperation apres validation haute autorite
 *
 * Dialog IA complet : selection cible → structuration projet via structureProject
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  Briefcase,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Shield,
  Users,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import {
  AIActionPanel,
  AIActionButton,
} from "@/components/diplomatic/AIActionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAuthenticatedConvexQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/projets",
)({
  component: ProjetsPhase,
  validateSearch: (search: Record<string, unknown>) => ({
    targetId: (search.targetId as string) || undefined,
  }),
});

const PROJECT_TYPE_LABEL: Record<string, string> = {
  cooperation_agreement: "Accord de cooperation",
  commercial_contract: "Contrat commercial",
  technical_assistance: "Assistance technique",
  cultural_exchange: "Echange culturel",
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
    color: "bg-warning/15 text-warning",
    icon: Clock,
  },
  validated: {
    label: "Valide",
    color: "bg-primary/15 text-primary",
    icon: Shield,
  },
  in_progress: {
    label: "En cours",
    color: "bg-success/15 text-success",
    icon: Clock,
  },
  completed: {
    label: "Termine",
    color: "bg-success/15 text-success",
    icon: CheckCircle2,
  },
  suspended: {
    label: "Suspendu",
    color: "bg-warning/15 text-warning",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Annule",
    color: "bg-destructive/15 text-destructive",
    icon: XCircle,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectCard({ project }: { project: any }) {
  const config = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = config.icon;
  const requestDocx = useMutation(api.functions.diplomaticAffairs.requestProjectDocxGeneration);
  const requestPdf = useMutation(api.functions.diplomaticAffairs.requestProjectPdfGeneration);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleGenerateDocx = async () => {
    setGeneratingDocx(true);
    try {
      await requestDocx({ projectId: project._id });
      toast.success("Document DOCX en cours de generation. Il apparaitra dans iDocument.");
    } catch (error) {
      toast.error("Erreur lors de la generation du DOCX");
      console.error(error);
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      await requestPdf({ projectId: project._id });
      toast.success("PDF en cours de generation. Il apparaitra dans le dossier cible.");
    } catch (error) {
      toast.error("Erreur lors de la generation du PDF");
      console.error(error);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm leading-snug">
                {project.title}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {project.reference} • {PROJECT_TYPE_LABEL[project.projectType] ?? project.projectType}
              </CardDescription>
            </div>
          </div>
          <Badge className={cn("text-[10px] shrink-0 whitespace-nowrap", config.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {project.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {project.description}
          </p>
        )}

        {/* Objectifs */}
        {project.objectives.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Objectifs ({project.objectives.length})
            </p>
            {project.objectives.slice(0, 4).map((obj: { title: string; status: string }, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs ml-5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 mt-1",
                    obj.status === "completed" ? "bg-success"
                      : obj.status === "in_progress" ? "bg-primary"
                        : obj.status === "blocked" ? "bg-destructive"
                          : "bg-zinc-400",
                  )}
                />
                <span className="text-muted-foreground leading-snug">{obj.title}</span>
              </div>
            ))}
            {project.objectives.length > 4 && (
              <p className="text-[10px] text-muted-foreground ml-5">
                +{project.objectives.length - 4} autres objectifs
              </p>
            )}
          </div>
        )}

        {/* Parties prenantes */}
        {project.stakeholders.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              Parties prenantes ({project.stakeholders.length})
            </p>
            <div className="flex items-center gap-1.5 flex-wrap ml-5">
              {project.stakeholders.slice(0, 4).map((s: { name: string; role: string; organization: string }, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {s.name} ({s.role})
                </Badge>
              ))}
              {project.stakeholders.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{project.stakeholders.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Budget */}
        {project.budget && (
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Budget : <span className="font-medium text-foreground">{project.budget}</span>
            </p>
          </div>
        )}

        {/* Boutons de génération */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={handleGenerateDocx}
            disabled={generatingDocx}
          >
            {generatingDocx ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {generatingDocx ? "Génération..." : "Générer le .docx"}
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {generatingPdf ? "Génération..." : "Générer le .pdf"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjetsPhase() {
  const { activeOrgId } = useOrg();
  const search = useSearch({ from: "/_app/affaires-diplomatiques/projets" });

  // Dialog state
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectState, setProjectState] = useState<
    "idle" | "loading" | "result" | "error"
  >("idle");
  const [projectError, setProjectError] = useState("");
  const [projectResult, setProjectResult] = useState<{
    projectId: Id<"diplomaticProjects">;
    title: string;
    description: string;
    objectives: Array<{ title: string; status: string }>;
    stakeholders: Array<{
      name: string;
      role: string;
      organization: string;
    }>;
    budget: string;
    timeline: string;
    kpis: string[];
  } | null>(null);

  // Form fields
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [projectType, setProjectType] = useState<string>(
    "cooperation_agreement",
  );

  // Queries
  const { data: projects, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listProjects,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { data: targets } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listTargets,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { data: plans } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listPlans,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  // Action IA
  const structureProjectAction = useAction(
    api.ai.diplomaticAI.structureProject,
  );

  // Cibles eligibles (phase outreach, reporting, ou strategy — on laisse flexible)
  const eligibleTargets = targets?.filter(
    (t) =>
      t.pipelinePhase === "outreach" ||
      t.pipelinePhase === "reporting" ||
      t.pipelinePhase === "strategy",
  );

  // Plans filtres par cible
  const filteredPlans = plans?.filter(
    (p) => selectedTargetId && p.targetId === selectedTargetId,
  );

  // Pre-remplir depuis search params
  useEffect(() => {
    if (search.targetId && !showProjectDialog) {
      setSelectedTargetId(search.targetId);
      setShowProjectDialog(true);
    }
  }, [search.targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStructureProject = async () => {
    if (!activeOrgId || !selectedTargetId) {
      toast.error("Selectionnez une cible");
      return;
    }
    setProjectState("loading");
    setProjectError("");
    try {
      const result = await structureProjectAction({
        orgId: activeOrgId,
        targetId: selectedTargetId as Id<"diplomaticTargets">,
        planId: selectedPlanId
          ? (selectedPlanId as Id<"diplomaticPlans">)
          : undefined,
        projectType: projectType as
          | "cooperation_agreement"
          | "commercial_contract"
          | "technical_assistance"
          | "cultural_exchange"
          | "infrastructure"
          | "other",
      });
      setProjectResult(result);
      setProjectState("result");
      toast.success(
        `Projet "${result.title}" structure avec succes`,
      );
    } catch (error) {
      console.error("Erreur structuration projet:", error);
      setProjectError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la structuration du projet",
      );
      setProjectState("error");
    }
  };

  const resetDialog = () => {
    setProjectState("idle");
    setProjectResult(null);
    setProjectError("");
  };

  const selectedTargetName =
    selectedTargetId
      ? targets?.find((t) => t._id === selectedTargetId)?.name ?? ""
      : "";

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
          {projects?.length ?? 0} projet(s) de cooperation
        </p>
        <AIActionButton
          label="Structurer un projet"
          icon={Sparkles}
          onClick={() => {
            resetDialog();
            setShowProjectDialog(true);
          }}
          disabled={!eligibleTargets || eligibleTargets.length === 0}
        />
      </div>

      {/* Info si aucune cible eligible */}
      {eligibleTargets &&
        eligibleTargets.length === 0 &&
        targets &&
        targets.length > 0 && (
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-xs text-warning">
            Aucune cible en phase avancee. Progressez dans le pipeline
            (lettres, rapports) avant de structurer un projet.
          </div>
        )}

      {/* Liste des projets */}
      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Aucun projet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Apres validation par la haute autorite, etablissez des contrats
            et accords de cooperation.
          </p>
          <Button
            className="gap-1.5"
            disabled={!eligibleTargets || eligibleTargets.length === 0}
            onClick={() => {
              resetDialog();
              setShowProjectDialog(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            Structurer un projet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}

      {/* Dialog IA : Structurer un projet */}
      <AIActionPanel
        open={showProjectDialog}
        onOpenChange={(v) => {
          if (!v && projectState !== "loading") {
            setShowProjectDialog(false);
            resetDialog();
          }
        }}
        title="Structurer un projet de cooperation"
        description="L'IA structure un projet complet avec objectifs, parties prenantes, budget et calendrier."
        icon={Briefcase}
        state={projectState}
        errorMessage={projectError}
        onSubmit={handleStructureProject}
        submitLabel="Structurer le projet"
        loadingMessage={`Structuration du projet pour ${selectedTargetName}...`}
        validateLabel="Fermer"
        onValidate={() => {
          setShowProjectDialog(false);
          resetDialog();
        }}
        onRegenerate={handleStructureProject}
        inputForm={
          <div className="space-y-3">
            {/* Selection de la cible */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cible diplomatique *</Label>
              <Select
                value={selectedTargetId}
                onValueChange={(v) => {
                  setSelectedTargetId(v);
                  setSelectedPlanId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une cible..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTargets?.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                      {t.sector && ` — ${t.sector}`}
                      {t.pipelinePhase && ` (${t.pipelinePhase})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan lie */}
            {selectedTargetId &&
              filteredPlans &&
              filteredPlans.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Plan strategique lie (optionnel)
                  </Label>
                  <Select
                    value={selectedPlanId}
                    onValueChange={setSelectedPlanId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPlans.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {/* Type de projet */}
            <div className="space-y-1.5">
              <Label className="text-xs">Type de projet</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cooperation_agreement">
                    Accord de cooperation
                  </SelectItem>
                  <SelectItem value="commercial_contract">
                    Contrat commercial
                  </SelectItem>
                  <SelectItem value="technical_assistance">
                    Assistance technique
                  </SelectItem>
                  <SelectItem value="cultural_exchange">
                    Echange culturel
                  </SelectItem>
                  <SelectItem value="infrastructure">
                    Infrastructure
                  </SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        resultView={
          projectResult ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm font-medium mb-1">
                  {projectResult.title}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {projectResult.description}
                </p>
              </div>

              {/* Objectifs */}
              {projectResult.objectives.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Objectifs ({projectResult.objectives.length})
                  </p>
                  {projectResult.objectives.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-muted-foreground ml-5"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {obj.title}
                    </div>
                  ))}
                </div>
              )}

              {/* Parties prenantes */}
              {projectResult.stakeholders.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Parties prenantes
                  </p>
                  <div className="flex flex-wrap gap-1.5 ml-5">
                    {projectResult.stakeholders.map((s, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[9px]"
                      >
                        {s.name} — {s.role} ({s.organization})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget + Calendrier */}
              <div className="grid grid-cols-2 gap-2">
                {projectResult.budget && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">Budget</p>
                    <p className="text-xs font-medium">
                      {projectResult.budget}
                    </p>
                  </div>
                )}
                {projectResult.timeline && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Calendrier
                    </p>
                    <p className="text-xs font-medium">
                      {projectResult.timeline}
                    </p>
                  </div>
                )}
              </div>

              {/* KPIs */}
              {projectResult.kpis && projectResult.kpis.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-warning" />
                    Indicateurs de performance
                  </p>
                  <ul className="ml-5 space-y-0.5">
                    {projectResult.kpis.map((kpi, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-muted-foreground"
                      >
                        • {typeof kpi === "string" ? kpi : (kpi as { title?: string }).title ?? JSON.stringify(kpi)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-1 text-[10px] text-primary">
                <Sparkles className="h-3 w-3" />
                Projet structure par l'IA
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
