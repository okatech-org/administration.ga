"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
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
	const canContinue = (data.passportNumber?.trim().length ?? 0) >= 5;

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
					{t("onboarding.identity.passport.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.passport.subtitle")}
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportNumber" suppressHydrationWarning>
						{t("onboarding.identity.passport.number")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Input
						id="passportNumber"
						value={data.passportNumber ?? ""}
						onChange={(e) => updateData({ passportNumber: e.target.value })}
						placeholder={t("onboarding.identity.passport.numberPlaceholder")}
						autoFocus
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportIssuingAuthority" suppressHydrationWarning>
						{t("onboarding.identity.passport.issuingAuthority")}
					</Label>
					<Input
						id="passportIssuingAuthority"
						value={data.passportIssuingAuthority ?? ""}
						onChange={(e) =>
							updateData({ passportIssuingAuthority: e.target.value })
						}
						placeholder={t(
							"onboarding.identity.passport.issuingAuthorityPlaceholder",
						)}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportIssueDate" suppressHydrationWarning>
						{t("onboarding.identity.passport.issueDate")}
					</Label>
					<Input
						id="passportIssueDate"
						type="date"
						value={data.passportIssueDate ?? ""}
						onChange={(e) => updateData({ passportIssueDate: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportExpiryDate" suppressHydrationWarning>
						{t("onboarding.identity.passport.expiryDate")}
					</Label>
					<Input
						id="passportExpiryDate"
						type="date"
						value={data.passportExpiryDate ?? ""}
						onChange={(e) =>
							updateData({ passportExpiryDate: e.target.value })
						}
					/>
				</div>
			</div>

			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={onPrev}>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>
						{t("onboarding.identity.passport.back")}
					</span>
				</Button>
				<Button type="submit" disabled={!canContinue}>
					<span suppressHydrationWarning>
						{t("onboarding.identity.passport.finish")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
