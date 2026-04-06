import { FormFieldType, Gender } from "@convex/lib/constants";
import { CountryCode } from "@convex/lib/countryCodeValidator";
import { z } from "zod";

// ============================================================================
// Date Helpers
// ============================================================================

export const inPast = (date: Date) => date < new Date();
export const inFuture = (date: Date) => date > new Date();
export const isAdult = (date: Date) => {
	const age = new Date().getFullYear() - date.getFullYear();
	return age >= 18;
};

// ============================================================================
// Base Field Schemas - one for each FormFieldType
// ============================================================================

/** Text field - basic string input */
export const textSchema = z
	.string()
	.min(1, { message: "errors.field.required" });

/** Email field - validated email format */
export const emailSchema = z.email({ message: "errors.field.email.invalid" });

/** Phone field - validated phone format (basic) */
export const phoneSchema = z
	.string()
	.min(1, { message: "errors.field.required" })
	.regex(/^[\d\s+\-().]+$/, { message: "errors.field.phone.invalid" });

/** Number field - numeric input */
export const numberSchema = z.number({
	message: "errors.field.number.invalid",
});

/** Date field - ISO date string */
export const dateSchema = z
	.string()
	.refine((val) => !Number.isNaN(Date.parse(val)), {
		message: "errors.field.date.invalid",
	});

/** Select field - string value from options (options validated at runtime) */
export const selectSchema = z
	.string()
	.min(1, { message: "errors.field.required" });

/** Checkbox field - boolean */
export const checkboxSchema = z.boolean();

/** Textarea field - multiline text */
export const textareaSchema = z
	.string()
	.min(1, { message: "errors.field.required" });

/** Document field - uploaded document ID */
export const documentSchema = z
	.string()
	.min(1, { message: "errors.field.document.required" });

/** Country field - country code */
export const countrySchema = z.enum(CountryCode, {
	message: "errors.field.country.invalid",
});

/** Gender field - gender enum */
export const genderSchema = z.enum(Gender, {
	message: "errors.field.gender.invalid",
});

/** Address field - composite address object */
export const addressSchema = z.object({
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

/** Address type inferred from schema */
export type Address = z.infer<typeof addressSchema>;
// ============================================================================
// Field Type to Schema Mapping
// ============================================================================

/**
 * Maps FormFieldType to its corresponding base Zod schema.
 * Use this to build dynamic form validation.
 */
export const fieldTypeSchemas: Record<FormFieldType, z.ZodTypeAny> = {
	[FormFieldType.Text]: textSchema,
	[FormFieldType.Email]: emailSchema,
	[FormFieldType.Phone]: phoneSchema,
	[FormFieldType.Number]: numberSchema,
	[FormFieldType.Date]: dateSchema,
	[FormFieldType.Select]: selectSchema,
	[FormFieldType.Checkbox]: checkboxSchema,
	[FormFieldType.Textarea]: textareaSchema,
	[FormFieldType.File]: documentSchema,
	[FormFieldType.Country]: countrySchema,
	[FormFieldType.Gender]: genderSchema,
	[FormFieldType.ProfileDocument]: documentSchema,
	[FormFieldType.Address]: addressSchema,
	[FormFieldType.Image]: documentSchema,
};

/**
 * Get the base Zod schema for a given field type.
 * Optionally wrap in optional() if the field is not required.
 */
export function getFieldSchema(
	type: FormFieldType,
	required: boolean,
): z.ZodTypeAny {
	const baseSchema = fieldTypeSchemas[type];
	return required ? baseSchema : baseSchema.optional();
}
