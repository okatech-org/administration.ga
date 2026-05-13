"use client";

import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	CheckCircle2,
	Loader2,
	Shield,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NumPad } from "../../ui/NumPad";
import { OtpInput } from "../../ui/OtpInput";
import type { OnboardingData } from "../../types";

type Stage = "create" | "confirm";

const PIN_LENGTH = 6;

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);
	return isMobile;
}

export function PinPhase({
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
	const isMobile = useIsMobile();
	const { isAuthenticated } = useConvexAuth();
	const pinStatus = useQuery(
		api.functions.pin.getPinStatus,
		isAuthenticated ? {} : "skip",
	);
	const createPin = useMutation(api.functions.pin.createPin);
	const markOtpVerified = useMutation(api.functions.pin.markOtpVerified);
	const otpRefreshedRef = useRef(false);
	const autoAdvancedRef = useRef(false);

	// Si l'utilisateur revient sur cette phase alors que le PIN est déjà créé
	// côté serveur (retour en arrière, refresh, etc.), on saute directement à
	// la phase suivante — pas besoin de re-saisir un PIN existant.
	useEffect(() => {
		if (pinStatus?.hasPin && !autoAdvancedRef.current) {
			autoAdvancedRef.current = true;
			updateData({ pin: undefined, pinConfirm: undefined });
			onNext();
		}
	}, [pinStatus, onNext, updateData]);

	// Filet de sécurité : rafraîchit la fenêtre OTP-verified au mount du PIN.
	// L'OtpPhase appelle déjà markOtpVerified après signIn, mais ce double appel
	// couvre les comptes existants ou les recompilations où le timestamp manque.
	// Server-side `createPin` exige `Date.now() - lastOtpVerifiedAt < 10 min`.
	useEffect(() => {
		if (!isAuthenticated || otpRefreshedRef.current) return;
		if (pinStatus?.hasPin) return; // inutile si le PIN existe déjà
		otpRefreshedRef.current = true;
		markOtpVerified({}).catch((err) => {
			console.error("markOtpVerified failed:", err);
		});
	}, [isAuthenticated, markOtpVerified, pinStatus]);

	const [stage, setStage] = useState<Stage>(() =>
		(data.pin?.length ?? 0) === PIN_LENGTH ? "confirm" : "create",
	);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const pin = data.pin ?? "";
	const confirm = data.pinConfirm ?? "";
	const currentValue = stage === "create" ? pin : confirm;

	const match =
		pin.length === PIN_LENGTH && confirm.length === PIN_LENGTH && pin === confirm;
	const mismatch =
		stage === "confirm" && confirm.length === PIN_LENGTH && pin !== confirm;

	// Auto-advance create → confirm une fois les 6 chiffres saisis
	useEffect(() => {
		if (stage === "create" && pin.length === PIN_LENGTH) {
			const t = setTimeout(() => setStage("confirm"), 240);
			return () => clearTimeout(t);
		}
	}, [stage, pin]);

	const setValue = useCallback(
		(next: string) => {
			if (stage === "create") updateData({ pin: next });
			else updateData({ pinConfirm: next });
		},
		[stage, updateData],
	);

	const handleDigit = useCallback(
		(d: string) => {
			const cur = stage === "create" ? pin : confirm;
			if (cur.length >= PIN_LENGTH) return;
			setValue(cur + d);
		},
		[stage, pin, confirm, setValue],
	);

	const handleBackspace = useCallback(() => {
		const cur = stage === "create" ? pin : confirm;
		if (cur.length === 0) return;
		setValue(cur.slice(0, -1));
	}, [stage, pin, confirm, setValue]);

	const handleRestart = useCallback(() => {
		updateData({ pin: "", pinConfirm: "" });
		setStage("create");
		setError(null);
	}, [updateData]);

	const handleBack = useCallback(() => {
		if (stage === "confirm") {
			updateData({ pinConfirm: "" });
			setStage("create");
			setError(null);
		} else {
			onPrev();
		}
	}, [stage, onPrev, updateData]);

	const handleSubmit = useCallback(async () => {
		if (!match || submitting) return;
		setError(null);
		setSubmitting(true);
		try {
			await createPin({ pin });
			// PIN créé — purge des valeurs sensibles avant d'avancer
			updateData({ pin: undefined, pinConfirm: undefined });
			onNext();
		} catch (err) {
			console.error("createPin error:", err);
			const message =
				err instanceof Error
					? err.message
					: "Erreur lors de la création du code PIN.";
			// PIN déjà créé côté serveur (race entre 2 onglets, double-clic, etc.)
			// → on traite comme un succès et on avance.
			if (message.includes("PIN_ALREADY_EXISTS")) {
				updateData({ pin: undefined, pinConfirm: undefined });
				onNext();
				return;
			}
			setError(message);
		} finally {
			setSubmitting(false);
		}
	}, [createPin, match, pin, submitting, updateData, onNext]);

	// Affichage transitoire pendant la vérification du PIN existant
	if (pinStatus === undefined || pinStatus?.hasPin) {
		return (
			<div className="flex flex-col items-center gap-3 py-12 text-center">
				<Loader2 className="size-8 animate-spin text-gabon-blue" />
				<p className="text-sm text-muted-foreground">
					{pinStatus?.hasPin
						? "Code PIN déjà configuré, passage à l'étape suivante…"
						: "Vérification…"}
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					{stage === "create"
						? "Choisissez un code PIN"
						: "Confirmez votre code PIN"}
				</h1>
				<p className="max-w-lg text-sm text-muted-foreground">
					{stage === "create"
						? "Un code à 6 chiffres pour accéder rapidement à votre espace. Évitez les dates de naissance ou les suites évidentes (123456, 000000…)."
						: "Saisissez à nouveau les 6 mêmes chiffres pour confirmer."}
				</p>
			</header>

			<div className="flex w-full flex-col items-center gap-5">
				<OtpInput
					key={stage}
					value={currentValue}
					onChange={setValue}
					length={PIN_LENGTH}
					mask
					readOnly={isMobile}
					autoFocus={!isMobile}
					hasError={mismatch}
					ariaLabel={
						stage === "create" ? "Saisir le code PIN" : "Confirmer le code PIN"
					}
				/>

				{isMobile && (
					<NumPad
						onDigit={handleDigit}
						onBackspace={handleBackspace}
						disabled={submitting}
					/>
				)}

				{stage === "confirm" && mismatch && (
					<div className="flex flex-wrap items-center justify-center gap-2 text-sm text-destructive">
						<AlertTriangle className="size-4" />
						Les codes ne correspondent pas.
						<Button
							type="button"
							variant="link"
							size="sm"
							className="h-auto p-0 text-destructive underline"
							onClick={handleRestart}
						>
							Recommencer
						</Button>
					</div>
				)}

				{stage === "confirm" && match && !submitting && !error && (
					<div className="flex items-center gap-2 text-sm text-gabon-green">
						<CheckCircle2 className="size-4" />
						Code PIN confirmé
					</div>
				)}
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
				<Shield className="mt-0.5 size-4 shrink-0" />
				<span>
					Ce code restera lié à votre compte pour un accès rapide après votre
					première connexion. Il ne remplace pas votre mot de passe.
				</span>
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
					onClick={handleBack}
					disabled={submitting}
				>
					<ArrowLeft className="mr-1 size-4" />
					Retour
				</Button>
				<Button onClick={handleSubmit} disabled={!match || submitting}>
					{submitting ? (
						<>
							<Loader2 className="mr-1 size-4 animate-spin" />
							Enregistrement…
						</>
					) : (
						<>
							Continuer
							<ArrowRight className="ml-1 size-4" />
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
