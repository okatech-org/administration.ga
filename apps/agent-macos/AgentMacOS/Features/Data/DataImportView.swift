import SwiftUI

// MARK: - Data Import View

/// Main view for data import and batch printing
/// Allows selecting a template and importing CSV data
struct DataImportView: View {
    @State private var dataManager = DataSourceManager.shared
    @State private var printerService = PrinterService.shared
    @State private var cardRenderer = CardRenderer()
    
    @State private var templates: [CardTemplate] = []
    @State private var selectedTemplateId: UUID?
    @State private var isLoadingTemplates = true
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with template selector
            header
            
            Divider()
            
            // Main content
            if let template = selectedTemplate {
                BatchPrintView(
                    dataManager: dataManager,
                    printerService: printerService,
                    cardRenderer: cardRenderer,
                    template: template
                )
            } else {
                noTemplateView
            }
        }
        .task {
            await loadTemplates()
        }
    }
    
    private var selectedTemplate: CardTemplate? {
        guard let id = selectedTemplateId else { return nil }
        return templates.first { $0.id == id }
    }
    
    private func loadTemplates() async {
        isLoadingTemplates = true
        do {
            templates = try TemplateStorage.shared.loadAll()
            // Auto-select first template if none selected
            if selectedTemplateId == nil, let first = templates.first {
                selectedTemplateId = first.id
            }
        } catch {
            print("❌ [DataImportView] Failed to load templates: \(error)")
        }
        isLoadingTemplates = false
    }
    
    // MARK: - Header
    
    private var header: some View {
        HStack {
            // Title
            VStack(alignment: .leading, spacing: 2) {
                Text("Impression par lots")
                    .font(.title2.weight(.semibold))
                
                Text("Importez des données CSV et imprimez plusieurs cartes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            // Template selector
            if !templates.isEmpty {
                Picker("Template", selection: $selectedTemplateId) {
                    Text("Sélectionner un template")
                        .tag(nil as UUID?)
                    
                    ForEach(templates) { template in
                        Text(template.name)
                            .tag(template.id as UUID?)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 200)
            }
            
            // Refresh button
            Button {
                Task { await loadTemplates() }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.borderless)
            .help("Recharger les templates")
            
            // Printer status
            printerStatusBadge
        }
        .padding()
        .background(.bar)
    }
    
    private var printerStatusBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(printerService.isConnected ? .green : .red)
                .frame(width: 8, height: 8)
            
            Text(printerService.isConnected
                ? (printerService.connectedPrinter?.name ?? "Connectée")
                : "Non connectée")
                .font(.caption)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(Capsule())
    }
    
    // MARK: - No Template View
    
    private var noTemplateView: some View {
        VStack(spacing: 20) {
            if isLoadingTemplates {
                ProgressView("Chargement des templates...")
            } else {
                Image(systemName: "rectangle.on.rectangle.slash")
                    .font(.system(size: 64))
                    .foregroundStyle(.secondary)
                
                Text("Aucun template disponible")
                    .font(.title2)
                
                Text("Créez d'abord un template dans le Card Designer\npuis revenez ici pour l'impression par lots")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }
}

// MARK: - Preview

#Preview {
    DataImportView()
}
