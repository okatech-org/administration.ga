"use client";

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

export function ProfessionStep({
	data,
	updateData,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
}) {
	const { t } = useTranslation();
	const workOptions = useMemo(
		() =>
			WORK_VALUES.map((value) => ({
				value,
				label: t(`onboarding.profession.workStatus.options.${value}`),
			})),
		[t],
	);
	const showDetails =
		data.workStatus &&
		data.workStatus !== "Unemployed" &&
		data.workStatus !== "Retired";

	return (
		<div className="flex flex-col gap-5">
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

			<div className="flex flex-col gap-2">
				<Label htmlFor="workStatus" suppressHydrationWarning>
					{t("onboarding.profession.workStatus.label")}{" "}
					<span className="text-destructive">*</span>
				</Label>
				<Select
					value={data.workStatus ?? ""}
					onValueChange={(v: WorkStatus) => updateData({ workStatus: v })}
				>
					<SelectTrigger id="workStatus" className="w-full">
						<SelectValue
							placeholder={t("onboarding.profession.workStatus.placeholder")}
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
			</div>

			{showDetails && (
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="workTitle" suppressHydrationWarning>
							{t("onboarding.profession.workTitle")}
						</Label>
						<Input
							id="workTitle"
							value={data.workTitle ?? ""}
							onChange={(e) => updateData({ workTitle: e.target.value })}
							placeholder={t("onboarding.profession.workTitlePlaceholder")}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="workEmployer" suppressHydrationWarning>
							{t("onboarding.profession.workEmployer")}
						</Label>
						<Input
							id="workEmployer"
							value={data.workEmployer ?? ""}
							onChange={(e) => updateData({ workEmployer: e.target.value })}
							placeholder={t("onboarding.profession.workEmployerPlaceholder")}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
