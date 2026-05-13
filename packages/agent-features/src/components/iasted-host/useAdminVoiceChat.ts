/**
 * useAdminVoiceChat — STUB (mai 2026)
 *
 * Le système vocal Gemini Live a été retiré au profit d'OpenAI Realtime.
 * Le hook reste exporté en shim no-op pour préserver les imports existants
 * (`useIAstedChat`, `IAstedSidePanel`, etc.) sans casser leurs types. Tous
 * les consommateurs continuent de fonctionner — simplement, le « mode
 * vocal Gemini » est désactivé en permanence (`isAvailable: false`).
 *
 * Pour activer la voix, utiliser le controller Realtime fourni via
 * `useIAstedVoiceController()` (cf. `apps/agent-web/src/components/iasted/use-iasted-host.ts`).
 */

export type PendingConfirmation = {
	toolName: string;
	toolArgs: Record<string, unknown>;
	callId: string;
	description: string;
};

type VoiceState =
	| "idle"
	| "connecting"
	| "listening"
	| "processing"
	| "speaking"
	| "error";

interface UseAdminVoiceChatReturn {
	state: VoiceState;
	error: string | null;
	isSupported: boolean;
	isAvailable: boolean;
	isOpen: boolean;
	pendingConfirmation: PendingConfirmation | null;
	isConfirming: boolean;
	startVoice: () => Promise<void>;
	stopVoice: () => void;
	toggleVoice: () => Promise<void>;
	openOverlay: () => void;
	closeOverlay: () => void;
	confirmPending: () => Promise<void>;
	rejectPending: () => void;
}

const NOOP_ASYNC = async () => {
	/* no-op */
};
const NOOP = () => {
	/* no-op */
};

const STUB: UseAdminVoiceChatReturn = {
	state: "idle",
	error: null,
	isSupported: false,
	isAvailable: false,
	isOpen: false,
	pendingConfirmation: null,
	isConfirming: false,
	startVoice: NOOP_ASYNC,
	stopVoice: NOOP,
	toggleVoice: NOOP_ASYNC,
	openOverlay: NOOP,
	closeOverlay: NOOP,
	confirmPending: NOOP_ASYNC,
	rejectPending: NOOP,
};

export function useAdminVoiceChat(): UseAdminVoiceChatReturn {
	return STUB;
}
