import { motion } from "motion/react";
import { Briefcase, Sparkles, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: LucideIcon[] = [Briefcase, Sparkles, GraduationCap];

// Contenu PNPE — 3 piliers de l'opérateur public de l'emploi gabonais.
const PNPE_MISSIONS = {
	badge: "Nos 3 programmes",
	titleStart: "L'emploi pour",
	titleHighlight: "tous les Gabonais",
	subtitle:
		"Trois programmes complémentaires pour répondre à toutes les situations : recherche d'emploi salarié, création d'activité, formation et apprentissage.",
	items: [
		{
			title: "Emploi Salarié",
			description:
				"Mise en correspondance des Demandeurs d'Emploi avec les offres des entreprises gabonaises (CDI, CDD, stage, alternance, intérim). Validation conseiller PNPE et appui à la candidature.",
		},
		{
			title: "Auto-Emploi",
			description:
				"Accompagnement entrepreneurial avec formation Business Model Canvas (BMC) en présentiel ou en ligne (Ediandza). Passerelle automatique vers l'ANPI-Gabon pour la formalisation.",
		},
		{
			title: "Formation & Apprentissage",
			description:
				"Suivi des contrats d'apprentissage, de professionnalisation, d'adaptation et d'insertion. Visites de suivi et bilan de fin de contrat par le conseiller référent.",
		},
	],
} as const;

export function MissionsSection() {
	const items = PNPE_MISSIONS.items;

	return (
		<section aria-label="Nos 3 programmes" className="h-full flex flex-col justify-center bg-white/5">
			<div className="container mx-auto px-6 lg:px-12">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center max-w-2xl mx-auto mb-8 lg:mb-10"
				>
					<span className="badge-pill-landing mb-4">
						{PNPE_MISSIONS.badge}
					</span>
					<h2 className="text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">
						{PNPE_MISSIONS.titleStart}{" "}
						<span className="text-gradient-primary">
							{PNPE_MISSIONS.titleHighlight}
						</span>
					</h2>
					<p className="text-slate-300 text-sm lg:text-base mt-3 leading-relaxed">
						{PNPE_MISSIONS.subtitle}
					</p>
				</motion.div>

				{/* Cards grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{items.map((mission, i) => (
						<MissionCard
							key={mission.title}
							icon={ICONS[i]}
							title={mission.title}
							description={mission.description}
							delay={0.1 + i * 0.1}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

function MissionCard({
	icon: Icon,
	title,
	description,
	delay,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	delay: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, delay }}
			className="card-landing-dark p-8 lg:p-10 group"
		>
			<div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/15 transition-colors duration-300">
				<Icon aria-hidden="true" className="w-5 h-5 text-slate-300 group-hover:text-emerald-400 transition-colors duration-300" />
			</div>

			<h3 className="text-lg font-display font-bold text-white mb-2 tracking-tight">
				{title}
			</h3>
			<p className="text-slate-300 leading-relaxed text-sm">
				{description}
			</p>
		</motion.div>
	);
}
