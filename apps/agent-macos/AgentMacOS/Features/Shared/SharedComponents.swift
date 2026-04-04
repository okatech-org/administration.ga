//
//  SharedComponents.swift
//  AgentMacOS
//
//  Reusable UI components shared across features
//

import SwiftUI
import Combine
import ConvexMobile

// MARK: - Convex Query Helper

/// One-shot query helper: subscribes, takes the first value, then cancels.
/// This wraps the boilerplate `withCheckedThrowingContinuation + subscribe + first + sink` pattern.
///
/// Accepts `[String: Any]` for convenience and converts values to ConvexEncodable.
func convexQuery<T: Decodable>(_ name: String, with args: [String: Any] = [:], yielding type: T.Type) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
        var cancellable: AnyCancellable?
        if args.isEmpty {
            cancellable = convex.subscribe(to: name, yielding: type)
                .first()
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                    },
                    receiveValue: { value in
                        continuation.resume(returning: value)
                    }
                )
        } else {
            // Convert [String: Any] to [String: (any ConvexEncodable)?]
            var convexArgs: [String: (any ConvexEncodable)?] = [:]
            for (key, value) in args {
                if value is NSNull {
                    convexArgs[key] = nil
                } else if let s = value as? String {
                    convexArgs[key] = s
                } else if let i = value as? Int {
                    convexArgs[key] = i
                } else if let d = value as? Double {
                    convexArgs[key] = d
                } else if let b = value as? Bool {
                    convexArgs[key] = b
                } else if let e = value as? (any ConvexEncodable) {
                    convexArgs[key] = e
                } else {
                    // Skip unsupported types (nested dicts, arrays, etc.)
                    print("⚠️ [convexQuery] Skipping unsupported arg type for key '\(key)': \(Swift.type(of: value))")
                }
            }
            cancellable = convex.subscribe(to: name, with: convexArgs, yielding: type)
                .first()
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                    },
                    receiveValue: { value in
                        continuation.resume(returning: value)
                    }
                )
        }
    }
}

// MARK: - Page Header

struct PageHeader: View {
    let title: String
    var subtitle: String? = nil
    var actions: (() -> AnyView)? = nil

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.largeTitle)
                    .fontWeight(.bold)

                if let subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let actions {
                actions()
            }
        }
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let label: String
    let color: Color

    var body: some View {
        Text(label)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

// MARK: - Org Gated View

/// Wrapper that shows "Select an org" message if no org is selected.
struct OrgGatedView<Content: View>: View {
    @Environment(AppState.self) private var appState
    @ViewBuilder let content: () -> Content

    var body: some View {
        if appState.selectedOrgId != nil {
            content()
        } else {
            noOrgSelected
        }
    }

    private var noOrgSelected: some View {
        VStack(spacing: 16) {
            Image(systemName: "building.2")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Sélectionnez une organisation")
                .font(.headline)
            Text("Choisissez une organisation dans la barre latérale pour continuer.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String
    let title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.title2)
                .fontWeight(.medium)

            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }
}

// MARK: - Loading View

struct LoadingView: View {
    var message: String = "Chargement..."

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }
}

// MARK: - Error View

struct ErrorView: View {
    let message: String
    var onRetry: (() async -> Void)? = nil

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text("Une erreur est survenue")
                .font(.headline)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if let onRetry {
                Button("Réessayer") {
                    Task { await onRetry() }
                }
                .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }
}

// MARK: - Search Filter Bar

struct SearchFilterBar: View {
    @Binding var searchText: String
    var placeholder: String = "Rechercher..."

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField(placeholder, text: $searchText)
                    .textFieldStyle(.plain)
                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(8)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

// MARK: - Date Formatting Helpers

func formatDate(_ timestamp: Double) -> String {
    let date = Date(timeIntervalSince1970: timestamp / 1000)
    return date.formatted(date: .abbreviated, time: .omitted)
}

func formatDateTime(_ timestamp: Double) -> String {
    let date = Date(timeIntervalSince1970: timestamp / 1000)
    return date.formatted(date: .abbreviated, time: .shortened)
}

func formatRelativeDate(_ timestamp: Double) -> String {
    let date = Date(timeIntervalSince1970: timestamp / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = Locale(identifier: "fr_FR")
    formatter.unitsStyle = .short
    return formatter.localizedString(for: date, relativeTo: Date())
}
