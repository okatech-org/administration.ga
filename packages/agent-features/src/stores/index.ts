// Stores Zustand / custom partagés entre agent-web et agent-desktop.
export {
  callStore,
  useCallStore,
} from "./call-store"
export type { CallSlot, CallSlotStatus } from "./call-store"

export {
  pageContextStore,
  usePageContextSnapshot,
  PAGE_CONTEXT_LIMITS,
} from "./page-context-store"
export type {
  PageContextSnapshot,
  PageEntity,
  PageAction,
} from "./page-context-store"
