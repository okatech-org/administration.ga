/**
 * iasted-host — Composants iAsted prêts-à-l'emploi (agent-web + agent-desktop).
 *
 * Pattern : la page shell `@workspace/agent-features/features/iasted` expose
 * des slots (IAstedChatColumns / IAstedContactTab / IAstedCallTab / …) par
 * injection de dépendances ; ce package hosting fournit les implémentations
 * réelles, câblées aux hooks Convex / LiveKit / chat partagés.
 */

// ─── Tabs iAsted ───────────────────────────────────────────────
export { IAstedContactTab } from "./IAstedContactTab";
export { IAstedCallTab } from "./IAstedCallTab";
export { IAstedMeetingTab } from "./IAstedMeetingTab";
export { IAstedSettingsTab } from "./IAstedSettingsTab";

// ─── Colonnes iChat (adapter prêt-à-l'emploi) ─────────────────
export { IAstedChatColumns } from "./IAstedChatColumns";

// ─── iChat primitives (si un appelant veut composer différemment) ──
export {
	IASTED_CONTACT,
	IAstedChatConversation,
	IAstedChatList,
	IAstedChatVoiceOverlay,
	IAstedInstantChatTab,
	useIAstedChat,
} from "./IAstedInstantChatTab";
export type {
	IAstedChatState,
	IAstedChatConversationProps,
	IAstedChatListProps,
	UseIAstedChatOptions,
} from "./IAstedInstantChatTab";

// ─── Hooks LLM ────────────────────────────────────────────────
export { useAdminAIChat } from "./useAdminAIChat";
export type { Message, AdminAIAction } from "./useAdminAIChat";
export { useAdminVoiceChat } from "./useAdminVoiceChat";
export type { PendingConfirmation } from "./useAdminVoiceChat";
export { useStreamingChat } from "./useStreamingChat";
export type { StreamingChatState } from "./useStreamingChat";
export { StreamingExplanationCard } from "./StreamingExplanationCard";

// ─── Voice UI ─────────────────────────────────────────────────
export { VoiceChatOverlay } from "./VoiceChatOverlay";
export { VoiceButton, VoiceChatContent, VoiceInputArea } from "./VoiceButton";

// ─── Intent / Spatial Awareness ──────────────────────────────
export {
	parseIntent,
	resolveNavigationTarget,
} from "./IntentProcessor";
export type { ParsedIntent } from "./IntentProcessor";
export { getPageContext, getSuggestions } from "./SpatialAwareness";

// ─── GlobalActiveCallsBar ────────────────────────────────────
export { GlobalActiveCallsBar } from "./GlobalActiveCallsBar";
