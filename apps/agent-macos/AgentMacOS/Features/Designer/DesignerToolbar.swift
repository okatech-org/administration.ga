//
//  DesignerToolbar.swift
//  AgentMacOS
//
//  Optimized designer toolbar with compact icons, flexible layout, and accessibility
//

import SwiftUI
import UniformTypeIdentifiers

struct DesignerToolbar: View {
    @Bindable var viewModel: DesignerViewModel
    @State private var showPrintPreview = false
    
    var body: some View {
        HStack(spacing: 6) {
            // Left section: Creation tools
            leftToolsSection
            
            ToolbarDivider()
            
            // Center section: Card side toggle (prominent)
            cardSideToggle
            
            ToolbarDivider()
            
            // Right section: Actions & zoom
            rightToolsSection
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Barre d'outils du designer")
    }
    
    // MARK: - Left Section (Creation & View)
    
    private var leftToolsSection: some View {
        HStack(spacing: 4) {
            // Element creation tools
            elementToolsGroup
            
            ToolbarDivider()
            
            // View controls (grid, snap)
            viewControlsGroup
            
            ToolbarDivider()
            
            // Background menu
            backgroundMenuButton
            
            ToolbarDivider()
            
            // Alignment menu
            alignmentMenuButton
            
            ToolbarDivider()
            
            // Import
            importButton
        }
    }
    
    // MARK: - Right Section (Actions & Zoom)
    
    private var rightToolsSection: some View {
        HStack(spacing: 4) {
            // Copy/Paste
            copyPasteGroup
            
            ToolbarDivider()
            
            // Undo/Redo
            undoRedoGroup
            
            ToolbarDivider()
            
            // Print button
            printButton
            
            ToolbarDivider()
            
            // Zoom controls
            zoomControls
        }
    }
    
    // MARK: - Element Tools
    
    private var elementToolsGroup: some View {
        HStack(spacing: 2) {
            ForEach(ElementType.allCases, id: \.self) { type in
                ToolbarIconButton(
                    icon: type.icon,
                    label: type.rawValue,
                    action: { viewModel.addElement(type) }
                )
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Outils d'éléments")
    }
    
    // MARK: - View Controls
    
    private var viewControlsGroup: some View {
        HStack(spacing: 2) {
            ToolbarToggleButton(
                icon: "grid",
                label: "Afficher la grille",
                isOn: $viewModel.showGrid
            )
            
            ToolbarToggleButton(
                icon: "rectangle.3.group",
                label: "Alignement intelligent",
                isOn: $viewModel.snapToGrid
            )
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Contrôles de vue")
    }
    
    // MARK: - Background Menu (Compact)
    
    private var backgroundMenuButton: some View {
        Menu {
            Button {
                selectBackgroundImage()
            } label: {
                Label("Choisir une image...", systemImage: "photo.badge.plus")
            }
            
            if viewModel.currentBackgroundImage != nil {
                Divider()
                
                Toggle("Afficher le fond", isOn: $viewModel.showBackground)
                
                Divider()
                
                Menu("Opacité") {
                    Button("25%") { viewModel.backgroundOpacity = 0.25 }
                    Button("50%") { viewModel.backgroundOpacity = 0.50 }
                    Button("75%") { viewModel.backgroundOpacity = 0.75 }
                    Button("100%") { viewModel.backgroundOpacity = 1.0 }
                }
                
                Slider(value: $viewModel.backgroundOpacity, in: 0...1) {
                    Text("Opacité: \(Int(viewModel.backgroundOpacity * 100))%")
                }
                .frame(width: 120)
                
                Divider()
                
                Button(role: .destructive) {
                    viewModel.clearBackgroundImage()
                } label: {
                    Label("Supprimer le fond", systemImage: "trash")
                }
            }
        } label: {
            ToolbarMenuLabel(
                icon: viewModel.currentBackgroundImage != nil ? "photo.fill" : "photo",
                hasContent: viewModel.currentBackgroundImage != nil
            )
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .help("Image de fond de référence (\(viewModel.isEditingBack ? "Verso" : "Recto"))")
        .accessibilityLabel("Menu image de fond")
    }
    
    private func selectBackgroundImage() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.image]
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        
        if panel.runModal() == .OK, let url = panel.url {
            viewModel.setBackgroundImage(from: url)
        }
    }
    
    // MARK: - Card Side Toggle (Centered, No Label)
    
    private var cardSideToggle: some View {
        Picker(selection: $viewModel.isEditingBack) {
            Text("Recto").tag(false)
            Text("Verso").tag(true)
        } label: {
            EmptyView()
        }
        .pickerStyle(.segmented)
        .fixedSize()
        .accessibilityLabel("Face de la carte")
        .accessibilityHint("Recto ou verso")
    }
    
    // MARK: - Alignment Menu (Compact)
    
    private var alignmentMenuButton: some View {
        Menu {
            Section("Horizontal") {
                Button { viewModel.alignLeft() } label: {
                    Label("Aligner à gauche", systemImage: "align.horizontal.left")
                }
                Button { viewModel.alignCenterH() } label: {
                    Label("Centrer horizontalement", systemImage: "align.horizontal.center")
                }
                Button { viewModel.alignRight() } label: {
                    Label("Aligner à droite", systemImage: "align.horizontal.right")
                }
            }
            
            Section("Vertical") {
                Button { viewModel.alignTop() } label: {
                    Label("Aligner en haut", systemImage: "align.vertical.top")
                }
                Button { viewModel.alignMiddle() } label: {
                    Label("Centrer verticalement", systemImage: "align.vertical.center")
                }
                Button { viewModel.alignBottom() } label: {
                    Label("Aligner en bas", systemImage: "align.vertical.bottom")
                }
            }
        } label: {
            ToolbarMenuLabel(icon: "square.on.square.dashed")
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .help("Outils d'alignement")
        .disabled(viewModel.selectedElementId == nil)
        .accessibilityLabel("Menu d'alignement")
    }
    
    // MARK: - Copy/Paste
    
    private var copyPasteGroup: some View {
        HStack(spacing: 2) {
            ToolbarIconButton(
                icon: "doc.on.doc",
                label: "Copier (⌘C)",
                action: viewModel.copySelectedElement
            )
            .disabled(viewModel.selectedElementId == nil)
            .keyboardShortcut("c", modifiers: .command)
            
            ToolbarIconButton(
                icon: "doc.on.clipboard",
                label: "Coller (⌘V)",
                action: viewModel.pasteElement
            )
            .keyboardShortcut("v", modifiers: .command)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Copier et coller")
    }
    
    // MARK: - Undo/Redo
    
    private var undoRedoGroup: some View {
        HStack(spacing: 2) {
            ToolbarIconButton(
                icon: "arrow.uturn.backward",
                label: "Annuler (⌘Z)",
                action: viewModel.undo
            )
            .disabled(!viewModel.canUndo)
            .keyboardShortcut("z", modifiers: .command)
            
            ToolbarIconButton(
                icon: "arrow.uturn.forward",
                label: "Rétablir (⌘⇧Z)",
                action: viewModel.redo
            )
            .disabled(!viewModel.canRedo)
            .keyboardShortcut("z", modifiers: [.command, .shift])
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Annuler et rétablir")
    }
    
    // MARK: - Zoom Controls
    
    private var zoomControls: some View {
        HStack(spacing: 2) {
            ToolbarIconButton(
                icon: "minus.magnifyingglass",
                label: "Zoom arrière",
                action: viewModel.zoomOut
            )
            
            Button {
                viewModel.resetZoom()
            } label: {
                Text("\(Int(viewModel.canvasScale * 100))%")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .frame(minWidth: 36)
            }
            .buttonStyle(.plain)
            .help("Réinitialiser le zoom")
            .accessibilityLabel("Niveau de zoom \(Int(viewModel.canvasScale * 100)) pourcent")
            .accessibilityHint("Double-cliquer pour réinitialiser")
            
            ToolbarIconButton(
                icon: "plus.magnifyingglass",
                label: "Zoom avant",
                action: viewModel.zoomIn
            )
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Contrôles de zoom")
    }
    
    // MARK: - Print Button (Prominent)
    
    private var printButton: some View {
        Button {
            showPrintPreview = true
        } label: {
            Image(systemName: "printer.fill")
                .font(.system(size: 12, weight: .medium))
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.small)
        .help("Aperçu avant impression (⌘P)")
        .keyboardShortcut("p", modifiers: .command)
        .sheet(isPresented: $showPrintPreview) {
            PrintPreviewView(viewModel: viewModel)
        }
        .accessibilityLabel("Imprimer")
        .accessibilityHint("Ouvre l'aperçu avant impression")
    }
    
    // MARK: - Import Button
    
    private var importButton: some View {
        ToolbarIconButton(
            icon: "square.and.arrow.down",
            label: "Importer un modèle",
            action: importTemplate
        )
    }
    
    private func importTemplate() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.json]
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.message = "Sélectionnez un fichier modèle AgentMacOS (.agentmacos ou .json)"
        
        if panel.runModal() == .OK, let url = panel.url {
            do {
                let data = try Data(contentsOf: url)
                
                guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    showAlert(title: "Erreur d'import", message: "Impossible de parser le JSON")
                    return
                }
                
                // Import name
                if let name = json["name"] as? String, !name.isEmpty {
                    viewModel.template.name = name
                }
                
                // Import background settings
                if let bgColor = json["backgroundColor"] as? String {
                    viewModel.template.backgroundColor = bgColor
                }
                if let bgOpacity = json["backgroundOpacity"] as? Double {
                    viewModel.template.backgroundOpacity = bgOpacity
                }
                if let duplex = json["printDuplex"] as? Bool {
                    viewModel.template.printDuplex = duplex
                }
                if let tracks = json["magneticTracks"] as? [String] {
                    viewModel.template.magneticTracks = tracks
                }
                
                // Import front elements
                var frontCount = 0
                if let frontElements = json["frontElements"] as? [[String: Any]] {
                    let parsed = frontElements.compactMap { parseElement($0) }
                    viewModel.template.frontElements = parsed
                    frontCount = parsed.count
                }
                
                // Import back elements
                var backCount = 0
                if let backElements = json["backElements"] as? [[String: Any]] {
                    let parsed = backElements.compactMap { parseElement($0) }
                    viewModel.template.backElements = parsed
                    backCount = parsed.count
                }
                
                showAlert(
                    title: "Import réussi",
                    message: "Importé \(frontCount) éléments recto et \(backCount) éléments verso.\n\nModèle: \(viewModel.template.name)"
                )
                
            } catch {
                showAlert(title: "Erreur d'import", message: "Échec de l'import: \(error.localizedDescription)")
            }
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = title.contains("Erreur") ? .warning : .informational
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
    
    private func parseElement(_ dict: [String: Any]) -> CardElement? {
        guard let typeString = dict["type"] as? String else {
            print("Missing type in element: \(dict)")
            return nil
        }
        
        let typeMapping: [String: ElementType] = [
            "text": .text, "Text": .text,
            "image": .image, "Image": .image,
            "qrCode": .qrCode, "qr_code": .qrCode, "QR Code": .qrCode,
            "barcode": .barcode, "Barcode": .barcode,
            "rectangle": .rectangle, "Rectangle": .rectangle,
            "circle": .circle, "Circle": .circle,
            "line": .line, "Line": .line
        ]
        
        guard let type = typeMapping[typeString] else {
            print("Unknown type '\(typeString)' in element")
            return nil
        }
        
        var element = CardElement(
            id: UUID(),
            type: type,
            x: CGFloat(dict["x"] as? Double ?? 50),
            y: CGFloat(dict["y"] as? Double ?? 50),
            width: CGFloat(dict["width"] as? Double ?? 100),
            height: CGFloat(dict["height"] as? Double ?? 50)
        )
        
        // Common properties
        element.rotation = dict["rotation"] as? Double ?? 0
        element.isLocked = dict["isLocked"] as? Bool ?? false
        element.isVisible = dict["isVisible"] as? Bool ?? true
        element.zIndex = dict["zIndex"] as? Int ?? 0
        
        // Text properties
        element.textContent = dict["textContent"] as? String ?? ""
        element.fontName = dict["fontName"] as? String ?? "Helvetica"
        element.fontSize = CGFloat(dict["fontSize"] as? Double ?? 14)
        element.textColor = dict["textColor"] as? String ?? "#000000"
        if let alignStr = dict["textAlignment"] as? String {
            switch alignStr {
            case "center": element.textAlignment = .center
            case "trailing": element.textAlignment = .trailing
            default: element.textAlignment = .leading
            }
        }
        element.isBold = dict["isBold"] as? Bool ?? false
        element.isItalic = dict["isItalic"] as? Bool ?? false
        
        // Dynamic fields
        element.isDynamicField = dict["isDynamicField"] as? Bool ?? false
        element.fieldKey = dict["fieldKey"] as? String ?? ""
        
        // Shape properties
        element.fillColor = dict["fillColor"] as? String ?? "#FFFFFF"
        element.strokeColor = dict["strokeColor"] as? String ?? "#000000"
        element.strokeWidth = CGFloat(dict["strokeWidth"] as? Double ?? 1)
        element.cornerRadius = CGFloat(dict["cornerRadius"] as? Double ?? 0)
        
        // Code content
        element.codeContent = dict["codeContent"] as? String ?? ""
        
        return element
    }
}

// MARK: - Reusable Toolbar Components

/// Compact divider for toolbar
struct ToolbarDivider: View {
    var body: some View {
        Divider()
            .frame(height: 20)
            .padding(.horizontal, 6)
    }
}

/// Icon-only button with hover state and accessibility
struct ToolbarIconButton: View {
    let icon: String
    let label: String
    let action: () -> Void
    
    @State private var isHovered = false
    @Environment(\.isEnabled) private var isEnabled
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(isEnabled ? (isHovered ? .primary : .secondary) : .tertiary)
                .frame(width: 28, height: 28)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isHovered && isEnabled ? Color(.selectedControlColor) : .clear)
                )
                .scaleEffect(isHovered && isEnabled ? 1.1 : 1.0)
        }
        .buttonStyle(.plain)
        .help(label)
        .onHover { hovering in
            withAnimation(.spring(response: 0.25, dampingFraction: 0.6)) {
                isHovered = hovering
            }
        }
        .accessibilityLabel(label)
    }
}

/// Toggle button for toolbar with visual on/off state
struct ToolbarToggleButton: View {
    let icon: String
    let label: String
    @Binding var isOn: Bool
    
    @State private var isHovered = false
    
    var body: some View {
        Button {
            isOn.toggle()
        } label: {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(isOn ? .white : (isHovered ? .primary : .secondary))
                .frame(width: 28, height: 28)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isOn ? Color.accentColor : (isHovered ? Color(.selectedControlColor) : .clear))
                )
        }
        .buttonStyle(.plain)
        .help(label)
        .onHover { hovering in
            isHovered = hovering
        }
        .accessibilityLabel(label)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

/// Menu label for compact toolbar menus
struct ToolbarMenuLabel: View {
    let icon: String
    var hasContent: Bool = false
    
    var body: some View {
        Image(systemName: icon)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(hasContent ? .primary : .secondary)
            .frame(width: 28, height: 28)
    }
}

#Preview {
    DesignerToolbar(viewModel: DesignerViewModel())
}
