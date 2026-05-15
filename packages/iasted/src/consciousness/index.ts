/**
 * @workspace/iasted/consciousness — Module de conscience iAsted.
 *
 * Port adapté depuis `mairie.ga/src/Consciousness/` pour le contexte
 * diplomatique gabonais.
 *
 * Exports :
 *   - `iAstedSoul` : singleton state manager (persona, spatial, context, lifecycle)
 *   - `useIAstedSoul` : hook React qui sync soul + voiceController + pathname
 *   - `SocialProtocolAdapter` : helpers de génération de messages (welcome/closing/confirm)
 *   - `MotorSynapse` : bus de commandes pour le curseur visuel
 *   - `IAstedCursor` : composant React qui rend l'orbe d'attention
 */

export { iAstedSoul, derivePersonaFromRole } from "./iAstedSoul";
export type {
	IAstedRole,
	FormalityLevel,
	EmotionalState,
	Persona,
	SpatialAwareness,
	ConversationContext,
	KnownUser,
	SoulState,
} from "./iAstedSoul";

export { useIAstedSoul } from "./useIAstedSoul";
export type { UseIAstedSoulOptions } from "./useIAstedSoul";

export {
	SocialProtocolAdapter,
	prefixWithProtocol,
	getTimeGreeting,
	mapConvexRoleToIAsted,
} from "./SocialProtocolAdapter";

export { MotorSynapse } from "./motor-cortex/MotorSynapse";
export type {
	MotorCommand,
	CursorEmotion,
	PulseIntensity,
} from "./motor-cortex/MotorSynapse";

export { IAstedCursor } from "./motor-cortex/IAstedCursor";
export type { IAstedCursorProps } from "./motor-cortex/IAstedCursor";
