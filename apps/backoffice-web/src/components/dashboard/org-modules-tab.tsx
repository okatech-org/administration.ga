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
	Check,
	ChevronDown,
	ChevronRight,
	Lock,
	Package,
	RotateCcw,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

	const handleToggleModule = useCallback(
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
					onToggleModule={handleToggleModule}
					onToggleCapability={handleToggleCapability}
					onToggleExpand={toggleExpand}
				/>
			))}
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
	onToggleModule: (code: string, enabled: boolean) => void;
	onToggleCapability: (moduleCode: string, cap: string, checked: boolean) => void;
	onToggleExpand: (code: string) => void;
}) {
	const enabledInGroup = group.modules.filter(
		(m) => configMap.get(m)?.enabled || coreModuleSet.has(m),
	).length;

	return (
		<Card className={cn("border", SECTION_STYLE[group.key] ?? "border-border/40")}>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<DynamicLucideIcon name={group.icon} className="h-4 w-4" />
					{group.label[lang as "fr" | "en"]}
					<Badge variant="secondary" className="text-[10px] ml-auto">
						{enabledInGroup}/{group.modules.length}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent>
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
									isEnabled ? "border-border bg-card" : "border-border/40 bg-muted/20 opacity-60",
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
									</div>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
