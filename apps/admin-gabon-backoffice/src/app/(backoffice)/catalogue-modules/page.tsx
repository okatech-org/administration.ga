"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Activity,
	Archive,
	BarChart3,
	BookOpen,
	Briefcase,
	Building2,
	Calendar,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	Cog,
	Crown,
	Eye,
	FileEdit,
	FileText,
	Files,
	FolderOpen,
	Globe,
	Globe2,
	Inbox,
	Layers,
	LayoutDashboard,
	LayoutGrid,
	LifeBuoy,
	Mail,
	Mailbox,
	Megaphone,
	MessagesSquare,
	Network,
	Newspaper,
	PenLine,
	Settings,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	UserCircle,
	Users,
	Users2,
	Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	ALL_MODULE_CODES,
	CATEGORY_LABELS,
	CATEGORY_ORDER,
	CORE_MODULE_CODES,
	MODULE_REGISTRY,
	type ModuleCategory,
	type ModuleCodeValue,
	type ModuleDefinition,
} from "@convex/lib/moduleCodes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";

/**
 * Catalogue National des Modules — Phase 5 administration.ga.
 *
 * Affiche tous les modules du registre canonique (`MODULE_REGISTRY`), groupés
 * par catégorie (`CATEGORY_ORDER`). Pour chaque module : libellé, description,
 * statut "noyau" (`isCore`), capabilities, et deux actions placeholders pour
 * le MVP : "Voir activations" et "Activer/Désactiver globalement".
 *
 * Pas d'appel Convex en MVP — la page est entièrement dérivée du registre
 * statique. L'activation effective par institution sera câblée en phase
 * ultérieure (mutation `orgs.toggleModule`).
 */

// Mapping des icônes lucide-react référencées dans `MODULE_REGISTRY`.
// Une seule source de vérité pour rendre l'icône statique de chaque module.
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
	Activity,
	Archive,
	BarChart3,
	BookOpen,
	Briefcase,
	Building2,
	Calendar,
	CalendarDays,
	ClipboardList,
	Cog,
	Crown,
	FileEdit,
	FileText,
	Files,
	FolderOpen,
	Globe,
	Globe2,
	Inbox,
	Layers,
	LayoutDashboard,
	LifeBuoy,
	Mail,
	Mailbox,
	Megaphone,
	MessagesSquare,
	Network,
	Newspaper,
	PenLine,
	Settings,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	UserCircle,
	Users,
	Users2,
	Wrench,
};

function ModuleIcon({ name, className }: { name: string; className?: string }) {
	const Cmp = ICONS[name] ?? LayoutGrid;
	return <Cmp className={className} />;
}

export default function CatalogueModulesPage() {
	const { t } = useTranslation();
	// État UI optimiste pour le toggle "actif / désactivé globalement". MVP :
	// pas de persistance backend — l'état est local et reset au refresh.
	const [globallyDisabled, setGloballyDisabled] = useState<Set<ModuleCodeValue>>(
		new Set(),
	);
	// Catégorie sélectionnée pour le filtre. `null` = toutes.
	const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | null>(
		null,
	);

	const totalModules = ALL_MODULE_CODES.length;
	const totalCore = CORE_MODULE_CODES.length;

	const grouped = useMemo(() => {
		const map = new Map<ModuleCategory, ModuleDefinition[]>();
		for (const def of Object.values(MODULE_REGISTRY)) {
			const arr = map.get(def.category) ?? [];
			arr.push(def);
			map.set(def.category, arr);
		}
		return CATEGORY_ORDER.map((cat) => ({
			category: cat,
			modules: map.get(cat) ?? [],
		})).filter((g) => g.modules.length > 0);
	}, []);

	const visibleGroups =
		selectedCategory == null
			? grouped
			: grouped.filter((g) => g.category === selectedCategory);

	const toggleGlobal = (code: ModuleCodeValue) => {
		setGloballyDisabled((prev) => {
			const next = new Set(prev);
			if (next.has(code)) next.delete(code);
			else next.add(code);
			return next;
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={t(
					"catalogueModules.title",
					"Catalogue National des Modules",
				)}
				subtitle={t(
					"catalogueModules.subtitle",
					"Inventaire des modules métier de la plateforme administration.ga, regroupés par catégorie",
				)}
				icon={<LayoutGrid className="h-5 w-5" />}
			/>

			{/* Stats summary */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<FlatCard className="p-4">
					<div className="text-xs text-muted-foreground">
						{t("catalogueModules.stats.total", "Modules disponibles")}
					</div>
					<div className="mt-1 text-2xl font-semibold">{totalModules}</div>
				</FlatCard>
				<FlatCard className="p-4">
					<div className="text-xs text-muted-foreground">
						{t("catalogueModules.stats.core", "Modules du noyau (isCore)")}
					</div>
					<div className="mt-1 text-2xl font-semibold">{totalCore}</div>
				</FlatCard>
				<FlatCard className="p-4">
					<div className="text-xs text-muted-foreground">
						{t("catalogueModules.stats.categories", "Catégories")}
					</div>
					<div className="mt-1 text-2xl font-semibold">{grouped.length}</div>
				</FlatCard>
			</div>

			{/* Filtres par catégorie */}
			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant={selectedCategory == null ? "default" : "outline"}
					size="sm"
					onClick={() => setSelectedCategory(null)}
				>
					{t("catalogueModules.filter.all", "Toutes")}
				</Button>
				{grouped.map(({ category, modules }) => (
					<Button
						key={category}
						variant={selectedCategory === category ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedCategory(category)}
					>
						{CATEGORY_LABELS[category].fr}
						<Badge variant="secondary" className="ml-2">
							{modules.length}
						</Badge>
					</Button>
				))}
			</div>

			{/* Groupes par catégorie */}
			<div className="flex flex-col gap-8">
				{visibleGroups.map(({ category, modules }) => (
					<section key={category} className="flex flex-col gap-3">
						<div className="flex items-baseline justify-between">
							<h2
								style={{
									fontSize: 18,
									fontWeight: 600,
									letterSpacing: "-0.02em",
									color: "var(--text)",
								}}
							>
								{CATEGORY_LABELS[category].fr}
							</h2>
							<span className="text-xs text-muted-foreground">
								{modules.length}{" "}
								{modules.length > 1 ? "modules" : "module"}
							</span>
						</div>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
							{modules.map((module) => {
								const isDisabled = globallyDisabled.has(module.code);
								return (
									<FlatCard key={module.code} className="p-4">
										<div className="flex items-start gap-3">
											<div
												className="rounded-lg shrink-0"
												style={{
													width: 40,
													height: 40,
													background: "var(--surface)",
													border: "1px solid var(--border-strong)",
													display: "grid",
													placeItems: "center",
													color: "var(--text)",
												}}
											>
												<ModuleIcon name={module.icon} className="h-5 w-5" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<h3 className="truncate text-sm font-semibold">
														{module.label.fr}
													</h3>
													{module.isCore && (
														<Badge
															variant="outline"
															className="shrink-0 text-[10px]"
														>
															Noyau
														</Badge>
													)}
													{isDisabled && (
														<Badge
															variant="destructive"
															className="shrink-0 text-[10px]"
														>
															Désactivé
														</Badge>
													)}
												</div>
												<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
													{module.description.fr}
												</p>
												<div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
													Code:{" "}
													<code className="font-mono text-foreground">
														{module.code}
													</code>
												</div>
											</div>
										</div>

										{/* Capabilities */}
										{module.capabilities && module.capabilities.length > 0 && (
											<div className="mt-3 flex flex-wrap gap-1.5">
												{module.capabilities.map((cap) => (
													<Badge
														key={cap.code}
														variant="secondary"
														className="text-[10px]"
													>
														{cap.label.fr}
													</Badge>
												))}
											</div>
										)}

										{/* Actions MVP */}
										<div className="mt-4 flex flex-wrap items-center gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													// MVP : link fictif vers la vue des activations par
													// institution. Une page dédiée sera créée dans une
													// phase ultérieure (par ex. /catalogue-modules/<code>).
													alert(
														`Activations de ${module.label.fr} par institution — vue à venir.`,
													);
												}}
											>
												<Eye className="mr-1 h-3.5 w-3.5" />
												Voir activations
											</Button>
											<Button
												type="button"
												variant={isDisabled ? "default" : "outline"}
												size="sm"
												onClick={() => toggleGlobal(module.code)}
											>
												{isDisabled ? (
													<>
														<CheckCircle2 className="mr-1 h-3.5 w-3.5" />
														Activer globalement
													</>
												) : (
													<>
														<Shield className="mr-1 h-3.5 w-3.5" />
														Désactiver globalement
													</>
												)}
											</Button>
										</div>
									</FlatCard>
								);
							})}
						</div>
					</section>
				))}
			</div>

			{/* Note MVP */}
			<FlatCard className="p-4">
				<div className="flex gap-3">
					<Sparkles
						className="mt-0.5 h-5 w-5 shrink-0"
						style={{ color: "var(--text-muted)" }}
					/>
					<div className="text-xs text-muted-foreground">
						<strong style={{ color: "var(--text)" }}>MVP Phase 5.</strong>{" "}
						Cette page est une vue en lecture du registre canonique des
						modules. Les actions "Voir activations" et "Activer/Désactiver
						globalement" sont des placeholders d'interface — l'application
						des changements aux institutions sera câblée en phase
						ultérieure via `orgs.toggleModule`.
					</div>
				</div>
			</FlatCard>
		</div>
	);
}
