import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { normalizePhone } from "@convex/lib/phone";

export const Route = createFileRoute("/sign-up/$")({
	component: SignUpPage,
});

type SignUpStep = "form" | "verify-email";

function SignUpPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const searchStr = location.searchStr ?? "";
	const [step, setStep] = useState<SignUpStep>("form");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const otpInputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const cleanPhone = normalizePhone(phone);
			const fullName = `${firstName} ${lastName}`.trim();
			const result = await authClient.signUp.email({
				email,
				password,
				name: fullName,
				phoneNumber: cleanPhone,
			});

			if (result.error) {
				setError(result.error.message || t("errors.auth.signUpFailed"));
			} else {
				// Send email verification OTP
				try {
					await authClient.emailOtp.sendVerificationOtp({
						email,
						type: "email-verification",
					});
				} catch {
					// Non-blocking — user can resend
				}

				setStep("verify-email");
				setTimeout(() => otpInputRef.current?.focus(), 100);
			}
		} catch {
			setError(t("errors.auth.signUpFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!otpCode || otpCode.length !== 6) return;
		setError(null);
		setLoading(true);

		try {
			const result = await authClient.emailOtp.verifyEmail({
				email,
				otp: otpCode,
			});

			if (result.error) {
				setError(result.error.message || t("errors.auth.otp.invalidCode"));
			} else {
				// Email verified — now sign in to create a session
				const signInResult = await authClient.signIn.email({
					email,
					password,
				});

				if (signInResult.error) {
					setError(signInResult.error.message || t("errors.auth.signInFailed"));
				} else {
					// ensureUser (via AuthSync) handles firstName/lastName/phone sync
					captureEvent("user_signed_up", { method: "email" });
					const params = new URLSearchParams(searchStr);
					const redirectTo = params.get("redirect");
					await new Promise((r) => setTimeout(r, 500));
					navigate({ to: redirectTo || "/post-login-redirect" });
				}
			}
		} catch {
			setError(t("errors.auth.otp.invalidCode"));
		} finally {
			setLoading(false);
		}
	};

	const handleResendOtp = async () => {
		setError(null);
		setLoading(true);
		try {
			const result = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "email-verification",
			});
			if (result.error) {
				setError(result.error.message || t("errors.auth.otp.sendFailed"));
			}
		} catch {
			setError(t("errors.auth.otp.sendFailed"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950">
			{/* Background Image with Gradient Overlay - Matching Hero */}
			<div className="absolute inset-0 z-0">
				<img
					src="/hero-background.png"
					alt="Gabon cityscape"
					className="h-full w-full object-cover opacity-50"
				/>
				<div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-black/40" />
				<div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
			</div>

			<div className="relative z-10 w-full max-w-md px-4">
				<div className="mb-8 text-center space-y-2">
					<h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
						{t("errors.auth.createAccount")}
					</h1>
					<p className="text-white/80 text-lg">
						{t("errors.auth.joinPlatform")}
					</p>
				</div>

				{/* Sign Up Form */}
				{step === "form" && (
					<div className="w-full">
						<form
							onSubmit={handleSubmit}
							className="rounded-xl border border-border/50 bg-card shadow-xl w-full mx-auto p-6 space-y-4"
						>
							{error && (
								<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{error}
								</div>
							)}

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="sign-up-lastName"
										className="text-foreground font-medium"
									>
										{t("common.lastName")}
									</Label>
									<Input
										id="sign-up-lastName"
										type="text"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										required
										autoComplete="family-name"
										className="border-border focus:ring-2 focus:ring-primary/20"
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="sign-up-firstName"
										className="text-foreground font-medium"
									>
										{t("common.firstName")}
									</Label>
									<Input
										id="sign-up-firstName"
										type="text"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										required
										autoComplete="given-name"
										className="border-border focus:ring-2 focus:ring-primary/20"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="sign-up-phone"
									className="text-foreground font-medium"
								>
									{t("profile.fields.phone", "Téléphone")}
								</Label>
								<Input
									id="sign-up-phone"
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+33 6 12 34 56 78"
									autoComplete="tel"
									className="border-border focus:ring-2 focus:ring-primary/20"
								/>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="sign-up-email"
									className="text-foreground font-medium"
								>
									{t("common.email")}
								</Label>
								<Input
									id="sign-up-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="email@example.com"
									required
									autoComplete="email"
									className="border-border focus:ring-2 focus:ring-primary/20"
								/>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="sign-up-password"
									className="text-foreground font-medium"
								>
									{t("common.password")}
								</Label>
								<Input
									id="sign-up-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="new-password"
									className="border-border focus:ring-2 focus:ring-primary/20"
								/>
							</div>

							<Button
								type="submit"
								className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
								disabled={loading}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{t("errors.auth.createAccount")}
							</Button>

							<div className="text-center text-sm text-muted-foreground">
								{t("errors.auth.alreadyHaveAccount")}{" "}
								<a
									href={`/sign-in${searchStr}`}
									className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
								>
									{t("header.nav.signIn")}
								</a>
							</div>
						</form>
					</div>
				)}

				{/* Email Verification Step */}
				{step === "verify-email" && (
					<div className="w-full">
						<div className="rounded-xl border border-border/50 bg-card shadow-xl w-full mx-auto p-6 space-y-4">
							<button
								type="button"
								onClick={() => {
									setStep("form");
									setOtpCode("");
									setError(null);
								}}
								className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<ArrowLeft className="mr-1 h-4 w-4" />
								{t("common.back", "Retour")}
							</button>

							<div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
								<Mail className="inline mr-1.5 h-4 w-4 text-primary" />
								{t("errors.auth.otp.codeSent")}{" "}
								<strong>{email}</strong>
							</div>

							{error && (
								<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{error}
								</div>
							)}

							<form onSubmit={handleVerifyEmail} className="space-y-4">
								<div className="space-y-2">
									<Label
										htmlFor="sign-up-otp"
										className="text-foreground font-medium"
									>
										{t("errors.auth.otp.codeLabel")}
									</Label>
									<Input
										ref={otpInputRef}
										id="sign-up-otp"
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										maxLength={6}
										value={otpCode}
										onChange={(e) =>
											setOtpCode(e.target.value.replace(/\D/g, ""))
										}
										placeholder="000000"
										required
										autoComplete="one-time-code"
										enterKeyHint="done"
										className="h-16 border-border focus:ring-2 focus:ring-primary/20 text-center text-3xl tracking-[0.5em] font-mono"
									/>
								</div>

								<Button
									type="submit"
									className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
									disabled={loading || otpCode.length !== 6}
								>
									{loading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{t("errors.auth.otp.verify", "Vérifier")}
								</Button>

								<button
									type="button"
									onClick={handleResendOtp}
									disabled={loading}
									className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
								>
									{t("errors.auth.otp.resendCode")}
								</button>
							</form>
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="mt-8 text-center text-sm text-muted-foreground/60">
					<p>
						&copy; {new Date().getFullYear()} Consulat.ga - République Gabonaise
					</p>
				</div>
			</div>
		</div>
	);
}
