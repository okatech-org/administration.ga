"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

const LABELS = ["Très faible", "Faible", "Acceptable", "Bon", "Excellent"] as const;
const COLORS = [
	"bg-destructive",
	"bg-destructive",
	"bg-gabon-yellow",
	"bg-gabon-green",
	"bg-gabon-green",
] as const;

type PasswordStrengthProps = {
	id?: string;
	password: string;
	userInputs?: string[];
	className?: string;
	minLength?: number;
};

/**
 * Score 0..4 calculé heuristiquement (sans dépendance zxcvbn) :
 * - +1 par catégorie : lowercase, uppercase, chiffre, symbole
 * - +1 si longueur >= 12 et >= 2 catégories
 * - -1 si match un user input (email, name) ou pattern faible (qwerty, 123456…)
 * Cap [0, 4].
 *
 * Pour un calcul plus précis, basculer sur `@zxcvbn-ts/core` à l'avenir.
 */
export function PasswordStrength({
	id,
	password,
	userInputs = [],
	minLength = 12,
	className,
}: PasswordStrengthProps) {
	const score = React.useMemo(() => {
		if (!password) return 0;
		let s = 0;
		if (/[a-z]/.test(password)) s++;
		if (/[A-Z]/.test(password)) s++;
		if (/\d/.test(password)) s++;
		if (/[^a-zA-Z0-9]/.test(password)) s++;
		if (password.length >= minLength && s >= 2) s = Math.min(4, s + 1);
		// Pénalités
		const lower = password.toLowerCase();
		const weakPatterns = [
			"password",
			"motdepasse",
			"123456",
			"qwerty",
			"azerty",
			"abc123",
			"111111",
		];
		if (weakPatterns.some((p) => lower.includes(p))) s = Math.max(0, s - 2);
		for (const ui of userInputs) {
			if (!ui) continue;
			const u = ui.toLowerCase().trim();
			if (u.length >= 4 && lower.includes(u)) {
				s = Math.max(0, s - 2);
				break;
			}
		}
		return Math.max(0, Math.min(4, s)) as 0 | 1 | 2 | 3 | 4;
	}, [password, userInputs, minLength]);

	const tooShort = password.length > 0 && password.length < minLength;
	const fill = score;
	const label = tooShort
		? `Trop court (minimum ${minLength} caractères)`
		: password.length === 0
			? null
			: LABELS[fill];
	const color = COLORS[fill];

	return (
		<div id={id} className={cn("space-y-1.5", className)}>
			<div
				role="progressbar"
				aria-valuenow={fill}
				aria-valuemin={0}
				aria-valuemax={4}
				aria-label="Force du mot de passe"
				aria-live="polite"
				className="flex gap-1"
			>
				{Array.from({ length: 4 }).map((_, i) => (
					<span
						key={i}
						className={cn(
							"h-1 flex-1 rounded-full",
							i < fill && password ? color : "bg-border",
						)}
					/>
				))}
			</div>
			{label && (
				<p
					className={cn(
						"text-xs",
						tooShort || fill < 3
							? "text-muted-foreground"
							: "font-medium text-gabon-green",
					)}
				>
					{label}
				</p>
			)}
		</div>
	);
}

/**
 * Renvoie `true` si le password atteint le seuil minimum (longueur + score 3+).
 */
export function isPasswordStrongEnough(
	password: string,
	opts?: { minLength?: number; userInputs?: string[] },
): boolean {
	const minLength = opts?.minLength ?? 12;
	const userInputs = opts?.userInputs ?? [];
	if (password.length < minLength) return false;
	let s = 0;
	if (/[a-z]/.test(password)) s++;
	if (/[A-Z]/.test(password)) s++;
	if (/\d/.test(password)) s++;
	if (/[^a-zA-Z0-9]/.test(password)) s++;
	if (password.length >= minLength && s >= 2) s = Math.min(4, s + 1);
	const lower = password.toLowerCase();
	for (const ui of userInputs) {
		if (!ui) continue;
		const u = ui.toLowerCase().trim();
		if (u.length >= 4 && lower.includes(u)) {
			s = Math.max(0, s - 2);
			break;
		}
	}
	return s >= 3;
}
