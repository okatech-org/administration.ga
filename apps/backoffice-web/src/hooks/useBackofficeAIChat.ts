/**
 * useBackofficeAIChat — Hook de chat IA pour le backoffice.
 *
 * Adapté de agent-web useAdminAIChat : accepte orgId en paramètre.
 */

import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useConvexActionQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export type Message = {
	role: "user" | "assistant";
	content: string;
	timestamp: number;
};

export type AdminAIAction = {
	type: string;
	args: Record<string, unknown>;
	requiresConfirmation: boolean;
	reason?: string;
};

export function useBackofficeAIChat(orgId: Id<"orgs"> | null) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingActions, setPendingActions] = useState<AdminAIAction[]>([]);
	const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);

	const location = useLocation();
	const router = useRouter();
	const { mutateAsync: chat } = useConvexActionQuery(api.ai.adminChat.chat);
	const { mutateAsync: executeActionMutation } = useConvexActionQuery(api.ai.adminChat.executeAction);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading || !orgId) return;

			// Réponse affirmative à une action pendante
			const affirmativePatterns =
				/^(oui|ok|d'accord|d'acc|yes|yep|confirmer|confirme|accepter|accepte|go|parfait|allons-y|vas-y|allez|envoie|fais-le)$/i;
			if (pendingActions.length > 0 && affirmativePatterns.test(content.trim())) {
				const action = pendingActions[0];
				setIsLoading(true);
				try {
					if (action.type === "navigateTo") {
						const route = action.args.route as string;
						if (route) router.navigate({ to: route });
						setPendingActions((prev) => prev.filter((a) => a !== action));
						setMessages((prev) => [...prev, { role: "assistant", content: " Navigation effectuée.", timestamp: Date.now() }]);
					}
				} finally {
					setIsLoading(false);
				}
				return;
			}

			// Réponse négative
			const negativePatterns =
				/^(non|no|nope|annuler|annule|stop|arrête|pas maintenant|plus tard|refuse|refuser)$/i;
			if (pendingActions.length > 0 && negativePatterns.test(content.trim())) {
				const action = pendingActions[0];
				setPendingActions((prev) => prev.filter((a) => a !== action));
				setMessages((prev) => [...prev, { role: "assistant", content: `Action "${action.reason || action.type}" annulée.`, timestamp: Date.now() }]);
				return;
			}

			setIsLoading(true);
			setError(null);
			setMessages((prev) => [...prev, { role: "user", content, timestamp: Date.now() }]);

			try {
				const response = await chat({
					conversationId: conversationId ?? undefined,
					message: content,
					currentPage: location.pathname,
					orgId,
				});

				if (response.conversationId) setConversationId(response.conversationId);

				setMessages((prev) => [...prev, { role: "assistant", content: response.message, timestamp: Date.now() }]);

				if (response.actions && response.actions.length > 0) {
					const uiActions = response.actions.filter((a) => a.type === "navigateTo");
					const confirmableActions = response.actions.filter((a) => a.requiresConfirmation);

					for (const action of uiActions) {
						if (action.type === "navigateTo") {
							const route = action.args.route as string;
							if (route) router.navigate({ to: route });
						}
					}
					if (confirmableActions.length > 0) setPendingActions(confirmableActions);
				}
			} catch (err) {
				const errorMessage = (err as Error).message || "Une erreur est survenue";
				let userMessage: string;
				if (errorMessage.startsWith("RATE_LIMITED:")) {
					userMessage = errorMessage.replace("RATE_LIMITED:", "");
				} else if (errorMessage === "NOT_AUTHENTICATED") {
					userMessage = "Veuillez vous connecter pour utiliser l'assistant.";
				} else if (errorMessage === "NO_MEMBERSHIP") {
					userMessage = "Vous n'êtes pas membre de cette organisation.";
				} else {
					userMessage = "Une erreur est survenue. Veuillez réessayer.";
				}
				setError(userMessage);
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
			}
		},
		[chat, conversationId, isLoading, location.pathname, pendingActions, router, orgId],
	);

	const confirmAction = useCallback(
		async (action: AdminAIAction) => {
			if (!orgId) return;
			setIsLoading(true);
			setError(null);
			try {
				if (action.type === "navigateTo") {
					const route = action.args.route as string;
					if (route) router.navigate({ to: route });
					setPendingActions((prev) => prev.filter((a) => a !== action));
					setMessages((prev) => [...prev, { role: "assistant", content: " Navigation effectuée.", timestamp: Date.now() }]);
					return { success: true };
				}
				const result = await executeActionMutation({
					actionType: action.type,
					actionArgs: action.args,
					orgId,
					conversationId: conversationId ?? undefined,
				});
				setPendingActions((prev) => prev.filter((a) => a !== action));
				setMessages((prev) => [...prev, {
					role: "assistant",
					content: result.success ? ` ${(result.data as any)?.message || "Action exécutée"}` : ` Erreur: ${result.error}`,
					timestamp: Date.now(),
				}]);
				return result;
			} catch (err) {
				setError((err as Error).message || "Erreur lors de l'exécution");
				return { success: false, error: (err as Error).message };
			} finally {
				setIsLoading(false);
			}
		},
		[executeActionMutation, conversationId, router, orgId],
	);

	const rejectAction = useCallback((action: AdminAIAction) => {
		setPendingActions((prev) => prev.filter((a) => a !== action));
		setMessages((prev) => [...prev, { role: "assistant", content: `Action "${action.reason || action.type}" annulée.`, timestamp: Date.now() }]);
	}, []);

	const newConversation = useCallback(() => {
		setMessages([]);
		setConversationId(null);
		setPendingActions([]);
		setError(null);
	}, []);

	return {
		messages,
		isLoading,
		error,
		pendingActions,
		conversationId,
		sendMessage,
		confirmAction,
		rejectAction,
		newConversation,
	};
}
