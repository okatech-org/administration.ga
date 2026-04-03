/**
 * Registration Configuration by Profile Type
 *
 * Centralizes the form shape (steps, required fields, documents) per PublicUserType.
 * Drives the adaptive CitizenRegistrationForm wizard and My Space registration checks.
 */

import {
	DetailedDocumentType,
	DocumentTypeCategory,
	PublicUserType,
} from "@convex/lib/constants";

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

export type RegistrationStepId =
	| "account"
	| "purpose"
	| "documents"
	| "basicInfo"
	| "family"
	| "contacts"
	| "profession"
	| "review";

export interface RegistrationStepDef {
	id: RegistrationStepId;
	/** Translation key for the step label */
	labelKey: string;
	/** Fallback label */
	labelFallback: string;
	/** Lucide icon name (used for mapping in the component) */
	icon: string;
}

/**
 * Master list of all possible steps (order matters).
 * The config below filters this list per userType.
 */
const ALL_STEPS: RegistrationStepDef[] = [
	{
		id: "account",
		labelKey: "register.steps.account",
		labelFallback: "Compte",
		icon: "UserPlus",
	},
	{
		id: "purpose",
		labelKey: "register.steps.purpose",
		labelFallback: "Motif",
		icon: "Compass",
	},
	{
		id: "documents",
		labelKey: "register.steps.documents",
		labelFallback: "Documents",
		icon: "FileText",
	},
	{
		id: "basicInfo",
		labelKey: "register.steps.baseInfo",
		labelFallback: "Identité",
		icon: "User",
	},
	{
		id: "family",
		labelKey: "register.steps.family",
		labelFallback: "Famille",
		icon: "Users",
	},
	{
		id: "contacts",
		labelKey: "register.steps.contacts",
		labelFallback: "Contacts",
		icon: "MapPin",
	},
	{
		id: "profession",
		labelKey: "register.steps.profession",
		labelFallback: "Profession",
		icon: "Briefcase",
	},
	{
		id: "review",
		labelKey: "register.steps.review",
		labelFallback: "Révision",
		icon: "Eye",
	},
];

// ============================================================================
// DOCUMENT DEFINITIONS
// ============================================================================

export interface RequiredDocumentDef {
	/** Key used in form state and IndexedDB storage */
	key: string;
	/** Translation key for the label */
	labelKey: string;
	/** Fallback label */
	labelFallback: string;
	/** Detailed document type for Convex */
	documentType: DetailedDocumentType;
	/** Document category for Convex */
	category: DocumentTypeCategory;
	/** Format hint  */
	formatHint: string;
	/** Accept MIME types */
	accept: string;
	/** Max file size in bytes */
	maxSize: number;
	/** Whether this document is required (true) or optional (false) */
	required: boolean;
}

const DOC_IDENTITY_PHOTO: RequiredDocumentDef = {
	key: "identityPhoto",
	labelKey: "register.documents.photo",
	labelFallback: "Photo d'identité",
	documentType: DetailedDocumentType.IdentityPhoto,
	category: DocumentTypeCategory.Identity,
	formatHint: "JPG, PNG - Max 20MB",
	accept: "image/*",
	maxSize: 20 * 1024 * 1024,
	required: true,
};

const DOC_PASSPORT: RequiredDocumentDef = {
	key: "passport",
	labelKey: "register.documents.passport",
	labelFallback: "Passeport",
	documentType: DetailedDocumentType.Passport,
	category: DocumentTypeCategory.Identity,
	formatHint: "PDF, JPG - Max 5MB",
	accept: "image/*,application/pdf",
	maxSize: 20 * 1024 * 1024,
	required: true,
};

const DOC_BIRTH_CERT: RequiredDocumentDef = {
	key: "birthCertificate",
	labelKey: "register.documents.birthCertificate",
	labelFallback: "Acte de Naissance",
	documentType: DetailedDocumentType.BirthCertificate,
	category: DocumentTypeCategory.CivilStatus,
	formatHint: "PDF, JPG - Max 5MB",
	accept: "image/*,application/pdf",
	maxSize: 20 * 1024 * 1024,
	required: true,
};

const DOC_PROOF_OF_ADDRESS: RequiredDocumentDef = {
	key: "addressProof",
	labelKey: "register.documents.proofOfAddress",
	labelFallback: "Justificatif de Domicile",
	documentType: DetailedDocumentType.ProofOfAddress,
	category: DocumentTypeCategory.Residence,
	formatHint: "Moins de 3 mois",
	accept: "image/*,application/pdf",
	maxSize: 20 * 1024 * 1024,
	required: true,
};

// ============================================================================
// VISIBLE SECTIONS (fine-grained control within a step)
// ============================================================================

export interface VisibleSections {
	/** Show residenceAddress fields in contacts step */
	residenceAddress: boolean;
	/** Show homeland address fields */
	homelandAddress: boolean;
	/** Show emergency contacts section */
	emergencyContacts: boolean;
	/** @deprecated kept for backward compat — use emergencyContacts */
	emergencyHomeland: boolean;
	/** @deprecated kept for backward compat — use emergencyContacts */
	emergencyResidence: boolean;
	/** Show spouse fields (conditional on marital status) */
	spouse: boolean;
	/** Show nationality acquisition field */
	nationalityAcquisition: boolean;
}

// ============================================================================
// PROFILE FIELDS REQUIRED (for My Space registration check)
// ============================================================================

export interface RequiredProfileFields {
	identity: {
		firstName: boolean;
		lastName: boolean;
		birthDate: boolean;
		birthPlace: boolean;
	};
	addresses: {
		residence: boolean;
	};
	contacts: {
		phone: boolean;
		email: boolean;
	};
}

// ============================================================================
// FULL REGISTRATION CONFIG
// ============================================================================

export interface RegistrationConfig {
	/** Ordered steps for the wizard */
	steps: RegistrationStepDef[];
	/** Documents to show on the documents step */
	documents: RequiredDocumentDef[];
	/** Fine-grained visibility toggles */
	visibleSections: VisibleSections;
	/** Profile fields required for My Space registration completion check */
	requiredProfileFields: RequiredProfileFields;
	/** Profile document keys required for My Space registration check */
	requiredProfileDocuments: { key: string; label: string }[];
}

// ============================================================================
// CONFIGS PER USER TYPE
// ============================================================================

/**
 * LongStay (résident à l'étranger > 6 mois)
 * → Full form: all steps, all documents, all sections
 */
const LONG_STAY_CONFIG: RegistrationConfig = {
	steps: ALL_STEPS.filter(
		(s) => s.id !== "purpose" && s.id !== "account",
	),
	documents: [
		DOC_IDENTITY_PHOTO,
		DOC_PASSPORT,
		DOC_BIRTH_CERT,
		DOC_PROOF_OF_ADDRESS,
	],
	visibleSections: {
		residenceAddress: true,
		homelandAddress: true,
		emergencyContacts: true,
		emergencyHomeland: true,
		emergencyResidence: true,
		spouse: true,
		nationalityAcquisition: true,
	},
	requiredProfileFields: {
		identity: {
			firstName: true,
			lastName: true,
			birthDate: true,
			birthPlace: true,
		},
		addresses: {
			residence: true,
		},
		contacts: {
			phone: true,
			email: true,
		},
	},
	requiredProfileDocuments: [
		{ key: "passport", label: "Passeport en cours de validité" },
		{ key: "proofOfAddress", label: "Justificatif de domicile" },
		{ key: "identityPhoto", label: "Photo d'identité" },
	],
};

/**
 * ShortStay (de passage < 6 mois)
 * → Reduced form: no Family, no Profession, no address required
 *   Only passport + identity photo
 */
const SHORT_STAY_CONFIG: RegistrationConfig = {
	steps: ALL_STEPS.filter(
		(s) =>
			s.id !== "family" &&
			s.id !== "profession" &&
			s.id !== "purpose" &&
			s.id !== "account",
	),
	documents: [DOC_IDENTITY_PHOTO, DOC_PASSPORT],
	visibleSections: {
		residenceAddress: false,
		homelandAddress: false,
		emergencyContacts: true,
		emergencyHomeland: true,
		emergencyResidence: true,
		spouse: false,
		nationalityAcquisition: false,
	},
	requiredProfileFields: {
		identity: {
			firstName: true,
			lastName: true,
			birthDate: true,
			birthPlace: true,
		},
		addresses: {
			residence: false,
		},
		contacts: {
			phone: true,
			email: true,
		},
	},
	requiredProfileDocuments: [
		{ key: "passport", label: "Passeport en cours de validité" },
		{ key: "identityPhoto", label: "Photo d'identité" },
	],
};

/**
 * Foreigner (visa/admin services)
 * → Simplified form: no Family, no Profession, no homeland address
 *   Only passport + identity photo
 *   No consular registration request — profile only
 */
const FOREIGNER_CONFIG: RegistrationConfig = {
	steps: ALL_STEPS.filter(
		(s) => s.id !== "family" && s.id !== "profession" && s.id !== "account",
	),
	documents: [DOC_IDENTITY_PHOTO, DOC_PASSPORT],
	visibleSections: {
		residenceAddress: true,
		homelandAddress: false,
		emergencyContacts: true,
		emergencyHomeland: false,
		emergencyResidence: true,
		spouse: false,
		nationalityAcquisition: false,
	},
	requiredProfileFields: {
		identity: {
			firstName: true,
			lastName: true,
			birthDate: true,
			birthPlace: false,
		},
		addresses: {
			residence: true,
		},
		contacts: {
			phone: true,
			email: true,
		},
	},
	requiredProfileDocuments: [
		{ key: "passport", label: "Passeport en cours de validité" },
		{ key: "identityPhoto", label: "Photo d'identité" },
	],
};

// ============================================================================
// PUBLIC API
// ============================================================================

const CONFIG_MAP: Partial<Record<PublicUserType, RegistrationConfig>> = {
	[PublicUserType.LongStay]: LONG_STAY_CONFIG,
	[PublicUserType.ShortStay]: SHORT_STAY_CONFIG,
	[PublicUserType.VisaTourism]: FOREIGNER_CONFIG,
	[PublicUserType.VisaBusiness]: FOREIGNER_CONFIG,
	[PublicUserType.VisaLongStay]: FOREIGNER_CONFIG,
	[PublicUserType.AdminServices]: FOREIGNER_CONFIG,
};

/**
 * Get the registration form configuration for a given user type.
 * Falls back to LONG_STAY_CONFIG (full form) for unknown types.
 */
export function getRegistrationConfig(
	userType: PublicUserType | string,
): RegistrationConfig {
	return CONFIG_MAP[userType as PublicUserType] ?? LONG_STAY_CONFIG;
}

/**
 * Check if a step is present in the config for a given user type.
 */
export function hasStep(
	userType: PublicUserType | string,
	stepId: RegistrationStepId,
): boolean {
	const config = getRegistrationConfig(userType);
	return config.steps.some((s) => s.id === stepId);
}
