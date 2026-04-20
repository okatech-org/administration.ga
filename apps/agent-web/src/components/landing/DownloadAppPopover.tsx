"use client";

import { Link as RouterLink } from "@workspace/routing";
import { Apple, Download, Loader2, Monitor } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@/lib/utils";
import {
	pickInstaller,
	useLatestRelease,
} from "@/hooks/use-latest-release";
import { useUserAgentOS } from "@/hooks/use-user-agent-os";

function formatSize(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	return mb >= 100 ? `${mb.toFixed(0)} Mo` : `${mb.toFixed(1)} Mo`;
}

function PlatformIcon({ platform }: { platform: "mac" | "win" | "linux" }) {
	if (platform === "mac") return <Apple className="size-4" />;
	if (platform === "win") return <Monitor className="size-4" />;
	return <Monitor className="size-4" />;
}

/**
 * Compact download button + popover for the landing navbar.
 *
 * - Auto-detects the user's OS/arch
 * - Proposes the best matching installer as the primary CTA
 * - Popover shows all assets of the latest release + link to /downloads
 */
export function DownloadAppPopover({ isDark = true }: { isDark?: boolean }) {
	const os = useUserAgentOS();
	const { release, loading, error } = useLatestRelease();
	const [open, setOpen] = useState(false);

	const recommended =
		release && os.platform !== "unknown"
			? pickInstaller(release, os.platform, os.arch)
			: null;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus-ring",
						isDark
							? "text-white/80 hover:text-white hover:bg-white/10"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
					aria-label="Télécharger l'application"
				>
					<Download className="size-3.5" />
					<span className="hidden lg:inline">Télécharger</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-80 p-0 overflow-hidden border-white/10 bg-zinc-950/95 backdrop-blur-xl text-white"
			>
				<div className="p-4 border-b border-white/10">
					<h3 className="text-sm font-semibold">Application Desktop</h3>
					<p className="text-xs text-white/60 mt-0.5">
						Consulat Agent — client natif pour poste agent
					</p>
				</div>

				<div className="p-4 space-y-3">
					{loading && (
						<div className="flex items-center gap-2 text-xs text-white/60">
							<Loader2 className="size-3.5 animate-spin" />
							Récupération de la dernière version…
						</div>
					)}

					{error && (
						<div className="text-xs text-rose-300">
							Impossible de contacter le serveur de mise à jour.
						</div>
					)}

					{release && recommended && (
						<>
							<div className="text-xs text-white/60">
								Version <span className="font-mono text-white/90">{release.version}</span> détectée
								pour <span className="text-white/90">{os.label}</span>
							</div>
							<a
								href={recommended.downloadUrl}
								className={cn(
									"flex items-center gap-3 w-full px-4 py-3 rounded-xl",
									"bg-emerald-500/15 border border-emerald-400/30 text-white",
									"hover:bg-emerald-500/25 transition-colors",
								)}
							>
								{recommended.platform && (
									<PlatformIcon platform={recommended.platform} />
								)}
								<div className="flex-1 text-left">
									<div className="text-sm font-semibold">
										Télécharger pour {os.label}
									</div>
									<div className="text-[11px] text-white/60 font-mono">
										{recommended.ext.toUpperCase()} · {formatSize(recommended.size)}
									</div>
								</div>
								<Download className="size-4 shrink-0" />
							</a>
						</>
					)}

					{release && !recommended && (
						<div className="text-xs text-white/70">
							Aucun installeur disponible pour votre système. Consultez{" "}
							<RouterLink href="/downloads" className="text-emerald-300 underline">
								toutes les versions
							</RouterLink>
							.
						</div>
					)}

					<RouterLink
						href="/downloads"
						onClick={() => setOpen(false)}
						className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
					>
						Voir toutes les plateformes →
					</RouterLink>
				</div>
			</PopoverContent>
		</Popover>
	);
}
