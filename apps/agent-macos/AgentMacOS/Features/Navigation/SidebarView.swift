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
                Label("Tableau de bord", systemImage: "square.grid.2x2")
                    .tag(AppState.Screen.dashboard)
            }

            // Opérations
            Section("Opérations") {
                Label("Affaires Diplomatiques", systemImage: "globe.europe.africa.fill")
                    .tag(AppState.Screen.affairesDiplomatiques)

                Label("Affaires Consulaires", systemImage: "person.2.fill")
                    .tag(AppState.Screen.affairesConsulaires)

                Label("Demandes", systemImage: "doc.text.fill")
                    .tag(AppState.Screen.requests)

                Label("Rendez-vous", systemImage: "calendar")
                    .tag(AppState.Screen.appointments)

                Label("Articles", systemImage: "newspaper.fill")
                    .tag(AppState.Screen.posts)
            }

            // iBureau
            Section("iBureau") {
                Label("iBoite", systemImage: "tray.full.fill")
                    .tag(AppState.Screen.iboite)

                Label("iCorrespondance", systemImage: "envelope.fill")
                    .tag(AppState.Screen.icorrespondance)

                Label("iDocument", systemImage: "doc.fill")
                    .tag(AppState.Screen.idocument)

                Label("iAgenda", systemImage: "calendar.badge.clock")
                    .tag(AppState.Screen.iagenda)

                Label("iArchive", systemImage: "archivebox.fill")
                    .tag(AppState.Screen.iarchive)

                Label("iAsted", systemImage: "brain.fill")
                    .tag(AppState.Screen.iasted)
            }

            // Bureau Local — Production & Impression
            Section("Bureau Local") {
                Label("Impression", systemImage: "printer.fill")
                    .tag(AppState.Screen.print)

                Label("Registre Consulaire", systemImage: "list.clipboard.fill")
                    .tag(AppState.Screen.consularRegistry)

                Label("Designer", systemImage: "paintbrush")
                    .tag(AppState.Screen.designer)

                Label("Templates", systemImage: "rectangle.stack")
                    .tag(AppState.Screen.templates)

                Label("Import données", systemImage: "tablecells")
                    .tag(AppState.Screen.data)
            }

            // Administration
            Section("Administration") {
                Label("Services", systemImage: "list.bullet.rectangle.fill")
                    .tag(AppState.Screen.services)

                Label("Équipe", systemImage: "person.3.fill")
                    .tag(AppState.Screen.team)

                Label("Paiements", systemImage: "creditcard.fill")
                    .tag(AppState.Screen.payments)

                Label("Statistiques", systemImage: "chart.bar.fill")
                    .tag(AppState.Screen.statistics)

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
