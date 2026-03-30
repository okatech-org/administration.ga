"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import {
	Layers,
	ChevronDown,
	ChevronRight,
	AlertTriangle,
	Sparkles,
	SlidersHorizontal,
	Wand2,
} from "lucide-react";
import {
	ALL_MODULE_CODES,
	ADMIN_AXIS_REGISTRY,
	ALL_ADMIN_AXES,
	AXIS_MODULE_MAP,
	ROLE_MODULE_PRESETS,
	getRecommendedModules,
	type AdminAxisValue,
	type ModuleCodeValue,
	type ModuleAttributionContext,
} from "@convex/lib/moduleCodes";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import {
	CONTINENT_META,
	getContinent,
	getCountryFlag,
	getCountryName,
	type Continent,
} from "@/lib/country-utils";

// ─── Axis visual metadata ────────────────────────────────────
const AXIS_UI: Record<AdminAxisValue, { emoji: string; colorBorder: string; colorBg: string; colorText: string }> = {
	network: { emoji: "🏛️", colorBorder: "border-blue-500/30", colorBg: "bg-blue-500/5", colorText: "text-blue-600 dark:text-blue-400" },
	population: { emoji: "👥", colorBorder: "border-purple-500/30", colorBg: "bg-purple-500/5", colorText: "text-purple-600 dark:text-purple-400" },
	security: { emoji: "🔒", colorBorder: "border-red-500/30", colorBg: "bg-red-500/5", colorText: "text-red-600 dark:text-red-400" },
	control: { emoji: "⚙️", colorBorder: "border-amber-500/30", colorBg: "bg-amber-500/5", colorText: "text-amber-600 dark:text-amber-400" },
};

// ─── Org type options ────────────────────────────────────────
const ORG_TYPE_OPTIONS = [
	{ value: "embassy", label: "Ambassade", emoji: "🏛️" },
	{ value: "high_representation", label: "Haute Représentation", emoji: "⭐" },
	{ value: "general_consulate", label: "Consulat Général", emoji: "🏢" },
	{ value: "permanent_mission", label: "Mission Permanente", emoji: "🌐" },
	{ value: "high_commission", label: "Haut-Commissariat", emoji: "👑" },
	{ value: "honorary_consulate", label: "Consulat Honoraire", emoji: "📜" },
	{ value: "third_party", label: "Partenaire Tiers", emoji: "🤝" },
] as const;

// ─── Role options ────────────────────────────────────────────
const ROLE_OPTIONS = [
	{ value: "super_admin", label: "Super Admin", emoji: "👑" },
	{ value: "admin_system", label: "Admin Système", emoji: "🛡️" },
	{ value: "admin", label: "Admin", emoji: "🔧" },
	{ value: "sous_admin", label: "Sous-Admin", emoji: "👤" },
] as const;

// ─── Continent options ───────────────────────────────────────
const CONTINENT_OPTIONS = (Object.entries(CONTINENT_META) as [Continent, typeof CONTINENT_META[Continent]][])
	.sort((a, b) => a[1].order - b[1].order)
	.map(([code, meta]) => ({ value: code, label: meta.label, emoji: meta.emoji }));

interface UserModulesDialogProps {
	user: Doc<"users">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserModulesDialog({ user, open, onOpenChange }: UserModulesDialogProps) {

	// Fetch current modules
	const { data: moduleData, isPending: isLoading } = useAuthenticatedConvexQuery(
		api.functions.admin.getUserModules,
		open ? { userId: user._id } : "skip",
	);

	const { mutateAsync: updateModules, isPending: isSaving } = useConvexMutationQuery(
		api.functions.admin.updateUserModules,
	);

	// Local toggle state
	const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set(ALL_MODULE_CODES));
	const [expandedAxes, setExpandedAxes] = useState<Set<string>>(new Set(ALL_ADMIN_AXES));
	const [activePreset, setActivePreset] = useState<string | null>(null);
	const [showContextBar, setShowContextBar] = useState(true);

	// ─── Context filters ─────────────────────────────────────
	const userRole = (user as any).role || "user";
	const userCountry = (user as any).residenceCountry || (user as any).membershipInfo?.orgCountry || "";
	const userOrgType = (user as any).membershipInfo?.orgType || "";
	const userContinent = userCountry ? (getContinent(userCountry) || "") : "";

	const [ctxRole, setCtxRole] = useState<string>(userRole);
	const [ctxContinent, setCtxContinent] = useState<string>(userContinent);
	const [ctxCountry, setCtxCountry] = useState<string>(userCountry);
	const [ctxOrgType, setCtxOrgType] = useState<string>(userOrgType);

	// Derived context
	const currentContext: ModuleAttributionContext = useMemo(() => ({
		role: ctxRole || undefined,
		continent: ctxContinent || undefined,
		country: ctxCountry || undefined,
		orgType: ctxOrgType || undefined,
	}), [ctxRole, ctxContinent, ctxCountry, ctxOrgType]);

	// Computed recommendation
	const recommendation = useMemo(
		() => getRecommendedModules(currentContext),
		[currentContext],
	);

	// Initialize from server data
	useEffect(() => {
		if (moduleData) {
			if (moduleData.allowedModules) {
				setEnabledModules(new Set(moduleData.allowedModules));
			} else {
				setEnabledModules(new Set(ALL_MODULE_CODES));
			}
			setActivePreset(null);
		}
	}, [moduleData]);

	// Reset context on open
	useEffect(() => {
		if (open) {
			setCtxRole(userRole);
			setCtxContinent(userContinent);
			setCtxCountry(userCountry);
			setCtxOrgType(userOrgType);
		}
	}, [open, userRole, userContinent, userCountry, userOrgType]);

	// Auto-sync continent when country changes
	useEffect(() => {
		if (ctxCountry) {
			const c = getContinent(ctxCountry);
			if (c) setCtxContinent(c);
		}
	}, [ctxCountry]);

	const userName = user.firstName && user.lastName
		? `${user.firstName} ${user.lastName}`
		: user.email;

	// ─── Axis helpers ─────────────────────────────────────────
	const getAxisStats = (axis: AdminAxisValue) => {
		const mapping = AXIS_MODULE_MAP[axis];
		const sidebarItemsWithModule = mapping.sidebarItems.filter((item) => item.moduleCode);
		const visibleItems = sidebarItemsWithModule.filter(
			(item) => item.moduleCode && enabledModules.has(item.moduleCode),
		);
		const alwaysVisibleItems = mapping.sidebarItems.filter((item) => !item.moduleCode);
		return {
			totalItems: mapping.sidebarItems.length,
			visibleCount: visibleItems.length + alwaysVisibleItems.length,
			modulesEnabled: mapping.modules.filter((m) => enabledModules.has(m)).length,
			totalModules: mapping.modules.length,
			isPartial: visibleItems.length > 0 && visibleItems.length < sidebarItemsWithModule.length,
			isFullyEnabled: visibleItems.length === sidebarItemsWithModule.length,
			isFullyDisabled: visibleItems.length === 0,
		};
	};

	const toggleAxisModules = (axis: AdminAxisValue, enable: boolean) => {
		setEnabledModules((prev) => {
			const next = new Set(prev);
			for (const mod of AXIS_MODULE_MAP[axis].modules) {
				if (enable) next.add(mod); else next.delete(mod);
			}
			return next;
		});
		setActivePreset(null);
	};

	const toggleModule = useCallback((code: string) => {
		setEnabledModules((prev) => {
			const next = new Set(prev);
			if (next.has(code)) next.delete(code); else next.add(code);
			return next;
		});
		setActivePreset(null);
	}, []);

	const toggleAxisExpand = (axis: string) => {
		setExpandedAxes((prev) => {
			const next = new Set(prev);
			if (next.has(axis)) next.delete(axis); else next.add(axis);
			return next;
		});
	};

	const applyPreset = (presetId: string) => {
		const preset = ROLE_MODULE_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setEnabledModules(new Set(preset.modules));
		setActivePreset(presetId);
	};

	const applyRecommendation = () => {
		setEnabledModules(new Set(recommendation.modules));
		setActivePreset(null);
	};

	const handleSave = async () => {
		try {
			await updateModules({
				userId: user._id,
				modules: Array.from(enabledModules) as ModuleCodeValue[],
			});
			toast.success(`Modules mis à jour pour ${userName} ✓`);
			onOpenChange(false);
		} catch (_err) {
			toast.error("Erreur lors de la mise à jour des modules");
		}
	};

	const totalEnabled = enabledModules.size;
	const totalModules = ALL_MODULE_CODES.length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 gap-0">
				{/* ── Fixed Header ── */}
				<div className="border-b px-6 py-4 shrink-0">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3 text-lg">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
								<Layers className="h-5 w-5 text-primary" />
							</div>
							<div>
								<span>Gestion des modules</span>
								<p className="text-sm font-normal text-muted-foreground mt-0.5">
									Configurer les accès de <strong className="text-foreground">{userName}</strong>
								</p>
							</div>
						</DialogTitle>
						<DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
							<Badge variant="outline" className="text-xs px-2.5 py-0.5">
								{totalEnabled}/{totalModules} modules actifs
							</Badge>
							<Badge variant="secondary" className="text-xs px-2.5 py-0.5">
								{userRole === "admin_system" ? "🛡️ Admin Système" :
									userRole === "admin" ? "🔧 Admin" :
									userRole === "intel_agent" ? "🕵️ Agent Intel" :
									userRole === "education_agent" ? "📚 Agent Éducation" :
									"👤 " + userRole}
							</Badge>
						</DialogDescription>
					</DialogHeader>
				</div>

				{isLoading ? (
					<div className="space-y-3 p-6">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-20 w-full rounded-xl" />
						))}
					</div>
				) : (
					<div className="space-y-4 p-6 overflow-y-auto flex-1 min-h-0">
						{/* ─── Context Filter Bar ──────────────────────── */}
						<div className="rounded-xl border border-primary/20 bg-primary/2">
							<button
								type="button"
								className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-primary"
								onClick={() => setShowContextBar(!showContextBar)}
							>
								<SlidersHorizontal className="h-3.5 w-3.5" />
								Filtres contextuels
								{(ctxOrgType || ctxContinent) && (
									<div className="flex gap-1 ml-1">
										{recommendation.sources.map((s, i) => (
											<Badge key={i} variant="secondary" className="text-[9px] h-4 px-1.5">
												{s.emoji} {s.label}
											</Badge>
										))}
									</div>
								)}
								{showContextBar ? (
									<ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
								) : (
									<ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
								)}
							</button>

							{showContextBar && (
								<div className="px-4 pb-3 space-y-3">
									{/* Row 1: Role + Org Type */}
									<div className="grid grid-cols-2 gap-3">
										{/* Role selector */}
										<div className="space-y-1">
											<label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												🎭 Rôle
											</label>
											<div className="flex flex-wrap gap-1">
												{ROLE_OPTIONS.map((opt) => (
													<button
														key={opt.value}
														type="button"
														onClick={() => setCtxRole(opt.value)}
														className={cn(
															"text-[10px] px-2 py-1 rounded-md border font-medium transition-all",
															ctxRole === opt.value
																? "bg-primary/10 border-primary/30 text-primary"
																: "border-border hover:bg-muted/50 text-muted-foreground",
														)}
													>
														{opt.emoji} {opt.label}
													</button>
												))}
											</div>
										</div>
										{/* Org type selector */}
										<div className="space-y-1">
											<label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												🏛️ Représentation
											</label>
												<select
													title="Type de représentation"
													value={ctxOrgType}
												onChange={(e) => setCtxOrgType(e.target.value)}
												className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
											>
												<option value="">— Toutes —</option>
												{ORG_TYPE_OPTIONS.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.emoji} {opt.label}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Row 2: Continent + Country */}
									<div className="grid grid-cols-2 gap-3">
										{/* Continent pills */}
										<div className="space-y-1">
											<label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												🌍 Continent
											</label>
											<div className="flex flex-wrap gap-1">
												<button
													type="button"
													onClick={() => { setCtxContinent(""); setCtxCountry(""); }}
													className={cn(
														"text-[10px] px-2 py-1 rounded-md border font-medium transition-all",
														!ctxContinent
															? "bg-primary/10 border-primary/30 text-primary"
															: "border-border hover:bg-muted/50 text-muted-foreground",
													)}
												>
													Tous
												</button>
												{CONTINENT_OPTIONS.map((opt) => (
													<button
														key={opt.value}
														type="button"
														onClick={() => { setCtxContinent(opt.value); setCtxCountry(""); }}
														className={cn(
															"text-[10px] px-2 py-1 rounded-md border font-medium transition-all",
															ctxContinent === opt.value
																? "bg-primary/10 border-primary/30 text-primary"
																: "border-border hover:bg-muted/50 text-muted-foreground",
														)}
													>
														{opt.emoji} {opt.label}
													</button>
												))}
											</div>
										</div>
										{/* Country */}
										<div className="space-y-1">
											<label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												🏳️ Pays
											</label>
											<div className="flex items-center gap-2">
												{ctxCountry ? (
													<span className="text-xs font-medium">
														{getCountryFlag(ctxCountry)} {getCountryName(ctxCountry)}
													</span>
												) : (
													<span className="text-xs text-muted-foreground">
														{ctxContinent ? "Tous les pays" : "Aucun filtre"}
													</span>
												)}
												{ctxCountry && (
													<button
														type="button"
														onClick={() => setCtxCountry("")}
														className="text-[10px] text-muted-foreground hover:text-foreground"
													>
														✕
													</button>
												)}
											</div>
										</div>
									</div>

									{/* Apply recommendation button */}
									<button
										type="button"
										onClick={applyRecommendation}
										className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/15 transition-all"
									>
										<Wand2 className="h-3.5 w-3.5" />
										Appliquer la recommandation
										<Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-auto">
											{recommendation.modules.length} modules
										</Badge>
									</button>
								</div>
							)}
						</div>

						{/* ─── Preset Buttons ─────────────────────────── */}
						<div className="space-y-2">
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
								<Sparkles className="h-3 w-3" />
								Presets rapides
							</div>
							<div className="flex flex-wrap gap-2">
								{ROLE_MODULE_PRESETS.map((preset) => (
									<button
										key={preset.id}
										type="button"
										onClick={() => applyPreset(preset.id)}
										className={cn(
											"flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
											activePreset === preset.id
												? "bg-primary/10 border-primary/30 text-primary shadow-sm"
												: "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground",
										)}
									>
										<span>{preset.emoji}</span>
										<span>{preset.label.fr}</span>
									</button>
								))}
							</div>
						</div>

						{/* ─── Axis Sections ──────────────────────────── */}
						{ALL_ADMIN_AXES.map((axisCode) => {
							const axisDef = ADMIN_AXIS_REGISTRY[axisCode];
							const axisUi = AXIS_UI[axisCode];
							const mapping = AXIS_MODULE_MAP[axisCode];
							const stats = getAxisStats(axisCode);
							const isExpanded = expandedAxes.has(axisCode);
							const uniqueModules = [...new Set(mapping.modules)];

							return (
								<div
									key={axisCode}
									className={cn(
										"rounded-xl border transition-all",
										axisUi.colorBorder,
										axisUi.colorBg,
									)}
								>
									{/* Axis Header */}
									<div
										className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
										onClick={() => toggleAxisExpand(axisCode)}
										onKeyDown={(e) => e.key === "Enter" && toggleAxisExpand(axisCode)}
										role="button"
										tabIndex={0}
									>
										<span className="text-lg">{axisUi.emoji}</span>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className={cn("text-sm font-bold", axisUi.colorText)}>
													{axisDef.label.fr}
												</span>
												{stats.isPartial && (
													<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
												)}
												{mapping.restrictedToSuperSystem && (
													<Badge variant="outline" className="text-[8px] h-4 px-1 border-red-300 text-red-500">
														Super/Système
													</Badge>
												)}
											</div>
											<p className="text-[11px] text-muted-foreground truncate">
												{axisDef.description.fr}
											</p>
										</div>
										<Badge
											variant={stats.isFullyEnabled ? "default" : stats.isFullyDisabled ? "outline" : "secondary"}
											className="text-[10px] shrink-0"
										>
											{stats.visibleCount}/{stats.totalItems} items
										</Badge>
										<Switch
											checked={stats.isFullyEnabled}
											onCheckedChange={(checked) => toggleAxisModules(axisCode, checked)}
											className="shrink-0"
											onClick={(e) => e.stopPropagation()}
										/>
										{isExpanded ? (
											<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
										) : (
											<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
										)}
									</div>

									{/* Expanded Content */}
									{isExpanded && (
										<div className="px-4 pb-4 pt-0 space-y-3">
											{/* Sidebar Preview */}
											<div className="rounded-lg bg-card/80 border border-border/50 p-3">
												<div className="flex items-center gap-1.5 mb-2">
													<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
														👁️ Aperçu menu
													</span>
												</div>
												<div className="space-y-0.5">
													{mapping.sidebarItems.map((item, idx) => {
														const isVisible = !item.moduleCode || enabledModules.has(item.moduleCode);
														const canToggle = !!item.moduleCode;

														return (
															<div
																key={`${axisCode}-item-${idx}`}
																className={cn(
																	"flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all group",
																	canToggle && "cursor-pointer hover:bg-muted/60",
																	isVisible
																		? "text-foreground"
																		: "text-muted-foreground/40 line-through opacity-50",
																)}
																onClick={() => canToggle && item.moduleCode && toggleModule(item.moduleCode)}
																onKeyDown={(e) => e.key === "Enter" && canToggle && item.moduleCode && toggleModule(item.moduleCode)}
																{...(canToggle ? { role: "button", tabIndex: 0 } : {})}
															>
																<DynamicLucideIcon
																	name={item.icon}
																	className={cn(
																		"h-3.5 w-3.5 shrink-0",
																		isVisible ? "text-muted-foreground" : "text-muted-foreground/30",
																	)}
																/>
																<span className="font-medium flex-1">{item.title.fr}</span>
																{canToggle ? (
																	<Switch
																		checked={isVisible}
																		onCheckedChange={() => item.moduleCode && toggleModule(item.moduleCode)}
																		className="shrink-0 scale-75 origin-right"
																		onClick={(e) => e.stopPropagation()}
																	/>
																) : (
																	<span className="h-3 w-3 ml-auto shrink-0" />
																)}
															</div>
														);
													})}
												</div>
											</div>

											{/* Module Toggles */}
											<div className="space-y-1">
												<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
													Modules liés
												</span>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
																	{uniqueModules.map((modCode) => {
																		const isEnabled = enabledModules.has(modCode);
																		const dependentItems = mapping.sidebarItems.filter(
																			(item) => item.moduleCode === modCode,
																		);

																		return (
																			<div
																				key={`${axisCode}-mod-${modCode}`}
																				className={cn(
																					"flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
																					isEnabled
																						? "bg-card border-border"
																						: "bg-muted/30 border-transparent opacity-60",
																				)}
																			>
																				<div className="flex-1 min-w-0">
																					<div className="flex items-center gap-1.5">
																						<span className="text-xs font-medium truncate capitalize">
																							{modCode.replace(/_/g, " ")}
																						</span>
																						{dependentItems.length > 0 && (
																							<Badge variant="outline" className="text-[8px] h-3.5 px-1">
																								{dependentItems.length} item{dependentItems.length > 1 ? "s" : ""}
																							</Badge>
																						)}
																					</div>
																				</div>
																				<Switch
																					checked={isEnabled}
																					onCheckedChange={() => toggleModule(modCode)}
																					className="shrink-0"
																				/>
																			</div>
																		);
													})}
												</div>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* ── Sticky Footer ── */}
				<div className="shrink-0 border-t px-6 py-3 flex items-center justify-between bg-background">
					<div className="text-xs text-muted-foreground flex items-center gap-1.5">
						<Layers className="h-3 w-3" />
						{totalEnabled} modules actifs sur {totalModules}
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
							Annuler
						</Button>
						<Button size="sm" onClick={handleSave} disabled={isSaving || isLoading}>
							{isSaving ? "Enregistrement..." : "Enregistrer les accès"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
