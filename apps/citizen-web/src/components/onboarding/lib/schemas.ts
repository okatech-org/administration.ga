import { PublicUserType } from "@convex/lib/constants";
import { z } from "zod/v3";

const GenderUI = ["Male", "Female"] as const;
const MaritalUI = [
	"Single",
	"Married",
	"Divorced",
	"Widowed",
	"CivilUnion",
	"Cohabiting",
] as const;
const NatAcqUI = ["birth", "naturalization", "marriage"] as const;
const WorkStatusUI = [
	"Employee",
	"SelfEmployed",
	"Entrepreneur",
	"Student",
	"Retired",
	"Unemployed",
	"Other",
] as const;

const isPast = (s: string) => {
	if (!s) return false;
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return false;
	return d.getTime() < Date.now();
};

const isFuture = (s: string) => {
	if (!s) return false;
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return false;
	return d.getTime() > Date.now();
};

const isAdult = (s: string) => {
	if (!s) return false;
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return false;
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age >= 18;
};

// ---- Identity sub-phases ----

export const nameSchema = z.object({
	firstName: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.name.firstName.min" }),
	lastName: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.name.lastName.min" }),
});
export type NameValues = z.infer<typeof nameSchema>;

export const contactSchema = z.object({
	email: z
		.string()
		.trim()
		.email({ message: "onboarding.errors.contact.email.invalid" }),
	phone: z
		.string()
		.trim()
		.regex(/^\+?[1-9]\d{6,14}$/, {
			message: "onboarding.errors.contact.phone.invalid",
		}),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const otpSchema = z.object({
	otp: z
		.string()
		.regex(/^\d{6}$/, { message: "onboarding.errors.otp.code.invalid" }),
});
export type OtpValues = z.infer<typeof otpSchema>;

export const pinSchema = z
	.object({
		pin: z
			.string()
			.regex(/^\d{6}$/, { message: "onboarding.errors.pin.pin.invalid" }),
		pinConfirm: z
			.string()
			.min(1, { message: "onboarding.errors.pin.pinConfirm.required" }),
	})
	.refine((d) => d.pin === d.pinConfirm, {
		message: "onboarding.errors.pin.pinConfirm.mismatch",
		path: ["pinConfirm"],
	});
export type PinValues = z.infer<typeof pinSchema>;

export const birthSchema = z.object({
	birthDate: z
		.string()
		.min(1, { message: "onboarding.errors.birth.birthDate.required" })
		.refine(isPast, { message: "onboarding.errors.birth.birthDate.inPast" })
		.refine(isAdult, { message: "onboarding.errors.birth.birthDate.adult" }),
	birthPlace: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.birth.birthPlace.min" }),
	birthCountry: z
		.string()
		.trim()
		.min(1, { message: "onboarding.errors.birth.birthCountry.required" }),
	gender: z.enum(GenderUI, {
		message: "onboarding.errors.birth.gender.required",
	}),
	nationality: z
		.string()
		.trim()
		.min(1, { message: "onboarding.errors.birth.nationality.required" }),
	nationalityAcquisition: z.enum(NatAcqUI, {
		message: "onboarding.errors.birth.nationalityAcquisition.required",
	}),
	nip: z.string().optional(),
});
export type BirthValues = z.infer<typeof birthSchema>;

export const passportSchema = z
	.object({
		passportNumber: z
			.string()
			.trim()
			.min(5, { message: "onboarding.errors.passport.number.min" }),
		passportIssuingAuthority: z
			.string()
			.trim()
			.min(2, { message: "onboarding.errors.passport.issuing.min" }),
		passportIssueDate: z
			.string()
			.min(1, { message: "onboarding.errors.passport.issueDate.required" })
			.refine(isPast, {
				message: "onboarding.errors.passport.issueDate.inPast",
			}),
		passportExpiryDate: z
			.string()
			.min(1, { message: "onboarding.errors.passport.expiryDate.required" })
			.refine(isFuture, {
				message: "onboarding.errors.passport.expiryDate.inFuture",
			}),
	})
	.refine(
		(d) => new Date(d.passportExpiryDate) > new Date(d.passportIssueDate),
		{
			message: "onboarding.errors.passport.expiryDate.afterIssue",
			path: ["passportExpiryDate"],
		},
	);
export type PassportValues = z.infer<typeof passportSchema>;

// ---- Family ----

export const familySchema = z
	.object({
		maritalStatus: z.enum(MaritalUI, {
			message: "onboarding.errors.family.maritalStatus.required",
		}),
		spouseFirstName: z.string().optional(),
		spouseLastName: z.string().optional(),
		fatherFirstName: z.string().optional(),
		fatherLastName: z.string().optional(),
		motherFirstName: z.string().optional(),
		motherLastName: z.string().optional(),
	})
	.superRefine((d, ctx) => {
		if (d.maritalStatus === "Married" || d.maritalStatus === "CivilUnion") {
			if (!d.spouseFirstName || d.spouseFirstName.trim().length < 2) {
				ctx.addIssue({
					code: "custom",
					message: "onboarding.errors.family.spouseFirstName.required",
					path: ["spouseFirstName"],
				});
			}
			if (!d.spouseLastName || d.spouseLastName.trim().length < 2) {
				ctx.addIssue({
					code: "custom",
					message: "onboarding.errors.family.spouseLastName.required",
					path: ["spouseLastName"],
				});
			}
		}
	});
export type FamilyValues = z.infer<typeof familySchema>;

// ---- Contacts ----

const addressSchema = z.object({
	street: z
		.string()
		.trim()
		.min(3, { message: "onboarding.errors.address.street.min" }),
	city: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.address.city.min" }),
	postalCode: z
		.string()
		.trim()
		.min(1, { message: "onboarding.errors.address.postalCode.required" }),
	country: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.address.country.required" }),
	full: z.string().optional(),
	lat: z.union([z.string(), z.number()]).optional(),
	lng: z.union([z.string(), z.number()]).optional(),
});

const homelandSchema = z
	.object({
		full: z.string().optional(),
		street: z.string().optional(),
		city: z.string().optional(),
		postalCode: z.string().optional(),
		country: z.string().optional(),
		lat: z.union([z.string(), z.number()]).optional(),
		lng: z.union([z.string(), z.number()]).optional(),
	})
	.optional();

const emergencyContactSchema = z.object({
	firstName: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.emergency.firstName.min" }),
	lastName: z
		.string()
		.trim()
		.min(2, { message: "onboarding.errors.emergency.lastName.min" }),
	phone: z
		.string()
		.trim()
		.regex(/^\+?[1-9]\d{6,14}$/, {
			message: "onboarding.errors.emergency.phone.invalid",
		}),
	email: z
		.union([
			z.literal(""),
			z
				.string()
				.email({ message: "onboarding.errors.emergency.email.invalid" }),
		])
		.optional(),
	country: z.string().optional(),
	relation: z.string().optional(),
});

export function contactsSchemaFor(userType: PublicUserType) {
	const isLong = userType === PublicUserType.LongStay;
	const isForeigner =
		userType === PublicUserType.VisaTourism ||
		userType === PublicUserType.VisaBusiness ||
		userType === PublicUserType.VisaLongStay ||
		userType === PublicUserType.AdminServices;
	const wantsEmergency = isLong || isForeigner;

	return z.object({
		address: addressSchema,
		homeland: homelandSchema,
		emergencyContacts: wantsEmergency
			? z
					.array(emergencyContactSchema)
					.min(1, { message: "onboarding.errors.emergencyContacts.atLeastOne" })
			: z.array(emergencyContactSchema).optional(),
	});
}
export type ContactsValues = z.infer<ReturnType<typeof contactsSchemaFor>>;

// ---- Profession ----

export const professionSchema = z
	.object({
		workStatus: z.enum(WorkStatusUI, {
			message: "onboarding.errors.profession.workStatus.required",
		}),
		workTitle: z.string().optional(),
		workEmployer: z.string().optional(),
	})
	.superRefine((d, ctx) => {
		const requiresDetails =
			d.workStatus === "Employee" ||
			d.workStatus === "SelfEmployed" ||
			d.workStatus === "Entrepreneur";
		if (!requiresDetails) return;
		if (!d.workTitle || d.workTitle.trim().length < 2) {
			ctx.addIssue({
				code: "custom",
				message: "onboarding.errors.profession.workTitle.required",
				path: ["workTitle"],
			});
		}
		if (!d.workEmployer || d.workEmployer.trim().length < 2) {
			ctx.addIssue({
				code: "custom",
				message: "onboarding.errors.profession.workEmployer.required",
				path: ["workEmployer"],
			});
		}
	});
export type ProfessionValues = z.infer<typeof professionSchema>;

// ---- Documents ----
// A document is "provided" when either a File is staged locally OR a filename
// is present in `data.documents` (= already uploaded).

export type DocumentInput = File | string | undefined | null;

const isProvided = (v: DocumentInput) =>
	v instanceof File ||
	(typeof v === "string" && v.trim().length > 0);

const requiredDoc = (key: string) =>
	z.custom<DocumentInput>().refine(isProvided, {
		message: `onboarding.errors.documents.${key}.required`,
	});

const optionalDoc = () => z.custom<DocumentInput>().optional();

export function documentsSchemaFor(userType: PublicUserType) {
	if (userType === PublicUserType.LongStay) {
		return z.object({
			identityPhoto: requiredDoc("identityPhoto"),
			passport: requiredDoc("passport"),
			birthCertificate: requiredDoc("birthCertificate"),
			addressProof: requiredDoc("addressProof"),
			residencePermit: optionalDoc(),
		});
	}
	return z.object({
		identityPhoto: requiredDoc("identityPhoto"),
		passport: requiredDoc("passport"),
		birthCertificate: optionalDoc(),
		addressProof: optionalDoc(),
		residencePermit: optionalDoc(),
	});
}
export type DocumentsValues = z.infer<ReturnType<typeof documentsSchemaFor>>;

// ---- Review ----

export const reviewSchema = z.object({
	accepted: z.literal(true, {
		message: "onboarding.errors.review.accepted.required",
	}),
});
export type ReviewValues = z.infer<typeof reviewSchema>;
