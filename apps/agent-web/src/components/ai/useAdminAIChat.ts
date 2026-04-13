import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useConvexActionQuery } from "@/integrations/convex/hooks";
import { useOrg } from "@/components/org/org-provider";
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

export function useAdminAIChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingActions, setPendingActions] = useState<AdminAIAction[]>([]);
	const [conversationId, setConversationId] =
		useState<Id<"conversations"> | null>(null);

	const pathname = usePathname();
	const router = useRouter();
	const { activeOrgId } = useOrg();
	const { mutateAsync: chat } = useConvexActionQuery(
		api.ai.adminChat.chat,
	);
	const { mutateAsync: executeActionMutation } = useConvexActionQuery(
		api.ai.adminChat.executeAction,
	);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading || !activeOrgId) return;

			// Check if this is an affirmative response to a pending action
			const affirmativePatterns =
				/^(oui|ok|d'accord|d'acc|yes|yep|confirmer|confirme|accepter|accepte|go|parfait|allons-y|vas-y|allez|envoie|fais-le)$/i;
			if (
				pendingActions.length > 0 &&
				affirmativePatterns.test(content.trim())
			) {
				const action = pendingActions[0];
				setIsLoading(true);

				try {
					if (action.type === "navigateTo") {
						const route = action.args.route as string;
						if (route) {
							router.push(route);
						}
						setPendingActions((prev) =>
							prev.filter((a) => a !== action),
						);
						const resultMessage: Message = {
							role: "assistant",
							content: " Navigation effectuée.",
							timestamp: Date.now(),
						};
						setMessages((prev) => [...prev, resultMessage]);
					}
				} finally {
					setIsLoading(false);
				}
				return;
			}

			// Check for negative response
			const negativePatterns =
				/^(non|no|nope|annuler|annule|stop|arrête|pas maintenant|plus tard|refuse|refuser)$/i;
			if (
				pendingActions.length > 0 &&
				negativePatterns.test(content.trim())
			) {
				const action = pendingActions[0];
				setPendingActions((prev) =>
					prev.filter((a) => a !== action),
				);
				const rejectMessage: Message = {
					role: "assistant",
					content: `Action "${action.reason || action.type}" annulée.`,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, rejectMessage]);
				return;
			}

			setIsLoading(true);
			setError(null);

			const userMessage: Message = {
				role: "user",
				content,
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, userMessage]);

			try {
				const response = await chat({
					conversationId: conversationId ?? undefined,
					message: content,
					currentPage: pathname,
					orgId: activeOrgId,
				});

				if (response.conversationId) {
					setConversationId(response.conversationId);
				}

				const assistantMessage: Message = {
					role: "assistant",
					content: response.message,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, assistantMessage]);

				// Handle actions
				if (response.actions && response.actions.length > 0) {
					const uiActions = response.actions.filter(
						(a) => a.type === "navigateTo",
					);
					const confirmableActions = response.actions.filter(
						(a) => a.requiresConfirmation,
					);

					// Execute UI actions immediately
					for (const action of uiActions) {
						if (action.type === "navigateTo") {
							const route = action.args.route as string;
							if (route) {
								router.push(route);
							}
						}
					}

					// Queue confirmable actions
					if (confirmableActions.length > 0) {
						setPendingActions(confirmableActions);
					}
				}
			} catch (err) {
				const errorMessage =
					(err as Error).message || "Une erreur est survenue";

				let userMessage: string;
				if (errorMessage.startsWith("RATE_LIMITED:")) {
					userMessage = errorMessage.replace("RATE_LIMITED:", "");
				} else if (errorMessage === "NOT_AUTHENTICATED") {
					userMessage =
						"Veuillez vous connecter pour utiliser l'assistant.";
				} else if (errorMessage === "NO_MEMBERSHIP") {
					userMessage =
						"Vous n'êtes pas membre de cette organisation.";
				} else if (
					errorMessage.includes("GEMINI") ||
					errorMessage.includes("API")
				) {
					userMessage =
						"Le service est temporairement indisponible. Réessayez dans quelques instants.";
				} else {
					userMessage =
						"Une erreur est survenue. Veuillez réessayer.";
				}

				setError(userMessage);
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
			}
		},
		[
			chat,
			conversationId,
			isLoading,
			pathname,
			pendingActions,
			router,
			activeOrgId,
		],
	);

	// Confirm and execute a pending action
	const confirmAction = useCallback(
		async (action: AdminAIAction) => {
			if (!activeOrgId) return;
			setIsLoading(true);
			setError(null);

			try {
				// UI actions
				if (action.type === "navigateTo") {
					const route = action.args.route as string;
					if (route) {
						router.push(route);
					}
					setPendingActions((prev) =>
						prev.filter((a) => a !== action),
					);
					const resultMessage: Message = {
						role: "assistant",
						content: " Navigation effectuée.",
						timestamp: Date.now(),
					};
					setMessages((prev) => [...prev, resultMessage]);
					return { success: true };
				}

				// Mutative actions → backend
				const result = await executeActionMutation({
					actionType: action.type,
					actionArgs: action.args,
					orgId: activeOrgId,
					conversationId: conversationId ?? undefined,
				});

				setPendingActions((prev) =>
					prev.filter((a) => a !== action),
				);

				const resultMessage: Message = {
					role: "assistant",
					content: result.success
						? ` ${(result.data as any)?.message || "Action exécutée"}`
						: ` Erreur: ${result.error}`,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, resultMessage]);

				return result;
			} catch (err) {
				setError(
					(err as Error).message || "Erreur lors de l'exécution",
				);
				return { success: false, error: (err as Error).message };
			} finally {
				setIsLoading(false);
			}
		},
		[executeActionMutation, conversationId, router, activeOrgId],
	);

	// Reject an action
	const rejectAction = useCallback((action: AdminAIAction) => {
		setPendingActions((prev) => prev.filter((a) => a !== action));
		const rejectMessage: Message = {
			role: "assistant",
			content: `Action "${action.reason || action.type}" annulée.`,
			timestamp: Date.now(),
		};
		setMessages((prev) => [...prev, rejectMessage]);
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
