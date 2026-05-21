"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import {
	Building2,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	Inbox,
	Loader2,
	Search,
	User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Status configuration ────────────────────────────────────────────
const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; bgClass: string; textClass: string }
> = {
	draft: {
		label: "Brouillon",
		color: "slate",
		bgClass: "bg-slate-100 dark:bg-slate-800",
		textClass: "text-slate-700 dark:text-slate-300",
	},
	submitted: {
		label: "Soumis",
		color: "blue",
		bgClass: "bg-blue-100 dark:bg-blue-900/40",
		textClass: "text-blue-700 dark:text-blue-300",
	},
	pending: {
		label: "En attente",
		color: "amber",
		bgClass: "bg-amber-100 dark:bg-amber-900/40",
		textClass: "text-amber-700 dark:text-amber-300",
	},
	pending_completion: {
		label: "Incomplet",
		color: "orange",
		bgClass: "bg-orange-100 dark:bg-orange-900/40",
		textClass: "text-orange-700 dark:text-orange-300",
	},
	edited: {
		label: "Modifié",
		color: "indigo",
		bgClass: "bg-indigo-100 dark:bg-indigo-900/40",
		textClass: "text-indigo-700 dark:text-indigo-300",
	},
	under_review: {
		label: "En examen",
		color: "purple",
		bgClass: "bg-purple-100 dark:bg-purple-900/40",
		textClass: "text-purple-700 dark:text-purple-300",
	},
	in_production: {
		label: "En production",
		color: "cyan",
		bgClass: "bg-cyan-100 dark:bg-cyan-900/40",
		textClass: "text-cyan-700 dark:text-cyan-300",
	},
	validated: {
		label: "Validé",
		color: "emerald",
		bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
	},
	rejected: {
		label: "Rejeté",
		color: "red",
		bgClass: "bg-red-100 dark:bg-red-900/40",
		textClass: "text-red-700 dark:text-red-300",
	},
	appointment_scheduled: {
		label: "RDV fixé",
		color: "teal",
		bgClass: "bg-teal-100 dark:bg-teal-900/40",
		textClass: "text-teal-700 dark:text-teal-300",
	},
	ready_for_pickup: {
		label: "Prêt",
		color: "green",
		bgClass: "bg-green-100 dark:bg-green-900/40",
		textClass: "text-green-700 dark:text-green-300",
	},
	completed: {
		label: "Terminé",
		color: "emerald",
		bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
	},
	cancelled: {
		label: "Annulé",
		color: "gray",
		bgClass: "bg-gray-100 dark:bg-gray-800",
		textClass: "text-gray-600 dark:text-gray-400",
	},
	processing: {
		label: "Traitement",
		color: "purple",
		bgClass: "bg-purple-100 dark:bg-purple-900/40",
		textClass: "text-purple-700 dark:text-purple-300",
	},
};

// Status tabs — grouped for quick filtering
const STATUS_TABS = [
	{ key: "all", label: "Toutes" },
	{ key: "submitted", label: "Soumises" },
	{ key: "pending", label: "En attente" },
	{ key: "under_review", label: "En examen" },
	{ key: "in_production", label: "Production" },
	{ key: "validated", label: "Validées" },
	{ key: "ready_for_pickup", label: "Prêtes" },
	{ key: "completed", label: "Terminées" },
	{ key: "rejected", label: "Rejetées" },
	{ key: "cancelled", label: "Annulées" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
	return (
		STATUS_CONFIG[status] ?? {
			label: status,
			color: "gray",
			bgClass: "bg-gray-100 dark:bg-gray-800",
			textClass: "text-gray-600 dark:text-gray-400",
		}
	);
}

function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "À l'instant";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `il y a ${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `il y a ${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `il y a ${days}j`;
	if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
	return new Date(timestamp).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
	});
}

function getInitials(firstName?: string, lastName?: string): string {
	const f = firstName?.[0]?.toUpperCase() ?? "";
	const l = lastName?.[0]?.toUpperCase() ?? "";
	return f + l || "?";
}

// ─── Main Component ──────────────────────────────────────────────────

export function AffairesRequestsTab({
	searchQuery,
	orgFilter,
}: {
	searchQuery: string;
	orgFilter: string;
}) {
	const router = useRouter();
	const { t } = useTranslation();

	const [statusFilter, setStatusFilter] = useState<string>("all");	const {
		results: requests,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.requests.listAll,
		{
			orgId: orgFilter !== "all" ? (orgFilter as Id<"orgs">) : undefined,
			status: statusFilter !== "all" ? (statusFilter as any) : undefined,
		},
		{ initialNumItems: 50 },
	);

	// Client-side filtering for search only (org + status are server-side)
	const filteredRequests = useMemo(
		() =>
			requests?.filter((req: any) => {
				if (searchQuery === "") return true;
				const q = searchQuery.toLowerCase();
				return (
					req.reference?.toLowerCase().includes(q) ||
					req.user?.firstName?.toLowerCase().includes(q) ||
					req.user?.lastName?.toLowerCase().includes(q) ||
					req.user?.email?.toLowerCase().includes(q) ||
					req.org?.name?.toLowerCase().includes(q)
				);
			}),
		[requests, searchQuery],
	);

	// Count per status (from all loaded results)
	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const req of requests ?? []) {
			counts[(req as any).status] = (counts[(req as any).status] || 0) + 1;
		}
		return counts;
	}, [requests]);

	const totalCount = requests?.length ?? 0;

	// Pagination state
	const ITEMS_PER_PAGE = 12; // 3 rows * 4 columns
	const [currentPage, setCurrentPage] = useState(1);
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, orgFilter, statusFilter]);

	const slicedRequests = filteredRequests?.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	return (
		<div className="flex flex-col flex-1 h-full gap-4 w-full">
			{/* ── Filters Container ────────────────────── */}
			<div className="shrink-0">
				{/* Status pill tabs */}
				<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
					{STATUS_TABS.map((tab) => {
						const isActive = statusFilter === tab.key;
						const count =
							tab.key === "all" ? totalCount : (statusCounts[tab.key] ?? 0);
						const config = getStatusConfig(tab.key);

						return (
							<button
								key={tab.key}
								onClick={() => setStatusFilter(tab.key)}
								className={cn(
									"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border",
									isActive
										? tab.key === "all"
											? "bg-primary text-primary-foreground border-primary"
											: `${config.bgClass} ${config.textClass} border-current/20`
										: "bg-background hover:bg-muted/60 text-muted-foreground border-transparent hover:border-border/60",
								)}
							>
								{tab.label}
								{count > 0 && (
									<span
										className={cn(
											"inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
											isActive
												? tab.key === "all"
													? "bg-primary-foreground/20 text-primary-foreground"
													: "bg-current/10"
												: "bg-muted text-muted-foreground",
										)}
									>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Grid ───────────────────────────────── */}
			{isLoading && (filteredRequests?.length ?? 0) === 0 ? (
				<div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border/60">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
					<span className="text-sm text-muted-foreground">
						{t("superadmin.requests.loading", "Chargement des demandes…")}
					</span>
				</div>
			) : (filteredRequests?.length ?? 0) === 0 ? (
				<div className="flex flex-col items-center gap-3 py-16 bg-card rounded-xl border border-border/60">
					<div className="rounded-full bg-muted/60 p-4">
						<Inbox className="h-8 w-8 text-muted-foreground" />
					</div>
					<div className="text-center">
						<p className="font-medium text-foreground/80">
							{t("superadmin.requests.empty", "Aucune demande trouvée")}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							{searchQuery || statusFilter !== "all" || orgFilter !== "all"
								? t("superadmin.requests.emptyFiltered", "Essayez de modifier vos filtres")
								: t("superadmin.requests.emptyAll", "Les nouvelles demandes apparaîtront ici")}
						</p>
					</div>
				</div>
			) : (
				<div className="flex flex-col flex-1 min-h-[450px] w-full">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 auto-rows-fr w-full">
						{slicedRequests?.map((request: any) => {
							const statusConf = getStatusConfig(request.status);
							const userName = request.user
								? `${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()
								: null;

							return (
								<FlatCard
									key={request._id}
									className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden flex flex-col min-h-[155px] h-full"
									onClick={() => router.push(`/requests/${request._id}`)}
								>
									<div className="p-3.5 flex flex-col h-full gap-2.5">
										{/* Header: Service, Date */}
										<div className="flex items-start justify-between gap-1">
											<div className="flex items-center gap-2 min-w-0 pr-1">
												<div className="rounded-md bg-primary/10 p-1.5 flex items-center justify-center shrink-0">
													<FileText className="h-4 w-4 text-primary" />
												</div>
												<span className="font-semibold text-sm truncate">
													{request.reference || "—"}
												</span>
											</div>
											<div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/50">
												<Clock className="w-3.5 h-3.5 text-muted-foreground" />
												<span className="text-[10px] text-muted-foreground font-medium">
													{request.submittedAt
														? timeAgo(request.submittedAt)
														: request._creationTime
															? timeAgo(request._creationTime)
															: "-"}
												</span>
											</div>
										</div>

										<div className="flex-1 mt-1">
											{/* Body: Ref, Org */}
											<h3 className="font-semibold text-xs leading-snug line-clamp-2 text-muted-foreground mb-1.5">
												{(request.serviceName as any)?.fr ??
													(request.service as any)?.name?.fr ??
													"Service"}
											</h3>
											<div className="flex items-center gap-1.5 text-muted-foreground">
												<Building2 className="h-3.5 w-3.5 shrink-0" />
												<span className="text-xs truncate max-w-[200px]">
													{request.org?.name ?? "—"}
												</span>
											</div>
										</div>

										{/* Footer: Requester & Status */}
										<div className="pt-2.5 flex items-center justify-between gap-2 border-t border-border/50 mt-auto">
											<div className="flex items-center gap-2 min-w-0">
												<div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-primary text-[10px] font-bold shrink-0">
													{userName ? (
														getInitials(request.user?.firstName, request.user?.lastName)
													) : (
														<User className="h-3 w-3" />
													)}
												</div>
												<span className="font-medium text-xs truncate max-w-[130px]">
													{userName || "Utilisateur"}
												</span>
											</div>
											<Badge
												className={cn(
													"text-[10px] px-2 py-0.5 h-[22px] border shrink-0 font-medium",
													statusConf.bgClass,
													statusConf.textClass,
													"border-current/20"
												)}
												variant="secondary"
											>
												{statusConf.label}
											</Badge>
										</div>
									</div>
								</FlatCard>
							);
						})}
					</div>

					{/* Pagination Handling */}
					{Math.ceil((filteredRequests?.length ?? 0) / ITEMS_PER_PAGE) > 1 && (
						<div className="flex items-center justify-center gap-3 pt-4 pb-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
							>
								<ChevronLeft className="h-4 w-4 mr-1" />
								{t("common.previous", "Précédent")}
							</Button>
							
							<div className="text-xs font-medium text-muted-foreground">
								Page {currentPage} {paginationStatus !== "CanLoadMore" && `sur ${Math.ceil((filteredRequests?.length ?? 0) / ITEMS_PER_PAGE)}`}
							</div>

							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									if (paginationStatus === "CanLoadMore" && currentPage * ITEMS_PER_PAGE >= (filteredRequests?.length ?? 0)) {
										loadMore(50);
									}
									setCurrentPage((p) => p + 1);
								}}
								disabled={
									(currentPage * ITEMS_PER_PAGE >= (filteredRequests?.length ?? 0)) &&
									paginationStatus !== "CanLoadMore"
								}
							>
								{t("common.next", "Suivant")}
								<ChevronRight className="h-4 w-4 ml-1" />
							</Button>
						</div>
					)}

					{/* Load More Fallback Status */}
					{paginationStatus === "LoadingMore" && (
						<div className="flex justify-center py-4 shrink-0">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					)}
				</div>
			)}
		</div>
	);
}
