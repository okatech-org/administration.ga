import { motion } from "motion/react";
import { useState } from "react";
import {
	BookOpen,
	Scale,
	ShieldCheck,
	CheckCircle2,
	Archive,
	FolderOpen,
	FileText,
	Bot,
	Zap,
	Shield,
	Globe,
	Lock,
	Building2,
	MessageSquare,
	UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type ResourceTab = "overview" | "conventions" | "atouts";

// ─── Data ──────────────────────────────────────────────────────────────────

const CONVENTIONS = [
	{
		year: "1961",
		title: "Relations diplomatiques",
		color: "blue" as const,
		articles: [
			{ number: "Art. 22", title: "Inviolabilité des locaux", icon: Building2 },
			{ number: "Art. 24", title: "Inviolabilité des archives", icon: Shield },
			{ number: "Art. 27", title: "Liberté de communication", icon: Lock },
			{ number: "Art. 29", title: "Inviolabilité de l'agent", icon: UserCheck },
			{ number: "Art. 31", title: "Immunité de juridiction", icon: Scale },
		],
	},
	{
		year: "1963",
		title: "Relations consulaires",
		color: "teal" as const,
		articles: [
			{ number: "Art. 5", title: "Fonctions consulaires", icon: Globe },
			{ number: "Art. 33", title: "Inviolabilité des archives", icon: FileText },
			{ number: "Art. 35", title: "Liberté de communication", icon: MessageSquare },
			{ number: "Art. 36", title: "Communication avec ressortissants", icon: UserCheck },
		],
	},
];

const MODULES = [
	{ module: "iArchive", icon: Archive, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", tagline: "Inviolabilité numérique des archives", features: ["Chiffrement E2E", "Hash SHA-256", "Audit immuable"] },
	{ module: "iCorrespondance", icon: FolderOpen, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", tagline: "Valise diplomatique sécurisée", features: ["Canal chiffré", "Signatures avancées", "Accusés certifiés"] },
	{ module: "iDocument", icon: FileText, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", tagline: "Documents consulaires conformes", features: ["Coffre-fort certifié", "Workflow validation", "Export sécurisé"] },
	{ module: "iAsted", icon: Bot, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10", tagline: "Assistance consulaire IA 24/7", features: ["Multilingue", "Escalade humaine", "RDV intégré"] },
];

const COMPLIANCE = [
	{ req: "Inviolabilité des archives", mod: "iArchive" },
	{ req: "Valise diplomatique numérique", mod: "iCorrespondance" },
	{ req: "Liberté de communication chiffrée", mod: "iCorrespondance" },
	{ req: "Inviolabilité documents consulaires", mod: "iDocument" },
	{ req: "Assistance aux ressortissants", mod: "iAsted" },
	{ req: "Gestion des rendez-vous", mod: "iAgenda" },
];

// ─── Tab views ─────────────────────────────────────────────────────────────

function OverviewTab({ onTabChange, t }: { onTabChange: (t: ResourceTab) => void; t: (key: string) => string }) {
	return (
		<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
			<p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
				{t("agentLanding.resources.overview.description")}
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{[
					{ tab: "conventions" as ResourceTab, icon: Scale, bg: "bg-blue-500/10", color: "text-blue-700 dark:text-blue-300", title: t("agentLanding.resources.overview.conventionsTitle"), desc: t("agentLanding.resources.overview.conventionsDesc") },
					{ tab: "atouts" as ResourceTab, icon: ShieldCheck, bg: "bg-emerald-500/10", color: "text-emerald-700 dark:text-emerald-300", title: t("agentLanding.resources.overview.atoutsTitle"), desc: t("agentLanding.resources.overview.atoutsDesc") },
				].map((item) => {
					const Icon = item.icon;
					return (
						<button key={item.tab} type="button" onClick={() => onTabChange(item.tab)}
							className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:border-primary/40 transition-all text-left group"
						>
							<div className={cn("p-2 rounded-xl shrink-0", item.bg)}><Icon className={cn("size-4", item.color)} /></div>
							<div>
								<p className="font-semibold text-foreground text-sm mb-0.5">{item.title}</p>
								<p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
								<span className="text-xs font-semibold text-primary mt-1.5 inline-block group-hover:underline">{t("agentLanding.resources.overview.explore")}</span>
							</div>
						</button>
					);
				})}
			</div>
			{/* Compliance inline */}
			<div className="rounded-xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted/40 p-4">
				<div className="flex items-center gap-2 mb-3">
					<Shield className="size-3.5 text-muted-foreground" />
					<span className="text-xs font-semibold text-foreground">{t("agentLanding.resources.overview.compliance")}</span>
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
					{COMPLIANCE.map((row) => (
						<div key={row.req} className="flex items-center gap-2">
							<CheckCircle2 className="size-3 text-primary shrink-0" />
							<span className="text-xs text-muted-foreground truncate">{row.req}</span>
							<span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{row.mod}</span>
						</div>
					))}
				</div>
			</div>
		</motion.div>
	);
}

function ConventionsTab() {
	return (
		<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
			className="grid grid-cols-1 lg:grid-cols-2 gap-6"
		>
			{CONVENTIONS.map((conv) => {
				const isBlue = conv.color === "blue";
				return (
					<div key={conv.year} className="space-y-3">
						{/* Convention header */}
						<div className={cn("flex items-center gap-2.5 p-3 rounded-xl border", isBlue ? "bg-blue-500/5 border-blue-500/10" : "bg-teal-500/5 border-teal-500/10")}>
							<span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg border", isBlue ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20")}>
								{conv.year}
							</span>
							<span className="text-sm font-semibold text-foreground">
								Convention — {conv.title}
							</span>
						</div>
						{/* Articles list compact */}
						<div className="space-y-1">
							{conv.articles.map((article) => {
								const Icon = article.icon;
								return (
									<div key={article.number} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-card border border-slate-100 dark:border-border">
										<div className={cn("p-1 rounded-md shrink-0", isBlue ? "bg-blue-500/10" : "bg-teal-500/10")}>
											<Icon className={cn("size-3", isBlue ? "text-blue-600 dark:text-blue-400" : "text-teal-600 dark:text-teal-400")} />
										</div>
										<span className={cn("text-[10px] font-mono font-bold shrink-0", isBlue ? "text-blue-700 dark:text-blue-300" : "text-teal-700 dark:text-teal-300")}>
											{article.number}
										</span>
										<span className="text-sm text-foreground truncate">{article.title}</span>
									</div>
								);
							})}
						</div>
					</div>
				);
			})}
		</motion.div>
	);
}

function AtoutsTab() {
	return (
		<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
			className="grid grid-cols-1 sm:grid-cols-2 gap-4"
		>
			{MODULES.map((mod) => {
				const Icon = mod.icon;
				return (
					<div key={mod.module} className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className={cn("p-1.5 rounded-lg", mod.bg)}>
								<Icon className={cn("size-4", mod.color)} />
							</div>
							<div>
								<p className="text-sm font-bold text-foreground">{mod.module}</p>
								<p className="text-[10px] text-muted-foreground">{mod.tagline}</p>
							</div>
						</div>
						<ul className="space-y-1">
							{mod.features.map((f) => (
								<li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
									<Zap className={cn("size-2.5 shrink-0", mod.color)} />
									{f}
								</li>
							))}
						</ul>
					</div>
				);
			})}
		</motion.div>
	);
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function RessourcesPanel() {
	const [activeTab, setActiveTab] = useState<ResourceTab>("overview");
	const { t } = useTranslation();

	const TABS: { key: ResourceTab; label: string; icon: React.ElementType }[] = [
		{ key: "overview", label: t("agentLanding.resources.tabs.overview"), icon: BookOpen },
		{ key: "conventions", label: t("agentLanding.resources.tabs.conventions"), icon: Scale },
		{ key: "atouts", label: t("agentLanding.resources.tabs.atouts"), icon: ShieldCheck },
	];

	return (
		<section className="h-full flex flex-col bg-white dark:bg-background">
			<div className="container mx-auto px-6 lg:px-12 pt-20 lg:pt-24 flex flex-col flex-1 min-h-0">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center mb-6"
				>
					<span className="badge-pill-landing mb-4">Documentation</span>
					<h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground tracking-tight">
						{t("agentLanding.resources.header")}{" "}
						<span className="text-gradient-primary">&amp; Ressources</span>
					</h2>
					<p className="text-muted-foreground text-sm mt-2">
						{t("agentLanding.resources.subtitle")}
					</p>
				</motion.div>

				{/* Tab switcher */}
				<div className="flex items-center justify-center gap-1 mb-6">
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-muted rounded-xl p-1">
						{TABS.map((tab) => {
							const Icon = tab.icon;
							const active = activeTab === tab.key;
							return (
								<button
									key={tab.key}
									type="button"
									onClick={() => setActiveTab(tab.key)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
										active
											? "bg-white dark:bg-card text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Icon className="size-3.5 shrink-0" />
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Tab content — no scroll */}
				<div className="flex-1 min-h-0 pb-6">
					{activeTab === "overview" && <OverviewTab onTabChange={setActiveTab} t={t} />}
					{activeTab === "conventions" && <ConventionsTab />}
					{activeTab === "atouts" && <AtoutsTab />}
				</div>
			</div>
		</section>
	);
}
