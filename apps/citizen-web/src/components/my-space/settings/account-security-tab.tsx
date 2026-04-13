import {
	Check,
	KeyRound,
	Loader2,
	LogOut,
	Mail,
	Shield,
	User,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { PinCodeSection } from "./pin-code-section";

interface AccountSecurityTabProps {
	preferences:
		| {
				shareAnalytics?: boolean;
		  }
		| undefined;
	onPrefToggle: (
		key:
			| "emailNotifications"
			| "pushNotifications"
			| "smsNotifications"
			| "whatsappNotifications"
			| "shareAnalytics",
		value: boolean,
	) => void;
}

export function AccountSecurityTab({
	preferences,
	onPrefToggle,
}: AccountSecurityTabProps) {
	const { t, i18n } = useTranslation();
	const { data: session } = authClient.useSession();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	return (
		<>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* ─── Colonne gauche ─── */}
				<div className="flex flex-col gap-4">
					{/* Informations du compte */}
					<FlatCard>
						<CardHeader icon={<User className="h-3.5 w-3.5" />} title={t("settings.security.accountInfo")} />
						<div className="space-y-1 p-3">
							<InfoRow label={t("common.name")} value={session?.user?.name || "—"} />
							<InfoRow label={t("common.email")} value={session?.user?.email || "—"} />
							<InfoRow
								label={t("settings.security.memberSince")}
								value={
									session?.user?.createdAt
										? new Date(session.user.createdAt).toLocaleDateString(i18n.language, { year: "numeric", month: "long", day: "numeric" })
										: "—"
								}
							/>
						</div>
					</FlatCard>

					{/* Confidentialite */}
					<FlatCard>
						<CardHeader icon={<Shield className="h-3.5 w-3.5" />} title={t("settings.privacy.title")} />
						<div className="p-3">
							<div className="flex items-center justify-between gap-3 rounded-lg bg-[#FDFCFA] px-3 py-2.5 dark:bg-[#21201E]/77">
								<div className="space-y-0.5 pr-2">
									<p className="text-sm font-medium">{t("settings.privacy.analytics")}</p>
									<p className="text-xs text-muted-foreground">{t("settings.privacy.analyticsDesc")}</p>
								</div>
								<Switch
									checked={preferences?.shareAnalytics ?? true}
									onCheckedChange={(checked) => onPrefToggle("shareAnalytics", checked)}
								/>
							</div>
						</div>
					</FlatCard>

					{/* Deconnexion */}
					<FlatCard>
						<CardHeader icon={<LogOut className="h-3.5 w-3.5" />} title={t("settings.account.title")} />
						<div className="p-3">
							<p className="mb-3 text-xs text-muted-foreground">{t("settings.account.description")}</p>
							<Button variant="destructive" size="sm" onClick={() => setShowLogoutDialog(true)} className="w-full gap-2 rounded-xl">
								<LogOut className="size-3.5" />
								{t("common.logout")}
							</Button>
						</div>
					</FlatCard>
				</div>

				{/* ─── Colonne droite ─── */}
				<div className="flex flex-col gap-4">
					{/* Mot de passe */}
					<PasswordResetCard />

					{/* Code PIN */}
					<FlatCard>
						<div className="p-4">
							<PinCodeSection />
						</div>
					</FlatCard>
				</div>
			</div>

			{/* Dialog deconnexion */}
			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("common.logoutConfirmTitle")}</AlertDialogTitle>
						<AlertDialogDescription>{t("common.logoutConfirmDescription")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>
							{t("common.logout")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ─── Card Header iProfil ─────────────────────────────────────

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-2 rounded-t-xl bg-[#EBE6DC]/50 px-3 py-2.5 dark:bg-[#383633]/30 md:px-4">
			<div className="rounded-md bg-primary/10 p-1">
				<span className="text-primary">{icon}</span>
			</div>
			<span className="text-sm font-bold">{title}</span>
		</div>
	);
}

// ─── Info Row ────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg bg-[#FDFCFA] px-3 py-2 dark:bg-[#21201E]/77">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="ml-3 max-w-[220px] truncate text-sm font-medium">{value}</span>
		</div>
	);
}

// ─── Mot de passe ────────────────────────────────────────────

function PasswordResetCard() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const [resetStep, setResetStep] = useState<"idle" | "otp_sent" | "done">("idle");
	const [resetOtp, setResetOtp] = useState("");
	const [resetNewPassword, setResetNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetLoading, setResetLoading] = useState(false);
	const [resetError, setResetError] = useState<string | null>(null);
	const [resetSuccess, setResetSuccess] = useState(false);

	const handleSendResetOtp = async () => {
		const email = session?.user?.email;
		if (!email) return;
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" });
			if (result.error) setResetError(result.error.message || t("settings.security.changeFailed"));
			else setResetStep("otp_sent");
		} catch { setResetError(t("settings.security.changeFailed")); }
		finally { setResetLoading(false); }
	};

	const handleResetWithOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = session?.user?.email;
		if (!email) return;
		if (resetNewPassword.length < 8) { setResetError(t("settings.security.passwordTooShort")); return; }
		if (resetNewPassword !== confirmPassword) { setResetError(t("settings.security.passwordMismatch")); return; }
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.resetPassword({ email, otp: resetOtp, password: resetNewPassword });
			if (result.error) setResetError(result.error.message || t("settings.security.changeFailed"));
			else {
				setResetSuccess(true);
				setResetStep("done");
				setResetOtp(""); setResetNewPassword(""); setConfirmPassword("");
				setTimeout(() => { setResetSuccess(false); setResetStep("idle"); }, 4000);
			}
		} catch { setResetError(t("settings.security.changeFailed")); }
		finally { setResetLoading(false); }
	};

	return (
		<FlatCard>
			<CardHeader icon={<KeyRound className="h-3.5 w-3.5" />} title={t("settings.security.changePassword")} />
			<div className="space-y-3 p-3">
				<p className="text-xs text-muted-foreground">{t("settings.security.changePasswordDesc")}</p>

				{resetError && (
					<div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{resetError}</div>
				)}
				{resetSuccess && (
					<div className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary flex items-center gap-2">
						<Check className="size-3.5" />{t("settings.security.resetSuccess")}
					</div>
				)}

				{resetStep === "idle" && (
					<Button variant="outline" size="sm" onClick={handleSendResetOtp} disabled={resetLoading || !session?.user?.email} className="gap-2 w-full rounded-xl">
						{resetLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
						{t("settings.security.sendResetCode")}
					</Button>
				)}

				{resetStep === "otp_sent" && (
					<form onSubmit={handleResetWithOtp} className="space-y-2.5">
						<p className="text-xs text-muted-foreground">{t("settings.security.otpSentTo", { email: session?.user?.email })}</p>
						<div className="space-y-1"><Label className="text-xs">{t("settings.security.otpCode")}</Label><Input value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} placeholder="123456" required autoComplete="one-time-code" className="h-8 text-sm" /></div>
						<div className="space-y-1"><Label className="text-xs">{t("settings.security.newPassword")}</Label><Input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-8 text-sm" /></div>
						<div className="space-y-1"><Label className="text-xs">{t("settings.security.confirmPassword")}</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-8 text-sm" /></div>
						<div className="flex gap-2">
							<Button type="submit" size="sm" disabled={resetLoading || !resetOtp || !resetNewPassword || !confirmPassword || resetNewPassword !== confirmPassword}>
								{resetLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}{t("settings.security.resetPassword")}
							</Button>
							<Button type="button" variant="ghost" size="sm" onClick={() => { setResetStep("idle"); setResetError(null); setResetOtp(""); setResetNewPassword(""); setConfirmPassword(""); }}>
								{t("common.cancel")}
							</Button>
						</div>
					</form>
				)}
			</div>
		</FlatCard>
	);
}
