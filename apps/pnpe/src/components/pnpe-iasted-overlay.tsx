"use client";

/**
 * PnpeIAstedOverlay — Overlay flottant iAsted pour les staff PNPE.
 *
 * Reproduit le même ensemble de surfaces que `AppShell` (cf.
 * `packages/agent-features/src/shell/app-shell.tsx`) mais en composant
 * autonome qu'on monte au-dessus du shell custom `PnpeStaffShell` (header
 * + sidebar PNPE.GA propres) au lieu du shell générique.
 *
 * Inclus :
 *   - `<IAstedSidePanel>` : panneau latéral chat IA (Cmd/Ctrl+K)
 *   - `<IAstedWindow>` : fenêtre flottante avec le CircleMenu FAB
 *     « bouton sphérique » et toutes les fonctionnalités iCom (iChat,
 *     iContact, iCall, iMeeting, iVoice, iSettings)
 *   - `<GlobalCallAlert>` : popup appels entrants
 *   - `<FloatingMeetingWindow>` : pop-out réunions LiveKit
 *   - `<GlobalOutgoingCallWindow>` : fenêtre appel sortant unifiée
 *   - `<GlobalCallPill>` + `<GlobalQueuePill>` : pills flottantes
 *   - `<GlobalCallRoomHost>` : pool LiveKit global pour audio cross-route
 *
 * Doit être monté SOUS :
 *   - `<OrgProvider>` (fournit `useOrg`)
 *   - `<IAstedVoiceProvider>` qui lui-même wrappe `<RawGeminiVoiceProvider>`
 *     (fournit `useRawGeminiVoiceStrict` et `useIAstedVoiceController`)
 *   - `<AIPresenceProvider>` (state graph IA proactive)
 *
 * Le contenu des onglets iAsted est injecté via `IAstedTabHost` qui
 * compose les hooks chat + tabs concrets — repris à l'identique de
 * `AppLayout` pour conserver l'UX et la session vocale.
 */
import { usePathname } from "next/navigation";
import type { IAstedTabId } from "@workspace/iasted";
import {
	FloatingMeetingWindow,
	GlobalCallAlert,
	GlobalCallPill,
	GlobalCallRoomHost,
	GlobalOutgoingCallWindow,
	GlobalQueuePill,
	IAstedSidePanel,
	IAstedWindow,
	useIAstedSidePanel,
	useOrg,
} from "@workspace/agent-features/shell";
import {
	GlobalActiveCallsBar,
	IAstedCallTab,
	IAstedContactTab,
	IAstedInstantChatTab,
	IAstedMeetingTab,
	IAstedSettingsTab,
	useAdminAIChat,
	useRawGeminiVoiceStrict,
} from "@workspace/agent-features/components/iasted-host";
import { useAgentPresence } from "@workspace/agent-features/hooks";
import { VoiceTab } from "@workspace/iasted";
import { VoicemailsList } from "@/components/call-center/VoicemailsList";

/**
 * Host des onglets iAsted — réplique le composant équivalent dans
 * `AppLayout`. Sépare la composition des tabs des hooks (chat, voice)
 * pour que `<IAstedWindow>` reste découplé.
 */
function IAstedTabHost({ tab }: { tab: IAstedTabId }) {
	const chat = useAdminAIChat();
	const voice = useRawGeminiVoiceStrict();

	switch (tab) {
		case "ichat":
			return <IAstedInstantChatTab chat={chat} voice={voice} />;
		case "icontact":
			return <IAstedContactTab />;
		case "icall":
			return <IAstedCallTab compact VoicemailsList={VoicemailsList} />;
		case "ivoicemail":
			// Legacy : on bascule sur iAppel (la messagerie est devenue un
			// sous-cas des appels, plus un onglet dédié).
			return <IAstedCallTab compact VoicemailsList={VoicemailsList} />;
		case "imeeting":
			return <IAstedMeetingTab />;
		case "ivoice":
			return <VoiceTab />;
		case "isettings":
			return <IAstedSettingsTab />;
		default:
			return null;
	}
}

export function PnpeIAstedOverlay() {
	const { activeOrgId } = useOrg();
	const { isOpen: isSidePanelOpen, close: closeSidePanel } =
		useIAstedSidePanel();

	// Heartbeat agent presence — déclare le navigateur staff PNPE comme
	// agent connecté sur son org active (utilisé par la file d'attente).
	useAgentPresence(
		activeOrgId ? [activeOrgId] : undefined,
		"agent-web",
	);

	// Sur /icom (fullscreen), on masque le `IAstedWindow` pour éviter
	// deux instances concurrentes de `useAdminAIChat` + `useAdminVoiceChat`
	// (conflit de souscriptions Convex et de session WebRTC) — même logique
	// que `DashboardLayout` dans `AppShell`.
	const pathname = usePathname();
	const showIAsted = !pathname?.startsWith("/icom");

	return (
		<>
			{showIAsted && (
				<IAstedSidePanel
					isOpen={isSidePanelOpen}
					onClose={closeSidePanel}
				/>
			)}
			{showIAsted && (
				<IAstedWindow
					renderTab={(tab) => <IAstedTabHost tab={tab} />}
					renderCallQueueSlot={(tab) =>
						tab !== "icall" ? <GlobalActiveCallsBar /> : undefined
					}
					sidePanelOpen={isSidePanelOpen}
				/>
			)}
			<GlobalCallAlert />
			<FloatingMeetingWindow
				hostPathname="/icom"
				activeParamName="active"
				hostTab={{ key: "tab", value: "imeeting" }}
			/>
			<GlobalOutgoingCallWindow />
			<GlobalCallPill />
			<GlobalQueuePill />
			<GlobalCallRoomHost />
		</>
	);
}
