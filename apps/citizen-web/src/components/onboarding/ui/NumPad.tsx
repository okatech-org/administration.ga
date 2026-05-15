"use client";

import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

type NumPadProps = {
	onDigit: (digit: string) => void;
	onBackspace: () => void;
	disabled?: boolean;
	className?: string;
};

/**
 * Génère un court "tick" via la Web Audio API au tap (pas d'asset à charger).
 * Le contexte est créé paresseusement au premier clic pour respecter les
 * politiques d'autoplay des navigateurs.
 */
function useTapSound() {
	const ctxRef = useRef<AudioContext | null>(null);
	return useCallback((variant: "digit" | "back" = "digit") => {
		try {
			if (typeof window === "undefined") return;
			const AudioCtx =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			if (!AudioCtx) return;
			if (!ctxRef.current) ctxRef.current = new AudioCtx();
			const ctx = ctxRef.current;
			if (ctx.state === "suspended") void ctx.resume();
			const now = ctx.currentTime;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = variant === "back" ? "square" : "sine";
			// Pitch légèrement différent pour digit vs backspace.
			osc.frequency.setValueAtTime(variant === "back" ? 320 : 880, now);
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
			osc.connect(gain).connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.1);
		} catch {
			// Audio désactivé / non disponible — silencieux.
		}
	}, []);
}

/** Vibration haptique courte (mobile uniquement, ignorée ailleurs). */
function vibrate(ms = 8) {
	try {
		if (typeof navigator !== "undefined" && "vibrate" in navigator) {
			navigator.vibrate?.(ms);
		}
	} catch {
		// no-op
	}
}

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
	const { t } = useTranslation();
	const playTap = useTapSound();

	const handleDigit = useCallback(
		(d: string) => {
			playTap("digit");
			vibrate(8);
			onDigit(d);
		},
		[onDigit, playTap],
	);

	const handleBack = useCallback(() => {
		playTap("back");
		vibrate(12);
		onBackspace();
	}, [onBackspace, playTap]);

	return (
		<div
			role="group"
			aria-label={t("onboarding.numPad.ariaLabel")}
			className={cn(
				"mx-auto grid w-full max-w-[304px] grid-cols-3 gap-2.5",
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
							className="h-14"
						/>
					);
				}
				if (k === "back") {
					return (
						<button
							key="back"
							type="button"
							onClick={handleBack}
							disabled={disabled}
							aria-label={t("onboarding.numPad.backspace")}
							className={cn(
								"numpad-key flex h-14 w-full items-center justify-center rounded-[14px] bg-transparent text-muted-foreground transition-[transform,background-color,color] duration-100",
								"hover:bg-muted hover:text-foreground",
								"active:scale-[0.92] active:bg-muted/70",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gabon-blue/40",
								"disabled:cursor-not-allowed disabled:opacity-50",
							)}
						>
							<Delete className="size-5" aria-hidden="true" />
						</button>
					);
				}
				return (
					<button
						key={k}
						type="button"
						onClick={() => handleDigit(k)}
						disabled={disabled}
						className={cn(
							"numpad-key relative flex h-14 w-full items-center justify-center overflow-hidden rounded-[14px] border border-border bg-card font-mono text-[22px] font-medium text-foreground shadow-[0_1px_0_rgba(20,19,15,0.04)]",
							"transition-[transform,background-color,border-color,box-shadow] duration-100",
							"hover:border-border hover:bg-muted",
							"active:scale-[0.92] active:bg-gabon-blue-tint active:border-gabon-blue active:text-gabon-blue",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gabon-blue/40",
							"disabled:cursor-not-allowed disabled:opacity-50",
						)}
					>
						{k}
					</button>
				);
			})}
		</div>
	);
}
