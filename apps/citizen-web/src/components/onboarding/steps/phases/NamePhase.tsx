"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import type { OnboardingData } from "../../types";

export function NamePhase({
	data,
	updateData,
	onNext,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	onNext: () => void;
}) {
	const canContinue =
		(data.firstName?.trim().length ?? 0) >= 2 &&
		(data.lastName?.trim().length ?? 0) >= 2;

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
					Bonjour, comment vous appelez-vous ?
				</h1>
				<p className="text-sm text-muted-foreground">
					Ces informations figureront sur votre dossier consulaire. Elles
					doivent correspondre à votre passeport.
				</p>
			</header>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="firstName">
						Prénom <span className="text-destructive">*</span>
					</Label>
					<Input
						id="firstName"
						value={data.firstName ?? ""}
						onChange={(e) => updateData({ firstName: e.target.value })}
						placeholder="Berny"
						autoComplete="given-name"
						autoFocus
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="lastName">
						Nom de famille <span className="text-destructive">*</span>
					</Label>
					<Input
						id="lastName"
						value={data.lastName ?? ""}
						onChange={(e) => updateData({ lastName: e.target.value })}
						placeholder="Itoutou"
						autoComplete="family-name"
					/>
				</div>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={!canContinue}>
					Continuer
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
