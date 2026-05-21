/**
 * releases.ts — Proxy vers les GitHub Releases de `okatech-org/administration.ga`.
 *
 * Objectif : exposer les binaires desktop (agent-desktop) aux clients publics
 * sans dépendre de la visibilité du repo. Si le repo passe en privé, on injecte
 * simplement un PAT via `GITHUB_TOKEN` (env Convex) et tout continue de
 * fonctionner. Les URL publiques ne changent jamais.
 *
 * Deux endpoints :
 *  - `api.functions.releases.getLatest` : action publique → métadonnées de la
 *    dernière release (version, assets, notes). Consommée par le client pour
 *    construire l'UI (popover navbar, page /downloads).
 *  - HTTP route `GET /releases/download?asset=...` (voir `convex/http.ts`) :
 *    stream du binaire depuis GitHub avec le token serveur.
 */

import { v } from "convex/values";
import { action } from "../_generated/server";

const REPO_OWNER = "okatech-org";
const REPO_NAME = "administration.ga";

/**
 * Architecture détectée depuis le nom de l'asset electron-builder.
 * Pattern : `${productName}-${version}-mac-${arch}.${ext}`
 *         | `${productName}-${version}-win-${arch}-Setup.${ext}`
 */
export type Platform = "mac" | "win" | "linux";
export type Arch = "x64" | "arm64" | "universal";
export type Kind = "installer" | "update" | "checksum";

export interface ReleaseAsset {
	/** Nom de fichier brut (ex. "Consulat Agent-1.0.0-mac-arm64.dmg") */
	name: string;
	/** Taille en octets */
	size: number;
	/** Plateforme déduite du nom */
	platform: Platform | null;
	/** Architecture déduite du nom */
	arch: Arch | null;
	/** Type d'asset */
	kind: Kind;
	/** Extension (dmg, zip, exe, yml, blockmap…) */
	ext: string;
	/** URL proxy vers le backend Convex — ne pointe JAMAIS sur GitHub */
	downloadUrl: string;
}

export interface LatestRelease {
	version: string;
	publishedAt: string;
	htmlUrl: string;
	notes: string;
	assets: ReleaseAsset[];
}

interface GitHubAsset {
	name: string;
	size: number;
	browser_download_url: string;
	// biome-ignore lint/style/useNamingConvention: GitHub API naming
	url: string;
}

interface GitHubRelease {
	tag_name: string;
	name: string | null;
	body: string | null;
	published_at: string;
	html_url: string;
	draft: boolean;
	prerelease: boolean;
	assets: GitHubAsset[];
}

function parseAssetName(name: string): {
	platform: Platform | null;
	arch: Arch | null;
	kind: Kind;
	ext: string;
} {
	const lower = name.toLowerCase();
	const ext = lower.split(".").pop() ?? "";

	// Metadata files (electron-updater)
	if (lower.endsWith(".yml") || lower.endsWith(".yaml")) {
		const platform: Platform | null = lower.includes("mac")
			? "mac"
			: lower.includes("linux")
				? "linux"
				: "win";
		return { platform, arch: null, kind: "update", ext };
	}
	if (lower.endsWith(".blockmap") || lower.includes("checksum")) {
		return { platform: null, arch: null, kind: "checksum", ext };
	}

	let platform: Platform | null = null;
	if (lower.includes("-mac-") || lower.endsWith(".dmg")) platform = "mac";
	else if (lower.includes("-win-") || lower.endsWith(".exe")) platform = "win";
	else if (lower.includes("-linux-") || lower.endsWith(".appimage"))
		platform = "linux";

	let arch: Arch | null = null;
	if (lower.includes("arm64") || lower.includes("aarch64")) arch = "arm64";
	else if (lower.includes("universal")) arch = "universal";
	else if (lower.includes("x64") || lower.includes("x86_64")) arch = "x64";

	return { platform, arch, kind: "installer", ext };
}

async function fetchLatestRelease(): Promise<GitHubRelease | null> {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "consulat-agent-release-proxy",
	};
	const token = process.env.GITHUB_TOKEN;
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(
		`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
		{ headers },
	);
	// 404 = pas encore de release publiée (cas legitime avant le premier ship).
	// On retourne null pour que l'UI puisse afficher un état "à venir" plutôt
	// qu'une erreur rouge.
	if (res.status === 404) {
		return null;
	}
	if (!res.ok) {
		throw new Error(
			`GitHub API returned ${res.status} ${res.statusText} when fetching latest release`,
		);
	}
	return (await res.json()) as GitHubRelease;
}

/**
 * Public action — returns the latest release metadata with asset URLs pointing
 * to our Convex HTTP proxy (never to GitHub directly). Safe to call from the
 * browser without auth.
 */
export const getLatest = action({
	args: {},
	handler: async (): Promise<LatestRelease | null> => {
		const siteUrl = process.env.CONVEX_SITE_URL;
		if (!siteUrl) {
			throw new Error("CONVEX_SITE_URL is not set in Convex environment");
		}

		const release = await fetchLatestRelease();
		// Aucune release publiée encore — cas legitime avant le premier ship.
		if (!release) {
			return null;
		}

		const assets: ReleaseAsset[] = release.assets.map((asset) => {
			const { platform, arch, kind, ext } = parseAssetName(asset.name);
			return {
				name: asset.name,
				size: asset.size,
				platform,
				arch,
				kind,
				ext,
				downloadUrl: `${siteUrl}/releases/download?asset=${encodeURIComponent(asset.name)}`,
			};
		});

		return {
			version: release.tag_name.replace(/^v/, ""),
			publishedAt: release.published_at,
			htmlUrl: release.html_url,
			notes: release.body ?? "",
			assets,
		};
	},
});

/**
 * Internal helper — used by the HTTP download route to resolve an asset name
 * to its GitHub download URL and stream headers. Called from `convex/http.ts`.
 */
export async function resolveAssetForDownload(assetName: string): Promise<{
	url: string;
	size: number;
	contentType: string;
} | null> {
	const release = await fetchLatestRelease();
	const match = release.assets.find((a) => a.name === assetName);
	if (!match) return null;

	// For PRIVATE repos, `browser_download_url` returns HTML unless we use the
	// API `url` with Accept: application/octet-stream. For PUBLIC repos either
	// works — we use the API URL uniformly for future-proofing.
	const ext = assetName.split(".").pop()?.toLowerCase() ?? "";
	const contentType =
		ext === "dmg"
			? "application/x-apple-diskimage"
			: ext === "exe"
				? "application/vnd.microsoft.portable-executable"
				: ext === "zip"
					? "application/zip"
					: ext === "yml" || ext === "yaml"
						? "text/yaml; charset=utf-8"
						: "application/octet-stream";

	return { url: match.url, size: match.size, contentType };
}
