//
//  ConsularRegistryView.swift
//  AgentMacOS
//
//  Consular registry — stats cards, status filters, rich table with
//  avatars, type, registration date, contextual actions.
//

import SwiftUI
import ConvexMobile

// MARK: - Status Helpers

private func regStatusColor(_ name: String) -> Color {
    switch name.lowercased() {
    case "active":    .green
    case "expired":   .red
    case "requested": .orange
    default:          .secondary
    }
}

private func regStatusLabel(_ name: String) -> String {
    switch name.lowercased() {
    case "active":    "Actif"
    case "expired":   "Expiré"
    case "requested": "Demandé"
    default:          name.capitalized
    }
}

private func regStatusIcon(_ name: String) -> String {
    switch name.lowercased() {
    case "active":    "checkmark.seal.fill"
    case "expired":   "xmark.circle.fill"
    case "requested": "clock.fill"
    default:          "questionmark.circle"
    }
}

private func regTypeLabel(_ name: String?) -> String {
    switch name?.lowercased() {
    case "inscription": "Inscription"
    case "renewal":     "Renouvellement"
    case "modification":"Modification"
    default:            name?.capitalized ?? "—"
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

    private let statusFilters = ["requested", "active", "expired"]

    // Stats
    private var totalCount: Int { registrations.count }
    private var requestedCount: Int { registrations.filter { $0.status.lowercased() == "requested" }.count }
    private var activeCount: Int { registrations.filter { $0.status.lowercased() == "active" }.count }
    private var expiredCount: Int { registrations.filter { $0.status.lowercased() == "expired" }.count }

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

                // Stats cards
                statsRow

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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
        .task(id: appState.selectedOrgId) {
            await loadRegistrations()
        }
    }

    // MARK: - Stats Cards

    private var statsRow: some View {
        HStack(spacing: 12) {
            registryStatCard(title: "Total", count: totalCount, icon: "person.2.fill", color: .gray)
            registryStatCard(title: "Demandés", count: requestedCount, icon: "clock.fill", color: .orange)
            registryStatCard(title: "Actifs", count: activeCount, icon: "checkmark.circle.fill", color: .green)
            registryStatCard(title: "Expirés", count: expiredCount, icon: "creditcard.fill", color: .blue)
        }
    }

    private func registryStatCard(title: String, count: Int, icon: String, color: Color) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("\(count)")
                    .font(.title2.bold())
            }
            Spacer()
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Status Filter Pills

    private var statusPills: some View {
        HStack(spacing: 8) {
            filterPill(label: "Tous", count: totalCount, isSelected: selectedStatus == nil) {
                selectedStatus = nil
            }

            ForEach(statusFilters, id: \.self) { status in
                let count = registrations.filter { $0.status.lowercased() == status }.count
                filterPill(
                    label: regStatusLabel(status),
                    count: count,
                    color: regStatusColor(status),
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

    private func filterPill(label: String, count: Int, color: Color = .accentColor, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)

                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(isSelected ? color.opacity(0.3) : Color(.separatorColor))
                        .clipShape(Capsule())
                }
            }
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
                tableHeaderCell("Citoyen", flex: true)
                tableHeaderCell("Type", width: 120)
                tableHeaderCell("Statut", width: 140)
                tableHeaderCell("N° Carte", width: 130)
                tableHeaderCell("Date inscription", width: 130)
                tableHeaderCell("", width: 80) // Actions
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.controlBackgroundColor).opacity(0.5))

            Divider()

            // Data rows
            ForEach(filteredRegistrations) { registration in
                VStack(spacing: 0) {
                    registrationRow(registration)
                    if registration.id != filteredRegistrations.last?.id {
                        Divider().padding(.leading, 72)
                    }
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func registrationRow(_ reg: PrintableRegistration) -> some View {
        HStack(spacing: 0) {
            // Citizen: Avatar + Name + Email
            HStack(spacing: 12) {
                citizenAvatar(reg)

                VStack(alignment: .leading, spacing: 2) {
                    Text(reg.profile?.displayName ?? "Inconnu")
                        .font(.body)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    if let email = reg.user?.email {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Type
            Text(regTypeLabel(reg.type))
                .font(.body)
                .foregroundStyle(.secondary)
                .frame(width: 120, alignment: .leading)

            // Status badge
            statusBadge(reg)
                .frame(width: 140, alignment: .leading)

            // Card number
            Group {
                if let cardNumber = reg.cardNumber {
                    Text(cardNumber)
                        .font(.system(.caption, design: .monospaced))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color(.separatorColor).opacity(0.5))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    Text("—")
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 130, alignment: .leading)

            // Registration date
            Text(reg.registeredAt.map { formatDate($0) } ?? "—")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 130, alignment: .leading)

            // Actions
            actionButtons(reg)
                .frame(width: 80, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Citizen Avatar

    private func citizenAvatar(_ reg: PrintableRegistration) -> some View {
        Group {
            if let photoUrl = reg.user?.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    avatarFallback(reg)
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            } else {
                avatarFallback(reg)
            }
        }
    }

    private func avatarFallback(_ reg: PrintableRegistration) -> some View {
        let initials = avatarInitials(reg)
        return Circle()
            .fill(Color.blue.opacity(0.15))
            .frame(width: 36, height: 36)
            .overlay(
                Text(initials)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.blue)
            )
    }

    private func avatarInitials(_ reg: PrintableRegistration) -> String {
        let first = reg.profile?.identity?.firstName?.prefix(1) ?? ""
        let last = reg.profile?.identity?.lastName?.prefix(1) ?? ""
        let result = "\(first)\(last)"
        return result.isEmpty ? "?" : result.uppercased()
    }

    // MARK: - Status Badge

    private func statusBadge(_ reg: PrintableRegistration) -> some View {
        let status = reg.status.lowercased()
        let hasCard = reg.cardNumber != nil

        return HStack(spacing: 4) {
            Image(systemName: regStatusIcon(status))
                .font(.caption2)

            if status == "active" && hasCard {
                Text("Carte générée")
                    .font(.caption)
                    .fontWeight(.medium)
            } else if status == "active" && !hasCard {
                Text("Actif (sans carte)")
                    .font(.caption)
                    .fontWeight(.medium)
            } else {
                Text(regStatusLabel(status))
                    .font(.caption)
                    .fontWeight(.medium)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusBadgeBg(status, hasCard: hasCard))
        .foregroundStyle(statusBadgeFg(status, hasCard: hasCard))
        .clipShape(Capsule())
    }

    private func statusBadgeBg(_ status: String, hasCard: Bool) -> Color {
        switch status {
        case "active" where hasCard: .green.opacity(0.15)
        case "active":               .orange.opacity(0.15)
        case "expired":              .red.opacity(0.15)
        case "requested":            .gray.opacity(0.15)
        default:                     .gray.opacity(0.15)
        }
    }

    private func statusBadgeFg(_ status: String, hasCard: Bool) -> Color {
        switch status {
        case "active" where hasCard: .green
        case "active":               .orange
        case "expired":              .red
        case "requested":            .secondary
        default:                     .secondary
        }
    }

    // MARK: - Action Buttons

    private func actionButtons(_ reg: PrintableRegistration) -> some View {
        HStack(spacing: 4) {
            // Generate card (only if active + no card)
            if reg.status.lowercased() == "active" && reg.cardNumber == nil {
                Button {
                    // TODO: generate card
                } label: {
                    Image(systemName: "creditcard")
                        .font(.caption)
                }
                .buttonStyle(.plain)
                .help("Générer la carte")
            }

            // Print (only if has card + not printed)
            if reg.cardNumber != nil && reg.printedAt == nil {
                Button {
                    print("[ConsularRegistry] Print requested for \(reg._id)")
                } label: {
                    Image(systemName: "printer")
                        .font(.caption)
                }
                .buttonStyle(.plain)
                .help("Imprimer la carte")
            }

            // Printed indicator
            if reg.printedAt != nil {
                HStack(spacing: 2) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption2)
                    Text("Imprimé")
                        .font(.system(size: 10))
                }
                .foregroundStyle(.green)
            }
        }
    }

    // MARK: - Table Header

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

        if let selectedStatus {
            results = results.filter { $0.status.lowercased() == selectedStatus }
        }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            results = results.filter { reg in
                (reg.cardNumber?.lowercased().contains(query) ?? false) ||
                (reg.profile?.displayName.lowercased().contains(query) ?? false) ||
                (reg.user?.email?.lowercased().contains(query) ?? false)
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
                    "paginationOpts": ["numItems": 50.0, "cursor": NSNull()] as [String: Any]
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
        .frame(width: 1100, height: 700)
}
