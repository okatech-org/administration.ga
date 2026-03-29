/**
 * Nouvelle Demarche — Assistant de creation
 *
 * Wizard en 3 etapes :
 * 1. Choix du type de demarche (par categorie)
 * 2. Notes et priorite
 * 3. Confirmation et creation du dossier
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle,
	FileText,
	FolderOpen,
	Loader2,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutation,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// ─── Category config ────────────────────────────────────────────────────────

const categoryConfig: Record<
	string,
	{ label: string; color: string; icon: React.ReactNode }
> = {
	identity: {
		label: "Identite",
		color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
		icon: <Shield className="w-4 h-4" />,
	},
	visa: {
		label: "Visa",
		color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
		icon: <FileText className="w-4 h-4" />,
	},
	civil_status: {
		label: "Etat civil",
		color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
		icon: <FileText className="w-4 h-4" />,
	},
	certification: {
		label: "Certification",
		color: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
		icon: <CheckCircle className="w-4 h-4" />,
	},
	notarial: {
		label: "Notariat",
		color: "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400",
		icon: <FileText className="w-4 h-4" />,
	},
	administrative: {
		label: "Administratif",
		color: "bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400",
		icon: <FolderOpen className="w-4 h-4" />,
	},
	diplomatic: {
		label: "Diplomatique",
		color: "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400",
		icon: <Shield className="w-4 h-4" />,
	},
	custom: {
		label: "Autre",
		color: "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400",
		icon: <Sparkles className="w-4 h-4" />,
	},
};

// ─── Wizard Steps ───────────────────────────────────────────────────────────

const wizardSteps = [
	{ label: "Type", description: "Choisir la demarche" },
	{ label: "Details", description: "Notes et priorite" },
	{ label: "Confirmer", description: "Recapitulatif" },
];

// ─── Fallback orgId ─────────────────────────────────────────────────────────
// In production this should come from user context or environment config.
// Using an empty string triggers the query to fail gracefully if no org set.
const FALLBACK_ORG_ID = "k17c36pq07hx2qfk3fyfsc5bns78fv1a" as Id<"orgs">;

// ─── Component ──────────────────────────────────────────────────────────────

function NewDemarchePage() {
	const navigate = useNavigate();
	const [step, setStep] = useState(0);
	const [selectedType, setSelectedType] = useState<any>(null);
	const [notes, setNotes] = useState("");
	const [priorite, setPriorite] = useState<"normal" | "urgent" | "confidentiel">(
		"normal",
	);
	const [creating, setCreating] = useState(false);

	const typeDemarches = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.listTypeDemarches,
		{ orgId: FALLBACK_ORG_ID },
	);

	const createDossier = useConvexMutation(
		api.functions.dossierProcedure.createDossier,
	);

	// Group types by category
	const grouped = (typeDemarches ?? []).reduce(
		(acc: Record<string, any[]>, td: any) => {
			const cat = td.category ?? "custom";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(td);
			return acc;
		},
		{} as Record<string, any[]>,
	);

	const handleCreate = async () => {
		if (!selectedType) return;
		setCreating(true);
		try {
			const dossierId = await createDossier({
				orgId: FALLBACK_ORG_ID,
				typeDemarcheId: selectedType._id as Id<"typeDemarches">,
				priorite,
				metadata: notes ? { notes } : undefined,
			});

			toast.success("Demarche creee avec succes");
			navigate({
				to: "/my-space/demarches/$dossierId",
				params: { dossierId: dossierId as string },
			});
		} catch (err: any) {
			console.error(err);
			toast.error(err?.message ?? "Erreur lors de la creation");
		} finally {
			setCreating(false);
		}
	};

	const canNext =
		(step === 0 && selectedType) || step === 1 || (step === 2 && !creating);

	return (
		<div className="h-full flex flex-col bg-background">
			<div className="p-4 pb-0">
				<PageHeader
					title="Nouvelle demarche"
					subtitle="Creez une nouvelle procedure administrative"
					icon={<FolderOpen className="text-primary" size={24} />}
					showBackButton
					onBack={() => navigate({ to: "/my-space/demarches" })}
				/>
			</div>

			{/* Step indicator */}
			<div className="px-4 pt-4">
				<div className="flex items-center gap-0 justify-center">
					{wizardSteps.map((ws, index) => (
						<div key={ws.label} className="flex items-center">
							<div className="flex flex-col items-center gap-1">
								<div
									className={cn(
										"w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs font-semibold",
										index < step &&
											"bg-emerald-500 border-emerald-500 text-white",
										index === step &&
											"bg-primary border-primary text-primary-foreground",
										index > step &&
											"bg-muted border-border text-muted-foreground",
									)}
								>
									{index < step ? (
										<Check className="w-4 h-4" />
									) : (
										index + 1
									)}
								</div>
								<div className="text-center">
									<p
										className={cn(
											"text-[10px] font-semibold",
											index === step
												? "text-foreground"
												: "text-muted-foreground",
										)}
									>
										{ws.label}
									</p>
								</div>
							</div>
							{index < wizardSteps.length - 1 && (
								<div
									className={cn(
										"h-0.5 w-12 mx-2 rounded-full",
										index < step ? "bg-emerald-500" : "bg-border",
									)}
								/>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Step content */}
			<div className="flex-1 p-4 overflow-y-auto">
				<AnimatePresence mode="wait">
					{step === 0 && (
						<motion.div
							key="step0"
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
							className="space-y-6"
						>
							{typeDemarches === undefined ? (
								<div className="flex items-center justify-center py-16">
									<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
								</div>
							) : Object.keys(grouped).length === 0 ? (
								<div className="text-center py-16">
									<FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">
										Aucune demarche disponible pour le moment
									</p>
								</div>
							) : (
								Object.entries(grouped).map(([category, types]) => {
									const catConf =
										categoryConfig[category] ?? categoryConfig.custom;
									return (
										<div key={category}>
											<div className="flex items-center gap-2 mb-3">
												<div
													className={cn(
														"p-1.5 rounded-lg border",
														catConf.color,
													)}
												>
													{catConf.icon}
												</div>
												<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
													{catConf.label}
												</h3>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
												{(types as any[]).map((td: any) => (
													<Card
														key={td._id}
														onClick={() => setSelectedType(td)}
														className={cn(
															"p-4 rounded-xl cursor-pointer transition-all border-2",
															selectedType?._id === td._id
																? "border-primary bg-primary/5 shadow-sm"
																: "border-border/50 bg-card hover:border-border hover:shadow-sm",
														)}
													>
														<div className="space-y-2">
															<p className="text-sm font-medium">
																{td.label?.fr ?? td.code}
															</p>
															{td.description?.fr && (
																<p className="text-xs text-muted-foreground line-clamp-2">
																	{td.description.fr}
																</p>
															)}
															<div className="flex items-center gap-2 pt-1">
																{td.delaiGlobalJours && (
																	<Badge
																		variant="outline"
																		className="text-[10px] px-1.5 py-0"
																	>
																		{td.delaiGlobalJours}j
																	</Badge>
																)}
																<Badge
																	variant="outline"
																	className="text-[10px] px-1.5 py-0"
																>
																	{td.piecesRequises?.length ?? 0}{" "}
																	doc(s)
																</Badge>
																<Badge
																	variant="outline"
																	className="text-[10px] px-1.5 py-0"
																>
																	{td.etapesParcours?.length ?? 0}{" "}
																	etape(s)
																</Badge>
															</div>
														</div>
													</Card>
												))}
											</div>
										</div>
									);
								})
							)}
						</motion.div>
					)}

					{step === 1 && (
						<motion.div
							key="step1"
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
							className="max-w-lg mx-auto space-y-6"
						>
							{/* Priority */}
							<div>
								<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
									Priorite
								</label>
								<div className="grid grid-cols-3 gap-3">
									{(
										[
											{
												key: "normal" as const,
												label: "Normal",
												icon: <FileText className="w-4 h-4" />,
												desc: "Traitement standard",
											},
											{
												key: "urgent" as const,
												label: "Urgent",
												icon: <Zap className="w-4 h-4" />,
												desc: "Traitement prioritaire",
											},
											{
												key: "confidentiel" as const,
												label: "Confidentiel",
												icon: <Shield className="w-4 h-4" />,
												desc: "Acces restreint",
											},
										] as const
									).map((opt) => (
										<Card
											key={opt.key}
											onClick={() => setPriorite(opt.key)}
											className={cn(
												"p-3 rounded-xl cursor-pointer transition-all border-2 text-center",
												priorite === opt.key
													? "border-primary bg-primary/5"
													: "border-border/50 bg-card hover:border-border",
											)}
										>
											<div className="flex flex-col items-center gap-1.5">
												<div
													className={cn(
														"p-2 rounded-lg",
														priorite === opt.key
															? "text-primary"
															: "text-muted-foreground",
													)}
												>
													{opt.icon}
												</div>
												<p className="text-xs font-medium">{opt.label}</p>
												<p className="text-[10px] text-muted-foreground">
													{opt.desc}
												</p>
											</div>
										</Card>
									))}
								</div>
							</div>

							{/* Notes */}
							<div>
								<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
									Notes (optionnel)
								</label>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Ajoutez des informations complementaires..."
									rows={4}
									className="w-full px-3 py-2 text-sm border border-border/50 rounded-xl bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
								/>
							</div>
						</motion.div>
					)}

					{step === 2 && selectedType && (
						<motion.div
							key="step2"
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
							className="max-w-lg mx-auto space-y-4"
						>
							<Card className="p-4 bg-card border-border/50 rounded-xl">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
									Recapitulatif
								</h3>
								<div className="space-y-3">
									<div className="flex items-start justify-between">
										<span className="text-xs text-muted-foreground">
											Type
										</span>
										<span className="text-sm font-medium text-right">
											{selectedType.label?.fr ?? selectedType.code}
										</span>
									</div>
									{selectedType.category && (
										<div className="flex items-start justify-between">
											<span className="text-xs text-muted-foreground">
												Categorie
											</span>
											<Badge
												variant="outline"
												className={cn(
													"text-[10px] border px-1.5 py-0",
													categoryConfig[selectedType.category]
														?.color,
												)}
											>
												{categoryConfig[selectedType.category]
													?.label ?? selectedType.category}
											</Badge>
										</div>
									)}
									<div className="flex items-start justify-between">
										<span className="text-xs text-muted-foreground">
											Priorite
										</span>
										<span className="text-sm capitalize">{priorite}</span>
									</div>
									{selectedType.delaiGlobalJours && (
										<div className="flex items-start justify-between">
											<span className="text-xs text-muted-foreground">
												Delai estime
											</span>
											<span className="text-sm">
												{selectedType.delaiGlobalJours} jours
											</span>
										</div>
									)}
									<div className="flex items-start justify-between">
										<span className="text-xs text-muted-foreground">
											Documents requis
										</span>
										<span className="text-sm">
											{selectedType.piecesRequises?.length ?? 0}
										</span>
									</div>
									<div className="flex items-start justify-between">
										<span className="text-xs text-muted-foreground">
											Etapes
										</span>
										<span className="text-sm">
											{selectedType.etapesParcours?.length ?? 0}
										</span>
									</div>
									{notes && (
										<div>
											<span className="text-xs text-muted-foreground block mb-1">
												Notes
											</span>
											<p className="text-sm bg-muted/30 p-2 rounded-lg">
												{notes}
											</p>
										</div>
									)}
								</div>
							</Card>

							{/* Required documents preview */}
							{selectedType.piecesRequises &&
								selectedType.piecesRequises.length > 0 && (
									<Card className="p-4 bg-card border-border/50 rounded-xl">
										<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
											Documents a fournir
										</h3>
										<div className="space-y-2">
											{selectedType.piecesRequises.map(
												(piece: any, i: number) => (
													<div
														key={piece.code ?? i}
														className="flex items-center gap-2 text-sm"
													>
														<FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
														<span className="flex-1">
															{piece.label?.fr ?? piece.code}
														</span>
														{piece.required && (
															<span className="text-[10px] text-red-400">
																Obligatoire
															</span>
														)}
													</div>
												),
											)}
										</div>
									</Card>
								)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Navigation footer */}
			<div className="p-4 border-t border-border/50 flex items-center justify-between gap-3">
				<Button
					variant="outline"
					className="gap-2 rounded-lg"
					onClick={() => {
						if (step === 0) {
							navigate({ to: "/my-space/demarches" });
						} else {
							setStep(step - 1);
						}
					}}
				>
					<ArrowLeft className="w-4 h-4" />
					{step === 0 ? "Annuler" : "Retour"}
				</Button>

				{step < 2 ? (
					<Button
						className="gap-2 rounded-lg"
						disabled={!canNext}
						onClick={() => setStep(step + 1)}
					>
						Suivant
						<ArrowRight className="w-4 h-4" />
					</Button>
				) : (
					<Button
						className="gap-2 rounded-lg"
						disabled={creating}
						onClick={handleCreate}
					>
						{creating ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Check className="w-4 h-4" />
						)}
						{creating ? "Creation..." : "Creer la demarche"}
					</Button>
				)}
			</div>
		</div>
	);
}

export const Route = createFileRoute("/my-space/demarches/new")({
	component: NewDemarchePage,
});
