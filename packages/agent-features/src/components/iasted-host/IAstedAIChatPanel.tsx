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
 *
 * Reçoit `chat` et `voice` en props : ils sont instanciés au niveau du side
 * panel parent pour qu'on puisse exposer le bouton micro dans son header
 * sans dupliquer les hooks (qui maintiennent des subscriptions Convex et
 * une connexion LiveKit).
 */

import {
	IASTED_CONTACT,
	IAstedChatConversation,
	IAstedChatVoiceOverlay,
	useIAstedChat,
} from "./IAstedInstantChatTab";
import type { useAdminAIChat } from "./useAdminAIChat";
import type { useAdminVoiceChat } from "./useAdminVoiceChat";

export interface IAstedAIChatPanelProps {
	chat: ReturnType<typeof useAdminAIChat>;
	voice: ReturnType<typeof useAdminVoiceChat>;
}

export function IAstedAIChatPanel({ chat, voice }: IAstedAIChatPanelProps) {
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
				<IAstedChatConversation
					state={state}
					showBackButton={false}
					showHeader={false}
				/>
			)}
		</div>
	);
}
