//
//  SidebarView.swift
//  AgentMacOS
//
//  Navigation sidebar
//

import SwiftUI

struct SidebarView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        List(selection: $state.currentScreen) {
            // Commandes
            Section("Commandes") {
                Label("Dashboard", systemImage: "house")
                    .tag(AppState.Screen.dashboard)

                Label("iProfil", systemImage: "person.circle")
                    .tag(AppState.Screen.iprofil)
            }

            // Opérations
            Section("Opérations") {
                Label("Affaires Diplomatiques", systemImage: "globe.europe.africa")
                    .tag(AppState.Screen.affairesDiplomatiques)

                Label("Affaires Consulaires", systemImage: "person.2")
                    .tag(AppState.Screen.affairesConsulaires)

                Label("Actualités", systemImage: "newspaper")
                    .tag(AppState.Screen.posts)
            }

            // iBureau
            Section("iBureau") {
                Label("iBoîte", systemImage: "tray.full")
                    .tag(AppState.Screen.iboite)

                Label("iCorrespondance", systemImage: "folder")
                    .tag(AppState.Screen.icorrespondance)

                Label("iDocument", systemImage: "doc.text")
                    .tag(AppState.Screen.idocument)

                Label("iAgenda", systemImage: "calendar")
                    .tag(AppState.Screen.iagenda)
            }

            // Bureau Local — Impression (desktop-only)
            Section("Bureau Local") {
                Label("Impression", systemImage: "printer.fill")
                    .tag(AppState.Screen.print)

                Label("Designer", systemImage: "paintbrush")
                    .tag(AppState.Screen.designer)

                Label("Templates", systemImage: "rectangle.stack")
                    .tag(AppState.Screen.templates)

                Label("Import données", systemImage: "tablecells")
                    .tag(AppState.Screen.data)
            }

            // Gestion
            Section("Gestion") {
                Label("Équipe", systemImage: "person.3")
                    .tag(AppState.Screen.team)

                Label("Paiements", systemImage: "creditcard")
                    .tag(AppState.Screen.payments)

                Label("Statistiques", systemImage: "chart.bar")
                    .tag(AppState.Screen.statistics)
            }

            // Administration
            Section("Administration") {
                Label("Paramètres", systemImage: "gear")
                    .tag(AppState.Screen.settings)
            }
        }
        .listStyle(.sidebar)
        .frame(minWidth: 200)
    }
}

#Preview {
    SidebarView()
        .environment(AppState())
}
