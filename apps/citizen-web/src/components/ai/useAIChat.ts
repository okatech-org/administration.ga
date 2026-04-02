import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
} from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useFormFill } from "./FormFillContext";

export type Message = {
	role: "user" | "assistant";
	content: string;
	timestamp: number;
};

export type AIAction = {
	type: string;
	args: Record<string, unknown>;
	requiresConfirmation: boolean;
	reason?: string;
};

export function useAIChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
	const [conversationId, setConversationId] =
		useState<Id<"conversations"> | null>(null);

	const location = useLocation();
	const router = useRouter();
	const { setFormFill } = useFormFill();
	const { mutateAsync: chat } = useConvexActionQuery(api.ai.chat.chat);
	const { mutateAsync: executeActionMutation } = useConvexActionQuery(
		api.ai.chat.executeAction,
	);
	const { mutateAsync: analyzeDocumentAction } = useConvexActionQuery(
		api.ai.documentAnalysis.analyzeDocument,
	);

	// Get conversation history
	const { data: conversations } = useAuthenticatedConvexQuery(
		api.ai.chat.listConversations,
		{},
	);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading) return;

			// Check if this is an affirmative response to a pending action
			const affirmativePatterns =
				/^(oui|ok|d'accord|d'acc|yes|yep|confirmer|confirme|accepter|accepte|go|parfait|allons-y|vas-y|allez|envoie|fais-le)$/i;
			if (
				pendingActions.length > 0 &&
				affirmativePatterns.test(content.trim())
			) {
				// Execute the first pending action inline
				const action = pendingActions[0];
				setIsLoading(true);

				try {
					// For UI actions (fillForm, navigateTo), handle inline
					if (action.type === "fillForm" || action.type === "navigateTo") {
						// Execute navigation
						if (action.type === "navigateTo") {
							const route = action.args.route as string;
							if (route) {
								router.navigate({ to: route });
							}
						}
						// Execute form fill
						if (action.type === "fillForm") {
							const formId = action.args.formId as string;
							const fields = action.args.fields as Record<string, unknown>;
							const navigateFirst = action.args.navigateFirst as boolean;

							if (navigateFirst) {
								const routeMap: Record<string, string> = {
									profile: "/profile",
									"profile.identity": "/profile",
									"profile.addresses": "/profile",
									"profile.contacts": "/profile",
									"profile.family": "/profile",
									request: "/requests",
								};
								const route = routeMap[formId] || "/profile";
								router.navigate({ to: route });
							}

							setFormFill({
								formId,
								fields,
								timestamp: Date.now(),
							});
						}

						// Remove from pending and add success message
						setPendingActions((prev) => prev.filter((a) => a !== action));
						const resultMessage: Message = {
							role: "assistant",
							content:
								action.type === "fillForm"
									? " Les informations ont été pré-remplies dans le formulaire."
									: " Navigation effectuée.",
							timestamp: Date.now(),
						};
						setMessages((prev) => [...prev, resultMessage]);
					}
				} finally {
					setIsLoading(false);
				}
				return;
			}

			// Check if this is a negative response to a pending action
			const negativePatterns =
				/^(non|no|nope|annuler|annule|stop|arrête|pas maintenant|plus tard|refuse|refuser)$/i;
			if (pendingActions.length > 0 && negativePatterns.test(content.trim())) {
				// Reject the first pending action inline
				const action = pendingActions[0];
				setPendingActions((prev) => prev.filter((a) => a !== action));
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

			// Add user message immediately
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
					currentPage: location.pathname,
				});

				// Update conversation ID
				if (response.conversationId) {
					setConversationId(response.conversationId);
				}

				// Add assistant message
				const assistantMessage: Message = {
					role: "assistant",
					content: response.message,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, assistantMessage]);

				// Handle actions - separate UI actions from confirmable ones
				if (response.actions && response.actions.length > 0) {
					const uiActions = response.actions.filter(
						(a) => a.type === "navigateTo" || a.type === "fillForm",
					);
					const confirmableActions = response.actions.filter(
						(a) => a.requiresConfirmation,
					);

					// Execute UI actions immediately (inline to avoid forward reference)
					for (const action of uiActions) {
						if (action.type === "navigateTo") {
							const route = action.args.route as string;
							if (route) {
								router.navigate({ to: route });
							}
						} else if (action.type === "fillForm") {
							const formId = action.args.formId as string;
							const fields = action.args.fields as Record<string, unknown>;
							const navigateFirst = action.args.navigateFirst as boolean;

							if (navigateFirst) {
								const routeMap: Record<string, string> = {
									profile: "/profile",
									"profile.identity": "/profile",
									"profile.addresses": "/profile",
									"profile.contacts": "/profile",
									"profile.family": "/profile",
									request: "/requests",
								};
								const route = routeMap[formId] || "/profile";
								router.navigate({ to: route });
							}

							setFormFill({
								formId,
								fields,
								timestamp: Date.now(),
							});
						}
					}

					// Queue actions that need confirmation
					if (confirmableActions.length > 0) {
						setPendingActions(confirmableActions);
					}
				}
			} catch (err) {
				const errorMessage =
					(err as Error).message || "Une erreur est survenue";

				// Parse specific error types for user-friendly messages
				let userMessage: string;
				if (errorMessage.startsWith("RATE_LIMITED:")) {
					userMessage = errorMessage.replace("RATE_LIMITED:", "");
				} else if (errorMessage === "NOT_AUTHENTICATED") {
					userMessage = "Veuillez vous connecter pour utiliser l'assistant.";
				} else if (
					errorMessage.includes("GEMINI") ||
					errorMessage.includes("API")
				) {
					userMessage =
						"Le service est temporairement indisponible. Réessayez dans quelques instants.";
				} else {
					userMessage = "Une erreur est survenue. Veuillez réessayer.";
				}

				setError(userMessage);
				// Remove the user message on error
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
			}
		},
		[
			chat,
			conversationId,
			isLoading,
			location.pathname,
			pendingActions,
			setFormFill,
			router,
		],
	);

	// Analyze a document image with Gemini Vision
	const analyzeImage = useCallback(
		async (imageBase64: string, mimeType: string) => {
			if (isLoading) return;

			setIsLoading(true);
			setError(null);

			// Add user message with image indicator
			const userMessage: Message = {
				role: "user",
				content: " Document envoyé pour analyse...",
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, userMessage]);

			try {
				const result = await analyzeDocumentAction({
					imageBase64,
					mimeType,
					documentType: "passport", // Default to passport analysis
				});

				if (!result.success) {
					const errorMsg = result.error?.startsWith("RATE_LIMITED:")
						? result.error.replace("RATE_LIMITED:", "")
						: "Impossible d'analyser le document. Réessayez avec une image plus claire.";
					setError(errorMsg);
					setMessages((prev) => prev.slice(0, -1));
					return;
				}

				// French labels for human-readable display
				const fieldLabels: Record<string, string> = {
					firstName: "Prénom",
					lastName: "Nom de famille",
					birthDate: "Date de naissance",
					birthPlace: "Lieu de naissance",
					gender: "Sexe",
					nationality: "Nationalité",
					passportNumber: "N° de passeport",
					issueDate: "Date de délivrance",
					expiryDate: "Date d'expiration",
					issuingAuthority: "Autorité de délivrance",
				};

				// Gender display values
				const genderLabels: Record<string, string> = {
					M: "Masculin",
					F: "Féminin",
				};

				// Document type labels
				const documentTypeLabels: Record<string, string> = {
					passport: "Passeport",
					id_card: "Carte d'identité",
					birth_certificate: "Acte de naissance",
					unknown: "Document",
				};

				// Build response message with human-readable labels
				const docTypeLabel =
					documentTypeLabels[result.documentType] || result.documentType;
				let responseText = ` **Analyse du ${docTypeLabel.toLowerCase()}**\n\n`;
				responseText += ` Confiance: ${result.confidence}%\n\n`;

				if (Object.keys(result.extractedData).length > 0) {
					responseText += `**Informations extraites :**\n`;
					for (const [key, value] of Object.entries(result.extractedData)) {
						if (value) {
							const label = fieldLabels[key] || key;
							// Format gender values
							const displayValue =
								key === "gender"
									? genderLabels[value as string] || value
									: value;
							responseText += `• **${label}** : ${displayValue}\n`;
						}
					}
					responseText += `\n_Voulez-vous que je pré-remplisse votre profil avec ces informations ?_`;
				}

				if (result.warnings.length > 0) {
					responseText += `\n\n **Avertissements :**\n`;
					for (const warning of result.warnings) {
						responseText += `• ${warning}\n`;
					}
				}

				const assistantMessage: Message = {
					role: "assistant",
					content: responseText,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, assistantMessage]);

				// If we have document data, offer to fill the form
				if (
					result.extractedData &&
					Object.keys(result.extractedData).length > 0
				) {
					const data = result.extractedData as Record<string, string>;

					// Map gender to enum values (lowercase)
					let genderValue: string | undefined;
					if (data.gender === "M") genderValue = "male";
					else if (data.gender === "F") genderValue = "female";

					// Build the fields object with correct naming
					const fields: Record<string, unknown> = {};

					if (data.firstName) fields.firstName = data.firstName;
					if (data.lastName) fields.lastName = data.lastName;
					if (data.birthDate) fields.birthDate = data.birthDate;
					if (data.birthPlace) fields.birthPlace = data.birthPlace;
					if (genderValue) fields.gender = genderValue;
					if (data.nationality) fields.nationality = data.nationality; // ISO 2-letter code

					// Passport-specific fields
					if (data.passportNumber) fields.passportNumber = data.passportNumber;
					if (data.issueDate) fields.passportIssueDate = data.issueDate;
					if (data.expiryDate) fields.passportExpiryDate = data.expiryDate;
					if (data.issuingAuthority)
						fields.passportAuthority = data.issuingAuthority;

					// Document type labels for the action reason
					const docTypeLabels: Record<string, string> = {
						passport: "passeport",
						birth_certificate: "acte de naissance",
						id_card: "carte d'identité",
					};
					const docLabel = docTypeLabels[result.documentType] || "document";

					// Prepare fillForm action
					setPendingActions([
						{
							type: "fillForm",
							args: {
								formId: "profile",
								fields,
								navigateFirst: true,
							},
							requiresConfirmation: true,
							reason: `Pré-remplir le profil avec les données du ${docLabel}`,
						},
					]);
				}
			} catch (err) {
				setError("Une erreur est survenue lors de l'analyse.");
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
			}
		},
		[analyzeDocumentAction, isLoading],
	);

	// Execute UI actions (navigateTo, fillForm) - these don't need confirmation
	const executeUIAction = useCallback(
		async (action: AIAction) => {
			switch (action.type) {
				case "navigateTo": {
					const route = action.args.route as string;
					if (route) {
						router.navigate({ to: route });
					}
					break;
				}
				case "fillForm": {
					const formId = action.args.formId as string;
					const fields = action.args.fields as Record<string, unknown>;
					const navigateFirst = action.args.navigateFirst as boolean;

					// Navigate first if needed
					if (navigateFirst) {
						const routeMap: Record<string, string> = {
							profile: "/profile",
							"profile.identity": "/profile",
							"profile.addresses": "/profile",
							"profile.contacts": "/profile",
							"profile.family": "/profile",
							request: "/requests",
						};
						const route = routeMap[formId] || "/profile";
						router.navigate({ to: route });
					}

					// Set the form fill data - forms will consume it
					setFormFill({
						formId,
						fields,
						timestamp: Date.now(),
					});
					break;
				}
			}
		},
		[router, setFormFill],
	);

	// Confirm and execute a pending action
	const confirmAction = useCallback(
		async (action: AIAction) => {
			setIsLoading(true);
			setError(null);

			try {
				// UI actions (navigateTo, fillForm) should be executed client-side
				const UI_ACTION_TYPES = ["navigateTo", "fillForm"];

				if (UI_ACTION_TYPES.includes(action.type)) {
					// Execute UI action locally
					await executeUIAction(action);

					// Remove from pending
					setPendingActions((prev) => prev.filter((a) => a !== action));

					// Add success message
					const resultMessage: Message = {
						role: "assistant",
						content:
							action.type === "fillForm"
								? " Les informations ont été pré-remplies dans le formulaire."
								: " Navigation effectuée.",
						timestamp: Date.now(),
					};
					setMessages((prev) => [...prev, resultMessage]);

					return { success: true };
				}

				// Mutative actions go through the backend
				const result = await executeActionMutation({
					actionType: action.type,
					actionArgs: action.args,
					conversationId: conversationId ?? undefined,
				});

				// Remove from pending
				setPendingActions((prev) => prev.filter((a) => a !== action));

				// Add result message
				const resultMessage: Message = {
					role: "assistant",
					content: result.success
						? ` Action exécutée: ${JSON.stringify(result.data)}`
						: ` Erreur: ${result.error}`,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, resultMessage]);

				return result;
			} catch (err) {
				setError((err as Error).message || "Erreur lors de l'exécution");
				return { success: false, error: (err as Error).message };
			} finally {
				setIsLoading(false);
			}
		},
		[executeActionMutation, executeUIAction, conversationId],
	);

	// Reject a pending action
	const rejectAction = useCallback((action: AIAction) => {
		setPendingActions((prev) => prev.filter((a) => a !== action));

		// Add rejection message
		const rejectMessage: Message = {
			role: "assistant",
			content: `Action "${action.type}" annulée.`,
			timestamp: Date.now(),
		};
		setMessages((prev) => [...prev, rejectMessage]);
	}, []);

	const clearActions = useCallback(() => {
		setPendingActions([]);
	}, []);

	const newConversation = useCallback(() => {
		setMessages([]);
		setConversationId(null);
		setPendingActions([]);
		setError(null);
	}, []);

	const loadConversation = useCallback(
		(convId: Id<"conversations">) => {
			// Find the conversation from the list
			const conv = conversations?.find((c) => c._id === convId);
			if (conv) {
				setConversationId(convId);
				setMessages(
					conv.messages
						.filter((m) => m.role !== "tool")
						.map((m) => ({
							role: m.role as "user" | "assistant",
							content: m.content,
							timestamp: m.timestamp,
						})),
				);
			}
		},
		[conversations],
	);

	return {
		messages,
		isLoading,
		error,
		pendingActions,
		conversationId,
		conversations,
		sendMessage,
		analyzeImage,
		confirmAction,
		rejectAction,
		clearActions,
		newConversation,
		loadConversation,
	};
}
