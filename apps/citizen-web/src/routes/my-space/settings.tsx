import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	Bell,
	FolderOpen,
	Palette,
	Settings,
	Shield,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/my-space/flat-card";
import { AccountSecurityTab } from "@/components/my-space/settings/account-security-tab";
import { AppearanceTab } from "@/components/my-space/settings/appearance-tab";
import { DangerZoneTab } from "@/components/my-space/settings/danger-zone-tab";
import { DossierTab } from "@/components/my-space/settings/dossier-tab";
import { NotificationsTab } from "@/components/my-space/settings/notifications-tab";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// ─── Route ───────────────────────────────────────────────────

export const Route = createFileRoute("/my-space/settings")({
	component: SettingsPage,
	validateSearch: (search: Record<string, unknown>) => ({
		tab: (search.tab as string) || undefined,
	}),
});

// ─── Tab IDs ─────────────────────────────────────────────────

const TAB_IDS = [
	"dossier",
	"accountSecurity",
	"notifications",
	"appearance",
	"dangerZone",
] as const;

type TabId = (typeof TAB_IDS)[number];

function resolveTab(urlTab: string | undefined): TabId {
	if (urlTab && (TAB_IDS as readonly string[]).includes(urlTab)) {
		return urlTab as TabId;
	}
	return "dossier";
}

const TAB_CONFIG: Record<
	TabId,
	{ icon: typeof Settings; variant?: "destructive" }
> = {
	dossier: { icon: FolderOpen },
	accountSecurity: { icon: Shield },
	notifications: { icon: Bell },
	appearance: { icon: Palette },
	dangerZone: { icon: AlertTriangle, variant: "destructive" },
};

// ─── Settings Page ───────────────────────────────────────────

function SettingsPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { tab: urlTab } = Route.useSearch();
	const activeTab = resolveTab(urlTab);

	const preferences = useQuery(api.functions.userPreferences.getMyPreferences);
	const updatePreferences = useMutation(
		api.functions.userPreferences.updateMyPreferences,
	);

	const handleTabChange = (tabId: string) => {
		navigate({
			to: "/my-space/settings",
			search: { tab: tabId },
			replace: true,
		});
	};

	const handlePrefToggle = (
		key:
			| "emailNotifications"
			| "pushNotifications"
			| "smsNotifications"
			| "whatsappNotifications"
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

	const TAB_LABELS: Record<TabId, string> = {
		dossier: t("settings.tabs.dossier"),
		accountSecurity: t("settings.security.accountInfo"),
		notifications: t("settings.notifications.title"),
		appearance: t("settings.display.title"),
		dangerZone: t("settings.dangerZone.tabLabel"),
	};

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header compact — meme pattern que iProfil (7.7) */}
			<div className="shrink-0 px-3 md:px-5 pt-3 md:pt-4 pb-2 md:pb-3">
				<div className="flex items-center gap-3">
					<div className="p-1.5 rounded-lg bg-foreground/8 dark:bg-foreground/5">
						<Settings className="h-5 w-5" />
					</div>
					<div className="flex-1 min-w-0">
						<h1 className="text-lg md:text-xl font-bold tracking-tight">
							{t("mySpace.screens.settings.heading")}
						</h1>
						<p className="text-xs text-muted-foreground">
							{t("mySpace.screens.settings.subtitle")}
						</p>
					</div>
				</div>
			</div>

			{/* Contenu principal — grille iProfil */}
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex-1 min-h-0 overflow-hidden px-3 md:px-5 pb-3 md:pb-5"
			>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
					{/* ─── COL 1: Navigation (3/12) ─── */}
					<div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
						{/* Mobile : scroll horizontal des tabs */}
						<div className="flex lg:hidden overflow-x-auto gap-1 p-1 bg-card border border-border rounded-xl">
							{TAB_IDS.map((id) => {
								const Icon = TAB_CONFIG[id].icon;
								const isActive = activeTab === id;
								const isDestructive =
									TAB_CONFIG[id].variant === "destructive";
								return (
									<button
										key={id}
										type="button"
										onClick={() => handleTabChange(id)}
										className={cn(
											"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 flex-1 justify-center",
											isActive
												? isDestructive
													? "bg-destructive text-destructive-foreground shadow-sm"
													: "bg-primary text-primary-foreground shadow-sm"
												: isDestructive
													? "text-destructive hover:bg-destructive/10"
													: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
										)}
									>
										<Icon className="h-3.5 w-3.5" />
										<span className="hidden min-[480px]:inline">
											{TAB_LABELS[id]}
										</span>
									</button>
								);
							})}
						</div>

						{/* Desktop : navigation verticale dans FlatCard */}
						<FlatCard className="hidden lg:block shrink-0">
							<div className="p-2 flex flex-col gap-0.5">
								{TAB_IDS.map((id) => {
									const Icon = TAB_CONFIG[id].icon;
									const isActive = activeTab === id;
									const isDestructive =
										TAB_CONFIG[id].variant === "destructive";
									return (
										<button
											key={id}
											type="button"
											onClick={() => handleTabChange(id)}
											className={cn(
												"w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
												isActive
													? isDestructive
														? "bg-destructive/10 text-destructive font-bold"
														: "bg-primary/10 text-primary font-bold"
													: isDestructive
														? "text-destructive/60 hover:bg-destructive/5 hover:text-destructive font-medium"
														: "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
											)}
										>
											<div
												className={cn(
													"p-1 rounded-md shrink-0",
													isActive
														? isDestructive
															? "bg-destructive/15"
															: "bg-primary/15"
														: "bg-foreground/[0.06] dark:bg-foreground/[0.12]",
												)}
											>
												<Icon className="h-3.5 w-3.5" />
											</div>
											{TAB_LABELS[id]}
											{isActive && (
												<div
													className={cn(
														"ml-auto w-1.5 h-1.5 rounded-full shrink-0",
														isDestructive
															? "bg-destructive"
															: "bg-primary",
													)}
												/>
											)}
										</button>
									);
								})}
							</div>
						</FlatCard>
					</div>

					{/* ─── COL 2: Contenu (9/12) ─── */}
					<div className="lg:col-span-9 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">
						{activeTab === "dossier" && <DossierTab />}

						{activeTab === "accountSecurity" && (
							<AccountSecurityTab
								preferences={preferences}
								onPrefToggle={handlePrefToggle}
							/>
						)}

						{activeTab === "notifications" && (
							<NotificationsTab
								preferences={preferences}
								onPrefToggle={handlePrefToggle}
							/>
						)}

						{activeTab === "appearance" && (
							<AppearanceTab
								preferences={preferences}
								currentLanguage={i18n.language}
								onLanguageChange={handleLanguageChange}
							/>
						)}

						{activeTab === "dangerZone" && <DangerZoneTab />}
					</div>
				</div>
			</motion.div>
		</div>
	);
}
