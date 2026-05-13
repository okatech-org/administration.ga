"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Check,
	Eye,
	EyeOff,
	Loader2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OnboardingData } from "../../types";

const STRENGTH_LABELS = [
	"Trop court",
	"Faible",
	"Moyen",
	"Bon",
	"Excellent",
] as const;

const STRENGTH_CLASSES = [
	"bg-destructive",
	"bg-destructive",
	"bg-gabon-yellow",
	"bg-gabon-blue",
	"bg-gabon-green",
] as const;

const STRENGTH_TEXT = [
	"text-destructive",
	"text-destructive",
	"text-gabon-yellow",
	"text-gabon-blue",
	"text-gabon-green",
] as const;

export function PasswordPhase({
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
	const [show, setShow] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const password = data.password ?? "";
	const confirm = data.passwordConfirm ?? "";
	const email = data.email ?? "";

	const checks = useMemo(
		() => ({
			length: password.length >= 10,
			upper: /[A-Z]/.test(password),
			digit: /\d/.test(password),
			symbol: /[^A-Za-z0-9]/.test(password),
		}),
		[password],
	);

	const score = Object.values(checks).filter(Boolean).length;
	const match = password.length > 0 && password === confirm;
	const canContinue = score >= 3 && match && !submitting && !!email;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canContinue) return;
		setError(null);
		setSubmitting(true);
		try {
			const fullName = [data.firstName, data.lastName]
				.filter(Boolean)
				.join(" ");
			const cleanPhone = (data.phone ?? "").replace(/\s/g, "");
			const signUp = await authClient.signUp.email({
				email,
				password,
				name: fullName || email,
				phoneNumber: cleanPhone || undefined,
			});
			if (signUp.error) {
				setError(signUp.error.message || "Inscription impossible.");
				setSubmitting(false);
				return;
			}
			try {
				await authClient.emailOtp.sendVerificationOtp({
					email,
					type: "email-verification",
				});
			} catch {
				// Non-bloquant — l'OtpPhase propose un Renvoyer.
			}
			updateData({ _authState: "pending" });
			onNext();
		} catch (err) {
			console.error(err);
			setError(
				err instanceof Error
					? err.message
					: "Une erreur est survenue. Veuillez réessayer.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Créez votre mot de passe
				</h1>
				<p className="text-sm text-muted-foreground">
					Il sécurisera l'accès à votre espace consulaire. Choisissez-en un
					solide, vous l'utiliserez à chaque connexion.
				</p>
			</header>

			<div className="flex flex-col gap-2">
				<Label htmlFor="password">
					Mot de passe <span className="text-destructive">*</span>
				</Label>
				<div className="relative">
					<Input
						id="password"
						type={show ? "text" : "password"}
						value={password}
						onChange={(e) => updateData({ password: e.target.value })}
						autoComplete="new-password"
						placeholder="••••••••••"
						className="pr-11"
						autoFocus
					/>
					<button
						type="button"
						onClick={() => setShow((s) => !s)}
						aria-label={
							show ? "Masquer le mot de passe" : "Afficher le mot de passe"
						}
						className="absolute right-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						{show ? (
							<EyeOff className="size-4" aria-hidden="true" />
						) : (
							<Eye className="size-4" aria-hidden="true" />
						)}
					</button>
				</div>
				<p className="text-xs text-muted-foreground">
					Au moins 10 caractères, une majuscule, un chiffre et un symbole.
				</p>
			</div>

			{password && (
				<div className="flex flex-col gap-2">
					<div className="flex gap-1">
						{[0, 1, 2, 3].map((i) => (
							<span
								key={i}
								className={cn(
									"h-1 flex-1 rounded-full transition-colors",
									i < score ? STRENGTH_CLASSES[score] : "bg-border",
								)}
							/>
						))}
					</div>
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">Robustesse</span>
						<span className={cn("font-medium", STRENGTH_TEXT[score])}>
							{STRENGTH_LABELS[score]}
						</span>
					</div>
					<ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
						{(
							[
								["length", "10 caractères"],
								["upper", "Une majuscule"],
								["digit", "Un chiffre"],
								["symbol", "Un symbole"],
							] as const
						).map(([k, label]) => {
							const ok = checks[k];
							return (
								<li
									key={k}
									className={cn(
										"flex items-center gap-1.5",
										ok ? "text-gabon-green" : "text-muted-foreground/70",
									)}
								>
									{ok ? (
										<Check className="size-3.5" strokeWidth={2.5} />
									) : (
										<X className="size-3.5" strokeWidth={2.5} />
									)}
									{label}
								</li>
							);
						})}
					</ul>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<Label htmlFor="passwordConfirm">
					Confirmer le mot de passe{" "}
					<span className="text-destructive">*</span>
				</Label>
				<Input
					id="passwordConfirm"
					type={show ? "text" : "password"}
					value={confirm}
					onChange={(e) => updateData({ passwordConfirm: e.target.value })}
					autoComplete="new-password"
					placeholder="Retapez votre mot de passe"
				/>
				{confirm && !match && (
					<p className="flex items-center gap-1 text-xs text-destructive">
						<AlertTriangle className="size-3.5" />
						Les mots de passe ne correspondent pas.
					</p>
				)}
			</div>

			{error && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			<div className="flex justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={onPrev}
					disabled={submitting}
				>
					<ArrowLeft className="mr-1 size-4" />
					Retour
				</Button>
				<Button type="submit" disabled={!canContinue}>
					{submitting ? (
						<>
							<Loader2 className="mr-1 size-4 animate-spin" />
							Envoi en cours…
						</>
					) : (
						<>
							Continuer
							<ArrowRight className="ml-1 size-4" />
						</>
					)}
				</Button>
			</div>
		</form>
	);
}
