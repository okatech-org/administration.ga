//
//  ConsularRegistryView.swift
//  AgentMacOS
//
//  Consular registry — lists all registrations for the current org
//  with search, status filtering, and per-row print action.
//

import SwiftUI
import ConvexMobile

// MARK: - Status Helpers

private func statusColor(_ name: String) -> Color {
    switch name.lowercased() {
    case "active":   .green
    case "expired":  .red
    case "pending":  .orange
    case "revoked":  .gray
    default:         .secondary
    }
}

private func statusLabel(_ name: String) -> String {
    switch name.lowercased() {
    case "active":   "Actif"
    case "expired":  "Expiré"
    case "pending":  "En attente"
    case "revoked":  "Révoqué"
    default:         name.capitalized
    }
}

// MARK: - View

struct ConsularRegistryView: View {
    @Environment(AppState.self) private var appState

    @State private var registrations: [PrintableRegistration] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var selectedStatus: String? = nil
    @State private var isDone = false
    @State private var continueCursor: String?

    private let statusFilters = ["active", "expired", "pending", "revoked"]

    var body: some View {
        OrgGatedView {
            content
        }
    }

    // MARK: - Content

    private var content: some View {
        ScrollView {
            VStack(spacing: 24) {
                PageHeader(
                    title: "Registre Consulaire",
                    subtitle: "Immatriculations consulaires de l'organisation"
                )

                // Search + filter pills
                VStack(spacing: 12) {
                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher par matricule ou nom...")

                    statusPills
                }

                // Data
                if isLoading && registrations.isEmpty {
                    LoadingView(message: "Chargement du registre...")
                } else if let errorMessage {
                    ErrorView(message: errorMessage) {
                        await loadRegistrations()
                    }
                } else if filteredRegistrations.isEmpty {
                    EmptyStateView(
                        icon: "list.clipboard",
                        title: "Aucune immatriculation",
                        subtitle: searchText.isEmpty && selectedStatus == nil
                            ? "Le registre consulaire est vide pour cette organisation."
                            : "Aucun résultat ne correspond à vos critères de recherche."
                    )
                } else {
                    registrationTable
                }

                Spacer(minLength: 24)
            }
            .padding(24)
        }
        .background(Color(.windowBackgroundColor))
        .frame(minWidth: 600, minHeight: 400)
        .task(id: appState.selectedOrgId) {
            await loadRegistrations()
        }
    }

    // MARK: - Status Filter Pills

    private var statusPills: some View {
        HStack(spacing: 8) {
            filterPill(label: "Tous", isSelected: selectedStatus == nil) {
                selectedStatus = nil
            }

            ForEach(statusFilters, id: \.self) { status in
                filterPill(
                    label: statusLabel(status),
                    color: statusColor(status),
                    isSelected: selectedStatus == status
                ) {
                    selectedStatus = selectedStatus == status ? nil : status
                }
            }

            Spacer()

            Text("\(filteredRegistrations.count) résultat\(filteredRegistrations.count == 1 ? "" : "s")")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func filterPill(label: String, color: Color = .accentColor, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? color.opacity(0.15) : Color(.controlBackgroundColor))
                .foregroundStyle(isSelected ? color : .secondary)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(isSelected ? color.opacity(0.4) : Color.clear, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Table

    private var registrationTable: some View {
        VStack(spacing: 0) {
            // Header row
            HStack(spacing: 0) {
                tableHeaderCell("Matricule", width: 140)
                tableHeaderCell("Nom", flex: true)
                tableHeaderCell("Statut", width: 120)
                tableHeaderCell("Date émission", width: 130)
                tableHeaderCell("Expiration", width: 130)
                tableHeaderCell("", width: 60) // Actions
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            // Data rows
            ForEach(filteredRegistrations) { registration in
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        // Matricule
                        Text(registration.cardNumber ?? "---")
                            .font(.system(.body, design: .monospaced))
                            .fontWeight(.medium)
                            .frame(width: 140, alignment: .leading)

                        // Nom
                        Text(registration.profile?.displayName ?? "Inconnu")
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        // Statut
                        StatusBadge(
                            label: statusLabel(registration.status),
                            color: statusColor(registration.status)
                        )
                        .frame(width: 120, alignment: .leading)

                        // Date émission
                        Text(registration.cardIssuedAt.map { formatDate($0) } ?? "---")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(width: 130, alignment: .leading)

                        // Expiration
                        expirationCell(registration)
                            .frame(width: 130, alignment: .leading)

                        // Print action
                        Button {
                            // TODO: Integrate with PrintQueueManager.shared to print consular card
                            print("[ConsularRegistry] Print requested for \(registration._id)")
                        } label: {
                            Image(systemName: "printer")
                                .font(.body)
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .help("Imprimer la carte consulaire")
                        .frame(width: 60, alignment: .center)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)

                    Divider()
                        .padding(.horizontal, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func expirationCell(_ registration: PrintableRegistration) -> some View {
        Group {
            if let expiresAt = registration.cardExpiresAt {
                let isExpired = Date(timeIntervalSince1970: expiresAt / 1000) < Date()
                Text(formatDate(expiresAt))
                    .font(.caption)
                    .foregroundStyle(isExpired ? .red : .secondary)
            } else {
                Text("---")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func tableHeaderCell(_ title: String, width: CGFloat? = nil, flex: Bool = false) -> some View {
        if flex {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .frame(width: width ?? 100, alignment: .leading)
        }
    }

    // MARK: - Filtering

    private var filteredRegistrations: [PrintableRegistration] {
        var results = registrations

        // Status filter
        if let selectedStatus {
            results = results.filter { $0.status.lowercased() == selectedStatus }
        }

        // Search filter
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            results = results.filter { reg in
                (reg.cardNumber?.lowercased().contains(query) ?? false) ||
                (reg.profile?.displayName.lowercased().contains(query) ?? false)
            }
        }

        return results
    }

    // MARK: - Data Loading

    private func loadRegistrations() async {
        guard let orgId = appState.selectedOrgId else { return }

        isLoading = true
        errorMessage = nil

        do {
            let result = try await convexQuery(
                "functions/consularRegistrations:listByOrg",
                with: [
                    "orgId": orgId,
                    "paginationOpts": ["numItems": 50, "cursor": NSNull()] as [String: Any]
                ],
                yielding: ConsularRegistrationList.self
            )
            registrations = result.page
            isDone = result.isDone
            continueCursor = result.continueCursor
        } catch {
            print("[ConsularRegistry] Error loading registrations: \(error)")
            errorMessage = "Impossible de charger le registre: \(error.localizedDescription)"
        }

        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    ConsularRegistryView()
        .environment(AppState())
        .frame(width: 1000, height: 700)
}
