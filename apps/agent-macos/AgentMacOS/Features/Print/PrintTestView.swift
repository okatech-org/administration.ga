//
//  PrintTestView.swift
//  AgentMacOS
//
//  Test print page — scan printers, connect, and print a test card.
//

import SwiftUI

struct PrintTestView: View {
    @Environment(AppState.self) private var appState

    @State private var availablePrinters: [String] = []
    @State private var isScanning = false
    @State private var isPrinting = false
    @State private var printResult: PrintTestResult?
    @State private var selectedDuplex: DuplexType = .colorColor
    @State private var selectedTray: OutputTrayOption = .standard
    @State private var includeBackSide = true

    private let printerService = PrinterService.shared

    enum PrintTestResult {
        case success
        case error(String)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Test d'impression")
                            .font(.largeTitle.weight(.bold))
                        Text("Vérifiez la connexion et testez l'impression avec une carte de test")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }

                HStack(alignment: .top, spacing: 24) {
                    // Left: Printer connection
                    printerConnectionCard
                        .frame(minWidth: 320)

                    // Right: Test card preview + print
                    VStack(spacing: 16) {
                        testCardPreview
                        printOptionsCard
                    }
                }

                // Result
                if let result = printResult {
                    resultBanner(result)
                }
            }
            .padding(24)
        }
        .background(Color(.windowBackgroundColor))
        .frame(minWidth: 600, minHeight: 400)
        .onAppear {
            scanPrinters()
        }
    }

    // MARK: - Printer Connection Card

    private var printerConnectionCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "printer.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)
                    Text("Imprimante")
                        .font(.headline)
                    Spacer()

                    Button {
                        scanPrinters()
                    } label: {
                        if isScanning {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Label("Scanner", systemImage: "arrow.clockwise")
                        }
                    }
                    .buttonStyle(.bordered)
                    .disabled(isScanning)
                }

                Divider()

                if printerService.isConnected, let printer = printerService.connectedPrinter {
                    // Connected state
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(.green)
                                .frame(width: 10, height: 10)
                            Text("Connectée")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.green)
                        }

                        LabeledContent("Modèle", value: printer.name)
                            .font(.caption)
                        LabeledContent("N° série", value: printer.serialNumber)
                            .font(.caption)
                        LabeledContent("Firmware", value: printer.firmwareVersion)
                            .font(.caption)

                        // Capabilities
                        HStack(spacing: 8) {
                            if printer.hasDuplex {
                                capabilityBadge("Recto/Verso", icon: "rectangle.on.rectangle")
                            }
                            if printer.hasMagEncoder {
                                capabilityBadge("Mag", icon: "wave.3.right")
                            }
                            if printer.hasContactlessEncoder {
                                capabilityBadge("NFC", icon: "wave.3.forward")
                            }
                        }

                        // Ribbon
                        if let ribbon = printerService.ribbonInfo {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("Ruban: \(ribbon.type)")
                                        .font(.caption)
                                    Spacer()
                                    Text("\(ribbon.remaining) / \(ribbon.capacity)")
                                        .font(.caption.monospacedDigit())
                                        .foregroundStyle(.secondary)
                                }
                                ProgressView(value: ribbon.percentRemaining, total: 100)
                                    .tint(ribbon.percentRemaining > 20 ? .green : .orange)
                            }
                        }

                        Button("Déconnecter") {
                            printerService.disconnect()
                            appState.refreshPrinterStatus()
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)
                        .controlSize(.small)
                    }
                } else if !availablePrinters.isEmpty {
                    // Printers found
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Imprimantes disponibles :")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        ForEach(availablePrinters, id: \.self) { name in
                            HStack {
                                Image(systemName: "printer")
                                    .foregroundStyle(.secondary)
                                Text(name)
                                    .font(.subheadline)
                                Spacer()
                                Button("Connecter") {
                                    connectToPrinter(name)
                                }
                                .buttonStyle(.borderedProminent)
                                .controlSize(.small)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                } else {
                    // No printers
                    VStack(spacing: 12) {
                        Image(systemName: "printer.dotmatrix")
                            .font(.system(size: 36))
                            .foregroundStyle(.secondary)
                        Text("Aucune imprimante détectée")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text("Connectez une imprimante Evolis et cliquez sur Scanner")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                }
            }
            .padding(4)
        }
    }

    // MARK: - Test Card Preview

    private var testCardPreview: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 16) {
                Text("Aperçu carte de test")
                    .font(.headline)

                HStack(spacing: 16) {
                    // Front
                    VStack(spacing: 4) {
                        Text("Recto")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        testCardFront
                            .frame(width: 280, height: 176)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .shadow(radius: 4)
                    }

                    if includeBackSide {
                        // Back
                        VStack(spacing: 4) {
                            Text("Verso")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            testCardBack
                                .frame(width: 280, height: 176)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .shadow(radius: 4)
                        }
                    }
                }
            }
            .padding(4)
        }
    }

    /// Test card front design — CR80 proportions
    private var testCardFront: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(red: 0.0, green: 0.45, blue: 0.25), Color(red: 0.0, green: 0.3, blue: 0.15)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("RÉPUBLIQUE GABONAISE")
                            .font(.system(size: 7, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Consulat Général du Gabon")
                            .font(.system(size: 5.5))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    Spacer()
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.yellow)
                }
                .padding(.horizontal, 12)
                .padding(.top, 10)

                Spacer()

                // Center content
                HStack(spacing: 12) {
                    // Photo placeholder
                    RoundedRectangle(cornerRadius: 4)
                        .fill(.white.opacity(0.2))
                        .frame(width: 55, height: 70)
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(.white.opacity(0.5))
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text("CARTE DE TEST")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(.yellow)
                        Text("Agent macOS")
                            .font(.system(size: 7, weight: .semibold))
                            .foregroundStyle(.white)

                        Spacer().frame(height: 4)

                        Group {
                            Text("N° CG-TEST-2026-001")
                            Text("Émise le: \(Date.now.formatted(date: .abbreviated, time: .omitted))")
                            Text("Expire le: 31/12/2026")
                        }
                        .font(.system(size: 5.5))
                        .foregroundStyle(.white.opacity(0.8))
                    }

                    Spacer()
                }
                .padding(.horizontal, 12)

                Spacer()

                // Footer
                HStack {
                    Text("TEST — IMPRESSION UNIQUEMENT")
                        .font(.system(size: 5, weight: .medium))
                        .foregroundStyle(.white.opacity(0.5))
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
        }
    }

    /// Test card back design
    private var testCardBack: some View {
        ZStack {
            Color(red: 0.95, green: 0.95, blue: 0.92)

            VStack(spacing: 8) {
                // Color test bars
                HStack(spacing: 0) {
                    ForEach(["red", "green", "blue", "yellow", "cyan", "magenta", "black", "white"], id: \.self) { colorName in
                        colorForName(colorName)
                            .frame(maxWidth: .infinity, maxHeight: 14)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 2))
                .padding(.horizontal, 12)
                .padding(.top, 12)

                // Grayscale ramp
                HStack(spacing: 0) {
                    ForEach(0..<16, id: \.self) { i in
                        Color(white: Double(i) / 15.0)
                            .frame(maxWidth: .infinity, maxHeight: 10)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 2))
                .padding(.horizontal, 12)

                Spacer()

                // Text test
                VStack(spacing: 2) {
                    Text("Test d'impression Agent macOS")
                        .font(.system(size: 7, weight: .bold))
                        .foregroundStyle(.black)
                    Text("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789")
                        .font(.system(size: 5, weight: .regular, design: .monospaced))
                        .foregroundStyle(.black)
                    Text("Vérifiez la qualité des couleurs, du texte et de l'alignement")
                        .font(.system(size: 5))
                        .foregroundStyle(.gray)
                }

                Spacer()

                // Fine lines test
                VStack(spacing: 2) {
                    ForEach([1.0, 0.5, 0.25], id: \.self) { width in
                        Rectangle()
                            .fill(.black)
                            .frame(height: width)
                            .padding(.horizontal, 20)
                    }
                }

                HStack {
                    Text("diplomate.ga")
                        .font(.system(size: 5))
                        .foregroundStyle(.gray)
                    Spacer()
                    Text("v1.0")
                        .font(.system(size: 5))
                        .foregroundStyle(.gray)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
        }
    }

    // MARK: - Print Options

    private var printOptionsCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                Text("Options")
                    .font(.headline)

                Toggle("Imprimer le verso", isOn: $includeBackSide)
                    .toggleStyle(.switch)

                Picker("Mode", selection: $selectedDuplex) {
                    ForEach(DuplexType.allCases) { type in
                        Text(type.displayName).tag(type)
                    }
                }
                .pickerStyle(.menu)

                Picker("Sortie", selection: $selectedTray) {
                    ForEach(OutputTrayOption.allCases) { tray in
                        Text(tray.displayName).tag(tray)
                    }
                }
                .pickerStyle(.menu)

                Divider()

                Button {
                    Task { await printTestCard() }
                } label: {
                    Group {
                        if isPrinting {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Label("Imprimer la carte de test", systemImage: "printer.fill")
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!printerService.isConnected || isPrinting)
            }
            .padding(4)
        }
    }

    // MARK: - Result Banner

    private func resultBanner(_ result: PrintTestResult) -> some View {
        HStack(spacing: 12) {
            switch result {
            case .success:
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.green)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Impression réussie !")
                        .font(.subheadline.weight(.medium))
                    Text("La carte de test a été envoyée à l'imprimante.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            case .error(let message):
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.red)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Erreur d'impression")
                        .font(.subheadline.weight(.medium))
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()

            Button {
                printResult = nil
            } label: {
                Image(systemName: "xmark")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(resultColor(result).opacity(0.1))
                .strokeBorder(resultColor(result).opacity(0.3))
        )
    }

    // MARK: - Actions

    private func scanPrinters() {
        isScanning = true
        Task {
            let printers = await withCheckedContinuation { continuation in
                DispatchQueue.global(qos: .userInitiated).async {
                    let result = PrinterService.shared.listPrinters()
                    continuation.resume(returning: result)
                }
            }
            await MainActor.run {
                availablePrinters = printers
                isScanning = false
            }
        }
    }

    private func connectToPrinter(_ name: String) {
        let success = printerService.connect(printerName: name)
        if success {
            appState.refreshPrinterStatus()
        }
    }

    private func printTestCard() async {
        isPrinting = true
        printResult = nil

        // Render card images from SwiftUI views
        let frontImage = renderTestCardImage(front: true)
        let backImage = includeBackSide ? renderTestCardImage(front: false) : nil

        guard let front = frontImage else {
            printResult = .error("Impossible de générer l'image recto")
            isPrinting = false
            return
        }

        do {
            try await printerService.printCard(
                frontImage: front,
                backImage: backImage,
                outputTray: selectedTray,
                duplexType: selectedDuplex
            )
            printResult = .success
        } catch {
            printResult = .error(error.localizedDescription)
        }

        isPrinting = false
    }

    /// Render a test card image at CR80 print resolution (1016 x 648 px)
    private func renderTestCardImage(front: Bool) -> NSImage? {
        let width: CGFloat = 1016
        let height: CGFloat = 648

        let image = NSImage(size: NSSize(width: width, height: height))
        image.lockFocus()

        guard let context = NSGraphicsContext.current?.cgContext else {
            image.unlockFocus()
            return nil
        }

        if front {
            drawTestCardFront(in: context, size: CGSize(width: width, height: height))
        } else {
            drawTestCardBack(in: context, size: CGSize(width: width, height: height))
        }

        image.unlockFocus()
        return image
    }

    /// Draw the front of the test card at full resolution
    private func drawTestCardFront(in ctx: CGContext, size: CGSize) {
        let w = size.width
        let h = size.height

        // Background gradient (green)
        let colors = [
            CGColor(red: 0.0, green: 0.45, blue: 0.25, alpha: 1.0),
            CGColor(red: 0.0, green: 0.3, blue: 0.15, alpha: 1.0)
        ]
        let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                   colors: colors as CFArray,
                                   locations: [0, 1])!
        ctx.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: w, y: h), options: [])

        // Header text
        let headerAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 28, weight: .bold),
            .foregroundColor: NSColor.white
        ]
        let title = "RÉPUBLIQUE GABONAISE" as NSString
        title.draw(at: CGPoint(x: 40, y: h - 60), withAttributes: headerAttrs)

        let subAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 20),
            .foregroundColor: NSColor.white.withAlphaComponent(0.8)
        ]
        let subtitle = "Consulat Général du Gabon" as NSString
        subtitle.draw(at: CGPoint(x: 40, y: h - 90), withAttributes: subAttrs)

        // Photo placeholder
        ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 0.2))
        ctx.fill(CGRect(x: 40, y: h - 370, width: 200, height: 250))

        // Name
        let nameAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 32, weight: .bold),
            .foregroundColor: NSColor(red: 1, green: 0.85, blue: 0, alpha: 1)
        ]
        ("CARTE DE TEST" as NSString).draw(at: CGPoint(x: 270, y: h - 170), withAttributes: nameAttrs)

        let infoAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 22, weight: .semibold),
            .foregroundColor: NSColor.white
        ]
        ("Agent macOS" as NSString).draw(at: CGPoint(x: 270, y: h - 205), withAttributes: infoAttrs)

        let detailAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 18),
            .foregroundColor: NSColor.white.withAlphaComponent(0.8)
        ]
        let dateStr = Date.now.formatted(date: .abbreviated, time: .omitted)
        ("N° CG-TEST-2026-001" as NSString).draw(at: CGPoint(x: 270, y: h - 260), withAttributes: detailAttrs)
        ("Émise le: \(dateStr)" as NSString).draw(at: CGPoint(x: 270, y: h - 290), withAttributes: detailAttrs)
        ("Expire le: 31/12/2026" as NSString).draw(at: CGPoint(x: 270, y: h - 320), withAttributes: detailAttrs)

        // Footer
        let footerAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 14),
            .foregroundColor: NSColor.white.withAlphaComponent(0.5)
        ]
        ("TEST — IMPRESSION UNIQUEMENT" as NSString).draw(at: CGPoint(x: 40, y: 20), withAttributes: footerAttrs)
    }

    /// Draw the back of the test card at full resolution
    private func drawTestCardBack(in ctx: CGContext, size: CGSize) {
        let w = size.width
        let h = size.height

        // Background
        ctx.setFillColor(CGColor(red: 0.95, green: 0.95, blue: 0.92, alpha: 1.0))
        ctx.fill(CGRect(origin: .zero, size: size))

        // Color bars
        let barColors: [CGColor] = [
            .init(red: 1, green: 0, blue: 0, alpha: 1),
            .init(red: 0, green: 1, blue: 0, alpha: 1),
            .init(red: 0, green: 0, blue: 1, alpha: 1),
            .init(red: 1, green: 1, blue: 0, alpha: 1),
            .init(red: 0, green: 1, blue: 1, alpha: 1),
            .init(red: 1, green: 0, blue: 1, alpha: 1),
            .init(red: 0, green: 0, blue: 0, alpha: 1),
            .init(red: 1, green: 1, blue: 1, alpha: 1),
        ]
        let barWidth = (w - 80) / CGFloat(barColors.count)
        for (i, color) in barColors.enumerated() {
            ctx.setFillColor(color)
            ctx.fill(CGRect(x: 40 + barWidth * CGFloat(i), y: h - 80, width: barWidth, height: 50))
        }

        // Grayscale ramp
        for i in 0..<16 {
            let gray = CGFloat(i) / 15.0
            ctx.setFillColor(CGColor(gray: gray, alpha: 1))
            let rampW = (w - 80) / 16.0
            ctx.fill(CGRect(x: 40 + rampW * CGFloat(i), y: h - 120, width: rampW, height: 30))
        }

        // Text tests
        let textAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 24, weight: .bold),
            .foregroundColor: NSColor.black
        ]
        ("Test d'impression Agent macOS" as NSString).draw(at: CGPoint(x: 40, y: h / 2 + 20), withAttributes: textAttrs)

        let monoAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.monospacedSystemFont(ofSize: 16, weight: .regular),
            .foregroundColor: NSColor.black
        ]
        ("ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789" as NSString).draw(at: CGPoint(x: 40, y: h / 2 - 10), withAttributes: monoAttrs)

        let smallAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 14),
            .foregroundColor: NSColor.gray
        ]
        ("Vérifiez la qualité des couleurs, du texte et de l'alignement" as NSString).draw(at: CGPoint(x: 40, y: h / 2 - 40), withAttributes: smallAttrs)

        // Fine lines
        for (i, lineWidth) in [2.0, 1.0, 0.5].enumerated() {
            ctx.setStrokeColor(CGColor(gray: 0, alpha: 1))
            ctx.setLineWidth(lineWidth)
            let y = 100 - CGFloat(i) * 20
            ctx.move(to: CGPoint(x: 80, y: y))
            ctx.addLine(to: CGPoint(x: w - 80, y: y))
            ctx.strokePath()
        }

        // Footer
        let footerAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 14),
            .foregroundColor: NSColor.gray
        ]
        ("diplomate.ga" as NSString).draw(at: CGPoint(x: 40, y: 20), withAttributes: footerAttrs)
        ("v1.0" as NSString).draw(at: CGPoint(x: w - 80, y: 20), withAttributes: footerAttrs)
    }

    // MARK: - Helpers

    private func capabilityBadge(_ label: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(label)
                .font(.caption2)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(Color.blue.opacity(0.1))
        .foregroundStyle(.blue)
        .clipShape(Capsule())
    }

    private func colorForName(_ name: String) -> Color {
        switch name {
        case "red": return .red
        case "green": return .green
        case "blue": return .blue
        case "yellow": return .yellow
        case "cyan": return .cyan
        case "magenta": return Color(red: 1, green: 0, blue: 1)
        case "black": return .black
        case "white": return .white
        default: return .gray
        }
    }

    private func resultColor(_ result: PrintTestResult) -> Color {
        switch result {
        case .success: return .green
        case .error: return .red
        }
    }
}

#Preview {
    PrintTestView()
        .environment(AppState())
        .frame(width: 900, height: 700)
}
