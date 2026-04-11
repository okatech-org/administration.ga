import { CountryCode } from "@convex/lib/constants";
import { Eye, Globe, Moon, Palette, Sun, Type } from "lucide-react";
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

const FONT_SIZE_MAP: Record<FontSize, { class: string; label: string }> = {
	small: { class: "text-sm", label: "Aa" },
	default: { class: "", label: "Aa" },
	large: { class: "text-lg", label: "Aa" },
};

interface AppearanceTabProps {
	preferences: { language?: "fr" | "en" } | undefined;
	currentLanguage: string;
	onLanguageChange: (lang: "fr" | "en") => void;
}

export function AppearanceTab({
	preferences,
	currentLanguage,
	onLanguageChange,
}: AppearanceTabProps) {
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
		const cls = FONT_SIZE_MAP[fontSize].class;
		if (cls) root.classList.add(cls);
		localStorage.setItem("citizen-font-size", fontSize);
	}, [fontSize]);

	useEffect(() => {
		document.documentElement.setAttribute(
			"data-reduce-motion",
			reduceMotion ? "true" : "false",
		);
		localStorage.setItem("citizen-reduce-motion", String(reduceMotion));
	}, [reduceMotion]);

	const effectiveLang = preferences?.language ?? currentLanguage;
	const isDark = theme === "dark";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
			{/* ─── COL 1 : Langue & Mode ─── */}
			<div className="flex flex-col gap-4">
				{/* Langue */}
				<FlatCard>
					<CardHeader
						icon={<Globe className="h-3.5 w-3.5" />}
						title={t("settings.language.title")}
					/>
					<div className="p-4">
						<p className="text-xs text-muted-foreground mb-3">
							{t("settings.language.description")}
						</p>
						<div className="flex flex-col gap-2">
							<LangOption
								flag={CountryCode.FR}
								label={t("header.language.fr")}
								isActive={effectiveLang === "fr"}
								onClick={() => onLanguageChange("fr")}
							/>
							<LangOption
								flag={CountryCode.US}
								label={t("header.language.en")}
								isActive={effectiveLang === "en"}
								onClick={() => onLanguageChange("en")}
							/>
						</div>
					</div>
				</FlatCard>

				{/* Mode clair/sombre */}
				<FlatCard className="flex-1">
					<CardHeader
						icon={<Sun className="h-3.5 w-3.5" />}
						title={t("settings.display.title")}
					/>
					<div className="p-4">
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => {
									setTheme("light");
									captureEvent("myspace_preferences_updated");
								}}
								className={cn(
									"flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
									!isDark
										? "bg-primary/10 ring-2 ring-primary/20"
										: "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
								)}
							>
								<div
									className={cn(
										"w-10 h-10 rounded-lg flex items-center justify-center",
										!isDark
											? "bg-primary/10"
											: "bg-foreground/[0.06]",
									)}
								>
									<Sun
										className={cn(
											"h-5 w-5",
											!isDark
												? "text-primary"
												: "text-muted-foreground",
										)}
									/>
								</div>
								<span className="text-xs font-semibold">
									{t("settings.display.light")}
								</span>
								{!isDark && (
									<div className="w-2 h-2 rounded-full bg-primary" />
								)}
							</button>
							<button
								type="button"
								onClick={() => {
									setTheme("dark");
									captureEvent("myspace_preferences_updated");
								}}
								className={cn(
									"flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
									isDark
										? "bg-primary/10 ring-2 ring-primary/20"
										: "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
								)}
							>
								<div
									className={cn(
										"w-10 h-10 rounded-lg flex items-center justify-center",
										isDark
											? "bg-primary/10"
											: "bg-foreground/[0.06]",
									)}
								>
									<Moon
										className={cn(
											"h-5 w-5",
											isDark
												? "text-primary"
												: "text-muted-foreground",
										)}
									/>
								</div>
								<span className="text-xs font-semibold">
									{t("settings.display.dark")}
								</span>
								{isDark && (
									<div className="w-2 h-2 rounded-full bg-primary" />
								)}
							</button>
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ─── COL 2 : Theme consulaire ─── */}
			<div className="flex flex-col gap-4">
				<FlatCard className="flex-1">
					<CardHeader
						icon={<Palette className="h-3.5 w-3.5" />}
						title={t("settings.consularTheme.title")}
					/>
					<div className="p-4">
						<p className="text-xs text-muted-foreground mb-3">
							{t("settings.consularTheme.description")}
						</p>
						<div className="flex flex-col gap-2.5">
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
								description={t(
									"settings.consularTheme.homeomorphismDesc",
								)}
								isActive={consularTheme === "homeomorphism"}
								onClick={() => {
									setConsularTheme("homeomorphism");
									captureEvent("myspace_preferences_updated");
								}}
							/>
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ─── COL 3 : Accessibilite ─── */}
			<div className="flex flex-col gap-4">
				<FlatCard>
					<CardHeader
						icon={<Eye className="h-3.5 w-3.5" />}
						title={t("settings.accessibility.title")}
					/>
					<div className="p-4">
						<p className="text-xs text-muted-foreground mb-4">
							{t("settings.accessibility.description")}
						</p>

						{/* Taille de police — selecteur visuel */}
						<div className="mb-4">
							<p className="text-xs font-semibold text-muted-foreground mb-2.5">
								{t("settings.accessibility.fontSize")}
							</p>
							<div className="grid grid-cols-3 gap-2">
								{(["small", "default", "large"] as const).map(
									(size) => {
										const isActive = fontSize === size;
										return (
											<button
												key={size}
												type="button"
												onClick={() => setFontSize(size)}
												className={cn(
													"flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all",
													isActive
														? "bg-primary/10 ring-2 ring-primary/20"
														: "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
												)}
											>
												<Type
													className={cn(
														isActive
															? "text-primary"
															: "text-muted-foreground",
														size === "small"
															? "h-3.5 w-3.5"
															: size === "large"
																? "h-6 w-6"
																: "h-4.5 w-4.5",
													)}
												/>
												<span
													className={cn(
														"font-medium",
														isActive
															? "text-primary"
															: "text-muted-foreground",
														size === "small"
															? "text-[10px]"
															: size === "large"
																? "text-sm"
																: "text-xs",
													)}
												>
													{t(
														`settings.accessibility.fontSize${size.charAt(0).toUpperCase() + size.slice(1)}`,
													)}
												</span>
											</button>
										);
									},
								)}
							</div>
						</div>

						{/* Reduire les animations */}
						<div className="flex items-center justify-between py-3 mt-2 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 px-3">
							<div className="space-y-0.5 pr-3">
								<p className="text-xs font-semibold">
									{t("settings.accessibility.reduceMotion")}
								</p>
								<p className="text-[10px] text-muted-foreground leading-tight">
									{t("settings.accessibility.reduceMotionDesc")}
								</p>
							</div>
							<Switch
								checked={reduceMotion}
								onCheckedChange={setReduceMotion}
							/>
						</div>
					</div>
				</FlatCard>
			</div>
		</div>
	);
}

// ─── Card Header iProfil ─────────────────────────────────────

function CardHeader({
	icon,
	title,
}: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-2.5 p-4 pb-3 bg-[#EBE6DC]/40 dark:bg-[#383633]/25 rounded-t-xl">
			<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
				{icon}
			</div>
			<span className="text-sm font-bold text-muted-foreground">
				{title}
			</span>
		</div>
	);
}

// ─── Language Option iProfil ─────────────────────────────────

function LangOption({
	flag,
	label,
	isActive,
	onClick,
}: {
	flag: CountryCode;
	label: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left active:scale-[0.97]",
				isActive
					? "bg-primary/10 ring-2 ring-primary/20"
					: "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
			)}
		>
			<FlagIcon countryCode={flag} />
			<span className="text-sm font-semibold flex-1">{label}</span>
			{isActive && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
		</button>
	);
}
