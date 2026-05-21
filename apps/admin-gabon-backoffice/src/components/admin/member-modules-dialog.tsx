"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState, useEffect, useMemo } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { Layers, RotateCcw, Building2, Eye, PenLine, ShieldCheck } from "lucide-react";
import {
	MODULE_REGISTRY,
	ACCESS_LEVEL_META,
	ALL_ACCESS_LEVELS,
	CATEGORY_ORDER,
	CATEGORY_LABELS,
	type ModuleCodeValue,
	type ModuleAccessLevel,
	type ModuleCategory,
} from "@convex/lib/moduleCodes";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";

const ACCESS_ICON_MAP = { reader: Eye, editor: PenLine, admin: ShieldCheck } as const;

interface MemberModulesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	membershipId: Id<"memberships">;
	orgId: Id<"orgs">;
	memberName: string;
	orgName?: string;
}

export function MemberModulesDialog({
	open,
	onOpenChange,
	membershipId,
	orgId,
	memberName,
	orgName,
}: MemberModulesDialogProps) {
	// État local : Map<moduleCode, accessLevel | null (= désactivé)>
	const [moduleState, setModuleState] = useState<Map<ModuleCodeValue, ModuleAccessLevel | null>>(
		new Map(),
	);
	const [hasChanges, setHasChanges] = useState(false);

	const { data: accessData, isPending: isLoadingAccess } = useAuthenticatedConvexQuery(
		api.functions.admin.getMembershipModuleAccess,
		open ? { membershipId } : "skip",
	);

	const { data: resolvedMenu, isPending: isLoadingMenu } = useAuthenticatedConvexQuery(
		api.functions.permissions.getResolvedMenuForUser,
		open && accessData ? { userId: accessData.userId, orgId } : "skip",
	);

	const { mutateAsync: setMembershipAccess, isPending: isSaving } = useConvexMutationQuery(
		api.functions.admin.setMembershipModuleAccess,
	);

	const isLoading = isLoadingAccess || isLoadingMenu;

	// Modules disponibles : intersection org.modules ∩ MODULE_REGISTRY.
	// Si l'org n'a aucun module défini (legacy), on tombe sur ALL modules.
	const availableModules: ModuleCodeValue[] = useMemo(() => {
		if (!accessData) return [];
		const orgModules = accessData.orgModules ?? [];
		if (orgModules.length === 0) {
			return Object.values(MODULE_REGISTRY).map((m) => m.code);
		}
		return orgModules.filter((c): c is ModuleCodeValue => c in MODULE_REGISTRY);
	}, [accessData]);

	// Pré-remplissage : override existant > niveau dérivé du menu résolu > rien
	useEffect(() => {
		if (!open || !accessData) return;

		const next = new Map<ModuleCodeValue, ModuleAccessLevel | null>();

		if (accessData.moduleAccess && accessData.moduleAccess.length > 0) {
			for (const entry of accessData.moduleAccess) {
				next.set(entry.moduleCode, entry.accessLevel);
			}
		} else if (resolvedMenu) {
			for (const m of resolvedMenu.modules) {
				if (m.isVisible && m.accessLevel) {
					next.set(m.code as ModuleCodeValue, m.accessLevel as ModuleAccessLevel);
				}
			}
		}

		setModuleState(next);
		setHasChanges(false);
	}, [open, accessData, resolvedMenu]);

	const toggleModule = (code: ModuleCodeValue) => {
		setModuleState((prev) => {
			const next = new Map(prev);
			if (next.has(code)) next.delete(code);
			else next.set(code, "reader");
			return next;
		});
		setHasChanges(true);
	};

	const setLevel = (code: ModuleCodeValue, level: ModuleAccessLevel) => {
		setModuleState((prev) => {
			const next = new Map(prev);
			next.set(code, level);
			return next;
		});
		setHasChanges(true);
	};

	const handleSave = async () => {
		const entries = Array.from(moduleState.entries())
			.filter((e): e is [ModuleCodeValue, ModuleAccessLevel] => e[1] !== null)
			.map(([moduleCode, accessLevel]) => ({ moduleCode, accessLevel }));

		try {
			const result = await setMembershipAccess({
				membershipId,
				moduleAccess: entries,
			});
			if (result.skipped > 0) {
				toast.warning(
					`${result.applied} modules appliqués, ${result.skipped} ignorés (non activés sur l'organisation).`,
				);
			} else {
				toast.success(`Modules mis à jour pour ${memberName}`);
			}
			onOpenChange(false);
		} catch {
			toast.error("Erreur lors de la mise à jour des modules");
		}
	};

	const handleInherit = async () => {
		try {
			await setMembershipAccess({ membershipId, moduleAccess: null });
			toast.success("Override retiré — hérite désormais de la position");
			onOpenChange(false);
		} catch {
			toast.error("Erreur lors du retrait de l'override");
		}
	};

	// Groupement par catégorie pour l'affichage
	const grouped = useMemo(() => {
		const map = new Map<ModuleCategory, ModuleCodeValue[]>();
		for (const code of availableModules) {
			const def = MODULE_REGISTRY[code];
			if (!def) continue;
			const list = map.get(def.category) ?? [];
			list.push(code);
			map.set(def.category, list);
		}
		return map;
	}, [availableModules]);

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
							<div className="min-w-0">
								<span>Modules de la représentation</span>
								<p className="text-sm font-normal text-muted-foreground mt-0.5 truncate">
									<strong className="text-foreground">{memberName}</strong>
									{orgName && (
										<>
											<span className="mx-1.5"></span>
											<span className="inline-flex items-center gap-1">
												<Building2 className="h-3 w-3" />
												{orgName}
											</span>
										</>
									)}
								</p>
							</div>
						</DialogTitle>
						<DialogDescription className="mt-2 flex items-center gap-2 flex-wrap">
							<Badge variant="outline" className="text-xs">
								{enabledCount} / {availableModules.length} modules activés
							</Badge>
							{accessData?.hasOverride ? (
								<Badge variant="default" className="text-xs">
									Override personnalisé
								</Badge>
							) : (
								<Badge variant="secondary" className="text-xs">
									Hérité de la position
								</Badge>
							)}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{isLoading ? (
						[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
					) : availableModules.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							Aucun module n'est activé sur cette représentation. Activez-en d'abord
							dans la configuration de l'organisation.
						</p>
					) : (
						CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => {
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
														<p className="text-[11px] text-muted-foreground truncate">
															{def.description.fr}
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
																				<Icon className={cn("h-3 w-3", meta.color)} />
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
						})
					)}
				</div>

				<DialogFooter className="border-t px-6 py-3 flex items-center justify-between gap-2 bg-background shrink-0 sm:flex-row">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleInherit}
						disabled={isSaving || isLoading || !accessData?.hasOverride}
						className="text-muted-foreground hover:text-foreground"
					>
						<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
						Hériter de la position
					</Button>
					<div className="flex items-center gap-2">
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
							onClick={handleSave}
							disabled={isSaving || isLoading || !hasChanges}
						>
							{isSaving ? "Enregistrement..." : "Enregistrer"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
