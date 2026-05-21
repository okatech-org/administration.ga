// Re-export from the shared package so every consumer (GlobalCallAlert in the
// shell package and IAstedCallTab/ActiveCallBanner in agent-web) references
// the same singleton store. Two copies would produce divergent state.
export { callStore, useCallStore } from "@workspace/agent-features/stores";
export type {
	CallSlot,
	CallSlotStatus,
} from "@workspace/agent-features/stores";
