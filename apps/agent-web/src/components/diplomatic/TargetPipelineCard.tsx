/**
 * TargetPipelineCard — Carte cible avec indicateur de phase pipeline
 */

import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Globe2,
  Target,
  BookOpen,
  FileText,
  MapPin,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PipelinePhase } from "./PipelineStepper";

const TARGET_STATUS: Record<string, { label: string; color: string }> = {
  identified: { label: "Identifié", color: "bg-zinc-500/15 text-zinc-400" },
  contacted: { label: "Contacté", color: "bg-blue-500/15 text-blue-400" },
  in_discussion: {
    label: "En discussion",
    color: "bg-amber-500/15 text-amber-400",
  },
  partnership: {
    label: "Partenaire",
    color: "bg-emerald-500/15 text-emerald-400",
  },
  inactive: { label: "Inactif", color: "bg-red-500/15 text-red-400" },
};

const TARGET_TYPE: Record<string, { label: string; icon: LucideIcon }> = {
  enterprise: { label: "Entreprise", icon: Building2 },
  government: { label: "Gouvernement", icon: Globe2 },
  ngo: { label: "ONG", icon: Target },
  international_org: { label: "Org. Internationale", icon: Globe2 },
  academic: { label: "Académique", icon: BookOpen },
  media: { label: "Média", icon: FileText },
  other: { label: "Autre", icon: Target },
};

const PHASE_LABEL: Record<string, { label: string; color: string }> = {
  targeting: { label: "Ciblage", color: "bg-blue-500/15 text-blue-500" },
  strategy: { label: "Stratégie", color: "bg-amber-500/15 text-amber-500" },
  outreach: { label: "Contact", color: "bg-cyan-500/15 text-cyan-500" },
  reporting: { label: "Rapport", color: "bg-violet-500/15 text-violet-500" },
  project: { label: "Projet", color: "bg-emerald-500/15 text-emerald-500" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-blue-400",
  high: "text-amber-400",
  critical: "text-red-400",
};

interface TargetData {
  _id: Id<"diplomaticTargets">;
  name: string;
  type: string;
  status: string;
  priority: string;
  country?: string;
  city?: string;
  sector?: string;
  contactName?: string;
  description?: string;
  tags: string[];
  pipelinePhase?: PipelinePhase;
  opportunityScore?: number;
  matchReason?: string;
}

export function TargetPipelineCard({
  target,
  showPhase = true,
}: {
  target: TargetData;
  showPhase?: boolean;
}) {
  const st = TARGET_STATUS[target.status] ?? TARGET_STATUS.identified;
  const tp = TARGET_TYPE[target.type] ?? TARGET_TYPE.other;
  const TpIcon = tp.icon;
  const phase = target.pipelinePhase
    ? PHASE_LABEL[target.pipelinePhase]
    : null;

  return (
    <Link
      to={"/affaires-diplomatiques/$targetId" as string}
      params={{ targetId: target._id }}
      className="block"
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TpIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">{target.name}</CardTitle>
                <CardDescription className="text-[10px]">
                  {tp.label}
                  {target.sector && ` • ${target.sector}`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {showPhase && phase && (
                <Badge className={cn("text-[9px]", phase.color)}>
                  {phase.label}
                </Badge>
              )}
              <Badge className={cn("text-[9px]", st.color)}>{st.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {target.country && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {target.city ? `${target.city}, ${target.country}` : target.country}
            </div>
          )}
          {target.contactName && (
            <p className="text-xs text-muted-foreground">
              Contact : {target.contactName}
            </p>
          )}
          {target.matchReason && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <span className="line-clamp-2">{target.matchReason}</span>
            </div>
          )}
          {target.description && !target.matchReason && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {target.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-[8px]", PRIORITY_COLOR[target.priority])}
              >
                {target.priority}
              </Badge>
              {target.opportunityScore != null && (
                <Badge variant="outline" className="text-[8px] text-primary">
                  Score: {target.opportunityScore}%
                </Badge>
              )}
              {target.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[8px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
