import Foundation
import AppKit
import UniformTypeIdentifiers

// MARK: - CSV Import Service

/// Service for parsing CSV files with automatic delimiter and encoding detection
struct CSVImportService {
    
    // MARK: - Types
    
    struct CSVData {
        let headers: [String]
        let rows: [[String: String]]
        let rawRows: [[String]]
        let delimiter: Character
        let rowCount: Int
        
        var columnCount: Int { headers.count }
    }
    
    enum CSVError: LocalizedError {
        case fileNotFound
        case invalidEncoding
        case emptyFile
        case noHeaders
        case parseError(String)
        
        var errorDescription: String? {
            switch self {
            case .fileNotFound:
                return "Fichier CSV introuvable"
            case .invalidEncoding:
                return "Encodage du fichier non supporté"
            case .emptyFile:
                return "Le fichier CSV est vide"
            case .noHeaders:
                return "Aucun en-tête trouvé dans le fichier"
            case .parseError(let message):
                return "Erreur de parsing: \(message)"
            }
        }
    }
    
    // MARK: - Public Methods
    
    /// Parse a CSV file and return structured data
    static func parse(url: URL) throws -> CSVData {
        // Read file content with encoding detection
        let content = try readFile(url: url)
        
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw CSVError.emptyFile
        }
        
        // Detect delimiter
        let delimiter = detectDelimiter(content)
        
        // Parse rows
        let lines = parseLines(content)
        
        guard !lines.isEmpty else {
            throw CSVError.emptyFile
        }
        
        // First line is headers
        let headers = parseLine(lines[0], delimiter: delimiter)
            .map { $0.trimmingCharacters(in: .whitespaces) }
        
        guard !headers.isEmpty else {
            throw CSVError.noHeaders
        }
        
        // Parse data rows
        var rawRows: [[String]] = []
        var rows: [[String: String]] = []
        
        for i in 1..<lines.count {
            let values = parseLine(lines[i], delimiter: delimiter)
            
            // Skip empty rows
            guard !values.allSatisfy({ $0.isEmpty }) else { continue }
            
            rawRows.append(values)
            
            // Create dictionary mapping headers to values
            var row: [String: String] = [:]
            for (index, header) in headers.enumerated() {
                if index < values.count {
                    row[header] = values[index].trimmingCharacters(in: .whitespaces)
                } else {
                    row[header] = ""
                }
            }
            rows.append(row)
        }
        
        return CSVData(
            headers: headers,
            rows: rows,
            rawRows: rawRows,
            delimiter: delimiter,
            rowCount: rows.count
        )
    }
    
    /// Get a preview of the first N rows
    static func preview(url: URL, maxRows: Int = 5) throws -> CSVData {
        let fullData = try parse(url: url)
        
        return CSVData(
            headers: fullData.headers,
            rows: Array(fullData.rows.prefix(maxRows)),
            rawRows: Array(fullData.rawRows.prefix(maxRows)),
            delimiter: fullData.delimiter,
            rowCount: min(maxRows, fullData.rowCount)
        )
    }
    
    // MARK: - Private Methods
    
    /// Read file with encoding detection
    private static func readFile(url: URL) throws -> String {
        // Try UTF-8 first
        if let content = try? String(contentsOf: url, encoding: .utf8) {
            return content
        }
        
        // Try other encodings
        let encodings: [String.Encoding] = [
            .isoLatin1,
            .windowsCP1252,
            .macOSRoman,
            .utf16
        ]
        
        for encoding in encodings {
            if let content = try? String(contentsOf: url, encoding: encoding) {
                return content
            }
        }
        
        throw CSVError.invalidEncoding
    }
    
    /// Detect the delimiter used in the CSV
    static func detectDelimiter(_ content: String) -> Character {
        let firstLine = content.components(separatedBy: .newlines).first ?? ""
        
        let delimiters: [(Character, Int)] = [
            (",", firstLine.filter { $0 == "," }.count),
            (";", firstLine.filter { $0 == ";" }.count),
            ("\t", firstLine.filter { $0 == "\t" }.count),
            ("|", firstLine.filter { $0 == "|" }.count)
        ]
        
        // Return the delimiter with highest count, default to comma
        return delimiters.max(by: { $0.1 < $1.1 })?.0 ?? ","
    }
    
    /// Parse content into lines, handling quoted newlines
    private static func parseLines(_ content: String) -> [String] {
        var lines: [String] = []
        var currentLine = ""
        var inQuotes = false
        
        for char in content {
            if char == "\"" {
                inQuotes.toggle()
                currentLine.append(char)
            } else if char == "\n" && !inQuotes {
                if !currentLine.isEmpty {
                    lines.append(currentLine)
                }
                currentLine = ""
            } else if char == "\r" {
                // Skip carriage returns
                continue
            } else {
                currentLine.append(char)
            }
        }
        
        // Don't forget the last line
        if !currentLine.isEmpty {
            lines.append(currentLine)
        }
        
        return lines
    }
    
    /// Parse a single line into values, handling quoted fields
    private static func parseLine(_ line: String, delimiter: Character) -> [String] {
        var values: [String] = []
        var currentValue = ""
        var inQuotes = false
        
        for char in line {
            if char == "\"" {
                inQuotes.toggle()
            } else if char == delimiter && !inQuotes {
                values.append(currentValue)
                currentValue = ""
            } else {
                currentValue.append(char)
            }
        }
        
        // Add the last value
        values.append(currentValue)
        
        return values
    }
}

// MARK: - File Picker Helper

extension CSVImportService {
    
    /// Open file picker and return selected CSV file URL
    @MainActor
    static func pickCSVFile() async -> URL? {
        await withCheckedContinuation { continuation in
            let panel = NSOpenPanel()
            panel.allowedContentTypes = [UTType.commaSeparatedText, UTType(filenameExtension: "csv")!]
            panel.allowsMultipleSelection = false
            panel.canChooseDirectories = false
            panel.message = "Sélectionnez un fichier CSV à importer"
            panel.prompt = "Importer"
            
            if panel.runModal() == .OK {
                continuation.resume(returning: panel.url)
            } else {
                continuation.resume(returning: nil)
            }
        }
    }
}
