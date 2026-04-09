//
//  PaymentsView.swift
//  AgentMacOS
//
//  Payment tracking with stats, charts, and transaction history
//

import SwiftUI
import Charts
import ConvexMobile
import Combine

struct PaymentsView: View {
    @Environment(AppState.self) private var appState
    @State private var payments: [ConvexPayment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var statusFilter: PaymentStatus? = nil

    // Computed stats
    private var totalRevenue: Double {
        Double(payments.filter { $0.status == .succeeded }.reduce(0) { $0 + $1.amount }) / 100.0
    }

    private var pendingAmount: Double {
        Double(payments.filter { $0.status == .pending || $0.status == .processing }.reduce(0) { $0 + $1.amount }) / 100.0
    }

    private var failedCount: Int {
        payments.filter { $0.status == .failed }.count
    }

    private var successRate: Int {
        let total = payments.count
        guard total > 0 else { return 0 }
        let succeeded = payments.filter { $0.status == .succeeded }.count
        return Int(Double(succeeded) / Double(total) * 100)
    }

    private var filteredPayments: [ConvexPayment] {
        var result = payments
        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.citizenName.lowercased().contains(query) ||
                ($0.description?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(title: "Paiements", subtitle: "Suivi des transactions et revenus")

                    // Stats cards
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 4), spacing: 16) {
                        StatCard(
                            title: "Revenus totaux",
                            value: String(format: "%.2f €", totalRevenue),
                            icon: "eurosign.circle.fill",
                            color: .green
                        )
                        StatCard(
                            title: "En attente",
                            value: String(format: "%.2f €", pendingAmount),
                            icon: "clock.fill",
                            color: .yellow
                        )
                        StatCard(
                            title: "Échecs",
                            value: "\(failedCount)",
                            icon: "xmark.circle.fill",
                            color: .red
                        )
                        StatCard(
                            title: "Taux de succès",
                            value: "\(successRate)%",
                            icon: "checkmark.circle.fill",
                            color: .blue
                        )
                    }

                    // Revenue chart
                    if !payments.isEmpty {
                        revenueChart
                    }

                    // Filters
                    HStack(spacing: 12) {
                        SearchFilterBar(searchText: $searchText, placeholder: "Rechercher un paiement...")

                        Picker("Statut", selection: $statusFilter) {
                            Text("Tous").tag(nil as PaymentStatus?)
                            ForEach(PaymentStatus.allCases, id: \.self) { status in
                                Text(status.label).tag(status as PaymentStatus?)
                            }
                        }
                        .frame(width: 160)
                    }

                    if isLoading {
                        LoadingView(message: "Chargement des paiements...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadPayments() }
                    } else if filteredPayments.isEmpty {
                        EmptyStateView(
                            icon: "creditcard",
                            title: "Aucun paiement",
                            subtitle: "Les transactions apparaîtront ici."
                        )
                    } else {
                        paymentsList
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadPayments() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadPayments() }
            }
        }
    }

    // MARK: - Revenue Chart

    private var revenueChart: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tendance des revenus")
                .font(.headline)

            let dailyRevenue = computeDailyRevenue()

            Chart(dailyRevenue, id: \.date) { point in
                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Montant", point.amount)
                )
                .foregroundStyle(.green.opacity(0.3))

                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Montant", point.amount)
                )
                .foregroundStyle(.green)
            }
            .frame(height: 200)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let v = value.as(Double.self) {
                            Text(String(format: "%.0f€", v))
                                .font(.caption2)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private struct DailyRevenue {
        let date: Date
        let amount: Double
    }

    private func computeDailyRevenue() -> [DailyRevenue] {
        let succeeded = payments.filter { $0.status == .succeeded }
        var byDay: [String: Double] = [:]
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        for p in succeeded {
            let ts = p.paidAt ?? p._creationTime
            let date = Date(timeIntervalSince1970: ts / 1000)
            let key = formatter.string(from: date)
            byDay[key, default: 0] += Double(p.amount) / 100.0
        }

        return byDay.sorted { $0.key < $1.key }.compactMap { key, amount in
            guard let date = formatter.date(from: key) else { return nil }
            return DailyRevenue(date: date, amount: amount)
        }
    }

    // MARK: - Payments List

    private var paymentsList: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text("Citoyen").font(.caption).foregroundStyle(.secondary).frame(minWidth: 180, alignment: .leading)
                Text("Description").font(.caption).foregroundStyle(.secondary).frame(minWidth: 150, alignment: .leading)
                Text("Montant").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .trailing)
                Text("Statut").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .center)
                Text("Date").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            ForEach(filteredPayments) { payment in
                HStack(spacing: 0) {
                    Text(payment.citizenName)
                        .font(.body)
                        .lineLimit(1)
                        .frame(minWidth: 180, alignment: .leading)

                    Text(payment.description ?? "—")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .frame(minWidth: 150, alignment: .leading)

                    Text(payment.amountFormatted)
                        .font(.body.monospacedDigit())
                        .fontWeight(.medium)
                        .frame(width: 100, alignment: .trailing)

                    StatusBadge(
                        label: payment.status.label,
                        color: paymentStatusColor(payment.status)
                    )
                    .frame(width: 100, alignment: .center)

                    Text(formatDate(payment.paidAt ?? payment._creationTime))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 100, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)

                if payment.id != filteredPayments.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Data

    private func loadPayments() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            payments = try await convexQuery(
                "functions/payments:listByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexPayment].self
            )
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }

        isLoading = false
    }

    private func paymentStatusColor(_ status: PaymentStatus) -> Color {
        switch status {
        case .succeeded: .green
        case .pending: .yellow
        case .processing: .blue
        case .failed: .red
        case .refunded: .orange
        case .cancelled: .gray
        }
    }
}
