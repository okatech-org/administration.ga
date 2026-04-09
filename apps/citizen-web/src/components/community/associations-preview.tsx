"use client"

import { api } from "@convex/_generated/api"
import Link from "next/link"
import { ArrowRight, Heart } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { useConvexQuery } from "@/integrations/convex/hooks"

export function AssociationsPreview() {
	const { t } = useTranslation()
	const { data: associationsList } = useConvexQuery(
		api.functions.associations.list,
		{},
	)

	return (
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
				<Link href="/reps?view=grid">
					<Button variant="outline" className="gap-2">
						{t("community.seeAll")}
						<ArrowRight className="h-4 w-4" />
					</Button>
				</Link>
			</div>

			{associationsList === undefined ? (
				<CardGridSkeleton cols={3} count={3} />
			) : associationsList.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{associationsList.slice(0, 3).map((assoc) => (
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
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground col-span-3 text-center py-8">
					{t(
						"community.associations.empty",
						"Aucune association enregistrée pour le moment.",
					)}
				</p>
			)}
		</section>
	)
}
