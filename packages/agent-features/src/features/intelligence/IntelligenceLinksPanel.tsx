"use client";

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import { ArrowDownLeft, ArrowUpRight, Loader2, Network } from "lucide-react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

const RELATIONSHIP_LABELS: Record<string, string> = {
	family: "Famille",
	business: "Affaires",
	friendship: "Amitié",
	mentor: "Mentor",
	suspect: "Suspect",
	accomplice: "Complice",
	contact: "Contact",
	other: "Autre",
};

const STRENGTH_CLASSES: Record<string, string> = {
	weak: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
	medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	strong: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

export function IntelligenceLinksPanel({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();

	const { data: links, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceLinks.listForTarget,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	return (
		<FlatCard className="p-4 space-y-3">
			<h3 className="text-sm font-semibold flex items-center gap-2">
				<Network className="h-4 w-4 text-rose-500" />
				Réseau de relations
			</h3>

			{isLoading ? (
				<div className="flex items-center justify-center py-6 text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin mr-2" />
					Chargement…
				</div>
			) : !links?.length ? (
				<p className="text-xs text-muted-foreground py-4 text-center">
					Aucun lien renseigné pour cette cible.
				</p>
			) : (
				<div className="space-y-1.5">
					{links.map((l) => (
						<Link
							key={l._id}
							href={`/intelligence/profiles/${l.otherType}/${l.otherId}`}
							className="flex items-center gap-2 p-2 rounded-md hover:bg-foreground/5 transition-colors"
						>
							{l.direction === "outgoing" ? (
								<ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
							) : (
								<ArrowDownLeft className="h-3.5 w-3.5 text-blue-600 shrink-0" />
							)}
							<span className="text-sm font-medium truncate flex-1">
								{l.otherLabel}
							</span>
							<Badge variant="outline" className="text-[10px]">
								{RELATIONSHIP_LABELS[l.relationship] ?? l.relationship}
							</Badge>
							{l.strength && (
								<span
									className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
										STRENGTH_CLASSES[l.strength] ?? ""
									}`}
								>
									{l.strength}
								</span>
							)}
						</Link>
					))}
				</div>
			)}
		</FlatCard>
	);
}
