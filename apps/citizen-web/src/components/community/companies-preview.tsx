"use client"

import { api } from "@convex/_generated/api"
import Link from "next/link"
import { ArrowRight, Building2 } from "lucide-react"
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

export function CompaniesPreview() {
	const { t } = useTranslation()
	const { data: companies } = useConvexQuery(api.functions.companies.list, {})

	return (
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
				<Link href="/reps?view=grid">
					<Button variant="outline" className="gap-2">
						{t("community.seeAll")}
						<ArrowRight className="h-4 w-4" />
					</Button>
				</Link>
			</div>

			{companies === undefined ? (
				<CardGridSkeleton cols={3} count={3} />
			) : companies.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{companies.slice(0, 3).map((company) => (
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
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground col-span-3 text-center py-8">
					{t(
						"community.network.empty",
						"Aucune entreprise enregistrée pour le moment.",
					)}
				</p>
			)}
		</section>
	)
}
