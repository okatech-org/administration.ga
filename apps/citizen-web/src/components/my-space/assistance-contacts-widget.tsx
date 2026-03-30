import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Phone, Building2, MapPin, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrgCallButton } from "@/components/meetings/org-call-button";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Icon & color per role ────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, {
	icon: typeof Building2;
	color: string;
	bg: string;
}> = {
	demarches: { icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
	residence: { icon: Landmark, color: "text-indigo-500", bg: "bg-indigo-500/10" },
	sejour: { icon: MapPin, color: "text-amber-500", bg: "bg-amber-500/10" },
};

export function AssistanceContactsWidget() {
	const { data: representations, isPending } = useAuthenticatedConvexQuery(
		api.functions.representations.getMyRepresentations,
		{},
	);

	const items = representations ?? [];

	return (
		<div className="bg-card rounded-2xl border border-border flex flex-col shrink-0 overflow-hidden mb-2">
			{/* Header */}
			<div className="flex items-center justify-between p-2.5 border-b border-foreground/5 shrink-0 bg-muted/20">
				<div className="flex items-center gap-2.5">
					<div className="p-1.5 rounded-lg bg-teal-500/10">
						<Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
					</div>
					<span className="text-[13px] font-bold">Assistance & Représentations</span>
				</div>
				<Badge variant="outline" className="text-[10px] bg-background py-0.5 px-2">Contact rapide</Badge>
			</div>

			{/* Body */}
			<div className="p-3">
				{isPending ? (
					<div className="flex gap-3">
						<RepresentationSkeleton />
						<RepresentationSkeleton />
					</div>
				) : items.length === 0 ? (
					<div className="flex items-center justify-center py-4">
						<p className="text-[12px] text-muted-foreground text-center">
							Aucune représentation consulaire trouvée.
							<br />
							<span className="text-[10px]">Complétez votre profil pour afficher vos représentations.</span>
						</p>
					</div>
				) : (
					<div className="flex overflow-x-auto gap-3 pb-1 citizen-scrollbar snap-x snap-mandatory">
						{items.map((rep) => {
							const config = ROLE_CONFIG[rep.role] ?? ROLE_CONFIG.residence;
							const Icon = config.icon;

							return (
								<div
									key={rep.id}
									className={cn(
										"flex flex-col gap-2 p-3 bg-muted/40 rounded-xl border border-muted/50 hover:bg-muted/60 transition-colors group snap-start shrink-0",
										// Show exactly 2 cards visible, scroll for more
										items.length <= 2
											? "flex-1 min-w-0"
											: "min-w-[48%] md:min-w-[220px]",
									)}
								>
									{/* Top: icon + badge */}
									<div className="flex items-start justify-between">
										<div className={`p-1.5 rounded-lg ${config.bg} shrink-0`}>
											<Icon className={`h-4.5 w-4.5 ${config.color}`} />
										</div>
										<Badge variant="secondary" className="text-[9px] font-semibold h-4.5 px-2 py-0">
											{rep.badge}
										</Badge>
									</div>

									{/* Name + description */}
									<div className="flex-1 mt-1.5">
										<h4 className="font-bold text-[12px] leading-tight line-clamp-2">{rep.name}</h4>
										<p className="text-[10px] text-muted-foreground mt-1 font-medium line-clamp-1">
											{rep.description}
										</p>
									</div>

									{/* Call button — uses the real LiveKit call system */}
									<OrgCallButton
										orgId={rep.id as Id<"orgs">}
										orgName={rep.name}
										className="w-full h-7 text-[10px] font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg mt-1"
										label="Appeler"
									/>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function RepresentationSkeleton() {
	return (
		<div className="flex flex-col gap-2 p-3 bg-muted/40 rounded-xl border border-muted/50 flex-1 min-w-0">
			<div className="flex items-start justify-between">
				<Skeleton className="h-7 w-7 rounded-lg" />
				<Skeleton className="h-4.5 w-16 rounded-full" />
			</div>
			<Skeleton className="h-3.5 w-3/4 mt-2" />
			<Skeleton className="h-3 w-1/2 mt-1" />
			<Skeleton className="h-7 w-full mt-2 rounded-lg" />
		</div>
	);
}
