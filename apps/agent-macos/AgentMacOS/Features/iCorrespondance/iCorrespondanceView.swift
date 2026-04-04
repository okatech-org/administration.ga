//
//  iCorrespondanceView.swift
//  AgentMacOS
//
//  Diplomatic correspondence management — folders, items, status workflow
//

import SwiftUI
import ConvexMobile
import Combine

struct iCorrespondanceView: View {
    @Environment(AppState.self) private var appState
    @State private var items: [ConvexCorrespondance] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var selectedTab: CorrespondanceTab = .all
    @State private var typeFilter: CorrespondanceType? = nil
    @State private var statusFilter: CorrespondanceStatus? = nil
    @State private var selectedItem: ConvexCorrespondance? = nil

    enum CorrespondanceTab: String, CaseIterable {
        case all = "Tout"
        case drafts = "Brouillons"
        case sent = "Envoyés"
        case received = "Reçus"
    }

    private var filteredItems: [ConvexCorrespondance] {
        var result = items

        switch selectedTab {
        case .all: break
        case .drafts: result = result.filter { $0.status == .draft }
        case .sent: result = result.filter { $0.direction == "outgoing" || $0.status == .sent }
        case .received: result = result.filter { $0.direction == "incoming" || $0.status == .received }
        }

        if let filter = typeFilter {
            result = result.filter { $0.type == filter }
        }

        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(query) ||
                $0.reference.lowercased().contains(query) ||
                ($0.recipientName?.lowercased().contains(query) ?? false)
            }
        }

        return result.sorted { ($0.createdAt ?? $0._creationTime) > ($1.createdAt ?? $1._creationTime) }
    }

    var body: some View {
        OrgGatedView {
            HSplitView {
                // Left: List
                listPanel
                    .frame(minWidth: 500)

                // Right: Detail
                detailPanel
                    .frame(minWidth: 350)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadCorrespondance() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadCorrespondance() }
            }
        }
    }

    // MARK: - List Panel

    private var listPanel: some View {
        VStack(spacing: 0) {
            VStack(spacing: 12) {
                PageHeader(title: "iCorrespondance", subtitle: "\(items.count) courrier\(items.count > 1 ? "s" : "")")

                // Tab selector
                Picker("", selection: $selectedTab) {
                    ForEach(CorrespondanceTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)

                // Filters row
                HStack(spacing: 8) {
                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher...")

                    Picker("Type", selection: $typeFilter) {
                        Text("Tous types").tag(nil as CorrespondanceType?)
                        ForEach(CorrespondanceType.allCases, id: \.self) { type in
                            Text(type.label).tag(type as CorrespondanceType?)
                        }
                    }
                    .frame(width: 160)
                }
            }
            .padding(16)

            Divider()

            if isLoading {
                LoadingView(message: "Chargement...")
            } else if filteredItems.isEmpty {
                EmptyStateView(
                    icon: "folder",
                    title: "Aucune correspondance",
                    subtitle: "Les courriers apparaîtront ici."
                )
            } else {
                List(filteredItems, selection: Binding(
                    get: { selectedItem },
                    set: { selectedItem = $0 }
                )) { item in
                    correspondanceRow(item)
                        .tag(item)
                }
                .listStyle(.plain)
            }
        }
    }

    private func correspondanceRow(_ item: ConvexCorrespondance) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(item.reference)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                Spacer()
                Text(item.dateFormatted)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text(item.title)
                .font(.body)
                .fontWeight(.medium)
                .lineLimit(1)

            HStack(spacing: 8) {
                StatusBadge(label: item.type.label, color: .blue)
                StatusBadge(label: item.status.label, color: corrStatusColor(item.status))

                if let priority = item.priority, priority != "normal" {
                    StatusBadge(
                        label: priority == "urgent" ? "Urgent" : "Confidentiel",
                        color: priority == "urgent" ? .red : .purple
                    )
                }

                Spacer()

                if let recipient = item.recipientName {
                    Text("→ \(recipient)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Detail Panel

    private var detailPanel: some View {
        Group {
            if let item = selectedItem {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(item.reference)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                                Spacer()
                                StatusBadge(label: item.status.label, color: corrStatusColor(item.status))
                            }

                            Text(item.title)
                                .font(.title2.bold())

                            HStack(spacing: 16) {
                                StatusBadge(label: item.type.label, color: .blue)

                                if let dir = item.direction {
                                    Label(
                                        dir == "incoming" ? "Entrant" : "Sortant",
                                        systemImage: dir == "incoming" ? "arrow.down.left" : "arrow.up.right"
                                    )
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                }
                            }
                        }

                        Divider()

                        // Participants
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Participants")
                                .font(.headline)

                            if let sender = item.senderName {
                                detailRow("Expéditeur", sender + (item.senderOrg.map { " (\($0))" } ?? ""))
                            }
                            if let recipient = item.recipientName {
                                detailRow("Destinataire", recipient + (item.recipientOrg.map { " (\($0))" } ?? ""))
                            }
                        }

                        Divider()

                        // Metadata
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Détails")
                                .font(.headline)

                            detailRow("Date de création", formatDate(item.createdAt ?? item._creationTime))
                            if let sentAt = item.sentAt {
                                detailRow("Date d'envoi", formatDate(sentAt))
                            }
                            if let tags = item.tags, !tags.isEmpty {
                                detailRow("Tags", tags.joined(separator: ", "))
                            }
                        }

                        Spacer(minLength: 24)
                    }
                    .padding(24)
                }
            } else {
                EmptyStateView(
                    icon: "envelope.open",
                    title: "Sélectionnez un courrier",
                    subtitle: "Choisissez un élément pour voir les détails."
                )
            }
        }
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 120, alignment: .leading)
            Text(value)
                .font(.subheadline)
        }
    }

    // MARK: - Data

    private func loadCorrespondance() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            items = try await convexQuery(
                "functions/correspondance:listByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexCorrespondance].self
            )
        } catch {
            // Try alternative query names
            do {
                let drafts = try await convexQuery(
                    "functions/correspondanceCore:getBrouillons",
                    with: ["orgId": orgId],
                    yielding: [ConvexCorrespondance].self
                )
                let sent = try await convexQuery(
                    "functions/correspondanceCore:getEnvoyes",
                    with: ["orgId": orgId],
                    yielding: [ConvexCorrespondance].self
                )
                let received = try await convexQuery(
                    "functions/correspondanceCore:getRecus",
                    with: ["orgId": orgId],
                    yielding: [ConvexCorrespondance].self
                )
                items = drafts + sent + received
            } catch {
                errorMessage = "Erreur: \(error.localizedDescription)"
            }
        }

        isLoading = false
    }

    private func corrStatusColor(_ status: CorrespondanceStatus) -> Color {
        switch status {
        case .draft: .gray
        case .pending: .yellow
        case .approved: .green
        case .rejected: .red
        case .sent: .blue
        case .received: .teal
        case .archived: .gray
        }
    }
}
