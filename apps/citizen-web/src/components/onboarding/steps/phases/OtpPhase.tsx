"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Loader2,
	Mail,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthSyncWait } from "../../lib/useAuthSyncWait";
import { OtpInput } from "../../ui/OtpInput";
import type { OnboardingData } from "../../types";

type UiStage = "idle" | "verifying" | "signing-in" | "syncing" | "done";

const COUNTDOWN_SECONDS = 50;

export function OtpPhase({
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
	const { t } = useTranslation();
	const { waitForSync } = useAuthSyncWait();
	const [otp, setOtp] = useState<string>(data.otp ?? "");
	const [error, setError] = useState<string | null>(null);
	const [stage, setStage] = useState<UiStage>("idle");
	const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
	const [resending, setResending] = useState(false);
	const lastAttemptedRef = useRef<string | null>(null);
	const submittingRef = useRef(false);

	const email = data.email ?? "";
	const password = data.password ?? "";

	useEffect(() => {
		if (countdown <= 0) return;
		const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(t);
	}, [countdown]);

	useEffect(() => {
		if (
			otp.length === 6 &&
			!submittingRef.current &&
			lastAttemptedRef.current !== otp
		) {
			void submit(otp);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [otp]);

	const submit = async (code: string) => {
		if (submittingRef.current) return;
		if (!email) {
			setError(t("onboarding.identity.otp.missingEmail"));
			return;
		}
		if (!password) {
			setError(t("onboarding.identity.otp.missingPassword"));
			return;
		}
		submittingRef.current = true;
		lastAttemptedRef.current = code;
		setError(null);
		setStage("verifying");
		try {
			const verify = await authClient.emailOtp.verifyEmail({
				email,
				otp: code,
			});
			if (verify.error) {
				setError(
					verify.error.message || t("onboarding.identity.otp.invalidCode"),
				);
				setStage("idle");
				return;
			}

			setStage("signing-in");
			const signIn = await authClient.signIn.email({ email, password });
			if (signIn.error) {
				setError(
					signIn.error.message ||
						t("onboarding.identity.otp.autoSignInFailed"),
				);
				setStage("idle");
				return;
			}

			setStage("syncing");
			console.time("ensure-user-sync");
			await waitForSync({ timeoutMs: 8000 });
			console.timeEnd("ensure-user-sync");

			updateData({ _authState: "verified", otp: undefined });
			setStage("done");
			onNext();
		} catch (err) {
			console.error("OTP flow error:", err);
			const message =
				err instanceof Error && err.message === "auth_timeout"
					? t("onboarding.identity.otp.syncTimeout")
					: err instanceof Error
						? err.message
						: t("onboarding.identity.otp.unexpectedError");
			setError(message);
			setStage("idle");
		} finally {
			submittingRef.current = false;
		}
	};

	const handleResend = async () => {
		if (resending || countdown > 0) return;
		setResending(true);
		setError(null);
		try {
			const res = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "email-verification",
			});
			if (res.error) {
				setError(
					res.error.message || t("onboarding.identity.otp.resendImpossible"),
				);
			} else {
				setCountdown(COUNTDOWN_SECONDS);
				lastAttemptedRef.current = null;
				setOtp("");
				updateData({ otp: undefined });
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: t("onboarding.identity.otp.resendImpossible"),
			);
		} finally {
			setResending(false);
		}
	};

	const handleManualSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (otp.length === 6) void submit(otp);
	};

	const disabled =
		stage === "verifying" || stage === "signing-in" || stage === "syncing";

	if (stage === "syncing") {
		return (
			<div className="flex flex-col items-center gap-4 py-12 text-center">
				<Loader2 className="size-10 animate-spin text-gabon-blue" />
				<h2 className="text-xl font-semibold" suppressHydrationWarning>
					{t("onboarding.identity.otp.syncingTitle")}
				</h2>
				<p
					className="max-w-sm text-sm text-muted-foreground"
					suppressHydrationWarning
				>
					{t("onboarding.identity.otp.syncingDescription")}
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleManualSubmit} className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.identity.otp.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.identity.otp.subtitlePrefix")}{" "}
					<strong className="text-foreground">
						{email || t("onboarding.identity.otp.subtitleFallback")}
					</strong>
					.
				</p>
			</header>

			<OtpInput
				value={otp}
				onChange={(v) => {
					setOtp(v);
					if (v !== otp) updateData({ otp: v });
					if (error) setError(null);
				}}
				autoFocus
				disabled={disabled}
				hasError={!!error}
				ariaLabel={t("onboarding.identity.otp.otpAriaLabel")}
			/>

			<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
				<Mail className="size-4" />
				{countdown > 0 ? (
					<span suppressHydrationWarning>
						{t("onboarding.identity.otp.resendIn")}{" "}
						<strong className="font-mono tabular-nums text-foreground">
							{countdown}s
						</strong>
					</span>
				) : (
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto p-0"
						onClick={handleResend}
						disabled={resending}
					>
						<span suppressHydrationWarning>
							{resending
								? t("onboarding.identity.otp.sending")
								: t("onboarding.identity.otp.resend")}
						</span>
					</Button>
				)}
				<span aria-hidden="true">•</span>
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto p-0"
					onClick={onPrev}
					disabled={disabled}
				>
					<span suppressHydrationWarning>
						{t("onboarding.identity.otp.editEmail")}
					</span>
				</Button>
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
					disabled={disabled}
				>
					<ArrowLeft className="mr-1 size-4" />
					<span suppressHydrationWarning>
						{t("onboarding.identity.otp.back")}
					</span>
				</Button>
				<Button type="submit" disabled={otp.length !== 6 || disabled}>
					{stage === "verifying" || stage === "signing-in" ? (
						<>
							<Loader2 className="mr-1 size-4 animate-spin" />
							<span suppressHydrationWarning>
								{stage === "verifying"
									? t("onboarding.identity.otp.verifying")
									: t("onboarding.identity.otp.signingIn")}
							</span>
						</>
					) : (
						<>
							<span suppressHydrationWarning>
								{t("onboarding.identity.otp.submit")}
							</span>
							<ArrowRight className="ml-1 size-4" />
						</>
					)}
				</Button>
			</div>
		</form>
	);
}
