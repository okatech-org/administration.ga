import SwiftUI

// MARK: - Template Gallery View

struct TemplateGalleryView: View {
    @State private var selectedCategory: PredefinedTemplates.Category? = nil
    @State private var selectedTemplate: PredefinedTemplates.TemplateInfo?
    @State private var showPreview = false
    @State private var searchText = ""
    
    @Environment(\.dismiss) private var dismiss
    
    // Callback when template is selected
    var onSelectTemplate: ((CardTemplate) -> Void)?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                header
                
                Divider()
                
                // Content
                HStack(spacing: 0) {
                    // Sidebar with categories
                    categoriesSidebar
                        .frame(width: 220)
                    
                    Divider()
                    
                    // Template grid
                    templateGrid
                        .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Galerie de Templates")
            .sheet(item: $selectedTemplate) { template in
                TemplatePreviewSheet(
                    templateInfo: template,
                    onUse: { cardTemplate in
                        onSelectTemplate?(cardTemplate)
                        dismiss()
                    }
                )
            }
        }
    }
    
    // MARK: - Header
    
    private var header: some View {
        HStack {
            Text("Choisissez un modèle de carte")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Spacer()
            
            // Search
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Rechercher...", text: $searchText)
                    .textFieldStyle(.plain)
            }
            .padding(8)
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .frame(width: 200)
        }
        .padding()
        .background(.bar)
    }
    
    // MARK: - Categories Sidebar
    
    private var categoriesSidebar: some View {
        List(selection: $selectedCategory) {
            Section("Catégories") {
                // All templates
                Label("Tous les templates", systemImage: "square.grid.2x2")
                    .tag(nil as PredefinedTemplates.Category?)
                
                ForEach(PredefinedTemplates.Category.allCases) { category in
                    Label(category.rawValue, systemImage: category.icon)
                        .tag(category as PredefinedTemplates.Category?)
                }
            }
        }
        .listStyle(.sidebar)
    }
    
    // MARK: - Template Grid
    
    private var filteredTemplates: [PredefinedTemplates.TemplateInfo] {
        var templates = PredefinedTemplates.all
        
        // Filter by category
        if let category = selectedCategory {
            templates = templates.filter { $0.category == category }
        }
        
        // Filter by search
        if !searchText.isEmpty {
            templates = templates.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return templates
    }
    
    private var templateGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.adaptive(minimum: 280, maximum: 350), spacing: 20)
            ], spacing: 20) {
                ForEach(filteredTemplates) { template in
                    TemplateCard(templateInfo: template)
                        .onTapGesture {
                            selectedTemplate = template
                        }
                }
            }
            .padding()
        }
        .background(Color(.windowBackgroundColor))
    }
}

// MARK: - Template Card

struct TemplateCard: View {
    let templateInfo: PredefinedTemplates.TemplateInfo
    
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Preview area
            ZStack {
                // Background color preview
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(hex: templateInfo.template.backgroundColor) ?? .gray)
                    .aspectRatio(1.586, contentMode: .fit) // CR80 ratio
                
                // Icon overlay
                Image(systemName: templateInfo.thumbnail)
                    .font(.system(size: 48))
                    .foregroundStyle(.white.opacity(0.8))
            }
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.accentColor, lineWidth: isHovered ? 3 : 0)
            )
            .shadow(color: .black.opacity(0.1), radius: isHovered ? 8 : 4)
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(templateInfo.name)
                    .font(.headline)
                
                Text(templateInfo.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                
                // Category badge
                Text(templateInfo.category.rawValue)
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.accentColor.opacity(0.1))
                    .clipShape(Capsule())
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onHover { isHovered = $0 }
        .scaleEffect(isHovered ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.15), value: isHovered)
    }
}

// MARK: - Template Preview Sheet

struct TemplatePreviewSheet: View {
    let templateInfo: PredefinedTemplates.TemplateInfo
    let onUse: (CardTemplate) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var cardRenderer = CardRenderer()
    @State private var previewImage: NSImage?
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text(templateInfo.name)
                        .font(.title2.weight(.bold))
                    
                    Text(templateInfo.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()
            
            Divider()
            
            // Preview
            ScrollView {
                VStack(spacing: 20) {
                    // Rendered preview
                    if let image = previewImage {
                        Image(nsImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: 500)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(radius: 8)
                    } else {
                        // Fallback preview
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(hex: templateInfo.template.backgroundColor) ?? .gray)
                                .aspectRatio(1.586, contentMode: .fit)
                                .frame(maxWidth: 500)
                            
                            Image(systemName: templateInfo.thumbnail)
                                .font(.system(size: 80))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                    
                    // Dynamic fields info
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Champs dynamiques:")
                            .font(.headline)
                        
                        let fields = templateInfo.template.dynamicFields
                        if fields.isEmpty {
                            Text("Aucun champ dynamique")
                                .foregroundStyle(.secondary)
                        } else {
                            FlowLayout(spacing: 8) {
                                ForEach(fields, id: \.self) { field in
                                    Text("{\(field)}")
                                        .font(.caption.monospaced())
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.blue.opacity(0.1))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    .frame(maxWidth: 500, alignment: .leading)
                    .padding()
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding()
            }
            
            Divider()
            
            // Actions
            HStack {
                Button("Annuler") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)
                
                Spacer()
                
                Button {
                    var template = templateInfo.template
                    template.name = "\(templateInfo.name) - Copie"
                    onUse(template)
                } label: {
                    Label("Utiliser ce template", systemImage: "plus.circle.fill")
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
            }
            .padding()
        }
        .frame(minWidth: 600, minHeight: 500)
        .task {
            // Load preview async
            if let image = try? await cardRenderer.render(
                template: templateInfo.template,
                data: sampleData,
                side: .front
            ) {
                previewImage = image
            }
        }
    }
    
    // Sample data for preview
    private var sampleData: [String: String] {
        [
            "firstName": "Jean",
            "lastName": "Dupont",
            "fullName": "Jean Dupont",
            "jobTitle": "Développeur Senior",
            "department": "IT - Innovation",
            "employeeId": "EMP12345",
            "memberNumber": "MEM-2024-001234",
            "expiryDate": "31/12/2025",
            "studentId": "STU-2024-5678",
            "universityName": "Université Paris-Saclay",
            "program": "Master Informatique",
            "academicYear": "2024-2025",
            "visitorName": "Marie Martin",
            "visitorCompany": "Acme Corp",
            "hostName": "Pierre Bernard",
            "visitDate": "01/02/2025",
            "attendeeType": "SPEAKER",
            "organization": "Tech Company Inc.",
            "role": "CTO",
            "ticketId": "CONF-2024-VIP-001"
        ]
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                      y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                
                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
                
                self.size.width = max(self.size.width, x)
            }
            
            self.size.height = y + rowHeight
        }
    }
}

// MARK: - Preview

#Preview {
    TemplateGalleryView()
}
