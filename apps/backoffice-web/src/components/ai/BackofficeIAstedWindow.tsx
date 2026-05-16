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

import {
	Contact,
	MessageSquare,
	Mic,
	Phone,
	Settings as SettingsIcon,
	Shield,
	Video,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	IAstedCursor,
	IAstedFanMenu,
	IAstedVoiceContext,
	formatPageContextForVoice,
	VoiceTab,
	WindowShell,
	backofficePreset,
	type IAstedFanMenuItem,
	type IAstedTabId,
} from "@workspace/iasted";
import {
	useFieldDescriptorsSnapshot,
	usePageContextSnapshot,
	useShellContextSnapshot,
} from "@workspace/agent-features/stores";
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

/**
 * En mode mono-fonction (hideTabs=true), on n'a plus la TabsNav pour indiquer
 * l'option active. Le subtitle du header rappelle alors la fonction courante.
 */
function tabSubtitleForBackoffice(tab: IAstedTabId): string {
	switch (tab) {
		case "ichat":
			return "iChat — Messagerie";
		case "icontact":
			return "iContact — Annuaire";
		case "icall":
			return "iAppel — Téléphonie";
		case "imeeting":
			return "iRéunion — Visioconférence";
		case "ivoice":
			return "Assistant Vocal";
		case "isettings":
			return "Réglages";
		default:
			return "Administration";
	}
}

export function BackofficeIAstedWindow() {
	const router = useRouter();
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<IAstedTabId>("ichat");

	// Org selector (remplace OrgProvider côté backoffice)
	const { activeOrgId, OrgSelector } = useOrgSelector();

	// Dérivation du rôle effectif (pour gating UI)
	const { isSuperAdmin, isBackOffice } = useSuperAdminData();

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

	// ── Conscience iAsted (port depuis mairie.ga) ──
	// TEMPORAIREMENT DÉSACTIVÉ : boucle infinie React à investiguer.
	// Réactiver une fois la cause profonde identifiée (dans useIAstedSoul).
	// const soulInitialUser = useMemo(...);
	// useIAstedSoul({ ... });

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

	// ── Synchronisation contexte page → session vocale (P1.9) ──
	// Mirror du flux agent-web : à chaque changement de page/fields/shell,
	// pousse le bloc texte au modèle via `updatePageContext` si la session
	// vocale est active. Debounce 150ms pour absorber les transitions.
	const pageSnapshot = usePageContextSnapshot();
	const shellSnapshot = useShellContextSnapshot();
	const fieldsSnapshot = useFieldDescriptorsSnapshot();
	useEffect(() => {
		if (!voiceController.isConnected) return;
		if (!voiceController.capabilities.pageContextUpdate) return;
		if (!voiceController.updatePageContext) return;
		const update = voiceController.updatePageContext;
		const timer = setTimeout(() => {
			update(
				formatPageContextForVoice({
					page: pageSnapshot,
					shell: shellSnapshot,
					fields: fieldsSnapshot,
				}),
			);
		}, 150);
		return () => clearTimeout(timer);
	}, [
		pageSnapshot,
		shellSnapshot,
		fieldsSnapshot,
		voiceController.isConnected,
		voiceController.capabilities.pageContextUpdate,
		voiceController.updatePageContext,
	]);

	// Items de l'éventail iAsted — 6 fonctions séparées qui rayonnent
	// autour du bouton central. Chaque item correspond à un onglet de
	// la fenêtre flottante (ouvert via openWithTab).
	const fanMenuItems: IAstedFanMenuItem[] = useMemo(
		() => [
			{
				id: "ichat",
				label: "iChat",
				icon: <MessageSquare className="h-4 w-4" />,
				className: "bg-emerald-600",
			},
			{
				id: "icontact",
				label: "iContact",
				icon: <Contact className="h-4 w-4" />,
				className: "bg-primary",
			},
			{
				id: "icall",
				label: "iAppel",
				icon: <Phone className="h-4 w-4" />,
				className: "bg-blue-500",
			},
			{
				id: "imeeting",
				label: "iRéunion",
				icon: <Video className="h-4 w-4" />,
				className: "bg-rose-500",
			},
			{
				id: "ivoice",
				label: "Vocal",
				icon: <Mic className="h-4 w-4" />,
				className: "bg-violet-600",
			},
			{
				id: "isettings",
				label: "Réglages",
				icon: <SettingsIcon className="h-4 w-4" />,
				className: "bg-slate-600",
			},
		],
		[],
	);

	// Handler d'expansion : navigue vers la route fullscreen de l'onglet courant
	// si une route est définie ; sinon retourne undefined (masque le bouton).
	const handleExpand = useMemo(() => {
		const route = FULLSCREEN_ROUTES[activeTab];
		if (!route) return undefined;
		return () => router.push(route);
	}, [activeTab, router]);

	return (
		<IAstedVoiceContext.Provider value={voiceController}>
			{/* Curseur orbe iAsted — port depuis mairie.ga, anime l'attention */}
			{hasBackofficeAccess && voiceController.isConnected && (
				<IAstedCursor enabled={true} size={28} />
			)}

			{/* Bouton iAsted + menu éventail (logique repensée).
			    Single click → mode conversationnel direct (active la voix).
			                   Si une session vocale est en cours, raccroche.
			    Double click → ouvre/ferme l'éventail des 6 options détachées.
			    Clic sur item → ouvre la fenêtre en mode MONO-FONCTION (hideTabs).
			    Drag → repositionnable, persisté en localStorage. */}
			{!open && hasBackofficeAccess && (
				<IAstedFanMenu
					size="md"
					layout="corner"
					positionStorageKey="iasted-button-position-backoffice"
					voiceListening={voiceController.voiceState === "listening"}
					voiceSpeaking={voiceController.voiceState === "speaking"}
					voiceProcessing={
						voiceController.voiceState === "thinking" ||
						voiceController.voiceState === "processing" ||
						voiceController.voiceState === "connecting"
					}
					audioLevel={voiceController.audioLevel}
					isVoiceConnected={voiceController.isConnected}
					items={fanMenuItems}
					onItemSelect={(item) => {
						const tab = item.id as IAstedTabId;
						openWithTab(tab);
					}}
					onSingleClick={() => {
						// Mode conversationnel direct : active la voix
						// (ou raccroche si session en cours).
						if (voiceController.isConnected) {
							void voiceController.deactivateVoice();
						} else if (voiceController.available) {
							void voiceController.activateVoice();
						}
					}}
				/>
			)}

			<WindowShell
				preset={backofficePreset}
				title="iAsted"
				subtitle={tabSubtitleForBackoffice(activeTab)}
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
				/* Mode MONO-FONCTION : les onglets sont détachés dans l'éventail
				   du bouton iAsted, donc la barre TabsNav devient redondante. */
				hideTabs={true}
				tabContent={{
					ichat: <BackofficeChatTab orgId={activeOrgId} chat={chat} />,
					icontact: <BackofficeContactTab orgId={activeOrgId} />,
					icall: <BackofficeCallTab orgId={activeOrgId} />,
					imeeting: <BackofficeMeetingTab orgId={activeOrgId} />,
					ivoice: <VoiceTab />,
					isettings: <BackofficeSettingsTab />,
				}}
			/>
		</IAstedVoiceContext.Provider>
	);
}
