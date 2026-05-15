"use client";

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
import { professionSchema, type ProfessionValues } from "../lib/schemas";
import type { StepHandle } from "../lib/stepHandle";
import type { OnboardingData } from "../types";

type WorkStatus = NonNullable<OnboardingData["workStatus"]>;

const WORK_VALUES: WorkStatus[] = [
	"Employee",
	"SelfEmployed",
	"Entrepreneur",
	"Student",
	"Retired",
	"Unemployed",
	"Other",
];

type Props = {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
};

export const ProfessionStep = forwardRef<StepHandle, Props>(
	function ProfessionStep({ data, updateData }, ref) {
		const { t } = useTranslation();
		const workOptions = useMemo(
			() =>
				WORK_VALUES.map((value) => ({
					value,
					label: t(`onboarding.profession.workStatus.options.${value}`),
				})),
			[t],
		);

		const form = useForm<ProfessionValues>({
			resolver: zodResolver(professionSchema),
			mode: "onTouched",
			defaultValues: {
				workStatus: data.workStatus,
				workTitle: data.workTitle ?? "",
				workEmployer: data.workEmployer ?? "",
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

		const workStatus = form.watch("workStatus");
		const showDetails =
			workStatus &&
			workStatus !== "Unemployed" &&
			workStatus !== "Retired" &&
			workStatus !== "Student" &&
			workStatus !== "Other";

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
						{t("onboarding.profession.title")}
					</h1>
					<p className="text-sm text-muted-foreground" suppressHydrationWarning>
						{t("onboarding.profession.subtitle")}
					</p>
				</header>

				<Controller
					control={form.control}
					name="workStatus"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="workStatus" suppressHydrationWarning>
								{t("onboarding.profession.workStatus.label")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Select
								value={field.value ?? ""}
								onValueChange={(v: WorkStatus) => field.onChange(v)}
							>
								<SelectTrigger
									id="workStatus"
									className="w-full"
									aria-invalid={fieldState.invalid}
								>
									<SelectValue
										placeholder={t(
											"onboarding.profession.workStatus.placeholder",
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									{workOptions.map((o) => (
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

				{showDetails && (
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Controller
							control={form.control}
							name="workTitle"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="workTitle" suppressHydrationWarning>
										{t("onboarding.profession.workTitle")}{" "}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input
										id="workTitle"
										placeholder={t(
											"onboarding.profession.workTitlePlaceholder",
										)}
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
							name="workEmployer"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="workEmployer" suppressHydrationWarning>
										{t("onboarding.profession.workEmployer")}{" "}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input
										id="workEmployer"
										placeholder={t(
											"onboarding.profession.workEmployerPlaceholder",
										)}
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
				)}
			</form>
		);
	},
);
