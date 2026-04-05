//
//  PostsView.swift
//  AgentMacOS
//
//  Articles/posts management — list, create, edit, publish
//

import SwiftUI
import ConvexMobile
import Combine

struct PostsView: View {
    @Environment(AppState.self) private var appState
    @State private var posts: [ConvexPost] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var statusFilter: PostStatus? = nil
    @State private var selectedPost: ConvexPost? = nil
    @State private var showNewPostSheet = false

    private var filteredPosts: [ConvexPost] {
        var result = posts
        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { $0.title.lowercased().contains(query) }
        }
        return result
    }

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(title: "Actualités", subtitle: "Gérez les articles et communiqués") {
                        AnyView(
                            Button {
                                showNewPostSheet = true
                            } label: {
                                Label("Nouvel article", systemImage: "plus")
                            }
                            .buttonStyle(.borderedProminent)
                        )
                    }

                    // Filters
                    HStack(spacing: 12) {
                        SearchFilterBar(searchText: $searchText, placeholder: "Rechercher un article...")

                        // Status filter
                        Picker("Statut", selection: $statusFilter) {
                            Text("Tous").tag(nil as PostStatus?)
                            ForEach([PostStatus.draft, .published, .archived], id: \.self) { status in
                                Text(status.label).tag(status as PostStatus?)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 260)
                    }

                    if isLoading {
                        LoadingView(message: "Chargement des articles...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadPosts() }
                    } else if filteredPosts.isEmpty {
                        EmptyStateView(
                            icon: "newspaper",
                            title: "Aucun article",
                            subtitle: searchText.isEmpty ? "Créez votre premier article." : "Aucun résultat pour \"\(searchText)\""
                        )
                    } else {
                        postsList
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadPosts() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadPosts() }
            }
            .sheet(item: $selectedPost) { post in
                PostDetailSheet(post: post) {
                    Task { await loadPosts() }
                }
            }
            .sheet(isPresented: $showNewPostSheet) {
                NewPostSheet(orgId: appState.selectedOrgId ?? "") {
                    Task { await loadPosts() }
                }
            }
        }
    }

    // MARK: - Posts List

    private var postsList: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 0) {
                Text("Titre").font(.caption).foregroundStyle(.secondary).frame(minWidth: 250, alignment: .leading)
                Text("Catégorie").font(.caption).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
                Text("Statut").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .center)
                Text("Auteur").font(.caption).foregroundStyle(.secondary).frame(minWidth: 120, alignment: .leading)
                Text("Date").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            ForEach(filteredPosts) { post in
                Button {
                    selectedPost = post
                } label: {
                    HStack(spacing: 0) {
                        Text(post.title)
                            .font(.body)
                            .lineLimit(1)
                            .frame(minWidth: 250, alignment: .leading)

                        Text(post.category?.capitalized ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 120, alignment: .leading)

                        StatusBadge(
                            label: post.status.label,
                            color: statusColor(post.status.color)
                        )
                        .frame(width: 100, alignment: .center)

                        Text(post.authorName ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .frame(minWidth: 120, alignment: .leading)

                        Text(formatDate(post.createdAt ?? post._creationTime))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(width: 100, alignment: .trailing)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if post.id != filteredPosts.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Data

    private func loadPosts() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            let result = try await convexQuery(
                "functions/posts:listByOrg",
                with: ["orgId": orgId, "paginationOpts": ["numItems": 50.0, "cursor": NSNull()]],
                yielding: PaginatedPosts.self
            )
            posts = result.page
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }

        isLoading = false
    }
}

// MARK: - Post Detail Sheet

struct PostDetailSheet: View {
    let post: ConvexPost
    let onUpdate: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var isEditing = false
    @State private var editTitle = ""
    @State private var editExcerpt = ""
    @State private var editContent = ""
    @State private var editCategory = "news"
    @State private var isSaving = false
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if isEditing {
                        TextField("Titre", text: $editTitle)
                            .textFieldStyle(.roundedBorder)
                            .font(.title3)
                    } else {
                        Text(post.title)
                            .font(.title2.bold())
                    }
                    HStack(spacing: 8) {
                        StatusBadge(label: post.status.label, color: statusColor(post.status.color))
                        if let cat = post.category {
                            Text(cat.capitalized)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let author = post.authorName {
                            Text("par \(author)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Spacer()
                if !isEditing {
                    Button { startEditing() } label: {
                        Label("Modifier", systemImage: "pencil")
                    }
                    .buttonStyle(.bordered)
                }
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            if isEditing {
                editForm
            } else {
                readOnlyContent
            }

            Divider()

            // Actions
            HStack {
                if isEditing {
                    Button("Annuler") { isEditing = false }.buttonStyle(.bordered)
                    Spacer()
                    Button {
                        Task { await saveEdit() }
                    } label: {
                        if isSaving { ProgressView().controlSize(.small) }
                        else { Label("Enregistrer", systemImage: "checkmark.circle.fill") }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(editTitle.isEmpty || isSaving)
                } else {
                    if post.status == .draft {
                        Button("Publier") {
                            Task {
                                try? await convex.mutation("functions/posts:setStatus", with: [
                                    "postId": post._id,
                                    "status": "published"
                                ])
                                onUpdate()
                                dismiss()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    } else if post.status == .published {
                        Button("Dépublier") {
                            Task {
                                try? await convex.mutation("functions/posts:setStatus", with: [
                                    "postId": post._id,
                                    "status": "draft"
                                ])
                                onUpdate()
                                dismiss()
                            }
                        }
                        .buttonStyle(.bordered)
                    }

                    Spacer()

                    Button("Supprimer", role: .destructive) {
                        showDeleteConfirm = true
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                }
            }
        }
        .padding(24)
        .frame(width: 600, height: 550)
        .alert("Supprimer cet article ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) {
                Task {
                    try? await convex.mutation("functions/posts:remove", with: ["postId": post._id])
                    onUpdate()
                    dismiss()
                }
            }
        } message: {
            Text("Cette action est irréversible.")
        }
    }

    private var readOnlyContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let excerpt = post.excerpt, !excerpt.isEmpty {
                    Text(excerpt)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let content = post.content, !content.isEmpty {
                    Text(content)
                        .font(.body)
                        .textSelection(.enabled)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var editForm: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Catégorie").font(.caption).foregroundStyle(.secondary)
                    Picker("Catégorie", selection: $editCategory) {
                        Text("Actualité").tag("news")
                        Text("Événement").tag("event")
                        Text("Communiqué").tag("communique")
                    }
                    .pickerStyle(.segmented)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Résumé").font(.caption).foregroundStyle(.secondary)
                    TextField("Résumé", text: $editExcerpt)
                        .textFieldStyle(.roundedBorder)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Contenu").font(.caption).foregroundStyle(.secondary)
                    TextEditor(text: $editContent)
                        .font(.body)
                        .frame(minHeight: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func startEditing() {
        editTitle = post.title
        editExcerpt = post.excerpt ?? ""
        editContent = post.content ?? ""
        editCategory = post.category ?? "news"
        isEditing = true
    }

    private func saveEdit() async {
        isSaving = true
        do {
            try await convexMutation("functions/posts:update", with: [
                "postId": post._id,
                "title": editTitle,
                "excerpt": editExcerpt,
                "content": editContent,
                "category": editCategory,
            ])
            onUpdate()
            dismiss()
        } catch {
            print("[PostDetail] Edit error: \(error)")
        }
        isSaving = false
    }
}

// MARK: - New Post Sheet

struct NewPostSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var excerpt = ""
    @State private var content = ""
    @State private var category = "news"
    @State private var isSaving = false

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                Text("Nouvel article")
                    .font(.title2.bold())
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
                TextField("Titre de l'article", text: $title)
                    .textFieldStyle(.roundedBorder)
                    .font(.title3)

                Picker("Catégorie", selection: $category) {
                    Text("Actualité").tag("news")
                    Text("Événement").tag("event")
                    Text("Communiqué").tag("communique")
                }
                .pickerStyle(.segmented)

                TextField("Résumé (optionnel)", text: $excerpt)
                    .textFieldStyle(.roundedBorder)

                Text("Contenu")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextEditor(text: $content)
                    .font(.body)
                    .frame(minHeight: 200)
                    .border(Color(.separatorColor), width: 1)
            }

            Spacer()

            HStack {
                Button("Annuler") { dismiss() }
                    .buttonStyle(.bordered)
                Spacer()
                Button("Créer") {
                    Task { await createPost() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(title.isEmpty || isSaving)
            }
        }
        .padding(24)
        .frame(width: 600, height: 550)
    }

    private func createPost() async {
        isSaving = true
        do {
            try await convex.mutation("functions/posts:create", with: [
                "orgId": orgId,
                "title": title,
                "excerpt": excerpt,
                "content": content,
                "category": category,
            ])
            onCreated()
            dismiss()
        } catch {
            print("[NewPostSheet] Error: \(error)")
        }
        isSaving = false
    }
}

// MARK: - Color Helper

private func statusColor(_ name: String) -> Color {
    switch name {
    case "green": .green
    case "blue": .blue
    case "red": .red
    case "yellow": .yellow
    case "orange": .orange
    case "purple": .purple
    case "teal": .teal
    default: .gray
    }
}
