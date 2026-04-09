import SwiftUI

// MARK: - Column Mapping View

struct ColumnMappingView: View {
    @Bindable var dataManager: DataSourceManager
    let templateFields: [String]
    let onComplete: () -> Void
    
    @State private var showSaveDialog = false
    @State private var configName = ""
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            header
            
            Divider()
            
            // Mapping table
            if dataManager.mappings.isEmpty {
                emptyState
            } else {
                mappingTable
            }
            
            Divider()
            
            // Footer with actions
            footer
        }
        .frame(minWidth: 600, minHeight: 400)
        .alert("Sauvegarder la configuration", isPresented: $showSaveDialog) {
            TextField("Nom", text: $configName)
            Button("Annuler", role: .cancel) { }
            Button("Sauvegarder") {
                // dataManager.saveConfiguration(name: configName, templateId: templateId)
            }
        }
    }
    
    // MARK: - Header
    
    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Mapping des colonnes")
                    .font(.headline)
                
                if let url = dataManager.sourceURL {
                    Text(url.lastPathComponent)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            // Stats
            if let data = dataManager.csvData {
                HStack(spacing: 16) {
                    Label("\(data.rowCount) lignes", systemImage: "tablecells")
                    Label("\(data.columnCount) colonnes", systemImage: "rectangle.split.3x1")
                    Label("\(mappedCount)/\(data.columnCount) mappées", systemImage: "link")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(.bar)
    }
    
    private var mappedCount: Int {
        dataManager.mappings.filter { $0.isMapped }.count
    }
    
    // MARK: - Empty State
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            
            Text("Aucune donnée importée")
                .font(.headline)
            
            Text("Importez un fichier CSV pour commencer")
                .font(.caption)
                .foregroundStyle(.secondary)
            
            Button("Importer CSV") {
                Task {
                    await dataManager.importCSV()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Mapping Table
    
    private var mappingTable: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Table header
                HStack {
                    Text("Colonne CSV")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Image(systemName: "arrow.right")
                        .foregroundStyle(.secondary)
                    
                    Text("Champ Template")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Text("Aperçu")
                        .font(.caption.weight(.semibold))
                        .frame(width: 150, alignment: .leading)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color(nsColor: .controlBackgroundColor))
                
                Divider()
                
                // Mapping rows
                ForEach(Array(dataManager.mappings.enumerated()), id: \.element.id) { index, mapping in
                    MappingRow(
                        mapping: $dataManager.mappings[index],
                        templateFields: templateFields,
                        sampleValue: sampleValue(for: mapping.csvColumn)
                    )
                    
                    Divider()
                }
            }
        }
    }
    
    private func sampleValue(for column: String) -> String {
        dataManager.csvData?.rows.first?[column] ?? ""
    }
    
    // MARK: - Footer
    
    private var footer: some View {
        HStack {
            Button("Auto-mapper") {
                dataManager.autoMap(templateFields: templateFields)
            }
            .help("Associer automatiquement les colonnes similaires")
            
            Button("Effacer tout") {
                for i in 0..<dataManager.mappings.count {
                    dataManager.mappings[i].templateField = nil
                }
            }
            
            Spacer()
            
            Button("Annuler", role: .cancel) {
                // Dismiss
            }
            
            Button("Appliquer") {
                onComplete()
            }
            .buttonStyle(.borderedProminent)
            .disabled(mappedCount == 0)
        }
        .padding()
        .background(.bar)
    }
}

// MARK: - Mapping Row

struct MappingRow: View {
    @Binding var mapping: ColumnMapping
    let templateFields: [String]
    let sampleValue: String
    
    var body: some View {
        HStack {
            // CSV Column
            HStack {
                Image(systemName: "tablecells")
                    .foregroundStyle(.secondary)
                Text(mapping.csvColumn)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Arrow
            Image(systemName: mapping.isMapped ? "link" : "arrow.right")
                .foregroundStyle(mapping.isMapped ? .green : .secondary)
            
            // Template field picker
            Picker("", selection: Binding(
                get: { mapping.templateField ?? "" },
                set: { mapping.templateField = $0.isEmpty ? nil : $0 }
            )) {
                Text("— Non mappé —")
                    .tag("")
                
                ForEach(templateFields, id: \.self) { field in
                    Text(field)
                        .tag(field)
                }
            }
            .labelsHidden()
            .frame(maxWidth: .infinity)
            
            // Sample value
            Text(sampleValue)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .frame(width: 150, alignment: .leading)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(mapping.isMapped ? Color.green.opacity(0.05) : Color.clear)
    }
}

// MARK: - Preview

#Preview {
    ColumnMappingView(
        dataManager: DataSourceManager.shared,
        templateFields: ["firstName", "lastName", "email", "photo"],
        onComplete: {}
    )
}
