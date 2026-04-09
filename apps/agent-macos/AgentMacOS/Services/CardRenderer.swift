//
//  CardRenderer.swift
//  AgentMacOS
//
//  Renders CardTemplate + data to printable NSImage
//

import Foundation
import AppKit
import CoreImage

// MARK: - Card Renderer

@Observable
final class CardRenderer {
    
    // MARK: - Constants
    
    /// CR80 card dimensions at 300 DPI
    static let cardWidth: CGFloat = 1016
    static let cardHeight: CGFloat = 648
    
    // MARK: - Errors
    
    enum RenderError: LocalizedError {
        case contextCreationFailed
        case imageGenerationFailed
        
        var errorDescription: String? {
            switch self {
            case .contextCreationFailed:
                return "Failed to create graphics context"
            case .imageGenerationFailed:
                return "Failed to generate card image"
            }
        }
    }
    
    // MARK: - Rendering
    
    /// Render a card template with data substitution
    /// - Parameters:
    ///   - template: The card template to render
    ///   - data: Dictionary of field keys to values for dynamic substitution
    ///   - side: Which side of the card to render (.front or .back)
    ///   - backgroundImage: Optional background image
    /// - Returns: Rendered NSImage at CR80 dimensions (1016 x 648)
    func render(
        template: CardTemplate,
        data: [String: String] = [:],
        side: CardSide,
        backgroundImage: NSImage? = nil
    ) async throws -> NSImage {
        let width = Int(Self.cardWidth)
        let height = Int(Self.cardHeight)
        
        // Create color space - use sRGB for compatibility
        guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
            throw RenderError.contextCreationFailed
        }
        
        // Create CGContext directly for maximum compatibility
        // Using RGBA with premultiplied alpha
        guard let cgContext = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            print("❌ [CardRenderer] Failed to create CGContext")
            throw RenderError.contextCreationFailed
        }
        
        // Wrap in NSGraphicsContext for AppKit drawing
        let nsContext = NSGraphicsContext(cgContext: cgContext, flipped: false)
        
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = nsContext
        
        let rect = NSRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))
        
        // Fill background
        let backgroundColor = NSColor(hex: template.backgroundColor) ?? .white
        backgroundColor.withAlphaComponent(template.backgroundOpacity).setFill()
        rect.fill()
        
        // Draw background image if present
        if let bgImage = backgroundImage {
            bgImage.draw(in: rect, from: .zero, operation: .sourceOver, fraction: template.backgroundOpacity)
        }
        
        // Get elements for the requested side
        let elements = side == .front ? template.frontElements : template.backElements
        
        // Sort by z-index and render each element
        for element in elements.sorted(by: { $0.zIndex < $1.zIndex }) {
            guard element.isVisible else { continue }
            try await renderElement(element, data: data, in: cgContext)
        }
        
        NSGraphicsContext.restoreGraphicsState()
        
        // Create final image from CGContext
        guard let cgImage = cgContext.makeImage() else {
            print("❌ [CardRenderer] Failed to create CGImage")
            throw RenderError.contextCreationFailed
        }
        
        let image = NSImage(cgImage: cgImage, size: NSSize(width: width, height: height))
        print("✅ [CardRenderer] Rendered \(side) side successfully")
        
        return image
    }
    
    // MARK: - Element Rendering
    
    private func renderElement(_ element: CardElement, data: [String: String], in cgContext: CGContext) async throws {
        // Flip Y coordinate (AppKit origin is bottom-left)
        let flippedY = Self.cardHeight - element.y - element.height
        let rect = CGRect(x: element.x, y: flippedY, width: element.width, height: element.height)
        
        // Apply rotation if needed
        if element.rotation != 0 {
            cgContext.saveGState()
            let centerX = element.x + element.width / 2
            let centerY = Self.cardHeight - element.y - element.height / 2
            cgContext.translateBy(x: centerX, y: centerY)
            cgContext.rotate(by: element.rotation * .pi / 180)
            cgContext.translateBy(x: -centerX, y: -centerY)
        }
        
        switch element.type {
        case .text:
            renderText(element, data: data, in: rect)
            
        case .image:
            try await renderImage(element, data: data, in: rect)
            
        case .qrCode:
            renderQRCode(element, data: data, in: rect)
            
        case .barcode:
            renderBarcode(element, data: data, in: rect)
            
        case .rectangle:
            renderRectangle(element, in: rect)
            
        case .circle:
            renderCircle(element, in: rect)
            
        case .line:
            renderLine(element, in: rect)
        }
        
        if element.rotation != 0 {
            cgContext.restoreGState()
        }
    }
    
    // MARK: - Text Rendering
    
    private func renderText(_ element: CardElement, data: [String: String], in rect: CGRect) {
        // Substitute dynamic fields
        var text = element.textContent
        if element.isDynamicField, let value = data[element.fieldKey] {
            text = value
        } else {
            // Replace any {key} patterns with data values
            for (key, value) in data {
                text = text.replacingOccurrences(of: "{\(key)}", with: value)
            }
        }
        
        // Build font
        var font = NSFont(name: element.fontName, size: element.fontSize) ?? NSFont.systemFont(ofSize: element.fontSize)
        
        if element.isBold {
            font = NSFontManager.shared.convert(font, toHaveTrait: .boldFontMask)
        }
        if element.isItalic {
            font = NSFontManager.shared.convert(font, toHaveTrait: .italicFontMask)
        }
        
        // Text color
        let textColor = NSColor(hex: element.textColor) ?? .black
        
        // Paragraph style for alignment
        let paragraphStyle = NSMutableParagraphStyle()
        switch element.textAlignment {
        case .leading:
            paragraphStyle.alignment = .left
        case .center:
            paragraphStyle.alignment = .center
        case .trailing:
            paragraphStyle.alignment = .right
        }
        
        // Draw text
        let attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: textColor,
            .paragraphStyle: paragraphStyle
        ]
        
        let attributedString = NSAttributedString(string: text, attributes: attributes)
        attributedString.draw(in: rect)
    }
    
    // MARK: - Image Rendering
    
    private func renderImage(_ element: CardElement, data: [String: String], in rect: CGRect) async throws {
        var image: NSImage?
        
        // Try to load from imageData first (embedded image)
        if let imageData = element.imageData {
            image = NSImage(data: imageData)
        }
        
        // Try dynamic field URL - download from HTTP/HTTPS
        if image == nil && element.isDynamicField {
            if let urlString = data[element.fieldKey], !urlString.isEmpty {
                image = try await downloadImage(from: urlString)
            }
        }
        
        // Also try generic {key} substitution in fieldKey
        if image == nil && !element.fieldKey.isEmpty {
            if let urlString = data[element.fieldKey], !urlString.isEmpty {
                image = try await downloadImage(from: urlString)
            }
        }
        
        // Draw placeholder if no image
        guard let finalImage = image else {
            // Draw placeholder rectangle with icon
            let placeholderColor = NSColor(hex: element.fillColor) ?? NSColor.lightGray.withAlphaComponent(0.3)
            placeholderColor.setFill()
            
            if element.cornerRadius > 0 {
                let path = NSBezierPath(roundedRect: rect, xRadius: element.cornerRadius, yRadius: element.cornerRadius)
                path.fill()
            } else {
                rect.fill()
            }
            
            // Draw camera icon placeholder
            NSColor.gray.setFill()
            let iconSize: CGFloat = min(rect.width, rect.height) * 0.3
            let iconRect = CGRect(
                x: rect.midX - iconSize / 2,
                y: rect.midY - iconSize / 2,
                width: iconSize,
                height: iconSize
            )
            let iconPath = NSBezierPath(ovalIn: iconRect)
            iconPath.fill()
            
            return
        }
        
        // Draw image with corner radius if needed
        if element.cornerRadius > 0 {
            NSGraphicsContext.saveGraphicsState()
            let path = NSBezierPath(roundedRect: rect, xRadius: element.cornerRadius, yRadius: element.cornerRadius)
            path.addClip()
            finalImage.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
            NSGraphicsContext.restoreGraphicsState()
        } else {
            finalImage.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
        }
    }
    
    /// Download image from URL (supports HTTP/HTTPS and local files)
    /// Updated to async/await for thread safety and responsiveness.
    private func downloadImage(from urlString: String) async throws -> NSImage? {
        guard let url = URL(string: urlString) else { return nil }
        
        // For local files, use direct loading
        if url.isFileURL {
            return NSImage(contentsOf: url)
        }
        
        // For HTTP/HTTPS, download using URLSession async/await
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return NSImage(data: data)
        } catch {
            print("Failed to download image from \(urlString): \(error.localizedDescription)")
            return nil
        }
    }
    
    // MARK: - QR Code Rendering
    
    private func renderQRCode(_ element: CardElement, data: [String: String], in rect: CGRect) {
        // Get content (substitute dynamic field if needed)
        var content = element.codeContent
        if element.isDynamicField, let value = data[element.fieldKey] {
            content = value
        } else {
            for (key, value) in data {
                content = content.replacingOccurrences(of: "{\(key)}", with: value)
            }
        }
        
        if content.isEmpty {
            content = "https://example.com"
        }
        
        // Generate QR code using CoreImage
        if let qrImage = CodeGenerator.generateQRCode(from: content, size: rect.size) {
            qrImage.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
        }
    }
    
    // MARK: - Barcode Rendering
    
    private func renderBarcode(_ element: CardElement, data: [String: String], in rect: CGRect) {
        // Get content (substitute dynamic field if needed)
        var content = element.codeContent
        if element.isDynamicField, let value = data[element.fieldKey] {
            content = value
        } else {
            for (key, value) in data {
                content = content.replacingOccurrences(of: "{\(key)}", with: value)
            }
        }
        
        if content.isEmpty {
            content = "123456789"
        }
        
        // Generate barcode using CoreImage
        if let barcodeImage = CodeGenerator.generateCode128(from: content, size: rect.size) {
            barcodeImage.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
        }
    }
    
    // MARK: - Shape Rendering
    
    private func renderRectangle(_ element: CardElement, in rect: CGRect) {
        let fillColor = NSColor(hex: element.fillColor) ?? .white
        let strokeColor = NSColor(hex: element.strokeColor) ?? .black
        
        let path: NSBezierPath
        if element.cornerRadius > 0 {
            path = NSBezierPath(roundedRect: rect, xRadius: element.cornerRadius, yRadius: element.cornerRadius)
        } else {
            path = NSBezierPath(rect: rect)
        }
        
        fillColor.setFill()
        path.fill()
        
        if element.strokeWidth > 0 {
            strokeColor.setStroke()
            path.lineWidth = element.strokeWidth
            path.stroke()
        }
    }
    
    private func renderCircle(_ element: CardElement, in rect: CGRect) {
        let fillColor = NSColor(hex: element.fillColor) ?? .white
        let strokeColor = NSColor(hex: element.strokeColor) ?? .black
        
        let path = NSBezierPath(ovalIn: rect)
        
        fillColor.setFill()
        path.fill()
        
        if element.strokeWidth > 0 {
            strokeColor.setStroke()
            path.lineWidth = element.strokeWidth
            path.stroke()
        }
    }
    
    private func renderLine(_ element: CardElement, in rect: CGRect) {
        let strokeColor = NSColor(hex: element.strokeColor) ?? .black
        
        let path = NSBezierPath()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.line(to: CGPoint(x: rect.maxX, y: rect.midY))
        
        strokeColor.setStroke()
        path.lineWidth = element.strokeWidth > 0 ? element.strokeWidth : 1
        path.stroke()
    }
}

// MARK: - NSColor Hex Extension

extension NSColor {
    /// Create NSColor from hex string (e.g., "#FF5733" or "FF5733")
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return nil
        }
        
        let red = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let green = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let blue = CGFloat(rgb & 0x0000FF) / 255.0
        
        self.init(red: red, green: green, blue: blue, alpha: 1.0)
    }
}
