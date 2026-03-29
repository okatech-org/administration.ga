import { motion } from "motion/react";
import { useState } from "react";
import {
	GraduationCap,
	Archive,
	FolderOpen,
	FileText,
	Calendar,
	IdCard,
	Bot,
	Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type Level = "Débutant" | "Intermédiaire" | "Avancé";

const LEVEL_I18N_KEY: Record<Level, string> = {
	"Débutant": "agentLanding.tutorials.levels.beginner",
	"Intermédiaire": "agentLanding.tutorials.levels.intermediate",
	"Avancé": "agentLanding.tutorials.levels.advanced",
};

const LEVEL_STYLES: Record<Level, string> = {
	Débutant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
	Intermédiaire: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
	Avancé: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

interface Tutorial {
	id: string;
	module: string;
	icon: React.ElementType;
	iconBg: string;
	iconColor: string;
	level: Level;
	duration: string;
	title: string;
	summary: string;
}

const TUTORIALS: Tutorial[] = [
	{ id: "iarchive-memo", module: "iArchive", icon: Archive, iconBg: "bg-violet-500/10", iconColor: "text-violet-600 dark:text-violet-400", level: "Débutant", duration: "5 min", title: "Classer un mémorandum", summary: "Archivez un mémorandum diplomatique en respectant la classification et l'intégrité cryptographique." },
	{ id: "icorrespondance-note", module: "iCorrespondance", icon: FolderOpen, iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400", level: "Intermédiaire", duration: "8 min", title: "Préparer une note verbale", summary: "Rédigez et envoyez une note verbale via le canal sécurisé de la valise diplomatique." },
	{ id: "idocument-dossier", module: "iDocument", icon: FileText, iconBg: "bg-amber-500/10", iconColor: "text-amber-600 dark:text-amber-400", level: "Débutant", duration: "6 min", title: "Gérer un dossier citoyen", summary: "Créez et suivez un dossier consulaire, de la demande à la délivrance." },
	{ id: "iagenda-rdv", module: "iAgenda", icon: Calendar, iconBg: "bg-teal-500/10", iconColor: "text-teal-600 dark:text-teal-400", level: "Débutant", duration: "4 min", title: "Planifier un RDV consulaire", summary: "Gérez le planning des rendez-vous et optimisez l'accueil des ressortissants." },
	{ id: "registre", module: "Registre", icon: IdCard, iconBg: "bg-rose-500/10", iconColor: "text-rose-600 dark:text-rose-400", level: "Intermédiaire", duration: "10 min", title: "Immatriculer un ressortissant", summary: "Enregistrez un ressortissant gabonais dans votre circonscription consulaire." },
	{ id: "iasted-ticket", module: "iAsted", icon: Bot, iconBg: "bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400", level: "Avancé", duration: "7 min", title: "Traiter un ticket iAsted", summary: "Prenez en charge un ticket escaladé par l'IA et résolvez un cas complexe." },
];

// ─── Compact card ──────────────────────────────────────────────────────────

function TutorialCard({ tutorial, t }: { tutorial: Tutorial; t: (key: string) => string }) {
	const Icon = tutorial.icon;

	return (
		<div className="card-landing p-5 group flex flex-col">
			{/* Top: icon + module */}
			<div className="flex items-center gap-3 mb-3">
				<div className={cn("p-2 rounded-xl shrink-0", tutorial.iconBg)}>
					<Icon className={cn("size-4", tutorial.iconColor)} />
				</div>
				<div className="flex-1 min-w-0">
					<span className="text-[10px] bg-slate-100 dark:bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-slate-200 dark:border-border">
						{tutorial.module}
					</span>
				</div>
			</div>

			{/* Title */}
			<h4 className="text-sm font-display font-bold text-foreground mb-1.5 tracking-tight leading-snug">
				{tutorial.title}
			</h4>

			{/* Summary */}
			<p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
				{tutorial.summary}
			</p>

			{/* Bottom: level + duration */}
			<div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
				<span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", LEVEL_STYLES[tutorial.level])}>
					{t(LEVEL_I18N_KEY[tutorial.level])}
				</span>
				<span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
					<Clock className="size-2.5" />{tutorial.duration}
				</span>
			</div>
		</div>
	);
}

// ─── Main ──────────────────────────────────────────────────────────────────

const ALL_LEVELS: Array<Level | "Tous"> = ["Tous", "Débutant", "Intermédiaire", "Avancé"];

export function TutorielsPanel() {
	const [activeLevel, setActiveLevel] = useState<Level | "Tous">("Tous");
	const { t } = useTranslation();

	const filtered = activeLevel === "Tous" ? TUTORIALS : TUTORIALS.filter((tut) => tut.level === activeLevel);

	const getLevelLabel = (level: Level | "Tous") => {
		if (level === "Tous") return t("agentLanding.tutorials.levels.all");
		return t(LEVEL_I18N_KEY[level]);
	};

	return (
		<section className="h-full flex flex-col bg-slate-50 dark:bg-background/50">
			<div className="container mx-auto px-6 lg:px-12 pt-20 lg:pt-24 flex flex-col flex-1 min-h-0">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center mb-6"
				>
					<span className="badge-pill-landing mb-4">Tutoriels</span>
					<h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground tracking-tight">
						Guides{" "}
						<span className="text-gradient-primary">Pratiques</span>
					</h2>
					<p className="text-muted-foreground text-sm mt-2">
						{t("agentLanding.tutorials.subtitle")}
					</p>
				</motion.div>

				{/* Level filter + count */}
				<div className="flex items-center justify-center gap-2 flex-wrap mb-6">
					{ALL_LEVELS.map((level) => (
						<button
							key={level}
							type="button"
							onClick={() => setActiveLevel(level)}
							className={cn(
								"px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200",
								activeLevel === level
									? "bg-foreground text-background border-foreground"
									: "bg-white dark:bg-card text-muted-foreground border-slate-200 dark:border-border hover:border-slate-300",
							)}
						>
							{getLevelLabel(level)}
							{level !== "Tous" && (
								<span className="ml-1 opacity-60">
									({TUTORIALS.filter((tut) => tut.level === level).length})
								</span>
							)}
						</button>
					))}
					<span className="text-xs text-muted-foreground ml-1">
						{filtered.length} {filtered.length > 1 ? t("agentLanding.tutorials.tutorials") : t("agentLanding.tutorials.tutorial")}
					</span>
				</div>

				{/* Grid 3×2 */}
				<div className="flex-1 min-h-0 pb-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{filtered.map((tutorial, i) => (
							<motion.div
								key={tutorial.id}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: 0.05 * i }}
							>
								<TutorialCard tutorial={tutorial} t={t} />
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
