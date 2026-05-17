/**
 * ProjectFrameworkDialog — Visualisation du cadre logique enrichi d'un projet
 *
 * Affiche les 7 sections du projectFramework (cadre logique bailleurs) :
 * 1. Cadre logique (objectifs, résultats, indicateurs)
 * 2. Budget détaillé (répartition, sources de financement)
 * 3. Calendrier (phases, jalons)
 * 4. Cadre juridique (accord, autorisations, clauses)
 * 5. Suivi-évaluation (KPIs, mécanismes)
 * 6. Impact (économique, social, environnemental)
 * 7. Risques (catégorisés avec mitigation)
 */

import {
	BookOpen,
	Wallet,
	Calendar,
	Scale,
	Activity,
	TrendingUp,
	ShieldAlert,
	Target,
	CheckCircle2,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

interface ProjectFramework {
	cadreLogique?: {
		objectifGeneral?: string;
		objectifSpecifique?: string;
		resultatsAttendus?: Array<{
			resultat?: string;
			indicateurs?: Array<{
				indicateur?: string;
				valeurCible?: string;
				moyenVerification?: string;
			}>;
			activites?: string[];
		}>;
		hypotheses?: string[];
	};
	budgetDetaille?: {
		montantTotal?: string;
		devise?: string;
		repartition?: Array<{
			poste?: string;
			montant?: string;
			financeur?: string;
			pourcentage?: number;
		}>;
		sourceFinancement?: Array<{
			source?: string;
			instrument?: string;
			montant?: string;
			conditions?: string;
		}>;
	};
	calendrier?: {
		phases?: Array<{
			phase?: string;
			description?: string;
			debut?: string;
			fin?: string;
			livrables?: string[];
			jalons?: string[];
		}>;
		dureeTotal?: string;
	};
	cadreJuridique?: {
		typeAccord?: string;
		baseJuridique?: string;
		autorisationsRequises?: string[];
		clausesEssentielles?: string[];
	};
	suiviEvaluation?: {
		mecanismeSuivi?: string;
		frequenceRapports?: string;
		indicateursPerformance?: Array<{
			kpi?: string;
			cible?: string;
			frequenceMesure?: string;
		}>;
		evaluationFinale?: string;
	};
	impact?: {
		economique?: string[];
		social?: string[];
		environnemental?: string[];
		emploisEstimes?: string;
		beneficiairesEstimes?: string;
	};
	risquesProjet?: Array<{
		categorie?: string;
		risque?: string;
		probabilite?: string;
		impact?: string;
		mitigation?: string;
		responsable?: string;
	}>;
	scenarioRetenu?: string;
}

const PROBA_COLOR: Record<string, string> = {
	faible: "bg-success/15 text-success",
	moyenne: "bg-warning/15 text-warning",
	elevee: "bg-destructive/15 text-destructive",
};

const IMPACT_COLOR: Record<string, string> = {
	faible: "bg-success/15 text-success",
	moyen: "bg-warning/15 text-warning",
	eleve: "bg-destructive/15 text-destructive",
};

const CATEGORIE_LABEL: Record<string, string> = {
	politique: "Politique",
	financier: "Financier",
	technique: "Technique",
	juridique: "Juridique",
	social: "Social",
	environnemental: "Environnemental",
};

function Section({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: React.ElementType;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-2 rounded-lg border border-border/50 p-3">
			<div className="flex items-center gap-2">
				<Icon className="h-4 w-4 text-primary" />
				<h3 className="text-sm font-semibold">{title}</h3>
			</div>
			<div className="space-y-2 text-xs">{children}</div>
		</div>
	);
}

export function ProjectFrameworkDialog({
	open,
	onOpenChange,
	framework,
	projectTitle,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	framework: ProjectFramework | undefined;
	projectTitle: string;
}) {
	if (!framework) return null;

	const {
		cadreLogique,
		budgetDetaille,
		calendrier,
		cadreJuridique,
		suiviEvaluation,
		impact,
		risquesProjet,
		scenarioRetenu,
	} = framework;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-primary" />
						Cadre logique du projet
					</DialogTitle>
					<DialogDescription>
						{projectTitle}
						{scenarioRetenu && (
							<Badge variant="outline" className="ml-2 text-[10px]">
								Scénario : {scenarioRetenu}
							</Badge>
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="mt-2 space-y-3">
					{/* 1. Cadre logique */}
					{cadreLogique && (
						<Section title="Cadre logique" icon={Target}>
							{cadreLogique.objectifGeneral && (
								<div>
									<p className="text-[10px] font-medium text-muted-foreground">
										Objectif général
									</p>
									<p className="text-xs">{cadreLogique.objectifGeneral}</p>
								</div>
							)}
							{cadreLogique.objectifSpecifique && (
								<div>
									<p className="text-[10px] font-medium text-muted-foreground">
										Objectif spécifique
									</p>
									<p className="text-xs">{cadreLogique.objectifSpecifique}</p>
								</div>
							)}
							{cadreLogique.resultatsAttendus &&
								cadreLogique.resultatsAttendus.length > 0 && (
									<div className="space-y-2">
										<p className="text-[10px] font-medium text-muted-foreground">
											Résultats attendus
										</p>
										{cadreLogique.resultatsAttendus.map((r, i) => (
											<div
												key={i}
												className="rounded-md bg-muted/30 p-2 space-y-1.5"
											>
												<p className="text-xs font-medium">
													{i + 1}. {r.resultat}
												</p>
												{r.indicateurs && r.indicateurs.length > 0 && (
													<div className="ml-3 space-y-1">
														{r.indicateurs.map((ind, j) => (
															<div
																key={j}
																className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
															>
																<CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
																<span>
																	<strong>{ind.indicateur}</strong> —{" "}
																	{ind.valeurCible}
																	{ind.moyenVerification && (
																		<em className="block text-[10px]">
																			({ind.moyenVerification})
																		</em>
																	)}
																</span>
															</div>
														))}
													</div>
												)}
												{r.activites && r.activites.length > 0 && (
													<div className="ml-3 flex flex-wrap gap-1">
														{r.activites.map((a, k) => (
															<Badge
																key={k}
																variant="secondary"
																className="text-[9px]"
															>
																{a}
															</Badge>
														))}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							{cadreLogique.hypotheses &&
								cadreLogique.hypotheses.length > 0 && (
									<div>
										<p className="text-[10px] font-medium text-muted-foreground">
											Hypothèses
										</p>
										<ul className="ml-3 list-disc text-xs">
											{cadreLogique.hypotheses.map((h, i) => (
												<li key={i}>{h}</li>
											))}
										</ul>
									</div>
								)}
						</Section>
					)}

					{/* 2. Budget détaillé */}
					{budgetDetaille && (
						<Section title="Budget détaillé" icon={Wallet}>
							{budgetDetaille.montantTotal && (
								<p className="text-xs">
									<strong>Montant total :</strong> {budgetDetaille.montantTotal}{" "}
									{budgetDetaille.devise && `(${budgetDetaille.devise})`}
								</p>
							)}
							{budgetDetaille.repartition &&
								budgetDetaille.repartition.length > 0 && (
									<div>
										<p className="text-[10px] font-medium text-muted-foreground mb-1">
											Répartition par poste
										</p>
										<div className="space-y-1">
											{budgetDetaille.repartition.map((r, i) => (
												<div
													key={i}
													className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1"
												>
													<div className="min-w-0 flex-1">
														<p className="text-xs font-medium truncate">
															{r.poste}
														</p>
														<p className="text-[10px] text-muted-foreground">
															{r.financeur}
														</p>
													</div>
													<div className="text-right shrink-0">
														<p className="text-xs">{r.montant}</p>
														{r.pourcentage != null && (
															<p className="text-[10px] text-primary">
																{r.pourcentage}%
															</p>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							{budgetDetaille.sourceFinancement &&
								budgetDetaille.sourceFinancement.length > 0 && (
									<div>
										<p className="text-[10px] font-medium text-muted-foreground mb-1">
											Sources de financement
										</p>
										{budgetDetaille.sourceFinancement.map((s, i) => (
											<div key={i} className="rounded-md bg-muted/30 p-2 mb-1">
												<p className="text-xs font-medium">{s.source}</p>
												<p className="text-[10px] text-muted-foreground">
													{s.instrument} — {s.montant}
												</p>
												{s.conditions && (
													<p className="text-[10px] italic">
														{s.conditions}
													</p>
												)}
											</div>
										))}
									</div>
								)}
						</Section>
					)}

					{/* 3. Calendrier */}
					{calendrier &&
						calendrier.phases &&
						calendrier.phases.length > 0 && (
							<Section title="Calendrier" icon={Calendar}>
								{calendrier.dureeTotal && (
									<p className="text-xs">
										<strong>Durée totale :</strong> {calendrier.dureeTotal}
									</p>
								)}
								<div className="space-y-2">
									{calendrier.phases.map((p, i) => (
										<div
											key={i}
											className="rounded-md bg-muted/30 p-2 space-y-1"
										>
											<div className="flex items-center justify-between">
												<p className="text-xs font-medium">{p.phase}</p>
												<Badge variant="outline" className="text-[9px]">
													{p.debut} → {p.fin}
												</Badge>
											</div>
											{p.description && (
												<p className="text-[11px] text-muted-foreground">
													{p.description}
												</p>
											)}
											{p.livrables && p.livrables.length > 0 && (
												<div className="flex flex-wrap gap-1">
													{p.livrables.map((l, j) => (
														<Badge
															key={j}
															variant="secondary"
															className="text-[9px]"
														>
															📄 {l}
														</Badge>
													))}
												</div>
											)}
											{p.jalons && p.jalons.length > 0 && (
												<div className="flex flex-wrap gap-1">
													{p.jalons.map((j, k) => (
														<Badge
															key={k}
															className="text-[9px] bg-primary/15 text-primary"
														>
															⭐ {j}
														</Badge>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							</Section>
						)}

					{/* 4. Cadre juridique */}
					{cadreJuridique && (
						<Section title="Cadre juridique" icon={Scale}>
							{cadreJuridique.typeAccord && (
								<p className="text-xs">
									<strong>Type d'accord :</strong> {cadreJuridique.typeAccord}
								</p>
							)}
							{cadreJuridique.baseJuridique && (
								<p className="text-xs">
									<strong>Base juridique :</strong>{" "}
									{cadreJuridique.baseJuridique}
								</p>
							)}
							{cadreJuridique.autorisationsRequises &&
								cadreJuridique.autorisationsRequises.length > 0 && (
									<div>
										<p className="text-[10px] font-medium text-muted-foreground">
											Autorisations requises
										</p>
										<ul className="ml-3 list-disc text-xs">
											{cadreJuridique.autorisationsRequises.map((a, i) => (
												<li key={i}>{a}</li>
											))}
										</ul>
									</div>
								)}
							{cadreJuridique.clausesEssentielles &&
								cadreJuridique.clausesEssentielles.length > 0 && (
									<div>
										<p className="text-[10px] font-medium text-muted-foreground">
											Clauses essentielles
										</p>
										<ul className="ml-3 list-disc text-xs">
											{cadreJuridique.clausesEssentielles.map((c, i) => (
												<li key={i}>{c}</li>
											))}
										</ul>
									</div>
								)}
						</Section>
					)}

					{/* 5. Suivi-évaluation */}
					{suiviEvaluation && (
						<Section title="Suivi-évaluation" icon={Activity}>
							{suiviEvaluation.mecanismeSuivi && (
								<p className="text-xs">
									<strong>Mécanisme :</strong> {suiviEvaluation.mecanismeSuivi}
								</p>
							)}
							{suiviEvaluation.frequenceRapports && (
								<p className="text-xs">
									<strong>Fréquence :</strong>{" "}
									{suiviEvaluation.frequenceRapports}
								</p>
							)}
							{suiviEvaluation.indicateursPerformance &&
								suiviEvaluation.indicateursPerformance.length > 0 && (
									<div>
										<p className="text-[10px] font-medium text-muted-foreground mb-1">
											Indicateurs de performance (SMART)
										</p>
										<div className="space-y-1">
											{suiviEvaluation.indicateursPerformance.map((kpi, i) => (
												<div
													key={i}
													className="rounded-md bg-muted/30 px-2 py-1"
												>
													<p className="text-xs font-medium">{kpi.kpi}</p>
													<p className="text-[10px] text-muted-foreground">
														Cible : {kpi.cible} · Mesure :{" "}
														{kpi.frequenceMesure}
													</p>
												</div>
											))}
										</div>
									</div>
								)}
							{suiviEvaluation.evaluationFinale && (
								<p className="text-xs italic">
									{suiviEvaluation.evaluationFinale}
								</p>
							)}
						</Section>
					)}

					{/* 6. Impact */}
					{impact && (
						<Section title="Impact attendu" icon={TrendingUp}>
							<div className="grid grid-cols-1 gap-2 md:grid-cols-3">
								{impact.economique && impact.economique.length > 0 && (
									<div className="rounded-md bg-muted/30 p-2">
										<p className="text-[10px] font-medium text-muted-foreground">
											Économique
										</p>
										<ul className="ml-2 list-disc text-[11px]">
											{impact.economique.map((e, i) => (
												<li key={i}>{e}</li>
											))}
										</ul>
									</div>
								)}
								{impact.social && impact.social.length > 0 && (
									<div className="rounded-md bg-muted/30 p-2">
										<p className="text-[10px] font-medium text-muted-foreground">
											Social
										</p>
										<ul className="ml-2 list-disc text-[11px]">
											{impact.social.map((s, i) => (
												<li key={i}>{s}</li>
											))}
										</ul>
									</div>
								)}
								{impact.environnemental &&
									impact.environnemental.length > 0 && (
										<div className="rounded-md bg-muted/30 p-2">
											<p className="text-[10px] font-medium text-muted-foreground">
												Environnemental
											</p>
											<ul className="ml-2 list-disc text-[11px]">
												{impact.environnemental.map((e, i) => (
													<li key={i}>{e}</li>
												))}
											</ul>
										</div>
									)}
							</div>
							{(impact.emploisEstimes || impact.beneficiairesEstimes) && (
								<div className="grid grid-cols-2 gap-2">
									{impact.emploisEstimes && (
										<div className="rounded-md bg-primary/5 px-2 py-1">
											<p className="text-[10px] text-muted-foreground">
												Emplois estimés
											</p>
											<p className="text-xs font-medium">
												{impact.emploisEstimes}
											</p>
										</div>
									)}
									{impact.beneficiairesEstimes && (
										<div className="rounded-md bg-primary/5 px-2 py-1">
											<p className="text-[10px] text-muted-foreground">
												Bénéficiaires
											</p>
											<p className="text-xs font-medium">
												{impact.beneficiairesEstimes}
											</p>
										</div>
									)}
								</div>
							)}
						</Section>
					)}

					{/* 7. Risques */}
					{risquesProjet && risquesProjet.length > 0 && (
						<Section title="Matrice des risques" icon={ShieldAlert}>
							<div className="space-y-1.5">
								{risquesProjet.map((r, i) => (
									<div
										key={i}
										className="rounded-md border border-border/50 p-2 space-y-1"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-1.5 min-w-0 flex-1">
												<Badge variant="outline" className="text-[9px]">
													{CATEGORIE_LABEL[r.categorie ?? ""] ??
														r.categorie}
												</Badge>
												<p className="text-xs font-medium truncate">
													{r.risque}
												</p>
											</div>
											<div className="flex items-center gap-1 shrink-0">
												<Badge
													className={cn(
														"text-[9px]",
														PROBA_COLOR[r.probabilite ?? ""] ?? "",
													)}
												>
													P: {r.probabilite}
												</Badge>
												<Badge
													className={cn(
														"text-[9px]",
														IMPACT_COLOR[r.impact ?? ""] ?? "",
													)}
												>
													I: {r.impact}
												</Badge>
											</div>
										</div>
										{r.mitigation && (
											<p className="text-[11px] text-muted-foreground ml-1">
												<strong>Mitigation :</strong> {r.mitigation}
												{r.responsable && ` (resp. ${r.responsable})`}
											</p>
										)}
									</div>
								))}
							</div>
						</Section>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
