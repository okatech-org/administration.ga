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
import type { OnboardingData } from "../types";

type WorkStatus = NonNullable<OnboardingData["workStatus"]>;

const WORK_OPTIONS: { value: WorkStatus; label: string }[] = [
	{ value: "Employee", label: "Salarié(e)" },
	{ value: "SelfEmployed", label: "Indépendant(e)" },
	{ value: "Entrepreneur", label: "Entrepreneur(e)" },
	{ value: "Student", label: "Étudiant(e)" },
	{ value: "Retired", label: "Retraité(e)" },
	{ value: "Unemployed", label: "Sans emploi" },
	{ value: "Other", label: "Autre" },
];

export function ProfessionStep({
	data,
	updateData,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
}) {
	const showDetails =
		data.workStatus &&
		data.workStatus !== "Unemployed" &&
		data.workStatus !== "Retired";

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Situation professionnelle
				</h1>
				<p className="text-sm text-muted-foreground">
					Décrivez votre activité actuelle. Ces informations restent
					confidentielles.
				</p>
			</header>

			<div className="flex flex-col gap-2">
				<Label htmlFor="workStatus">
					Statut professionnel <span className="text-destructive">*</span>
				</Label>
				<Select
					value={data.workStatus ?? ""}
					onValueChange={(v: WorkStatus) => updateData({ workStatus: v })}
				>
					<SelectTrigger id="workStatus" className="w-full">
						<SelectValue placeholder="Sélectionner" />
					</SelectTrigger>
					<SelectContent>
						{WORK_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{showDetails && (
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="workTitle">Titre du poste</Label>
						<Input
							id="workTitle"
							value={data.workTitle ?? ""}
							onChange={(e) => updateData({ workTitle: e.target.value })}
							placeholder="ex. Développeuse"
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="workEmployer">Employeur</Label>
						<Input
							id="workEmployer"
							value={data.workEmployer ?? ""}
							onChange={(e) => updateData({ workEmployer: e.target.value })}
							placeholder="ex. Acme SARL"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
