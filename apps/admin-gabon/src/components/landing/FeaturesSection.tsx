import { motion } from "motion/react";
import { Landmark, Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FeaturesSection() {
	const { t } = useTranslation();

	const consularPoints = t("agentLanding.values.feature2.points", {
		returnObjects: true,
	}) as string[];

	return (
		<section aria-label="Nos valeurs" className="h-full flex flex-col justify-center bg-white/3">
			<div className="container mx-auto px-6 lg:px-12">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center max-w-2xl mx-auto mb-8 lg:mb-10"
				>
					<span className="badge-pill-landing mb-4">Valeurs</span>
					<h2 className="text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">
						L'Administration{" "}
						<span className="text-gradient-primary">Modernisée</span>
					</h2>
				</motion.div>

				{/* 2 cards side by side */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Card 1 — Modernité */}
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="card-landing-dark p-8 lg:p-10 group"
					>
						<div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors duration-300">
							<Landmark aria-hidden="true" className="w-5 h-5 text-emerald-400" />
						</div>
						<h3 className="text-lg font-display font-bold text-white mb-3 tracking-tight">
							{t("agentLanding.values.feature1.title")}
						</h3>
						<p className="text-slate-300 text-sm leading-relaxed mb-3">
							{t("agentLanding.values.feature1.p1")}
						</p>
						<p className="text-slate-300 text-sm leading-relaxed">
							{t("agentLanding.values.feature1.p2")}
						</p>
					</motion.div>

					{/* Card 2 — Pôle Consulaire */}
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="card-landing-dark p-8 lg:p-10 group"
					>
						<div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors duration-300">
							<Briefcase aria-hidden="true" className="w-5 h-5 text-indigo-400" />
						</div>
						<h3 className="text-lg font-display font-bold text-white mb-3 tracking-tight">
							{t("agentLanding.values.feature2.title")}
						</h3>
						<p className="text-slate-300 text-sm leading-relaxed mb-4">
							{t("agentLanding.values.feature2.description")}
						</p>
						<ul className="space-y-2 text-slate-300 text-sm">
							{consularPoints.map((point) => (
								<li key={point} className="flex items-center gap-2.5">
									<div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
									{point}
								</li>
							))}
						</ul>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
