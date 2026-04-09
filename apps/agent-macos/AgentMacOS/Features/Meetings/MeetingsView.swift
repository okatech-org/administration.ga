//
//  MeetingsView.swift
//  AgentMacOS
//
//  Meeting list — basic view (no LiveKit video integration yet)
//

import SwiftUI
import ConvexMobile
import Combine

struct MeetingsView: View {
    @Environment(AppState.self) private var appState
    @State private var meetings: [ConvexMeeting] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showCreateSheet = false

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(title: "Réunions", subtitle: "Gestion des réunions") {
                        AnyView(
                            Button {
                                showCreateSheet = true
                            } label: {
                                Label("Nouvelle réunion", systemImage: "plus")
                            }
                            .buttonStyle(.borderedProminent)
                        )
                    }

                    if isLoading {
                        LoadingView(message: "Chargement des réunions...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadMeetings() }
                    } else if meetings.isEmpty {
                        EmptyStateView(
                            icon: "person.2.wave.2",
                            title: "Aucune réunion",
                            subtitle: "Les réunions programmées apparaîtront ici."
                        )
                    } else {
                        meetingsList
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadMeetings() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadMeetings() }
            }
            .sheet(isPresented: $showCreateSheet) {
                CreateMeetingSheet(orgId: appState.selectedOrgId ?? "") {
                    Task { await loadMeetings() }
                }
            }
        }
    }

    private var meetingsList: some View {
        VStack(spacing: 0) {
            ForEach(meetings) { meeting in
                HStack(spacing: 12) {
                    Image(systemName: "video.fill")
                        .font(.title3)
                        .foregroundStyle(.blue)
                        .frame(width: 40)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(meeting.displayTitle)
                            .font(.body.bold())
                        if let desc = meeting.meetingDescription {
                            Text(desc)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    if let status = meeting.status {
                        StatusBadge(
                            label: meetingStatusLabel(status),
                            color: meetingStatusColor(status)
                        )
                    }

                    if let scheduledAt = meeting.scheduledAt {
                        Text(formatDateTime(scheduledAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                if meeting.id != meetings.last?.id {
                    Divider().padding(.leading, 16)
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func meetingStatusLabel(_ status: String) -> String {
        switch status {
        case "scheduled": "Programmée"
        case "active", "in_progress": "En cours"
        case "ended", "completed": "Terminée"
        case "cancelled": "Annulée"
        default: status.capitalized
        }
    }

    private func meetingStatusColor(_ status: String) -> Color {
        switch status {
        case "scheduled": .blue
        case "active", "in_progress": .green
        case "ended", "completed": .gray
        case "cancelled": .red
        default: .gray
        }
    }

    private func loadMeetings() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            meetings = try await convexQuery(
                "functions/meetings:listByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexMeeting].self
            )
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isLoading = false
    }
}

// MARK: - Create Meeting Sheet

struct CreateMeetingSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var type = "meeting"
    @State private var scheduledDate = Date()
    @State private var meetingDescription = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Nouvelle réunion").font(.title3.bold())
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

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Type").font(.caption).foregroundStyle(.secondary)
                        Picker("Type", selection: $type) {
                            Text("Réunion").tag("meeting")
                            Text("Appel").tag("call")
                        }
                        .pickerStyle(.segmented)
                    }

                    DatePicker("Date et heure", selection: $scheduledDate, displayedComponents: [.date, .hourAndMinute])

                    Text("Description").font(.caption).foregroundStyle(.secondary)
                    TextEditor(text: $meetingDescription)
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
        .frame(width: 480, height: 440)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "title": title,
                "type": type,
                "scheduledAt": scheduledDate.timeIntervalSince1970 * 1000,
            ]
            if !meetingDescription.isEmpty { args["description"] = meetingDescription }

            try await convexMutation("functions/meetings:create", with: args)
            onCreated()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}
