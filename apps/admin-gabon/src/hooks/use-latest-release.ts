"use client";

import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { DetectedArch, DetectedPlatform } from "./use-user-agent-os";

/**
 * Convex action return type — kept here as a duplicated interface because
 * importing types from `convex/functions/...` from the browser tree can pull
 * Node-only modules. Kept in sync with `convex/functions/releases.ts`.
 */
export interface ReleaseAsset {
	name: string;
	size: number;
	platform: "mac" | "win" | "linux" | null;
	arch: "x64" | "arm64" | "universal" | null;
	kind: "installer" | "update" | "checksum";
	ext: string;
	downloadUrl: string;
}

export interface LatestRelease {
	version: string;
	publishedAt: string;
	htmlUrl: string;
	notes: string;
	assets: ReleaseAsset[];
}

export interface UseLatestReleaseResult {
	release: LatestRelease | null;
	loading: boolean;
	error: Error | null;
	/**
	 * `true` quand l'action a répondu avec succès mais qu'aucune release n'a
	 * encore été publiée (GitHub a renvoyé 404 sur `/releases/latest`).
	 * Distinct de `error`, qui est réservé aux échecs réseau/upstream.
	 */
	noReleaseAvailable: boolean;
	/** Re-fetch manually (e.g. retry after error). */
	refetch: () => void;
}

/**
 * Fetches the latest agent-desktop release via the Convex proxy action.
 * Cached in memory across remounts during a page session to avoid re-hitting
 * GitHub on every navigation.
 */
let cachedRelease: LatestRelease | null = null;
let cachedAt = 0;
let cachedNoRelease = false;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function useLatestRelease(): UseLatestReleaseResult {
	const getLatest = useAction(api.functions.releases.getLatest);
	const [release, setRelease] = useState<LatestRelease | null>(cachedRelease);
	const [loading, setLoading] = useState<boolean>(
		cachedRelease === null && !cachedNoRelease,
	);
	const [error, setError] = useState<Error | null>(null);
	const [noReleaseAvailable, setNoReleaseAvailable] =
		useState<boolean>(cachedNoRelease);
	const [nonce, setNonce] = useState(0);

	useEffect(() => {
		let cancelled = false;
		const now = Date.now();
		const cacheStillValid = now - cachedAt < CACHE_TTL_MS;
		if (cacheStillValid && (cachedRelease || cachedNoRelease)) {
			setRelease(cachedRelease);
			setNoReleaseAvailable(cachedNoRelease);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		getLatest()
			.then((r) => {
				if (cancelled) return;
				cachedAt = Date.now();
				if (r === null) {
					cachedRelease = null;
					cachedNoRelease = true;
					setRelease(null);
					setNoReleaseAvailable(true);
				} else {
					cachedRelease = r as LatestRelease;
					cachedNoRelease = false;
					setRelease(cachedRelease);
					setNoReleaseAvailable(false);
				}
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				setError(e instanceof Error ? e : new Error(String(e)));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [getLatest, nonce]);

	return {
		release,
		loading,
		error,
		noReleaseAvailable,
		refetch: () => {
			cachedRelease = null;
			cachedNoRelease = false;
			cachedAt = 0;
			setNonce((n) => n + 1);
		},
	};
}

/**
 * Picks the best installer asset for a given platform/arch from a release.
 * Falls back gracefully: arm64 → universal → x64 for macOS, etc.
 */
export function pickInstaller(
	release: LatestRelease,
	platform: DetectedPlatform,
	arch: DetectedArch,
): ReleaseAsset | null {
	if (platform === "unknown") return null;
	const installers = release.assets.filter(
		(a) => a.kind === "installer" && a.platform === platform,
	);
	if (installers.length === 0) return null;

	// macOS DMG preferred over ZIP
	const preferExt = (a: ReleaseAsset): number => {
		if (platform === "mac") return a.ext === "dmg" ? 0 : 1;
		if (platform === "win") return a.ext === "exe" ? 0 : 1;
		return 0;
	};

	const scored = installers
		.map((a) => {
			let score = 10;
			if (a.arch === arch) score = 0;
			else if (a.arch === "universal") score = 1;
			else if (arch === "unknown") score = 2;
			return { asset: a, score: score + preferExt(a) * 0.1 };
		})
		.sort((a, b) => a.score - b.score);

	return scored[0]?.asset ?? null;
}
