//
//  ConvexService.swift
//  AgentMacOS
//
//  Service for interacting with Convex backend
//

import Foundation
import Combine
import ConvexMobile

// MARK: - Convex Data Models

/// Organization from Convex
struct ConvexOrg: Identifiable, Codable, Hashable {
    let _id: String
    let name: String
    let slug: String
    let logoUrl: String?
    let country: String?
    
    var id: String { _id }
}

/// Membership with org details
struct ConvexMembership: Identifiable, Codable {
    let _id: String
    let userId: String
    let orgId: String
    let role: String
    let org: ConvexOrg?
    
    var id: String { _id }
}

/// User from Convex
struct ConvexUser: Identifiable, Codable {
    let _id: String
    let email: String?
    let name: String?
    let avatarUrl: String?
    let isSuperadmin: Bool?
    let isActive: Bool?

    var id: String { _id }

    var displayName: String {
        name ?? email ?? "Utilisateur"
    }
}

/// Profile identity info
struct ProfileIdentity: Codable, Hashable {
    let firstName: String?
    let lastName: String?
    let birthDate: Double?
    let birthPlace: String?
    let gender: String?
}

/// Passport info
struct PassportInfo: Codable, Hashable {
    let number: String?
    let issueDate: Double?
    let expiryDate: Double?
    let issuingCountry: String?
}

/// Profile data from Convex
struct ConvexProfile: Codable, Hashable {
    let _id: String
    let identity: ProfileIdentity?
    let passportInfo: PassportInfo?
    let countryOfResidence: String?
    
    var displayName: String {
        if let first = identity?.firstName, let last = identity?.lastName {
            return "\(first) \(last.uppercased())"
        }
        return identity?.firstName ?? identity?.lastName ?? "Inconnu"
    }
    
    var birthDateFormatted: String? {
        guard let timestamp = identity?.birthDate else { return nil }
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}

/// Registration ready for printing
struct PrintableRegistration: Identifiable, Codable, Hashable {
    let _id: String
    let profileId: String
    let orgId: String
    let status: String
    let cardNumber: String?
    let cardIssuedAt: Double?
    let cardExpiresAt: Double?
    let duration: String?
    let profile: ConvexProfile?
    
    var id: String { _id }
    
    var cardIssuedDate: Date? {
        guard let ts = cardIssuedAt else { return nil }
        return Date(timeIntervalSince1970: ts / 1000)
    }
    
    var cardExpiresDate: Date? {
        guard let ts = cardExpiresAt else { return nil }
        return Date(timeIntervalSince1970: ts / 1000)
    }
}

// MARK: - Convex Service

@MainActor
class ConvexService: ObservableObject {
    static let shared = ConvexService()
    
    @Published var currentUser: ConvexUser?
    @Published var memberships: [ConvexMembership] = []
    @Published var allOrgs: [ConvexOrg] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    var isSuperadmin: Bool {
        currentUser?.isSuperadmin ?? false
    }
    
    var availableOrgs: [ConvexOrg] {
        if isSuperadmin {
            return allOrgs
        }
        return memberships.compactMap { $0.org }
    }
    
    private init() {}
    
    // MARK: - Authentication
    
    /// Load current user from Convex
    func loadCurrentUser() async {
        isLoading = true
        error = nil
        
        do {
            // Ensure user exists in Convex
            try await convex.mutation("functions/users:ensureUser")
            
            // Subscribe to user data
            subscribeToCurrentUser()
            
            // Load org access after a short delay to let subscription settle
            try await Task.sleep(nanoseconds: 500_000_000)
            await loadOrgAccess()
        } catch {
            self.error = "Erreur de chargement: \(error.localizedDescription)"
            print("[ConvexService] Error loading user: \(error)")
        }
        
        isLoading = false
    }
    
    /// Subscribe to current user updates
    private func subscribeToCurrentUser() {
        cancellables.removeAll()
        
        convex.subscribe(to: "functions/users:getMe", yielding: ConvexUser?.self)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        print("[ConvexService] User subscription error: \(error)")
                    }
                },
                receiveValue: { [weak self] user in
                    self?.currentUser = user
                }
            )
            .store(in: &cancellables)
    }
    
    /// Load accessible orgs based on user type
    private func loadOrgAccess() async {
        if isSuperadmin {
            // SuperAdmin: subscribe to all orgs
            convex.subscribe(to: "functions/orgs:list", yielding: [ConvexOrg].self)
                .receive(on: DispatchQueue.main)
                .replaceError(with: [])
                .sink { [weak self] orgs in
                    self?.allOrgs = orgs
                }
                .store(in: &cancellables)
        } else {
            // Agent: subscribe to memberships
            convex.subscribe(to: "functions/memberships:listMyMemberships", yielding: [ConvexMembership].self)
                .receive(on: DispatchQueue.main)
                .replaceError(with: [])
                .sink { [weak self] memberships in
                    self?.memberships = memberships
                    print("[ConvexService] Received \(memberships.count) memberships")
                }
                .store(in: &cancellables)
        }
    }
    
    // MARK: - Print Queue
    
    /// Subscribe to profiles ready for printing in an org
    func subscribeToReadyForPrint(orgId: String) -> AnyPublisher<[PrintableRegistration], ClientError> {
        return convex.subscribe(
            to: "functions/consularRegistrations:getReadyForPrint",
            with: ["orgId": orgId],
            yielding: [PrintableRegistration].self
        )
    }
    
    /// Mark a registration as printed
    func markAsPrinted(registrationId: String) async throws {
        try await convex.mutation("functions/consularRegistrations:markAsPrinted", with: [
            "registrationId": registrationId
        ])
    }
}
