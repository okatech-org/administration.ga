//
//  iAgendaView.swift
//  AgentMacOS
//
//  Calendar & events — mini calendar + event list
//

import SwiftUI
import ConvexMobile
import Combine

struct iAgendaView: View {
    @Environment(AppState.self) private var appState
    @State private var events: [ConvexEvent] = []
    @State private var appointments: [ConvexAppointment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedDate = Date()
    @State private var displayMonth = Date()
    @State private var showCreateEvent = false
    @State private var selectedEvent: ConvexEvent? = nil

    private let calendar = Calendar.current
    private let weekdaySymbols = ["L", "M", "M", "J", "V", "S", "D"]

    private var selectedDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: selectedDate)
    }

    private var filteredAppointments: [ConvexAppointment] {
        appointments.filter { $0.date == selectedDateString }
    }

    private var filteredEvents: [ConvexEvent] {
        let dayStart = calendar.startOfDay(for: selectedDate).timeIntervalSince1970 * 1000
        let dayEnd = dayStart + 86_400_000  // +24h
        return events.filter { $0.date >= dayStart && $0.date < dayEnd }
    }

    var body: some View {
        OrgGatedView {
            HStack(spacing: 0) {
                // Left: Calendar
                calendarSidebar
                    .frame(width: 280)
                    .background(Color(.controlBackgroundColor))

                Divider()

                // Right: Events for selected day
                eventsList
                    .frame(minWidth: 400)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadData() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadData() }
            }
            .sheet(isPresented: $showCreateEvent) {
                CreateEventSheet(orgId: appState.selectedOrgId ?? "") {
                    Task { await loadData() }
                }
            }
            .sheet(item: $selectedEvent) { event in
                EventDetailSheet(event: event) {
                    Task { await loadData() }
                }
            }
        }
    }

    // MARK: - Calendar Sidebar

    private var calendarSidebar: some View {
        VStack(spacing: 16) {
            Text("iAgenda")
                .font(.headline)
                .padding(.top, 16)

            // Month navigation
            HStack {
                Button {
                    displayMonth = calendar.date(byAdding: .month, value: -1, to: displayMonth) ?? displayMonth
                } label: {
                    Image(systemName: "chevron.left")
                }
                .buttonStyle(.plain)

                Spacer()

                Text(monthYearString(displayMonth))
                    .font(.headline)

                Spacer()

                Button {
                    displayMonth = calendar.date(byAdding: .month, value: 1, to: displayMonth) ?? displayMonth
                } label: {
                    Image(systemName: "chevron.right")
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)

            // Weekday headers
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 4) {
                ForEach(weekdaySymbols, id: \.self) { symbol in
                    Text(symbol)
                        .font(.caption2.bold())
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 12)

            // Calendar grid
            let days = daysInMonth(displayMonth)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 4) {
                ForEach(days, id: \.self) { day in
                    if let day {
                        let isSelected = calendar.isDate(day, inSameDayAs: selectedDate)
                        let isToday = calendar.isDateInToday(day)
                        let hasEvent = dayHasEvent(day)

                        Button {
                            selectedDate = day
                        } label: {
                            VStack(spacing: 2) {
                                Text("\(calendar.component(.day, from: day))")
                                    .font(.body)
                                    .fontWeight(isToday ? .bold : .regular)
                                    .foregroundStyle(isSelected ? .white : isToday ? .blue : .primary)

                                if hasEvent {
                                    Circle()
                                        .fill(isSelected ? .white : .blue)
                                        .frame(width: 4, height: 4)
                                }
                            }
                            .frame(width: 32, height: 36)
                            .background(isSelected ? Color.blue : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    } else {
                        Color.clear.frame(width: 32, height: 36)
                    }
                }
            }
            .padding(.horizontal, 12)

            Divider()

            // Today button
            Button {
                selectedDate = Date()
                displayMonth = Date()
            } label: {
                Text("Aujourd'hui")
                    .font(.caption)
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Spacer()
        }
    }

    // MARK: - Events List

    private var eventsList: some View {
        ScrollView {
            VStack(spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(selectedDate.formatted(date: .complete, time: .omitted))
                            .font(.title3.bold())
                        Text("\(filteredAppointments.count) RDV, \(filteredEvents.count) événement\(filteredEvents.count > 1 ? "s" : "")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button {
                        showCreateEvent = true
                    } label: {
                        Label("Événement", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                }

                // Appointments
                if !filteredAppointments.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Rendez-vous")
                            .font(.headline)

                        ForEach(filteredAppointments) { appt in
                            HStack(spacing: 12) {
                                Rectangle()
                                    .fill(apptColor(appt.status))
                                    .frame(width: 4)
                                    .clipShape(RoundedRectangle(cornerRadius: 2))

                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(appt.time)
                                            .font(.subheadline.bold().monospacedDigit())
                                        if let end = appt.endTime {
                                            Text("— \(end)")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    Text(appt.displayName)
                                        .font(.body)
                                    if let service = appt.serviceName {
                                        Text(service)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                Spacer()

                                StatusBadge(label: appt.status.label, color: apptColor(appt.status))
                            }
                            .padding(12)
                            .background(Color(.controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }

                // Events
                if !filteredEvents.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Événements")
                            .font(.headline)

                        ForEach(filteredEvents) { event in
                            Button { selectedEvent = event } label: {
                                HStack(spacing: 12) {
                                    Rectangle()
                                        .fill(.blue)
                                        .frame(width: 4)
                                        .clipShape(RoundedRectangle(cornerRadius: 2))

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(event.title)
                                            .font(.body.bold())
                                        if let location = event.location {
                                            Label(location, systemImage: "mappin")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        if let cat = event.category {
                                            StatusBadge(label: cat.capitalized, color: .blue)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding(12)
                                .background(Color(.controlBackgroundColor))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if filteredAppointments.isEmpty && filteredEvents.isEmpty {
                    EmptyStateView(
                        icon: "calendar",
                        title: "Rien de prévu",
                        subtitle: "Aucun rendez-vous ni événement pour cette date."
                    )
                }

                Spacer(minLength: 24)
            }
            .padding(24)
        }
    }

    // MARK: - Calendar Helpers

    private func monthYearString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date).capitalized
    }

    private func daysInMonth(_ date: Date) -> [Date?] {
        let range = calendar.range(of: .day, in: .month, for: date)!
        let firstDay = calendar.date(from: calendar.dateComponents([.year, .month], from: date))!

        // Weekday of first day (Monday = 0 for our grid)
        var weekday = calendar.component(.weekday, from: firstDay) - 2 // Monday = 0
        if weekday < 0 { weekday = 6 }

        var days: [Date?] = Array(repeating: nil, count: weekday)

        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDay) {
                days.append(date)
            }
        }

        // Pad to complete last week
        while days.count % 7 != 0 {
            days.append(nil)
        }

        return days
    }

    private func dayHasEvent(_ day: Date) -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dayStr = formatter.string(from: day)

        let hasAppt = appointments.contains { $0.date == dayStr }
        if hasAppt { return true }

        let dayStart = calendar.startOfDay(for: day).timeIntervalSince1970 * 1000
        let dayEnd = dayStart + 86_400_000
        return events.contains { $0.date >= dayStart && $0.date < dayEnd }
    }

    private func apptColor(_ status: AppointmentStatus) -> Color {
        switch status {
        case .confirmed: .blue
        case .completed: .green
        case .cancelled: .gray
        case .noShow: .red
        case .rescheduled: .orange
        }
    }

    // MARK: - Data

    private func loadData() async {
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
            print("[iAgenda] Appointments error: \(error)")
        }

        do {
            let result = try await convexQuery(
                "functions/communityEvents:list",
                with: ["orgId": orgId, "paginationOpts": ["numItems": 100.0, "cursor": NSNull()]],
                yielding: PaginatedEvents.self
            )
            events = result.page
        } catch {
            print("[iAgenda] Events error: \(error)")
        }

        isLoading = false
    }
}

// MARK: - Create Event Sheet

struct CreateEventSheet: View {
    let orgId: String
    let onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var eventDate = Date()
    @State private var location = ""
    @State private var category = "community"
    @State private var eventDescription = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Nouvel événement").font(.title3.bold())
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

                    DatePicker("Date", selection: $eventDate, displayedComponents: [.date, .hourAndMinute])

                    TextField("Lieu", text: $location).textFieldStyle(.roundedBorder)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Catégorie").font(.caption).foregroundStyle(.secondary)
                        Picker("Catégorie", selection: $category) {
                            Text("Communautaire").tag("community")
                            Text("Culturel").tag("cultural")
                            Text("Diplomatique").tag("diplomatic")
                            Text("Officiel").tag("official")
                        }
                    }

                    Text("Description").font(.caption).foregroundStyle(.secondary)
                    TextEditor(text: $eventDescription)
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
        .frame(width: 480, height: 520)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            var args: [String: Any] = [
                "orgId": orgId,
                "title": title,
                "date": eventDate.timeIntervalSince1970 * 1000,
                "category": category,
            ]
            if !location.isEmpty { args["location"] = location }
            if !eventDescription.isEmpty { args["description"] = eventDescription }

            try await convexMutation("functions/communityEvents:create", with: args)
            onCreated()
            dismiss()
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }
        isSaving = false
    }
}

// MARK: - Event Detail Sheet

struct EventDetailSheet: View {
    let event: ConvexEvent
    let onUpdate: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(event.title).font(.title2.bold())
                    HStack(spacing: 8) {
                        if let cat = event.category {
                            StatusBadge(label: cat.capitalized, color: .blue)
                        }
                        if let status = event.status {
                            StatusBadge(label: status.capitalized, color: status == "published" ? .green : .gray)
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
                row("Date", event.dateFormatted)
                row("Lieu", event.location ?? "—")
                row("Catégorie", event.category?.capitalized ?? "—")
                row("Statut", event.status?.capitalized ?? "—")
                row("Créé le", formatDate(event.createdAt ?? event._creationTime))

                if let desc = event.description {
                    Divider()
                    Text("Description").font(.headline)
                    Text(desc).font(.body)
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
        .frame(width: 480, height: 450)
        .alert("Supprimer cet événement ?", isPresented: $showDeleteConfirm) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await deleteEvent() } }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(.secondary).frame(width: 100, alignment: .leading)
            Text(value).font(.subheadline)
            Spacer()
        }
    }

    private func deleteEvent() async {
        do {
            try await convexMutation("functions/communityEvents:remove", with: [
                "eventId": event._id,
            ])
            onUpdate()
            dismiss()
        } catch {
            print("[EventDetail] Delete error: \(error)")
        }
    }
}
