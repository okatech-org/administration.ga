/**
 * Matrice modules x representations — Onglet extrait de representations.tsx
 *
 * Affiche la grille interactive de modules groupes par categorie,
 * avec filtre par type d'organisation et barre de sauvegarde.
 */

import { useMemo } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Check, Layers, Loader2, Lock, Save } from "lucide-react";
import {
	MODULE_REGISTRY,
	CATEGORY_ORDER,
	type ModuleCategory,
} from "@convex/lib/moduleCodes";
import type { ORGANIZATION_TEMPLATES } from "@convex/lib/roles";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

// ─── Category metadata ─────────────────────────────────────────
const CATEGORY_META: Record<
	ModuleCategory,
	{ label: { fr: string; en: string }; color: string; bgColor: string }
> = {
	core: {
		label: { fr: "Coeur de système", en: "Core" },
		color: "text-emerald-600",
		bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
	},
	consular: {
		label: { fr: "Services consulaires", en: "Consular services" },
		color: "text-blue-600",
		bgColor: "bg-blue-50 dark:bg-blue-950/30",
	},
	diplomatic: {
		label: { fr: "Modules diplomatiques", en: "Diplomatic" },
		color: "text-purple-600",
		bgColor: "bg-purple-50 dark:bg-purple-950/30",
	},
	tools: {
		label: { fr: "Communication & Outils", en: "Communication & Tools" },
		color: "text-teal-600",
		bgColor: "bg-teal-50 dark:bg-teal-950/30",
	},
	finance: {
		label: { fr: "Finance", en: "Finance" },
		color: "text-amber-600",
		bgColor: "bg-amber-50 dark:bg-amber-950/30",
	},
	admin: {
		label: { fr: "Administration", en: "Administration" },
		color: "text-red-600",
		bgColor: "bg-red-50 dark:bg-red-950/30",
	},
};

// ─── Props ─────────────────────────────────────────────────────
interface RepsModuleMatrixTabProps {
	lang: string;
	templates: typeof ORGANIZATION_TEMPLATES;
	selectedOrgType: string | null;
	setSelectedOrgType: (type: string | null) => void;
	editingOrgId: Id<"orgs"> | null;
	editingOrg: any | null;
	pendingModuleChanges: Map<string, boolean>;
	setPendingModuleChanges: React.Dispatch<
		React.SetStateAction<Map<string, boolean>>
	>;
	handleSaveModules: () => Promise<void>;
	isSavingModules: boolean;
}

export function RepsModuleMatrixTab({
	lang,
	templates,
	selectedOrgType,
	setSelectedOrgType,
	editingOrgId,
	editingOrg,
	pendingModuleChanges,
	setPendingModuleChanges,
	handleSaveModules,
	isSavingModules,
}: RepsModuleMatrixTabProps) {
	// ── Modules groupes par categorie ──
	const modulesByCategory = useMemo(() => {
		const groups = Object.fromEntries(
			CATEGORY_ORDER.map((cat) => [
				cat,
				[] as (typeof MODULE_REGISTRY)[keyof typeof MODULE_REGISTRY][],
			]),
		) as Record<
			ModuleCategory,
			(typeof MODULE_REGISTRY)[keyof typeof MODULE_REGISTRY][]
		>;
		for (const mod of Object.values(MODULE_REGISTRY)) {
			groups[mod.category].push(mod);
		}
		return groups;
	}, []);

	// ── Template selectionne ──
	const selectedTemplate = selectedOrgType
		? templates.find((t) => t.type === selectedOrgType)
		: null;

	// ── Modules effectifs (org live ou template statique) ──
	const effectiveModuleSet = useMemo(() => {
		if (editingOrg && editingOrg.type === selectedOrgType) {
			const orgModules = new Set<string>(
				(editingOrg.modules as string[]) ?? [],
			);
			for (const [code, enabled] of pendingModuleChanges) {
				if (enabled) orgModules.add(code);
				else orgModules.delete(code);
			}
			return orgModules;
		}
		return new Set<string>(selectedTemplate?.modules ?? []);
	}, [editingOrg, selectedOrgType, selectedTemplate, pendingModuleChanges]);

	// ── Est-ce que la matrice est editable ? ──
	const isMatrixEditable =
		editingOrgId !== null &&
		editingOrg?.type === selectedOrgType &&
		selectedOrgType !== null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base flex items-center gap-2">
					<Layers className="h-4 w-4 text-primary" />
					{lang === "fr"
						? "Matrice modules \u00d7 repr\u00e9sentations"
						: "Module \u00d7 representation matrix"}
				</CardTitle>
				<CardDescription>
					{lang === "fr"
						? "Distribution des modules par type de repr\u00e9sentation"
						: "Module distribution by representation type"}
					{isMatrixEditable && (
						<span className="ml-1 text-primary font-medium">
							&mdash;{" "}
							{lang === "fr"
								? "Cliquez pour activer/d\u00e9sactiver"
								: "Click to toggle"}
						</span>
					)}
				</CardDescription>
				{/* Filtre par type */}
				<div className="flex flex-wrap items-center gap-1.5 mt-3">
					<button
						type="button"
						className={cn(
							"text-xs rounded-full px-2.5 py-1 border transition-colors",
							!selectedOrgType
								? "bg-primary text-primary-foreground border-primary"
								: "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent",
						)}
						onClick={() => setSelectedOrgType(null)}
					>
						{lang === "fr" ? "Tous" : "All"}
					</button>
					{templates.map((tpl) => (
						<button
							key={tpl.type}
							type="button"
							className={cn(
								"text-xs rounded-full px-2.5 py-1 border transition-colors flex items-center gap-1",
								selectedOrgType === tpl.type
									? "bg-primary text-primary-foreground border-primary"
									: "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent",
							)}
							onClick={() => setSelectedOrgType(tpl.type)}
						>
							{(
								tpl.label[lang as "fr" | "en"] ||
								tpl.label.fr
							).split(" ")[0]}
							<Badge
								variant={
									selectedOrgType === tpl.type
										? "secondary"
										: "outline"
								}
								className="text-[9px] h-4 px-1"
							>
								{tpl.modules.length}
							</Badge>
						</button>
					))}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{(
						Object.entries(modulesByCategory) as [
							ModuleCategory,
							(typeof MODULE_REGISTRY)[keyof typeof MODULE_REGISTRY][],
						][]
					).map(([category, modules]) => {
						if (modules.length === 0) return null;
						const catMeta = CATEGORY_META[category];
						return (
							<div key={category}>
								<div className="flex items-center gap-2 mb-2">
									<div
										className={cn(
											"h-5 w-5 rounded flex items-center justify-center",
											catMeta.bgColor,
										)}
									>
										<span
											className={cn(
												"text-[10px] font-bold",
												catMeta.color,
											)}
										>
											{modules.length}
										</span>
									</div>
									<h4
										className={cn(
											"text-xs font-bold",
											catMeta.color,
										)}
									>
										{catMeta.label[
											lang as "fr" | "en"
										]}
									</h4>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
									{modules.map((mod) => {
										const isActive = selectedOrgType
											? effectiveModuleSet.has(
													mod.code,
												)
											: true;
										const canToggle =
											isMatrixEditable &&
											!mod.isCore;

										return (
											<div
												key={mod.code}
												className={cn(
													"flex items-center gap-2.5 rounded-lg border p-2.5 transition-all",
													!isActive &&
														selectedOrgType &&
														"opacity-25",
													canToggle &&
														"cursor-pointer hover:border-primary/30",
												)}
												onClick={
													canToggle
														? () => {
																setPendingModuleChanges(
																	(
																		prev,
																	) => {
																		const next =
																			new Map(
																				prev,
																			);
																		const orgModules =
																			new Set<string>(
																				(editingOrg?.modules as string[]) ??
																					[],
																			);
																		const currentlyEnabled =
																			next.has(
																				mod.code,
																			)
																				? next.get(
																						mod.code,
																					)!
																				: orgModules.has(
																						mod.code,
																					);
																		next.set(
																			mod.code,
																			!currentlyEnabled,
																		);
																		return next;
																	},
																);
															}
														: undefined
												}
											>
												{canToggle ? (
													<Switch
														checked={isActive}
														onClick={(e) =>
															e.stopPropagation()
														}
														onCheckedChange={(
															checked,
														) => {
															setPendingModuleChanges(
																(prev) => {
																	const next =
																		new Map(
																			prev,
																		);
																	next.set(
																		mod.code,
																		checked,
																	);
																	return next;
																},
															);
														}}
														className="shrink-0"
													/>
												) : (
													<DynamicLucideIcon
														name={mod.icon}
														className={cn(
															"h-4 w-4 shrink-0",
															mod.color,
														)}
													/>
												)}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-1.5">
														<span className="text-xs font-medium truncate">
															{mod.label[
																lang as
																	| "fr"
																	| "en"
															] ||
																mod.label
																	.fr}
														</span>
														{mod.isCore && (
															<Lock className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
														)}
														{selectedOrgType &&
															isActive &&
															!canToggle && (
																<Check className="h-3 w-3 text-green-500 ml-auto shrink-0" />
															)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>

				{/* Barre de sauvegarde modules */}
				{pendingModuleChanges.size > 0 && isMatrixEditable && (
					<div className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
						<span className="text-sm text-primary font-medium">
							{pendingModuleChanges.size}{" "}
							{lang === "fr"
								? "modification(s) en attente"
								: "pending change(s)"}
						</span>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setPendingModuleChanges(new Map())
								}
							>
								{lang === "fr" ? "Annuler" : "Cancel"}
							</Button>
							<Button
								size="sm"
								onClick={handleSaveModules}
								disabled={isSavingModules}
								className="gap-1.5"
							>
								{isSavingModules ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Save className="h-3.5 w-3.5" />
								)}
								{lang === "fr"
									? "Enregistrer"
									: "Save"}
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
