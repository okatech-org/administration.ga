/**
 * TargetPipelineCard — Carte cible avec indicateur de phase pipeline
 */

import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@workspace/routing";
import {
	Building2,
	Globe2,
	Target,
	BookOpen,
	FileText,
	MapPin,
	ArrowRight,
	Sparkles,
	Archive,
	User,
	Briefcase,
	Loader2,
	Mail,
	BarChart3,
	type LucideIcon,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../../components/my-space/flat-card";
import { cn } from "@workspace/ui/lib/utils";
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

// Configuration des actions par phase
const PHASE_ACTION_CONFIG: Record<
	string,
	{ label: string; icon: LucideIcon }
> = {
	strategy: { label: "Rediger une lettre", icon: Mail },
	outreach: { label: "Compiler un rapport", icon: BarChart3 },
	reporting: { label: "Structurer un projet", icon: Briefcase },
};

export function TargetPipelineCard({
	target,
	showPhase = true,
	onArchive,
	onGenerateStrategy,
	isGeneratingStrategy,
	onPhaseAction,
}: {
	target: TargetData;
	showPhase?: boolean;
	onArchive?: (targetId: Id<"diplomaticTargets">) => void;
	onGenerateStrategy?: (targetId: Id<"diplomaticTargets">) => void;
	isGeneratingStrategy?: boolean;
	onPhaseAction?: (targetId: Id<"diplomaticTargets">, phase: string) => void;
}) {
	const st = TARGET_STATUS[target.status] ?? TARGET_STATUS.identified;
	const tp = TARGET_TYPE[target.type] ?? TARGET_TYPE.other;
	const TpIcon = tp.icon;
	const phase = target.pipelinePhase
		? PHASE_LABEL[target.pipelinePhase]
		: null;

	return (
		<Link
			href={`/affaires-diplomatiques/${target._id}`}
			className="block"
		>
			<FlatCard className="cursor-pointer group">
				<div className="p-3 lg:p-4 pb-2 space-y-1.5">
					{/* Ligne 1 : Icone + Nom + Bouton archive */}
					<div className="flex items-start gap-2">
						<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
							<TpIcon className="h-4 w-4 text-primary" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium line-clamp-2 leading-tight">
								{target.name}
							</p>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								{tp.label}
							</p>
						</div>
						{onArchive && (
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
								title="Archiver cette cible"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onArchive(target._id);
								}}
							>
								<Archive className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
					{/* Ligne 2 : Badges phase + statut */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{showPhase && phase && (
							<Badge className={cn("text-[9px]", phase.color)}>
								{phase.label}
							</Badge>
						)}
						<Badge className={cn("text-[9px]", st.color)}>{st.label}</Badge>
					</div>
				</div>

				<div className="px-3 lg:px-4 pb-3 lg:pb-4 space-y-2.5">
					{/* Section metadata structuree */}
					<div className="space-y-1">
						{target.sector && (
							<div className="flex items-start gap-1.5 text-xs text-muted-foreground">
								<Briefcase className="h-3 w-3 shrink-0 mt-0.5" />
								<span className="line-clamp-2">{target.sector}</span>
							</div>
						)}
						{target.country && (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<MapPin className="h-3 w-3 shrink-0" />
								{target.city
									? `${target.city}, ${target.country}`
									: target.country}
							</div>
						)}
						{target.contactName && (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<User className="h-3 w-3 shrink-0" />
								Contact : {target.contactName}
							</div>
						)}
					</div>

					{/* Section AI insight */}
					{target.matchReason && (
						<div className="rounded-lg bg-primary/5 p-2">
							<div className="flex items-start gap-1.5 text-xs text-muted-foreground">
								<Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
								<span className="line-clamp-3">{target.matchReason}</span>
							</div>
						</div>
					)}
					{target.description && !target.matchReason && (
						<p className="text-xs text-muted-foreground line-clamp-2">
							{target.description}
						</p>
					)}

					{/* Footer : priorite + score + tags */}
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

					{/* CTA : Generer plan strategique (phase targeting uniquement) */}
					{target.pipelinePhase === "targeting" && onGenerateStrategy && (
						<Button
							variant="outline"
							size="sm"
							className="w-full gap-1.5 text-xs"
							disabled={isGeneratingStrategy}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onGenerateStrategy(target._id);
							}}
						>
							{isGeneratingStrategy ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Sparkles className="h-3.5 w-3.5" />
							)}
							{isGeneratingStrategy
								? "Elaboration en cours..."
								: "Generer plan strategique"}
						</Button>
					)}

					{/* CTA : Actions pour les phases suivantes */}
					{target.pipelinePhase &&
						target.pipelinePhase !== "targeting" &&
						target.pipelinePhase !== "project" &&
						onPhaseAction &&
						PHASE_ACTION_CONFIG[target.pipelinePhase] && (() => {
							const actionConfig = PHASE_ACTION_CONFIG[target.pipelinePhase!];
							const ActionIcon = actionConfig.icon;
							return (
								<Button
									variant="outline"
									size="sm"
									className="w-full gap-1.5 text-xs"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onPhaseAction(target._id, target.pipelinePhase!);
									}}
								>
									<ActionIcon className="h-3.5 w-3.5" />
									{actionConfig.label}
								</Button>
							);
						})()}
				</div>
			</FlatCard>
		</Link>
	);
}
