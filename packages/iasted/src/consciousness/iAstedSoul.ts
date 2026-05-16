/**
 * iAstedSoul — Conscience singleton de l'agent iAsted.
 *
 * Port depuis `mairie.ga/src/Consciousness/iAstedSoul.ts` adapté au contexte
 * gabon-diplomatie (rôles diplomatiques au lieu de municipaux, état couplé au
 * voiceState du provider OpenAI Realtime).
 *
 * Architecture :
 *   - Singleton state manager (pattern observer)
 *   - Persona adaptatif selon le rôle utilisateur
 *   - Spatial awareness (DOM scan, route courante)
 *   - Context memory (conversation, intents, actions pending/completed)
 *   - Lifecycle states (isAwake, isListening, isSpeaking, isProcessing)
 *
 * Distinct de :
 *   - `useRealtimeVoice` qui gère le canal WebRTC/Audio bas niveau
 *   - `useIAstedHost` qui orchestre l'agent voix-tools côté backoffice/agent
 *
 * Ce singleton est une couche AU-DESSUS, qui :
 *   1. Synchronise son état avec le voiceController
 *   2. Expose un état riche à l'UI (persona, spatial, context)
 *   3. Pilote le MotorSynapse pour le curseur visuel
 */

import type { VoiceState } from "../hooks/use-realtime-voice-types";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type IAstedRole =
	| "super_admin"
	| "admin"
	| "admin_system"
	| "sous_admin"
	| "ambassador"
	| "consul_general"
	| "consul"
	| "vice_consul"
	| "diplomat"
	| "agent"
	| "citizen"
	| "anonymous";

/** Niveaux de formalité 1=Technique, 2=Cordial, 3=Protocolaire. */
export type FormalityLevel = 1 | 2 | 3;

export type EmotionalState =
	| "neutral"
	| "welcoming"
	| "helpful"
	| "respectful"
	| "apologetic"
	| "celebratory"
	| "focused";

export interface Persona {
	role: IAstedRole;
	/** Apostrophe formelle ("Excellence", "Cher collègue", etc.). */
	honorificPrefix: string;
	formalityLevel: FormalityLevel;
	language: "fr" | "en";
	voiceStyle: "professional" | "warm" | "respectful";
}

export interface SpatialAwareness {
	currentUrl: string;
	currentPage: string;
	visibleElements: string[];
	focusedElement: string | null;
	scrollPosition: number;
	viewportSize: { width: number; height: number };
}

export interface ConversationContext {
	sessionId: string;
	startedAt: number;
	messageCount: number;
	lastIntent: string | null;
	pendingActions: string[];
	completedActions: string[];
	emotionalTone: EmotionalState;
}

export interface KnownUser {
	id: string | null;
	name: string | null;
	firstName: string | null;
	role: IAstedRole;
	organization: string | null;
	isAuthenticated: boolean;
	lastSeen: number;
}

export interface SoulState {
	persona: Persona;
	spatial: SpatialAwareness;
	context: ConversationContext;
	user: KnownUser;
	isAwake: boolean;
	isListening: boolean;
	isSpeaking: boolean;
	isProcessing: boolean;
}

// ─────────────────────────────────────────────────────────────
// Helpers — Dérivation du persona
// ─────────────────────────────────────────────────────────────

export function derivePersonaFromRole(role: IAstedRole): Persona {
	switch (role) {
		case "ambassador":
			return {
				role,
				honorificPrefix: "Excellence, Monsieur l'Ambassadeur",
				formalityLevel: 3,
				language: "fr",
				voiceStyle: "respectful",
			};
		case "consul_general":
			return {
				role,
				honorificPrefix: "Monsieur le Consul Général",
				formalityLevel: 3,
				language: "fr",
				voiceStyle: "respectful",
			};
		case "consul":
			return {
				role,
				honorificPrefix: "Monsieur le Consul",
				formalityLevel: 3,
				language: "fr",
				voiceStyle: "respectful",
			};
		case "vice_consul":
			return {
				role,
				honorificPrefix: "Monsieur le Vice-Consul",
				formalityLevel: 3,
				language: "fr",
				voiceStyle: "respectful",
			};
		case "super_admin":
		case "admin_system":
			return {
				role,
				honorificPrefix: "Administrateur",
				formalityLevel: 1,
				language: "fr",
				voiceStyle: "professional",
			};
		case "admin":
		case "sous_admin":
			return {
				role,
				honorificPrefix: "Monsieur le Responsable",
				formalityLevel: 2,
				language: "fr",
				voiceStyle: "professional",
			};
		case "diplomat":
			return {
				role,
				honorificPrefix: "Cher collègue diplomate",
				formalityLevel: 2,
				language: "fr",
				voiceStyle: "professional",
			};
		case "agent":
			return {
				role,
				honorificPrefix: "Cher collègue",
				formalityLevel: 2,
				language: "fr",
				voiceStyle: "warm",
			};
		case "citizen":
			return {
				role,
				honorificPrefix: "Cher ressortissant",
				formalityLevel: 2,
				language: "fr",
				voiceStyle: "warm",
			};
		default:
			return {
				role: "anonymous",
				honorificPrefix: "Cher visiteur",
				formalityLevel: 2,
				language: "fr",
				voiceStyle: "warm",
			};
	}
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

class IAstedSoulImpl {
	private state: SoulState;
	private listeners: Set<(state: SoulState) => void> = new Set();

	constructor() {
		this.state = this.createInitialState();
	}

	private createInitialState(): SoulState {
		return {
			persona: derivePersonaFromRole("anonymous"),
			spatial: {
				currentUrl: typeof window !== "undefined" ? window.location.href : "",
				currentPage: "Inconnue",
				visibleElements: [],
				focusedElement: null,
				scrollPosition: 0,
				viewportSize: {
					width: typeof window !== "undefined" ? window.innerWidth : 1280,
					height: typeof window !== "undefined" ? window.innerHeight : 800,
				},
			},
			context: this.createNewContext(),
			user: {
				id: null,
				name: null,
				firstName: null,
				role: "anonymous",
				organization: null,
				isAuthenticated: false,
				lastSeen: Date.now(),
			},
			isAwake: false,
			isListening: false,
			isSpeaking: false,
			isProcessing: false,
		};
	}

	private createNewContext(): ConversationContext {
		return {
			sessionId: `soul-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			startedAt: Date.now(),
			messageCount: 0,
			lastIntent: null,
			pendingActions: [],
			completedActions: [],
			emotionalTone: "neutral",
		};
	}

	// ========== PERSONA ==========

	public recognizeUser(user: Partial<KnownUser>): void {
		// Idempotent : skip si rien n'a changé.
		const current = this.state.user;
		let changed = false;
		(Object.keys(user) as Array<keyof KnownUser>).forEach((k) => {
			if (user[k] !== undefined && user[k] !== current[k]) {
				changed = true;
			}
		});
		if (!changed) return;

		this.state.user = {
			...this.state.user,
			...user,
			lastSeen: Date.now(),
		};
		if (user.role && user.role !== current.role) {
			this.state.persona = derivePersonaFromRole(user.role);
		}
		this.notify();
	}

	// ========== SPATIAL AWARENESS ==========

	public updateSpatial(spatial: Partial<SpatialAwareness>): void {
		// Idempotent : ne notifie que si quelque chose a réellement changé.
		let changed = false;
		const current = this.state.spatial;
		(Object.keys(spatial) as Array<keyof SpatialAwareness>).forEach((k) => {
			const a: any = spatial[k];
			const b: any = current[k];
			if (typeof a === "object" && a !== null && b !== null && typeof b === "object") {
				// Comparaison shallow pour viewportSize
				if (JSON.stringify(a) !== JSON.stringify(b)) {
					changed = true;
				}
			} else if (a !== b) {
				changed = true;
			}
		});
		if (!changed) return;
		this.state.spatial = { ...this.state.spatial, ...spatial };
		this.notify();
	}

	public scanVisibleElements(): string[] {
		if (typeof document === "undefined") return [];
		const interactive = document.querySelectorAll(
			'button, input, textarea, select, a, [role="button"], [tabindex]',
		);
		const visible: string[] = [];
		interactive.forEach((el) => {
			const rect = el.getBoundingClientRect();
			if (
				rect.top < window.innerHeight &&
				rect.bottom > 0 &&
				(el as HTMLElement).id
			) {
				visible.push((el as HTMLElement).id);
			}
		});
		this.state.spatial.visibleElements = visible;
		return visible;
	}

	// ========== CONTEXT MEMORY ==========

	public recordIntent(intent: string): void {
		this.state.context.lastIntent = intent;
		this.state.context.messageCount += 1;
		this.notify();
	}

	public queueAction(action: string): void {
		this.state.context.pendingActions.push(action);
		this.notify();
	}

	public completeAction(action: string): void {
		const idx = this.state.context.pendingActions.indexOf(action);
		if (idx > -1) this.state.context.pendingActions.splice(idx, 1);
		this.state.context.completedActions.push(action);
		this.notify();
	}

	public setEmotionalState(emotion: EmotionalState): void {
		this.state.context.emotionalTone = emotion;
		this.notify();
	}

	// ========== LIFECYCLE ==========

	public awaken(): void {
		if (this.state.isAwake) return;
		this.state.isAwake = true;
		this.notify();
	}

	public sleep(): void {
		if (!this.state.isAwake) return;
		this.state.isAwake = false;
		this.state.isListening = false;
		this.state.isSpeaking = false;
		this.notify();
	}

	/** Synchronise l'état avec un VoiceState du provider OpenAI Realtime.
	 *  Idempotent : ne notifie pas si rien n'a changé. */
	public syncWithVoiceState(voiceState: VoiceState): void {
		const nextListening = voiceState === "listening";
		const nextSpeaking = voiceState === "speaking";
		const nextProcessing =
			voiceState === "thinking" ||
			voiceState === "processing" ||
			voiceState === "connecting";
		if (
			this.state.isListening === nextListening &&
			this.state.isSpeaking === nextSpeaking &&
			this.state.isProcessing === nextProcessing
		) {
			return;
		}
		this.state.isListening = nextListening;
		this.state.isSpeaking = nextSpeaking;
		this.state.isProcessing = nextProcessing;
		this.notify();
	}

	// ========== STATE ACCESS ==========

	public getState(): Readonly<SoulState> {
		return { ...this.state };
	}

	public subscribe(listener: (state: SoulState) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		const copy = { ...this.state };
		this.listeners.forEach((l) => l(copy));
	}

	public reset(): void {
		this.state = this.createInitialState();
		this.notify();
	}
}

export const iAstedSoul = new IAstedSoulImpl();
