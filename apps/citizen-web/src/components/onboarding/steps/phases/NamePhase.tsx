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
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type {
	AIScanFailedProps,
	AIScanSuccessProps,
} from "../../lib/useAIPrefill";
import { nameSchema, type NameValues } from "../../lib/schemas";
import { AIPrefillSheet } from "../../ui/AIPrefillSheet";
import type { OnboardingData } from "../../types";

export function NamePhase({
	data,
	updateData,
	onNext,
	setFile,
	onScanSuccess,
	onScanFailed,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	onNext: () => void;
	setFile?: (key: string, file: File) => void;
	onScanSuccess?: (props: AIScanSuccessProps) => void;
	onScanFailed?: (props: AIScanFailedProps) => void;
}) {
	const { t } = useTranslation();
	const [aiOpen, setAiOpen] = useState(false);

	const form = useForm<NameValues>({
		resolver: zodResolver(nameSchema),
		mode: "onTouched",
		defaultValues: {
			firstName: data.firstName ?? "",
			lastName: data.lastName ?? "",
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
					{t("onboarding.identity.name.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.name.subtitle")}
				</p>
			</header>

			<FieldGroup className="flex flex-col gap-4">
				<Controller
					control={form.control}
					name="firstName"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="firstName" suppressHydrationWarning>
								{t("onboarding.identity.name.firstName")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="firstName"
								placeholder={t("onboarding.identity.name.firstNamePlaceholder")}
								autoComplete="given-name"
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
					name="lastName"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="lastName" suppressHydrationWarning>
								{t("onboarding.identity.name.lastName")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="lastName"
								placeholder={t("onboarding.identity.name.lastNamePlaceholder")}
								autoComplete="family-name"
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

			<div className="relative overflow-hidden rounded-xl border border-border bg-gabon-blue-tint/40 p-4">
				<div className="flex gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gabon-blue text-white">
						<Sparkles className="size-5" strokeWidth={2.25} />
					</div>
					<div className="flex flex-1 flex-col gap-1.5">
						<div className="flex items-start justify-between gap-2">
							<h3 className="text-sm font-semibold" suppressHydrationWarning>
								{t("onboarding.identity.name.aiCard.title")}
							</h3>
							<span
								className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
								suppressHydrationWarning
							>
								{t("onboarding.identity.name.aiCard.badge")}
							</span>
						</div>
						<p
							className="text-xs leading-relaxed text-muted-foreground"
							suppressHydrationWarning
						>
							{t("onboarding.identity.name.aiCard.description")}{" "}
							<strong className="font-semibold text-foreground">
								{t("onboarding.identity.name.aiCard.gain")}
							</strong>
						</p>
						<Button
							type="button"
							size="sm"
							className="mt-1 w-fit bg-gabon-blue text-white hover:bg-gabon-blue-deep"
							onClick={() => setAiOpen(true)}
						>
							<Sparkles className="mr-1.5 size-3.5" />
							<span suppressHydrationWarning>
								{t("onboarding.identity.name.aiCard.cta")}
							</span>
						</Button>
					</div>
				</div>
			</div>

			<AIPrefillSheet
				open={aiOpen}
				onClose={() => setAiOpen(false)}
				onComplete={onNext}
				updateData={updateData}
				setFile={setFile}
				onScanSuccess={onScanSuccess}
				onScanFailed={onScanFailed}
			/>

			<div className="phase-footer mt-auto">
				<Button
					type="submit"
					disabled={form.formState.isSubmitting}
					className="btn-next"
				>
					<span suppressHydrationWarning>
						{t("onboarding.identity.name.continue")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
