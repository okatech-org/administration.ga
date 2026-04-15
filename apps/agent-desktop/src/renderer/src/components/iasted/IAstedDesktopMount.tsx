/**
 * IAstedDesktopMount — intégration de `@workspace/iasted` côté renderer Electron.
 *
 * Phase 4 (agent-desktop) :
 * - Preset `agent-desktop` avec `windowMode: "docked-native"`.
 * - CircleMenu + WindowShell partagés (même animation, même DS v3).
 * - Le shell renderer Electron fait déjà office de "fenêtre native", donc le
 *   CircleMenu est masqué par défaut (la fenêtre principale est toujours visible).
 *
 * Bridge IPC : pour une intégration macOS dock badge + DND OS, voir futur
 * développement via `@workspace/desktop-shared/notification-types.ts`.
 */

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
	WindowShell,
	agentDesktopPreset,
	type IAstedTabId,
} from "@workspace/iasted";

export interface IAstedDesktopMountProps {
	/** Contenu injecté pour chaque tab (chat, contact, call, meeting, settings). */
	tabContent: Partial<Record<IAstedTabId, React.ReactNode>>;
	/** Nom de l'organisation active (ou fallback). */
	orgName?: string;
	/** Handler optionnel pour expand/détachement de fenêtre. */
	onExpand?: () => void;
}

export function IAstedDesktopMount({
	tabContent,
	orgName,
	onExpand,
}: IAstedDesktopMountProps) {
	const [open, setOpen] = useState(true); // toujours ouvert en mode docked-native
	const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat");

	const openWithTab = useCallback((tab: IAstedTabId) => {
		setActiveTab(tab);
		setOpen(true);
	}, []);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ tab?: IAstedTabId }>).detail;
			openWithTab(detail?.tab ?? "ichat");
		};
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, [openWithTab]);

	return (
		<WindowShell
			preset={agentDesktopPreset}
			title="iAsted"
			subtitle={orgName ?? "Agent Desktop"}
			headerIcon={<ShieldCheck />}
			open={open}
			onOpenChange={setOpen}
			activeTab={activeTab}
			onActiveTabChange={setActiveTab}
			onExpand={onExpand}
			onClose={() => setOpen(false)}
			tabContent={tabContent}
		/>
	);
}
