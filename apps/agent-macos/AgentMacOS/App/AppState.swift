//
//  AppState.swift
//  AgentMacOS
//
//  Global app state observable
//

import SwiftUI
import Combine
import ConvexMobile

/// Main application state - shared across views
@Observable
final class AppState {

    // MARK: - Navigation

    enum Screen: String, Hashable, CaseIterable {
        // Core
        case dashboard
        case requests
        case appointments

        // Consular & Diplomatic
        case affairesConsulaires
        case affairesDiplomatiques
        case consularRegistry

        // iBureau
        case iboite
        case icorrespondance
        case idocument
        case iagenda
        case iarchive
        case iasted

        // Content
        case posts

        // Production (EasyCard features)
        case designer
        case templates
        case print
        case data

        // Administration
        case services
        case payments
        case team
        case statistics
        case profiles
        case calls
        case meetings
        case settings
    }

    var currentScreen: Screen = .dashboard

    // MARK: - Auth State

    var isAuthenticated: Bool = false
    var isAuthLoading: Bool = true

    // MARK: - Organization

    /// Available orgs the user is a member of
    var availableOrgs: [ConvexOrg] = []

    /// Currently selected org ID — persisted in UserDefaults
    var selectedOrgId: String? {
        didSet {
            if let id = selectedOrgId {
                UserDefaults.standard.set(id, forKey: "selectedOrgId")
            } else {
                UserDefaults.standard.removeObject(forKey: "selectedOrgId")
            }
        }
    }

    /// Whether org data is still loading
    var isLoadingOrgs: Bool = false

    // MARK: - Printer State

    var isPrinterConnected: Bool = false
    var printerName: String = ""
    var ribbonRemaining: Int = 0

    // MARK: - Services

    let printerService = PrinterService.shared

    // MARK: - Subscriptions

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init() {
        // Restore persisted org selection
        selectedOrgId = UserDefaults.standard.string(forKey: "selectedOrgId")
    }

    // MARK: - Actions

    func refreshPrinterStatus() {
        isPrinterConnected = printerService.isConnected
        printerName = printerService.connectedPrinter?.name ?? ""
        ribbonRemaining = printerService.ribbonInfo?.remaining ?? 0
    }

    /// Load user data and org memberships after authentication
    func loadUserAndOrgs() async {
        isLoadingOrgs = true

        // Ensure user exists in Convex
        do {
            try await convex.mutation("functions/users:ensureUser")
        } catch {
            print("[AppState] ensureUser failed: \(error)")
        }

        // Subscribe to memberships to get available orgs
        convex.subscribe(
            to: "functions/memberships:listMyMemberships",
            yielding: [ConvexMembership].self
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    print("[AppState] Memberships subscription error: \(error)")
                    self?.isLoadingOrgs = false
                }
            },
            receiveValue: { [weak self] memberships in
                guard let self else { return }
                let orgs = memberships.compactMap { $0.org }
                self.availableOrgs = orgs
                self.isLoadingOrgs = false

                // Auto-select logic
                self.autoSelectOrg(orgs: orgs)

                print("[AppState] Received \(memberships.count) memberships, \(orgs.count) orgs")
            }
        )
        .store(in: &cancellables)
    }

    /// Auto-select org: if persisted selection is valid keep it,
    /// otherwise select the only org or leave unselected for picker.
    private func autoSelectOrg(orgs: [ConvexOrg]) {
        // If current selection is still valid, keep it
        if let selected = selectedOrgId,
           orgs.contains(where: { $0._id == selected }) {
            return
        }

        // If only one org, auto-select it
        if orgs.count == 1 {
            selectedOrgId = orgs[0]._id
            print("[AppState] Auto-selected single org: \(orgs[0].name)")
        } else if orgs.count > 1 {
            // Multiple orgs and no valid selection — leave nil for picker
            selectedOrgId = nil
        }
    }
}
