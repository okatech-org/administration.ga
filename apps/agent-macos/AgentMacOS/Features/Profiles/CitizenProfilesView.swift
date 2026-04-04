//
//  CitizenProfilesView.swift
//  AgentMacOS
//
//  Admin view of all registered citizens — stats, searchable card grid,
//  server-side Convex pagination (50 per page).
//

import SwiftUI
import ConvexMobile
import Combine

// MARK: - Paginated response

private struct PaginatedCitizenProfiles: Codable {
    let page: [CitizenProfile]
    let isDone: Bool
    let continueCursor: String?
}

struct CitizenProfilesView: View {
    @Environment(AppState.self) private var appState

    @State private var profiles: [CitizenProfile] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var searchTask: Task<Void, Never>?

    // Pagination state
    @State private var currentCursor: String? = nil
    @State private var isDone = false
    @State private var currentPage = 0
    @State private var cursorHistory: [String?] = [nil] // cursor for each page (index 0 = first page)

    private let pageSize = 10

    private let columns = [
        GridItem(.adaptive(minimum: 280, maximum: 350), spacing: 16)
    ]

    // Stats (from current loaded data)
    private var registeredCount: Int {
        profiles.filter { $0.matricule != nil || $0.consularCard != nil }.count
    }
    private var passportUrgentCount: Int {
        profiles.filter { $0.isPassportUrgent }.count
    }
    private var totalRequests: Int {
        profiles.reduce(0) { $0 + ($1.requestCount ?? 0) }
    }
    private var totalChildren: Int {
        profiles.reduce(0) { $0 + ($1.childCount ?? 0) }
    }

    // MARK: - Body

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(
                        title: "Profils Citoyens",
                        subtitle: "\(profiles.count) citoyen\(profiles.count == 1 ? "" : "s") — page \(currentPage + 1)"
                    )

                    // Stats
                    statsRow

                    // Search
                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher par nom, email, passeport...")

                    // Content
                    if isLoading {
                        LoadingView(message: "Chargement des profils...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadPage(cursor: cursorHistory[currentPage]) }
                    } else if profiles.isEmpty {
                        EmptyStateView(
                            icon: "person.3",
                            title: "Aucun profil",
                            subtitle: searchText.isEmpty
                                ? "Aucun citoyen enregistré pour cette organisation."
                                : "Aucun résultat pour \"\(searchText)\""
                        )
                    } else {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(profiles) { profile in
                                citizenCard(profile)
                            }
                        }
                    }

                    // Pagination controls
                    if !profiles.isEmpty || currentPage > 0 {
                        paginationBar
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.windowBackgroundColor))
            .task { await loadPage(cursor: nil) }
            .onChange(of: appState.selectedOrgId) { _, _ in
                resetPagination()
                Task { await loadPage(cursor: nil) }
            }
            .onChange(of: searchText) { _, _ in
                searchTask?.cancel()
                searchTask = Task {
                    try? await Task.sleep(nanoseconds: 300_000_000)
                    if !Task.isCancelled {
                        resetPagination()
                        await loadPage(cursor: nil)
                    }
                }
            }
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 12) {
            profileStatCard(title: "Affichés", value: "\(profiles.count)", icon: "person.2.fill", color: .blue)
            profileStatCard(title: "Inscrits", value: "\(registeredCount)", icon: "checkmark.seal.fill", color: .green)
            profileStatCard(title: "Passeports urgents", value: "\(passportUrgentCount)", icon: "exclamationmark.triangle.fill", color: .red)
            profileStatCard(title: "Demandes", value: "\(totalRequests)", icon: "doc.text.fill", color: .purple)
            profileStatCard(title: "Enfants", value: "\(totalChildren)", icon: "figure.and.child.holdinghands", color: .orange)
        }
    }

    private func profileStatCard(title: String, value: String, icon: String, color: Color) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
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

    // MARK: - Pagination Bar

    private var paginationBar: some View {
        HStack(spacing: 16) {
            Text("Page \(currentPage + 1)")
                .font(.caption)
                .foregroundStyle(.secondary)

            if isDone {
                Text("(dernière page)")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }

            Spacer()

            HStack(spacing: 8) {
                Button {
                    resetPagination()
                    Task { await loadPage(cursor: nil) }
                } label: {
                    Image(systemName: "chevron.backward.2")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(currentPage == 0)

                Button {
                    goToPreviousPage()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.caption)
                        Text("Précédent")
                            .font(.caption)
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(currentPage == 0)

                Button {
                    goToNextPage()
                } label: {
                    HStack(spacing: 4) {
                        Text("Suivant")
                            .font(.caption)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(isDone)
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 8)
    }

    // MARK: - Pagination Logic

    private func resetPagination() {
        currentPage = 0
        currentCursor = nil
        isDone = false
        cursorHistory = [nil]
    }

    private func goToNextPage() {
        guard !isDone, let nextCursor = currentCursor else { return }
        currentPage += 1
        // Store cursor for this page if not already stored
        if currentPage >= cursorHistory.count {
            cursorHistory.append(nextCursor)
        }
        Task { await loadPage(cursor: nextCursor) }
    }

    private func goToPreviousPage() {
        guard currentPage > 0 else { return }
        currentPage -= 1
        let cursor = cursorHistory[currentPage]
        Task { await loadPage(cursor: cursor) }
    }

    // MARK: - Citizen Card

    private func citizenCard(_ profile: CitizenProfile) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                citizenAvatar(profile)

                VStack(alignment: .leading, spacing: 3) {
                    Text(profile.displayName)
                        .font(.body.bold())
                        .lineLimit(1)

                    if let email = profile.email {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()
            }
            .padding(14)

            Divider().padding(.horizontal, 14)

            HStack(spacing: 6) {
                if profile.matricule != nil || profile.consularCard != nil {
                    miniTag("Inscrit", color: .green, icon: "checkmark.seal.fill")
                }

                if let passport = profile.passportInfo?.number, !passport.isEmpty {
                    if profile.isPassportUrgent {
                        miniTag("Passeport urgent", color: .red, icon: "exclamationmark.triangle.fill")
                    } else {
                        miniTag(passport, color: .blue, icon: "passport")
                    }
                }

                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)

            if let expiry = profile.passportExpiry {
                HStack(spacing: 6) {
                    Image(systemName: "passport")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("Expire: \(formatDate(expiry))")
                        .font(.caption)
                        .foregroundStyle(profile.isPassportUrgent ? .red : .secondary)
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 6)
            }

            Divider().padding(.horizontal, 14)

            HStack(spacing: 16) {
                statItem(icon: "doc.text", value: "\(profile.requestCount ?? 0)", label: "demandes")
                statItem(icon: "figure.and.child.holdinghands", value: "\(profile.childCount ?? 0)", label: "enfants")

                Spacer()

                if let createdAt = profile._creationTime {
                    Text(formatDate(createdAt))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(14)
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.separatorColor), lineWidth: 0.5)
        )
    }

    // MARK: - Helpers

    private func citizenAvatar(_ profile: CitizenProfile) -> some View {
        Group {
            if let photoUrl = profile.photoUrl ?? profile.avatarUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    avatarFallback(profile)
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())
            } else {
                avatarFallback(profile)
            }
        }
    }

    private func avatarFallback(_ profile: CitizenProfile) -> some View {
        let first = profile.identity?.firstName?.prefix(1) ?? ""
        let last = profile.identity?.lastName?.prefix(1) ?? ""
        let initials = "\(first)\(last)".uppercased()

        return Circle()
            .fill(Color.blue.opacity(0.15))
            .frame(width: 44, height: 44)
            .overlay(
                Text(initials.isEmpty ? "?" : initials)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.blue)
            )
    }

    private func miniTag(_ text: String, color: Color, icon: String) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 9))
            Text(text)
                .font(.system(size: 10, weight: .medium))
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(color.opacity(0.12))
        .foregroundStyle(color)
        .clipShape(Capsule())
    }

    private func statItem(icon: String, value: String, label: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.bold())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    // MARK: - Data

    private func loadPage(cursor: String?) async {
        guard let orgId = appState.selectedOrgId else { return }

        isLoading = true
        errorMessage = nil

        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "paginationOpts": [
                    "numItems": Double(pageSize),
                    "cursor": cursor as Any? ?? NSNull()
                ] as [String: Any],
            ]
            if !searchText.isEmpty {
                args["searchTerm"] = searchText
            }

            let result = try await convexQuery(
                "functions/profiles:listCitizenProfilesByOrg",
                with: args,
                yielding: PaginatedCitizenProfiles.self
            )
            profiles = result.page
            isDone = result.isDone
            currentCursor = result.continueCursor
        } catch {
            print("[CitizenProfiles] Error: \(error)")
            let msg = "\(error)"
            if msg.contains("INSUFFICIENT_PERMISSION") || msg.contains("permission") {
                errorMessage = "Vous n'avez pas la permission d'accéder aux profils citoyens."
            } else {
                errorMessage = "Erreur: \(error.localizedDescription)"
            }
        }

        isLoading = false
    }
}

#Preview {
    CitizenProfilesView()
        .environment(AppState())
        .frame(width: 1100, height: 700)
}
