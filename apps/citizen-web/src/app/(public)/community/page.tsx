"use client"

import Link from "next/link"
import { MapPin, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AssociationsPreview } from "@/components/community/associations-preview"
import { CompaniesPreview } from "@/components/community/companies-preview"
import { PastEventsGallery } from "@/components/community/past-events-gallery"
import { UpcomingEventsSection } from "@/components/community/upcoming-events-section"

export default function CommunityPage() {
	const { t } = useTranslation()

	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section — static, renders immediately */}
			<section className="bg-background py-16 px-6">
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

			{/* Each section fetches its own data and shows its own skeleton */}
			<CompaniesPreview />
			<AssociationsPreview />
			<PastEventsGallery />
			<UpcomingEventsSection />

			{/* Map CTA — static, renders immediately */}
			<section className="container mx-auto px-4 py-12 border-t">
				<div className="bg-card border flat-card-border shadow-sm rounded-2xl p-8 text-center">
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
					<Link href="/reps?view=map">
						<Button size="lg" className="gap-2">
							<MapPin className="h-5 w-5" />
							{t("community.map.cta")}
						</Button>
					</Link>
				</div>
			</section>
		</div>
	)
}
