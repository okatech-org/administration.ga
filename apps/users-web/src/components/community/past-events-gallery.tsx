"use client"

import { api } from "@convex/_generated/api"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar, MapPin, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePaginatedConvexQuery } from "@/integrations/convex/hooks"

export function PastEventsGallery() {
	const { t } = useTranslation()
	const { results: pastEvents, isLoading } = usePaginatedConvexQuery(
		api.functions.communityEvents.list,
		{},
		{ initialNumItems: 6 },
	)

	const [lightboxEvent, setLightboxEvent] = useState<
		(typeof pastEvents extends (infer U)[] | undefined ? U : never) | null
	>(null)

	return (
		<>
			<section className="container mx-auto px-4 py-12 border-t">
				<h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
					<Calendar className="h-6 w-6 text-primary" />
					{t("community.events.pastTitle")}
				</h2>

				{isLoading ? (
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
		</>
	)
}
