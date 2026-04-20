/**
 * PipelineStepper — Stepper horizontal 5 phases du pipeline diplomatique
 *
 * Affiche les 5 phases avec compteurs et navigation.
 * Utilisé comme barre de navigation secondaire dans le layout.
 */

import { Link, usePathname } from "@workspace/routing";
import {
	Target,
	BookOpen,
	Mail,
	FileText,
	Briefcase,
	ChevronRight,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export type PipelinePhase =
	| "targeting"
	| "strategy"
	| "outreach"
	| "reporting"
	| "project";

export type PhaseCounts = Record<PipelinePhase | "unassigned", number>;

const PHASES = [
	{
		id: "targeting" as const,
		label: "Cibles",
		shortLabel: "Cibles",
		icon: Target,
		href: "/affaires-diplomatiques/cibles",
		color: "text-blue-500",
		bg: "bg-blue-500/10",
		activeBg: "bg-blue-500",
	},
	{
		id: "strategy" as const,
		label: "Plan Stratégique",
		shortLabel: "Plans",
		icon: BookOpen,
		href: "/affaires-diplomatiques/plans",
		color: "text-amber-500",
		bg: "bg-amber-500/10",
		activeBg: "bg-amber-500",
	},
	{
		id: "outreach" as const,
		label: "Lettres",
		shortLabel: "Lettres",
		icon: Mail,
		href: "/affaires-diplomatiques/lettres",
		color: "text-cyan-500",
		bg: "bg-cyan-500/10",
		activeBg: "bg-cyan-500",
	},
	{
		id: "reporting" as const,
		label: "Rapports",
		shortLabel: "Rapports",
		icon: FileText,
		href: "/affaires-diplomatiques/rapports",
		color: "text-violet-500",
		bg: "bg-violet-500/10",
		activeBg: "bg-violet-500",
	},
	{
		id: "project" as const,
		label: "Projets",
		shortLabel: "Projets",
		icon: Briefcase,
		href: "/affaires-diplomatiques/projets",
		color: "text-emerald-500",
		bg: "bg-emerald-500/10",
		activeBg: "bg-emerald-500",
	},
] as const;

export function PipelineStepper({ counts }: { counts?: PhaseCounts }) {
	const currentPath = usePathname();

	return (
		<div className="flex items-center gap-1 overflow-x-auto pb-1">
			{PHASES.map((phase, i) => {
				const Icon = phase.icon;
				const count = counts?.[phase.id] ?? 0;
				const isActive = currentPath.includes(phase.href);

				return (
					<div key={phase.id} className="flex items-center">
						<Link
							href={phase.href}
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
								isActive
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							<Icon className="h-4 w-4" />
							<span className="hidden sm:inline">{phase.label}</span>
							<span className="sm:hidden">{phase.shortLabel}</span>
							{count > 0 && (
								<span
									className={cn(
										"inline-flex items-center justify-center h-5 min-w-5 px-1 text-[10px] font-bold rounded-full",
										isActive
											? "bg-primary-foreground/20 text-primary-foreground"
											: `${phase.bg} ${phase.color}`,
									)}
								>
									{count}
								</span>
							)}
						</Link>
						{i < PHASES.length - 1 && (
							<ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-0.5 shrink-0 hidden md:block" />
						)}
					</div>
				);
			})}
		</div>
	);
}

export { PHASES };
