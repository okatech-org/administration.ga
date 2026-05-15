"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Loader2,
	Mail,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthSyncWait } from "../../lib/useAuthSyncWait";
import { otpSchema, type OtpValues } from "../../lib/schemas";
import { OtpInput } from "../../ui/OtpInput";
import type { OnboardingData } from "../../types";

type UiStage = "sending" | "idle" | "verifying" | "syncing" | "done";

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
	const markOtpVerified = useMutation(api.functions.pin.markOtpVerified);
	const [stage, setStage] = useState<UiStage>(
		data._authState === "verified" ? "idle" : "sending",
	);
	const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
	const [resending, setResending] = useState(false);
	const lastAttemptedRef = useRef<string | null>(null);
	const submittingRef = useRef(false);
	const otpSentRef = useRef(false);

	const email = data.email ?? "";
	const fullName =
		[data.firstName, data.lastName].filter(Boolean).join(" ") || email;

	const form = useForm<OtpValues>({
		resolver: zodResolver(otpSchema),
		mode: "onSubmit",
		defaultValues: { otp: "" },
	});

	const otp = form.watch("otp") ?? "";
	const serverError = form.formState.errors.root?.server?.message;

	// Send the sign-in OTP on mount. Better Auth's emailOTP with type=sign-in
	// will create the user on /sign-in/email-otp ONLY after a successful OTP
	// verification — no account is created here.
	useEffect(() => {
		if (otpSentRef.current) return;
		if (data._authState === "verified") {
			setStage("idle");
			return;
		}
		if (!email) {
			setStage("idle");
			return;
		}
		otpSentRef.current = true;
		(async () => {
			try {
				const res = await authClient.emailOtp.sendVerificationOtp({
					email,
					type: "sign-in",
				});
				if (res.error) {
					form.setError("root.server", {
						message:
							res.error.message ||
							t("onboarding.identity.otp.resendImpossible"),
					});
					setStage("idle");
					otpSentRef.current = false;
					return;
				}
				setStage("idle");
				setCountdown(COUNTDOWN_SECONDS);
			} catch (err) {
				console.error("send sign-in OTP error:", err);
				form.setError("root.server", {
					message:
						err instanceof Error
							? err.message
							: t("onboarding.identity.otp.resendImpossible"),
				});
				setStage("idle");
				otpSentRef.current = false;
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (countdown <= 0) return;
		const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(t);
	}, [countdown]);

	const submit = async (code: string) => {
		if (submittingRef.current) return;
		if (!email) {
			form.setError("root.server", {
				message: t("onboarding.identity.otp.missingEmail"),
			});
			return;
		}
		submittingRef.current = true;
		lastAttemptedRef.current = code;
		form.clearErrors("root.server");
		setStage("verifying");
		try {
			// signIn.emailOtp creates the user (with `name`) if it doesn't exist
			// AND opens the session in a single call. `disableSignUp` is not set
			// on the server plugin, so first-time users sign up here.
			const signIn = await authClient.signIn.emailOtp({
				email,
				otp: code,
				name: fullName,
			});
			if (signIn.error) {
				form.setError("root.server", {
					message:
						signIn.error.message || t("onboarding.identity.otp.invalidCode"),
				});
				setStage("idle");
				return;
			}

			setStage("syncing");
			console.time("ensure-user-sync");
			await waitForSync({ timeoutMs: 8000 });
			console.timeEnd("ensure-user-sync");

			// Stamp lastOtpVerifiedAt on the freshly-synced Convex user. The
			// Better Auth `after` hook stamped nothing because the user record
			// didn't exist yet at that point — re-stamp here so createPin can
			// run within the recent-OTP window.
			try {
				await markOtpVerified();
			} catch (err) {
				console.error("markOtpVerified failed:", err);
			}

			updateData({ _authState: "verified" });
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
			form.setError("root.server", { message });
			setStage("idle");
		} finally {
			submittingRef.current = false;
		}
	};

	// Auto-submit when 6 digits typed.
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

	const handleResend = async () => {
		if (resending || countdown > 0) return;
		setResending(true);
		form.clearErrors("root.server");
		try {
			const res = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "sign-in",
			});
			if (res.error) {
				form.setError("root.server", {
					message:
						res.error.message ||
						t("onboarding.identity.otp.resendImpossible"),
				});
			} else {
				setCountdown(COUNTDOWN_SECONDS);
				lastAttemptedRef.current = null;
				form.setValue("otp", "");
			}
		} catch (err) {
			form.setError("root.server", {
				message:
					err instanceof Error
						? err.message
						: t("onboarding.identity.otp.resendImpossible"),
			});
		} finally {
			setResending(false);
		}
	};

	const onSubmit = form.handleSubmit((values) => submit(values.otp));

	const disabled =
		stage === "verifying" || stage === "syncing" || stage === "sending";

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

	if (stage === "sending") {
		return (
			<div className="flex flex-col items-center gap-4 py-12 text-center">
				<Loader2 className="size-10 animate-spin text-gabon-blue" />
				<h2 className="text-xl font-semibold" suppressHydrationWarning>
					{t("onboarding.identity.otp.preparingTitle")}
				</h2>
				<p
					className="max-w-sm text-sm text-muted-foreground"
					suppressHydrationWarning
				>
					{t("onboarding.identity.otp.preparingDescription")}
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-6">
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

			<Controller
				control={form.control}
				name="otp"
				render={({ field, fieldState }) => (
					<OtpInput
						value={field.value}
						onChange={(v) => {
							field.onChange(v);
							if (serverError) form.clearErrors("root.server");
						}}
						autoFocus
						disabled={disabled}
						hasError={fieldState.invalid || !!serverError}
						ariaLabel={t("onboarding.identity.otp.otpAriaLabel")}
					/>
				)}
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

			{serverError && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					<span>{serverError}</span>
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
					{stage === "verifying" ? (
						<>
							<Loader2 className="mr-1 size-4 animate-spin" />
							<span suppressHydrationWarning>
								{t("onboarding.identity.otp.verifying")}
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
