/**
 * IAstedWindow — Fenêtre flottante iAsted agent.
 *
 * Coquille fine au-dessus de `@workspace/iasted` :
 * - CircleMenu FAB desktop-only (mobile utilise `agent-mobile-nav.tsx` → event bus)
 * - Événement `iasted:open` (détail `{ tab }`) pour déclenchement depuis n'importe où
 * - Fenêtre COMPACTE (420×640 desktop, 85dvh mobile)
 * - Deep-link `/iasted` fullscreen uniquement via bouton Maximize (onExpand)
 *
 * Hooks LLM F2.3 (`useAdminAIChat`, `useAdminVoiceChat`) inchangés.
 */

"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CircleMenu,
	WindowShell,
	agentPreset,
	buildCircleMenuItems,
	defaultTriggerClassName,
	defaultTriggerIcon,
	type IAstedTabId,
} from "@workspace/iasted";
import { useOrg } from "@/components/org/org-provider";
import { useAdminAIChat } from "../useAdminAIChat";
import { useAdminVoiceChat } from "../useAdminVoiceChat";

import { IAstedInstantChatTab } from "./IAstedInstantChatTab";
import { IAstedContactTab } from "./IAstedContactTab";
import { IAstedCallTab } from "./IAstedCallTab";
import { IAstedMeetingTab } from "./IAstedMeetingTab";
import { IAstedSettingsTab } from "./IAstedSettingsTab";
import { GlobalActiveCallsBar } from "./GlobalActiveCallsBar";

export function IAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat");
	const { activeOrg } = useOrg();
	const router = useRouter();

	// ⚠️ Hooks LLM F2.3 — inchangés (commit bac7824 stable).
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	const openWithTab = useCallback((tab: IAstedTabId) => {
		setActiveTab(tab);
		setOpen(true);
	}, []);

	// Event bus (même pattern que citizen-web)
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ tab?: IAstedTabId }>).detail;
			openWithTab(detail?.tab ?? "ichat");
		};
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, [openWithTab]);

	const handleExpand = useCallback(() => {
		setOpen(false);
		router.push("/iasted");
	}, [router]);

	// Items du CircleMenu construits par le package (DS v3, cohérents avec citizen).
	const menuItems = buildCircleMenuItems({
		surface: "agent",
		openWithTab,
		expand: handleExpand,
	});

	return (
		<>
			{/* CircleMenu FAB — desktop only (mobile trigger via agent-mobile-nav dispatch iasted:open) */}
			{!open && (
				<div
					suppressHydrationWarning
					className="fixed bottom-[62px] right-[62px] z-40 hidden lg:block"
				>
					<CircleMenu
						items={menuItems}
						openIcon={defaultTriggerIcon("agent")}
						triggerClassName={defaultTriggerClassName("agent")}
					/>
				</div>
			)}

			<WindowShell
				preset={agentPreset}
				title="iAsted"
				subtitle={activeOrg?.name ?? "Agent IA Diplomate"}
				headerIcon={<ShieldCheck />}
				open={open}
				onOpenChange={setOpen}
				activeTab={activeTab}
				onActiveTabChange={setActiveTab}
				onExpand={handleExpand}
				onClose={() => setOpen(false)}
				// Slot sticky — actifs visibles sur tous les tabs sauf iAppel
				// (CallCenterShell dans iAppel rend déjà sa propre ActiveCallsBar).
				callQueueSlot={activeTab !== "icall" ? <GlobalActiveCallsBar /> : undefined}
				tabContent={{
					ichat: <IAstedInstantChatTab chat={chat} voice={voice} />,
					icontact: <IAstedContactTab />,
					icall: <IAstedCallTab />,
					imeeting: <IAstedMeetingTab />,
					isettings: <IAstedSettingsTab />,
				}}
			/>
		</>
	);
}
