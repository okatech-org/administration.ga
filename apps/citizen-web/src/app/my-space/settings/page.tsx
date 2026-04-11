"use client";

import { api } from "@convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { FolderOpen, Settings, Shield } from "lucide-react";
import { motion } from "motion/react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { AccountTab } from "@/components/my-space/settings/account-tab";
import { DossierTab } from "@/components/my-space/settings/dossier-tab";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// ─── 2 tabs uniquement ──────────────────────────────────────

const TAB_IDS = ["dossier", "account"] as const;
type TabId = (typeof TAB_IDS)[number];

function resolveTab(urlTab: string | undefined): TabId {
	if (urlTab && (TAB_IDS as readonly string[]).includes(urlTab)) return urlTab as TabId;
	if (urlTab === "accountSecurity" || urlTab === "dangerZone" || urlTab === "appearance" || urlTab === "notifications" || urlTab === "preferences") return "account";
	return "dossier";
}

const TAB_CONFIG: Record<TabId, { icon: typeof Settings; label: string }> = {
	dossier: { icon: FolderOpen, label: "settings.tabs.dossier" },
	account: { icon: Shield, label: "settings.security.accountInfo" },
};

// ─── Settings Page ───────────────────────────────────────────

function SettingsPageContent() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const activeTab = resolveTab(searchParams.get("tab") ?? undefined);

	const preferences = useQuery(api.functions.userPreferences.getMyPreferences);
	const updatePreferences = useMutation(api.functions.userPreferences.updateMyPreferences);

	const handleTabChange = (tabId: string) => {
		router.replace(`/my-space/settings?tab=${tabId}`);
	};

	const handlePrefToggle = (
		key: "emailNotifications" | "pushNotifications" | "smsNotifications" | "whatsappNotifications" | "shareAnalytics",
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

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header + 2 tabs sur la meme ligne */}
			<div className="shrink-0 px-3 md:px-5 pt-3 md:pt-4 pb-3 md:pb-4">
				<div className="flex items-center gap-4">
					{/* Titre */}
					<div className="flex items-center gap-2.5 shrink-0">
						<div className="p-1.5 rounded-lg bg-[#EBE6DC] dark:bg-[#383633]">
							<Settings className="h-4 w-4 text-muted-foreground" />
						</div>
						<h1 className="text-lg font-bold tracking-tight hidden min-[500px]:block">
							{t("mySpace.screens.settings.heading")}
						</h1>
					</div>

					{/* 2 tabs pleine largeur */}
					<div className="flex items-center gap-1 bg-[#F4F3ED] dark:bg-[#171616] rounded-xl p-1 flex-1">
						{TAB_IDS.map((id) => {
							const Icon = TAB_CONFIG[id].icon;
							const isActive = activeTab === id;
							return (
								<button
									key={id}
									type="button"
									onClick={() => handleTabChange(id)}
									className={cn(
										"flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 active:scale-[0.97]",
										isActive
											? "bg-primary text-primary-foreground font-bold"
											: "text-muted-foreground hover:text-foreground hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
									)}
								>
									<Icon className="h-4 w-4 shrink-0" />
									{t(TAB_CONFIG[id].label)}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Zone contenu */}
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex-1 min-h-0 overflow-y-auto citizen-scrollbar px-3 md:px-5 pb-18 md:pb-5"
			>
				{activeTab === "dossier" && <DossierTab />}
				{activeTab === "account" && (
					<AccountTab
						preferences={preferences}
						onPrefToggle={handlePrefToggle}
						currentLanguage={i18n.language}
						onLanguageChange={handleLanguageChange}
					/>
				)}
			</motion.div>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<Suspense fallback={null}>
			<SettingsPageContent />
		</Suspense>
	);
}
