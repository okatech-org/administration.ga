import {
	CountryCode,
	Gender,
	MaritalStatus,
	NationalityAcquisition,
} from "@convex/lib/constants";
import { z } from "zod";

// Basic logic: must be in the past
export const inPast = (date: Date) => date < new Date();
// Basic logic: user must be roughly 18+ (approximate)
export const isAdult = (date: Date) => {
	const age = new Date().getFullYear() - date.getFullYear();
	return age >= 18;
};

// Basic logic: must be in the future
export const inFuture = (date: Date) => date > new Date();

// --- Step 1: Identity ---
export const identityStepSchema = z.object({
	identity: z.object({
		firstName: z.string().min(2),
		lastName: z.string().min(2),
		birthDate: z
			.date()
			.refine(inPast, "registration.errors.birthDateInPast")
			.refine(isAdult, "registration.errors.mustBeAdult"),
		birthPlace: z.string().min(2),
		birthCountry: z.enum(CountryCode),
		gender: z.enum(Gender),
		nationality: z.enum(CountryCode),
		nationalityAcquisition: z.enum(NationalityAcquisition),
	}),
	passportInfo: z
		.object({
			number: z.string().min(6),
			issueDate: z.date().refine(inPast, "registration.errors.issueDateInPast"),
			expiryDate: z
				.date()
				.refine(inFuture, "registration.errors.expiryDateInFuture"),
			issuingAuthority: z.string().min(2),
		})
		.refine((data) => data.expiryDate > data.issueDate, {
			message: "registration.errors.expiryAfterIssue",
			path: ["expiryDate"],
		}),
});

// --- Step 2: Contacts & Addresses ---
export const addressSchema = z.object({
	street: z.string().min(5),
	city: z.string().min(2),
	postalCode: z.string().min(2),
	country: z.enum(CountryCode),
});

export const contactsStepSchema = z.object({
	contacts: z.object({
		email: z.email(),
		phone: z.string(),
	}),
	addresses: z.object({
		homeland: addressSchema,
		residence: addressSchema,
	}),
});

// --- Step 3: Family ---
export const parentSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
});

export const spouseSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
});

export const familyStepSchema = z.object({
	family: z
		.object({
			maritalStatus: z.enum(MaritalStatus),
			father: parentSchema.optional(),
			mother: parentSchema.optional(),
			spouse: spouseSchema.optional(),
		})
		.superRefine((data, ctx) => {
			// If married or civilUnion, spouse info is required
			if (
				[MaritalStatus.Married, MaritalStatus.CivilUnion].includes(
					data.maritalStatus,
				)
			) {
				if (!data.spouse?.firstName || data.spouse.firstName.length < 2) {
					ctx.addIssue({
						code: "custom",
						message: "registration.errors.spouseFirstNameRequired",
						path: ["spouse", "firstName"],
					});
				}
				if (!data.spouse?.lastName || data.spouse.lastName.length < 2) {
					ctx.addIssue({
						code: "custom",
						message: "registration.errors.spouseLastNameRequired",
						path: ["spouse", "lastName"],
					});
				}
			}
		}),
});

// --- Step 4: Documents ---
// We expect arrays of strings (URLs or IDs) or File objects if still local
// But for validation, we just need to know if there's at least one file
export const documentsStepSchema = z.object({
	documents: z.object({
		passport: z.array(z.any()).min(1),
		nationalId: z.array(z.any()).min(1),
		photo: z.array(z.any()).min(1),
		birthCertificate: z.array(z.any()).optional(),
		proofOfAddress: z.array(z.any()).optional(),
		residencePermit: z.array(z.any()).optional(),
	}),
});

export type IdentityStepValues = z.infer<typeof identityStepSchema>;
export type ContactsStepValues = z.infer<typeof contactsStepSchema>;
export type FamilyStepValues = z.infer<typeof familyStepSchema>;
export type DocumentsStepValues = z.infer<typeof documentsStepSchema>;
