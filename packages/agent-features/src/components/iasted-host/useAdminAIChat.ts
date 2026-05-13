import { usePathname, useRouter } from "@workspace/routing";
import { useCallback, useState } from "react";
import { useConvexActionQuery } from "@workspace/api/hooks";
import { useOrg } from "../../shell/org-provider";
import { pageContextStore } from "../../stores/page-context-store";
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

			// Cartes de confirmation supprimées (mai 2026) : la confirmation
			// passe par le langage naturel, l'IA pose la question, l'utilisateur
			// répond. Toute action retournée par le backend est exécutée
			// immédiatement côté frontend.

			setIsLoading(true);
			setError(null);

			const userMessage: Message = {
				role: "user",
				content,
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, userMessage]);

			try {
				// Fusionne le snapshot page courant avec le snapshot shell
				// (actions globales toggle thème / sidebar). Côté backend,
				// `pageContext.availableActions` contient donc à la fois les
				// actions page et les actions shell, indifférenciées —
				// l'IA voit l'ensemble des actions exécutables.
				const pageSnapshot = pageContextStore.getSnapshot();
				const shellSnapshot = pageContextStore.getShellSnapshot();
				const mergedPageContext = pageSnapshot
					? {
						...pageSnapshot,
						availableActions: [
							...(shellSnapshot?.availableActions ?? []),
							...pageSnapshot.availableActions,
						],
					}
					: shellSnapshot
						? {
							module: "shell",
							pathname,
							title: "Application",
							summary: shellSnapshot.summary ?? "",
							visibleEntities: [],
							availableActions: shellSnapshot.availableActions,
							scopedToolNames: [],
							updatedAt: shellSnapshot.updatedAt,
						}
						: undefined;
				const response = await chat({
					conversationId: conversationId ?? undefined,
					message: content,
					currentPage: pathname,
					pageContext: mergedPageContext,
					orgId: activeOrgId,
					app: "agent",
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

				// Handle actions — exécution directe systématique (mai 2026).
				// La confirmation des actions sensibles se fait désormais en
				// langage naturel : le modèle pose la question (« voulez-vous
				// que je… ? ») et n'émet l'action qu'après accord verbal.
				// La défense en profondeur reste dans les mutations Convex.
				if (response.actions && response.actions.length > 0) {
					const resultMessages: Message[] = [];

					for (const action of response.actions) {
						// Navigation
						if (action.type === "navigateTo") {
							const route = action.args.route as string;
							if (route) router.push(route);
							continue;
						}

						// Page action — exécutée via le handler enregistré par la page
						if (action.type === "executePageAction") {
							const actionId = action.args.actionId as string;
							const params = action.args.params as
								| Record<string, unknown>
								| undefined;
							const handler = actionId
								? pageContextStore.getActionHandler(actionId)
								: undefined;

							if (!handler) {
								resultMessages.push({
									role: "assistant",
									content: `⚠️ Action « ${actionId} » introuvable sur la page courante.`,
									timestamp: Date.now(),
								});
								continue;
							}

							try {
								await handler(params);
							} catch (e) {
								resultMessages.push({
									role: "assistant",
									content: `⚠️ Erreur lors de l'action « ${actionId} » : ${(e as Error).message}`,
									timestamp: Date.now(),
								});
							}
							continue;
						}

						// Autres mutatives — exécution directe via le backend
						try {
							const result = await executeActionMutation({
								actionType: action.type,
								actionArgs: action.args,
								orgId: activeOrgId,
								conversationId: conversationId ?? undefined,
							});
							if (result && (result as any).error) {
								resultMessages.push({
									role: "assistant",
									content: `⚠️ ${(result as any).error}`,
									timestamp: Date.now(),
								});
							}
						} catch (e) {
							resultMessages.push({
								role: "assistant",
								content: `⚠️ Erreur lors de l'action « ${action.type} » : ${(e as Error).message}`,
								timestamp: Date.now(),
							});
						}
					}

					if (resultMessages.length > 0) {
						setMessages((prev) => [...prev, ...resultMessages]);
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
			router,
			activeOrgId,
			executeActionMutation,
		],
	);

	const newConversation = useCallback(() => {
		setMessages([]);
		setConversationId(null);
		setError(null);
	}, []);

	return {
		messages,
		isLoading,
		error,
		conversationId,
		sendMessage,
		newConversation,
	};
}
