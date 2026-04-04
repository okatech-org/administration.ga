//
//  DashboardView.swift
//  AgentMacOS
//
//  Main dashboard with printer status and quick actions
//

import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @State private var availablePrinters: [String] = []
    @State private var isSearching = false
    @State private var connectionError: String?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection
                
                // Printer Status Card
                printerStatusCard
                
                // Quick Actions
                quickActionsGrid
                
                Spacer()
            }
            .padding(24)
        }
        .background(Color(.windowBackgroundColor))
        .frame(minWidth: 600, minHeight: 400)
    }
    
    // MARK: - Header
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Agent macOS")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Card Printing Made Simple")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            // Printer indicator
            HStack(spacing: 8) {
                Circle()
                    .fill(appState.isPrinterConnected ? Color.green : Color.red)
                    .frame(width: 10, height: 10)
                
                Text(appState.isPrinterConnected ? "Connected" : "Disconnected")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
    }
    
    // MARK: - Printer Status Card
    
    private var printerStatusCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "printer.fill")
                    .font(.title2)
                    .foregroundStyle(.blue)
                
                Text("Printer Status")
                    .font(.headline)
                
                Spacer()
                
                Button(action: searchPrinters) {
                    if isSearching {
                        ProgressView()
                            .scaleEffect(0.7)
                    } else {
                        Label("Scan", systemImage: "arrow.clockwise")
                    }
                }
                .buttonStyle(.bordered)
                .disabled(isSearching)
            }
            
            Divider()
            
            if appState.isPrinterConnected {
                // Connected state
                connectedPrinterInfo
            } else if !availablePrinters.isEmpty {
                // Printers found but not connected
                printersList
            } else {
                // No printers
                noPrintersView
            }
            
            if let error = connectionError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding(20)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private var connectedPrinterInfo: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(appState.printerName)
                        .font(.title3)
                        .fontWeight(.medium)
                    
                    if let printer = appState.printerService.connectedPrinter {
                        Text("S/N: \(printer.serialNumber)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                Button("Disconnect") {
                    appState.printerService.disconnect()
                    appState.refreshPrinterStatus()
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
            
            // Ribbon status
            if let ribbon = appState.printerService.ribbonInfo {
                HStack {
                    Text("Ribbon: \(ribbon.type)")
                        .font(.caption)
                    
                    Spacer()
                    
                    Text("\(ribbon.remaining) / \(ribbon.capacity)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                ProgressView(value: ribbon.percentRemaining, total: 100)
                    .tint(ribbon.percentRemaining > 20 ? .green : .orange)
            }
        }
    }
    
    private var printersList: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Available Printers:")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            ForEach(availablePrinters, id: \.self) { printer in
                HStack {
                    Image(systemName: "printer")
                    Text(printer)
                    Spacer()
                    Button("Connect") {
                        connectToPrinter(printer)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(.vertical, 4)
            }
        }
    }
    
    private var noPrintersView: some View {
        VStack(spacing: 8) {
            Image(systemName: "printer.dotmatrix")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            
            Text("No printers found")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            Text("Click 'Scan' to search for Evolis printers")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
    
    // MARK: - Quick Actions Grid
    
    private var quickActionsGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ActionCard(
                    icon: "doc.badge.plus",
                    title: "New Design",
                    color: .blue
                ) {
                    appState.currentScreen = .designer
                }
                
                ActionCard(
                    icon: "rectangle.stack",
                    title: "Templates",
                    color: .purple
                ) {
                    appState.currentScreen = .templates
                }
                
                ActionCard(
                    icon: "tablecells",
                    title: "Import Data",
                    color: .green
                ) {
                    appState.currentScreen = .data
                }
            }
        }
    }
    
    // MARK: - Actions
    
    private func searchPrinters() {
        isSearching = true
        connectionError = nil
        
        Task {
            // Run on background thread
            let printers = await withCheckedContinuation { continuation in
                DispatchQueue.global(qos: .userInitiated).async {
                    let result = PrinterService.shared.listPrinters()
                    continuation.resume(returning: result)
                }
            }
            
            await MainActor.run {
                availablePrinters = printers
                isSearching = false
            }
        }
    }
    
    private func connectToPrinter(_ name: String) {
        connectionError = nil
        
        let success = appState.printerService.connect(printerName: name)
        
        if success {
            appState.refreshPrinterStatus()
        } else {
            connectionError = appState.printerService.lastError ?? "Connection failed"
        }
    }
}

// MARK: - Action Card Component

struct ActionCard: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.largeTitle)
                    .foregroundStyle(color)
                    .scaleEffect(isHovered ? 1.15 : 1.0)
                
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(isHovered ? Color(.selectedControlColor) : Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(isHovered ? 0.1 : 0), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .scaleEffect(isHovered ? 1.03 : 1.0)
        .shadow(color: color.opacity(isHovered ? 0.25 : 0), radius: 15, y: 5)
        .rotation3DEffect(.degrees(isHovered ? 3 : 0), axis: (x: 1, y: 0, z: 0))
        .onHover { hovering in
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                isHovered = hovering
            }
        }
    }
}

#Preview {
    DashboardView()
        .environment(AppState())
}
