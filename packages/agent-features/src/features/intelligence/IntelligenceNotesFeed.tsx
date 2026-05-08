"use client";

import { api } from "@convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Loader2, StickyNote } from "lucide-react";
import { Link } from "@workspace/routing";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

const SEVERITY_CLASSES: Record<string, string> = {
	low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
	medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
	high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
	critical: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

const SEVERITY_LABELS: Record<string, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

const CATEGORY_LABELS: Record<string, string> = {
	observation: "Observation",
	risk: "Risque",
	flag: "Signalement",
	lead: "Piste",
};

export default function IntelligenceNotesFeed() {
	const { activeOrgId } = useOrg();

	const { data: notes, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceNotes.listCritical,
		activeOrgId ? { orgId: activeOrgId, limit: 50 } : "skip",
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-4xl mx-auto w-full">
			<PageHeader
				icon={<StickyNote className="h-5 w-5 text-rose-500" />}
				title="Notes critiques"
				subtitle="Flux des notes Renseignement de niveau élevé ou critique."
			/>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : !notes?.length ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Aucune note critique pour l'instant.
				</FlatCard>
			) : (
				<div className="space-y-2">
					{notes.map((n) => (
						<Link
							key={n._id}
							href={`/intelligence/profiles/${n.targetType}/${n.targetId}`}
							className="block"
						>
							<FlatCard className="p-3 space-y-1.5 hover:bg-foreground/5 transition-colors">
								<div className="flex items-center gap-2 text-xs">
									<AlertTriangle className="h-3 w-3" />
									<span className="font-medium">
										{CATEGORY_LABELS[n.category] ?? n.category}
									</span>
									<span
										className={cn(
											"px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
											SEVERITY_CLASSES[n.severity] ?? "",
										)}
									>
										{SEVERITY_LABELS[n.severity] ?? n.severity}
									</span>
									<span className="ml-auto text-muted-foreground">
										{formatDistanceToNow(n._creationTime, {
											addSuffix: true,
											locale: fr,
										})}
									</span>
								</div>
								<p className="text-sm whitespace-pre-wrap line-clamp-3">
									{n.content}
								</p>
							</FlatCard>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
