"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { useOrg } from "../../shell/org-provider";

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

export function AddToWatchlistButton({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();
	const [open, setOpen] = useState(false);

	const { data: lists } = useAuthenticatedConvexQuery(
		api.functions.intelligenceWatchlists.list,
		activeOrgId && open ? { orgId: activeOrgId } : "skip",
	);

	const { data: alreadyIn } = useAuthenticatedConvexQuery(
		api.functions.intelligenceWatchlists.listForTarget,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	const { mutateAsync: addItem, isPending: isAdding } = useConvexMutationQuery(
		api.functions.intelligenceWatchlists.addItem,
	);

	const inSet = new Set((alreadyIn ?? []).map((w) => w._id));

	const handleAdd = async (watchlistId: Id<"intelligenceWatchlists">) => {
		if (!activeOrgId) return;
		try {
			await addItem({
				watchlistId,
				orgId: activeOrgId,
				targetType,
				targetId,
			});
			toast.success("Cible ajoutée à la liste");
			setOpen(false);
		} catch (_e) {
			toast.error("Impossible d'ajouter à la liste");
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" disabled={isAdding}>
					{isAdding ? (
						<Loader2 className="h-3 w-3 animate-spin mr-1" />
					) : (
						<Plus className="h-3 w-3 mr-1" />
					)}
					Liste de surveillance
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel>Ajouter à une liste</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{!lists ? (
					<DropdownMenuItem disabled>
						<Loader2 className="h-3 w-3 animate-spin mr-2" /> Chargement…
					</DropdownMenuItem>
				) : lists.length === 0 ? (
					<DropdownMenuItem disabled>Aucune liste disponible</DropdownMenuItem>
				) : (
					lists.map((l) => {
						const isIn = inSet.has(l._id);
						return (
							<DropdownMenuItem
								key={l._id}
								disabled={isIn}
								onSelect={() => !isIn && handleAdd(l._id)}
							>
								<span className="flex-1 truncate">{l.name}</span>
								{isIn && (
									<span className="text-[10px] text-muted-foreground">déjà</span>
								)}
							</DropdownMenuItem>
						);
					})
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
