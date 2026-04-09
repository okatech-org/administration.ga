import SwiftUI

// MARK: - Batch Print View

struct BatchPrintView: View {
    @Bindable var dataManager: DataSourceManager
    @State var printerService: PrinterService
    @State var cardRenderer: CardRenderer
    
    let template: CardTemplate
    
    @State private var selectedRecordIds: Set<Int> = []
    @State private var showMappingSheet = false
    @State private var showPrintProgress = false
    @State private var printProgress: Double = 0
    @State private var currentPrintIndex = 0
    @State private var isPrinting = false
    @State private var printErrors: [String] = []
    
    @Environment(\.dismiss) private var dismiss
    
    @State private var previewImage: NSImage? = nil
    @State private var previewError: String? = nil
    
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                // Toolbar (scrollable when narrow)
                ScrollView(.horizontal, showsIndicators: false) {
                    toolbar
                }
                
                Divider()
                
                // Content - stack vertically on narrow screens
                if geometry.size.width > 600 {
                    HSplitView {
                        recordsList
                            .frame(minWidth: 200, idealWidth: 300)
                        
                        previewPane
                            .frame(minWidth: 200, idealWidth: 350)
                    }
                } else {
                    // Vertical stack for narrow windows
                    VSplitView {
                        recordsList
                            .frame(minHeight: 150)
                        
                        previewPane
                            .frame(minHeight: 150)
                    }
                }
            }
            .task(id: selectedRecordIds) {
                await updatePreviewImage()
            }
        }
        .sheet(isPresented: $showMappingSheet) {
            ColumnMappingView(
                dataManager: dataManager,
                templateFields: template.dynamicFields,
                onComplete: {
                    showMappingSheet = false
                }
            )
        }
        .sheet(isPresented: $showPrintProgress) {
            printProgressView
        }
    }
    
    // MARK: - Toolbar
    
    private var toolbar: some View {
        HStack {
            // Import button
            Button {
                Task {
                    await dataManager.importCSV()
                    if !dataManager.mappings.isEmpty {
                        dataManager.autoMap(templateFields: template.dynamicFields)
                    }
                }
            } label: {
                Label("Importer CSV", systemImage: "doc.badge.plus")
            }
            
            // Mapping button
            Button {
                showMappingSheet = true
            } label: {
                Label("Mapper colonnes", systemImage: "arrow.left.arrow.right")
            }
            .disabled(dataManager.records.isEmpty)
            
            Divider()
                .frame(height: 20)
            
            // Selection controls
            Button("Tout sélectionner") {
                selectedRecordIds = Set(0..<dataManager.records.count)
            }
            .disabled(dataManager.records.isEmpty)
            
            Button("Désélectionner") {
                selectedRecordIds.removeAll()
            }
            .disabled(selectedRecordIds.isEmpty)
            
            Spacer()
            
            // Print button
            Button {
                Task {
                    await startBatchPrint()
                }
            } label: {
                Label("Imprimer \(selectedRecordIds.count) cartes", systemImage: "printer")
            }
            .buttonStyle(.borderedProminent)
            .disabled(selectedRecordIds.isEmpty || !printerService.isConnected)
        }
        .padding()
        .background(.bar)
    }
    
    // MARK: - Records List
    
    private var recordsList: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Enregistrements")
                    .font(.headline)
                
                Spacer()
                
                Text("\(dataManager.records.count) total")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            
            Divider()
            
            if dataManager.records.isEmpty {
                emptyRecordsState
            } else {
                recordsTable
            }
        }
        .background(Color(nsColor: .controlBackgroundColor))
    }
    
    private var emptyRecordsState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            
            Text("Aucun enregistrement")
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
    
    private var recordsTable: some View {
        List(selection: $selectedRecordIds) {
            ForEach(Array(dataManager.records.enumerated()), id: \.offset) { index, record in
                RecordRow(
                    record: record,  // Show raw CSV data
                    index: index,
                    isSelected: selectedRecordIds.contains(index)
                )
                .tag(index)
            }
        }
        .listStyle(.inset)
    }
    
    // MARK: - Preview Pane
    
    private var previewPane: some View {
        VStack {
            if let selectedIndex = selectedRecordIds.first {
                if let image = previewImage {
                    VStack {
                        Text("Aperçu - Enregistrement \(selectedIndex + 1)")
                            .font(.headline)
                        
                        Image(nsImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: 400)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(radius: 4)
                        
                        // Show mapped data
                        let record = dataManager.records[selectedIndex]
                        let mappedData = dataManager.applyMappings(to: record)
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(Array(mappedData.keys.sorted()), id: \.self) { key in
                                HStack {
                                    Text(key)
                                        .font(.caption.weight(.medium))
                                    Spacer()
                                    Text(mappedData[key] ?? "")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding()
                        .background(Color(nsColor: .controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal)
                    }
                } else if let error = previewError {
                    Text(error)
                        .foregroundStyle(.secondary)
                } else {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .padding(40)
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "photo")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                    
                    Text("Sélectionnez un enregistrement")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Print Progress
    
    private var printProgressView: some View {
        VStack(spacing: 20) {
            if isPrinting {
                ProgressView("Impression en cours...", value: printProgress, total: 1.0)
                    .progressViewStyle(.linear)
                
                Text("Carte \(currentPrintIndex + 1) sur \(selectedRecordIds.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Button("Annuler") {
                    isPrinting = false
                    showPrintProgress = false
                }
            } else {
                if printErrors.isEmpty {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)
                    
                    Text("Impression terminée !")
                        .font(.headline)
                    
                    Text("\(selectedRecordIds.count) cartes imprimées")
                        .foregroundStyle(.secondary)
                } else {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.orange)
                    
                    Text("Impression terminée avec erreurs")
                        .font(.headline)
                    
                    ScrollView {
                        VStack(alignment: .leading) {
                            ForEach(printErrors, id: \.self) { error in
                                Text("• \(error)")
                                    .font(.caption)
                            }
                        }
                    }
                    .frame(maxHeight: 100)
                }
                
                Button("Fermer") {
                    showPrintProgress = false
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(40)
        .frame(minWidth: 300)
    }
    
    // MARK: - Batch Print
    
    private func startBatchPrint() async {
        showPrintProgress = true
        isPrinting = true
        printProgress = 0
        currentPrintIndex = 0
        printErrors = []
        
        let sortedIndices = selectedRecordIds.sorted()
        let totalCount = sortedIndices.count
        
        for (i, index) in sortedIndices.enumerated() {
            guard isPrinting else { break }
            
            currentPrintIndex = i
            printProgress = Double(i) / Double(totalCount)
            
            let record = dataManager.records[index]
            let mappedData = dataManager.applyMappings(to: record)
            
            // Render and print
            do {
                let frontImage = try await cardRenderer.render(template: template, data: mappedData, side: .front)
                try await printerService.printCard(frontImage: frontImage)
            } catch {
                printErrors.append("Carte \(index + 1): \(error.localizedDescription)")
            }
            
            // Small delay between prints
            try? await Task.sleep(nanoseconds: 500_000_000)
        }
        
        isPrinting = false
        printProgress = 1.0
    }
    
    // MARK: - Preview Image Update
    
    private func updatePreviewImage() async {
        if let selectedIndex = selectedRecordIds.first {
            let record = dataManager.records[selectedIndex]
            let mappedData = dataManager.applyMappings(to: record)
            do {
                let image = try await cardRenderer.render(template: template, data: mappedData, side: .front)
                await MainActor.run {
                    previewImage = image
                    previewError = nil
                }
            } catch {
                await MainActor.run {
                    previewImage = nil
                    previewError = "Impossible de générer l'aperçu"
                }
            }
        } else {
            await MainActor.run {
                previewImage = nil
                previewError = nil
            }
        }
    }
}

// MARK: - Record Row

struct RecordRow: View {
    let record: [String: String]
    let index: Int
    let isSelected: Bool
    
    var body: some View {
        HStack {
            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isSelected ? .blue : .secondary)
            
            VStack(alignment: .leading, spacing: 2) {
                // Show first 2-3 values as preview
                let keys = Array(record.keys.prefix(3))
                ForEach(keys, id: \.self) { key in
                    HStack {
                        Text(key)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(record[key] ?? "")
                            .font(.caption)
                    }
                }
            }
            
            Spacer()
            
            Text("#\(index + 1)")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Preview

#Preview {
    BatchPrintView(
        dataManager: DataSourceManager.shared,
        printerService: PrinterService.shared,
        cardRenderer: CardRenderer(),
        template: CardTemplate(name: "Test")
    )
}
