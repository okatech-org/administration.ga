"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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

export function FamilyStep({
	data,
	updateData,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
}) {
	const { t } = useTranslation();
	const maritalOptions = useMemo(
		() =>
			MARITAL_VALUES.map((value) => ({
				value,
				label: t(`onboarding.family.maritalStatus.options.${value}`),
			})),
		[t],
	);
	const showSpouse =
		data.maritalStatus === "Married" || data.maritalStatus === "CivilUnion";

	return (
		<div className="flex flex-col gap-5">
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

			<div className="flex flex-col gap-2">
				<Label htmlFor="maritalStatus" suppressHydrationWarning>
					{t("onboarding.family.maritalStatus.label")}{" "}
					<span className="text-destructive">*</span>
				</Label>
				<Select
					value={data.maritalStatus ?? ""}
					onValueChange={(v: MaritalStatus) => updateData({ maritalStatus: v })}
				>
					<SelectTrigger id="maritalStatus" className="w-full">
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
			</div>

			{showSpouse && (
				<Card className="bg-muted/40">
					<CardContent className="flex flex-col gap-4 p-5">
						<h3 className="text-sm font-semibold" suppressHydrationWarning>
							{t("onboarding.family.spouse.title")}
						</h3>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="spouseLastName" suppressHydrationWarning>
									{t("onboarding.family.spouse.lastName")}
								</Label>
								<Input
									id="spouseLastName"
									value={data.spouseLastName ?? ""}
									onChange={(e) =>
										updateData({ spouseLastName: e.target.value })
									}
									autoComplete="off"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="spouseFirstName" suppressHydrationWarning>
									{t("onboarding.family.spouse.firstName")}
								</Label>
								<Input
									id="spouseFirstName"
									value={data.spouseFirstName ?? ""}
									onChange={(e) =>
										updateData({ spouseFirstName: e.target.value })
									}
									autoComplete="off"
								/>
							</div>
						</div>
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
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="fatherLastName" suppressHydrationWarning>
									{t("onboarding.family.filiation.lastName")}
								</Label>
								<Input
									id="fatherLastName"
									value={data.fatherLastName ?? ""}
									onChange={(e) =>
										updateData({ fatherLastName: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="fatherFirstName" suppressHydrationWarning>
									{t("onboarding.family.filiation.firstName")}
								</Label>
								<Input
									id="fatherFirstName"
									value={data.fatherFirstName ?? ""}
									onChange={(e) =>
										updateData({ fatherFirstName: e.target.value })
									}
								/>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3">
						<p
							className="text-xs uppercase tracking-wide text-muted-foreground"
							suppressHydrationWarning
						>
							{t("onboarding.family.filiation.mother")}
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="motherLastName" suppressHydrationWarning>
									{t("onboarding.family.filiation.motherBirthName")}
								</Label>
								<Input
									id="motherLastName"
									value={data.motherLastName ?? ""}
									onChange={(e) =>
										updateData({ motherLastName: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="motherFirstName" suppressHydrationWarning>
									{t("onboarding.family.filiation.firstName")}
								</Label>
								<Input
									id="motherFirstName"
									value={data.motherFirstName ?? ""}
									onChange={(e) =>
										updateData({ motherFirstName: e.target.value })
									}
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
