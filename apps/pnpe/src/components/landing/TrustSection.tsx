import { motion } from "motion/react";
import { Scale, Shield, Globe } from "lucide-react";

const TRUST_ITEMS = [
	{
		icon: Scale,
		title: "Conformité juridique",
		description:
			"Aligné sur les Conventions de Vienne de 1961 et 1963, piliers fondamentaux du droit diplomatique international.",
	},
	{
		icon: Shield,
		title: "Sécurité maximale",
		description:
			"Chiffrement de bout en bout, accès contrôlé par rôle et journaux d'audit pour chaque action critique.",
	},
	{
		icon: Globe,
		title: "Souveraineté numérique",
		description:
			"Hébergement souverain, données sous juridiction gabonaise, indépendance technologique totale.",
	},
];

export function TrustSection() {
	return (
		<section
			className="relative py-20 overflow-hidden"
			style={{
				background:
					"linear-gradient(135deg, oklch(0.12 0.04 145) 0%, oklch(0.15 0.05 170) 50%, oklch(0.1 0.03 220) 100%)",
			}}
		>
			{/* Subtle texture overlay */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
					backgroundSize: "32px 32px",
				}}
			/>

			<div className="container mx-auto px-6 lg:px-12 relative">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="flex flex-col md:flex-row items-center md:items-stretch gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10"
				>
					{TRUST_ITEMS.map((item, i) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: i * 0.1 }}
							className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-5 px-6 lg:px-10 py-6 md:py-0"
						>
							{/* Icon */}
							<div
								className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
								style={{
									background: "rgba(255,255,255,0.08)",
									border: "1px solid rgba(255,255,255,0.12)",
								}}
							>
								<item.icon
									className="w-5 h-5"
									style={{ color: "oklch(0.78 0.18 145)" }}
								/>
							</div>

							{/* Text */}
							<div>
								<h4
									className="text-base font-display font-semibold mb-1"
									style={{ color: "rgba(255,255,255,0.95)" }}
								>
									{item.title}
								</h4>
								<p
									className="text-sm leading-relaxed"
									style={{ color: "rgba(203,213,225,0.65)" }}
								>
									{item.description}
								</p>
							</div>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
