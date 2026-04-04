//
//  iBoiteView.swift
//  AgentMacOS
//
//  Secure digital mailbox — 3-column layout: folders, mail list, thread view
//

import SwiftUI
import ConvexMobile
import Combine

struct iBoiteView: View {
    @Environment(AppState.self) private var appState
    @State private var mails: [ConvexMail] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedFolder: MailFolder = .inbox
    @State private var selectedMail: ConvexMail? = nil
    @State private var searchText = ""
    @State private var showCompose = false

    enum MailFolder: String, CaseIterable {
        case inbox, sent, drafts, archive, trash

        var label: String {
            switch self {
            case .inbox: "Boîte de réception"
            case .sent: "Envoyés"
            case .drafts: "Brouillons"
            case .archive: "Archives"
            case .trash: "Corbeille"
            }
        }

        var icon: String {
            switch self {
            case .inbox: "tray.full"
            case .sent: "paperplane"
            case .drafts: "doc.text"
            case .archive: "archivebox"
            case .trash: "trash"
            }
        }
    }

    private var filteredMails: [ConvexMail] {
        var result = mails.filter { $0.folder == selectedFolder.rawValue }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.subject.lowercased().contains(query) ||
                $0.senderName.lowercased().contains(query)
            }
        }
        return result.sorted { ($0.createdAt ?? $0._creationTime) > ($1.createdAt ?? $1._creationTime) }
    }

    private var unreadCount: Int {
        mails.filter { $0.folder == "inbox" && !$0.isRead }.count
    }

    var body: some View {
        OrgGatedView {
            HSplitView {
                // Left: Folder sidebar
                folderSidebar
                    .frame(minWidth: 180, maxWidth: 220)

                // Middle: Mail list
                mailList
                    .frame(minWidth: 280, maxWidth: 400)

                // Right: Thread view
                threadView
                    .frame(minWidth: 400)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadMails() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadMails() }
            }
            .sheet(isPresented: $showCompose) {
                ComposeMailSheet { await loadMails() }
            }
        }
    }

    // MARK: - Folder Sidebar

    private var folderSidebar: some View {
        VStack(spacing: 0) {
            HStack {
                Text("iBoîte")
                    .font(.headline)
                Spacer()
                Button {
                    showCompose = true
                } label: {
                    Image(systemName: "square.and.pencil")
                }
                .buttonStyle(.plain)
            }
            .padding(12)

            Divider()

            List(MailFolder.allCases, id: \.self, selection: Binding(
                get: { selectedFolder },
                set: { if let v = $0 { selectedFolder = v } }
            )) { folder in
                HStack {
                    Label(folder.label, systemImage: folder.icon)
                    Spacer()
                    if folder == .inbox && unreadCount > 0 {
                        Text("\(unreadCount)")
                            .font(.caption2.bold())
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                    }
                }
            }
            .listStyle(.sidebar)
        }
    }

    // MARK: - Mail List

    private var mailList: some View {
        VStack(spacing: 0) {
            SearchFilterBar(searchText: $searchText, placeholder: "Rechercher...")
                .padding(8)

            Divider()

            if isLoading {
                LoadingView(message: "Chargement...")
            } else if filteredMails.isEmpty {
                EmptyStateView(
                    icon: "tray",
                    title: "Aucun message",
                    subtitle: "Cette boîte est vide."
                )
            } else {
                List(filteredMails, selection: Binding(
                    get: { selectedMail },
                    set: { selectedMail = $0 }
                )) { mail in
                    mailRow(mail)
                        .tag(mail)
                }
                .listStyle(.plain)
            }
        }
        .background(Color(.controlBackgroundColor))
    }

    private func mailRow(_ mail: ConvexMail) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                if !mail.isRead {
                    Circle()
                        .fill(.blue)
                        .frame(width: 8, height: 8)
                }
                Text(mail.senderName)
                    .font(.subheadline)
                    .fontWeight(mail.isRead ? .regular : .bold)
                    .lineLimit(1)
                Spacer()
                Text(formatRelativeDate(mail.createdAt ?? mail._creationTime))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text(mail.subject)
                .font(.body)
                .fontWeight(mail.isRead ? .regular : .semibold)
                .lineLimit(1)

            if let preview = mail.preview, !preview.isEmpty {
                Text(preview)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            selectedMail = mail
            if !mail.isRead {
                Task { await markAsRead(mail) }
            }
        }
    }

    // MARK: - Thread View

    private var threadView: some View {
        Group {
            if let mail = selectedMail {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text(mail.subject)
                                .font(.title2.bold())

                            HStack(spacing: 16) {
                                HStack(spacing: 4) {
                                    Text("De:")
                                        .foregroundStyle(.secondary)
                                    Text(mail.senderName)
                                        .fontWeight(.medium)
                                    if let email = mail.sender?.email {
                                        Text("<\(email)>")
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                if let recipient = mail.recipient {
                                    HStack(spacing: 4) {
                                        Text("À:")
                                            .foregroundStyle(.secondary)
                                        Text(recipient.name ?? recipient.email ?? "—")
                                    }
                                }

                                Spacer()

                                Text(formatDateTime(mail.createdAt ?? mail._creationTime))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .font(.subheadline)
                        }

                        Divider()

                        // Content
                        if let content = mail.content, !content.isEmpty {
                            Text(content)
                                .font(.body)
                                .textSelection(.enabled)
                        }

                        Spacer(minLength: 24)

                        // Actions
                        HStack(spacing: 12) {
                            Button {
                                showCompose = true
                            } label: {
                                Label("Répondre", systemImage: "arrowshape.turn.up.left")
                            }
                            .buttonStyle(.bordered)

                            Button {
                                Task { await toggleStar(mail) }
                            } label: {
                                Label(
                                    mail.isStarred ? "Retirer étoile" : "Étoile",
                                    systemImage: mail.isStarred ? "star.fill" : "star"
                                )
                            }
                            .buttonStyle(.bordered)

                            if mail.folder != "archive" {
                                Button {
                                    Task { await moveMail(mail, to: "archive") }
                                } label: {
                                    Label("Archiver", systemImage: "archivebox")
                                }
                                .buttonStyle(.bordered)
                            }

                            if mail.folder != "trash" {
                                Button {
                                    Task { await moveMail(mail, to: "trash") }
                                } label: {
                                    Label("Supprimer", systemImage: "trash")
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                            }
                        }
                    }
                    .padding(24)
                }
            } else {
                EmptyStateView(
                    icon: "envelope.open",
                    title: "Sélectionnez un message",
                    subtitle: "Choisissez un message pour le lire."
                )
            }
        }
    }

    // MARK: - Actions

    private func markAsRead(_ mail: ConvexMail) async {
        do {
            try await convex.mutation("functions/digitalMail:markRead", with: [
                "mailId": mail._id
            ])
        } catch {
            print("[iBoite] markRead error: \(error)")
        }
    }

    private func toggleStar(_ mail: ConvexMail) async {
        do {
            try await convex.mutation("functions/digitalMail:toggleStar", with: [
                "mailId": mail._id
            ])
            await loadMails()
        } catch {
            print("[iBoite] toggleStar error: \(error)")
        }
    }

    private func moveMail(_ mail: ConvexMail, to folder: String) async {
        do {
            try await convex.mutation("functions/digitalMail:move", with: [
                "mailId": mail._id,
                "folder": folder
            ])
            if selectedMail?._id == mail._id {
                selectedMail = nil
            }
            await loadMails()
        } catch {
            print("[iBoite] move error: \(error)")
        }
    }

    // MARK: - Data

    private func loadMails() async {
        guard appState.selectedOrgId != nil else { return }
        isLoading = true
        errorMessage = nil

        do {
            let result = try await convexQuery(
                "functions/digitalMail:list",
                with: ["paginationOpts": ["numItems": 100.0, "cursor": NSNull()]],
                yielding: PaginatedMails.self
            )
            mails = result.page
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }

        isLoading = false
    }
}

// MARK: - Compose Mail Sheet

struct ComposeMailSheet: View {
    let onSent: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var to = ""
    @State private var subject = ""
    @State private var messageBody = ""
    @State private var isSending = false

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Nouveau message")
                    .font(.title3.bold())
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            VStack(spacing: 8) {
                HStack {
                    Text("À:").foregroundStyle(.secondary).frame(width: 40, alignment: .leading)
                    TextField("Destinataire", text: $to)
                        .textFieldStyle(.roundedBorder)
                }
                HStack {
                    Text("Objet:").foregroundStyle(.secondary).frame(width: 40, alignment: .leading)
                    TextField("Objet du message", text: $subject)
                        .textFieldStyle(.roundedBorder)
                }
            }

            TextEditor(text: $messageBody)
                .font(.body)
                .frame(minHeight: 200)
                .border(Color(.separatorColor), width: 1)

            HStack {
                Spacer()
                Button("Envoyer") {
                    Task { await sendMail() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(to.isEmpty || subject.isEmpty || isSending)
            }
        }
        .padding(24)
        .frame(width: 550, height: 450)
    }

    private func sendMail() async {
        isSending = true
        do {
            try await convex.action("functions/sendMail:send", with: [
                "to": to,
                "subject": subject,
                "content": messageBody
            ])
            await onSent()
            dismiss()
        } catch {
            print("[ComposeMail] Send error: \(error)")
        }
        isSending = false
    }
}
