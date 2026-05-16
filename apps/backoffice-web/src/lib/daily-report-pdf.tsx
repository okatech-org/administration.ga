/**
 * Daily report — React-PDF document.
 *
 * Génère un PDF A4 portrait à partir de la photo `getStats` du
 * Centre de Commandement. Utilisé par le bouton « Télécharger PDF »
 * du drawer Rapport du jour.
 */

import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	pdf,
} from "@react-pdf/renderer";

const COLORS = {
	text: "#14130f",
	textMuted: "#6a665b",
	textFaint: "#9a9588",
	border: "#e6e2d8",
	surface: "#fbfaf6",
	gabonBlue: "#0b4f9c",
	gabonGreen: "#0a8a3b",
	gabonYellow: "#f1c531",
	success: "#157a3d",
	warning: "#a16e00",
	danger: "#b3261e",
};

const styles = StyleSheet.create({
	page: {
		padding: "20mm",
		fontFamily: "Helvetica",
		fontSize: 10,
		color: COLORS.text,
		lineHeight: 1.45,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 6,
	},
	eyebrow: {
		fontSize: 8,
		color: COLORS.textMuted,
		letterSpacing: 1.5,
		textTransform: "uppercase",
		fontFamily: "Helvetica-Bold",
	},
	title: {
		fontSize: 20,
		fontFamily: "Helvetica-Bold",
		marginTop: 4,
		color: COLORS.text,
	},
	subtitle: {
		fontSize: 10,
		color: COLORS.textMuted,
		marginTop: 4,
	},
	stripe: {
		flexDirection: "row",
		width: 60,
		height: 3,
		marginTop: 10,
	},
	stripeGreen: { flex: 1, backgroundColor: COLORS.gabonGreen },
	stripeYellow: { flex: 1, backgroundColor: COLORS.gabonYellow },
	stripeBlue: { flex: 1, backgroundColor: COLORS.gabonBlue },
	hr: {
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		marginVertical: 16,
	},
	sectionTitle: {
		fontFamily: "Helvetica-Bold",
		fontSize: 12,
		marginTop: 14,
		marginBottom: 6,
		color: COLORS.text,
	},
	kpiGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 4,
	},
	kpiCard: {
		flexBasis: "31%",
		flexGrow: 1,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 6,
		padding: 8,
		backgroundColor: COLORS.surface,
	},
	kpiLabel: {
		fontSize: 8,
		textTransform: "uppercase",
		letterSpacing: 1,
		color: COLORS.textMuted,
		fontFamily: "Helvetica-Bold",
	},
	kpiValue: {
		fontSize: 18,
		fontFamily: "Helvetica-Bold",
		marginTop: 4,
		color: COLORS.text,
	},
	kpiHint: { fontSize: 9, color: COLORS.textMuted, marginTop: 4 },
	row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
	rowKey: { color: COLORS.textMuted, fontSize: 10 },
	rowValue: { fontFamily: "Helvetica-Bold", fontSize: 10 },
	alertBlock: {
		borderLeftWidth: 3,
		borderLeftColor: COLORS.danger,
		paddingLeft: 8,
		marginVertical: 4,
	},
	alertTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
	alertMeta: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
	footer: {
		position: "absolute",
		bottom: "12mm",
		left: "20mm",
		right: "20mm",
		fontSize: 8,
		color: COLORS.textFaint,
		textAlign: "center",
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		paddingTop: 6,
	},
});

const fmt = (n: number) => n.toLocaleString("fr-FR");

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

export interface DailyReportData {
	stats: any;
	countryNames: Record<string, string>;
	generatedAt: number;
	locale: "fr" | "en";
}

export function DailyReportDocument({ data }: { data: DailyReportData }) {
	const { stats, countryNames, generatedAt, locale } = data;
	const dateLabel = new Date(generatedAt).toLocaleDateString(
		locale === "en" ? "en-US" : "fr-FR",
		{ weekday: "long", day: "numeric", month: "long", year: "numeric" },
	);
	const timeLabel = new Date(generatedAt).toLocaleTimeString(
		locale === "en" ? "en-US" : "fr-FR",
		{ hour: "2-digit", minute: "2-digit" },
	);

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

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.eyebrow}>
							CENTRE DE COMMANDEMENT · CONSULAT.GA
						</Text>
						<Text style={styles.title}>Rapport du jour</Text>
						<Text style={styles.subtitle}>
							{dateLabel} · {timeLabel}
						</Text>
						<View style={styles.stripe}>
							<View style={styles.stripeGreen} />
							<View style={styles.stripeYellow} />
							<View style={styles.stripeBlue} />
						</View>
					</View>
					<View>
						<Text style={{ fontSize: 9, color: COLORS.textMuted }}>
							État système
						</Text>
						<Text
							style={{
								fontSize: 11,
								fontFamily: "Helvetica-Bold",
								color:
									stats?.security?.systemHealth === "CRITICAL"
										? COLORS.danger
										: stats?.security?.systemHealth === "DEGRADED"
											? COLORS.warning
											: COLORS.success,
								marginTop: 3,
							}}
						>
							{stats?.security?.systemHealth === "CRITICAL"
								? "Critique"
								: stats?.security?.systemHealth === "DEGRADED"
									? "Dégradé"
									: "Nominal"}
						</Text>
					</View>
				</View>

				<View style={styles.hr} />

				{/* KPI grid */}
				<Text style={styles.sectionTitle}>Indicateurs clés</Text>
				<View style={styles.kpiGrid}>
					<View style={styles.kpiCard}>
						<Text style={styles.kpiLabel}>Ressortissants</Text>
						<Text style={styles.kpiValue}>
							{fmt(stats?.users?.total ?? 0)}
						</Text>
						<Text style={styles.kpiHint}>comptes actifs</Text>
					</View>
					<View style={styles.kpiCard}>
						<Text style={styles.kpiLabel}>Représentations</Text>
						<Text style={styles.kpiValue}>
							{fmt(stats?.deployment?.totalOrgs ?? 0)}
						</Text>
						<Text style={styles.kpiHint}>
							{stats?.deployment?.activationRate ?? 0} % activées
						</Text>
					</View>
					<View style={styles.kpiCard}>
						<Text style={styles.kpiLabel}>Demandes</Text>
						<Text style={styles.kpiValue}>
							{fmt(stats?.requests?.total ?? 0)}
						</Text>
						<Text style={styles.kpiHint}>
							{fmt(stats?.performance?.urgentPending ?? 0)} en attente
						</Text>
					</View>
					<View style={styles.kpiCard}>
						<Text style={styles.kpiLabel}>Inscriptions</Text>
						<Text style={styles.kpiValue}>
							{fmt(stats?.registrations?.total ?? 0)}
						</Text>
						<Text style={styles.kpiHint}>registre consulaire</Text>
					</View>
					<View style={styles.kpiCard}>
						<Text style={styles.kpiLabel}>Associations</Text>
						<Text style={styles.kpiValue}>
							{fmt(stats?.associations?.total ?? 0)}
						</Text>
						<Text style={styles.kpiHint}>
							{fmt(stats?.companies?.total ?? 0)} entreprises
						</Text>
					</View>
					<View style={styles.kpiCard}>
						<Text style={styles.kpiLabel}>Taux de résolution</Text>
						<Text style={styles.kpiValue}>
							{stats?.performance?.completionRate ?? 0} %
						</Text>
						<Text style={styles.kpiHint}>30 jours glissants</Text>
					</View>
				</View>

				{/* Pipeline */}
				{pipelineEntries.length > 0 && (
					<>
						<Text style={styles.sectionTitle}>Pipeline de traitement</Text>
						<View>
							{pipelineEntries.map(([status, count]) => (
								<View key={status} style={styles.row}>
									<Text style={styles.rowKey}>
										{STATUS_LABEL_FR[status] ?? status}
									</Text>
									<Text style={styles.rowValue}>{fmt(count as number)}</Text>
								</View>
							))}
						</View>
					</>
				)}

				{/* Top representations */}
				{topReps.length > 0 && (
					<>
						<Text style={styles.sectionTitle}>Top représentations</Text>
						<View>
							{topReps.map((r) => (
								<View key={r.code} style={styles.row}>
									<Text style={styles.rowKey}>
										{countryNames[r.code] ?? r.code}
									</Text>
									<Text style={styles.rowValue}>
										{fmt(r.count)} poste{r.count > 1 ? "s" : ""}
									</Text>
								</View>
							))}
						</View>
					</>
				)}

				{/* Alerts */}
				{criticalAlerts.length > 0 && (
					<>
						<Text style={styles.sectionTitle}>Alertes critiques (24 h)</Text>
						{criticalAlerts.slice(0, 6).map((a) => (
							<View key={a._id} style={styles.alertBlock}>
								<Text style={styles.alertTitle}>
									{a.message ?? a.type}
								</Text>
								<Text style={styles.alertMeta}>
									{a.source} · priorité {a.priorite}
								</Text>
							</View>
						))}
					</>
				)}

				<Text style={styles.footer}>
					Généré automatiquement le {dateLabel} à {timeLabel} · Document
					confidentiel — usage interne Consulat.ga
				</Text>
			</Page>
		</Document>
	);
}

/**
 * Génère le PDF et déclenche le téléchargement côté navigateur.
 */
export async function downloadDailyReport(data: DailyReportData) {
	const blob = await pdf(<DailyReportDocument data={data} />).toBlob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const stamp = new Date(data.generatedAt).toISOString().slice(0, 10);
	a.download = `rapport-${stamp}.pdf`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
