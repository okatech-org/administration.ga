"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
	downloadDailyReport,
	type DailyReportData,
} from "@/lib/daily-report-pdf";

const STATUS_LABEL_FR: Record<string, string> = {
	draft: "Brouillon",
	submitted: "Soumis",
	pending: "En attente",
	pending_completion: "Compléments",
	edited: "Modifié",
	under_review: "Examen",
	processing: "Traitement",
	in_production: "Production",
	validated: "Validé",
	appointment_scheduled: "RDV",
	ready_for_pickup: "Prêt",
	completed: "Terminé",
	cancelled: "Annulé",
	rejected: "Rejeté",
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

/**
 * Drawer « Rapport du jour ».
 *
 * Aperçu HTML rendu avec un look « feuille » (fond toujours blanc, texte
 * toujours sombre, en mode clair ET sombre — d'où les couleurs en dur).
 * Le contenu HTML et le PDF généré utilisent les mêmes données — pas de
 * dépendance à un thème ou à un état UI.
 */
export function DailyReportSheet({
	open,
	onOpenChange,
	stats,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stats: any;
}) {
	const { t, i18n } = useTranslation();
	const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
	const [downloading, setDownloading] = useState(false);

	const now = useMemo(() => Date.now(), [open]);
	const dateLabel = new Date(now).toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const timeLabel = new Date(now).toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
	});

	const sb: Record<string, number> = stats?.requests?.statusBreakdown ?? {};
	const pipelineEntries = Object.entries(sb)
		.filter(([, n]) => (n as number) > 0)
		.sort((a, b) => (b[1] as number) - (a[1] as number));

	const byCountry: Record<string, { count: number }> =
		stats?.deployment?.byCountry ?? {};
	const topReps = Object.entries(byCountry)
		.map(([code, info]) => ({ code, count: info.count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 6);

	const criticalAlerts: any[] = stats?.security?.criticalAlerts ?? [];

	const health = stats?.security?.systemHealth ?? "HEALTHY";
	const healthLabel =
		health === "CRITICAL"
			? "Critique"
			: health === "DEGRADED"
				? "Dégradé"
				: "Nominal";
	const healthColor =
		health === "CRITICAL"
			? "#b3261e"
			: health === "DEGRADED"
				? "#a16e00"
				: "#157a3d";

	const handleDownload = async () => {
		if (!stats) return;
		setDownloading(true);
		try {
			// On reconstruit un mapping countryCode → libellé via i18n pour le PDF
			// (le PDF n'a pas accès au hook `t`).
			const countryNames: Record<string, string> = {};
			for (const code of Object.keys(byCountry)) {
				countryNames[code] = t(`superadmin.countryCodes.${code}`, code);
			}
			const data: DailyReportData = {
				stats,
				countryNames,
				generatedAt: now,
				locale: i18n.language?.startsWith("en") ? "en" : "fr",
			};
			await downloadDailyReport(data);
		} finally {
			setDownloading(false);
		}
	};

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("superadmin.dashboard.actions.dailyReport")}
			icon={
				<span
					style={{
						width: 28,
						height: 28,
						borderRadius: 8,
						background: "var(--gabon-blue-v2-tint)",
						color: "var(--gabon-blue-v2)",
						display: "grid",
						placeItems: "center",
					}}
				>
					<FileText className="h-4 w-4" />
				</span>
			}
			maxHeight="80vh"
			maxWidthClass="max-w-3xl"
			footer={
				<div className="flex items-center justify-between gap-3">
					<span className="text-xs text-muted-foreground">
						{t("superadmin.dashboard.dailyReport.confidential")}
					</span>
					<Button
						type="button"
						size="sm"
						onClick={handleDownload}
						disabled={downloading || !stats}
					>
						<Download className="mr-2 h-3.5 w-3.5" />
						{downloading
							? t("superadmin.dashboard.dailyReport.generating")
							: t("superadmin.dashboard.dailyReport.downloadPdf")}
					</Button>
				</div>
			}
		>
			{/* Aperçu « papier » — fond toujours blanc, texte toujours sombre, même
			    en dark mode. C'est volontaire : un rapport reste un rapport, on lit
			    sur un fond blanc avant d'imprimer ou de partager le PDF. */}
			<div
				className="mx-auto my-6"
				style={{
					maxWidth: 640,
					background: "#ffffff",
					color: "#14130f",
					boxShadow: "0 8px 32px -12px rgba(0,0,0,0.25)",
					borderRadius: 4,
					padding: "32px 40px",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						gap: 16,
					}}
				>
					<div>
						<div
							style={{
								fontSize: 10,
								letterSpacing: 1.5,
								textTransform: "uppercase",
								color: "#6a665b",
								fontWeight: 600,
							}}
						>
							CENTRE DE COMMANDEMENT · CONSULAT.GA
						</div>
						<h2
							style={{
								fontSize: 24,
								fontWeight: 700,
								margin: "6px 0 4px",
								color: "#14130f",
								letterSpacing: "-0.02em",
							}}
						>
							{t("superadmin.dashboard.actions.dailyReport")}
						</h2>
						<div style={{ fontSize: 12, color: "#6a665b" }}>
							{dateLabel} · {timeLabel}
						</div>
						<div
							style={{
								display: "flex",
								width: 60,
								height: 3,
								marginTop: 12,
								overflow: "hidden",
							}}
						>
							<span style={{ flex: 1, background: "#0a8a3b" }} />
							<span style={{ flex: 1, background: "#f1c531" }} />
							<span style={{ flex: 1, background: "#0b4f9c" }} />
						</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 11, color: "#6a665b" }}>
							{t("superadmin.dashboard.dailyReport.systemState")}
						</div>
						<div
							style={{
								fontSize: 13,
								fontWeight: 700,
								color: healthColor,
								marginTop: 4,
							}}
						>
							{healthLabel}
						</div>
					</div>
				</div>

				<hr
					style={{
						border: "none",
						borderBottom: "1px solid #e6e2d8",
						margin: "20px 0",
					}}
				/>

				{/* KPI grid */}
				<SectionTitle>{t("superadmin.dashboard.kpiSection")}</SectionTitle>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3, 1fr)",
						gap: 8,
					}}
				>
					<KpiBox
						label={t("superadmin.dashboard.stats.users")}
						value={fmt(stats?.users?.total ?? 0)}
						hint={t("superadmin.dashboard.kpi.userHint")}
					/>
					<KpiBox
						label={t("superadmin.dashboard.stats.organizations")}
						value={fmt(stats?.deployment?.totalOrgs ?? 0)}
						hint={t("superadmin.dashboard.kpi.orgRate", {
							rate: stats?.deployment?.activationRate ?? 0,
						})}
					/>
					<KpiBox
						label={t("superadmin.dashboard.stats.requests")}
						value={fmt(stats?.requests?.total ?? 0)}
						hint={t("superadmin.dashboard.kpi.requestsHint", {
							count: stats?.performance?.urgentPending ?? 0,
						})}
					/>
					<KpiBox
						label={t("superadmin.dashboard.stats.registrations")}
						value={fmt(stats?.registrations?.total ?? 0)}
						hint={t("superadmin.dashboard.kpi.registrationsHint")}
					/>
					<KpiBox
						label={t("superadmin.dashboard.kpi.associations")}
						value={fmt(stats?.associations?.total ?? 0)}
						hint={t("superadmin.dashboard.kpi.companiesFallback", {
							count: stats?.companies?.total ?? 0,
						})}
					/>
					<KpiBox
						label={t("superadmin.dashboard.sections.resolution")}
						value={`${stats?.performance?.completionRate ?? 0} %`}
						hint={t("superadmin.dashboard.dailyReport.last30days")}
					/>
				</div>

				{/* Pipeline */}
				{pipelineEntries.length > 0 && (
					<>
						<SectionTitle>
							{t("superadmin.dashboard.sections.pipeline")}
						</SectionTitle>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<tbody>
								{pipelineEntries.map(([status, count]) => (
									<tr key={status}>
										<td
											style={{
												padding: "6px 0",
												color: "#6a665b",
												fontSize: 12,
											}}
										>
											{STATUS_LABEL_FR[status] ?? status}
										</td>
										<td
											style={{
												padding: "6px 0",
												textAlign: "right",
												fontWeight: 600,
												fontSize: 12,
												color: "#14130f",
											}}
										>
											{fmt(count as number)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				)}

				{/* Top reps */}
				{topReps.length > 0 && (
					<>
						<SectionTitle>
							{t("superadmin.dashboard.sections.topReps")}
						</SectionTitle>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<tbody>
								{topReps.map((r) => (
									<tr key={r.code}>
										<td
											style={{
												padding: "6px 0",
												color: "#6a665b",
												fontSize: 12,
											}}
										>
											{t(`superadmin.countryCodes.${r.code}`, r.code)}
										</td>
										<td
											style={{
												padding: "6px 0",
												textAlign: "right",
												fontWeight: 600,
												fontSize: 12,
												color: "#14130f",
											}}
										>
											{fmt(r.count)} poste{r.count > 1 ? "s" : ""}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				)}

				{/* Alertes */}
				{criticalAlerts.length > 0 && (
					<>
						<SectionTitle>
							{t("superadmin.dashboard.dailyReport.criticalAlerts")}
						</SectionTitle>
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							{criticalAlerts.slice(0, 6).map((a) => (
								<div
									key={a._id}
									style={{
										borderLeft: "3px solid #b3261e",
										paddingLeft: 12,
										paddingTop: 2,
										paddingBottom: 2,
									}}
								>
									<div style={{ fontWeight: 600, fontSize: 12, color: "#14130f" }}>
										{a.message ?? a.type}
									</div>
									<div style={{ fontSize: 11, color: "#6a665b", marginTop: 2 }}>
										{a.source} · priorité {a.priorite}
									</div>
								</div>
							))}
						</div>
					</>
				)}

				<div
					style={{
						marginTop: 32,
						paddingTop: 12,
						borderTop: "1px solid #e6e2d8",
						fontSize: 10,
						color: "#9a9588",
						textAlign: "center",
					}}
				>
					{t("superadmin.dashboard.dailyReport.footer", {
						date: dateLabel,
						time: timeLabel,
					})}
				</div>
			</div>
		</BottomSheet>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				fontWeight: 700,
				fontSize: 13,
				marginTop: 20,
				marginBottom: 8,
				color: "#14130f",
			}}
		>
			{children}
		</div>
	);
}

function KpiBox({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div
			style={{
				border: "1px solid #e6e2d8",
				borderRadius: 6,
				padding: 10,
				background: "#fbfaf6",
			}}
		>
			<div
				style={{
					fontSize: 9,
					textTransform: "uppercase",
					letterSpacing: 1,
					color: "#6a665b",
					fontWeight: 600,
				}}
			>
				{label}
			</div>
			<div
				style={{
					fontSize: 20,
					fontWeight: 700,
					marginTop: 4,
					color: "#14130f",
				}}
			>
				{value}
			</div>
			{hint && (
				<div style={{ fontSize: 10, color: "#6a665b", marginTop: 4 }}>
					{hint}
				</div>
			)}
		</div>
	);
}
