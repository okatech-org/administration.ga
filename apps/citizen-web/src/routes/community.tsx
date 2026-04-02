"use client";

import { api } from "@convex/_generated/api";
import { PostCategory } from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRight,
	Building2,
	Calendar,
	Heart,
	MapPin,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useConvexQuery,
	usePaginatedConvexQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/community")({
	component: CommunityPage,
});

function CommunityPage() {
	const { t } = useTranslation();

	// Fetch companies and associations from their dedicated tables
	const { data: companies } = useConvexQuery(api.functions.companies.list, {});
	const { data: associationsList } = useConvexQuery(
		api.functions.associations.list,
		{},
	);

	// Fetch past community events
	const { results: pastEvents, isLoading: eventsLoading } =
		usePaginatedConvexQuery(
			api.functions.communityEvents.list,
			{},
			{ initialNumItems: 6 },
		);

	// Fetch upcoming events from posts
	const { results: upcomingPosts } = usePaginatedConvexQuery(
		api.functions.posts.list,
		{
			category: PostCategory.Event,
		},
		{ initialNumItems: 4 },
	);

	// Lightbox state
	const [lightboxEvent, setLightboxEvent] = useState<
		(typeof pastEvents extends (infer U)[] | undefined ? U : never) | null
	>(null);

	// Limit to 3 items for the overview sections
	const companiesPreview = companies?.slice(0, 3);
	const associationsPreview = associationsList?.slice(0, 3);

	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<section className="bg-gradient-to-b from-primary/10 to-background py-16 px-6">
				<div className="max-w-7xl mx-auto text-center">
					<Badge
						variant="secondary"
						className="mb-4 bg-primary/10 text-primary"
					>
						{t("community.badge")}
					</Badge>
					<h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
						{t("community.title")}
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						{t(
							"community.subtitle",
							"Découvrez le réseau économique, les associations et les événements de la diaspora gabonaise.",
						)}
					</p>
				</div>
			</section>

			{/* Economic Network */}
			<section className="container mx-auto px-4 py-12">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
							<Building2 className="h-6 w-6 text-primary" />
							{t("community.network.title")}
						</h2>
						<p className="text-muted-foreground mt-1">
							{t(
								"community.network.description",
								"Entreprises et professionnels de la diaspora.",
							)}
						</p>
					</div>
					<Link to="/reps" search={{ view: "grid" }}>
						<Button variant="outline" className="gap-2">
							{t("community.seeAll")}
							<ArrowRight className="h-4 w-4" />
						</Button>
					</Link>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{companiesPreview && companiesPreview.length > 0 ? (
						companiesPreview.map((company) => (
							<Card
								key={company._id}
								className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full border-0 shadow-sm"
							>
								<CardHeader className="pb-2">
									<div className="flex items-center gap-3">
										{company.logoUrl ? (
											<img
												src={company.logoUrl}
												alt={company.name}
												className="w-10 h-10 rounded-lg object-cover"
											/>
										) : (
											<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
												<Building2 className="h-5 w-5 text-primary" />
											</div>
										)}
										<div>
											<CardTitle className="text-base">
												{company.name}
											</CardTitle>
											<CardDescription className="text-xs">
												{company.address?.city}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
							</Card>
						))
					) : (
						<p className="text-sm text-muted-foreground col-span-3 text-center py-8">
							{t(
								"community.network.empty",
								"Aucune entreprise enregistrée pour le moment.",
							)}
						</p>
					)}
				</div>
			</section>

			{/* Associations */}
			<section className="container mx-auto px-4 py-12 border-t">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
							<Heart className="h-6 w-6 text-primary" />
							{t("community.associations.title")}
						</h2>
						<p className="text-muted-foreground mt-1">
							{t(
								"community.associations.description",
								"Associations culturelles, sportives et solidaires.",
							)}
						</p>
					</div>
					<Link to="/reps" search={{ view: "grid" }}>
						<Button variant="outline" className="gap-2">
							{t("community.seeAll")}
							<ArrowRight className="h-4 w-4" />
						</Button>
					</Link>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{associationsPreview && associationsPreview.length > 0 ? (
						associationsPreview.map((assoc) => (
							<Card
								key={assoc._id}
								className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full border-0 shadow-sm"
							>
								<CardHeader className="pb-2">
									<div className="flex items-center gap-3">
										{assoc.logoUrl ? (
											<img
												src={assoc.logoUrl}
												alt={assoc.name}
												className="w-10 h-10 rounded-lg object-cover"
											/>
										) : (
											<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
												<Heart className="h-5 w-5 text-primary" />
											</div>
										)}
										<div>
											<CardTitle className="text-base">{assoc.name}</CardTitle>
											<CardDescription className="text-xs">
												{assoc.address?.city}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
							</Card>
						))
					) : (
						<p className="text-sm text-muted-foreground col-span-3 text-center py-8">
							{t(
								"community.associations.empty",
								"Aucune association enregistrée pour le moment.",
							)}
						</p>
					)}
				</div>
			</section>

			{/* Past Events Gallery */}
			<section className="container mx-auto px-4 py-12 border-t">
				<h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
					<Calendar className="h-6 w-6 text-primary" />
					{t("community.events.pastTitle")}
				</h2>

				{eventsLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[...Array(3)].map((_, i) => (
							<Skeleton key={i} className="aspect-[4/3] rounded-xl" />
						))}
					</div>
				) : pastEvents && pastEvents.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{pastEvents.map((evt) => (
							<Card
								key={evt._id}
								className="group p-0 overflow-hidden border-0 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
								onClick={() => setLightboxEvent(evt)}
							>
								<div className="aspect-[4/3] bg-muted overflow-hidden relative">
									{evt.coverImageUrl ? (
										<img
											src={evt.coverImageUrl}
											alt={evt.title}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
											<Calendar className="h-12 w-12 text-primary/30" />
										</div>
									)}
									<div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
										<h3 className="text-white font-semibold text-sm line-clamp-1">
											{evt.title}
										</h3>
										<div className="flex items-center gap-2 text-white/80 text-xs mt-1">
											<Calendar className="h-3 w-3" />
											{format(new Date(evt.date), "d MMM yyyy", {
												locale: fr,
											})}
											{evt.location && (
												<>
													<span>·</span>
													<MapPin className="h-3 w-3" />
													<span className="truncate max-w-[120px]">
														{evt.location}
													</span>
												</>
											)}
										</div>
									</div>
								</div>
							</Card>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
						<p className="text-muted-foreground">
							{t(
								"community.events.emptyPast",
								"Aucun événement passé à afficher.",
							)}
						</p>
					</div>
				)}
			</section>

			{/* Upcoming Events (Agenda) */}
			<section className="container mx-auto px-4 py-12 border-t">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
						<Calendar className="h-6 w-6 text-primary" />
						{t("community.events.upcomingTitle")}
					</h2>
					<Link to="/news" search={{ category: "event" }}>
						<Button variant="outline" className="gap-2">
							{t("community.events.seeAll")}
							<ArrowRight className="h-4 w-4" />
						</Button>
					</Link>
				</div>

				{upcomingPosts && upcomingPosts.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{upcomingPosts.map((post) => (
							<Link
								key={post._id}
								to="/news/$slug"
								params={{ slug: post.slug }}
							>
								<Card className="hover:shadow-md hover:-translate-y-0.5 transition-all border-0 shadow-sm">
									<CardHeader className="pb-2">
										<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
											{post.eventStartAt && (
												<span className="flex items-center gap-1">
													<Calendar className="h-3 w-3" />
													{format(new Date(post.eventStartAt), "d MMM yyyy", {
														locale: fr,
													})}
												</span>
											)}
											{post.eventLocation && (
												<span className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													<span className="truncate max-w-[150px]">
														{post.eventLocation}
													</span>
												</span>
											)}
										</div>
										<CardTitle className="text-base">{post.title}</CardTitle>
										<CardDescription className="line-clamp-2 text-xs">
											{post.excerpt}
										</CardDescription>
									</CardHeader>
								</Card>
							</Link>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
						<p className="text-muted-foreground">
							{t(
								"community.events.emptyUpcoming",
								"Aucun événement à venir pour le moment.",
							)}
						</p>
					</div>
				)}
			</section>

			{/* Map CTA */}
			<section className="container mx-auto px-4 py-12 border-t">
				<div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 text-center">
					<Users className="h-10 w-10 text-primary mx-auto mb-3" />
					<h2 className="text-2xl font-bold text-foreground mb-2">
						{t("community.map.title")}
					</h2>
					<p className="text-muted-foreground mb-6 max-w-xl mx-auto">
						{t(
							"community.map.description",
							"Trouvez les représentations diplomatiques, entreprises et associations gabonaises dans le monde entier.",
						)}
					</p>
					<Link to="/reps" search={{ view: "map" }}>
						<Button size="lg" className="gap-2">
							<MapPin className="h-5 w-5" />
							{t("community.map.cta")}
						</Button>
					</Link>
				</div>
			</section>

			{/* Lightbox */}
			{lightboxEvent && (
				<div
					className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
					onClick={() => setLightboxEvent(null)}
				>
					<div
						className="bg-card rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						{lightboxEvent.coverImageUrl && (
							<img
								src={lightboxEvent.coverImageUrl}
								alt={lightboxEvent.title}
								className="w-full aspect-[16/9] object-cover"
							/>
						)}
						<div className="p-6">
							<div className="flex items-center justify-between mb-4">
								<Badge variant="secondary">{lightboxEvent.category}</Badge>
								<button
									onClick={() => setLightboxEvent(null)}
									className="p-1.5 rounded-full hover:bg-muted transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							<h2 className="text-2xl font-bold mb-2">{lightboxEvent.title}</h2>
							<div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
								<span className="flex items-center gap-1">
									<Calendar className="h-4 w-4" />
									{format(new Date(lightboxEvent.date), "d MMMM yyyy", {
										locale: fr,
									})}
								</span>
								{lightboxEvent.location && (
									<span className="flex items-center gap-1">
										<MapPin className="h-4 w-4" />
										{lightboxEvent.location}
									</span>
								)}
							</div>
							{lightboxEvent.description && (
								<p className="text-muted-foreground">
									{lightboxEvent.description}
								</p>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
