//
//  PrintPreviewView.swift
//  AgentMacOS
//
//  Print preview and print dialog
//

import SwiftUI

struct PrintPreviewView: View {
    @Bindable var viewModel: DesignerViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var frontPreview: NSImage?
    @State private var backPreview: NSImage?
    @State private var isGenerating = false
    @State private var error: String?
    @State private var showingDataEditor = false
    
    // Print settings
    @State private var copies = 1
    @State private var outputTray: OutputTrayOption = .standard
    @State private var duplexType: DuplexType = .colorColor
    
    // NFC Settings
    @State private var nfcEnabled = false
    @State private var nfcType: NFCPayloadType = .url
    @State private var nfcData = ""
    
    enum NFCPayloadType: String, CaseIterable, Identifiable {
        case url = "URL"
        case text = "Texte"
        var id: String { rawValue }
    }
    
    @State private var testData: [String: String] = [:]
    
    private let renderer = CardRenderer()
    private let printerService = PrinterService.shared
    private let queueManager = PrintQueueManager.shared
    
    /// Default values for common field keys
    private let defaultValues: [String: String] = [
        "nom": "MBINA",
        "prenom": "Therneeskens",
        "date_emission": "05/02/2025",
        "date_expiration": "05/02/2028",
        "num_carte": "FR24270173-00021",
        "nip": "28GA18922",
        "qr_url": "https://consulat-gabon.fr/verify/FR24270173",
        "photo_url": "https://randomuser.me/api/portraits/men/32.jpg",
        "photo": "https://randomuser.me/api/portraits/men/32.jpg",
        "image_url": "https://randomuser.me/api/portraits/women/44.jpg"
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            header
            
            Divider()
            
            HStack(spacing: 0) {
                // Preview area
                previewArea
                    .frame(minWidth: 500)
                
                Divider()
                
                // Settings panel
                settingsPanel
                    .frame(width: 280)
            }
            
            Divider()
            
            // Footer with actions
            footer
        }
        .frame(minWidth: 800, minHeight: 600)
        .onAppear {
            initializeTestData()
            generatePreview()
        }
    }
    
    /// Initialize testData from template's dynamic fields
    private func initializeTestData() {
        var fields: [String: String] = [:]
        
        // Collect all dynamic field keys from front and back elements
        let allElements = viewModel.template.frontElements + viewModel.template.backElements
        
        for element in allElements {
            if element.isDynamicField && !element.fieldKey.isEmpty {
                // Use default value if available, otherwise empty string
                let defaultValue = defaultValues[element.fieldKey.lowercased()] ?? ""
                fields[element.fieldKey] = defaultValue
            }
        }
        
        testData = fields
    }
    
    // MARK: - Header
    
    private var header: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("Print Preview")
                    .font(.headline)
                Text(viewModel.template.name)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            // Printer status
            HStack(spacing: 8) {
                Circle()
                    .fill(printerService.isConnected ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
                
                if let printer = printerService.connectedPrinter {
                    Text(printer.name)
                        .font(.caption)
                } else {
                    Text("No printer connected")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
        .padding()
    }
    
    // MARK: - Preview Area
    
    private var previewArea: some View {
        VStack(spacing: 16) {
            if isGenerating {
                ProgressView("Generating preview...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = error {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(.orange)
                    Text(error)
                        .foregroundStyle(.secondary)
                    Button("Retry") {
                        generatePreview()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Card previews
                HStack(spacing: 24) {
                    // Front
                    VStack(spacing: 8) {
                        Text("FRONT")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        
                        if let frontImage = frontPreview {
                            Image(nsImage: frontImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxHeight: 300)
                                .shadow(radius: 4)
                        } else {
                            Rectangle()
                                .fill(.quaternary)
                                .aspectRatio(1016/648, contentMode: .fit)
                                .frame(maxHeight: 300)
                        }
                    }
                    
                    // Back (if duplex)
                    if viewModel.template.printDuplex {
                        VStack(spacing: 8) {
                            Text("BACK")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            
                            if let backImage = backPreview {
                                Image(nsImage: backImage)
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(maxHeight: 300)
                                    .shadow(radius: 4)
                            } else {
                                Rectangle()
                                    .fill(.quaternary)
                                    .aspectRatio(1016/648, contentMode: .fit)
                                    .frame(maxHeight: 300)
                            }
                        }
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Color(.windowBackgroundColor))
    }
    
    // MARK: - Settings Panel
    
    private var settingsPanel: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Print Settings
                GroupBox("Print Settings") {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Copies:")
                            Spacer()
                            TextField("", value: $copies, format: .number)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 60)
                            Stepper("", value: $copies, in: 1...100)
                                .labelsHidden()
                        }
                        
                        Toggle("Duplex (Print both sides)", isOn: $viewModel.template.printDuplex)
                        
                        if viewModel.template.printDuplex {
                            Picker("Duplex Mode", selection: $duplexType) {
                                ForEach(DuplexType.allCases) { type in
                                    Text(type.displayName).tag(type)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        
                        Picker("Output Tray", selection: $outputTray) {
                            ForEach(OutputTrayOption.allCases) { tray in
                                Text(tray.displayName).tag(tray)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                    .padding(.vertical, 4)
                }
                
                // NFC Encoding
                if let printer = printerService.connectedPrinter, printer.hasContactlessEncoder {
                    GroupBox("Encodage NFC") {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle("Activer l'encodage", isOn: $nfcEnabled)
                            
                            if nfcEnabled {
                                Picker("Type", selection: $nfcType) {
                                    ForEach(NFCPayloadType.allCases) { type in
                                        Text(type.rawValue).tag(type)
                                    }
                                }
                                .pickerStyle(.segmented)
                                
                                TextField(nfcType == .url ? "https://..." : "Texte libre", text: $nfcData)
                                    .textFieldStyle(.roundedBorder)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                // Test Data
                GroupBox("Test Data") {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(testData.keys.sorted()), id: \.self) { key in
                            HStack {
                                Text(key)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 80, alignment: .leading)
                                TextField("", text: Binding(
                                    get: { testData[key] ?? "" },
                                    set: { testData[key] = $0 }
                                ))
                                .textFieldStyle(.roundedBorder)
                                .font(.caption)
                            }
                        }
                        
                        Button("Refresh Preview") {
                            generatePreview()
                        }
                        .buttonStyle(.link)
                    }
                    .padding(.vertical, 4)
                }
                
                // NFC Encoding
                if let printer = printerService.connectedPrinter, printer.hasContactlessEncoder {
                    GroupBox("Encodage NFC") {
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle("Activer l'encodage", isOn: $nfcEnabled)
                            
                            if nfcEnabled {
                                Picker("Type", selection: $nfcType) {
                                    ForEach(NFCPayloadType.allCases) { type in
                                        Text(type.rawValue).tag(type)
                                    }
                                }
                                .pickerStyle(.segmented)
                                
                                TextField(nfcType == .url ? "https://..." : "Texte libre", text: $nfcData)
                                    .textFieldStyle(.roundedBorder)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                // Magnetic Encoding
                if let printer = printerService.connectedPrinter, printer.hasMagEncoder {
                    GroupBox("Magnetic Encoding") {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(0..<3, id: \.self) { track in
                                HStack {
                                    Text("Track \(track + 1):")
                                        .font(.caption)
                                        .frame(width: 60, alignment: .leading)
                                    TextField("", text: Binding(
                                        get: { viewModel.template.magneticTracks[safe: track] ?? "" },
                                        set: { 
                                            while viewModel.template.magneticTracks.count <= track {
                                                viewModel.template.magneticTracks.append("")
                                            }
                                            viewModel.template.magneticTracks[track] = $0
                                        }
                                    ))
                                    .textFieldStyle(.roundedBorder)
                                    .font(.caption.monospaced())
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                // Ribbon Info
                if let ribbon = printerService.ribbonInfo {
                    GroupBox("Ribbon Status") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(ribbon.type)
                                .font(.caption)
                            
                            ProgressView(value: ribbon.percentRemaining, total: 100)
                            
                            Text("\(ribbon.remaining) / \(ribbon.capacity) remaining")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                // Printer Capabilities
                if let printer = printerService.connectedPrinter {
                    GroupBox("Printer Capabilities") {
                        VStack(alignment: .leading, spacing: 6) {
                            capabilityRow("Duplex", available: printer.hasDuplex)
                            capabilityRow("NFC / Contactless", available: printer.hasContactlessEncoder)
                            capabilityRow("Smart Card", available: printer.hasSmartEncoder)
                            capabilityRow("Magnetic Stripe", available: printer.hasMagEncoder)
                            capabilityRow("Laminator", available: printer.hasLaminator)
                            capabilityRow("Scanner", available: printer.hasScanner)
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                Spacer()
            }
            .padding()
        }
    }
    
    // MARK: - Footer
    
    private var footer: some View {
        HStack {
            Button("Cancel") {
                dismiss()
            }
            .keyboardShortcut(.cancelAction)
            
            Spacer()
            
            Button("Add to Queue") {
                addToQueue()
            }
            
            Button("Print Now") {
                printNow()
            }
            .buttonStyle(.borderedProminent)
            .disabled(!printerService.isConnected)
            .keyboardShortcut(.defaultAction)
        }
        .padding()
    }
    
    // MARK: - Actions
    
    private func generatePreview() {
        isGenerating = true
        error = nil
        
        // Capture data to pass to background thread
        let template = viewModel.template
        let data = testData
        
        // Use Task.detached to run off MainActor (background thread)
        Task.detached(priority: .userInitiated) {
            do {
                // Use the shared instance directly or captured reference
                let (front, back) = try await PrintQueueManager.shared.generatePreview(
                    template: template,
                    data: data
                )
                
                await MainActor.run {
                    self.frontPreview = front
                    self.backPreview = back
                    self.isGenerating = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isGenerating = false
                }
            }
        }
    }
    
    private func addToQueue() {
        for _ in 0..<copies {
            queueManager.addJob(
                template: viewModel.template,
                data: testData,
                recordName: testData["nom"] ?? "Untitled",
                nfcPayload: makeNFCPayload(),
                outputTray: outputTray,
                duplexType: duplexType
            )
        }
        dismiss()
    }
    
    private func printNow() {
        for _ in 0..<copies {
            queueManager.addJob(
                template: viewModel.template,
                data: testData,
                recordName: testData["nom"] ?? "Untitled",
                nfcPayload: makeNFCPayload(),
                outputTray: outputTray,
                duplexType: duplexType
            )
        }
        queueManager.startProcessing()
        dismiss()
    }
    
    private func capabilityRow(_ name: String, available: Bool) -> some View {
        HStack {
            Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle")
                .foregroundStyle(available ? .green : .secondary)
                .font(.caption)
            Text(name)
                .font(.caption)
            Spacer()
        }
    }
    private func makeNFCPayload() -> NFCPayload? {
        guard nfcEnabled, !nfcData.isEmpty else { return nil }
        switch nfcType {
        case .url: return NFCPayload(type: .url, data: nfcData)
        case .text: return NFCPayload(type: .text, data: nfcData)
        default: return nil
        }
    }
}

// MARK: - Safe Array Access

extension Array {
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}

#Preview {
    PrintPreviewView(viewModel: DesignerViewModel())
}
