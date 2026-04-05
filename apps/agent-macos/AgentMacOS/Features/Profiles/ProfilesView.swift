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
    @State private var showEditSheet = false

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
        .sheet(isPresented: $showEditSheet) {
            EditProfileSheet {
                Task { await loadProfile() }
            }
        }
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

                Button {
                    showEditSheet = true
                } label: {
                    Label("Modifier", systemImage: "pencil")
                }
                .buttonStyle(.bordered)
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

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState

    @State private var officePhone = ""
    @State private var officeExtension = ""
    @State private var officialEmail = ""
    @State private var bio = ""
    @State private var membershipId: String?
    @State private var isSaving = false
    @State private var errorMessage: String?

    let onSaved: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Modifier le profil diplomatique")
                    .font(.title3.weight(.bold))
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            // Form
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    formSection(title: "Contact professionnel", icon: "phone.fill") {
                        formField("Téléphone bureau", text: $officePhone, placeholder: "+241 00 00 00 00")
                        formField("Extension", text: $officeExtension, placeholder: "123")
                        formField("Email officiel", text: $officialEmail, placeholder: "nom@consulat.ga")
                    }

                    formSection(title: "Biographie", icon: "text.alignleft") {
                        TextEditor(text: $bio)
                            .font(.body)
                            .frame(minHeight: 100)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color(.separatorColor), lineWidth: 1)
                            )
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                .padding(24)
            }

            Divider()

            // Actions
            HStack {
                Button("Annuler") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Spacer()
                Button {
                    Task { await save() }
                } label: {
                    if isSaving {
                        ProgressView().controlSize(.small)
                    } else {
                        Label("Enregistrer", systemImage: "checkmark.circle.fill")
                    }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(isSaving)
            }
            .padding()
        }
        .frame(minWidth: 500, minHeight: 450)
        .task { await loadDiplomaticProfile() }
    }

    private func formSection(title: String, icon: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon)
                .font(.headline)
            content()
        }
    }

    private func formField(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField(placeholder, text: text)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func loadDiplomaticProfile() async {
        // Load membership ID first
        do {
            let memberships = try await convexQuery(
                "functions/memberships:listMyMemberships",
                yielding: [ConvexMembership].self
            )
            if let selectedOrgId = appState.selectedOrgId {
                membershipId = memberships.first(where: { $0.orgId == selectedOrgId })?._id
            } else {
                membershipId = memberships.first?._id
            }
        } catch {
            print("[iProfil] Could not load memberships: \(error)")
        }

        // Load diplomatic profile
        do {
            struct DipProfile: Codable {
                let officePhone: String?
                let officeExtension: String?
                let officialEmail: String?
                let bio: String?
            }
            if let profile = try await convexQuery(
                "functions/diplomaticProfile:getMyDiplomaticProfile",
                yielding: DipProfile?.self
            ) {
                officePhone = profile.officePhone ?? ""
                officeExtension = profile.officeExtension ?? ""
                officialEmail = profile.officialEmail ?? ""
                bio = profile.bio ?? ""
            }
        } catch {
            print("[iProfil] No diplomatic profile found: \(error)")
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var diplomaticProfile: [String: Any] = [:]
            if !officePhone.isEmpty { diplomaticProfile["officePhone"] = officePhone }
            if !officeExtension.isEmpty { diplomaticProfile["officeExtension"] = officeExtension }
            if !officialEmail.isEmpty { diplomaticProfile["officialEmail"] = officialEmail }
            if !bio.isEmpty { diplomaticProfile["bio"] = bio }

            guard let mId = membershipId else {
                errorMessage = "ID d'adhésion non trouvé"
                isSaving = false
                return
            }
            try await convexMutation("functions/diplomaticProfile:updateMyDiplomaticProfile", with: [
                "membershipId": mId,
                "diplomaticProfile": diplomaticProfile as [String: Any]
            ])
            onSaved()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}
