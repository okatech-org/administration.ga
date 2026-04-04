import Foundation
import AppKit

// MARK: - Predefined Templates

/// Library of professional card templates ready to use
enum PredefinedTemplates {
    
    // MARK: - Template Categories
    
    enum Category: String, CaseIterable, Identifiable {
        case corporate = "Corporate"
        case education = "Éducation"
        case events = "Événements"
        case membership = "Adhésion"
        
        var id: String { rawValue }
        
        var icon: String {
            switch self {
            case .corporate: return "building.2"
            case .education: return "graduationcap"
            case .events: return "ticket"
            case .membership: return "person.crop.rectangle.stack"
            }
        }
    }
    
    // MARK: - Template Info
    
    struct TemplateInfo: Identifiable {
        let id: String
        let name: String
        let description: String
        let category: Category
        let thumbnail: String // SF Symbol for now
        let template: CardTemplate
    }
    
    // MARK: - All Templates
    
    static var all: [TemplateInfo] {
        [
            badgeEmploye,
            carteMembre,
            carteEtudiant,
            carteVisiteur,
            badgeEvenement
        ]
    }
    
    static func templates(for category: Category) -> [TemplateInfo] {
        all.filter { $0.category == category }
    }
    
    // MARK: - Badge Employé
    
    static var badgeEmploye: TemplateInfo {
        var template = CardTemplate(name: "Badge Employé")
        template.backgroundColor = "#1E3A5F"  // Dark blue
        
        // Logo placeholder (top center)
        var logo = CardElement(type: .image, x: 408, y: 30, width: 200, height: 80)
        logo.isDynamicField = true
        logo.fieldKey = "logo"
        template.frontElements.append(logo)
        
        // Photo (left side)
        var photo = CardElement(type: .image, x: 50, y: 150, width: 180, height: 220)
        photo.isDynamicField = true
        photo.fieldKey = "photo"
        photo.cornerRadius = 8
        template.frontElements.append(photo)
        
        // Full name
        var name = CardElement(type: .text, x: 260, y: 180, width: 700, height: 50)
        name.textContent = "{firstName} {lastName}"
        name.isDynamicField = true
        name.fieldKey = "fullName"
        name.fontSize = 32
        name.isBold = true
        name.textColor = "#FFFFFF"
        template.frontElements.append(name)
        
        // Job title
        var jobTitle = CardElement(type: .text, x: 260, y: 240, width: 700, height: 35)
        jobTitle.textContent = "{jobTitle}"
        jobTitle.isDynamicField = true
        jobTitle.fieldKey = "jobTitle"
        jobTitle.fontSize = 22
        jobTitle.textColor = "#88B4E0"
        template.frontElements.append(jobTitle)
        
        // Department
        var dept = CardElement(type: .text, x: 260, y: 285, width: 700, height: 30)
        dept.textContent = "{department}"
        dept.isDynamicField = true
        dept.fieldKey = "department"
        dept.fontSize = 18
        dept.textColor = "#AAAAAA"
        template.frontElements.append(dept)
        
        // Employee ID
        var empId = CardElement(type: .text, x: 260, y: 340, width: 400, height: 25)
        empId.textContent = "ID: {employeeId}"
        empId.isDynamicField = true
        empId.fieldKey = "employeeId"
        empId.fontSize = 14
        empId.textColor = "#666666"
        template.frontElements.append(empId)
        
        // QR Code (bottom right)
        var qr = CardElement(type: .qrCode, x: 850, y: 480, width: 130, height: 130)
        qr.isDynamicField = true
        qr.fieldKey = "qrData"
        qr.codeContent = "{employeeId}"
        template.frontElements.append(qr)
        
        // Bottom accent bar
        var bar = CardElement(type: .rectangle, x: 0, y: 620, width: 1016, height: 28)
        bar.fillColor = "#FFB800"
        template.frontElements.append(bar)
        
        return TemplateInfo(
            id: "badge_employe",
            name: "Badge Employé",
            description: "Badge professionnel avec photo, nom, poste et QR code",
            category: .corporate,
            thumbnail: "person.badge.key",
            template: template
        )
    }
    
    // MARK: - Carte Membre
    
    static var carteMembre: TemplateInfo {
        var template = CardTemplate(name: "Carte Membre")
        template.backgroundColor = "#2D2D2D"  // Dark gray
        
        // Logo (top left)
        var logo = CardElement(type: .image, x: 50, y: 40, width: 180, height: 70)
        logo.isDynamicField = true
        logo.fieldKey = "logo"
        template.frontElements.append(logo)
        
        // Member text
        var memberLabel = CardElement(type: .text, x: 750, y: 50, width: 220, height: 40)
        memberLabel.textContent = "MEMBRE"
        memberLabel.fontSize = 24
        memberLabel.isBold = true
        memberLabel.textColor = "#FFD700"
        memberLabel.textAlignment = .trailing
        template.frontElements.append(memberLabel)
        
        // Member name
        var name = CardElement(type: .text, x: 50, y: 200, width: 600, height: 55)
        name.textContent = "{firstName} {lastName}"
        name.isDynamicField = true
        name.fieldKey = "fullName"
        name.fontSize = 36
        name.isBold = true
        name.textColor = "#FFFFFF"
        template.frontElements.append(name)
        
        // Member number
        var number = CardElement(type: .text, x: 50, y: 280, width: 400, height: 35)
        number.textContent = "N° {memberNumber}"
        number.isDynamicField = true
        number.fieldKey = "memberNumber"
        number.fontSize = 20
        number.textColor = "#AAAAAA"
        template.frontElements.append(number)
        
        // Valid until
        var validUntil = CardElement(type: .text, x: 50, y: 340, width: 400, height: 30)
        validUntil.textContent = "Valide jusqu'au: {expiryDate}"
        validUntil.isDynamicField = true
        validUntil.fieldKey = "expiryDate"
        validUntil.fontSize = 16
        validUntil.textColor = "#888888"
        template.frontElements.append(validUntil)
        
        // QR Code (right side)
        var qr = CardElement(type: .qrCode, x: 780, y: 180, width: 180, height: 180)
        qr.isDynamicField = true
        qr.fieldKey = "qrData"
        qr.codeContent = "{memberNumber}"
        template.frontElements.append(qr)
        
        // Gold accent line
        var line = CardElement(type: .rectangle, x: 50, y: 420, width: 916, height: 3)
        line.fillColor = "#FFD700"
        template.frontElements.append(line)
        
        // Barcode (bottom)
        var barcode = CardElement(type: .barcode, x: 200, y: 480, width: 616, height: 100)
        barcode.isDynamicField = true
        barcode.fieldKey = "barcodeData"
        barcode.codeContent = "{memberNumber}"
        template.frontElements.append(barcode)
        
        return TemplateInfo(
            id: "carte_membre",
            name: "Carte Membre",
            description: "Carte d'adhésion avec numéro membre, QR et code-barres",
            category: .membership,
            thumbnail: "creditcard",
            template: template
        )
    }
    
    // MARK: - Carte Étudiant
    
    static var carteEtudiant: TemplateInfo {
        var template = CardTemplate(name: "Carte Étudiant")
        template.backgroundColor = "#003366"  // University blue
        
        // University logo
        var logo = CardElement(type: .image, x: 50, y: 30, width: 150, height: 60)
        logo.isDynamicField = true
        logo.fieldKey = "universityLogo"
        template.frontElements.append(logo)
        
        // University name
        var uniName = CardElement(type: .text, x: 220, y: 40, width: 600, height: 40)
        uniName.textContent = "{universityName}"
        uniName.isDynamicField = true
        uniName.fieldKey = "universityName"
        uniName.fontSize = 20
        uniName.isBold = true
        uniName.textColor = "#FFFFFF"
        template.frontElements.append(uniName)
        
        // Student label
        var label = CardElement(type: .text, x: 860, y: 30, width: 120, height: 30)
        label.textContent = "ÉTUDIANT"
        label.fontSize = 12
        label.isBold = true
        label.textColor = "#FFD700"
        template.frontElements.append(label)
        
        // Photo
        var photo = CardElement(type: .image, x: 50, y: 120, width: 160, height: 200)
        photo.isDynamicField = true
        photo.fieldKey = "photo"
        photo.cornerRadius = 6
        template.frontElements.append(photo)
        
        // Student name
        var name = CardElement(type: .text, x: 240, y: 140, width: 500, height: 45)
        name.textContent = "{firstName} {lastName}"
        name.isDynamicField = true
        name.fieldKey = "fullName"
        name.fontSize = 28
        name.isBold = true
        name.textColor = "#FFFFFF"
        template.frontElements.append(name)
        
        // Student ID
        var studentId = CardElement(type: .text, x: 240, y: 195, width: 400, height: 30)
        studentId.textContent = "N° Étudiant: {studentId}"
        studentId.isDynamicField = true
        studentId.fieldKey = "studentId"
        studentId.fontSize = 16
        studentId.textColor = "#88B4E0"
        template.frontElements.append(studentId)
        
        // Program
        var program = CardElement(type: .text, x: 240, y: 235, width: 500, height: 30)
        program.textContent = "{program}"
        program.isDynamicField = true
        program.fieldKey = "program"
        program.fontSize = 16
        program.textColor = "#AAAAAA"
        template.frontElements.append(program)
        
        // Year
        var year = CardElement(type: .text, x: 240, y: 275, width: 300, height: 25)
        year.textContent = "Année: {academicYear}"
        year.isDynamicField = true
        year.fieldKey = "academicYear"
        year.fontSize = 14
        year.textColor = "#888888"
        template.frontElements.append(year)
        
        // QR Code
        var qr = CardElement(type: .qrCode, x: 820, y: 140, width: 150, height: 150)
        qr.isDynamicField = true
        qr.fieldKey = "qrData"
        qr.codeContent = "{studentId}"
        template.frontElements.append(qr)
        
        // Barcode bottom
        var barcode = CardElement(type: .barcode, x: 50, y: 500, width: 500, height: 80)
        barcode.isDynamicField = true
        barcode.fieldKey = "studentId"
        template.frontElements.append(barcode)
        
        // Valid until
        var valid = CardElement(type: .text, x: 600, y: 530, width: 370, height: 25)
        valid.textContent = "Valide: {validFrom} - {validUntil}"
        valid.isDynamicField = true
        valid.fieldKey = "validity"
        valid.fontSize = 12
        valid.textColor = "#666666"
        valid.textAlignment = .trailing
        template.frontElements.append(valid)
        
        return TemplateInfo(
            id: "carte_etudiant",
            name: "Carte Étudiant",
            description: "Carte universitaire avec photo, filière et code-barres",
            category: .education,
            thumbnail: "graduationcap.fill",
            template: template
        )
    }
    
    // MARK: - Carte Visiteur
    
    static var carteVisiteur: TemplateInfo {
        var template = CardTemplate(name: "Carte Visiteur")
        template.backgroundColor = "#FFFFFF"  // White
        
        // VISITEUR banner (top)
        var banner = CardElement(type: .rectangle, x: 0, y: 0, width: 1016, height: 100)
        banner.fillColor = "#E53935"  // Red
        template.frontElements.append(banner)
        
        var visitorLabel = CardElement(type: .text, x: 0, y: 30, width: 1016, height: 50)
        visitorLabel.textContent = "VISITEUR"
        visitorLabel.fontSize = 36
        visitorLabel.isBold = true
        visitorLabel.textColor = "#FFFFFF"
        visitorLabel.textAlignment = .center
        template.frontElements.append(visitorLabel)
        
        // Company logo (host)
        var logo = CardElement(type: .image, x: 750, y: 130, width: 220, height: 80)
        logo.isDynamicField = true
        logo.fieldKey = "hostLogo"
        template.frontElements.append(logo)
        
        // Visitor name
        var name = CardElement(type: .text, x: 50, y: 150, width: 650, height: 55)
        name.textContent = "{visitorName}"
        name.isDynamicField = true
        name.fieldKey = "visitorName"
        name.fontSize = 36
        name.isBold = true
        name.textColor = "#333333"
        template.frontElements.append(name)
        
        // Visitor company
        var company = CardElement(type: .text, x: 50, y: 215, width: 600, height: 35)
        company.textContent = "{visitorCompany}"
        company.isDynamicField = true
        company.fieldKey = "visitorCompany"
        company.fontSize = 22
        company.textColor = "#666666"
        template.frontElements.append(company)
        
        // Visiting label
        var visitingLabel = CardElement(type: .text, x: 50, y: 290, width: 200, height: 25)
        visitingLabel.textContent = "Rendez-vous avec:"
        visitingLabel.fontSize = 14
        visitingLabel.textColor = "#999999"
        template.frontElements.append(visitingLabel)
        
        // Host name
        var host = CardElement(type: .text, x: 50, y: 320, width: 500, height: 35)
        host.textContent = "{hostName}"
        host.isDynamicField = true
        host.fieldKey = "hostName"
        host.fontSize = 24
        host.isBold = true
        host.textColor = "#333333"
        template.frontElements.append(host)
        
        // Date
        var date = CardElement(type: .text, x: 50, y: 400, width: 300, height: 30)
        date.textContent = "{visitDate}"
        date.isDynamicField = true
        date.fieldKey = "visitDate"
        date.fontSize = 20
        date.isBold = false
        date.textColor = "#333333"
        template.frontElements.append(date)
        
        // QR Code for access
        var qr = CardElement(type: .qrCode, x: 800, y: 350, width: 180, height: 180)
        qr.isDynamicField = true
        qr.fieldKey = "accessCode"
        qr.codeContent = "{accessCode}"
        template.frontElements.append(qr)
        
        // Warning footer
        var footer = CardElement(type: .rectangle, x: 0, y: 580, width: 1016, height: 68)
        footer.fillColor = "#FFF3CD"  // Light yellow
        template.frontElements.append(footer)
        
        var warning = CardElement(type: .text, x: 50, y: 598, width: 916, height: 25)
        warning.textContent = "⚠️ Ce badge doit être visible en permanence et rendu à la sortie"
        warning.fontSize = 14
        warning.textColor = "#856404"
        warning.textAlignment = .center
        template.frontElements.append(warning)
        
        return TemplateInfo(
            id: "carte_visiteur",
            name: "Carte Visiteur",
            description: "Badge visiteur temporaire avec hôte et date",
            category: .corporate,
            thumbnail: "figure.wave",
            template: template
        )
    }
    
    // MARK: - Badge Événement
    
    static var badgeEvenement: TemplateInfo {
        var template = CardTemplate(name: "Badge Événement")
        template.backgroundColor = "#6B21A8"  // Purple
        
        // Event logo/banner
        var eventLogo = CardElement(type: .image, x: 308, y: 30, width: 400, height: 100)
        eventLogo.isDynamicField = true
        eventLogo.fieldKey = "eventLogo"
        template.frontElements.append(eventLogo)
        
        // Attendee type badge
        var typeBadge = CardElement(type: .rectangle, x: 350, y: 160, width: 316, height: 45)
        typeBadge.fillColor = "#FFD700"
        typeBadge.cornerRadius = 22
        template.frontElements.append(typeBadge)
        
        var typeLabel = CardElement(type: .text, x: 350, y: 167, width: 316, height: 35)
        typeLabel.textContent = "{attendeeType}"
        typeLabel.isDynamicField = true
        typeLabel.fieldKey = "attendeeType"
        typeLabel.fontSize = 18
        typeLabel.isBold = true
        typeLabel.textColor = "#000000"
        typeLabel.textAlignment = .center
        template.frontElements.append(typeLabel)
        
        // Attendee name (large, centered)
        var name = CardElement(type: .text, x: 50, y: 240, width: 916, height: 70)
        name.textContent = "{firstName} {lastName}"
        name.isDynamicField = true
        name.fieldKey = "fullName"
        name.fontSize = 42
        name.isBold = true
        name.textColor = "#FFFFFF"
        name.textAlignment = .center
        template.frontElements.append(name)
        
        // Company/Organization
        var org = CardElement(type: .text, x: 50, y: 320, width: 916, height: 35)
        org.textContent = "{organization}"
        org.isDynamicField = true
        org.fieldKey = "organization"
        org.fontSize = 22
        org.textColor = "#D8B4FE"
        org.textAlignment = .center
        template.frontElements.append(org)
        
        // Role/Title
        var role = CardElement(type: .text, x: 50, y: 365, width: 916, height: 30)
        role.textContent = "{role}"
        role.isDynamicField = true
        role.fieldKey = "role"
        role.fontSize = 18
        role.textColor = "#A78BFA"
        role.textAlignment = .center
        template.frontElements.append(role)
        
        // QR Code (centered bottom)
        var qr = CardElement(type: .qrCode, x: 408, y: 420, width: 200, height: 200)
        qr.isDynamicField = true
        qr.fieldKey = "ticketId"
        qr.codeContent = "{ticketId}"
        template.frontElements.append(qr)
        
        return TemplateInfo(
            id: "badge_evenement",
            name: "Badge Événement",
            description: "Badge conférence avec type participant et QR code",
            category: .events,
            thumbnail: "ticket.fill",
            template: template
        )
    }
    // MARK: - Carte Consulaire
    
    static var carteConsulaire: TemplateInfo {
        var template = CardTemplate(name: "Carte Consulaire")
        template.backgroundColor = "#FFFFFF"
        
        // Header Background (Green for Gabon)
        var header = CardElement(type: .rectangle, x: 0, y: 0, width: 1016, height: 120)
        header.fillColor = "#009E60" // Gabon Green
        template.frontElements.append(header)
        
        // Header Text
        var title = CardElement(type: .text, x: 0, y: 35, width: 1016, height: 50)
        title.textContent = "RÉPUBLIQUE GABONAISE"
        title.fontSize = 32
        title.isBold = true
        title.textColor = "#FFFFFF"
        title.textAlignment = .center
        template.frontElements.append(title)
        
        // Subtitle
        var subtitle = CardElement(type: .text, x: 0, y: 80, width: 1016, height: 30)
        subtitle.textContent = "CARTE D'IMMATRICULATION CONSULAIRE"
        subtitle.fontSize = 18
        subtitle.textColor = "#FFFFFF"
        subtitle.textAlignment = .center
        template.frontElements.append(subtitle)
        
        // Photo Placeholder (Left)
        var photo = CardElement(type: .image, x: 50, y: 150, width: 220, height: 280)
        photo.isDynamicField = true
        photo.fieldKey = "photo"
        photo.strokeColor = "#000000"
        photo.strokeWidth = 2
        template.frontElements.append(photo)
        
        // Data Labels & Values
        let startX: CGFloat = 300
        let labelX: CGFloat = 300
        let valueX: CGFloat = 500
        let startY: CGFloat = 160
        let lineHeight: CGFloat = 45
        
        // 1. Name
        var nameLabel = CardElement(type: .text, x: labelX, y: startY, width: 180, height: 30)
        nameLabel.textContent = "Nom / Prénoms:"
        nameLabel.fontSize = 14
        nameLabel.textColor = "#666666"
        template.frontElements.append(nameLabel)
        
        var nameValue = CardElement(type: .text, x: valueX, y: startY, width: 450, height: 40)
        nameValue.textContent = "{fullName}"
        nameValue.isDynamicField = true
        nameValue.fieldKey = "fullName"
        nameValue.fontSize = 20
        nameValue.isBold = true
        template.frontElements.append(nameValue)
        
        // 2. Date of Birth
        var dobLabel = CardElement(type: .text, x: labelX, y: startY + lineHeight, width: 180, height: 30)
        dobLabel.textContent = "Né(e) le:"
        dobLabel.fontSize = 14
        dobLabel.textColor = "#666666"
        template.frontElements.append(dobLabel)
        
        var dobValue = CardElement(type: .text, x: valueX, y: startY + lineHeight, width: 450, height: 30)
        dobValue.textContent = "{birthDate} à {birthPlace}"
        dobValue.isDynamicField = true
        dobValue.fieldKey = "birthDetails"
        dobValue.fontSize = 18
        template.frontElements.append(dobValue)
        
        // 3. Gender & Nationality
        var genderLabel = CardElement(type: .text, x: labelX, y: startY + lineHeight * 2, width: 180, height: 30)
        genderLabel.textContent = "Sexe:"
        genderLabel.fontSize = 14
        genderLabel.textColor = "#666666"
        template.frontElements.append(genderLabel)
        
        var genderValue = CardElement(type: .text, x: valueX, y: startY + lineHeight * 2, width: 450, height: 30)
        genderValue.textContent = "{gender}"
        genderValue.isDynamicField = true
        genderValue.fieldKey = "gender"
        genderValue.fontSize = 18
        template.frontElements.append(genderValue)
        
        // 4. Address/Country
        var addrLabel = CardElement(type: .text, x: labelX, y: startY + lineHeight * 3, width: 180, height: 30)
        addrLabel.textContent = "Résidence:"
        addrLabel.fontSize = 14
        addrLabel.textColor = "#666666"
        template.frontElements.append(addrLabel)
        
        var addrValue = CardElement(type: .text, x: valueX, y: startY + lineHeight * 3, width: 450, height: 30)
        addrValue.textContent = "{residenceCountry}"
        addrValue.isDynamicField = true
        addrValue.fieldKey = "residenceCountry"
        addrValue.fontSize = 18
        template.frontElements.append(addrValue)
        
        // 5. Passport
        var pptLabel = CardElement(type: .text, x: labelX, y: startY + lineHeight * 4, width: 180, height: 30)
        pptLabel.textContent = "Passeport:"
        pptLabel.fontSize = 14
        pptLabel.textColor = "#666666"
        template.frontElements.append(pptLabel)
        
        var pptValue = CardElement(type: .text, x: valueX, y: startY + lineHeight * 4, width: 450, height: 30)
        pptValue.textContent = "{passportNumber}"
        pptValue.isDynamicField = true
        pptValue.fieldKey = "passportNumber"
        pptValue.fontSize = 18
        template.frontElements.append(pptValue)
        
        // Footer (Blue for contrast)
        var footer = CardElement(type: .rectangle, x: 0, y: 560, width: 1016, height: 88)
        footer.fillColor = "#F9FAFB"
        template.frontElements.append(footer)
        
        // Card Number (Bottom Left)
        var numLabel = CardElement(type: .text, x: 50, y: 575, width: 200, height: 20)
        numLabel.textContent = "N° CARTE"
        numLabel.fontSize = 10
        numLabel.textColor = "#999999"
        template.frontElements.append(numLabel)
        
        var numValue = CardElement(type: .text, x: 50, y: 590, width: 300, height: 35)
        numValue.textContent = "{cardNumber}"
        numValue.isDynamicField = true
        numValue.fieldKey = "cardNumber"
        numValue.fontSize = 24
        numValue.isBold = true
        numValue.textColor = "#333333"
        template.frontElements.append(numValue)
        
        // Dates (Bottom Center)
        var dateLabel = CardElement(type: .text, x: 400, y: 585, width: 300, height: 40)
        dateLabel.textContent = "Du {issueDate} au {expiryDate}"
        dateLabel.isDynamicField = true
        dateLabel.fieldKey = "validityDates"
        dateLabel.fontSize = 14
        dateLabel.textAlignment = .center
        template.frontElements.append(dateLabel)
        
        // QR Code (Bottom Right)
        var qr = CardElement(type: .qrCode, x: 880, y: 540, width: 100, height: 100)
        qr.isDynamicField = true
        qr.fieldKey = "qrData"
        qr.codeContent = "{cardNumber}"
        template.frontElements.append(qr)
        
        return TemplateInfo(
            id: "carte_consulaire",
            name: "Carte Consulaire",
            description: "Carte d'immatriculation avec photo et détails biographiques",
            category: .corporate,
            thumbnail: "person.crop.rectangle.fill",
            template: template
        )
    }
}
