import {
	ArrowLeft,
	KeyRound,
	Loader2,
	Mail,
	Smartphone,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { normalizePhone } from "@convex/lib/phone";

type SignInStep = "identifier" | "password" | "otp-code";
type LoginMode = "email" | "phone";

const AUTH_ERROR_MAP: Record<string, string> = {
	"otp expired": "errors.auth.otp.expired",
	"invalid otp": "errors.auth.otp.invalidCode",
	"otp has expired": "errors.auth.otp.expired",
	"invalid code": "errors.auth.otp.invalidCode",
	"user not found": "errors.auth.otp.phoneNotFound",
	"phone number not found": "errors.auth.otp.phoneNotFound",
	"invalid email or password": "errors.auth.invalidCredentials",
};

export function SignInCard() {
	const { t } = useTranslation();
	const formId = useId();

	// Detect if this sign-in was initiated from the desktop app
	const isDesktopAuth =
		typeof window !== "undefined" &&
		new URLSearchParams(window.location.search).get("from") === "desktop";

	/** Translate a Better Auth error to French */
	const translateAuthError = (
		message: string | undefined,
		fallbackKey: string,
	) => {
		if (!message) return t(fallbackKey);
		const key = AUTH_ERROR_MAP[message.toLowerCase()];
		return key ? t(key) : t(fallbackKey);
	};

	const [step, setStep] = useState<SignInStep>("identifier");
	const [loginMode, setLoginMode] = useState<LoginMode>("email");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [otpSent, setOtpSent] = useState(false);
	const otpInputRef = useRef<HTMLInputElement>(null);

	const identifier = loginMode === "email" ? email : phone;

	/** Redirect after successful sign-in — to desktop deep link or home page */
	const redirectAfterSignIn = async (signInResult?: { data?: unknown }) => {
		if (isDesktopAuth) {
			// Extract session token from sign-in response
			const data = signInResult?.data as Record<string, any> | undefined;
			const sessionToken = data?.token || data?.session?.token;
			if (sessionToken) {
				window.location.href = `diplomate://auth?session_token=${encodeURIComponent(sessionToken)}`;
				return;
			}
			// Fallback: try OTT generation endpoint
			try {
				const res = await fetch("/api/auth/one-time-token/generate", {
					credentials: "include",
				});
				if (res.ok) {
					const { token } = await res.json();
					window.location.href = `diplomate://auth?ott=${encodeURIComponent(token)}`;
					return;
				}
			} catch (e) {
				console.error("Failed to generate OTT for desktop:", e);
			}
		}
		window.location.href = "/";
	};

	useEffect(() => {
		if (step === "otp-code" && otpInputRef.current) {
			otpInputRef.current.focus();
		}
	}, [step]);

	const handleSendOtp = async () => {
		if (!identifier) return;
		setError(null);
		setLoading(true);

		try {
			if (loginMode === "phone") {
				const cleanPhone = normalizePhone(phone) ?? phone.trim();
				const result = await authClient.phoneNumber.sendOtp({
					phoneNumber: cleanPhone,
				});
				if (result.error) {
					setError(
						translateAuthError(
							result.error.message,
							"errors.auth.otp.sendFailed",
						),
					);
				} else {
					setOtpSent(true);
					setStep("otp-code");
				}
			} else {
				const result =
					await authClient.emailOtp.sendVerificationOtp({
						email,
						type: "sign-in",
					});
				if (result.error) {
					setError(
						translateAuthError(
							result.error.message,
							"errors.auth.otp.sendFailed",
						),
					);
				} else {
					setOtpSent(true);
					setStep("otp-code");
				}
			}
		} catch {
			setError(t("errors.auth.otp.sendFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!otpCode || !identifier) return;
		setError(null);
		setLoading(true);

		try {
			if (loginMode === "phone") {
				const cleanPhone = normalizePhone(phone) ?? phone.trim();
				const result = await authClient.phoneNumber.verify({
					phoneNumber: cleanPhone,
					code: otpCode,
				});
				if (result.error) {
					setError(
						translateAuthError(
							result.error.message,
							"errors.auth.otp.invalidCode",
						),
					);
				} else {
					captureEvent("user_logged_in", { method: "sms_otp" });
					await redirectAfterSignIn(result);
				}
			} else {
				const result = await authClient.signIn.emailOtp({
					email,
					otp: otpCode,
				});
				if (result.error) {
					setError(
						translateAuthError(
							result.error.message,
							"errors.auth.otp.invalidCode",
						),
					);
				} else {
					captureEvent("user_logged_in", { method: "email_otp" });
					await redirectAfterSignIn(result);
				}
			}
		} catch {
			setError(t("errors.auth.otp.invalidCode"));
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const result = await authClient.signIn.email({
				email,
				password,
			});
			if (result.error) {
				setError(
					translateAuthError(
						result.error.message,
						"errors.auth.signInFailed",
					),
				);
			} else {
				captureEvent("user_logged_in", { method: "password" });
				await redirectAfterSignIn(result);
			}
		} catch {
			setError(t("errors.auth.signInFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleBack = () => {
		setStep("identifier");
		setError(null);
		setOtpCode("");
		setPassword("");
		setOtpSent(false);
	};

	return (
		<div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10 text-slate-900">
			<div className="mb-6 space-y-1">
				<h2 className="text-2xl font-bold tracking-tight">
					{t("errors.auth.welcomeBack")}
				</h2>
				<p className="text-sm text-slate-500">
					{t("errors.auth.accessAccount")}
				</p>
			</div>

			<div className="space-y-5">
				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
						{error}
					</div>
				)}

				{/* Step 1: Identifier */}
				{step === "identifier" && (
					<div className="space-y-4">
						<div className="flex rounded-lg border border-slate-200 overflow-hidden">
							<button
								type="button"
								onClick={() => setLoginMode("email")}
								className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
									loginMode === "email"
										? "bg-emerald-600 text-white"
										: "bg-slate-50 text-slate-500 hover:text-slate-700"
								}`}
							>
								<Mail className="h-4 w-4" />
								{t("common.email")}
							</button>
							<button
								type="button"
								onClick={() => setLoginMode("phone")}
								className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
									loginMode === "phone"
										? "bg-emerald-600 text-white"
										: "bg-slate-50 text-slate-500 hover:text-slate-700"
								}`}
							>
								<Smartphone className="h-4 w-4" />
								{t("profile.fields.phone")}
							</button>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor={`${formId}-identifier`}
								className="text-slate-700 font-medium text-sm"
							>
								{loginMode === "email"
									? t("common.email")
									: t("profile.fields.phone")}
							</Label>
							{loginMode === "email" ? (
								<Input
									id={`${formId}-identifier`}
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="email@exemple.com"
									required
									autoComplete="email"
									enterKeyHint="next"
									className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20"
									onKeyDown={(e) => {
										if (e.key === "Enter" && email) {
											e.preventDefault();
											handleSendOtp();
										}
									}}
								/>
							) : (
								<Input
									id={`${formId}-identifier`}
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+33 6 12 34 56 78"
									required
									autoComplete="tel"
									enterKeyHint="next"
									className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20"
									onKeyDown={(e) => {
										if (e.key === "Enter" && phone) {
											e.preventDefault();
											handleSendOtp();
										}
									}}
								/>
							)}
						</div>

						<Button
							type="button"
							size="lg"
							className="w-full font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
							disabled={loading || !identifier}
							onClick={handleSendOtp}
						>
							{loading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{loginMode === "phone" ? (
								<>
									<Smartphone className="mr-2 h-5 w-5" />
									{t("errors.auth.otp.sendCodeBySms")}
								</>
							) : (
								<>
									<Mail className="mr-2 h-5 w-5" />
									{t("errors.auth.otp.sendCode")}
								</>
							)}
						</Button>

						{loginMode === "email" && (
							<>
								<div className="relative py-2">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-slate-200" />
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span className="bg-white px-4 text-slate-400">
											{t("errors.auth.orDivider")}
										</span>
									</div>
								</div>

								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
									disabled={!email}
									onClick={() => {
										if (email) setStep("password");
									}}
								>
									<KeyRound className="mr-2 h-5 w-5" />
									{t("errors.auth.otp.signInWithPassword")}
								</Button>
							</>
						)}
					</div>
				)}

				{/* Step 2a: Password */}
				{step === "password" && (
					<form
						onSubmit={handlePasswordSignIn}
						className="space-y-4"
					>
						<button
							type="button"
							onClick={handleBack}
							className="flex items-center text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							{email}
						</button>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label
									htmlFor={`${formId}-password`}
									className="text-slate-700 font-medium text-sm"
								>
									{t("common.password")}
								</Label>
								<button
									type="button"
									onClick={handleSendOtp}
									className="text-sm font-medium text-slate-500 hover:text-emerald-600 hover:underline transition-colors"
									disabled={loading || !email}
								>
									{t("errors.auth.otp.forgotPassword")}
								</button>
							</div>
							<Input
								id={`${formId}-password`}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
								enterKeyHint="done"
								autoFocus
								className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20"
							/>
						</div>

						<Button
							type="submit"
							size="lg"
							className="w-full font-medium bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
							disabled={loading}
						>
							{loading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{t("header.nav.signIn")}
						</Button>
					</form>
				)}

				{/* Step 2b: OTP Code */}
				{step === "otp-code" && (
					<form onSubmit={handleVerifyOtp} className="space-y-4">
						<button
							type="button"
							onClick={handleBack}
							className="flex items-center text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							{identifier}
						</button>

						{otpSent && (
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-slate-700 mb-4">
								{loginMode === "phone" ? (
									<>
										<Smartphone className="inline mr-1.5 h-4 w-4 text-emerald-600" />
										{t("errors.auth.otp.smsCodeSent")}{" "}
										<strong>{phone}</strong>
									</>
								) : (
									<>
										<Mail className="inline mr-1.5 h-4 w-4 text-emerald-600" />
										{t("errors.auth.otp.codeSent")}{" "}
										<strong>{email}</strong>
									</>
								)}
							</div>
						)}

						<div className="space-y-2">
							<Label
								htmlFor={`${formId}-otp`}
								className="text-slate-700 font-medium text-sm"
							>
								{t("errors.auth.otp.codeLabel")}
							</Label>
							<Input
								ref={otpInputRef}
								id={`${formId}-otp`}
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								maxLength={6}
								value={otpCode}
								onChange={(e) =>
									setOtpCode(
										e.target.value.replace(/\D/g, ""),
									)
								}
								placeholder="000000"
								required
								autoComplete="one-time-code"
								enterKeyHint="done"
								className="h-16 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20 text-center text-3xl tracking-[0.5em] font-mono"
							/>
						</div>

						<Button
							type="submit"
							size="lg"
							className="w-full font-medium bg-emerald-600 hover:bg-emerald-700 text-white mt-6"
							disabled={loading || otpCode.length !== 6}
						>
							{loading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{t("header.nav.signIn")}
						</Button>

						<button
							type="button"
							onClick={handleSendOtp}
							disabled={loading}
							className="w-full text-center text-sm text-slate-500 hover:text-emerald-600 transition-colors disabled:opacity-50 mt-4"
						>
							{t("errors.auth.otp.resendCode")}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
