//
//  SettingsView.swift
//  AgentMacOS
//
//  Settings view with account, organization, printer, sync, and about
//

import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedPrinter: String = "Evolis Primacy 2"
    @State private var autoSync = true
    @State private var showSuccessAlert = false
    @State private var selectedTab: SettingsTab = .account

    enum SettingsTab: String, CaseIterable {
        case account = "Compte"
        case organization = "Organisation"
        case printer = "Imprimante"
        case sync = "Synchronisation"
        case about = "À propos"

        var icon: String {
            switch self {
            case .account: "person.circle.fill"
            case .organization: "building.2.fill"
            case .printer: "printer.fill"
            case .sync: "arrow.triangle.2.circlepath"
            case .about: "info.circle.fill"
            }
        }
    }

    var body: some View {
        HSplitView {
            // Settings sidebar
            List(selection: $selectedTab) {
                Section("Paramètres") {
                    ForEach(SettingsTab.allCases, id: \.self) { tab in
                        Label(tab.rawValue, systemImage: tab.icon)
                            .tag(tab)
                    }
                }
            }
            .listStyle(.sidebar)
            .frame(minWidth: 200, idealWidth: 220)

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    switch selectedTab {
                    case .account: accountContent
                    case .organization: organizationContent
                    case .printer: printerContent
                    case .sync: syncContent
                    case .about: aboutContent
                    }
                }
                .padding(32)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color(.windowBackgroundColor))
        }
        .alert("Test réussi", isPresented: $showSuccessAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("L'imprimante répond correctement.")
        }
    }

    // MARK: - Account

    private var accountContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Compte")
                .font(.largeTitle.weight(.bold))

            let user = ConvexService.shared.currentUser

            // Profile card
            VStack(spacing: 0) {
                HStack(spacing: 16) {
                    if let url = user?.avatarUrl, let nsUrl = URL(string: url) {
                        AsyncImage(url: nsUrl) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
                            default:
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 56))
                                    .foregroundStyle(.blue)
                            }
                        }
                        .frame(width: 56, height: 56)
                        .clipShape(Circle())
                    } else {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(.blue)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(user?.name ?? "Agent")
                            .font(.title3.weight(.semibold))
                        Text(user?.email ?? "—")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        HStack(spacing: 8) {
                            Label("Connecté", systemImage: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundStyle(.green)

                            if user?.isSuperadmin == true {
                                Text("Super Admin")
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.orange.opacity(0.15))
                                    .foregroundStyle(.orange)
                                    .clipShape(Capsule())
                            }
                        }
                    }

                    Spacer()
                }
                .padding(16)
            }
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Security section
            settingsCard(title: "Sécurité", icon: "lock.shield.fill") {
                HStack {
                    Text("Authentification")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("BetterAuth")
                        .font(.caption.monospaced())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.1))
                        .foregroundStyle(.green)
                        .clipShape(Capsule())
                }

                HStack {
                    Text("Session active")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Circle()
                        .fill(.green)
                        .frame(width: 8, height: 8)
                    Text("Oui")
                        .foregroundStyle(.green)
                }
            }

            // Logout
            Button(role: .destructive) {
                Task {
                    let provider = BetterAuthProvider()
                    try? await provider.logout()
                    appState.isAuthenticated = false
                }
            } label: {
                Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }

    // MARK: - Organization

    private var organizationContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Organisation")
                .font(.largeTitle.weight(.bold))

            if let org = appState.availableOrgs.first(where: { $0.id == appState.selectedOrgId }) {
                settingsCard(title: "Informations", icon: "building.2.fill") {
                    infoRow("Nom", value: org.name)
                    if let country = org.country {
                        infoRow("Pays", value: country)
                    }
                    infoRow("Slug", value: org.slug)
                }

                settingsCard(title: "Modules actifs", icon: "square.grid.2x2.fill") {
                    HStack {
                        Text("Backend")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("Convex")
                            .font(.caption.monospaced())
                    }

                    HStack {
                        Text("Mise à jour")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("Temps réel")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.1))
                            .foregroundStyle(.blue)
                            .clipShape(Capsule())
                    }
                }
            } else {
                EmptyStateView(
                    icon: "building.2",
                    title: "Aucune organisation",
                    subtitle: "Sélectionnez une organisation dans la barre latérale"
                )
            }
        }
    }

    // MARK: - Printer

    private var printerContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Imprimante")
                .font(.largeTitle.weight(.bold))

            settingsCard(title: "Configuration", icon: "printer.fill") {
                HStack {
                    Text("Imprimante sélectionnée")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Picker("", selection: $selectedPrinter) {
                        Text("Evolis Primacy 2").tag("Evolis Primacy 2")
                        Text("Evolis Zenius").tag("Evolis Zenius")
                        Text("Simulator").tag("Simulator")
                    }
                    .pickerStyle(.menu)
                    .frame(width: 200)
                }

                HStack {
                    Text("Status")
                        .foregroundStyle(.secondary)
                    Spacer()
                    HStack(spacing: 6) {
                        Circle()
                            .fill(appState.isPrinterConnected ? .green : .red)
                            .frame(width: 8, height: 8)
                        Text(appState.isPrinterConnected ? "Prête" : "Déconnectée")
                            .foregroundStyle(appState.isPrinterConnected ? .green : .red)
                    }
                }

                HStack {
                    Text("SDK")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Evolis Premium Suite SDK")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            settingsCard(title: "Actions", icon: "wrench.fill") {
                HStack(spacing: 12) {
                    Button {
                        showSuccessAlert = true
                    } label: {
                        Label("Test connexion", systemImage: "antenna.radiowaves.left.and.right")
                    }
                    .buttonStyle(.bordered)

                    Button {
                        // Open printer calibration
                    } label: {
                        Label("Calibration", systemImage: "slider.horizontal.3")
                    }
                    .buttonStyle(.bordered)

                    Button {
                        // Clean printer
                    } label: {
                        Label("Nettoyage", systemImage: "sparkles")
                    }
                    .buttonStyle(.bordered)
                }
            }

            settingsCard(title: "Consommables", icon: "tray.full.fill") {
                HStack {
                    Text("Ruban couleur")
                        .foregroundStyle(.secondary)
                    Spacer()
                    ProgressView(value: 0.72)
                        .frame(width: 120)
                    Text("72%")
                        .font(.caption.bold())
                        .foregroundStyle(.green)
                }

                HStack {
                    Text("Film de transfert")
                        .foregroundStyle(.secondary)
                    Spacer()
                    ProgressView(value: 0.85)
                        .frame(width: 120)
                    Text("85%")
                        .font(.caption.bold())
                        .foregroundStyle(.green)
                }

                HStack {
                    Text("Cartes vierges")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("~150 restantes")
                        .font(.caption)
                        .foregroundStyle(.blue)
                }
            }
        }
    }

    // MARK: - Sync

    private var syncContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Synchronisation")
                .font(.largeTitle.weight(.bold))

            settingsCard(title: "État", icon: "arrow.triangle.2.circlepath") {
                HStack {
                    Text("Mode")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Temps réel (WebSocket)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.1))
                        .foregroundStyle(.green)
                        .clipShape(Capsule())
                }

                HStack {
                    Text("Backend")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Convex")
                        .font(.caption.monospaced())
                }

                HStack {
                    Text("Connexion")
                        .foregroundStyle(.secondary)
                    Spacer()
                    HStack(spacing: 6) {
                        Circle().fill(.green).frame(width: 8, height: 8)
                        Text("Connecté")
                            .foregroundStyle(.green)
                    }
                }
            }

            settingsCard(title: "Préférences", icon: "gearshape.fill") {
                Toggle("Synchroniser automatiquement", isOn: $autoSync)

                HStack {
                    Text("Souscriptions actives")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Auto-refresh")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            settingsCard(title: "Informations", icon: "info.circle") {
                HStack {
                    Text("Protocole")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Convex Real-time Subscriptions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Text("Latence")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("< 100ms")
                        .font(.caption)
                        .foregroundStyle(.green)
                }
            }
        }
    }

    // MARK: - About

    private var aboutContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("À propos")
                .font(.largeTitle.weight(.bold))

            settingsCard(title: "Application", icon: "app.fill") {
                infoRow("Nom", value: "Agent macOS")
                infoRow("Version", value: "1.0.0")
                infoRow("Build", value: "2026.04")
                infoRow("Plateforme", value: "macOS (SwiftUI natif)")
            }

            settingsCard(title: "Infrastructure", icon: "server.rack") {
                infoRow("Backend", value: "Convex")
                infoRow("Auth", value: "BetterAuth")
                infoRow("Vidéo", value: "LiveKit")
                infoRow("Impression", value: "Evolis SDK")
            }

            settingsCard(title: "Liens", icon: "link") {
                HStack(spacing: 16) {
                    Link(destination: URL(string: "https://consulat.ga")!) {
                        Label("Consulat.ga", systemImage: "globe")
                    }
                    .buttonStyle(.bordered)

                    Link(destination: URL(string: "https://diplomate.ga")!) {
                        Label("Diplomate.ga", systemImage: "globe")
                    }
                    .buttonStyle(.bordered)

                    Link(destination: URL(string: "https://evolis.com")!) {
                        Label("Evolis", systemImage: "printer")
                    }
                    .buttonStyle(.bordered)
                }
            }

            // Legal
            VStack(alignment: .leading, spacing: 8) {
                Text("OkaTech Consulting")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Tous droits réservés © 2026")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 8)
        }
    }

    // MARK: - Helpers

    private func settingsCard(title: String, icon: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon)
                .font(.title3.weight(.semibold))

            VStack(alignment: .leading, spacing: 10) {
                content()
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func infoRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
        }
    }
}

#Preview {
    SettingsView()
        .environment(AppState())
}
