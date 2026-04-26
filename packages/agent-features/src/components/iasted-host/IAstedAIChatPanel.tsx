"use client";

/**
 * IAstedAIChatPanel — vue chat-only directement dans la conversation avec
 * l'assistant IA (iAsted côté agent / Mr Ray côté citoyen).
 *
 * Différent de `IAstedChatColumns` qui rend la LISTE des conversations
 * (citoyen, équipe, IA…) à gauche + la conversation à droite. Ici on saute
 * la liste : on entre directement dans la conversation IA.
 *
 * Utilisé par `IAstedSidePanel` (Cmd+K) pour offrir un mode "raccourci IA"
 * sans les conversations P2P. La fenêtre flottante CircleMenu continue
 * d'utiliser `IAstedChatColumns` (liste + conversation).
 */

import {
	IASTED_CONTACT,
	IAstedChatConversation,
	IAstedChatVoiceOverlay,
	useIAstedChat,
} from "./IAstedInstantChatTab";
import { useAdminAIChat } from "./useAdminAIChat";
import { useAdminVoiceChat } from "./useAdminVoiceChat";

export function IAstedAIChatPanel() {
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	const state = useIAstedChat({
		chat,
		voice,
		defaultSelectedContact: IASTED_CONTACT,
	});

	const isVoiceMode =
		state.selectedContact?.isAI === true && voice.isOpen === true;

	return (
		<div className="flex h-full flex-col min-h-0 overflow-hidden">
			{isVoiceMode ? (
				<IAstedChatVoiceOverlay voice={voice} />
			) : (
				<IAstedChatConversation state={state} showBackButton={false} />
			)}
		</div>
	);
}
