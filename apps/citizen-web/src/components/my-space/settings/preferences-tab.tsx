/**
 * PreferencesTab — Fusion de : Affichage + Notifications
 * Layout 3 colonnes desktop : Langue & Mode | Theme & Accessibilite | Notifications
 */

import { CountryCode } from "@convex/lib/constants";
import {
	Bell,
	Eye,
	Globe,
	Mail,
	MessageCircle,
	Monitor,
	Moon,
	Palette,
	Smartphone,
	Sun,
	Type,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/my-space/flat-card";
import { FlagIcon } from "@/components/ui/flag-icon";
import { Switch } from "@/components/ui/switch";
import { useConsularTheme } from "@/hooks/useConsularTheme";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ThemePreview } from "./theme-preview";

type FontSize = "small" | "default" | "large";
type NotifKey = "emailNotifications" | "pushNotifications" | "smsNotifications" | "whatsappNotifications" | "shareAnalytics";

interface PreferencesTabProps {
	preferences: {
		language?: "fr" | "en";
		emailNotifications?: boolean;
		pushNotifications?: boolean;
		smsNotifications?: boolean;
		whatsappNotifications?: boolean;
	} | undefined;
	currentLanguage: string;
	onLanguageChange: (lang: "fr" | "en") => void;
	onPrefToggle: (key: NotifKey, value: boolean) => void;
}

const NOTIF_CHANNELS = [
	{ key: "emailNotifications" as const, icon: Mail, defaultValue: true, labelKey: "settings.notifications.email", descKey: "settings.notifications.emailDesc" },
	{ key: "pushNotifications" as const, icon: Monitor, defaultValue: true, labelKey: "settings.notifications.push", descKey: "settings.notifications.pushDesc" },
	{ key: "smsNotifications" as const, icon: Smartphone, defaultValue: false, labelKey: "settings.notifications.sms", descKey: "settings.notifications.smsDesc" },
	{ key: "whatsappNotifications" as const, icon: MessageCircle, defaultValue: false, labelKey: "settings.notifications.whatsapp", descKey: "settings.notifications.whatsappDesc" },
];

export function PreferencesTab({
	preferences,
	currentLanguage,
	onLanguageChange,
	onPrefToggle,
}: PreferencesTabProps) {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();
	const { consularTheme, setConsularTheme } = useConsularTheme();

	const [fontSize, setFontSize] = useState<FontSize>(() => {
		if (typeof window === "undefined") return "default";
		return (localStorage.getItem("citizen-font-size") as FontSize) || "default";
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
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
			{/* ─── COL 1 : Langue & Mode ─── */}
			<div className="flex flex-col gap-4">
				{/* Langue */}
				<FlatCard>
					<SectionHeader icon={<Globe className="h-3.5 w-3.5" />} title={t("settings.language.title")} />
					<div className="p-3">
						<div className="flex flex-col gap-1.5">
							<LangOption flag={CountryCode.FR} label={t("header.language.fr")} isActive={effectiveLang === "fr"} onClick={() => onLanguageChange("fr")} />
							<LangOption flag={CountryCode.US} label={t("header.language.en")} isActive={effectiveLang === "en"} onClick={() => onLanguageChange("en")} />
						</div>
					</div>
				</FlatCard>

				{/* Mode clair/sombre */}
				<FlatCard>
					<SectionHeader icon={<Sun className="h-3.5 w-3.5" />} title={t("settings.display.title")} />
					<div className="p-3">
						<div className="grid grid-cols-2 gap-2">
							<ThemeButton icon={<Sun className="h-5 w-5" />} label={t("settings.display.light")} isActive={!isDark} onClick={() => { setTheme("light"); captureEvent("myspace_preferences_updated"); }} />
							<ThemeButton icon={<Moon className="h-5 w-5" />} label={t("settings.display.dark")} isActive={isDark} onClick={() => { setTheme("dark"); captureEvent("myspace_preferences_updated"); }} />
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ─── COL 2 : Theme & Accessibilite ─── */}
			<div className="flex flex-col gap-4">
				{/* Theme consulaire */}
				<FlatCard>
					<SectionHeader icon={<Palette className="h-3.5 w-3.5" />} title={t("settings.consularTheme.title")} />
					<div className="p-3">
						<div className="flex flex-col gap-2">
							<ThemePreview themeId="default" label={t("settings.consularTheme.default")} description={t("settings.consularTheme.defaultDesc")} isActive={consularTheme === "default"} onClick={() => { setConsularTheme("default"); captureEvent("myspace_preferences_updated"); }} />
							<ThemePreview themeId="homeomorphism" label={t("settings.consularTheme.homeomorphism")} description={t("settings.consularTheme.homeomorphismDesc")} isActive={consularTheme === "homeomorphism"} onClick={() => { setConsularTheme("homeomorphism"); captureEvent("myspace_preferences_updated"); }} />
						</div>
					</div>
				</FlatCard>

				{/* Accessibilite */}
				<FlatCard>
					<SectionHeader icon={<Eye className="h-3.5 w-3.5" />} title={t("settings.accessibility.title")} />
					<div className="p-3 space-y-3">
						{/* Taille de police */}
						<div>
							<p className="text-[10px] font-semibold text-muted-foreground mb-1.5">{t("settings.accessibility.fontSize")}</p>
							<div className="grid grid-cols-3 gap-1.5">
								{(["small", "default", "large"] as const).map((size) => {
									const isActive = fontSize === size;
									return (
										<button key={size} type="button" onClick={() => setFontSize(size)} className={cn(
											"flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-[0.97]",
											isActive ? "bg-primary/10 ring-2 ring-primary/20" : "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
										)}>
											<Type className={cn(isActive ? "text-primary" : "text-muted-foreground", size === "small" ? "h-3 w-3" : size === "large" ? "h-5 w-5" : "h-4 w-4")} />
											<span className={cn("font-medium", isActive ? "text-primary" : "text-muted-foreground", size === "small" ? "text-[9px]" : size === "large" ? "text-xs" : "text-[10px]")}>
												{t(`settings.accessibility.fontSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Reduire animations */}
						<div className="flex items-center justify-between rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 px-3 py-2">
							<div className="space-y-0.5 pr-3">
								<p className="text-[10px] font-semibold">{t("settings.accessibility.reduceMotion")}</p>
								<p className="text-[9px] text-muted-foreground leading-tight">{t("settings.accessibility.reduceMotionDesc")}</p>
							</div>
							<Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ─── COL 3 : Notifications ─── */}
			<div className="flex flex-col gap-4">
				<FlatCard>
					<SectionHeader icon={<Bell className="h-3.5 w-3.5" />} title={t("settings.notifications.title")} />
					<div className="p-3 space-y-1.5">
						{NOTIF_CHANNELS.map((channel) => {
							const Icon = channel.icon;
							const isOn = preferences?.[channel.key] ?? channel.defaultValue;
							return (
								<div key={channel.key} className={cn(
									"flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
									isOn ? "bg-primary/5" : "bg-[#FDFCFA] dark:bg-[#21201E]/77",
								)}>
									<div className={cn("p-1 rounded-md shrink-0", isOn ? "bg-primary/10" : "bg-foreground/[0.06] dark:bg-foreground/[0.12]")}>
										<Icon className={cn("h-3.5 w-3.5", isOn ? "text-primary" : "text-muted-foreground")} />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-bold">{t(channel.labelKey)}</p>
										<p className="text-[9px] text-muted-foreground">{t(channel.descKey)}</p>
									</div>
									<Switch checked={isOn} onCheckedChange={(checked) => onPrefToggle(channel.key, checked)} />
								</div>
							);
						})}
					</div>
				</FlatCard>
			</div>
		</div>
	);
}

// ─── Sub-components ─────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#EBE6DC]/40 dark:bg-[#383633]/25 rounded-t-xl">
			<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">{icon}</div>
			<span className="text-sm font-bold text-muted-foreground">{title}</span>
		</div>
	);
}

function LangOption({ flag, label, isActive, onClick }: { flag: CountryCode; label: string; isActive: boolean; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={cn(
			"flex items-center gap-3 px-3 py-2 rounded-xl transition-all w-full text-left active:scale-[0.97]",
			isActive ? "bg-primary/10 ring-2 ring-primary/20" : "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
		)}>
			<FlagIcon countryCode={flag} />
			<span className="text-xs font-semibold flex-1">{label}</span>
			{isActive && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
		</button>
	);
}

function ThemeButton({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={cn(
			"flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-[0.97]",
			isActive ? "bg-primary/10 ring-2 ring-primary/20" : "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
		)}>
			<div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", isActive ? "bg-primary/10" : "bg-foreground/[0.06]")}>
				<span className={isActive ? "text-primary" : "text-muted-foreground"}>{icon}</span>
			</div>
			<span className="text-[10px] font-semibold">{label}</span>
			{isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
		</button>
	);
}
