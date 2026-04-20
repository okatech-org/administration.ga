"use client";

import { Apple, Download, ExternalLink, Loader2, Monitor } from "lucide-react";
import {
	pickInstaller,
	useLatestRelease,
	type ReleaseAsset,
} from "@/hooks/use-latest-release";
import { useUserAgentOS } from "@/hooks/use-user-agent-os";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	return mb >= 100 ? `${mb.toFixed(0)} Mo` : `${mb.toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return iso;
	}
}

function PlatformSection({
	title,
	icon: Icon,
	assets,
}: {
	title: string;
	icon: typeof Apple;
	assets: ReleaseAsset[];
}) {
	if (assets.length === 0) return null;
	return (
		<section className="space-y-3">
			<div className="flex items-center gap-2">
				<Icon className="size-5" />
				<h2 className="text-lg font-semibold">{title}</h2>
			</div>
			<div className="grid gap-2">
				{assets.map((asset) => (
					<a
						key={asset.name}
						href={asset.downloadUrl}
						className={cn(
							"flex items-center gap-3 p-4 rounded-xl",
							"bg-card border border-border",
							"hover:bg-accent hover:border-primary/30 transition-colors",
						)}
					>
						<div className="flex-1 min-w-0">
							<div className="text-sm font-medium font-mono truncate">
								{asset.name}
							</div>
							<div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
								<span className="uppercase">{asset.ext}</span>
								<span>·</span>
								<span>{formatSize(asset.size)}</span>
								{asset.arch && (
									<>
										<span>·</span>
										<span className="font-mono">{asset.arch}</span>
									</>
								)}
							</div>
						</div>
						<Download className="size-4 text-muted-foreground shrink-0" />
					</a>
				))}
			</div>
		</section>
	);
}

export function DownloadsPageClient() {
	const os = useUserAgentOS();
	const { release, loading, error, refetch } = useLatestRelease();

	const recommended =
		release && os.platform !== "unknown"
			? pickInstaller(release, os.platform, os.arch)
			: null;

	const macAssets = release?.assets.filter(
		(a) => a.platform === "mac" && a.kind === "installer",
	) ?? [];
	const winAssets = release?.assets.filter(
		(a) => a.platform === "win" && a.kind === "installer",
	) ?? [];
	const linuxAssets = release?.assets.filter(
		(a) => a.platform === "linux" && a.kind === "installer",
	) ?? [];

	return (
		<div className="min-h-dvh bg-background text-foreground">
			<div className="container mx-auto px-6 py-12 lg:py-20 max-w-4xl">
				<header className="mb-12">
					<h1 className="text-4xl lg:text-5xl font-black tracking-tight">
						Télécharger Consulat Agent
					</h1>
					<p className="mt-3 text-lg text-muted-foreground">
						Application desktop native pour les agents consulaires. Intègre
						l'impression de cartes, les appels, iAsted et toutes les
						fonctionnalités de l'espace agent.
					</p>
					{release && (
						<div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<span className="font-mono px-2 py-0.5 rounded bg-muted">
								v{release.version}
							</span>
							<span>Publié le {formatDate(release.publishedAt)}</span>
							<a
								href={release.htmlUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-primary hover:underline"
							>
								Notes de version <ExternalLink className="size-3" />
							</a>
						</div>
					)}
				</header>

				{loading && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="size-4 animate-spin" /> Chargement…
					</div>
				)}

				{error && (
					<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between">
						<div>
							<div className="font-medium">Impossible de charger les versions</div>
							<div className="text-sm text-muted-foreground mt-1">
								{error.message}
							</div>
						</div>
						<Button variant="outline" size="sm" onClick={refetch}>
							Réessayer
						</Button>
					</div>
				)}

				{release && (
					<div className="space-y-10">
						{recommended && (
							<section
								className={cn(
									"rounded-2xl p-6 lg:p-8",
									"bg-gradient-to-br from-primary/10 to-primary/5",
									"border border-primary/20",
								)}
							>
								<div className="text-xs uppercase tracking-wide text-primary font-semibold">
									Recommandé pour {os.label}
								</div>
								<div className="mt-2 text-2xl font-bold font-mono">
									{recommended.name}
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									{formatSize(recommended.size)} · {recommended.ext.toUpperCase()}
								</div>
								<a
									href={recommended.downloadUrl}
									className={cn(
										"mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl",
										"bg-primary text-primary-foreground font-semibold",
										"hover:bg-primary/90 transition-colors",
									)}
								>
									<Download className="size-4" />
									Télécharger maintenant
								</a>
							</section>
						)}

						<PlatformSection title="macOS" icon={Apple} assets={macAssets} />
						<PlatformSection title="Windows" icon={Monitor} assets={winAssets} />
						<PlatformSection title="Linux" icon={Monitor} assets={linuxAssets} />

						<section className="pt-8 border-t border-border text-sm text-muted-foreground space-y-2">
							<p>
								<strong className="text-foreground">macOS :</strong> les Mac
								Apple Silicon (M1–M4) utilisent la version <code>arm64</code>.
								Les Mac Intel (pré-2020) utilisent <code>x64</code>.
							</p>
							<p>
								<strong className="text-foreground">Windows :</strong> installeur
								NSIS — permet de choisir le dossier d'installation.
							</p>
							<p>
								L'application se met à jour automatiquement. En cas de
								problème, téléchargez à nouveau la dernière version depuis
								cette page.
							</p>
						</section>
					</div>
				)}
			</div>
		</div>
	);
}
