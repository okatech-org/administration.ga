/**
 * IAstedTrigger3D — Trigger 3D organique pour le CircleMenu en mode vocal.
 *
 * Port adapté de `presidence.ga/src/components/iasted/IAstedButtonFull.tsx`.
 * Conserve les caractéristiques visuelles : heartbeat permanent, membrane
 * organique, ondes émises, glow saturé, micro-respiration.
 *
 * Différences vs source :
 * - `position: relative` (placement géré par le parent CircleMenu)
 * - Drag handlers retirés (le FAB est ancré bottom-right)
 * - Shockwaves retirés (CircleMenu gère ses propres feedbacks)
 * - Couleurs paramétrables via CSS variables (`--iasted-glow-primary` /
 *   `--iasted-glow-secondary`) pour intégration au design system du consumer
 *
 * Le composant est piloté par l'état vocal externe (props `voiceState`,
 * `audioLevel`) — il ne gère pas la connexion WebRTC (cf. `use-realtime-voice`).
 */

"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useState } from "react";
import type { VoiceState } from "../../hooks/use-realtime-voice-types";

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

export interface IAstedTrigger3DProps {
	/** État vocal courant — pilote les animations heartbeat/membrane/wave. */
	voiceState?: VoiceState;
	/** Niveau audio normalisé [0..1] — pilote saturation/brightness en live. */
	audioLevel?: number;
	/** Feedback visuel ponctuel (ex : événement sonore reçu). */
	pulsing?: boolean;
	/** Taille du bouton. */
	size?: "sm" | "md" | "lg";
	/** Indique si la fenêtre iAsted est ouverte (réduit la respiration). */
	isInterfaceOpen?: boolean;
	/** Click handler (tap court). */
	onClick?: () => void;
	/** Pointer down (pour détection long-press côté CircleMenu). */
	onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	/** Pointer up. */
	onPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	/** Pointer cancel / leave. */
	onPointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	/** Label accessibilité (défaut : "Activer iAsted"). */
	ariaLabel?: string;
	/** Indique si le bouton est dans un état "indisponible" (mode vocal off). */
	disabled?: boolean;
	className?: string;
}

// ─────────────────────────────────────────────────────────────
// Constantes de taille
// ─────────────────────────────────────────────────────────────

const SIZE_PX = { sm: 56, md: 80, lg: 120 } as const;

// ─────────────────────────────────────────────────────────────
// CSS injecté (keyframes + couches + variantes vocales)
// ─────────────────────────────────────────────────────────────

const TRIGGER_3D_STYLES = `
:where([data-iasted-trigger-3d]) {
  /* Variables couleur — overridables par le consumer via :root ou parent */
  --iasted-glow-primary: 0 170 255;
  --iasted-glow-secondary: 0 102 255;
  --iasted-glow-highlight: 255 255 255;
}

[data-iasted-trigger-3d] {
  position: relative;
  perspective: 1500px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

[data-iasted-trigger-3d] .thick-matter-button {
  position: relative;
  border-radius: 50%;
  transform-style: preserve-3d;
  will-change: transform, box-shadow, border-radius, filter;
  cursor: pointer;
  border: none;
  outline: none;
  background: radial-gradient(circle at 30% 30%,
    rgb(var(--iasted-glow-highlight) / 0.4) 0%,
    rgb(var(--iasted-glow-primary) / 0.8) 35%,
    rgb(var(--iasted-glow-secondary) / 0.95) 70%,
    rgb(var(--iasted-glow-secondary) / 1) 100%);
  box-shadow:
    0 0 40px rgb(var(--iasted-glow-primary) / 0.4),
    0 0 80px rgb(var(--iasted-glow-primary) / 0.25),
    0 8px 16px rgb(var(--iasted-glow-secondary) / 0.3),
    inset 0 -5px 15px rgb(var(--iasted-glow-secondary) / 0.25),
    inset 0 5px 15px rgb(var(--iasted-glow-highlight) / 0.35);
  transition: filter 0.15s linear;
}

/* Heartbeat permanent (idle) */
[data-iasted-trigger-3d][data-voice-state="idle"] .thick-matter-button,
[data-iasted-trigger-3d][data-voice-state="connecting"] .thick-matter-button {
  animation:
    iasted-heartbeat 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-shadow-pulse 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-micro-breathing 4s ease-in-out infinite;
}

/* Hover : intensification */
[data-iasted-trigger-3d] .thick-matter-button:hover {
  animation:
    iasted-heartbeat-intense 1.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-shadow-pulse-intense 1.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-hover-glow 1.4s ease-in-out infinite;
}

/* Active : contraction musculaire */
[data-iasted-trigger-3d] .thick-matter-button:active {
  animation: iasted-muscle-contraction 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Listening : heartbeat rapide + membrane palpitation */
[data-iasted-trigger-3d][data-voice-state="listening"] .thick-matter-button {
  animation:
    iasted-heartbeat-listening 0.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-shadow-pulse-intense 0.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}

/* Speaking : heartbeat ultra-rapide + glow saturé */
[data-iasted-trigger-3d][data-voice-state="speaking"] .thick-matter-button {
  animation:
    iasted-heartbeat-speaking 0.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-shadow-pulse-speaking 0.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}

/* Thinking / processing : pulse modéré, hue rotate subtil */
[data-iasted-trigger-3d][data-voice-state="thinking"] .thick-matter-button,
[data-iasted-trigger-3d][data-voice-state="processing"] .thick-matter-button {
  animation:
    iasted-heartbeat 1.6s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-thinking-hue 3s linear infinite;
}

/* Disabled : pas d'animation, opacité réduite */
[data-iasted-trigger-3d][data-disabled="true"] .thick-matter-button {
  animation: none !important;
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

/* Couches 3D */
[data-iasted-trigger-3d] .depth-layer {
  position: absolute;
  inset: 5%;
  border-radius: 50%;
  background: radial-gradient(circle at center,
    rgb(var(--iasted-glow-highlight) / 0.1) 0%,
    rgb(var(--iasted-glow-secondary) / 0.1) 60%,
    rgb(var(--iasted-glow-primary) / 0.05) 80%);
  filter: blur(2px);
  opacity: 0.4;
  transform: translateZ(-10px);
  pointer-events: none;
}

[data-iasted-trigger-3d] .highlight-layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg,
    transparent 30%,
    rgb(var(--iasted-glow-highlight) / 0.1) 45%,
    rgb(var(--iasted-glow-highlight) / 0.2) 50%,
    rgb(var(--iasted-glow-highlight) / 0.1) 55%,
    transparent 70%);
  transform: translateZ(15px) rotate(45deg);
  opacity: 0.4;
  filter: blur(2px);
  mix-blend-mode: overlay;
  pointer-events: none;
  animation: iasted-highlight-pulse 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}

/* Membrane organique (visible en mode vocal) */
[data-iasted-trigger-3d] .organic-membrane {
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgb(var(--iasted-glow-primary) / 0.3) 0%,
    rgb(var(--iasted-glow-primary) / 0.15) 50%,
    transparent 70%);
  filter: blur(3px);
  opacity: 0;
  transform: scale(1) translateZ(15px);
  pointer-events: none;
  transition: opacity 0.2s ease;
}

[data-iasted-trigger-3d][data-voice-state="listening"] .organic-membrane {
  opacity: 1;
  animation: iasted-membrane-listening 0.6s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}

[data-iasted-trigger-3d][data-voice-state="speaking"] .organic-membrane {
  opacity: 1;
  animation: iasted-membrane-speaking 0.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}

/* Onde émise (visible en mode vocal) */
[data-iasted-trigger-3d] .wave-emission {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgb(var(--iasted-glow-primary) / 0.5);
  pointer-events: none;
  opacity: 0;
}

[data-iasted-trigger-3d][data-voice-state="listening"] .wave-emission {
  animation: iasted-wave-listening 1s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

[data-iasted-trigger-3d][data-voice-state="speaking"] .wave-emission {
  animation: iasted-wave-speaking 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

/* Icône centrale */
[data-iasted-trigger-3d] .trigger-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateZ(20px);
  color: rgb(var(--iasted-glow-highlight));
  pointer-events: none;
  z-index: 2;
}

/* Pulsing : feedback ponctuel */
[data-iasted-trigger-3d][data-pulsing="true"] .thick-matter-button {
  animation: iasted-pulsing 0.6s ease-out;
}

/* ───── Keyframes ───── */

@keyframes iasted-heartbeat {
  0% { transform: scale3d(1, 1, 1); border-radius: 50%; filter: brightness(1); }
  6% { transform: scale3d(1.14, 1.1, 1.18) rotate(-1.5deg); border-radius: 38% 62% 58% 42% / 55% 45% 58% 42%; filter: brightness(1.15); }
  9% { transform: scale3d(1.2, 1.16, 1.24) rotate(0.8deg); border-radius: 35% 65% 62% 38% / 58% 42% 60% 40%; filter: brightness(1.2); }
  18% { transform: scale3d(0.86, 0.9, 0.82); border-radius: 58% 42% 45% 55% / 42% 58% 44% 56%; filter: brightness(0.86); }
  30% { transform: scale3d(1.12, 1.09, 1.15) rotate(0.6deg); border-radius: 40% 60% 58% 42% / 59% 41% 57% 43%; filter: brightness(1.11); }
  100% { transform: scale3d(1, 1, 1); border-radius: 50%; filter: brightness(1); }
}

@keyframes iasted-heartbeat-intense {
  0% { transform: scale3d(1, 1, 1); filter: brightness(1) saturate(1.7); border-radius: 50%; }
  9% { transform: scale3d(1.3, 1.25, 1.35) rotate(1deg); border-radius: 32% 68% 65% 35% / 62% 38% 64% 36%; filter: brightness(1.5) saturate(2.8); }
  18% { transform: scale3d(0.8, 0.84, 0.76); border-radius: 62% 38% 42% 58% / 38% 62% 40% 60%; filter: brightness(0.8) saturate(1.3); }
  100% { transform: scale3d(1, 1, 1); filter: brightness(1) saturate(1.7); border-radius: 50%; }
}

@keyframes iasted-heartbeat-listening {
  0%, 100% { transform: scale3d(1, 1, 1); border-radius: 50%; filter: brightness(1.2) saturate(2); }
  25% { transform: scale3d(1.15, 1.18, 1.12) rotate(3deg); border-radius: 35% 65% 62% 38% / 58% 42% 60% 40%; filter: brightness(1.5) saturate(2.8); }
  50% { transform: scale3d(1.08, 1.05, 1.1) rotate(-2deg); border-radius: 45% 55% 52% 48% / 48% 52% 46% 54%; filter: brightness(1.3) saturate(2.3); }
  75% { transform: scale3d(1.12, 1.15, 1.1) rotate(2deg); border-radius: 40% 60% 58% 42% / 54% 46% 56% 44%; filter: brightness(1.4) saturate(2.5); }
}

@keyframes iasted-heartbeat-speaking {
  0% { transform: scale3d(1, 1, 1); border-radius: 50%; filter: brightness(1.3) saturate(2.2); }
  25% { transform: scale3d(1.18, 1.22, 1.15) rotate(4deg); border-radius: 32% 68% 62% 38% / 60% 40% 58% 42%; filter: brightness(1.6) saturate(3); }
  50% { transform: scale3d(0.92, 0.95, 0.9) rotate(-3deg); border-radius: 58% 42% 48% 52% / 44% 56% 46% 54%; filter: brightness(1.2) saturate(2); }
  75% { transform: scale3d(1.14, 1.17, 1.12) rotate(2deg); border-radius: 38% 62% 56% 44% / 56% 44% 58% 42%; filter: brightness(1.5) saturate(2.6); }
  100% { transform: scale3d(1, 1, 1); border-radius: 50%; filter: brightness(1.3) saturate(2.2); }
}

@keyframes iasted-shadow-pulse {
  0%, 100% { box-shadow: 0 0 40px rgb(var(--iasted-glow-primary) / 0.4), 0 0 80px rgb(var(--iasted-glow-primary) / 0.25), inset 0 -5px 15px rgb(var(--iasted-glow-secondary) / 0.25); }
  6% { box-shadow: 0 0 60px rgb(var(--iasted-glow-primary) / 0.5), 0 0 120px rgb(var(--iasted-glow-primary) / 0.35), inset 0 -8px 20px rgb(var(--iasted-glow-secondary) / 0.3); }
}

@keyframes iasted-shadow-pulse-intense {
  0%, 100% { box-shadow: 0 0 50px rgb(var(--iasted-glow-primary) / 0.5), 0 0 100px rgb(var(--iasted-glow-primary) / 0.35); }
  50% { box-shadow: 0 0 80px rgb(var(--iasted-glow-primary) / 0.8), 0 0 160px rgb(var(--iasted-glow-primary) / 0.5); }
}

@keyframes iasted-shadow-pulse-speaking {
  0%, 100% { box-shadow: 0 0 60px rgb(var(--iasted-glow-primary) / 0.7), 0 0 120px rgb(var(--iasted-glow-primary) / 0.5); }
  50% { box-shadow: 0 0 100px rgb(var(--iasted-glow-primary) / 1), 0 0 200px rgb(var(--iasted-glow-primary) / 0.7), 0 0 280px rgb(var(--iasted-glow-primary) / 0.4); }
}

@keyframes iasted-hover-glow {
  0%, 100% { filter: brightness(1.1) saturate(1.5); }
  50% { filter: brightness(1.3) saturate(2); }
}

@keyframes iasted-highlight-pulse {
  0%, 100% { opacity: 0.4; transform: translateZ(15px) rotate(45deg) scale(1); }
  9% { opacity: 0.7; transform: translateZ(20px) rotate(45deg) scale(1.08); }
  18% { opacity: 0.25; transform: translateZ(10px) rotate(45deg) scale(0.92); }
}

@keyframes iasted-micro-breathing {
  0%, 100% { transform: scale(1) translateZ(0); }
  50% { transform: scale(0.98) translateZ(-2px); }
}

@keyframes iasted-muscle-contraction {
  0% { transform: scale3d(1, 1, 1); filter: brightness(1) saturate(1.7); border-radius: 50%; }
  35% { transform: scale3d(0.82, 0.78, 0.86) rotateX(4deg); filter: brightness(0.78) saturate(2.5); border-radius: 62% 38% 41% 59% / 40% 60% 39% 61%; }
  65% { transform: scale3d(0.95, 0.94, 0.96); filter: brightness(0.98) saturate(2.3); border-radius: 54% 46% 47% 53% / 46% 54% 45% 55%; }
  100% { transform: scale3d(1, 1, 1); filter: brightness(1) saturate(1.7); border-radius: 50%; }
}

@keyframes iasted-membrane-listening {
  0%, 100% { opacity: 0.8; transform: scale(1.2) translateZ(15px); filter: blur(2px); }
  50% { opacity: 1; transform: scale(1.5) translateZ(30px); filter: blur(5px); }
}

@keyframes iasted-membrane-speaking {
  0%, 100% { opacity: 0.9; transform: scale(1.1) translateZ(10px); filter: blur(1px); }
  50% { opacity: 1; transform: scale(1.35) translateZ(25px); filter: blur(4px); }
}

@keyframes iasted-wave-listening {
  0% { transform: scale3d(0.9, 0.9, 1); opacity: 0.8; filter: blur(0); }
  100% { transform: scale3d(2.5, 2.5, 1.5); opacity: 0; filter: blur(15px); }
}

@keyframes iasted-wave-speaking {
  0% { transform: scale3d(1, 1, 1); opacity: 0.7; filter: blur(0); }
  100% { transform: scale3d(2.2, 2.2, 1.4); opacity: 0; filter: blur(12px); }
}

@keyframes iasted-thinking-hue {
  0%, 100% { filter: hue-rotate(0deg) brightness(1.1); }
  50% { filter: hue-rotate(20deg) brightness(1.25); }
}

@keyframes iasted-pulsing {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* Reduced motion : désactive toutes les animations, garde le visuel statique */
@media (prefers-reduced-motion: reduce) {
  [data-iasted-trigger-3d] .thick-matter-button,
  [data-iasted-trigger-3d] .highlight-layer,
  [data-iasted-trigger-3d] .organic-membrane,
  [data-iasted-trigger-3d] .wave-emission {
    animation: none !important;
  }
}
`;

// ─────────────────────────────────────────────────────────────
// Helper : injection unique du style
// ─────────────────────────────────────────────────────────────

const STYLE_ID = "iasted-trigger-3d-styles";

function useInjectStyles() {
	useEffect(() => {
		if (typeof document === "undefined") return;
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = TRIGGER_3D_STYLES;
		document.head.appendChild(style);
		// On laisse le style en place même au démontage : plusieurs triggers
		// peuvent coexister, et le coût mémoire est négligeable.
	}, []);
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function IAstedTrigger3D({
	voiceState = "idle",
	audioLevel = 0,
	pulsing = false,
	size = "md",
	isInterfaceOpen = false,
	onClick,
	onPointerDown,
	onPointerUp,
	onPointerCancel,
	ariaLabel,
	disabled = false,
	className,
}: IAstedTrigger3DProps) {
	useInjectStyles();

	// Gate hydration : applique les classes d'animation après mount côté client
	// pour éviter les mismatches SSR (3D transforms).
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const px = SIZE_PX[size];

	// Audio level → ajustement live brightness/saturation pendant écoute/parole
	const dynamicFilter: CSSProperties = (() => {
		if (voiceState !== "listening" && voiceState !== "speaking") return {};
		const level = Math.min(1, Math.max(0, audioLevel));
		const brightness = 1.2 + level * 0.4;
		const saturation = 1.8 + level * 1.2;
		return { filter: `brightness(${brightness}) saturate(${saturation})` };
	})();

	const label =
		ariaLabel ??
		(disabled
			? "Mode vocal indisponible"
			: isInterfaceOpen
				? "iAsted ouvert — maintenir pour parler"
				: "Activer iAsted — maintenir pour parler");

	return (
		<div
			data-iasted-trigger-3d
			data-voice-state={isMounted ? voiceState : "idle"}
			data-pulsing={pulsing ? "true" : "false"}
			data-disabled={disabled ? "true" : "false"}
			suppressHydrationWarning
			style={{ width: px, height: px }}
			className={className}
		>
			<button
				type="button"
				className="thick-matter-button"
				style={{ width: px, height: px, ...dynamicFilter }}
				onClick={disabled ? undefined : onClick}
				onPointerDown={disabled ? undefined : onPointerDown}
				onPointerUp={disabled ? undefined : onPointerUp}
				onPointerCancel={disabled ? undefined : onPointerCancel}
				onPointerLeave={disabled ? undefined : onPointerCancel}
				aria-label={label}
				aria-pressed={voiceState !== "idle" && voiceState !== "connecting"}
				disabled={disabled}
			>
				<span className="depth-layer" aria-hidden />
				<span className="highlight-layer" aria-hidden />
				<span className="organic-membrane" aria-hidden />
				<span className="wave-emission" aria-hidden />
			</button>
		</div>
	);
}
