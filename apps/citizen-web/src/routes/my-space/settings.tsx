import { api } from "@convex/_generated/api";
import { CountryCode } from "@convex/lib/constants";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	Check,
	KeyRound,
	Loader2,
	Lock,
	LogOut,
	Mail,
	Palette,
	Trash2,
	User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	SettingsDivider,
	SettingsLayout,
	SettingsRow,
	SettingsSectionHeader,
	type SettingsTab,
} from "@/components/shared/settings-layout";
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
import { FlagIcon } from "@/components/ui/flag-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type ConsularTheme, useConsularTheme } from "@/hooks/useConsularTheme";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-space/settings")({
	component: SettingsPage,
});

function ThemePreview({
	themeId,
	label,
	description,
	isActive,
	onClick,
}: {
	themeId: ConsularTheme;
	label: string;
	description: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer w-full text-left",
				isActive
					? "border-primary bg-primary/5 ring-2 ring-primary/20"
					: "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
			)}
		>
			<div
				className={cn(
					"w-16 h-12 rounded-lg overflow-hidden relative shrink-0",
					themeId === "default"
						? "bg-card border border-border"
						: "bg-[oklch(0.92_0.005_250)]",
				)}
			>
				{themeId === "default" ? (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div className="h-2.5 bg-muted rounded border border-border" />
						<div className="flex gap-0.5">
							<div className="h-2 flex-1 bg-muted rounded border border-border" />
							<div className="h-2 flex-1 bg-muted rounded border border-border" />
						</div>
					</div>
				) : (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div
							className="h-2.5 rounded"
							style={{
								background: "oklch(0.92 0.005 250)",
								boxShadow:
									"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
							}}
						/>
						<div className="flex gap-0.5">
							<div
								className="h-2 flex-1 rounded"
								style={{
									background: "oklch(0.92 0.005 250)",
									boxShadow:
										"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
								}}
							/>
							<div
								className="h-2 flex-1 rounded"
								style={{
									background: "oklch(0.92 0.005 250)",
									boxShadow:
										"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
								}}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold">{label}</p>
				<p className="text-xs text-muted-foreground leading-tight truncate">
					{description}
				</p>
			</div>

			{isActive && <div className="w-3 h-3 rounded-full bg-primary shrink-0" />}
		</button>
	);
}

function SettingsPage() {
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const { consularTheme, setConsularTheme } = useConsularTheme();

	const [activeTab, setActiveTab] = useState("accountSecurity");

	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	const { data: session } = authClient.useSession();

	const [resetStep, setResetStep] = useState<"idle" | "otp_sent" | "done">(
		"idle",
	);
	const [resetOtp, setResetOtp] = useState("");
	const [resetNewPassword, setResetNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetLoading, setResetLoading] = useState(false);
	const [resetError, setResetError] = useState<string | null>(null);
	const [resetSuccess, setResetSuccess] = useState(false);

	const preferences = useQuery(api.functions.userPreferences.getMyPreferences);
	const updatePreferences = useMutation(
		api.functions.userPreferences.updateMyPreferences,
	);

	const handlePrefToggle = (
		key:
			| "emailNotifications"
			| "pushNotifications"
			| "smsNotifications"
			| "shareAnalytics",
		value: boolean,
	) => {
		updatePreferences({ [key]: value });
		captureEvent("myspace_preferences_updated");
	};

	const handleLanguageChange = (lang: "fr" | "en") => {
		updatePreferences({ language: lang });
		i18n.changeLanguage(lang);
		captureEvent("myspace_preferences_updated");
	};

	const handleSendResetOtp = async () => {
		const email = session?.user?.email;
		if (!email) return;
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "forget-password",
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetStep("otp_sent");
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const handleResetWithOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = session?.user?.email;
		if (!email) return;
		if (resetNewPassword.length < 8) {
			setResetError(t("settings.security.passwordTooShort"));
			return;
		}
		if (resetNewPassword !== confirmPassword) {
			setResetError(t("settings.security.passwordMismatch"));
			return;
		}
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.resetPassword({
				email,
				otp: resetOtp,
				password: resetNewPassword,
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetSuccess(true);
				setResetStep("done");
				setResetOtp("");
				setResetNewPassword("");
				setConfirmPassword("");
				setTimeout(() => {
					setResetSuccess(false);
					setResetStep("idle");
				}, 4000);
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const TABS: SettingsTab[] = [
		{
			id: "accountSecurity",
			label: t("settings.security.accountInfo"),
			icon: <User className="size-4" />,
		},
		{
			id: "notifications",
			label: t("settings.notifications.title"),
			icon: <Bell className="size-4" />,
		},
		{
			id: "appearance",
			label: t("settings.display.title"),
			icon: <Palette className="size-4" />,
		},
	];

	return (
		<>
			<SettingsLayout
				title={t("mySpace.screens.settings.heading")}
				description={t("mySpace.screens.settings.subtitle")}
				tabs={TABS}
				activeTab={activeTab}
				onTabChange={setActiveTab}
			>
				<div className="max-w-3xl">
					{activeTab === "accountSecurity" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.security.accountInfo")}
								description={t("settings.security.accountInfoDesc")}
							/>
							<div className="mb-10">
								<SettingsRow
									title={t("common.name")}
									value={session?.user?.name || "—"}
								/>
								<SettingsRow
									title={t("common.email")}
									value={session?.user?.email || "—"}
								/>
								<SettingsRow
									title={t("settings.security.memberSince")}
									value={
										session?.user?.createdAt
											? new Date(session.user.createdAt).toLocaleDateString(
													i18n.language,
													{
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)
											: "—"
									}
								/>
							</div>

							<SettingsSectionHeader
								title={t("settings.privacy.title")}
								description={t("settings.privacy.description")}
							/>
							<div>
								<SettingsRow
									title={t("settings.privacy.analytics")}
									description={t("settings.privacy.analyticsDesc")}
									action={
										<Switch
											checked={preferences?.shareAnalytics ?? true}
											onCheckedChange={(checked) =>
												handlePrefToggle("shareAnalytics", checked)
											}
										/>
									}
								/>
							</div>

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.security.changePassword")}
								description={t("settings.security.changePasswordDesc")}
							/>
							<div className="max-w-md space-y-4 py-2">
								{resetError && (
									<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
										{resetError}
									</div>
								)}
								{resetSuccess && (
									<div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary flex items-center gap-2">
										<Check className="size-4" />
										{t("settings.security.resetSuccess")}
									</div>
								)}

								{resetStep === "idle" && (
									<Button
										variant="outline"
										onClick={handleSendResetOtp}
										disabled={resetLoading || !session?.user?.email}
									>
										{resetLoading ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Mail className="mr-2 size-4" />
										)}
										{t("settings.security.sendResetCode")}
									</Button>
								)}

								{resetStep === "otp_sent" && (
									<form onSubmit={handleResetWithOtp} className="space-y-4">
										<p className="text-sm text-muted-foreground">
											{t("settings.security.otpSentTo", {
												email: session?.user?.email,
											})}
										</p>
										<div className="space-y-2">
											<Label>{t("settings.security.otpCode")}</Label>
											<Input
												value={resetOtp}
												onChange={(e) => setResetOtp(e.target.value)}
												placeholder="123456"
												required
												autoComplete="one-time-code"
											/>
										</div>
										<div className="space-y-2">
											<Label>{t("settings.security.newPassword")}</Label>
											<Input
												type="password"
												value={resetNewPassword}
												onChange={(e) => setResetNewPassword(e.target.value)}
												required
												minLength={8}
												autoComplete="new-password"
											/>
										</div>
										<div className="space-y-2">
											<Label>{t("settings.security.confirmPassword")}</Label>
											<Input
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												required
												minLength={8}
												autoComplete="new-password"
											/>
										</div>
										<div className="flex gap-2">
											<Button
												type="submit"
												disabled={
													resetLoading ||
													!resetOtp ||
													!resetNewPassword ||
													!confirmPassword ||
													resetNewPassword !== confirmPassword
												}
											>
												{resetLoading && (
													<Loader2 className="mr-2 size-4 animate-spin" />
												)}
												{t("settings.security.resetPassword")}
											</Button>
											<Button
												type="button"
												variant="ghost"
												onClick={() => {
													setResetStep("idle");
													setResetError(null);
													setResetOtp("");
													setResetNewPassword("");
													setConfirmPassword("");
												}}
											>
												{t("common.cancel")}
											</Button>
										</div>
									</form>
								)}
							</div>

							<SettingsDivider />

							{/* ─── PIN Code Section ─── */}
							<PinCodeSection />

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.account.title")}
								description={t("settings.account.description")}
							/>
							<div className="py-2">
								<SettingsRow
									title={t("common.logout")}
									description={t("common.logoutConfirmDescription")}
									action={
										<Button
											variant="destructive"
											onClick={() => setShowLogoutDialog(true)}
										>
											<LogOut className="mr-2 size-4" />
											{t("common.logout")}
										</Button>
									}
								/>
							</div>
						</div>
					)}

					{activeTab === "notifications" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.notifications.title")}
								description={t("settings.notifications.description")}
							/>
							<div>
								<SettingsRow
									title={t("settings.notifications.email")}
									description={t("settings.notifications.emailDesc")}
									action={
										<Switch
											checked={preferences?.emailNotifications ?? true}
											onCheckedChange={(checked) =>
												handlePrefToggle("emailNotifications", checked)
											}
										/>
									}
								/>
								<SettingsRow
									title={t("settings.notifications.push")}
									description={t("settings.notifications.pushDesc")}
									action={
										<Switch
											checked={preferences?.pushNotifications ?? true}
											onCheckedChange={(checked) =>
												handlePrefToggle("pushNotifications", checked)
											}
										/>
									}
								/>
								<SettingsRow
									title={t("settings.notifications.sms")}
									description={t("settings.notifications.smsDesc")}
									action={
										<Switch
											checked={preferences?.smsNotifications ?? false}
											onCheckedChange={(checked) =>
												handlePrefToggle("smsNotifications", checked)
											}
										/>
									}
								/>
							</div>
						</div>
					)}

					{activeTab === "appearance" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.language.title")}
								description={t("settings.language.description")}
							/>
							<div className="mb-10 py-2 flex gap-2">
								<Button
									variant={
										(preferences?.language ?? i18n.language) === "fr"
											? "default"
											: "outline"
									}
									size="sm"
									onClick={() => handleLanguageChange("fr")}
								>
									<FlagIcon countryCode={CountryCode.FR} />{" "}
									{t("header.language.fr")}
								</Button>
								<Button
									variant={
										(preferences?.language ?? i18n.language) === "en"
											? "default"
											: "outline"
									}
									size="sm"
									onClick={() => handleLanguageChange("en")}
								>
									<FlagIcon countryCode={CountryCode.US} />{" "}
									{t("header.language.en")}
								</Button>
							</div>

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.display.title")}
								description={t("settings.display.description")}
							/>
							<div className="mb-10">
								<SettingsRow
									title={t("settings.display.darkMode")}
									description={t("settings.display.darkModeDesc")}
									action={
										<Switch
											checked={theme === "dark"}
											onCheckedChange={(checked) => {
												setTheme(checked ? "dark" : "light");
												captureEvent("myspace_preferences_updated");
											}}
										/>
									}
								/>
							</div>

							<SettingsSectionHeader
								title={t("settings.consularTheme.title")}
								description={t("settings.consularTheme.description")}
							/>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
								<ThemePreview
									themeId="default"
									label={t("settings.consularTheme.default")}
									description={t("settings.consularTheme.defaultDesc")}
									isActive={consularTheme === "default"}
									onClick={() => {
										setConsularTheme("default");
										captureEvent("myspace_preferences_updated");
									}}
								/>
								<ThemePreview
									themeId="homeomorphism"
									label={t("settings.consularTheme.homeomorphism")}
									description={t("settings.consularTheme.homeomorphismDesc")}
									isActive={consularTheme === "homeomorphism"}
									onClick={() => {
										setConsularTheme("homeomorphism");
										captureEvent("myspace_preferences_updated");
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</SettingsLayout>

			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("common.logoutConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("common.logoutConfirmDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								await authClient.signOut();
								window.location.href = "/";
							}}
						>
							{t("common.logout")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ─── PIN Code Section ─────────────────────────────────────
function PinCodeSection() {
	const pinStatus = useQuery(api.functions.pin.getPinStatus, {});
	const createPinMut = useMutation(api.functions.pin.createPin);
	const updatePinMut = useMutation(api.functions.pin.updatePin);
	const deletePinMut = useMutation(api.functions.pin.deletePin);
	const [mode, setMode] = useState<"idle" | "create" | "modify" | "delete">("idle");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [currentPin, setCurrentPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);
	const [pinLoading, setPinLoading] = useState(false);
	const resetForm = () => { setMode("idle"); setNewPin(""); setConfirmPin(""); setCurrentPin(""); setPinError(null); };
	if (pinStatus === undefined) return null;
	const daysLeft = pinStatus.lastOtpVerifiedAt ? Math.max(0, Math.floor((pinStatus.lastOtpVerifiedAt + 90*24*60*60*1000 - Date.now()) / (24*60*60*1000))) : 0;
	return (
		<div>
			<SettingsSectionHeader title="Code PIN" description={pinStatus.hasPin ? `Actif depuis le ${pinStatus.pinCreatedAt ? new Date(pinStatus.pinCreatedAt).toLocaleDateString("fr-FR") : "—"}` : "Créez un code PIN pour vous connecter plus rapidement"} />
			<div className="py-3 space-y-3">
				{!pinStatus.hasPin && mode === "idle" && <Button variant="outline" onClick={() => setMode("create")} className="gap-2"><Lock className="h-4 w-4" />Créer mon code PIN</Button>}
				{pinStatus.hasPin && mode === "idle" && (
					<div className="space-y-2">
						{daysLeft > 0 && daysLeft <= 15 && <p className="text-xs text-amber-600">Vérification OTP requise dans {daysLeft} jours</p>}
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={() => setMode("modify")} className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />Modifier</Button>
							<Button variant="ghost" size="sm" onClick={() => setMode("delete")} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" />Supprimer</Button>
						</div>
					</div>
				)}
				{mode === "create" && (
					<div className="space-y-3 p-3 border rounded-lg">
						<div className="space-y-1"><label className="text-xs font-medium">Nouveau PIN (6 chiffres)</label><input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Confirmer</label><input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" onClick={async () => { if(newPin.length!==6||newPin!==confirmPin){setPinError("Codes différents");return;} setPinLoading(true);setPinError(null);try{await createPinMut({pin:newPin});resetForm();}catch(e:any){setPinError(e.message?.includes("OTP")?"Reconnectez-vous par OTP d'abord":(e.message??"Erreur"));}finally{setPinLoading(false);} }} disabled={pinLoading||newPin.length!==6||newPin!==confirmPin}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Enregistrer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
				{mode === "modify" && (
					<div className="space-y-3 p-3 border rounded-lg">
						<div className="space-y-1"><label className="text-xs font-medium">PIN actuel</label><input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Nouveau PIN</label><input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Confirmer</label><input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" onClick={async () => { if(newPin.length!==6||newPin!==confirmPin){setPinError("Codes différents");return;} setPinLoading(true);setPinError(null);try{await updatePinMut({currentPin,newPin});resetForm();}catch(e:any){setPinError(e.message?.includes("INVALID")?"PIN actuel incorrect":(e.message??"Erreur"));}finally{setPinLoading(false);} }} disabled={pinLoading}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Enregistrer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
				{mode === "delete" && (
					<div className="space-y-3 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
						<p className="text-sm">Supprimer votre code PIN ?</p>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" variant="destructive" onClick={async () => { setPinLoading(true);try{await deletePinMut({});resetForm();}catch(e:any){setPinError(e.message??"Erreur");}finally{setPinLoading(false);} }} disabled={pinLoading}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Supprimer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
			</div>
		</div>
	);
}
