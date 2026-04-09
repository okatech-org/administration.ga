//
//  TemplateStorage.swift
//  AgentMacOS
//
//  Local storage for card templates using JSON files
//

import Foundation

final class TemplateStorage: @unchecked Sendable {
    static let shared = TemplateStorage()
    
    private let fileManager = FileManager.default
    private let queue = DispatchQueue(label: "com.easycard.templatestorage", qos: .userInitiated)
    
    private var templatesDirectory: URL {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("AgentMacOS/Templates", isDirectory: true)
        try? fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }
    
    // MARK: - CRUD Operations
    
    func save(_ template: CardTemplate) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        encoder.dateEncodingStrategy = .iso8601
        
        let data = try encoder.encode(template)
        let fileURL = templatesDirectory.appendingPathComponent("\(template.id.uuidString).json")
        try data.write(to: fileURL)
    }
    
    func load(id: UUID) throws -> CardTemplate? {
        let fileURL = templatesDirectory.appendingPathComponent("\(id.uuidString).json")
        guard fileManager.fileExists(atPath: fileURL.path) else { return nil }
        
        let data = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CardTemplate.self, from: data)
    }
    
    func loadAll() throws -> [CardTemplate] {
        let files = try fileManager.contentsOfDirectory(at: templatesDirectory, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" && !$0.lastPathComponent.hasPrefix("_") }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        return files.compactMap { url in
            guard let data = try? Data(contentsOf: url),
                  let template = try? decoder.decode(CardTemplate.self, from: data) else {
                return nil
            }
            return template
        }.sorted { $0.updatedAt > $1.updatedAt }
    }
    
    func delete(id: UUID) throws {
        let fileURL = templatesDirectory.appendingPathComponent("\(id.uuidString).json")
        if fileManager.fileExists(atPath: fileURL.path) {
            try fileManager.removeItem(at: fileURL)
        }
    }
    
    // MARK: - Current Template (auto-save)
    
    private var currentTemplateURL: URL {
        templatesDirectory.appendingPathComponent("_current.json")
    }
    
    func saveCurrentTemplate(_ template: CardTemplate) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        encoder.dateEncodingStrategy = .iso8601
        
        let data = try encoder.encode(template)
        try data.write(to: currentTemplateURL)
    }
    
    func loadCurrentTemplate() throws -> CardTemplate? {
        guard fileManager.fileExists(atPath: currentTemplateURL.path) else { return nil }
        
        let data = try Data(contentsOf: currentTemplateURL)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CardTemplate.self, from: data)
    }
    
    // MARK: - Async Wrappers
    
    func saveAsync(_ template: CardTemplate) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async {
                do {
                    try self.save(template)
                    continuation.resume()
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func saveCurrentTemplateAsync(_ template: CardTemplate) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async {
                do {
                    try self.saveCurrentTemplate(template)
                    continuation.resume()
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func loadCurrentTemplateAsync() async throws -> CardTemplate? {
        try await withCheckedThrowingContinuation { continuation in
            queue.async {
                do {
                    let result = try self.loadCurrentTemplate()
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}
