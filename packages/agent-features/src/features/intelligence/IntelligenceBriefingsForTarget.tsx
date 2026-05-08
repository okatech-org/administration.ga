"use client";

import { api } from "@convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Link } from "@workspace/routing";
import { useState } from "react";
import { toast } from "sonner";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
	internal: "Interne",
	restricted: "Restreint",
	secret: "Secret",
	top_secret: "Très Secret",
};

export function IntelligenceBriefingsForTarget({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();

	const { data: briefings, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceBriefings.listBriefings,
		activeOrgId
			? { orgId: activeOrgId, targetType, targetId, limit: 20 }
			: "skip",
	);

	const { data: currentUser } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);

	const { mutateAsync: deleteBriefing } = useConvexMutationQuery(
		api.functions.intelligenceBriefings.deleteBriefing,
	);

	const [deletingId, setDeletingId] = useState<string | null>(null);

	const handleDelete = async (briefingId: string) => {
		if (!activeOrgId) return;
		const confirmed = window.confirm(
			"Supprimer ce briefing ? L'audit log conservera la trace.",
		);
		if (!confirmed) return;
		setDeletingId(briefingId);
		try {
			await deleteBriefing({ orgId: activeOrgId, briefingId: briefingId as never });
			toast.success("Briefing supprimé");
		} catch (e) {
			toast.error("Suppression impossible", {
				description: e instanceof Error ? e.message : undefined,
			});
		} finally {
			setDeletingId(null);
		}
	};

	const list = briefings ?? [];

	return (
		<FlatCard>
			<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
				<div className="rounded-md bg-amber-500/10 p-1.5">
					<Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
				</div>
				<span className="text-base font-bold flex-1">Briefings IA</span>
				<Badge
					variant="outline"
					className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
				>
					{list.length}
				</Badge>
			</div>
			<div className="p-4">
				{isPending ? (
					<div className="flex items-center justify-center py-4 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
					</div>
				) : list.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-2">
						Aucun briefing généré pour cette cible.
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{list.map((b) => {
							const isAuthor = currentUser?._id === b.generatedBy;
							const isDeleting = deletingId === b._id;
							return (
								<div
									key={b._id}
									className="rounded-lg border border-border/50 hover:border-amber-500/30 transition-colors p-3"
								>
									<div className="flex items-start justify-between gap-2 mb-1.5">
										<Link
											href={`/agence/briefings/${b._id}`}
											className="flex-1 min-w-0 hover:underline"
										>
											<p className="font-medium text-sm leading-tight line-clamp-2">
												{b.title}
											</p>
										</Link>
										{isAuthor && (
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 shrink-0 text-muted-foreground hover:text-rose-500"
												onClick={() => handleDelete(b._id)}
												disabled={isDeleting}
												title="Supprimer le briefing"
											>
												{isDeleting ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													<Trash2 className="h-3 w-3" />
												)}
											</Button>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-1.5">
										<Badge variant="outline" className="text-[10px] h-4 px-1.5">
											{CLASSIFICATION_LABELS[b.classification] ?? b.classification}
										</Badge>
										<span className="text-[11px] text-muted-foreground">
											{formatDistanceToNow(b.generatedAt, {
												addSuffix: true,
												locale: fr,
											})}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</FlatCard>
	);
}
