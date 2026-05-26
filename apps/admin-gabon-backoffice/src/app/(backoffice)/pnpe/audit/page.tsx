/**
 * Audit PNPE — journal des actions sur la verticale emploi.
 *
 * Vue filtrée du journal d'audit national (`api.functions.admin.getAuditLogs`)
 * sur les actions ciblant les tables PNPE : demandeurs, employeurs, offres,
 * candidatures, contrats, programmes Auto-Emploi, antennes.
 *
 * MVP : liste paginée + filtre par catégorie. Export CSV à brancher dans
 * une PR ultérieure (déjà disponible côté /audit-logs global).
 */
"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Briefcase,
	ClipboardList,
	Filter,
	History,
	Loader2,
	MapPin,
	Shield,
	Users,
} from "lucide-react";

// ─── Catégorisation des actions PNPE ─────────────────────────

const PNPE_ACTION_GROUPS: Record<
	string,
	{ label: string; icon: React.ElementType; tone: string; patterns: string[] }
> = {
	demandeur: {
		label: "Demandeurs",
		icon: Users,
		tone: "blue",
		patterns: ["demandeur"],
	},
	employeur: {
		label: "Employeurs",
		icon: Briefcase,
		tone: "rose",
		patterns: ["employeur"],
	},
	offre: {
		label: "Offres",
		icon: ClipboardList,
		tone: "indigo",
		patterns: ["offre"],
	},
	candidature: {
		label: "Candidatures",
		icon: ClipboardList,
		tone: "amber",
		patterns: ["candidature"],
	},
	contrat: {
		label: "Contrats",
		icon: Shield,
		tone: "emerald",
		patterns: ["contrat"],
	},
	antenne: {
		label: "Antennes",
		icon: MapPin,
		tone: "teal",
		patterns: ["antenne"],
	},
};

const TONE_BG: Record<string, string> = {
	blue: "bg-blue-500/10 text-blue-600",
	rose: "bg-rose-500/10 text-rose-600",
	indigo: "bg-indigo-500/10 text-indigo-600",
	amber: "bg-amber-500/10 text-amber-600",
	emerald: "bg-emerald-500/10 text-emerald-600",
	teal: "bg-teal-500/10 text-teal-600",
	slate: "bg-slate-500/10 text-slate-600",
};

function getPnpeGroup(action: string): keyof typeof PNPE_ACTION_GROUPS | null {
	const lc = action.toLowerCase();
	for (const [groupKey, meta] of Object.entries(PNPE_ACTION_GROUPS)) {
		if (meta.patterns.some((p) => lc.includes(p))) {
			return groupKey as keyof typeof PNPE_ACTION_GROUPS;
		}
	}
	return null;
}

function formatDateTime(ts: number): string {
	return new Date(ts).toLocaleString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ─── Page ─────────────────────────────────────────────────────

export default function PnpeAuditPage() {
	const { t } = useTranslation();
	const [groupFilter, setGroupFilter] = useState<string | null>(null);

	const {
		results: allLogs,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.admin.getAuditLogs,
		{},
		{ initialNumItems: 100 },
	);

	const parsedLogs = useMemo(() => {
		return (
			allLogs?.map((log: any) => ({
				...log,
				details:
					typeof log.details === "string"
						? JSON.parse(log.details)
						: log.details,
				_pnpeGroup: getPnpeGroup(log.action),
			})) ?? []
		);
	}, [allLogs]);

	// Filtre PNPE-only : on ne garde que les actions catégorisées
	const pnpeLogs = useMemo(
		() => parsedLogs.filter((log: any) => log._pnpeGroup !== null),
		[parsedLogs],
	);

	const filteredLogs = useMemo(() => {
		if (!groupFilter) return pnpeLogs;
		return pnpeLogs.filter((log: any) => log._pnpeGroup === groupFilter);
	}, [pnpeLogs, groupFilter]);

	const groupCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const log of pnpeLogs) {
			const g = log._pnpeGroup;
			if (g) counts[g] = (counts[g] ?? 0) + 1;
		}
		return counts;
	}, [pnpeLogs]);

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.audit.title", "Audit PNPE")}
				subtitle={t(
					"pnpe.audit.subtitle",
					"Journal des actions sur la verticale emploi — filtré depuis l'audit national",
				)}
				icon={History}
			/>

			{/* ─── Filtres par catégorie ───────────────── */}
			<section>
				<SectionHeader
					icon={<Filter />}
					title={t("pnpe.audit.filters.title", "Filtrer par catégorie")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.audit.filters.subtitle",
						`Total PNPE : ${pnpeLogs.length} évènement(s) sur les 100 derniers logs nationaux`,
					)}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant={groupFilter === null ? "default" : "outline"}
						onClick={() => setGroupFilter(null)}
					>
						Tous ({pnpeLogs.length})
					</Button>
					{Object.entries(PNPE_ACTION_GROUPS).map(([key, meta]) => {
						const count = groupCounts[key] ?? 0;
						const Icon = meta.icon;
						return (
							<Button
								key={key}
								size="sm"
								variant={groupFilter === key ? "default" : "outline"}
								onClick={() => setGroupFilter(key)}
								className="gap-1.5"
							>
								<Icon className="h-3.5 w-3.5" />
								{meta.label} ({count})
							</Button>
						);
					})}
				</div>
			</section>

			{/* ─── Liste des logs ───────────────────────── */}
			<section>
				<SectionHeader
					icon={<History />}
					title={t("pnpe.audit.list.title", "Évènements")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.audit.list.subtitle",
						"Triés du plus récent. Cliquer pour voir le payload JSON détaillé (à brancher).",
					)}
				</p>
				<FlatCard>
					<div className="p-1">
						{isLoading && filteredLogs.length === 0 ? (
							<div className="p-3 space-y-2">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : filteredLogs.length === 0 ? (
							<div className="p-6 text-sm text-muted-foreground text-center">
								{t(
									"pnpe.audit.list.empty",
									"Aucun évènement PNPE dans cette catégorie. Les actions sont enregistrées au fil des mutations conseiller / employeur.",
								)}
							</div>
						) : (
							<div className="divide-y">
								{filteredLogs.map((log: any) => {
									const group = log._pnpeGroup
										? PNPE_ACTION_GROUPS[
												log._pnpeGroup as keyof typeof PNPE_ACTION_GROUPS
											]
										: null;
									const Icon = group?.icon ?? History;
									return (
										<div
											key={log._id}
											className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-sm"
										>
											<div
												className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_BG[group?.tone ?? "slate"]}`}
											>
												<Icon className="h-4 w-4" />
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<code className="text-xs px-1.5 py-0.5 rounded bg-muted">
														{log.action}
													</code>
													{log.targetType && (
														<span className="text-xs text-muted-foreground">
															sur {log.targetType}
														</span>
													)}
												</div>
												<div className="text-xs text-muted-foreground truncate mt-0.5">
													{log.user
														? `${log.user.firstName ?? ""} ${log.user.lastName ?? ""}`.trim() ||
															log.user.email
														: "—"}
													{log.targetId && (
														<>
															{" · "}
															<code className="text-[10px]">{log.targetId}</code>
														</>
													)}
												</div>
											</div>

											<div className="text-xs text-muted-foreground tabular-nums shrink-0">
												{formatDateTime(log.createdAt)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</FlatCard>

				{paginationStatus === "CanLoadMore" && (
					<div className="flex justify-center mt-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadMore(50)}
							disabled={isLoading}
						>
							{isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
							Charger 50 logs de plus
						</Button>
					</div>
				)}
			</section>
		</div>
	);
}
