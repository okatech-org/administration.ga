/**
 * VoiceFloatingTranscription — Overlay flottant compact qui affiche
 * les 2 derniers tours de la conversation vocale, ainsi qu'un bouton
 * raccrocher. À rendre quand une session vocale est active ET que la
 * fenêtre iAsted est fermée — pour que l'utilisateur puisse naviguer
 * librement sans perdre le contexte de l'échange.
 *
 * Positionné au-dessus du CircleMenu FAB (bottom-right), semi-transparent,
 * avec une pulsation visuelle quand le modèle parle.
 */

"use client";

import { PhoneOff } from "lucide-react";
import type { RealtimeMessage, VoiceState } from "../../hooks/use-realtime-voice-types";

export interface VoiceFloatingTranscriptionProps {
	messages: RealtimeMessage[];
	voiceState: VoiceState;
	onHangUp: () => void;
	/** Décalage horizontal optionnel (utilisé quand le side panel iAsted
	 *  est ouvert pour éviter le chevauchement). En pixels depuis la droite. */
	rightOffsetPx?: number;
}

export function VoiceFloatingTranscription({
	messages,
	voiceState,
	onHangUp,
	rightOffsetPx = 62,
}: VoiceFloatingTranscriptionProps) {
	// Garde les 2 derniers messages (user + assistant) pour rester compact.
	const lastTwo = messages.slice(-2);

	const isSpeaking = voiceState === "speaking";
	const isListening = voiceState === "listening";

	return (
		<div
			role="region"
			aria-label="Conversation vocale en cours"
			className="fixed bottom-[160px] z-40 hidden lg:flex print:hidden flex-col gap-2 max-w-[360px] min-w-[260px]"
			style={{ right: rightOffsetPx }}
		>
			{/* Carte transcription — affichée uniquement s'il y a des messages */}
			{lastTwo.length > 0 && (
				<div className="rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur-sm shadow-lg p-3 flex flex-col gap-2">
					<div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
						<span
							className={
								isSpeaking
									? "h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
									: isListening
										? "h-2 w-2 rounded-full bg-amber-500"
										: "h-2 w-2 rounded-full bg-muted-foreground/50"
							}
							aria-hidden
						/>
						<span className="font-semibold">
							{isSpeaking
								? "iAsted parle"
								: isListening
									? "iAsted écoute"
									: "Conversation vocale"}
						</span>
					</div>
					{lastTwo.map((m) => (
						<div key={m.id} className="flex flex-col gap-0.5">
							<span className="text-[10px] font-semibold text-muted-foreground">
								{m.role === "user" ? "Vous" : "iAsted"}
							</span>
							<p className="text-xs text-foreground leading-snug line-clamp-3">
								{m.content}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Bouton raccrocher visible même sans messages (sécurité d'accès
			    si l'utilisateur veut simplement raccrocher sans rouvrir le FAB). */}
			<button
				type="button"
				onClick={onHangUp}
				className="self-end inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 shadow-md transition-colors"
				aria-label="Raccrocher la conversation vocale"
			>
				<PhoneOff size={14} />
				Raccrocher
			</button>
		</div>
	);
}
