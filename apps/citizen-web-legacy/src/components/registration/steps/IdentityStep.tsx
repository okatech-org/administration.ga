import {
	CountryCode,
	Gender,
	NationalityAcquisition,
} from "@convex/lib/constants";
import { useMemo } from "react";
import { type Control, Controller, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
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

// Helper functions to convert between Date and string (YYYY-MM-DD format)
const dateToString = (date: Date | undefined): string => {
	if (!date) return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const stringToDate = (value: string): Date | undefined => {
	if (!value) return undefined;
	const date = new Date(value);
	return isNaN(date.getTime()) ? undefined : date;
};

interface IdentityStepProps {
	control: Control<ProfileFormValues>;
	errors?: FieldErrors<ProfileFormValues>;
}

export function IdentityStep({ control }: IdentityStepProps) {
	const { t } = useTranslation();
	const countryOptions = useMemo(() => {
		return Object.values(CountryCode).map((code) => ({
			value: code,
			label: t(`superadmin.countryCodes.${code}`, code),
		}));
	}, [t]);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("registration.steps.identity.title")}</CardTitle>
					<CardDescription>
						{t("registration.steps.identity.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<FieldSet>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								name="identity.lastName"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-lastName-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-lastName">
												{t("profile.fields.lastName")}
											</FieldLabel>
											<Input
												id="identity-lastName"
												autoComplete="family-name"
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
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
								name="identity.firstName"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-firstName-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-firstName">
												{t("profile.fields.firstName")}
											</FieldLabel>
											<Input
												id="identity-firstName"
												autoComplete="given-name"
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
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
								name="identity.birthDate"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-birthDate-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-birthDate">
												{t("profile.fields.birthDate")}
											</FieldLabel>
											<Input
												id="identity-birthDate"
												type="date"
												autoComplete="bday"
												value={dateToString(field.value)}
												onChange={(e) =>
													field.onChange(stringToDate(e.target.value))
												}
												onBlur={field.onBlur}
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
											/>
											{fieldState.invalid && (
												<FieldError id={errorId} errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>
							<Controller
								name="identity.birthPlace"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-birthPlace-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-birthPlace">
												{t("profile.fields.birthPlace")}
											</FieldLabel>
											<Input
												id="identity-birthPlace"
												autoComplete="address-level2"
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
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
								name="identity.birthCountry"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-birthCountry-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-birthCountry">
												{t("profile.fields.birthCountry")}
											</FieldLabel>
											<Combobox
												options={countryOptions}
												value={field.value}
												onValueChange={field.onChange}
												placeholder={t(
													"registration.labels.selectPlaceholder",
													"Sélectionner...",
												)}
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
											/>
											{fieldState.invalid && (
												<FieldError id={errorId} errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>
							<Controller
								name="identity.gender"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-gender-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-gender">
												{t("profile.fields.gender")}
											</FieldLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="identity-gender"
													aria-invalid={fieldState.invalid}
													aria-describedby={
														fieldState.invalid ? errorId : undefined
													}
												>
													<SelectValue
														placeholder={t(
															"registration.labels.selectPlaceholder",
															"Sélectionner...",
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={Gender.Male}>
														{t("profile.gender.male")}
													</SelectItem>
													<SelectItem value={Gender.Female}>
														{t("profile.gender.female")}
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
							<Controller
								name="identity.nationality"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-nationality-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-nationality">
												{t("profile.fields.nationality")}
											</FieldLabel>
											<Combobox
												options={countryOptions}
												value={field.value}
												onValueChange={field.onChange}
												placeholder={t(
													"registration.labels.selectPlaceholder",
													"Sélectionner...",
												)}
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
											/>
											{fieldState.invalid && (
												<FieldError id={errorId} errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>
							<Controller
								name="identity.nationalityAcquisition"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `identity-nationalityAcquisition-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="identity-nationalityAcquisition">
												{t("profile.fields.nationalityAcquisition")}
											</FieldLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="identity-nationalityAcquisition"
													aria-invalid={fieldState.invalid}
													aria-describedby={
														fieldState.invalid ? errorId : undefined
													}
												>
													<SelectValue
														placeholder={t(
															"registration.labels.selectPlaceholder",
															"Sélectionner...",
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NationalityAcquisition.Birth}>
														{t("profile.nationalityAcquisition.birth")}
													</SelectItem>
													<SelectItem value={NationalityAcquisition.Marriage}>
														{t("profile.nationalityAcquisition.marriage")}
													</SelectItem>
													<SelectItem
														value={NationalityAcquisition.Naturalization}
													>
														{t("profile.nationalityAcquisition.naturalization")}
													</SelectItem>
													<SelectItem value={NationalityAcquisition.Adoption}>
														{t("profile.nationalityAcquisition.adoption")}
													</SelectItem>
													<SelectItem value={NationalityAcquisition.Other}>
														{t("profile.nationalityAcquisition.other")}
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
						</FieldGroup>
					</FieldSet>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("profile.passport.title")}</CardTitle>
					<CardDescription>{t("profile.passport.desc")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<FieldSet>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								name="passportInfo.number"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `passport-number-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="passport-number">
												{t("profile.passport.number")}
											</FieldLabel>
											<Input
												id="passport-number"
												autoComplete="off"
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
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
								name="passportInfo.issuingAuthority"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `passport-authority-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="passport-authority">
												{t("profile.passport.issuingAuthority")}
											</FieldLabel>
											<Input
												id="passport-authority"
												autoComplete="organization"
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
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
								name="passportInfo.issueDate"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `passport-issueDate-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="passport-issueDate">
												{t("profile.passport.issueDate")}
											</FieldLabel>
											<Input
												id="passport-issueDate"
												type="date"
												autoComplete="off"
												value={dateToString(field.value)}
												onChange={(e) =>
													field.onChange(stringToDate(e.target.value))
												}
												onBlur={field.onBlur}
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
											/>
											{fieldState.invalid && (
												<FieldError id={errorId} errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>
							<Controller
								name="passportInfo.expiryDate"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = `passport-expiryDate-error`;
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="passport-expiryDate">
												{t("profile.passport.expiryDate")}
											</FieldLabel>
											<Input
												id="passport-expiryDate"
												type="date"
												autoComplete="off"
												value={dateToString(field.value)}
												onChange={(e) =>
													field.onChange(stringToDate(e.target.value))
												}
												onBlur={field.onBlur}
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
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
				</CardContent>
			</Card>
		</div>
	);
}
