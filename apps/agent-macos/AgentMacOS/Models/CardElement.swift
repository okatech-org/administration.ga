//
//  CardElement.swift
//  AgentMacOS
//
//  Models for card design elements
//

import SwiftUI
import AppKit

// MARK: - Element Types

enum ElementType: String, Codable, CaseIterable {
    case text = "Text"
    case image = "Image"
    case qrCode = "QR Code"
    case barcode = "Barcode"
    case rectangle = "Rectangle"
    case circle = "Circle"
    case line = "Line"
    
    var icon: String {
        switch self {
        case .text: return "textformat"
        case .image: return "photo"
        case .qrCode: return "qrcode"
        case .barcode: return "barcode"
        case .rectangle: return "rectangle"
        case .circle: return "circle"
        case .line: return "line.diagonal"
        }
    }
}

// MARK: - Card Element

struct CardElement: Identifiable, Codable, Equatable {
    let id: UUID
    var type: ElementType
    var x: CGFloat
    var y: CGFloat
    var width: CGFloat
    var height: CGFloat
    var rotation: Double = 0
    var isLocked: Bool = false
    var isVisible: Bool = true
    var zIndex: Int = 0
    
    // Type-specific properties
    var textContent: String = ""
    var fontName: String = "Helvetica"
    var fontSize: CGFloat = 14
    var textColor: String = "#000000"
    var textAlignment: TextAlignment = .leading
    var isBold: Bool = false
    var isItalic: Bool = false
    
    // Dynamic field binding
    var isDynamicField: Bool = false
    var fieldKey: String = ""
    
    // Image properties
    var imagePath: String = ""
    var imageData: Data?
    
    // Shape properties
    var fillColor: String = "#FFFFFF"
    var strokeColor: String = "#000000"
    var strokeWidth: CGFloat = 1
    var cornerRadius: CGFloat = 0
    
    // QR/Barcode
    var codeContent: String = ""
    
    init(
        id: UUID = UUID(),
        type: ElementType,
        x: CGFloat = 50,
        y: CGFloat = 50,
        width: CGFloat = 100,
        height: CGFloat = 50
    ) {
        self.id = id
        self.type = type
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        
        // Set default sizes based on type
        switch type {
        case .text:
            self.width = 150
            self.height = 30
            self.textContent = "Text"
        case .image:
            self.width = 100
            self.height = 100
        case .qrCode:
            self.width = 80
            self.height = 80
        case .barcode:
            self.width = 150
            self.height = 50
        case .rectangle:
            self.width = 100
            self.height = 60
        case .circle:
            self.width = 60
            self.height = 60
        case .line:
            self.width = 100
            self.height = 2
        }
    }
    
    // Text alignment for Codable
    enum TextAlignment: String, Codable {
        case leading, center, trailing
        
        var swiftUIAlignment: SwiftUI.TextAlignment {
            switch self {
            case .leading: return .leading
            case .center: return .center
            case .trailing: return .trailing
            }
        }
    }
}

// MARK: - Card Side

enum CardSide {
    case front
    case back
}

// MARK: - Card Template

struct CardTemplate: Identifiable, Codable {
    let id: UUID
    var name: String
    var createdAt: Date
    var updatedAt: Date
    
    // Canvas settings
    var backgroundColor: String = "#FFFFFF"
    var frontBackgroundImageData: Data?
    var backBackgroundImageData: Data?
    var backgroundOpacity: Double = 0.5
    
    // Elements on front side
    var frontElements: [CardElement] = []
    
    // Elements on back side
    var backElements: [CardElement] = []
    
    // Print settings
    var printDuplex: Bool = false
    var magneticTracks: [String] = ["", "", ""]  // 3 tracks
    
    init(id: UUID = UUID(), name: String = "Untitled Card") {
        self.id = id
        self.name = name
        self.createdAt = Date()
        self.updatedAt = Date()
    }
    
    // Computed properties for background images (non-Codable)
    var frontBackgroundImage: NSImage? {
        guard let data = frontBackgroundImageData else { return nil }
        return NSImage(data: data)
    }
    
    var backBackgroundImage: NSImage? {
        guard let data = backBackgroundImageData else { return nil }
        return NSImage(data: data)
    }
    
    // Custom decoding to handle backward compatibility
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        backgroundColor = try container.decode(String.self, forKey: .backgroundColor)
        frontBackgroundImageData = try container.decodeIfPresent(Data.self, forKey: .frontBackgroundImageData)
        backBackgroundImageData = try container.decodeIfPresent(Data.self, forKey: .backBackgroundImageData)
        backgroundOpacity = try container.decode(Double.self, forKey: .backgroundOpacity)
        frontElements = try container.decode([CardElement].self, forKey: .frontElements)
        backElements = try container.decode([CardElement].self, forKey: .backElements)
        printDuplex = try container.decodeIfPresent(Bool.self, forKey: .printDuplex) ?? false
        
        // Handle new magneticTracks property which might be missing in old JSONs
        magneticTracks = try container.decodeIfPresent([String].self, forKey: .magneticTracks) ?? ["", "", ""]
    }
    
    // Default encoding
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
        try container.encode(backgroundColor, forKey: .backgroundColor)
        try container.encode(frontBackgroundImageData, forKey: .frontBackgroundImageData)
        try container.encode(backBackgroundImageData, forKey: .backBackgroundImageData)
        try container.encode(backgroundOpacity, forKey: .backgroundOpacity)
        try container.encode(frontElements, forKey: .frontElements)
        try container.encode(backElements, forKey: .backElements)
        try container.encode(printDuplex, forKey: .printDuplex)
        try container.encode(magneticTracks, forKey: .magneticTracks)
    }
    
    // Keys
    enum CodingKeys: String, CodingKey {
        case id, name, createdAt, updatedAt, backgroundColor, frontBackgroundImageData, backBackgroundImageData, backgroundOpacity, frontElements, backElements, printDuplex, magneticTracks
    }
    
    /// Get all dynamic field keys from elements (for column mapping)
    var dynamicFields: [String] {
        let allElements = frontElements + backElements
        return allElements
            .filter { $0.isDynamicField && !$0.fieldKey.isEmpty }
            .map { $0.fieldKey }
    }
}

// MARK: - Card Constants

enum CardConstants {
    // CR80 card dimensions at 300 DPI
    static let widthPixels: CGFloat = 1016
    static let heightPixels: CGFloat = 648
    
    // Physical dimensions (mm)
    static let widthMM: CGFloat = 85.6
    static let heightMM: CGFloat = 53.98
    
    // DPI
    static let dpi: CGFloat = 300
    
    // Aspect ratio
    static let aspectRatio: CGFloat = widthPixels / heightPixels
    
    // Default canvas scale for display
    static let defaultScale: CGFloat = 0.6
}
