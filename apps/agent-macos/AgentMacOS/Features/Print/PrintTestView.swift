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

    /// Test card front — minimal design, white background to save ink
    private var testCardFront: some View {
        ZStack {
            Color.white

            VStack(spacing: 0) {
                // Thin colored header bar
                Rectangle()
                    .fill(Color(red: 0.0, green: 0.45, blue: 0.25))
                    .frame(height: 16)

                Spacer()

                VStack(spacing: 6) {
                    Text("CARTE DE TEST")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.black)

                    Text("Agent macOS — \(Date.now.formatted(date: .abbreviated, time: .omitted))")
                        .font(.system(size: 6))
                        .foregroundStyle(.gray)

                    // Small color swatches
                    HStack(spacing: 3) {
                        ForEach(["red", "green", "blue", "yellow", "cyan", "magenta", "black"], id: \.self) { c in
                            colorForName(c)
                                .frame(width: 18, height: 10)
                        }
                    }
                }

                Spacer()

                // Thin footer
                Text("TEST IMPRESSION")
                    .font(.system(size: 5))
                    .foregroundStyle(.gray)
                    .padding(.bottom, 6)
            }
        }
    }

    /// Test card back — grayscale + text check on white
    private var testCardBack: some View {
        ZStack {
            Color.white

            VStack(spacing: 8) {
                Spacer()

                // Grayscale ramp
                HStack(spacing: 0) {
                    ForEach(0..<8, id: \.self) { i in
                        Color(white: Double(i) / 7.0)
                            .frame(maxWidth: .infinity, maxHeight: 10)
                    }
                }
                .padding(.horizontal, 20)

                // Text
                Text("ABCDEFGHIJKLM 0123456789")
                    .font(.system(size: 6, design: .monospaced))
                    .foregroundStyle(.black)

                // Fine lines
                VStack(spacing: 3) {
                    ForEach([1.0, 0.5], id: \.self) { w in
                        Rectangle()
                            .fill(.black)
                            .frame(height: w)
                            .padding(.horizontal, 30)
                    }
                }

                Text("diplomate.ga")
                    .font(.system(size: 5))
                    .foregroundStyle(.gray)

                Spacer()
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
    ///
    /// Uses the same CGContext-based approach as CardRenderer to ensure
    /// correct orientation when converted to BMP for the Evolis SDK.
    /// Do NOT use NSImage.lockFocus() — it creates a different internal
    /// representation that causes 90° rotation in bmpData().
    private func renderTestCardImage(front: Bool) -> NSImage? {
        let width = 1016
        let height = 648

        // Create CGContext directly (same as CardRenderer)
        guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
        guard let cgContext = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        ) else { return nil }

        // Set up NSGraphicsContext for text drawing (flipped: false = standard CG coords)
        let nsContext = NSGraphicsContext(cgContext: cgContext, flipped: false)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = nsContext

        let size = CGSize(width: CGFloat(width), height: CGFloat(height))
        if front {
            drawTestCardFront(in: cgContext, size: size)
        } else {
            drawTestCardBack(in: cgContext, size: size)
        }

        NSGraphicsContext.restoreGraphicsState()

        // Create NSImage from CGContext (same as CardRenderer)
        guard let cgImage = cgContext.makeImage() else { return nil }
        return NSImage(cgImage: cgImage, size: NSSize(width: width, height: height))
    }

    /// Draw the front — white background, thin green bar, centered text, small color swatches
    /// Uses safe margins (24px = ~2mm) to avoid Evolis non-printable border area
    private func drawTestCardFront(in ctx: CGContext, size: CGSize) {
        let w = size.width
        let h = size.height

        // Safe margins — Evolis printers have ~1-2mm non-printable border
        let margin: CGFloat = 24 // ~2mm at 300 DPI

        // White background
        ctx.setFillColor(CGColor.white)
        ctx.fill(CGRect(origin: .zero, size: size))

        // Thin green header bar (inside safe area)
        ctx.setFillColor(CGColor(red: 0, green: 0.45, blue: 0.25, alpha: 1))
        ctx.fill(CGRect(x: margin, y: h - margin - 36, width: w - margin * 2, height: 36))

        // Title — centered vertically
        let titleAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 36, weight: .bold),
            .foregroundColor: NSColor.black
        ]
        let title = "CARTE DE TEST" as NSString
        let titleSize = title.size(withAttributes: titleAttrs)
        title.draw(at: CGPoint(x: (w - titleSize.width) / 2, y: h / 2 + 20), withAttributes: titleAttrs)

        // Subtitle
        let subAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 20),
            .foregroundColor: NSColor.gray
        ]
        let dateStr = Date.now.formatted(date: .abbreviated, time: .omitted)
        let sub = "Agent macOS — \(dateStr)" as NSString
        let subSize = sub.size(withAttributes: subAttrs)
        sub.draw(at: CGPoint(x: (w - subSize.width) / 2, y: h / 2 - 15), withAttributes: subAttrs)

        // Small color swatches centered (inside safe area)
        let swatchColors: [CGColor] = [
            .init(red: 1, green: 0, blue: 0, alpha: 1),
            .init(red: 0, green: 0.7, blue: 0, alpha: 1),
            .init(red: 0, green: 0, blue: 1, alpha: 1),
            .init(red: 1, green: 1, blue: 0, alpha: 1),
            .init(red: 0, green: 1, blue: 1, alpha: 1),
            .init(red: 1, green: 0, blue: 1, alpha: 1),
            .init(red: 0, green: 0, blue: 0, alpha: 1),
        ]
        let swatchW: CGFloat = 55
        let swatchH: CGFloat = 28
        let gap: CGFloat = 8
        let totalW = CGFloat(swatchColors.count) * swatchW + CGFloat(swatchColors.count - 1) * gap
        let startX = (w - totalW) / 2
        let swatchY = h / 2 - 70
        for (i, color) in swatchColors.enumerated() {
            ctx.setFillColor(color)
            ctx.fill(CGRect(x: startX + CGFloat(i) * (swatchW + gap), y: swatchY, width: swatchW, height: swatchH))
        }

        // Footer (inside safe area)
        let footerAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 14),
            .foregroundColor: NSColor.lightGray
        ]
        let footer = "TEST IMPRESSION" as NSString
        let footerSize = footer.size(withAttributes: footerAttrs)
        footer.draw(at: CGPoint(x: (w - footerSize.width) / 2, y: margin + 8), withAttributes: footerAttrs)

        // Draw margin guide — thin gray border showing the safe area boundary
        ctx.setStrokeColor(CGColor(gray: 0.85, alpha: 1))
        ctx.setLineWidth(0.5)
        ctx.stroke(CGRect(x: margin, y: margin, width: w - margin * 2, height: h - margin * 2))
    }

    /// Draw the back — white background, grayscale ramp, text, fine lines
    /// Uses safe margins (24px = ~2mm) to avoid Evolis non-printable border area
    private func drawTestCardBack(in ctx: CGContext, size: CGSize) {
        let w = size.width
        let h = size.height

        // Safe margins
        let margin: CGFloat = 24

        // White background
        ctx.setFillColor(CGColor.white)
        ctx.fill(CGRect(origin: .zero, size: size))

        // Grayscale ramp (inside safe area)
        let rampCount = 8
        let rampPadding: CGFloat = margin + 40
        let rampW = (w - rampPadding * 2) / CGFloat(rampCount)
        for i in 0..<rampCount {
            let gray = CGFloat(i) / CGFloat(rampCount - 1)
            ctx.setFillColor(CGColor(gray: gray, alpha: 1))
            ctx.fill(CGRect(x: rampPadding + rampW * CGFloat(i), y: h / 2 + 40, width: rampW, height: 36))
        }

        // Text
        let monoAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.monospacedSystemFont(ofSize: 18, weight: .regular),
            .foregroundColor: NSColor.black
        ]
        let text = "ABCDEFGHIJKLM 0123456789" as NSString
        let textSize = text.size(withAttributes: monoAttrs)
        text.draw(at: CGPoint(x: (w - textSize.width) / 2, y: h / 2 - 10), withAttributes: monoAttrs)

        // Fine lines (inside safe area)
        let lineInset: CGFloat = margin + 60
        for (i, lineWidth) in [2.0, 1.0].enumerated() {
            ctx.setStrokeColor(CGColor(gray: 0, alpha: 1))
            ctx.setLineWidth(lineWidth)
            let y = h / 2 - 50 - CGFloat(i) * 25
            ctx.move(to: CGPoint(x: lineInset, y: y))
            ctx.addLine(to: CGPoint(x: w - lineInset, y: y))
            ctx.strokePath()
        }

        // Footer (inside safe area)
        let footerAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 14),
            .foregroundColor: NSColor.gray
        ]
        let footer = "diplomate.ga" as NSString
        let footerSize = footer.size(withAttributes: footerAttrs)
        footer.draw(at: CGPoint(x: (w - footerSize.width) / 2, y: margin + 8), withAttributes: footerAttrs)

        // Draw margin guide
        ctx.setStrokeColor(CGColor(gray: 0.85, alpha: 1))
        ctx.setLineWidth(0.5)
        ctx.stroke(CGRect(x: margin, y: margin, width: w - margin * 2, height: h - margin * 2))
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
