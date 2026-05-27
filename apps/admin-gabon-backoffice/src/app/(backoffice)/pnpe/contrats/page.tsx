/**
 * Contrats PNPE — backoffice ministère du Travail.
 *
 * Suivi national des contrats d'apprentissage, professionnalisation,
 * adaptation et insertion. Vue agrégée pour la direction PNPE et le
 * ministère du Travail.
 *
 * MVP : liste + KPI. Drill-down par contrat (visites de suivi, bilan) à
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
	BookOpenCheck,
	CheckCircle2,
	Clock,
	FileSignature,
	GraduationCap,
	XCircle,
} from "lucide-react";

// ─── Référentiels ─────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
	APPRENTISSAGE: { label: "Apprentissage", icon: GraduationCap },
	PROFESSIONNALISATION: { label: "Professionnalisation", icon: BookOpenCheck },
	ADAPTATION: { label: "Adaptation", icon: FileSignature },
	INSERTION: { label: "Insertion", icon: FileSignature },
};

const STATUT_META: Record<string, { label: string; tone: string; icon: React.ElementType }> = {
	EN_COURS: { label: "En cours", tone: "blue", icon: Clock },
	TERMINE: { label: "Terminé", tone: "emerald", icon: CheckCircle2 },
	ROMPU_EMPLOYEUR: { label: "Rompu (employeur)", tone: "rose", icon: XCircle },
	ROMPU_APPRENTI: { label: "Rompu (apprenti)", tone: "amber", icon: XCircle },
};

const TONE_BG: Record<string, string> = {
	blue: "bg-blue-500/10 text-blue-600",
	emerald: "bg-emerald-500/10 text-emerald-600",
	rose: "bg-rose-500/10 text-rose-600",
	amber: "bg-amber-500/10 text-amber-600",
	slate: "bg-slate-500/10 text-slate-600",
};

function formatDate(ts?: number): string {
	if (!ts) return "—";
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatMoney(amount?: number): string {
	if (amount === undefined || amount === null) return "—";
	return `${amount.toLocaleString("fr-FR")} XAF`;
}

// ─── Page ──────────────────────────────────────────────────────

export default function PnpeContratsPage() {
	const { t } = useTranslation();

	const { data: contrats, isLoading } = useAuthenticatedConvexQuery(
		api.functions.pnpe.backofficeQueries.listContrats,
		{},
	);
	const { data: kpis } = useAuthenticatedConvexQuery(
		api.functions.pnpe.backofficeQueries.contratsKpis,
		{},
	);

	const list = (contrats ?? []) as any[];

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.contrats.title", "Contrats de suivi PNPE")}
				subtitle={t(
					"pnpe.contrats.subtitle",
					"Apprentissage, professionnalisation, adaptation, insertion — pilotage national",
				)}
				icon={FileSignature}
			/>

			{/* ─── KPI globaux ─────────────────────────── */}
			<section>
				<SectionHeader
					icon={<BookOpenCheck />}
					title={t("pnpe.contrats.kpis.title", "Indicateurs nationaux")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.contrats.kpis.subtitle",
						"Compteurs en temps réel sur la table `contratsSuivi`",
					)}
				</p>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<FlatCard className="border-blue-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">Total contrats</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.total ?? 0}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-emerald-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">En cours</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.enCours ?? 0}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-emerald-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">Terminés</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.termines ?? 0}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-rose-500/30">
						<div className="p-4">
							<div className="text-xs text-muted-foreground">Rompus</div>
							<div className="text-2xl font-semibold tabular-nums mt-1">
								{kpis?.rompus ?? 0}
							</div>
						</div>
					</FlatCard>
				</div>
			</section>

			{/* ─── Liste des contrats ──────────────────── */}
			<section>
				<SectionHeader
					icon={<FileSignature />}
					title={t("pnpe.contrats.list.title", "Liste des contrats")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.contrats.list.subtitle",
						"Triés du plus récent au plus ancien. Cliquer un contrat pour voir les visites de suivi (en construction).",
					)}
				</p>
				<FlatCard>
					<div className="p-1">
						{isLoading ? (
							<div className="p-3 space-y-2">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : list.length === 0 ? (
							<div className="p-6 text-sm text-muted-foreground text-center">
								{t(
									"pnpe.contrats.list.empty",
									"Aucun contrat enregistré. Les contrats sont créés par les conseillers PNPE depuis l'app /conseiller/.",
								)}
							</div>
						) : (
							<div className="divide-y">
								{list.map((c) => {
									const typeMeta = TYPE_META[c.type] ?? {
										label: c.type,
										icon: FileSignature,
									};
									const statutMeta = STATUT_META[c.statut] ?? {
										label: c.statut,
										tone: "slate",
										icon: Clock,
									};
									const TypeIcon = typeMeta.icon;
									const StatutIcon = statutMeta.icon;
									return (
										<div
											key={c._id}
											className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
										>
											{/* Type */}
											<div
												className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_BG[statutMeta.tone]}`}
											>
												<TypeIcon className="h-4 w-4" />
											</div>

											{/* Identité + poste */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 text-sm">
													<span className="font-medium truncate">
														{c.demandeurNom}
													</span>
													<span className="text-muted-foreground">→</span>
													<span className="truncate">{c.employeurNom}</span>
												</div>
												<div className="text-xs text-muted-foreground truncate">
													{c.poste} · réf. {c.referenceContrat}
												</div>
											</div>

											{/* Dates */}
											<div className="hidden lg:flex flex-col items-end text-xs text-muted-foreground shrink-0 min-w-[120px]">
												<div className="tabular-nums">
													{formatDate(c.dateDebut)} → {formatDate(c.dateFin)}
												</div>
												<div className="tabular-nums">
													{formatMoney(c.remuneration)}/mois
												</div>
											</div>

											{/* Suivis */}
											<Badge variant="outline" className="text-xs shrink-0">
												{c.visitesSuiviCount} visite(s)
											</Badge>

											{/* Statut */}
											<Badge variant="outline" className="gap-1 text-xs shrink-0">
												<StatutIcon className="h-3 w-3" />
												{statutMeta.label}
											</Badge>
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
