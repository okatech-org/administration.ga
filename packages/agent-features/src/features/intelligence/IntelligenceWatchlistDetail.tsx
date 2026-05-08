"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	ArrowLeft,
	Building2,
	Baby,
	Eye,
	Loader2,
	Lock,
	Trash2,
	UserCircle,
	Users,
} from "lucide-react";
import { Link } from "@workspace/routing";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
	profile: { label: "Citoyen", icon: Users, color: "text-blue-600 dark:text-blue-400" },
	child_profile: { label: "Mineur", icon: Baby, color: "text-amber-600 dark:text-amber-400" },
	diplomatic_target: {
		label: "Contact",
		icon: Building2,
		color: "text-emerald-600 dark:text-emerald-400",
	},
	agent: { label: "Agent", icon: UserCircle, color: "text-rose-600 dark:text-rose-400" },
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
		<div className="flex flex-col gap-4 p-4 lg:p-6 max-w-6xl mx-auto w-full">
			<div className="flex items-center gap-3 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
				<Link href="/agence/watchlists">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-1" /> Listes
					</Button>
				</Link>
				<div className="text-muted-foreground/40">/</div>
				<span className="text-sm font-medium truncate flex-1 min-w-0">
					{watchlist?.name ?? "Liste"}
				</span>
			</div>

			{isPending ? (
				<div className="space-y-3">
					<Skeleton className="h-24 w-full rounded-xl" />
					<Skeleton className="h-48 w-full rounded-xl" />
				</div>
			) : !watchlist ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Liste introuvable.
				</FlatCard>
			) : (
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					className="space-y-4"
				>
					{/* Liste header card */}
					<FlatCard>
						<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
							<div className="rounded-md bg-rose-500/10 p-1.5">
								<Eye className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
							</div>
							<span className="text-base font-bold flex-1 truncate">
								{watchlist.name}
							</span>
							{watchlist.visibility === "private" ? (
								<Badge
									variant="outline"
									className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
								>
									<Lock className="h-2.5 w-2.5 mr-1" /> Privée
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="text-[10px] h-5 px-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
								>
									<Users className="h-2.5 w-2.5 mr-1" />
									{watchlist.visibility === "directorate" ? "Direction" : "Partagée"}
								</Badge>
							)}
						</div>
						{watchlist.description && (
							<div className="px-4 py-3 text-sm text-muted-foreground border-b border-border/30">
								{watchlist.description}
							</div>
						)}
						<div className="px-4 py-3 flex items-center justify-between text-[11px] text-muted-foreground">
							<span>
								{watchlist.items.length} cible
								{watchlist.items.length > 1 ? "s" : ""} surveillée
								{watchlist.items.length > 1 ? "s" : ""}
							</span>
							{watchlist.theme && (
								<Badge
									variant="outline"
									className="text-[10px] h-4 px-1.5 bg-muted/50 text-muted-foreground border-border/50"
								>
									{watchlist.theme}
								</Badge>
							)}
						</div>
					</FlatCard>

					{/* Items */}
					<FlatCard>
						<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
							<div className="rounded-md bg-rose-500/10 p-1.5">
								<Users className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
							</div>
							<span className="text-base font-bold flex-1">Cibles</span>
							<Badge
								variant="outline"
								className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
							>
								{watchlist.items.length}
							</Badge>
						</div>

						{watchlist.items.length === 0 ? (
							<div className="py-12 text-center text-sm text-muted-foreground">
								Aucune cible ajoutée.
								<br />
								<span className="text-[11px]">
									Utilisez le bouton « Liste de surveillance » depuis la fiche
									d'un profil.
								</span>
							</div>
						) : (
							<div className="divide-y divide-border/30">
								<AnimatePresence mode="popLayout">
									{watchlist.items.map((it) => {
										const meta = TYPE_META[it.targetType] ?? TYPE_META.profile!;
										const Icon = meta.icon;
										return (
											<motion.div
												key={it._id}
												layout
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
											>
												<div
													className={cn(
														"rounded-md p-1.5 shrink-0",
														"bg-rose-500/10",
													)}
												>
													<Icon className={cn("h-3.5 w-3.5", meta.color)} />
												</div>
												<Link
													href={`/agence/profiles/${it.targetType}/${it.targetId}`}
													className="flex-1 min-w-0"
												>
													<p className="text-sm font-medium truncate">
														{it.label}
													</p>
													{it.sublabel && (
														<p className="text-[11px] text-muted-foreground truncate">
															{it.sublabel}
														</p>
													)}
												</Link>
												<Badge
													variant="outline"
													className="text-[10px] h-4 px-1.5 bg-muted/50 text-muted-foreground border-border/50 shrink-0"
												>
													{meta.label}
												</Badge>
												{watchlist.isOwner && (
													<Button
														variant="ghost"
														size="sm"
														className="h-7 w-7 p-0"
														onClick={() => handleRemove(it._id)}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												)}
											</motion.div>
										);
									})}
								</AnimatePresence>
							</div>
						)}
					</FlatCard>
				</motion.div>
			)}
		</div>
	);
}
