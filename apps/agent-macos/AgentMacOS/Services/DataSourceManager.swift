import Foundation
import SwiftUI

// MARK: - Data Source Types

enum DataSourceType: String, CaseIterable, Identifiable {
    case csv = "CSV"
    case manual = "Manuel"
    // case convex = "Convex" // Future: remote data
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .csv: return "doc.text"
        case .manual: return "keyboard"
        }
    }
}

// MARK: - Column Mapping

struct ColumnMapping: Codable, Identifiable {
    var id = UUID()
    let csvColumn: String
    var templateField: String?
    
    var isMapped: Bool { templateField != nil }
}

struct MappingConfiguration: Codable, Identifiable {
    var id = UUID()
    var name: String
    var templateId: UUID
    var mappings: [ColumnMapping]
    var createdAt: Date = Date()
}

// MARK: - Data Source Manager

@Observable
class DataSourceManager {
    
    // MARK: - Properties
    
    /// Current loaded CSV data
    var csvData: CSVImportService.CSVData?
    
    /// Current column mappings
    var mappings: [ColumnMapping] = []
    
    /// Saved mapping configurations
    var savedConfigurations: [MappingConfiguration] = []
    
    /// Current data source type
    var sourceType: DataSourceType = .manual
    
    /// Source file URL (for CSV)
    var sourceURL: URL?
    
    /// Manual records
    var manualRecords: [[String: String]] = []
    
    /// Error message
    var errorMessage: String?
    
    /// Loading state
    var isLoading = false
    
    // MARK: - Computed Properties
    
    /// Get all records based on source type
    var records: [[String: String]] {
        switch sourceType {
        case .csv:
            return csvData?.rows ?? []
        case .manual:
            return manualRecords
        }
    }
    
    /// Available columns from current data source
    var availableColumns: [String] {
        csvData?.headers ?? []
    }
    
    // MARK: - Singleton
    
    static let shared = DataSourceManager()
    
    private init() {
        loadSavedConfigurations()
    }
    
    // MARK: - CSV Import
    
    /// Import CSV file
    @MainActor
    func importCSV() async {
        guard let url = await CSVImportService.pickCSVFile() else { return }
        
        do {
            isLoading = true
            errorMessage = nil
            
            csvData = try CSVImportService.parse(url: url)
            sourceURL = url
            sourceType = .csv
            
            // Create initial mappings with no assignments
            mappings = csvData?.headers.map { header in
                ColumnMapping(csvColumn: header, templateField: nil)
            } ?? []
            
            isLoading = false
            
            print("📊 [DataSourceManager] Imported \(csvData?.rowCount ?? 0) rows with \(csvData?.columnCount ?? 0) columns")
            
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            print("❌ [DataSourceManager] Import failed: \(error)")
        }
    }
    
    /// Import from specific URL (for drag-drop)
    func importCSV(from url: URL) async throws {
        csvData = try CSVImportService.parse(url: url)
        sourceURL = url
        sourceType = .csv
        
        mappings = csvData?.headers.map { header in
            ColumnMapping(csvColumn: header, templateField: nil)
        } ?? []
    }
    
    // MARK: - Mapping
    
    /// Update mapping for a column
    func updateMapping(csvColumn: String, to templateField: String?) {
        if let index = mappings.firstIndex(where: { $0.csvColumn == csvColumn }) {
            mappings[index].templateField = templateField
        }
    }
    
    /// Apply mappings to get data matching template fields
    func applyMappings(to record: [String: String]) -> [String: String] {
        var result: [String: String] = [:]
        
        for mapping in mappings where mapping.templateField != nil {
            if let value = record[mapping.csvColumn] {
                result[mapping.templateField!] = value
            }
        }
        
        return result
    }
    
    /// Get all mapped records
    var mappedRecords: [[String: String]] {
        records.map { applyMappings(to: $0) }
    }
    
    // MARK: - Auto-mapping
    
    /// Try to auto-map columns based on name similarity
    func autoMap(templateFields: [String]) {
        for i in 0..<mappings.count {
            let csvColumn = mappings[i].csvColumn.lowercased()
            
            // Find best matching template field
            let bestMatch = templateFields.first { field in
                let fieldLower = field.lowercased()
                return csvColumn == fieldLower ||
                       csvColumn.contains(fieldLower) ||
                       fieldLower.contains(csvColumn)
            }
            
            mappings[i].templateField = bestMatch
        }
        
        print("🔄 [DataSourceManager] Auto-mapped \(mappings.filter { $0.isMapped }.count) columns")
    }
    
    // MARK: - Configuration Persistence
    
    private let configurationsKey = "DataSourceManager.savedConfigurations"
    
    func saveConfiguration(name: String, templateId: UUID) {
        let config = MappingConfiguration(
            name: name,
            templateId: templateId,
            mappings: mappings
        )
        
        savedConfigurations.append(config)
        persistConfigurations()
    }
    
    func loadConfiguration(_ config: MappingConfiguration) {
        mappings = config.mappings
    }
    
    func deleteConfiguration(_ config: MappingConfiguration) {
        savedConfigurations.removeAll { $0.id == config.id }
        persistConfigurations()
    }
    
    private func persistConfigurations() {
        if let data = try? JSONEncoder().encode(savedConfigurations) {
            UserDefaults.standard.set(data, forKey: configurationsKey)
        }
    }
    
    private func loadSavedConfigurations() {
        if let data = UserDefaults.standard.data(forKey: configurationsKey),
           let configs = try? JSONDecoder().decode([MappingConfiguration].self, from: data) {
            savedConfigurations = configs
        }
    }
    
    // MARK: - Manual Records
    
    func addManualRecord(_ record: [String: String]) {
        manualRecords.append(record)
    }
    
    func removeManualRecord(at index: Int) {
        guard index < manualRecords.count else { return }
        manualRecords.remove(at: index)
    }
    
    func clearAllRecords() {
        csvData = nil
        manualRecords = []
        mappings = []
        sourceURL = nil
    }
}
