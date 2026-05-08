"use client";

import { api } from "@convex/_generated/api";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

import { useOrg } from "../../shell/org-provider";

const TIER_LABELS: Record<string, string> = {
	minimal: "Risque minimal",
	low: "Risque faible",
	moderate: "Risque modéré",
	high: "Risque élevé",
};

const TIER_CLASSES: Record<string, string> = {
	minimal: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
	low: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
	moderate: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
	high: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
	/** Affichage compact (sans le label tier) */
	compact?: boolean;
}

export function RiskScoreBadge({ targetType, targetId, compact = false }: Props) {
	const { activeOrgId } = useOrg();

	const { data, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getRiskScore,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	if (isLoading || !data) {
		return (
			<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
				<Loader2 className="h-3 w-3 animate-spin" />
			</span>
		);
	}

	if (data.liveCount === 0) {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs",
					TIER_CLASSES.minimal,
				)}
				title="Aucune note vivante"
			>
				<ShieldCheck className="h-3 w-3" />
				{compact ? "—" : "Aucun signalement"}
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
				TIER_CLASSES[data.tier] ?? TIER_CLASSES.minimal,
			)}
			title={`Score : ${data.score}/100 — ${data.liveCount} note${data.liveCount > 1 ? "s" : ""} vivante${data.liveCount > 1 ? "s" : ""}`}
		>
			<ShieldAlert className="h-3 w-3" />
			<span className="tabular-nums font-bold">{data.score}</span>
			{!compact && (
				<span className="opacity-90">{TIER_LABELS[data.tier] ?? data.tier}</span>
			)}
		</span>
	);
}
