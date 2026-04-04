//
//  MainView.swift
//  AgentMacOS
//
//  Main container with sidebar and content
//

import SwiftUI
import ConvexMobile

struct MainView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            if appState.isAuthLoading {
                loadingView
            } else if !appState.isAuthenticated {
                SignInView()
            } else {
                authenticatedContent
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Chargement...")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }

    private var authenticatedContent: some View {
        NavigationSplitView {
            VStack(spacing: 0) {
                // Org picker at top of sidebar
                orgPicker
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)

                Divider()

                SidebarView()
            }
        } detail: {
            contentView
        }
        .frame(minWidth: 1000, minHeight: 700)
        .task {
            // Load user data when authenticated content appears
            await ConvexService.shared.loadCurrentUser()
            // Auto-select first org if none selected
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            if appState.selectedOrgId == nil {
                if let firstOrg = ConvexService.shared.availableOrgs.first {
                    appState.selectedOrgId = firstOrg._id
                }
            }
        }
    }

    @ViewBuilder
    private var orgPicker: some View {
        let orgs = ConvexService.shared.availableOrgs
        if orgs.count > 1 {
            @Bindable var state = appState
            Picker("Organisation", selection: $state.selectedOrgId) {
                Text("Sélectionner...").tag(nil as String?)
                ForEach(orgs, id: \._id) { org in
                    Text(org.name).tag(org._id as String?)
                }
            }
            .pickerStyle(.menu)
            .labelsHidden()
        } else if let org = orgs.first {
            HStack {
                Image(systemName: "building.2")
                    .foregroundStyle(.secondary)
                Text(org.name)
                    .font(.subheadline.weight(.medium))
                Spacer()
            }
            .onAppear {
                if appState.selectedOrgId == nil {
                    appState.selectedOrgId = org._id
                }
            }
        }
    }

    @ViewBuilder
    private var contentView: some View {
        switch appState.currentScreen {
        // Core
        case .dashboard:
            DashboardView()
        case .requests:
            PlaceholderView(title: "Demandes", icon: "doc.text.fill")
        case .appointments:
            PlaceholderView(title: "Rendez-vous", icon: "calendar")

        // Consular & Diplomatic
        case .affairesConsulaires:
            PlaceholderView(title: "Affaires Consulaires", icon: "person.2.fill")
        case .affairesDiplomatiques:
            PlaceholderView(title: "Affaires Diplomatiques", icon: "globe.europe.africa.fill")
        case .consularRegistry:
            PlaceholderView(title: "Registre Consulaire", icon: "list.clipboard.fill")

        // iBureau
        case .iboite:
            PlaceholderView(title: "iBoite", icon: "tray.full.fill")
        case .icorrespondance:
            PlaceholderView(title: "iCorrespondance", icon: "envelope.fill")
        case .idocument:
            PlaceholderView(title: "iDocument", icon: "doc.fill")
        case .iagenda:
            PlaceholderView(title: "iAgenda", icon: "calendar.badge.clock")
        case .iarchive:
            PlaceholderView(title: "iArchive", icon: "archivebox.fill")
        case .iasted:
            PlaceholderView(title: "iAsted", icon: "brain.fill")

        // Content
        case .posts:
            PlaceholderView(title: "Articles", icon: "newspaper.fill")

        // Production (EasyCard)
        case .designer:
            CardDesignerView()
        case .templates:
            TemplateGalleryView()
        case .print:
            ProfilePrintView()
        case .data:
            DataImportView()

        // Administration
        case .services:
            PlaceholderView(title: "Services", icon: "list.bullet.rectangle.fill")
        case .payments:
            PlaceholderView(title: "Paiements", icon: "creditcard.fill")
        case .team:
            PlaceholderView(title: "Équipe", icon: "person.3.fill")
        case .statistics:
            PlaceholderView(title: "Statistiques", icon: "chart.bar.fill")
        case .profiles:
            PlaceholderView(title: "Profils", icon: "person.crop.rectangle.fill")
        case .calls:
            PlaceholderView(title: "Appels", icon: "video.fill")
        case .meetings:
            PlaceholderView(title: "Réunions", icon: "person.2.wave.2.fill")
        case .settings:
            SettingsView()
        }
    }
}

// Placeholder for screens not yet implemented
struct PlaceholderView: View {
    let title: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            
            Text(title)
                .font(.title)
                .fontWeight(.medium)
            
            Text("Coming soon...")
                .font(.subheadline)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }
}

#Preview {
    MainView()
        .environment(AppState())
}
