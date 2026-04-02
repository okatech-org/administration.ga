export enum ServiceCategory {
  Identity = "identity",
  Passport = "passport",
  CivilStatus = "civil_status",
  Visa = "visa",
  Certification = "certification",
  Transcript = "transcript",
  Registration = "registration",
  Notification = "notification",
  Assistance = "assistance",
  TravelDocument = "travel_document",
  Declaration = "declaration",
  Other = "other",
}

export enum EmergencyContactType {
  Resident = "resident",
  HomeLand = "home_land",
}

export enum ServiceStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
}

/**
 * Request statuses - Complete workflow from draft to completion
 * Extended from 5 to 12 statuses for granular tracking
 */
export enum RequestStatus {
  // === Création ===
  Draft = "draft", // Brouillon (non soumis)
  Submitted = "submitted", // Soumise officiellement

  // === Traitement ===
  Pending = "pending", // En attente de prise en charge
  UnderReview = "under_review", // En cours d'examen par agent / traitement
  InProduction = "in_production", // En production (création document)

  // === Finalisation ===
  Validated = "validated", // Validée par agent
  Rejected = "rejected", // Rejetée
  AppointmentScheduled = "appointment_scheduled", // RDV planifié
  ReadyForPickup = "ready_for_pickup", // Prête à retirer

  // === Terminé ===
  Completed = "completed", // Terminée (retirée/livrée)
  Cancelled = "cancelled", // Annulée
}

export enum RequestPriority {
  Normal = "normal",
  Urgent = "urgent",
  Critical = "critical",
}

export enum UserStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
}

export enum TicketStatus {
  Open = "open",
  InProgress = "in_progress",
  WaitingForUser = "waiting_for_user",
  Resolved = "resolved",
  Closed = "closed",
}

export enum TicketPriority {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum TicketCategory {
  Technical = "technical",
  Service = "service",
  Information = "information",
  Feedback = "feedback",
  Other = "other",
}

/**
 * Platform-level roles (inherent to user, not org-specific)
 * These roles grant access/permissions across ALL organizations
 * Hierarchy: SuperAdmin > AdminSystem > Admin > User
 */
export enum UserRole {
  User = "user", // Standard citizen
  Admin = "admin", // Back-office admin (assigned by SuperAdmin)
  AdminSystem = "admin_system", // System admin (all access except delete SuperAdmin)
  SuperAdmin = "super_admin", // Full platform access (unique: iasted@me.com)
  IntelAgent = "intel_agent", // Intelligence operations
  EducationAgent = "education_agent", // Education services
}

/**
 * Organization membership roles (specific to org membership)
 * Hierarchical roles within an embassy/consulate
 */
export enum MemberRole {
  // Embassy roles (diplomatic hierarchy)
  Ambassador = "ambassador", // Niveau 1 - Chef de mission
  FirstCounselor = "first_counselor", // Niveau 2 - Premier Conseiller
  Paymaster = "paymaster", // Niveau 3 - Payeur
  EconomicCounselor = "economic_counselor", // Niveau 3 - Conseiller Économique
  SocialCounselor = "social_counselor", // Niveau 3 - Conseiller Social
  CommunicationCounselor = "communication_counselor", // Niveau 3 - Conseiller Communication
  Chancellor = "chancellor", // Niveau 4 - Chancelier
  FirstSecretary = "first_secretary", // Niveau 4 - Premier Secrétaire
  Receptionist = "receptionist", // Niveau 5 - Réceptionniste

  // Consulate roles (consular hierarchy)
  ConsulGeneral = "consul_general", // Niveau 1 - Consul Général
  Consul = "consul", // Niveau 2 - Consul
  ViceConsul = "vice_consul", // Niveau 3 - Vice-Consul
  ConsularAffairsOfficer = "consular_affairs_officer", // Niveau 4 - Chargé d'Affaires
  ConsularAgent = "consular_agent", // Niveau 5 - Agent Consulaire
  Intern = "intern", // Niveau 6 - Stagiaire

  // Generic roles (for non-diplomatic orgs)
  Admin = "admin",
  Agent = "agent",
  Viewer = "viewer",
}

/**
 * Types d'utilisateurs publics pour les services consulaires
 * Détermine quels services sont accessibles à l'utilisateur
 */
export enum PublicUserType {
  // Gabonais
  LongStay = "long_stay", // Gabonais résidant > 6 mois à l'étranger
  ShortStay = "short_stay", // Gabonais de passage < 6 mois

  // Étrangers
  VisaTourism = "visa_tourism", // Étranger visa court séjour (tourisme)
  VisaBusiness = "visa_business", // Étranger visa affaires
  VisaLongStay = "visa_long_stay", // Étranger visa long séjour / installation

  // Services administratifs
  AdminServices = "admin_services", // Étranger pour services administratifs (légalisation, apostille)
}

export enum OrganizationType {
  // Représentations diplomatiques
  Embassy = "embassy", // Ambassade
  HighRepresentation = "high_representation", // Ambassade Haute Représentation (ex: France, Maroc)
  GeneralConsulate = "general_consulate", // Consulat Général
  HighCommission = "high_commission", // Haut-Commissariat (Commonwealth)
  PermanentMission = "permanent_mission", // Mission Permanente (ONU, etc.)
  ThirdParty = "third_party", // Partenaire tiers
}

export enum DocumentStatus {
  Pending = "pending",
  Validated = "validated",
  Rejected = "rejected",
  Expired = "expired",
  Expiring = "expiring",
}

export enum AppointmentStatus {
  Draft = "draft",
  Pending = "pending",
  Scheduled = "scheduled",
  Confirmed = "confirmed",
  Completed = "completed",
  Cancelled = "cancelled",
  Missed = "missed",
  Rescheduled = "rescheduled",
}

export enum NotificationStatus {
  Pending = "pending",
  Sent = "sent",
  Delivered = "delivered",
  Failed = "failed",
  Read = "read",
}

export enum NotificationType {
  Updated = "updated",
  Reminder = "reminder",
  Confirmation = "confirmation",
  Cancellation = "cancellation",
  Communication = "communication",
  ImportantCommunication = "important_communication",
  AppointmentConfirmation = "appointment_confirmation",
  AppointmentReminder = "appointment_reminder",
  AppointmentCancellation = "appointment_cancellation",
  ConsularRegistrationSubmitted = "consular_registration_submitted",
  ConsularRegistrationValidated = "consular_registration_validated",
  ConsularRegistrationRejected = "consular_registration_rejected",
  ConsularCardReady = "consular_card_ready",
  ConsularRegistrationCompleted = "consular_registration_completed",
  Feedback = "feedback",
  // In-app notification types
  NewMessage = "new_message",
  StatusUpdate = "status_update",
  PaymentSuccess = "payment_success",
  ActionRequired = "action_required",
  DocumentValidated = "document_validated",
  DocumentRejected = "document_rejected",
  // Meetings & Calls
  MeetingInvitation = "meeting_invitation",
  CallIncoming = "call_incoming",
  ChatMessage = "chat_message",
}

export enum ProfileCategory {
  Adult = "adult",
  Minor = "minor",
}

export enum ProfileStatus {
  Draft = "draft",
  Active = "active",
  Inactive = "inactive",
  Pending = "pending",
  Suspended = "suspended",
}

export enum OwnerType {
  User = "user",
  Profile = "profile",
  Organization = "organization",
  Request = "request",
  ChildProfile = "child_profile",
}

export enum DocumentType {
  Passport = "passport",
  BirthCertificate = "birth_certificate",
  IdentityCard = "identity_card",
  DriverLicense = "driver_license",
  Photo = "photo",
  ProofOfAddress = "proof_of_address",
  FamilyBook = "family_book",
  Other = "other",
  MarriageCertificate = "marriage_certificate",
  DivorceDecree = "divorce_decree",
  NationalityCertificate = "nationality_certificate",
  VisaPages = "visa_pages",
  EmploymentProof = "employment_proof",
  NaturalizationDecree = "naturalization_decree",
  IdentityPhoto = "identity_photo",
  ConsularCard = "consular_card",
  DeathCertificate = "death_certificate",
  ResidencePermit = "residence_permit",
}

export enum AppointmentType {
  DocumentSubmission = "document_submission",
  DocumentCollection = "document_collection",
  Interview = "interview",
  MarriageCeremony = "marriage_ceremony",
  Emergency = "emergency",
  Other = "other",
  Consultation = "consultation",
}

export enum ParticipantRole {
  Attendee = "attendee",
  Agent = "agent",
  Organizer = "organizer",
}

export enum ParticipantStatus {
  Confirmed = "confirmed",
  Tentative = "tentative",
  Declined = "declined",
}

export enum NotificationChannel {
  App = "app",
  Email = "email",
  Sms = "sms",
}

export enum OrganizationStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
}

export enum ActivityType {
  RequestCreated = "request_created",
  RequestSubmitted = "request_submitted",
  RequestAssigned = "request_assigned",
  DocumentUploaded = "document_uploaded",
  DocumentValidated = "document_validated",
  DocumentDeleted = "document_deleted",
  DocumentRejected = "document_rejected",
  PaymentReceived = "payment_received",
  RequestCompleted = "request_completed",
  RequestCancelled = "request_cancelled",
  CommentAdded = "comment_added",
  StatusChanged = "status_changed",
  ProfileUpdate = "profile_update",
  AppointmentScheduled = "appointment_scheduled",
  DocumentUpdated = "document_updated",
  Assigned = "assigned",
  NoteAdded = "note_added",
  RegistrationRequested = "registration_requested",
  ProfileCreated = "profile_created",
  ActionRequired = "action_required",
  ActionCleared = "action_cleared",
}

export enum ValidationStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  RequiresReview = "requires_review",
}

export enum RequestType {
  FirstRequest = "first_request",
  Renewal = "renewal",
  Modification = "modification",
  ConsularRegistration = "consular_registration",
  PassportRequest = "passport_request",
  IdCardRequest = "id_card_request",
}

export enum ProcessingMode {
  OnlineOnly = "online_only",
  PresenceRequired = "presence_required",
  Hybrid = "hybrid",
  ByProxy = "by_proxy",
}

export enum DeliveryMode {
  InPerson = "in_person",
  Postal = "postal",
  Electronic = "electronic",
  ByProxy = "by_proxy",
}

export enum DeliveryStatus {
  Requested = "requested",
  Ready = "ready",
  Pending = "pending",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum Gender {
  Male = "male",
  Female = "female",
}

export enum MaritalStatus {
  Single = "single",
  Married = "married",
  Divorced = "divorced",
  Widowed = "widowed",
  CivilUnion = "civil_union",
  Cohabiting = "cohabiting",
}

export enum FamilyLink {
  Father = "father",
  Mother = "mother",
  Spouse = "spouse",
  LegalGuardian = "legal_guardian",
  Child = "child",
  Other = "other",
  BrotherSister = "brother_sister",
}

export enum WorkStatus {
  SelfEmployed = "self_employed",
  Employee = "employee",
  Entrepreneur = "entrepreneur",
  Unemployed = "unemployed",
  Retired = "retired",
  Student = "student",
  Other = "other",
}

export enum NationalityAcquisition {
  Birth = "birth",
  Naturalization = "naturalization",
  Marriage = "marriage",
  Adoption = "adoption",
  Other = "other",
}

export enum RegistrationDuration {
  Temporary = "temporary",
  Permanent = "permanent",
}

export enum RegistrationType {
  Inscription = "inscription",
  Renewal = "renewal",
  Modification = "modification",
}

export enum RegistrationStatus {
  Requested = "requested",
  Active = "active",
  Expired = "expired",
}

/**
 * Permission effect for dynamic permission entries
 * Used in the permissions table to grant or deny access
 */
export enum PermissionEffect {
  Grant = "grant",
  Deny = "deny",
}

// ═══════════════════════════════════════════════════════════════════════════
// CV MODULE ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export enum SkillLevel {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
  Expert = "expert",
}

export enum LanguageLevel {
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
  Native = "native",
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSOCIATION MODULE ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export enum AssociationType {
  Cultural = "cultural", // Culturelle
  Sports = "sports", // Sportive
  Religious = "religious", // Religieuse
  Professional = "professional", // Professionnelle
  Solidarity = "solidarity", // Solidarité
  Education = "education", // Éducation
  Youth = "youth", // Jeunesse
  Women = "women", // Femmes
  Student = "student", // Étudiante
  Other = "other", // Autre
}

export enum AssociationRole {
  President = "president",
  VicePresident = "vice_president",
  Secretary = "secretary",
  Treasurer = "treasurer",
  Member = "member",
}

export enum AssociationMemberStatus {
  Pending = "pending",
  Accepted = "accepted",
  Declined = "declined",
}

export enum AssociationClaimStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPANY MODULE ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export enum CompanyType {
  SARL = "sarl",
  SA = "sa",
  SAS = "sas",
  SASU = "sasu",
  EURL = "eurl",
  EI = "ei",
  AutoEntrepreneur = "auto_entrepreneur",
  Other = "other",
}

export enum ActivitySector {
  Technology = "technology",
  Commerce = "commerce",
  Services = "services",
  Industry = "industry",
  Agriculture = "agriculture",
  Health = "health",
  Education = "education",
  Culture = "culture",
  Tourism = "tourism",
  Transport = "transport",
  Construction = "construction",
  Other = "other",
}

export enum CompanyRole {
  CEO = "ceo",
  Owner = "owner",
  President = "president",
  Director = "director",
  Manager = "manager",
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT TYPE CATEGORY ENUMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Document type categories - Main groupings for administrative documents
 * Translation keys: documentTypes.categories.[value]
 */
export enum DocumentTypeCategory {
  Forms = "forms", // Formulaires et demandes
  Identity = "identity", // Pièces d'identité
  CivilStatus = "civil_status", // État civil et famille
  Nationality = "nationality", // Nationalité
  Residence = "residence", // Justificatif de domicile
  Employment = "employment", // Situation professionnelle
  Income = "income", // Ressources et situation financière
  Certificates = "certificates", // Attestations diverses
  OfficialCertificates = "official_certificates", // Certificats officiels
  Justice = "justice", // Justice et casier judiciaire
  AdministrativeDecisions = "administrative_decisions", // Décisions administratives
  Housing = "housing", // Logement et location
  Vehicle = "vehicle", // Véhicule et conduite
  Education = "education", // Études et formation
  LanguageIntegration = "language_integration", // Langue et intégration
  Health = "health", // Santé et handicap
  Taxation = "taxation", // Fiscalité
  Other = "other", // Autres documents
}

/**
 * Detailed document types - All specific document types
 * Translation keys: documentTypes.types.[value]
 */
export enum DetailedDocumentType {
  // ─── Forms / Formulaires et demandes ───
  CerfaForm = "cerfa_form",
  OnlineFormPrinted = "online_form_printed",
  HandwrittenRequest = "handwritten_request",
  MotivationLetter = "motivation_letter",
  AdministrativeLetterTemplate = "administrative_letter_template",

  // ─── Identity / Pièces d'identité ───
  NationalIdCard = "national_id_card",
  Passport = "passport",
  ResidencePermit = "residence_permit",
  DriverLicense = "driver_license",
  ResidentCard = "resident_card",
  ResidencePermitReceipt = "residence_permit_receipt",
  VitaleCardCertificate = "vitale_card_certificate",

  // ─── Civil Status / État civil et famille ───
  BirthCertificate = "birth_certificate",
  MarriageCertificate = "marriage_certificate",
  DeathCertificate = "death_certificate",
  FamilyBook = "family_book",
  DivorceJudgment = "divorce_judgment",
  AdoptionJudgment = "adoption_judgment",
  SingleStatusCertificate = "single_status_certificate",
  FamilyRecordBook = "family_record_book",

  // ─── Nationality / Nationalité ───
  NationalityCertificate = "nationality_certificate",
  NationalityAcquisitionDeclaration = "nationality_acquisition_declaration",
  NaturalizationFile = "naturalization_file",

  // ─── Residence / Justificatif de domicile ───
  ProofOfAddress = "proof_of_address",
  WaterBill = "water_bill",
  ElectricityBill = "electricity_bill",
  GasBill = "gas_bill",
  LandlinePhoneBill = "landline_phone_bill",
  MobilePhoneBill = "mobile_phone_bill",
  InternetBill = "internet_bill",
  RentReceipt = "rent_receipt",
  LeaseAgreement = "lease_agreement",
  PropertyTitle = "property_title",
  HousingTax = "housing_tax",
  PropertyTax = "property_tax",
  TaxNoticeWithAddress = "tax_notice_with_address",
  HomeInsuranceCertificate = "home_insurance_certificate",
  DomiciliationCertificate = "domiciliation_certificate",
  HostingCertificate = "hosting_certificate",
  NursingHomeResidenceCertificate = "nursing_home_residence_certificate",
  CampingHotelResidenceCertificate = "camping_hotel_residence_certificate",

  // ─── Employment / Situation professionnelle ───
  EmploymentContract = "employment_contract",
  EmployerCertificate = "employer_certificate",
  WorkCertificate = "work_certificate",
  PoleEmploiCertificate = "pole_emploi_certificate",
  InternshipCertificate = "internship_certificate",
  KbisExtract = "kbis_extract",
  CompanyStatutes = "company_statutes",
  RcsRmRegistration = "rcs_rm_registration",
  SchoolCertificate = "school_certificate",
  ApprenticeshipContract = "apprenticeship_contract",

  // ─── Income / Ressources et situation financière ───
  PaySlip = "pay_slip",
  TaxNotice = "tax_notice",
  NonTaxationCertificate = "non_taxation_certificate",
  BankStatement = "bank_statement",
  CafStatement = "caf_statement",
  RetirementPensionCertificate = "retirement_pension_certificate",
  DisabilityPensionCertificate = "disability_pension_certificate",
  AahCertificate = "aah_certificate",
  OtherSocialBenefitCertificate = "other_social_benefit_certificate",
  SavingsProof = "savings_proof",

  // ─── Certificates / Attestations diverses ───
  HonorDeclaration = "honor_declaration",
  DetailedHostingCertificate = "detailed_hosting_certificate",
  SimpleHomeInsuranceCertificate = "simple_home_insurance_certificate",
  LiabilityInsuranceCertificate = "liability_insurance_certificate",
  VehicleInsuranceCertificate = "vehicle_insurance_certificate",
  SimpleEmployerCertificate = "simple_employer_certificate",
  VolunteerCertificate = "volunteer_certificate",
  AttendanceCertificate = "attendance_certificate",

  // ─── Official Certificates / Certificats officiels ───
  MedicalCertificate = "medical_certificate",
  SchoolEnrollmentCertificate = "school_enrollment_certificate",
  NationalityCertificateOfficial = "nationality_certificate_official",
  HostingCertificateOfficial = "hosting_certificate_official",
  GoodConductCertificate = "good_conduct_certificate",

  // ─── Justice / Justice et casier judiciaire ───
  CriminalRecordB3 = "criminal_record_b3",
  CriminalRecordB2 = "criminal_record_b2",
  CourtDecision = "court_decision",
  CourtOrder = "court_order",

  // ─── Administrative Decisions / Décisions administratives ───
  AdministrativeDecision = "administrative_decision",
  MunicipalPrefectoralOrder = "municipal_prefectoral_order",
  RightsNotification = "rights_notification",

  // ─── Housing / Logement et location ───
  CompleteTenantFile = "complete_tenant_file",
  HousingLeaseAgreement = "housing_lease_agreement",
  RentReceiptHistory = "rent_receipt_history",
  GuarantorCommitment = "guarantor_commitment",
  GuarantorDocuments = "guarantor_documents",
  HousingHostingCertificate = "housing_hosting_certificate",

  // ─── Vehicle / Véhicule et conduite ───
  VehicleRegistration = "vehicle_registration",
  VehicleTransferCertificate = "vehicle_transfer_certificate",
  TechnicalInspectionReport = "technical_inspection_report",
  DriverLicenseDoc = "driver_license_doc",
  VehicleInsuranceDoc = "vehicle_insurance_doc",

  // ─── Education / Études et formation ───
  Diploma = "diploma",
  Transcript = "transcript",
  SchoolCertificateEducation = "school_certificate_education",
  TrainingCertificate = "training_certificate",

  // ─── Language Integration / Langue et intégration ───
  LanguageTestCertificate = "language_test_certificate",
  IntegrationCertificate = "integration_certificate",

  // ─── Health / Santé et handicap ───
  DetailedMedicalCertificate = "detailed_medical_certificate",
  SocialCoverageCertificate = "social_coverage_certificate",
  DisabilityCard = "disability_card",
  MdphDecision = "mdph_decision",

  // ─── Taxation / Fiscalité ───
  DetailedTaxNotice = "detailed_tax_notice",
  NonTaxationCertificateFiscal = "non_taxation_certificate_fiscal",
  TaxPaymentProof = "tax_payment_proof",
  FiscalStamp = "fiscal_stamp",

  // ─── Other / Autres documents ───
  IdentityPhoto = "identity_photo",
  ForeignCivilStatusDocument = "foreign_civil_status_document",
  SwornTranslation = "sworn_translation",
  PowerOfAttorney = "power_of_attorney",
  OtherOfficialDocument = "other_official_document",
}

/**
 * Mapping of document type categories to their detailed types
 */
export const DOCUMENT_TYPES_BY_CATEGORY: Record<
  DocumentTypeCategory,
  DetailedDocumentType[]
> = {
  [DocumentTypeCategory.Forms]: [
    DetailedDocumentType.CerfaForm,
    DetailedDocumentType.OnlineFormPrinted,
    DetailedDocumentType.HandwrittenRequest,
    DetailedDocumentType.MotivationLetter,
    DetailedDocumentType.AdministrativeLetterTemplate,
  ],
  [DocumentTypeCategory.Identity]: [
    DetailedDocumentType.NationalIdCard,
    DetailedDocumentType.Passport,
    DetailedDocumentType.ResidencePermit,
    DetailedDocumentType.DriverLicense,
    DetailedDocumentType.ResidentCard,
    DetailedDocumentType.ResidencePermitReceipt,
    DetailedDocumentType.VitaleCardCertificate,
    DetailedDocumentType.IdentityPhoto,
  ],
  [DocumentTypeCategory.CivilStatus]: [
    DetailedDocumentType.BirthCertificate,
    DetailedDocumentType.MarriageCertificate,
    DetailedDocumentType.DeathCertificate,
    DetailedDocumentType.FamilyBook,
    DetailedDocumentType.DivorceJudgment,
    DetailedDocumentType.AdoptionJudgment,
    DetailedDocumentType.SingleStatusCertificate,
    DetailedDocumentType.FamilyRecordBook,
  ],
  [DocumentTypeCategory.Nationality]: [
    DetailedDocumentType.NationalityCertificate,
    DetailedDocumentType.NationalityAcquisitionDeclaration,
    DetailedDocumentType.NaturalizationFile,
  ],
  [DocumentTypeCategory.Residence]: [
    DetailedDocumentType.WaterBill,
    DetailedDocumentType.ElectricityBill,
    DetailedDocumentType.GasBill,
    DetailedDocumentType.LandlinePhoneBill,
    DetailedDocumentType.MobilePhoneBill,
    DetailedDocumentType.InternetBill,
    DetailedDocumentType.RentReceipt,
    DetailedDocumentType.LeaseAgreement,
    DetailedDocumentType.PropertyTitle,
    DetailedDocumentType.HousingTax,
    DetailedDocumentType.PropertyTax,
    DetailedDocumentType.TaxNoticeWithAddress,
    DetailedDocumentType.HomeInsuranceCertificate,
    DetailedDocumentType.DomiciliationCertificate,
    DetailedDocumentType.HostingCertificate,
    DetailedDocumentType.NursingHomeResidenceCertificate,
    DetailedDocumentType.CampingHotelResidenceCertificate,
  ],
  [DocumentTypeCategory.Employment]: [
    DetailedDocumentType.EmploymentContract,
    DetailedDocumentType.EmployerCertificate,
    DetailedDocumentType.WorkCertificate,
    DetailedDocumentType.PoleEmploiCertificate,
    DetailedDocumentType.InternshipCertificate,
    DetailedDocumentType.KbisExtract,
    DetailedDocumentType.CompanyStatutes,
    DetailedDocumentType.RcsRmRegistration,
    DetailedDocumentType.SchoolCertificate,
    DetailedDocumentType.ApprenticeshipContract,
  ],
  [DocumentTypeCategory.Income]: [
    DetailedDocumentType.PaySlip,
    DetailedDocumentType.TaxNotice,
    DetailedDocumentType.NonTaxationCertificate,
    DetailedDocumentType.BankStatement,
    DetailedDocumentType.CafStatement,
    DetailedDocumentType.RetirementPensionCertificate,
    DetailedDocumentType.DisabilityPensionCertificate,
    DetailedDocumentType.AahCertificate,
    DetailedDocumentType.OtherSocialBenefitCertificate,
    DetailedDocumentType.SavingsProof,
  ],
  [DocumentTypeCategory.Certificates]: [
    DetailedDocumentType.HonorDeclaration,
    DetailedDocumentType.DetailedHostingCertificate,
    DetailedDocumentType.SimpleHomeInsuranceCertificate,
    DetailedDocumentType.LiabilityInsuranceCertificate,
    DetailedDocumentType.VehicleInsuranceCertificate,
    DetailedDocumentType.SimpleEmployerCertificate,
    DetailedDocumentType.VolunteerCertificate,
    DetailedDocumentType.AttendanceCertificate,
  ],
  [DocumentTypeCategory.OfficialCertificates]: [
    DetailedDocumentType.MedicalCertificate,
    DetailedDocumentType.SchoolEnrollmentCertificate,
    DetailedDocumentType.NationalityCertificateOfficial,
    DetailedDocumentType.HostingCertificateOfficial,
    DetailedDocumentType.GoodConductCertificate,
  ],
  [DocumentTypeCategory.Justice]: [
    DetailedDocumentType.CriminalRecordB3,
    DetailedDocumentType.CriminalRecordB2,
    DetailedDocumentType.CourtDecision,
    DetailedDocumentType.CourtOrder,
  ],
  [DocumentTypeCategory.AdministrativeDecisions]: [
    DetailedDocumentType.AdministrativeDecision,
    DetailedDocumentType.MunicipalPrefectoralOrder,
    DetailedDocumentType.RightsNotification,
  ],
  [DocumentTypeCategory.Housing]: [
    DetailedDocumentType.CompleteTenantFile,
    DetailedDocumentType.HousingLeaseAgreement,
    DetailedDocumentType.RentReceiptHistory,
    DetailedDocumentType.GuarantorCommitment,
    DetailedDocumentType.GuarantorDocuments,
    DetailedDocumentType.HousingHostingCertificate,
  ],
  [DocumentTypeCategory.Vehicle]: [
    DetailedDocumentType.VehicleRegistration,
    DetailedDocumentType.VehicleTransferCertificate,
    DetailedDocumentType.TechnicalInspectionReport,
    DetailedDocumentType.DriverLicenseDoc,
    DetailedDocumentType.VehicleInsuranceDoc,
  ],
  [DocumentTypeCategory.Education]: [
    DetailedDocumentType.Diploma,
    DetailedDocumentType.Transcript,
    DetailedDocumentType.SchoolCertificateEducation,
    DetailedDocumentType.TrainingCertificate,
  ],
  [DocumentTypeCategory.LanguageIntegration]: [
    DetailedDocumentType.LanguageTestCertificate,
    DetailedDocumentType.IntegrationCertificate,
  ],
  [DocumentTypeCategory.Health]: [
    DetailedDocumentType.DetailedMedicalCertificate,
    DetailedDocumentType.SocialCoverageCertificate,
    DetailedDocumentType.DisabilityCard,
    DetailedDocumentType.MdphDecision,
  ],
  [DocumentTypeCategory.Taxation]: [
    DetailedDocumentType.DetailedTaxNotice,
    DetailedDocumentType.NonTaxationCertificateFiscal,
    DetailedDocumentType.TaxPaymentProof,
    DetailedDocumentType.FiscalStamp,
  ],
  [DocumentTypeCategory.Other]: [
    DetailedDocumentType.ForeignCivilStatusDocument,
    DetailedDocumentType.SwornTranslation,
    DetailedDocumentType.PowerOfAttorney,
    DetailedDocumentType.OtherOfficialDocument,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// CHILD PROFILE ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export enum ChildProfileStatus {
  Draft = "draft",
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

export enum NoteType {
  Internal = "internal",
  Feedback = "feedback",
}

export enum ParentalRole {
  Father = "father",
  Mother = "mother",
  LegalGuardian = "legal_guardian",
}

export enum IntelligenceNoteType {
  PoliticalOpinion = "political_opinion",
  Orientation = "orientation",
  Associations = "associations",
  TravelPatterns = "travel_patterns",
  Contacts = "contacts",
  Activities = "activities",
  Other = "other",
}

export enum IntelligenceNotePriority {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum ConsularServiceType {
  PassportRequest = "passport_request",
  ConsularCard = "consular_card",
  BirthRegistration = "birth_registration",
  MarriageRegistration = "marriage_registration",
  DeathRegistration = "death_registration",
  ConsularRegistration = "consular_registration",
  NationalityCertificate = "nationality_certificate",
}

export enum ServicePriority {
  Standard = "standard",
  Urgent = "urgent",
}

export enum ServiceStepType {
  Form = "form",
  Documents = "documents",
  Appointment = "appointment",
  Payment = "payment",
  Review = "review",
  Delivery = "delivery",
}

export enum RequestActionType {
  Assignment = "assignment",
  StatusChange = "status_change",
  NoteAdded = "note_added",
  DocumentAdded = "document_added",
  DocumentValidated = "document_validated",
  AppointmentScheduled = "appointment_scheduled",
  PaymentReceived = "payment_received",
  Completed = "completed",
  ProfileUpdate = "profile_update",
  DocumentUpdated = "document_updated",
  DocumentDeleted = "document_deleted",
}

export enum FeedbackCategory {
  Bug = "bug",
  Feature = "feature",
  Improvement = "improvement",
  Other = "other",
}

export enum FeedbackStatus {
  Pending = "pending",
  InReview = "in_review",
  Resolved = "resolved",
  Closed = "closed",
}

export enum CountryStatus {
  Active = "active",
  Inactive = "inactive",
}

export enum EmailStatus {
  Pending = "pending",
  Confirmed = "confirmed",
  Unsubscribed = "unsubscribed",
}

export enum UserPermission {
  ProfileRead = "profile_read",
  ProfileWrite = "profile_write",
  ProfileDelete = "profile_delete",
  RequestRead = "request_read",
  RequestWrite = "request_write",
  RequestDelete = "request_delete",
  DocumentRead = "document_read",
  DocumentWrite = "document_write",
  DocumentDelete = "document_delete",
  AppointmentRead = "appointment_read",
  AppointmentWrite = "appointment_write",
  AppointmentDelete = "appointment_delete",
  NotificationRead = "notification_read",
  NotificationWrite = "notification_write",
  NotificationDelete = "notification_delete",
  AddressRead = "address_read",
  AddressWrite = "address_write",
  AddressDelete = "address_delete",
  CountryRead = "country_read",
  CountryWrite = "country_write",
  CountryDelete = "country_delete",
  EmergencyContactRead = "emergency_contact_read",
  EmergencyContactWrite = "emergency_contact_write",
  EmergencyContactDelete = "emergency_contact_delete",
  FeedbackRead = "feedback_read",
  FeedbackWrite = "feedback_write",
  FeedbackDelete = "feedback_delete",
  OrganizationRead = "organization_read",
  OrganizationWrite = "organization_write",
  OrganizationDelete = "organization_delete",
  ServiceRead = "service_read",
  ServiceWrite = "service_write",
  ServiceDelete = "service_delete",
  UserRead = "user_read",
  UserWrite = "user_write",
  UserDelete = "user_delete",
}

export enum MigrationStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum MigrationType {
  Users = "users",
  Organizations = "organizations",
  Services = "services",
  Requests = "requests",
  Documents = "documents",
  Appointments = "appointments",
  Notifications = "notifications",
  Addresses = "addresses",
  Countries = "countries",
  All = "all",
}

export enum MembershipStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
}

export enum SelectType {
  Single = "single",
  Multiple = "multiple",
}

export enum FormFieldType {
  Text = "text",
  Email = "email",
  Phone = "tel",
  Number = "number",
  Date = "date",
  Select = "select",
  Checkbox = "checkbox",
  Textarea = "textarea",
  File = "file",
  Country = "country",
  Gender = "gender",
  ProfileDocument = "profile_document",
  Address = "address",
  Image = "image",
}

export enum PostCategory {
  News = "news",
  Event = "event",
  Announcement = "announcement",
  Other = "other",
}

export enum PostStatus {
  Draft = "draft",
  Published = "published",
  Archived = "archived",
}

export enum TutorialCategory {
  Administrative = "administratif",
  Entrepreneurship = "entrepreneuriat",
  Travel = "voyage",
  PracticalLife = "vie_pratique",
}

export enum TutorialType {
  Video = "video",
  Article = "article",
  Guide = "guide",
}

export enum EventType {
  Request = "request",
  Profile = "profile",
  Document = "document",
}

export enum CountryCode {
  AD = "AD",
  AE = "AE",
  AF = "AF",
  AG = "AG",
  AI = "AI",
  AL = "AL",
  AM = "AM",
  AO = "AO",
  AQ = "AQ",
  AR = "AR",
  AS = "AS",
  AT = "AT",
  AU = "AU",
  AW = "AW",
  AX = "AX",
  AZ = "AZ",
  BA = "BA",
  BB = "BB",
  BD = "BD",
  BE = "BE",
  BF = "BF",
  BG = "BG",
  BH = "BH",
  BI = "BI",
  BJ = "BJ",
  BL = "BL",
  BM = "BM",
  BN = "BN",
  BO = "BO",
  BR = "BR",
  BS = "BS",
  BT = "BT",
  BW = "BW",
  BY = "BY",
  BZ = "BZ",
  CA = "CA",
  CC = "CC",
  CD = "CD",
  CF = "CF",
  CG = "CG",
  CH = "CH",
  CI = "CI",
  CK = "CK",
  CL = "CL",
  CM = "CM",
  CN = "CN",
  CO = "CO",
  CR = "CR",
  CU = "CU",
  CV = "CV",
  CX = "CX",
  CY = "CY",
  CZ = "CZ",
  DE = "DE",
  DJ = "DJ",
  DK = "DK",
  DM = "DM",
  DO = "DO",
  DZ = "DZ",
  EC = "EC",
  EE = "EE",
  EG = "EG",
  ER = "ER",
  ES = "ES",
  ET = "ET",
  FI = "FI",
  FJ = "FJ",
  FK = "FK",
  FM = "FM",
  FO = "FO",
  FR = "FR",
  GA = "GA",
  GB = "GB",
  GD = "GD",
  GE = "GE",
  GF = "GF",
  GG = "GG",
  GH = "GH",
  GI = "GI",
  GL = "GL",
  GM = "GM",
  GN = "GN",
  GP = "GP",
  GQ = "GQ",
  GR = "GR",
  GS = "GS",
  GT = "GT",
  GU = "GU",
  GW = "GW",
  GY = "GY",
  HK = "HK",
  HN = "HN",
  HR = "HR",
  HT = "HT",
  HU = "HU",
  ID = "ID",
  IE = "IE",
  IL = "IL",
  IM = "IM",
  IN = "IN",
  IO = "IO",
  IQ = "IQ",
  IR = "IR",
  IS = "IS",
  IT = "IT",
  JE = "JE",
  JM = "JM",
  JO = "JO",
  JP = "JP",
  KE = "KE",
  KG = "KG",
  KH = "KH",
  KI = "KI",
  KM = "KM",
  KN = "KN",
  KP = "KP",
  KR = "KR",
  KW = "KW",
  KY = "KY",
  KZ = "KZ",
  LA = "LA",
  LB = "LB",
  LC = "LC",
  LI = "LI",
  LK = "LK",
  LR = "LR",
  LS = "LS",
  LT = "LT",
  LU = "LU",
  LV = "LV",
  LY = "LY",
  MA = "MA",
  MC = "MC",
  MD = "MD",
  ME = "ME",
  MF = "MF",
  MG = "MG",
  MH = "MH",
  MK = "MK",
  ML = "ML",
  MM = "MM",
  MN = "MN",
  MO = "MO",
  MP = "MP",
  MQ = "MQ",
  MR = "MR",
  MS = "MS",
  MT = "MT",
  MU = "MU",
  MV = "MV",
  MW = "MW",
  MX = "MX",
  MY = "MY",
  MZ = "MZ",
  NA = "NA",
  NC = "NC",
  NE = "NE",
  NF = "NF",
  NG = "NG",
  NI = "NI",
  NL = "NL",
  NO = "NO",
  NP = "NP",
  NR = "NR",
  NU = "NU",
  NZ = "NZ",
  OM = "OM",
  PA = "PA",
  PE = "PE",
  PF = "PF",
  PG = "PG",
  PH = "PH",
  PK = "PK",
  PL = "PL",
  PM = "PM",
  PN = "PN",
  PR = "PR",
  PS = "PS",
  PT = "PT",
  PW = "PW",
  PY = "PY",
  QA = "QA",
  RE = "RE",
  RO = "RO",
  RS = "RS",
  RU = "RU",
  RW = "RW",
  SA = "SA",
  SB = "SB",
  SC = "SC",
  SD = "SD",
  SE = "SE",
  SG = "SG",
  SH = "SH",
  SI = "SI",
  SJ = "SJ",
  SK = "SK",
  SL = "SL",
  SM = "SM",
  SN = "SN",
  SO = "SO",
  SR = "SR",
  SS = "SS",
  ST = "ST",
  SV = "SV",
  SY = "SY",
  SZ = "SZ",
  TC = "TC",
  TD = "TD",
  TG = "TG",
  TH = "TH",
  TJ = "TJ",
  TK = "TK",
  TL = "TL",
  TM = "TM",
  TN = "TN",
  TO = "TO",
  TR = "TR",
  TT = "TT",
  TV = "TV",
  TW = "TW",
  TZ = "TZ",
  UA = "UA",
  UG = "UG",
  US = "US",
  UY = "UY",
  UZ = "UZ",
  VA = "VA",
  VC = "VC",
  VE = "VE",
  VG = "VG",
  VI = "VI",
  VN = "VN",
  VU = "VU",
  WF = "WF",
  WS = "WS",
  YE = "YE",
  YT = "YT",
  ZA = "ZA",
  ZM = "ZM",
  ZW = "ZW",
}

export const countryCodes = Object.values(CountryCode);

export const countryDialCodes = [
  { code: "AD", dial_code: "376" },
  { code: "AE", dial_code: "971" },
  { code: "AF", dial_code: "93" },
  { code: "AG", dial_code: "1268" },
  { code: "AL", dial_code: "355" },
  { code: "AM", dial_code: "374" },
  { code: "AO", dial_code: "244" },
  { code: "AR", dial_code: "54" },
  { code: "AT", dial_code: "43" },
  { code: "AU", dial_code: "61" },
  { code: "AZ", dial_code: "994" },
  { code: "BA", dial_code: "387" },
  { code: "BB", dial_code: "1246" },
  { code: "BD", dial_code: "880" },
  { code: "BE", dial_code: "32" },
  { code: "BF", dial_code: "226" },
  { code: "BG", dial_code: "359" },
  { code: "BH", dial_code: "973" },
  { code: "BI", dial_code: "257" },
  { code: "BJ", dial_code: "229" },
  { code: "BN", dial_code: "673" },
  { code: "BO", dial_code: "591" },
  { code: "BR", dial_code: "55" },
  { code: "BS", dial_code: "1242" },
  { code: "BT", dial_code: "975" },
  { code: "BW", dial_code: "267" },
  { code: "BY", dial_code: "375" },
  { code: "BZ", dial_code: "501" },
  { code: "CA", dial_code: "1" },
  { code: "CD", dial_code: "243" },
  { code: "CF", dial_code: "236" },
  { code: "CG", dial_code: "242" },
  { code: "CH", dial_code: "41" },
  { code: "CI", dial_code: "225" },
  { code: "CL", dial_code: "56" },
  { code: "CM", dial_code: "237" },
  { code: "CN", dial_code: "86" },
  { code: "CO", dial_code: "57" },
  { code: "CR", dial_code: "506" },
  { code: "CU", dial_code: "53" },
  { code: "CV", dial_code: "238" },
  { code: "CY", dial_code: "357" },
  { code: "CZ", dial_code: "420" },
  { code: "DE", dial_code: "49" },
  { code: "DJ", dial_code: "253" },
  { code: "DK", dial_code: "45" },
  { code: "DM", dial_code: "1767" },
  { code: "DO", dial_code: "1809" },
  { code: "DZ", dial_code: "213" },
  { code: "EC", dial_code: "593" },
  { code: "EE", dial_code: "372" },
  { code: "EG", dial_code: "20" },
  { code: "ER", dial_code: "291" },
  { code: "ES", dial_code: "34" },
  { code: "ET", dial_code: "251" },
  { code: "FI", dial_code: "358" },
  { code: "FJ", dial_code: "679" },
  { code: "FR", dial_code: "33" },
  { code: "GA", dial_code: "241" },
  { code: "GB", dial_code: "44" },
  { code: "GD", dial_code: "1473" },
  { code: "GE", dial_code: "995" },
  { code: "GH", dial_code: "233" },
  { code: "GM", dial_code: "220" },
  { code: "GN", dial_code: "224" },
  { code: "GQ", dial_code: "240" },
  { code: "GR", dial_code: "30" },
  { code: "GT", dial_code: "502" },
  { code: "GW", dial_code: "245" },
  { code: "GY", dial_code: "592" },
  { code: "HK", dial_code: "852" },
  { code: "HN", dial_code: "504" },
  { code: "HR", dial_code: "385" },
  { code: "HT", dial_code: "509" },
  { code: "HU", dial_code: "36" },
  { code: "ID", dial_code: "62" },
  { code: "IE", dial_code: "353" },
  { code: "IL", dial_code: "972" },
  { code: "IM", dial_code: "44" },
  { code: "IN", dial_code: "91" },
  { code: "IO", dial_code: "246" },
  { code: "IQ", dial_code: "964" },
  { code: "IR", dial_code: "98" },
  { code: "IS", dial_code: "354" },
  { code: "IT", dial_code: "39" },
  { code: "JE", dial_code: "44" },
  { code: "JM", dial_code: "1876" },
  { code: "JO", dial_code: "962" },
  { code: "JP", dial_code: "81" },
  { code: "KE", dial_code: "254" },
  { code: "KG", dial_code: "996" },
  { code: "KH", dial_code: "855" },
  { code: "KI", dial_code: "686" },
  { code: "KM", dial_code: "269" },
  { code: "KN", dial_code: "1869" },
  { code: "KP", dial_code: "850" },
  { code: "KR", dial_code: "82" },
  { code: "KW", dial_code: "965" },
  { code: "KY", dial_code: "1345" },
  { code: "KZ", dial_code: "7" },
  { code: "LA", dial_code: "856" },
  { code: "LB", dial_code: "961" },
  { code: "LC", dial_code: "1758" },
  { code: "LI", dial_code: "423" },
  { code: "LK", dial_code: "94" },
  { code: "LR", dial_code: "231" },
  { code: "LS", dial_code: "266" },
  { code: "LT", dial_code: "370" },
  { code: "LU", dial_code: "352" },
  { code: "LV", dial_code: "371" },
  { code: "LY", dial_code: "218" },
  { code: "MA", dial_code: "212" },
  { code: "MC", dial_code: "377" },
  { code: "MD", dial_code: "373" },
  { code: "ME", dial_code: "382" },
  { code: "MF", dial_code: "590" },
  { code: "MG", dial_code: "261" },
  { code: "MH", dial_code: "692" },
  { code: "MK", dial_code: "389" },
  { code: "ML", dial_code: "223" },
  { code: "MM", dial_code: "95" },
  { code: "MN", dial_code: "976" },
  { code: "MO", dial_code: "853" },
  { code: "MP", dial_code: "1670" },
  { code: "MQ", dial_code: "596" },
  { code: "MR", dial_code: "222" },
  { code: "MS", dial_code: "1664" },
  { code: "MT", dial_code: "356" },
  { code: "MU", dial_code: "230" },
  { code: "MV", dial_code: "960" },
  { code: "MW", dial_code: "265" },
  { code: "MX", dial_code: "52" },
  { code: "MY", dial_code: "60" },
  { code: "MZ", dial_code: "258" },
  { code: "NA", dial_code: "264" },
  { code: "NC", dial_code: "687" },
  { code: "NE", dial_code: "227" },
  { code: "NF", dial_code: "672" },
  { code: "NG", dial_code: "234" },
  { code: "NI", dial_code: "505" },
  { code: "NL", dial_code: "31" },
  { code: "NO", dial_code: "47" },
  { code: "NP", dial_code: "977" },
  { code: "NR", dial_code: "674" },
  { code: "NU", dial_code: "683" },
  { code: "NZ", dial_code: "64" },
  { code: "OM", dial_code: "968" },
  { code: "PA", dial_code: "507" },
  { code: "PE", dial_code: "51" },
  { code: "PF", dial_code: "689" },
  { code: "PG", dial_code: "675" },
  { code: "PH", dial_code: "63" },
  { code: "PK", dial_code: "92" },
  { code: "PL", dial_code: "48" },
  { code: "PM", dial_code: "508" },
  { code: "PN", dial_code: "870" },
  { code: "PR", dial_code: "1" },
  { code: "PS", dial_code: "970" },
  { code: "PT", dial_code: "351" },
  { code: "PW", dial_code: "680" },
  { code: "PY", dial_code: "595" },
  { code: "QA", dial_code: "974" },
  { code: "RE", dial_code: "262" },
  { code: "RO", dial_code: "40" },
  { code: "RS", dial_code: "381" },
  { code: "RU", dial_code: "7" },
  { code: "RW", dial_code: "250" },
  { code: "SA", dial_code: "966" },
  { code: "SB", dial_code: "677" },
  { code: "SC", dial_code: "248" },
  { code: "SD", dial_code: "249" },
  { code: "SE", dial_code: "46" },
  { code: "SG", dial_code: "65" },
  { code: "SH", dial_code: "290" },
  { code: "SI", dial_code: "386" },
  { code: "SJ", dial_code: "47" },
  { code: "SK", dial_code: "421" },
  { code: "SL", dial_code: "232" },
  { code: "SM", dial_code: "378" },
  { code: "SN", dial_code: "221" },
  { code: "SO", dial_code: "252" },
  { code: "SR", dial_code: "597" },
  { code: "SS", dial_code: "211" },
  { code: "ST", dial_code: "239" },
  { code: "SV", dial_code: "503" },
  { code: "SY", dial_code: "963" },
  { code: "SZ", dial_code: "268" },
  { code: "TC", dial_code: "1649" },
  { code: "TD", dial_code: "235" },
  { code: "TG", dial_code: "228" },
  { code: "TH", dial_code: "66" },
  { code: "TJ", dial_code: "992" },
  { code: "TK", dial_code: "690" },
  { code: "TL", dial_code: "670" },
  { code: "TM", dial_code: "993" },
  { code: "TN", dial_code: "216" },
  { code: "TO", dial_code: "676" },
  { code: "TR", dial_code: "90" },
  { code: "TT", dial_code: "1868" },
  { code: "TV", dial_code: "688" },
  { code: "TW", dial_code: "886" },
  { code: "TZ", dial_code: "255" },
  { code: "UA", dial_code: "380" },
  { code: "UG", dial_code: "256" },
  { code: "US", dial_code: "1" },
  { code: "UY", dial_code: "598" },
  { code: "UZ", dial_code: "998" },
  { code: "VA", dial_code: "39" },
  { code: "VC", dial_code: "1784" },
  { code: "VE", dial_code: "58" },
  { code: "VG", dial_code: "1284" },
  { code: "VI", dial_code: "1340" },
  { code: "VN", dial_code: "84" },
  { code: "VU", dial_code: "678" },
  { code: "WF", dial_code: "681" },
  { code: "WS", dial_code: "685" },
  { code: "YE", dial_code: "967" },
  { code: "YT", dial_code: "262" },
  { code: "ZA", dial_code: "27" },
  { code: "ZM", dial_code: "260" },
  { code: "ZW", dial_code: "263" },
];

// ═══════════════════════════════════════════════════════════════════════════
// iBOÎTE MODULE ENUMS (Digital Mail & Delivery Packages)
// ═══════════════════════════════════════════════════════════════════════════

export enum MailType {
  Letter = "letter",
  Email = "email",
}

export enum MailFolder {
  Inbox = "inbox",
  Sent = "sent",
  Archive = "archive",
  Trash = "trash",
}

export enum MailOwnerType {
  Profile = "profile",
  Organization = "organization",
  Association = "association",
  Company = "company",
}

export enum MailSenderType {
  Admin = "admin",
  Citizen = "citizen",
  System = "system",
  Organization = "organization",
  Association = "association",
  Company = "company",
}

export enum LetterType {
  ActionRequired = "action_required",
  Informational = "informational",
  Standard = "standard",
}

export enum StampColor {
  Red = "red",
  Blue = "blue",
  Green = "green",
}

export enum PackageStatus {
  Pending = "pending",
  InTransit = "in_transit",
  Delivered = "delivered",
  Available = "available",
  Returned = "returned",
}

export enum PackageEventType {
  Created = "created",
  Dispatched = "dispatched",
  InTransit = "in_transit",
  CustomsClearance = "customs_clearance",
  OutForDelivery = "out_for_delivery",
  Delivered = "delivered",
  Available = "available",
  Returned = "returned",
  Note = "note",
}
