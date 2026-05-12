/**
 * BackofficeIAstedWindow — iAsted pour le Back-Office (SuperAdmin).
 *
 * Phase 4 migration : coquille fine au-dessus de `@workspace/iasted`.
 *
 * Particularités backoffice :
 * - Pas de `OrgProvider` (remplace par `useOrgSelector()`)
 * - `OrgSelector` rendu en bandeau sous le header (subHeaderSlot) pour laisser
 *   l'espace aux boutons Maximize/Réduire dans le header principal
 * - Tab "isettings" affiche un panneau de config + versioning + feature flags (stub Phase 4)
 *
 * Hooks préservés (pas touchés) : `useBackofficeAIChat`, `useOrgSelector`, `useSuperAdminData`.
 */

"use client";

import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useIAstedHost } from "./use-iasted-host";

// Tab components
import { BackofficeChatTab } from "./tabs/BackofficeChatTab";
import { BackofficeContactTab } from "./tabs/BackofficeContactTab";
import { BackofficeCallTab } from "./tabs/BackofficeCallTab";
import { BackofficeMeetingTab } from "./tabs/BackofficeMeetingTab";
import { BackofficeSettingsTab } from "./tabs/BackofficeSettingsTab";

/**
 * Routes fullscreen par onglet. Si l'onglet actif n'a pas de page dédiée,
 * le bouton Maximize2 est masqué (`onExpand` reste undefined).
 */
const FULLSCREEN_ROUTES: Partial<Record<IAstedTabId, string>> = {
	icontact: "/ai/contacts",
};

export function BackofficeIAstedWindow() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat");

	// Org selector (remplace OrgProvider côté backoffice)
	const { activeOrgId, OrgSelector } = useOrgSelector();

	// Dérivation du rôle effectif (pour les items CircleMenu admin-only)
	const { isSuperAdmin, isBackOffice } = useSuperAdminData();
	const role = isSuperAdmin ? "super_admin" : isBackOffice ? "admin" : "agent";

	// Garde-fou UI : un utilisateur sans rôle admin/superadmin ne doit pas voir
	// la fenêtre iAsted backoffice (le backend `realtimeToken.create` re-vérifie
	// la permission, mais on évite d'instancier les hooks coûteux pour rien).
	const hasBackofficeAccess = isSuperAdmin || isBackOffice;

	// Controller vocal iAsted (OpenAI Realtime via WebRTC).
	// Conditionnellement instancié — `useIAstedHost` est un hook, donc l'appel
	// doit rester stable entre les renders : on l'appelle toujours, mais le
	// CircleMenu n'utilisera le mode 3D que si l'accès est autorisé.
	const voiceController = useIAstedHost({ orgId: activeOrgId ?? undefined });

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

	// Handler d'expansion : navigue vers la route fullscreen de l'onglet courant
	// si une route est définie ; sinon retourne undefined (masque le bouton).
	const handleExpand = useMemo(() => {
		const route = FULLSCREEN_ROUTES[activeTab];
		if (!route) return undefined;
		return () => router.push(route);
	}, [activeTab, router]);

	return (
		<>
			{/* CircleMenu FAB — desktop only */}
			{!open && (
				<div
					suppressHydrationWarning
					className="fixed bottom-[62px] right-[62px] z-40 hidden lg:block pointer-events-none"
				>
					<CircleMenu
						items={menuItems}
						openIcon={defaultTriggerIcon("backoffice")}
						triggerClassName={defaultTriggerClassName("backoffice")}
						triggerVariant={hasBackofficeAccess ? "3d-organic" : "default"}
						voiceState={voiceController.voiceState}
						audioLevel={voiceController.audioLevel}
						voiceDisabled={!hasBackofficeAccess || !voiceController.available}
						onLongPress={
							hasBackofficeAccess ? voiceController.activateVoice : undefined
						}
					/>
				</div>
			)}

			<WindowShell
				preset={backofficePreset}
				title="iAsted"
				subtitle="Administration"
				headerIcon={<Shield />}
				subHeaderSlot={
					<div className="px-3 py-1.5">
						<OrgSelector />
					</div>
				}
				open={open}
				onOpenChange={setOpen}
				activeTab={activeTab}
				onActiveTabChange={setActiveTab}
				onClose={() => setOpen(false)}
				onExpand={handleExpand}
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
