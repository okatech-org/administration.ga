"use client";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { passportSchema, type PassportValues } from "../../lib/schemas";
import type { OnboardingData } from "../../types";

export function PassportPhase({
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

	const form = useForm<PassportValues>({
		resolver: zodResolver(passportSchema),
		mode: "onTouched",
		defaultValues: {
			passportNumber: data.passportNumber ?? "",
			passportIssuingAuthority: data.passportIssuingAuthority ?? "",
			passportIssueDate: data.passportIssueDate ?? "",
			passportExpiryDate: data.passportExpiryDate ?? "",
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		updateData(values);
		onNext();
	});

	return (
		<form
			onSubmit={onSubmit}
			className="flex min-h-[calc(100svh-260px)] flex-col gap-6 md:min-h-0"
		>
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.identity.passport.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.passport.subtitle")}
				</p>
			</header>

			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Controller
					control={form.control}
					name="passportNumber"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="passportNumber" suppressHydrationWarning>
								{t("onboarding.identity.passport.number")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="passportNumber"
								placeholder={t("onboarding.identity.passport.numberPlaceholder")}
								autoFocus
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
					name="passportIssuingAuthority"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel
								htmlFor="passportIssuingAuthority"
								suppressHydrationWarning
							>
								{t("onboarding.identity.passport.issuingAuthority")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="passportIssuingAuthority"
								placeholder={t(
									"onboarding.identity.passport.issuingAuthorityPlaceholder",
								)}
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
					name="passportIssueDate"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="passportIssueDate" suppressHydrationWarning>
								{t("onboarding.identity.passport.issueDate")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="passportIssueDate"
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
					name="passportExpiryDate"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="passportExpiryDate" suppressHydrationWarning>
								{t("onboarding.identity.passport.expiryDate")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="passportExpiryDate"
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
			</FieldGroup>

			<div className="phase-footer justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={onPrev}
					className="btn-prev"
				>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>
						{t("onboarding.identity.passport.back")}
					</span>
				</Button>
				<Button
					type="submit"
					disabled={form.formState.isSubmitting}
					className="btn-next"
				>
					<span suppressHydrationWarning>
						{t("onboarding.identity.passport.finish")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
