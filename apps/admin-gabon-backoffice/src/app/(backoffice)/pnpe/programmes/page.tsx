/**
 * Programmes Auto-Emploi — backoffice ministère du Travail.
 *
 * Pilotage national du programme Auto-Emploi : nombre de D.E inscrits,
 * répartition par étape (évaluation → formation BMC → business plan →
 * validation → lancement), taux de transformation en projets formalisés
 * via ANPI-Gabon.
 *
 * MVP : liste + funnel par étape. Edition / réaffectation mentor à
 * brancher dans une PR ultérieure.
 */
"use client";

import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	BookOpen,
	Briefcase,
	Building2,
	CheckCircle2,
	ClipboardCheck,
	Lightbulb,
	Rocket,
	TrendingUp,
} from "lucide-react";

// ─── Référentiels ─────────────────────────────────────────────

const ETAPE_META: Record<
	string,
	{ label: string; tone: string; icon: React.ElementType; order: number }
> = {
	EVALUATION: { label: "Évaluation projet", tone: "slate", icon: Lightbulb, order: 1 },
	FORMATION_BMC: { label: "Formation BMC", tone: "blue", icon: BookOpen, order: 2 },
	ELABORATION_PLAN: { label: "Élaboration plan", tone: "indigo", icon: ClipboardCheck, order: 3 },
	VALIDATION: { label: "Validation", tone: "amber", icon: CheckCircle2, order: 4 },
	LANCEMENT: { label: "Lancement activité", tone: "emerald", icon: Rocket, order: 5 },
	SUIVI: { label: "Suivi post-lancement", tone: "teal", icon: TrendingUp, order: 6 },
	CLOTURE: { label: "Clôture", tone: "slate", icon: CheckCircle2, order: 7 },
};

const TONE_BG: Record<string, string> = {
	slate: "bg-slate-500/10 text-slate-600 border-slate-500/20",
	blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
	indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
	amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
	emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
	teal: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

function formatDateRelative(ts?: number): string {
	if (!ts) return "—";
	const diff = Date.now() - ts;
	const days = Math.floor(diff / 86_400_000);
	if (days === 0) return "Aujourd'hui";
	if (days === 1) return "Hier";
	if (days < 7) return `Il y a ${days} jours`;
	if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine(s)`;
	return `Il y a ${Math.floor(days / 30)} mois`;
}

// ─── Page ────────────────────────────────────────────────────

export default function PnpeProgrammesPage() {
	const { t } = useTranslation();

	const { data: programmes, isLoading } = useAuthenticatedConvexQuery(
		api.functions.pnpe.backofficeQueries.listProgrammes,
		{},
	);
	const { data: kpis } = useAuthenticatedConvexQuery(
		api.functions.pnpe.backofficeQueries.programmesKpis,
		{},
	);

	const list = (programmes ?? []) as any[];
	const orderedEtapes = Object.entries(ETAPE_META).sort(
		(a, b) => a[1].order - b[1].order,
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.programmes.title", "Programmes Auto-Emploi")}
				subtitle={t(
					"pnpe.programmes.subtitle",
					"Pilotage du parcours BMC — Business Model Canvas + passerelle ANPI-Gabon",
				)}
				icon={Lightbulb}
			/>

			{/* ─── KPI principaux ────────────────────── */}
			<section>
				<SectionHeader
					icon={<TrendingUp />}
					title={t("pnpe.programmes.kpis.title", "Indicateurs clés")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.programmes.kpis.subtitle",
						"Le taux de lancement est un indicateur fort de l'efficacité du programme BMC",
					)}
				</p>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<FlatCard className="border-blue-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">Inscrits au programme</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.total ?? 0}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-blue-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">En formation BMC</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.enFormation ?? 0}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-indigo-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">Plan en cours</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.enElaboration ?? 0}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-emerald-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">
								Activités lancées
							</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.lances ?? 0}
								<span className="text-sm font-normal text-muted-foreground ml-1.5">
									({kpis?.tauxLancement ?? 0}%)
								</span>
							</div>
						</div>
					</FlatCard>
				</div>
			</section>

			{/* ─── Funnel par étape ──────────────────── */}
			<section>
				<SectionHeader
					icon={<ClipboardCheck />}
					title={t("pnpe.programmes.funnel.title", "Funnel par étape du parcours")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.programmes.funnel.subtitle",
						"Distribution actuelle des D.E inscrits au programme Auto-Emploi",
					)}
				</p>
				<FlatCard>
					<div className="p-4">
						{isLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-7 w-full" />
								<Skeleton className="h-7 w-full" />
								<Skeleton className="h-7 w-full" />
							</div>
						) : (
							<div className="space-y-3">
								{orderedEtapes.map(([etape, meta]) => {
									const count = (kpis?.byEtape as any)?.[etape] ?? 0;
									const total = kpis?.total ?? 0;
									const pct = total > 0 ? Math.round((count / total) * 100) : 0;
									const Icon = meta.icon;
									return (
										<div key={etape} className="space-y-1">
											<div className="flex items-center justify-between text-sm">
												<span className="flex items-center gap-2 font-medium">
													<span
														className={`p-1 rounded ${TONE_BG[meta.tone]?.split(" ").slice(0, 2).join(" ")}`}
													>
														<Icon className="h-3.5 w-3.5" />
													</span>
													{meta.label}
												</span>
												<span className="text-muted-foreground tabular-nums text-xs">
													{count} ({pct}%)
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className={`h-full rounded-full transition-all ${TONE_BG[meta.tone]?.split(" ")[0]} opacity-70`}
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</FlatCard>
			</section>

			{/* ─── Liste détaillée ────────────────────── */}
			<section>
				<SectionHeader
					icon={<Briefcase />}
					title={t("pnpe.programmes.list.title", "Projets actifs")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.programmes.list.subtitle",
						"Triés du plus récent. Les projets formalisés ANPI sont marqués (passerelle conclue).",
					)}
				</p>
				<FlatCard>
					<div className="p-1">
						{isLoading ? (
							<div className="p-3 space-y-2">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : list.length === 0 ? (
							<div className="p-6 text-sm text-muted-foreground text-center">
								{t(
									"pnpe.programmes.list.empty",
									"Aucune inscription au programme Auto-Emploi. Les D.E s'inscrivent depuis l'app /auto-emploi/inscription.",
								)}
							</div>
						) : (
							<div className="divide-y">
								{list.map((p) => {
									const meta = ETAPE_META[p.etape] ?? ETAPE_META.EVALUATION!;
									const EtapeIcon = meta.icon;
									return (
										<div
											key={p._id}
											className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
										>
											<div
												className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_BG[meta.tone]}`}
											>
												<EtapeIcon className="h-4 w-4" />
											</div>

											<div className="flex-1 min-w-0">
												<div className="font-medium text-sm truncate">
													{p.demandeurNom}
												</div>
												<div className="text-xs text-muted-foreground truncate">
													{p.descriptionProjet} · {p.secteurProjet?.replace(/_/g, " ")}
												</div>
											</div>

											<div className="hidden md:flex items-center gap-2 shrink-0">
												{p.hasBusinessPlan && (
													<Badge variant="outline" className="gap-1 text-xs">
														<ClipboardCheck className="h-3 w-3" />
														BMC
													</Badge>
												)}
												{p.anpiDossierId && (
													<Badge variant="outline" className="gap-1 text-xs border-emerald-500/30 text-emerald-600">
														<Building2 className="h-3 w-3" />
														ANPI
													</Badge>
												)}
											</div>

											<Badge variant="outline" className="gap-1 text-xs shrink-0">
												{meta.label}
											</Badge>

											<div className="hidden lg:block text-xs text-muted-foreground shrink-0 min-w-[100px] text-right">
												{formatDateRelative(p.dateEtape)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</FlatCard>
			</section>
		</div>
	);
}
