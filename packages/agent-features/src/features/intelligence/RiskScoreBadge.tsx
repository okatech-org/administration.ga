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
	minimal: "bg-muted/50 text-muted-foreground border-border/50",
	low: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	moderate:
		"bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
	high: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
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
			<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
				<Loader2 className="h-3 w-3 animate-spin" />
			</span>
		);
	}

	if (data.liveCount === 0) {
		return (
			<span
				className={cn(
					"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border",
					TIER_CLASSES.minimal,
				)}
				title="Aucune note vivante"
			>
				<ShieldCheck className="h-3 w-3" />
				{!compact && <span>Aucun signalement</span>}
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border font-medium",
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
