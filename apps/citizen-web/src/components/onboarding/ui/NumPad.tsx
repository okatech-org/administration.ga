"use client";

import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";

type NumPadProps = {
	onDigit: (digit: string) => void;
	onBackspace: () => void;
	disabled?: boolean;
	className?: string;
};

const KEYS: (string | "back" | null)[] = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	null,
	"0",
	"back",
];

/**
 * Pavé numérique mobile (3×4) pour la saisie du PIN.
 * Couplé à un `OtpInput` en mode `readOnly` qui affiche les chiffres tapés.
 *
 * Pourquoi un NumPad custom plutôt que le clavier natif :
 * - UX cohérente avec les apps mobiles bancaires (référence utilisateur).
 * - Évite l'auto-correct iOS qui parfois interfère avec les codes 6 chiffres.
 * - Permet de masquer la saisie sans fournir de clavier complet.
 */
export function NumPad({
	onDigit,
	onBackspace,
	disabled,
	className,
}: NumPadProps) {
	return (
		<div
			role="group"
			aria-label="Pavé numérique"
			className={cn(
				"grid w-full max-w-[304px] grid-cols-3 gap-2.5",
				disabled && "pointer-events-none opacity-60",
				className,
			)}
		>
			{KEYS.map((k, i) => {
				if (k === null) {
					return (
						<div
							key={`placeholder-${i}`}
							aria-hidden="true"
							className="size-16"
						/>
					);
				}
				if (k === "back") {
					return (
						<button
							key="back"
							type="button"
							onClick={onBackspace}
							disabled={disabled}
							aria-label="Effacer le dernier chiffre"
							className="flex size-16 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Delete className="size-6" aria-hidden="true" />
						</button>
					);
				}
				return (
					<button
						key={k}
						type="button"
						onClick={() => onDigit(k)}
						disabled={disabled}
						className="flex size-16 items-center justify-center rounded-xl border border-border bg-card font-mono text-2xl font-semibold text-foreground transition-all hover:border-border hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{k}
					</button>
				);
			})}
		</div>
	);
}
