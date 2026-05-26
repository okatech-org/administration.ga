import { v } from "convex/values";
import type { Infer } from "convex/values";
import {
  OrganizationType as OrgType,
  MinistrySubType,
  LocalAuthoritySubType,
  MemberRole,
  PublicUserType,
  RequestStatus,
  RequestPriority,
  DocumentStatus,
  Gender,
  ServiceCategory,
  MaritalStatus,
  WorkStatus as ProfessionStatus,
  NationalityAcquisition,
  FamilyLink,
  ActivityType as EventType,
  OwnerType,
  CountryCode,
  RegistrationDuration,
  RegistrationType,
  RegistrationStatus,
  PermissionEffect,
  FormFieldType,
  PostCategory,
  PostStatus,
  // CV module
  SkillLevel,
  LanguageLevel,
  // Association module
  AssociationType,
  AssociationRole,
  AssociationMemberStatus,
  AssociationClaimStatus,
  // Company module
  CompanyType,
  ActivitySector,
  CompanyRole,
  DocumentTypeCategory,
  DetailedDocumentType,
  // Child profile module
  ChildProfileStatus,
  ParentalRole,
  // Notification module
  NotificationType,
  // Tutorial module
  TutorialCategory,
  TutorialType,
  TutorialBadge,
  // iBoîte module
  MailType,
  MailFolder,
  MailOwnerType,
  MailSenderType,
  LetterType,
  StampColor,
  PackageStatus,
  PackageEventType,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "./constants";
import { countryCodeValidator } from "./countryCodeValidator";

// Re-export constants needed by other modules
export {
  MemberRole,
  RequestStatus,
  RequestPriority,
  DocumentStatus,
  OwnerType,
  ServiceCategory,
  CountryCode,
  RegistrationDuration,
  RegistrationType,
  RegistrationStatus,
  EventType,
  PostCategory,
  PostStatus,
  FamilyLink,
  NotificationType,
  TutorialCategory,
  TutorialType,
  TutorialBadge,
  TicketStatus,
  TicketPriority,
  TicketCategory,
};

// ============================================================================
// VALIDATORS
// ============================================================================

// Org types (all organization types)
//
// CONSERVÉ : tous les types diplomatiques historiques (embassy, consulate,
// high_representation, etc.) restent valides pour les données existantes du
// monorepo gabon-diplomatie.
//
// AJOUTÉ Phase 1 administration.ga : 12 types couvrant l'architecture
// institutionnelle de la 5e République gabonaise (cf. ADMINISTRATION.GA/
// 5e-Republique-Gabon-Institutions.md). Tous sont des unions additives — aucun
// type existant n'est retiré.
export const orgTypeValidator = v.union(
  // ─── Représentations diplomatiques (héritage) ────────────────
  v.literal(OrgType.Embassy),
  v.literal(OrgType.HighRepresentation),
  v.literal(OrgType.GeneralConsulate),
  v.literal(OrgType.HighCommission),
  v.literal(OrgType.PermanentMission),
  v.literal(OrgType.ThirdParty),
  v.literal(OrgType.Ministry),
  v.literal(OrgType.IntelligenceAgency),
  // ─── Legacy (compatibilité données existantes) ───────────────
  v.literal("consulate"),
  v.literal("honorary_consulate"),
  v.literal("other"),
  // ─── Administration nationale (Phase 1) ──────────────────────
  v.literal(OrgType.Presidency),
  v.literal(OrgType.VicePresidency),
  v.literal(OrgType.Government),
  v.literal(OrgType.DelegatedMinistry),
  v.literal(OrgType.DirectorateGeneral),
  v.literal(OrgType.PublicEstablishment),
  v.literal(OrgType.NationalAgency),
  v.literal(OrgType.IndependentAuthority),
  v.literal(OrgType.ParliamentChamber),
  v.literal(OrgType.SupremeCourt),
  v.literal(OrgType.ConsultativeInstitution),
  v.literal(OrgType.LocalAuthority),
);

// Sous-type d'un ministère (uniquement pertinent quand type === "ministry"
// ou "delegated_ministry"). Inclut les 28 portefeuilles de la 5e République
// 2026 + les valeurs legacy conservées pour compatibilité.
export const ministrySubTypeValidator = v.union(
  // ─── Legacy (conservé) ───────────────────────────────────────
  v.literal(MinistrySubType.ForeignAffairs),
  v.literal(MinistrySubType.Justice),
  v.literal(MinistrySubType.Finance),
  v.literal(MinistrySubType.Interior),
  v.literal(MinistrySubType.Other),
  // ─── 28 portefeuilles 5e République (Phase 1) ────────────────
  v.literal(MinistrySubType.EconomyFinance),
  v.literal(MinistrySubType.InteriorSecurity),
  v.literal(MinistrySubType.Defense),
  v.literal(MinistrySubType.EducationNational),
  v.literal(MinistrySubType.HigherEducation),
  v.literal(MinistrySubType.Health),
  v.literal(MinistrySubType.Agriculture),
  v.literal(MinistrySubType.FisheriesBlueEconomy),
  v.literal(MinistrySubType.WatersForestsEnvironment),
  v.literal(MinistrySubType.PetroleumGas),
  v.literal(MinistrySubType.MinesGeology),
  v.literal(MinistrySubType.TransportMarine),
  v.literal(MinistrySubType.PublicWorksConstruction),
  v.literal(MinistrySubType.HousingUrbanismCadastre),
  v.literal(MinistrySubType.IndustryLocalTransformation),
  v.literal(MinistrySubType.CommercePme),
  v.literal(MinistrySubType.DigitalEconomyInnovation),
  v.literal(MinistrySubType.CivilServiceCapacity),
  v.literal(MinistrySubType.LaborEmploymentDialogue),
  v.literal(MinistrySubType.SocialAffairsChildhoodWomen),
  v.literal(MinistrySubType.YouthSportsCultureArts),
  v.literal(MinistrySubType.SustainableTourismCrafts),
  v.literal(MinistrySubType.CommunicationMedia),
  v.literal(MinistrySubType.PlanningProspective),
  v.literal(MinistrySubType.ReformInstitutionsRelations),
  v.literal(MinistrySubType.WaterEnergyAccess),
  v.literal(MinistrySubType.Budget),
);

// Sous-type d'une collectivité locale (uniquement pertinent quand
// type === "local_authority"). Couvre les communes (mairies), provinces,
// départements, et conseils délibératifs. Cf. mairie.ga.
export const localAuthoritySubTypeValidator = v.union(
  v.literal(LocalAuthoritySubType.CommunePleinExercice),
  v.literal(LocalAuthoritySubType.CommuneMoyenExercice),
  v.literal(LocalAuthoritySubType.MairieArrondissement),
  v.literal(LocalAuthoritySubType.Province),
  v.literal(LocalAuthoritySubType.Departement),
  v.literal(LocalAuthoritySubType.Prefecture),
  v.literal(LocalAuthoritySubType.SousPrefecture),
  v.literal(LocalAuthoritySubType.ConseilMunicipal),
  v.literal(LocalAuthoritySubType.ConseilDepartemental),
  v.literal(LocalAuthoritySubType.ConseilProvincial),
  v.literal(LocalAuthoritySubType.Other),
);

// Public user types (for citizen profiles)
export const publicUserTypeValidator = v.union(
  v.literal(PublicUserType.LongStay),
  v.literal(PublicUserType.ShortStay),
  v.literal(PublicUserType.VisaTourism),
  v.literal(PublicUserType.VisaBusiness),
  v.literal(PublicUserType.VisaLongStay),
  v.literal(PublicUserType.AdminServices),
);

// Eligible profiles for services (array of PublicUserType)
export const eligibleProfilesValidator = v.array(publicUserTypeValidator);

// Member roles (all hierarchical roles)
export const memberRoleValidator = v.union(
  // Embassy roles
  v.literal(MemberRole.Ambassador),
  v.literal(MemberRole.FirstCounselor),
  v.literal(MemberRole.Paymaster),
  v.literal(MemberRole.EconomicCounselor),
  v.literal(MemberRole.SocialCounselor),
  v.literal(MemberRole.CommunicationCounselor),
  v.literal(MemberRole.Chancellor),
  v.literal(MemberRole.FirstSecretary),
  v.literal(MemberRole.Receptionist),
  // Consulate roles
  v.literal(MemberRole.ConsulGeneral),
  v.literal(MemberRole.Consul),
  v.literal(MemberRole.ViceConsul),
  v.literal(MemberRole.ConsularAffairsOfficer),
  v.literal(MemberRole.ConsularAgent),
  v.literal(MemberRole.Intern),
  // Generic roles
  v.literal(MemberRole.Admin),
  v.literal(MemberRole.Agent),
  v.literal(MemberRole.Viewer),
  // PNPE roles (Phase 7)
  v.literal(MemberRole.DemandeurEmploi),
  v.literal(MemberRole.Employeur),
  v.literal(MemberRole.ConseillerPnpe),
  v.literal(MemberRole.ChefAntennePnpe),
  v.literal(MemberRole.DirectionPnpe),
  v.literal(MemberRole.FormateurAutoEmploi),
  v.literal(MemberRole.AdminMinistereTravail),
);

// Request status (11 statuts - workflow complet)
export const requestStatusValidator = v.union(
  // Création
  v.literal(RequestStatus.Draft),
  v.literal(RequestStatus.Submitted),
  // Traitement
  v.literal(RequestStatus.Pending),
  v.literal(RequestStatus.UnderReview),
  v.literal(RequestStatus.InProduction),
  // Finalisation
  v.literal(RequestStatus.Validated),
  v.literal(RequestStatus.Rejected),
  v.literal(RequestStatus.AppointmentScheduled),
  v.literal(RequestStatus.ReadyForPickup),
  // Terminal
  v.literal(RequestStatus.Completed),
  v.literal(RequestStatus.Cancelled),
);

// Request priority
export const requestPriorityValidator = v.union(
  v.literal(RequestPriority.Normal),
  v.literal(RequestPriority.Urgent),
  v.literal(RequestPriority.Critical),
);

// Ticket status
export const ticketStatusValidator = v.union(
  v.literal(TicketStatus.Open),
  v.literal(TicketStatus.InProgress),
  v.literal(TicketStatus.WaitingForUser),
  v.literal(TicketStatus.Resolved),
  v.literal(TicketStatus.Closed),
);

// Ticket priority
export const ticketPriorityValidator = v.union(
  v.literal(TicketPriority.Low),
  v.literal(TicketPriority.Medium),
  v.literal(TicketPriority.High),
  v.literal(TicketPriority.Critical),
);

// Ticket category
export const ticketCategoryValidator = v.union(
  v.literal(TicketCategory.Technical),
  v.literal(TicketCategory.Service),
  v.literal(TicketCategory.Information),
  v.literal(TicketCategory.Feedback),
  v.literal(TicketCategory.Other),
);

// Document status
export const documentStatusValidator = v.union(
  v.literal(DocumentStatus.Pending),
  v.literal(DocumentStatus.Validated),
  v.literal(DocumentStatus.Rejected),
  v.literal(DocumentStatus.Expired),
  v.literal(DocumentStatus.Expiring),
);

// Gender
export const genderValidator = v.union(
  v.literal(Gender.Male),
  v.literal(Gender.Female),
);

// Service category
export const serviceCategoryValidator = v.union(
  v.literal(ServiceCategory.Notification),
  v.literal(ServiceCategory.Passport),
  v.literal(ServiceCategory.Identity),
  v.literal(ServiceCategory.CivilStatus),
  v.literal(ServiceCategory.Visa),
  v.literal(ServiceCategory.Certification),
  v.literal(ServiceCategory.Registration),
  v.literal(ServiceCategory.Assistance),
  v.literal(ServiceCategory.TravelDocument),
  v.literal(ServiceCategory.Transcript),
  v.literal(ServiceCategory.Declaration),
  v.literal(ServiceCategory.Other),
  // Municipal categories (Phase mairie.ga)
  v.literal(ServiceCategory.Urbanism),
  v.literal(ServiceCategory.Fiscal),
  v.literal(ServiceCategory.Business),
  v.literal(ServiceCategory.Environment),
  v.literal(ServiceCategory.PublicWorks),
);

// Owner type for documents
export const ownerTypeValidator = v.union(
  v.literal(OwnerType.Profile),
  v.literal(OwnerType.Request),
  v.literal(OwnerType.User),
  v.literal(OwnerType.Organization),
  v.literal(OwnerType.ChildProfile),
);

// Event target type - the entity type being tracked
export const eventTargetTypeValidator = v.union(
  v.literal("request"),
  v.literal("profile"),
  v.literal("document"),
);

export const maritalStatusValidator = v.union(
  v.literal(MaritalStatus.Single),
  v.literal(MaritalStatus.Married),
  v.literal(MaritalStatus.Divorced),
  v.literal(MaritalStatus.Widowed),
  v.literal(MaritalStatus.CivilUnion),
  v.literal(MaritalStatus.Cohabiting),
);

export const professionStatusValidator = v.union(
  v.literal(ProfessionStatus.Employee),
  v.literal(ProfessionStatus.Unemployed),
  v.literal(ProfessionStatus.Retired),
  v.literal(ProfessionStatus.Student),
  v.literal(ProfessionStatus.SelfEmployed),
  v.literal(ProfessionStatus.Entrepreneur),
  v.literal(ProfessionStatus.Other),
);

export const nationalityAcquisitionValidator = v.union(
  v.literal(NationalityAcquisition.Birth),
  v.literal(NationalityAcquisition.Marriage),
  v.literal(NationalityAcquisition.Naturalization),
  v.literal(NationalityAcquisition.Other),
);

export const familyLinkValidator = v.union(
  v.literal(FamilyLink.Father),
  v.literal(FamilyLink.Mother),
  v.literal(FamilyLink.Spouse),
  v.literal(FamilyLink.Child),
  v.literal(FamilyLink.BrotherSister),
  v.literal(FamilyLink.LegalGuardian),
  v.literal(FamilyLink.Other),
);

// Registration validators
export const registrationDurationValidator = v.union(
  v.literal(PublicUserType.ShortStay),
  v.literal(PublicUserType.LongStay),
);

export const registrationTypeValidator = v.union(
  v.literal(RegistrationType.Inscription),
  v.literal(RegistrationType.Renewal),
  v.literal(RegistrationType.Modification),
);

export const registrationStatusValidator = v.union(
  v.literal(RegistrationStatus.Requested),
  v.literal(RegistrationStatus.Active),
  v.literal(RegistrationStatus.Expired),
);

// Permission effect
export const permissionEffectValidator = v.union(
  v.literal(PermissionEffect.Grant),
  v.literal(PermissionEffect.Deny),
);

// ============================================================================
// CV MODULE VALIDATORS
// ============================================================================

export const skillLevelValidator = v.union(
  v.literal(SkillLevel.Beginner),
  v.literal(SkillLevel.Intermediate),
  v.literal(SkillLevel.Advanced),
  v.literal(SkillLevel.Expert),
);

export const languageLevelValidator = v.union(
  v.literal(LanguageLevel.A1),
  v.literal(LanguageLevel.A2),
  v.literal(LanguageLevel.B1),
  v.literal(LanguageLevel.B2),
  v.literal(LanguageLevel.C1),
  v.literal(LanguageLevel.C2),
  v.literal(LanguageLevel.Native),
);

// ============================================================================
// ASSOCIATION MODULE VALIDATORS
// ============================================================================

export const associationTypeValidator = v.union(
  v.literal(AssociationType.Cultural),
  v.literal(AssociationType.Sports),
  v.literal(AssociationType.Religious),
  v.literal(AssociationType.Professional),
  v.literal(AssociationType.Solidarity),
  v.literal(AssociationType.Education),
  v.literal(AssociationType.Youth),
  v.literal(AssociationType.Women),
  v.literal(AssociationType.Student),
  v.literal(AssociationType.Other),
);

export const associationRoleValidator = v.union(
  v.literal(AssociationRole.President),
  v.literal(AssociationRole.VicePresident),
  v.literal(AssociationRole.Secretary),
  v.literal(AssociationRole.Treasurer),
  v.literal(AssociationRole.Member),
);

export const associationMemberStatusValidator = v.union(
  v.literal(AssociationMemberStatus.Pending),
  v.literal(AssociationMemberStatus.Accepted),
  v.literal(AssociationMemberStatus.Declined),
);

export const associationClaimStatusValidator = v.union(
  v.literal(AssociationClaimStatus.Pending),
  v.literal(AssociationClaimStatus.Approved),
  v.literal(AssociationClaimStatus.Rejected),
);

// ============================================================================
// COMPANY MODULE VALIDATORS
// ============================================================================

export const companyTypeValidator = v.union(
  v.literal(CompanyType.SARL),
  v.literal(CompanyType.SA),
  v.literal(CompanyType.SAS),
  v.literal(CompanyType.SASU),
  v.literal(CompanyType.EURL),
  v.literal(CompanyType.EI),
  v.literal(CompanyType.AutoEntrepreneur),
  v.literal(CompanyType.Other),
);

export const activitySectorValidator = v.union(
  v.literal(ActivitySector.Technology),
  v.literal(ActivitySector.Commerce),
  v.literal(ActivitySector.Services),
  v.literal(ActivitySector.Industry),
  v.literal(ActivitySector.Agriculture),
  v.literal(ActivitySector.Health),
  v.literal(ActivitySector.Education),
  v.literal(ActivitySector.Culture),
  v.literal(ActivitySector.Tourism),
  v.literal(ActivitySector.Transport),
  v.literal(ActivitySector.Construction),
  v.literal(ActivitySector.Other),
);

export const companyRoleValidator = v.union(
  v.literal(CompanyRole.CEO),
  v.literal(CompanyRole.Owner),
  v.literal(CompanyRole.President),
  v.literal(CompanyRole.Director),
  v.literal(CompanyRole.Manager),
);

// ============================================================================
// DOCUMENT CATEGORY VALIDATORS
// ============================================================================

/**
 * Document type category validator - 18 main categories
 */
export const documentTypeCategoryValidator = v.union(
  v.literal(DocumentTypeCategory.Forms),
  v.literal(DocumentTypeCategory.Identity),
  v.literal(DocumentTypeCategory.CivilStatus),
  v.literal(DocumentTypeCategory.Nationality),
  v.literal(DocumentTypeCategory.Residence),
  v.literal(DocumentTypeCategory.Employment),
  v.literal(DocumentTypeCategory.Income),
  v.literal(DocumentTypeCategory.Certificates),
  v.literal(DocumentTypeCategory.OfficialCertificates),
  v.literal(DocumentTypeCategory.Justice),
  v.literal(DocumentTypeCategory.AdministrativeDecisions),
  v.literal(DocumentTypeCategory.Housing),
  v.literal(DocumentTypeCategory.Vehicle),
  v.literal(DocumentTypeCategory.Education),
  v.literal(DocumentTypeCategory.LanguageIntegration),
  v.literal(DocumentTypeCategory.Health),
  v.literal(DocumentTypeCategory.Taxation),
  v.literal(DocumentTypeCategory.Other),
);

/**
 * Detailed document type validator - 95 specific document types
 */
export const detailedDocumentTypeValidator = v.union(
  // Forms / Formulaires et demandes
  v.literal(DetailedDocumentType.CerfaForm),
  v.literal(DetailedDocumentType.OnlineFormPrinted),
  v.literal(DetailedDocumentType.HandwrittenRequest),
  v.literal(DetailedDocumentType.MotivationLetter),
  v.literal(DetailedDocumentType.AdministrativeLetterTemplate),
  // Identity / Pièces d'identité
  v.literal(DetailedDocumentType.NationalIdCard),
  v.literal(DetailedDocumentType.Passport),
  v.literal(DetailedDocumentType.ResidencePermit),
  v.literal(DetailedDocumentType.DriverLicense),
  v.literal(DetailedDocumentType.ResidentCard),
  v.literal(DetailedDocumentType.ResidencePermitReceipt),
  v.literal(DetailedDocumentType.VitaleCardCertificate),
  // Civil Status / État civil et famille
  v.literal(DetailedDocumentType.BirthCertificate),
  v.literal(DetailedDocumentType.MarriageCertificate),
  v.literal(DetailedDocumentType.DeathCertificate),
  v.literal(DetailedDocumentType.FamilyBook),
  v.literal(DetailedDocumentType.DivorceJudgment),
  v.literal(DetailedDocumentType.AdoptionJudgment),
  v.literal(DetailedDocumentType.SingleStatusCertificate),
  v.literal(DetailedDocumentType.FamilyRecordBook),
  // Nationality / Nationalité
  v.literal(DetailedDocumentType.NationalityCertificate),
  v.literal(DetailedDocumentType.NationalityAcquisitionDeclaration),
  v.literal(DetailedDocumentType.NaturalizationFile),
  // Residence / Justificatif de domicile
  v.literal(DetailedDocumentType.ProofOfAddress),
  v.literal(DetailedDocumentType.WaterBill),
  v.literal(DetailedDocumentType.ElectricityBill),
  v.literal(DetailedDocumentType.GasBill),
  v.literal(DetailedDocumentType.LandlinePhoneBill),
  v.literal(DetailedDocumentType.MobilePhoneBill),
  v.literal(DetailedDocumentType.InternetBill),
  v.literal(DetailedDocumentType.RentReceipt),
  v.literal(DetailedDocumentType.LeaseAgreement),
  v.literal(DetailedDocumentType.PropertyTitle),
  v.literal(DetailedDocumentType.HousingTax),
  v.literal(DetailedDocumentType.PropertyTax),
  v.literal(DetailedDocumentType.TaxNoticeWithAddress),
  v.literal(DetailedDocumentType.HomeInsuranceCertificate),
  v.literal(DetailedDocumentType.DomiciliationCertificate),
  v.literal(DetailedDocumentType.HostingCertificate),
  v.literal(DetailedDocumentType.NursingHomeResidenceCertificate),
  v.literal(DetailedDocumentType.CampingHotelResidenceCertificate),
  // Employment / Situation professionnelle
  v.literal(DetailedDocumentType.EmploymentContract),
  v.literal(DetailedDocumentType.EmployerCertificate),
  v.literal(DetailedDocumentType.WorkCertificate),
  v.literal(DetailedDocumentType.PoleEmploiCertificate),
  v.literal(DetailedDocumentType.InternshipCertificate),
  v.literal(DetailedDocumentType.KbisExtract),
  v.literal(DetailedDocumentType.CompanyStatutes),
  v.literal(DetailedDocumentType.RcsRmRegistration),
  v.literal(DetailedDocumentType.SchoolCertificate),
  v.literal(DetailedDocumentType.ApprenticeshipContract),
  // Income / Ressources et situation financière
  v.literal(DetailedDocumentType.PaySlip),
  v.literal(DetailedDocumentType.TaxNotice),
  v.literal(DetailedDocumentType.NonTaxationCertificate),
  v.literal(DetailedDocumentType.BankStatement),
  v.literal(DetailedDocumentType.CafStatement),
  v.literal(DetailedDocumentType.RetirementPensionCertificate),
  v.literal(DetailedDocumentType.DisabilityPensionCertificate),
  v.literal(DetailedDocumentType.AahCertificate),
  v.literal(DetailedDocumentType.OtherSocialBenefitCertificate),
  v.literal(DetailedDocumentType.SavingsProof),
  // Certificates / Attestations diverses
  v.literal(DetailedDocumentType.HonorDeclaration),
  v.literal(DetailedDocumentType.DetailedHostingCertificate),
  v.literal(DetailedDocumentType.SimpleHomeInsuranceCertificate),
  v.literal(DetailedDocumentType.LiabilityInsuranceCertificate),
  v.literal(DetailedDocumentType.VehicleInsuranceCertificate),
  v.literal(DetailedDocumentType.SimpleEmployerCertificate),
  v.literal(DetailedDocumentType.VolunteerCertificate),
  v.literal(DetailedDocumentType.AttendanceCertificate),
  // Official Certificates / Certificats officiels
  v.literal(DetailedDocumentType.MedicalCertificate),
  v.literal(DetailedDocumentType.SchoolEnrollmentCertificate),
  v.literal(DetailedDocumentType.NationalityCertificateOfficial),
  v.literal(DetailedDocumentType.HostingCertificateOfficial),
  v.literal(DetailedDocumentType.GoodConductCertificate),
  // Justice / Justice et casier judiciaire
  v.literal(DetailedDocumentType.CriminalRecordB3),
  v.literal(DetailedDocumentType.CriminalRecordB2),
  v.literal(DetailedDocumentType.CourtDecision),
  v.literal(DetailedDocumentType.CourtOrder),
  // Administrative Decisions / Décisions administratives
  v.literal(DetailedDocumentType.AdministrativeDecision),
  v.literal(DetailedDocumentType.MunicipalPrefectoralOrder),
  v.literal(DetailedDocumentType.RightsNotification),
  // Housing / Logement et location
  v.literal(DetailedDocumentType.CompleteTenantFile),
  v.literal(DetailedDocumentType.HousingLeaseAgreement),
  v.literal(DetailedDocumentType.RentReceiptHistory),
  v.literal(DetailedDocumentType.GuarantorCommitment),
  v.literal(DetailedDocumentType.GuarantorDocuments),
  v.literal(DetailedDocumentType.HousingHostingCertificate),
  // Vehicle / Véhicule et conduite
  v.literal(DetailedDocumentType.VehicleRegistration),
  v.literal(DetailedDocumentType.VehicleTransferCertificate),
  v.literal(DetailedDocumentType.TechnicalInspectionReport),
  v.literal(DetailedDocumentType.DriverLicenseDoc),
  v.literal(DetailedDocumentType.VehicleInsuranceDoc),
  // Education / Études et formation
  v.literal(DetailedDocumentType.Diploma),
  v.literal(DetailedDocumentType.Transcript),
  v.literal(DetailedDocumentType.SchoolCertificateEducation),
  v.literal(DetailedDocumentType.TrainingCertificate),
  // Language Integration / Langue et intégration
  v.literal(DetailedDocumentType.LanguageTestCertificate),
  v.literal(DetailedDocumentType.IntegrationCertificate),
  // Health / Santé et handicap
  v.literal(DetailedDocumentType.DetailedMedicalCertificate),
  v.literal(DetailedDocumentType.SocialCoverageCertificate),
  v.literal(DetailedDocumentType.DisabilityCard),
  v.literal(DetailedDocumentType.MdphDecision),
  // Taxation / Fiscalité
  v.literal(DetailedDocumentType.DetailedTaxNotice),
  v.literal(DetailedDocumentType.NonTaxationCertificateFiscal),
  v.literal(DetailedDocumentType.TaxPaymentProof),
  v.literal(DetailedDocumentType.FiscalStamp),
  // Other / Autres documents
  v.literal(DetailedDocumentType.IdentityPhoto),
  v.literal(DetailedDocumentType.ForeignCivilStatusDocument),
  v.literal(DetailedDocumentType.SwornTranslation),
  v.literal(DetailedDocumentType.PowerOfAttorney),
  v.literal(DetailedDocumentType.OtherOfficialDocument),
);

// ============================================================================
// CHILD PROFILE VALIDATORS
// ============================================================================

export const childProfileStatusValidator = v.union(
  v.literal(ChildProfileStatus.Draft),
  v.literal(ChildProfileStatus.Pending),
  v.literal(ChildProfileStatus.Active),
  v.literal(ChildProfileStatus.Inactive),
);

export const parentalRoleValidator = v.union(
  v.literal(ParentalRole.Father),
  v.literal(ParentalRole.Mother),
  v.literal(ParentalRole.LegalGuardian),
);

// ============================================================================
// SHARED OBJECT VALIDATORS
// ============================================================================

// Address
export const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  postalCode: v.string(),
  country: countryCodeValidator,
  coordinates: v.optional(
    v.object({
      lat: v.number(),
      lng: v.number(),
    }),
  ),
});

export type Address = Infer<typeof addressValidator>;

// Working hours slot
export const timeSlotValidator = v.object({
  start: v.string(), // "09:00"
  end: v.string(), // "17:00"
  isOpen: v.optional(v.boolean()),
});

export type TimeSlot = Infer<typeof timeSlotValidator>;

// ============================================================================
// PHASE 2 — Sous-objets de communication (iAppel, iBoîte, Notifications, Chats)
// Tous optionnels dans orgSettings pour widen-migrate-narrow
// ============================================================================

// ─── iAppel : paramètres globaux ───────────────────────────
export const callsRecordingConfigValidator = v.object({
  enabled: v.boolean(),
  autoStart: v.optional(v.boolean()),
  retentionDays: v.number(),
  storageProvider: v.optional(
    v.union(v.literal("livekit"), v.literal("s3")),
  ),
  citizenConsentRequired: v.boolean(),
});

export const callsConfigValidator = v.object({
  // Paramètres globaux
  ringTimeoutSeconds: v.optional(v.number()), // défaut 60s
  maxCallDurationMinutes: v.optional(v.number()),
  defaultCallMediaType: v.optional(
    v.union(v.literal("audio"), v.literal("video")),
  ),

  // Participants
  maxParticipantsCall: v.optional(v.number()),
  maxParticipantsMeeting: v.optional(v.number()),

  // Recording
  recording: v.optional(callsRecordingConfigValidator),

  // Qualité
  audioCodec: v.optional(v.string()),
  videoCodec: v.optional(v.string()),
  adaptiveStreaming: v.optional(v.boolean()),

  // Fenêtres d'acceptation
  acceptanceWindows: v.optional(
    v.object({
      businessHours: v.boolean(),
      emergencyOverride: v.boolean(),
    }),
  ),

  // Fallback global
  noAgentAvailableAction: v.optional(
    v.union(
      v.literal("voicemail"),
      v.literal("callback_request"),
      v.literal("disconnect"),
    ),
  ),
  voicemailGreeting: v.optional(v.string()),
});

export type CallsConfig = Infer<typeof callsConfigValidator>;

// ─── iBoîte : config par org ───────────────────────────────
export const mailStampValidator = v.object({
  code: v.string(),
  label: v.string(),
  storageId: v.id("_storage"),
  position: v.union(
    v.literal("top_right"),
    v.literal("bottom_center"),
    v.literal("signature_area"),
  ),
  opacity: v.number(),
  colorVariant: v.optional(
    v.union(v.literal("red"), v.literal("blue"), v.literal("green")),
  ),
});

export const mailReplyTemplateValidator = v.object({
  code: v.string(),
  label: v.string(),
  subject: v.string(),
  bodyHtml: v.string(),
  category: v.optional(
    v.union(
      v.literal("accueil"),
      v.literal("refus"),
      v.literal("information"),
      v.literal("urgence"),
    ),
  ),
});

export const internalMailConfigValidator = v.object({
  stamps: v.optional(v.array(mailStampValidator)),
  defaultSignature: v.optional(
    v.object({
      html: v.string(),
      imageStorageId: v.optional(v.id("_storage")),
    }),
  ),
  replyTemplates: v.optional(v.array(mailReplyTemplateValidator)),
  autoResponder: v.optional(
    v.object({
      enabled: v.boolean(),
      startAt: v.optional(v.number()),
      endAt: v.optional(v.number()),
      message: v.string(),
      applyToCategories: v.optional(v.array(v.string())),
    }),
  ),
  autoCategorization: v.optional(
    v.object({
      enabled: v.boolean(),
      rules: v.array(
        v.object({
          keywords: v.array(v.string()),
          folder: v.string(),
          priority: v.number(),
        }),
      ),
    }),
  ),
});

export type InternalMailConfig = Infer<typeof internalMailConfigValidator>;

// ─── Notifications par org ─────────────────────────────────
export const notificationEventValidator = v.object({
  eventCode: v.string(), // ex: "request.created"
  enabledChannels: v.array(v.string()), // ["inApp","email","sms","whatsapp","push"]
  templateOverrides: v.optional(
    v.object({
      subjectFr: v.optional(v.string()),
      subjectEn: v.optional(v.string()),
      bodyFr: v.optional(v.string()),
      bodyEn: v.optional(v.string()),
    }),
  ),
  priority: v.optional(
    v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("critical"),
    ),
  ),
});

export const notificationsConfigValidator = v.object({
  channels: v.object({
    inApp: v.boolean(),
    email: v.boolean(),
    sms: v.boolean(),
    whatsapp: v.optional(v.boolean()),
    push: v.optional(v.boolean()),
  }),
  events: v.optional(v.array(notificationEventValidator)),
  quietHours: v.optional(
    v.object({
      enabled: v.boolean(),
      startHour: v.number(), // 0-23
      endHour: v.number(), // 0-23
      timezone: v.optional(v.string()),
      channelsAffected: v.array(v.string()),
    }),
  ),
  escalation: v.optional(
    v.object({
      enabled: v.boolean(),
      noResponseAfterHours: v.number(),
      escalateToMembershipIds: v.array(v.id("memberships")),
      maxReminders: v.number(),
    }),
  ),
  senderConfig: v.optional(
    v.object({
      smsSenderName: v.optional(v.string()), // ex: "GABON-MAD"
      smsBirdChannelId: v.optional(v.string()),
      emailFromName: v.optional(v.string()),
      emailReplyTo: v.optional(v.string()),
    }),
  ),
});

export type NotificationsConfig = Infer<typeof notificationsConfigValidator>;

// ─── Chats P2P : config par org ───────────────────────────
export const chatsConfigValidator = v.object({
  allowCitizenInitiated: v.optional(v.boolean()), // défaut false
  standardRoutingRules: v.optional(
    v.object({
      enabledByDefault: v.boolean(),
      routingMembershipIds: v.array(v.id("memberships")),
      fairAssignment: v.union(
        v.literal("round_robin"),
        v.literal("least_busy"),
      ),
    }),
  ),
  autoArchiveAfterInactiveDays: v.optional(v.number()),
  allowFileAttachments: v.optional(v.boolean()),
  maxAttachmentSizeMb: v.optional(v.number()),
});

export type ChatsConfig = Infer<typeof chatsConfigValidator>;

// Org settings
export const orgSettingsValidator = v.object({
  appointmentBuffer: v.number(),
  maxActiveRequests: v.number(),
  workingHours: v.record(v.string(), v.array(timeSlotValidator)),
  registrationDurationYears: v.optional(v.number()), // Default: 5 years

  // ── Request processing ──
  requestAssignment: v.optional(
    v.union(v.literal("manual"), v.literal("auto")),
  ), // Default: "manual"
  defaultProcessingDays: v.optional(v.number()), // SLA in days
  aiAnalysisEnabled: v.optional(v.boolean()), // Default: true

  // ── iCorrespondance ──
  correspondanceConfig: v.optional(v.object({
    isEnabled: v.boolean(),
    defaultReferencePattern: v.optional(v.string()),
    registreCourrier: v.optional(v.object({
      prefixArrivee: v.string(),
      prefixDepart: v.string(),
      numerotationAnnuelle: v.boolean(),
    })),
    approbationGlobale: v.optional(v.object({
      autoRouteByHierarchy: v.boolean(),
      chefDePosteRequired: v.boolean(),
    })),
    typesActifs: v.optional(v.array(v.string())),
    signatureConfig: v.optional(v.object({
      signatureElectronique: v.boolean(),
      cachetOrganisme: v.boolean(),
      cachetStorageId: v.optional(v.id("_storage")),
    })),
    watermarkConfig: v.optional(v.object({
      enabled: v.boolean(),
      text: v.string(),
      opacity: v.number(),
      rotation: v.optional(v.number()),
    })),
    deadlinesByType: v.optional(v.array(v.object({
      typeCode: v.string(),
      standardDays: v.number(),
      urgentDays: v.optional(v.number()),
      maxDays: v.optional(v.number()),
      escalationMembershipIds: v.optional(v.array(v.id("memberships"))),
    }))),
    // Adresse email qui reçoit les courriers externes pour cette org.
    // Le webhook /webhooks/correspondance-inbound résout l'org via cette adresse.
    inboundEmailAddress: v.optional(v.string()),
  })),

  // ── Carte consulaire & impression ──
  printEnabled: v.optional(v.boolean()),
  defaultCardDesignId: v.optional(v.id("cardDesigns")),
  printConfig: v.optional(v.object({
    headerText: v.optional(v.string()),
    footerText: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
  })),

  // ── PHASE 2 : Canaux de communication internes ──
  calls: v.optional(callsConfigValidator),
  internalMail: v.optional(internalMailConfigValidator),
  notifications: v.optional(notificationsConfigValidator),
  chats: v.optional(chatsConfigValidator),
});

export type OrgSettings = Infer<typeof orgSettingsValidator>;



// Weekly schedule for opening hours.
// Chaque jour peut être :
//   - undefined : non défini
//   - { closed: true } : fermé toute la journée
//   - { open, close } : un seul créneau (legacy, accepté en lecture)
//   - DaySchedule[] : plusieurs créneaux (ex. matin 9h-12h + après-midi 14h-17h)
export const dayScheduleValidator = v.object({
  open: v.optional(v.string()), // "09:00" - optional when closed
  close: v.optional(v.string()), // "17:00" - optional when closed
  closed: v.optional(v.boolean()),
});

const daySlotsValidator = v.union(
  dayScheduleValidator,
  v.array(dayScheduleValidator),
);

export const weeklyScheduleValidator = v.object({
  monday: v.optional(daySlotsValidator),
  tuesday: v.optional(daySlotsValidator),
  wednesday: v.optional(daySlotsValidator),
  thursday: v.optional(daySlotsValidator),
  friday: v.optional(daySlotsValidator),
  saturday: v.optional(daySlotsValidator),
  sunday: v.optional(daySlotsValidator),
  notes: v.optional(v.string()), // "Closed on public holidays"
});

export type DaySchedule = Infer<typeof dayScheduleValidator>;
export type WeeklySchedule = Infer<typeof weeklyScheduleValidator>;

// Pricing
export const pricingValidator = v.object({
  amount: v.number(),
  currency: v.string(),
});

export type Pricing = Infer<typeof pricingValidator>;

export const localizedStringValidator = v.record(v.string(), v.string());

export type LocalizedString = Infer<typeof localizedStringValidator>;

// ============================================================================
// ORG EXTENDED VALIDATORS (Phase 1 Fondations)
// Nouveaux sous-objets optionnels pour le paramétrage complet d'une
// représentation : identité étendue, protocole, adresses structurées,
// juridictions enrichies, branding. Tous optionnels → pattern widen-migrate-narrow.
// ============================================================================

// Grade diplomatique du chef de poste
export const headOfMissionGradeValidator = v.union(
  v.literal("ambassadeur"),
  v.literal("ambassadeur_extraordinaire"),
  v.literal("ministre_plenipotentiaire"),
  v.literal("consul_general"),
  v.literal("consul"),
  v.literal("charge_affaires"),
  v.literal("haut_commissaire"),
  v.literal("representant_permanent"),
  v.literal("consul_honoraire"),
);

export type HeadOfMissionGrade = Infer<typeof headOfMissionGradeValidator>;

// Statut cycle de vie de la représentation
export const orgStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("draft"), // en projet, pas encore opérationnel
  v.literal("maintenance"), // mode maintenance
  v.literal("archived"), // archivé, lecture seule
  v.literal("suspended"), // suspendu temporairement
);

export type OrgStatus = Infer<typeof orgStatusValidator>;

// Identité étendue (accréditation, cycle de vie).
// Le nom multilingue n'est plus ici — il est porté par `org.nameI18n`
// (LocalizedString). `officialName` et `officialNameLocal` sont conservés
// optionnels pour tolérer les rows existants jusqu'à la migration.
export const orgIdentityExtendedValidator = v.object({
  /** @deprecated Utiliser `org.nameI18n.fr` */
  officialName: v.optional(v.string()),
  /** @deprecated Utiliser `org.nameI18n.<langue locale>` */
  officialNameLocal: v.optional(v.string()),
  accreditedTo: v.optional(v.array(countryCodeValidator)), // pays d'accréditation
  status: v.optional(orgStatusValidator),
  openedAt: v.optional(v.number()), // date d'ouverture
  closedAt: v.optional(v.number()), // date de fermeture
  operationalMode: v.optional(v.string()),
  regionalRole: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
});

export type OrgIdentityExtended = Infer<typeof orgIdentityExtendedValidator>;

// Protocole diplomatique (chef de poste, credentials)
export const orgProtocolValidator = v.object({
  headOfMissionUserId: v.optional(v.id("users")),
  headOfMissionMembershipId: v.optional(v.id("memberships")),
  headOfMissionGrade: v.optional(headOfMissionGradeValidator),
  headOfMissionTitleFr: v.optional(v.string()), // "Ambassadeur extraordinaire et plénipotentiaire"
  headOfMissionTitleEn: v.optional(v.string()),
  credentialsPresentedAt: v.optional(v.number()), // lettres de créance présentées
  exequaturGrantedAt: v.optional(v.number()), // exequatur accordé (consuls)
  officialPhotoStorageId: v.optional(v.id("_storage")),
});

export type OrgProtocol = Infer<typeof orgProtocolValidator>;

// Adresses structurées (physique, postale, correspondance)
export const orgAddressesValidator = v.object({
  physical: addressValidator, // adresse bâtiment principal
  postal: v.optional(addressValidator), // PO Box ou adresse postale distincte
  correspondence: v.optional(v.string()), // texte libre pour courrier
});

export type OrgAddresses = Infer<typeof orgAddressesValidator>;

// Sous-juridiction (consulat honoraire rattaché, antenne)
export const subJurisdictionValidator = v.object({
  name: v.string(),
  countryCode: countryCodeValidator,
  city: v.optional(v.string()),
  honoraryConsulateOrgId: v.optional(v.id("orgs")),
  servicesAuthorized: v.optional(v.array(v.string())), // codes de services autorisés
  contactName: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
});

export type SubJurisdiction = Infer<typeof subJurisdictionValidator>;

// Juridiction enrichie (primaire/secondaire + sous-juridictions)
export const orgJurisdictionValidator = v.object({
  primary: v.array(countryCodeValidator), // pays principaux
  secondary: v.optional(v.array(countryCodeValidator)), // pays en services limités
  subJurisdictions: v.optional(v.array(subJurisdictionValidator)),
  notes: v.optional(v.string()),
});

export type OrgJurisdiction = Infer<typeof orgJurisdictionValidator>;

// Couleurs de marque
export const brandColorsValidator = v.object({
  primary: v.string(), // "#0A3172"
  secondary: v.optional(v.string()),
  accent: v.optional(v.string()),
});

export type BrandColors = Infer<typeof brandColorsValidator>;

// Description publique multilingue. Toutes les locales sont optionnelles —
// l'UI doit afficher une version par défaut quand la locale demandée est absente
// (cf. helper `getLocalized`).
export const publicDescriptionValidator = v.object({
  fr: v.optional(v.string()),
  en: v.optional(v.string()),
  local: v.optional(v.string()), // langue du pays hôte (ex: es pour Espagne)
});

export type PublicDescription = Infer<typeof publicDescriptionValidator>;

// Photo de la représentation (galerie)
export const orgPhotoValidator = v.object({
  storageId: v.id("_storage"),
  caption: v.optional(v.string()),
  order: v.number(),
});

export type OrgPhoto = Infer<typeof orgPhotoValidator>;

// Liens réseaux sociaux
export const socialLinksValidator = v.object({
  facebook: v.optional(v.string()),
  twitter: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  instagram: v.optional(v.string()),
  youtube: v.optional(v.string()),
});

export type SocialLinks = Infer<typeof socialLinksValidator>;

// Branding (page publique + identité visuelle + personnalisation documentaire)
export const orgBrandingValidator = v.object({
  logoStorageId: v.optional(v.id("_storage")), // logo principal (remplace logoUrl plat)
  logoCompactStorageId: v.optional(v.id("_storage")), // version compacte (sidebar)
  bannerStorageId: v.optional(v.id("_storage")), // bannière page publique
  colors: v.optional(brandColorsValidator),
  publicDescription: v.optional(publicDescriptionValidator),
  photos: v.optional(v.array(orgPhotoValidator)),
  socialLinks: v.optional(socialLinksValidator),
  publishNews: v.optional(v.boolean()), // actualités visibles page publique
  // ─── Personnalisation documentaire ────────────────────────────────
  // Ces champs surchargent l'entête / pied / signataire / ville des 25
  // modèles diplomatiques globaux lors du rendu PDF. Le sceau, lui, reste
  // identique pour toutes les représentations (pinned dans le template).
  headerLines: v.optional(v.array(v.string())), // ex : ["AMBASSADE DU GABON", "PRÈS LA RÉPUBLIQUE FRANÇAISE"]
  footerAddress: v.optional(v.string()),
  footerPhone: v.optional(v.string()),
  footerEmail: v.optional(v.string()),
  signerName: v.optional(v.string()), // ex : "Jean-Pierre NZOGHE-NGUEMA"
  signerTitle: v.optional(v.string()), // ex : "Conseiller chargé des Affaires Consulaires"
  cityName: v.optional(v.string()), // ex : "Paris" → remplace "Madrid" hérité
  // Infos d'accès affichées sur la page publique de la représentation
  accessInfo: v.optional(
    v.object({
      accessibilityNotesFr: v.optional(v.string()),
      accessibilityNotesEn: v.optional(v.string()),
      transportFr: v.optional(v.string()),
      transportEn: v.optional(v.string()),
      parkingNotesFr: v.optional(v.string()),
      parkingNotesEn: v.optional(v.string()),
      walkingTimeMinutes: v.optional(v.number()),
    }),
  ),
});

export type OrgBranding = Infer<typeof orgBrandingValidator>;

// Required document definition (label is localized)
// Les champs `description`, `format` et `group` sont éditoriaux : ils
// alimentent la liste « Pièces à fournir » de la page publique de détail
// service. Optionnels — n'impactent pas les usages historiques (formSchema
// dynamique, orgServices anciennement constitués).
export const formDocumentValidator = v.object({
  type: detailedDocumentTypeValidator,
  label: localizedStringValidator,
  required: v.boolean(),
  description: v.optional(localizedStringValidator),
  format: v.optional(
    v.union(
      v.literal("original"),
      v.literal("copy"),
      v.literal("digital"),
      v.literal("certified"),
    ),
  ),
  // Groupe d'affichage : « Obligatoires » vs « Selon votre situation ».
  // Si absent, on déduit du flag `required` (true → required, false → situational).
  group: v.optional(
    v.union(v.literal("required"), v.literal("situational")),
  ),
});

export type FormDocument = Infer<typeof formDocumentValidator>;

// ============================================================================
// FORM SCHEMA VALIDATORS (Dynamic Forms)
// ============================================================================

export const formFieldTypeValidator = v.union(
  v.literal(FormFieldType.Text),
  v.literal(FormFieldType.Email),
  v.literal(FormFieldType.Phone),
  v.literal(FormFieldType.Number),
  v.literal(FormFieldType.Date),
  v.literal(FormFieldType.Select),
  v.literal(FormFieldType.Checkbox),
  v.literal(FormFieldType.Textarea),
  v.literal(FormFieldType.File),
  v.literal(FormFieldType.Country),
  v.literal(FormFieldType.Gender),
  v.literal(FormFieldType.Address),
  v.literal(FormFieldType.Image),
  v.literal(FormFieldType.ProfileDocument),
);

/**
 * Select option for dropdown fields
 */
export const formSelectOptionValidator = v.object({
  value: v.string(),
  label: localizedStringValidator,
});

export type FormSelectOption = Infer<typeof formSelectOptionValidator>;

/**
 * Validation rules for fields
 */
export const formValidationValidator = v.object({
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  pattern: v.optional(v.string()),
  message: v.optional(localizedStringValidator),
});

export type FormValidation = Infer<typeof formValidationValidator>;

/**
 * Conditional logic for showing/hiding fields
 */
export const formConditionValidator = v.object({
  fieldPath: v.string(), // e.g. "section1.fieldName"
  operator: v.union(
    v.literal("equals"),
    v.literal("notEquals"),
    v.literal("contains"),
    v.literal("isEmpty"),
    v.literal("isNotEmpty"),
    v.literal("greaterThan"),
    v.literal("lessThan"),
  ),
  value: v.optional(v.any()),
});

export type FormCondition = Infer<typeof formConditionValidator>;

/**
 * Single form field definition
 */
export const formFieldValidator = v.object({
  id: v.string(),
  type: formFieldTypeValidator,
  label: localizedStringValidator,
  description: v.optional(localizedStringValidator),
  placeholder: v.optional(localizedStringValidator),
  required: v.boolean(),
  options: v.optional(v.array(formSelectOptionValidator)),
  validation: v.optional(formValidationValidator),
  conditions: v.optional(v.array(formConditionValidator)),
  conditionLogic: v.optional(v.union(v.literal("AND"), v.literal("OR"))),
});

export type FormField = Infer<typeof formFieldValidator>;

/**
 * Form section containing multiple fields
 */
export const formSectionValidator = v.object({
  id: v.string(),
  title: localizedStringValidator,
  description: v.optional(localizedStringValidator),
  fields: v.array(formFieldValidator),
  optional: v.optional(v.boolean()),
  conditions: v.optional(v.array(formConditionValidator)),
  conditionLogic: v.optional(v.union(v.literal("AND"), v.literal("OR"))),
});

export type FormSection = Infer<typeof formSectionValidator>;

/**
 * Complete form schema structure
 * Used in OrgService.formSchema field
 */
export const formSchemaValidator = v.object({
  sections: v.array(formSectionValidator),
  joinedDocuments: v.optional(v.array(formDocumentValidator)),
  showRecap: v.optional(v.boolean()),
});

export type FormSchema = Infer<typeof formSchemaValidator>;

// Passport info
export const passportInfoValidator = v.object({
  number: v.string(),
  issueDate: v.number(),
  expiryDate: v.number(),
  issuingAuthority: v.string(),
});

export type PassportInfo = Infer<typeof passportInfoValidator>;

// Emergency contact (legacy — kept for migration compatibility)
export const emergencyContactValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  relationship: v.optional(familyLinkValidator),
});

export type EmergencyContact = Infer<typeof emergencyContactValidator>;

// Emergency contact with country (new format — dynamic list)
export const emergencyContactWithCountryValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  relationship: v.optional(familyLinkValidator),
  country: v.optional(countryCodeValidator),
});

export type EmergencyContactWithCountry = Infer<
  typeof emergencyContactWithCountryValidator
>;

// Parent info
export const parentValidator = v.object({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
});

export type Parent = Infer<typeof parentValidator>;

// Spouse info
export const spouseValidator = v.object({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
});

export type Spouse = Infer<typeof spouseValidator>;

// Profile identity
export const identityValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  birthDate: v.number(),
  birthPlace: v.string(),
  birthCountry: v.string(),
  gender: genderValidator,
  nationality: v.string(),
  nationalityAcquisition: v.optional(nationalityAcquisitionValidator),
});

export type Identity = Infer<typeof identityValidator>;

// Profile addresses
export const profileAddressesValidator = v.object({
  residence: v.optional(addressValidator),
  homeland: v.optional(addressValidator),
});

export type ProfileAddresses = Infer<typeof profileAddressesValidator>;

// Profile contacts
export const profileContactsValidator = v.object({
  phone: v.optional(v.string()),
  phoneAbroad: v.optional(v.string()),
  email: v.optional(v.string()),
  // New: dynamic list of emergency contacts with country
  emergencyContacts: v.optional(
    v.array(emergencyContactWithCountryValidator),
  ),
  // Legacy fields — kept for migration
  emergencyHomeland: v.optional(emergencyContactValidator),
  emergencyResidence: v.optional(emergencyContactValidator),
});

export type ProfileContacts = Infer<typeof profileContactsValidator>;

// Profile family
export const profileFamilyValidator = v.object({
  maritalStatus: v.optional(maritalStatusValidator),
  father: v.optional(parentValidator),
  mother: v.optional(parentValidator),
  spouse: v.optional(spouseValidator),
});

export type ProfileFamily = Infer<typeof profileFamilyValidator>;

// Profile profession
export const professionValidator = v.object({
  status: v.optional(professionStatusValidator),
  title: v.optional(v.string()),
  employer: v.optional(v.string()),
  category: v.optional(v.string()),
  aiEnrichedAt: v.optional(v.number()),
  aiSuggestedSkills: v.optional(v.array(v.string())),
});

export type Profession = Infer<typeof professionValidator>;

// ============================================================================
// POST VALIDATORS
// ============================================================================

export const postCategoryValidator = v.union(
  v.literal(PostCategory.News),
  v.literal(PostCategory.Event),
  v.literal(PostCategory.Announcement),
  v.literal(PostCategory.Other),
);

export const postStatusValidator = v.union(
  v.literal(PostStatus.Draft),
  v.literal(PostStatus.Published),
  v.literal(PostStatus.Archived),
);

// ============================================================================
// TUTORIAL VALIDATORS
// ============================================================================

export const tutorialCategoryValidator = v.union(
  v.literal(TutorialCategory.Administrative),
  v.literal(TutorialCategory.Entrepreneurship),
  v.literal(TutorialCategory.Travel),
  v.literal(TutorialCategory.PracticalLife),
  v.literal(TutorialCategory.ConsularProcedures),
  v.literal(TutorialCategory.CivilStatus),
  v.literal(TutorialCategory.EducationGrants),
  v.literal(TutorialCategory.Taxation),
  v.literal(TutorialCategory.ReturnGabon),
);

export const tutorialTypeValidator = v.union(
  v.literal(TutorialType.Video),
  v.literal(TutorialType.Article),
  v.literal(TutorialType.Guide),
);

export const tutorialBadgeValidator = v.union(
  v.literal(TutorialBadge.Updated),
  v.literal(TutorialBadge.Express),
  v.literal(TutorialBadge.Essential),
  v.literal(TutorialBadge.New),
);

// FAQ categories reuse tutorial categories for unified filtering
export const faqCategoryValidator = tutorialCategoryValidator;

// ============================================================================
// NOTIFICATION TYPE VALIDATOR
// ============================================================================

export const notificationTypeValidator = v.union(
  v.literal(NotificationType.Updated),
  v.literal(NotificationType.Reminder),
  v.literal(NotificationType.Confirmation),
  v.literal(NotificationType.Cancellation),
  v.literal(NotificationType.Communication),
  v.literal(NotificationType.ImportantCommunication),
  v.literal(NotificationType.AppointmentConfirmation),
  v.literal(NotificationType.AppointmentReminder),
  v.literal(NotificationType.AppointmentCancellation),
  v.literal(NotificationType.AppointmentRescheduled),
  v.literal(NotificationType.ConsularRegistrationSubmitted),
  v.literal(NotificationType.ConsularRegistrationValidated),
  v.literal(NotificationType.ConsularRegistrationRejected),
  v.literal(NotificationType.ConsularCardReady),
  v.literal(NotificationType.ConsularRegistrationCompleted),
  v.literal(NotificationType.Feedback),
  // In-app types
  v.literal(NotificationType.NewMessage),
  v.literal(NotificationType.StatusUpdate),
  v.literal(NotificationType.ActionRequired),
  v.literal(NotificationType.DocumentValidated),
  v.literal(NotificationType.DocumentRejected),
  v.literal(NotificationType.DocumentPublished),
  // Meetings & Calls
  v.literal(NotificationType.MeetingInvitation),
  v.literal(NotificationType.CallIncoming),
  v.literal(NotificationType.ChatMessage),
  // Archive
  v.literal(NotificationType.ArchiveExpiration),
  // Sprint 6 — Centre d'Appels
  v.literal(NotificationType.CallMissed),
  v.literal(NotificationType.VoicemailLeft),
  v.literal(NotificationType.SlaBreach),
  v.literal(NotificationType.SupervisorAlert),
);

// ============================================================================
// iBOÎTE MODULE VALIDATORS (Digital Mail & Delivery Packages)
// ============================================================================

export const mailTypeValidator = v.union(
  v.literal(MailType.Letter),
  v.literal(MailType.Email),
);

export const mailFolderValidator = v.union(
  v.literal(MailFolder.Inbox),
  v.literal(MailFolder.Sent),
  v.literal(MailFolder.Archive),
  v.literal(MailFolder.Trash),
);

export const mailOwnerTypeValidator = v.union(
  v.literal(MailOwnerType.Profile),
  v.literal(MailOwnerType.Organization),
  v.literal(MailOwnerType.Association),
  v.literal(MailOwnerType.Company),
);

export const mailOwnerIdValidator = v.union(
  v.id("profiles"),
  v.id("orgs"),
  v.id("associations"),
  v.id("companies"),
);

export const mailSenderTypeValidator = v.union(
  v.literal(MailSenderType.Admin),
  v.literal(MailSenderType.Citizen),
  v.literal(MailSenderType.System),
  v.literal(MailSenderType.Organization),
  v.literal(MailSenderType.Association),
  v.literal(MailSenderType.Company),
);

export const letterTypeValidator = v.union(
  v.literal(LetterType.ActionRequired),
  v.literal(LetterType.Informational),
  v.literal(LetterType.Standard),
);

export const stampColorValidator = v.union(
  v.literal(StampColor.Red),
  v.literal(StampColor.Blue),
  v.literal(StampColor.Green),
);

export const packageStatusValidator = v.union(
  v.literal(PackageStatus.Pending),
  v.literal(PackageStatus.InTransit),
  v.literal(PackageStatus.Delivered),
  v.literal(PackageStatus.Available),
  v.literal(PackageStatus.Returned),
);

export const packageEventTypeValidator = v.union(
  v.literal(PackageEventType.Created),
  v.literal(PackageEventType.Dispatched),
  v.literal(PackageEventType.InTransit),
  v.literal(PackageEventType.CustomsClearance),
  v.literal(PackageEventType.OutForDelivery),
  v.literal(PackageEventType.Delivered),
  v.literal(PackageEventType.Available),
  v.literal(PackageEventType.Returned),
  v.literal(PackageEventType.Note),
);

// Mail sender object validator
export const mailSenderValidator = v.object({
  name: v.string(),
  type: v.optional(mailSenderTypeValidator),
  entityId: mailOwnerIdValidator,
  entityType: mailOwnerTypeValidator,
  logoUrl: v.optional(v.string()),
});

// Mail recipient object validator
export const mailRecipientValidator = v.object({
  name: v.string(),
  entityId: mailOwnerIdValidator,
  entityType: mailOwnerTypeValidator,
});

// Mail attachment validator
export const mailAttachmentValidator = v.object({
  name: v.string(),
  size: v.string(),
  storageId: v.optional(v.id("_storage")),
});

// Package event log validator
export const packageEventValidator = v.object({
  type: packageEventTypeValidator,
  location: v.optional(v.string()),
  description: v.string(),
  timestamp: v.number(),
});

// ─── Profession taxonomy (used by AI enrichment migrations) ───────────────
// Stub exports pour débloquer le codegen Convex tant que la migration
// d'enrichissement IA des profils n'est pas finalisée. À remplacer par
// les valeurs définitives quand le schéma profession aura été arrêté.
export const PROFESSION_CATEGORY_VALUES = [
  "tech",
  "health",
  "education",
  "agriculture",
  "finance",
  "trades",
  "public_service",
  "arts_culture",
  "transport",
  "tourism_hospitality",
  "consulting_services",
  "legal",
  "industry",
  "other",
] as const;

export type ProfessionCategoryValue =
  (typeof PROFESSION_CATEGORY_VALUES)[number];

export const ProfessionCategory = Object.fromEntries(
  PROFESSION_CATEGORY_VALUES.map((c) => [c, c]),
) as { [K in ProfessionCategoryValue]: K };
