// Stores Zustand / custom partagés entre agent-web et agent-desktop.
export {
  callStore,
  useCallStore,
} from "./call-store"
export type { CallSlot, CallSlotStatus } from "./call-store"

export {
  pageContextStore,
  usePageContextSnapshot,
  useShellContextSnapshot,
  usePanelContextSnapshot,
  useFieldDescriptorsSnapshot,
  PAGE_CONTEXT_LIMITS,
} from "./page-context-store"

export {
  activeMeetingStore,
  useActiveMeetingStore,
} from "./active-meeting-store"
export type {
  ActiveMeetingState,
  ActiveMeetingStatus,
} from "./active-meeting-store"
export type {
  PageContextSnapshot,
  ShellContextSnapshot,
  PanelContextSnapshot,
  PageEntity,
  PageAction,
  FieldSpec,
} from "./page-context-store"
