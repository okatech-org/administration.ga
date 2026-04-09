//
//  ProfilePrintView.swift
//  AgentMacOS
//
//  View for printing consular cards from Convex profiles
//  Uses grid-based org selector similar to template gallery
//

import SwiftUI
import Combine
import ConvexMobile

// MARK: - Org with Print Count Model

struct OrgWithPrintCount: Identifiable, Codable, Hashable {
    let _id: String
    let name: String
    let slug: String
    let logoUrl: String?
    let country: String?
    let readyToPrintCount: Int
    
    var id: String { _id }
}

// MARK: - Profile Print View

struct ProfilePrintView: View {
    @StateObject private var convexService = ConvexService.shared
    
    // View state
    @State private var orgsWithCounts: [OrgWithPrintCount] = []
    @State private var selectedOrg: OrgWithPrintCount?
    @State private var registrations: [PrintableRegistration] = []
    @State private var selectedRegistration: PrintableRegistration?
    
    // Loading states
    @State private var isLoadingOrgs = false
    @State private var isLoadingProfiles = false
    @State private var isPrinting = false
    
    // Alerts
    @State private var showPrintSuccess = false
    @State private var printError: String?
    
    // Subscriptions
    @State private var orgsSubscription: AnyCancellable?
    @State private var profilesSubscription: AnyCancellable?
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            header
            
            Divider()
            
            // Content
            if convexService.isLoading || isLoadingOrgs {
                loadingView("Connexion à Convex...")
            } else if convexService.currentUser == nil {
                notConnectedView
            } else if selectedOrg != nil {
                // Show profiles for selected org
                profilesContent
            } else {
                // Show org grid picker
                orgsGridContent
            }
        }
        .background(Color(.windowBackgroundColor))
        .task {
            await convexService.loadCurrentUser()
            subscribeToOrgs()
        }
        .onChange(of: selectedOrg) { _, newOrg in
            if let org = newOrg {
                subscribeToProfiles(for: org)
            }
        }
        .alert("Impression réussie", isPresented: $showPrintSuccess) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("La carte a été imprimée avec succès.")
        }
        .alert("Erreur d'impression", isPresented: .init(
            get: { printError != nil },
            set: { if !$0 { printError = nil } }
        )) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(printError ?? "")
        }
    }
    
    // MARK: - Header
    
    private var header: some View {
        HStack {
            // Back button when org is selected
            if selectedOrg != nil {
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        selectedOrg = nil
                        registrations = []
                        selectedRegistration = nil
                        profilesSubscription?.cancel()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("Organismes")
                    }
                }
                .buttonStyle(.plain)
                .foregroundStyle(.blue)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                if let org = selectedOrg {
                    Text(org.name)
                        .font(.title.weight(.bold))
                    Text("\(registrations.count) profil(s) à imprimer")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Impression de cartes")
                        .font(.title.weight(.bold))
                    
                    if let user = convexService.currentUser {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(.green)
                                .frame(width: 8, height: 8)
                            Text(user.displayName)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            if user.isSuperadmin == true {
                                Text("SUPERADMIN")
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.orange)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }
            
            Spacer()
            
            // Refresh button
            Button {
                if let org = selectedOrg {
                    subscribeToProfiles(for: org)
                } else {
                    subscribeToOrgs()
                }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
        .padding()
        .animation(.spring(response: 0.3), value: selectedOrg)
    }
    
    // MARK: - Orgs Grid Content
    
    private var orgsGridContent: some View {
        Group {
            if orgsWithCounts.isEmpty {
                noOrgsView
            } else {
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 280, maximum: 350), spacing: 20)
                    ], spacing: 20) {
                        ForEach(orgsWithCounts) { org in
                            OrgCard(org: org)
                                .onTapGesture {
                                    withAnimation(.spring(response: 0.3)) {
                                        selectedOrg = org
                                    }
                                }
                        }
                    }
                    .padding()
                }
                .background(Color(.windowBackgroundColor))
            }
        }
    }
    
    // MARK: - Profiles Content
    
    private var profilesContent: some View {
        Group {
            if isLoadingProfiles {
                loadingView("Chargement des profils...")
            } else if registrations.isEmpty {
                emptyProfilesView
            } else {
                HStack(spacing: 0) {
                    // Profiles list
                    profilesList
                        .frame(minWidth: 350, maxWidth: 400)
                    
                    Divider()
                    
                    // Detail panel
                    if let registration = selectedRegistration {
                        profileDetail(registration)
                    } else {
                        noSelectionView
                    }
                }
            }
        }
    }
    
    // MARK: - Profiles List
    
    private var profilesList: some View {
        List(registrations, selection: Binding(
            get: { selectedRegistration?._id },
            set: { newId in selectedRegistration = registrations.first { $0._id == newId } }
        )) { registration in
            ProfileRow(registration: registration)
                .tag(registration._id)
        }
        .listStyle(.inset)
    }
    
    // MARK: - Profile Detail
    
    private func profileDetail(_ registration: PrintableRegistration) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(registration.profile?.displayName ?? "Inconnu")
                        .font(.title.weight(.bold))
                    
                    if let cardNumber = registration.cardNumber {
                        Label(cardNumber, systemImage: "creditcard")
                            .font(.headline)
                            .foregroundStyle(.blue)
                    }
                }
                
                Divider()
                
                // Profile info
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 16) {
                    DetailField(label: "Date de naissance", value: registration.profile?.birthDateFormatted ?? "-")
                    DetailField(label: "Lieu de naissance", value: registration.profile?.identity?.birthPlace ?? "-")
                    DetailField(label: "Genre", value: genderLabel(registration.profile?.identity?.gender))
                    DetailField(label: "Pays de résidence", value: registration.profile?.countryOfResidence ?? "-")
                }
                
                // Passport info
                if let passport = registration.profile?.passportInfo {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Passeport")
                            .font(.headline)
                        
                        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 16) {
                            DetailField(label: "Numéro", value: passport.number ?? "-")
                            DetailField(label: "Pays émetteur", value: passport.issuingCountry ?? "-")
                        }
                    }
                }
                
                Divider()
                
                // Card info
                VStack(alignment: .leading, spacing: 12) {
                    Text("Carte consulaire")
                        .font(.headline)
                    
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 16) {
                        DetailField(label: "Numéro de carte", value: registration.cardNumber ?? "-")
                        DetailField(label: "Durée", value: durationLabel(registration.duration))
                        DetailField(
                            label: "Émise le",
                            value: registration.cardIssuedDate?.formatted(date: .abbreviated, time: .omitted) ?? "-"
                        )
                        DetailField(
                            label: "Expire le",
                            value: registration.cardExpiresDate?.formatted(date: .abbreviated, time: .omitted) ?? "-"
                        )
                    }
                }
                
                Spacer()
                
                // Print action
                HStack {
                    Button {
                        Task {
                            await printCard(registration)
                        }
                    } label: {
                        if isPrinting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Label("Imprimer la carte", systemImage: "printer")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(isPrinting)
                }
            }
            .padding()
        }
    }
    
    // MARK: - State Views
    
    private func loadingView(_ message: String) -> some View {
        VStack(spacing: 16) {
            ProgressView()
            Text(message)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var notConnectedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle.badge.xmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Non connecté à Convex")
                .font(.headline)
            Text("Connectez-vous dans les paramètres pour accéder aux profils")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            Button {
                Task {
                    await convexService.loadCurrentUser()
                    subscribeToOrgs()
                }
            } label: {
                Label("Réessayer", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var noOrgsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "building.2")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Aucun organisme accessible")
                .font(.headline)
            Text("Vous n'êtes membre d'aucun organisme")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyProfilesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Aucun profil à imprimer")
                .font(.headline)
            Text("Tous les profils de cet organisme ont déjà été imprimés")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var noSelectionView: some View {
        VStack(spacing: 16) {
            Image(systemName: "hand.point.up.left")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Sélectionnez un profil")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Subscriptions
    
    private func subscribeToOrgs() {
        isLoadingOrgs = true
        orgsSubscription?.cancel()
        
        orgsSubscription = convex.subscribe(
            to: "functions/memberships:listMyOrgsWithPrintCounts",
            yielding: [OrgWithPrintCount].self
        )
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { completion in
                isLoadingOrgs = false
                if case .failure(let error) = completion {
                    print("[ProfilePrintView] Error loading orgs: \(error)")
                    orgsWithCounts = []
                }
            },
            receiveValue: { orgs in
                isLoadingOrgs = false
                orgsWithCounts = orgs
                print("[ProfilePrintView] Received \(orgs.count) orgs")
            }
        )
    }
    
    private func subscribeToProfiles(for org: OrgWithPrintCount) {
        isLoadingProfiles = true
        selectedRegistration = nil
        
        // Cancel previous subscription
        profilesSubscription?.cancel()
        
        // Create new subscription
        profilesSubscription = convexService.subscribeToReadyForPrint(orgId: org._id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    isLoadingProfiles = false
                    if case .failure(let error) = completion {
                        print("[ProfilePrintView] Error loading profiles: \(error)")
                        registrations = []
                    }
                },
                receiveValue: { newRegistrations in
                    isLoadingProfiles = false
                    registrations = newRegistrations
                }
            )
    }
    
    // MARK: - Actions
    
    // MARK: - Actions
    
    @State private var cardRenderer = CardRenderer()
    private let printerService = PrinterService.shared
    
    private func printCard(_ registration: PrintableRegistration) async {
        isPrinting = true
        printError = nil
        
        do {
            // 1. Get Template
            let template = PredefinedTemplates.carteConsulaire.template
            
            // 2. Prepare Data
            var data: [String: String] = [:]
            
            // Profile Info
            if let profile = registration.profile {
                data["firstName"] = profile.identity?.firstName ?? ""
                data["lastName"] = profile.identity?.lastName ?? ""
                data["fullName"] = profile.displayName
                
                // Birth Details
                let birthDate = profile.birthDateFormatted ?? ""
                let birthPlace = profile.identity?.birthPlace ?? ""
                data["birthDate"] = birthDate
                data["birthPlace"] = birthPlace
                data["birthDetails"] = "\(birthDate) à \(birthPlace)"
                
                // Gender
                let gender = profile.identity?.gender ?? ""
                data["gender"] = gender == "male" ? "M" : (gender == "female" ? "F" : "")
                
                // Residence
                data["residenceCountry"] = profile.countryOfResidence ?? ""
                
                // Passport
                data["passportNumber"] = profile.passportInfo?.number ?? ""
                
                // TODO: Add avatar URL support to ConvexProfile or fetch separately
                // if let avatarUrl = profile.avatarUrl {
                //    data["photo"] = avatarUrl
                // }
            }
            
            // Card Info
            data["cardNumber"] = registration.cardNumber ?? ""
            
            let issueDate = registration.cardIssuedDate?.formatted(date: .numeric, time: .omitted) ?? ""
            let expiryDate = registration.cardExpiresDate?.formatted(date: .numeric, time: .omitted) ?? ""
            data["issueDate"] = issueDate
            data["expiryDate"] = expiryDate
            data["validityDates"] = "Du \(issueDate) au \(expiryDate)"
            
            // QR Data
            data["qrData"] = registration.cardNumber ?? ""
            
            // 3. Render Image
            print("[ProfilePrintView] Rendering card for \(data["fullName"] ?? "Unknown")...")
            let frontImage = try await cardRenderer.render(
                template: template,
                data: data,
                side: .front
            )
            
            // 4. Print
            print("[ProfilePrintView] Sending to printer...")
            try await printerService.printCard(
                frontImage: frontImage,
                outputTray: .standard,
                duplexType: .colorColor // Default to color/color, ignored if no back image
            )
            
            // 5. Mark as Printed
            print("[ProfilePrintView] Marking as printed in Convex...")
            try await convexService.markAsPrinted(registrationId: registration._id)
            
            // Success
            showPrintSuccess = true
            selectedRegistration = nil
            
        } catch {
            print("[ProfilePrintView] Print failed: \(error)")
            printError = error.localizedDescription
        }
        
        isPrinting = false
    }
    
    // MARK: - Helpers
    
    private func genderLabel(_ gender: String?) -> String {
        switch gender {
        case "male": return "Homme"
        case "female": return "Femme"
        default: return "-"
        }
    }
    
    private func durationLabel(_ duration: String?) -> String {
        switch duration {
        case "permanent": return "Permanente"
        case "temporary": return "Temporaire"
        default: return "-"
        }
    }
}

// MARK: - Org Card

struct OrgCard: View {
    let org: OrgWithPrintCount
    
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Icon area
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        LinearGradient(
                            colors: [.blue, .blue.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .aspectRatio(1.6, contentMode: .fit)
                
                VStack(spacing: 8) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.white)
                    
                    if let country = org.country {
                        Text(country)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.accentColor, lineWidth: isHovered ? 3 : 0)
            )
            .shadow(color: .black.opacity(0.15), radius: isHovered ? 10 : 4)
            
            // Info
            VStack(alignment: .leading, spacing: 8) {
                Text(org.name)
                    .font(.headline)
                    .lineLimit(2)
                
                // Print count badge
                HStack(spacing: 6) {
                    Image(systemName: "printer")
                        .font(.caption)
                    
                    if org.readyToPrintCount > 0 {
                        Text("\(org.readyToPrintCount) à imprimer")
                            .font(.caption.weight(.medium))
                    } else {
                        Text("À jour")
                            .font(.caption.weight(.medium))
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    org.readyToPrintCount > 0
                        ? Color.orange.opacity(0.15)
                        : Color.green.opacity(0.15)
                )
                .foregroundStyle(
                    org.readyToPrintCount > 0
                        ? .orange
                        : .green
                )
                .clipShape(Capsule())
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onHover { isHovered = $0 }
        .scaleEffect(isHovered ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.15), value: isHovered)
    }
}

// MARK: - Supporting Views

struct ProfileRow: View {
    let registration: PrintableRegistration
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar placeholder
            Circle()
                .fill(.blue.opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay {
                    Text(initials)
                        .font(.headline)
                        .foregroundStyle(.blue)
                }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(registration.profile?.displayName ?? "Inconnu")
                    .font(.headline)
                
                if let cardNumber = registration.cardNumber {
                    Text(cardNumber)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            // Duration badge
            if let duration = registration.duration {
                Text(duration == "permanent" ? "PERM" : "TEMP")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(duration == "permanent" ? .green.opacity(0.2) : .orange.opacity(0.2))
                    .foregroundStyle(duration == "permanent" ? .green : .orange)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }
    
    private var initials: String {
        let first = registration.profile?.identity?.firstName?.prefix(1) ?? ""
        let last = registration.profile?.identity?.lastName?.prefix(1) ?? ""
        return "\(first)\(last)".uppercased()
    }
}

struct DetailField: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline)
        }
    }
}

#Preview {
    ProfilePrintView()
}
