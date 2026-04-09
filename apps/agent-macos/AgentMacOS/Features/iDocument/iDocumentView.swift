//
//  iDocumentView.swift
//  AgentMacOS
//
//  Document management — browse, upload, view document statuses
//

import SwiftUI
import ConvexMobile
import Combine

struct iDocumentView: View {
    @Environment(AppState.self) private var appState
    @State private var documents: [ConvexDocument] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var statusFilter: String? = nil
    @State private var categoryFilter: String? = nil
    @State private var viewMode: ViewMode = .list
    @State private var selectedDocument: ConvexDocument? = nil

    enum ViewMode: String, CaseIterable {
        case list = "Liste"
        case grid = "Grille"
    }

    private var categories: [String] {
        Array(Set(documents.compactMap { $0.category })).sorted()
    }

    private var filteredDocuments: [ConvexDocument] {
        var result = documents
        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }
        if let filter = categoryFilter {
            result = result.filter { $0.category == filter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.displayLabel.lowercased().contains(query) ||
                ($0.documentType?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(title: "iDocument", subtitle: "Gestion documentaire") {
                        AnyView(
                            Picker("Vue", selection: $viewMode) {
                                ForEach(ViewMode.allCases, id: \.self) { mode in
                                    Label(mode.rawValue, systemImage: mode == .list ? "list.bullet" : "square.grid.2x2")
                                        .tag(mode)
                                }
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 140)
                        )
                    }

                    // Filters
                    HStack(spacing: 12) {
                        SearchFilterBar(searchText: $searchText, placeholder: "Rechercher un document...")

                        Picker("Statut", selection: $statusFilter) {
                            Text("Tous statuts").tag(nil as String?)
                            Text("En attente").tag("pending" as String?)
                            Text("Validé").tag("validated" as String?)
                            Text("Rejeté").tag("rejected" as String?)
                        }
                        .frame(width: 140)

                        if !categories.isEmpty {
                            Picker("Catégorie", selection: $categoryFilter) {
                                Text("Toutes catégories").tag(nil as String?)
                                ForEach(categories, id: \.self) { cat in
                                    Text(cat.capitalized).tag(cat as String?)
                                }
                            }
                            .frame(width: 160)
                        }
                    }

                    if isLoading {
                        LoadingView(message: "Chargement des documents...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadDocuments() }
                    } else if filteredDocuments.isEmpty {
                        EmptyStateView(
                            icon: "doc.text",
                            title: "Aucun document",
                            subtitle: "Les documents apparaîtront ici."
                        )
                    } else if viewMode == .grid {
                        documentGrid
                    } else {
                        documentList
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadDocuments() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadDocuments() }
            }
            .sheet(item: $selectedDocument) { doc in
                DocumentDetailSheet(document: doc) {
                    Task { await loadDocuments() }
                }
            }
        }
    }

    // MARK: - Grid View

    private var documentGrid: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 200), spacing: 16)], spacing: 16) {
            ForEach(filteredDocuments) { doc in
                Button {
                    selectedDocument = doc
                } label: {
                    VStack(spacing: 12) {
                        Image(systemName: documentIcon(doc))
                            .font(.system(size: 36))
                            .foregroundStyle(documentIconColor(doc))

                        Text(doc.displayLabel)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)

                        if let status = doc.status {
                            StatusBadge(
                                label: docStatusLabel(status),
                                color: docStatusColor(status)
                            )
                        }

                        if let files = doc.files, !files.isEmpty {
                            Text("\(files.count) fichier\(files.count > 1 ? "s" : "")")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(16)
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - List View

    private var documentList: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text("Document").font(.caption).foregroundStyle(.secondary).frame(minWidth: 200, alignment: .leading)
                Text("Type").font(.caption).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
                Text("Catégorie").font(.caption).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
                Text("Statut").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .center)
                Text("Fichiers").font(.caption).foregroundStyle(.secondary).frame(width: 70, alignment: .center)
                Text("Date").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            ForEach(filteredDocuments) { doc in
                Button {
                    selectedDocument = doc
                } label: {
                    HStack(spacing: 0) {
                        HStack(spacing: 8) {
                            Image(systemName: documentIcon(doc))
                                .foregroundStyle(documentIconColor(doc))
                            Text(doc.displayLabel)
                                .lineLimit(1)
                        }
                        .frame(minWidth: 200, alignment: .leading)

                        Text(doc.documentType ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .frame(width: 120, alignment: .leading)

                        Text(doc.category?.capitalized ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 120, alignment: .leading)

                        if let status = doc.status {
                            StatusBadge(label: docStatusLabel(status), color: docStatusColor(status))
                                .frame(width: 100, alignment: .center)
                        } else {
                            Text("—").frame(width: 100, alignment: .center)
                        }

                        Text("\(doc.files?.count ?? 0)")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 70, alignment: .center)

                        Text(formatDate(doc.updatedAt ?? doc._creationTime))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(width: 100, alignment: .trailing)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if doc.id != filteredDocuments.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Helpers

    private func documentIcon(_ doc: ConvexDocument) -> String {
        guard let type = doc.documentType else { return "doc.fill" }
        switch type {
        case let t where t.contains("passport"): return "book.closed.fill"
        case let t where t.contains("identity"): return "person.text.rectangle.fill"
        case let t where t.contains("photo"): return "photo.fill"
        case let t where t.contains("birth"): return "heart.text.square.fill"
        default: return "doc.fill"
        }
    }

    private func documentIconColor(_ doc: ConvexDocument) -> Color {
        switch doc.status {
        case "validated": .green
        case "rejected": .red
        case "pending": .yellow
        default: .blue
        }
    }

    private func docStatusLabel(_ status: String) -> String {
        switch status {
        case "pending": "En attente"
        case "validated": "Validé"
        case "rejected": "Rejeté"
        default: status.capitalized
        }
    }

    private func docStatusColor(_ status: String) -> Color {
        switch status {
        case "validated": .green
        case "rejected": .red
        case "pending": .yellow
        default: .gray
        }
    }

    // MARK: - Data

    private func loadDocuments() async {
        guard appState.selectedOrgId != nil else { return }
        isLoading = true
        errorMessage = nil

        do {
            documents = try await convexQuery(
                "functions/documents:listMine",
                yielding: [ConvexDocument].self
            )
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }

        isLoading = false
    }
}

// MARK: - Document Detail Sheet

struct DocumentDetailSheet: View {
    let document: ConvexDocument
    let onUpdate: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    init(document: ConvexDocument, onUpdate: (() -> Void)? = nil) {
        self.document = document
        self.onUpdate = onUpdate
    }

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(document.displayLabel)
                        .font(.title2.bold())
                    if let type = document.documentType {
                        Text(type)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                if let status = document.status {
                    detailRow("Statut", status.capitalized)
                }
                if let category = document.category {
                    detailRow("Catégorie", category.capitalized)
                }
                detailRow("Créé le", formatDate(document._creationTime))
                if let expires = document.expiresAt {
                    detailRow("Expire le", formatDate(expires))
                }
            }

            if let files = document.files, !files.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 8) {
                    Text("Fichiers (\(files.count))")
                        .font(.headline)
                    ForEach(files, id: \.storageId) { file in
                        HStack {
                            Image(systemName: "doc")
                                .foregroundStyle(.blue)
                            VStack(alignment: .leading) {
                                Text(file.filename)
                                    .font(.subheadline)
                                if let size = file.sizeBytes {
                                    Text(ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                        }
                        .padding(8)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }

            Spacer()

            // Actions
            HStack {
                if document.status == "pending" {
                    Button {
                        Task { await validateDocument() }
                    } label: {
                        Label("Valider", systemImage: "checkmark.circle.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)

                    Button {
                        Task { await rejectDocument() }
                    } label: {
                        Label("Rejeter", systemImage: "xmark.circle.fill")
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                }

                Button("Supprimer", role: .destructive) {
                    showDeleteConfirm = true
                }
                .buttonStyle(.bordered)
                .tint(.red)

                Spacer()

                Button("Fermer") { dismiss() }
                    .buttonStyle(.bordered)
            }
        }
        .padding(24)
        .frame(width: 450, height: 550)
        .alert("Supprimer ce document ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await deleteDocument() } }
        }
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.subheadline)
        }
    }

    private func validateDocument() async {
        do {
            try await convexMutation("functions/documents:validate", with: [
                "documentId": document._id,
            ])
            onUpdate?()
            dismiss()
        } catch {
            print("[DocumentDetail] Validate error: \(error)")
        }
    }

    private func rejectDocument() async {
        do {
            try await convexMutation("functions/documents:reject", with: [
                "documentId": document._id,
            ])
            onUpdate?()
            dismiss()
        } catch {
            print("[DocumentDetail] Reject error: \(error)")
        }
    }

    private func deleteDocument() async {
        do {
            try await convexMutation("functions/documents:remove", with: [
                "documentId": document._id,
            ])
            onUpdate?()
            dismiss()
        } catch {
            print("[DocumentDetail] Delete error: \(error)")
        }
    }
}
