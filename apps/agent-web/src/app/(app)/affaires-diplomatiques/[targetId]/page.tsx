"use client";

/**
 * Vue détail pipeline d'une cible — Timeline complète
 *
 * Affiche toutes les phases traversées par une cible :
 * Target → Plans → Lettres → Rapports → Projets
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  CheckCircle2,
  Clock,
  FolderOpen,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { FolderExplorer } from "@/components/diplomatic/FolderExplorer";


// Couleurs mappees vers les tokens du design system (voir DESIGN_CHARTER.md)
// 4 accents autorisees : primary (bleu), success (vert), warning (amber), destructive (rose)
const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Target }
> = {
  targeting: {
    label: "Ciblage",
    color: "text-primary",
    bg: "bg-primary/10",
    icon: Target,
  },
  strategy: {
    label: "Stratégie",
    color: "text-warning",
    bg: "bg-warning/10",
    icon: BookOpen,
  },
  outreach: {
    label: "Contact",
    color: "text-success",
    bg: "bg-success/10",
    icon: Mail,
  },
  reporting: {
    label: "Rapport",
    color: "text-destructive",
    bg: "bg-destructive/10",
    icon: FileText,
  },
  project: {
    label: "Projet",
    color: "text-primary",
    bg: "bg-primary/10",
    icon: Briefcase,
  },
};

// Configuration des actions par phase
const PHASE_ACTIONS: Record<
  string,
  { label: string; nextLabel: string; icon: typeof Mail; route: string; color: string; bg: string }
> = {
  targeting: {
    label: "Phase Ciblage",
    nextLabel: "Generer un plan strategique",
    icon: BookOpen,
    route: "/affaires-diplomatiques/cibles",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  strategy: {
    label: "Phase Strategie",
    nextLabel: "Rediger une lettre de contact",
    icon: Mail,
    route: "/affaires-diplomatiques/lettres",
    color: "text-success",
    bg: "bg-success/10",
  },
  outreach: {
    label: "Phase Contact",
    nextLabel: "Compiler un rapport d'activite",
    icon: BarChart3,
    route: "/affaires-diplomatiques/rapports",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  reporting: {
    label: "Phase Rapport",
    nextLabel: "Structurer un projet de cooperation",
    icon: Briefcase,
    route: "/affaires-diplomatiques/projets",
    color: "text-primary",
    bg: "bg-primary/10",
  },
};

export default function TargetPipelineDetail() {
  const { targetId } = useParams();
  const router = useRouter();

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
        <Link href="/affaires-diplomatiques/cibles">
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
          <Link href="/affaires-diplomatiques/cibles">
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

      {/* Bandeau action : prochaine etape du pipeline */}
      {target.pipelinePhase &&
        target.pipelinePhase !== "project" &&
        PHASE_ACTIONS[target.pipelinePhase] && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            {(() => {
              const action = PHASE_ACTIONS[target.pipelinePhase!];
              const ActionIcon = action.icon;
              return (
                <FlatCard className="border-dashed border-primary/30 bg-primary/5">
                  <div className="p-3 lg:p-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        action.bg,
                      )}
                    >
                      <ActionIcon className={cn("h-4.5 w-4.5", action.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Prochaine etape</p>
                      <p className="text-[10px] text-muted-foreground">
                        {action.nextLabel}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs shrink-0"
                      onClick={() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        void router.push(`${action.route}?targetId=${target._id}`);
                      }}
                    >
                      {action.nextLabel.split(" ").slice(0, 2).join(" ")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </FlatCard>
              );
            })()}
          </motion.div>
        )}

      {/* Timeline du pipeline */}
      <div className="space-y-4">
        {/* Plans strategiques lies */}
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
                <FlatCard key={plan._id} className="bg-muted/30">
                  <div className="p-3 lg:p-4">
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
                  </div>
                </FlatCard>
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
                <FlatCard key={letter._id} className="bg-muted/30">
                  <div className="p-3 lg:p-4">
                    <p className="text-sm font-medium">{letter.subject}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {letter.reference} • {letter.status}
                      {letter.aiDraftContent && " • Brouillon IA"}
                    </p>
                  </div>
                </FlatCard>
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
                <FlatCard key={project._id} className="bg-muted/30">
                  <div className="p-3 lg:p-4">
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
                  </div>
                </FlatCard>
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
