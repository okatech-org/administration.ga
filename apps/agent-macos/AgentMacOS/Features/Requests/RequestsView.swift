//
//  RequestsView.swift
//  AgentMacOS
//
//  Consular service requests — split view with filterable list
//  on the left and request detail / status transitions on the right.
//

import SwiftUI
import ConvexMobile
import Combine

// MARK: - Color Helper

private func statusColor(_ name: String) -> Color {
    switch name {
    case "gray": return .gray
    case "blue": return .blue
    case "yellow": return .yellow
    case "purple": return .purple
    case "green": return .green
    case "red": return .red
    case "orange": return .orange
    case "teal": return .teal
    case "indigo": return .indigo
    default: return .secondary
    }
}

// MARK: - Requests View

struct RequestsView: View {
    @Environment(AppState.self) private var appState

    @State private var requests: [ConvexRequest] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var selectedStatusFilter: RequestStatus? = nil
    @State private var selectedRequest: ConvexRequest? = nil
    @State private var isUpdatingStatus = false

    // Batch 1: Agent workflow state
    @State private var teamMembers: [ConvexTeamMember] = []
    @State private var agentNotes: [AgentNote] = []
    @State private var newNoteText = ""
    @State private var isAddingNote = false
    @State private var isAssigning = false
    @State private var isSettingAction = false
    @State private var isUpdatingPriority = false

    // MARK: - Filtered Requests (search only — status is server-side)

    private var filteredRequests: [ConvexRequest] {
        guard !searchText.isEmpty else { return requests }
        let query = searchText.lowercased()
        return requests.filter { req in
            req.reference.lowercased().contains(query)
            || (req.serviceDisplayName?.lowercased().contains(query) ?? false)
            || req.citizenName.lowercased().contains(query)
        }
    }

    // MARK: - Body

    var body: some View {
        OrgGatedView {
            HSplitView {
                listPanel
                    .frame(minWidth: 400, idealWidth: 520)

                detailPanel
                    .frame(minWidth: 320, idealWidth: 480)
            }
            .background(Color(.windowBackgroundColor))
            .frame(minWidth: 720, minHeight: 400, maxHeight: .infinity)
            .task { await loadRequests() }
            .onChange(of: appState.selectedOrgId) { _, newValue in
                if newValue != nil {
                    selectedRequest = nil
                    Task { await loadRequests() }
                }
            }
            .onChange(of: selectedStatusFilter) { _, _ in
                Task { await loadRequests() }
            }
        }
    }

    // MARK: - List Panel

    private var listPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header + search
            VStack(alignment: .leading, spacing: 16) {
                PageHeader(
                    title: "Demandes",
                    subtitle: "\(filteredRequests.count) demande\(filteredRequests.count == 1 ? "" : "s")"
                )

                SearchFilterBar(searchText: $searchText, placeholder: "Rechercher par ref, service, citoyen...")

                // Status filter pills
                statusFilterBar
            }
            .padding(24)

            Divider()

            // Request list — always fills available space
            Group {
                if isLoading {
                    LoadingView(message: "Chargement des demandes...")
                } else if let errorMessage {
                    ErrorView(message: errorMessage) {
                        await loadRequests()
                    }
                } else if filteredRequests.isEmpty {
                    EmptyStateView(
                        icon: "doc.text.magnifyingglass",
                        title: "Aucune demande",
                        subtitle: searchText.isEmpty && selectedStatusFilter == nil
                            ? "Il n'y a pas encore de demandes pour cette organisation."
                            : "Aucune demande ne correspond aux filtres sélectionnés."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 2) {
                            ForEach(filteredRequests) { request in
                                requestRow(request)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }

    // MARK: - Status Filter Bar

    private var statusFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                // "All" pill
                filterPill(label: "Toutes", isActive: selectedStatusFilter == nil) {
                    selectedStatusFilter = nil
                }

                ForEach(RequestStatus.allCases, id: \.self) { status in
                    filterPill(
                        label: status.label,
                        color: statusColor(status.color),
                        isActive: selectedStatusFilter == status
                    ) {
                        selectedStatusFilter = selectedStatusFilter == status ? nil : status
                    }
                }
            }
        }
    }

    private func filterPill(label: String, color: Color = .secondary, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .fontWeight(isActive ? .semibold : .regular)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(isActive ? color.opacity(0.2) : Color(.controlBackgroundColor))
                .foregroundStyle(isActive ? color : .secondary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Request Row

    private func requestRow(_ request: ConvexRequest) -> some View {
        let isSelected = selectedRequest?.id == request.id

        return Button {
            selectedRequest = request
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(request.reference)
                            .font(.headline)
                            .lineLimit(1)

                        StatusBadge(label: request.status.label, color: statusColor(request.status.color))
                    }

                    if let serviceName = request.serviceDisplayName {
                        Text(serviceName)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    HStack(spacing: 12) {
                        Label(request.citizenName, systemImage: "person")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)

                        Label(request.createdDate, systemImage: "calendar")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer()

                if let priority = request.priority {
                    priorityIndicator(priority)
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.quaternary)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 10)
            .background(isSelected ? Color.accentColor.opacity(0.1) : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func priorityIndicator(_ priority: String) -> some View {
        let color: Color = switch priority {
        case "urgent", "high": .red
        case "medium": .orange
        default: .gray
        }

        return Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .help("Priorité: \(priority)")
    }

    // MARK: - Detail Panel

    private var detailPanel: some View {
        Group {
            if let request = selectedRequest {
                requestDetail(request)
            } else {
                EmptyStateView(
                    icon: "doc.text",
                    title: "Sélectionnez une demande",
                    subtitle: "Choisissez une demande dans la liste pour voir ses détails."
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }

    private func requestDetail(_ request: ConvexRequest) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                detailHeader(request)

                Divider()

                // Info cards
                detailInfoSection(request)

                // Assign agent + Priority
                detailAssignSection(request)

                // Action required indicator
                detailActionRequiredSection(request)

                // Timeline info
                detailDatesSection(request)

                Divider()

                // Status transitions
                detailTransitionsSection(request)

                Divider()

                // Agent notes
                detailNotesSection(request)

                Spacer(minLength: 24)
            }
            .padding(24)
        }
        .task(id: request.id) {
            await loadTeamMembers()
            await loadNotes(requestId: request._id)
        }
    }

    private func detailHeader(_ request: ConvexRequest) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(request.reference)
                    .font(.title)
                    .fontWeight(.bold)

                Spacer()

                StatusBadge(label: request.status.label, color: statusColor(request.status.color))
            }

            if let serviceName = request.serviceDisplayName {
                Text(serviceName)
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func detailInfoSection(_ request: ConvexRequest) -> some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                detailInfoCard(icon: "person.fill", title: "Citoyen", value: request.citizenName)
                detailInfoCard(icon: "folder.fill", title: "Service", value: request.serviceDisplayName ?? "Non spécifié")
            }

            HStack(spacing: 16) {
                detailInfoCard(icon: "flag.fill", title: "Priorité", value: priorityLabel(request.priority))
                detailInfoCard(icon: "number", title: "Référence", value: request.reference)
            }
        }
    }

    private func detailInfoCard(icon: String, title: String, value: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 32, height: 32)
                .background(Color.blue.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func detailDatesSection(_ request: ConvexRequest) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Historique")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                dateRow(icon: "plus.circle", label: "Créée le", timestamp: request._creationTime)

                if let submittedAt = request.submittedAt {
                    dateRow(icon: "paperplane", label: "Soumise le", timestamp: submittedAt)
                }

                if let updatedAt = request.updatedAt {
                    dateRow(icon: "pencil.circle", label: "Modifiée le", timestamp: updatedAt)
                }

                if let completedAt = request.completedAt {
                    dateRow(icon: "checkmark.circle", label: "Terminée le", timestamp: completedAt)
                }
            }
            .padding(16)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func dateRow(icon: String, label: String, timestamp: Double) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 20)

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()

            Text(formatDateTime(timestamp))
                .font(.caption)
                .fontWeight(.medium)
        }
    }

    // MARK: - Status Transitions

    private func detailTransitionsSection(_ request: ConvexRequest) -> some View {
        let transitions = REQUEST_TRANSITIONS[request.status] ?? []

        return VStack(alignment: .leading, spacing: 12) {
            Text("Actions")
                .font(.headline)

            if transitions.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: request.status.isTerminal ? "checkmark.seal.fill" : "info.circle")
                        .foregroundStyle(request.status.isTerminal ? .green : .secondary)
                    Text(request.status.isTerminal
                         ? "Cette demande est dans un état final."
                         : "Aucune transition disponible.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                VStack(spacing: 8) {
                    ForEach(transitions, id: \.self) { nextStatus in
                        transitionButton(request: request, nextStatus: nextStatus)
                    }
                }
            }
        }
    }

    private func transitionButton(request: ConvexRequest, nextStatus: RequestStatus) -> some View {
        let color = statusColor(nextStatus.color)

        return Button {
            Task { await updateStatus(request: request, newStatus: nextStatus) }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "arrow.right.circle.fill")
                    .foregroundStyle(color)

                VStack(alignment: .leading, spacing: 2) {
                    Text(nextStatus.label)
                        .fontWeight(.medium)
                    Text("Passer au statut \"\(nextStatus.label)\"")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isUpdatingStatus {
                    ProgressView()
                        .scaleEffect(0.7)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(color.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .disabled(isUpdatingStatus)
    }

    // MARK: - Assign Agent Section

    private func detailAssignSection(_ request: ConvexRequest) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Affectation & Priorité")
                .font(.headline)

            HStack(spacing: 16) {
                // Assign agent
                VStack(alignment: .leading, spacing: 6) {
                    Text("Agent assigné")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack {
                        if let assignedTo = request.assignedTo,
                           let member = teamMembers.first(where: { $0._id == assignedTo }) {
                            Label(member.displayName, systemImage: "person.fill.checkmark")
                                .font(.subheadline)
                                .foregroundStyle(.green)
                        } else {
                            Label("Non assigné", systemImage: "person.fill.questionmark")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Menu {
                            Button("Aucun (désassigner)") {
                                // Can't unassign via current API, skip
                            }
                            .disabled(true)

                            Divider()

                            ForEach(teamMembers) { member in
                                Button(member.displayName) {
                                    Task { await assignAgent(request: request, agentId: member._id) }
                                }
                                .disabled(member._id == request.assignedTo)
                            }
                        } label: {
                            Label("Assigner", systemImage: "person.badge.plus")
                                .font(.caption)
                        }
                        .menuStyle(.borderlessButton)
                        .disabled(isAssigning)
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10))

                // Priority
                VStack(alignment: .leading, spacing: 6) {
                    Text("Priorité")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack {
                        priorityIndicator(request.priority ?? "normal")
                        Text(priorityLabel(request.priority))
                            .font(.subheadline)

                        Spacer()

                        Menu {
                            ForEach(["low", "medium", "high", "urgent"], id: \.self) { p in
                                Button(priorityLabel(p)) {
                                    Task { await updatePriority(request: request, priority: p) }
                                }
                                .disabled(p == request.priority)
                            }
                        } label: {
                            Label("Modifier", systemImage: "flag")
                                .font(.caption)
                        }
                        .menuStyle(.borderlessButton)
                        .disabled(isUpdatingPriority)
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Action Required Section

    private func detailActionRequiredSection(_ request: ConvexRequest) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Action requise du citoyen")
                    .font(.headline)
                Spacer()

                if request.actionRequired != nil {
                    // Show current action
                    StatusBadge(
                        label: actionTypeLabel(request.actionRequired?.type),
                        color: .orange
                    )
                }
            }

            if let action = request.actionRequired {
                HStack(spacing: 12) {
                    Image(systemName: actionTypeIcon(action.type))
                        .font(.title2)
                        .foregroundStyle(.orange)
                        .frame(width: 40, height: 40)
                        .background(Color.orange.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    VStack(alignment: .leading, spacing: 4) {
                        Text(actionTypeLabel(action.type))
                            .font(.subheadline.weight(.medium))
                        if let msg = action.message, !msg.isEmpty {
                            Text(msg)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let setAt = action.setAt {
                            Text("Demandé le \(formatDateTime(setAt))")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }

                    Spacer()
                }
                .padding(12)
                .background(Color.orange.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                // Buttons to set action required
                HStack(spacing: 8) {
                    actionRequiredButton("Envoyer document", type: "upload_document", icon: "doc.badge.arrow.up", request: request)
                    actionRequiredButton("Compléter infos", type: "complete_info", icon: "pencil.and.list.clipboard", request: request)
                    actionRequiredButton("Effectuer paiement", type: "make_payment", icon: "creditcard", request: request)
                }
            }
        }
    }

    private func actionRequiredButton(_ label: String, type: String, icon: String, request: ConvexRequest) -> some View {
        Button {
            Task { await setActionRequired(request: request, type: type) }
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title3)
                Text(label)
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(10)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .disabled(isSettingAction)
    }

    private func actionTypeLabel(_ type: String?) -> String {
        switch type {
        case "upload_document": "Document requis"
        case "complete_info": "Infos à compléter"
        case "make_payment": "Paiement requis"
        default: "Action requise"
        }
    }

    private func actionTypeIcon(_ type: String?) -> String {
        switch type {
        case "upload_document": "doc.badge.arrow.up"
        case "complete_info": "pencil.and.list.clipboard"
        case "make_payment": "creditcard"
        default: "exclamationmark.triangle"
        }
    }

    // MARK: - Agent Notes Section

    private func detailNotesSection(_ request: ConvexRequest) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Notes internes")
                    .font(.headline)
                Spacer()
                Text("\(agentNotes.count)")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.15))
                    .clipShape(Capsule())
            }

            // Add note form
            VStack(spacing: 8) {
                TextEditor(text: $newNoteText)
                    .font(.body)
                    .frame(height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(.separatorColor), lineWidth: 1)
                    )

                HStack {
                    Spacer()
                    Button {
                        Task { await addNote(request: request) }
                    } label: {
                        if isAddingNote {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Label("Ajouter", systemImage: "plus.circle.fill")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(newNoteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isAddingNote)
                }
            }

            // Notes list
            if agentNotes.isEmpty {
                HStack {
                    Image(systemName: "note.text")
                        .foregroundStyle(.secondary)
                    Text("Aucune note pour cette demande")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                VStack(spacing: 8) {
                    ForEach(agentNotes) { note in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(note.content)
                                .font(.subheadline)
                                .textSelection(.enabled)

                            HStack {
                                if let author = note.authorName {
                                    Label(author, systemImage: "person")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(note.createdDate)
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func priorityLabel(_ priority: String?) -> String {
        switch priority {
        case "urgent": return "Urgent"
        case "high": return "Haute"
        case "medium": return "Moyenne"
        case "low": return "Basse"
        default: return "Normale"
        }
    }

    // MARK: - Data Loading

    private func loadRequests() async {
        guard let orgId = appState.selectedOrgId else { return }

        isLoading = true
        errorMessage = nil

        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "paginationOpts": ["numItems": 50.0, "cursor": NSNull()] as [String: Any],
            ]

            // Pass status filter server-side for proper index usage
            if let status = selectedStatusFilter {
                args["status"] = status.rawValue
            }

            let result = try await convexQuery(
                "functions/requests:listByOrg",
                with: args,
                yielding: PaginatedRequests.self
            )
            requests = result.page
            // Keep selection valid after reload
            if let current = selectedRequest, !result.page.contains(where: { $0.id == current.id }) {
                selectedRequest = nil
            }
        } catch {
            print("[Requests] Error loading requests: \(error)")
            let msg = "\(error)"
            if msg.contains("INSUFFICIENT_PERMISSION") || msg.contains("permission") {
                errorMessage = "Vous n'avez pas la permission d'accéder aux demandes de cette organisation."
            } else {
                errorMessage = "Erreur de chargement: \(msg)"
            }
            requests = []
        }

        isLoading = false
    }

    private func updateStatus(request: ConvexRequest, newStatus: RequestStatus) async {
        isUpdatingStatus = true

        do {
            try await convex.mutation(
                "functions/requests:updateStatus",
                with: [
                    "requestId": request._id,
                    "status": newStatus.rawValue,
                ]
            )

            // Reload list to reflect the change
            await loadRequests()

            // Update selected request to the new version if still present
            if selectedRequest?.id == request.id {
                selectedRequest = requests.first(where: { $0.id == request.id })
            }
        } catch {
            print("[Requests] Error updating status: \(error)")
        }

        isUpdatingStatus = false
    }

    // MARK: - Assign Agent

    private func loadTeamMembers() async {
        guard let orgId = appState.selectedOrgId else { return }
        do {
            teamMembers = try await convexQuery(
                "functions/memberships:listOrgMembers",
                with: ["orgId": orgId],
                yielding: [ConvexTeamMember].self
            )
        } catch {
            // Fallback silently — assign won't work but won't crash
            print("[Requests] Could not load team members: \(error)")
        }
    }

    private func assignAgent(request: ConvexRequest, agentId: String) async {
        isAssigning = true
        do {
            try await convex.mutation("functions/requests:assign", with: [
                "requestId": request._id,
                "agentId": agentId,
            ])
            await loadRequests()
            if selectedRequest?.id == request.id {
                selectedRequest = requests.first(where: { $0.id == request.id })
            }
        } catch {
            print("[Requests] Error assigning agent: \(error)")
        }
        isAssigning = false
    }

    // MARK: - Priority

    private func updatePriority(request: ConvexRequest, priority: String) async {
        isUpdatingPriority = true
        do {
            try await convex.mutation("functions/requests:updatePriority", with: [
                "requestId": request._id,
                "priority": priority,
            ])
            await loadRequests()
            if selectedRequest?.id == request.id {
                selectedRequest = requests.first(where: { $0.id == request.id })
            }
        } catch {
            print("[Requests] Error updating priority: \(error)")
        }
        isUpdatingPriority = false
    }

    // MARK: - Action Required

    private func setActionRequired(request: ConvexRequest, type: String) async {
        isSettingAction = true
        do {
            try await convex.mutation("functions/requests:setActionRequired", with: [
                "requestId": request._id,
                "type": type,
            ])
            await loadRequests()
            if selectedRequest?.id == request.id {
                selectedRequest = requests.first(where: { $0.id == request.id })
            }
        } catch {
            print("[Requests] Error setting action required: \(error)")
        }
        isSettingAction = false
    }

    // MARK: - Agent Notes

    private func loadNotes(requestId: String) async {
        do {
            agentNotes = try await convexQuery(
                "functions/agentNotes:listByRequest",
                with: ["requestId": requestId],
                yielding: [AgentNote].self
            )
        } catch {
            print("[Requests] Could not load notes: \(error)")
            agentNotes = []
        }
    }

    private func addNote(request: ConvexRequest) async {
        let content = newNoteText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        isAddingNote = true
        do {
            try await convex.mutation("functions/agentNotes:create", with: [
                "requestId": request._id,
                "content": content,
            ])
            newNoteText = ""
            await loadNotes(requestId: request._id)
        } catch {
            print("[Requests] Error adding note: \(error)")
        }
        isAddingNote = false
    }
}

// MARK: - Preview

#Preview {
    RequestsView()
        .environment(AppState())
        .frame(width: 1100, height: 700)
}
