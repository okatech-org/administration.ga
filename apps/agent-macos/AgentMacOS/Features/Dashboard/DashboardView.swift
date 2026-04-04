//
//  DashboardView.swift
//  AgentMacOS
//
//  Main dashboard — mirrors Agent Web's dashboard with consular stats,
//  charts, agent performance, and quick actions.
//  Printer status is a compact secondary widget in Bureau Local.
//

import SwiftUI
import Charts
import ConvexMobile
import Combine

// MARK: - Data Models

/// Matches the return shape of `functions/statistics:getOrgStats`
struct OrgStats: Codable {
    let totalRequests: Int
    let currentPeriodRequests: Int
    let growthPercentage: Int
    let avgProcessingDays: Int
    let statusCounts: StatusCounts
    let serviceStats: [ServiceStat]
    let trend: [TrendPoint]
    let completedThisPeriod: Int
    let upcomingAppointments: Int
    let memberCount: Int
    let period: String
    let generatedAt: Double

    struct StatusCounts: Codable {
        let draft: Int
        let pending: Int
        let processing: Int
        let completed: Int
        let cancelled: Int
    }

    struct ServiceStat: Codable, Identifiable {
        let serviceId: String
        let name: String
        let count: Int
        var id: String { serviceId }
    }

    struct TrendPoint: Codable, Identifiable {
        let date: String
        let count: Int
        var id: String { date }
    }
}

/// Matches the return shape of `functions/statistics:getAgentStats`
struct AgentStatsResponse: Codable {
    let agents: [AgentPerformance]
    let totalAgents: Int

    struct AgentPerformance: Codable, Identifiable {
        let userId: String
        let name: String
        let assigned: Int
        let completed: Int
        let completionRate: Int
        var id: String { userId }
    }
}

// MARK: - Dashboard View

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @State private var stats: OrgStats?
    @State private var agentStats: AgentStatsResponse?
    @State private var isLoading = true
    @State private var selectedPeriod: String = "month"

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection

                if isLoading {
                    loadingSection
                } else if let stats {
                    // Stats cards
                    statsGrid(stats)

                    // Charts row
                    chartsRow(stats)

                    // Bottom row: service breakdown + agent performance + quick actions
                    bottomRow(stats)
                } else {
                    noOrgSelected
                }

                Spacer(minLength: 24)
            }
            .padding(24)
        }
        .background(Color(.windowBackgroundColor))
        .frame(minWidth: 600, minHeight: 400)
        .task {
            await loadStats()
        }
        .onChange(of: appState.selectedOrgId) { _, _ in
            Task { await loadStats() }
        }
        .onChange(of: selectedPeriod) { _, _ in
            Task { await loadStats() }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Dashboard")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Vue d'ensemble de votre activité consulaire")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Period selector
            Picker("Période", selection: $selectedPeriod) {
                Text("Semaine").tag("week")
                Text("Mois").tag("month")
                Text("Année").tag("year")
            }
            .pickerStyle(.segmented)
            .frame(width: 240)
        }
    }

    // MARK: - Loading

    private var loadingSection: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Chargement des statistiques...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    private var noOrgSelected: some View {
        VStack(spacing: 16) {
            Image(systemName: "building.2")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Sélectionnez une organisation")
                .font(.headline)
            Text("Choisissez une organisation pour afficher les statistiques.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    // MARK: - Stats Grid (6 cards)

    private func statsGrid(_ stats: OrgStats) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 3), spacing: 16) {
            StatCard(
                title: "Total demandes",
                value: "\(stats.totalRequests)",
                icon: "doc.text.fill",
                color: .blue,
                growth: stats.growthPercentage
            )

            StatCard(
                title: "En attente",
                value: "\(stats.statusCounts.pending)",
                icon: "clock.fill",
                color: .orange
            )

            StatCard(
                title: "En traitement",
                value: "\(stats.statusCounts.processing)",
                icon: "gearshape.fill",
                color: .indigo
            )

            StatCard(
                title: "Complétées",
                value: "\(stats.statusCounts.completed)",
                icon: "checkmark.circle.fill",
                color: .green
            )

            StatCard(
                title: "Temps moyen",
                value: "\(stats.avgProcessingDays)j",
                icon: "timer",
                color: .pink
            )

            StatCard(
                title: "Rendez-vous",
                value: "\(stats.upcomingAppointments)",
                icon: "calendar",
                color: .purple
            )
        }
    }

    // MARK: - Charts Row

    private func chartsRow(_ stats: OrgStats) -> some View {
        HStack(alignment: .top, spacing: 16) {
            // Daily trend area chart (2/3)
            trendChart(stats.trend)
                .frame(minHeight: 260)

            // Status pie chart (1/3)
            statusPieChart(stats.statusCounts)
                .frame(minWidth: 220, minHeight: 260)
        }
    }

    private func trendChart(_ trend: [OrgStats.TrendPoint]) -> some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                Text("Tendance quotidienne")
                    .font(.headline)

                Chart(trend) { point in
                    AreaMark(
                        x: .value("Date", formatTrendDate(point.date)),
                        y: .value("Demandes", point.count)
                    )
                    .foregroundStyle(
                        .linearGradient(
                            colors: [Color.blue.opacity(0.3), Color.blue.opacity(0.05)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    LineMark(
                        x: .value("Date", formatTrendDate(point.date)),
                        y: .value("Demandes", point.count)
                    )
                    .foregroundStyle(.blue)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
                .chartYAxis {
                    AxisMarks(position: .leading)
                }
                .frame(minHeight: 180)
            }
            .padding(4)
        }
    }

    private func statusPieChart(_ counts: OrgStats.StatusCounts) -> some View {
        let data: [(String, Int, Color)] = [
            ("Brouillon", counts.draft, .gray),
            ("En attente", counts.pending, .orange),
            ("Traitement", counts.processing, .blue),
            ("Complétées", counts.completed, .green),
            ("Annulées", counts.cancelled, .red),
        ].filter { $0.1 > 0 }

        return GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                Text("Répartition")
                    .font(.headline)

                Chart(data, id: \.0) { item in
                    SectorMark(
                        angle: .value(item.0, item.1),
                        innerRadius: .ratio(0.5),
                        angularInset: 2
                    )
                    .foregroundStyle(item.2)
                    .cornerRadius(4)
                }
                .frame(height: 140)

                // Legend
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(data, id: \.0) { item in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(item.2)
                                .frame(width: 8, height: 8)
                            Text(item.0)
                                .font(.caption)
                            Spacer()
                            Text("\(item.1)")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding(4)
        }
    }

    // MARK: - Bottom Row

    private func bottomRow(_ stats: OrgStats) -> some View {
        HStack(alignment: .top, spacing: 16) {
            // Service breakdown
            serviceBreakdown(stats.serviceStats)

            VStack(spacing: 16) {
                // Agent performance
                agentPerformanceCard

                // Quick actions
                quickActionsCard
            }
            .frame(minWidth: 280, maxWidth: 320)
        }
    }

    private func serviceBreakdown(_ services: [OrgStats.ServiceStat]) -> some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                Text("Demandes par service")
                    .font(.headline)

                if services.isEmpty {
                    Text("Aucune donnée")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, minHeight: 100)
                } else {
                    Chart(services) { service in
                        BarMark(
                            x: .value("Demandes", service.count),
                            y: .value("Service", service.name)
                        )
                        .foregroundStyle(by: .value("Service", service.name))
                        .cornerRadius(4)
                    }
                    .chartLegend(.hidden)
                    .frame(minHeight: CGFloat(max(services.count * 36, 100)))
                }
            }
            .padding(4)
        }
    }

    private var agentPerformanceCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Performance agents")
                        .font(.headline)
                    Spacer()
                    if let total = agentStats?.totalAgents {
                        Text("\(total) agents")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                if let agents = agentStats?.agents.prefix(5) {
                    if agents.isEmpty {
                        Text("Aucune donnée")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(Array(agents)) { agent in
                            HStack(spacing: 10) {
                                // Avatar
                                ZStack {
                                    Circle()
                                        .fill(Color.blue.opacity(0.15))
                                    Text(initials(agent.name))
                                        .font(.caption2.bold())
                                        .foregroundStyle(.blue)
                                }
                                .frame(width: 28, height: 28)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(agent.name)
                                        .font(.caption)
                                        .lineLimit(1)
                                    ProgressView(value: Double(agent.completionRate), total: 100)
                                        .tint(agent.completionRate > 70 ? .green : agent.completionRate > 40 ? .orange : .red)
                                }

                                Text("\(agent.completionRate)%")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                                    .frame(width: 36, alignment: .trailing)
                            }
                        }
                    }
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(4)
        }
    }

    private var quickActionsCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                Text("Actions rapides")
                    .font(.headline)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    QuickActionButton(icon: "doc.text", title: "Demandes") {
                        appState.currentScreen = .requests
                    }
                    QuickActionButton(icon: "calendar", title: "Rendez-vous") {
                        appState.currentScreen = .appointments
                    }
                    QuickActionButton(icon: "chart.bar", title: "Statistiques") {
                        appState.currentScreen = .statistics
                    }
                    QuickActionButton(icon: "gear", title: "Paramètres") {
                        appState.currentScreen = .settings
                    }
                    QuickActionButton(icon: "printer", title: "Impression") {
                        appState.currentScreen = .print
                    }
                    QuickActionButton(icon: "creditcard", title: "Paiements") {
                        appState.currentScreen = .payments
                    }
                }
            }
            .padding(4)
        }
    }

    // MARK: - Data Loading

    private func loadStats() async {
        guard let orgId = appState.selectedOrgId else {
            isLoading = false
            stats = nil
            return
        }

        isLoading = true

        // Use subscribe + first value since ConvexMobile doesn't expose query()
        do {
            let orgStatsResult: OrgStats = try await withCheckedThrowingContinuation { continuation in
                var cancellable: AnyCancellable?
                cancellable = convex.subscribe(
                    to: "functions/statistics:getOrgStats",
                    with: ["orgId": orgId, "period": selectedPeriod, "currentTime": Date.now.timeIntervalSince1970 * 1000],
                    yielding: OrgStats.self
                )
                .first()
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                    },
                    receiveValue: { value in
                        continuation.resume(returning: value)
                    }
                )
            }
            stats = orgStatsResult
        } catch {
            print("[Dashboard] Error loading org stats: \(error)")
            stats = nil
        }

        do {
            let agentStatsResult: AgentStatsResponse = try await withCheckedThrowingContinuation { continuation in
                var cancellable: AnyCancellable?
                cancellable = convex.subscribe(
                    to: "functions/statistics:getAgentStats",
                    with: ["orgId": orgId],
                    yielding: AgentStatsResponse.self
                )
                .first()
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                    },
                    receiveValue: { value in
                        continuation.resume(returning: value)
                    }
                )
            }
            agentStats = agentStatsResult
        } catch {
            print("[Dashboard] Error loading agent stats: \(error)")
            agentStats = nil
        }

        isLoading = false
    }

    // MARK: - Helpers

    private func formatTrendDate(_ dateStr: String) -> String {
        // Input: "2026-04-01" → "01 avr"
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        let months = ["jan", "fév", "mar", "avr", "mai", "jun",
                      "jul", "aoû", "sep", "oct", "nov", "déc"]
        let monthIdx = (Int(parts[1]) ?? 1) - 1
        let month = months[min(monthIdx, 11)]
        return "\(parts[2]) \(month)"
    }

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Stat Card Component

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    var growth: Int? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer()

                if let growth {
                    HStack(spacing: 2) {
                        Image(systemName: growth >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.caption2)
                        Text("\(abs(growth))%")
                            .font(.caption.monospacedDigit())
                    }
                    .foregroundStyle(growth >= 0 ? .green : .red)
                }
            }

            Text(value)
                .font(.title.monospacedDigit().bold())

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.caption)
                    .frame(width: 20)
                Text(title)
                    .font(.caption)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .opacity(isHovered ? 1 : 0)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(isHovered ? Color(.selectedControlColor) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}

#Preview {
    DashboardView()
        .environment(AppState())
        .frame(width: 1000, height: 800)
}
