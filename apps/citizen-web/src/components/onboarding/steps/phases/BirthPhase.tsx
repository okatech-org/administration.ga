"use client";

import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { CountryCode } from "@convex/lib/constants";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { birthSchema, type BirthValues } from "../../lib/schemas";
import type { OnboardingData } from "../../types";

export function BirthPhase({
	data,
	updateData,
	onNext,
	onPrev,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	onNext: () => void;
	onPrev: () => void;
}) {
	const { t } = useTranslation();

	const form = useForm<BirthValues>({
		resolver: zodResolver(birthSchema),
		mode: "onTouched",
		defaultValues: {
			birthDate: data.birthDate ?? "",
			birthPlace: data.birthPlace ?? "",
			birthCountry: data.birthCountry ?? CountryCode.GA,
			gender: data.gender ?? undefined,
			nationality: data.nationality ?? CountryCode.GA,
			nationalityAcquisition: data.nationalityAcquisition ?? "birth",
			nip: data.nip ?? "",
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		updateData(values);
		onNext();
	});

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.identity.birth.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.birth.subtitle")}
				</p>
			</header>

			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Controller
					control={form.control}
					name="birthDate"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="birthDate" suppressHydrationWarning>
								{t("onboarding.identity.birth.birthDate")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="birthDate"
								type="date"
								aria-invalid={fieldState.invalid}
								{...field}
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="birthPlace"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="birthPlace" suppressHydrationWarning>
								{t("onboarding.identity.birth.birthPlace")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="birthPlace"
								placeholder={t("onboarding.identity.birth.birthPlacePlaceholder")}
								aria-invalid={fieldState.invalid}
								{...field}
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="birthCountry"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel suppressHydrationWarning>
								{t("onboarding.identity.birth.birthCountry")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<CountrySelect
								type="single"
								selected={(field.value as CountryCode) ?? CountryCode.GA}
								onChange={(v) => field.onChange(v)}
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="gender"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="gender" suppressHydrationWarning>
								{t("onboarding.identity.birth.gender")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Select
								value={field.value ?? ""}
								onValueChange={(v: "Male" | "Female") => field.onChange(v)}
							>
								<SelectTrigger
									id="gender"
									className="w-full"
									aria-invalid={fieldState.invalid}
								>
									<SelectValue
										placeholder={t(
											"onboarding.identity.birth.selectPlaceholder",
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Male">
										<span suppressHydrationWarning>
											{t("onboarding.identity.birth.genderOptions.male")}
										</span>
									</SelectItem>
									<SelectItem value="Female">
										<span suppressHydrationWarning>
											{t("onboarding.identity.birth.genderOptions.female")}
										</span>
									</SelectItem>
								</SelectContent>
							</Select>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="nationality"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel suppressHydrationWarning>
								{t("onboarding.identity.birth.nationality")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<CountrySelect
								type="single"
								selected={(field.value as CountryCode) ?? CountryCode.GA}
								onChange={(v) => field.onChange(v)}
							/>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="nationalityAcquisition"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel
								htmlFor="nationalityAcquisition"
								suppressHydrationWarning
							>
								{t("onboarding.identity.birth.nationalityAcquisition")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Select
								value={field.value}
								onValueChange={(v: "birth" | "naturalization" | "marriage") =>
									field.onChange(v)
								}
							>
								<SelectTrigger
									id="nationalityAcquisition"
									className="w-full"
									aria-invalid={fieldState.invalid}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="birth">
										<span suppressHydrationWarning>
											{t("onboarding.identity.birth.acquisitionOptions.birth")}
										</span>
									</SelectItem>
									<SelectItem value="naturalization">
										<span suppressHydrationWarning>
											{t(
												"onboarding.identity.birth.acquisitionOptions.naturalization",
											)}
										</span>
									</SelectItem>
									<SelectItem value="marriage">
										<span suppressHydrationWarning>
											{t(
												"onboarding.identity.birth.acquisitionOptions.marriage",
											)}
										</span>
									</SelectItem>
								</SelectContent>
							</Select>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="nip"
					render={({ field, fieldState }) => (
						<Field
							data-invalid={fieldState.invalid}
							className="md:col-span-2"
						>
							<FieldLabel htmlFor="nip" suppressHydrationWarning>
								{t("onboarding.identity.birth.nip")}{" "}
								<span className="text-xs text-muted-foreground">
									{t("onboarding.identity.birth.nipOptional")}
								</span>
							</FieldLabel>
							<Input
								id="nip"
								placeholder={t("onboarding.identity.birth.nipPlaceholder")}
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
			</FieldGroup>

			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={onPrev}>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>
						{t("onboarding.identity.birth.back")}
					</span>
				</Button>
				<Button type="submit" disabled={form.formState.isSubmitting}>
					<span suppressHydrationWarning>
						{t("onboarding.identity.birth.continue")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
