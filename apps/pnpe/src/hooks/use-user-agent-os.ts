"use client";

import { useEffect, useState } from "react";

export type DetectedPlatform = "mac" | "win" | "linux" | "unknown";
export type DetectedArch = "x64" | "arm64" | "unknown";

export interface DetectedOS {
	platform: DetectedPlatform;
	arch: DetectedArch;
	/** Human-readable label, e.g. "macOS (Apple Silicon)" or "Windows" */
	label: string;
}

interface UserAgentDataBrand {
	brand: string;
	version: string;
}
interface UserAgentDataHighEntropy {
	architecture?: string;
	bitness?: string;
	platform?: string;
}
interface NavigatorUAData {
	brands: UserAgentDataBrand[];
	mobile: boolean;
	platform: string;
	getHighEntropyValues?: (
		hints: string[],
	) => Promise<UserAgentDataHighEntropy>;
}

function parseLegacy(userAgent: string): DetectedPlatform {
	const ua = userAgent.toLowerCase();
	if (ua.includes("mac") && !ua.includes("iphone") && !ua.includes("ipad"))
		return "mac";
	if (ua.includes("windows") || ua.includes("win32") || ua.includes("win64"))
		return "win";
	if (ua.includes("linux") && !ua.includes("android")) return "linux";
	return "unknown";
}

function labelFor(platform: DetectedPlatform, arch: DetectedArch): string {
	if (platform === "mac")
		return arch === "arm64"
			? "macOS (Apple Silicon)"
			: arch === "x64"
				? "macOS (Intel)"
				: "macOS";
	if (platform === "win")
		return arch === "arm64" ? "Windows (ARM)" : "Windows";
	if (platform === "linux") return "Linux";
	return "votre système";
}

/**
 * Detects the user's OS + architecture for download recommendations.
 *
 * Uses `navigator.userAgentData.getHighEntropyValues()` (Chromium) when
 * available for accurate Apple Silicon detection, falls back to legacy UA
 * string parsing (Safari, Firefox) — which cannot distinguish arm64 from x64
 * on macOS, so we default to `arm64` on Mac (most common since 2020).
 */
export function useUserAgentOS(): DetectedOS {
	const [os, setOs] = useState<DetectedOS>({
		platform: "unknown",
		arch: "unknown",
		label: "votre système",
	});

	useEffect(() => {
		let cancelled = false;

		const legacyPlatform = parseLegacy(
			typeof navigator !== "undefined" ? navigator.userAgent : "",
		);

		// biome-ignore lint/suspicious/noExplicitAny: UA-CH feature detection
		const uaData = (navigator as any).userAgentData as
			| NavigatorUAData
			| undefined;

		if (uaData?.getHighEntropyValues) {
			uaData
				.getHighEntropyValues(["architecture", "bitness", "platform"])
				.then((hints) => {
					if (cancelled) return;
					const plat = (hints.platform ?? uaData.platform ?? "").toLowerCase();
					const arch = (hints.architecture ?? "").toLowerCase();

					const platform: DetectedPlatform = plat.includes("mac")
						? "mac"
						: plat.includes("windows")
							? "win"
							: plat.includes("linux")
								? "linux"
								: legacyPlatform;

					const detectedArch: DetectedArch =
						arch === "arm" || arch === "arm64"
							? "arm64"
							: arch === "x86"
								? "x64"
								: platform === "mac"
									? "arm64" // Safari/Firefox fallback — most Macs since 2020
									: "x64";

					setOs({
						platform,
						arch: detectedArch,
						label: labelFor(platform, detectedArch),
					});
				})
				.catch(() => {
					const detectedArch: DetectedArch =
						legacyPlatform === "mac" ? "arm64" : "x64";
					setOs({
						platform: legacyPlatform,
						arch: detectedArch,
						label: labelFor(legacyPlatform, detectedArch),
					});
				});
		} else {
			const detectedArch: DetectedArch =
				legacyPlatform === "mac" ? "arm64" : "x64";
			setOs({
				platform: legacyPlatform,
				arch: detectedArch,
				label: labelFor(legacyPlatform, detectedArch),
			});
		}

		return () => {
			cancelled = true;
		};
	}, []);

	return os;
}
