"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState, useMemo, useEffect } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import {
	AlertTriangle,
	Eye,
	Layers,
	PenLine,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import {
	MODULE_REGISTRY,
	ACCESS_LEVEL_META,
	ALL_ACCESS_LEVELS,
	ALL_MODULE_CODES,
	CATEGORY_ORDER,
	CATEGORY_LABELS,
	ROLE_MODULE_PRESETS,
	type ModuleCodeValue,
	type ModuleAccessLevel,
	type ModuleCategory,
} from "@convex/lib/moduleCodes";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

const ACCESS_ICON_MAP = { reader: Eye, editor: PenLine, admin: ShieldCheck } as const;

interface BulkMemberModulesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	membershipIds: Id<"memberships">[];
	onApplied?: () => void;
}

export function BulkMemberModulesDialog({
	open,
	onOpenChange,
	membershipIds,
	onApplied,
}: BulkMemberModulesDialogProps) {
	const [moduleState, setModuleState] = useState<Map<ModuleCodeValue, ModuleAccessLevel | null>>(
		new Map(),
	);
	const [defaultLevel, setDefaultLevel] = useState<ModuleAccessLevel>("editor");

	const { mutateAsync: bulkApply, isPending: isSaving } = useConvexMutationQuery(
		api.functions.admin.bulkSetMembershipsModuleAccess,
	);

	// Reset à l'ouverture
	useEffect(() => {
		if (open) {
			setModuleState(new Map());
			setDefaultLevel("editor");
		}
	}, [open]);

	const toggleModule = (code: ModuleCodeValue) => {
		setModuleState((prev) => {
			const next = new Map(prev);
			if (next.has(code)) next.delete(code);
			else next.set(code, defaultLevel);
			return next;
		});
	};

	const setLevel = (code: ModuleCodeValue, level: ModuleAccessLevel) => {
		setModuleState((prev) => {
			const next = new Map(prev);
			next.set(code, level);
			return next;
		});
	};

	const applyPreset = (presetId: string) => {
		const preset = ROLE_MODULE_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		const next = new Map<ModuleCodeValue, ModuleAccessLevel | null>();
		for (const code of preset.modules) {
			next.set(code, defaultLevel);
		}
		setModuleState(next);
	};

	const handleApply = async () => {
		const entries = Array.from(moduleState.entries())
			.filter((e): e is [ModuleCodeValue, ModuleAccessLevel] => e[1] !== null)
			.map(([moduleCode, accessLevel]) => ({ moduleCode, accessLevel }));

		if (entries.length === 0) {
			toast.error("Sélectionnez au moins un module à appliquer.");
			return;
		}

		try {
			const result = await bulkApply({ membershipIds, moduleAccess: entries });
			if (result.skippedCount > 0) {
				toast.warning(
					`${result.updatedCount} membres mis à jour, ${result.skippedCount} ignorés.`,
				);
			} else {
				toast.success(`${result.updatedCount} membres mis à jour`);
			}
			onApplied?.();
			onOpenChange(false);
		} catch {
			toast.error("Erreur lors de l'application en lot");
		}
	};

	// Groupement par catégorie
	const grouped = useMemo(() => {
		const map = new Map<ModuleCategory, ModuleCodeValue[]>();
		for (const code of ALL_MODULE_CODES) {
			const def = MODULE_REGISTRY[code];
			if (!def) continue;
			const list = map.get(def.category) ?? [];
			list.push(code);
			map.set(def.category, list);
		}
		return map;
	}, []);

	const enabledCount = Array.from(moduleState.values()).filter((v) => v !== null).length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
				<div className="border-b px-6 py-4 shrink-0">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
								<Layers className="h-5 w-5 text-primary" />
							</div>
							<div>
								<span>Modifier les modules en lot</span>
								<p className="text-sm font-normal text-muted-foreground mt-0.5">
									Application sur{" "}
									<strong className="text-foreground">
										{membershipIds.length}
									</strong>{" "}
									{membershipIds.length > 1 ? "membres" : "membre"} sélectionné
									{membershipIds.length > 1 ? "s" : ""}
								</p>
							</div>
						</DialogTitle>
						<DialogDescription className="mt-2 flex items-center gap-2 flex-wrap">
							<Badge variant="outline" className="text-xs">
								{enabledCount} module{enabledCount > 1 ? "s" : ""} sélectionné
								{enabledCount > 1 ? "s" : ""}
							</Badge>
						</DialogDescription>
					</DialogHeader>

					<div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 mt-3 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
						<AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
						<span>
							Cette action <strong>écrasera</strong> les modules personnalisés des
							membres sélectionnés. Les modules non activés sur la représentation
							de chaque membre seront ignorés silencieusement.
						</span>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{/* Niveau par défaut + presets */}
					<div className="rounded-lg border bg-muted/30 p-3 space-y-3">
						<div className="flex items-center gap-2">
							<label className="text-xs font-medium text-muted-foreground">
								Niveau par défaut :
							</label>
							<Select
								value={defaultLevel}
								onValueChange={(v) => setDefaultLevel(v as ModuleAccessLevel)}
							>
								<SelectTrigger className="w-36 h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ALL_ACCESS_LEVELS.map((lvl) => {
										const meta = ACCESS_LEVEL_META[lvl];
										const Icon = ACCESS_ICON_MAP[lvl];
										return (
											<SelectItem key={lvl} value={lvl}>
												<span className="flex items-center gap-1.5">
													<Icon className={cn("h-3 w-3", meta.color)} />
													{meta.label.fr}
												</span>
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								<Sparkles className="h-3 w-3" />
								Presets
							</div>
							<div className="flex flex-wrap gap-1.5">
								{ROLE_MODULE_PRESETS.map((preset) => (
									<button
										key={preset.id}
										type="button"
										onClick={() => applyPreset(preset.id)}
										className="text-xs px-2.5 py-1 rounded-md border bg-background hover:bg-muted transition-colors"
									>
										{preset.label.fr}
									</button>
								))}
							</div>
						</div>
					</div>

					{CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => {
						const modules = grouped.get(category) ?? [];
						return (
							<div key={category} className="space-y-2">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
									{CATEGORY_LABELS[category].fr}
								</p>
								<div className="space-y-1.5">
									{modules.map((code) => {
										const def = MODULE_REGISTRY[code];
										const level = moduleState.get(code) ?? null;
										const enabled = level !== null;

										return (
											<div
												key={code}
												className={cn(
													"flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
													enabled
														? "bg-card border-border"
														: "bg-muted/30 border-transparent",
												)}
											>
												<DynamicLucideIcon
													name={def.icon}
													className={cn(
														"h-4 w-4 shrink-0",
														enabled ? def.color : "text-muted-foreground/40",
													)}
												/>
												<div className="flex-1 min-w-0">
													<p
														className={cn(
															"text-sm font-medium truncate",
															!enabled && "text-muted-foreground/60",
														)}
													>
														{def.label.fr}
													</p>
												</div>

												{enabled && (
													<Select
														value={level}
														onValueChange={(v) =>
															setLevel(code, v as ModuleAccessLevel)
														}
													>
														<SelectTrigger className="w-32 h-8 text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{ALL_ACCESS_LEVELS.map((lvl) => {
																const meta = ACCESS_LEVEL_META[lvl];
																const Icon = ACCESS_ICON_MAP[lvl];
																return (
																	<SelectItem key={lvl} value={lvl}>
																		<span className="flex items-center gap-1.5">
																			<Icon
																				className={cn("h-3 w-3", meta.color)}
																			/>
																			{meta.label.fr}
																		</span>
																	</SelectItem>
																);
															})}
														</SelectContent>
													</Select>
												)}

												<Switch
													checked={enabled}
													onCheckedChange={() => toggleModule(code)}
													aria-label={`Activer ${def.label.fr}`}
												/>
											</div>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>

				<DialogFooter className="border-t px-6 py-3 flex items-center justify-end gap-2 bg-background shrink-0">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Annuler
					</Button>
					<Button
						size="sm"
						onClick={handleApply}
						disabled={isSaving || enabledCount === 0}
					>
						{isSaving
							? "Application..."
							: `Appliquer à ${membershipIds.length} membre${membershipIds.length > 1 ? "s" : ""}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
