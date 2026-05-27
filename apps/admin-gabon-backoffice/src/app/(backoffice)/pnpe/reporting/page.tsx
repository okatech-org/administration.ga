/**
 * Reporting PNPE — exports vers le ministère du Travail.
 *
 * Génère les exports périodiques attendus par le cabinet du ministre :
 * snapshot mensuel, trimestriel, annuel. Format CSV (compatible Excel /
 * tableurs gouvernementaux).
 *
 * MVP : export CSV des indicateurs nationaux courants (`nationalKpis`,
 * `demandeursByProvince`, `offresBySector`). Pour ajouter des séries
 * temporelles agrégées (historique mensuel), il faudra une table
 * `pnpeSnapshots` peuplée par cron — à brancher en Phase 7+.
 */
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import {
	BarChart3,
	Building2,
	CalendarDays,
	Download,
	FileBarChart,
	FileSpreadsheet,
	Info,
} from "lucide-react";

// ─── Helpers CSV ──────────────────────────────────────────────

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
	const csv =
		header.map(quoteCsv).join(",") +
		"\n" +
		rows.map((r) => r.map(quoteCsv).join(",")).join("\n");
	const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function quoteCsv(v: string | number): string {
	const s = String(v ?? "");
	if (s.includes(",") || s.includes('"') || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function todayYmd(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}${m}${day}`;
}

// ─── Page ─────────────────────────────────────────────────────

export default function PnpeReportingPage() {
	const { t } = useTranslation();
	const [exporting, setExporting] = useState<string | null>(null);

	const { data: kpis } = useAuthenticatedConvexQuery(
		api.functions.pnpe.stats.nationalKpis,
		{},
	);
	const { data: byProvince } = useAuthenticatedConvexQuery(
		api.functions.pnpe.stats.demandeursByProvince,
		{},
	);
	const { data: bySector } = useAuthenticatedConvexQuery(
		api.functions.pnpe.stats.offresBySector,
		{},
	);

	const exportKpisCsv = () => {
		setExporting("kpis");
		try {
			downloadCsv(
				`pnpe-kpis-nationaux-${todayYmd()}.csv`,
				["Indicateur", "Valeur"],
				[
					["Demandeurs inscrits", kpis?.demandeursInscrits ?? 0],
					["Demandeurs actifs", kpis?.demandeursActifs ?? 0],
					["Demandeurs placés", kpis?.demandeursPlaces ?? 0],
					["Offres publiées", kpis?.offresPubliees ?? 0],
					["Employeurs vérifiés", kpis?.employeursVerifies ?? 0],
					["Antennes opérationnelles", kpis?.antennesOperationnelles ?? 0],
				],
			);
			toast.success("Export KPI nationaux téléchargé.");
		} catch (e: any) {
			toast.error(`Export échoué : ${e?.message ?? "erreur inconnue"}`);
		} finally {
			setExporting(null);
		}
	};

	const exportProvinceCsv = () => {
		setExporting("province");
		try {
			downloadCsv(
				`pnpe-demandeurs-par-province-${todayYmd()}.csv`,
				["Province", "Nombre de D.E"],
				(byProvince ?? []).map((row: any) => [row.province, row.count]),
			);
			toast.success("Export par province téléchargé.");
		} catch (e: any) {
			toast.error(`Export échoué : ${e?.message ?? "erreur inconnue"}`);
		} finally {
			setExporting(null);
		}
	};

	const exportSectorCsv = () => {
		setExporting("sector");
		try {
			downloadCsv(
				`pnpe-offres-par-secteur-${todayYmd()}.csv`,
				["Secteur NAF", "Nombre d'offres"],
				(bySector ?? []).map((row: any) => [row.secteur, row.count]),
			);
			toast.success("Export par secteur téléchargé.");
		} catch (e: any) {
			toast.error(`Export échoué : ${e?.message ?? "erreur inconnue"}`);
		} finally {
			setExporting(null);
		}
	};

	/**
	 * Export combiné multi-sections — un seul fichier CSV avec 3 sections
	 * délimitées par des lignes d'entête. Format pratique pour le cabinet
	 * qui veut une vision globale sans gérer 3 fichiers séparés.
	 */
	const exportSnapshotComplet = () => {
		setExporting("complet");
		try {
			const sections: (string | number)[][] = [];

			// Section 1 : KPI nationaux
			sections.push(["=== KPI NATIONAUX ==="]);
			sections.push(["Indicateur", "Valeur"]);
			sections.push(["Demandeurs inscrits", kpis?.demandeursInscrits ?? 0]);
			sections.push(["Demandeurs actifs", kpis?.demandeursActifs ?? 0]);
			sections.push(["Demandeurs placés", kpis?.demandeursPlaces ?? 0]);
			sections.push(["Offres publiées", kpis?.offresPubliees ?? 0]);
			sections.push(["Employeurs vérifiés", kpis?.employeursVerifies ?? 0]);
			sections.push([
				"Antennes opérationnelles",
				kpis?.antennesOperationnelles ?? 0,
			]);
			sections.push([""]);

			// Section 2 : Par province
			sections.push(["=== DEMANDEURS D'EMPLOI PAR PROVINCE ==="]);
			sections.push(["Province", "Nombre de D.E"]);
			for (const row of byProvince ?? []) {
				sections.push([row.province, row.count]);
			}
			sections.push([""]);

			// Section 3 : Par secteur
			sections.push(["=== OFFRES PAR SECTEUR NAF ==="]);
			sections.push(["Secteur NAF", "Nombre d'offres"]);
			for (const row of bySector ?? []) {
				sections.push([row.secteur, row.count]);
			}
			sections.push([""]);

			// Footer
			sections.push([
				`Généré le ${new Date().toLocaleString("fr-FR")}`,
				"PNPE Gabon — Snapshot complet",
			]);

			const csv = sections
				.map((row) => row.map(quoteCsv).join(","))
				.join("\n");
			const blob = new Blob(["﻿" + csv], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `pnpe-snapshot-complet-${todayYmd()}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("Snapshot complet PNPE téléchargé.");
		} catch (e: any) {
			toast.error(`Export échoué : ${e?.message ?? "erreur inconnue"}`);
		} finally {
			setExporting(null);
		}
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.reporting.title", "Reporting PNPE")}
				subtitle={t(
					"pnpe.reporting.subtitle",
					"Exports CSV vers le ministère du Travail — chiffres courants à fournir au cabinet",
				)}
				icon={FileBarChart}
				actions={
					<Button
						size="sm"
						className="gap-1.5"
						onClick={exportSnapshotComplet}
						disabled={exporting === "complet" || !kpis}
					>
						<Download className="h-3.5 w-3.5" />
						Snapshot complet
					</Button>
				}
			/>

			{/* Note sur les séries temporelles */}
			<FlatCard className="border-blue-500/30 bg-blue-500/5">
				<div className="p-4 flex gap-3">
					<Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
					<div className="text-sm">
						<strong className="text-foreground">MVP : snapshots courants</strong>
						<p className="text-muted-foreground mt-1">
							Les exports ci-dessous reflètent l'état actuel de la base. Pour
							les séries temporelles agrégées (historique mensuel D.E,
							évolution placements trimestre par trimestre), une table{" "}
							<code className="text-xs px-1 py-0.5 rounded bg-background">
								pnpeSnapshots
							</code>{" "}
							peuplée par cron sera nécessaire — à brancher en Phase 7+.
						</p>
					</div>
				</div>
			</FlatCard>

			{/* ─── Exports courants ───────────────────── */}
			<section>
				<SectionHeader
					icon={<Download />}
					title={t("pnpe.reporting.snapshots.title", "Exports snapshot")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.reporting.snapshots.subtitle",
						"État courant. Format CSV avec BOM UTF-8 (Excel-compatible).",
					)}
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{/* KPI nationaux */}
					<FlatCard>
						<div className="p-4 space-y-3">
							<div className="flex items-center gap-2">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
									<BarChart3 className="h-4 w-4" />
								</div>
								<div>
									<div className="font-medium text-sm">KPI nationaux</div>
									<div className="text-xs text-muted-foreground">
										6 indicateurs synthétiques
									</div>
								</div>
							</div>
							<Button
								className="w-full gap-1.5"
								size="sm"
								onClick={exportKpisCsv}
								disabled={exporting === "kpis" || !kpis}
							>
								<FileSpreadsheet className="h-3.5 w-3.5" />
								Télécharger CSV
							</Button>
						</div>
					</FlatCard>

					{/* Demandeurs par province */}
					<FlatCard>
						<div className="p-4 space-y-3">
							<div className="flex items-center gap-2">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
									<Building2 className="h-4 w-4" />
								</div>
								<div>
									<div className="font-medium text-sm">D.E par province</div>
									<div className="text-xs text-muted-foreground">
										{byProvince?.length ?? 0} ligne(s)
									</div>
								</div>
							</div>
							<Button
								className="w-full gap-1.5"
								size="sm"
								onClick={exportProvinceCsv}
								disabled={exporting === "province" || !byProvince}
							>
								<FileSpreadsheet className="h-3.5 w-3.5" />
								Télécharger CSV
							</Button>
						</div>
					</FlatCard>

					{/* Offres par secteur */}
					<FlatCard>
						<div className="p-4 space-y-3">
							<div className="flex items-center gap-2">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
									<BarChart3 className="h-4 w-4" />
								</div>
								<div>
									<div className="font-medium text-sm">Offres par secteur</div>
									<div className="text-xs text-muted-foreground">
										{bySector?.length ?? 0} ligne(s)
									</div>
								</div>
							</div>
							<Button
								className="w-full gap-1.5"
								size="sm"
								onClick={exportSectorCsv}
								disabled={exporting === "sector" || !bySector}
							>
								<FileSpreadsheet className="h-3.5 w-3.5" />
								Télécharger CSV
							</Button>
						</div>
					</FlatCard>
				</div>
			</section>

			{/* ─── À brancher (Phase 7+) ─────────────── */}
			<section>
				<SectionHeader
					icon={<CalendarDays />}
					title={t("pnpe.reporting.future.title", "Rapports périodiques (à brancher)")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.reporting.future.subtitle",
						"Nécessitent la table pnpeSnapshots + un cron mensuel pour figer les agrégats",
					)}
				</p>
				<FlatCard>
					<div className="divide-y">
						{[
							{
								label: "Rapport mensuel — Direction PNPE",
								desc: "Synthèse mois en cours : D.E nouveaux, offres publiées, candidatures, placements",
								freq: "Mensuel",
							},
							{
								label: "Rapport trimestriel — Cabinet du ministre",
								desc: "Évolutions, taux de placement par antenne, top 10 secteurs en tension",
								freq: "Trimestriel",
							},
							{
								label: "Rapport annuel — Conseil des ministres",
								desc: "Bilan annuel formel avec ratios cibles Plan National pour l'Emploi",
								freq: "Annuel",
							},
							{
								label: "Export spécial cabinet — sur demande",
								desc: "Filtres ad-hoc : province × secteur × période, format Excel multi-onglets",
								freq: "Ad-hoc",
							},
						].map((r) => (
							<div
								key={r.label}
								className="flex items-center gap-3 p-3 hover:bg-muted/50"
							>
								<FileBarChart className="h-4 w-4 text-muted-foreground shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium">{r.label}</div>
									<div className="text-xs text-muted-foreground">{r.desc}</div>
								</div>
								<Badge variant="outline" className="text-xs shrink-0">
									{r.freq}
								</Badge>
								<Button size="sm" variant="outline" disabled>
									À brancher
								</Button>
							</div>
						))}
					</div>
				</FlatCard>
			</section>
		</div>
	);
}
