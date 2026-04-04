//
//  ConvexModels.swift
//  AgentMacOS
//
//  Codable models matching Convex query return shapes.
//  Each struct mirrors the fields returned by the corresponding Convex function.
//

import Foundation

// MARK: - Request Status

enum RequestStatus: String, Codable, CaseIterable {
    case draft
    case submitted
    case pending
    case underReview = "under_review"
    case inProduction = "in_production"
    case validated
    case rejected
    case appointmentScheduled = "appointment_scheduled"
    case readyForPickup = "ready_for_pickup"
    case completed
    case cancelled

    var label: String {
        switch self {
        case .draft: "Brouillon"
        case .submitted: "Soumise"
        case .pending: "En attente"
        case .underReview: "En examen"
        case .inProduction: "En production"
        case .validated: "Validée"
        case .rejected: "Rejetée"
        case .appointmentScheduled: "RDV programmé"
        case .readyForPickup: "Prêt à retirer"
        case .completed: "Terminée"
        case .cancelled: "Annulée"
        }
    }

    var color: String {
        switch self {
        case .draft: "gray"
        case .submitted: "blue"
        case .pending: "yellow"
        case .underReview: "blue"
        case .inProduction: "purple"
        case .validated: "green"
        case .rejected: "red"
        case .appointmentScheduled: "blue"
        case .readyForPickup: "green"
        case .completed: "green"
        case .cancelled: "gray"
        }
    }

    var phase: String {
        switch self {
        case .draft, .submitted: "creation"
        case .pending, .underReview, .inProduction: "processing"
        case .validated, .appointmentScheduled, .readyForPickup: "finalization"
        case .completed, .cancelled, .rejected: "terminal"
        }
    }

    var isTerminal: Bool { phase == "terminal" }
}

// MARK: - Request Transitions (mirrors convex/lib/requestWorkflow.ts)

let REQUEST_TRANSITIONS: [RequestStatus: [RequestStatus]] = [
    .draft: [.submitted, .cancelled],
    .submitted: [.pending, .underReview, .cancelled],
    .pending: [.underReview, .cancelled],
    .underReview: [.validated, .rejected, .appointmentScheduled, .inProduction],
    .inProduction: [.readyForPickup, .validated],
    .validated: [.inProduction, .readyForPickup, .completed],
    .appointmentScheduled: [.underReview, .validated, .cancelled],
    .readyForPickup: [.completed],
    .completed: [],
    .cancelled: [],
    .rejected: [.draft],
]

// MARK: - Request

struct ConvexRequest: Identifiable, Codable, Hashable {
    let _id: String
    let reference: String
    let status: RequestStatus
    let priority: String?
    let userId: String?
    let profileId: String?
    let orgId: String
    let orgServiceId: String?
    let assignedTo: String?
    let submittedAt: Double?
    let completedAt: Double?
    let updatedAt: Double?
    let serviceName: LocalizedString?
    let _creationTime: Double

    // Nested user info (enriched by backend)
    let user: RequestUser?

    var id: String { _id }

    var citizenName: String {
        user?.name ?? user?.email ?? "Inconnu"
    }

    var serviceDisplayName: String? {
        serviceName?.localized
    }

    var createdDate: String { formatDate(_creationTime) }

    struct RequestUser: Codable, Hashable {
        let _id: String?
        let name: String?
        let email: String?
        let avatarUrl: String?
    }
}

// MARK: - Request List Response (paginated)

struct PaginatedRequests: Codable {
    let page: [ConvexRequest]
    let isDone: Bool
    let continueCursor: String?
}

// MARK: - Appointment Status

enum AppointmentStatus: String, Codable, CaseIterable {
    case confirmed
    case cancelled
    case completed
    case noShow = "no_show"
    case rescheduled

    var label: String {
        switch self {
        case .confirmed: "Confirmé"
        case .cancelled: "Annulé"
        case .completed: "Terminé"
        case .noShow: "Absent"
        case .rescheduled: "Reprogrammé"
        }
    }

    var color: String {
        switch self {
        case .confirmed: "blue"
        case .cancelled: "gray"
        case .completed: "green"
        case .noShow: "red"
        case .rescheduled: "orange"
        }
    }
}

// MARK: - Appointment

struct ConvexAppointment: Identifiable, Codable, Hashable {
    let _id: String
    let requestId: String?
    let attendeeProfileId: String?
    let orgId: String
    let agentId: String?
    let orgServiceId: String?
    let appointmentType: String?
    let date: String   // "YYYY-MM-DD"
    let time: String   // "HH:mm"
    let endTime: String?
    let durationMinutes: Int?
    let status: AppointmentStatus
    let notes: String?
    let cancellationReason: String?
    let confirmedAt: Double?
    let cancelledAt: Double?
    let completedAt: Double?
    let _creationTime: Double

    // Enriched fields
    let attendeeName: String?
    let attendeeEmail: String?
    let serviceName: String?

    var id: String { _id }

    var displayName: String { attendeeName ?? attendeeEmail ?? "Inconnu" }
    var dateFormatted: String { date }
}

// MARK: - Payment Status

enum PaymentStatus: String, Codable, CaseIterable {
    case pending
    case processing
    case succeeded
    case failed
    case refunded
    case cancelled

    var label: String {
        switch self {
        case .pending: "En attente"
        case .processing: "En cours"
        case .succeeded: "Réussi"
        case .failed: "Échoué"
        case .refunded: "Remboursé"
        case .cancelled: "Annulé"
        }
    }

    var color: String {
        switch self {
        case .pending: "yellow"
        case .processing: "blue"
        case .succeeded: "green"
        case .failed: "red"
        case .refunded: "orange"
        case .cancelled: "gray"
        }
    }
}

// MARK: - Payment

struct ConvexPayment: Identifiable, Codable, Hashable {
    let _id: String
    let requestId: String?
    let userId: String?
    let orgId: String
    let amount: Int  // in cents
    let currency: String
    let status: PaymentStatus
    let description: String?
    let paidAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    let user: PaymentUser?

    var id: String { _id }

    var amountFormatted: String {
        let value = Double(amount) / 100.0
        let symbol = currency.uppercased() == "EUR" ? "€" : currency.uppercased()
        return String(format: "%.2f %@", value, symbol)
    }

    var citizenName: String {
        user?.name ?? user?.email ?? "Inconnu"
    }

    struct PaymentUser: Codable, Hashable {
        let _id: String?
        let name: String?
        let email: String?
    }
}

// MARK: - Post

enum PostStatus: String, Codable {
    case draft
    case published
    case archived

    var label: String {
        switch self {
        case .draft: "Brouillon"
        case .published: "Publié"
        case .archived: "Archivé"
        }
    }

    var color: String {
        switch self {
        case .draft: "gray"
        case .published: "green"
        case .archived: "blue"
        }
    }
}

struct ConvexPost: Identifiable, Codable, Hashable {
    let _id: String
    let title: String
    let slug: String?
    let excerpt: String?
    let content: String?
    let category: String?
    let status: PostStatus
    let publishedAt: Double?
    let createdAt: Double?
    let updatedAt: Double?
    let authorName: String?
    let coverImageUrl: String?
    let _creationTime: Double

    var id: String { _id }
}

struct PaginatedPosts: Codable {
    let page: [ConvexPost]
    let isDone: Bool
    let continueCursor: String?
}

// MARK: - Service

struct LocalizedString: Codable, Hashable {
    let fr: String?
    let en: String?

    /// Best available label (prefers French)
    var localized: String {
        fr ?? en ?? "—"
    }

    // Decode from a Record<string, string> with any language keys
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: DynamicCodingKey.self)
        fr = try container.decodeIfPresent(String.self, forKey: DynamicCodingKey(stringValue: "fr"))
        en = try container.decodeIfPresent(String.self, forKey: DynamicCodingKey(stringValue: "en"))
    }

    private struct DynamicCodingKey: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }
}

struct ConvexServiceItem: Identifiable, Codable, Hashable {
    let _id: String
    let slug: String?
    let code: String?
    let name: LocalizedString?
    let description: LocalizedString?
    let category: String?
    let icon: String?
    let estimatedDays: Int?
    let requiresAppointment: Bool?
    let isActive: Bool
    let _creationTime: Double

    var id: String { _id }

    var displayName: String { name?.fr ?? slug ?? _id }
    var displayDescription: String { description?.fr ?? "" }
}

struct ConvexOrgService: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String
    let serviceId: String
    let isActive: Bool
    let name: String?
    let category: String?
    let description: String?
    let _creationTime: Double

    var id: String { _id }
    var displayName: String { name ?? _id }
}

// MARK: - Team Member (enriched membership)

struct ConvexTeamMember: Identifiable, Codable, Hashable {
    let _id: String
    let userId: String
    let orgId: String
    let positionId: String?
    let _creationTime: Double

    // Enriched
    let user: TeamMemberUser?
    let position: TeamMemberPosition?

    var id: String { _id }

    var displayName: String { user?.name ?? user?.email ?? "Inconnu" }
    var email: String { user?.email ?? "" }

    struct TeamMemberUser: Codable, Hashable {
        let _id: String?
        let name: String?
        let email: String?
        let avatarUrl: String?
        let isActive: Bool?
    }

    struct TeamMemberPosition: Codable, Hashable {
        let _id: String?
        let title: String?
        let grade: String?
    }
}

// MARK: - Digital Mail

struct ConvexMail: Identifiable, Codable, Hashable {
    let _id: String
    let userId: String?
    let ownerId: String?
    let ownerType: String?
    let type: String?
    let folder: String  // "inbox" | "sent" | "drafts" | "archive" | "trash"
    let sender: MailParticipant?
    let recipient: MailParticipant?
    let subject: String
    let preview: String?
    let content: String?
    let isRead: Bool
    let isStarred: Bool
    let threadId: String?
    let createdAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    var id: String { _id }

    var senderName: String { sender?.name ?? "Inconnu" }
    var dateFormatted: String { formatDate(createdAt ?? _creationTime) }

    struct MailParticipant: Codable, Hashable {
        let name: String?
        let email: String?
        let role: String?
        let type: String?
    }
}

struct PaginatedMails: Codable {
    let page: [ConvexMail]
    let isDone: Bool
    let continueCursor: String?
}

// MARK: - Correspondance

enum CorrespondanceType: String, Codable, CaseIterable {
    case noteVerbale = "note_verbale"
    case lettreOfficielle = "lettre_officielle"
    case circulaire
    case telegramme
    case memorandum
    case communique

    var label: String {
        switch self {
        case .noteVerbale: "Note verbale"
        case .lettreOfficielle: "Lettre officielle"
        case .circulaire: "Circulaire"
        case .telegramme: "Télégramme"
        case .memorandum: "Mémorandum"
        case .communique: "Communiqué"
        }
    }
}

enum CorrespondanceStatus: String, Codable, CaseIterable {
    case draft
    case pending
    case approved
    case rejected
    case sent
    case received
    case archived

    var label: String {
        switch self {
        case .draft: "Brouillon"
        case .pending: "En attente"
        case .approved: "Approuvé"
        case .rejected: "Rejeté"
        case .sent: "Envoyé"
        case .received: "Reçu"
        case .archived: "Archivé"
        }
    }

    var color: String {
        switch self {
        case .draft: "gray"
        case .pending: "yellow"
        case .approved: "green"
        case .rejected: "red"
        case .sent: "blue"
        case .received: "teal"
        case .archived: "gray"
        }
    }
}

struct ConvexCorrespondance: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String?
    let reference: String
    let title: String
    let type: CorrespondanceType
    let priority: String?
    let status: CorrespondanceStatus
    let senderName: String?
    let senderOrg: String?
    let recipientName: String?
    let recipientOrg: String?
    let direction: String?  // "incoming" | "outgoing"
    let tags: [String]?
    let createdAt: Double?
    let updatedAt: Double?
    let sentAt: Double?
    let _creationTime: Double

    var id: String { _id }
    var dateFormatted: String { formatDate(createdAt ?? _creationTime) }
}

// MARK: - Document

struct ConvexDocument: Identifiable, Codable, Hashable {
    let _id: String
    let ownerId: String?
    let documentType: String?
    let category: String?
    let label: String?
    let status: String?  // "pending" | "validated" | "rejected"
    let expiresAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    let files: [DocumentFile]?

    var id: String { _id }
    var displayLabel: String { label ?? documentType ?? "Document" }

    struct DocumentFile: Codable, Hashable {
        let storageId: String
        let filename: String
        let mimeType: String?
        let sizeBytes: Int?
        let uploadedAt: Double?
    }
}

// MARK: - Community Event

struct ConvexEvent: Identifiable, Codable, Hashable {
    let _id: String
    let title: String
    let slug: String?
    let description: String?
    let date: Double  // timestamp ms
    let location: String?
    let category: String?
    let status: String?  // "draft" | "published" | "archived"
    let coverImageUrl: String?
    let createdAt: Double?
    let _creationTime: Double

    var id: String { _id }
    var dateFormatted: String { formatDate(date) }
}

struct PaginatedEvents: Codable {
    let page: [ConvexEvent]
    let isDone: Bool
    let continueCursor: String?
}

// MARK: - Diplomatic Target

enum DiplomaticTargetStatus: String, Codable, CaseIterable {
    case identified
    case contacted
    case inDiscussion = "in_discussion"
    case partnership
    case inactive

    var label: String {
        switch self {
        case .identified: "Identifié"
        case .contacted: "Contacté"
        case .inDiscussion: "En discussion"
        case .partnership: "Partenariat"
        case .inactive: "Inactif"
        }
    }

    var color: String {
        switch self {
        case .identified: "gray"
        case .contacted: "blue"
        case .inDiscussion: "yellow"
        case .partnership: "green"
        case .inactive: "gray"
        }
    }
}

enum DiplomaticTargetType: String, Codable, CaseIterable {
    case enterprise
    case government
    case ngo
    case internationalOrg = "international_org"
    case academic
    case media
    case other

    var label: String {
        switch self {
        case .enterprise: "Entreprise"
        case .government: "Gouvernement"
        case .ngo: "ONG"
        case .internationalOrg: "Organisation internationale"
        case .academic: "Académique"
        case .media: "Média"
        case .other: "Autre"
        }
    }
}

struct ConvexDiplomaticTarget: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String?
    let name: String
    let type: DiplomaticTargetType
    let sector: String?
    let country: String?
    let city: String?
    let contactName: String?
    let contactTitle: String?
    let contactEmail: String?
    let contactPhone: String?
    let website: String?
    let priority: String?
    let status: DiplomaticTargetStatus
    let description: String?
    let notes: String?
    let tags: [String]?
    let createdAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    var id: String { _id }
}

struct ConvexDiplomaticLetter: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String?
    let reference: String?
    let subject: String
    let type: String?
    let recipientName: String?
    let recipientTitle: String?
    let recipientOrg: String?
    let status: String?
    let sentAt: Double?
    let createdAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    var id: String { _id }
}

struct ConvexDiplomaticPlan: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String?
    let title: String
    let period: String?
    let category: String?
    let summary: String?
    let status: String?
    let createdAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    var id: String { _id }
}

struct ConvexDiplomaticReport: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String?
    let title: String
    let type: String?
    let recipient: String?
    let summary: String?
    let status: String?
    let submittedAt: Double?
    let createdAt: Double?
    let updatedAt: Double?
    let _creationTime: Double

    var id: String { _id }
}

// MARK: - Meeting

struct MeetingParticipant: Codable, Hashable {
    let userId: String
    let joinedAt: Double?
    let leftAt: Double?
    let role: String // "host" | "participant"
}

struct ConvexMeeting: Identifiable, Codable, Hashable {
    let _id: String
    let orgId: String?
    let title: String?
    let meetingDescription: String?
    let type: String? // "call" | "meeting"
    let status: String? // "scheduled" | "active" | "ended" | "cancelled"

    enum CodingKeys: String, CodingKey {
        case _id, orgId, title, type, status, roomName, createdBy, participants
        case isOrgInbound, requestId, appointmentId, mediaType, maxParticipants
        case scheduledAt, startedAt, endedAt, _creationTime
        case meetingDescription = "description"
    }
    let roomName: String?
    let createdBy: String?
    let participants: [MeetingParticipant]?
    let isOrgInbound: Bool?
    let requestId: String?
    let appointmentId: String?
    let mediaType: String? // "audio" | "video"
    let maxParticipants: Int?
    let scheduledAt: Double?
    let startedAt: Double?
    let endedAt: Double?
    let _creationTime: Double

    var id: String { _id }
    var displayTitle: String { title ?? (type == "call" ? "Appel" : "Réunion") }
    var isCall: Bool { type == "call" }
    var isMeeting: Bool { type == "meeting" }
    var participantCount: Int { participants?.count ?? 0 }

    var statusLabel: String {
        switch status {
        case "scheduled": "Planifié"
        case "active": "En cours"
        case "ended": "Terminé"
        case "cancelled": "Annulé"
        default: status ?? "—"
        }
    }

    var statusColor: String {
        switch status {
        case "scheduled": "blue"
        case "active": "green"
        case "ended": "secondary"
        case "cancelled": "red"
        default: "secondary"
        }
    }
}

// MARK: - Chat Thread

struct ConvexChat: Identifiable, Codable, Hashable {
    let _id: String
    let participantA: String
    let participantB: String
    let initiatedBy: String
    let orgId: String?
    let requestId: String?
    let lastMessageText: String?
    let lastMessageAt: Double?
    let lastMessageBy: String?
    let type: String? // "p2p" | "standard"
    let status: String // "active" | "archived"
    let createdAt: Double
    // Enriched by listMyChats
    let otherUser: ChatOtherUser?
    let unreadCount: Int?

    var id: String { _id }

    struct ChatOtherUser: Codable, Hashable {
        let _id: String?
        let name: String?
        let email: String?
        let avatarUrl: String?
    }

    var displayName: String { otherUser?.name ?? otherUser?.email ?? "Conversation" }
    var preview: String { lastMessageText ?? "Aucun message" }
}

struct ConvexChatMessage: Identifiable, Codable, Hashable {
    let _id: String
    let chatId: String
    let senderId: String
    let content: String
    let attachments: [ChatAttachment]?
    let readBy: [String]?
    let _creationTime: Double

    var id: String { _id }

    struct ChatAttachment: Codable, Hashable {
        let storageId: String?
        let filename: String?
        let mimeType: String?
    }
}

// MARK: - Citizen Profile (admin search result)

struct CitizenProfile: Identifiable, Codable, Hashable {
    let _id: String
    let userId: String?
    let identity: ProfileIdentity?
    let passportInfo: PassportInfo?
    let contacts: ProfileContacts?
    let consularCard: ConsularCardInfo?
    let matricule: String?
    // Enriched
    let user: CitizenUser?
    let avatarUrl: String?
    let photoUrl: String?
    let requestCount: Int?
    let childCount: Int?
    let _creationTime: Double?

    var id: String { _id }

    var displayName: String {
        if let first = identity?.firstName, let last = identity?.lastName {
            return "\(first) \(last.uppercased())"
        }
        return identity?.firstName ?? identity?.lastName ?? user?.name ?? "Inconnu"
    }

    var email: String? {
        contacts?.email ?? user?.email
    }

    var passportExpiry: Double? {
        passportInfo?.expiryDate
    }

    var isPassportUrgent: Bool {
        guard let expiry = passportExpiry else { return false }
        let expiryDate = Date(timeIntervalSince1970: expiry / 1000)
        let threeMonths = Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()
        return expiryDate < threeMonths
    }

    struct CitizenUser: Codable, Hashable {
        let _id: String?
        let email: String?
        let name: String?
    }

    struct ProfileContacts: Codable, Hashable {
        let phone: String?
        let email: String?
    }

    struct ConsularCardInfo: Codable, Hashable {
        let orgId: String?
        let cardNumber: String?
        let cardIssuedAt: Double?
        let cardExpiresAt: Double?
    }
}

// MARK: - Consular Registration (extends PrintableRegistration from ConvexService)

struct ConsularRegistrationList: Codable {
    let page: [PrintableRegistration]
    let isDone: Bool
    let continueCursor: String?
}
