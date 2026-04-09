//
//  StatisticsView.swift
//  AgentMacOS
//
//  Full analytics dashboard — expanded version of dashboard charts
//

import SwiftUI
import Charts
import ConvexMobile
import Combine

struct StatisticsView: View {
    @Environment(AppState.self) private var appState
    @State private var stats: OrgStats?
    @State private var agentStats: AgentStatsResponse?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedPeriod: String = "month"

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(title: "Statistiques", subtitle: "Analytique et rapports") {
                        AnyView(
                            Picker("Période", selection: $selectedPeriod) {
                                Text("Semaine").tag("week")
                                Text("Mois").tag("month")
                                Text("Année").tag("year")
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 240)
                        )
                    }

                    if isLoading {
                        LoadingView(message: "Chargement des statistiques...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadStats() }
                    } else if let stats {
                        // KPI Cards
                        kpiGrid(stats)

                        // Charts
                        HStack(spacing: 16) {
                            trendChart(stats)
                            statusPieChart(stats)
                        }

                        HStack(spacing: 16) {
                            serviceBreakdown(stats)
                            agentPerformance
                        }
                    } else {
                        EmptyStateView(
                            icon: "chart.bar",
                            title: "Aucune donnée",
                            subtitle: "Les statistiques apparaîtront une fois qu'il y aura des données."
                        )
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadStats() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadStats() }
            }
            .onChange(of: selectedPeriod) { _, _ in
                Task { await loadStats() }
            }
        }
    }

    // MARK: - KPI Grid

    private func kpiGrid(_ stats: OrgStats) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 3), spacing: 16) {
            StatCard(title: "Total demandes", value: "\(stats.totalRequests)", icon: "doc.text.fill", color: .blue)
            StatCard(title: "En attente", value: "\(stats.statusCounts.pending)", icon: "clock.fill", color: .yellow)
            StatCard(title: "En traitement", value: "\(stats.statusCounts.processing)", icon: "gearshape.fill", color: .purple)
            StatCard(title: "Terminées", value: "\(stats.completedThisPeriod)", icon: "checkmark.circle.fill", color: .green)
            StatCard(
                title: "Temps moyen (jours)",
                value: "\(stats.avgProcessingDays)",
                icon: "timer",
                color: .orange
            )
            StatCard(title: "RDV à venir", value: "\(stats.upcomingAppointments)", icon: "calendar", color: .teal)
        }
    }

    // MARK: - Trend Chart

    private func trendChart(_ stats: OrgStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tendance quotidienne")
                .font(.headline)

            if stats.trend.isEmpty {
                Text("Pas de données de tendance")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(height: 200)
            } else {
                Chart(stats.trend) { point in
                    AreaMark(
                        x: .value("Date", point.date),
                        y: .value("Demandes", point.count)
                    )
                    .foregroundStyle(.blue.opacity(0.2))

                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("Demandes", point.count)
                    )
                    .foregroundStyle(.blue)
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 7)) { value in
                        AxisValueLabel {
                            if let str = value.as(String.self) {
                                Text(formatTrendDate(str))
                                    .font(.caption2)
                            }
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Status Pie Chart

    private func statusPieChart(_ stats: OrgStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Répartition par statut")
                .font(.headline)

            let data: [(String, Int, Color)] = [
                ("Brouillons", stats.statusCounts.draft, .gray),
                ("En attente", stats.statusCounts.pending, .yellow),
                ("En traitement", stats.statusCounts.processing, .purple),
                ("Terminées", stats.statusCounts.completed, .green),
                ("Annulées", stats.statusCounts.cancelled, .red),
            ].filter { $0.1 > 0 }

            if data.isEmpty {
                Text("Aucune donnée")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(height: 200)
            } else {
                Chart(data, id: \.0) { item in
                    SectorMark(
                        angle: .value("Count", item.1),
                        innerRadius: .ratio(0.5)
                    )
                    .foregroundStyle(item.2)
                }
                .frame(height: 200)

                // Legend
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(data, id: \.0) { item in
                        HStack(spacing: 6) {
                            Circle().fill(item.2).frame(width: 8, height: 8)
                            Text(item.0).font(.caption)
                            Spacer()
                            Text("\(item.1)").font(.caption.bold())
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Service Breakdown

    private func serviceBreakdown(_ stats: OrgStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Par service")
                .font(.headline)

            if stats.serviceStats.isEmpty {
                Text("Aucun service")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Chart(stats.serviceStats.prefix(10)) { service in
                    BarMark(
                        x: .value("Demandes", service.count),
                        y: .value("Service", service.name)
                    )
                    .foregroundStyle(.blue.gradient)
                }
                .frame(height: CGFloat(min(stats.serviceStats.count, 10)) * 32)
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Agent Performance

    private var agentPerformance: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Performance agents")
                .font(.headline)

            if let agents = agentStats?.agents, !agents.isEmpty {
                ForEach(agents.prefix(5)) { agent in
                    HStack {
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 28, height: 28)
                            .overlay {
                                Text(String(agent.name.prefix(1)).uppercased())
                                    .font(.caption.bold())
                                    .foregroundStyle(.blue)
                            }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(agent.name)
                                .font(.subheadline)
                            Text("\(agent.completed)/\(agent.assigned) traitées")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Text("\(agent.completionRate)%")
                            .font(.subheadline.bold())
                            .foregroundStyle(agent.completionRate > 80 ? .green : agent.completionRate > 50 ? .yellow : .red)
                    }
                }
            } else {
                Text("Aucune donnée agent")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Data

    private func loadStats() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            stats = try await convexQuery(
                "functions/statistics:getOrgStats",
                with: ["orgId": orgId, "period": selectedPeriod, "currentTime": Date.now.timeIntervalSince1970 * 1000],
                yielding: OrgStats.self
            )
        } catch {
            let msg = "\(error)"
            if msg.contains("INSUFFICIENT_PERMISSION") {
                errorMessage = "Vous n'avez pas la permission d'accéder aux statistiques."
            } else {
                errorMessage = "Erreur: \(msg)"
            }
            stats = nil
        }

        if stats != nil {
            do {
                agentStats = try await convexQuery(
                    "functions/statistics:getAgentStats",
                    with: ["orgId": orgId],
                    yielding: AgentStatsResponse.self
                )
            } catch {
                agentStats = nil
            }
        }

        isLoading = false
    }

    private func formatTrendDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count >= 2 else { return dateStr }
        let months = ["", "jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"]
        let monthIdx = Int(parts[1]) ?? 0
        let day = parts.count > 2 ? String(parts[2]) : ""
        return "\(day) \(months[min(monthIdx, 12)])"
    }
}
