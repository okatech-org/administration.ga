//
//  AffairesDiplomatiquesView.swift
//  AgentMacOS
//
//  Diplomatic affairs — 4 tabs: Targets, Letters, Strategic Plans, Reports
//

import SwiftUI
import ConvexMobile
import Combine

struct AffairesDiplomatiquesView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedTab: DipTab = .targets

    enum DipTab: String, CaseIterable {
        case targets = "Cibles"
        case letters = "Lettres"
        case plans = "Plans"
        case reports = "Rapports"
    }

    var body: some View {
        OrgGatedView {
            VStack(spacing: 0) {
                // Header + Tabs
                VStack(spacing: 12) {
                    PageHeader(title: "Affaires Diplomatiques", subtitle: "Gestion stratégique et relations diplomatiques")

                    Picker("", selection: $selectedTab) {
                        ForEach(DipTab.allCases, id: \.self) { tab in
                            Text(tab.rawValue).tag(tab)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .padding(24)
                .padding(.bottom, 0)

                Divider()

                // Tab content
                switch selectedTab {
                case .targets: TargetsTab()
                case .letters: LettersTab()
                case .plans: PlansTab()
                case .reports: ReportsTab()
                }
            }
            .background(Color(.windowBackgroundColor))
        }
    }
}

// MARK: - Targets Tab

struct TargetsTab: View {
    @Environment(AppState.self) private var appState
    @State private var targets: [ConvexDiplomaticTarget] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var statusFilter: DiplomaticTargetStatus? = nil
    @State private var selectedTarget: ConvexDiplomaticTarget? = nil

    private var filteredTargets: [ConvexDiplomaticTarget] {
        var result = targets
        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(query) ||
                ($0.country?.lowercased().contains(query) ?? false) ||
                ($0.contactName?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Filters
                HStack(spacing: 12) {
                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher une cible...")

                    Picker("Statut", selection: $statusFilter) {
                        Text("Tous statuts").tag(nil as DiplomaticTargetStatus?)
                        ForEach(DiplomaticTargetStatus.allCases, id: \.self) { status in
                            Text(status.label).tag(status as DiplomaticTargetStatus?)
                        }
                    }
                    .frame(width: 160)
                }

                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadTargets() }
                } else if filteredTargets.isEmpty {
                    EmptyStateView(icon: "scope", title: "Aucune cible diplomatique")
                } else {
                    targetsList
                }
            }
            .padding(24)
        }
        .task { await loadTargets() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadTargets() } }
        .sheet(item: $selectedTarget) { target in
            TargetDetailSheet(target: target)
        }
    }

    private var targetsList: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text("Nom").font(.caption).foregroundStyle(.secondary).frame(minWidth: 180, alignment: .leading)
                Text("Type").font(.caption).foregroundStyle(.secondary).frame(width: 140, alignment: .leading)
                Text("Pays").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .leading)
                Text("Priorité").font(.caption).foregroundStyle(.secondary).frame(width: 80, alignment: .center)
                Text("Statut").font(.caption).foregroundStyle(.secondary).frame(width: 120, alignment: .center)
                Text("Contact").font(.caption).foregroundStyle(.secondary).frame(minWidth: 120, alignment: .leading)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            ForEach(filteredTargets) { target in
                Button { selectedTarget = target } label: {
                    HStack(spacing: 0) {
                        Text(target.name)
                            .lineLimit(1)
                            .frame(minWidth: 180, alignment: .leading)

                        Text(target.type.label)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 140, alignment: .leading)

                        Text(target.country ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 100, alignment: .leading)

                        priorityBadge(target.priority ?? "medium")
                            .frame(width: 80, alignment: .center)

                        StatusBadge(label: target.status.label, color: dipStatusColor(target.status))
                            .frame(width: 120, alignment: .center)

                        Text(target.contactName ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .frame(minWidth: 120, alignment: .leading)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if target.id != filteredTargets.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func priorityBadge(_ priority: String) -> some View {
        StatusBadge(
            label: priority == "critical" ? "Critique" : priority == "high" ? "Haute" : priority == "medium" ? "Moyenne" : "Basse",
            color: priority == "critical" ? .red : priority == "high" ? .orange : priority == "medium" ? .yellow : .gray
        )
    }

    private func dipStatusColor(_ status: DiplomaticTargetStatus) -> Color {
        switch status {
        case .identified: .gray
        case .contacted: .blue
        case .inDiscussion: .yellow
        case .partnership: .green
        case .inactive: .gray
        }
    }

    private func loadTargets() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            targets = try await convexQuery(
                "functions/diplomaticAffairs:listTargets",
                with: ["orgId": orgId],
                yielding: [ConvexDiplomaticTarget].self
            )
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isLoading = false
    }
}

// MARK: - Target Detail Sheet

struct TargetDetailSheet: View {
    let target: ConvexDiplomaticTarget
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(target.name).font(.title2.bold())
                    Text(target.type.label).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            VStack(alignment: .leading, spacing: 10) {
                row("Pays", target.country ?? "—")
                row("Ville", target.city ?? "—")
                row("Secteur", target.sector ?? "—")
                row("Priorité", target.priority?.capitalized ?? "—")
                row("Contact", target.contactName ?? "—")
                row("Titre contact", target.contactTitle ?? "—")
                row("Email", target.contactEmail ?? "—")
                row("Téléphone", target.contactPhone ?? "—")
                row("Site web", target.website ?? "—")
                if let desc = target.description {
                    Divider()
                    Text("Description").font(.headline)
                    Text(desc).font(.body)
                }
                if let notes = target.notes {
                    Divider()
                    Text("Notes").font(.headline)
                    Text(notes).font(.body)
                }
            }

            Spacer()
            Button("Fermer") { dismiss() }.buttonStyle(.bordered)
        }
        .padding(24)
        .frame(width: 500, height: 600)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
            Text(value).font(.subheadline)
            Spacer()
        }
    }
}

// MARK: - Letters Tab

struct LettersTab: View {
    @Environment(AppState.self) private var appState
    @State private var letters: [ConvexDiplomaticLetter] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadLetters() }
                } else if letters.isEmpty {
                    EmptyStateView(icon: "envelope.badge", title: "Aucune lettre de contact")
                } else {
                    VStack(spacing: 0) {
                        ForEach(letters) { letter in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(letter.subject)
                                        .font(.body.bold())
                                        .lineLimit(1)
                                    HStack(spacing: 8) {
                                        if let ref = letter.reference {
                                            Text(ref).font(.caption.monospaced()).foregroundStyle(.secondary)
                                        }
                                        if let recipient = letter.recipientName {
                                            Text("→ \(recipient)").font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                }
                                Spacer()
                                if let status = letter.status {
                                    StatusBadge(label: status.capitalized, color: .blue)
                                }
                                Text(formatDate(letter.createdAt ?? letter._creationTime))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)

                            if letter.id != letters.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(24)
        }
        .task { await loadLetters() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadLetters() } }
    }

    private func loadLetters() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            letters = try await convexQuery("functions/diplomaticAffairs:listLetters", with: ["orgId": orgId], yielding: [ConvexDiplomaticLetter].self)
        } catch { errorMessage = "Erreur: \(error.localizedDescription)" }
        isLoading = false
    }
}

// MARK: - Plans Tab

struct PlansTab: View {
    @Environment(AppState.self) private var appState
    @State private var plans: [ConvexDiplomaticPlan] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadPlans() }
                } else if plans.isEmpty {
                    EmptyStateView(icon: "map", title: "Aucun plan stratégique")
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 16)], spacing: 16) {
                        ForEach(plans) { plan in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(plan.title).font(.headline).lineLimit(1)
                                    Spacer()
                                    if let status = plan.status {
                                        StatusBadge(label: status.capitalized, color: status == "active" ? .green : .gray)
                                    }
                                }
                                if let period = plan.period {
                                    Text("Période: \(period)").font(.caption).foregroundStyle(.secondary)
                                }
                                if let category = plan.category {
                                    Text(category.capitalized).font(.caption).foregroundStyle(.secondary)
                                }
                                if let summary = plan.summary {
                                    Text(summary).font(.caption).foregroundStyle(.secondary).lineLimit(3)
                                }
                            }
                            .padding(16)
                            .background(Color(.controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
            }
            .padding(24)
        }
        .task { await loadPlans() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadPlans() } }
    }

    private func loadPlans() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            plans = try await convexQuery("functions/diplomaticAffairs:listPlans", with: ["orgId": orgId], yielding: [ConvexDiplomaticPlan].self)
        } catch { errorMessage = "Erreur: \(error.localizedDescription)" }
        isLoading = false
    }
}

// MARK: - Reports Tab

struct ReportsTab: View {
    @Environment(AppState.self) private var appState
    @State private var reports: [ConvexDiplomaticReport] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadReports() }
                } else if reports.isEmpty {
                    EmptyStateView(icon: "doc.richtext", title: "Aucun rapport")
                } else {
                    VStack(spacing: 0) {
                        ForEach(reports) { report in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(report.title).font(.body.bold()).lineLimit(1)
                                    HStack(spacing: 8) {
                                        if let type = report.type {
                                            Text(type.capitalized).font(.caption).foregroundStyle(.secondary)
                                        }
                                        if let recipient = report.recipient {
                                            Text("→ \(recipient.capitalized)").font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                }
                                Spacer()
                                if let status = report.status {
                                    StatusBadge(label: status.capitalized, color: status == "approved" ? .green : status == "submitted" ? .blue : .gray)
                                }
                                Text(formatDate(report.createdAt ?? report._creationTime))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            if report.id != reports.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(24)
        }
        .task { await loadReports() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadReports() } }
    }

    private func loadReports() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            reports = try await convexQuery("functions/diplomaticAffairs:listReports", with: ["orgId": orgId], yielding: [ConvexDiplomaticReport].self)
        } catch { errorMessage = "Erreur: \(error.localizedDescription)" }
        isLoading = false
    }
}
