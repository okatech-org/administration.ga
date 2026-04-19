"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	CORE_MODULE_CODES,
	MODULE_REGISTRY,
	SIDEBAR_MODULE_GROUPS,
	getDefaultCapabilities,
	type ModuleCodeValue,
	type SidebarModuleGroup,
} from "@convex/lib/moduleCodes";
import { ORGANIZATION_TEMPLATES } from "@convex/lib/roles";
import {
	AlertTriangle,
	Check,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	FileText,
	Loader2,
	Lock,
	Package,
	RotateCcw,
	Users,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Checkbox } from "@/components/ui/checkbox";
import { OrgAIAssistantSection } from "@/components/dashboard/org-ai-assistant-section";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

interface OrgModuleConfigEntry {
	moduleCode: string;
	enabled: boolean;
	capabilities?: string[];
}

interface OrgModulesTabProps {
	orgId: Id<"orgs">;
	currentModules: string[];
}

// ─── Section styles ─────────────────────────────────────────────

const SECTION_STYLE: Record<string, string> = {
	operations: "border-emerald-500/30 bg-emerald-500/5",
	ibureau: "border-sky-500/30 bg-sky-500/5",
	gestion: "border-amber-500/30 bg-amber-500/5",
	communication: "border-rose-500/30 bg-rose-500/5",
	administration: "border-zinc-500/30 bg-zinc-500/5",
};

// ─── Main Component ─────────────────────────────────────────────

export function OrgModulesTab({ orgId, currentModules }: OrgModulesTabProps) {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	// Recupérer l'org pour son type (pour le bouton template reset)
	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	);
	const orgType = org?.type ?? "embassy";

	// Initialiser la config depuis orgModuleConfig ou fallback modules[]
	const initialConfig = useMemo<OrgModuleConfigEntry[]>(() => {
		if (org?.orgModuleConfig && (org.orgModuleConfig as OrgModuleConfigEntry[]).length > 0) {
			return org.orgModuleConfig as OrgModuleConfigEntry[];
		}
		// Fallback : créer depuis le champ flat modules[]
		const mods = new Set(currentModules);
		return Object.values(MODULE_REGISTRY).map((def) => ({
			moduleCode: def.code,
			enabled: mods.has(def.code) || def.isCore,
			capabilities: getDefaultCapabilities(def.code as ModuleCodeValue),
		}));
	}, [org, currentModules]);

	const [pendingConfig, setPendingConfig] = useState<OrgModuleConfigEntry[]>(initialConfig);
	const [isDirty, setIsDirty] = useState(false);
	const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

	// Validation cascade : module en cours de désactivation
	const [moduleToDisable, setModuleToDisable] = useState<string | null>(null);

	const coreModuleSet = useMemo(
		() => new Set(CORE_MODULE_CODES as string[]),
		[],
	);

	const configMap = useMemo(() => {
		const map = new Map<string, OrgModuleConfigEntry>();
		for (const entry of pendingConfig) {
			map.set(entry.moduleCode, entry);
		}
		return map;
	}, [pendingConfig]);

	const { mutateAsync: updateConfig, isPending: isSaving } =
		useConvexMutationQuery(api.functions.roleConfig.updateOrgModuleConfig);

	// ─── Handlers ─────────────────────────────────────────

	const applyToggleModule = useCallback(
		(moduleCode: string, enabled: boolean) => {
			if (coreModuleSet.has(moduleCode)) return;
			setPendingConfig((prev) => {
				const next = [...prev];
				const idx = next.findIndex((e) => e.moduleCode === moduleCode);
				if (idx >= 0) {
					next[idx] = { ...next[idx], enabled };
				} else {
					next.push({
						moduleCode,
						enabled,
						capabilities: getDefaultCapabilities(moduleCode as ModuleCodeValue),
					});
				}
				return next;
			});
			setIsDirty(true);
		},
		[coreModuleSet],
	);

	// Intercepte les désactivations pour analyser l'impact via modale
	const handleToggleModule = useCallback(
		(moduleCode: string, enabled: boolean) => {
			if (coreModuleSet.has(moduleCode)) return;
			// Activation immédiate sans validation
			if (enabled) {
				applyToggleModule(moduleCode, true);
				return;
			}
			// Désactivation : passe par la modale d'impact
			setModuleToDisable(moduleCode);
		},
		[coreModuleSet, applyToggleModule],
	);

	const handleToggleCapability = useCallback(
		(moduleCode: string, capability: string, checked: boolean) => {
			setPendingConfig((prev) => {
				const next = [...prev];
				const idx = next.findIndex((e) => e.moduleCode === moduleCode);
				if (idx >= 0) {
					const entry = { ...next[idx] };
					const caps = new Set(entry.capabilities ?? []);
					if (checked) caps.add(capability);
					else caps.delete(capability);
					entry.capabilities = Array.from(caps);
					next[idx] = entry;
				}
				return next;
			});
			setIsDirty(true);
		},
		[],
	);

	const toggleExpand = (moduleCode: string) => {
		setExpandedModules((prev) => {
			const next = new Set(prev);
			if (next.has(moduleCode)) next.delete(moduleCode);
			else next.add(moduleCode);
			return next;
		});
	};

	const handleSave = async () => {
		try {
			const configToSend = pendingConfig
				.filter((c) => c.enabled || coreModuleSet.has(c.moduleCode))
				.map((c) => ({
					moduleCode: c.moduleCode as ModuleCodeValue,
					enabled: c.enabled || coreModuleSet.has(c.moduleCode),
					capabilities: c.capabilities,
				}));

			await updateConfig({ orgId, config: configToSend });
			setIsDirty(false);
			toast.success(lang === "fr" ? "Configuration modules mise à jour" : "Module config updated");
		} catch {
			toast.error(lang === "fr" ? "Erreur lors de la sauvegarde" : "Error saving");
		}
	};

	const handleReset = () => {
		setPendingConfig(initialConfig);
		setIsDirty(false);
	};

	const handleResetFromTemplate = () => {
		const template = ORGANIZATION_TEMPLATES.find((t) => t.type === orgType);
		if (!template) return;
		const templateModuleSet = new Set(template.modules as string[]);
		const newConfig: OrgModuleConfigEntry[] = Object.values(MODULE_REGISTRY).map((def) => ({
			moduleCode: def.code,
			enabled: templateModuleSet.has(def.code) || def.isCore,
			capabilities: getDefaultCapabilities(def.code as ModuleCodeValue),
		}));
		setPendingConfig(newConfig);
		setIsDirty(true);
		toast.info(lang === "fr" ? "Template appliqué — sauvegardez pour confirmer" : "Template applied — save to confirm");
	};

	// ─── Stats ─────────────────────────────────────────────

	const enabledCount = pendingConfig.filter((c) => c.enabled).length;
	const totalCount = Object.keys(MODULE_REGISTRY).length;

	// ─── Render ─────────────────────────────────────────────

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Package className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h3 className="font-semibold">
							{lang === "fr" ? "Modules de l'organisme" : "Organization modules"}
						</h3>
						<p className="text-xs text-muted-foreground">
							{enabledCount}/{totalCount} {lang === "fr" ? "activés" : "enabled"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleResetFromTemplate}
						disabled={isSaving}
						className="text-xs gap-1.5"
					>
						<RotateCcw className="h-3 w-3" />
						{lang === "fr" ? "Réinitialiser template" : "Reset from template"}
					</Button>
					{isDirty && (
						<>
							<Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
								<X className="mr-1.5 h-3.5 w-3.5" />
								{lang === "fr" ? "Annuler" : "Cancel"}
							</Button>
							<Button size="sm" onClick={handleSave} disabled={isSaving}>
								<Check className="mr-1.5 h-3.5 w-3.5" />
								{isSaving
									? lang === "fr" ? "Enregistrement..." : "Saving..."
									: lang === "fr" ? "Enregistrer" : "Save"}
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Module sections grouped by sidebar */}
			{SIDEBAR_MODULE_GROUPS.map((group) => (
				<SidebarGroupCard
					key={group.key}
					group={group}
					configMap={configMap}
					coreModuleSet={coreModuleSet}
					expandedModules={expandedModules}
					isSaving={isSaving}
					lang={lang}
					orgId={orgId}
					onToggleModule={handleToggleModule}
					onToggleCapability={handleToggleCapability}
					onToggleExpand={toggleExpand}
				/>
			))}

			{/* Modale d'impact à la désactivation */}
			<DisableModuleImpactDialog
				orgId={orgId}
				moduleCode={moduleToDisable}
				onConfirm={() => {
					if (moduleToDisable) applyToggleModule(moduleToDisable, false);
					setModuleToDisable(null);
				}}
				onCancel={() => setModuleToDisable(null)}
				lang={lang}
			/>
		</div>
	);
}

// ─── Dialog : analyse d'impact à la désactivation d'un module ───
function DisableModuleImpactDialog({
	orgId,
	moduleCode,
	onConfirm,
	onCancel,
	lang,
}: {
	orgId: Id<"orgs">;
	moduleCode: string | null;
	onConfirm: () => void;
	onCancel: () => void;
	lang: string;
}) {
	const isOpen = moduleCode !== null;
	const { data: impact, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.getModuleImpactAnalysis,
		isOpen ? { orgId, moduleCode: moduleCode! } : "skip",
	);

	const moduleDef = moduleCode
		? MODULE_REGISTRY[moduleCode as ModuleCodeValue]
		: null;
	const moduleLabel = moduleDef
		? moduleDef.label[lang as "fr" | "en"] ?? moduleDef.label.fr
		: moduleCode;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="rounded-full bg-amber-500/10 p-2">
							<AlertTriangle className="h-4 w-4 text-amber-600" />
						</div>
						<DialogTitle>
							{lang === "fr"
								? `Désactiver « ${moduleLabel} » ?`
								: `Disable "${moduleLabel}"?`}
						</DialogTitle>
					</div>
					<DialogDescription>
						{lang === "fr"
							? "Voici les éléments qui seront affectés par cette désactivation :"
							: "Here is what will be affected by this change:"}
					</DialogDescription>
				</DialogHeader>

				{isPending ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : impact ? (
					<div className="space-y-3 py-2">
						<ImpactRow
							icon={<Users className="h-4 w-4 text-blue-600" />}
							label={lang === "fr" ? "Postes affectés" : "Positions affected"}
							count={impact.positionsCount}
							hint={
								impact.positionsCount > 0
									? lang === "fr"
										? "Ces postes perdront les tâches du module"
										: "These positions will lose module tasks"
									: undefined
							}
						/>
						<ImpactRow
							icon={<FileText className="h-4 w-4 text-emerald-600" />}
							label={
								lang === "fr"
									? "Services actifs liés"
									: "Active linked services"
							}
							count={impact.servicesCount}
							hint={
								impact.servicesCount > 0
									? lang === "fr"
										? "Ces services resteront mais sans nouveau traitement"
										: "These services will remain but won't be processable"
									: undefined
							}
						/>
						<ImpactRow
							icon={<ClipboardList className="h-4 w-4 text-rose-600" />}
							label={lang === "fr" ? "Demandes en cours" : "Pending requests"}
							count={impact.requestsCount}
							hint={
								impact.requestsCount > 0
									? lang === "fr"
										? "Doivent être clôturées manuellement"
										: "Must be closed manually"
									: undefined
							}
						/>
						{!impact.hasImpact && (
							<p className="text-xs text-muted-foreground italic mt-2">
								{lang === "fr"
									? "Aucun impact détecté — désactivation sans risque."
									: "No impact detected — safe to disable."}
							</p>
						)}
					</div>
				) : null}

				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						{lang === "fr" ? "Annuler" : "Cancel"}
					</Button>
					<Button
						variant={impact?.hasImpact ? "destructive" : "default"}
						onClick={onConfirm}
					>
						{lang === "fr" ? "Désactiver" : "Disable"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ImpactRow({
	icon,
	label,
	count,
	hint,
}: {
	icon: React.ReactNode;
	label: string;
	count: number;
	hint?: string;
}) {
	return (
		<div className="flex items-start gap-3 p-2.5 rounded-md bg-muted/30">
			<div className="shrink-0 mt-0.5">{icon}</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm font-medium">{label}</span>
					<Badge
						variant={count > 0 ? "default" : "secondary"}
						className="text-xs"
					>
						{count}
					</Badge>
				</div>
				{hint && count > 0 && (
					<p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
				)}
			</div>
		</div>
	);
}

// ─── Sidebar Group Card ─────────────────────────────────────────

function SidebarGroupCard({
	group,
	configMap,
	coreModuleSet,
	expandedModules,
	isSaving,
	lang,
	orgId,
	onToggleModule,
	onToggleCapability,
	onToggleExpand,
}: {
	group: SidebarModuleGroup;
	configMap: Map<string, OrgModuleConfigEntry>;
	coreModuleSet: Set<string>;
	expandedModules: Set<string>;
	isSaving: boolean;
	lang: string;
	orgId?: Id<"orgs">;
	onToggleModule: (code: string, enabled: boolean) => void;
	onToggleCapability: (moduleCode: string, cap: string, checked: boolean) => void;
	onToggleExpand: (code: string) => void;
}) {
	const enabledInGroup = group.modules.filter(
		(m) => configMap.get(m)?.enabled || coreModuleSet.has(m),
	).length;

	return (
		<FlatCard className={cn("border", SECTION_STYLE[group.key] ?? "border-border/40")}>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<DynamicLucideIcon name={group.icon} className="h-3.5 w-3.5" />}
					title={group.label[lang as "fr" | "en"]}
					actions={
						<Badge variant="secondary" className="text-[10px]">
							{enabledInGroup}/{group.modules.length}
						</Badge>
					}
				/>
				<div className="grid gap-2">
					{group.modules.map((moduleCode) => {
						const def = MODULE_REGISTRY[moduleCode as ModuleCodeValue];
						if (!def) return null;
						const config = configMap.get(moduleCode);
						const isEnabled = config?.enabled || coreModuleSet.has(moduleCode);
						const isCore = coreModuleSet.has(moduleCode);
						const hasCaps = def.capabilities && def.capabilities.length > 0;
						const isExpanded = expandedModules.has(moduleCode);
						const activeCaps = config?.capabilities ?? [];

						return (
							<div
								key={moduleCode}
								className={cn(
									"rounded-lg border transition-all",
									isEnabled ? "border-border bg-[#FDFCFA] dark:bg-[#21201E]/77" : "border-border/40 bg-muted/20 opacity-60",
									isCore && "border-emerald-500/30",
								)}
							>
								<div className="flex items-center gap-2.5 px-3 py-2.5">
									{/* Expand toggle (si capabilities) */}
									{hasCaps ? (
										<button
											type="button"
											onClick={() => onToggleExpand(moduleCode)}
											className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
										>
											{isExpanded
												? <ChevronDown className="h-3.5 w-3.5" />
												: <ChevronRight className="h-3.5 w-3.5" />}
										</button>
									) : (
										<div className="w-3.5" />
									)}

									<DynamicLucideIcon name={def.icon} className={cn("h-4 w-4 shrink-0", def.color)} />
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<span className="text-sm font-medium truncate">
												{def.label[lang as "fr" | "en"]}
											</span>
											{isCore && <Lock className="h-3 w-3 text-emerald-500 shrink-0" />}
										</div>
										<p className="text-[10px] text-muted-foreground truncate">
											{def.description[lang as "fr" | "en"]}
										</p>
									</div>

									{/* Capabilities badge */}
									{hasCaps && isEnabled && (
										<Badge variant="outline" className="text-[9px] shrink-0">
											{activeCaps.length}/{def.capabilities!.length}
										</Badge>
									)}

									<Switch
										checked={isEnabled}
										onCheckedChange={(checked) => onToggleModule(moduleCode, checked)}
										disabled={isCore || isSaving}
										className="shrink-0"
									/>
								</div>

								{/* Capabilities (sous-modules) */}
								{hasCaps && isExpanded && isEnabled && (
									<div className="px-3 pb-2.5 pt-0 border-t border-border/20">
										{/* Le module ai_assistant a sa propre UI riche (toggle + config) — on saute les checkboxes */}
										{moduleCode !== "ai_assistant" && (
											<div className="grid gap-1 pt-2">
												{def.capabilities!.map((cap) => {
													const isCapActive = activeCaps.includes(cap.code);
													return (
														<label
															key={cap.code}
															className={cn(
																"flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-all text-xs",
																isCapActive ? "bg-primary/5" : "hover:bg-muted/30",
															)}
														>
															<Checkbox
																checked={isCapActive}
																onCheckedChange={(checked) =>
																	onToggleCapability(moduleCode, cap.code, !!checked)
																}
																disabled={isSaving}
																className="h-3.5 w-3.5"
															/>
															<span className="flex-1 min-w-0">
																{cap.label[lang as "fr" | "en"]}
															</span>
														</label>
													);
												})}
											</div>
										)}

										{/* Services activés — affiché uniquement pour le module "requests" */}
									{moduleCode === "requests" && orgId && (
										<OrgServicesSection orgId={orgId} lang={lang} />
									)}
									{/* Config capacités IA — affiché uniquement pour le module "ai_assistant" */}
									{moduleCode === "ai_assistant" && orgId && (
										<OrgAIAssistantSection orgId={orgId} lang={lang} />
									)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</FlatCard>
	);
}

// ─── Org Services Section (affiché dans le module "requests") ──

function OrgServicesSection({ orgId }: { orgId: Id<"orgs">; lang?: string }) {
	const { data: orgServices = [], isPending } = useAuthenticatedConvexQuery(
		api.functions.services.listByOrg,
		{ orgId },
	);

	if (isPending) {
		return (
			<div className="mt-3 pt-3 border-t border-border/30">
				<p className="text-[10px] text-muted-foreground animate-pulse">Chargement des services…</p>
			</div>
		);
	}

	if (orgServices.length === 0) {
		return (
			<div className="mt-3 pt-3 border-t border-border/30">
				<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Services activés</p>
				<p className="text-[10px] text-muted-foreground italic">Aucun service configuré pour cette organisation</p>
			</div>
		);
	}

	return (
		<div className="mt-3 pt-3 border-t border-border/30">
			<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
				Services activés ({orgServices.length})
			</p>
			<div className="grid gap-1">
				{orgServices.map((os: any) => {
					const serviceName = os.service?.name?.fr ?? os.service?.name ?? os.name?.fr ?? "Service";
					const category = os.service?.category ?? os.category ?? "other";
					const isActive = os.isActive !== false;
					const hasAccess = !!(os as any).serviceAccess?.length;

					return (
						<div key={os._id} className={cn(
							"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
							isActive ? "bg-primary/5" : "bg-muted/20 opacity-50",
						)}>
							<div className={cn("h-2 w-2 rounded-full shrink-0", isActive ? "bg-green-500" : "bg-gray-400")} />
							<span className="flex-1 min-w-0 truncate">{serviceName}</span>
							<Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0">
								{category}
							</Badge>
							{hasAccess && (
								<Badge variant="secondary" className="text-[8px] h-3.5 px-1 shrink-0">
									Accès personnalisé
								</Badge>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
