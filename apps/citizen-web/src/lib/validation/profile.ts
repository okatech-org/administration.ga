import {
	CountryCode,
	FamilyLink,
	Gender,
	MaritalStatus,
	NationalityAcquisition,
	WorkStatus,
} from "@convex/lib/constants";
import { z } from "zod/v3";

const inPast = (date: Date) => date < new Date();
const inFuture = (date: Date) => date > new Date();
const isAdult = (date: Date) => {
	const age = new Date().getFullYear() - date.getFullYear();
	return age >= 18;
};

const addressSchema = z.object({
	street: z
		.string()
		.min(1, { message: "errors.profile.addresses.street.required" }),
	city: z
		.string()
		.min(1, { message: "errors.profile.addresses.city.required" }),
	postalCode: z
		.string()
		.min(1, { message: "errors.profile.addresses.postalCode.required" }),
	country: z.enum(CountryCode, {
		message: "errors.profile.addresses.country.invalid",
	}),
});

const emergencyContactSchema = z.object({
	firstName: z
		.string()
		.min(2, { message: "errors.profile.contacts.emergency.firstName.min" }),
	lastName: z
		.string()
		.min(2, { message: "errors.profile.contacts.emergency.lastName.min" }),
	phone: z
		.string()
		.min(1, { message: "errors.profile.contacts.emergency.phone.required" }),
	email: z
		.string()
		.email({ message: "errors.profile.contacts.emergency.email.invalid" })
		.optional(),
	relationship: z.enum(FamilyLink, {
		message: "errors.profile.contacts.emergency.relationship.invalid",
	}),
});

const parentSchema = z.object({
	firstName: z
		.string()
		.min(2, { message: "errors.profile.family.parent.firstName.min" })
		.optional(),
	lastName: z
		.string()
		.min(2, { message: "errors.profile.family.parent.lastName.min" })
		.optional(),
});

const spouseSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
});

const passportInfoSchema = z
	.object({
		number: z
			.string()
			.min(6, { message: "errors.profile.passportInfo.number.min" })
			.optional(),
		issueDate: z
			.date()
			.refine(inPast, { message: "errors.profile.passportInfo.issueDate.past" })
			.optional(),
		expiryDate: z
			.date()
			.refine(inFuture, {
				message: "errors.profile.passportInfo.expiryDate.future",
			})
			.optional(),
		issuingAuthority: z
			.string()
			.min(2, { message: "errors.profile.passportInfo.issuingAuthority.min" })
			.optional(),
	})
	.refine(
		(data) => {
			if (data.issueDate && data.expiryDate) {
				return data.expiryDate > data.issueDate;
			}
			return true;
		},
		{
			message: "errors.profile.passportInfo.expiryDate.afterIssue",
			path: ["expiryDate"],
		},
	);

export const profileFormSchema = z.object({
	// Pays de résidence (pour filtrer les services consulaires)
	countryOfResidence: z
		.enum(CountryCode, { message: "errors.profile.countryOfResidence.invalid" })
		.optional(),
	identity: z.object({
		firstName: z
			.string()
			.min(2, { message: "errors.profile.identity.firstName.min" })
			.optional(),
		lastName: z
			.string()
			.min(2, { message: "errors.profile.identity.lastName.min" })
			.optional(),
		birthDate: z
			.date()
			.refine(inPast, { message: "errors.profile.identity.birthDate.past" })
			.refine(isAdult, { message: "errors.profile.identity.birthDate.adult" })
			.optional(),
		birthPlace: z
			.string()
			.min(2, { message: "errors.profile.identity.birthPlace.min" })
			.optional(),
		birthCountry: z
			.enum(CountryCode, {
				message: "errors.profile.identity.birthCountry.invalid",
			})
			.optional(),
		gender: z
			.enum(Gender, { message: "errors.profile.identity.gender.invalid" })
			.optional(),
		nationality: z
			.enum(CountryCode, {
				message: "errors.profile.identity.nationality.invalid",
			})
			.optional(),
		nationalityAcquisition: z
			.enum(NationalityAcquisition, {
				message: "errors.profile.identity.nationalityAcquisition.invalid",
			})
			.optional(),
	}),
	passportInfo: passportInfoSchema.optional(),
	addresses: z.object({
		residence: addressSchema.optional(),
		homeland: addressSchema.optional(),
	}),
	contacts: z.object({
		phone: z.string().optional(),
		email: z
			.string()
			.email({ message: "errors.profile.contacts.email.invalid" })
			.optional(),
		emergencyResidence: emergencyContactSchema.optional(),
		emergencyHomeland: emergencyContactSchema.optional(),
	}),
	family: z
		.object({
			maritalStatus: z
				.enum(MaritalStatus, {
					message: "errors.profile.family.maritalStatus.invalid",
				})
				.optional(),
			father: parentSchema.optional(),
			mother: parentSchema.optional(),
			spouse: spouseSchema.optional(),
		})
		.superRefine((data, ctx) => {
			// Le champ spouse n'est requis que si le statut marital est "marié" ou "pacs/union libre"
			const requiresSpouse =
				data.maritalStatus &&
				[MaritalStatus.Married, MaritalStatus.CivilUnion].includes(
					data.maritalStatus as MaritalStatus,
				);

			if (requiresSpouse) {
				// Si le statut nécessite un conjoint, valider que les champs sont remplis
				if (
					!data.spouse?.firstName ||
					data.spouse.firstName.trim().length < 2
				) {
					ctx.addIssue({
						code: "custom",
						message: "errors.profile.family.spouse.firstName.required",
						path: ["spouse", "firstName"],
					});
				}
				if (!data.spouse?.lastName || data.spouse.lastName.trim().length < 2) {
					ctx.addIssue({
						code: "custom",
						message: "errors.profile.family.spouse.lastName.required",
						path: ["spouse", "lastName"],
					});
				}
			} else {
				// Si le statut ne nécessite pas de conjoint, on ignore complètement les erreurs du champ spouse
				// En supprimant les erreurs existantes pour ce champ
				if (data.spouse) {
					// Si spouse existe mais n'est pas requis, on accepte même s'il est vide
					// Pas besoin d'ajouter d'erreur
				}
			}
		}),
	// Profession / Situation professionnelle
	profession: z
		.object({
			status: z
				.enum([...Object.values(WorkStatus)] as [string, ...string[]], {
					message: "errors.profile.profession.status.invalid",
				})
				.optional(),
			title: z.string().optional(),
			employer: z.string().optional(),
		})
		.optional(),
	documents: z
		.object({
			passport: z.string().optional(),
			identityPhoto: z.string().optional(),
			proofOfAddress: z.string().optional(),
			birthCertificate: z.string().optional(),
			proofOfResidency: z.string().optional(),
		})
		.optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Schémas partiels pour chaque étape
export const identityStepSchema = profileFormSchema.pick({
	identity: true,
	passportInfo: true,
});
export const contactsStepSchema = profileFormSchema.pick({
	countryOfResidence: true,
	addresses: true,
	contacts: true,
});
export const familyStepSchema = profileFormSchema.pick({ family: true });
export const professionStepSchema = profileFormSchema.pick({
	profession: true,
});
