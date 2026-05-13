"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Votre passeport
				</h1>
				<p className="text-sm text-muted-foreground">
					Reportez les informations qui figurent sur la page d'identification de
					votre passeport.
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportNumber">
						Numéro de passeport <span className="text-destructive">*</span>
					</Label>
					<Input
						id="passportNumber"
						value={data.passportNumber ?? ""}
						onChange={(e) => updateData({ passportNumber: e.target.value })}
						placeholder="24PP13071"
						autoFocus
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportIssuingAuthority">
						Autorité de délivrance
					</Label>
					<Input
						id="passportIssuingAuthority"
						value={data.passportIssuingAuthority ?? ""}
						onChange={(e) =>
							updateData({ passportIssuingAuthority: e.target.value })
						}
						placeholder="DGDI Libreville"
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportIssueDate">Délivré le</Label>
					<Input
						id="passportIssueDate"
						type="date"
						value={data.passportIssueDate ?? ""}
						onChange={(e) => updateData({ passportIssueDate: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="passportExpiryDate">Expire le</Label>
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
					Retour
				</Button>
				<Button type="submit" disabled={!canContinue}>
					Terminer cette étape
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
