"use client";

/**
 * StrategicAnalysisSection — Visualisation du plan stratégique enrichi R1-R4
 *
 * Affiche les 4 phases R1-R4 de la méthodologie OkaTech + Stratégie d'approche
 * + Préparation réunion + Risques. Composant dépliable (collapsible).
 */

import { useState } from "react";
import {
	BookOpen,
	Eye,
	Building2,
	Handshake,
	MessageSquare,
	Calendar,
	ShieldAlert,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

// ─── Types (alignés sur strategicAnalysisValidator) ─────────────────────────

export interface StrategicAnalysis {
	diagnosticSectoriel: {
		contexteMacro: string;
		forcesGabon: string[];
		contraintesGabon: string[];
		partiesPrenantes: Array<{
			nom: string;
			role: string;
			influence: "forte" | "moyenne" | "faible";
		}>;
		benchmark: Array<{
			pays: string;
			description: string;
			leconsApprises: string;
		}>;
	};
	pointsAveugles: {
		economiePolitique: string;
		risquesGeopolitiques: string;
		facteursSociaux: string;
		contraintesTerrain: string[];
	};
	analyseOperateur: {
		profilComplet: string;
		capacitesCles: string[];
		realisationsMarquantes: Array<{
			projet: string;
			pays: string;
			resultat: string;
		}>;
		presenceAfrique?: string;
		alignementPriorites: string;
	};
	cadrePartenariat: {
		besoinsGabon: Array<{
			besoin: string;
			secteur: string;
			urgence: "immediate" | "court_terme" | "moyen_terme";
			estimationBudget?: string;
		}>;
		offreOperateur: Array<{
			capacite: string;
			instrument: string;
			conditions?: string;
		}>;
		beneficesMutuels: string[];
		modelesFinancement: Array<{
			type: string;
			description: string;
			montantEstime?: string;
		}>;
		scenariosPartenariat: Array<{
			scenario: "ambitieux" | "realiste" | "minimal";
			description: string;
			investissementEstime?: string;
			delaiMiseEnOeuvre?: string;
		}>;
	};
	strategieApproche: {
		argumentaire: string[];
		negotiationPoints: string[];
		concessions: string[];
		lignesRouges: string[];
		chronologieApproche: Array<{
			etape: string;
			action: string;
			responsable: string;
			delai: string;
		}>;
	};
	preparationReunion: {
		agenda: Array<{
			point: string;
			duree: string;
			objectif: string;
		}>;
		dossiersAFournir: string[];
		questionsStrategiques: string[];
		profilsAInviter: string[];
	};
	risques: Array<{
		risque: string;
		probabilite: "faible" | "moyenne" | "elevee";
		impact: "faible" | "moyen" | "eleve";
		mitigation: string;
	}>;
}

const URGENCE_LABEL: Record<string, string> = {
	immediate: "Immédiate",
	court_terme: "Court terme",
	moyen_terme: "Moyen terme",
};

const URGENCE_COLOR: Record<string, string> = {
	immediate: "bg-destructive/15 text-destructive",
	court_terme: "bg-warning/15 text-warning",
	moyen_terme: "bg-primary/15 text-primary",
};

const INFLUENCE_COLOR: Record<string, string> = {
	forte: "bg-destructive/15 text-destructive",
	moyenne: "bg-warning/15 text-warning",
	faible: "bg-muted text-muted-foreground",
};

const SCENARIO_LABEL: Record<string, string> = {
	ambitieux: "Ambitieux",
	realiste: "Réaliste",
	minimal: "Minimal",
};

const PROBA_LABEL: Record<string, string> = {
	faible: "Faible",
	moyenne: "Moyenne",
	elevee: "Élevée",
};

const IMPACT_LABEL: Record<string, string> = {
	faible: "Faible",
	moyen: "Moyen",
	eleve: "Élevé",
};

// ─── Sous-composant Section ─────────────────────────────────────────────────

function Section({
	title,
	icon: Icon,
	children,
	defaultOpen = false,
}: {
	title: string;
	icon: React.ElementType;
	children: React.ReactNode;
	defaultOpen?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="rounded-lg border border-border/50 bg-card">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/30"
			>
				<div className="flex items-center gap-2">
					<Icon className="h-4 w-4 text-primary" />
					<p className="text-xs font-medium">{title}</p>
				</div>
				{open ? (
					<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
				) : (
					<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
				)}
			</button>
			{open && <div className="space-y-3 px-3 pb-3 pt-1">{children}</div>}
		</div>
	);
}

function BulletList({ items }: { items: string[] }) {
	if (items.length === 0) return null;
	return (
		<ul className="ml-4 space-y-0.5 text-[11px] text-muted-foreground">
			{items.map((s, i) => (
				<li key={i} className="list-disc">
					{s}
				</li>
			))}
		</ul>
	);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
	return <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">{children}</p>;
}

// ─── Composant principal ────────────────────────────────────────────────────

export function StrategicAnalysisSection({
	analysis,
}: {
	analysis: StrategicAnalysis;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-1.5">
				<BookOpen className="h-3.5 w-3.5 text-primary" />
				<p className="text-xs font-medium">Analyse stratégique R1-R4</p>
				<Badge variant="secondary" className="text-[9px]">
					OkaTech
				</Badge>
			</div>

			{/* R1 — Diagnostic sectoriel */}
			<Section title="R1 — Diagnostic sectoriel" icon={BookOpen} defaultOpen>
				<div className="space-y-2">
					<div className="space-y-1">
						<FieldLabel>Contexte macro</FieldLabel>
						<p className="text-[11px] text-muted-foreground">
							{analysis.diagnosticSectoriel.contexteMacro}
						</p>
					</div>

					{analysis.diagnosticSectoriel.forcesGabon.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Forces du Gabon</FieldLabel>
							<BulletList items={analysis.diagnosticSectoriel.forcesGabon} />
						</div>
					)}

					{analysis.diagnosticSectoriel.contraintesGabon.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Contraintes</FieldLabel>
							<BulletList
								items={analysis.diagnosticSectoriel.contraintesGabon}
							/>
						</div>
					)}

					{analysis.diagnosticSectoriel.partiesPrenantes.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Parties prenantes</FieldLabel>
							<div className="space-y-1">
								{analysis.diagnosticSectoriel.partiesPrenantes.map(
									(p, i) => (
										<div
											key={i}
											className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[11px] font-medium">
													{p.nom}
												</p>
												<p className="text-[10px] text-muted-foreground">
													{p.role}
												</p>
											</div>
											<Badge
												className={cn(
													"shrink-0 text-[8px]",
													INFLUENCE_COLOR[p.influence],
												)}
											>
												{p.influence}
											</Badge>
										</div>
									),
								)}
							</div>
						</div>
					)}

					{analysis.diagnosticSectoriel.benchmark.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Benchmark international</FieldLabel>
							<div className="space-y-1.5">
								{analysis.diagnosticSectoriel.benchmark.map((b, i) => (
									<div
										key={i}
										className="rounded-md bg-muted/30 px-2 py-1.5"
									>
										<p className="text-[11px] font-medium">{b.pays}</p>
										<p className="text-[10px] text-muted-foreground">
											{b.description}
										</p>
										<p className="mt-0.5 text-[10px] italic text-muted-foreground">
											→ {b.leconsApprises}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</Section>

			{/* R2 — Points aveugles */}
			<Section title="R2 — Points aveugles" icon={Eye}>
				<div className="space-y-2">
					<div className="space-y-1">
						<FieldLabel>Économie politique</FieldLabel>
						<p className="text-[11px] text-muted-foreground">
							{analysis.pointsAveugles.economiePolitique}
						</p>
					</div>
					<div className="space-y-1">
						<FieldLabel>Risques géopolitiques</FieldLabel>
						<p className="text-[11px] text-muted-foreground">
							{analysis.pointsAveugles.risquesGeopolitiques}
						</p>
					</div>
					<div className="space-y-1">
						<FieldLabel>Facteurs sociaux</FieldLabel>
						<p className="text-[11px] text-muted-foreground">
							{analysis.pointsAveugles.facteursSociaux}
						</p>
					</div>
					{analysis.pointsAveugles.contraintesTerrain.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Contraintes terrain</FieldLabel>
							<BulletList
								items={analysis.pointsAveugles.contraintesTerrain}
							/>
						</div>
					)}
				</div>
			</Section>

			{/* R3 — Analyse opérateur */}
			<Section title="R3 — Analyse opérateur" icon={Building2}>
				<div className="space-y-2">
					<div className="space-y-1">
						<FieldLabel>Profil complet</FieldLabel>
						<p className="text-[11px] text-muted-foreground">
							{analysis.analyseOperateur.profilComplet}
						</p>
					</div>
					{analysis.analyseOperateur.capacitesCles.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Capacités clés</FieldLabel>
							<BulletList items={analysis.analyseOperateur.capacitesCles} />
						</div>
					)}
					{analysis.analyseOperateur.realisationsMarquantes.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Réalisations marquantes</FieldLabel>
							<div className="space-y-1">
								{analysis.analyseOperateur.realisationsMarquantes.map(
									(r, i) => (
										<div
											key={i}
											className="rounded-md bg-muted/30 px-2 py-1.5"
										>
											<p className="text-[11px] font-medium">
												{r.projet}
												<span className="ml-1 text-[10px] font-normal text-muted-foreground">
													({r.pays})
												</span>
											</p>
											<p className="text-[10px] text-muted-foreground">
												{r.resultat}
											</p>
										</div>
									),
								)}
							</div>
						</div>
					)}
					{analysis.analyseOperateur.presenceAfrique && (
						<div className="space-y-1">
							<FieldLabel>Présence en Afrique</FieldLabel>
							<p className="text-[11px] text-muted-foreground">
								{analysis.analyseOperateur.presenceAfrique}
							</p>
						</div>
					)}
					<div className="space-y-1">
						<FieldLabel>Alignement priorités</FieldLabel>
						<p className="text-[11px] text-muted-foreground">
							{analysis.analyseOperateur.alignementPriorites}
						</p>
					</div>
				</div>
			</Section>

			{/* R4 — Cadre de partenariat */}
			<Section title="R4 — Cadre de partenariat" icon={Handshake}>
				<div className="space-y-2">
					{analysis.cadrePartenariat.besoinsGabon.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Besoins du Gabon</FieldLabel>
							<div className="space-y-1">
								{analysis.cadrePartenariat.besoinsGabon.map((b, i) => (
									<div
										key={i}
										className="rounded-md bg-muted/30 px-2 py-1.5"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0 flex-1">
												<p className="text-[11px] font-medium">
													{b.besoin}
												</p>
												<p className="text-[10px] text-muted-foreground">
													{b.secteur}
													{b.estimationBudget &&
														` · ${b.estimationBudget}`}
												</p>
											</div>
											<Badge
												className={cn(
													"shrink-0 text-[8px]",
													URGENCE_COLOR[b.urgence],
												)}
											>
												{URGENCE_LABEL[b.urgence]}
											</Badge>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{analysis.cadrePartenariat.offreOperateur.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Offre de l'opérateur</FieldLabel>
							<div className="space-y-1">
								{analysis.cadrePartenariat.offreOperateur.map((o, i) => (
									<div
										key={i}
										className="rounded-md bg-muted/30 px-2 py-1.5"
									>
										<p className="text-[11px] font-medium">
											{o.capacite}
										</p>
										<p className="text-[10px] text-muted-foreground">
											Instrument : {o.instrument}
											{o.conditions && ` · ${o.conditions}`}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{analysis.cadrePartenariat.beneficesMutuels.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Bénéfices mutuels</FieldLabel>
							<BulletList
								items={analysis.cadrePartenariat.beneficesMutuels}
							/>
						</div>
					)}

					{analysis.cadrePartenariat.modelesFinancement.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Modèles de financement</FieldLabel>
							<div className="space-y-1">
								{analysis.cadrePartenariat.modelesFinancement.map(
									(m, i) => (
										<div
											key={i}
											className="rounded-md bg-muted/30 px-2 py-1.5"
										>
											<p className="text-[11px] font-medium">
												{m.type}
												{m.montantEstime && (
													<span className="ml-1 text-[10px] font-normal text-muted-foreground">
														({m.montantEstime})
													</span>
												)}
											</p>
											<p className="text-[10px] text-muted-foreground">
												{m.description}
											</p>
										</div>
									),
								)}
							</div>
						</div>
					)}

					{analysis.cadrePartenariat.scenariosPartenariat.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Scénarios de partenariat</FieldLabel>
							<div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
								{analysis.cadrePartenariat.scenariosPartenariat.map(
									(s, i) => (
										<div
											key={i}
											className="rounded-md border border-border/50 px-2 py-1.5"
										>
											<Badge
												variant="outline"
												className="mb-1 text-[8px]"
											>
												{SCENARIO_LABEL[s.scenario]}
											</Badge>
											<p className="text-[10px] text-muted-foreground">
												{s.description}
											</p>
											{(s.investissementEstime ||
												s.delaiMiseEnOeuvre) && (
												<p className="mt-1 text-[9px] text-muted-foreground/70">
													{s.investissementEstime}
													{s.investissementEstime &&
														s.delaiMiseEnOeuvre &&
														" · "}
													{s.delaiMiseEnOeuvre}
												</p>
											)}
										</div>
									),
								)}
							</div>
						</div>
					)}
				</div>
			</Section>

			{/* Stratégie d'approche */}
			<Section title="Stratégie d'approche" icon={MessageSquare}>
				<div className="space-y-2">
					{analysis.strategieApproche.argumentaire.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Argumentaire</FieldLabel>
							<BulletList
								items={analysis.strategieApproche.argumentaire}
							/>
						</div>
					)}
					{analysis.strategieApproche.negotiationPoints.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Points de négociation</FieldLabel>
							<BulletList
								items={analysis.strategieApproche.negotiationPoints}
							/>
						</div>
					)}
					{analysis.strategieApproche.concessions.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Concessions possibles</FieldLabel>
							<BulletList items={analysis.strategieApproche.concessions} />
						</div>
					)}
					{analysis.strategieApproche.lignesRouges.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Lignes rouges</FieldLabel>
							<BulletList items={analysis.strategieApproche.lignesRouges} />
						</div>
					)}
					{analysis.strategieApproche.chronologieApproche.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Chronologie</FieldLabel>
							<div className="space-y-1">
								{analysis.strategieApproche.chronologieApproche.map(
									(c, i) => (
										<div
											key={i}
											className="rounded-md bg-muted/30 px-2 py-1.5"
										>
											<p className="text-[11px] font-medium">
												{c.etape}
												<span className="ml-1 text-[10px] font-normal text-muted-foreground">
													({c.delai})
												</span>
											</p>
											<p className="text-[10px] text-muted-foreground">
												{c.action}
											</p>
											<p className="text-[10px] italic text-muted-foreground">
												Responsable : {c.responsable}
											</p>
										</div>
									),
								)}
							</div>
						</div>
					)}
				</div>
			</Section>

			{/* Préparation réunion */}
			<Section title="Préparation réunion" icon={Calendar}>
				<div className="space-y-2">
					{analysis.preparationReunion.agenda.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Agenda</FieldLabel>
							<div className="space-y-1">
								{analysis.preparationReunion.agenda.map((a, i) => (
									<div
										key={i}
										className="rounded-md bg-muted/30 px-2 py-1.5"
									>
										<p className="text-[11px] font-medium">
											{a.point}
											<span className="ml-1 text-[10px] font-normal text-muted-foreground">
												({a.duree})
											</span>
										</p>
										<p className="text-[10px] italic text-muted-foreground">
											{a.objectif}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
					{analysis.preparationReunion.dossiersAFournir.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Dossiers à fournir</FieldLabel>
							<BulletList
								items={analysis.preparationReunion.dossiersAFournir}
							/>
						</div>
					)}
					{analysis.preparationReunion.questionsStrategiques.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Questions stratégiques</FieldLabel>
							<BulletList
								items={analysis.preparationReunion.questionsStrategiques}
							/>
						</div>
					)}
					{analysis.preparationReunion.profilsAInviter.length > 0 && (
						<div className="space-y-1">
							<FieldLabel>Profils à inviter</FieldLabel>
							<BulletList
								items={analysis.preparationReunion.profilsAInviter}
							/>
						</div>
					)}
				</div>
			</Section>

			{/* Risques */}
			{analysis.risques.length > 0 && (
				<Section title="Matrice des risques" icon={ShieldAlert}>
					<div className="space-y-1">
						{analysis.risques.map((r, i) => (
							<div
								key={i}
								className="rounded-md bg-muted/30 px-2 py-1.5"
							>
								<div className="flex items-start justify-between gap-2">
									<p className="text-[11px] font-medium">{r.risque}</p>
									<div className="flex shrink-0 gap-1">
										<Badge variant="outline" className="text-[8px]">
											P: {PROBA_LABEL[r.probabilite]}
										</Badge>
										<Badge variant="outline" className="text-[8px]">
											I: {IMPACT_LABEL[r.impact]}
										</Badge>
									</div>
								</div>
								<p className="mt-1 text-[10px] italic text-muted-foreground">
									→ {r.mitigation}
								</p>
							</div>
						))}
					</div>
				</Section>
			)}
		</div>
	);
}
