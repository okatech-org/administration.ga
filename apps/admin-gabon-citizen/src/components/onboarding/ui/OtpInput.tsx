"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type OtpInputProps = {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	autoFocus?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
	ariaDescribedBy?: string;
	/**
	 * Masque les caractères saisis (affichage type password) — utilisé pour la
	 * saisie du PIN. La valeur reste en clair dans le state, seul l'affichage
	 * est masqué.
	 */
	mask?: boolean;
	/**
	 * Désactive la saisie clavier (les caractères arrivent par un NumPad mobile).
	 * `inputMode="none"` empêche le clavier virtuel d'apparaître sur iOS/Android.
	 */
	readOnly?: boolean;
	hasError?: boolean;
	className?: string;
};

/**
 * 6 cases (par défaut) pour saisie OTP / PIN.
 * - Auto-focus + focus chaîné sur la case suivante
 * - Backspace recule et efface
 * - Flèches gauche/droite pour naviguer
 * - Paste 6 chiffres distribue automatiquement
 * - Mode `mask` pour PIN (affichage type password)
 * - Mode `readOnly` pour mobile + NumPad (pas de clavier virtuel)
 */
export function OtpInput({
	value,
	onChange,
	length = 6,
	autoFocus = false,
	disabled = false,
	ariaLabel,
	ariaDescribedBy,
	mask = false,
	readOnly = false,
	hasError = false,
	className,
}: OtpInputProps) {
	const inputs = React.useRef<(HTMLInputElement | null)[]>([]);

	const digits = React.useMemo(() => {
		const arr: string[] = Array.from({ length }, () => "");
		for (let i = 0; i < Math.min(length, value.length); i++) {
			arr[i] = value[i] ?? "";
		}
		return arr;
	}, [value, length]);

	const focus = (idx: number) => {
		if (idx < 0 || idx >= length) return;
		if (readOnly) return;
		inputs.current[idx]?.focus();
		inputs.current[idx]?.select();
	};

	const setAt = (idx: number, char: string) => {
		const next = digits.slice();
		next[idx] = char;
		onChange(next.join("").slice(0, length));
	};

	React.useEffect(() => {
		if (autoFocus && !readOnly) inputs.current[0]?.focus();
	}, [autoFocus, readOnly]);

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			aria-describedby={ariaDescribedBy}
			aria-invalid={hasError || undefined}
			className={cn(
				"flex justify-center gap-2",
				disabled && "opacity-60",
				className,
			)}
		>
			{digits.map((d, i) => (
				<input
					key={i}
					ref={(el) => {
						inputs.current[i] = el;
					}}
					type={mask && d ? "password" : "text"}
					inputMode={readOnly ? "none" : "numeric"}
					pattern="[0-9]*"
					maxLength={1}
					autoComplete="one-time-code"
					disabled={disabled}
					readOnly={readOnly}
					aria-label={`Chiffre ${i + 1}`}
					value={d}
					onChange={(e) => {
						if (readOnly) return;
						const char = e.target.value.replace(/\D/g, "").slice(-1);
						if (!char) return;
						setAt(i, char);
						focus(i + 1);
					}}
					onKeyDown={(e) => {
						if (readOnly) return;
						if (e.key === "Backspace") {
							if (d) {
								setAt(i, "");
							} else {
								focus(i - 1);
								setAt(Math.max(i - 1, 0), "");
							}
							e.preventDefault();
						} else if (e.key === "ArrowLeft") {
							focus(i - 1);
							e.preventDefault();
						} else if (e.key === "ArrowRight") {
							focus(i + 1);
							e.preventDefault();
						}
					}}
					onPaste={(e) => {
						if (readOnly) return;
						const pasted = e.clipboardData
							.getData("text")
							.replace(/\D/g, "")
							.slice(0, length);
						if (!pasted) return;
						onChange(pasted.padEnd(length, "").slice(0, length));
						focus(Math.min(pasted.length, length - 1));
						e.preventDefault();
					}}
					className={cn(
						"size-11 rounded-md border bg-card text-center font-mono text-lg font-semibold tabular-nums transition-colors",
						"focus-visible:border-gabon-blue focus-visible:ring-2 focus-visible:ring-gabon-blue/30 focus-visible:outline-none",
						readOnly && "caret-transparent cursor-default",
						hasError
							? "border-destructive text-destructive"
							: d
								? "border-gabon-blue text-foreground"
								: "border-border text-foreground",
					)}
				/>
			))}
		</div>
	);
}
