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
 *
 * Lecture d'env tolérante : côté Next.js `process.env.NEXT_PUBLIC_*` est inliné
 * au build ; côté Vite (agent-desktop) on bascule sur `import.meta.env` avec le
 * même nom de variable (Vite injecte automatiquement les `NEXT_PUBLIC_*` si
 * elles sont présentes, ou on peut forcer via `define`). Sans aucun des deux,
 * les flags prennent leurs valeurs par défaut.
 */

function readEnv(key: string): string | undefined {
	// Next.js / Node — `process.env` est un objet statique.
	if (typeof process !== "undefined" && process.env) {
		const val = process.env[key];
		if (val !== undefined) return val;
	}
	// Vite — `import.meta.env` est inliné au build.
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const meta = (import.meta as any);
		if (meta?.env && typeof meta.env === "object") {
			const val = meta.env[key];
			if (val !== undefined) return String(val);
		}
	} catch {
		// import.meta n'est pas supporté dans ce contexte — ignore.
	}
	return undefined;
}

export const FEATURES = {
	callCenter: readEnv("NEXT_PUBLIC_FEATURE_CALL_CENTER") !== "0",
	egress: readEnv("NEXT_PUBLIC_FEATURE_EGRESS") === "1",
	push: readEnv("NEXT_PUBLIC_FEATURE_PUSH") === "1",
	supervisionWhisper:
		readEnv("NEXT_PUBLIC_FEATURE_SUPERVISION_WHISPER") !== "0",
	e2eMode: readEnv("NEXT_PUBLIC_E2E_MODE") === "true",
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
