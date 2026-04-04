//
//  AppointmentsView.swift
//  AgentMacOS
//
//  Appointment management view — list, filter, and act on appointments.
//

import SwiftUI
import ConvexMobile

// MARK: - Color Helper

private func statusColor(_ name: String) -> Color {
    switch name {
    case "blue":    return .blue
    case "green":   return .green
    case "red":     return .red
    case "orange":  return .orange
    case "gray":    return .gray
    default:        return .secondary
    }
}

// MARK: - Appointments View

struct AppointmentsView: View {
    @Environment(AppState.self) private var appState

    @State private var appointments: [ConvexAppointment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedDate = Date()
    @State private var selectedStatus: AppointmentStatus? = nil
    @State private var selectedAppointment: ConvexAppointment? = nil
    @State private var actionInProgress: String? = nil

    // MARK: - Computed

    private var selectedDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: selectedDate)
    }

    private var filteredAppointments: [ConvexAppointment] {
        appointments.filter { appt in
            let matchesDate = appt.date == selectedDateString
            let matchesStatus = selectedStatus == nil || appt.status == selectedStatus
            return matchesDate && matchesStatus
        }
    }

    // MARK: - Body

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    header
                    statusFilterRow
                    appointmentsTable
                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .frame(minWidth: 600, minHeight: 400)
            .task { await loadAppointments() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadAppointments() }
            }
            .sheet(item: $selectedAppointment) { appointment in
                AppointmentDetailSheet(
                    appointment: appointment,
                    actionInProgress: $actionInProgress,
                    onComplete: { await completeAppointment(appointment._id) },
                    onCancel: { await cancelAppointment(appointment._id) },
                    onNoShow: { await markNoShow(appointment._id) },
                    onDismiss: {
                        selectedAppointment = nil
                        Task { await loadAppointments() }
                    }
                )
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        PageHeader(title: "Rendez-vous", subtitle: "Gestion des rendez-vous consulaires") {
            AnyView(
                HStack(spacing: 12) {
                    DatePicker(
                        "Date",
                        selection: $selectedDate,
                        displayedComponents: .date
                    )
                    .datePickerStyle(.field)
                    .frame(width: 180)

                    Button {
                        Task { await loadAppointments() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)
                    .disabled(isLoading)
                }
            )
        }
    }

    // MARK: - Status Filter Pills

    private var statusFilterRow: some View {
        HStack(spacing: 8) {
            FilterPill(label: "Tous", isSelected: selectedStatus == nil) {
                selectedStatus = nil
            }

            ForEach(AppointmentStatus.allCases, id: \.self) { status in
                FilterPill(
                    label: status.label,
                    isSelected: selectedStatus == status,
                    color: statusColor(status.color)
                ) {
                    selectedStatus = selectedStatus == status ? nil : status
                }
            }

            Spacer()

            Text("\(filteredAppointments.count) rendez-vous")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Table

    private var appointmentsTable: some View {
        Group {
            if isLoading {
                LoadingView(message: "Chargement des rendez-vous...")
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    await loadAppointments()
                }
            } else if filteredAppointments.isEmpty {
                EmptyStateView(
                    icon: "calendar.badge.exclamationmark",
                    title: "Aucun rendez-vous",
                    subtitle: "Aucun rendez-vous trouvé pour cette date et ce filtre."
                )
            } else {
                VStack(spacing: 0) {
                    // Table header
                    HStack(spacing: 0) {
                        tableHeaderCell("Date", width: 100)
                        tableHeaderCell("Heure", width: 80)
                        tableHeaderCell("Citoyen", width: nil)
                        tableHeaderCell("Service", width: nil)
                        tableHeaderCell("Type", width: 100)
                        tableHeaderCell("Statut", width: 110)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color(.controlBackgroundColor))

                    Divider()

                    // Table rows
                    ForEach(filteredAppointments) { appointment in
                        appointmentRow(appointment)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedAppointment = appointment
                            }
                            .contextMenu {
                                contextMenuItems(for: appointment)
                            }

                        Divider()
                            .padding(.horizontal, 16)
                    }
                }
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func tableHeaderCell(_ title: String, width: CGFloat?) -> some View {
        Group {
            if let width {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .frame(width: width, alignment: .leading)
            } else {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func appointmentRow(_ appointment: ConvexAppointment) -> some View {
        HStack(spacing: 0) {
            Text(formatAppointmentDate(appointment.date))
                .font(.callout.monospacedDigit())
                .frame(width: 100, alignment: .leading)

            Text(appointment.time)
                .font(.callout.monospacedDigit())
                .frame(width: 80, alignment: .leading)

            HStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.15))
                    Text(initials(appointment.displayName))
                        .font(.caption2.bold())
                        .foregroundStyle(.blue)
                }
                .frame(width: 28, height: 28)

                Text(appointment.displayName)
                    .font(.callout)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(appointment.serviceName ?? "-")
                .font(.callout)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text(appointmentTypeLabel(appointment.appointmentType))
                .font(.callout)
                .frame(width: 100, alignment: .leading)

            StatusBadge(
                label: appointment.status.label,
                color: statusColor(appointment.status.color)
            )
            .frame(width: 110, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(.controlBackgroundColor))
    }

    @ViewBuilder
    private func contextMenuItems(for appointment: ConvexAppointment) -> some View {
        Button {
            Task { await completeAppointment(appointment._id) }
        } label: {
            Label("Compléter", systemImage: "checkmark.circle")
        }
        .disabled(appointment.status == .completed)

        Button {
            Task { await cancelAppointment(appointment._id) }
        } label: {
            Label("Annuler", systemImage: "xmark.circle")
        }
        .disabled(appointment.status == .cancelled)

        Button {
            Task { await markNoShow(appointment._id) }
        } label: {
            Label("Absent", systemImage: "person.slash")
        }
        .disabled(appointment.status == .noShow)

        Divider()

        Button {
            selectedAppointment = appointment
        } label: {
            Label("Détails", systemImage: "info.circle")
        }
    }

    // MARK: - Data Loading

    private func loadAppointments() async {
        guard let orgId = appState.selectedOrgId else { return }

        isLoading = true
        errorMessage = nil

        do {
            appointments = try await convexQuery(
                "functions/slots:listAppointmentsByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexAppointment].self
            )
        } catch {
            print("[Appointments] Error loading: \(error)")
            errorMessage = "Impossible de charger les rendez-vous: \(error.localizedDescription)"
            appointments = []
        }

        isLoading = false
    }

    // MARK: - Actions

    private func completeAppointment(_ id: String) async {
        actionInProgress = id
        do {
            try await convex.mutation("functions/slots:completeAppointment", with: ["appointmentId": id])
            await loadAppointments()
        } catch {
            print("[Appointments] Error completing: \(error)")
        }
        actionInProgress = nil
    }

    private func cancelAppointment(_ id: String) async {
        actionInProgress = id
        do {
            try await convex.mutation("functions/slots:cancelAppointment", with: ["appointmentId": id])
            await loadAppointments()
        } catch {
            print("[Appointments] Error cancelling: \(error)")
        }
        actionInProgress = nil
    }

    private func markNoShow(_ id: String) async {
        actionInProgress = id
        do {
            try await convex.mutation("functions/slots:markNoShow", with: ["appointmentId": id])
            await loadAppointments()
        } catch {
            print("[Appointments] Error marking no-show: \(error)")
        }
        actionInProgress = nil
    }

    // MARK: - Helpers

    private func formatAppointmentDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2])/\(parts[1])/\(parts[0])"
    }

    private func appointmentTypeLabel(_ type: String?) -> String {
        switch type?.lowercased() {
        case "depot", "dépôt":  return "Dépôt"
        case "retrait":         return "Retrait"
        default:                return type ?? "-"
        }
    }

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Filter Pill

private struct FilterPill: View {
    let label: String
    let isSelected: Bool
    var color: Color = .accentColor
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? color.opacity(0.15) : Color(.controlBackgroundColor))
                .foregroundStyle(isSelected ? color : .primary)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(isSelected ? color.opacity(0.4) : Color.clear, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Appointment Detail Sheet

private struct AppointmentDetailSheet: View {
    let appointment: ConvexAppointment
    @Binding var actionInProgress: String?
    let onComplete: () async -> Void
    let onCancel: () async -> Void
    let onNoShow: () async -> Void
    let onDismiss: () -> Void

    private var isBusy: Bool { actionInProgress == appointment._id }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Détails du rendez-vous")
                        .font(.title2)
                        .fontWeight(.bold)

                    StatusBadge(
                        label: appointment.status.label,
                        color: statusColor(appointment.status.color)
                    )
                }

                Spacer()

                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(24)

            Divider()

            // Content
            ScrollView {
                VStack(spacing: 20) {
                    detailSection("Informations", items: [
                        ("calendar", "Date", formatDetailDate(appointment.date)),
                        ("clock", "Heure", formatTimeRange()),
                        ("timer", "Durée", durationLabel()),
                        ("tag", "Type", appointmentTypeLabel(appointment.appointmentType)),
                    ])

                    detailSection("Citoyen", items: [
                        ("person", "Nom", appointment.displayName),
                        ("envelope", "Email", appointment.attendeeEmail ?? "-"),
                    ])

                    detailSection("Service", items: [
                        ("building.2", "Service", appointment.serviceName ?? "-"),
                    ])

                    if let notes = appointment.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Notes", systemImage: "note.text")
                                .font(.headline)

                            Text(notes)
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(.controlBackgroundColor))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }

                    if let reason = appointment.cancellationReason, !reason.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Raison d'annulation", systemImage: "exclamationmark.triangle")
                                .font(.headline)
                                .foregroundStyle(.red)

                            Text(reason)
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.red.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }

                    timestampsSection
                }
                .padding(24)
            }

            Divider()

            // Action buttons
            HStack(spacing: 12) {
                Spacer()

                if appointment.status == .confirmed {
                    Button {
                        Task { await onNoShow() }
                    } label: {
                        Label("Absent", systemImage: "person.slash")
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                    .disabled(isBusy)

                    Button {
                        Task { await onCancel() }
                    } label: {
                        Label("Annuler", systemImage: "xmark.circle")
                    }
                    .buttonStyle(.bordered)
                    .tint(.orange)
                    .disabled(isBusy)

                    Button {
                        Task { await onComplete() }
                    } label: {
                        Label("Compléter", systemImage: "checkmark.circle")
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isBusy)
                }

                if isBusy {
                    ProgressView()
                        .controlSize(.small)
                }
            }
            .padding(24)
        }
        .frame(width: 520)
        .frame(minHeight: 500)
        .background(Color(.windowBackgroundColor))
    }

    // MARK: - Detail Section

    private func detailSection(_ title: String, items: [(String, String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            VStack(spacing: 8) {
                ForEach(items, id: \.1) { icon, label, value in
                    HStack(spacing: 12) {
                        Image(systemName: icon)
                            .foregroundStyle(.secondary)
                            .frame(width: 20)

                        Text(label)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .frame(width: 80, alignment: .leading)

                        Text(value)
                            .font(.callout)

                        Spacer()
                    }
                }
            }
            .padding(12)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var timestampsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Historique")
                .font(.headline)

            VStack(spacing: 6) {
                timestampRow("Créé le", timestamp: appointment._creationTime)

                if let ts = appointment.confirmedAt {
                    timestampRow("Confirmé le", timestamp: ts)
                }
                if let ts = appointment.completedAt {
                    timestampRow("Terminé le", timestamp: ts)
                }
                if let ts = appointment.cancelledAt {
                    timestampRow("Annulé le", timestamp: ts)
                }
            }
            .padding(12)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func timestampRow(_ label: String, timestamp: Double) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Text(formatDateTime(timestamp))
                .font(.caption.monospacedDigit())
        }
    }

    // MARK: - Helpers

    private func formatDetailDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        let months = ["janvier", "février", "mars", "avril", "mai", "juin",
                      "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
        let monthIdx = (Int(parts[1]) ?? 1) - 1
        let month = months[min(monthIdx, 11)]
        return "\(parts[2]) \(month) \(parts[0])"
    }

    private func formatTimeRange() -> String {
        if let endTime = appointment.endTime {
            return "\(appointment.time) - \(endTime)"
        }
        return appointment.time
    }

    private func durationLabel() -> String {
        if let mins = appointment.durationMinutes {
            if mins >= 60 {
                let h = mins / 60
                let m = mins % 60
                return m > 0 ? "\(h)h\(String(format: "%02d", m))" : "\(h)h"
            }
            return "\(mins) min"
        }
        return "-"
    }

    private func appointmentTypeLabel(_ type: String?) -> String {
        switch type?.lowercased() {
        case "depot", "dépôt":  return "Dépôt"
        case "retrait":         return "Retrait"
        default:                return type ?? "-"
        }
    }
}

// MARK: - Preview

#Preview {
    AppointmentsView()
        .environment(AppState())
        .frame(width: 1000, height: 700)
}
