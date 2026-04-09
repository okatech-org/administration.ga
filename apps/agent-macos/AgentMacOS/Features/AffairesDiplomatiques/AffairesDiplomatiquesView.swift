//
//  AffairesDiplomatiquesView.swift
//  AgentMacOS
//
//  Diplomatic affairs — 4 tabs: Targets, Letters, Strategic Plans, Reports
//

import SwiftUI
import ConvexMobile
import Combine

struct AffairesDiplomatiquesView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedTab: DipTab = .targets

    enum DipTab: String, CaseIterable {
        case targets = "Cibles"
        case letters = "Lettres"
        case plans = "Plans"
        case reports = "Rapports"
    }

    var body: some View {
        OrgGatedView {
            VStack(spacing: 0) {
                // Header + Tabs
                VStack(spacing: 12) {
                    PageHeader(title: "Affaires Diplomatiques", subtitle: "Gestion stratégique et relations diplomatiques")

                    Picker("", selection: $selectedTab) {
                        ForEach(DipTab.allCases, id: \.self) { tab in
                            Text(tab.rawValue).tag(tab)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .padding(24)
                .padding(.bottom, 0)

                Divider()

                // Tab content
                switch selectedTab {
                case .targets: TargetsTab()
                case .letters: LettersTab()
                case .plans: PlansTab()
                case .reports: ReportsTab()
                }
            }
            .background(Color(.windowBackgroundColor))
        }
    }
}

// MARK: - Targets Tab

struct TargetsTab: View {
    @Environment(AppState.self) private var appState
    @State private var targets: [ConvexDiplomaticTarget] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var statusFilter: DiplomaticTargetStatus? = nil
    @State private var selectedTarget: ConvexDiplomaticTarget? = nil
    @State private var showCreateSheet = false

    private var filteredTargets: [ConvexDiplomaticTarget] {
        var result = targets
        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(query) ||
                ($0.country?.lowercased().contains(query) ?? false) ||
                ($0.contactName?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Filters + Create button
                HStack(spacing: 12) {
                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher une cible...")

                    Picker("Statut", selection: $statusFilter) {
                        Text("Tous statuts").tag(nil as DiplomaticTargetStatus?)
                        ForEach(DiplomaticTargetStatus.allCases, id: \.self) { status in
                            Text(status.label).tag(status as DiplomaticTargetStatus?)
                        }
                    }
                    .frame(width: 160)

                    Button {
                        showCreateSheet = true
                    } label: {
                        Label("Nouvelle cible", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }

                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadTargets() }
                } else if filteredTargets.isEmpty {
                    EmptyStateView(icon: "scope", title: "Aucune cible diplomatique")
                } else {
                    targetsList
                }
            }
            .padding(24)
        }
        .task { await loadTargets() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadTargets() } }
        .sheet(item: $selectedTarget) { target in
            TargetDetailSheet(target: target) {
                Task { await loadTargets() }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateTargetSheet(orgId: appState.selectedOrgId ?? "") {
                Task { await loadTargets() }
            }
        }
    }

    private var targetsList: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text("Nom").font(.caption).foregroundStyle(.secondary).frame(minWidth: 180, alignment: .leading)
                Text("Type").font(.caption).foregroundStyle(.secondary).frame(width: 140, alignment: .leading)
                Text("Pays").font(.caption).foregroundStyle(.secondary).frame(width: 100, alignment: .leading)
                Text("Priorité").font(.caption).foregroundStyle(.secondary).frame(width: 80, alignment: .center)
                Text("Statut").font(.caption).foregroundStyle(.secondary).frame(width: 120, alignment: .center)
                Text("Contact").font(.caption).foregroundStyle(.secondary).frame(minWidth: 120, alignment: .leading)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            ForEach(filteredTargets) { target in
                Button { selectedTarget = target } label: {
                    HStack(spacing: 0) {
                        Text(target.name)
                            .lineLimit(1)
                            .frame(minWidth: 180, alignment: .leading)

                        Text(target.type.label)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 140, alignment: .leading)

                        Text(target.country ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 100, alignment: .leading)

                        priorityBadge(target.priority ?? "medium")
                            .frame(width: 80, alignment: .center)

                        StatusBadge(label: target.status.label, color: dipStatusColor(target.status))
                            .frame(width: 120, alignment: .center)

                        Text(target.contactName ?? "—")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .frame(minWidth: 120, alignment: .leading)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if target.id != filteredTargets.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func priorityBadge(_ priority: String) -> some View {
        StatusBadge(
            label: priority == "critical" ? "Critique" : priority == "high" ? "Haute" : priority == "medium" ? "Moyenne" : "Basse",
            color: priority == "critical" ? .red : priority == "high" ? .orange : priority == "medium" ? .yellow : .gray
        )
    }

    private func loadTargets() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            targets = try await convexQuery(
                "functions/diplomaticAffairs:listTargets",
                with: ["orgId": orgId],
                yielding: [ConvexDiplomaticTarget].self
            )
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isLoading = false
    }
}

// MARK: - Create Target Sheet

struct CreateTargetSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var type: DiplomaticTargetType = .enterprise
    @State private var sector = ""
    @State private var country = ""
    @State private var city = ""
    @State private var contactName = ""
    @State private var contactEmail = ""
    @State private var contactPhone = ""
    @State private var website = ""
    @State private var priority = "medium"
    @State private var description = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Nouvelle cible diplomatique").font(.title3.bold())
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Nom de la cible *", text: $name)
                        .textFieldStyle(.roundedBorder)

                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Type").font(.caption).foregroundStyle(.secondary)
                            Picker("Type", selection: $type) {
                                ForEach(DiplomaticTargetType.allCases, id: \.self) { t in
                                    Text(t.label).tag(t)
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Priorité").font(.caption).foregroundStyle(.secondary)
                            Picker("Priorité", selection: $priority) {
                                Text("Basse").tag("low")
                                Text("Moyenne").tag("medium")
                                Text("Haute").tag("high")
                                Text("Critique").tag("critical")
                            }
                        }
                    }

                    HStack(spacing: 12) {
                        TextField("Pays", text: $country).textFieldStyle(.roundedBorder)
                        TextField("Ville", text: $city).textFieldStyle(.roundedBorder)
                    }

                    TextField("Secteur", text: $sector).textFieldStyle(.roundedBorder)

                    Divider()
                    Text("Contact").font(.headline)

                    TextField("Nom du contact", text: $contactName).textFieldStyle(.roundedBorder)
                    HStack(spacing: 12) {
                        TextField("Email", text: $contactEmail).textFieldStyle(.roundedBorder)
                        TextField("Téléphone", text: $contactPhone).textFieldStyle(.roundedBorder)
                    }
                    TextField("Site web", text: $website).textFieldStyle(.roundedBorder)

                    Divider()
                    Text("Description").font(.headline)
                    TextEditor(text: $description)
                        .font(.body)
                        .frame(minHeight: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))

                    if let errorMessage {
                        Text(errorMessage).font(.caption).foregroundStyle(.red)
                    }
                }
                .padding(24)
            }

            Divider()

            HStack {
                Button("Annuler") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button { Task { await save() } } label: {
                    if isSaving { ProgressView().controlSize(.small) }
                    else { Label("Créer", systemImage: "plus.circle.fill") }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(name.isEmpty || isSaving)
            }
            .padding()
        }
        .frame(width: 550, height: 650)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "name": name,
                "type": type.rawValue,
                "priority": priority,
            ]
            if !sector.isEmpty { args["sector"] = sector }
            if !country.isEmpty { args["country"] = country }
            if !city.isEmpty { args["city"] = city }
            if !contactName.isEmpty { args["contactName"] = contactName }
            if !contactEmail.isEmpty { args["contactEmail"] = contactEmail }
            if !contactPhone.isEmpty { args["contactPhone"] = contactPhone }
            if !website.isEmpty { args["website"] = website }
            if !description.isEmpty { args["description"] = description }

            try await convexMutation("functions/diplomaticAffairs:createTarget", with: args)
            onCreated()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}

// MARK: - Target Detail Sheet (with edit + delete)

struct TargetDetailSheet: View {
    let target: ConvexDiplomaticTarget
    let onUpdate: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var isEditing = false
    @State private var editName: String = ""
    @State private var editStatus: DiplomaticTargetStatus = .identified
    @State private var editPriority = "medium"
    @State private var editContactName = ""
    @State private var editContactEmail = ""
    @State private var editContactPhone = ""
    @State private var editNotes = ""
    @State private var isSaving = false
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(target.name).font(.title2.bold())
                    Text(target.type.label).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                if !isEditing {
                    Button { startEditing() } label: {
                        Label("Modifier", systemImage: "pencil")
                    }
                    .buttonStyle(.bordered)
                }
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            if isEditing {
                editForm
            } else {
                readOnlyContent
            }

            Spacer()

            // Actions
            HStack {
                Button("Supprimer", role: .destructive) {
                    showDeleteConfirm = true
                }
                .buttonStyle(.bordered)
                .tint(.red)

                Spacer()

                if isEditing {
                    Button("Annuler") { isEditing = false }.buttonStyle(.bordered)
                    Button {
                        Task { await saveEdit() }
                    } label: {
                        if isSaving { ProgressView().controlSize(.small) }
                        else { Label("Enregistrer", systemImage: "checkmark.circle.fill") }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(editName.isEmpty || isSaving)
                } else {
                    Button("Fermer") { dismiss() }.buttonStyle(.bordered)
                }
            }
        }
        .padding(24)
        .frame(width: 550, height: 650)
        .alert("Supprimer cette cible ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await deleteTarget() } }
        } message: {
            Text("Cette action est irréversible.")
        }
    }

    private var readOnlyContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                row("Pays", target.country ?? "—")
                row("Ville", target.city ?? "—")
                row("Secteur", target.sector ?? "—")
                row("Priorité", target.priority?.capitalized ?? "—")
                row("Statut", target.status.label)
                row("Contact", target.contactName ?? "—")
                row("Titre contact", target.contactTitle ?? "—")
                row("Email", target.contactEmail ?? "—")
                row("Téléphone", target.contactPhone ?? "—")
                row("Site web", target.website ?? "—")
                if let desc = target.description {
                    Divider()
                    Text("Description").font(.headline)
                    Text(desc).font(.body)
                }
                if let notes = target.notes {
                    Divider()
                    Text("Notes").font(.headline)
                    Text(notes).font(.body)
                }
            }
        }
    }

    private var editForm: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                TextField("Nom", text: $editName).textFieldStyle(.roundedBorder)

                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Statut").font(.caption).foregroundStyle(.secondary)
                        Picker("Statut", selection: $editStatus) {
                            ForEach(DiplomaticTargetStatus.allCases, id: \.self) { s in
                                Text(s.label).tag(s)
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Priorité").font(.caption).foregroundStyle(.secondary)
                        Picker("Priorité", selection: $editPriority) {
                            Text("Basse").tag("low")
                            Text("Moyenne").tag("medium")
                            Text("Haute").tag("high")
                            Text("Critique").tag("critical")
                        }
                    }
                }

                Divider()
                Text("Contact").font(.headline)
                TextField("Nom du contact", text: $editContactName).textFieldStyle(.roundedBorder)
                TextField("Email", text: $editContactEmail).textFieldStyle(.roundedBorder)
                TextField("Téléphone", text: $editContactPhone).textFieldStyle(.roundedBorder)

                Divider()
                Text("Notes").font(.headline)
                TextEditor(text: $editNotes)
                    .font(.body)
                    .frame(minHeight: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))
            }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
            Text(value).font(.subheadline)
            Spacer()
        }
    }

    private func startEditing() {
        editName = target.name
        editStatus = target.status
        editPriority = target.priority ?? "medium"
        editContactName = target.contactName ?? ""
        editContactEmail = target.contactEmail ?? ""
        editContactPhone = target.contactPhone ?? ""
        editNotes = target.notes ?? ""
        isEditing = true
    }

    private func saveEdit() async {
        isSaving = true
        do {
            var args: [String: Any] = ["targetId": target._id]
            if editName != target.name { args["name"] = editName }
            args["status"] = editStatus.rawValue
            args["priority"] = editPriority
            if !editContactName.isEmpty { args["contactName"] = editContactName }
            if !editContactEmail.isEmpty { args["contactEmail"] = editContactEmail }
            if !editContactPhone.isEmpty { args["contactPhone"] = editContactPhone }
            if !editNotes.isEmpty { args["notes"] = editNotes }

            try await convexMutation("functions/diplomaticAffairs:updateTarget", with: args)
            onUpdate()
            dismiss()
        } catch {
            print("[TargetDetail] Error: \(error)")
        }
        isSaving = false
    }

    private func deleteTarget() async {
        do {
            try await convexMutation("functions/diplomaticAffairs:deleteTarget", with: ["targetId": target._id])
            onUpdate()
            dismiss()
        } catch {
            print("[TargetDetail] Delete error: \(error)")
        }
    }
}

// MARK: - Letters Tab

struct LettersTab: View {
    @Environment(AppState.self) private var appState
    @State private var letters: [ConvexDiplomaticLetter] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedLetter: ConvexDiplomaticLetter? = nil
    @State private var showCreateSheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HStack {
                    Spacer()
                    Button {
                        showCreateSheet = true
                    } label: {
                        Label("Nouvelle lettre", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }

                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadLetters() }
                } else if letters.isEmpty {
                    EmptyStateView(icon: "envelope.badge", title: "Aucune lettre de contact")
                } else {
                    VStack(spacing: 0) {
                        ForEach(letters) { letter in
                            Button { selectedLetter = letter } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(letter.subject)
                                            .font(.body.bold())
                                            .lineLimit(1)
                                        HStack(spacing: 8) {
                                            if let ref = letter.reference {
                                                Text(ref).font(.caption.monospaced()).foregroundStyle(.secondary)
                                            }
                                            if let recipient = letter.recipientName {
                                                Text("→ \(recipient)").font(.caption).foregroundStyle(.secondary)
                                            }
                                        }
                                    }
                                    Spacer()
                                    if let status = letter.status {
                                        StatusBadge(label: status.capitalized, color: letterStatusColor(status))
                                    }
                                    Text(formatDate(letter.createdAt ?? letter._creationTime))
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            if letter.id != letters.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(24)
        }
        .task { await loadLetters() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadLetters() } }
        .sheet(item: $selectedLetter) { letter in
            LetterDetailSheet(letter: letter) {
                Task { await loadLetters() }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateLetterSheet(orgId: appState.selectedOrgId ?? "") {
                Task { await loadLetters() }
            }
        }
    }

    private func loadLetters() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            letters = try await convexQuery("functions/diplomaticAffairs:listLetters", with: ["orgId": orgId], yielding: [ConvexDiplomaticLetter].self)
        } catch { errorMessage = "Erreur: \(error.localizedDescription)" }
        isLoading = false
    }
}

// MARK: - Create Letter Sheet

struct CreateLetterSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var subject = ""
    @State private var type = "formal"
    @State private var recipientName = ""
    @State private var recipientTitle = ""
    @State private var recipientOrg = ""
    @State private var content = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Nouvelle lettre").font(.title3.bold())
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Objet *", text: $subject).textFieldStyle(.roundedBorder)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Type").font(.caption).foregroundStyle(.secondary)
                        Picker("Type", selection: $type) {
                            Text("Formelle").tag("formal")
                            Text("Informelle").tag("informal")
                            Text("Note verbale").tag("note_verbale")
                            Text("Invitation").tag("invitation")
                        }
                        .pickerStyle(.segmented)
                    }

                    Divider()
                    Text("Destinataire").font(.headline)

                    TextField("Nom du destinataire *", text: $recipientName).textFieldStyle(.roundedBorder)
                    TextField("Titre / Fonction", text: $recipientTitle).textFieldStyle(.roundedBorder)
                    TextField("Organisation", text: $recipientOrg).textFieldStyle(.roundedBorder)

                    Divider()
                    Text("Contenu").font(.headline)
                    TextEditor(text: $content)
                        .font(.body)
                        .frame(minHeight: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))

                    if let errorMessage {
                        Text(errorMessage).font(.caption).foregroundStyle(.red)
                    }
                }
                .padding(24)
            }

            Divider()

            HStack {
                Button("Annuler") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button { Task { await save() } } label: {
                    if isSaving { ProgressView().controlSize(.small) }
                    else { Label("Créer", systemImage: "plus.circle.fill") }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(subject.isEmpty || recipientName.isEmpty || isSaving)
            }
            .padding()
        }
        .frame(width: 520, height: 600)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "subject": subject,
                "type": type,
                "recipientName": recipientName,
            ]
            if !recipientTitle.isEmpty { args["recipientTitle"] = recipientTitle }
            if !recipientOrg.isEmpty { args["recipientOrg"] = recipientOrg }
            if !content.isEmpty { args["content"] = content }

            try await convexMutation("functions/diplomaticAffairs:createLetter", with: args)
            onCreated()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}

// MARK: - Letter Detail Sheet

struct LetterDetailSheet: View {
    let letter: ConvexDiplomaticLetter
    let onUpdate: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(letter.subject).font(.title2.bold())
                    HStack(spacing: 8) {
                        if let ref = letter.reference {
                            Text(ref).font(.caption.monospaced()).foregroundStyle(.secondary)
                        }
                        if let type = letter.type {
                            StatusBadge(label: type.capitalized, color: .blue)
                        }
                    }
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            VStack(alignment: .leading, spacing: 10) {
                row("Destinataire", letter.recipientName ?? "—")
                row("Titre", letter.recipientTitle ?? "—")
                row("Organisation", letter.recipientOrg ?? "—")
                row("Statut", letter.status?.capitalized ?? "—")
                row("Envoyé le", letter.sentAt != nil ? formatDate(letter.sentAt!) : "—")
                row("Créé le", formatDate(letter.createdAt ?? letter._creationTime))
            }

            Divider()

            // Status transitions
            Text("Changer le statut").font(.headline)
            HStack(spacing: 8) {
                ForEach(["draft", "sent", "received", "archived"], id: \.self) { status in
                    if status != letter.status {
                        Button(status.capitalized) {
                            Task { await updateStatus(status) }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }
            }

            Spacer()

            HStack {
                Button("Supprimer", role: .destructive) {
                    showDeleteConfirm = true
                }
                .buttonStyle(.bordered)
                .tint(.red)
                Spacer()
                Button("Fermer") { dismiss() }.buttonStyle(.bordered)
            }
        }
        .padding(24)
        .frame(width: 500, height: 500)
        .alert("Supprimer cette lettre ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await deleteLetter() } }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
            Text(value).font(.subheadline)
            Spacer()
        }
    }

    private func updateStatus(_ status: String) async {
        do {
            try await convexMutation("functions/diplomaticAffairs:updateLetterStatus", with: [
                "letterId": letter._id,
                "status": status,
            ])
            onUpdate()
            dismiss()
        } catch {
            print("[LetterDetail] Error: \(error)")
        }
    }

    private func deleteLetter() async {
        do {
            try await convexMutation("functions/diplomaticAffairs:deleteLetter", with: ["letterId": letter._id])
            onUpdate()
            dismiss()
        } catch {
            print("[LetterDetail] Delete error: \(error)")
        }
    }
}

// MARK: - Plans Tab

struct PlansTab: View {
    @Environment(AppState.self) private var appState
    @State private var plans: [ConvexDiplomaticPlan] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedPlan: ConvexDiplomaticPlan? = nil
    @State private var showCreateSheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HStack {
                    Spacer()
                    Button {
                        showCreateSheet = true
                    } label: {
                        Label("Nouveau plan", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }

                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadPlans() }
                } else if plans.isEmpty {
                    EmptyStateView(icon: "map", title: "Aucun plan stratégique")
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 16)], spacing: 16) {
                        ForEach(plans) { plan in
                            Button { selectedPlan = plan } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(plan.title).font(.headline).lineLimit(1)
                                        Spacer()
                                        if let status = plan.status {
                                            StatusBadge(label: status.capitalized, color: status == "active" ? .green : .gray)
                                        }
                                    }
                                    if let period = plan.period {
                                        Text("Période: \(period)").font(.caption).foregroundStyle(.secondary)
                                    }
                                    if let category = plan.category {
                                        Text(category.capitalized).font(.caption).foregroundStyle(.secondary)
                                    }
                                    if let summary = plan.summary {
                                        Text(summary).font(.caption).foregroundStyle(.secondary).lineLimit(3)
                                    }
                                }
                                .padding(16)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(.controlBackgroundColor))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(24)
        }
        .task { await loadPlans() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadPlans() } }
        .sheet(item: $selectedPlan) { plan in
            PlanDetailSheet(plan: plan) {
                Task { await loadPlans() }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreatePlanSheet(orgId: appState.selectedOrgId ?? "") {
                Task { await loadPlans() }
            }
        }
    }

    private func loadPlans() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            plans = try await convexQuery("functions/diplomaticAffairs:listPlans", with: ["orgId": orgId], yielding: [ConvexDiplomaticPlan].self)
        } catch { errorMessage = "Erreur: \(error.localizedDescription)" }
        isLoading = false
    }
}

// MARK: - Create Plan Sheet

struct CreatePlanSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var period = ""
    @State private var category = "bilateral"
    @State private var summary = ""
    @State private var objectives = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Nouveau plan stratégique").font(.title3.bold())
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Titre *", text: $title).textFieldStyle(.roundedBorder)
                    TextField("Période (ex: 2024-2025)", text: $period).textFieldStyle(.roundedBorder)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Catégorie").font(.caption).foregroundStyle(.secondary)
                        Picker("Catégorie", selection: $category) {
                            Text("Bilatéral").tag("bilateral")
                            Text("Multilatéral").tag("multilateral")
                            Text("Économique").tag("economic")
                            Text("Culturel").tag("cultural")
                            Text("Sécurité").tag("security")
                        }
                    }

                    Divider()
                    Text("Résumé").font(.headline)
                    TextEditor(text: $summary)
                        .font(.body)
                        .frame(minHeight: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))

                    Text("Objectifs").font(.headline)
                    TextEditor(text: $objectives)
                        .font(.body)
                        .frame(minHeight: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))

                    if let errorMessage {
                        Text(errorMessage).font(.caption).foregroundStyle(.red)
                    }
                }
                .padding(24)
            }

            Divider()

            HStack {
                Button("Annuler") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button { Task { await save() } } label: {
                    if isSaving { ProgressView().controlSize(.small) }
                    else { Label("Créer", systemImage: "plus.circle.fill") }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(title.isEmpty || isSaving)
            }
            .padding()
        }
        .frame(width: 520, height: 580)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "title": title,
                "category": category,
            ]
            if !period.isEmpty { args["period"] = period }
            if !summary.isEmpty { args["summary"] = summary }
            if !objectives.isEmpty { args["objectives"] = objectives }

            try await convexMutation("functions/diplomaticAffairs:createPlan", with: args)
            onCreated()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}

// MARK: - Plan Detail Sheet

struct PlanDetailSheet: View {
    let plan: ConvexDiplomaticPlan
    let onUpdate: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(plan.title).font(.title2.bold())
                    HStack(spacing: 8) {
                        if let category = plan.category {
                            StatusBadge(label: category.capitalized, color: .blue)
                        }
                        if let status = plan.status {
                            StatusBadge(label: status.capitalized, color: status == "active" ? .green : .gray)
                        }
                    }
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    row("Période", plan.period ?? "—")
                    row("Catégorie", plan.category?.capitalized ?? "—")
                    row("Statut", plan.status?.capitalized ?? "—")
                    row("Créé le", formatDate(plan.createdAt ?? plan._creationTime))

                    if let summary = plan.summary {
                        Divider()
                        Text("Résumé").font(.headline)
                        Text(summary).font(.body)
                    }
                }
            }

            Spacer()

            HStack {
                Button("Supprimer", role: .destructive) {
                    showDeleteConfirm = true
                }
                .buttonStyle(.bordered)
                .tint(.red)
                Spacer()
                Button("Fermer") { dismiss() }.buttonStyle(.bordered)
            }
        }
        .padding(24)
        .frame(width: 500, height: 450)
        .alert("Supprimer ce plan ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await deletePlan() } }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
            Text(value).font(.subheadline)
            Spacer()
        }
    }

    private func deletePlan() async {
        do {
            try await convexMutation("functions/diplomaticAffairs:deletePlan", with: ["planId": plan._id])
            onUpdate()
            dismiss()
        } catch {
            print("[PlanDetail] Delete error: \(error)")
        }
    }
}

// MARK: - Reports Tab

struct ReportsTab: View {
    @Environment(AppState.self) private var appState
    @State private var reports: [ConvexDiplomaticReport] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedReport: ConvexDiplomaticReport? = nil
    @State private var showCreateSheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HStack {
                    Spacer()
                    Button {
                        showCreateSheet = true
                    } label: {
                        Label("Nouveau rapport", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }

                if isLoading {
                    LoadingView()
                } else if let errorMessage {
                    ErrorView(message: errorMessage) { await loadReports() }
                } else if reports.isEmpty {
                    EmptyStateView(icon: "doc.richtext", title: "Aucun rapport")
                } else {
                    VStack(spacing: 0) {
                        ForEach(reports) { report in
                            Button { selectedReport = report } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(report.title).font(.body.bold()).lineLimit(1)
                                        HStack(spacing: 8) {
                                            if let type = report.type {
                                                Text(type.capitalized).font(.caption).foregroundStyle(.secondary)
                                            }
                                            if let recipient = report.recipient {
                                                Text("→ \(recipient.capitalized)").font(.caption).foregroundStyle(.secondary)
                                            }
                                        }
                                    }
                                    Spacer()
                                    if let status = report.status {
                                        StatusBadge(label: status.capitalized, color: status == "approved" ? .green : status == "submitted" ? .blue : .gray)
                                    }
                                    Text(formatDate(report.createdAt ?? report._creationTime))
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            if report.id != reports.last?.id {
                                Divider().padding(.leading, 16)
                            }
                        }
                    }
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(24)
        }
        .task { await loadReports() }
        .onChange(of: appState.selectedOrgId) { _, _ in Task { await loadReports() } }
        .sheet(item: $selectedReport) { report in
            ReportDetailSheet(report: report) {
                Task { await loadReports() }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateReportSheet(orgId: appState.selectedOrgId ?? "") {
                Task { await loadReports() }
            }
        }
    }

    private func loadReports() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        do {
            reports = try await convexQuery("functions/diplomaticAffairs:listReports", with: ["orgId": orgId], yielding: [ConvexDiplomaticReport].self)
        } catch { errorMessage = "Erreur: \(error.localizedDescription)" }
        isLoading = false
    }
}

// MARK: - Create Report Sheet

struct CreateReportSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var type = "activity"
    @State private var recipient = "presidency"
    @State private var summary = ""
    @State private var content = ""
    @State private var period = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Nouveau rapport").font(.title3.bold())
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Titre *", text: $title).textFieldStyle(.roundedBorder)

                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Type").font(.caption).foregroundStyle(.secondary)
                            Picker("Type", selection: $type) {
                                Text("Activité").tag("activity")
                                Text("Analyse").tag("analysis")
                                Text("Situation").tag("situation")
                                Text("Financier").tag("financial")
                            }
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Destinataire").font(.caption).foregroundStyle(.secondary)
                            Picker("Destinataire", selection: $recipient) {
                                Text("Présidence").tag("presidency")
                                Text("Ministère").tag("ministry")
                                Text("Ambassade").tag("embassy")
                                Text("Autre").tag("other")
                            }
                        }
                    }

                    TextField("Période (ex: T1 2024)", text: $period).textFieldStyle(.roundedBorder)

                    Divider()
                    Text("Résumé").font(.headline)
                    TextEditor(text: $summary)
                        .font(.body)
                        .frame(minHeight: 80)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))

                    Text("Contenu").font(.headline)
                    TextEditor(text: $content)
                        .font(.body)
                        .frame(minHeight: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.separatorColor), lineWidth: 1))

                    if let errorMessage {
                        Text(errorMessage).font(.caption).foregroundStyle(.red)
                    }
                }
                .padding(24)
            }

            Divider()

            HStack {
                Button("Annuler") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button { Task { await save() } } label: {
                    if isSaving { ProgressView().controlSize(.small) }
                    else { Label("Créer", systemImage: "plus.circle.fill") }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .disabled(title.isEmpty || isSaving)
            }
            .padding()
        }
        .frame(width: 520, height: 620)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "title": title,
                "type": type,
                "recipient": recipient,
            ]
            if !summary.isEmpty { args["summary"] = summary }
            if !content.isEmpty { args["content"] = content }
            if !period.isEmpty { args["period"] = period }

            try await convexMutation("functions/diplomaticAffairs:createReport", with: args)
            onCreated()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}

// MARK: - Report Detail Sheet

struct ReportDetailSheet: View {
    let report: ConvexDiplomaticReport
    let onUpdate: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(report.title).font(.title2.bold())
                    HStack(spacing: 8) {
                        if let type = report.type {
                            StatusBadge(label: type.capitalized, color: .blue)
                        }
                        if let status = report.status {
                            StatusBadge(label: status.capitalized, color: status == "approved" ? .green : status == "submitted" ? .blue : .gray)
                        }
                    }
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    row("Type", report.type?.capitalized ?? "—")
                    row("Destinataire", report.recipient?.capitalized ?? "—")
                    row("Statut", report.status?.capitalized ?? "—")
                    row("Soumis le", report.submittedAt != nil ? formatDate(report.submittedAt!) : "—")
                    row("Créé le", formatDate(report.createdAt ?? report._creationTime))

                    if let summary = report.summary {
                        Divider()
                        Text("Résumé").font(.headline)
                        Text(summary).font(.body)
                    }
                }
            }

            Divider()

            // Status transitions
            Text("Changer le statut").font(.headline)
            HStack(spacing: 8) {
                ForEach(["draft", "submitted", "approved", "archived"], id: \.self) { status in
                    if status != report.status {
                        Button(status.capitalized) {
                            Task { await updateStatus(status) }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }
            }

            Spacer()

            HStack {
                Button("Supprimer", role: .destructive) {
                    showDeleteConfirm = true
                }
                .buttonStyle(.bordered)
                .tint(.red)
                Spacer()
                Button("Fermer") { dismiss() }.buttonStyle(.bordered)
            }
        }
        .padding(24)
        .frame(width: 500, height: 550)
        .alert("Supprimer ce rapport ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await deleteReport() } }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary).frame(width: 120, alignment: .leading)
            Text(value).font(.subheadline)
            Spacer()
        }
    }

    private func updateStatus(_ status: String) async {
        do {
            try await convexMutation("functions/diplomaticAffairs:updateReportStatus", with: [
                "reportId": report._id,
                "status": status,
            ])
            onUpdate()
            dismiss()
        } catch {
            print("[ReportDetail] Error: \(error)")
        }
    }

    private func deleteReport() async {
        do {
            try await convexMutation("functions/diplomaticAffairs:deleteReport", with: ["reportId": report._id])
            onUpdate()
            dismiss()
        } catch {
            print("[ReportDetail] Delete error: \(error)")
        }
    }
}

// MARK: - Helpers

private func dipStatusColor(_ status: DiplomaticTargetStatus) -> Color {
    switch status {
    case .identified: .gray
    case .contacted: .blue
    case .inDiscussion: .yellow
    case .partnership: .green
    case .inactive: .gray
    }
}

private func letterStatusColor(_ status: String) -> Color {
    switch status {
    case "draft": .gray
    case "sent": .blue
    case "received": .green
    case "archived": .secondary
    default: .gray
    }
}
