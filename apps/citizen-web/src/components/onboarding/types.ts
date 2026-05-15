import type { PublicUserType } from "@convex/lib/constants";
import { getCountryName } from "@/lib/country-utils";
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

/**
 * Composer un libellé d'adresse à afficher.
 *
 * `address.full` n'est renseigné que lorsque l'utilisateur passe par
 * l'autocomplete Google Places (`formattedAddress`). Une saisie manuelle
 * via l'AddressInput laisse `full` undefined ; on retombe sur les champs
 * structurés pour ne pas afficher un champ "vide" en recap.
 */
export function formatAddressDisplay(
	address: AddressData | undefined,
): string | undefined {
	if (!address) return undefined;
	if (address.full && address.full.trim().length > 0) return address.full;
	const composed = [
		address.street,
		[address.postalCode, address.city].filter(Boolean).join(" ").trim() ||
			undefined,
		address.country ? getCountryName(address.country) : undefined,
	]
		.filter((s): s is string => Boolean(s && s.trim().length > 0))
		.join(", ");
	return composed.length > 0 ? composed : undefined;
}

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
