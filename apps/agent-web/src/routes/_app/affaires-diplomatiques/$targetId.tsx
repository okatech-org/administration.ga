/**
 * Vue détail pipeline d'une cible — Timeline complète
 *
 * Affiche toutes les phases traversées par une cible :
 * Target → Plans → Lettres → Rapports → Projets
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Target,
  BookOpen,
  Mail,
  Briefcase,
  Loader2,
  Sparkles,
  MapPin,
  Globe2,
  Building2,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  FolderOpen,
} from "lucide-react";
import { motion } from "motion/react";
import { useOrg } from "@/components/org/org-provider";
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
import { FolderExplorer } from "@/components/diplomatic/FolderExplorer";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/$targetId",
)({
  component: TargetPipelineDetail,
});

const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Target }
> = {
  targeting: {
    label: "Ciblage",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Target,
  },
  strategy: {
    label: "Stratégie",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    icon: BookOpen,
  },
  outreach: {
    label: "Contact",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    icon: Mail,
  },
  reporting: {
    label: "Rapport",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    icon: FileText,
  },
  project: {
    label: "Projet",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    icon: Briefcase,
  },
};

function TargetPipelineDetail() {
  const { targetId } = Route.useParams();

  const { data: pipeline, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getTargetPipeline,
    { targetId: targetId as Id<"diplomaticTargets"> },
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cible introuvable</p>
        <Link to="/affaires-diplomatiques/cibles">
          <Button variant="outline" size="sm" className="mt-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Retour aux cibles
          </Button>
        </Link>
      </div>
    );
  }

  const { target, plans, letters, projects } = pipeline;
  const phase = target.pipelinePhase
    ? PHASE_CONFIG[target.pipelinePhase]
    : PHASE_CONFIG.targeting;

  return (
    <div className="space-y-6">
      {/* Header cible */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start gap-4">
          <Link to="/affaires-diplomatiques/cibles">
            <Button variant="ghost" size="icon" className="shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold">{target.name}</h2>
              {phase && (
                <Badge className={cn("text-[9px]", phase.bg, phase.color)}>
                  {phase.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {target.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {target.city
                    ? `${target.city}, ${target.country}`
                    : target.country}
                </span>
              )}
              {target.sector && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {target.sector}
                </span>
              )}
              {target.website && (
                <span className="flex items-center gap-1">
                  <Globe2 className="h-3 w-3" />
                  {target.website}
                </span>
              )}
            </div>
            {target.matchReason && (
              <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                {target.matchReason}
              </div>
            )}
            {target.opportunityScore != null && (
              <Badge variant="outline" className="text-xs mt-2">
                Score d'opportunité : {target.opportunityScore}%
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Timeline du pipeline */}
      <div className="space-y-4">
        {/* Plans stratégiques liés */}
        <TimelineSection
          title="Plans Stratégiques"
          icon={BookOpen}
          color="text-amber-500"
          bg="bg-amber-500/10"
          count={plans.length}
        >
          {plans.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Aucun plan stratégique lié à cette cible.
            </p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <Card key={plan._id} className="bg-muted/30">
                  <CardContent className="py-2 px-3">
                    <p className="text-sm font-medium">{plan.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {plan.category} • {plan.status}
                      {plan.aiGeneratedContent && " • IA"}
                    </p>
                    {plan.objectives.length > 0 && (
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        {plan.objectives.filter((o) => o.status === "completed")
                          .length}
                        /{plan.objectives.length} objectifs
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TimelineSection>

        {/* Lettres liées */}
        <TimelineSection
          title="Lettres de Contact"
          icon={Mail}
          color="text-cyan-500"
          bg="bg-cyan-500/10"
          count={letters.length}
        >
          {letters.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Aucune lettre envoyée à cette cible.
            </p>
          ) : (
            <div className="space-y-2">
              {letters.map((letter) => (
                <Card key={letter._id} className="bg-muted/30">
                  <CardContent className="py-2 px-3">
                    <p className="text-sm font-medium">{letter.subject}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {letter.reference} • {letter.status}
                      {letter.aiDraftContent && " • Brouillon IA"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TimelineSection>

        {/* Projets liés */}
        <TimelineSection
          title="Projets de Coopération"
          icon={Briefcase}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          count={projects.length}
        >
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Aucun projet de coopération pour cette cible.
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Card key={project._id} className="bg-muted/30">
                  <CardContent className="py-2 px-3">
                    <p className="text-sm font-medium">{project.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {project.reference} • {project.status}
                      {project.budget && ` • ${project.budget}`}
                    </p>
                    {project.objectives.length > 0 && (
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <Clock className="h-3 w-3 text-blue-400" />
                        {project.objectives.length} objectifs
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TimelineSection>

        {/* Dossier Opérateur */}
        <TimelineSection
          title="Dossier Opérateur"
          icon={FolderOpen}
          color="text-violet-500"
          bg="bg-violet-500/10"
          count={0}
        >
          <FolderExplorer targetId={targetId as Id<"diplomaticTargets">} />
        </TimelineSection>
      </div>
    </div>
  );
}

function TimelineSection({
  title,
  icon: Icon,
  color,
  bg,
  count,
  children,
}: {
  title: string;
  icon: typeof Target;
  color: string;
  bg: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            bg,
          )}
        >
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="w-px flex-1 bg-border/50 my-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <Badge variant="secondary" className="text-[9px]">
            {count}
          </Badge>
        </div>
        {children}
      </div>
    </div>
  );
}
