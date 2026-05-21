/**
 * Rapport Diplomatique — Générateur PDF
 *
 * Génère un rapport d'activité diplomatique au format PDF
 * avec page de garde, résumé exécutif et corps structuré.
 * Utilise @react-pdf/renderer pour un rendu riche.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e1e1e",
  },
  // Page de garde
  coverPage: {
    padding: 60,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  coverHeader: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  coverSubheader: {
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  coverStripe: {
    width: 120,
    height: 3,
    marginBottom: 2,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 10,
    color: "#141414",
  },
  coverMeta: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 6,
  },
  // Corps
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 8,
    color: "#141414",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 4,
  },
  subsectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 4,
    color: "#333",
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 8,
    textAlign: "justify",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statLabel: {
    fontSize: 9,
    color: "#666",
  },
  statValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 10,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  listText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 4,
  },
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportPDFData {
  title: string;
  period: string;
  recipientLabel: string;
  orgName: string;
  date: string;
  summary: string;
  content: string;
  statistics?: {
    totalTargets: number;
    contactedTargets: number;
    meetingsHeld: number;
    projectsInitiated: number;
  };
  recommendations?: string[];
}

// ─── Composant PDF ──────────────────────────────────────────────────────────

export function DiplomaticReportPDF({ data }: { data: ReportPDFData }) {
  const contentParagraphs = data.content
    .split("\n")
    .filter((p) => p.trim().length > 0);

  return (
    <Document>
      {/* Page de garde */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverHeader}>RÉPUBLIQUE GABONAISE</Text>
        <Text style={styles.coverSubheader}>
          Union — Travail — Justice
        </Text>

        {/* Bandes tricolores */}
        <View
          style={[styles.coverStripe, { backgroundColor: "#009E60" }]}
        />
        <View
          style={[styles.coverStripe, { backgroundColor: "#FCD116" }]}
        />
        <View
          style={[styles.coverStripe, { backgroundColor: "#3A75C4" }]}
        />

        <Text style={styles.coverTitle}>{data.title}</Text>
        <Text style={styles.coverMeta}>Période : {data.period}</Text>
        <Text style={styles.coverMeta}>
          Destinataire : {data.recipientLabel}
        </Text>
        <Text style={styles.coverMeta}>{data.orgName}</Text>
        <Text style={[styles.coverMeta, { marginTop: 20 }]}>
          {data.date}
        </Text>

        <Text style={styles.footer}>
          {data.orgName} — Document confidentiel
        </Text>
      </Page>

      {/* Corps du rapport */}
      <Page size="A4" style={styles.page}>
        {/* Résumé exécutif */}
        <Text style={styles.sectionTitle}>Résumé Exécutif</Text>
        <Text style={styles.paragraph}>{data.summary}</Text>

        {/* Statistiques */}
        {data.statistics && (
          <>
            <Text style={styles.sectionTitle}>
              Indicateurs Clés
            </Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cibles identifiées</Text>
              <Text style={styles.statValue}>
                {data.statistics.totalTargets}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cibles contactées</Text>
              <Text style={styles.statValue}>
                {data.statistics.contactedTargets}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Réunions tenues</Text>
              <Text style={styles.statValue}>
                {data.statistics.meetingsHeld}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Projets initiés</Text>
              <Text style={styles.statValue}>
                {data.statistics.projectsInitiated}
              </Text>
            </View>
          </>
        )}

        {/* Contenu détaillé */}
        <Text style={styles.sectionTitle}>Rapport Détaillé</Text>
        {contentParagraphs.map((para, i) => (
          <Text key={i} style={styles.paragraph}>
            {para}
          </Text>
        ))}

        {/* Recommandations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommandations</Text>
            {data.recommendations.map((rec, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>{i + 1}.</Text>
                <Text style={styles.listText}>{rec}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>
          {data.orgName} — Rapport confidentiel — {data.date}
        </Text>
      </Page>
    </Document>
  );
}
