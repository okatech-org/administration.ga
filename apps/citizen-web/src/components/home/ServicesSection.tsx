"use client"

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/validators";
import Link from "next/link";
import {
	ArrowRight,
	BookOpenCheck,

	FileText,
	Globe,
	type LucideIcon,
	Shield,
	ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Donnees des categories de services avec images ──────────────────────────

interface ServiceFeature {
	id: string;
	icon: LucideIcon;
	title: string;
	description: string;
	image: string;
	link: string;
}

const SERVICE_FEATURES: ServiceFeature[] = [
	{
		id: "civil_status",
		icon: FileText,
		title: "État Civil",
		description:
			"Actes de naissance, mariage, transcriptions et legalisations. Tous vos documents officiels.",
		image:
			"https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1200&auto=format&fit=crop",
		link: "/services?category=civil_status",
	},
	{
		id: "passport",
		icon: BookOpenCheck,
		title: "Passeports & Identite",
		description:
			"Renouvellement, premier passeport biometrique et tenant-lieu. Suivi de votre demande en temps reel.",
		image:
			"https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=1200&auto=format&fit=crop",
		link: "/services?category=passport",
	},
	{
		id: "visa",
		icon: Globe,
		title: "Visas & Sejours",
		description:
			"Demande de visa court et long sejour pour le Gabon. Informations sur les conditions d'entree.",
		image:
			"https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop",
		link: "/services?category=visa",
	},
	{
		id: "registration",
		icon: Shield,
		title: "Inscription Consulaire",
		description:
			"Carte consulaire, signalement de presence, inscription au registre des Gabonais de l'etranger.",
		image:
			"https://images.unsplash.com/photo-1577415124269-fc1140a69e91?q=80&w=1200&auto=format&fit=crop",
		link: "/services?category=registration",
	},
	{
		id: "assistance",
		icon: ShieldAlert,
		title: "Aide & Assistance",
		description:
			"Rapatriement, assistance juridique, aide sociale pour les ressortissants en difficulte.",
		image:
			"https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1200&auto=format&fit=crop",
		link: "/services?category=assistance",
	},
];

const AUTOPLAY_DURATION = 5000; // 5 secondes par item

export function ServicesSection() {
	const { t } = useTranslation();
	const [activeIndex, setActiveIndex] = useState(0);
	const [progress, setProgress] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Auto-play avec barre de progression
	useEffect(() => {
		if (isPaused) {
			if (intervalRef.current) clearInterval(intervalRef.current);
			return;
		}

		const startTime = Date.now();
		intervalRef.current = setInterval(() => {
			const elapsed = Date.now() - startTime;
			const pct = Math.min((elapsed % AUTOPLAY_DURATION) / AUTOPLAY_DURATION, 1);
			setProgress(pct);

			if (elapsed % AUTOPLAY_DURATION < 50) {
				setActiveIndex((prev) => (prev + 1) % SERVICE_FEATURES.length);
			}
		}, 50);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [isPaused, activeIndex]);

	const handleSelect = useCallback((index: number) => {
		setActiveIndex(index);
		setProgress(0);
	}, []);

	const activeFeature = SERVICE_FEATURES[activeIndex];

	return (
		<section className="py-20 lg:py-32 bg-[oklch(0.145_0_0)] text-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header — aligne a gauche */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-16"
				>
					<span className="mb-4 block text-sm font-semibold uppercase tracking-[0.05em] text-[oklch(0.685_0.169_237.323)]">
						{t("services.badge", "Services Consulaires")}
					</span>
					<h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-white mb-4">
						{t("services.title", "Nos services")}
					</h2>
					<p className="text-lg text-[oklch(0.7_0_0)] max-w-2xl">
						{t(
							"services.description",
							"Decouvrez l'ensemble de nos prestations consulaires.",
						)}
					</p>
				</motion.div>

				{/* Accordion + Image layout */}
				<div
					className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start"
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					{/* Gauche : Accordion */}
					<div className="space-y-0">
						{SERVICE_FEATURES.map((feature, index) => {
							const Icon = feature.icon;
							const isActive = index === activeIndex;

							return (
								<button
									key={feature.id}
									type="button"
									onClick={() => handleSelect(index)}
									className={cn(
										"w-full text-left transition-all duration-300 p-5",
										isActive
											? "bg-[oklch(0.205_0_0)] rounded-[10px] border border-white/10"
											: "bg-transparent border-b border-white/10 rounded-none",
									)}
								>
									<div className="flex items-start gap-4">
										<div
											className={cn(
												"shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors",
												isActive
													? "bg-[oklch(0.685_0.169_237.323)]/15 text-[oklch(0.685_0.169_237.323)]"
													: "bg-white/10 text-white/60",
											)}
										>
											<Icon
												className={cn(
													"w-5 h-5 transition-colors",
													isActive ? "text-[oklch(0.685_0.169_237.323)]" : "text-white/60",
												)}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<h3
												className={cn(
													"font-bold text-base transition-colors",
													isActive ? "text-white" : "text-white/60",
												)}
											>
												{feature.title}
											</h3>
											{isActive && (
												<motion.p
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: "auto" }}
													exit={{ opacity: 0, height: 0 }}
													className="text-sm text-[oklch(0.7_0_0)] mt-1.5 leading-relaxed"
												>
													{feature.description}
												</motion.p>
											)}
										</div>
									</div>

									{/* Barre de progression */}
									{isActive && (
										<div className="mt-3 ml-16 h-0.5 rounded-full bg-white/10 overflow-hidden">
											<motion.div
												className="h-full bg-[oklch(0.685_0.169_237.323)] rounded-full"
												style={{ width: `${progress * 100}%` }}
											/>
										</div>
									)}
								</button>
							);
						})}
					</div>

					{/* Droite : Image illustrative */}
					<div className="relative aspect-4/3 rounded-[10px] overflow-hidden border border-white/10 bg-[oklch(0.205_0_0)]">
						<AnimatePresence mode="wait">
							<motion.img
								key={activeFeature.id}
								src={activeFeature.image}
								alt={activeFeature.title}
								initial={{ opacity: 0, scale: 1.05 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.98 }}
								transition={{ duration: 0.5 }}
								className="absolute inset-0 w-full h-full object-cover"
							/>
						</AnimatePresence>
						{/* Overlay degrade subtle */}
						<div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

						{/* Label actif sur l'image */}
						<div className="absolute bottom-4 left-4 right-4">
							<AnimatePresence mode="wait">
								<motion.div
									key={activeFeature.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.3 }}
									className="bg-[oklch(0.145_0_0)]/80 backdrop-blur-md rounded-[10px] p-4 border border-white/10"
								>
									<p className="font-semibold text-white text-sm">{activeFeature.title}</p>
									<p className="text-xs text-[oklch(0.7_0_0)] mt-0.5 line-clamp-1">{activeFeature.description}</p>
								</motion.div>
							</AnimatePresence>
						</div>
					</div>
				</div>

				{/* CTA */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.3 }}
					className="mt-16"
				>
					<Button
						asChild
						size="lg"
						className="h-14 px-8 rounded-full text-base font-semibold"
					>
						<Link href="/services">{t("services.viewAll")}</Link>
					</Button>
				</motion.div>
			</div>
		</section>
	);
}

export default ServicesSection;
