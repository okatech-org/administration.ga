/**
 * IAstedCursor — Orbe visuel qui matérialise l'attention d'iAsted à l'écran.
 *
 * Port condensé depuis `mairie.ga` (CursorController + IAstedCursor).
 *
 * Le composant écoute `MotorSynapse` et anime un orbe SVG/CSS qui :
 *   - se déplace vers un élément (`MOVE_TO`)
 *   - regarde un élément avec surlignage (`GAZE_AT`)
 *   - clique / tape (`INTERACT`)
 *   - vocalise avec pulsation (`VOCALIZE`)
 *   - pulse (`PULSE`)
 *   - réfléchit (`THINK`)
 *   - va en idle bottom-right (`IDLE`)
 *
 * Usage côté consumer : `<IAstedCursor />` quelque part en haut de l'app.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotorSynapse, type MotorCommand } from "./MotorSynapse";

const CURSOR_STYLES = `
.iasted-orb-cursor {
	position: fixed;
	pointer-events: none;
	z-index: 9998;
	transition: opacity 0.3s ease;
}
.iasted-orb-cursor--thinking { animation: iasted-orb-think 1s ease-in-out infinite; }
@keyframes iasted-orb-think {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.1); }
}
.iasted-orb-cursor--speaking { animation: iasted-orb-speak 0.4s ease-in-out infinite alternate; }
@keyframes iasted-orb-speak {
	from { transform: scale(1); }
	to { transform: scale(1.08); }
}
.iasted-orb-cursor--clicking { animation: iasted-orb-click 0.2s ease-out; }
@keyframes iasted-orb-click {
	0% { transform: scale(1); }
	50% { transform: scale(0.85); }
	100% { transform: scale(1); }
}
.iasted-orb-highlight {
	outline: 2px solid rgb(16 185 129);
	outline-offset: 2px;
	transition: outline 0.3s ease;
}
`;

interface CursorPosition {
	x: number;
	y: number;
}

type CursorAnimation = "idle" | "moving" | "clicking" | "typing" | "thinking" | "speaking";

interface CursorState {
	position: CursorPosition;
	isVisible: boolean;
	animation: CursorAnimation;
	pulseIntensity: "none" | "subtle" | "medium" | "strong";
	emotion: "neutral" | "happy" | "concerned" | "excited" | "formal";
}

export interface IAstedCursorProps {
	size?: number;
	primaryColor?: string;
	glowColor?: string;
	enabled?: boolean;
	zIndex?: number;
}

const SPEED_DURATIONS: Record<"slow" | "normal" | "fast", number> = {
	slow: 1000,
	normal: 500,
	fast: 250,
};

const EASING_FNS = {
	linear: (t: number) => t,
	easeIn: (t: number) => t * t,
	easeOut: (t: number) => t * (2 - t),
	easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

const PULSE_INTENSITY_PX: Record<"subtle" | "medium" | "strong", string> = {
	subtle: "0 0 10px",
	medium: "0 0 20px",
	strong: "0 0 40px",
};

const EMOTION_COLOR: Record<CursorState["emotion"], string> = {
	neutral: "rgb(16 185 129)", // emerald-500
	happy: "rgb(74 222 128)",
	excited: "rgb(250 204 21)",
	concerned: "rgb(249 115 22)",
	formal: "rgb(59 130 246)",
};

export function IAstedCursor({
	size = 32,
	primaryColor = "rgb(16 185 129)",
	glowColor = "rgba(16, 185, 129, 0.4)",
	enabled = true,
	zIndex = 9998,
}: IAstedCursorProps) {
	const [state, setState] = useState<CursorState>(() => ({
		position: {
			x: typeof window !== "undefined" ? window.innerWidth - 100 : 0,
			y: typeof window !== "undefined" ? window.innerHeight - 100 : 0,
		},
		isVisible: false,
		animation: "idle",
		pulseIntensity: "none",
		emotion: "neutral",
	}));

	const rafRef = useRef<number | null>(null);
	const positionRef = useRef<CursorPosition>(state.position);
	positionRef.current = state.position;

	// Style injection
	useEffect(() => {
		if (typeof document === "undefined") return;
		const styleId = "iasted-orb-cursor-styles";
		if (document.getElementById(styleId)) return;
		const style = document.createElement("style");
		style.id = styleId;
		style.textContent = CURSOR_STYLES;
		document.head.appendChild(style);
	}, []);

	const animateTo = useCallback(
		(targetX: number, targetY: number, duration: number, easing: keyof typeof EASING_FNS = "easeInOut") => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			const start = positionRef.current;
			const startTime = performance.now();
			setState((p) => ({ ...p, animation: "moving" }));
			const tick = (now: number) => {
				const t = Math.min((now - startTime) / duration, 1);
				const eased = EASING_FNS[easing](t);
				const x = start.x + (targetX - start.x) * eased;
				const y = start.y + (targetY - start.y) * eased;
				setState((p) => ({
					...p,
					position: { x, y },
					animation: t < 1 ? "moving" : "idle",
				}));
				if (t < 1) rafRef.current = requestAnimationFrame(tick);
				else MotorSynapse.notifyMovementComplete();
			};
			rafRef.current = requestAnimationFrame(tick);
		},
		[],
	);

	const getElementCenter = useCallback((id: string): CursorPosition | null => {
		const el = typeof document !== "undefined" ? document.getElementById(id) : null;
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, []);

	const handleCommand = useCallback(
		(cmd: MotorCommand) => {
			if (!enabled) return;
			switch (cmd.type) {
				case "MOVE_TO": {
					const target =
						"elementId" in cmd.target
							? getElementCenter(cmd.target.elementId)
							: { x: cmd.target.x, y: cmd.target.y };
					if (target) {
						animateTo(target.x, target.y, SPEED_DURATIONS[cmd.speed], cmd.easing ?? "easeInOut");
					}
					break;
				}
				case "GAZE_AT": {
					const target = getElementCenter(cmd.elementId);
					if (!target) break;
					animateTo(target.x, target.y, 300, "easeOut");
					if (cmd.highlight) {
						const el = document.getElementById(cmd.elementId);
						if (el) {
							el.classList.add("iasted-orb-highlight");
							setTimeout(() => el.classList.remove("iasted-orb-highlight"), cmd.duration);
						}
					}
					break;
				}
				case "INTERACT": {
					setState((p) => ({
						...p,
						animation: cmd.action === "type" ? "typing" : "clicking",
					}));
					setTimeout(() => {
						setState((p) => ({ ...p, animation: "idle" }));
						MotorSynapse.notifyInteractionComplete();
					}, cmd.delay ?? 200);
					break;
				}
				case "VOCALIZE":
					setState((p) => ({ ...p, animation: "speaking", emotion: cmd.emotion }));
					break;
				case "PULSE":
					setState((p) => ({ ...p, pulseIntensity: cmd.intensity }));
					setTimeout(() => setState((p) => ({ ...p, pulseIntensity: "none" })), cmd.duration);
					break;
				case "THINK":
					setState((p) => ({ ...p, animation: "thinking" }));
					setTimeout(() => setState((p) => ({ ...p, animation: "idle" })), cmd.duration);
					break;
				case "IDLE":
					setState((p) => ({ ...p, animation: "idle" }));
					if (cmd.position === "corner") {
						animateTo(window.innerWidth - 100, window.innerHeight - 100, 800, "easeOut");
					} else if (cmd.position === "center") {
						animateTo(window.innerWidth / 2, window.innerHeight / 2, 800, "easeOut");
					}
					break;
			}
		},
		[enabled, getElementCenter, animateTo],
	);

	useEffect(() => {
		if (!enabled) return;
		const unsub = MotorSynapse.onCommand(handleCommand);
		setState((p) => ({ ...p, isVisible: true }));
		return () => {
			unsub();
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [enabled, handleCommand]);

	if (!enabled || !state.isVisible) return null;

	const animClass =
		state.animation === "thinking"
			? "iasted-orb-cursor--thinking"
			: state.animation === "speaking"
			? "iasted-orb-cursor--speaking"
			: state.animation === "clicking"
			? "iasted-orb-cursor--clicking"
			: "";

	const pulseShadow =
		state.pulseIntensity !== "none"
			? `${PULSE_INTENSITY_PX[state.pulseIntensity]} ${glowColor}`
			: undefined;

	return (
		<div
			className={`iasted-orb-cursor ${animClass}`}
			style={{
				left: state.position.x - size / 2,
				top: state.position.y - size / 2,
				width: size,
				height: size,
				borderRadius: "50%",
				background: `radial-gradient(circle, ${EMOTION_COLOR[state.emotion]} 0%, ${primaryColor} 70%, transparent 100%)`,
				boxShadow: pulseShadow
					? `${pulseShadow}, 0 0 16px ${glowColor}`
					: `0 0 16px ${glowColor}, 0 0 32px ${glowColor}`,
				transition: state.animation === "moving" ? "none" : "all 0.3s ease",
				opacity: 0.85,
				zIndex,
			}}
		>
			<div
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: size * 0.4,
					height: size * 0.4,
					borderRadius: "50%",
					background: "white",
					opacity: 0.9,
				}}
			/>
		</div>
	);
}
