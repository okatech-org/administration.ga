"use client";

import { AddressInput } from "@workspace/ui/components/address-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountrySelect } from "@/components/ui/country-select";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usePlacesAutocomplete } from "@/hooks/use-places-autocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import { CountryCode, PublicUserType } from "@convex/lib/constants";
import { Home, Phone, Plus, Trash2 } from "lucide-react";
import { forwardRef, useImperativeHandle, useMemo } from "react";
import {
	Controller,
	useFieldArray,
	useForm,
	type UseFormReturn,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	contactsSchemaFor,
	type ContactsValues,
} from "../lib/schemas";
import type { StepHandle } from "../lib/stepHandle";
import type { OnboardingData } from "../types";

type Props = {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	userType: PublicUserType;
};

export const ContactsStep = forwardRef<StepHandle, Props>(function ContactsStep(
	{ data, updateData, userType },
	ref,
) {
	const { t } = useTranslation();
	const isLong = userType === PublicUserType.LongStay;
	const isForeigner =
		userType === PublicUserType.VisaTourism ||
		userType === PublicUserType.VisaBusiness ||
		userType === PublicUserType.VisaLongStay ||
		userType === PublicUserType.AdminServices;
	const wantsEmergency = isLong || isForeigner;
	const wantsHomeland = isLong;

	const schema = useMemo(() => contactsSchemaFor(userType), [userType]);

	const form = useForm<ContactsValues>({
		resolver: zodResolver(schema),
		mode: "onTouched",
		defaultValues: {
			address: {
				street: data.address?.street ?? data.address?.full ?? "",
				city: data.address?.city ?? "",
				postalCode: data.address?.postalCode ?? "",
				country: data.address?.country ?? CountryCode.FR,
				full: data.address?.full,
				lat: data.address?.lat,
				lng: data.address?.lng,
			},
			homeland: data.homeland ?? undefined,
			emergencyContacts:
				data.emergencyContacts && data.emergencyContacts.length > 0
					? (data.emergencyContacts as ContactsValues["emergencyContacts"])
					: wantsEmergency
						? ([{ firstName: "", lastName: "", phone: "" }] as ContactsValues["emergencyContacts"])
						: undefined,
		},
	});

	useImperativeHandle(
		ref,
		() => ({
			async validateAndNext() {
				const ok = await form.trigger();
				if (!ok) return false;
				updateData(form.getValues() as Partial<OnboardingData>);
				return true;
			},
		}),
		[form, updateData],
	);

	const places = usePlacesAutocomplete({
		components:
			"country:fr|country:ga|country:be|country:ch|country:ca|country:us|country:gb|country:de|country:es|country:it",
		debounceMs: 350,
	});

	const autocompleteAdapter = useMemo(
		() => ({
			setInput: places.setInput,
			predictions: places.predictions.map((p) => ({
				placeId: p.placeId,
				mainText: p.mainText,
				secondaryText: p.secondaryText,
			})),
			isLoading: places.isLoading,
			getPlaceDetails: async (placeId: string) => {
				const d = await places.getPlaceDetails(placeId);
				if (!d) return null;
				return {
					street: d.street,
					city: d.city,
					postalCode: d.postalCode,
					countryCode: d.countryCode,
					formattedAddress: d.formattedAddress,
					lat: d.lat,
					lng: d.lng,
				};
			},
			clear: places.clear,
		}),
		[places],
	);

	return (
		<form
			onSubmit={(e) => e.preventDefault()}
			className="flex flex-col gap-5"
		>
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.contacts.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.contacts.subtitle")}
				</p>
			</header>

			<Card>
				<CardContent className="flex flex-col gap-4 p-5">
					<Controller
						control={form.control}
						name="address"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<AddressInput
									value={{
										street: field.value?.street ?? "",
										city: field.value?.city ?? "",
										postalCode: field.value?.postalCode ?? "",
										country: field.value?.country ?? CountryCode.FR,
										lat: field.value?.lat,
										lng: field.value?.lng,
									}}
									onChange={(next) =>
										field.onChange({
											...(field.value ?? {}),
											street: next.street,
											city: next.city,
											postalCode: next.postalCode,
											country: next.country,
											lat: next.lat,
											lng: next.lng,
										})
									}
									autocomplete={autocompleteAdapter}
									countrySelector={
										<CountrySelect
											type="single"
											selected={
												(field.value?.country as CountryCode) ?? CountryCode.FR
											}
											onChange={(v) =>
												field.onChange({ ...(field.value ?? {}), country: v })
											}
										/>
									}
									showCoordinates={false}
									labels={{
										street: t("onboarding.contacts.address.street"),
										streetPlaceholder: t(
											"onboarding.contacts.address.streetPlaceholder",
										),
										city: t("onboarding.contacts.address.city"),
										postalCode: t("onboarding.contacts.address.postalCode"),
										country: t("onboarding.contacts.address.country"),
									}}
								/>
								{fieldState.invalid && (
									<FieldError
										errors={[
											fieldState.error,
											...((fieldState.error &&
												"types" in (fieldState.error as object)
												? []
												: []) as never),
										]}
									/>
								)}
							</Field>
						)}
					/>
				</CardContent>
			</Card>

			{wantsHomeland && (
				<Card>
					<CardContent className="flex flex-col gap-4 p-5">
						<div className="flex items-center gap-2">
							<Home className="size-4 text-gabon-green" />
							<h3 className="text-sm font-semibold" suppressHydrationWarning>
								{t("onboarding.contacts.homeland.title")}
							</h3>
						</div>
						<Controller
							control={form.control}
							name="homeland.full"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="homelandFull" suppressHydrationWarning>
										{t("onboarding.contacts.homeland.fullLabel")}
									</FieldLabel>
									<Input
										id="homelandFull"
										placeholder={t("onboarding.contacts.homeland.placeholder")}
										aria-invalid={fieldState.invalid}
										{...field}
										value={field.value ?? ""}
									/>
									<p
										className="text-xs text-muted-foreground"
										suppressHydrationWarning
									>
										{t("onboarding.contacts.homeland.help")}
									</p>
								</Field>
							)}
						/>
					</CardContent>
				</Card>
			)}

			{wantsEmergency && <EmergencyContactsSection form={form} />}
		</form>
	);
});

function EmergencyContactsSection({
	form,
}: {
	form: UseFormReturn<ContactsValues>;
}) {
	const { t } = useTranslation();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "emergencyContacts" as const,
	});

	return (
		<Card className="border-gabon-yellow/40 bg-gabon-yellow-tint/30">
			<CardContent className="flex flex-col gap-4 p-5">
				<div className="flex items-center gap-2">
					<Phone className="size-4 text-gabon-yellow" />
					<h3 className="text-sm font-semibold" suppressHydrationWarning>
						{t("onboarding.contacts.emergency.title")}
					</h3>
				</div>
				<p
					className="text-xs text-muted-foreground"
					suppressHydrationWarning
				>
					{t("onboarding.contacts.emergency.description")}
				</p>

				<div className="flex flex-col gap-3">
					{fields.map((f, i) => (
						<div
							key={f.id}
							className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
						>
							<div className="flex items-center justify-between">
								<strong
									className="text-xs uppercase tracking-wide text-muted-foreground"
									suppressHydrationWarning
								>
									{t("onboarding.contacts.emergency.contactN", { n: i + 1 })}
								</strong>
								{fields.length > 1 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
										onClick={() => remove(i)}
										aria-label={t(
											"onboarding.contacts.emergency.removeAria",
										)}
									>
										<Trash2 className="size-3.5" />
									</Button>
								)}
							</div>
							<FieldGroup className="grid gap-3 md:grid-cols-2">
								<Controller
									control={form.control}
									name={`emergencyContacts.${i}.firstName` as const}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel suppressHydrationWarning>
												{t("onboarding.contacts.emergency.firstName")}{" "}
												<span className="text-destructive">*</span>
											</FieldLabel>
											<Input
												aria-invalid={fieldState.invalid}
												{...field}
												value={field.value ?? ""}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									control={form.control}
									name={`emergencyContacts.${i}.lastName` as const}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel suppressHydrationWarning>
												{t("onboarding.contacts.emergency.lastName")}{" "}
												<span className="text-destructive">*</span>
											</FieldLabel>
											<Input
												aria-invalid={fieldState.invalid}
												{...field}
												value={field.value ?? ""}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									control={form.control}
									name={`emergencyContacts.${i}.phone` as const}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel suppressHydrationWarning>
												{t("onboarding.contacts.emergency.phone")}{" "}
												<span className="text-destructive">*</span>
											</FieldLabel>
											<Input
												type="tel"
												aria-invalid={fieldState.invalid}
												{...field}
												value={field.value ?? ""}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									control={form.control}
									name={`emergencyContacts.${i}.email` as const}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel suppressHydrationWarning>
												{t("onboarding.contacts.emergency.email")}
											</FieldLabel>
											<Input
												type="email"
												aria-invalid={fieldState.invalid}
												{...field}
												value={field.value ?? ""}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<Controller
									control={form.control}
									name={`emergencyContacts.${i}.country` as const}
									render={({ field }) => (
										<Field className="md:col-span-2">
											<FieldLabel suppressHydrationWarning>
												{t("onboarding.contacts.emergency.country")}
											</FieldLabel>
											<CountrySelect
												type="single"
												selected={(field.value as CountryCode) ?? CountryCode.GA}
												onChange={(v) => field.onChange(v)}
											/>
										</Field>
									)}
								/>
							</FieldGroup>
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						className="border-dashed"
						onClick={() =>
							append({
								firstName: "",
								lastName: "",
								phone: "",
							} as ContactsValues["emergencyContacts"] extends Array<infer T>
								? T
								: never)
						}
					>
						<Plus className="mr-1 size-4" />
						<span suppressHydrationWarning>
							{t("onboarding.contacts.emergency.add")}
						</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
