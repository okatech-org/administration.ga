//
//  AgentMacOSApp.swift
//  AgentMacOS
//
//  Main application entry point
//

import SwiftUI
import ConvexMobile

// MARK: - Global Convex Client with Better Auth Authentication
let convex = ConvexClientWithAuth(
    deploymentUrl: "https://acrobatic-mole-132.eu-west-1.convex.cloud",
    authProvider: BetterAuthProvider()
)

@main
struct AgentMacOSApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            MainView()
                .environment(appState)
                .task {
                    await initializeApp()
                }
        }
        .windowStyle(.automatic)
        .defaultSize(width: 1200, height: 800)
    }

    /// Initialize Better Auth and Convex authentication
    private func initializeApp() async {
        // Attempt to authenticate with Convex using cached Better Auth session
        let result = await convex.loginFromCache()
        switch result {
        case .success:
            print("[AgentMacOS] Authenticated with Convex via Better Auth")
            appState.isAuthenticated = true
            // Load user data and org memberships
            await ConvexService.shared.loadCurrentUser()
            autoSelectOrg()
        case .failure(let error):
            print("[AgentMacOS] No cached session or auth failed: \(error)")
            appState.isAuthenticated = false
        }
        appState.isAuthLoading = false
    }

    /// Auto-select the first available organization
    private func autoSelectOrg() {
        let service = ConvexService.shared
        // Wait briefly for subscriptions to deliver data
        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            if appState.selectedOrgId == nil {
                if let firstOrg = service.availableOrgs.first {
                    appState.selectedOrgId = firstOrg._id
                    print("[AgentMacOS] Auto-selected org: \(firstOrg.name)")
                }
            }
        }
    }
}
