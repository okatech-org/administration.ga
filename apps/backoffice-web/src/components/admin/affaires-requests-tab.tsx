"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";
import {
	Building2,
	ChevronRight,
	Clock,
	FileText,
	Inbox,
	Loader2,
	Search,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

export function AffairesRequestsTab() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [orgFilter, setOrgFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Fetch orgs for the combobox filter
	const { data: orgs } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const orgOptions: ComboboxOption[] = useMemo(() => {
		const opts: ComboboxOption[] = [
			{ value: "all", label: "Tous les organismes" },
		];
		if (orgs) {
			for (const org of orgs) {
				opts.push({ value: org._id, label: org.name });
			}
		}
		return opts;
	}, [orgs]);

	const {
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

	return (
		<>
			{/* ── Filters Container ────────────────────── */}
			<div className="space-y-4">
				{/* Search bar + org filter */}
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={t(
								"superadmin.requests.search",
								"Rechercher par référence, nom, email ou organisme…",
							)}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 h-11 text-sm bg-card border-border"
						/>
					</div>
					<Combobox
						options={orgOptions}
						value={orgFilter}
						onValueChange={setOrgFilter}
						placeholder={t(
							"superadmin.requests.allOrgs",
							"Tous les organismes",
						)}
						searchPlaceholder={t(
							"superadmin.requests.searchOrg",
							"Rechercher un organisme…",
						)}
						emptyText={t(
							"superadmin.requests.noOrgFound",
							"Aucun organisme trouvé",
						)}
						className="w-full sm:w-[300px] h-11 bg-card border-border"
					/>
				</div>

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

			{/* ── Table ───────────────────────────────── */}
			<div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/30 hover:bg-muted/30">
							<TableHead className="font-semibold">
								{t("superadmin.requests.table.reference")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("superadmin.requests.table.org")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("superadmin.requests.table.service")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("superadmin.requests.table.requester")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("superadmin.requests.table.date")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("superadmin.requests.table.status")}
							</TableHead>
							<TableHead className="text-right font-semibold">
								{t("superadmin.requests.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (filteredRequests?.length ?? 0) === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-32 text-center">
									<div className="flex flex-col items-center gap-2">
										<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
										<span className="text-sm text-muted-foreground">
											{t(
												"superadmin.requests.loading",
												"Chargement des demandes…",
											)}
										</span>
									</div>
								</TableCell>
							</TableRow>
						) : filteredRequests?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-32 text-center">
									<div className="flex flex-col items-center gap-3 py-8">
										<div className="rounded-full bg-muted/60 p-3">
											<Inbox className="h-6 w-6 text-muted-foreground" />
										</div>
										<div>
											<p className="font-medium text-foreground/80">
												{t(
													"superadmin.requests.empty",
													"Aucune demande trouvée",
												)}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												{searchQuery ||
												statusFilter !== "all" ||
												orgFilter !== "all"
													? t(
															"superadmin.requests.emptyFiltered",
															"Essayez de modifier vos filtres",
														)
													: t(
															"superadmin.requests.emptyAll",
															"Les nouvelles demandes apparaîtront ici",
														)}
											</p>
										</div>
									</div>
								</TableCell>
							</TableRow>
						) : (
							filteredRequests?.map((request: any) => {
								const statusConf = getStatusConfig(request.status);
								const userName = request.user
									? `${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()
									: null;

								return (
									<TableRow
										key={request._id}
										className="cursor-pointer hover:bg-muted/40 transition-colors group"
										onClick={() =>
											navigate({
												to: `/requests/${request._id}` as any,
											})
										}
									>
										{/* Reference */}
										<TableCell>
											<div className="flex items-center gap-2">
												<div className="rounded-md bg-primary/10 p-1.5">
													<FileText className="h-3.5 w-3.5 text-primary" />
												</div>
												<span className="font-mono text-xs font-semibold">
													{request.reference || "—"}
												</span>
											</div>
										</TableCell>

										{/* Organisation */}
										<TableCell>
											<div className="flex items-center gap-2">
												<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
												<span className="text-sm truncate max-w-[160px]">
													{request.org?.name ?? "—"}
												</span>
											</div>
										</TableCell>

										{/* Service */}
										<TableCell>
											<span className="text-sm">
												{(request.serviceName as any)?.fr ??
													(request.service as any)?.name?.fr ??
													"Service"}
											</span>
										</TableCell>

										{/* Requester */}
										<TableCell>
											<div className="flex items-center gap-2.5">
												<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold shrink-0">
													{userName ? (
														getInitials(
															request.user?.firstName,
															request.user?.lastName,
														)
													) : (
														<User className="h-3.5 w-3.5" />
													)}
												</div>
												<div className="flex flex-col min-w-0">
													<span className="font-medium text-sm truncate">
														{userName || "Utilisateur inconnu"}
													</span>
													{request.user?.email && (
														<span className="text-xs text-muted-foreground truncate">
															{request.user.email}
														</span>
													)}
												</div>
											</div>
										</TableCell>

										{/* Date */}
										<TableCell>
											<div className="flex items-center gap-1.5 text-muted-foreground">
												<Clock className="h-3.5 w-3.5 shrink-0" />
												<span className="text-xs whitespace-nowrap">
													{request.submittedAt
														? timeAgo(request.submittedAt)
														: request._creationTime
															? timeAgo(request._creationTime)
															: "-"}
												</span>
											</div>
										</TableCell>

										{/* Status */}
										<TableCell>
											<span
												className={cn(
													"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
													statusConf.bgClass,
													statusConf.textClass,
												)}
											>
												{statusConf.label}
											</span>
										</TableCell>

										{/* Actions */}
										<TableCell className="text-right">
											<Button
												size="sm"
												variant="ghost"
												className="opacity-0 group-hover:opacity-100 transition-opacity"
											>
												{t("superadmin.requests.view")}
												<ChevronRight className="h-4 w-4 ml-1" />
											</Button>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>

				{/* Load More */}
				{paginationStatus === "CanLoadMore" && (
					<div className="flex justify-center py-4 border-t border-border/40">
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadMore(25)}
							className="gap-2"
						>
							{t("superadmin.requests.loadMore")}
						</Button>
					</div>
				)}
				{paginationStatus === "LoadingMore" && (
					<div className="flex justify-center py-4 border-t border-border/40">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				)}
			</div>
		</>
	);
}
