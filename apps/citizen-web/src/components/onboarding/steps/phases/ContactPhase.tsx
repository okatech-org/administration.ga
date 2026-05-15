"use client";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { contactSchema, type ContactValues } from "../../lib/schemas";
import type { OnboardingData } from "../../types";

export function ContactPhase({
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

	const form = useForm<ContactValues>({
		resolver: zodResolver(contactSchema),
		mode: "onTouched",
		defaultValues: {
			email: data.email ?? "",
			phone: data.phone ?? "",
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
					{t("onboarding.identity.contact.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.contact.subtitle")}
				</p>
			</header>

			<FieldGroup className="flex flex-col gap-4">
				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="email" suppressHydrationWarning>
								{t("onboarding.identity.contact.email")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder={t("onboarding.identity.contact.emailPlaceholder")}
								autoComplete="email"
								autoFocus
								aria-invalid={fieldState.invalid}
								{...field}
							/>
							{fieldState.invalid ? (
								<FieldError errors={[fieldState.error]} />
							) : (
								<FieldDescription suppressHydrationWarning>
									{t("onboarding.identity.contact.emailHelp")}
								</FieldDescription>
							)}
						</Field>
					)}
				/>
				<Controller
					control={form.control}
					name="phone"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="phone" suppressHydrationWarning>
								{t("onboarding.identity.contact.phone")}{" "}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="phone"
								type="tel"
								placeholder={t("onboarding.identity.contact.phonePlaceholder")}
								autoComplete="tel"
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

			<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
				<Shield className="mt-0.5 size-4 shrink-0" />
				<span suppressHydrationWarning>
					{t("onboarding.identity.contact.privacy")}{" "}
					<a href="/legal/terms" className="text-gabon-blue underline">
						{t("onboarding.identity.contact.privacyTerms")}
					</a>{" "}
					{t("onboarding.identity.contact.privacyAnd")}{" "}
					<a href="/legal/privacy" className="text-gabon-blue underline">
						{t("onboarding.identity.contact.privacyPrivacy")}
					</a>
					.
				</span>
			</div>

			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={onPrev}>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>
						{t("onboarding.identity.contact.back")}
					</span>
				</Button>
				<Button type="submit" disabled={form.formState.isSubmitting}>
					<span suppressHydrationWarning>
						{t("onboarding.identity.contact.continue")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
