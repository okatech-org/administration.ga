//
//  ServicesView.swift
//  AgentMacOS
//
//  Service catalog management — view, enable/disable services for the org
//

import SwiftUI
import ConvexMobile
import Combine

struct ServicesView: View {
    @Environment(AppState.self) private var appState
    @State private var catalogServices: [ConvexServiceItem] = []
    @State private var orgServices: [ConvexOrgService] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var selectedCategory: String? = nil
    @State private var showCatalog = false

    private var categories: [String] {
        let cats = Set(orgServices.compactMap { $0.category })
        return Array(cats).sorted()
    }

    private var filteredServices: [ConvexOrgService] {
        var result = orgServices
        if let cat = selectedCategory {
            result = result.filter { $0.category == cat }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { $0.displayName.lowercased().contains(query) }
        }
        return result
    }

    var body: some View {
        OrgGatedView {
            ScrollView {
                VStack(spacing: 24) {
                    PageHeader(title: "Services", subtitle: "Gérez les services de votre organisation") {
                        AnyView(
                            Toggle("Vue catalogue", isOn: $showCatalog)
                                .toggleStyle(.switch)
                        )
                    }

                    SearchFilterBar(searchText: $searchText, placeholder: "Rechercher un service...")

                    // Category pills
                    if !categories.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                categoryPill(label: "Tous", value: nil)
                                ForEach(categories, id: \.self) { cat in
                                    categoryPill(label: cat.capitalized, value: cat)
                                }
                            }
                        }
                    }

                    if isLoading {
                        LoadingView(message: "Chargement des services...")
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) { await loadServices() }
                    } else if showCatalog {
                        catalogGrid
                    } else if filteredServices.isEmpty {
                        EmptyStateView(
                            icon: "list.bullet.rectangle",
                            title: "Aucun service",
                            subtitle: "Activez des services depuis le catalogue."
                        )
                    } else {
                        servicesGrid
                    }

                    Spacer(minLength: 24)
                }
                .padding(24)
            }
            .background(Color(.windowBackgroundColor))
            .task { await loadServices() }
            .onChange(of: appState.selectedOrgId) { _, _ in
                Task { await loadServices() }
            }
        }
    }

    // MARK: - Category Pill

    private func categoryPill(label: String, value: String?) -> some View {
        Button {
            selectedCategory = value
        } label: {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(selectedCategory == value ? Color.blue : Color(.controlBackgroundColor))
                .foregroundStyle(selectedCategory == value ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Org Services Grid

    private var servicesGrid: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 16)], spacing: 16) {
            ForEach(filteredServices) { service in
                serviceCard(service)
            }
        }
    }

    private func serviceCard(_ service: ConvexOrgService) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "doc.text")
                    .font(.title3)
                    .foregroundStyle(.blue)

                VStack(alignment: .leading, spacing: 2) {
                    Text(service.displayName)
                        .font(.headline)
                        .lineLimit(1)
                    if let cat = service.category {
                        Text(cat.capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                StatusBadge(
                    label: service.isActive ? "Actif" : "Inactif",
                    color: service.isActive ? .green : .gray
                )
            }

            if let desc = service.description, !desc.isEmpty {
                Text(desc)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack {
                Spacer()
                Button(service.isActive ? "Désactiver" : "Activer") {
                    Task { await toggleService(service) }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .tint(service.isActive ? .red : .green)
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Catalog Grid

    private var catalogGrid: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 16)], spacing: 16) {
            ForEach(catalogServices) { service in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: service.icon ?? "doc.text")
                            .font(.title3)
                            .foregroundStyle(.blue)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(service.displayName)
                                .font(.headline)
                                .lineLimit(1)
                            if let cat = service.category {
                                Text(cat.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()
                    }

                    Text(service.displayDescription)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)

                    HStack {
                        if let days = service.estimatedDays {
                            Label("\(days) jours", systemImage: "clock")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        if service.requiresAppointment == true {
                            Label("RDV requis", systemImage: "calendar")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                }
                .padding(16)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Actions

    private func toggleService(_ service: ConvexOrgService) async {
        guard let orgId = appState.selectedOrgId else { return }
        do {
            try await convex.mutation(
                "functions/services:toggleOrgServiceActive",
                with: ["orgServiceId": service._id, "orgId": orgId]
            )
            await loadServices()
        } catch {
            print("[ServicesView] Toggle error: \(error)")
        }
    }

    // MARK: - Data Loading

    private func loadServices() async {
        guard let orgId = appState.selectedOrgId else { return }
        isLoading = true
        errorMessage = nil

        do {
            async let catalog = convexQuery(
                "functions/services:listCatalog",
                yielding: [ConvexServiceItem].self
            )
            async let org = convexQuery(
                "functions/services:listByOrg",
                with: ["orgId": orgId],
                yielding: [ConvexOrgService].self
            )

            catalogServices = try await catalog
            orgServices = try await org
        } catch {
            errorMessage = "Erreur: \(error.localizedDescription)"
        }

        isLoading = false
    }
}
