//
//  CodeGenerator.swift
//  AgentMacOS
//
//  QR Code and Barcode generation utilities using CoreImage
//

import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

// MARK: - Code Generator

enum CodeGenerator {
    
    // MARK: - QR Code
    
    static func generateQRCode(from string: String, size: CGSize = CGSize(width: 200, height: 200)) -> NSImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        
        guard let outputImage = filter.outputImage else { return nil }
        
        // Scale to desired size
        let scaleX = size.width / outputImage.extent.size.width
        let scaleY = size.height / outputImage.extent.size.height
        let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        
        return NSImage(cgImage: cgImage, size: size)
    }
    
    // MARK: - Code 128 Barcode
    
    static func generateCode128(from string: String, size: CGSize = CGSize(width: 200, height: 80)) -> NSImage? {
        let context = CIContext()
        let filter = CIFilter.code128BarcodeGenerator()
        
        filter.message = Data(string.utf8)
        filter.quietSpace = 10
        
        guard let outputImage = filter.outputImage else { return nil }
        
        // Scale to desired size
        let scaleX = size.width / outputImage.extent.size.width
        let scaleY = size.height / outputImage.extent.size.height
        let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        
        return NSImage(cgImage: cgImage, size: size)
    }
    
    // MARK: - PDF417 Barcode (optional, for encoding more data)
    
    static func generatePDF417(from string: String, size: CGSize = CGSize(width: 200, height: 80)) -> NSImage? {
        let context = CIContext()
        let filter = CIFilter.pdf417BarcodeGenerator()
        
        filter.message = Data(string.utf8)
        
        guard let outputImage = filter.outputImage else { return nil }
        
        // Scale to desired size
        let scaleX = size.width / outputImage.extent.size.width
        let scaleY = size.height / outputImage.extent.size.height
        let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        
        return NSImage(cgImage: cgImage, size: size)
    }
}
