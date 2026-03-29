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
			className="relative overflow-hidden min-h-screen flex flex-col justify-center pt-20 pb-20"
			style={{ isolation: "isolate" }}
		>
			{/* Background layer */}
			<div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
				{/* Dark gradient base */}
				<div
					className="absolute inset-0"
					style={{
						background:
							"linear-gradient(to bottom right, #020617, #0f172a, #022c22)",
					}}
				/>

				{/* Parallax image */}
				<motion.div
					className="absolute inset-0"
					style={{
						y: bgY,
						backgroundImage: `url('${HERO_BG}')`,
						backgroundSize: "cover",
						backgroundPosition: "center",
						opacity: 0.3,
						mixBlendMode: "overlay",
					}}
				/>

				{/* Gradient overlay */}
				<div
					className="absolute inset-0"
					style={{
						background:
							"linear-gradient(to bottom, rgba(15,23,42,0.4), transparent 50%, rgba(2,6,23,0.85))",
					}}
				/>
			</div>

			{/* Content */}
			<div
				className="container px-6 mx-auto lg:px-12"
				style={{ position: "relative", zIndex: 1 }}
			>
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

						<h1
							className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.08]"
							style={{ color: "#ffffff" }}
						>
							{t("agentLanding.hero.title")}{" "}
							<br className="hidden sm:block" />
							<span className="text-gradient-primary">
								{t("agentLanding.hero.titleGradient")}
							</span>{" "}
							<br className="hidden lg:block" />
							{t("agentLanding.hero.titleSuffix")}
						</h1>

						<p
							className="text-base sm:text-lg mb-8 max-w-xl font-light leading-relaxed mx-auto lg:mx-0"
							style={{ color: "rgba(203, 213, 225, 0.9)" }}
						>
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
				className="absolute bottom-0 inset-x-0"
				style={{ zIndex: 1 }}
			>
				<div
					className="border-t py-4"
					style={{
						background: "rgba(0,0,0,0.45)",
						backdropFilter: "blur(12px)",
						borderColor: "rgba(255,255,255,0.08)",
					}}
				>
					<div className="container mx-auto px-6 lg:px-12">
						<div className="flex items-center justify-center md:justify-start gap-8 lg:gap-16 flex-wrap">
							{STATS.map((stat, i) => (
								<div key={stat.label} className="flex items-center gap-4">
									{i > 0 && (
										<div
											className="hidden md:block w-px h-7"
											style={{ background: "rgba(255,255,255,0.12)" }}
										/>
									)}
									<div className="text-center md:text-left">
										<div
											className="text-xl font-bold font-display"
											style={{ color: "#6ee7b7" }}
										>
											{stat.value}
										</div>
										<div
											className="text-xs tracking-wide"
											style={{ color: "rgba(203,213,225,0.6)" }}
										>
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
				className="absolute bottom-16 right-10"
				style={{ zIndex: 1 }}
			>
				<motion.button
					type="button"
					onClick={onNext}
					animate={{ x: [0, 8, 0] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
					style={{ color: "rgba(255,255,255,0.4)" }}
					className="hover:text-white/70 transition-colors flex items-center gap-2 text-sm"
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
