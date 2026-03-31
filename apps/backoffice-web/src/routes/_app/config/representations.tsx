/**
 * Représentations diplomatiques — Page de configuration unifiée
 *
 * Fusionne l'ancien "Modules & Permissions" et "Représentations" en une seule page.
 * Contient :
 *  1. Statistiques globales
 *  2. Templates par type d'org (postes + modules + grades)
 *  3. Matrice modules × types d'org
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Building2,
	Check,
	ChevronDown,
	ChevronRight,
	Globe,
	Layers,
	Lock,
	Plus,
	Shield,
	Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ORGANIZATION_TEMPLATES,
	POSITION_GRADES,
	type PositionTemplate,
} from "@convex/lib/roles";
import {
	MODULE_REGISTRY,
	ACCESS_LEVEL_META,
	CATEGORY_ORDER,
	type ModuleCategory,
	type ModuleCodeValue,
	type ModuleAccessLevel,
} from "@convex/lib/moduleCodes";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/config/representations")({
	component: RepresentationsConfigPage,
});

// ─── Category metadata ─────────────────────────────────────────
const CATEGORY_META: Record<ModuleCategory, { label: { fr: string; en: string }; color: string; bgColor: string }> = {
	core: { label: { fr: "Coeur de système", en: "Core" }, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
	consular: { label: { fr: "Services consulaires", en: "Consular services" }, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
	diplomatic: { label: { fr: "Modules diplomatiques", en: "Diplomatic" }, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
	tools: { label: { fr: "Communication & Outils", en: "Communication & Tools" }, color: "text-teal-600", bgColor: "bg-teal-50 dark:bg-teal-950/30" },
	finance: { label: { fr: "Finance", en: "Finance" }, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
	admin: { label: { fr: "Administration", en: "Administration" }, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
};

// ─── Icon mapping ──────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
	Landmark: "Landmark", Building: "Building", Building2: "Building2",
	Home: "Home", Globe: "Globe", Star: "Star", Crown: "Crown",
	Settings: "Shield", Handshake: "Users",
};

// ─── Position Badge (expandable) ───────────────────────────────
function PositionBadge({ position, lang }: { position: PositionTemplate; lang: string }) {
	const grade = position.grade ? POSITION_GRADES[position.grade] : null;
	const [expanded, setExpanded] = useState(false);
	const moduleAccess = position.moduleAccess ?? [];

	return (
		<div className="rounded-lg border bg-card overflow-hidden">
			<button
				type="button"
				onClick={() => moduleAccess.length > 0 && setExpanded(!expanded)}
				className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-muted/30 transition-colors"
			>
				{moduleAccess.length > 0 ? (
					expanded
						? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
						: <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
				) : <div className="w-3" />}
				<div className={cn("h-2 w-2 rounded-full shrink-0", grade?.color?.replace("text-", "bg-") || "bg-gray-400")} />
				<span className="text-sm font-medium truncate flex-1">
					{position.title[lang as "fr" | "en"] || position.title.fr}
				</span>
				{grade && (
					<span className={cn("text-[10px] font-medium shrink-0", grade.color)}>
						{grade.shortLabel[lang as "fr" | "en"] || grade.shortLabel.fr}
					</span>
				)}
				{position.isRequired && (
					<Badge variant="outline" className="text-[8px] h-4 px-1 text-amber-600 border-amber-300 shrink-0">
						{lang === "fr" ? "Requis" : "Required"}
					</Badge>
				)}
				{moduleAccess.length > 0 && (
					<Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
						{moduleAccess.length} mod.
					</Badge>
				)}
			</button>
			{expanded && moduleAccess.length > 0 && (
				<div className="px-3 pb-2 pt-0 border-t border-border/30">
					<div className="flex flex-wrap gap-1 pt-1.5">
						{moduleAccess.map((ma) => {
							const mod = MODULE_REGISTRY[ma.moduleCode as ModuleCodeValue];
							const meta = ACCESS_LEVEL_META[ma.accessLevel as ModuleAccessLevel];
							if (!mod || !meta) return null;
							return (
								<span key={ma.moduleCode} className={cn("inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border", meta.color)}>
									{mod.label[lang as "fr" | "en"] || mod.label.fr}
								</span>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Main Page ─────────────────────────────────────────────────
function RepresentationsConfigPage() {
	const templates = useMemo(() => ORGANIZATION_TEMPLATES, []);
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";
	const [selectedOrgType, setSelectedOrgType] = useState<string | null>(null);

	// Modules par catégorie
	const modulesByCategory = useMemo(() => {
		const groups = Object.fromEntries(
			CATEGORY_ORDER.map((cat) => [cat, [] as typeof MODULE_REGISTRY[keyof typeof MODULE_REGISTRY][]])
		) as Record<ModuleCategory, typeof MODULE_REGISTRY[keyof typeof MODULE_REGISTRY][]>;
		for (const mod of Object.values(MODULE_REGISTRY)) {
			groups[mod.category].push(mod);
		}
		return groups;
	}, []);

	const totalModules = Object.keys(MODULE_REGISTRY).length;
	const coreModules = Object.values(MODULE_REGISTRY).filter(m => m.isCore).length;
	const totalPositions = templates.reduce((s, t) => s + t.positions.length, 0);

	// Filtre par type d'org
	const selectedTemplate = selectedOrgType ? templates.find(t => t.type === selectedOrgType) : null;
	const orgModuleSet = new Set<string>(selectedTemplate?.modules || []);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6 pt-8">
			{/* ─── Header ─── */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
							<Globe className="h-5 w-5 text-primary" />
						</div>
						{lang === "fr" ? "Représentations diplomatiques" : "Diplomatic representations"}
					</h1>
					<p className="text-muted-foreground mt-1">
						{lang === "fr"
							? "Types de représentations, postes, modules et niveaux d'accès par défaut"
							: "Representation types, positions, modules and default access levels"}
					</p>
				</div>
				<Button asChild>
					<Link to="/orgs/new">
						<Plus className="mr-1.5 h-4 w-4" />
						{lang === "fr" ? "Nouvelle représentation" : "New representation"}
					</Link>
				</Button>
			</div>

			{/* ─── Stats ─── */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="bg-linear-to-br from-primary/5 to-transparent">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-primary">{templates.length}</div>
						<div className="text-xs text-muted-foreground">{lang === "fr" ? "Types" : "Types"}</div>
					</CardContent>
				</Card>
				<Card className="bg-linear-to-br from-amber-500/5 to-transparent">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-amber-600">{totalPositions}</div>
						<div className="text-xs text-muted-foreground">{lang === "fr" ? "Postes prédéfinis" : "Predefined positions"}</div>
					</CardContent>
				</Card>
				<Card className="bg-linear-to-br from-blue-500/5 to-transparent">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-blue-600">{totalModules}</div>
						<div className="text-xs text-muted-foreground">{lang === "fr" ? "Modules disponibles" : "Available modules"}</div>
					</CardContent>
				</Card>
				<Card className="bg-linear-to-br from-emerald-500/5 to-transparent">
					<CardContent className="p-4">
						<div className="text-2xl font-bold text-emerald-600">{coreModules}</div>
						<div className="text-xs text-muted-foreground">{lang === "fr" ? "Modules obligatoires" : "Core modules"}</div>
					</CardContent>
				</Card>
			</div>

			{/* ─── Templates par type d'org ─── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{templates.map((tpl) => {
					const requiredPositions = tpl.positions.filter(p => p.isRequired).length;
					const gradeDistribution = Object.entries(POSITION_GRADES)
						.map(([key, grade]) => ({
							key, label: grade.label[lang as "fr" | "en"] || grade.label.fr,
							color: grade.color, bgColor: grade.bgColor,
							count: tpl.positions.filter(p => p.grade === key).length,
						}))
						.filter(g => g.count > 0);
					const positionsWithMA = tpl.positions.filter(p => p.moduleAccess && p.moduleAccess.length > 0).length;

					return (
						<Card key={tpl.type} className="overflow-hidden">
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
											<DynamicLucideIcon name={ICON_MAP[tpl.icon] || "Building2"} className="h-5 w-5 text-primary" />
										</div>
										<div>
											<CardTitle className="text-base">{tpl.label[lang as "fr" | "en"] || tpl.label.fr}</CardTitle>
											<CardDescription className="text-xs">{tpl.description[lang as "fr" | "en"] || tpl.description.fr}</CardDescription>
										</div>
									</div>
									<Badge variant="outline" className="shrink-0 text-xs">{tpl.type}</Badge>
								</div>
								<div className="flex items-center gap-2 mt-3 flex-wrap">
									{gradeDistribution.map((g) => (
										<span key={g.key} className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", g.bgColor, g.color)}>
											{g.label}: {g.count}
										</span>
									))}
								</div>
							</CardHeader>
							<CardContent className="pt-0 space-y-3">
								<div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-3">
									<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{tpl.positions.length} {lang === "fr" ? "postes" : "positions"}</span>
									<span className="text-amber-600">{requiredPositions} {lang === "fr" ? "requis" : "required"}</span>
									<span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{tpl.modules.length} modules</span>
									{positionsWithMA > 0 && (
										<span className="flex items-center gap-1 text-emerald-600">
											<Shield className="h-3.5 w-3.5" />{positionsWithMA} {lang === "fr" ? "avec accès modulaire" : "with module access"}
										</span>
									)}
								</div>
								<div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
									{tpl.positions.map((pos) => (
										<PositionBadge key={pos.code} position={pos} lang={lang} />
									))}
								</div>
								<div className="border-t pt-3">
									<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
										{lang === "fr" ? "Modules activés" : "Enabled modules"}
									</p>
									<div className="flex flex-wrap gap-1">
										{tpl.modules.slice(0, 12).map((mod) => {
											const def = MODULE_REGISTRY[mod as ModuleCodeValue];
											if (!def) return null;
											return (
												<Badge key={mod} variant="outline" className="text-[9px] px-1.5 py-0 h-4">
													{def.label[lang as "fr" | "en"] || def.label.fr}
												</Badge>
											);
										})}
										{tpl.modules.length > 12 && (
											<Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">+{tpl.modules.length - 12}</Badge>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* ─── Matrice modules × types d'org (repris de l'ancien modules.tsx) ─── */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Layers className="h-4 w-4 text-primary" />
						{lang === "fr" ? "Matrice modules × représentations" : "Module × representation matrix"}
					</CardTitle>
					<CardDescription>
						{lang === "fr" ? "Distribution des modules par type de représentation" : "Module distribution by representation type"}
					</CardDescription>
					{/* Filtre par type d'org */}
					<div className="flex flex-wrap items-center gap-1.5 mt-3">
						<button
							type="button"
							className={cn("text-xs rounded-full px-2.5 py-1 border transition-colors",
								!selectedOrgType ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent")}
							onClick={() => setSelectedOrgType(null)}
						>
							{lang === "fr" ? "Tous" : "All"}
						</button>
						{templates.map((tpl) => (
							<button
								key={tpl.type}
								type="button"
								className={cn("text-xs rounded-full px-2.5 py-1 border transition-colors flex items-center gap-1",
									selectedOrgType === tpl.type ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent")}
								onClick={() => setSelectedOrgType(tpl.type)}
							>
								{(tpl.label[lang as "fr" | "en"] || tpl.label.fr).split(" ")[0]}
								<Badge variant={selectedOrgType === tpl.type ? "secondary" : "outline"} className="text-[9px] h-4 px-1">{tpl.modules.length}</Badge>
							</button>
						))}
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{(Object.entries(modulesByCategory) as [ModuleCategory, typeof MODULE_REGISTRY[keyof typeof MODULE_REGISTRY][]][]).map(
							([category, modules]) => {
								if (modules.length === 0) return null;
								const catMeta = CATEGORY_META[category];
								return (
									<div key={category}>
										<div className="flex items-center gap-2 mb-2">
											<div className={cn("h-5 w-5 rounded flex items-center justify-center", catMeta.bgColor)}>
												<span className={cn("text-[10px] font-bold", catMeta.color)}>{modules.length}</span>
											</div>
											<h4 className={cn("text-xs font-bold", catMeta.color)}>
												{catMeta.label[lang as "fr" | "en"]}
											</h4>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
											{modules.map((mod) => {
												const isActive = selectedOrgType ? orgModuleSet.has(mod.code) : true;
												return (
													<div key={mod.code} className={cn(
														"flex items-center gap-2.5 rounded-lg border p-2.5 transition-opacity",
														!isActive && selectedOrgType && "opacity-25",
													)}>
														<DynamicLucideIcon name={mod.icon} className={cn("h-4 w-4 shrink-0", mod.color)} />
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-1.5">
																<span className="text-xs font-medium truncate">{mod.label[lang as "fr" | "en"] || mod.label.fr}</span>
																{mod.isCore && <Lock className="h-2.5 w-2.5 text-emerald-500 shrink-0" />}
																{selectedOrgType && isActive && <Check className="h-3 w-3 text-green-500 ml-auto shrink-0" />}
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							}
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
