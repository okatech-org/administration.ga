"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OnboardingData } from "../../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
	const emailValid = EMAIL_RE.test(data.email ?? "");
	const phoneValid = (data.phone ?? "").replace(/\D/g, "").length >= 6;
	const canContinue = emailValid && phoneValid;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (canContinue) onNext();
			}}
			className="flex flex-col gap-6"
		>
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

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="email" suppressHydrationWarning>
						{t("onboarding.identity.contact.email")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Input
						id="email"
						type="email"
						value={data.email ?? ""}
						onChange={(e) => updateData({ email: e.target.value })}
						placeholder={t("onboarding.identity.contact.emailPlaceholder")}
						autoComplete="email"
						autoFocus
					/>
					<p className="text-xs text-muted-foreground" suppressHydrationWarning>
						{t("onboarding.identity.contact.emailHelp")}
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="phone" suppressHydrationWarning>
						{t("onboarding.identity.contact.phone")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Input
						id="phone"
						type="tel"
						value={data.phone ?? ""}
						onChange={(e) => updateData({ phone: e.target.value })}
						placeholder={t("onboarding.identity.contact.phonePlaceholder")}
						autoComplete="tel"
					/>
				</div>
			</div>

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
				<Button type="submit" disabled={!canContinue}>
					<span suppressHydrationWarning>
						{t("onboarding.identity.contact.continue")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
