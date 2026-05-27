/**
 * Dashboard PNPE — backoffice ministère du Travail.
 *
 * Vue d'ensemble du Pôle National de Promotion de l'Emploi pour la direction
 * PNPE et le cabinet du ministre. KPI nationaux + répartition régionale +
 * top secteurs en tension.
 *
 * Lecture seule : utilise les queries publiques de `convex/functions/pnpe/stats.ts`.
 * Mutations (création antenne, RBAC) restent dans les pages dédiées.
 */
"use client";

import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Briefcase,
	Building2,
	MapPin,
	TrendingUp,
	UserCheck,
	Users,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────

const PROVINCE_LABEL: Record<string, string> = {
	ESTUAIRE: "Estuaire",
	HAUT_OGOOUE: "Haut-Ogooué",
	MOYEN_OGOOUE: "Moyen-Ogooué",
	NGOUNIE: "Ngounié",
	NYANGA: "Nyanga",
	OGOOUE_IVINDO: "Ogooué-Ivindo",
	OGOOUE_LOLO: "Ogooué-Lolo",
	OGOOUE_MARITIME: "Ogooué-Maritime",
	WOLEU_NTEM: "Woleu-Ntem",
};

const SECTOR_LABEL: Record<string, string> = {
	AGRICULTURE_PECHE: "Agriculture, pêche",
	INDUSTRIE_EXTRACTIVE: "Industries extractives",
	INDUSTRIE_MANUFACTURIERE: "Industrie manufacturière",
	BTP_CONSTRUCTION: "BTP / construction",
	COMMERCE: "Commerce",
	TRANSPORT_LOGISTIQUE: "Transport / logistique",
	TELECOMS_NUMERIQUE: "Télécoms / numérique",
	SERVICES_FINANCIERS: "Services financiers",
	SERVICES_AUX_ENTREPRISES: "Services aux entreprises",
	HOTELLERIE_RESTAURATION: "Hôtellerie / restauration",
	EDUCATION_FORMATION: "Éducation / formation",
	SANTE_SOCIAL: "Santé / social",
	ADMINISTRATION_PUBLIQUE: "Administration publique",
	ASSOCIATIONS_ONG: "Associations / ONG",
	ENERGIE_ENVIRONNEMENT: "Énergie / environnement",
	AUTRES: "Autres",
};

function formatProvince(code: string): string {
	return PROVINCE_LABEL[code] ?? code;
}

function formatSector(code: string): string {
	return SECTOR_LABEL[code] ?? code;
}

// ─── Composants ─────────────────────────────────────────────────

interface KpiCardProps {
	label: string;
	value: number | string;
	icon: React.ElementType;
	iconColorClass: string;
	hint?: string;
	loading?: boolean;
}

function KpiCard({ label, value, icon: Icon, iconColorClass, hint, loading }: KpiCardProps) {
	return (
		<FlatCard>
			<div className="p-4 flex items-start gap-3">
				<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconColorClass}`}>
					<Icon className="h-5 w-5" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-xs text-muted-foreground">{label}</div>
					{loading ? (
						<Skeleton className="h-7 w-16 mt-1" />
					) : (
						<div className="text-2xl font-semibold tracking-tight mt-0.5">
							{typeof value === "number" ? value.toLocaleString("fr-FR") : value}
						</div>
					)}
					{hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
				</div>
			</div>
		</FlatCard>
	);
}

// ─── Page ──────────────────────────────────────────────────────

export default function PnpeDashboardPage() {
	const { t } = useTranslation();

	const { data: kpis, isLoading: kpisLoading } = useAuthenticatedConvexQuery(
		api.functions.pnpe.stats.nationalKpis,
		{},
	);
	const { data: byProvince, isLoading: byProvinceLoading } = useAuthenticatedConvexQuery(
		api.functions.pnpe.stats.demandeursByProvince,
		{},
	);
	const { data: bySector, isLoading: bySectorLoading } = useAuthenticatedConvexQuery(
		api.functions.pnpe.stats.offresBySector,
		{},
	);

	const totalDemandeurs = kpis?.demandeursInscrits ?? 0;
	const tauxPlacement =
		totalDemandeurs > 0
			? `${Math.round(((kpis?.demandeursPlaces ?? 0) / totalDemandeurs) * 100)}%`
			: "—";

	// Tri provinces par count décroissant
	const sortedProvinces = (byProvince ?? [])
		.slice()
		.sort((a: any, b: any) => b.count - a.count);

	// Top 5 secteurs
	const top5Sectors = (bySector ?? []).slice(0, 5);

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.dashboard.title", "Tableau de bord PNPE")}
				subtitle={t(
					"pnpe.dashboard.subtitle",
					"Vue nationale du Pôle National de Promotion de l'Emploi",
				)}
				icon={Briefcase}
			/>

			{/* ─── KPI nationaux ─────────────────────────── */}
			<section>
				<SectionHeader
					icon={<TrendingUp />}
					title={t("pnpe.dashboard.kpis.title", "Indicateurs nationaux")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.dashboard.kpis.subtitle",
						"Chiffres clés à jour — calculés en temps réel depuis Convex",
					)}
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
					<KpiCard
						label={t("pnpe.dashboard.kpis.demandeurs", "Demandeurs inscrits")}
						value={kpis?.demandeursInscrits ?? 0}
						icon={Users}
						iconColorClass="bg-blue-500/10 text-blue-600"
						loading={kpisLoading}
					/>
					<KpiCard
						label={t("pnpe.dashboard.kpis.demandeursActifs", "Demandeurs actifs")}
						value={kpis?.demandeursActifs ?? 0}
						icon={UserCheck}
						iconColorClass="bg-emerald-500/10 text-emerald-600"
						hint={t(
							"pnpe.dashboard.kpis.demandeursActifsHint",
							"ACTIF + EN_FORMATION + EN_CONTRAT",
						)}
						loading={kpisLoading}
					/>
					<KpiCard
						label={t("pnpe.dashboard.kpis.places", "Demandeurs placés")}
						value={kpis?.demandeursPlaces ?? 0}
						icon={TrendingUp}
						iconColorClass="bg-amber-500/10 text-amber-600"
						hint={`${tauxPlacement} ${t("pnpe.dashboard.kpis.placementRate", "taux placement")}`}
						loading={kpisLoading}
					/>
					<KpiCard
						label={t("pnpe.dashboard.kpis.offres", "Offres publiées")}
						value={kpis?.offresPubliees ?? 0}
						icon={Briefcase}
						iconColorClass="bg-indigo-500/10 text-indigo-600"
						loading={kpisLoading}
					/>
					<KpiCard
						label={t("pnpe.dashboard.kpis.employeurs", "Employeurs vérifiés")}
						value={kpis?.employeursVerifies ?? 0}
						icon={Building2}
						iconColorClass="bg-rose-500/10 text-rose-600"
						hint={t("pnpe.dashboard.kpis.employeursHint", "Statut DGI+CNSS à jour")}
						loading={kpisLoading}
					/>
					<KpiCard
						label={t("pnpe.dashboard.kpis.antennes", "Antennes ouvertes")}
						value={kpis?.antennesOperationnelles ?? 0}
						icon={MapPin}
						iconColorClass="bg-slate-500/10 text-slate-600"
						hint={t("pnpe.dashboard.kpis.antennesHint", "Sur 9 provinces")}
						loading={kpisLoading}
					/>
				</div>
			</section>

			{/* ─── Répartition demandeurs par province ───── */}
			<section>
				<SectionHeader
					icon={<MapPin />}
					title={t(
						"pnpe.dashboard.byProvince.title",
						"Répartition des demandeurs par province",
					)}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.dashboard.byProvince.subtitle",
						"Indicateur d'équilibre territorial — à compléter avec ouverture des antennes manquantes (Ngounié, Ogooué-Ivindo)",
					)}
				</p>
				<FlatCard>
					<div className="p-4">
						{byProvinceLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-full" />
							</div>
						) : sortedProvinces.length === 0 ? (
							<div className="text-sm text-muted-foreground py-6 text-center">
								{t(
									"pnpe.dashboard.byProvince.empty",
									"Aucun demandeur enregistré pour le moment.",
								)}
							</div>
						) : (
							<div className="space-y-2">
								{sortedProvinces.map((row: any) => {
									const max = sortedProvinces[0]?.count || 1;
									const pct = Math.round((row.count / max) * 100);
									return (
										<div key={row.province} className="space-y-1">
											<div className="flex justify-between text-sm">
												<span className="font-medium">
													{formatProvince(row.province)}
												</span>
												<span className="text-muted-foreground tabular-nums">
													{row.count.toLocaleString("fr-FR")}
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-blue-500/70 rounded-full transition-all"
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

			{/* ─── Top secteurs ───────────────────────────── */}
			<section>
				<SectionHeader
					icon={<Briefcase />}
					title={t(
						"pnpe.dashboard.bySector.title",
						"Secteurs en tension — top 5 offres publiées",
					)}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.dashboard.bySector.subtitle",
						"Référentiel NAF Gabon — un secteur dominant peut signaler une pénurie de main-d'œuvre qualifiée",
					)}
				</p>
				<FlatCard>
					<div className="p-4">
						{bySectorLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-full" />
							</div>
						) : top5Sectors.length === 0 ? (
							<div className="text-sm text-muted-foreground py-6 text-center">
								{t(
									"pnpe.dashboard.bySector.empty",
									"Aucune offre publiée pour le moment.",
								)}
							</div>
						) : (
							<div className="space-y-2">
								{top5Sectors.map((row: any, idx: number) => {
									const max = top5Sectors[0]?.count || 1;
									const pct = Math.round((row.count / max) * 100);
									return (
										<div key={row.secteur} className="space-y-1">
											<div className="flex justify-between text-sm">
												<span className="font-medium">
													<span className="text-muted-foreground mr-2">
														#{idx + 1}
													</span>
													{formatSector(row.secteur)}
												</span>
												<span className="text-muted-foreground tabular-nums">
													{row.count.toLocaleString("fr-FR")}{" "}
													{t("pnpe.dashboard.bySector.offers", "offres")}
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-indigo-500/70 rounded-full transition-all"
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
		</div>
	);
}
