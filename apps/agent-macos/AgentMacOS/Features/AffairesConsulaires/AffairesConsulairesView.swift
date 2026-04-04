//
//  AffairesConsulairesView.swift
//  AgentMacOS
//
//  Hub / landing page for consular affairs — provides navigation
//  to Requests, Consular Registry, and Citizen Profiles.
//

import SwiftUI

struct AffairesConsulairesView: View {
    @Environment(AppState.self) private var appState

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 20), count: 3)

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
                    title: "Affaires Consulaires",
                    subtitle: "Gestion des opérations consulaires"
                )

                LazyVGrid(columns: columns, spacing: 20) {
                    hubCard(
                        icon: "doc.text.fill",
                        title: "Demandes",
                        description: "Traitement des demandes consulaires, visas, passeports et actes d'état civil.",
                        accentColor: .blue,
                        destination: .requests
                    )

                    hubCard(
                        icon: "list.clipboard.fill",
                        title: "Registre Consulaire",
                        description: "Gestion des immatriculations consulaires et des cartes d'identité consulaire.",
                        accentColor: .green,
                        destination: .consularRegistry
                    )

                    hubCard(
                        icon: "person.crop.rectangle.fill",
                        title: "Profils Citoyens",
                        description: "Consultation et gestion des profils des ressortissants enregistrés.",
                        accentColor: .purple,
                        destination: .profiles
                    )
                }

                Spacer(minLength: 24)
            }
            .padding(24)
        }
        .background(Color(.windowBackgroundColor))
        .frame(minWidth: 600, minHeight: 400)
    }

    // MARK: - Hub Card

    private func hubCard(
        icon: String,
        title: String,
        description: String,
        accentColor: Color,
        destination: AppState.Screen
    ) -> some View {
        Button {
            appState.currentScreen = destination
        } label: {
            VStack(spacing: 16) {
                // Icon
                Image(systemName: icon)
                    .font(.system(size: 36))
                    .foregroundStyle(accentColor)
                    .frame(width: 72, height: 72)
                    .background(accentColor.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                // Title
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)

                // Description
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 0)

                // Bottom action hint
                HStack(spacing: 4) {
                    Text("Ouvrir")
                        .font(.caption)
                        .fontWeight(.medium)
                    Image(systemName: "arrow.right")
                        .font(.caption2)
                }
                .foregroundStyle(accentColor)
            }
            .padding(24)
            .frame(maxWidth: .infinity, minHeight: 240)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(.separatorColor), lineWidth: 0.5)
            )
            .contentShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(HubCardButtonStyle())
    }
}

// MARK: - Card Button Style

private struct HubCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .shadow(
                color: .black.opacity(configuration.isPressed ? 0.04 : 0.08),
                radius: configuration.isPressed ? 2 : 6,
                y: configuration.isPressed ? 1 : 3
            )
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Preview

#Preview {
    AffairesConsulairesView()
        .environment(AppState())
        .frame(width: 1000, height: 700)
}
