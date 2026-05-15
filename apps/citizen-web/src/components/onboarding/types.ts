import type { PublicUserType } from "@convex/lib/constants";
import type { AuthState, IdentityPhase, PinPhase } from "./lib/onboardingFlow";

export type EmergencyContact = {
	firstName?: string;
	lastName?: string;
	phone?: string;
	email?: string;
	country?: string;
	relation?: string;
};

export type AddressData = {
	full?: string;
	street?: string;
	city?: string;
	postalCode?: string;
	country?: string;
	lat?: string | number;
	lng?: string | number;
};

export type OnboardingData = {
	// Internal flow markers
	_identityPhase?: IdentityPhase;
	_authState?: AuthState;
	_pinPhase?: PinPhase;
	_hasAIPrefill?: boolean;

	// Identity — Name
	firstName?: string;
	lastName?: string;

	// Identity — Contact
	email?: string;
	phone?: string;

	// Identity — Auth bridge password.
	// Généré aléatoirement côté client par OtpPhase pour permettre `signUp.email`
	// puis `signIn.email`. JAMAIS exposé à l'utilisateur, JAMAIS persisté.
	password?: string;
	acceptTerms?: boolean;

	// Identity — OTP (NEVER persisted)
	otp?: string;

	// Identity — Birth & nationality
	birthDate?: string;
	birthPlace?: string;
	birthCountry?: string;
	gender?: "Male" | "Female";
	nationality?: string;
	nationalityAcquisition?: "birth" | "naturalization" | "marriage";
	nip?: string;

	// Identity — Passport
	passportNumber?: string;
	passportIssuingAuthority?: string;
	passportIssueDate?: string;
	passportExpiryDate?: string;

	// PIN (NEVER persisted)
	pin?: string;
	pinConfirm?: string;

	// Family
	maritalStatus?:
		| "Single"
		| "Married"
		| "Divorced"
		| "Widowed"
		| "CivilUnion"
		| "Cohabiting";
	spouseFirstName?: string;
	spouseLastName?: string;
	fatherFirstName?: string;
	fatherLastName?: string;
	motherFirstName?: string;
	motherLastName?: string;

	// Contacts
	address?: AddressData;
	homeland?: AddressData;
	emergencyContacts?: EmergencyContact[];

	// Profession
	workStatus?:
		| "Employee"
		| "SelfEmployed"
		| "Entrepreneur"
		| "Student"
		| "Retired"
		| "Unemployed"
		| "Other";
	workTitle?: string;
	workEmployer?: string;

	// Documents (filename or storage ID strings)
	documents?: Record<string, string | undefined>;

	// Review
	accepted?: boolean;
};

export type OnboardingProfileType = PublicUserType;

/**
 * Champs sensibles qui NE doivent JAMAIS être persistés (localStorage,
 * sessionStorage, IndexedDB-meta). Filtrés à l'écriture du draft.
 */
export const SENSITIVE_KEYS: ReadonlyArray<keyof OnboardingData> = [
	"password",
	"otp",
	"pin",
	"pinConfirm",
];

export function stripSensitive(data: OnboardingData): OnboardingData {
	const out = { ...data };
	for (const k of SENSITIVE_KEYS) delete out[k];
	return out;
}
