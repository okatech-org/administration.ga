"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	ALL_MODULE_CODES,
	CORE_MODULE_CODES,
	MODULE_REGISTRY,
	type ModuleCategory,
	type ModuleCodeValue,
	type ModuleDefinition,
} from "@convex/lib/moduleCodes";
import { Check, Lock, Package, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface OrgModulesTabProps {
	orgId: Id<"orgs">;
	currentModules: string[];
}

const CATEGORY_ORDER: string[] = [
	"core",
	"consular",
	"diplomatic",
	"tools",
	"finance",
	"admin",
];

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
	core: { fr: "Modules essentiels", en: "Core modules" },
	consular: { fr: "Modules consulaires", en: "Consular modules" },
	diplomatic: { fr: "Modules diplomatiques", en: "Diplomatic modules" },
	tools: { fr: "Communication & Outils", en: "Communication & Tools" },
	finance: { fr: "Finance", en: "Finance" },
	admin: { fr: "Administration", en: "Administration" },
};

const CATEGORY_STYLE: Record<string, string> = {
	core: "border-emerald-500/30 bg-emerald-500/5",
	consular: "border-indigo-500/30 bg-indigo-500/5",
	diplomatic: "border-red-500/30 bg-red-500/5",
	tools: "border-sky-500/30 bg-sky-500/5",
	finance: "border-yellow-500/30 bg-yellow-500/5",
	admin: "border-zinc-500/30 bg-zinc-500/5",
};

export function OrgModulesTab({ orgId, currentModules }: OrgModulesTabProps) {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	const [pendingModules, setPendingModules] = useState<Set<string>>(
		new Set(currentModules),
	);
	const [isDirty, setIsDirty] = useState(false);

	const { mutateAsync: updateModules, isPending: isSaving } =
		useConvexMutationQuery(api.functions.roleConfig.updateOrgModules);

	const coreModuleSet = useMemo(
		() => new Set(CORE_MODULE_CODES as string[]),
		[],
	);

	const modulesByCategory = useMemo(() => {
		const grouped: Record<string, ModuleDefinition[]> = {};
		for (const code of ALL_MODULE_CODES) {
			const def = MODULE_REGISTRY[code];
			if (!grouped[def.category]) grouped[def.category] = [];
			grouped[def.category].push(def);
		}
		return grouped;
	}, []);

	const handleToggle = useCallback(
		(code: string, enabled: boolean) => {
			if (coreModuleSet.has(code)) return; // Can't toggle core modules
			setPendingModules((prev) => {
				const next = new Set(prev);
				if (enabled) next.add(code);
				else next.delete(code);
				return next;
			});
			setIsDirty(true);
		},
		[coreModuleSet],
	);

	const handleSave = async () => {
		try {
			await updateModules({
				orgId,
				modules: Array.from(pendingModules) as ModuleCodeValue[],
			});
			setIsDirty(false);
			toast.success(
				lang === "fr"
					? "Modules mis à jour"
					: "Modules updated",
			);
		} catch {
			toast.error(
				lang === "fr"
					? "Erreur lors de la mise à jour des modules"
					: "Error updating modules",
			);
		}
	};

	const handleReset = () => {
		setPendingModules(new Set(currentModules));
		setIsDirty(false);
	};

	const enabledCount = pendingModules.size;
	const totalCount = ALL_MODULE_CODES.length;

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Package className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h3 className="font-semibold">
							{lang === "fr"
								? "Modules de l'organisme"
								: "Organization modules"}
						</h3>
						<p className="text-xs text-muted-foreground">
							{enabledCount}/{totalCount}{" "}
							{lang === "fr" ? "activés" : "enabled"}
						</p>
					</div>
				</div>
				{isDirty && (
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleReset}
							disabled={isSaving}
						>
							<X className="mr-1.5 h-3.5 w-3.5" />
							{lang === "fr" ? "Annuler" : "Cancel"}
						</Button>
						<Button size="sm" onClick={handleSave} disabled={isSaving}>
							<Check className="mr-1.5 h-3.5 w-3.5" />
							{isSaving
								? lang === "fr"
									? "Enregistrement..."
									: "Saving..."
								: lang === "fr"
									? "Enregistrer"
									: "Save"}
						</Button>
					</div>
				)}
			</div>

			{/* Module Grid by Category */}
			{CATEGORY_ORDER.map((category) => {
				const modules = modulesByCategory[category];
				if (!modules?.length) return null;

				return (
					<Card
						key={category}
						className={cn("border", CATEGORY_STYLE[category])}
					>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">
								{CATEGORY_LABELS[category][lang]}
							</CardTitle>
							{category === "core" && (
								<CardDescription className="text-xs">
									{lang === "fr"
										? "Ces modules sont toujours actifs et ne peuvent pas être désactivés"
										: "These modules are always active and cannot be disabled"}
								</CardDescription>
							)}
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{modules.map((mod) => {
									const isCore = coreModuleSet.has(mod.code);
									const isEnabled = pendingModules.has(mod.code);

									return (
										<div
											key={mod.code}
											className={cn(
												"flex items-center justify-between rounded-lg border p-3 transition-all",
												isEnabled
													? "border-border bg-card"
													: "border-border/40 bg-muted/20 opacity-60",
												isCore && "border-emerald-500/30",
											)}
										>
											<div className="min-w-0 flex-1 mr-3">
												<div className="flex items-center gap-1.5">
													<span className="text-sm font-medium truncate">
														{mod.label[lang]}
													</span>
													{isCore && (
														<Lock className="h-3 w-3 text-emerald-500 shrink-0" />
													)}
												</div>
												<p className="text-[11px] text-muted-foreground truncate mt-0.5">
													{mod.description[lang]}
												</p>
											</div>
											<Switch
												checked={isEnabled}
												onCheckedChange={(checked) =>
													handleToggle(mod.code, checked)
												}
												disabled={isCore || isSaving}
												className="shrink-0"
											/>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
