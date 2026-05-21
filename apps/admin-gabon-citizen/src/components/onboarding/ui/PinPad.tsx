"use client";

import { cn } from "@/lib/utils";
import { DeleteIcon } from "lucide-react";
import * as React from "react";

type PinPadProps = {
	length?: number;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	hasError?: boolean;
	ariaLabel: string;
	numpadAriaLabel: string;
	backspaceAriaLabel: string;
	digitAriaLabel: (n: number) => string;
	dotsAriaLabel: (filled: number, total: number) => string;
	autoFocus?: boolean;
	disabled?: boolean;
	resetKey?: string | number;
};

/**
 * PinPad numérique mobile-first :
 * - rangée de dots (avec input caché pour clavier physique),
 * - clavier 3x4 (1-9, 0, backspace),
 * - onComplete déclenché une seule fois quand `length` chiffres sont saisis.
 * Reset via `resetKey` (change la clé => réarme onComplete).
 */
export function PinPad({
	length = 6,
	value,
	onChange,
	onComplete,
	hasError,
	ariaLabel,
	numpadAriaLabel,
	backspaceAriaLabel,
	digitAriaLabel,
	dotsAriaLabel,
	autoFocus,
	disabled,
	resetKey,
}: PinPadProps) {
	const hiddenInputRef = React.useRef<HTMLInputElement>(null);
	const completedRef = React.useRef(false);

	React.useEffect(() => {
		completedRef.current = false;
	}, [resetKey]);

	React.useEffect(() => {
		if (autoFocus) hiddenInputRef.current?.focus();
	}, [autoFocus]);

	const append = (digit: string) => {
		if (disabled) return;
		if (value.length >= length) return;
		const next = (value + digit).slice(0, length);
		onChange(next);
		if (next.length === length && !completedRef.current) {
			completedRef.current = true;
			onComplete?.(next);
		}
	};

	const remove = () => {
		if (disabled) return;
		if (value.length === 0) return;
		completedRef.current = false;
		onChange(value.slice(0, -1));
	};

	const onHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const digits = e.target.value.replace(/\D/g, "").slice(0, length);
		onChange(digits);
		if (digits.length === length && !completedRef.current) {
			completedRef.current = true;
			onComplete?.(digits);
		}
		if (digits.length < length) completedRef.current = false;
	};

	const onHiddenKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === " " || e.key === "Enter") e.preventDefault();
	};

	const focusInput = () => hiddenInputRef.current?.focus();

	const dotsLabel = dotsAriaLabel(value.length, length);

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn(
				"flex flex-1 flex-col gap-7",
				disabled && "pointer-events-none opacity-60",
			)}
		>
			<button
				type="button"
				onClick={focusInput}
				aria-label={dotsLabel}
				className="flex items-center justify-center gap-3 rounded-md py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				{Array.from({ length }).map((_, i) => {
					const filled = i < value.length;
					return (
						<span
							key={i}
							aria-hidden="true"
							className={cn(
								"size-3 rounded-full transition-colors",
								hasError
									? "bg-destructive"
									: filled
										? "bg-gabon-green"
										: "border border-border bg-transparent",
							)}
						/>
					);
				})}
			</button>

			<input
				ref={hiddenInputRef}
				type="password"
				inputMode="numeric"
				pattern="[0-9]*"
				autoComplete="one-time-code"
				maxLength={length}
				value={value}
				onChange={onHiddenChange}
				onKeyDown={onHiddenKeyDown}
				disabled={disabled}
				aria-label={ariaLabel}
				className="sr-only"
			/>

			<div
				role="group"
				aria-label={numpadAriaLabel}
				className="mt-auto grid w-full grid-cols-3 gap-3"
			>
				{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
					<button
						key={n}
						type="button"
						onClick={() => append(String(n))}
						disabled={disabled}
						aria-label={digitAriaLabel(n)}
						className="flex h-16 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-2xl font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
					>
						{n}
					</button>
				))}
				<span aria-hidden="true" />
				<button
					type="button"
					onClick={() => append("0")}
					disabled={disabled}
					aria-label={digitAriaLabel(0)}
					className="flex h-16 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-2xl font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
				>
					0
				</button>
				<button
					type="button"
					onClick={remove}
					disabled={disabled}
					aria-label={backspaceAriaLabel}
					className="flex h-16 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
				>
					<DeleteIcon
						className={cn(
							"size-7 transition-opacity",
							value.length === 0 && "opacity-40",
						)}
						aria-hidden="true"
					/>
				</button>
			</div>
		</div>
	);
}
