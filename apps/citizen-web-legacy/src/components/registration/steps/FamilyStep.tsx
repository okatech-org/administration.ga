import { MaritalStatus } from "@convex/lib/constants";
import type { TFunction } from "i18next";
import { useEffect } from "react";
import {
	type Control,
	Controller,
	type FieldErrors,
	useFormContext,
	useWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProfileFormValues } from "@/lib/validation/profile";

interface FamilyStepProps {
	control: Control<ProfileFormValues>;
	errors?: FieldErrors<ProfileFormValues>;
}

function ParentSection({
	control,
	namePrefix,
	title,
	sectionName,
	t,
}: {
	control: Control<ProfileFormValues>;
	namePrefix: "family.father" | "family.mother";
	title: string;
	sectionName: "father" | "mother";
	t: TFunction<"translation", undefined>;
}) {
	return (
		<FieldSet>
			<FieldLegend>{title}</FieldLegend>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Controller
					name={`${namePrefix}.firstName` as any}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-firstName-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-firstName`}>
									{t("common.firstName")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-firstName`}
									autoComplete={`section-${sectionName} given-name`}
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? errorId : undefined}
									{...field}
								/>
								{fieldState.invalid && (
									<FieldError id={errorId} errors={[fieldState.error]} />
								)}
							</Field>
						);
					}}
				/>
				<Controller
					name={`${namePrefix}.lastName` as any}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-lastName-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-lastName`}>
									{t("common.lastName")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-lastName`}
									autoComplete={`section-${sectionName} family-name`}
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? errorId : undefined}
									{...field}
								/>
								{fieldState.invalid && (
									<FieldError id={errorId} errors={[fieldState.error]} />
								)}
							</Field>
						);
					}}
				/>
			</FieldGroup>
		</FieldSet>
	);
}

export function FamilyStep({ control, errors }: FamilyStepProps) {
	const { t } = useTranslation();
	const { setValue, clearErrors, trigger } =
		useFormContext<ProfileFormValues>();
	const maritalStatus = useWatch({ control, name: "family.maritalStatus" });
	const isPartnerRequired =
		maritalStatus &&
		[MaritalStatus.Married, MaritalStatus.CivilUnion].includes(maritalStatus);

	// Réinitialiser le champ spouse quand le statut marital change et ne nécessite plus de conjoint
	useEffect(() => {
		if (!isPartnerRequired && maritalStatus) {
			// Réinitialiser les valeurs
			setValue(
				"family.spouse",
				{ firstName: "", lastName: "" },
				{ shouldValidate: false, shouldTouch: false },
			);
			// Supprimer les erreurs du champ spouse
			clearErrors("family.spouse");
		}
	}, [maritalStatus, isPartnerRequired, setValue, clearErrors]);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("registration.steps.family.title")}</CardTitle>
					<CardDescription>
						{t("registration.steps.family.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-8">
					<FieldSet>
						<Controller
							name="family.maritalStatus"
							control={control}
							render={({ field, fieldState }) => {
								const errorId = "family-maritalStatus-error";
								return (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="family-maritalStatus">
											{t("profile.fields.maritalStatus")}
										</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger
												id="family-maritalStatus"
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
											>
												<SelectValue
													placeholder={t(
														"registration.labels.selectPlaceholder",
													)}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={MaritalStatus.Single}>
													{t("profile.maritalStatus.single")}
												</SelectItem>
												<SelectItem value={MaritalStatus.Married}>
													{t("profile.maritalStatus.married")}
												</SelectItem>
												<SelectItem value={MaritalStatus.Divorced}>
													{t("profile.maritalStatus.divorced")}
												</SelectItem>
												<SelectItem value={MaritalStatus.Widowed}>
													{t("profile.maritalStatus.widowed")}
												</SelectItem>
												<SelectItem value={MaritalStatus.CivilUnion}>
													{t("profile.maritalStatus.civilUnion")}
												</SelectItem>
												<SelectItem value={MaritalStatus.Cohabiting}>
													{t("profile.maritalStatus.cohabiting")}
												</SelectItem>
											</SelectContent>
										</Select>
										{fieldState.invalid && (
											<FieldError id={errorId} errors={[fieldState.error]} />
										)}
									</Field>
								);
							}}
						/>

						{isPartnerRequired && (
							<FieldSet>
								<FieldLegend>{t("profile.family.spouse")} *</FieldLegend>
								<FieldGroup className="grid gap-4 md:grid-cols-2">
									<Controller
										name="family.spouse.firstName"
										control={control}
										render={({ field, fieldState }) => {
											const errorId = "family-spouse-firstName-error";
											return (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel htmlFor="family-spouse-firstName">
														{t("common.firstName")} *
													</FieldLabel>
													<Input
														id="family-spouse-firstName"
														autoComplete="section-spouse given-name"
														aria-invalid={fieldState.invalid}
														aria-describedby={
															fieldState.invalid ? errorId : undefined
														}
														{...field}
													/>
													{fieldState.invalid && (
														<FieldError
															id={errorId}
															errors={[fieldState.error]}
														/>
													)}
												</Field>
											);
										}}
									/>
									<Controller
										name="family.spouse.lastName"
										control={control}
										render={({ field, fieldState }) => {
											const errorId = "family-spouse-lastName-error";
											return (
												<Field data-invalid={fieldState.invalid}>
													<FieldLabel htmlFor="family-spouse-lastName">
														{t("common.lastName")} *
													</FieldLabel>
													<Input
														id="family-spouse-lastName"
														autoComplete="section-spouse family-name"
														aria-invalid={fieldState.invalid}
														aria-describedby={
															fieldState.invalid ? errorId : undefined
														}
														{...field}
													/>
													{fieldState.invalid && (
														<FieldError
															id={errorId}
															errors={[fieldState.error]}
														/>
													)}
												</Field>
											);
										}}
									/>
								</FieldGroup>
							</FieldSet>
						)}
					</FieldSet>

					<ParentSection
						control={control}
						namePrefix="family.father"
						title={t("profile.family.father")}
						sectionName="father"
						t={t}
					/>
					<ParentSection
						control={control}
						namePrefix="family.mother"
						title={t("profile.family.mother")}
						sectionName="mother"
						t={t}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
