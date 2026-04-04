//
//  TeamView.swift
//  AgentMacOS
//
//  Team management — list org members, view roles and positions
//

import SwiftUI
import ConvexMobile
import Combine

struct TeamView: View {
    @Environment(AppState.self) private var appState
    @State private var members: [ConvexTeamMember] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var selectedMember: ConvexTeamMember?

    var filteredMembers: [ConvexTeamMember] {
        if searchText.isEmpty { return members }
        let query = searchText.lowercased()
        return members.filter {
            $0.displayName.lowercased().contains(query) ||
            $0.email.lowercased().contains(query)
        }
    }

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(
                        title: "Équipe",
                        subtitle: "\(members.count) membre\(members.count > 1 ? "s" : "")"
                    )

                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher un membre...")

                    if isLoading {
                        LoadingView(message: "Chargement de l'équipe...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadMembers() }
                    } else if filteredMembers.isEmpty {
                        EmptyStateView(
                            icon: "person.3",
                            title: "Aucun membre",
                            subtitle: searchText.isEmpty ? "L'équipe est vide." : "Aucun résultat pour \"\(searchText)\""
                        )
                    } else {
                        membersList
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadMembers() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadMembers() }
            }
            .sheet(item: $selectedMember) { member in
                MemberDetailSheet(member: member)
            }
        }
    }

    // MARK: - Members List

    private var membersList: some View {
        VStack(spacing: 0) {
            // Header row
            HStack(spacing: 0) {
                Text("Nom").font(.caption).foregroundStyle(.secondary).frame(minWidth: 200, alignment: .leading)
                Text("Email").font(.caption).foregroundStyle(.secondary).frame(minWidth: 200, alignment: .leading)
                Text("Poste").font(.caption).foregroundStyle(.secondary).frame(minWidth: 150, alignment: .leading)
                Text("Statut").font(.caption).foregroundStyle(.secondary).frame(width: 80, alignment: .center)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            ForEach(filteredMembers) { member in
                Button {
                    selectedMember = member
                } label: {
                    HStack(spacing: 0) {
                        // Name with avatar
                        HStack(spacing: 8) {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 28, height: 28)
                                .overlay {
                                    Text(String(member.displayName.prefix(1)).uppercased())
                                        .font(.caption.bold())
                                        .foregroundStyle(.blue)
                                }
                            Text(member.displayName)
                                .font(.body)
                                .lineLimit(1)
                        }
                        .frame(minWidth: 200, alignment: .leading)

                        Text(member.email)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .frame(minWidth: 200, alignment: .leading)

                        Text(member.position?.title ?? "—")
                            .font(.body)
                            .lineLimit(1)
                            .frame(minWidth: 150, alignment: .leading)

                        HStack {
                            Circle()
                                .fill(member.user?.isActive == true ? Color.green : Color.gray)
                                .frame(width: 8, height: 8)
                            Text(member.user?.isActive == true ? "Actif" : "Inactif")
                                .font(.caption)
                        }
                        .frame(width: 80, alignment: .center)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if member.id != filteredMembers.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Data Loading

    private func loadMembers() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            members = try await convexQuery(
                "functions/memberships:listOrgMembers",
                with: ["orgId": orgId],
                yielding: [ConvexTeamMember].self
            )
        } catch {
            let msg = "\(error)"
            if msg.contains("Could not find") || msg.contains("not found") {
                // Function might not exist yet — try alternative
                do {
                    members = try await convexQuery(
                        "functions/memberships:listMyMemberships",
                        yielding: [ConvexTeamMember].self
                    )
                } catch {
                    errorMessage = "Erreur: \(error.localizedDescription)"
                }
            } else {
                errorMessage = "Erreur: \(error.localizedDescription)"
            }
        }

        isLoading = false
    }
}

// MARK: - Member Detail Sheet

struct MemberDetailSheet: View {
    let member: ConvexTeamMember
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 48, height: 48)
                    .overlay {
                        Text(String(member.displayName.prefix(1)).uppercased())
                            .font(.title2.bold())
                            .foregroundStyle(.blue)
                    }

                VStack(alignment: .leading, spacing: 4) {
                    Text(member.displayName)
                        .font(.title3.bold())
                    Text(member.email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                HStack(spacing: 4) {
                    Circle()
                        .fill(member.user?.isActive == true ? Color.green : Color.gray)
                        .frame(width: 8, height: 8)
                    Text(member.user?.isActive == true ? "Actif" : "Inactif")
                        .font(.caption)
                }
            }

            Divider()

            // Position info
            VStack(alignment: .leading, spacing: 12) {
                detailRow(label: "Poste", value: member.position?.title ?? "Non défini")
                detailRow(label: "Grade", value: member.position?.grade ?? "—")
                detailRow(label: "Membre depuis", value: formatDate(member._creationTime))
            }

            Spacer()

            Button("Fermer") { dismiss() }
                .buttonStyle(.bordered)
        }
        .padding(24)
        .frame(width: 400, height: 350)
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 120, alignment: .leading)
            Text(value)
                .font(.subheadline)
        }
    }
}
