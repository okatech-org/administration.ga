//
//  ProfilesView.swift
//  AgentMacOS
//
//  User diplomatic profile — identity, position, credentials
//

import SwiftUI
import ConvexMobile
import Combine

struct ProfilesView: View {
    @Environment(AppState.self) private var appState
    @State private var user: ConvexUser?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                PageHeader(title: "iProfil", subtitle: "Votre profil diplomatique")

                if isLoading {
                    LoadingView(message: "Chargement du profil...")
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadProfile() }
                } else if let user {
                    profileContent(user)
                } else {
                    EmptyStateView(
                        icon: "person.crop.rectangle",
                        title: "Profil non trouvé",
                        subtitle: "Impossible de charger votre profil."
                    )
                }

                Spacer(minLength: 24)
            }
            .padding(24)
        }
        .background(Color(.windowBackgroundColor))
        .task { await loadProfile() }
    }

    // MARK: - Profile Content

    private func profileContent(_ user: ConvexUser) -> some View {
        VStack(spacing: 20) {
            // Header card
            HStack(spacing: 16) {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 64, height: 64)
                    .overlay {
                        Text(String(user.displayName.prefix(1)).uppercased())
                            .font(.title.bold())
                            .foregroundStyle(.blue)
                    }

                VStack(alignment: .leading, spacing: 4) {
                    Text(user.displayName)
                        .font(.title2.bold())
                    if let email = user.email {
                        Text(email)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    HStack(spacing: 8) {
                        if user.isSuperadmin == true {
                            StatusBadge(label: "Super Admin", color: .purple)
                        }
                        StatusBadge(
                            label: user.isActive == true ? "Actif" : "Inactif",
                            color: user.isActive == true ? .green : .gray
                        )
                    }
                }

                Spacer()
            }
            .padding(20)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Info sections
            HStack(alignment: .top, spacing: 16) {
                // Personal info
                VStack(alignment: .leading, spacing: 12) {
                    Text("Informations personnelles")
                        .font(.headline)
                    Divider()
                    infoRow("Nom complet", user.displayName)
                    infoRow("Email", user.email ?? "—")
                    infoRow("Statut", user.isActive == true ? "Actif" : "Inactif")
                }
                .padding(16)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Organization info
                VStack(alignment: .leading, spacing: 12) {
                    Text("Organisations")
                        .font(.headline)
                    Divider()
                    if appState.availableOrgs.isEmpty {
                        Text("Aucune organisation")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(appState.availableOrgs) { org in
                            HStack(spacing: 8) {
                                Image(systemName: "building.2")
                                    .foregroundStyle(.blue)
                                VStack(alignment: .leading) {
                                    Text(org.name)
                                        .font(.subheadline)
                                    if let country = org.country {
                                        Text(country)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if org._id == appState.selectedOrgId {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.green)
                                }
                            }
                        }
                    }
                }
                .padding(16)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 130, alignment: .leading)
            Text(value)
                .font(.subheadline)
            Spacer()
        }
    }

    // MARK: - Data

    private func loadProfile() async {
        isLoading = true
        errorMessage = nil

        do {
            user = try await convexQuery(
                "functions/users:getMe",
                yielding: ConvexUser?.self
            )
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }

        isLoading = false
    }
}
