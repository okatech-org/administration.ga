"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
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
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Vos coordonnées
				</h1>
				<p className="text-sm text-muted-foreground">
					Nous enverrons un code de vérification à votre email. Votre numéro
					nous permettra de vous contacter en cas de besoin.
				</p>
			</header>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="email">
						Email <span className="text-destructive">*</span>
					</Label>
					<Input
						id="email"
						type="email"
						value={data.email ?? ""}
						onChange={(e) => updateData({ email: e.target.value })}
						placeholder="vous@exemple.com"
						autoComplete="email"
						autoFocus
					/>
					<p className="text-xs text-muted-foreground">
						Vous recevrez un code de vérification à 6 chiffres.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="phone">
						Téléphone <span className="text-destructive">*</span>
					</Label>
					<Input
						id="phone"
						type="tel"
						value={data.phone ?? ""}
						onChange={(e) => updateData({ phone: e.target.value })}
						placeholder="+33 6 12 34 56 78"
						autoComplete="tel"
					/>
				</div>
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
				<Shield className="mt-0.5 size-4 shrink-0" />
				<span>
					Vos coordonnées sont chiffrées. En continuant, vous acceptez les{" "}
					<a href="/legal/terms" className="text-gabon-blue underline">
						conditions d'utilisation
					</a>{" "}
					et la{" "}
					<a href="/legal/privacy" className="text-gabon-blue underline">
						politique de confidentialité
					</a>
					.
				</span>
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
