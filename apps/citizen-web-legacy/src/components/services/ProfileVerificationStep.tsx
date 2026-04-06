"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { CountryCode, Gender } from "@convex/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

/**
 * Configuration des champs obligatoires pour une demande de service
 */
export const REQUIRED_SERVICE_FIELDS = {
	identity: {
		firstName: true,
		lastName: true,
		birthDate: true,
		birthPlace: true,
		birthCountry: true,
		gender: true,
		nationality: true,
	},
	addresses: {
		residence: true,
	},
	contacts: {
		phone: true,
		email: true,
	},
	countryOfResidence: true,
} as const;

type MissingField = {
	path: string;
	label: string;
	type: "text" | "date" | "select" | "country" | "gender";
};

interface ProfileVerificationStepProps {
	profile: Doc<"profiles">;
	onComplete: () => void;
}

/**
 * Schema pour les champs pouvant être édités inline
 */
const inlineEditSchema = z.object({
	firstName: z.string().min(2).optional(),
	lastName: z.string().min(2).optional(),
	birthDate: z.string().optional(),
	birthPlace: z.string().min(2).optional(),
	birthCountry: z.enum(CountryCode).optional(),
	gender: z.enum(Gender).optional(),
	nationality: z.enum(CountryCode).optional(),
	phone: z.string().min(1).optional(),
	email: z.string().email().optional(),
	countryOfResidence: z.enum(CountryCode).optional(),
	// Address fields flattened
	residenceStreet: z.string().min(1).optional(),
	residenceCity: z.string().min(1).optional(),
	residencePostalCode: z.string().min(1).optional(),
	residenceCountry: z.enum(CountryCode).optional(),
});

type InlineEditValues = z.infer<typeof inlineEditSchema>;

export function ProfileVerificationStep({
	profile,
	onComplete,
}: ProfileVerificationStepProps) {
	const { t } = useTranslation();
	const [isSaving, setIsSaving] = useState(false);
	const { mutateAsync: updateProfile } = useConvexMutationQuery(
		api.functions.profiles.update,
	);

	/**
	 * Calcule les champs manquants basés sur REQUIRED_SERVICE_FIELDS
	 */
	const missingFields = useMemo((): MissingField[] => {
		const missing: MissingField[] = [];

		// Identity fields
		if (
			REQUIRED_SERVICE_FIELDS.identity.firstName &&
			!profile.identity?.firstName
		) {
			missing.push({
				path: "firstName",
				label: t("profile.identity.firstName"),
				type: "text",
			});
		}
		if (
			REQUIRED_SERVICE_FIELDS.identity.lastName &&
			!profile.identity?.lastName
		) {
			missing.push({
				path: "lastName",
				label: t("profile.identity.lastName"),
				type: "text",
			});
		}
		if (
			REQUIRED_SERVICE_FIELDS.identity.birthDate &&
			!profile.identity?.birthDate
		) {
			missing.push({
				path: "birthDate",
				label: t("profile.identity.birthDate"),
				type: "date",
			});
		}
		if (
			REQUIRED_SERVICE_FIELDS.identity.birthPlace &&
			!profile.identity?.birthPlace
		) {
			missing.push({
				path: "birthPlace",
				label: t("profile.identity.birthPlace"),
				type: "text",
			});
		}
		if (
			REQUIRED_SERVICE_FIELDS.identity.birthCountry &&
			!profile.identity?.birthCountry
		) {
			missing.push({
				path: "birthCountry",
				label: t("profile.identity.birthCountry"),
				type: "country",
			});
		}
		if (REQUIRED_SERVICE_FIELDS.identity.gender && !profile.identity?.gender) {
			missing.push({
				path: "gender",
				label: t("profile.identity.gender"),
				type: "gender",
			});
		}
		if (
			REQUIRED_SERVICE_FIELDS.identity.nationality &&
			!profile.identity?.nationality
		) {
			missing.push({
				path: "nationality",
				label: t("profile.identity.nationality"),
				type: "country",
			});
		}

		// Contacts
		if (REQUIRED_SERVICE_FIELDS.contacts.phone && !profile.contacts?.phone) {
			missing.push({
				path: "phone",
				label: t("profile.contacts.phone"),
				type: "text",
			});
		}
		if (REQUIRED_SERVICE_FIELDS.contacts.email && !profile.contacts?.email) {
			missing.push({
				path: "email",
				label: t("profile.contacts.email"),
				type: "text",
			});
		}

		// Country of residence
		if (
			REQUIRED_SERVICE_FIELDS.countryOfResidence &&
			!profile.countryOfResidence
		) {
			missing.push({
				path: "countryOfResidence",
				label: t("profile.countryOfResidence"),
				type: "country",
			});
		}

		// Address
		if (REQUIRED_SERVICE_FIELDS.addresses.residence) {
			const addr = profile.addresses?.residence;
			if (!addr?.street) {
				missing.push({
					path: "residenceStreet",
					label: t("profile.addresses.street"),
					type: "text",
				});
			}
			if (!addr?.city) {
				missing.push({
					path: "residenceCity",
					label: t("profile.addresses.city"),
					type: "text",
				});
			}
			if (!addr?.postalCode) {
				missing.push({
					path: "residencePostalCode",
					label: t("profile.addresses.postalCode"),
					type: "text",
				});
			}
			if (!addr?.country) {
				missing.push({
					path: "residenceCountry",
					label: t("profile.addresses.country"),
					type: "country",
				});
			}
		}

		return missing;
	}, [profile, t]);

	const isComplete = missingFields.length === 0;

	const form = useForm<InlineEditValues>({
		resolver: zodResolver(inlineEditSchema),
		defaultValues: {},
	});

	const handleSubmit = async (data: InlineEditValues) => {
		setIsSaving(true);
		try {
			// Construire le payload avec les champs modifiés
			const payload: Record<string, unknown> = {};

			// Identity fields
			const identity: Record<string, unknown> = { ...profile.identity };
			if (data.firstName) identity.firstName = data.firstName;
			if (data.lastName) identity.lastName = data.lastName;
			if (data.birthDate)
				identity.birthDate = new Date(data.birthDate).getTime();
			if (data.birthPlace) identity.birthPlace = data.birthPlace;
			if (data.birthCountry) identity.birthCountry = data.birthCountry;
			if (data.gender) identity.gender = data.gender;
			if (data.nationality) identity.nationality = data.nationality;

			if (Object.keys(identity).length > 0) {
				payload.identity = identity;
			}

			// Contacts
			const contacts: Record<string, unknown> = { ...profile.contacts };
			if (data.phone) contacts.phone = data.phone;
			if (data.email) contacts.email = data.email;

			if (data.phone || data.email) {
				payload.contacts = contacts;
			}

			// Country of residence
			if (data.countryOfResidence) {
				payload.countryOfResidence = data.countryOfResidence;
			}

			// Address
			if (
				data.residenceStreet ||
				data.residenceCity ||
				data.residencePostalCode ||
				data.residenceCountry
			) {
				const existingAddr = profile.addresses?.residence as
					| {
							street?: string;
							city?: string;
							postalCode?: string;
							country?: string;
					  }
					| undefined;
				payload.addresses = {
					...profile.addresses,
					residence: {
						street: data.residenceStreet || existingAddr?.street || "",
						city: data.residenceCity || existingAddr?.city || "",
						postalCode:
							data.residencePostalCode || existingAddr?.postalCode || "",
						country: data.residenceCountry || existingAddr?.country,
					},
				};
			}

			await updateProfile({
				id: profile._id,
				...payload,
			});

			toast.success(t("common.saved"));
		} catch (error) {
			console.error("Error updating profile:", error);
			toast.error(t("common.error"));
		} finally {
			setIsSaving(false);
		}
	};

	const renderField = (field: MissingField) => {
		const fieldName = field.path as keyof InlineEditValues;

		return (
			<Controller
				key={field.path}
				name={fieldName}
				control={form.control}
				render={({ field: formField, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor={`field-${field.path}`}>
							{field.label} <span className="text-destructive">*</span>
						</FieldLabel>

						{field.type === "text" && (
							<Input
								id={`field-${field.path}`}
								{...formField}
								value={(formField.value as string) || ""}
								placeholder={field.label}
							/>
						)}

						{field.type === "date" && (
							<Input
								id={`field-${field.path}`}
								type="date"
								{...formField}
								value={(formField.value as string) || ""}
							/>
						)}

						{field.type === "country" && (
							<Select
								onValueChange={formField.onChange}
								value={(formField.value as string) || ""}
							>
								<SelectTrigger id={`field-${field.path}`}>
									<SelectValue
										placeholder={t("common.select")}
									/>
								</SelectTrigger>
								<SelectContent>
									{Object.values(CountryCode).map((code) => (
										<SelectItem key={code} value={code}>
											{code}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						{field.type === "gender" && (
							<Select
								onValueChange={formField.onChange}
								value={(formField.value as string) || ""}
							>
								<SelectTrigger id={`field-${field.path}`}>
									<SelectValue
										placeholder={t("common.select")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="M">{t("gender.male")}</SelectItem>
									<SelectItem value="F">
										{t("gender.female")}
									</SelectItem>
								</SelectContent>
							</Select>
						)}

						{fieldState.error && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>
		);
	};

	return (
		<>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isComplete ? (
						<CheckCircle2 className="h-5 w-5 text-green-600" />
					) : (
						<AlertTriangle className="h-5 w-5 text-amber-600" />
					)}
					{t("service.profileVerification.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{isComplete ? (
					<>
						<Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
							<CheckCircle2 className="h-4 w-4 text-green-600" />
							<AlertTitle className="text-green-700 dark:text-green-400">
								{t(
									"service.profileVerification.complete.title",
									"Profil complet",
								)}
							</AlertTitle>
							<AlertDescription className="text-green-600 dark:text-green-400">
								{t(
									"service.profileVerification.complete.description",
									"Votre profil contient toutes les informations requises. Vous pouvez passer à l'étape suivante.",
								)}
							</AlertDescription>
						</Alert>
						<Button type="button" onClick={onComplete} className="w-full">
							{t("common.continue")}
						</Button>
					</>
				) : (
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>
								{t(
									"service.profileVerification.incomplete.title",
									"Informations manquantes",
								)}
							</AlertTitle>
							<AlertDescription>
								{t(
									"service.profileVerification.incomplete.description",
									"Veuillez compléter les informations suivantes pour continuer :",
								)}
							</AlertDescription>
						</Alert>

						<FieldGroup>{missingFields.map(renderField)}</FieldGroup>

						<Button type="submit" className="w-full" disabled={isSaving}>
							{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{t("common.saveAndContinue")}
						</Button>
					</form>
				)}
			</CardContent>
		</>
	);
}
