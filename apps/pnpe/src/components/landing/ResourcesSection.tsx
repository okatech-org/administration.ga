import { motion } from "motion/react";
import { BookOpen, Layers, GraduationCap, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const RESOURCES: {
	icon: LucideIcon;
	title: string;
	description: string;
	badge: string;
	color: string;
	iconBg: string;
	href: string;
}[] = [
	{
		icon: BookOpen,
		title: "Code du travail gabonais",
		description:
			"Accédez aux articles clés du Code du travail gabonais : contrats (L. 27+), apprentissage, rupture, congés, salaires. Annoté avec les actions PNPE correspondantes (vérification employeur, suivi contrat).",
		badge: "Articles clés",
		color: "text-blue-600 dark:text-blue-400",
		iconBg: "bg-blue-50 dark:bg-blue-950/40",
		href: "#ressources",
	},
	{
		icon: Layers,
		title: "Atouts de la plateforme",
		description:
			"Découvrez comment les 4 modules PNPE (catalogue d'offres, vivier employeur, parcours BMC Auto-Emploi, suivi de contrats) servent les 3 programmes : Emploi Salarié, Auto-Emploi, Formation.",
		badge: "4 modules",
		color: "text-primary",
		iconBg: "bg-primary/10",
		href: "#ressources",
	},
	{
		icon: GraduationCap,
		title: "Tutoriels Pratiques",
		description:
			"Guides pas-à-pas pour les D.E (inscription, candidature, BMC) et les employeurs (publication d'offre, vérification, suivi candidatures). Filtrés par niveau et durée estimée.",
		badge: "6 guides",
		color: "text-violet-600 dark:text-violet-400",
		iconBg: "bg-violet-50 dark:bg-violet-950/40",
		href: "#tutoriels",
	},
];

export function ResourcesSection() {
	return (
		<section id="ressources" className="py-24 bg-section-alt">
			<div className="container mx-auto px-6 lg:px-12">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="text-center max-w-2xl mx-auto mb-16"
				>
					<span className="badge-pill-landing mb-6">Documentation</span>
					<h2 className="text-3xl lg:text-4xl font-display font-bold mb-4 text-foreground tracking-tight">
						Documentation &{" "}
						<span className="text-gradient-primary">Ressources</span>
					</h2>
					<p className="text-muted-foreground text-lg leading-relaxed">
						Toutes les références juridiques, guides pratiques et ressources
						de formation réunis en un seul endroit.
					</p>
				</motion.div>

				{/* Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{RESOURCES.map((res, i) => (
						<motion.div
							key={res.title}
							initial={{ opacity: 0, y: 32 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: i * 0.12 }}
							className="card-landing p-8 flex flex-col group"
						>
							{/* Icon + badge row */}
							<div className="flex items-start justify-between mb-6">
								<div
									className={`w-12 h-12 rounded-2xl flex items-center justify-center ${res.iconBg}`}
								>
									<res.icon className={`w-5 h-5 ${res.color}`} />
								</div>
								<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
									{res.badge}
								</span>
							</div>

							{/* Content */}
							<h3 className="text-lg font-display font-bold text-foreground mb-3 tracking-tight">
								{res.title}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed flex-1">
								{res.description}
							</p>

							{/* CTA */}
							<div className="mt-6 pt-5 border-t border-border">
								<a
									href={res.href}
									onClick={(e) => {
										e.preventDefault();
										document
											.querySelector(res.href)
											?.scrollIntoView({ behavior: "smooth" });
									}}
									className={`inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${res.color} hover:gap-2.5`}
								>
									Découvrir
									<ArrowRight className="w-3.5 h-3.5" />
								</a>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
