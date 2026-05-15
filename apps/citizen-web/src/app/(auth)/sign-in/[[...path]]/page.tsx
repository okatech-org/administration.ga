"use client";

import { api } from "@convex/_generated/api";
import { normalizePhone } from "@convex/lib/phone";
import { useConvex } from "convex/react";
import {
	ArrowRight,
	Loader2,
	Mail,
	Phone,
	Shield,
	Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { InitialsAvatar } from "@/components/auth/InitialsAvatar";
import { MethodButton } from "@/components/auth/MethodButton";
import { PinEntryInline } from "@/components/auth/PinEntryInline";
import { SignInLayout } from "@/components/auth/SignInLayout";
import { OtpInput } from "@/components/onboarding/ui/OtpInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Screen =
	| "identify"
	| "method_pin"
	| "method_legacy"
	| "pin_entry"
	| "otp"
	| "connected";

type Channel = "email" | "sms";
type IdentifierMode = "email" | "phone";

const EMAIL_RE = /.+@.+\..+/;
const PHONE_RE = /^[\d\s+().-]{6,}$/;

const isEmail = (s: string) => EMAIL_RE.test(s.trim());
const isPhone = (s: string) =>
	PHONE_RE.test(s.trim()) && /\d/.test(s) && !s.includes("@");

function maskEmail(email: string): string {
	const [local, domain] = email.split("@");
	if (!domain) return email;
	const head = local.slice(0, 1);
	const tail = local.slice(-1);
	return `${head}${"•".repeat(Math.max(3, local.length - 2))}${tail}@${domain}`;
}

function maskPhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 4) return phone;
	const last2 = digits.slice(-2);
	return `${phone.slice(0, 3)} •• •• •• ${last2}`;
}

/** Error mapping (Better Auth EN → i18n keys) */
const AUTH_ERROR_MAP: Record<string, string> = {
	"otp expired": "errors.auth.otp.expired",
	"invalid otp": "errors.auth.otp.invalidCode",
	"otp has expired": "errors.auth.otp.expired",
	"invalid code": "errors.auth.otp.invalidCode",
	"user not found": "errors.auth.otp.phoneNotFound",
	"phone number not found": "errors.auth.otp.phoneNotFound",
};

function SignInPageContent() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const convex = useConvex();
	const formId = useId();

	const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
	const redirectTo = searchParams.get("redirect") || "/post-login-redirect";

	const translateAuthError = (message: string | undefined, fallback: string) => {
		if (!message) return t(fallback);
		const key = AUTH_ERROR_MAP[message.toLowerCase()];
		return key ? t(key) : t(fallback);
	};

	const [screen, setScreen] = useState<Screen>("identify");
	const [identifierMode, setIdentifierMode] = useState<IdentifierMode>("email");
	const [emailValue, setEmailValue] = useState("");
	const [phoneValue, setPhoneValue] = useState("");
	const [channel, setChannel] = useState<Channel>("email");
	const [otpCode, setOtpCode] = useState("");
	const [pinCode, setPinCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const identifier = identifierMode === "email" ? emailValue : phoneValue;
	const identifierKind: IdentifierMode | null = useMemo(() => {
		if (identifierMode === "email") {
			return emailValue && isEmail(emailValue) ? "email" : null;
		}
		return phoneValue && isPhone(phoneValue) ? "phone" : null;
	}, [identifierMode, emailValue, phoneValue]);

	const valid = identifierKind !== null;
	const maskedIdentifier =
		identifierKind === "email"
			? maskEmail(emailValue)
			: identifierKind === "phone"
				? maskPhone(phoneValue)
				: identifier;

	const normalizedPhone =
		identifierKind === "phone"
			? normalizePhone(phoneValue) ?? phoneValue.trim()
			: undefined;
	const normalizedEmail =
		identifierKind === "email" ? emailValue.trim().toLowerCase() : undefined;

	// ── Step 1: identify ────────────────────────────────────────
	const handleIdentify = useCallback(async () => {
		if (!valid) return;
		setError(null);
		setLoading(true);
		try {
			const pinStatus = await convex.query(api.functions.pin.checkPinStatus, {
				email: normalizedEmail,
				phone: normalizedPhone,
			});

			if (pinStatus.hasPin && !pinStatus.locked && !pinStatus.otpRequired) {
				setPinCode("");
				setScreen("method_pin");
			} else {
				setScreen("method_legacy");
				// Default channel hint based on identifier type
				setChannel(identifierKind === "phone" ? "sms" : "email");
			}
		} catch (err) {
			console.error("checkPinStatus error:", err);
			// Fail-open to legacy method picker — OTP works for everyone
			setScreen("method_legacy");
			setChannel(identifierKind === "phone" ? "sms" : "email");
		} finally {
			setLoading(false);
		}
	}, [valid, convex, normalizedEmail, normalizedPhone, identifierKind]);

	// ── Send OTP ─────────────────────────────────────────────────
	const sendOtp = useCallback(
		async (selectedChannel: Channel) => {
			setError(null);
			setLoading(true);
			setOtpCode("");
			try {
				if (selectedChannel === "sms") {
					if (!normalizedPhone) {
						setError(t("errors.auth.otp.phoneNotFound"));
						return;
					}
					const res = await authClient.phoneNumber.sendOtp({
						phoneNumber: normalizedPhone,
					});
					if (res.error) {
						setError(
							translateAuthError(res.error.message, "errors.auth.otp.sendFailed"),
						);
						return;
					}
				} else {
					if (!normalizedEmail) {
						setError(t("errors.auth.otp.phoneNotFound"));
						return;
					}
					const res = await authClient.emailOtp.sendVerificationOtp({
						email: normalizedEmail,
						type: "sign-in",
					});
					if (res.error) {
						setError(
							translateAuthError(res.error.message, "errors.auth.otp.sendFailed"),
						);
						return;
					}
				}
				setChannel(selectedChannel);
				setScreen("otp");
			} catch {
				setError(t("errors.auth.otp.sendFailed"));
			} finally {
				setLoading(false);
			}
		},
		[normalizedEmail, normalizedPhone, t],
	);

	// ── Verify OTP ───────────────────────────────────────────────
	const handleVerifyOtp = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (otpCode.length !== 6) return;
			setError(null);
			setLoading(true);
			try {
				if (channel === "sms" && normalizedPhone) {
					const res = await authClient.phoneNumber.verify({
						phoneNumber: normalizedPhone,
						code: otpCode,
					});
					if (res.error) {
						setError(
							translateAuthError(res.error.message, "errors.auth.otp.invalidCode"),
						);
						return;
					}
					captureEvent("user_logged_in", { method: "sms_otp" });
				} else if (channel === "email" && normalizedEmail) {
					const res = await authClient.signIn.emailOtp({
						email: normalizedEmail,
						otp: otpCode,
					});
					if (res.error) {
						setError(
							translateAuthError(res.error.message, "errors.auth.otp.invalidCode"),
						);
						return;
					}
					captureEvent("user_logged_in", { method: "email_otp" });
				}
				router.replace(redirectTo);
			} catch {
				setError(t("errors.auth.otp.invalidCode"));
			} finally {
				setLoading(false);
			}
		},
		[otpCode, channel, normalizedEmail, normalizedPhone, router, redirectTo, t],
	);

	// ── Verify PIN ───────────────────────────────────────────────
	const verifyPin = useCallback(
		async (pin: string) => {
			if (pin.length !== 6) return;
			setError(null);
			setLoading(true);
			try {
				const convexSiteUrl =
					process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
						".convex.cloud",
						".convex.site",
					) ?? "";
				const response = await fetch(`${convexSiteUrl}/api/auth/pin-session`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						email: normalizedEmail,
						phone: normalizedPhone,
						pin,
					}),
				});

				if (!response.ok) {
					const data = await response.json().catch(() => ({}) as any);
					if (data.error === "PIN_LOCKED") {
						setError(t("errors.auth.signIn.pinLocked"));
						setPinCode("");
						// Auto-switch to OTP after lock
						setTimeout(() => sendOtp(channel), 1200);
					} else {
						const remaining = data.attemptsRemaining;
						setPinCode("");
						setError(
							typeof remaining === "number"
								? t("errors.auth.signIn.attemptsRemaining", {
										count: remaining,
									})
								: t("errors.auth.signIn.pinInvalid"),
						);
					}
					return;
				}

				const data = (await response.json()) as {
					email: string;
					tempPassword: string;
				};
				const signInResult = await authClient.signIn.email({
					email: data.email,
					password: data.tempPassword,
				});
				if (signInResult.error) {
					setError(t("errors.auth.signInFailed"));
					return;
				}
				captureEvent("user_logged_in", { method: "pin" as any });
				router.replace(redirectTo);
			} catch (err) {
				console.error("verifyPin error:", err);
				setError(t("errors.auth.signInFailed"));
			} finally {
				setLoading(false);
			}
		},
		[normalizedEmail, normalizedPhone, t, router, redirectTo, channel, sendOtp],
	);

	const resetToIdentify = () => {
		setScreen("identify");
		setError(null);
		setOtpCode("");
		setPinCode("");
	};

	// ─── Render ──────────────────────────────────────────────────

	if (screen === "identify") {
		return (
			<SignInLayout
				title={t("errors.auth.signIn.identifyTitle")}
				subtitle={t("errors.auth.signIn.identifySubtitle")}
				footer={
					<div className="flex flex-wrap items-center justify-between gap-3 text-sm">
						<span className="text-muted-foreground">
							{t("errors.auth.noAccount")}
						</span>
						<a
							href={`/register${searchStr}`}
							className="inline-flex items-center gap-1 font-medium text-gabon-blue hover:underline"
						>
							{t("errors.auth.createAccount")}
							<ArrowRight className="size-3.5" />
						</a>
					</div>
				}
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (valid) handleIdentify();
					}}
					className="flex flex-col gap-4"
				>
					{/* Toggle Email / Téléphone */}
					<div
						className="flex overflow-hidden rounded-lg border"
						style={{ borderColor: "var(--border-strong, var(--border))" }}
						role="tablist"
					>
						<button
							type="button"
							role="tab"
							aria-selected={identifierMode === "email"}
							onClick={() => {
								setIdentifierMode("email");
								setError(null);
							}}
							className={cn(
								"flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
								identifierMode === "email"
									? "bg-gabon-blue text-white"
									: "bg-muted/40 text-muted-foreground hover:text-foreground",
							)}
						>
							<Mail className="size-4" />
							{t("common.email")}
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={identifierMode === "phone"}
							onClick={() => {
								setIdentifierMode("phone");
								setError(null);
							}}
							className={cn(
								"flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
								identifierMode === "phone"
									? "bg-gabon-blue text-white"
									: "bg-muted/40 text-muted-foreground hover:text-foreground",
							)}
						>
							<Phone className="size-4" />
							{t("profile.fields.phone")}
						</button>
					</div>

					{identifierMode === "email" ? (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor={`${formId}-email`} className="font-medium">
								{t("common.email")}
							</Label>
							<div className="relative">
								<span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">
									<Mail className="size-4" />
								</span>
								<Input
									id={`${formId}-email`}
									type="email"
									value={emailValue}
									onChange={(e) => setEmailValue(e.target.value)}
									placeholder="vous@exemple.com"
									autoComplete="email"
									enterKeyHint="next"
									autoFocus
									className="h-12 pl-10 md:pl-10"
								/>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor={`${formId}-phone`} className="font-medium">
								{t("profile.fields.phone")}
							</Label>
							<div className="relative">
								<span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">
									<Phone className="size-4" />
								</span>
								<Input
									id={`${formId}-phone`}
									type="tel"
									value={phoneValue}
									onChange={(e) => setPhoneValue(e.target.value)}
									placeholder="+33 6 12 34 56 78"
									autoComplete="tel"
									enterKeyHint="next"
									autoFocus
									className="h-12 pl-10 md:pl-10"
								/>
							</div>
						</div>
					)}

					<Button
						type="submit"
						size="lg"
						className="h-12 w-full"
						disabled={!valid || loading}
					>
						{loading && <Loader2 className="mr-2 size-4 animate-spin" />}
						{t("errors.auth.signIn.continue")}
						<ArrowRight className="ml-1.5 size-4" />
					</Button>

					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}

					<div
						className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground"
						style={{ borderColor: "var(--border)" }}
					>
						<Shield className="mt-0.5 size-4 shrink-0" />
						<span>{t("errors.auth.signIn.securityNote")}</span>
					</div>
				</form>
			</SignInLayout>
		);
	}

	if (screen === "method_pin") {
		return (
			<SignInLayout
				onBack={resetToIdentify}
				title={t("errors.auth.signIn.greetingGeneric")}
				subtitle={t("errors.auth.signIn.pinPrompt")}
			>
				<div className="flex items-center gap-3.5 rounded-2xl border bg-muted/40 p-3.5">
					<InitialsAvatar size={40} />
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium">
							{maskedIdentifier}
						</div>
						<div className="text-xs text-muted-foreground">
							{t("errors.auth.signIn.usingPin")}
						</div>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={resetToIdentify}
						className="text-muted-foreground"
					>
						{t("errors.auth.signIn.change")}
					</Button>
				</div>

				<PinEntryInline
					value={pinCode}
					onChange={setPinCode}
					onSubmit={verifyPin}
					loading={loading}
					error={error}
					label={t("errors.auth.signIn.pinLabel")}
				/>

				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<span className="h-px flex-1 bg-border" />
					<span>{t("errors.auth.signIn.otherMethods")}</span>
					<span className="h-px flex-1 bg-border" />
				</div>

				<div className="flex flex-col gap-2">
					{normalizedEmail && (
						<MethodButton
							icon={Mail}
							title={t("errors.auth.signIn.methodEmail")}
							subtitle={maskEmail(normalizedEmail)}
							onClick={() => sendOtp("email")}
							disabled={loading}
						/>
					)}
					{normalizedPhone && (
						<MethodButton
							icon={Phone}
							title={t("errors.auth.signIn.methodSms")}
							subtitle={maskPhone(normalizedPhone)}
							onClick={() => sendOtp("sms")}
							disabled={loading}
						/>
					)}
				</div>

				<div className="text-center text-xs">
					<button
						type="button"
						onClick={() => sendOtp(identifierKind === "phone" ? "sms" : "email")}
						className="font-medium text-gabon-blue hover:underline"
					>
						{t("errors.auth.signIn.pinForgotten")}
					</button>
				</div>
			</SignInLayout>
		);
	}

	if (screen === "method_legacy") {
		return (
			<SignInLayout
				onBack={resetToIdentify}
				eyebrow={
					<div className="flex items-center gap-3.5">
						<InitialsAvatar size={48} />
						<div>
							<div className="text-[11px] uppercase tracking-wider text-muted-foreground">
								{t("errors.auth.signIn.welcomeBack")}
							</div>
							<div className="mt-0.5 text-base font-semibold">
								{maskedIdentifier}
							</div>
						</div>
					</div>
				}
				title={t("errors.auth.signIn.legacyTitle")}
				subtitle={t("errors.auth.signIn.legacySubtitle")}
			>
				<div className="flex flex-col gap-2.5">
					{normalizedEmail && (
						<MethodButton
							icon={Mail}
							title={t("errors.auth.signIn.methodEmail")}
							subtitle={maskEmail(normalizedEmail)}
							onClick={() => sendOtp("email")}
							accent="blue"
							recommended
							recommendedLabel={t("errors.auth.signIn.recommended")}
							disabled={loading}
						/>
					)}
					{normalizedPhone && (
						<MethodButton
							icon={Phone}
							title={t("errors.auth.signIn.methodSms")}
							subtitle={maskPhone(normalizedPhone)}
							onClick={() => sendOtp("sms")}
							accent={normalizedEmail ? "neutral" : "blue"}
							recommended={!normalizedEmail}
							recommendedLabel={t("errors.auth.signIn.recommended")}
							disabled={loading}
						/>
					)}
				</div>

				<div className="flex items-start gap-2 rounded-lg border bg-gabon-blue-tint px-3 py-2.5 text-xs text-foreground">
					<Sparkles className="mt-0.5 size-4 shrink-0 text-gabon-blue" />
					<span>
						<strong>{t("errors.auth.signIn.legacyHintLabel")}</strong>{" "}
						{t("errors.auth.signIn.legacyHint")}
					</span>
				</div>

				{error && (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				)}
			</SignInLayout>
		);
	}

	if (screen === "otp") {
		return (
			<SignInLayout
				onBack={() => {
					setScreen("method_legacy");
					setOtpCode("");
					setError(null);
				}}
				eyebrow={
					<div
						className="grid size-12 place-items-center rounded-2xl bg-gabon-blue-tint text-gabon-blue"
					>
						{channel === "sms" ? (
							<Phone className="size-5" />
						) : (
							<Mail className="size-5" />
						)}
					</div>
				}
				title={t("errors.auth.signIn.otpTitle")}
				subtitle={
					<>
						{t("errors.auth.signIn.otpSubtitle", {
							channel:
								channel === "sms"
									? t("errors.auth.signIn.channelSms")
									: t("errors.auth.signIn.channelEmail"),
						})}{" "}
						<strong className="text-foreground">
							{channel === "sms"
								? maskPhone(normalizedPhone ?? identifier)
								: maskEmail(normalizedEmail ?? identifier)}
						</strong>
						.
					</>
				}
			>
				<form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
					<div className="flex justify-center">
						<OtpInput
							value={otpCode}
							onChange={setOtpCode}
							length={6}
							autoFocus
							disabled={loading}
						/>
					</div>

					{error && (
						<p className="text-center text-sm text-destructive" role="alert">
							{error}
						</p>
					)}

					<Button
						type="submit"
						size="lg"
						className="h-12 w-full"
						disabled={loading || otpCode.length !== 6}
					>
						{loading && <Loader2 className="mr-2 size-4 animate-spin" />}
						{t("header.nav.signIn")}
						<ArrowRight className="ml-1.5 size-4" />
					</Button>

					<div className="text-center">
						<button
							type="button"
							onClick={() => sendOtp(channel)}
							disabled={loading}
							className="text-sm text-muted-foreground hover:text-gabon-blue disabled:opacity-50"
						>
							{t("errors.auth.otp.resendCode")}
						</button>
					</div>
				</form>
			</SignInLayout>
		);
	}

	return null;
}

export default function SignInPage() {
	return (
		<Suspense fallback={null}>
			<SignInPageContent />
		</Suspense>
	);
}
