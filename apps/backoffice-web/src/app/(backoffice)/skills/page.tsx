"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/dashboard-v2/icon";
import { PageHeader } from "@/components/dashboard-v2/page-header";
import { CATEGORIES } from "@/components/skills-v2/mock-data";
import { TabCatalog } from "@/components/skills-v2/tab-catalog";
import { TabCategories } from "@/components/skills-v2/tab-categories";
import { TabHealth } from "@/components/skills-v2/tab-health";
import { TabOverview } from "@/components/skills-v2/tab-overview";
import { TabSearch } from "@/components/skills-v2/tab-search";
import { TabSwitcher, type TabDef } from "@/components/skills-v2/ui";

const TAB_IDS = ["overview", "categories", "catalog", "search", "health"] as const;
type TabId = (typeof TAB_IDS)[number];
const DEFAULT_TAB: TabId = "overview";

const TAB_ICONS: Record<TabId, string> = {
	overview: "LayoutDashboard",
	categories: "Briefcase",
	catalog: "BookOpen",
	search: "Search",
	health: "Activity",
};

export default function SkillsPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();

	const rawTab = searchParams.get("tab") as TabId | null;
	const active: TabId = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : DEFAULT_TAB;

	const setActive = useCallback(
		(id: string) => {
			const params = new URLSearchParams();
			if (id !== DEFAULT_TAB) params.set("tab", id);
			const qs = params.toString();
			router.replace(qs ? `/skills?${qs}` : "/skills", { scroll: false });
		},
		[router],
	);

	const setActiveWithPrefill = useCallback(
		(tab: TabId, prefill: Record<string, string> = {}) => {
			const params = new URLSearchParams();
			if (tab !== DEFAULT_TAB) params.set("tab", tab);
			for (const [k, v] of Object.entries(prefill)) {
				if (v) params.set(k, v);
			}
			const qs = params.toString();
			router.replace(qs ? `/skills?${qs}` : "/skills", { scroll: false });
		},
		[router],
	);

	const openCategory = (catId: string) => {
		const cat = CATEGORIES.find((c) => c.id === catId);
		setActiveWithPrefill("search", { category: cat?.label ?? "" });
	};

	const openProfilesForSkill = (skillName: string) => {
		setActiveWithPrefill("search", { skill: skillName });
	};

	const tabs: TabDef[] = useMemo(
		() => [
			{ id: "overview", label: t("superadmin.skills.tabs.overview"), icon: "LayoutDashboard" },
			{ id: "categories", label: t("superadmin.skills.tabs.categories"), icon: "Briefcase", badge: 14 },
			{ id: "catalog", label: t("superadmin.skills.tabs.catalog"), icon: "BookOpen", badge: 14 },
			{ id: "search", label: t("superadmin.skills.tabs.search"), icon: "Search" },
			{ id: "health", label: t("superadmin.skills.tabs.health"), icon: "Activity" },
		],
		[t],
	);

	return (
		<div className="v2-page">
			{/* Le breadcrumb est injecté par AutoBreadcrumb dans le layout. */}
			<div className="v2-page-body">
				<div className="stack stack-4">
					<PageHeader
						icon={TAB_ICONS[active]}
						title={t("superadmin.skills.title")}
						subtitle={t(`superadmin.skills.subtitles.${active}`)}
						actions={
							<>
								<button type="button" className="btn btn-sm btn-soft">
									<Icon name="RefreshCcw" size={14} />
									{t("superadmin.skills.actions.refresh")}
								</button>
								<button type="button" className="btn btn-sm btn-primary">
									<Icon name="Sparkles" size={14} />
									{t("superadmin.skills.actions.runAi")}
								</button>
							</>
						}
					/>
					<TabSwitcher tabs={tabs} value={active} onChange={setActive} />
					<div>
						{active === "overview" && <TabOverview />}
						{active === "categories" && <TabCategories onOpenCategory={openCategory} />}
						{active === "catalog" && <TabCatalog onOpenProfiles={openProfilesForSkill} />}
						{active === "search" && <TabSearch />}
						{active === "health" && <TabHealth />}
					</div>
				</div>
			</div>
		</div>
	);
}
