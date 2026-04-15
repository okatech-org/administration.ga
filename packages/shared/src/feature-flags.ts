/**
 * Feature flags — miroir cross-app.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase η (backoffice config réel).
 *
 * Duplique volontairement l'implémentation de
 * `apps/agent-web/src/lib/feature-flags.ts` pour que le backoffice puisse
 * consommer les mêmes valeurs sans dépendance cross-app. La source de vérité
 * reste les variables `NEXT_PUBLIC_FEATURE_*` côté env.
 *
 * ⚠ Si un flag est ajouté ou modifié dans `apps/agent-web/src/lib/feature-flags.ts`,
 * il doit l'être aussi ici (les env vars sont évaluées au build, donc les deux
 * implémentations lisent les mêmes valeurs au runtime).
 */

export const FEATURES = {
	callCenter: process.env.NEXT_PUBLIC_FEATURE_CALL_CENTER !== "0",
	egress: process.env.NEXT_PUBLIC_FEATURE_EGRESS === "1",
	push: process.env.NEXT_PUBLIC_FEATURE_PUSH === "1",
	supervisionWhisper:
		process.env.NEXT_PUBLIC_FEATURE_SUPERVISION_WHISPER !== "0",
	e2eMode: process.env.NEXT_PUBLIC_E2E_MODE === "true",
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
	return FEATURES[flag];
}

/**
 * Structure descriptive pour alimenter `<FeatureFlagsPanel>` backoffice.
 * Les libellés sont en FR (aligné sur les autres UI admin).
 */
export const FEATURE_DESCRIPTORS: Record<
	FeatureFlag,
	{ label: string; description: string }
> = {
	callCenter: {
		label: "Centre d'appels multi-lignes",
		description:
			"Active le module call-center Sprint 6 (queue, voicemail, supervision, recordings).",
	},
	egress: {
		label: "Enregistrement RoomEgress",
		description:
			"Capture audio/vidéo des appels LiveKit pour archivage RGPD (coûte cloud).",
	},
	push: {
		label: "Notifications push",
		description:
			"Alertes iOS/Android pour appels, voicemails et messages (nécessite VAPID).",
	},
	supervisionWhisper: {
		label: "Whisper / Barge-in superviseur",
		description:
			"Modes listen/whisper/barge LiveKit pour la supervision agent.",
	},
	e2eMode: {
		label: "Mode E2E",
		description:
			"Expose le bridge Playwright `window.__e2eDevSignIn` (tests uniquement).",
	},
};
