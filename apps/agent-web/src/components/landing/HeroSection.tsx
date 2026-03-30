import { motion, useScroll, useTransform } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SignInCard } from "@/components/auth/SignInCard";

/** Unsplash hero background — diplomatic meeting */
const HERO_BG =
	"https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=2069&auto=format&fit=crop";

export function HeroSection({ onNext }: { onNext?: () => void }) {
	const { scrollYProgress } = useScroll();
	const bgY = useTransform(scrollYProgress, [0, 1], [0, 300]);
	const { t } = useTranslation();

	const STATS = [
		{ ...t("agentLanding.hero.stats.missions", { returnObjects: true }) as { value: string; label: string } },
		{ ...t("agentLanding.hero.stats.agents", { returnObjects: true }) as { value: string; label: string } },
		{ ...t("agentLanding.hero.stats.conventions", { returnObjects: true }) as { value: string; label: string } },
	];

	return (
		<section
			id="hero"
			className="relative overflow-hidden min-h-screen flex flex-col justify-center pt-20 pb-20 isolate"
		>
			{/* Background layer */}
			<div className="absolute inset-0 overflow-hidden z-0">
				{/* Dark gradient base */}
				<div className="absolute inset-0 hero-gradient-base" />

				{/* Parallax image */}
				<motion.div
					className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
					style={{
						y: bgY,
						backgroundImage: `url('${HERO_BG}')`,
					}}
				/>

				{/* Gradient overlay */}
				<div className="absolute inset-0 hero-gradient-overlay" />
			</div>

			{/* Content */}
			<div className="container px-6 mx-auto lg:px-12 relative z-1">
				<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
					{/* Left: Hero text */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.9, ease: "easeOut" }}
						className="lg:w-1/2 text-center lg:text-left"
					>
						{/* Badge */}
						<motion.span
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="badge-pill-landing mb-8"
						>
							{t("agentLanding.hero.badge")}
						</motion.span>

						<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.08] text-white">
							{t("agentLanding.hero.title")}{" "}
							<br className="hidden sm:block" />
							<span className="text-gradient-primary">
								{t("agentLanding.hero.titleGradient")}
							</span>{" "}
							<br className="hidden lg:block" />
							{t("agentLanding.hero.titleSuffix")}
						</h1>

						<p className="text-base sm:text-lg mb-8 max-w-xl font-light leading-relaxed mx-auto lg:mx-0 text-slate-300/90">
							{t("agentLanding.hero.description")}
						</p>
					</motion.div>

					{/* Right: Sign-In card */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
						className="lg:w-[440px] w-full max-w-md"
					>
						<SignInCard />
					</motion.div>
				</div>
			</div>

			{/* Stats bar — bottom of hero */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.8, duration: 0.7 }}
				className="absolute bottom-0 inset-x-0 z-1"
			>
				<div className="border-t py-4 hero-stats-bar">
					<div className="container mx-auto px-6 lg:px-12">
						<div className="flex items-center justify-center md:justify-start gap-8 lg:gap-16 flex-wrap">
							{STATS.map((stat, i) => (
								<div key={stat.label} className="flex items-center gap-4">
									{i > 0 && (
										<div className="hidden md:block w-px h-7 bg-white/12" />
									)}
									<div className="text-center md:text-left">
										<div className="text-xl font-bold font-display text-emerald-300">
											{stat.value}
										</div>
										<div className="text-xs tracking-wide text-slate-300/60">
											{stat.label}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</motion.div>

			{/* Next panel indicator → */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.5, duration: 0.8 }}
				className="absolute bottom-16 right-10 z-1"
			>
				<motion.button
					type="button"
					onClick={onNext}
					animate={{ x: [0, 8, 0] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
					className="text-white/40 hover:text-white/70 transition-colors flex items-center gap-2 text-sm"
					aria-label="Volet suivant"
				>
					<span className="hidden sm:block text-xs tracking-widest uppercase">
						{t("agentLanding.hero.nextPanel")}
					</span>
					<ChevronRight className="w-6 h-6" />
				</motion.button>
			</motion.div>
		</section>
	);
}
