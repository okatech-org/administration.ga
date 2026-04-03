import { CountryCode, FamilyLink } from "@convex/lib/constants";
import type { TFunction } from "i18next";
import { Plus, Trash2, Info } from "lucide-react";
import { useMemo } from "react";
import {
	type Control,
	Controller,
	type FieldErrors,
	useFieldArray,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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

interface ContactsStepProps {
	control: Control<ProfileFormValues>;
	errors?: FieldErrors<ProfileFormValues>;
}

function EmergencyContactEntry({
	control,
	index,
	countryOptions,
	onRemove,
	canRemove,
	t,
}: {
	control: Control<ProfileFormValues>;
	index: number;
	countryOptions: Array<{ value: string; label: string }>;
	onRemove: () => void;
	canRemove: boolean;
	t: TFunction<"translation", undefined>;
}) {
	const namePrefix = `contacts.emergencyContacts.${index}` as const;

	return (
		<FieldSet className="relative rounded-lg border p-4">
			{canRemove && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="absolute top-2 right-2 text-destructive hover:text-destructive"
					onClick={onRemove}
					aria-label={t("profile.emergencyContacts.remove")}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			)}

			<FieldLegend>
				{t("profile.emergencyContacts.contactNumber", {
					number: index + 1,
				})}
			</FieldLegend>

			<FieldGroup className="grid gap-4 md:grid-cols-2">
				{/* Country */}
				<Controller
					name={`${namePrefix}.country`}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-country-error`;
						return (
							<Field
								className="md:col-span-2"
								data-invalid={fieldState.invalid}
							>
								<FieldLabel htmlFor={`${namePrefix}-country`}>
									{t("profile.emergencyContacts.country")}
								</FieldLabel>
								<Combobox
									options={countryOptions}
									value={field.value}
									onValueChange={field.onChange}
									placeholder={t("registration.labels.selectPlaceholder")}
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? errorId : undefined}
								/>
								{fieldState.invalid && (
									<FieldError id={errorId} errors={[fieldState.error]} />
								)}
							</Field>
						);
					}}
				/>

				{/* First name */}
				<Controller
					name={`${namePrefix}.firstName`}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-firstName-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-firstName`}>
									{t("profile.fields.firstName")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-firstName`}
									autoComplete="given-name"
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

				{/* Last name */}
				<Controller
					name={`${namePrefix}.lastName`}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-lastName-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-lastName`}>
									{t("profile.fields.lastName")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-lastName`}
									autoComplete="family-name"
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

				{/* Phone */}
				<Controller
					name={`${namePrefix}.phone`}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-phone-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-phone`}>
									{t("profile.fields.phone")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-phone`}
									type="tel"
									autoComplete="tel"
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

				{/* Email */}
				<Controller
					name={`${namePrefix}.email`}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-email-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-email`}>
									{t("profile.fields.email")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-email`}
									type="email"
									autoComplete="email"
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

				{/* Relationship */}
				<Controller
					name={`${namePrefix}.relationship`}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-relationship-error`;
						return (
							<Field
								className="md:col-span-2"
								data-invalid={fieldState.invalid}
							>
								<FieldLabel htmlFor={`${namePrefix}-relationship`}>
									{t("profile.fields.relationship")}
								</FieldLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id={`${namePrefix}-relationship`}
										aria-invalid={fieldState.invalid}
										aria-describedby={fieldState.invalid ? errorId : undefined}
									>
										<SelectValue
											placeholder={t("registration.labels.selectPlaceholder")}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={FamilyLink.Father}>
											{t("profile.relationship.father")}
										</SelectItem>
										<SelectItem value={FamilyLink.Mother}>
											{t("profile.relationship.mother")}
										</SelectItem>
										<SelectItem value={FamilyLink.Spouse}>
											{t("profile.relationship.spouse")}
										</SelectItem>
										<SelectItem value={FamilyLink.BrotherSister}>
											{t("profile.relationship.brotherSister")}
										</SelectItem>
										<SelectItem value={FamilyLink.Child}>
											{t("profile.relationship.child")}
										</SelectItem>
										<SelectItem value={FamilyLink.LegalGuardian}>
											{t("profile.relationship.legalGuardian")}
										</SelectItem>
										<SelectItem value={FamilyLink.Other}>
											{t("profile.relationship.other")}
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
	);
}

function AddressSection({
	control,
	namePrefix,
	title,
	sectionName,
	countryOptions,
	t,
}: {
	control: Control<ProfileFormValues>;
	namePrefix: "addresses.homeland" | "addresses.residence";
	title: string;
	sectionName: "homeland" | "residence";
	countryOptions: Array<{ value: string; label: string }>;
	t: TFunction<"translation", undefined>;
}) {
	return (
		<FieldSet>
			<FieldLegend>{title}</FieldLegend>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Controller
					name={`${namePrefix}.country` as any}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-country-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-country`}>
									{t("profile.fields.country")}
								</FieldLabel>
								<Combobox
									options={countryOptions}
									value={field.value}
									onValueChange={field.onChange}
									placeholder={t("registration.labels.selectPlaceholder")}
									aria-invalid={fieldState.invalid}
									aria-describedby={fieldState.invalid ? errorId : undefined}
								/>
								{fieldState.invalid && (
									<FieldError id={errorId} errors={[fieldState.error]} />
								)}
							</Field>
						);
					}}
				/>
				<Controller
					name={`${namePrefix}.city` as any}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-city-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-city`}>
									{t("profile.fields.city")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-city`}
									autoComplete={`section-${sectionName} address-level2`}
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
					name={`${namePrefix}.postalCode` as any}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-postalCode-error`;
						return (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${namePrefix}-postalCode`}>
									{t("common.postalCode")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-postalCode`}
									autoComplete={`section-${sectionName} postal-code`}
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
					name={`${namePrefix}.street` as any}
					control={control}
					render={({ field, fieldState }) => {
						const errorId = `${namePrefix}-street-error`;
						return (
							<Field
								className="md:col-span-2"
								data-invalid={fieldState.invalid}
							>
								<FieldLabel htmlFor={`${namePrefix}-street`}>
									{t("profile.fields.street")}
								</FieldLabel>
								<Input
									id={`${namePrefix}-street`}
									autoComplete={`section-${sectionName} street-address`}
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

export function ContactsStep({ control }: ContactsStepProps) {
	const { t } = useTranslation();
	const countryOptions = useMemo(() => {
		return Object.values(CountryCode).map((code) => ({
			value: code,
			label: t(`superadmin.countryCodes.${code}`, code),
		}));
	}, [t]);

	const { fields, append, remove } = useFieldArray({
		control,
		name: "contacts.emergencyContacts",
	});

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("registration.steps.contacts.title")}</CardTitle>
					<CardDescription>
						{t("registration.steps.contacts.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Pays de residence */}
					<FieldSet>
						<FieldLegend>{t("profile.sections.residenceCountry")}</FieldLegend>
						<FieldGroup>
							<Controller
								name="countryOfResidence"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = "countryOfResidence-error";
									return (
										<Field
											className="max-w-md"
											data-invalid={fieldState.invalid}
										>
											<FieldLabel htmlFor="countryOfResidence">
												{t("profile.fields.countryOfResidence")}
											</FieldLabel>
											<Combobox
												options={countryOptions}
												value={field.value}
												onValueChange={field.onChange}
												placeholder={t("registration.labels.selectPlaceholder")}
												aria-invalid={fieldState.invalid}
												aria-describedby={
													fieldState.invalid ? errorId : undefined
												}
											/>
											<p className="text-sm text-muted-foreground mt-1">
												{t("profile.fields.countryOfResidenceDesc")}
											</p>
											{fieldState.invalid && (
												<FieldError id={errorId} errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>
						</FieldGroup>
					</FieldSet>

					<FieldSet>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								name="contacts.email"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = "contacts-email-error";
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="contacts-email">
												{t("profile.fields.email")}
											</FieldLabel>
											<Input
												id="contacts-email"
												type="email"
												autoComplete="email"
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
								name="contacts.phone"
								control={control}
								render={({ field, fieldState }) => {
									const errorId = "contacts-phone-error";
									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="contacts-phone">
												{t("profile.fields.phone")}
											</FieldLabel>
											<Input
												id="contacts-phone"
												type="tel"
												autoComplete="tel"
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
						</FieldGroup>
					</FieldSet>

					<AddressSection
						control={control}
						namePrefix="addresses.homeland"
						title={t("profile.sections.addressHome")}
						sectionName="homeland"
						countryOptions={countryOptions}
						t={t}
					/>

					<AddressSection
						control={control}
						namePrefix="addresses.residence"
						title={t("profile.sections.addressAbroad")}
						sectionName="residence"
						countryOptions={countryOptions}
						t={t}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("profile.sections.emergencyContacts")}</CardTitle>
					<CardDescription>
						{t("profile.sections.emergencyContactsDesc")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Recommendation message */}
					<div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
						<Info className="h-5 w-5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
						<p className="text-sm text-blue-800 dark:text-blue-200">
							{t("profile.emergencyContacts.recommendation")}
						</p>
					</div>

					{/* Dynamic emergency contacts list */}
					{fields.map((field, index) => (
						<EmergencyContactEntry
							key={field.id}
							control={control}
							index={index}
							countryOptions={countryOptions}
							onRemove={() => remove(index)}
							canRemove={fields.length > 1}
							t={t}
						/>
					))}

					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() =>
							append({
								firstName: "",
								lastName: "",
								phone: "",
								email: undefined,
								relationship: undefined as any,
								country: undefined,
							})
						}
					>
						<Plus className="h-4 w-4 mr-2" />
						{t("profile.emergencyContacts.add")}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
