import { PublicUserType } from "@convex/lib/constants";

export type OnboardingStepKey =
	| "identity"
	| "family"
	| "contacts"
	| "profession"
	| "documents"
	| "review";

export type OnboardingStepDef = {
	key: OnboardingStepKey;
	label: string;
	icon:
		| "user"
		| "users"
		| "map-pin"
		| "briefcase"
		| "file-text"
		| "eye";
};

export const STEPS_BY_TYPE: Record<PublicUserType, OnboardingStepDef[]> = {
	[PublicUserType.LongStay]: [
		{ key: "identity", label: "Identité", icon: "user" },
		{ key: "family", label: "Famille", icon: "users" },
		{ key: "contacts", label: "Contacts", icon: "map-pin" },
		{ key: "profession", label: "Profession", icon: "briefcase" },
		{ key: "documents", label: "Documents", icon: "file-text" },
		{ key: "review", label: "Révision", icon: "eye" },
	],
	[PublicUserType.ShortStay]: [
		{ key: "identity", label: "Identité", icon: "user" },
		{ key: "contacts", label: "Contacts", icon: "map-pin" },
		{ key: "documents", label: "Documents", icon: "file-text" },
		{ key: "review", label: "Révision", icon: "eye" },
	],
	[PublicUserType.VisaTourism]: [
		{ key: "identity", label: "Identité", icon: "user" },
		{ key: "contacts", label: "Contacts", icon: "map-pin" },
		{ key: "documents", label: "Documents", icon: "file-text" },
		{ key: "review", label: "Révision", icon: "eye" },
	],
	[PublicUserType.VisaBusiness]: [
		{ key: "identity", label: "Identité", icon: "user" },
		{ key: "contacts", label: "Contacts", icon: "map-pin" },
		{ key: "documents", label: "Documents", icon: "file-text" },
		{ key: "review", label: "Révision", icon: "eye" },
	],
	[PublicUserType.VisaLongStay]: [
		{ key: "identity", label: "Identité", icon: "user" },
		{ key: "contacts", label: "Contacts", icon: "map-pin" },
		{ key: "documents", label: "Documents", icon: "file-text" },
		{ key: "review", label: "Révision", icon: "eye" },
	],
	[PublicUserType.AdminServices]: [
		{ key: "identity", label: "Identité", icon: "user" },
		{ key: "contacts", label: "Contacts", icon: "map-pin" },
		{ key: "documents", label: "Documents", icon: "file-text" },
		{ key: "review", label: "Révision", icon: "eye" },
	],
};

export const PROFILE_TITLES: Record<PublicUserType, string> = {
	[PublicUserType.LongStay]: "Inscription consulaire — Résident",
	[PublicUserType.ShortStay]: "Déclaration — Court séjour",
	[PublicUserType.VisaTourism]: "Demande de visa — Tourisme",
	[PublicUserType.VisaBusiness]: "Demande de visa — Affaires",
	[PublicUserType.VisaLongStay]: "Demande de visa — Long séjour",
	[PublicUserType.AdminServices]: "Services administratifs",
};

export type ForeignerVisaTypeDef = {
	code: PublicUserType;
	title: string;
	subtitle: string;
	icon: "plane" | "briefcase" | "home" | "file-text";
};

export const FOREIGNER_VISA_TYPES: ForeignerVisaTypeDef[] = [
	{
		code: PublicUserType.VisaTourism,
		title: "Visa tourisme",
		subtitle: "Court séjour pour tourisme ou visite familiale",
		icon: "plane",
	},
	{
		code: PublicUserType.VisaBusiness,
		title: "Visa affaires",
		subtitle: "Court séjour pour missions professionnelles",
		icon: "briefcase",
	},
	{
		code: PublicUserType.VisaLongStay,
		title: "Visa long séjour",
		subtitle: "Installation ou séjour prolongé au Gabon",
		icon: "home",
	},
	{
		code: PublicUserType.AdminServices,
		title: "Services administratifs",
		subtitle: "Légalisation, apostille, certificats",
		icon: "file-text",
	},
];

export const RECOMMENDED_PROFILE_TYPE: PublicUserType = PublicUserType.LongStay;

export type IdentityPhase =
	| "name"
	| "contact"
	| "otp"
	| "pin"
	| "birth"
	| "passport";

export const IDENTITY_PHASES: IdentityPhase[] = [
	"name",
	"contact",
	"otp",
	"pin",
	"birth",
	"passport",
];

export const IDENTITY_PHASE_LABELS: Record<IdentityPhase, string> = {
	name: "Votre nom",
	contact: "Vos coordonnées",
	otp: "Vérification email",
	pin: "Code PIN",
	birth: "Naissance & nationalité",
	passport: "Passeport",
};

export type AuthState = "pending" | "verified";

export type PinPhase = "enter" | "confirm";

/**
 * PINs explicitement bannis (séquences évidentes, répétitions).
 * Liste minimale ; toute autre validation (faible variance) reste côté handler.
 */
export const PIN_WEAK_LIST: ReadonlySet<string> = new Set([
	"000000",
	"111111",
	"222222",
	"333333",
	"444444",
	"555555",
	"666666",
	"777777",
	"888888",
	"999999",
	"123456",
	"654321",
	"012345",
	"543210",
	"121212",
	"212121",
	"112233",
	"332211",
	"123123",
	"321321",
	"456789",
	"987654",
]);

export function isPinWeak(pin: string): boolean {
	if (!/^\d{6}$/.test(pin)) return true;
	if (PIN_WEAK_LIST.has(pin)) return true;
	return false;
}

/**
 * Détecte un PIN qui correspond à la date de naissance dans les formats
 * courants : DDMMYY, MMDDYY, YYMMDD, YYYYMM, MMYYYY (tronqué à 6).
 */
export function pinMatchesBirthDate(
	pin: string,
	birthDateIso: string | undefined,
): boolean {
	if (!birthDateIso || !/^\d{6}$/.test(pin)) return false;
	const m = birthDateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return false;
	const yyyy = m[1];
	const mm = m[2];
	const dd = m[3];
	const yy = yyyy.slice(2);
	const candidates = [
		`${dd}${mm}${yy}`,
		`${mm}${dd}${yy}`,
		`${yy}${mm}${dd}`,
		`${yyyy}${mm}`.slice(0, 6),
		`${mm}${yyyy}`.slice(0, 6),
		`${dd}${mm}${yyyy}`.slice(0, 6),
	];
	return candidates.includes(pin);
}
