/**
 * AccountTab — Tout-en-un : Informations du compte + Securite + Affichage + Notifications + Zone dangereuse
 * Layout 4 colonnes desktop : Info & Securite | Affichage | Notifications | Actions
 */

import { api } from "@convex/_generated/api";
import { CountryCode } from "@convex/lib/constants";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	Bell,
	Check,
	Download,
	Eye,
	Globe,
	KeyRound,
	Loader2,
	LogOut,
	Mail,
	MessageCircle,
	Monitor,
	Moon,
	Palette,
	Shield,
	Smartphone,
	Sun,
	Trash2,
	Type,
	User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlatCard } from "@/components/my-space/flat-card";
import { FlagIcon } from "@/components/ui/flag-icon";
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
import { useConsularTheme } from "@/hooks/useConsularTheme";
import { authClient } from "@/lib/auth-client";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PinCodeSection } from "./pin-code-section";
import { ThemePreview } from "./theme-preview";

type PrefKey = "emailNotifications" | "pushNotifications" | "smsNotifications" | "whatsappNotifications" | "shareAnalytics";

interface AccountTabProps {
	preferences: {
		language?: "fr" | "en";
		shareAnalytics?: boolean;
		emailNotifications?: boolean;
		pushNotifications?: boolean;
		smsNotifications?: boolean;
		whatsappNotifications?: boolean;
	} | undefined;
	onPrefToggle: (key: PrefKey, value: boolean) => void;
	currentLanguage: string;
	onLanguageChange: (lang: "fr" | "en") => void;
}

const NOTIF_CHANNELS = [
	{ key: "emailNotifications" as const, icon: Mail, defaultValue: true, labelKey: "settings.notifications.email" },
	{ key: "pushNotifications" as const, icon: Monitor, defaultValue: true, labelKey: "settings.notifications.push" },
	{ key: "smsNotifications" as const, icon: Smartphone, defaultValue: false, labelKey: "settings.notifications.sms" },
	{ key: "whatsappNotifications" as const, icon: MessageCircle, defaultValue: false, labelKey: "settings.notifications.whatsapp" },
];

export function AccountTab({ preferences, onPrefToggle, currentLanguage, onLanguageChange }: AccountTabProps) {
	const { t, i18n } = useTranslation();
	const { data: session } = authClient.useSession();
	const { theme, setTheme } = useTheme();
	const { consularTheme, setConsularTheme } = useConsularTheme();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	const [fontSize, setFontSize] = useState<"small" | "default" | "large">(() => {
		if (typeof window === "undefined") return "default";
		return (localStorage.getItem("citizen-font-size") as "small" | "default" | "large") || "default";
	});

	const [reduceMotion, setReduceMotion] = useState(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem("citizen-reduce-motion") === "true";
	});

	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove("text-sm", "text-lg");
		const cls = fontSize === "small" ? "text-sm" : fontSize === "large" ? "text-lg" : "";
		if (cls) root.classList.add(cls);
		localStorage.setItem("citizen-font-size", fontSize);
	}, [fontSize]);

	useEffect(() => {
		document.documentElement.setAttribute("data-reduce-motion", reduceMotion ? "true" : "false");
		localStorage.setItem("citizen-reduce-motion", String(reduceMotion));
	}, [reduceMotion]);

	const effectiveLang = preferences?.language ?? currentLanguage;
	const isDark = theme === "dark";

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
				{/* ─── COL 1 : Compte & Securite ─── */}
				<div className="flex flex-col gap-3">
					{/* Info compte */}
					<FlatCard>
						<SH icon={<User className="h-3.5 w-3.5" />} title={t("settings.security.accountInfo")} />
						<div className="px-3 pb-2.5 pt-1.5 space-y-1">
							<InfoRow label={t("common.name")} value={session?.user?.name || "—"} />
							<InfoRow label={t("common.email")} value={session?.user?.email || "—"} />
							<InfoRow label={t("settings.security.memberSince")} value={session?.user?.createdAt ? new Date(session.user.createdAt).toLocaleDateString(i18n.language, { year: "numeric", month: "short" }) : "—"} />
						</div>
					</FlatCard>

					{/* Mot de passe */}
					<PasswordResetCard />

					{/* Code PIN */}
					<FlatCard>
						<div className="p-3">
							<PinCodeSection />
						</div>
					</FlatCard>
				</div>

				{/* ─── COL 2 : Affichage ─── */}
				<div className="flex flex-col gap-3">
					{/* Langue */}
					<FlatCard>
						<SH icon={<Globe className="h-3.5 w-3.5" />} title={t("settings.language.title")} />
						<div className="p-3 flex flex-col gap-1.5">
							<LangBtn flag={CountryCode.FR} label="Français" isActive={effectiveLang === "fr"} onClick={() => onLanguageChange("fr")} />
							<LangBtn flag={CountryCode.US} label="English" isActive={effectiveLang === "en"} onClick={() => onLanguageChange("en")} />
						</div>
					</FlatCard>

					{/* Mode clair/sombre */}
					<FlatCard>
						<SH icon={<Sun className="h-3.5 w-3.5" />} title={t("settings.display.title")} />
						<div className="p-3 grid grid-cols-2 gap-1.5">
							<ThemeBtn icon={<Sun className="h-4 w-4" />} label={t("settings.display.light")} isActive={!isDark} onClick={() => { setTheme("light"); captureEvent("myspace_preferences_updated"); }} />
							<ThemeBtn icon={<Moon className="h-4 w-4" />} label={t("settings.display.dark")} isActive={isDark} onClick={() => { setTheme("dark"); captureEvent("myspace_preferences_updated"); }} />
						</div>
					</FlatCard>

					{/* Theme consulaire */}
					<FlatCard>
						<SH icon={<Palette className="h-3.5 w-3.5" />} title={t("settings.consularTheme.title")} />
						<div className="p-3 flex flex-col gap-1.5">
							<ThemePreview themeId="default" label={t("settings.consularTheme.default")} description={t("settings.consularTheme.defaultDesc")} isActive={consularTheme === "default"} onClick={() => { setConsularTheme("default"); captureEvent("myspace_preferences_updated"); }} />
							<ThemePreview themeId="homeomorphism" label={t("settings.consularTheme.homeomorphism")} description={t("settings.consularTheme.homeomorphismDesc")} isActive={consularTheme === "homeomorphism"} onClick={() => { setConsularTheme("homeomorphism"); captureEvent("myspace_preferences_updated"); }} />
						</div>
					</FlatCard>
				</div>

				{/* ─── COL 3 : Accessibilite & Notifications ─── */}
				<div className="flex flex-col gap-3">
					{/* Accessibilite */}
					<FlatCard>
						<SH icon={<Eye className="h-3.5 w-3.5" />} title={t("settings.accessibility.title")} />
						<div className="p-3 space-y-2.5">
							<div>
								<p className="text-[10px] font-semibold text-muted-foreground mb-1.5">{t("settings.accessibility.fontSize")}</p>
								<div className="grid grid-cols-3 gap-1.5">
									{(["small", "default", "large"] as const).map((size) => {
										const isActive = fontSize === size;
										return (
											<button key={size} type="button" onClick={() => setFontSize(size)} className={cn(
												"flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-[0.97]",
												isActive ? "bg-primary/10 ring-2 ring-primary/20" : "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
											)}>
												<Type className={cn(isActive ? "text-primary" : "text-muted-foreground", size === "small" ? "h-3 w-3" : size === "large" ? "h-5 w-5" : "h-4 w-4")} />
												<span className={cn("font-medium", isActive ? "text-primary" : "text-muted-foreground", "text-[9px]")}>
													{t(`settings.accessibility.fontSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}
												</span>
											</button>
										);
									})}
								</div>
							</div>
							<div className="flex items-center justify-between rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 px-2.5 py-2">
								<p className="text-[10px] font-semibold pr-2">{t("settings.accessibility.reduceMotion")}</p>
								<Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
							</div>
						</div>
					</FlatCard>

					{/* Notifications */}
					<FlatCard>
						<SH icon={<Bell className="h-3.5 w-3.5" />} title={t("settings.notifications.title")} />
						<div className="p-3 space-y-1">
							{NOTIF_CHANNELS.map((ch) => {
								const Icon = ch.icon;
								const isOn = preferences?.[ch.key] ?? ch.defaultValue;
								return (
									<div key={ch.key} className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all", isOn ? "bg-primary/5" : "bg-[#FDFCFA] dark:bg-[#21201E]/77")}>
										<div className={cn("p-0.5 rounded-md shrink-0", isOn ? "bg-primary/10" : "bg-foreground/[0.06] dark:bg-foreground/[0.12]")}>
											<Icon className={cn("h-3 w-3", isOn ? "text-primary" : "text-muted-foreground")} />
										</div>
										<span className="text-[10px] font-bold flex-1">{t(ch.labelKey)}</span>
										<Switch checked={isOn} onCheckedChange={(v) => onPrefToggle(ch.key, v)} />
									</div>
								);
							})}
						</div>
					</FlatCard>
				</div>

				{/* ─── COL 4 : Actions & Danger ─── */}
				<div className="flex flex-col gap-3">
					{/* Confidentialite */}
					<FlatCard>
						<SH icon={<Shield className="h-3.5 w-3.5" />} title={t("settings.privacy.title")} />
						<div className="px-3 pb-3 pt-2">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5 pr-3">
									<p className="text-[10px] font-medium">{t("settings.privacy.analytics")}</p>
									<p className="text-[9px] text-muted-foreground">{t("settings.privacy.analyticsDesc")}</p>
								</div>
								<Switch checked={preferences?.shareAnalytics ?? true} onCheckedChange={(v) => onPrefToggle("shareAnalytics", v)} />
							</div>
						</div>
					</FlatCard>

					{/* Deconnexion */}
					<FlatCard>
						<SH icon={<LogOut className="h-3.5 w-3.5" />} title={t("settings.account.title")} />
						<div className="px-3 pb-3 pt-2">
							<Button variant="destructive" size="sm" onClick={() => setShowLogoutDialog(true)} className="gap-2 w-full rounded-xl active:scale-[0.97] transition-transform h-8 text-xs">
								<LogOut className="size-3.5" />{t("common.logout")}
							</Button>
						</div>
					</FlatCard>

					{/* Export */}
					<ExportDataCard />

					{/* Suppression */}
					<DeleteCard />
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
						<AlertDialogAction onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>{t("common.logout")}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ─── Micro-composants ────────────────────────────────────────

function SH({ icon, title, variant }: { icon: React.ReactNode; title: string; variant?: "destructive" }) {
	return (
		<div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl", variant === "destructive" ? "bg-destructive/5" : "bg-[#EBE6DC]/40 dark:bg-[#383633]/25")}>
			<div className={cn("p-0.5 rounded-md", variant === "destructive" ? "bg-destructive/10" : "bg-foreground/[0.06] dark:bg-foreground/[0.12]")}>{icon}</div>
			<span className={cn("text-xs font-bold", variant === "destructive" ? "text-destructive" : "text-muted-foreground")}>{title}</span>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77">
			<span className="text-[9px] text-muted-foreground">{label}</span>
			<span className="text-[10px] font-medium truncate ml-3 max-w-[140px]">{value}</span>
		</div>
	);
}

function LangBtn({ flag, label, isActive, onClick }: { flag: CountryCode; label: string; isActive: boolean; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all w-full text-left active:scale-[0.97]", isActive ? "bg-primary/10 ring-2 ring-primary/20" : "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50")}>
			<FlagIcon countryCode={flag} />
			<span className="text-xs font-semibold flex-1">{label}</span>
			{isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
		</button>
	);
}

function ThemeBtn({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={cn("flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all active:scale-[0.97]", isActive ? "bg-primary/10 ring-2 ring-primary/20" : "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50")}>
			<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isActive ? "bg-primary/10" : "bg-foreground/[0.06]")}>
				<span className={isActive ? "text-primary" : "text-muted-foreground"}>{icon}</span>
			</div>
			<span className="text-[10px] font-semibold">{label}</span>
			{isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
		</button>
	);
}

// ─── Mot de passe ────────────────────────────────────────────

function PasswordResetCard() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const [step, setStep] = useState<"idle" | "otp_sent" | "done">("idle");
	const [otp, setOtp] = useState("");
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const sendOtp = async () => {
		const email = session?.user?.email;
		if (!email) return;
		setError(null); setLoading(true);
		try {
			const r = await authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" });
			if (r.error) setError(r.error.message || t("settings.security.changeFailed"));
			else setStep("otp_sent");
		} catch { setError(t("settings.security.changeFailed")); }
		finally { setLoading(false); }
	};

	const resetPw = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = session?.user?.email;
		if (!email) return;
		if (newPw.length < 8) { setError(t("settings.security.passwordTooShort")); return; }
		if (newPw !== confirmPw) { setError(t("settings.security.passwordMismatch")); return; }
		setError(null); setLoading(true);
		try {
			const r = await authClient.emailOtp.resetPassword({ email, otp, password: newPw });
			if (r.error) setError(r.error.message || t("settings.security.changeFailed"));
			else { setSuccess(true); setStep("done"); setOtp(""); setNewPw(""); setConfirmPw(""); setTimeout(() => { setSuccess(false); setStep("idle"); }, 4000); }
		} catch { setError(t("settings.security.changeFailed")); }
		finally { setLoading(false); }
	};

	return (
		<FlatCard>
			<SH icon={<KeyRound className="h-3.5 w-3.5" />} title={t("settings.security.changePassword")} />
			<div className="p-3 space-y-2">
				{error && <div className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[10px] text-destructive">{error}</div>}
				{success && <div className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] text-primary flex items-center gap-1.5"><Check className="size-3" />{t("settings.security.resetSuccess")}</div>}
				{step === "idle" && (
					<Button variant="outline" size="sm" onClick={sendOtp} disabled={loading || !session?.user?.email} className="gap-2 w-full rounded-xl active:scale-[0.97] transition-transform h-8 text-xs">
						{loading ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
						{t("settings.security.sendResetCode")}
					</Button>
				)}
				{step === "otp_sent" && (
					<form onSubmit={resetPw} className="space-y-1.5">
						<div className="space-y-0.5"><Label className="text-[10px]">{t("settings.security.otpCode")}</Label><Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" required className="h-7 text-xs" /></div>
						<div className="space-y-0.5"><Label className="text-[10px]">{t("settings.security.newPassword")}</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} className="h-7 text-xs" /></div>
						<div className="space-y-0.5"><Label className="text-[10px]">{t("settings.security.confirmPassword")}</Label><Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} className="h-7 text-xs" /></div>
						<div className="flex gap-1.5">
							<Button type="submit" size="sm" className="h-7 text-[10px]" disabled={loading || !otp || !newPw || newPw !== confirmPw}>{loading && <Loader2 className="mr-1 size-3 animate-spin" />}{t("settings.security.resetPassword")}</Button>
							<Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setStep("idle"); setError(null); setOtp(""); setNewPw(""); setConfirmPw(""); }}>{t("common.cancel")}</Button>
						</div>
					</form>
				)}
			</div>
		</FlatCard>
	);
}

// ─── Export ──────────────────────────────────────────────────

function ExportDataCard() {
	const { t } = useTranslation();
	const [exporting, setExporting] = useState(false);
	const [fetchEnabled, setFetchEnabled] = useState(false);
	const exportData = useQuery(api.functions.users.exportMyData, fetchEnabled ? {} : "skip");

	useEffect(() => {
		if (!fetchEnabled || !exportData || exporting) return;
		setExporting(true);
		try {
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url; a.download = `mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a); a.click(); document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success(t("settings.dangerZone.exportData.success"));
		} catch { toast.error(t("common.error")); }
		finally { setExporting(false); setFetchEnabled(false); }
	}, [exportData, fetchEnabled, exporting, t]);

	return (
		<FlatCard>
			<SH icon={<Download className="h-3.5 w-3.5" />} title={t("settings.dangerZone.exportData.title")} />
			<div className="p-3">
				<Button variant="outline" size="sm" onClick={() => setFetchEnabled(true)} disabled={exporting || fetchEnabled} className="gap-2 w-full rounded-xl active:scale-[0.97] transition-transform h-8 text-xs">
					{(exporting || fetchEnabled) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
					{(exporting || fetchEnabled) ? t("settings.dangerZone.exportData.exporting") : t("settings.dangerZone.exportData.button")}
				</Button>
			</div>
		</FlatCard>
	);
}

// ─── Suppression ─────────────────────────────────────────────

function DeleteCard() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const requestDeletion = useMutation(api.functions.users.requestAccountDeletion);
	const [showDialog, setShowDialog] = useState(false);
	const [confirmEmail, setConfirmEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (confirmEmail !== (session?.user?.email ?? "")) return;
		setLoading(true); setError(null);
		try { await requestDeletion({ confirmEmail }); toast.success(t("settings.dangerZone.deleteAccount.success")); setShowDialog(false); setConfirmEmail(""); }
		catch (e: unknown) { setError((e as Error).message ?? t("common.error")); }
		finally { setLoading(false); }
	};

	return (
		<>
			<FlatCard>
				<SH icon={<Trash2 className="h-3.5 w-3.5 text-destructive" />} title={t("settings.dangerZone.deleteAccount.title")} variant="destructive" />
				<div className="p-3 space-y-2">
					<div className="flex items-start gap-1.5">
						<AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
						<p className="text-[9px] text-muted-foreground leading-relaxed">{t("settings.dangerZone.deleteAccount.warning")}</p>
					</div>
					<Button variant="destructive" size="sm" onClick={() => setShowDialog(true)} className="gap-2 w-full rounded-xl active:scale-[0.97] transition-transform h-8 text-xs">
						<Trash2 className="h-3.5 w-3.5" />{t("settings.dangerZone.deleteAccount.button")}
					</Button>
				</div>
			</FlatCard>
			<AlertDialog open={showDialog} onOpenChange={setShowDialog}>
				<AlertDialogContent>
					<AlertDialogHeader><AlertDialogTitle>{t("settings.dangerZone.deleteAccount.title")}</AlertDialogTitle><AlertDialogDescription>{t("settings.dangerZone.deleteAccount.warning")}</AlertDialogDescription></AlertDialogHeader>
					<div className="space-y-3 py-2"><Label className="text-sm">{t("settings.dangerZone.deleteAccount.confirmLabel")}</Label><Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={t("settings.dangerZone.deleteAccount.confirmPlaceholder")} />{error && <p className="text-xs text-destructive">{error}</p>}</div>
					<AlertDialogFooter><AlertDialogCancel onClick={() => { setConfirmEmail(""); setError(null); }}>{t("common.cancel")}</AlertDialogCancel><Button variant="destructive" onClick={handleDelete} disabled={loading || confirmEmail !== (session?.user?.email ?? "")}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("settings.dangerZone.deleteAccount.button")}</Button></AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
