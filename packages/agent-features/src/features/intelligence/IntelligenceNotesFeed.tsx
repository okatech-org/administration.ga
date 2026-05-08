"use client";

import { api } from "@convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ArrowRight, Loader2, StickyNote } from "lucide-react";
import { Link } from "@workspace/routing";
import { motion, AnimatePresence } from "motion/react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

const SEVERITY_LABELS: Record<string, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

const SEVERITY_CLASSES: Record<string, string> = {
	low: "bg-muted/50 text-muted-foreground border-border/50",
	medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	high:
		"bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
	critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
	observation: "Observation",
	risk: "Risque",
	flag: "Signalement",
	lead: "Piste",
};

const TYPE_LABELS: Record<string, string> = {
	profile: "Citoyen",
	child_profile: "Mineur",
	diplomatic_target: "Contact",
	agent: "Agent",
};

export default function IntelligenceNotesFeed() {
	const { activeOrgId } = useOrg();

	const { data: notes, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceNotes.listCritical,
		activeOrgId ? { orgId: activeOrgId, limit: 50 } : "skip",
	);

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<StickyNote className="h-5 w-5 text-rose-500" />}
				title="Notes critiques"
				subtitle="Flux des notes Renseignement de niveau élevé ou critique."
			/>

			<FlatCard>
				<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
					<div className="rounded-md bg-rose-500/10 p-1.5">
						<AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
					</div>
					<span className="text-base font-bold flex-1">Signalements actifs</span>
					{notes && (
						<Badge
							variant="outline"
							className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
						>
							{notes.length}
						</Badge>
					)}
				</div>

				<div className="p-4">
					{isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full rounded-lg" />
							<Skeleton className="h-20 w-full rounded-lg" />
							<Skeleton className="h-20 w-full rounded-lg" />
						</div>
					) : !notes?.length ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
								<StickyNote className="h-6 w-6 text-muted-foreground/40" />
							</div>
							<p className="text-sm font-medium">Aucune note critique</p>
							<p className="text-xs text-muted-foreground mt-1">
								Les signalements de niveau élevé ou critique s'affichent ici.
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<AnimatePresence mode="popLayout">
								{notes.map((n, i) => (
									<motion.div
										key={n._id}
										layout
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: i * 0.02 }}
									>
										<Link
											href={`/agence/profiles/${n.targetType}/${n.targetId}`}
											className="block rounded-lg border border-border/50 bg-background/60 hover:bg-muted/40 hover:border-rose-500/30 transition-all p-3 space-y-2"
										>
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="text-xs font-medium">
													{CATEGORY_LABELS[n.category] ?? n.category}
												</span>
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] h-4 px-1.5",
														SEVERITY_CLASSES[n.severity] ?? "",
													)}
												>
													{SEVERITY_LABELS[n.severity] ?? n.severity}
												</Badge>
												<Badge
													variant="outline"
													className="text-[10px] h-4 px-1.5 bg-muted/50 text-muted-foreground border-border/50"
												>
													{TYPE_LABELS[n.targetType] ?? n.targetType}
												</Badge>
												<span className="ml-auto text-[11px] text-muted-foreground">
													{formatDistanceToNow(n._creationTime, {
														addSuffix: true,
														locale: fr,
													})}
												</span>
											</div>
											<p className="text-sm whitespace-pre-wrap line-clamp-3">
												{n.content}
											</p>
											<div className="flex items-center justify-end pt-1 border-t border-border/30">
												<span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
													Ouvrir la fiche <ArrowRight className="h-3 w-3" />
												</span>
											</div>
										</Link>
									</motion.div>
								))}
							</AnimatePresence>
						</div>
					)}
				</div>
			</FlatCard>
		</div>
	);
}
