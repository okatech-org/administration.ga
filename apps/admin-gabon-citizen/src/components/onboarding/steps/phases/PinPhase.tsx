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
import { useTranslation } from "react-i18next";
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

/**
 * PinPhase manages its own local state for `pin` and `pinConfirm` instead of
 * going through react-hook-form. Two reasons: (1) the values must never leak
 * to the persisted draft (already filtered in OnboardingData, but local state
 * is even safer); (2) the two-stage UX (create → confirm) involves an
 * imperative stage transition that doesn't fit cleanly with a single form
 * submit cycle — using useState here avoids races between form.setValue and
 * form.watch when the stage flips between digits.
 */
export function PinPhase({
	updateData,
	onNext,
	onPrev,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	onNext: () => void;
	onPrev: () => void;
}) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const { isAuthenticated } = useConvexAuth();
	const pinStatus = useQuery(
		api.functions.pin.getPinStatus,
		isAuthenticated ? {} : "skip",
	);
	const createPin = useMutation(api.functions.pin.createPin);
	const autoAdvancedRef = useRef(false);

	const [pin, setPin] = useState("");
	const [confirm, setConfirm] = useState("");
	const [stage, setStage] = useState<Stage>("create");
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	useEffect(() => {
		if (pinStatus?.hasPin && !autoAdvancedRef.current) {
			autoAdvancedRef.current = true;
			updateData({ pin: undefined, pinConfirm: undefined });
			onNext();
		}
	}, [pinStatus, onNext, updateData]);

	const match =
		pin.length === PIN_LENGTH &&
		confirm.length === PIN_LENGTH &&
		pin === confirm;
	const mismatch =
		stage === "confirm" && confirm.length === PIN_LENGTH && pin !== confirm;

	useEffect(() => {
		if (stage === "create" && pin.length === PIN_LENGTH) {
			const tm = setTimeout(() => setStage("confirm"), 240);
			return () => clearTimeout(tm);
		}
	}, [stage, pin]);

	const currentValue = stage === "create" ? pin : confirm;
	const setValue = useCallback(
		(next: string) => {
			if (stage === "create") setPin(next);
			else setConfirm(next);
		},
		[stage],
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
		setPin("");
		setConfirm("");
		setStage("create");
		setServerError(null);
	}, []);

	const handleBack = useCallback(() => {
		if (stage === "confirm") {
			setConfirm("");
			setStage("create");
			setServerError(null);
		} else {
			onPrev();
		}
	}, [stage, onPrev]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!match || submitting) return;
			setServerError(null);
			setSubmitting(true);
			try {
				await createPin({ pin });
				updateData({ pin: undefined, pinConfirm: undefined });
				onNext();
			} catch (err) {
				console.error("createPin error:", err);
				const message =
					err instanceof Error
						? err.message
						: t("onboarding.identity.pin.genericError");
				if (message.includes("PIN_ALREADY_EXISTS")) {
					updateData({ pin: undefined, pinConfirm: undefined });
					onNext();
					return;
				}
				setServerError(message);
			} finally {
				setSubmitting(false);
			}
		},
		[createPin, match, pin, submitting, updateData, onNext, t],
	);

	if (pinStatus === undefined || pinStatus?.hasPin) {
		return (
			<div className="flex flex-col items-center gap-3 py-12 text-center">
				<Loader2 className="size-8 animate-spin text-gabon-blue" />
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{pinStatus?.hasPin
						? t("onboarding.identity.pin.alreadyConfigured")
						: t("onboarding.identity.pin.verifying")}
				</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex min-h-[calc(100svh-260px)] flex-col gap-6 md:min-h-0"
		>
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{stage === "create"
						? t("onboarding.identity.pin.createTitle")
						: t("onboarding.identity.pin.confirmTitle")}
				</h1>
				<p
					className="max-w-lg text-sm text-muted-foreground"
					suppressHydrationWarning
				>
					{stage === "create"
						? t("onboarding.identity.pin.createSubtitle")
						: t("onboarding.identity.pin.confirmSubtitle")}
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
						stage === "create"
							? t("onboarding.identity.pin.ariaCreate")
							: t("onboarding.identity.pin.ariaConfirm")
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
					<div
						className="flex flex-wrap items-center justify-center gap-2 text-sm text-destructive"
						suppressHydrationWarning
					>
						<AlertTriangle className="size-4" />
						{t("onboarding.identity.pin.mismatch")}
						<Button
							type="button"
							variant="link"
							size="sm"
							className="h-auto p-0 text-destructive underline"
							onClick={handleRestart}
						>
							<span suppressHydrationWarning>
								{t("onboarding.identity.pin.restart")}
							</span>
						</Button>
					</div>
				)}

				{stage === "confirm" && match && !submitting && !serverError && (
					<div
						className="flex items-center gap-2 text-sm text-gabon-green"
						suppressHydrationWarning
					>
						<CheckCircle2 className="size-4" />
						{t("onboarding.identity.pin.confirmed")}
					</div>
				)}
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
				<Shield className="mt-0.5 size-4 shrink-0" />
				<span suppressHydrationWarning>{t("onboarding.identity.pin.info")}</span>
			</div>

			{serverError && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					<span>{serverError}</span>
				</div>
			)}

			<div className="phase-footer justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={handleBack}
					disabled={submitting}
					className="btn-prev"
				>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>{t("onboarding.identity.pin.back")}</span>
				</Button>
				<Button
					type="submit"
					disabled={!match || submitting}
					className="btn-next"
				>
					{submitting ? (
						<>
							<Loader2 className="mr-1 size-4 animate-spin" />
							<span suppressHydrationWarning>
								{t("onboarding.identity.pin.saving")}
							</span>
						</>
					) : (
						<>
							<span suppressHydrationWarning>
								{t("onboarding.identity.pin.continue")}
							</span>
							<ArrowRight className="ml-1 size-4" />
						</>
					)}
				</Button>
			</div>
		</form>
	);
}
