"use client";

/**
 * IAstedChatColumns — colonnes iChat prêtes à l'emploi (liste + conversation/voix).
 *
 * Adapter plug-and-play qui câble `useAdminAIChat` + `useAdminVoiceChat` +
 * `useIAstedChat` autour des sous-composants `IAstedChatList` /
 * `IAstedChatConversation` / `IAstedChatVoiceOverlay`. Remonte le total
 * unread P2P au parent via `onUnreadCountChange` (pour le badge de la nav).
 *
 * Mêmes props que l'interface `IAstedChatColumnsProps` définie par la page
 * shell `@workspace/agent-features/features/iasted`.
 */

import { useEffect } from "react";
import type { IAstedChatColumnsProps } from "../../features/iasted";
import { useAdminAIChat } from "./useAdminAIChat";
import { useAdminVoiceChat } from "./useAdminVoiceChat";
import {
	IASTED_CONTACT,
	IAstedChatConversation,
	IAstedChatList,
	IAstedChatVoiceOverlay,
	useIAstedChat,
} from "./IAstedInstantChatTab";

export function IAstedChatColumns({ onUnreadCountChange }: IAstedChatColumnsProps) {
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	const chatState = useIAstedChat({
		chat,
		voice,
		defaultSelectedContact: IASTED_CONTACT,
	});

	const isVoiceMode =
		chatState.selectedContact?.isAI === true && voice.isOpen === true;

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
