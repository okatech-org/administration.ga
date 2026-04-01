import { api } from "@convex/_generated/api";
import { OrganizationType } from "@convex/lib/constants";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatAddress(address: {
	street: string;
	city: string;
	postalCode: string;
	country: string;
}) {
	return `${address.street}, ${address.postalCode} ${address.city}`;
}

function OrgCardSkeleton() {
	return (
		<Card className="relative">
			<CardHeader className="pb-2">
				<div className="flex items-start gap-4">
					<Skeleton className="h-12 w-12 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-40" />
			</CardContent>
		</Card>
	);
}

export function ConsulateLocations() {
	const { t } = useTranslation();
	const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});

	const isLoading = orgs === undefined;

	return (
		<section className="py-16 px-6">
			<div className="max-w-7xl mx-auto">
				{/* Section Header */}
				<div className="text-center mb-12">
					<Badge
						variant="secondary"
						className="mb-3 bg-primary/10 text-primary"
					>
						{t("consulates.badge")}
					</Badge>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
						{t("consulates.title")}
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						{t("consulates.description")}
					</p>
				</div>

				{/* Orgs Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
					{isLoading ? (
						<>
							<OrgCardSkeleton />
							<OrgCardSkeleton />
							<OrgCardSkeleton />
						</>
					) : orgs.length === 0 ? (
						<div className="col-span-full py-12 text-center rounded-xl bg-muted/30 border-2 border-dashed">
							<p className="text-muted-foreground">
								{t("consulates.empty")}
							</p>
						</div>
					) : (
						orgs.slice(0, 6).map((org) => {
							const isPrimary =
								org.type === OrganizationType.Embassy ||
								org.type === OrganizationType.GeneralConsulate;

							return (
								<Card
									key={org._id}
									className="group hover:shadow-lg hover:border-primary/40 transition-all duration-200"
								>
									<CardContent>
										{/* Header Row */}
										<div className="flex items-start gap-3">
											<div
												className={`p-2.5 rounded-lg shrink-0 ${isPrimary ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
											>
												<MapPin className="w-5 h-5" />
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<span
														className={`fi fi-${org.address.country.toLowerCase()} rounded-sm`}
													></span>
													<span className="text-xs font-medium text-muted-foreground uppercase">
														{org.address.country}
													</span>
													{isPrimary && (
														<Badge
															variant="outline"
															className="h-5 text-[10px] px-1.5 border-primary/30 text-primary ml-auto"
														>
															Siège
														</Badge>
													)}
												</div>

												<h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
													{org.address.city}
												</h3>
											</div>
										</div>

										{/* Address */}
										<p className="text-sm text-muted-foreground mb-4 line-clamp-2">
											{formatAddress(org.address)}
										</p>
									</CardContent>
									<CardFooter>
										<Link
											to="/reps/$slug"
											params={{ slug: org.slug }}
											className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:gap-3 transition-all"
										>
											{t("consulates.viewDetails")}
											<ArrowRight className="w-4 h-4" />
										</Link>
									</CardFooter>
								</Card>
							);
						})
					)}
				</div>

				{/* View All Button */}
				<div className="text-center">
					<Button
						asChild
						variant="outline"
						size="lg"
						className="border-primary/30 hover:bg-primary hover:text-white hover:border-primary"
					>
						<Link to="/reps" search={{ view: "grid" }}>
							<MapPin className="w-4 h-4 mr-2" />
							{t("consulates.viewAll")}
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

export default ConsulateLocations;
