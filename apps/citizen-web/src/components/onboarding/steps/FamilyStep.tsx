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
import type { OnboardingData } from "../types";

type MaritalStatus = NonNullable<OnboardingData["maritalStatus"]>;

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
	{ value: "Single", label: "Célibataire" },
	{ value: "Married", label: "Marié(e)" },
	{ value: "Divorced", label: "Divorcé(e)" },
	{ value: "Widowed", label: "Veuf(ve)" },
	{ value: "CivilUnion", label: "Union civile (PACS)" },
	{ value: "Cohabiting", label: "Concubinage" },
];

export function FamilyStep({
	data,
	updateData,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
}) {
	const showSpouse =
		data.maritalStatus === "Married" || data.maritalStatus === "CivilUnion";

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Situation familiale
				</h1>
				<p className="text-sm text-muted-foreground">
					Indiquez votre statut marital ainsi que vos parents (filiation).
				</p>
			</header>

			<div className="flex flex-col gap-2">
				<Label htmlFor="maritalStatus">
					Statut marital <span className="text-destructive">*</span>
				</Label>
				<Select
					value={data.maritalStatus ?? ""}
					onValueChange={(v: MaritalStatus) => updateData({ maritalStatus: v })}
				>
					<SelectTrigger id="maritalStatus" className="w-full">
						<SelectValue placeholder="Sélectionner" />
					</SelectTrigger>
					<SelectContent>
						{MARITAL_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{showSpouse && (
				<Card className="bg-muted/40">
					<CardContent className="flex flex-col gap-4 p-5">
						<h3 className="text-sm font-semibold">Votre conjoint(e)</h3>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="spouseLastName">Nom de famille</Label>
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
								<Label htmlFor="spouseFirstName">Prénom</Label>
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
					<h3 className="text-sm font-semibold">Filiation</h3>

					<div className="flex flex-col gap-3">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Père
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="fatherLastName">Nom</Label>
								<Input
									id="fatherLastName"
									value={data.fatherLastName ?? ""}
									onChange={(e) =>
										updateData({ fatherLastName: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="fatherFirstName">Prénom</Label>
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
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							Mère
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="motherLastName">Nom de naissance</Label>
								<Input
									id="motherLastName"
									value={data.motherLastName ?? ""}
									onChange={(e) =>
										updateData({ motherLastName: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="motherFirstName">Prénom</Label>
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
