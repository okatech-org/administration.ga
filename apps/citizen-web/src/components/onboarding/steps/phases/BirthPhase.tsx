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
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Naissance et nationalité
				</h1>
				<p className="text-sm text-muted-foreground">
					Ces informations doivent correspondre à votre acte de naissance et à
					votre passeport.
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="birthDate">
						Date de naissance <span className="text-destructive">*</span>
					</Label>
					<Input
						id="birthDate"
						type="date"
						value={data.birthDate ?? ""}
						onChange={(e) => updateData({ birthDate: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="birthPlace">
						Lieu de naissance <span className="text-destructive">*</span>
					</Label>
					<Input
						id="birthPlace"
						value={data.birthPlace ?? ""}
						onChange={(e) => updateData({ birthPlace: e.target.value })}
						placeholder="Bikélé"
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label>Pays de naissance</Label>
					<CountrySelect
						type="single"
						selected={(data.birthCountry as CountryCode) ?? CountryCode.GA}
						onChange={(v) => updateData({ birthCountry: v })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="gender">
						Genre <span className="text-destructive">*</span>
					</Label>
					<Select
						value={data.gender ?? ""}
						onValueChange={(v: "Male" | "Female") =>
							updateData({ gender: v })
						}
					>
						<SelectTrigger id="gender">
							<SelectValue placeholder="Sélectionner" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Male">Homme</SelectItem>
							<SelectItem value="Female">Femme</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-2">
					<Label>
						Nationalité <span className="text-destructive">*</span>
					</Label>
					<CountrySelect
						type="single"
						selected={(data.nationality as CountryCode) ?? CountryCode.GA}
						onChange={(v) => updateData({ nationality: v })}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="nationalityAcquisition">
						Acquisition de la nationalité
					</Label>
					<Select
						value={data.nationalityAcquisition ?? "birth"}
						onValueChange={(v: "birth" | "naturalization" | "marriage") =>
							updateData({ nationalityAcquisition: v })
						}
					>
						<SelectTrigger id="nationalityAcquisition">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="birth">Naissance</SelectItem>
							<SelectItem value="naturalization">Naturalisation</SelectItem>
							<SelectItem value="marriage">Mariage</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-2 md:col-span-2">
					<Label htmlFor="nip">
						NIP (Numéro d'Identification Personnel){" "}
						<span className="text-xs text-muted-foreground">
							— optionnel
						</span>
					</Label>
					<Input
						id="nip"
						value={data.nip ?? ""}
						onChange={(e) => updateData({ nip: e.target.value })}
						placeholder="Figure sur votre carte d'identité gabonaise"
					/>
				</div>
			</div>

			<div className="flex justify-between">
				<Button type="button" variant="outline" onClick={onPrev}>
					<ArrowLeft className="mr-1 size-4" />
					Retour
				</Button>
				<Button type="submit" disabled={!canContinue}>
					Continuer
					<ArrowRight className="ml-1 size-4" />
				</Button>
			</div>
		</form>
	);
}
