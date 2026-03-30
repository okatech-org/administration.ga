/**
 * OrgCorrespondanceConfigTab — Configuration des types de correspondance par organisation.
 *
 * Permet aux admins de :
 * - Voir les types activés avec leur workflow
 * - Activer/désactiver des types
 * - Initialiser les types standard
 * - Modifier le workflow d'approbation par type
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Check,
	ChevronDown,
	ChevronRight,
	Loader2,
	Mail,
	Plus,
	Settings,
	Shield,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface OrgCorrespondanceConfigTabProps {
	orgId: Id<"orgs">;
}

// Couleurs par type
const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
	note_verbale: { color: "text-cyan-500", bg: "bg-cyan-500/10" },
	lettre_officielle: { color: "text-violet-500", bg: "bg-violet-500/10" },
	circulaire: { color: "text-amber-500", bg: "bg-amber-500/10" },
	telegramme: { color: "text-red-500", bg: "bg-red-500/10" },
	memorandum: { color: "text-emerald-500", bg: "bg-emerald-500/10" },
	communique: { color: "text-blue-500", bg: "bg-blue-500/10" },
};

export function OrgCorrespondanceConfigTab({ orgId }: OrgCorrespondanceConfigTabProps) {
	const { t } = useTranslation();
	const [expandedType, setExpandedType] = useState<string | null>(null);

	const { data: configs, isPending } = useAuthenticatedConvexQuery(
		api.functions.correspondanceConfig.listTypeConfigs,
		{ orgId },
	);

	const { mutateAsync: initDefaults, isPending: isInitializing } = useConvexMutationQuery(
		api.functions.correspondanceConfig.initializeDefaultTypes,
	);

	const { mutateAsync: updateConfig, isPending: isUpdating } = useConvexMutationQuery(
		api.functions.correspondanceConfig.updateTypeConfig,
	);

	const handleInit = async () => {
		try {
			const result = await initDefaults({ orgId });
			toast.success(`${result.created} types de correspondance initialisés ✓`);
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'initialisation");
		}
	};

	const handleToggleActive = async (configId: Id<"correspondanceTypeConfigs">, isActive: boolean) => {
		try {
			await updateConfig({ configId, isActive });
			toast.success(isActive ? "Type activé" : "Type désactivé");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur");
		}
	};

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Pas encore configuré — proposer l'initialisation
	if (!configs || configs.length === 0) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
					<div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
						<Mail className="h-7 w-7 text-primary" />
					</div>
					<div>
						<h3 className="text-lg font-semibold">Configuration iCorrespondance</h3>
						<p className="text-sm text-muted-foreground mt-1 max-w-md">
							Initialisez les types de correspondance standard pour cette organisation.
							Chaque type peut être personnalisé avec son propre workflow d'approbation.
						</p>
					</div>
					<Button onClick={handleInit} disabled={isInitializing} className="gap-2">
						{isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
						Initialiser les types standard
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
						<Mail className="h-5 w-5 text-cyan-500" />
					</div>
					<div>
						<h3 className="font-semibold">Types de correspondance</h3>
						<p className="text-xs text-muted-foreground">
							{configs.filter((c) => c.isActive).length}/{configs.length} types actifs
						</p>
					</div>
				</div>
				<Button variant="outline" size="sm" className="gap-1.5" disabled>
					<Plus className="h-3.5 w-3.5" />
					Type personnalisé
				</Button>
			</div>

			{/* Types list */}
			<div className="space-y-2">
				{configs.map((config) => {
					const colors = TYPE_COLORS[config.typeCode] ?? { color: "text-zinc-500", bg: "bg-zinc-500/10" };
					const isExpanded = expandedType === config.typeCode;
					const wf = config.workflowConfig;

					return (
						<Card
							key={config._id}
							className={cn(
								"transition-all",
								!config.isActive && "opacity-50",
							)}
						>
							<div className="flex items-center gap-3 px-4 py-3">
								{/* Expand toggle */}
								<button
									type="button"
									onClick={() => setExpandedType(isExpanded ? null : config.typeCode)}
									className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
								>
									{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
								</button>

								{/* Icon */}
								<div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
									<Mail className={cn("h-4 w-4", colors.color)} />
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold">
											{config.label.fr}
										</span>
										{config.isCustom && (
											<Badge variant="outline" className="text-[8px]">Personnalisé</Badge>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground truncate">
										{config.description?.fr ?? config.typeCode}
									</p>
								</div>

								{/* Workflow info */}
								<div className="flex items-center gap-3 shrink-0">
									{wf.requiresApproval ? (
										<Badge className="text-[9px] bg-amber-500/15 text-amber-500 border-amber-500/20">
											<Shield className="h-3 w-3 mr-1" />
											Approbation
										</Badge>
									) : (
										<Badge variant="outline" className="text-[9px] text-muted-foreground">
											Envoi direct
										</Badge>
									)}
									{wf.autoRouteByHierarchy && (
										<Badge variant="outline" className="text-[9px] text-primary">
											Auto-route
										</Badge>
									)}
								</div>

								{/* Toggle */}
								<Switch
									checked={config.isActive}
									onCheckedChange={(v) => handleToggleActive(config._id, v)}
									disabled={isUpdating}
									className="shrink-0"
								/>
							</div>

							{/* Expanded details */}
							{isExpanded && (
								<div className="px-4 pb-4 pt-0 border-t border-border/30 mt-0">
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
										{/* Workflow */}
										<div className="space-y-2">
											<h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												Workflow
											</h5>
											<div className="space-y-1.5">
												<div className="flex items-center gap-2 text-xs">
													<Check className="h-3 w-3 text-emerald-500" />
													Approbation : {wf.requiresApproval ? "Oui" : "Non"}
												</div>
												<div className="flex items-center gap-2 text-xs">
													<Settings className="h-3 w-3 text-blue-500" />
													Auto-hiérarchie : {wf.autoRouteByHierarchy ? "Oui" : "Non"}
												</div>
												{wf.approvalChain.length > 0 && (
													<div className="text-xs text-muted-foreground">
														{wf.approvalChain.length} étape{wf.approvalChain.length > 1 ? "s" : ""} d'approbation
													</div>
												)}
											</div>
										</div>

										{/* Chaîne d'approbation */}
										{wf.approvalChain.length > 0 && (
											<div className="space-y-2">
												<h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
													Chaîne d'approbation
												</h5>
												<div className="space-y-1">
													{wf.approvalChain.map((step, i) => (
														<div key={i} className="flex items-center gap-2 text-xs">
															<span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
																{step.ordre}
															</span>
															<span className="capitalize">{step.roleMinimum.replace("_", " ")}</span>
															<Badge variant="outline" className="text-[8px]">
																{step.conditionType === "always" ? "Toujours" :
																	step.conditionType === "if_external" ? "Si externe" :
																	"Si rang > " + (step.conditionValue ?? "?")}
															</Badge>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Paramètres par défaut */}
										<div className="space-y-2">
											<h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												Paramètres par défaut
											</h5>
											<div className="space-y-1 text-xs text-muted-foreground">
												<div>Priorité : {config.prioriteParDefaut ?? "normal"}</div>
												<div>Confidentialité : {config.confidentialiteParDefaut ?? "standard"}</div>
												{config.referencePattern && (
													<div>Pattern réf. : <code className="text-[10px]">{config.referencePattern}</code></div>
												)}
											</div>
										</div>
									</div>
								</div>
							)}
						</Card>
					);
				})}
			</div>
		</div>
	);
}
