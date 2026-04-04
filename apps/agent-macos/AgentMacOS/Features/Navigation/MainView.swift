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
            await appState.loadUserAndOrgs()
        }
    }

    @ViewBuilder
    private var orgPicker: some View {
        if appState.isLoadingOrgs {
            HStack {
                ProgressView()
                    .controlSize(.small)
                Text("Chargement...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
        } else if appState.availableOrgs.count > 1 {
            @Bindable var state = appState
            Picker("Organisation", selection: $state.selectedOrgId) {
                Text("Sélectionner...").tag(nil as String?)
                ForEach(appState.availableOrgs, id: \._id) { org in
                    Text(org.name).tag(org._id as String?)
                }
            }
            .pickerStyle(.menu)
            .labelsHidden()
        } else if let org = appState.availableOrgs.first {
            HStack(spacing: 8) {
                Image(systemName: "building.2")
                    .foregroundStyle(.blue)
                Text(org.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Spacer()
            }
        } else {
            HStack {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(.orange)
                Text("Aucune organisation")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
    }

    @ViewBuilder
    private var contentView: some View {
        switch appState.currentScreen {
        // Core
        case .dashboard:
            DashboardView()
        case .iprofil:
            ProfilesView()
        case .requests:
            RequestsView()
        case .appointments:
            AppointmentsView()

        // Consular & Diplomatic
        case .affairesConsulaires:
            AffairesConsulairesView()
        case .affairesDiplomatiques:
            AffairesDiplomatiquesView()
        case .consularRegistry:
            ConsularRegistryView()

        // iBureau
        case .iboite:
            iBoiteView()
        case .icorrespondance:
            iCorrespondanceView()
        case .idocument:
            iDocumentView()
        case .iagenda:
            iAgendaView()
        case .iarchive:
            iDocumentView() // Archive redirects to iDocument
        case .iasted:
            iAstedView()

        // Content
        case .posts:
            PostsView()

        // Production (EasyCard)
        case .designer:
            CardDesignerView()
        case .templates:
            TemplateGalleryView()
        case .print:
            PrintPageView()
        case .data:
            DataImportView()

        // Administration
        case .services:
            ServicesView()
        case .payments:
            PaymentsView()
        case .team:
            TeamView()
        case .statistics:
            StatisticsView()
        case .profiles:
            CitizenProfilesView()
        case .calls:
            iAstedView() // Calls redirects to iAsted
        case .meetings:
            MeetingsView()
        case .settings:
            SettingsView()
        }
    }
}

#Preview {
    MainView()
        .environment(AppState())
}
