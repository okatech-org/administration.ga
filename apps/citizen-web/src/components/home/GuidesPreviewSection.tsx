"use client"

import Link from "next/link";
import { ArrowRight, Compass, Globe, Plane } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { LocationBanner } from "@/components/guides/LocationBanner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const GUIDE_CARDS = [
	{
		type: "arrival" as const,
		icon: Plane,
		href: "/ressources/guides/arrivee",
		titleKey: "guides.arrival.cardTitle",
		descKey: "guides.arrival.cardDesc",
		defaultTitle: "Guide d'arrivee",
		defaultDesc: "Premiers pas dans votre pays de residence.",
	},
	{
		type: "practical" as const,
		icon: Compass,
		href: "/ressources/guides/vie-pratique",
		titleKey: "guides.practical.cardTitle",
		descKey: "guides.practical.cardDesc",
		defaultTitle: "Guide pratique",
		defaultDesc: "Logement, sante, emploi et droits.",
	},
	{
		type: "return" as const,
		icon: Globe,
		href: "/ressources/guides/retour",
		titleKey: "guides.return.cardTitle",
		descKey: "guides.return.cardDesc",
		defaultTitle: "Guide de retour",
		defaultDesc: "Preparer son retour au Gabon.",
	},
];

export function GuidesPreviewSection() {
	const { t } = useTranslation();

	const containerVariants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
	};

	return (
		<section className="py-20 lg:py-32 bg-[oklch(0.145_0_0)] text-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<span className="inline-block mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-[oklch(0.685_0.169_237.323)]">
						{t("home.guides.badge", "Guides personnalises")}
					</span>
					<h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-white mb-4">
						{t("home.guides.title", "Guides adaptes a votre situation")}
					</h2>
					<p className="text-lg text-[oklch(0.7_0_0)] max-w-xl mx-auto">
						{t(
							"home.guides.subtitle",
							"Ressources specifiques a votre pays de residence.",
						)}
					</p>
				</motion.div>

				{/* Location Banner compact */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="mb-12 max-w-3xl mx-auto"
				>
					<LocationBanner compact />
				</motion.div>

				{/* Guide Cards */}
				<motion.div
					variants={containerVariants}
					initial="hidden"
					animate="show"
					className="grid md:grid-cols-3 gap-6"
				>
					{GUIDE_CARDS.map((guide) => {
						const Icon = guide.icon;
						return (
							<motion.div key={guide.type} variants={itemVariants} className="h-full">
								<Link href={guide.href} className="block h-full">
									<Card
										className="group py-0 overflow-hidden bg-[oklch(0.205_0_0)] border border-white/10 rounded-[10px] hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full"
									>
										<CardHeader className="pt-6 pb-3">
											<div className="w-14 h-14 rounded-full bg-[oklch(0.685_0.169_237.323)]/15 flex items-center justify-center mb-4 transition-colors group-hover:bg-[oklch(0.685_0.169_237.323)]/25">
												<Icon className="h-7 w-7 text-[oklch(0.685_0.169_237.323)]" />
											</div>
											<CardTitle className="text-xl text-white">
												{t(guide.titleKey, guide.defaultTitle)}
											</CardTitle>
											<CardDescription className="text-sm text-[oklch(0.7_0_0)]">
												{t(guide.descKey, guide.defaultDesc)}
											</CardDescription>
										</CardHeader>
										<CardContent className="pb-6">
											<div className="flex items-center text-[oklch(0.685_0.169_237.323)] text-sm font-semibold group-hover:gap-2 transition-all">
												{t("guides.consult", "Consulter")}
												<ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
											</div>
										</CardContent>
									</Card>
								</Link>
							</motion.div>
						);
					})}
				</motion.div>

				{/* CTA */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.4 }}
					className="text-center mt-12"
				>
					<Button asChild variant="ghost" className="gap-2 text-[oklch(0.7_0_0)] hover:text-white hover:bg-white/10 rounded-full px-6">
						<Link href="/ressources">
							{t("home.guides.seeAll", "Voir toutes les ressources")}
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</motion.div>
			</div>
		</section>
	);
}
