//
//  PropertiesPanel.swift
//  AgentMacOS
//
//  Properties panel for editing selected element
//

import SwiftUI
import UniformTypeIdentifiers
import AppKit

struct PropertiesPanel: View {
    @Bindable var viewModel: DesignerViewModel
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let element = viewModel.selectedElement {
                    selectedElementProperties(element)
                } else {
                    noSelectionView
                }
            }
            .padding(16)
        }
        .frame(width: 260)
        .background(Color(.controlBackgroundColor))
    }
    
    // MARK: - No Selection View
    
    private var noSelectionView: some View {
        VStack(spacing: 12) {
            Image(systemName: "cursorarrow.click.2")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            
            Text("No Selection")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Text("Select an element on the canvas to edit its properties")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 40)
    }
    
    // MARK: - Selected Element Properties
    
    @ViewBuilder
    private func selectedElementProperties(_ element: CardElement) -> some View {
        // Header
        HStack {
            Image(systemName: element.type.icon)
            Text(element.type.rawValue)
                .font(.headline)
            Spacer()
            
            Menu {
                Button("Bring to Front", action: viewModel.bringToFront)
                Button("Send to Back", action: viewModel.sendToBack)
                Divider()
                Button("Duplicate", action: viewModel.duplicateSelectedElement)
                Divider()
                Button("Delete", role: .destructive, action: viewModel.deleteSelectedElement)
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            .menuStyle(.borderlessButton)
            .frame(width: 24)
        }
        
        Divider()
        
        // Position & Size
        positionSizeSection(element)
        
        Divider()
        
        // Type-specific properties
        switch element.type {
        case .text:
            textProperties(element)
        case .image:
            imageProperties(element)
        case .rectangle, .circle:
            shapeProperties(element)
        case .qrCode, .barcode:
            codeProperties(element)
        case .line:
            lineProperties(element)
        }
        
        Divider()
        
        // Dynamic field toggle
        dynamicFieldSection(element)
    }
    
    // MARK: - Position & Size Section
    
    private func positionSizeSection(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Position & Size")
                .font(.subheadline)
                .fontWeight(.medium)
            
            HStack(spacing: 8) {
                PropertyField(label: "X", value: binding(for: element, keyPath: \.x))
                PropertyField(label: "Y", value: binding(for: element, keyPath: \.y))
            }
            
            HStack(spacing: 8) {
                PropertyField(label: "W", value: binding(for: element, keyPath: \.width))
                PropertyField(label: "H", value: binding(for: element, keyPath: \.height))
            }
            
            // Rotation control
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Rotation")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(Int(element.rotation))°")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 8) {
                    Slider(value: rotationBinding(for: element), in: 0...360, step: 1)
                    Button {
                        var updated = element
                        updated.rotation = 0
                        viewModel.selectedElement = updated
                    } label: {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.caption)
                    }
                    .buttonStyle(.plain)
                    .help("Reset rotation")
                }
            }
        }
    }
    
    // MARK: - Text Properties
    
    private func textProperties(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Text")
                .font(.subheadline)
                .fontWeight(.medium)
            
            TextField("Content", text: textBinding(for: element))
                .textFieldStyle(.roundedBorder)
            
            HStack {
                Picker("Font", selection: fontBinding(for: element)) {
                    Text("Helvetica").tag("Helvetica")
                    Text("Arial").tag("Arial")
                    Text("Times New Roman").tag("Times New Roman")
                    Text("Courier New").tag("Courier New")
                }
                .labelsHidden()
            }
            
            HStack(spacing: 8) {
                PropertyField(label: "Size", value: binding(for: element, keyPath: \.fontSize), suffix: "pt")
                
                ColorPicker("", selection: colorBinding(for: element, keyPath: \.textColor))
                    .labelsHidden()
                    .frame(width: 30)
            }
            
            HStack(spacing: 4) {
                Toggle(isOn: boldBinding(for: element)) {
                    Image(systemName: "bold")
                }
                .toggleStyle(.button)
                
                Toggle(isOn: italicBinding(for: element)) {
                    Image(systemName: "italic")
                }
                .toggleStyle(.button)
                
                Spacer()
            }
        }
    }
    
    // MARK: - Image Properties
    
    private func imageProperties(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Image")
                .font(.subheadline)
                .fontWeight(.medium)
            
            Button("Choose Image...") {
                selectImage(for: element)
            }
            .buttonStyle(.bordered)
            
            if element.imageData != nil {
                Button("Clear Image", role: .destructive) {
                    clearImage(for: element)
                }
                .buttonStyle(.borderless)
                .foregroundStyle(.red)
            }
        }
    }
    
    // MARK: - Shape Properties
    
    private func shapeProperties(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Shape")
                .font(.subheadline)
                .fontWeight(.medium)
            
            HStack {
                Text("Fill")
                    .font(.caption)
                Spacer()
                ColorPicker("", selection: colorBinding(for: element, keyPath: \.fillColor))
                    .labelsHidden()
            }
            
            HStack {
                Text("Stroke")
                    .font(.caption)
                Spacer()
                ColorPicker("", selection: colorBinding(for: element, keyPath: \.strokeColor))
                    .labelsHidden()
            }
            
            PropertyField(label: "Stroke Width", value: binding(for: element, keyPath: \.strokeWidth), suffix: "px")
            
            if element.type == .rectangle {
                PropertyField(label: "Corner Radius", value: binding(for: element, keyPath: \.cornerRadius), suffix: "px")
            }
        }
    }
    
    // MARK: - Code Properties
    
    private func codeProperties(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(element.type == .qrCode ? "QR Code" : "Barcode")
                .font(.subheadline)
                .fontWeight(.medium)
            
            TextField("Content", text: codeContentBinding(for: element))
                .textFieldStyle(.roundedBorder)
        }
    }
    
    // MARK: - Line Properties
    
    private func lineProperties(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Line")
                .font(.subheadline)
                .fontWeight(.medium)
            
            HStack {
                Text("Color")
                    .font(.caption)
                Spacer()
                ColorPicker("", selection: colorBinding(for: element, keyPath: \.strokeColor))
                    .labelsHidden()
            }
            
            PropertyField(label: "Thickness", value: binding(for: element, keyPath: \.height), suffix: "px")
        }
    }
    
    // MARK: - Dynamic Field Section
    
    private func dynamicFieldSection(_ element: CardElement) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle("Dynamic Field", isOn: dynamicBinding(for: element))
            
            if element.isDynamicField {
                TextField("Field Key", text: fieldKeyBinding(for: element))
                    .textFieldStyle(.roundedBorder)
                
                Text("Use the field key in your data source to populate this element dynamically")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
    
    // MARK: - Image Actions
    
    private func selectImage(for element: CardElement) {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.image]
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        
        if panel.runModal() == .OK, let url = panel.url {
            if let data = try? Data(contentsOf: url) {
                var updated = element
                updated.imageData = data
                viewModel.selectedElement = updated
            }
        }
    }
    
    private func clearImage(for element: CardElement) {
        var updated = element
        updated.imageData = nil
        viewModel.selectedElement = updated
    }
    
    // MARK: - Bindings (simplified)
    
    private func binding(for element: CardElement, keyPath: WritableKeyPath<CardElement, CGFloat>) -> Binding<CGFloat> {
        Binding(
            get: { element[keyPath: keyPath] },
            set: { newValue in
                var updated = element
                updated[keyPath: keyPath] = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func rotationBinding(for element: CardElement) -> Binding<Double> {
        Binding(
            get: { element.rotation },
            set: { newValue in
                var updated = element
                updated.rotation = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func textBinding(for element: CardElement) -> Binding<String> {
        Binding(
            get: { element.textContent },
            set: { newValue in
                var updated = element
                updated.textContent = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func fontBinding(for element: CardElement) -> Binding<String> {
        Binding(
            get: { element.fontName },
            set: { newValue in
                var updated = element
                updated.fontName = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func boldBinding(for element: CardElement) -> Binding<Bool> {
        Binding(
            get: { element.isBold },
            set: { newValue in
                var updated = element
                updated.isBold = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func italicBinding(for element: CardElement) -> Binding<Bool> {
        Binding(
            get: { element.isItalic },
            set: { newValue in
                var updated = element
                updated.isItalic = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func colorBinding(for element: CardElement, keyPath: WritableKeyPath<CardElement, String>) -> Binding<Color> {
        Binding(
            get: { Color(hex: element[keyPath: keyPath]) ?? .black },
            set: { newValue in
                var updated = element
                updated[keyPath: keyPath] = newValue.toHex() ?? "#000000"
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func codeContentBinding(for element: CardElement) -> Binding<String> {
        Binding(
            get: { element.codeContent },
            set: { newValue in
                var updated = element
                updated.codeContent = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func dynamicBinding(for element: CardElement) -> Binding<Bool> {
        Binding(
            get: { element.isDynamicField },
            set: { newValue in
                var updated = element
                updated.isDynamicField = newValue
                viewModel.selectedElement = updated
            }
        )
    }
    
    private func fieldKeyBinding(for element: CardElement) -> Binding<String> {
        Binding(
            get: { element.fieldKey },
            set: { newValue in
                var updated = element
                updated.fieldKey = newValue
                viewModel.selectedElement = updated
            }
        )
    }
}

// MARK: - Property Field

struct PropertyField: View {
    let label: String
    @Binding var value: CGFloat
    var suffix: String = ""
    var step: CGFloat = 1
    
    private var doubleBinding: Binding<Double> {
        Binding(
            get: { Double(value) },
            set: { value = CGFloat($0) }
        )
    }
    
    var body: some View {
        HStack(spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 20)
            
            TextField("", value: doubleBinding, format: .number.precision(.fractionLength(0...1)))
                .textFieldStyle(.roundedBorder)
                .frame(width: 50)
            
            // Stepper buttons
            VStack(spacing: 0) {
                Button {
                    value += step
                } label: {
                    Image(systemName: "chevron.up")
                        .font(.system(size: 8, weight: .bold))
                }
                .buttonStyle(.plain)
                .frame(width: 14, height: 10)
                
                Button {
                    value = max(0, value - step)
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 8, weight: .bold))
                }
                .buttonStyle(.plain)
                .frame(width: 14, height: 10)
            }
            .foregroundStyle(.secondary)
            
            if !suffix.isEmpty {
                Text(suffix)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }
}

// MARK: - Color Extension

extension Color {
    func toHex() -> String? {
        let nsColor = NSColor(self)
        guard let rgbColor = nsColor.usingColorSpace(.sRGB) else {
            return "#000000"
        }
        
        let r = Int(rgbColor.redComponent * 255)
        let g = Int(rgbColor.greenComponent * 255)
        let b = Int(rgbColor.blueComponent * 255)
        
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}

#Preview {
    PropertiesPanel(viewModel: DesignerViewModel())
}
