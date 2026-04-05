import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Phone, Building2, MapPin, Landmark } from "lucide-react";
import { useCallback, useRef, useState } from "react";
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
	demarches: { icon: Building2, color: "text-muted-foreground", bg: "bg-foreground/[0.06] dark:bg-foreground/[0.08]" },
	residence: { icon: Landmark, color: "text-muted-foreground", bg: "bg-foreground/[0.06] dark:bg-foreground/[0.08]" },
	sejour: { icon: MapPin, color: "text-muted-foreground", bg: "bg-foreground/[0.06] dark:bg-foreground/[0.08]" },
};

// Extrait le type (ex: "Consulat Général") et la localisation (ex: "du Gabon à Paris")
// Tout en majuscule, sans accents
function removeAccents(str: string): string {
	return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitRepName(name: string): { type: string; location: string } {
	const match = name.match(/^(.+?)\s+(du|de)\s+(.+)$/i);
	if (match) {
		return { type: removeAccents(match[1]).toUpperCase(), location: removeAccents(`${match[2]} ${match[3]}`).toUpperCase() };
	}
	return { type: removeAccents(name).toUpperCase(), location: "" };
}

export function AssistanceContactsWidget() {
	const { data: representations, isPending } = useAuthenticatedConvexQuery(
		api.functions.representations.getMyRepresentations,
		{},
	);

	// Get the consular org name ("Géré par")
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const latestRegistration = registrations?.[0];
	const { data: registrationRequest } = useAuthenticatedConvexQuery(
		api.functions.requests.getById,
		latestRegistration?.requestId
			? { requestId: latestRegistration.requestId }
			: "skip",
	);
	const orgName = (registrationRequest?.org as any)?.name;

	const items = representations ?? [];
	const [activeIndex, setActiveIndex] = useState(0);
	const scrollRef = useRef<HTMLDivElement>(null);
	const handleScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el || items.length <= 1) return;
		const idx = Math.round(el.scrollLeft / el.clientWidth);
		setActiveIndex(Math.min(idx, items.length - 1));
	}, [items.length]);

	return (
		<div className="bg-card rounded-2xl flex flex-col shrink-0 overflow-hidden lg:h-full border flat-card-border">
			{/* Géré par — affichage de l'organisation consulaire */}
			{orgName && (
				<div className="hidden lg:block px-4 pt-4 pb-0">
					<div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-muted">
						<Building2 className="h-3.5 w-3.5 text-primary dark:text-primary shrink-0" />
						<span className="text-xs font-semibold text-primary dark:text-primary truncate">
							Géré par : {orgName}
						</span>
					</div>
				</div>
			)}

			{/* Body */}
			<div className="p-3 lg:p-4">
				{isPending ? (
					<div className="flex gap-3.5">
						<RepresentationSkeleton />
						<RepresentationSkeleton />
					</div>
				) : items.length === 0 ? (
					<div className="flex items-center justify-center py-4">
						<p className="text-sm text-muted-foreground text-center">
							Aucune représentation consulaire trouvée.
							<br />
							<span className="text-xs">Complétez votre profil pour afficher vos représentations.</span>
						</p>
					</div>
				) : (
					<>
						<div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto gap-3.5 pb-1.5 citizen-scrollbar snap-x snap-mandatory disable-scrollbars lg:scrollbars-auto">
							{items.map((rep) => {
								const config = ROLE_CONFIG[rep.role] ?? ROLE_CONFIG.residence;
								const Icon = config.icon;
								const { type, location } = splitRepName(rep.name);

								return (
									<div
										key={rep.id}
										className={cn(
											"bg-muted rounded-xl hover:bg-muted/80 transition-colors group snap-start shrink-0",
											"flex items-center gap-3 p-3 w-full min-w-[85%] sm:min-w-0 lg:flex-col lg:gap-2.5 lg:p-4",
											items.length <= 2
												? "lg:flex-1 lg:min-w-0"
												: "lg:min-w-[220px]",
										)}
									>
										{/* Icon + type & location */}
										<div className="flex items-start gap-2.5 flex-1 min-w-0 lg:flex-auto">
											<div className={`p-1.5 rounded-lg ${config.bg} shrink-0 mt-0.5 hidden lg:flex`}>
												<Icon className={`h-4.5 w-4.5 ${config.color}`} />
											</div>
											<div className="flex flex-col -gap-px min-w-0">
												<span className="text-[10px] lg:text-xs font-bold uppercase tracking-wide text-foreground leading-tight line-clamp-1">
													{type}
												</span>
												<p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight line-clamp-1">
													{location}
												</p>
											</div>
										</div>

										{/* Call button */}
										<OrgCallButton
											orgId={rep.id as Id<"orgs">}
											orgName={rep.name}
											orgAddress={rep.address}
											className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg shrink-0 w-auto px-4 lg:w-full lg:mt-1"
											label="Appeler"
										/>
									</div>
								);
							})}
						</div>
						{/* Dots de pagination — mobile uniquement */}
						{items.length > 1 && (
							<div className="flex lg:hidden justify-center gap-1.5 pt-2">
								{items.map((_, idx) => (
									<div key={idx} className={cn("h-1.5 rounded-full transition-all", idx === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30")} />
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function RepresentationSkeleton() {
	return (
		<div className="flex flex-col gap-2.5 p-4 bg-muted rounded-xl flex-1 min-w-0">
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
