//
//  SettingsView.swift
//  AgentMacOS
//
//  Settings view with account, printer, and preferences
//

import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedPrinter: String = "Evolis Primacy 2"
    @State private var autoSync = true
    @State private var showSuccessAlert = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Paramètres")
                    .font(.largeTitle.weight(.bold))
                    .padding(.bottom, 8)

                accountSection
                Divider()
                printerSection
                Divider()
                syncSection
                Divider()
                aboutSection
            }
            .padding(32)
        }
        .background(Color(.windowBackgroundColor))
        .alert("Test réussi", isPresented: $showSuccessAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("L'imprimante répond correctement.")
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Compte", systemImage: "person.circle.fill")
                .font(.title2.weight(.semibold))

            HStack(spacing: 16) {
                let user = ConvexService.shared.currentUser

                Image(systemName: "person.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.blue)

                VStack(alignment: .leading, spacing: 4) {
                    Text(user?.name ?? "Agent")
                        .font(.headline)

                    Text(user?.email ?? "Connecté")
                        .font(.caption)
                        .foregroundStyle(.green)
                }

                Spacer()

                Button(role: .destructive) {
                    Task {
                        let provider = BetterAuthProvider()
                        try? await provider.logout()
                        appState.isAuthenticated = false
                    }
                } label: {
                    Label("Déconnexion", systemImage: "rectangle.portrait.and.arrow.right")
                }
                .buttonStyle(.bordered)
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Printer Section

    private var printerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Imprimante", systemImage: "printer.fill")
                .font(.title2.weight(.semibold))

            VStack(alignment: .leading, spacing: 12) {
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
                    Button {
                        showSuccessAlert = true
                    } label: {
                        Label("Test connexion", systemImage: "antenna.radiowaves.left.and.right")
                    }
                    .buttonStyle(.bordered)

                    Button {
                        // Open printer settings
                    } label: {
                        Label("Paramètres avancés", systemImage: "gearshape")
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Sync Section

    private var syncSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Synchronisation", systemImage: "arrow.triangle.2.circlepath")
                .font(.title2.weight(.semibold))

            VStack(alignment: .leading, spacing: 12) {
                Toggle("Synchroniser automatiquement", isOn: $autoSync)

                HStack {
                    Text("Dernière sync")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Temps réel (Convex)")
                        .foregroundStyle(.secondary)
                }

                Button {
                    // Force sync
                } label: {
                    Label("Synchroniser maintenant", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.bordered)
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("À propos", systemImage: "info.circle.fill")
                .font(.title2.weight(.semibold))

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Version")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("1.0.0")
                }

                HStack {
                    Text("Application")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Agent macOS — Diplomate.ga")
                }

                Divider()

                HStack {
                    Link(destination: URL(string: "https://consulat.ga")!) {
                        Label("Consulat.ga", systemImage: "globe")
                    }

                    Spacer()

                    Link(destination: URL(string: "https://evolis.com")!) {
                        Label("Evolis SDK", systemImage: "printer")
                    }
                }
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

#Preview {
    SettingsView()
        .environment(AppState())
}
