/**
 * MotorSynapse — Bus de commandes pour le curseur visuel iAsted.
 *
 * Port condensé depuis `mairie.ga/src/Consciousness/MotorCortex/MotorSynapse.ts`.
 *
 * Pattern : singleton + pubsub. Émet des `MotorCommand` consommés par
 * `useIAstedCursor` (qui anime l'orbe à l'écran).
 *
 * Cas d'usage :
 *   - L'agent vocal annonce une action → MotorSynapse.pulse('medium', 500)
 *   - L'agent navigue vers un module → MotorSynapse.moveToElement('iappel-tab')
 *   - L'agent termine de parler → MotorSynapse.notifySpeechComplete()
 */

export type CursorEmotion =
	| "neutral"
	| "happy"
	| "concerned"
	| "excited"
	| "formal";

export type PulseIntensity = "subtle" | "medium" | "strong";

export type MotorCommand =
	| {
			type: "MOVE_TO";
			target: { elementId: string } | { x: number; y: number };
			speed: "slow" | "normal" | "fast";
			easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
	  }
	| {
			type: "GAZE_AT";
			elementId: string;
			duration: number;
			highlight: boolean;
	  }
	| {
			type: "INTERACT";
			action: "click" | "type";
			delay?: number;
			payload?: { text?: string };
	  }
	| {
			type: "VOCALIZE";
			emotion: CursorEmotion;
	  }
	| {
			type: "PULSE";
			intensity: PulseIntensity;
			duration: number;
	  }
	| {
			type: "THINK";
			duration: number;
	  }
	| {
			type: "IDLE";
			position: "corner" | "center" | "stay";
	  };

type Listener = (cmd: MotorCommand) => void;
type CompletionListener = () => void;

class MotorSynapseImpl {
	private commandListeners: Set<Listener> = new Set();
	private movementListeners: Set<CompletionListener> = new Set();
	private speechListeners: Set<CompletionListener> = new Set();
	private interactionListeners: Set<CompletionListener> = new Set();

	// ─── Subscriptions ───
	public onCommand(listener: Listener): () => void {
		this.commandListeners.add(listener);
		return () => this.commandListeners.delete(listener);
	}

	public onMovementComplete(listener: CompletionListener): () => void {
		this.movementListeners.add(listener);
		return () => this.movementListeners.delete(listener);
	}

	public onSpeechComplete(listener: CompletionListener): () => void {
		this.speechListeners.add(listener);
		return () => this.speechListeners.delete(listener);
	}

	public onInteractionComplete(listener: CompletionListener): () => void {
		this.interactionListeners.add(listener);
		return () => this.interactionListeners.delete(listener);
	}

	// ─── Emit commands (high-level API) ───

	public moveTo(
		elementId: string,
		speed: "slow" | "normal" | "fast" = "normal",
	): void {
		this.emit({
			type: "MOVE_TO",
			target: { elementId },
			speed,
			easing: "easeInOut",
		});
	}

	public moveToPosition(
		x: number,
		y: number,
		speed: "slow" | "normal" | "fast" = "normal",
	): void {
		this.emit({
			type: "MOVE_TO",
			target: { x, y },
			speed,
			easing: "easeInOut",
		});
	}

	public gazeAt(
		elementId: string,
		duration = 1500,
		highlight = true,
	): void {
		this.emit({ type: "GAZE_AT", elementId, duration, highlight });
	}

	public click(): void {
		this.emit({ type: "INTERACT", action: "click", delay: 200 });
	}

	public type(text: string): void {
		this.emit({ type: "INTERACT", action: "type", delay: 200, payload: { text } });
	}

	public speak(_text: string, emotion: CursorEmotion = "neutral"): void {
		this.emit({ type: "VOCALIZE", emotion });
	}

	public pulse(intensity: PulseIntensity = "medium", duration = 600): void {
		this.emit({ type: "PULSE", intensity, duration });
	}

	public think(duration = 1200): void {
		this.emit({ type: "THINK", duration });
	}

	public idle(position: "corner" | "center" | "stay" = "corner"): void {
		this.emit({ type: "IDLE", position });
	}

	/** Séquence d'accueil pour le réveil d'iAsted. */
	public welcomeSequence(): void {
		this.pulse("strong", 800);
		setTimeout(() => this.idle("corner"), 900);
	}

	// ─── Completion notifications ───
	public notifyMovementComplete(): void {
		this.movementListeners.forEach((l) => l());
	}
	public notifySpeechComplete(): void {
		this.speechListeners.forEach((l) => l());
	}
	public notifyInteractionComplete(): void {
		this.interactionListeners.forEach((l) => l());
	}

	private emit(cmd: MotorCommand): void {
		this.commandListeners.forEach((l) => l(cmd));
	}
}

export const MotorSynapse = new MotorSynapseImpl();
