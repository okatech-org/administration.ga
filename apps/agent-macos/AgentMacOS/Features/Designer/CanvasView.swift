//
//  CanvasView.swift
//  AgentMacOS
//
//  Enhanced canvas with smart guides, selection UI, resize handles, and keyboard shortcuts
//

import SwiftUI

struct CanvasView: View {
    @Bindable var viewModel: DesignerViewModel
    
    @State private var dragOffset: CGSize = .zero
    @State private var isDragging = false
    @State private var resizingHandle: ResizeHandle?
    @State private var initialSize: CGSize = .zero
    @State private var initialPosition: CGPoint = .zero
    
    private var scaledWidth: CGFloat {
        CardConstants.widthPixels * viewModel.canvasScale
    }
    
    private var scaledHeight: CGFloat {
        CardConstants.heightPixels * viewModel.canvasScale
    }
    
    var body: some View {
        ZStack {
            // Gradient background for depth
            LinearGradient(
                colors: [
                    Color(.windowBackgroundColor),
                    Color(.windowBackgroundColor).opacity(0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Ambient glow behind card
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.blue.opacity(0.08))
                .blur(radius: 60)
                .frame(width: scaledWidth + 40, height: scaledHeight + 40)
            
            // Canvas container with shadow
            canvasContainer
        }
        .gesture(
            TapGesture()
                .onEnded { _ in
                    viewModel.clearSelection()
                }
        )
        .onTapGesture { location in
            let canvasPoint = screenToCanvas(location)
            viewModel.selectElement(at: canvasPoint)
        }
        // Keyboard shortcuts
        .focusable()
        .focusEffectDisabled()
        .onDeleteCommand {
            viewModel.deleteSelectedElement()
        }
        .onMoveCommand { direction in
            let step: CGFloat = 1
            switch direction {
            case .up: viewModel.moveSelectedElement(dx: 0, dy: -step)
            case .down: viewModel.moveSelectedElement(dx: 0, dy: step)
            case .left: viewModel.moveSelectedElement(dx: -step, dy: 0)
            case .right: viewModel.moveSelectedElement(dx: step, dy: 0)
            @unknown default: break
            }
        }
        // Scroll wheel zoom with Command
        .onScrollGesture(isEnabled: true) { delta, hasCommand in
            if hasCommand {
                if delta.height > 0 {
                    viewModel.zoomOut()
                } else {
                    viewModel.zoomIn()
                }
            }
        }
    }
    
    // MARK: - Canvas Container
    
    private var canvasContainer: some View {
        VStack {
            ZStack {
                // Card background
                RoundedRectangle(cornerRadius: 8 * viewModel.canvasScale)
                    .fill(Color(hex: viewModel.template.backgroundColor) ?? .white)
                    .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                
                // Background reference image
                if viewModel.showBackground, let imageData = viewModel.currentBackgroundImage,
                   let nsImage = NSImage(data: imageData) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .opacity(viewModel.backgroundOpacity)
                        .allowsHitTesting(false)
                }
                
                // Grid overlay
                if viewModel.showGrid {
                    gridOverlay
                }
                
                // Smart guides
                ForEach(viewModel.activeGuides) { guide in
                    SmartGuideView(guide: guide, scale: viewModel.canvasScale, canvasSize: CGSize(width: CardConstants.widthPixels, height: CardConstants.heightPixels))
                }
                
                // Elements
                ForEach(viewModel.currentElements.sorted { $0.zIndex < $1.zIndex }) { element in
                    ElementView(
                        element: element,
                        isSelected: element.id == viewModel.selectedElementId,
                        scale: viewModel.canvasScale,
                        viewModel: viewModel
                    )
                }
            }
            .frame(width: scaledWidth, height: scaledHeight)
            .clipShape(RoundedRectangle(cornerRadius: 8 * viewModel.canvasScale))
            
            // Card side indicator
            HStack {
                Text(viewModel.isEditingBack ? "BACK" : "FRONT")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.secondary)
                
                Text("•")
                    .foregroundStyle(.tertiary)
                
                Text("\(Int(CardConstants.widthMM))×\(Int(CardConstants.heightMM)) mm")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                
                Text("•")
                    .foregroundStyle(.tertiary)
                
                Text("\(Int(viewModel.canvasScale * 100))%")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(.top, 8)
        }
    }
    
    // MARK: - Grid Overlay
    
    private var gridOverlay: some View {
        Canvas { context, size in
            let gridSpacing = viewModel.gridSize * viewModel.canvasScale
            
            // Vertical lines
            var x: CGFloat = 0
            while x <= size.width {
                var path = Path()
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
                context.stroke(path, with: .color(.gray.opacity(0.2)), lineWidth: 0.5)
                x += gridSpacing
            }
            
            // Horizontal lines
            var y: CGFloat = 0
            while y <= size.height {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(path, with: .color(.gray.opacity(0.2)), lineWidth: 0.5)
                y += gridSpacing
            }
            
            // Center guides
            let centerX = size.width / 2
            let centerY = size.height / 2
            
            var centerVPath = Path()
            centerVPath.move(to: CGPoint(x: centerX, y: 0))
            centerVPath.addLine(to: CGPoint(x: centerX, y: size.height))
            context.stroke(centerVPath, with: .color(.blue.opacity(0.3)), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
            
            var centerHPath = Path()
            centerHPath.move(to: CGPoint(x: 0, y: centerY))
            centerHPath.addLine(to: CGPoint(x: size.width, y: centerY))
            context.stroke(centerHPath, with: .color(.blue.opacity(0.3)), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
        }
        .allowsHitTesting(false)
    }
    
    // MARK: - Helpers
    
    private func screenToCanvas(_ point: CGPoint) -> CGPoint {
        CGPoint(
            x: point.x / viewModel.canvasScale,
            y: point.y / viewModel.canvasScale
        )
    }
}

// MARK: - Smart Guide View

struct SmartGuideView: View {
    let guide: SmartGuide
    let scale: CGFloat
    let canvasSize: CGSize
    
    var body: some View {
        switch guide.type {
        case .vertical:
            Rectangle()
                .fill(Color.pink)
                .frame(width: 1, height: canvasSize.height * scale)
                .position(x: guide.position * scale, y: canvasSize.height * scale / 2)
        case .horizontal:
            Rectangle()
                .fill(Color.pink)
                .frame(width: canvasSize.width * scale, height: 1)
                .position(x: canvasSize.width * scale / 2, y: guide.position * scale)
        }
    }
}

// MARK: - Element View

struct ElementView: View {
    let element: CardElement
    let isSelected: Bool
    let scale: CGFloat
    @Bindable var viewModel: DesignerViewModel
    
    @State private var dragStartPosition: CGPoint = .zero
    @State private var resizeStartSize: CGSize = .zero
    
    private var scaledWidth: CGFloat { element.width * scale }
    private var scaledHeight: CGFloat { element.height * scale }
    
    var body: some View {
        // Group content and selection together BEFORE positioning
        ZStack {
            elementContent
            
            if isSelected {
                selectionBorder
            }
        }
        .frame(width: scaledWidth, height: scaledHeight)
        .rotationEffect(.degrees(element.rotation))
        .position(
            x: (element.x + element.width / 2) * scale,
            y: (element.y + element.height / 2) * scale
        )
        .gesture(dragGesture)
        .onTapGesture {
            viewModel.selectedElementId = element.id
        }
        .contextMenu {
            contextMenuContent
        }
    }
    
    // MARK: - Selection Border
    
    private var selectionBorder: some View {
        ZStack {
            Rectangle()
                .stroke(Color.accentColor, lineWidth: 2)
            
            // Corner handles
            ForEach(ResizeHandle.allCases, id: \.self) { handle in
                Circle()
                    .fill(Color.white)
                    .frame(width: 10, height: 10)
                    .overlay(Circle().stroke(Color.accentColor, lineWidth: 1.5))
                    .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
                    .position(handle.position(in: CGSize(width: scaledWidth, height: scaledHeight)))
                    .gesture(resizeGesture(for: handle))
            }
        }
    }
    
    // MARK: - Gestures
    
    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                // On first drag event, capture start position
                if dragStartPosition == .zero {
                    dragStartPosition = CGPoint(x: element.x, y: element.y)
                }
                // Calculate new position from START position + translation
                let newX = dragStartPosition.x + value.translation.width / scale
                let newY = dragStartPosition.y + value.translation.height / scale
                viewModel.moveElement(id: element.id, to: CGPoint(x: newX, y: newY), isDragEnd: false)
            }
            .onEnded { value in
                let newX = dragStartPosition.x + value.translation.width / scale
                let newY = dragStartPosition.y + value.translation.height / scale
                viewModel.moveElement(id: element.id, to: CGPoint(x: newX, y: newY), isDragEnd: true)
                // Reset start position for next drag
                dragStartPosition = .zero
            }
    }
    
    private func resizeGesture(for handle: ResizeHandle) -> some Gesture {
        DragGesture()
            .onChanged { value in
                handleResize(handle: handle, translation: value.translation)
            }
            .onEnded { _ in
                viewModel.saveUndoState()
            }
    }
    
    private func handleResize(handle: ResizeHandle, translation: CGSize) {
        var newWidth = element.width
        var newHeight = element.height
        
        switch handle {
        case .topLeft:
            newWidth = element.width - translation.width / scale
            newHeight = element.height - translation.height / scale
        case .topRight:
            newWidth = element.width + translation.width / scale
            newHeight = element.height - translation.height / scale
        case .bottomLeft:
            newWidth = element.width - translation.width / scale
            newHeight = element.height + translation.height / scale
        case .bottomRight:
            newWidth = element.width + translation.width / scale
            newHeight = element.height + translation.height / scale
        }
        
        viewModel.resizeElement(id: element.id, width: newWidth, height: newHeight, fromHandle: handle)
    }
    
    // MARK: - Context Menu
    
    @ViewBuilder
    private var contextMenuContent: some View {
        Button("Duplicate") {
            viewModel.selectedElementId = element.id
            viewModel.duplicateSelectedElement()
        }
        
        Divider()
        
        Button("Bring to Front") {
            viewModel.selectedElementId = element.id
            viewModel.bringToFront()
        }
        
        Button("Send to Back") {
            viewModel.selectedElementId = element.id
            viewModel.sendToBack()
        }
        
        Divider()
        
        Button("Delete", role: .destructive) {
            viewModel.selectedElementId = element.id
            viewModel.deleteSelectedElement()
        }
    }
    
    // MARK: - Element Content
    
    @ViewBuilder
    private var elementContent: some View {
        switch element.type {
        case .text:
            Text(element.isDynamicField ? "{\(element.fieldKey)}" : element.textContent)
                .font(.system(size: element.fontSize * scale))
                .fontWeight(element.isBold ? .bold : .regular)
                .italic(element.isItalic)
                .foregroundStyle(Color(hex: element.textColor) ?? .black)
                .multilineTextAlignment(element.textAlignment.swiftUIAlignment)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            
        case .image:
            if let data = element.imageData, let nsImage = NSImage(data: data) {
                Image(nsImage: nsImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .clipped()
            } else {
                ZStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                    Image(systemName: "photo")
                        .foregroundStyle(.secondary)
                }
            }
            
        case .qrCode:
            if let qrImage = CodeGenerator.generateQRCode(
                from: element.codeContent.isEmpty ? "AgentMacOS" : element.codeContent,
                size: CGSize(width: element.width, height: element.height)
            ) {
                Image(nsImage: qrImage)
                    .resizable()
            } else {
                ZStack {
                    Rectangle()
                        .fill(Color.white)
                    Image(systemName: "qrcode")
                        .resizable()
                        .padding(8 * scale)
                }
            }
            
        case .barcode:
            if let barcodeImage = CodeGenerator.generateCode128(
                from: element.codeContent.isEmpty ? "123456789" : element.codeContent,
                size: CGSize(width: element.width, height: element.height)
            ) {
                Image(nsImage: barcodeImage)
                    .resizable()
            } else {
                ZStack {
                    Rectangle()
                        .fill(Color.white)
                    Image(systemName: "barcode")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding(4 * scale)
                }
            }
            
        case .rectangle:
            RoundedRectangle(cornerRadius: element.cornerRadius * scale)
                .fill(Color(hex: element.fillColor) ?? .white)
                .overlay {
                    RoundedRectangle(cornerRadius: element.cornerRadius * scale)
                        .stroke(Color(hex: element.strokeColor) ?? .black, lineWidth: element.strokeWidth * scale)
                }
            
        case .circle:
            Circle()
                .fill(Color(hex: element.fillColor) ?? .white)
                .overlay {
                    Circle()
                        .stroke(Color(hex: element.strokeColor) ?? .black, lineWidth: element.strokeWidth * scale)
                }
            
        case .line:
            Rectangle()
                .fill(Color(hex: element.strokeColor) ?? .black)
        }
    }
}

// MARK: - Resize Handle View

struct ResizeHandleView: View {
    let handle: ResizeHandle
    let elementSize: CGSize
    
    var body: some View {
        Circle()
            .fill(Color.white)
            .frame(width: 10, height: 10)
            .overlay(Circle().stroke(Color.accentColor, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
            .position(handle.position(in: elementSize))
            .cursor(handle.cursor)
    }
}

// MARK: - Resize Handles

enum ResizeHandle: CaseIterable {
    case topLeft, topRight, bottomLeft, bottomRight
    
    func position(in size: CGSize) -> CGPoint {
        switch self {
        case .topLeft: return CGPoint(x: 0, y: 0)
        case .topRight: return CGPoint(x: size.width, y: 0)
        case .bottomLeft: return CGPoint(x: 0, y: size.height)
        case .bottomRight: return CGPoint(x: size.width, y: size.height)
        }
    }
    
    var cursor: NSCursor {
        switch self {
        case .topLeft, .bottomRight: return .crosshair
        case .topRight, .bottomLeft: return .crosshair
        }
    }
}

extension View {
    func cursor(_ cursor: NSCursor) -> some View {
        self.onHover { inside in
            if inside {
                cursor.push()
            } else {
                NSCursor.pop()
            }
        }
    }
    
    func onScrollGesture(isEnabled: Bool, action: @escaping (CGSize, Bool) -> Void) -> some View {
        self.background(
            ScrollGestureView(isEnabled: isEnabled, action: action)
        )
    }
}

struct ScrollGestureView: NSViewRepresentable {
    let isEnabled: Bool
    let action: (CGSize, Bool) -> Void
    
    func makeNSView(context: Context) -> NSView {
        let view = ScrollableNSView()
        view.action = action
        return view
    }
    
    func updateNSView(_ nsView: NSView, context: Context) {}
    
    class ScrollableNSView: NSView {
        var action: ((CGSize, Bool) -> Void)?
        
        override func scrollWheel(with event: NSEvent) {
            let hasCommand = event.modifierFlags.contains(.command)
            action?(CGSize(width: event.deltaX, height: event.deltaY), hasCommand)
        }
    }
}

// MARK: - Color Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

#Preview {
    CanvasView(viewModel: DesignerViewModel())
}
