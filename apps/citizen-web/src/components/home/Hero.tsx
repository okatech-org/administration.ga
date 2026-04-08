import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { FileText, Globe, MoveRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const containerVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.12, delayChildren: 0.2 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 15 },
	show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Hero() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const isSignedIn = !!session;

	const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});
	const { data: services } = useConvexQuery(
		api.functions.services.listCatalog,
		{},
	);
	const { data: profileResult } = useConvexQuery(
		api.functions.profiles.getMyProfileSafe,
		isSignedIn ? {} : "skip",
	);
	const hasProfile = !!profileResult?.profile;

	const orgCount = orgs?.length ?? 0;
	const serviceCount = services?.length ?? 0;

	const ctaTo = hasProfile ? "/my-space" : "/register";
	const ctaLabel = hasProfile
		? t("heroCore.cta.mySpace")
		: t("heroCore.cta.register");

	// Mots rotatifs animes
	const words = useMemo(
		() => ["simplifiees.", "accessibles.", "rapides.", "digitalisees."],
		[],
	);
	const [wordIndex, setWordIndex] = useState(0);

	useEffect(() => {
		const timer = setTimeout(() => {
			setWordIndex((prev) => (prev === words.length - 1 ? 0 : prev + 1));
		}, 2500);
		return () => clearTimeout(timer);
	}, [wordIndex, words]);

	return (
		<section className="w-full bg-[oklch(0.145_0_0)]">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<motion.div
					variants={containerVariants}
					initial="hidden"
					animate="show"
					className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col"
				>
					{/* Badge CTA */}
					<motion.div variants={itemVariants}>
						<Link
							to="/services"
							className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
						>
							{t("heroCore.badge", "Plateforme Consulaire Officielle")}
							<MoveRight className="w-4 h-4" />
						</Link>
					</motion.div>

					{/* Titre avec mots rotatifs */}
					<motion.div variants={itemVariants} className="flex gap-4 flex-col">
						<h1 className="text-5xl md:text-7xl max-w-2xl tracking-[-0.02em] text-center font-bold text-white">
							<span>
								{t("heroCore.title", "Vos demarches consulaires,")}
							</span>
							<span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
								&nbsp;
								<AnimatePresence mode="wait">
									<motion.span
										key={wordIndex}
										className="absolute font-semibold text-[oklch(0.685_0.169_237.323)]"
										initial={{ opacity: 0, y: -40 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 40 }}
										transition={{ type: "spring", stiffness: 80, damping: 20 }}
									>
										{words[wordIndex]}
									</motion.span>
								</AnimatePresence>
							</span>
						</h1>

						<p className="text-lg md:text-xl leading-relaxed tracking-tight text-[oklch(0.7_0_0)] max-w-2xl text-center">
							{t(
								"heroCore.description",
								"Passeport, etat civil, inscription consulaire... Effectuez vos demarches en ligne, 24h/24, depuis n'importe quel pays.",
							)}
						</p>
					</motion.div>

					{/* CTAs */}
					<motion.div variants={itemVariants} className="flex flex-row gap-3">
						<Button size="lg" className="gap-4 rounded-full border-white/20 text-white hover:bg-white/10" variant="outline" asChild>
							<Link to="/services">
								{t("heroCore.cta.services", "Decouvrir les services")}
								<Globe className="w-4 h-4" />
							</Link>
						</Button>
						<Button size="lg" className="gap-4 rounded-full" asChild>
							<Link to={ctaTo}>
								{ctaLabel}
								<MoveRight className="w-4 h-4" />
							</Link>
						</Button>
					</motion.div>

					{/* Stats inline */}
					<motion.div
						variants={itemVariants}
						className="flex flex-wrap justify-center gap-6 text-sm text-[oklch(0.7_0_0)]"
					>
						<span className="flex items-center gap-2">
							<Globe className="w-4 h-4 opacity-50" />
							<strong className="text-white font-bold text-base">{orgCount}</strong>{" "}
							{t("heroCore.stats.representations", "representations")}
						</span>
						<span className="text-white/20" aria-hidden>·</span>
						<span className="flex items-center gap-2">
							<FileText className="w-4 h-4 opacity-50" />
							<strong className="text-white font-bold text-base">{serviceCount}</strong>{" "}
							{t("heroCore.stats.services", "services")}
						</span>
						<span className="text-white/20" aria-hidden>·</span>
						<span>
							<strong className="text-white font-bold text-base">24/7</strong>{" "}
							{t("heroCore.stats.assistance", "assistance")}
						</span>
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}

export default Hero;
