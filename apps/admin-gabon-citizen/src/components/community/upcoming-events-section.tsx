"use client"

import { api } from "@convex/_generated/api"
import { PostCategory } from "@convex/lib/constants"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { usePaginatedConvexQuery } from "@/integrations/convex/hooks"

export function UpcomingEventsSection() {
	const { t } = useTranslation()
	const { results: upcomingPosts, isLoading } = usePaginatedConvexQuery(
		api.functions.posts.list,
		{ category: PostCategory.Event },
		{ initialNumItems: 4 },
	)

	return (
		<section className="container mx-auto px-4 py-12 border-t">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
					<Calendar className="h-6 w-6 text-primary" />
					{t("community.events.upcomingTitle")}
				</h2>
				<Link href="/news?category=event">
					<Button variant="outline" className="gap-2">
						{t("community.events.seeAll")}
						<ArrowRight className="h-4 w-4" />
					</Button>
				</Link>
			</div>

			{isLoading ? (
				<CardGridSkeleton cols={2} count={4} />
			) : upcomingPosts && upcomingPosts.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{upcomingPosts.map((post) => (
						<Link key={post._id} href={`/news/${post.slug}`}>
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
	)
}
