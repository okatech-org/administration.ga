/**
 * BackofficeIAstedWindow — iAsted pour le Back-Office (SuperAdmin).
 *
 * Phase 4 migration : coquille fine au-dessus de `@workspace/iasted`.
 *
 * Particularités backoffice :
 * - Pas de `OrgProvider` (remplace par `useOrgSelector()`)
 * - Le header inclut un slot `<OrgSelector />` compact pour basculer entre orgs
 * - Tab "isettings" affiche un panneau de config + versioning + feature flags (stub Phase 4)
 *
 * Hooks préservés (pas touchés) : `useBackofficeAIChat`, `useOrgSelector`, `useSuperAdminData`.
 */

"use client";

import { Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CircleMenu,
	WindowShell,
	backofficePreset,
	buildCircleMenuItems,
	defaultTriggerClassName,
	defaultTriggerIcon,
	type IAstedTabId,
} from "@workspace/iasted";
import { useOrgSelector } from "@/hooks/use-org-selector";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";
import { useBackofficeAIChat } from "@/hooks/useBackofficeAIChat";

// Tab components
import { BackofficeChatTab } from "./tabs/BackofficeChatTab";
import { BackofficeContactTab } from "./tabs/BackofficeContactTab";
import { BackofficeCallTab } from "./tabs/BackofficeCallTab";
import { BackofficeMeetingTab } from "./tabs/BackofficeMeetingTab";
import { BackofficeSettingsTab } from "./tabs/BackofficeSettingsTab";

export function BackofficeIAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat");

	// Org selector (remplace OrgProvider côté backoffice)
	const { activeOrgId, OrgSelector } = useOrgSelector();

	// Dérivation du rôle effectif (pour les items CircleMenu admin-only)
	const { isSuperAdmin, isBackOffice } = useSuperAdminData();
	const role = isSuperAdmin ? "super_admin" : isBackOffice ? "admin" : "agent";

	// Chat IA
	const chat = useBackofficeAIChat(activeOrgId);

	const openWithTab = useCallback((tab: IAstedTabId) => {
		setActiveTab(tab);
		setOpen(true);
	}, []);

	// Event bus iasted:open (pattern partagé avec agent/citizen)
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ tab?: IAstedTabId }>).detail;
			openWithTab(detail?.tab ?? "ichat");
		};
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, [openWithTab]);

	const menuItems = buildCircleMenuItems({
		surface: "backoffice",
		role,
		openWithTab,
	});

	return (
		<>
			{/* CircleMenu FAB — desktop only */}
			{!open && (
				<div
					suppressHydrationWarning
					className="fixed bottom-[62px] right-[62px] z-40 hidden lg:block"
				>
					<CircleMenu
						items={menuItems}
						openIcon={defaultTriggerIcon("backoffice")}
						triggerClassName={defaultTriggerClassName("backoffice")}
					/>
				</div>
			)}

			<WindowShell
				preset={backofficePreset}
				title="iAsted"
				subtitle="Administration"
				headerIcon={<Shield />}
				headerRightSlot={
					<div className="max-w-[140px]">
						<OrgSelector />
					</div>
				}
				open={open}
				onOpenChange={setOpen}
				activeTab={activeTab}
				onActiveTabChange={setActiveTab}
				onClose={() => setOpen(false)}
				tabContent={{
					ichat: <BackofficeChatTab orgId={activeOrgId} chat={chat} />,
					icontact: <BackofficeContactTab orgId={activeOrgId} />,
					icall: <BackofficeCallTab orgId={activeOrgId} />,
					imeeting: <BackofficeMeetingTab orgId={activeOrgId} />,
					isettings: <BackofficeSettingsTab />,
				}}
			/>
		</>
	);
}
