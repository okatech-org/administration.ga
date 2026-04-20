"use client";

/**
 * iAsted — Shim agent-web.
 *
 * Le shell et le layout vivent dans `@workspace/agent-features/features/iasted`.
 * Ici on injecte uniquement le contenu fonctionnel spécifique agent-web :
 *   - les colonnes iChat (state + list + conversation + voice overlay)
 *   - les tabs iContact / iAppel / iRéunion / Réglages
 *   - la liste messagerie vocale (call-center)
 */

import { useEffect } from "react";
import IAstedPage from "@workspace/agent-features/features/iasted";
import type {
	IAstedChatColumnsProps,
	VoicemailsListInjectedProps,
} from "@workspace/agent-features/features/iasted";
import { useAdminAIChat } from "@/components/ai/useAdminAIChat";
import { useAdminVoiceChat } from "@/components/ai/useAdminVoiceChat";
import {
	IASTED_CONTACT,
	IAstedChatConversation,
	IAstedChatList,
	IAstedChatVoiceOverlay,
	useIAstedChat,
} from "@/components/ai/iasted/IAstedInstantChatTab";
import { IAstedContactTab } from "@/components/ai/iasted/IAstedContactTab";
import { IAstedCallTab } from "@/components/ai/iasted/IAstedCallTab";
import { IAstedMeetingTab } from "@/components/ai/iasted/IAstedMeetingTab";
import { IAstedSettingsTab } from "@/components/ai/iasted/IAstedSettingsTab";
import { VoicemailsList as CallCenterVoicemailsList } from "@/components/call-center/VoicemailsList";

// ─── Injected iChat columns (list + conversation + voice overlay) ──────────

function IAstedChatColumns({ onUnreadCountChange }: IAstedChatColumnsProps) {
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	const chatState = useIAstedChat({
		chat,
		voice,
		defaultSelectedContact: IASTED_CONTACT,
	});

	const isVoiceMode =
		chatState.selectedContact?.isAI === true && voice.isOpen === true;

	// Remonte le total unread au parent pour le badge de la nav.
	const totalP2PUnread = chatState.totalP2PUnread;
	useEffect(() => {
		onUnreadCountChange(totalP2PUnread);
	}, [totalP2PUnread, onUnreadCountChange]);

	return (
		<>
			{/* ── Col 2 : liste conversations ── */}
			<div className="flex w-80 min-h-0 shrink-0 flex-col border-r">
				<div className="shrink-0 border-b px-4 py-3">
					<h2 className="text-base font-semibold">Discussions</h2>
				</div>
				<IAstedChatList state={chatState} />
			</div>

			{/* ── Col 3 : conversation ou overlay vocal ── */}
			<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
				{isVoiceMode ? (
					<IAstedChatVoiceOverlay voice={voice} />
				) : (
					<IAstedChatConversation
						state={chatState}
						showBackButton={false}
					/>
				)}
			</div>
		</>
	);
}

// ─── Injected VoicemailsList (adapter agent-web → shared signature) ────────

function VoicemailsListAdapter({ orgId }: VoicemailsListInjectedProps) {
	return <CallCenterVoicemailsList orgId={orgId} />;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Page() {
	return (
		<IAstedPage
			IAstedChatColumns={IAstedChatColumns}
			IAstedContactTab={IAstedContactTab}
			IAstedCallTab={IAstedCallTab}
			IAstedMeetingTab={IAstedMeetingTab}
			IAstedSettingsTab={IAstedSettingsTab}
			VoicemailsList={VoicemailsListAdapter}
		/>
	);
}
