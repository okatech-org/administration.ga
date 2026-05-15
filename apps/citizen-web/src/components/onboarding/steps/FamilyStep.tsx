"use client";

import { Card, CardContent } from "@/components/ui/card";
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
import { forwardRef, useImperativeHandle, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { familySchema, type FamilyValues } from "../lib/schemas";
import type { StepHandle } from "../lib/stepHandle";
import type { OnboardingData } from "../types";

type MaritalStatus = NonNullable<OnboardingData["maritalStatus"]>;

const MARITAL_VALUES: MaritalStatus[] = [
	"Single",
	"Married",
	"Divorced",
	"Widowed",
	"CivilUnion",
	"Cohabiting",
];

type Props = {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
};

export const FamilyStep = forwardRef<StepHandle, Props>(function FamilyStep(
	{ data, updateData },
	ref,
) {
	const { t } = useTranslation();
	const maritalOptions = useMemo(
		() =>
			MARITAL_VALUES.map((value) => ({
				value,
				label: t(`onboarding.family.maritalStatus.options.${value}`),
			})),
		[t],
	);

	const form = useForm<FamilyValues>({
		resolver: zodResolver(familySchema),
		mode: "onTouched",
		defaultValues: {
			maritalStatus: data.maritalStatus,
			spouseFirstName: data.spouseFirstName ?? "",
			spouseLastName: data.spouseLastName ?? "",
			fatherFirstName: data.fatherFirstName ?? "",
			fatherLastName: data.fatherLastName ?? "",
			motherFirstName: data.motherFirstName ?? "",
			motherLastName: data.motherLastName ?? "",
		},
	});

	useImperativeHandle(
		ref,
		() => ({
			async validateAndNext() {
				const ok = await form.trigger();
				if (!ok) return false;
				updateData(form.getValues());
				return true;
			},
		}),
		[form, updateData],
	);

	const maritalStatus = form.watch("maritalStatus");
	const showSpouse =
		maritalStatus === "Married" || maritalStatus === "CivilUnion";

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
					{t("onboarding.family.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.family.subtitle")}
				</p>
			</header>

			<Controller
				control={form.control}
				name="maritalStatus"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor="maritalStatus" suppressHydrationWarning>
							{t("onboarding.family.maritalStatus.label")}{" "}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Select
							value={field.value ?? ""}
							onValueChange={(v: MaritalStatus) => field.onChange(v)}
						>
							<SelectTrigger
								id="maritalStatus"
								className="w-full"
								aria-invalid={fieldState.invalid}
							>
								<SelectValue
									placeholder={t("onboarding.family.maritalStatus.placeholder")}
								/>
							</SelectTrigger>
							<SelectContent>
								{maritalOptions.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										<span suppressHydrationWarning>{o.label}</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{fieldState.invalid && (
							<FieldError errors={[fieldState.error]} />
						)}
					</Field>
				)}
			/>

			{showSpouse && (
				<Card className="bg-muted/40">
					<CardContent className="flex flex-col gap-4 p-5">
						<h3 className="text-sm font-semibold" suppressHydrationWarning>
							{t("onboarding.family.spouse.title")}
						</h3>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								control={form.control}
								name="spouseLastName"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="spouseLastName" suppressHydrationWarning>
											{t("onboarding.family.spouse.lastName")}{" "}
											<span className="text-destructive">*</span>
										</FieldLabel>
										<Input
											id="spouseLastName"
											autoComplete="off"
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
								name="spouseFirstName"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="spouseFirstName" suppressHydrationWarning>
											{t("onboarding.family.spouse.firstName")}{" "}
											<span className="text-destructive">*</span>
										</FieldLabel>
										<Input
											id="spouseFirstName"
											autoComplete="off"
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
					</CardContent>
				</Card>
			)}

			<Card className="bg-muted/40">
				<CardContent className="flex flex-col gap-4 p-5">
					<h3 className="text-sm font-semibold" suppressHydrationWarning>
						{t("onboarding.family.filiation.title")}
					</h3>

					<div className="flex flex-col gap-3">
						<p
							className="text-xs uppercase tracking-wide text-muted-foreground"
							suppressHydrationWarning
						>
							{t("onboarding.family.filiation.father")}
						</p>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								control={form.control}
								name="fatherLastName"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="fatherLastName" suppressHydrationWarning>
											{t("onboarding.family.filiation.lastName")}
										</FieldLabel>
										<Input
											id="fatherLastName"
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
								name="fatherFirstName"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="fatherFirstName" suppressHydrationWarning>
											{t("onboarding.family.filiation.firstName")}
										</FieldLabel>
										<Input
											id="fatherFirstName"
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
					</div>

					<div className="flex flex-col gap-3">
						<p
							className="text-xs uppercase tracking-wide text-muted-foreground"
							suppressHydrationWarning
						>
							{t("onboarding.family.filiation.mother")}
						</p>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								control={form.control}
								name="motherLastName"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="motherLastName" suppressHydrationWarning>
											{t("onboarding.family.filiation.motherBirthName")}
										</FieldLabel>
										<Input
											id="motherLastName"
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
								name="motherFirstName"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="motherFirstName" suppressHydrationWarning>
											{t("onboarding.family.filiation.firstName")}
										</FieldLabel>
										<Input
											id="motherFirstName"
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
					</div>
				</CardContent>
			</Card>
		</form>
	);
});
