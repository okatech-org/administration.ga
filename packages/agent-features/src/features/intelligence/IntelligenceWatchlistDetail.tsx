"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ArrowLeft, Eye, Loader2, Trash2 } from "lucide-react";
import { Link } from "@workspace/routing";
import { toast } from "sonner";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

const TYPE_LABELS: Record<string, string> = {
	profile: "Citoyen",
	child_profile: "Mineur",
	diplomatic_target: "Contact",
	agent: "Agent",
};

interface Props {
	watchlistId: string;
}

export default function IntelligenceWatchlistDetail({ watchlistId }: Props) {
	const { activeOrgId } = useOrg();

	const { data: watchlist, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceWatchlists.get,
		activeOrgId
			? {
					orgId: activeOrgId,
					watchlistId: watchlistId as Id<"intelligenceWatchlists">,
				}
			: "skip",
	);

	const { mutateAsync: removeItem } = useConvexMutationQuery(
		api.functions.intelligenceWatchlists.removeItem,
	);

	const handleRemove = async (itemId: Id<"intelligenceWatchlistItems">) => {
		if (!activeOrgId) return;
		try {
			await removeItem({ itemId, orgId: activeOrgId });
			toast.success("Cible retirée");
		} catch (_e) {
			toast.error("Impossible de retirer la cible");
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-4xl mx-auto w-full">
			<div>
				<Link href="/intelligence/watchlists">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-1" /> Retour aux listes
					</Button>
				</Link>
			</div>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : !watchlist ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Liste introuvable.
				</FlatCard>
			) : (
				<>
					<PageHeader
						icon={<Eye className="h-5 w-5 text-rose-500" />}
						title={watchlist.name}
						subtitle={watchlist.description ?? "Liste de surveillance"}
					/>
					<FlatCard>
						<div className="p-3 border-b border-foreground/5 text-sm font-semibold">
							Cibles ({watchlist.items.length})
						</div>
						{watchlist.items.length === 0 ? (
							<p className="p-6 text-center text-sm text-muted-foreground">
								Aucune cible ajoutée à cette liste pour l'instant.
								Utilisez le bouton « Ajouter à une liste » depuis la fiche
								d'un profil.
							</p>
						) : (
							<div className="divide-y divide-foreground/5">
								{watchlist.items.map((it) => (
									<div
										key={it._id}
										className="flex items-center justify-between p-3 gap-2"
									>
										<Link
											href={`/intelligence/profiles/${it.targetType}/${it.targetId}`}
											className="flex-1 min-w-0"
										>
											<p className="text-sm font-medium truncate">{it.label}</p>
											{it.sublabel && (
												<p className="text-xs text-muted-foreground truncate">
													{it.sublabel}
												</p>
											)}
										</Link>
										<span className="text-xs text-muted-foreground">
											{TYPE_LABELS[it.targetType] ?? it.targetType}
										</span>
										{watchlist.isOwner && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleRemove(it._id)}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										)}
									</div>
								))}
							</div>
						)}
					</FlatCard>
				</>
			)}
		</div>
	);
}
