//
//  AppState.swift
//  AgentMacOS
//
//  Global app state observable
//

import SwiftUI

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

    var selectedOrgId: String?

    // MARK: - Printer State

    var isPrinterConnected: Bool = false
    var printerName: String = ""
    var ribbonRemaining: Int = 0

    // MARK: - Services

    let printerService = PrinterService.shared

    // MARK: - Actions

    func refreshPrinterStatus() {
        isPrinterConnected = printerService.isConnected
        printerName = printerService.connectedPrinter?.name ?? ""
        ribbonRemaining = printerService.ribbonInfo?.remaining ?? 0
    }
}
