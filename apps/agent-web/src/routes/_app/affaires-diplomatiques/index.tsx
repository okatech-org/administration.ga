/**
 * Affaires Diplomatiques — Dashboard Pipeline (vue d'ensemble)
 *
 * Synthèse du pipeline avec compteurs par phase, activité récente,
 * et accès rapide aux actions IA.
 */

import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Target,
  BookOpen,
  Mail,
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { useOrg } from "@/components/org/org-provider";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/",
)({
  component: PipelineDashboard,
});

const PHASE_CARDS = [
  {
    id: "targeting",
    label: "Cibles",
    desc: "Entreprises et organismes identifiés",
    icon: Target,
    href: "/affaires-diplomatiques/cibles",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    borderHover: "hover:border-blue-500/30",
    aiAction: "Découvrir via l'IA",
  },
  {
    id: "strategy",
    label: "Plans Stratégiques",
    desc: "Stratégies de partenariat élaborées",
    icon: BookOpen,
    href: "/affaires-diplomatiques/plans",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/30",
    aiAction: "Élaborer une stratégie",
  },
  {
    id: "outreach",
    label: "Lettres de Contact",
    desc: "Courriers et invitations officiels",
    icon: Mail,
    href: "/affaires-diplomatiques/lettres",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    borderHover: "hover:border-cyan-500/30",
    aiAction: "Rédiger une lettre",
  },
  {
    id: "reporting",
    label: "Rapports",
    desc: "Rapports à la hiérarchie",
    icon: FileText,
    href: "/affaires-diplomatiques/rapports",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    borderHover: "hover:border-violet-500/30",
    aiAction: "Compiler un rapport",
  },
  {
    id: "project",
    label: "Projets",
    desc: "Projets de coopération validés",
    icon: Briefcase,
    href: "/affaires-diplomatiques/projets",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/30",
    aiAction: "Structurer un projet",
  },
] as const;

function PipelineDashboard() {
  const { activeOrgId } = useOrg();

  const { data: stats, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getDashboardStats,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const phaseCount = (id: string): number => {
    if (!stats) return 0;
    return stats.targets?.byPhase?.[id] ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Cibles totales"
          value={stats?.targets?.total ?? 0}
          color="text-blue-500"
        />
        <StatCard
          label="Lettres envoyées"
          value={stats?.letters?.byStatus?.sent ?? 0}
          color="text-cyan-500"
        />
        <StatCard
          label="Rapports soumis"
          value={stats?.reports?.total ?? 0}
          color="text-violet-500"
        />
        <StatCard
          label="Projets actifs"
          value={stats?.projects?.active ?? 0}
          color="text-emerald-500"
        />
      </div>

      {/* Cartes par phase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PHASE_CARDS.map((phase, i) => {
          const Icon = phase.icon;
          const count = phaseCount(phase.id);

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <Link to={phase.href} className="block">
                <Card
                  className={cn(
                    "transition-all cursor-pointer group",
                    phase.borderHover,
                  )}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                        phase.bg,
                      )}
                    >
                      <Icon className={cn("h-6 w-6", phase.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{phase.label}</p>
                        <span
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            phase.color,
                          )}
                        >
                          {count}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {phase.desc}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="h-3 w-3" />
                        {phase.aiAction}
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="py-3 text-center">
        <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
