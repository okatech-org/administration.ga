/**
 * @workspace/iasted — barrel d'exports top-level.
 *
 * Utilisation recommandée : importer depuis les sous-chemins dédiés
 * (tree-shaking optimal, compilation plus rapide) :
 *
 *   import { CircleMenu } from "@workspace/iasted/components/circle-menu";
 *   import { WindowShell } from "@workspace/iasted/components/window";
 *   import { IASTED_ANIMATION } from "@workspace/iasted/tokens/animation";
 *
 * Ce barrel existe pour les consumers qui préfèrent un import unique.
 */

// Tokens
export {
	CIRCLE_MENU,
	WINDOW_MOTION,
	TAB_INDICATOR_MOTION,
	DRAWER_MOTION,
	MESSAGE_MOTION,
	REDUCED_MOTION,
	IASTED_ANIMATION,
} from "./tokens/animation";
export {
	WINDOW_SIZES,
	Z_INDEX,
	BREAKPOINTS,
	AVATAR_SIZES,
	IASTED_SIZES,
} from "./tokens/sizes";

// Types
export type {
	IAstedSurface,
	IAstedTabId,
	IAstedTabDefinition,
	IAstedContextValue,
	IAstedPreset,
	IAstedPresetFlags,
	CircleMenuItemSpec,
} from "./types/iasted";
export type {
	AgentStatus,
	AgentStatusExtended,
	AgentPresenceSnapshot,
	MeetingPriority,
	MeetingEndReason,
	CitizenRecordingConsent,
} from "./types/agent-presence";
export { deriveExtendedStatus } from "./types/agent-presence";

// Hooks
export { useReducedMotion } from "./hooks/use-reduced-motion";
export {
	IAstedContextProvider,
	useIAstedContext,
	useIAstedContextOptional,
} from "./hooks/use-iasted-context";
export { useCitizenConversation } from "./hooks/use-citizen-conversation";
export type {
	CitizenConversationInput,
	CitizenConversationState,
} from "./hooks/use-citizen-conversation";

// Components — CircleMenu
export {
	CircleMenu,
	CircleMenuAnimated,
	CircleMenuReducedMotion,
	IAstedTrigger3D,
	type CircleMenuItemConfig,
	type CircleMenuProps,
	type IAstedTrigger3DProps,
} from "./components/circle-menu";

// Types — Realtime voice (consumés par CircleMenu, IAstedTrigger3D et le hook use-realtime-voice)
export type {
	VoiceState,
	RealtimeMessage,
	RealtimeVoiceTool,
	RealtimeVoice,
	RealtimeSessionInit,
	RealtimeToolResult,
	RealtimeToolHandler,
	IAstedVoiceController,
} from "./hooks/use-realtime-voice-types";

// Hooks — Realtime voice + long-press
export {
	useRealtimeVoice,
	type UseRealtimeVoiceOptions,
	type UseRealtimeVoiceResult,
} from "./hooks/use-realtime-voice";
export {
	useLongPress,
	type UseLongPressOptions,
	type UseLongPressResult,
} from "./hooks/use-long-press";
export {
	IAstedVoiceContext,
	useIAstedVoiceController,
} from "./hooks/use-iasted-voice-context";

// Components — Window
export { WindowShell, WindowHeader, TabsNav } from "./components/window";
export type { WindowShellProps, WindowHeaderProps, TabsNavProps } from "./components/window";

// Lib
export { resolveIcon, registerIcon, listIcons } from "./lib/icon-resolver";
export { formatPageContextForVoice } from "./lib/format-page-context";
export type {
	PageContextLike,
	PageEntityLike,
	PageActionLike,
} from "./lib/format-page-context";

// Components — Primitives
export {
	AgentStatusDot,
	PriorityBadge,
	ChannelIcon,
	AgentStatusSelector,
	type AgentStatusDotProps,
	type PriorityBadgeProps,
	type ChannelIconProps,
	type ChannelKind,
	type AgentStatusSelectorProps,
} from "./components/primitives";

// Components — Chat
export {
	AgentRoster,
	EmptyActionState,
	ConversationList,
	CitizenChatPane,
	MacrosPanel,
	type AgentRosterEntry,
	type AgentRosterProps,
	type EmptyActionItem,
	type EmptyActionStateProps,
	type ConversationListItem,
	type ConversationListProps,
	type CitizenChatPaneProps,
	type MacroEntry,
	type MacrosPanelProps,
} from "./components/chat";

// Components — Contacts
export {
	CitizenProfileDrawer,
	type CitizenProfileDrawerProps,
} from "./components/contacts";

// Components — Smart (Phase δ : intelligence contextuelle + Phase ζ : post-call)
export {
	SmartSuggestionsRow,
	IntentConfidenceBadge,
	PostCallNoteDrawer,
	type SmartSuggestion,
	type SmartSuggestionsRowProps,
	type IntentConfidenceBadgeProps,
	type CallSentiment,
	type PostCallNoteDrawerProps,
} from "./components/smart";

// Components — Page (fullscreen)
export { FullscreenShell, type FullscreenShellProps } from "./components/page";

// Components — Config (backoffice)
export {
	ConfigPanelShell,
	SandboxPreview,
	VersionHistory,
	FeatureFlagsPanel,
	type ConfigPanelShellProps,
	type ConfigPanelId,
	type ConfigPanelTab,
	type SandboxPreviewProps,
	type VersionHistoryProps,
	type ConfigVersion,
	type FeatureFlagsPanelProps,
	type FeatureFlagEntry,
} from "./components/config";

// Hooks — agent status
export { useAgentStatus } from "./hooks/use-agent-status";
export type {
	UseAgentStatusOptions,
	UseAgentStatusResult,
} from "./hooks/use-agent-status";

// Hooks — draft autosave (Phase γ)
export { useDraftAutosave } from "./hooks/use-draft-autosave";
export type {
	UseDraftAutosaveOptions,
	UseDraftAutosaveResult,
} from "./hooks/use-draft-autosave";

// Presets
export {
	TAB_DEFINITIONS,
	citizenPreset,
	agentPreset,
	backofficePreset,
	agentDesktopPreset,
	presets,
} from "./presets";
export {
	buildCircleMenuItems,
	defaultTriggerIcon,
	defaultTriggerClassName,
	type BuildCircleMenuItemsOptions,
} from "./presets/circle-menu-items";
