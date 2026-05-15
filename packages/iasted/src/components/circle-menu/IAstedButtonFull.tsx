/**
 * IAstedButtonFull — Port intégral du bouton 3D iAsted depuis mairie.ga.
 *
 * Source originale : `mairie.ga/src/components/iasted/IAstedButtonFull.tsx`.
 * Adaptation pour gabon-diplomatie : couleurs identiques (palette
 * bleu/jaune/cyan/magenta d'iAsted), mais branchable sur `useRealtimeVoice`
 * via les props `voiceListening` / `voiceSpeaking` / `voiceProcessing` /
 * `audioLevel`.
 *
 * Comportement :
 *   - Single click : `onClick` (typiquement ouvrir la fenêtre iAsted)
 *   - Double click : `onDoubleClick` (ex : ouvrir directement l'onglet iChat)
 *   - Drag & drop : déplaçable, position persistée dans localStorage
 *   - Shockwave au clic
 *   - Heartbeat global organique + voice-state animations dédiées
 *   - Responsive (sm/md/lg) + adaptations mobile/tablette
 *   - Badge mode vocal vert en haut-droite quand voiceListening/Speaking
 *   - Icône alternante au repos (texte iAsted ↔ mic ↔ chat ↔ brain)
 */

"use client";

import { Brain, MessageCircle, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface IAstedButtonFullProps {
	voiceListening?: boolean;
	voiceSpeaking?: boolean;
	voiceProcessing?: boolean;
	pulsing?: boolean;
	onClick?: () => void;
	onDoubleClick?: () => void;
	className?: string;
	audioLevel?: number;
	size?: "sm" | "md" | "lg";
	isInterfaceOpen?: boolean;
	/** Clé localStorage pour la position. Permet de scoper par surface (citizen/agent/backoffice). */
	positionStorageKey?: string;
}

interface Shockwave {
	id: number;
}

interface Position {
	x: number;
	y: number;
}

// ──────────────────────────────────────────────────────────────────────
// CSS — Port intégral. Conservé tel quel pour fidélité visuelle.
// ──────────────────────────────────────────────────────────────────────

const STYLES = `
.iasted-btn-perspective-container {
  perspective: 1500px;
  position: fixed;
  z-index: 9999;
}
.iasted-btn-perspective-container.iasted-btn-grabbing { cursor: grabbing !important; }
.iasted-btn-thick-matter-button.iasted-btn-grabbing { cursor: grabbing !important; }
.iasted-btn-perspective { perspective: 1200px; position: relative; transform-style: preserve-3d; }

.iasted-btn-thick-matter-button {
  transform-style: preserve-3d;
  backface-visibility: hidden;
  border-radius: 50%;
  will-change: transform, box-shadow, border-radius, filter;
  transition: all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  animation:
    iasted-btn-global-heartbeat 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-shadow-pulse 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-rhythm-variation 15s ease-in-out infinite,
    iasted-btn-micro-breathing 4s ease-in-out infinite,
    iasted-btn-subtle-rotation 20s linear infinite;
}

/* Couches enfants restent solidaires de la sphère ; pas de rotation propre. */
.iasted-btn-thick-matter-button > * {
  backface-visibility: hidden;
}

@keyframes iasted-btn-micro-breathing {
  0%, 100% { transform: scale(1) translateZ(0); }
  25% { transform: scale(1.02) translateZ(2px); }
  50% { transform: scale(0.98) translateZ(-2px); }
  75% { transform: scale(1.01) translateZ(1px); }
}
/* Rotation subtile : oscille de ±8° autour de Y et ±4° autour de X.
   Évite l'effet "pièce qui pivote" : la sphère reste face caméra. */
@keyframes iasted-btn-subtle-rotation {
  0%, 100% { transform: rotateY(-8deg) rotateX(-4deg); }
  25% { transform: rotateY(0deg) rotateX(4deg); }
  50% { transform: rotateY(8deg) rotateX(-2deg); }
  75% { transform: rotateY(0deg) rotateX(4deg); }
}

.iasted-btn-thick-matter-button:hover {
  animation:
    iasted-btn-global-heartbeat-intense 1.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-shadow-pulse-intense 1.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-rhythm-variation 15s ease-in-out infinite,
    iasted-btn-hover-glow 1.4s ease-in-out infinite,
    iasted-btn-hover-expansion 2s ease-in-out infinite;
}
@keyframes iasted-btn-hover-expansion {
  0%, 100% { transform: scale(1) translateZ(0); }
  50% { transform: scale(1.05) translateZ(10px); }
}

.iasted-btn-thick-matter-button:active {
  animation: iasted-btn-muscle-contraction 1.2s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}
@keyframes iasted-btn-muscle-contraction {
  0% { transform: scale3d(1,1,1); filter: brightness(1) saturate(1.7); border-radius: 50%; }
  15% { transform: scale3d(0.94,0.92,0.96) rotateX(2deg) rotateY(-1deg); filter: brightness(0.88) saturate(2) hue-rotate(5deg); border-radius: 54% 46% 47% 53% / 46% 54% 45% 55%; }
  35% { transform: scale3d(0.82,0.78,0.86) rotateX(4deg) rotateY(-3deg); filter: brightness(0.78) saturate(2.5) hue-rotate(12deg); border-radius: 62% 38% 41% 59% / 40% 60% 39% 61%; }
  65% { transform: scale3d(0.95,0.94,0.96) rotateX(1deg) rotateY(0deg); filter: brightness(0.98) saturate(2.3) hue-rotate(5deg); border-radius: 54% 46% 47% 53% / 46% 54% 45% 55%; }
  100% { transform: scale3d(1,1,1); filter: brightness(1) saturate(1.7); border-radius: 50%; }
}

@keyframes iasted-btn-rhythm-variation {
  0%, 100% { animation-timing-function: cubic-bezier(0.68, -0.2, 0.265, 1.55); }
  15% { animation-timing-function: cubic-bezier(0.58, -0.1, 0.365, 1.45); }
  30% { animation-timing-function: cubic-bezier(0.78, -0.3, 0.165, 1.65); }
  45% { animation-timing-function: cubic-bezier(0.48, -0.15, 0.465, 1.35); }
  60% { animation-timing-function: cubic-bezier(0.88, -0.35, 0.065, 1.75); }
  75% { animation-timing-function: cubic-bezier(0.38, -0.05, 0.565, 1.25); }
  90% { animation-timing-function: cubic-bezier(0.98, -0.4, 0.265, 1.85); }
}

@keyframes iasted-btn-hover-glow {
  0%, 100% { box-shadow: 0 0 40px rgba(0,170,255,0.5), 0 0 80px rgba(0,170,255,0.3), 0 0 120px rgba(0,170,255,0.2), 0 0 160px rgba(0,170,255,0.1), 0 8px 16px rgba(0,102,255,0.2), 0 4px 8px rgba(0,170,255,0.15), inset 0 -5px 15px rgba(0,102,255,0.2), inset 0 5px 15px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 0 60px rgba(0,170,255,0.7), 0 0 120px rgba(0,170,255,0.5), 0 0 180px rgba(0,170,255,0.3), 0 0 240px rgba(0,170,255,0.2), 0 12px 24px rgba(0,102,255,0.3), 0 6px 12px rgba(0,170,255,0.2), inset 0 -8px 20px rgba(0,102,255,0.25), inset 0 8px 20px rgba(255,255,255,0.4); }
}

@keyframes iasted-btn-global-heartbeat-intense {
  0% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1) saturate(1.7) hue-rotate(0deg); }
  3% { transform: scale3d(1.08,1.1,1.06) rotate(2deg); border-radius: 40% 60% 57% 43% / 44% 56% 44% 56%; filter: brightness(1.2) saturate(2.1) hue-rotate(5deg); }
  6% { transform: scale3d(1.22,1.18,1.26) rotate(-3deg); border-radius: 35% 65% 62% 38% / 58% 42% 60% 40%; filter: brightness(1.4) saturate(2.5) hue-rotate(10deg); }
  9% { transform: scale3d(1.3,1.25,1.35) rotate(1deg); border-radius: 32% 68% 65% 35% / 62% 38% 64% 36%; filter: brightness(1.5) saturate(2.8) hue-rotate(15deg); }
  12% { transform: scale3d(1.15,1.12,1.18) rotate(-1deg); border-radius: 38% 62% 58% 42% / 54% 46% 56% 44%; filter: brightness(1.3) saturate(2.3) hue-rotate(5deg); }
  15% { transform: scale3d(0.88,0.91,0.85) rotate(0deg); border-radius: 58% 42% 45% 55% / 42% 58% 44% 56%; filter: brightness(0.85) saturate(1.4) hue-rotate(-5deg); }
  18% { transform: scale3d(0.8,0.84,0.76) rotate(0.5deg); border-radius: 62% 38% 42% 58% / 38% 62% 40% 60%; filter: brightness(0.8) saturate(1.3) hue-rotate(-10deg); }
  25% { transform: scale3d(1.12,1.08,1.16) rotate(-0.5deg); border-radius: 41% 59% 56% 44% / 58% 42% 57% 43%; filter: brightness(1.2) saturate(2.2) hue-rotate(3deg); }
  100% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1) saturate(1.7) hue-rotate(0deg); }
}

@keyframes iasted-btn-shadow-pulse-intense {
  0%, 100% { box-shadow: 0 0 40px rgba(0,170,255,0.4), 0 0 80px rgba(0,170,255,0.3), 0 8px 16px rgba(0,102,255,0.2), 0 4px 8px rgba(0,170,255,0.15), inset 0 -5px 15px rgba(0,102,255,0.2), inset 0 5px 15px rgba(255,255,255,0.3); }
  6% { box-shadow: 0 0 60px rgba(0,170,255,0.6), 0 0 120px rgba(0,170,255,0.4), 0 16px 32px rgba(0,102,255,0.3), 0 8px 16px rgba(0,170,255,0.2), inset 0 -8px 20px rgba(0,102,255,0.25), inset 0 8px 20px rgba(255,255,255,0.4); }
  12% { box-shadow: 0 0 80px rgba(0,170,255,0.8), 0 0 160px rgba(0,170,255,0.6), 0 20px 40px rgba(0,102,255,0.4), 0 10px 20px rgba(0,170,255,0.3), inset 0 -10px 25px rgba(0,102,255,0.3), inset 0 10px 25px rgba(255,255,255,0.5); }
}

@keyframes iasted-btn-global-heartbeat {
  0% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1); }
  3% { transform: scale3d(1.05,1.07,1.03) rotate(1.5deg); border-radius: 42% 58% 55% 45% / 46% 54% 46% 54%; filter: brightness(1.08); }
  6% { transform: scale3d(1.14,1.1,1.18) rotate(-1.5deg); border-radius: 38% 62% 58% 42% / 55% 45% 58% 42%; filter: brightness(1.15); }
  9% { transform: scale3d(1.2,1.16,1.24) rotate(0.8deg); border-radius: 35% 65% 62% 38% / 58% 42% 60% 40%; filter: brightness(1.2); }
  12% { transform: scale3d(1.1,1.07,1.13) rotate(-0.8deg); border-radius: 40% 60% 55% 45% / 52% 48% 54% 46%; filter: brightness(1.1); }
  15% { transform: scale3d(0.93,0.96,0.9) rotate(0deg); border-radius: 55% 45% 48% 52% / 45% 55% 47% 53%; filter: brightness(0.92); }
  18% { transform: scale3d(0.86,0.9,0.82) rotate(0.4deg); border-radius: 58% 42% 45% 55% / 42% 58% 44% 56%; filter: brightness(0.86); }
  25% { transform: scale3d(1.07,1.04,1.1) rotate(-0.3deg); border-radius: 43% 57% 54% 46% / 56% 44% 55% 45%; filter: brightness(1.07); }
  30% { transform: scale3d(1.12,1.09,1.15) rotate(0.6deg); border-radius: 40% 60% 58% 42% / 59% 41% 57% 43%; filter: brightness(1.11); }
  100% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1); }
}

.iasted-btn-depth-layer {
  position: absolute; top: 5%; left: 5%; width: 90%; height: 90%; border-radius: 50%;
  background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(0,102,255,0.1) 60%, rgba(0,170,255,0.05) 80%);
  filter: blur(2px); opacity: 0.4; transform: translateZ(-10px);
}

.iasted-btn-highlight-layer {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%;
  background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 70%);
  transform: translateZ(15px) rotate(45deg); opacity: 0.4; filter: blur(2px);
  mix-blend-mode: overlay; pointer-events: none;
  animation: iasted-btn-highlight-pulse 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}
@keyframes iasted-btn-highlight-pulse {
  0%, 100% { opacity: 0.4; transform: translateZ(15px) rotate(45deg) scale(1); }
  6% { opacity: 0.7; transform: translateZ(20px) rotate(45deg) scale(1.08); }
  12% { opacity: 0.85; transform: translateZ(25px) rotate(45deg) scale(1.12); }
  18% { opacity: 0.25; transform: translateZ(10px) rotate(45deg) scale(0.92); }
}

.iasted-btn-satellite-particle {
  width: 8px; height: 8px; top: 15px; left: 50%; margin-left: -4px;
  border-radius: 50%; background: rgba(0,170,255,0.8);
  box-shadow: 0 0 4px rgba(0,170,255,0.6), 0 0 8px rgba(0,170,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5);
  z-index: 20; position: absolute;
  animation: iasted-btn-orbit-close 4s linear infinite;
  transform-style: preserve-3d; transform: translateZ(20px);
}
@keyframes iasted-btn-orbit-close {
  0% { transform: translateZ(20px) rotate(0deg) translateX(30px) rotate(0deg); }
  100% { transform: translateZ(20px) rotate(360deg) translateX(30px) rotate(-360deg); }
}

.iasted-btn-thick-matter-button.iasted-btn-voice-listening .iasted-btn-organic-membrane {
  animation: iasted-btn-membrane-listening 0.6s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}
.iasted-btn-thick-matter-button.iasted-btn-voice-listening .iasted-btn-wave-emission {
  animation: iasted-btn-wave-listening 1s cubic-bezier(0.215, 0.61, 0.355, 1) infinite !important;
}
@keyframes iasted-btn-membrane-listening {
  0%, 100% { opacity: 0.8; transform: scale(1.2) translateZ(15px); filter: blur(2px); }
  50% { opacity: 1; transform: scale(1.5) translateZ(30px); filter: blur(5px); }
}
@keyframes iasted-btn-wave-listening {
  0% { transform: scale3d(0.9,0.9,1) translateZ(0px); opacity: 0.8; filter: blur(0px); }
  100% { transform: scale3d(2.5,2.5,1.5) translateZ(20px); opacity: 0; filter: blur(15px); }
}

.iasted-btn-thick-matter-button.iasted-btn-voice-speaking .iasted-btn-organic-membrane {
  animation: iasted-btn-membrane-speaking 0.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}
.iasted-btn-thick-matter-button.iasted-btn-voice-speaking .iasted-btn-wave-emission {
  animation: iasted-btn-wave-speaking 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite !important;
}
@keyframes iasted-btn-membrane-speaking {
  0%, 100% { opacity: 0.9; transform: scale(1.1) translateZ(10px); filter: blur(1px); }
  25% { opacity: 1; transform: scale(1.35) translateZ(25px); filter: blur(4px); }
  50% { opacity: 0.95; transform: scale(1.25) translateZ(20px); filter: blur(3px); }
  75% { opacity: 1; transform: scale(1.4) translateZ(28px); filter: blur(5px); }
}
@keyframes iasted-btn-wave-speaking {
  0% { transform: scale3d(1,1,1) translateZ(0px); opacity: 0.7; filter: blur(0px); }
  100% { transform: scale3d(2.2,2.2,1.4) translateZ(15px); opacity: 0; filter: blur(12px); }
}

.iasted-btn-thick-matter-button.iasted-btn-voice-listening {
  animation:
    iasted-btn-heartbeat-listening 0.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-shadow-pulse-intense 0.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}
@keyframes iasted-btn-heartbeat-listening {
  0%, 100% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1.2) saturate(2); }
  25% { transform: scale3d(1.15,1.18,1.12) rotate(3deg); border-radius: 35% 65% 62% 38% / 58% 42% 60% 40%; filter: brightness(1.5) saturate(2.8); }
  50% { transform: scale3d(1.08,1.05,1.1) rotate(-2deg); border-radius: 45% 55% 52% 48% / 48% 52% 46% 54%; filter: brightness(1.3) saturate(2.3); }
  75% { transform: scale3d(1.12,1.15,1.1) rotate(2deg); border-radius: 40% 60% 58% 42% / 54% 46% 56% 44%; filter: brightness(1.4) saturate(2.5); }
}

.iasted-btn-thick-matter-button.iasted-btn-voice-speaking {
  animation:
    iasted-btn-heartbeat-speaking 0.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-shadow-pulse-speaking 0.4s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite,
    iasted-btn-speaking-glow 0.4s ease-in-out infinite;
}
@keyframes iasted-btn-heartbeat-speaking {
  0% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1.2) saturate(2); }
  20% { transform: scale3d(1.25,1.28,1.22) rotate(5deg); border-radius: 28% 72% 70% 30% / 68% 32% 70% 30%; filter: brightness(1.8) saturate(3.5); }
  40% { transform: scale3d(1.15,1.12,1.18) rotate(-4deg); border-radius: 38% 62% 60% 40% / 58% 42% 60% 40%; filter: brightness(1.4) saturate(2.8); }
  60% { transform: scale3d(1.22,1.25,1.2) rotate(4deg); border-radius: 32% 68% 65% 35% / 62% 38% 64% 36%; filter: brightness(1.7) saturate(3.2); }
  80% { transform: scale3d(1.12,1.1,1.15) rotate(-3deg); border-radius: 42% 58% 55% 45% / 52% 48% 54% 46%; filter: brightness(1.35) saturate(2.6); }
  100% { transform: scale3d(1,1,1) rotate(0deg); border-radius: 50%; filter: brightness(1.2) saturate(2); }
}
@keyframes iasted-btn-shadow-pulse-speaking {
  0%, 100% { box-shadow: 0 0 50px rgba(0,170,255,0.8), 0 0 100px rgba(0,170,255,0.6), 0 0 150px rgba(0,170,255,0.4), 0 0 200px rgba(0,170,255,0.3), 0 12px 30px rgba(0,102,255,0.4), inset 0 0 30px rgba(0,170,255,0.3); }
  50% { box-shadow: 0 0 80px rgba(0,170,255,1), 0 0 150px rgba(0,170,255,0.8), 0 0 220px rgba(0,170,255,0.6), 0 0 300px rgba(0,170,255,0.4), 0 16px 40px rgba(0,102,255,0.6), inset 0 0 50px rgba(0,170,255,0.5); }
}
@keyframes iasted-btn-speaking-glow {
  0%, 100% { filter: brightness(1.2) saturate(2) drop-shadow(0 0 20px rgba(0,170,255,0.6)); }
  50% { filter: brightness(1.6) saturate(3) drop-shadow(0 0 40px rgba(0,170,255,0.9)); }
}

.iasted-btn-thick-matter-button.iasted-btn-pulsing {
  animation: iasted-btn-gentle-pulse 1s ease-in-out 3;
}
@keyframes iasted-btn-gentle-pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  50% { transform: scale(1.08); box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185,129, 0); }
}

.iasted-btn-organic-membrane {
  position: absolute; inset: -5%; border-radius: 50%;
  background: radial-gradient(circle at center, transparent 20%, rgba(0,170,255,0.03) 40%, rgba(0,170,255,0.08) 60%, rgba(0,170,255,0.04) 80%, transparent 95%);
  opacity: 0;
  animation: iasted-btn-membrane 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
  pointer-events: none;
}
@keyframes iasted-btn-membrane {
  0%, 100% { opacity: 0; transform: scale(1) translateZ(0); filter: blur(0px); }
  3% { opacity: 0.3; transform: scale(0.95) translateZ(-5px); filter: blur(1px); }
  6% { opacity: 0.7; transform: scale(0.9) translateZ(-10px); filter: blur(0px); }
  9% { opacity: 0.9; transform: scale(1.15) translateZ(15px); filter: blur(2px); }
  12% { opacity: 0.95; transform: scale(1.25) translateZ(20px); filter: blur(3px); }
  18% { opacity: 0.4; transform: scale(1.12) translateZ(10px); filter: blur(1px); }
}

.iasted-btn-wave-emission {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(0,170,255,0.3) 30%, transparent 70%);
  transform: scale3d(0.9,0.9,1); opacity: 0;
  transform-style: preserve-3d;
}
.iasted-btn-wave-1 { animation: iasted-btn-wave-heartbeat 2.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
.iasted-btn-wave-2 { animation: iasted-btn-wave-heartbeat 2.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; animation-delay: 0.3s; }
.iasted-btn-wave-3 { animation: iasted-btn-wave-heartbeat 2.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; animation-delay: 0.6s; }
@keyframes iasted-btn-wave-heartbeat {
  0%, 20%, 100% { transform: scale3d(0.9,0.9,1) translateZ(0px); opacity: 0; filter: blur(0px); }
  6% { transform: scale3d(1,1,1) translateZ(2px); opacity: 0.7; filter: blur(0px); }
  12% { transform: scale3d(1.8,1.8,1.2) translateZ(10px); opacity: 0; filter: blur(10px); }
}

.iasted-btn-morphing-bg {
  background:
    radial-gradient(circle at 20% 80%, rgba(0,102,255,0.9) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,204,0,0.9) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(0,170,255,0.9) 0%, transparent 50%),
    radial-gradient(circle at 20% 20%, rgba(255,215,0,0.9) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(255,0,255,0.7) 0%, transparent 50%),
    linear-gradient(135deg, #0066ff 0%, #00aaff 8%, #00ffff 16%, #4400ff 24%, #ff00ff 32%, #ff0066 40%, #ffcc00 48%, #ffc125 56%, #ff6600 64%, #ff0099 72%, #9400d3 80%, #4b0082 88%, #0066ff 100%);
  background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 400% 400%;
  animation: iasted-btn-fluid-wave 12s ease-in-out infinite, iasted-btn-color-shift 30s linear infinite;
  filter: saturate(2) brightness(1.2);
  mix-blend-mode: lighten;
  box-shadow: inset 0 0 50px rgba(255,255,255,0.3), inset 0 0 100px rgba(0,170,255,0.3), inset 0 0 150px rgba(255,204,0,0.2);
  transform-style: preserve-3d;
}
@keyframes iasted-btn-color-shift {
  0%, 100% { filter: hue-rotate(0deg) saturate(2) brightness(1.2); }
  50% { filter: hue-rotate(180deg) saturate(2.5) brightness(1.3); }
}
@keyframes iasted-btn-fluid-wave {
  0%, 100% { background-position: 0% 0%, 100% 100%, 100% 0%, 0% 100%, 50% 50%, 0% 0%; }
  25% { background-position: 50% 50%, 50% 50%, 0% 100%, 100% 0%, 25% 75%, 100% 30%; }
  50% { background-position: 100% 100%, 0% 0%, 0% 0%, 100% 100%, 75% 25%, 60% 100%; }
  75% { background-position: 50% 0%, 50% 100%, 100% 50%, 0% 50%, 50% 50%, 20% 50%; }
}
.iasted-btn-thick-matter-button:hover .iasted-btn-morphing-bg {
  animation-duration: 6s, 15s;
  filter: saturate(3) brightness(1.5) contrast(1.3);
}

.iasted-btn-shine-effect {
  position: absolute; inset: 0; border-radius: 50%;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.4) 55%, transparent 65%);
  background-size: 200% 200%;
  animation: iasted-btn-shine 10s ease-in-out infinite;
  mix-blend-mode: overlay; pointer-events: none; opacity: 0.8;
}
@keyframes iasted-btn-shine {
  0%, 100% { background-position: -200% center; }
  50% { background-position: 200% center; }
}

@keyframes iasted-btn-shadow-pulse {
  0%, 100% { box-shadow: 0 6px 12px rgba(0,170,255,0.2), 0 3px 6px rgba(0,170,255,0.15), 0 0 50px rgba(0,170,255,0.15), 0 0 100px rgba(0,170,255,0.08), inset 0 -4px 12px rgba(0,102,255,0.15), inset 0 4px 12px rgba(255,255,255,0.25); }
  6% { box-shadow: 0 8px 16px rgba(0,170,255,0.25), 0 4px 8px rgba(0,170,255,0.2), 0 0 80px rgba(0,170,255,0.2), 0 0 140px rgba(0,170,255,0.1), inset 0 -6px 16px rgba(0,102,255,0.2), inset 0 6px 16px rgba(255,255,255,0.3); }
  12% { box-shadow: 0 12px 28px rgba(0,170,255,0.3), 0 6px 14px rgba(0,170,255,0.25), 0 0 120px rgba(0,170,255,0.3), 0 0 200px rgba(0,170,255,0.15), inset 0 -8px 20px rgba(0,102,255,0.25), inset 0 8px 20px rgba(255,255,255,0.4); }
}

.iasted-btn-shockwave {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%) scale(0.5);
  width: 100%; height: 100%; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(0,102,255,0.7) 30%, rgba(0,170,255,0.5) 50%, rgba(255,204,0,0.3) 70%, transparent 90%);
  animation: iasted-btn-shockwave 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  mix-blend-mode: screen; pointer-events: none;
}
@keyframes iasted-btn-shockwave {
  0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; filter: blur(0px); }
  25% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.9; filter: blur(1px); }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; filter: blur(2px); }
  75% { transform: translate(-50%, -50%) scale(2.2); opacity: 0.4; filter: blur(4px); }
  100% { transform: translate(-50%, -50%) scale(3); opacity: 0; filter: blur(8px); }
}

.iasted-btn-color-shift-active {
  animation: iasted-btn-color-shift-anim 1.5s ease-in-out;
}
@keyframes iasted-btn-color-shift-anim {
  0% { filter: hue-rotate(0deg) saturate(2) brightness(1.2); }
  25% { filter: hue-rotate(90deg) saturate(3) brightness(1.4); }
  50% { filter: hue-rotate(180deg) saturate(3.5) brightness(1.6); }
  75% { filter: hue-rotate(270deg) saturate(2.5) brightness(1.3); }
  100% { filter: hue-rotate(360deg) saturate(2) brightness(1.2); }
}

.iasted-btn-processing {
  animation:
    iasted-btn-processing-pulse 2s ease-in-out infinite,
    iasted-btn-global-heartbeat-intense 1s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite !important;
}
@keyframes iasted-btn-processing-pulse {
  0%, 100% { transform: scale(1) rotate(0deg); filter: hue-rotate(0deg) brightness(1); }
  25% { transform: scale(1.1) rotate(90deg); filter: hue-rotate(90deg) brightness(1.2); }
  50% { transform: scale(0.9) rotate(180deg); filter: hue-rotate(180deg) brightness(0.8); }
  75% { transform: scale(1.05) rotate(270deg); filter: hue-rotate(270deg) brightness(1.1); }
}

.iasted-btn-voice-mode-badge {
  position: absolute; top: -8px; right: -8px;
  width: 32px; height: 32px;
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.3), inset 0 1px 2px rgba(255,255,255,0.3);
  z-index: 10;
  animation: iasted-btn-badge-pulse 1.5s ease-in-out infinite;
  border: 2px solid rgba(255,255,255,0.9);
  backdrop-filter: blur(4px);
}
.iasted-btn-voice-mode-badge svg {
  width: 16px; height: 16px; color: white;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
  animation: iasted-btn-icon-pulse-soft 1.5s ease-in-out infinite;
}
@keyframes iasted-btn-badge-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.3), inset 0 1px 2px rgba(255,255,255,0.3); }
  50% { transform: scale(1.15); box-shadow: 0 6px 18px rgba(16,185,129,0.6), 0 0 35px rgba(16,185,129,0.5), 0 0 50px rgba(16,185,129,0.3), inset 0 1px 3px rgba(255,255,255,0.5); }
}
@keyframes iasted-btn-icon-pulse-soft {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.iasted-btn-fixed-icons-container {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  pointer-events: none; z-index: 40;
  animation: iasted-btn-icon-pulse 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
}
@keyframes iasted-btn-icon-pulse {
  0%, 100% { transform: scale(1); }
  6% { transform: scale(0.92); }
  12% { transform: scale(0.88); }
  18% { transform: scale(1.08); }
  30% { transform: scale(0.96); }
  60% { transform: scale(0.91); }
  75% { transform: scale(1.04); }
}

.iasted-btn-alternating-element {
  position: absolute; opacity: 0;
  transform: translateY(10px) scale(0.9);
  filter: drop-shadow(0 0 12px rgba(255,255,255,0.8));
}
@keyframes iasted-btn-fade-in-out {
  0%, 25%, 100% { opacity: 0; }
  5%, 20% { opacity: 1; }
}
.iasted-btn-text-element { animation: iasted-btn-fade-in-out 12s cubic-bezier(0.25, 0.1, 0.25, 1) infinite, iasted-btn-text-float 3.5s ease-in-out infinite; }
.iasted-btn-mic-element { animation: iasted-btn-fade-in-out 12s cubic-bezier(0.25, 0.1, 0.25, 1) infinite, iasted-btn-mic-float 3.5s ease-in-out infinite; animation-delay: 3s, 3s; }
.iasted-btn-chat-element { animation: iasted-btn-fade-in-out 12s cubic-bezier(0.25, 0.1, 0.25, 1) infinite, iasted-btn-chat-float 3.5s ease-in-out infinite; animation-delay: 6s, 6s; }
.iasted-btn-brain-element { animation: iasted-btn-fade-in-out 12s cubic-bezier(0.25, 0.1, 0.25, 1) infinite, iasted-btn-brain-float 3.5s ease-in-out infinite; animation-delay: 9s, 9s; }
@keyframes iasted-btn-text-float { 0%, 100% { transform: translateY(20px) scale(0.7); } 50% { transform: translateY(-8px) scale(1.1); }}
@keyframes iasted-btn-mic-float { 0%, 100% { transform: translateY(20px) scale(0.7) rotate(-5deg); } 50% { transform: translateY(-8px) scale(1.1) rotate(5deg); }}
@keyframes iasted-btn-chat-float { 0%, 100% { transform: translateY(20px) scale(0.7) rotate(5deg); } 50% { transform: translateY(-8px) scale(1.1) rotate(-5deg); }}
@keyframes iasted-btn-brain-float { 0%, 100% { transform: translateY(20px) scale(0.7) rotate(-3deg); } 50% { transform: translateY(-8px) scale(1.1) rotate(3deg); }}

.iasted-btn-iasted-text {
  text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(0,170,255,0.6);
  font-size: var(--iasted-text-size, 20px) !important;
  font-weight: bold; line-height: 1;
}
.iasted-btn-icon-svg {
  width: var(--iasted-icon-size, 48px) !important;
  height: var(--iasted-icon-size, 48px) !important;
}

/* ──── COUCHES DE VOLUME SPHÉRIQUE (port mairie.ga) ──── */

/* Substance interne avec ombrage du bas (effet sphère mate) */
.iasted-btn-substance-effect {
  position: absolute; inset: 0; border-radius: inherit;
  box-shadow: inset 0 -15px 30px rgba(0,102,255,0.2);
  opacity: 0.4;
  background: radial-gradient(circle at 50% 120%, rgba(255,255,255,0.3) 0%, rgba(0,170,255,0.1) 50%, rgba(0,102,255,0.05) 80%);
  transform-style: preserve-3d;
  animation: iasted-btn-inner-fluid-move 10s ease-in-out infinite alternate, iasted-btn-substance-pulse 2.8s cubic-bezier(0.68, -0.2, 0.265, 1.55) infinite;
  pointer-events: none;
}
@keyframes iasted-btn-substance-pulse {
  0%, 100% { opacity: 0.4; transform: translateZ(5px) scale(1); }
  6% { opacity: 0.55; transform: translateZ(10px) scale(1.08); }
  12% { opacity: 0.65; transform: translateZ(15px) scale(1.12); }
  18% { opacity: 0.45; transform: translateZ(2px) scale(0.92); }
}
@keyframes iasted-btn-inner-fluid-move {
  0% { border-radius: 40% 60% 70% 30% / 40% 40% 60% 60%; opacity: 0.4; transform: translateZ(5px) rotate(0deg); }
  50% { border-radius: 60% 40% 30% 70% / 70% 50% 50% 30%; opacity: 0.6; transform: translateZ(18px) rotate(180deg); }
  100% { border-radius: 50% 50% 40% 60% / 30% 60% 40% 70%; opacity: 0.4; transform: translateZ(5px) rotate(360deg); }
}

/* Couches fluides internes (3 niveaux Z pour profondeur) */
.iasted-btn-inner-fluid-layer {
  position: absolute; inset: 0; border-radius: 50%;
  opacity: 0.4; transform-style: preserve-3d; pointer-events: none;
}
.iasted-btn-layer-1 {
  background: radial-gradient(circle at 30% 40%, rgba(0,102,255,0.3) 0%, rgba(255,204,0,0.2) 50%, transparent 80%);
  animation: iasted-btn-fluid-layer-1 10s ease-in-out infinite alternate;
  filter: blur(3px); transform: translateZ(10px);
}
.iasted-btn-layer-2 {
  background: radial-gradient(circle at 70% 30%, rgba(255,204,0,0.3) 0%, rgba(0,170,255,0.2) 50%, transparent 80%);
  animation: iasted-btn-fluid-layer-2 14s ease-in-out infinite alternate-reverse;
  filter: blur(4px); transform: translateZ(15px);
}
.iasted-btn-layer-3 {
  background: radial-gradient(circle at 50% 60%, rgba(0,170,255,0.3) 0%, rgba(255,215,0,0.2) 50%, transparent 80%);
  animation: iasted-btn-fluid-layer-3 12s ease-in-out infinite alternate;
  filter: blur(5px); transform: translateZ(20px);
}
@keyframes iasted-btn-fluid-layer-1 {
  0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; transform: translateZ(10px) rotate(0deg) scale(1); opacity: 0.4; }
  50% { border-radius: 50% 50% 50% 50%; transform: translateZ(15px) rotate(135deg) scale(1.1); opacity: 0.45; }
  100% { border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%; transform: translateZ(18px) rotate(225deg) scale(1); opacity: 0.4; }
}
@keyframes iasted-btn-fluid-layer-2 {
  0% { border-radius: 70% 30% 50% 50%; transform: translateZ(15px) rotate(0deg) scale(1); opacity: 0.4; }
  50% { border-radius: 45% 55% 55% 45%; transform: translateZ(25px) rotate(-180deg) scale(1.15); opacity: 0.45; }
  100% { border-radius: 50% 50% 70% 30%; transform: translateZ(22px) rotate(-300deg) scale(1); opacity: 0.4; }
}
@keyframes iasted-btn-fluid-layer-3 {
  0% { border-radius: 50% 50% 30% 70% / 60% 40% 60% 40%; transform: translateZ(20px) rotate(0deg) scale(1); opacity: 0.4; }
  50% { border-radius: 65% 35% 40% 60%; transform: translateZ(24px) rotate(180deg) scale(0.88); opacity: 0.32; }
  100% { border-radius: 40% 60% 60% 40%; transform: translateZ(28px) rotate(360deg) scale(1); opacity: 0.4; }
}

/* Reflets mobiles (3 lumières blanches/colorées flottantes) */
.iasted-btn-moving-highlights {
  position: absolute; inset: 0; border-radius: 50%;
  overflow: hidden; pointer-events: none;
}
.iasted-btn-highlight-1, .iasted-btn-highlight-2, .iasted-btn-highlight-3 {
  position: absolute; width: 80%; height: 80%;
  border-radius: 50%; filter: blur(20px);
  mix-blend-mode: overlay;
}
.iasted-btn-highlight-1 {
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 60%);
  animation: iasted-btn-highlight-move-1 10s ease-in-out infinite;
}
.iasted-btn-highlight-2 {
  background: radial-gradient(circle, rgba(0,170,255,0.7) 0%, transparent 50%);
  animation: iasted-btn-highlight-move-2 12s ease-in-out infinite;
}
.iasted-btn-highlight-3 {
  background: radial-gradient(circle, rgba(255,204,0,0.6) 0%, transparent 55%);
  animation: iasted-btn-highlight-move-3 8s ease-in-out infinite;
}
@keyframes iasted-btn-highlight-move-1 {
  0%, 100% { transform: translate(-40%, -40%) scale(0.7); opacity: 0.7; }
  25% { transform: translate(40%, -30%) scale(1.3); opacity: 0.9; }
  50% { transform: translate(30%, 40%) scale(1.1); opacity: 0.8; }
  75% { transform: translate(-30%, 30%) scale(0.9); opacity: 0.75; }
}
@keyframes iasted-btn-highlight-move-2 {
  0%, 100% { transform: translate(50%, -50%) scale(1.1); opacity: 0.6; }
  33% { transform: translate(-30%, 50%) scale(1.5); opacity: 0.8; }
  66% { transform: translate(40%, 20%) scale(0.8); opacity: 0.7; }
}
@keyframes iasted-btn-highlight-move-3 {
  0%, 100% { transform: translate(-30%, 50%) scale(1.2); opacity: 0.5; }
  20% { transform: translate(50%, 30%) scale(0.8); opacity: 0.7; }
  40% { transform: translate(30%, -50%) scale(1.4); opacity: 0.6; }
  60% { transform: translate(-50%, -30%) scale(0.7); opacity: 0.65; }
  80% { transform: translate(-20%, 20%) scale(1.1); opacity: 0.55; }
}

/* Texture organique de surface (donne le grain sphérique) */
.iasted-btn-organic-texture {
  position: absolute; inset: 0; border-radius: 50%;
  background:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 0%, transparent 20%),
    radial-gradient(circle at 60% 20%, rgba(0,170,255,0.06) 0%, transparent 25%),
    radial-gradient(circle at 80% 60%, rgba(255,204,0,0.05) 0%, transparent 20%),
    radial-gradient(circle at 30% 70%, rgba(0,102,255,0.06) 0%, transparent 30%),
    radial-gradient(circle at 70% 80%, rgba(255,215,0,0.05) 0%, transparent 25%),
    radial-gradient(circle at 50% 50%, rgba(138,43,226,0.04) 0%, transparent 35%);
  opacity: 0.6;
  mix-blend-mode: overlay;
  animation: iasted-btn-texture-shift 18s ease-in-out infinite;
  pointer-events: none;
}
@keyframes iasted-btn-texture-shift {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.08) rotate(90deg); }
  50% { transform: scale(0.92) rotate(180deg); }
  75% { transform: scale(1.05) rotate(270deg); }
}

/* Veines organiques colorées (matière vivante) */
.iasted-btn-organic-veins {
  position: absolute; inset: 5%; border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(0,102,255,0.15) 20deg, rgba(0,170,255,0.1) 40deg, transparent 60deg, rgba(255,204,0,0.12) 80deg, rgba(255,215,0,0.08) 100deg, transparent 120deg, rgba(0,170,255,0.18) 140deg, rgba(0,102,255,0.1) 160deg, transparent 180deg, rgba(255,215,0,0.15) 200deg, rgba(255,204,0,0.1) 220deg, transparent 240deg, rgba(30,144,255,0.13) 260deg, rgba(138,43,226,0.08) 280deg, transparent 300deg, rgba(255,193,37,0.16) 320deg, rgba(255,127,80,0.1) 340deg, transparent 360deg);
  animation: iasted-btn-organic-veins 4s ease-in-out infinite, iasted-btn-vein-rotate 25s linear infinite reverse;
  filter: blur(2px);
  mix-blend-mode: screen;
  pointer-events: none;
}
@keyframes iasted-btn-organic-veins {
  0%, 100% { opacity: 0.15; filter: blur(3px); }
  25% { opacity: 0.35; filter: blur(2px); }
  50% { opacity: 0.2; filter: blur(2.5px); }
  75% { opacity: 0.4; filter: blur(1.5px); }
}
@keyframes iasted-btn-vein-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

/* Bulles respiratoires (vie interne) */
.iasted-btn-breathing-bubble {
  position: absolute; width: 10px; height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.5));
  box-shadow: 0 0 6px rgba(255,255,255,0.4), 0 0 12px rgba(0,170,255,0.2), inset -1px -1px 3px rgba(0,0,0,0.2);
  opacity: 0; pointer-events: none;
  top: 50%; left: 50%;
}
.iasted-btn-bubble-1 { animation: iasted-btn-bubble-life-1 5s ease-out infinite; }
.iasted-btn-bubble-2 { animation: iasted-btn-bubble-life-2 5.5s ease-out infinite; animation-delay: 1.8s; }
.iasted-btn-bubble-3 { animation: iasted-btn-bubble-life-3 5.2s ease-out infinite; animation-delay: 3.4s; }
@keyframes iasted-btn-bubble-life-1 {
  0%, 100% { opacity: 0; transform: translate(-30px, 40px) scale(0); }
  10% { opacity: 0.7; transform: translate(-28px, 35px) scale(0.4); }
  30% { opacity: 1; transform: translate(-18px, 20px) scale(0.9); }
  50% { opacity: 0.6; transform: translate(0px, 0px) scale(1.2); }
  70% { opacity: 0; transform: translate(20px, -20px) scale(1.4); }
}
@keyframes iasted-btn-bubble-life-2 {
  0%, 100% { opacity: 0; transform: translate(35px, -25px) scale(0); }
  15% { opacity: 0.6; transform: translate(32px, -22px) scale(0.3); }
  35% { opacity: 0.9; transform: translate(18px, -8px) scale(0.8); }
  55% { opacity: 0.5; transform: translate(-2px, 12px) scale(1.05); }
  75% { opacity: 0; transform: translate(-22px, 32px) scale(1.25); }
}
@keyframes iasted-btn-bubble-life-3 {
  0%, 100% { opacity: 0; transform: translate(-15px, -35px) scale(0); }
  20% { opacity: 0.5; transform: translate(-13px, -30px) scale(0.25); }
  40% { opacity: 0.8; transform: translate(-2px, -12px) scale(0.7); }
  60% { opacity: 0.4; transform: translate(12px, 8px) scale(0.95); }
  80% { transform: translate(25px, 28px) scale(1.15); }
}

/* Couche cellulaire respirante (halo proche) */
.iasted-btn-cellular-layer {
  position: absolute; inset: -8%; border-radius: 50%;
  background: radial-gradient(circle at center, transparent 30%, rgba(0,170,255,0.15) 50%, rgba(0,102,255,0.1) 70%, transparent 85%);
  animation: iasted-btn-cellular 5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes iasted-btn-cellular {
  0%, 100% { opacity: 0.08; transform: scale(0.96); }
  25% { opacity: 0.12; transform: scale(1.01); }
  50% { opacity: 0.2; transform: scale(1.04); }
  75% { opacity: 0.15; transform: scale(0.99); }
}

/* Vagues fluides externes en arrière-plan (3 couches coniques) */
.iasted-btn-fluid-waves {
  position: absolute; inset: -15%; border-radius: 50%;
  overflow: hidden; pointer-events: none;
}
.iasted-btn-wave-layer {
  position: absolute; inset: 0; border-radius: inherit; opacity: 0.4;
}
.iasted-btn-wave-layer-1 {
  background: conic-gradient(from 0deg, transparent, rgba(0,102,255,0.4) 60deg, rgba(0,170,255,0.3) 120deg, transparent 180deg, rgba(255,204,0,0.4) 240deg, rgba(255,215,0,0.3) 300deg, transparent);
  animation: iasted-btn-wave-rotate-1 18s linear infinite;
}
.iasted-btn-wave-layer-2 {
  background: conic-gradient(from 45deg, transparent, rgba(0,170,255,0.4) 60deg, rgba(0,102,255,0.3) 120deg, transparent 180deg, rgba(255,215,0,0.4) 240deg, rgba(255,204,0,0.3) 300deg, transparent);
  animation: iasted-btn-wave-rotate-2 22s linear infinite reverse;
}
.iasted-btn-wave-layer-3 {
  background: conic-gradient(from 90deg, transparent, rgba(255,0,255,0.3) 60deg, rgba(138,43,226,0.2) 120deg, transparent 180deg, rgba(0,255,255,0.3) 240deg, rgba(30,144,255,0.2) 300deg, transparent);
  animation: iasted-btn-wave-rotate-3 26s linear infinite;
}
@keyframes iasted-btn-wave-rotate-1 { from { transform: rotate(0deg) scale(1); } to { transform: rotate(360deg) scale(1); } }
@keyframes iasted-btn-wave-rotate-2 { from { transform: rotate(0deg) scale(1.15); } to { transform: rotate(-360deg) scale(1.15); } }
@keyframes iasted-btn-wave-rotate-3 { from { transform: rotate(0deg) scale(0.85); } to { transform: rotate(360deg) scale(0.85); } }

/* ──── FIN COUCHES DE VOLUME ──── */

.iasted-btn-thick-matter-button.iasted-btn-sm { width: 80px; height: 80px; }
.iasted-btn-thick-matter-button.iasted-btn-md { width: 128px; height: 128px; }
.iasted-btn-thick-matter-button.iasted-btn-lg { width: 160px; height: 160px; }

@media (max-width: 640px) {
  .iasted-btn-thick-matter-button.iasted-btn-sm { width: 64px; height: 64px; }
  .iasted-btn-thick-matter-button.iasted-btn-md { width: 96px; height: 96px; }
  .iasted-btn-thick-matter-button.iasted-btn-lg { width: 120px; height: 120px; }
  .iasted-btn-thick-matter-button { animation-duration: 3s, 3s, 20s, 5s, 25s; }
  .iasted-btn-voice-mode-badge { width: 24px; height: 24px; top: -6px; right: -6px; }
  .iasted-btn-voice-mode-badge svg { width: 12px; height: 12px; }
}
@media (min-width: 641px) and (max-width: 1024px) {
  .iasted-btn-thick-matter-button.iasted-btn-sm { width: 72px; height: 72px; }
  .iasted-btn-thick-matter-button.iasted-btn-md { width: 112px; height: 112px; }
  .iasted-btn-thick-matter-button.iasted-btn-lg { width: 140px; height: 140px; }
}
@media (max-width: 380px) {
  .iasted-btn-thick-matter-button.iasted-btn-sm { width: 56px; height: 56px; }
  .iasted-btn-thick-matter-button.iasted-btn-md { width: 80px; height: 80px; }
  .iasted-btn-thick-matter-button.iasted-btn-lg { width: 100px; height: 100px; }
  .iasted-btn-satellite-particle { display: none; }
  .iasted-btn-voice-mode-badge { width: 20px; height: 20px; top: -5px; right: -5px; }
  .iasted-btn-voice-mode-badge svg { width: 10px; height: 10px; }
}
`;

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_STORAGE_KEY = "iasted-button-position";

export function IAstedButtonFull({
	onClick,
	onDoubleClick,
	className = "",
	voiceListening = false,
	voiceSpeaking = false,
	voiceProcessing = false,
	pulsing = false,
	size = "md",
	isInterfaceOpen = false,
	positionStorageKey = DEFAULT_STORAGE_KEY,
}: IAstedButtonFullProps) {
	const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
	const [isClicked, setIsClicked] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [isProcessingState, setIsProcessingState] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
	const [mounted, setMounted] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const dragStartPos = useRef<Position>({ x: 0, y: 0 });
	const buttonPosition = useRef<Position>({ x: 0, y: 0 });
	const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clickCount = useRef(0);

	// Inject styles once
	useEffect(() => {
		if (typeof document === "undefined") return;
		const styleId = "iasted-button-full-styles";
		if (document.getElementById(styleId)) return;
		const style = document.createElement("style");
		style.id = styleId;
		style.textContent = STYLES;
		document.head.appendChild(style);
	}, []);

	// Restore position from localStorage or default to bottom-right
	useEffect(() => {
		if (typeof window === "undefined") return;
		const getSize = () => {
			if (window.innerWidth <= 380) {
				return size === "sm" ? 56 : size === "lg" ? 100 : 80;
			}
			if (window.innerWidth <= 640) {
				return size === "sm" ? 64 : size === "lg" ? 120 : 96;
			}
			if (window.innerWidth <= 1024) {
				return size === "sm" ? 72 : size === "lg" ? 140 : 112;
			}
			return size === "sm" ? 80 : size === "lg" ? 160 : 128;
		};
		let pos: Position;
		try {
			const saved = localStorage.getItem(positionStorageKey);
			if (saved) {
				pos = JSON.parse(saved);
			} else {
				const btnSize = getSize();
				pos = {
					x: window.innerWidth - btnSize - 40,
					y: window.innerHeight - btnSize - 40,
				};
			}
		} catch {
			const btnSize = getSize();
			pos = {
				x: window.innerWidth - btnSize - 40,
				y: window.innerHeight - btnSize - 40,
			};
		}
		setPosition(pos);
		buttonPosition.current = pos;
		setMounted(true);
	}, [positionStorageKey, size]);

	useEffect(() => {
		if (containerRef.current && mounted) {
			containerRef.current.style.left = `${position.x}px`;
			containerRef.current.style.top = `${position.y}px`;
		}
	}, [position, mounted]);

	const voiceStateClass = voiceListening
		? "iasted-btn-voice-listening"
		: voiceSpeaking
			? "iasted-btn-voice-speaking"
			: "";

	const handleClick = () => {
		if (isDragging) return;
		const id = Date.now();
		setShockwaves((p) => [...p, { id }]);
		setIsClicked(true);
		setIsProcessingState(true);
		setTimeout(() => setShockwaves((prev) => prev.filter((r) => r.id !== id)), 1000);
		setTimeout(() => setIsClicked(false), 1500);
		setTimeout(() => setIsProcessingState(false), 3000);

		clickCount.current += 1;
		if (clickCount.current === 1) {
			clickTimer.current = setTimeout(() => {
				onClick?.();
				clickCount.current = 0;
			}, 300);
		} else if (clickCount.current === 2) {
			if (clickTimer.current) clearTimeout(clickTimer.current);
			onDoubleClick?.();
			clickCount.current = 0;
		}
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		setIsActive(true);
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			dragStartPos.current = {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			};
		}
	};

	const handleMouseUp = () => {
		setIsActive(false);
		setIsDragging(false);
		try {
			localStorage.setItem(positionStorageKey, JSON.stringify(buttonPosition.current));
		} catch {
			// ignore
		}
	};

	const handleMouseLeave = () => {
		setIsActive(false);
		setIsDragging(false);
		try {
			localStorage.setItem(positionStorageKey, JSON.stringify(buttonPosition.current));
		} catch {
			// ignore
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isActive) return;
		const deltaX = e.movementX;
		const deltaY = e.movementY;
		if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
			setIsDragging(true);
		}
		if (isDragging && containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			const newX = e.clientX - dragStartPos.current.x;
			const newY = e.clientY - dragStartPos.current.y;
			const maxX = window.innerWidth - rect.width;
			const maxY = window.innerHeight - rect.height;
			const constrainedX = Math.max(0, Math.min(newX, maxX));
			const constrainedY = Math.max(0, Math.min(newY, maxY));
			setPosition({ x: constrainedX, y: constrainedY });
			buttonPosition.current = { x: constrainedX, y: constrainedY };
		}
	};

	if (!mounted) return null;

	const inVoiceMode = voiceListening || voiceSpeaking || voiceProcessing;

	const iconSizeVar =
		size === "sm"
			? "clamp(24px, 5vw, 32px)"
			: size === "lg"
				? "clamp(48px, 10vw, 64px)"
				: "clamp(36px, 7vw, 48px)";
	const textSizeVar =
		size === "sm"
			? "clamp(12px, 2.5vw, 14px)"
			: size === "lg"
				? "clamp(20px, 4vw, 28px)"
				: "clamp(16px, 3vw, 20px)";

	return (
		<div
			ref={containerRef}
			className={`iasted-btn-perspective-container ${isDragging ? "iasted-btn-grabbing" : ""}`}
			onMouseMove={handleMouseMove}
		>
			<div className="iasted-btn-perspective">
				<button
					type="button"
					onClick={handleClick}
					onMouseDown={handleMouseDown}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					className={`iasted-btn-thick-matter-button iasted-btn-${size} ${isClicked ? "iasted-btn-color-shift-active" : ""} ${isProcessingState || voiceProcessing ? "iasted-btn-processing" : ""} ${isDragging ? "iasted-btn-grabbing" : ""} ${pulsing ? "iasted-btn-pulsing" : ""} ${voiceStateClass} relative cursor-grab focus:outline-none overflow-hidden border-0 ${className}`}
					style={
						{
							"--iasted-icon-size": iconSizeVar,
							"--iasted-text-size": textSizeVar,
						} as React.CSSProperties
					}
					aria-label={inVoiceMode ? "iAsted en mode vocal" : "Ouvrir iAsted"}
				>
					{/* ── Couches arrière-plan (profondeur 3D) ── */}
					<div className="iasted-btn-depth-layer" />
					<div className="iasted-btn-cellular-layer" />
					<div className="iasted-btn-fluid-waves">
						<div className="iasted-btn-wave-layer iasted-btn-wave-layer-1" />
						<div className="iasted-btn-wave-layer iasted-btn-wave-layer-2" />
						<div className="iasted-btn-wave-layer iasted-btn-wave-layer-3" />
					</div>
					<div className="iasted-btn-satellite-particle" />
					<div className="iasted-btn-organic-membrane" />

					{/* ── Background morphing (cœur coloré) ── */}
					<div className="absolute inset-0 iasted-btn-morphing-bg rounded-full" />

					{/* ── Reflets mobiles (illusion sphérique) ── */}
					<div className="iasted-btn-moving-highlights">
						<div className="iasted-btn-highlight-1" />
						<div className="iasted-btn-highlight-2" />
						<div className="iasted-btn-highlight-3" />
					</div>

					{/* ── Brillance + substance + couches fluides 3D ── */}
					<div className="iasted-btn-shine-effect" />
					<div className="iasted-btn-substance-effect" />
					<div className="iasted-btn-inner-fluid-layer iasted-btn-layer-1" />
					<div className="iasted-btn-inner-fluid-layer iasted-btn-layer-2" />
					<div className="iasted-btn-inner-fluid-layer iasted-btn-layer-3" />

					{/* ── Veines organiques + texture surface ── */}
					<div className="iasted-btn-organic-veins" />
					<div className="iasted-btn-organic-texture" />

					{/* ── Émissions d'ondes (heartbeat) ── */}
					<div className="iasted-btn-wave-emission iasted-btn-wave-1" />
					<div className="iasted-btn-wave-emission iasted-btn-wave-2" />
					<div className="iasted-btn-wave-emission iasted-btn-wave-3" />

					{/* ── Couche brillance haut + bulles respiratoires ── */}
					<div className="iasted-btn-highlight-layer" />
					<div className="iasted-btn-breathing-bubble iasted-btn-bubble-1" />
					<div className="iasted-btn-breathing-bubble iasted-btn-bubble-2" />
					<div className="iasted-btn-breathing-bubble iasted-btn-bubble-3" />

					{shockwaves.map((sw) => (
						<div key={sw.id} className="iasted-btn-shockwave" />
					))}

					<div className="iasted-btn-fixed-icons-container">
						<div className="relative w-full h-full flex justify-center items-center">
							{isInterfaceOpen && !inVoiceMode ? (
								<MessageCircle
									className="text-white iasted-btn-icon-svg"
									style={{ opacity: 1, transform: "scale(1.2)" }}
								/>
							) : voiceListening ? (
								<Mic
									className="text-white iasted-btn-icon-svg"
									style={{ opacity: 1, transform: "scale(1.3)" }}
								/>
							) : voiceSpeaking ? (
								<span
									className="text-white iasted-btn-iasted-text"
									style={{ opacity: 1, transform: "scale(1.2)" }}
								>
									iAsted
								</span>
							) : voiceProcessing ? (
								<Brain
									className="text-white iasted-btn-icon-svg"
									style={{ opacity: 1, transform: "scale(1.2)" }}
								/>
							) : (
								<>
									<span className="iasted-btn-alternating-element iasted-btn-text-element text-white iasted-btn-iasted-text">
										iAsted
									</span>
									<Mic className="iasted-btn-alternating-element iasted-btn-mic-element text-white iasted-btn-icon-svg" />
									<MessageCircle className="iasted-btn-alternating-element iasted-btn-chat-element text-white iasted-btn-icon-svg" />
									<Brain className="iasted-btn-alternating-element iasted-btn-brain-element text-white iasted-btn-icon-svg" />
								</>
							)}
						</div>
					</div>

					{inVoiceMode && (
						<div className="iasted-btn-voice-mode-badge">
							<Mic />
						</div>
					)}
				</button>
			</div>
		</div>
	);
}

export default IAstedButtonFull;
