"use client";

import { api } from "@convex/_generated/api";
import { Eye, Loader2 } from "lucide-react";
import { Link } from "@workspace/routing";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

const PRIORITY_LABELS: Record<string, string> = {
	low: "Faible",
	normal: "Normal",
	high: "Haute",
};

const PRIORITY_CLASSES: Record<string, string> = {
	low: "bg-muted/50 text-muted-foreground",
	normal: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	high: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function IntelligenceWatchlistsForTarget({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();

	const { data: watchlists, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceWatchlists.listForTarget,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	const visible = (watchlists ?? []).filter(Boolean);

	return (
		<FlatCard>
			<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
				<div className="rounded-md bg-rose-500/10 p-1.5">
					<Eye className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
				</div>
				<span className="text-base font-bold flex-1">Listes de surveillance</span>
				<Badge
					variant="outline"
					className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
				>
					{visible.length}
				</Badge>
			</div>
			<div className="p-4">
				{isPending ? (
					<div className="flex items-center justify-center py-4 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
					</div>
				) : visible.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-2">
						Cette cible n'est dans aucune liste.
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{visible.map((w) => (
							<Link
								key={w!._id}
								href={`/agence/watchlists/${w!._id}`}
								className="block rounded-lg border border-border/50 hover:border-rose-500/30 hover:bg-muted/40 transition-colors p-3"
							>
								<div className="flex items-start justify-between gap-2 mb-1.5">
									<p className="font-medium text-sm leading-tight truncate flex-1">
										{w!.name}
									</p>
									{w!.priority && (
										<Badge
											variant="outline"
											className={`text-[10px] h-4 px-1.5 shrink-0 ${PRIORITY_CLASSES[w!.priority] ?? ""}`}
										>
											{PRIORITY_LABELS[w!.priority] ?? w!.priority}
										</Badge>
									)}
								</div>
								{w!.theme && (
									<p className="text-[11px] text-muted-foreground truncate">
										{w!.theme}
									</p>
								)}
								{w!.comment && (
									<p className="text-[11px] text-muted-foreground/80 mt-1 italic line-clamp-2">
										« {w!.comment} »
									</p>
								)}
							</Link>
						))}
					</div>
				)}
			</div>
		</FlatCard>
	);
}
