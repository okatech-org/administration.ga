import { motion } from "motion/react";
import { Archive, Mail, FileText, LifeBuoy, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MODULES: {
	icon: LucideIcon;
	name: string;
	description: string;
	color: string;
	bg: string;
	darkBg: string;
}[] = [
	{
		icon: Archive,
		name: "iArchive",
		description:
			"Archivage numérique sécurisé de la correspondance diplomatique. Classement automatique, recherche plein-texte et traçabilité complète des documents.",
		color: "text-violet-600 dark:text-violet-400",
		bg: "bg-violet-50",
		darkBg: "dark:bg-violet-950/40",
	},
	{
		icon: Mail,
		name: "iCorrespondance",
		description:
			"Échanges sécurisés entre postes et la Centrale. Notes verbales, mémorandums et dépêches chiffrées selon les Conventions de Vienne.",
		color: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-50",
		darkBg: "dark:bg-blue-950/40",
	},
	{
		icon: FileText,
		name: "iDocument",
		description:
			"Gestion centralisée des documents officiels : passeports, visas, actes d'état civil, légalisations. Workflow d'approbation hiérarchique intégré.",
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-50",
		darkBg: "dark:bg-amber-950/40",
	},
	{
		icon: LifeBuoy,
		name: "iAsted",
		description:
			"Assistance et protection consulaire des ressortissants gabonais à l'étranger. Tickets de suivi, registre d'immatriculation et alertes d'urgence.",
		color: "text-teal-600 dark:text-teal-400",
		bg: "bg-teal-50",
		darkBg: "dark:bg-teal-950/40",
	},
];

export function ModulesSection() {
	return (
		<section id="modules" className="py-24 bg-white dark:bg-background">
			<div className="container mx-auto px-6 lg:px-12">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="text-center max-w-2xl mx-auto mb-16"
				>
					<span className="badge-pill-landing mb-6">
						Modules de la plateforme
					</span>
					<h2 className="text-3xl lg:text-4xl font-display font-bold mb-4 text-foreground tracking-tight">
						Quatre Outils.{" "}
						<span className="text-gradient-primary">Une Mission.</span>
					</h2>
					<p className="text-muted-foreground text-lg leading-relaxed">
						Chaque module répond à un besoin précis de l'exercice diplomatique
						et consulaire, dans le strict respect des Conventions de Vienne.
					</p>
				</motion.div>

				{/* Cards grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{MODULES.map((mod, i) => (
						<ModuleCard key={mod.name} module={mod} delay={i * 0.1} />
					))}
				</div>
			</div>
		</section>
	);
}

function ModuleCard({
	module: mod,
	delay,
}: {
	module: (typeof MODULES)[number];
	delay: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 32 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.6, delay }}
			className="card-landing p-7 flex flex-col group"
		>
			{/* Icon */}
			<div
				className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${mod.bg} ${mod.darkBg}`}
			>
				<mod.icon className={`w-5 h-5 ${mod.color}`} />
			</div>

			{/* Content */}
			<h3 className="text-lg font-display font-bold text-foreground mb-2 tracking-tight">
				{mod.name}
			</h3>
			<p className="text-muted-foreground text-sm leading-relaxed flex-1">
				{mod.description}
			</p>

			{/* Link */}
			<div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
				En savoir plus
				<ArrowRight className="w-3.5 h-3.5" />
			</div>
		</motion.div>
	);
}
