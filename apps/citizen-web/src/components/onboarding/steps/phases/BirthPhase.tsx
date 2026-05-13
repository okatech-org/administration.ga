"use client";

import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CountryCode } from "@convex/lib/constants";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
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
	const canContinue =
		!!data.birthDate &&
		(data.birthPlace?.trim().length ?? 0) >= 2 &&
		!!data.gender &&
		!!data.nationality;

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
					{t("onboarding.identity.birth.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.birth.subtitle")}
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="birthDate" suppressHydrationWarning>
						{t("onboarding.identity.birth.birthDate")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Input
						id="birthDate"
						type="date"
						value={data.birthDate ?? ""}
						onChange={(e) => updateData({ birthDate: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="birthPlace" suppressHydrationWarning>
						{t("onboarding.identity.birth.birthPlace")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Input
						id="birthPlace"
						value={data.birthPlace ?? ""}
						onChange={(e) => updateData({ birthPlace: e.target.value })}
						placeholder={t("onboarding.identity.birth.birthPlacePlaceholder")}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label suppressHydrationWarning>
						{t("onboarding.identity.birth.birthCountry")}
					</Label>
					<CountrySelect
						type="single"
						selected={(data.birthCountry as CountryCode) ?? CountryCode.GA}
						onChange={(v) => updateData({ birthCountry: v })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="gender" suppressHydrationWarning>
						{t("onboarding.identity.birth.gender")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Select
						value={data.gender ?? ""}
						onValueChange={(v: "Male" | "Female") =>
							updateData({ gender: v })
						}
					>
						<SelectTrigger id="gender" className="w-full">
							<SelectValue
								placeholder={t("onboarding.identity.birth.selectPlaceholder")}
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
				</div>
				<div className="flex flex-col gap-2">
					<Label suppressHydrationWarning>
						{t("onboarding.identity.birth.nationality")}{" "}
						<span className="text-destructive">*</span>
					</Label>
					<CountrySelect
						type="single"
						selected={(data.nationality as CountryCode) ?? CountryCode.GA}
						onChange={(v) => updateData({ nationality: v })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="nationalityAcquisition" suppressHydrationWarning>
						{t("onboarding.identity.birth.nationalityAcquisition")}
					</Label>
					<Select
						value={data.nationalityAcquisition ?? "birth"}
						onValueChange={(v: "birth" | "naturalization" | "marriage") =>
							updateData({ nationalityAcquisition: v })
						}
					>
						<SelectTrigger id="nationalityAcquisition" className="w-full">
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
									{t("onboarding.identity.birth.acquisitionOptions.marriage")}
								</span>
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-2 md:col-span-2">
					<Label htmlFor="nip" suppressHydrationWarning>
						{t("onboarding.identity.birth.nip")}{" "}
						<span className="text-xs text-muted-foreground">
							{t("onboarding.identity.birth.nipOptional")}
						</span>
					</Label>
					<Input
						id="nip"
						value={data.nip ?? ""}
						onChange={(e) => updateData({ nip: e.target.value })}
						placeholder={t("onboarding.identity.birth.nipPlaceholder")}
					/>
				</div>
			</div>

			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={onPrev}>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>
						{t("onboarding.identity.birth.back")}
					</span>
				</Button>
				<Button type="submit" disabled={!canContinue}>
					<span suppressHydrationWarning>
						{t("onboarding.identity.birth.continue")}
					</span>
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
