//
//  DesignerViewModel.swift
//  AgentMacOS
//
//  ViewModel for the card designer with smart guides and persistence
//

import SwiftUI

@Observable
final class DesignerViewModel {
    
    // MARK: - Properties
    
    var template: CardTemplate
    var selectedElementId: UUID?
    var isEditingBack: Bool = false
    var canvasScale: CGFloat = CardConstants.defaultScale
    var showGrid: Bool = true
    var snapToGrid: Bool = true
    var gridSize: CGFloat = 10
    
    // Smart guides
    var activeGuides: [SmartGuide] = []
    var snapThreshold: CGFloat = 5
    
    // Background visibility toggle (local state only)
    var showBackground: Bool = true
    
    // Background opacity stored in template for persistence
    var backgroundOpacity: Double {
        get { template.backgroundOpacity }
        set { 
            template.backgroundOpacity = newValue
            scheduleAutoSave()
        }
    }
    
    // Background images stored in template for persistence
    var currentBackgroundImage: Data? {
        get { isEditingBack ? template.backBackgroundImageData : template.frontBackgroundImageData }
        set {
            if isEditingBack {
                template.backBackgroundImageData = newValue
            } else {
                template.frontBackgroundImageData = newValue
            }
            scheduleAutoSave()
        }
    }
    
    // Undo/Redo stacks
    private var undoStack: [[CardElement]] = []
    private var redoStack: [[CardElement]] = []
    private let maxUndoLevels = 50
    
    // Auto-save timer
    private var autoSaveTask: Task<Void, Never>?
    
    // MARK: - Computed Properties
    
    var currentElements: [CardElement] {
        get { isEditingBack ? template.backElements : template.frontElements }
        set {
            if isEditingBack {
                template.backElements = newValue
            } else {
                template.frontElements = newValue
            }
            scheduleAutoSave()
        }
    }
    
    var selectedElement: CardElement? {
        get {
            guard let id = selectedElementId else { return nil }
            return currentElements.first { $0.id == id }
        }
        set {
            guard let newValue = newValue,
                  let index = currentElements.firstIndex(where: { $0.id == newValue.id }) else { return }
            currentElements[index] = newValue
        }
    }
    
    var canUndo: Bool { !undoStack.isEmpty }
    var canRedo: Bool { !redoStack.isEmpty }
    
    // MARK: - Init
    
    init(template: CardTemplate = CardTemplate()) {
        self.template = template
        loadCurrentTemplate()
    }
    
    // MARK: - Persistence
    
    private func loadCurrentTemplate() {
        Task {
            if let saved = try? await TemplateStorage.shared.loadCurrentTemplateAsync() {
                await MainActor.run {
                    self.template = saved
                }
            }
        }
    }
    
    private func scheduleAutoSave() {
        autoSaveTask?.cancel()
        autoSaveTask = Task {
            try? await Task.sleep(for: .seconds(1))
            guard !Task.isCancelled else { return }
            await saveTemplateAsync()
        }
    }
    
    func saveTemplate() {
        template.updatedAt = Date()
        Task {
            await saveTemplateAsync()
        }
    }
    
    private func saveTemplateAsync() async {
        do {
            try await TemplateStorage.shared.saveAsync(template)
            try await TemplateStorage.shared.saveCurrentTemplateAsync(template)
        } catch {
            print("Failed to save template: \(error)")
        }
    }
    
    // MARK: - Element Operations
    
    func addElement(_ type: ElementType) {
        saveUndoState()
        
        let element = CardElement(
            type: type,
            x: 50 + CGFloat(currentElements.count * 20),
            y: 50 + CGFloat(currentElements.count * 20)
        )
        currentElements.append(element)
        selectedElementId = element.id
        updateZIndices()
    }
    
    // MARK: - Arrow Key Movement
    
    func moveSelectedElement(dx: CGFloat, dy: CGFloat) {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        
        let newX = max(0, min(currentElements[index].x + dx, CardConstants.widthPixels - currentElements[index].width))
        let newY = max(0, min(currentElements[index].y + dy, CardConstants.heightPixels - currentElements[index].height))
        
        currentElements[index].x = newX
        currentElements[index].y = newY
    }
    
    func deleteSelectedElement() {
        guard let id = selectedElementId else { return }
        saveUndoState()
        currentElements.removeAll { $0.id == id }
        selectedElementId = nil
    }
    
    func duplicateSelectedElement() {
        guard let original = selectedElement else { return }
        saveUndoState()
        
        var newElement = original
        newElement = CardElement(
            id: UUID(),
            type: original.type,
            x: original.x + 20,
            y: original.y + 20,
            width: original.width,
            height: original.height
        )
        // Copy additional properties
        newElement.textContent = original.textContent
        newElement.fontName = original.fontName
        newElement.fontSize = original.fontSize
        newElement.textColor = original.textColor
        newElement.fillColor = original.fillColor
        newElement.strokeColor = original.strokeColor
        newElement.imageData = original.imageData
        newElement.codeContent = original.codeContent
        newElement.isDynamicField = original.isDynamicField
        newElement.fieldKey = original.fieldKey
        
        currentElements.append(newElement)
        selectedElementId = newElement.id
        updateZIndices()
    }
    
    func moveElement(id: UUID, to point: CGPoint, isDragEnd: Bool = false) {
        guard let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        
        var newX = point.x
        var newY = point.y
        
        // Show visual guides (no snapping - just visual indicators like Figma)
        if !isDragEnd {
            activeGuides = calculateVisualGuides(elementIndex: index, currentX: newX, currentY: newY)
        } else {
            activeGuides = []
        }
        
        // Snap to grid if enabled
        if snapToGrid {
            newX = round(newX / gridSize) * gridSize
            newY = round(newY / gridSize) * gridSize
        }
        
        // Clamp to canvas bounds
        newX = max(0, min(newX, CardConstants.widthPixels - currentElements[index].width))
        newY = max(0, min(newY, CardConstants.heightPixels - currentElements[index].height))
        
        currentElements[index].x = newX
        currentElements[index].y = newY
    }
    
    func resizeElement(id: UUID, width: CGFloat, height: CGFloat, fromHandle: ResizeHandle) {
        guard let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        
        let minSize: CGFloat = 10
        var element = currentElements[index]
        
        switch fromHandle {
        case .topLeft:
            let deltaW = element.width - max(minSize, width)
            let deltaH = element.height - max(minSize, height)
            element.x += deltaW
            element.y += deltaH
            element.width = max(minSize, width)
            element.height = max(minSize, height)
        case .topRight:
            let deltaH = element.height - max(minSize, height)
            element.y += deltaH
            element.width = max(minSize, width)
            element.height = max(minSize, height)
        case .bottomLeft:
            let deltaW = element.width - max(minSize, width)
            element.x += deltaW
            element.width = max(minSize, width)
            element.height = max(minSize, height)
        case .bottomRight:
            element.width = max(minSize, width)
            element.height = max(minSize, height)
        }
        
        currentElements[index] = element
    }
    
    // MARK: - Alignment Tools
    
    func alignLeft() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        currentElements[index].x = 0
    }
    
    func alignCenterH() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        currentElements[index].x = (CardConstants.widthPixels - currentElements[index].width) / 2
    }
    
    func alignRight() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        currentElements[index].x = CardConstants.widthPixels - currentElements[index].width
    }
    
    func alignTop() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        currentElements[index].y = 0
    }
    
    func alignMiddle() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        currentElements[index].y = (CardConstants.heightPixels - currentElements[index].height) / 2
    }
    
    func alignBottom() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        currentElements[index].y = CardConstants.heightPixels - currentElements[index].height
    }
    
    // MARK: - Clipboard (Copy/Paste)
    
    private var clipboardElement: CardElement?
    
    func copySelectedElement() {
        clipboardElement = selectedElement
    }
    
    func pasteElement() {
        guard let original = clipboardElement else { return }
        saveUndoState()
        
        var newElement = CardElement(
            id: UUID(),
            type: original.type,
            x: original.x + 20,
            y: original.y + 20,
            width: original.width,
            height: original.height
        )
        
        // Copy all properties
        newElement.textContent = original.textContent
        newElement.fontName = original.fontName
        newElement.fontSize = original.fontSize
        newElement.textColor = original.textColor
        newElement.textAlignment = original.textAlignment
        newElement.isBold = original.isBold
        newElement.isItalic = original.isItalic
        newElement.isDynamicField = original.isDynamicField
        newElement.fieldKey = original.fieldKey
        newElement.imageData = original.imageData
        newElement.fillColor = original.fillColor
        newElement.strokeColor = original.strokeColor
        newElement.strokeWidth = original.strokeWidth
        newElement.cornerRadius = original.cornerRadius
        newElement.codeContent = original.codeContent
        newElement.rotation = original.rotation
        
        currentElements.append(newElement)
        selectedElementId = newElement.id
        updateZIndices()
    }
    
    // MARK: - Visual Guides (no snapping)
    
    /// Calculates visual alignment guides without modifying position - Figma-style
    private func calculateVisualGuides(elementIndex: Int, currentX: CGFloat, currentY: CGFloat) -> [SmartGuide] {
        let element = currentElements[elementIndex]
        var guides: [SmartGuide] = []
        
        let elementCenter = CGPoint(x: currentX + element.width / 2, y: currentY + element.height / 2)
        let elementRight = currentX + element.width
        let elementBottom = currentY + element.height
        
        // Canvas center guides
        let canvasCenterX = CardConstants.widthPixels / 2
        let canvasCenterY = CardConstants.heightPixels / 2
        
        // Show guide when near canvas center
        if abs(elementCenter.x - canvasCenterX) < snapThreshold {
            guides.append(SmartGuide(type: .vertical, position: canvasCenterX))
        }
        if abs(elementCenter.y - canvasCenterY) < snapThreshold {
            guides.append(SmartGuide(type: .horizontal, position: canvasCenterY))
        }
        
        // Check alignment with other elements
        for (i, other) in currentElements.enumerated() {
            guard i != elementIndex else { continue }
            
            let otherCenter = CGPoint(x: other.x + other.width / 2, y: other.y + other.height / 2)
            let otherRight = other.x + other.width
            let otherBottom = other.y + other.height
            
            // Left edge alignment
            if abs(currentX - other.x) < snapThreshold {
                guides.append(SmartGuide(type: .vertical, position: other.x))
            }
            // Right edge alignment
            if abs(elementRight - otherRight) < snapThreshold {
                guides.append(SmartGuide(type: .vertical, position: otherRight))
            }
            // Center X alignment
            if abs(elementCenter.x - otherCenter.x) < snapThreshold {
                guides.append(SmartGuide(type: .vertical, position: otherCenter.x))
            }
            
            // Top edge alignment
            if abs(currentY - other.y) < snapThreshold {
                guides.append(SmartGuide(type: .horizontal, position: other.y))
            }
            // Bottom edge alignment
            if abs(elementBottom - otherBottom) < snapThreshold {
                guides.append(SmartGuide(type: .horizontal, position: otherBottom))
            }
            // Center Y alignment
            if abs(elementCenter.y - otherCenter.y) < snapThreshold {
                guides.append(SmartGuide(type: .horizontal, position: otherCenter.y))
            }
        }
        
        return guides
    }
    
    func clearGuides() {
        activeGuides = []
    }
    
    // MARK: - Layer Operations
    
    func bringToFront() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        let element = currentElements.remove(at: index)
        currentElements.append(element)
        updateZIndices()
    }
    
    func sendToBack() {
        guard let id = selectedElementId,
              let index = currentElements.firstIndex(where: { $0.id == id }) else { return }
        saveUndoState()
        let element = currentElements.remove(at: index)
        currentElements.insert(element, at: 0)
        updateZIndices()
    }
    
    private func updateZIndices() {
        for i in 0..<currentElements.count {
            currentElements[i].zIndex = i
        }
    }
    
    // MARK: - Undo/Redo
    
    func saveUndoState() {
        undoStack.append(currentElements)
        if undoStack.count > maxUndoLevels {
            undoStack.removeFirst()
        }
        redoStack.removeAll()
    }
    
    func undo() {
        guard let previousState = undoStack.popLast() else { return }
        redoStack.append(currentElements)
        currentElements = previousState
        selectedElementId = nil
    }
    
    func redo() {
        guard let nextState = redoStack.popLast() else { return }
        undoStack.append(currentElements)
        currentElements = nextState
        selectedElementId = nil
    }
    
    // MARK: - Selection
    
    func selectElement(at point: CGPoint) {
        let hitElements = currentElements
            .sorted { $0.zIndex > $1.zIndex }
            .filter { element in
                let rect = CGRect(x: element.x, y: element.y, width: element.width, height: element.height)
                return rect.contains(point)
            }
        
        selectedElementId = hitElements.first?.id
    }
    
    func clearSelection() {
        selectedElementId = nil
    }
    
    // MARK: - Background Image
    
    func setBackgroundImage(from url: URL) {
        if let data = try? Data(contentsOf: url) {
            currentBackgroundImage = data
        }
    }
    
    func clearBackgroundImage() {
        currentBackgroundImage = nil
    }
    
    // MARK: - Zoom
    
    func zoomIn() {
        canvasScale = min(2.0, canvasScale + 0.1)
    }
    
    func zoomOut() {
        canvasScale = max(0.2, canvasScale - 0.1)
    }
    
    func resetZoom() {
        canvasScale = CardConstants.defaultScale
    }
}

// MARK: - Smart Guide

struct SmartGuide: Identifiable {
    let id = UUID()
    let type: GuideType
    let position: CGFloat
    
    enum GuideType {
        case horizontal
        case vertical
    }
}
