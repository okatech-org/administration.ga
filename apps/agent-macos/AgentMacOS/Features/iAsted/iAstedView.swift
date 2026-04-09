//
//  iAstedView.swift
//  AgentMacOS
//
//  AI assistant — tab-based interface: Chat, Contacts, Calls, Meetings, Settings
//

import SwiftUI
import ConvexMobile

struct iAstedView: View {
    @State private var selectedTab: AstedTab = .chat

    enum AstedTab: String, CaseIterable {
        case chat = "iChat"
        case contacts = "iContact"
        case calls = "iAppel"
        case meetings = "iRéunion"
        case settings = "Paramètres"

        var icon: String {
            switch self {
            case .chat: "bubble.left.and.bubble.right"
            case .contacts: "person.2"
            case .calls: "phone"
            case .meetings: "video"
            case .settings: "gear"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            HStack(spacing: 0) {
                ForEach(AstedTab.allCases, id: \.self) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: tab.icon)
                                .font(.title3)
                            Text(tab.rawValue)
                                .font(.caption2)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .foregroundStyle(selectedTab == tab ? .blue : .secondary)
                        .background(selectedTab == tab ? Color.blue.opacity(0.1) : Color.clear)
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color(.controlBackgroundColor))

            Divider()

            // Tab content
            switch selectedTab {
            case .chat: AstedChatTab()
            case .contacts: AstedContactsTab()
            case .calls: AstedCallsTab()
            case .meetings: AstedMeetingsTab()
            case .settings: AstedSettingsTab()
            }
        }
        .frame(maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }
}

// MARK: - Chat Tab

struct AstedChatTab: View {
    @Environment(AppState.self) private var appState
    @State private var chats: [ConvexChat] = []
    @State private var selectedChat: ConvexChat?
    @State private var messages: [ConvexChatMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        HSplitView {
            // Chat list
            VStack(spacing: 0) {
                HStack {
                    Text("Conversations")
                        .font(.headline)
                    Spacer()
                    Text("\(chats.count)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.15))
                        .clipShape(Capsule())
                }
                .padding(12)

                Divider()

                if isLoading && chats.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if chats.isEmpty {
                    EmptyStateView(
                        icon: "bubble.left.and.bubble.right",
                        title: "Aucune conversation",
                        subtitle: "Les conversations avec les citoyens apparaîtront ici"
                    )
                } else {
                    List(selection: $selectedChat) {
                        ForEach(chats) { chat in
                            chatRow(chat)
                                .tag(chat)
                        }
                    }
                    .listStyle(.inset)
                }
            }
            .frame(minWidth: 260, idealWidth: 300)

            // Message view
            VStack(spacing: 0) {
                if let chat = selectedChat {
                    // Chat header
                    HStack(spacing: 12) {
                        avatarCircle(name: chat.displayName, url: chat.otherUser?.avatarUrl, size: 36)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(chat.displayName)
                                .font(.headline)
                            Text(chat.otherUser?.email ?? "")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        statusBadge(chat.status == "active" ? "Actif" : "Archivé",
                                    color: chat.status == "active" ? .green : .secondary)
                    }
                    .padding(12)
                    .background(Color(.controlBackgroundColor))

                    Divider()

                    // Messages
                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(spacing: 8) {
                                ForEach(messages) { msg in
                                    messageBubble(msg, currentUserId: ConvexService.shared.currentUser?.id)
                                        .id(msg.id)
                                }
                            }
                            .padding(16)
                        }
                        .onChange(of: messages.count) { _, _ in
                            if let last = messages.last {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }

                    Divider()

                    // Input
                    HStack(spacing: 8) {
                        TextField("Écrivez votre message...", text: $inputText)
                            .textFieldStyle(.roundedBorder)
                            .onSubmit { sendMessage() }

                        Button {
                            sendMessage()
                        } label: {
                            Image(systemName: "paperplane.fill")
                                .foregroundStyle(.blue)
                        }
                        .buttonStyle(.plain)
                        .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
                    }
                    .padding(12)
                    .background(Color(.controlBackgroundColor))
                } else {
                    EmptyStateView(
                        icon: "bubble.left.and.bubble.right",
                        title: "Sélectionnez une conversation",
                        subtitle: "Choisissez une conversation dans la liste"
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .task { await loadChats() }
        .onChange(of: selectedChat) { _, chat in
            if let chat = chat {
                Task { await loadMessages(chatId: chat._id) }
            }
        }
    }

    private func chatRow(_ chat: ConvexChat) -> some View {
        HStack(spacing: 10) {
            avatarCircle(name: chat.displayName, url: chat.otherUser?.avatarUrl, size: 32)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(chat.displayName)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    Spacer()
                    if let ts = chat.lastMessageAt {
                        Text(Date(timeIntervalSince1970: ts / 1000).formatted(date: .abbreviated, time: .shortened))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Text(chat.preview)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            if let unread = chat.unreadCount, unread > 0 {
                Text("\(unread)")
                    .font(.caption2.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }

    private func messageBubble(_ msg: ConvexChatMessage, currentUserId: String?) -> some View {
        let isMe = msg.senderId == currentUserId
        return HStack {
            if isMe { Spacer() }
            VStack(alignment: isMe ? .trailing : .leading, spacing: 4) {
                Text(msg.content)
                    .font(.body)
                    .textSelection(.enabled)
                Text(Date(timeIntervalSince1970: msg._creationTime / 1000).formatted(date: .omitted, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .background(isMe ? Color.blue.opacity(0.15) : Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .frame(maxWidth: 500, alignment: isMe ? .trailing : .leading)
            if !isMe { Spacer() }
        }
    }

    private func loadChats() async {
        isLoading = true
        do {
            chats = try await convexQuery("functions/chats:listMyChats", yielding: [ConvexChat].self)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func loadMessages(chatId: String) async {
        do {
            messages = try await convexQuery(
                "functions/chats:listMessages",
                with: ["chatId": chatId, "limit": 100.0],
                yielding: [ConvexChatMessage].self
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty, let chat = selectedChat else { return }
        inputText = ""
        isSending = true

        Task {
            do {
                try await convex.mutation("functions/chats:sendMessage", with: [
                    "chatId": chat._id,
                    "content": text
                ])
                await loadMessages(chatId: chat._id)
                await loadChats()
            } catch {
                errorMessage = error.localizedDescription
            }
            isSending = false
        }
    }
}

// MARK: - Contacts Tab

struct AstedContactsTab: View {
    @Environment(AppState.self) private var appState
    @State private var members: [ConvexTeamMember] = []
    @State private var searchText = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var filteredMembers: [ConvexTeamMember] {
        if searchText.isEmpty { return members }
        let q = searchText.lowercased()
        return members.filter {
            $0.displayName.lowercased().contains(q) ||
            $0.email.lowercased().contains(q) ||
            ($0.position?.title?.lowercased().contains(q) ?? false)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Contacts de l'équipe")
                    .font(.headline)
                Spacer()
                Text("\(members.count) membres")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(16)

            // Search
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Rechercher un contact...", text: $searchText)
                    .textFieldStyle(.plain)
            }
            .padding(8)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            Divider()

            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredMembers.isEmpty {
                EmptyStateView(
                    icon: "person.2",
                    title: searchText.isEmpty ? "Aucun contact" : "Aucun résultat",
                    subtitle: searchText.isEmpty ? "Les membres de l'équipe apparaîtront ici" : "Modifiez votre recherche"
                )
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 280, maximum: 350), spacing: 16)], spacing: 16) {
                        ForEach(filteredMembers) { member in
                            contactCard(member)
                        }
                    }
                    .padding(16)
                }
            }
        }
        .frame(maxHeight: .infinity)
        .task { await loadContacts() }
    }

    private func contactCard(_ member: ConvexTeamMember) -> some View {
        HStack(spacing: 12) {
            avatarCircle(name: member.displayName, url: member.user?.avatarUrl, size: 44)

            VStack(alignment: .leading, spacing: 4) {
                Text(member.displayName)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)

                if !member.email.isEmpty {
                    Text(member.email)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if let pos = member.position?.title {
                    Text(pos)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .clipShape(Capsule())
                }
            }

            Spacer()

            // Status
            Circle()
                .fill(member.user?.isActive == true ? Color.green : Color.gray)
                .frame(width: 8, height: 8)
        }
        .padding(12)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func loadContacts() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            members = try await convexQuery(
                "functions/memberships:listOrgMembers",
                with: ["orgId": orgId],
                yielding: [ConvexTeamMember].self
            )
        } catch {
            // Fallback
            do {
                members = try await convexQuery(
                    "functions/memberships:listMyMemberships",
                    yielding: [ConvexTeamMember].self
                )
            } catch {
                errorMessage = error.localizedDescription
            }
        }
        isLoading = false
    }
}

// MARK: - Calls Tab

struct AstedCallsTab: View {
    @Environment(AppState.self) private var appState
    @State private var calls: [ConvexMeeting] = []
    @State private var isLoading = false
    @State private var selectedFilter: CallFilter = .all
    @State private var errorMessage: String?

    enum CallFilter: String, CaseIterable {
        case all = "Tous"
        case active = "En cours"
        case ended = "Terminés"
        case scheduled = "Planifiés"
    }

    private var filteredCalls: [ConvexMeeting] {
        switch selectedFilter {
        case .all: return calls
        case .active: return calls.filter { $0.status == "active" }
        case .ended: return calls.filter { $0.status == "ended" }
        case .scheduled: return calls.filter { $0.status == "scheduled" }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Historique des appels")
                    .font(.headline)
                Spacer()

                // Stats
                HStack(spacing: 16) {
                    statPill("Total", count: calls.count, color: .blue)
                    statPill("En cours", count: calls.filter { $0.status == "active" }.count, color: .green)
                    statPill("Entrants", count: calls.filter { $0.isOrgInbound == true }.count, color: .orange)
                }
            }
            .padding(16)

            // Filter pills
            HStack(spacing: 8) {
                ForEach(CallFilter.allCases, id: \.self) { filter in
                    Button {
                        selectedFilter = filter
                    } label: {
                        Text(filter.rawValue)
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedFilter == filter ? Color.blue : Color(.controlBackgroundColor))
                            .foregroundStyle(selectedFilter == filter ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            Divider()

            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredCalls.isEmpty {
                EmptyStateView(
                    icon: "phone",
                    title: "Aucun appel",
                    subtitle: selectedFilter == .all ? "L'historique des appels apparaîtra ici" : "Aucun appel pour ce filtre"
                )
            } else {
                List {
                    ForEach(filteredCalls) { call in
                        callRow(call)
                    }
                }
                .listStyle(.inset)
            }
        }
        .frame(maxHeight: .infinity)
        .task { await loadCalls() }
    }

    private func callRow(_ call: ConvexMeeting) -> some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(callIconColor(call).opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: callIcon(call))
                    .font(.subheadline)
                    .foregroundStyle(callIconColor(call))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(call.displayTitle)
                    .font(.subheadline.weight(.medium))

                HStack(spacing: 8) {
                    if call.isOrgInbound == true {
                        Label("Entrant", systemImage: "phone.arrow.down.left")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    } else {
                        Label("Sortant", systemImage: "phone.arrow.up.right")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }

                    Text("\(call.participantCount) participant\(call.participantCount > 1 ? "s" : "")")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                statusBadge(call.statusLabel, color: statusColor(call.status))

                if let ts = call.scheduledAt ?? call.startedAt {
                    Text(Date(timeIntervalSince1970: ts / 1000).formatted(date: .abbreviated, time: .shortened))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Text(Date(timeIntervalSince1970: call._creationTime / 1000).formatted(date: .abbreviated, time: .shortened))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                // Duration
                if let start = call.startedAt, let end = call.endedAt {
                    let duration = Int((end - start) / 1000)
                    let mins = duration / 60
                    let secs = duration % 60
                    Text(mins > 0 ? "\(mins)m \(secs)s" : "\(secs)s")
                        .font(.caption2.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func callIcon(_ call: ConvexMeeting) -> String {
        switch call.status {
        case "active": return "phone.fill"
        case "ended": return "phone.down.fill"
        case "cancelled": return "phone.slash.fill"
        default: return "phone.badge.clock.fill"
        }
    }

    private func callIconColor(_ call: ConvexMeeting) -> Color {
        switch call.status {
        case "active": return .green
        case "ended": return .secondary
        case "cancelled": return .red
        default: return .blue
        }
    }

    private func statusColor(_ status: String?) -> Color {
        switch status {
        case "active": return .green
        case "ended": return .secondary
        case "cancelled": return .red
        case "scheduled": return .blue
        default: return .secondary
        }
    }

    private func loadCalls() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            let allMeetings = try await convexQuery(
                "functions/meetings:listByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexMeeting].self
            )
            calls = allMeetings.filter { $0.isCall }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Meetings Tab

struct AstedMeetingsTab: View {
    @Environment(AppState.self) private var appState
    @State private var meetings: [ConvexMeeting] = []
    @State private var isLoading = false
    @State private var selectedFilter: MeetingFilter = .all
    @State private var errorMessage: String?

    enum MeetingFilter: String, CaseIterable {
        case all = "Toutes"
        case scheduled = "Planifiées"
        case active = "En cours"
        case ended = "Terminées"
    }

    private var filteredMeetings: [ConvexMeeting] {
        switch selectedFilter {
        case .all: return meetings
        case .scheduled: return meetings.filter { $0.status == "scheduled" }
        case .active: return meetings.filter { $0.status == "active" }
        case .ended: return meetings.filter { $0.status == "ended" }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Réunions")
                    .font(.headline)
                Spacer()

                HStack(spacing: 16) {
                    statPill("Total", count: meetings.count, color: .purple)
                    statPill("Planifiées", count: meetings.filter { $0.status == "scheduled" }.count, color: .blue)
                    statPill("En cours", count: meetings.filter { $0.status == "active" }.count, color: .green)
                }
            }
            .padding(16)

            // Filter pills
            HStack(spacing: 8) {
                ForEach(MeetingFilter.allCases, id: \.self) { filter in
                    Button {
                        selectedFilter = filter
                    } label: {
                        Text(filter.rawValue)
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedFilter == filter ? Color.purple : Color(.controlBackgroundColor))
                            .foregroundStyle(selectedFilter == filter ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            Divider()

            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredMeetings.isEmpty {
                EmptyStateView(
                    icon: "video",
                    title: "Aucune réunion",
                    subtitle: selectedFilter == .all ? "Les réunions planifiées apparaîtront ici" : "Aucune réunion pour ce filtre"
                )
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 400), spacing: 16)], spacing: 16) {
                        ForEach(filteredMeetings) { meeting in
                            meetingCard(meeting)
                        }
                    }
                    .padding(16)
                }
            }
        }
        .frame(maxHeight: .infinity)
        .task { await loadMeetings() }
    }

    private func meetingCard(_ meeting: ConvexMeeting) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: meeting.mediaType == "video" ? "video.fill" : "phone.fill")
                    .font(.title3)
                    .foregroundStyle(.purple)

                VStack(alignment: .leading, spacing: 2) {
                    Text(meeting.displayTitle)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)

                    Text("\(meeting.participantCount) participant\(meeting.participantCount > 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                statusBadge(meeting.statusLabel, color: statusColorForMeeting(meeting.status))
            }

            // Schedule info
            if let ts = meeting.scheduledAt {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(Date(timeIntervalSince1970: ts / 1000).formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Duration if ended
            if let start = meeting.startedAt, let end = meeting.endedAt {
                let duration = Int((end - start) / 1000 / 60)
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Durée : \(duration) min")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Actions for active/scheduled meetings
            if meeting.status == "active" || meeting.status == "scheduled" {
                HStack {
                    Spacer()
                    Button {
                        // Join meeting - LiveKit integration
                    } label: {
                        Label(meeting.status == "active" ? "Rejoindre" : "Démarrer", systemImage: "video.fill")
                            .font(.caption)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.purple)
                    .controlSize(.small)
                }
            }
        }
        .padding(14)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func statusColorForMeeting(_ status: String?) -> Color {
        switch status {
        case "active": return .green
        case "scheduled": return .blue
        case "ended": return .secondary
        case "cancelled": return .red
        default: return .secondary
        }
    }

    private func loadMeetings() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            let allMeetings = try await convexQuery(
                "functions/meetings:listByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexMeeting].self
            )
            meetings = allMeetings.filter { $0.isMeeting }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Settings Tab

struct AstedSettingsTab: View {
    @Environment(AppState.self) private var appState
    @State private var notificationsEnabled = true
    @State private var soundEnabled = true
    @State private var autoReadEnabled = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Paramètres iAsted")
                    .font(.title2.weight(.bold))
                    .padding(.bottom, 8)

                // Notifications
                settingsSection(title: "Notifications", icon: "bell.fill") {
                    Toggle("Notifications activées", isOn: $notificationsEnabled)
                    Toggle("Son des notifications", isOn: $soundEnabled)
                }

                // Chat
                settingsSection(title: "Conversations", icon: "bubble.left.and.bubble.right.fill") {
                    Toggle("Marquer lu automatiquement", isOn: $autoReadEnabled)

                    HStack {
                        Text("Conversations actives")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("Temps réel")
                            .font(.caption)
                            .foregroundStyle(.blue)
                    }
                }

                // LiveKit / Calls
                settingsSection(title: "Appels & Réunions", icon: "phone.fill") {
                    HStack {
                        Text("Moteur vidéo")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("LiveKit")
                            .font(.caption.monospaced())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.green.opacity(0.15))
                            .foregroundStyle(.green)
                            .clipShape(Capsule())
                    }

                    HStack {
                        Text("Qualité audio")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("Haute")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Qualité vidéo")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("HD (720p)")
                            .foregroundStyle(.secondary)
                    }
                }

                // About
                settingsSection(title: "À propos", icon: "info.circle.fill") {
                    HStack {
                        Text("Version iAsted")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("1.0.0")
                    }

                    HStack {
                        Text("Backend")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("Convex")
                            .font(.caption.monospaced())
                    }
                }
            }
            .padding(32)
        }
        .frame(maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }

    private func settingsSection(title: String, icon: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon)
                .font(.headline)

            VStack(alignment: .leading, spacing: 10) {
                content()
            }
            .padding()
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

// MARK: - Shared UI Helpers

private func avatarCircle(name: String, url: String?, size: CGFloat) -> some View {
    Group {
        if let urlStr = url, let nsUrl = URL(string: urlStr) {
            AsyncImage(url: nsUrl) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(contentMode: .fill)
                case .failure:
                    initialsView(name: name, size: size)
                default:
                    Color.gray.opacity(0.3)
                }
            }
        } else {
            initialsView(name: name, size: size)
        }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
}

private func initialsView(name: String, size: CGFloat) -> some View {
    let parts = name.split(separator: " ")
    let initials = parts.prefix(2).compactMap { $0.first.map(String.init) }.joined()
    let colors: [Color] = [.blue, .purple, .orange, .green, .pink, .cyan, .indigo]
    let color = colors[abs(name.hashValue) % colors.count]

    return ZStack {
        Circle().fill(color.opacity(0.2))
        Text(initials.isEmpty ? "?" : initials)
            .font(.system(size: size * 0.35, weight: .semibold))
            .foregroundStyle(color)
    }
}

private func statusBadge(_ text: String, color: Color) -> some View {
    Text(text)
        .font(.caption2.weight(.medium))
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(color.opacity(0.15))
        .foregroundStyle(color)
        .clipShape(Capsule())
}

private func statPill(_ label: String, count: Int, color: Color) -> some View {
    HStack(spacing: 4) {
        Text("\(count)")
            .font(.caption.bold())
            .foregroundStyle(color)
        Text(label)
            .font(.caption2)
            .foregroundStyle(.secondary)
    }
}
