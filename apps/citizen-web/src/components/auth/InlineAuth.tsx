/**
 * InlineAuth — Embedded sign-in / sign-up form for registration wizards.
 *
 * Replaces the old Clerk <SignUp>/<SignIn> embeds so users never leave the
 * multi-step registration flow.  When authentication succeeds the parent's
 * useConvexAuth() will flip isAuthenticated → true and the wizard auto-advances.
 *
 * Supports both email+password and email OTP (code by email) sign-in.
 */

import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Smartphone } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { normalizePhone } from "@convex/lib/phone";

// ============================================================================
// SCHEMAS
// ============================================================================

const signUpSchema = z.object({
	firstName: z.string().min(1, { message: "errors.field.required" }),
	lastName: z.string().min(1, { message: "errors.field.required" }),
	phone: z
		.string()
		.min(1, { message: "errors.field.required" })
		.regex(/^\+\d[\d\s]{6,}$/, { message: "errors.field.phone.invalid" }),
	email: z.email({ message: "errors.field.email.invalid" }),
	password: z.string().min(8, { message: "errors.field.password.min" }),
});

const signInSchema = z.object({
	email: z.email({ message: "errors.field.email.invalid" }),
	password: z.string().min(1, { message: "errors.field.required" }),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignInValues = z.infer<typeof signInSchema>;

// ============================================================================
// TYPES
// ============================================================================

type AuthMode = "sign-up" | "sign-in";
type SignInStep = "form" | "otp-code";
type OtpChannel = "email" | "sms";

/** Detect whether a string looks like a phone number */
function isPhoneNumber(value: string): boolean {
	return /^\+\d/.test(value.trim());
}

/** Map Better Auth English errors → i18n keys + optional target field.
 *  Keys are partial matches (checked with `includes`) against the lowercased message. */
const AUTH_ERROR_PATTERNS: Array<{
	pattern: string;
	key: string;
	field?: keyof SignUpValues;
}> = [
	{ pattern: "password too short", key: "errors.field.password.min", field: "password" },
	{ pattern: "user already exists", key: "errors.auth.emailAlreadyExists", field: "email" },
	{ pattern: "email already in use", key: "errors.auth.emailAlreadyExists", field: "email" },
	{ pattern: "invalid email or password", key: "errors.auth.invalidCredentials" },
	{ pattern: "invalid email", key: "errors.field.email.invalid", field: "email" },
];

function matchAuthError(message?: string): { key: string; field?: keyof SignUpValues } | null {
	if (!message) return null;
	const lower = message.toLowerCase();
	return AUTH_ERROR_PATTERNS.find((p) => lower.includes(p.pattern)) ?? null;
}

interface InlineAuthProps {
	/** Which form to show first */
	defaultMode?: AuthMode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InlineAuth({ defaultMode = "sign-up" }: InlineAuthProps) {
	const { t } = useTranslation();
	const formId = useId();
	const [mode, setMode] = useState<AuthMode>(defaultMode);
	const [signInStep, setSignInStep] = useState<SignInStep>("form");
	const [otpCode, setOtpCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [otpSent, setOtpSent] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [otpChannel, setOtpChannel] = useState<OtpChannel>("email");
	const otpInputRef = useRef<HTMLInputElement>(null);
	const { mutateAsync: updateMe } = useConvexMutationQuery(
		api.functions.users.updateMe,
	);

	// Separate forms for sign-up and sign-in (different schemas)
	const signUpForm = useForm<SignUpValues>({
		resolver: zodResolver(signUpSchema),
		mode: "onSubmit",
		defaultValues: {
			firstName: "",
			lastName: "",
			phone: "",
			email: "",
			password: "",
		},
	});

	const signInForm = useForm<SignInValues>({
		resolver: zodResolver(signInSchema),
		mode: "onSubmit",
		defaultValues: {
			email: "",
			password: "",
		},
	});

	// Keep email in sync across forms when toggling
	const currentEmail =
		mode === "sign-up" ? signUpForm.watch("email") : signInForm.watch("email");

	useEffect(() => {
		if (signInStep === "otp-code" && otpInputRef.current) {
			otpInputRef.current.focus();
		}
	}, [signInStep]);

	// ── Sign-up handler ──────────────────────────────────────────────────

	const handleSignUp = async (data: SignUpValues) => {
		setError(null);
		setLoading(true);

		try {
			const fullName =
				`${data.firstName.trim()} ${data.lastName.trim()}`.trim();
			const cleanPhone = normalizePhone(data.phone) ?? data.phone.trim();
			const result = await authClient.signUp.email({
				email: data.email,
				password: data.password,
				name: fullName,
				phoneNumber: cleanPhone,
			});
			if (result.error) {
				const mapped = matchAuthError(result.error.message);
				if (mapped?.field) {
					// Show error on the specific field instead of the generic banner
					signUpForm.setError(mapped.field, {
						type: "server",
						message: t(mapped.key),
					});
				} else {
					setError(mapped ? t(mapped.key) : (result.error.message || t("errors.auth.signUpFailed")));
				}
			} else {
				// Save firstName, lastName, and phone to user record.
				// Retry with backoff because ensureUser may not have created
				// the user record yet right after sign-up.
				const updateData = {
					name: fullName,
					firstName: data.firstName.trim(),
					lastName: data.lastName.trim(),
					phone: cleanPhone,
				};
				const maxRetries = 3;
				for (let attempt = 0; attempt < maxRetries; attempt++) {
					try {
						await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
						await updateMe(updateData);
						break;
					} catch {
						if (attempt === maxRetries - 1) {
							// All retries exhausted — non-blocking
						}
					}
				}
				captureEvent("user_signed_up", { method: "email" });
			}
		} catch {
			setError(t("errors.auth.signUpFailed"));
		} finally {
			setLoading(false);
		}
	};

	// ── Sign-in handler ──────────────────────────────────────────────────

	const handleSignIn = async (data: SignInValues) => {
		setError(null);
		setLoading(true);

		try {
			const result = await authClient.signIn.email({
				email: data.email,
				password: data.password,
			});
			if (result.error) {
				const mapped = matchAuthError(result.error.message);
				setError(mapped ? t(mapped.key) : (result.error.message || t("errors.auth.signInFailed")));
			} else {
				captureEvent("user_logged_in", { method: "password" });
			}
		} catch {
			setError(t("errors.auth.signInFailed"));
		} finally {
			setLoading(false);
		}
	};

	// ── OTP handlers ─────────────────────────────────────────────────────

	const handleSendOtp = async () => {
		if (!currentEmail) return;
		setError(null);
		setLoading(true);

		try {
			if (isPhoneNumber(currentEmail)) {
				// Phone number detected → send SMS OTP
				const cleanPhone = normalizePhone(currentEmail) ?? currentEmail.trim();
				const result = await authClient.phoneNumber.sendOtp({
					phoneNumber: cleanPhone,
				});
				if (result.error) {
					setError(result.error.message || t("errors.auth.otp.sendFailed"));
				} else {
					setOtpSent(true);
					setOtpChannel("sms");
					setSignInStep("otp-code");
				}
			} else {
				// Email detected → send email OTP
				const result = await authClient.emailOtp.sendVerificationOtp({
					email: currentEmail,
					type: "sign-in",
				});
				if (result.error) {
					setError(result.error.message || t("errors.auth.otp.sendFailed"));
				} else {
					setOtpSent(true);
					setOtpChannel("email");
					setSignInStep("otp-code");
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
		if (!otpCode || !currentEmail) return;
		setError(null);
		setLoading(true);

		try {
			if (otpChannel === "sms") {
				const cleanPhone = normalizePhone(currentEmail) ?? currentEmail.trim();
				const result = await authClient.phoneNumber.verify({
					phoneNumber: cleanPhone,
					code: otpCode,
				});
				if (result.error) {
					setError(result.error.message || t("errors.auth.otp.invalidCode"));
				} else {
					captureEvent("user_logged_in", { method: "sms_otp" });
				}
			} else {
				const result = await authClient.signIn.emailOtp({
					email: currentEmail,
					otp: otpCode,
				});
				if (result.error) {
					setError(result.error.message || t("errors.auth.otp.invalidCode"));
				} else {
					captureEvent("user_logged_in", { method: "email_otp" });
				}
			}
		} catch {
			setError(t("errors.auth.otp.invalidCode"));
		} finally {
			setLoading(false);
		}
	};

	// ── Toggle mode ──────────────────────────────────────────────────────

	const toggleMode = () => {
		const newMode = mode === "sign-up" ? "sign-in" : "sign-up";
		// Sync email across forms
		if (newMode === "sign-in") {
			signInForm.setValue("email", signUpForm.getValues("email"));
		} else {
			signUpForm.setValue("email", signInForm.getValues("email"));
		}
		setMode(newMode);
		setError(null);
		setSignInStep("form");
		setOtpSent(false);
		setOtpCode("");
	};

	// ── Error banner ─────────────────────────────────────────────────────

	const errorBanner = error ? (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
			{error}
		</div>
	) : null;

	// ============================================================================
	// OTP CODE STEP (sign-in only)
	// ============================================================================

	if (mode === "sign-in" && signInStep === "otp-code") {
		return (
			<div className="w-full max-w-md mx-auto">
				<form
					onSubmit={handleVerifyOtp}
					className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm p-6 space-y-4"
				>
					{errorBanner}

					<button
						type="button"
						onClick={() => {
							setSignInStep("form");
							setOtpSent(false);
							setOtpCode("");
							setError(null);
						}}
						className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="mr-1 h-4 w-4" />
						{currentEmail}
					</button>

					{otpSent && (
						<div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
							{otpChannel === "sms" ? (
								<><Smartphone className="inline mr-1.5 h-4 w-4 text-primary" />
								{t("errors.auth.otp.smsCodeSent")} <strong>{currentEmail}</strong></>
							) : (
								<><Mail className="inline mr-1.5 h-4 w-4 text-primary" />
								{t("errors.auth.otp.codeSent")} <strong>{currentEmail}</strong></>
							)}
						</div>
					)}

					<Field>
						<FieldLabel htmlFor={`${formId}-otp`}>
							{t("errors.auth.otp.codeLabel")}
						</FieldLabel>
						<Input
							ref={otpInputRef}
							id={`${formId}-otp`}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={6}
							value={otpCode}
							onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
							placeholder="000000"
							required
							autoComplete="one-time-code"
							className="text-center text-2xl tracking-[0.5em] font-mono"
						/>
					</Field>

					<Button
						type="submit"
						className="w-full bg-[#009639] hover:bg-[#007a2f] text-white font-medium"
						disabled={loading || otpCode.length !== 6}
					>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{t("header.nav.signIn")}
					</Button>

					<button
						type="button"
						onClick={handleSendOtp}
						disabled={loading}
						className="w-full text-center text-sm text-muted-foreground hover:text-[#009639] transition-colors disabled:opacity-50"
					>
						{t("errors.auth.otp.resendCode")}
					</button>
				</form>
			</div>
		);
	}

	// ============================================================================
	// MAIN FORM (sign-up / sign-in)
	// ============================================================================

	const onSubmit =
		mode === "sign-up"
			? signUpForm.handleSubmit(handleSignUp)
			: signInForm.handleSubmit(handleSignIn);

	return (
		<div className="w-full max-w-md mx-auto">
			<form
				onSubmit={onSubmit}
				className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm p-6 space-y-4"
			>
				{errorBanner}

				{/* Name fields — sign-up only */}
				{mode === "sign-up" && (
					<FieldGroup className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Controller
								name="firstName"
								control={signUpForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`${formId}-firstName`}>
											{t("common.firstName")} *
										</FieldLabel>
										<Input
											id={`${formId}-firstName`}
											placeholder="Jean"
											aria-invalid={fieldState.invalid}
											autoComplete="given-name"
											{...field}
										/>
										{fieldState.error && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
							<Controller
								name="lastName"
								control={signUpForm.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`${formId}-lastName`}>
											{t("common.lastName")} *
										</FieldLabel>
										<Input
											id={`${formId}-lastName`}
											placeholder="Dupont"
											aria-invalid={fieldState.invalid}
											autoComplete="family-name"
											{...field}
										/>
										{fieldState.error && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						{/* Phone */}
						<Controller
							name="phone"
							control={signUpForm.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={`${formId}-phone`}>
										{t("profile.fields.phone")} *
									</FieldLabel>
									<Input
										id={`${formId}-phone`}
										type="tel"
										placeholder="+33 6 12 34 56 78"
										autoComplete="tel"
										{...field}
									/>
									{fieldState.error && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>
				)}

				{/* Email */}
				{mode === "sign-up" ? (
					<Controller
						name="email"
						control={signUpForm.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${formId}-email`}>
									{t("common.email")} *
								</FieldLabel>
								<Input
									id={`${formId}-email`}
									type="email"
									placeholder="email@example.com"
									aria-invalid={fieldState.invalid}
									autoComplete="email"
									{...field}
								/>
								{fieldState.error && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
				) : (
					<Controller
						name="email"
						control={signInForm.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${formId}-email`}>
									{t("common.email")} *
								</FieldLabel>
								<Input
									id={`${formId}-email`}
									type="email"
									placeholder="email@example.com"
									aria-invalid={fieldState.invalid}
									autoComplete="email"
									{...field}
								/>
								{fieldState.error && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
				)}

				{/* Password */}
				{mode === "sign-up" ? (
					<Controller
						name="password"
						control={signUpForm.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${formId}-password`}>
									{t("common.password")} *
								</FieldLabel>
								<div className="relative">
									<Input
										id={`${formId}-password`}
										type={showPassword ? "text" : "password"}
										aria-invalid={fieldState.invalid}
										autoComplete="new-password"
										className="pr-10"
										{...field}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										tabIndex={-1}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
								{fieldState.error && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
				) : (
					<Controller
						name="password"
						control={signInForm.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<div className="flex items-center justify-between w-full">
									<FieldLabel htmlFor={`${formId}-password`}>
										{t("common.password")} *
									</FieldLabel>
									<button
										type="button"
										onClick={handleSendOtp}
										className="text-sm font-medium text-primary hover:underline"
										disabled={loading || !currentEmail}
									>
										{t(
											"errors.auth.otp.forgotPassword",
											"Mot de passe oublié ?",
										)}
									</button>
								</div>
								<div className="relative">
									<Input
										id={`${formId}-password`}
										type={showPassword ? "text" : "password"}
										aria-invalid={fieldState.invalid}
										autoComplete="current-password"
										className="pr-10"
										{...field}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										tabIndex={-1}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
								{fieldState.error && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
				)}

				{/* Submit */}
				<Button
					type="submit"
					className="w-full bg-[#009639] hover:bg-[#007a2f] text-white font-medium"
					disabled={loading}
				>
					{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					{mode === "sign-up"
						? t("errors.auth.createAccount")
						: t("header.nav.signIn")}
				</Button>

				{/* OTP sign-in option — sign-in mode only */}
				{mode === "sign-in" && (
					<>
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-border/50" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card/80 px-2 text-muted-foreground">
									{t("errors.auth.orDivider")}
								</span>
							</div>
						</div>

						<Button
							type="button"
							variant="outline"
							className="w-full"
							disabled={!currentEmail || loading}
							onClick={handleSendOtp}
						>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isPhoneNumber(currentEmail) ? (
								<><Smartphone className="mr-2 h-4 w-4" />
								{t("errors.auth.otp.sendCodeBySms")}</>
							) : (
								<><Mail className="mr-2 h-4 w-4" />
								{t("errors.auth.otp.sendCode")}</>
							)}
						</Button>
					</>
				)}

				{/* Toggle mode */}
				<div className="text-center text-sm text-muted-foreground">
					{mode === "sign-up"
						? t("errors.auth.alreadyHaveAccount")
						: t("errors.auth.noAccount")}{" "}
					<button
						type="button"
						onClick={toggleMode}
						className="text-[#009639] hover:text-[#007a2f] font-medium underline-offset-4 hover:underline"
					>
						{mode === "sign-up"
							? t("header.nav.signIn")
							: t("errors.auth.createAccount")}
					</button>
				</div>
			</form>
		</div>
	);
}
