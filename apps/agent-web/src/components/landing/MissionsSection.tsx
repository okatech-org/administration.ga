import { motion } from "motion/react";
import { Globe, Shield, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";

const ICONS: LucideIcon[] = [Globe, Shield, Scale];

export function MissionsSection() {
	const { t } = useTranslation();

	const items = t("agentLanding.missions.items", { returnObjects: true }) as Array<{
		title: string;
		description: string;
	}>;

	return (
		<section className="h-full flex flex-col justify-center bg-white dark:bg-background">
			<div className="container mx-auto px-6 lg:px-12">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center max-w-2xl mx-auto mb-8 lg:mb-10"
				>
					<span className="badge-pill-landing mb-4">
						{t("agentLanding.missions.badge")}
					</span>
					<h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground tracking-tight">
						{t("agentLanding.missions.title")}{" "}
						<span className="text-gradient-primary">
							{t("agentLanding.missions.titleGradient")}
						</span>
					</h2>
					<p className="text-muted-foreground text-sm lg:text-base mt-3 leading-relaxed">
						{t("agentLanding.missions.subtitle")}
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
			className="card-landing p-8 lg:p-10 group"
		>
			<div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-300">
				<Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
			</div>

			<h3 className="text-lg font-display font-bold text-foreground mb-2 tracking-tight">
				{title}
			</h3>
			<p className="text-muted-foreground leading-relaxed text-sm">
				{description}
			</p>
		</motion.div>
	);
}
