"use client";

/**
 * Phase 2 : Plans Stratégiques — Élaboration IA de stratégie de partenariat
 */

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import {
	BookOpen,
	Sparkles,
	Loader2,
	CheckCircle2,
	Clock,
	AlertCircle,
	XCircle,
	Mail,
	FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useOrg } from "../../shell/org-provider";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";
import { AIActionButton } from "./_shared/AIActionPanel";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { cn } from "@workspace/ui/lib/utils";

const CAT_LABEL: Record<string, string> = {
	bilateral: "Bilatéral",
	economic: "Économique",
	cultural: "Culturel",
	security: "Sécurité",
	multilateral: "Multilatéral",
	other: "Autre",
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
	completed: CheckCircle2,
	in_progress: Clock,
	planned: AlertCircle,
	cancelled: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
	completed: "text-emerald-500",
	in_progress: "text-blue-500",
	planned: "text-zinc-400",
	cancelled: "text-red-400",
};

export default function PlansPhase() {
	const { activeOrgId } = useOrg();

	const { data: plans, isPending } = useAuthenticatedConvexQuery(
		api.functions.diplomaticAffairs.listPlans,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const regenerateDocs = useConvexMutationQuery(
		api.functions.diplomaticAffairs.regeneratePlanDocuments,
	);

	const handleRegenerate = async (planId: string) => {
		try {
			await regenerateDocs.mutateAsync({
				planId: planId as Parameters<
					typeof regenerateDocs.mutateAsync
				>[0]["planId"],
			});
			toast.success(
				"Generation des documents lancee — ils apparaitront dans le dossier iDocument",
			);
		} catch (error) {
			toast.error("Erreur lors de la regeneration des documents");
			console.error(error);
		}
	};

	// ─── iAsted page context ──────────────────────────────
	const pageEntities: PageEntity[] = (plans ?? []).slice(0, 30).map((p: any) => ({
		id: p._id,
		type: "diplomatic-plan",
		label: p.title ?? "Plan stratégique",
		data: {
			status: p.status,
			category: p.category,
			targetId: p.targetId,
			objectivesCount: Array.isArray(p.objectives) ? p.objectives.length : 0,
		},
	}));
	const pageActions: PageAction[] = [
		{
			id: "plans.regenerate_docs",
			label: "Régénérer les documents d'un plan",
			description:
				"Régénère les documents Word d'un plan stratégique. params.planId requis.",
			params: { planId: { type: "string" } },
		},
	];
	usePageContext({
		module: "diplomatic-plans",
		title: "Plans stratégiques",
		summary: `${plans?.length ?? 0} plan(s) stratégique(s).`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("plans.regenerate_docs", async (params) => {
		const id = params?.planId as string | undefined;
		if (!id) throw new Error("planId requis");
		await handleRegenerate(id);
		return { success: true };
	});

	if (isPending) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Barre d'actions */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{plans?.length ?? 0} plan(s) stratégique(s)
				</p>
				<AIActionButton
					label="Élaborer une stratégie"
					icon={Sparkles}
					onClick={() =>
						toast.info(
							"Sélectionnez d'abord une cible dans la phase Cibles",
						)
					}
				/>
			</div>

			{/* Liste des plans */}
			{!plans || plans.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
						<BookOpen className="h-8 w-8 text-amber-500/60" />
					</div>
					<h3 className="text-lg font-semibold mb-1">Aucun plan stratégique</h3>
					<p className="text-sm text-muted-foreground max-w-md mb-6">
						Définissez vos objectifs diplomatiques et laissez l'IA élaborer une
						stratégie de partenariat pour chaque cible.
					</p>
					<Button disabled className="gap-1.5">
						<Sparkles className="h-4 w-4" />
						Élaborer une stratégie
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{plans.map((plan) => (
						<FlatCard key={plan._id}>
							<div className="p-3 lg:p-4 space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">{plan.title}</p>
									<Badge variant="outline" className="text-[9px]">
										{CAT_LABEL[plan.category] ?? plan.category}
									</Badge>
								</div>
								{plan.period && (
									<p className="text-[10px] text-muted-foreground">
										Période : {plan.period}
									</p>
								)}
								{/* Contenu IA si disponible */}
								{plan.aiGeneratedContent && (
									<div className="space-y-1.5">
										<div className="flex items-center gap-1.5 text-[10px] text-primary">
											<Sparkles className="h-3 w-3" />
											Stratégie générée par l'IA
										</div>
										<div className="grid grid-cols-2 gap-2 text-[10px]">
											<div className="rounded-md bg-muted/50 p-2">
												<p className="font-medium mb-1">Besoins du Gabon</p>
												<ul className="space-y-0.5 text-muted-foreground">
													{plan.aiGeneratedContent.countryNeeds
														.slice(0, 3)
														.map((n, i) => (
															<li key={i}>
																•{" "}
																{typeof n === "string"
																	? n
																	: (n as { title?: string }).title ??
																		JSON.stringify(n)}
															</li>
														))}
												</ul>
											</div>
											<div className="rounded-md bg-muted/50 p-2">
												<p className="font-medium mb-1">Bénéfices mutuels</p>
												<ul className="space-y-0.5 text-muted-foreground">
													{plan.aiGeneratedContent.mutualBenefits
														.slice(0, 3)
														.map((b, i) => (
															<li key={i}>
																•{" "}
																{typeof b === "string"
																	? b
																	: (b as { title?: string }).title ??
																		JSON.stringify(b)}
															</li>
														))}
												</ul>
											</div>
										</div>
									</div>
								)}

								{/* Objectifs */}
								{plan.objectives.length > 0 && (
									<div className="space-y-1">
										{plan.objectives.slice(0, 4).map((obj, i) => {
											const StatusIcon = STATUS_ICON[obj.status] ?? AlertCircle;
											return (
												<div key={i} className="flex items-center gap-2 text-xs">
													<StatusIcon
														className={cn(
															"h-3.5 w-3.5 shrink-0",
															STATUS_COLOR[obj.status] ?? "text-zinc-400",
														)}
													/>
													<span className="truncate">{obj.title}</span>
												</div>
											);
										})}
										{plan.objectives.length > 4 && (
											<p className="text-[10px] text-muted-foreground pl-5">
												+{plan.objectives.length - 4} objectifs
											</p>
										)}
									</div>
								)}

								{plan.objectives.length === 0 && !plan.aiGeneratedContent && (
									<p className="text-xs text-muted-foreground italic">
										Aucun objectif defini
									</p>
								)}

								{/* CTAs : Actions sur le plan */}
								{plan.targetId && (
									<div className="flex gap-2 mt-1">
										<Link
											href={`/affaires-diplomatiques/lettres?targetId=${plan.targetId}&planId=${plan._id}`}
											className="flex-1"
										>
											<Button
												variant="outline"
												size="sm"
												className="w-full gap-1.5 text-xs"
											>
												<Mail className="h-3.5 w-3.5" />
												Rediger une lettre
											</Button>
										</Link>
										<Button
											variant="outline"
											size="sm"
											className="gap-1.5 text-xs"
											onClick={() => handleRegenerate(plan._id)}
											title="Generer le document Word dans iDocument"
										>
											<FileText className="h-3.5 w-3.5" />
											Générer le .docx
										</Button>
									</div>
								)}
							</div>
						</FlatCard>
					))}
				</div>
			)}
		</div>
	);
}
