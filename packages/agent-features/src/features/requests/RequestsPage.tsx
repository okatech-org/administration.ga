"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import { Link, useRouter } from "@workspace/routing";
import {
	AlertCircle,
	Calendar,
	ChevronRight,
	Clock,
	FileText,
	Inbox,
	Kanban,
	LayoutList,
	Loader2,
	Search,
	Sparkles,
	User,
	X as XIcon,
} from "lucide-react";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { BulkGenerateDialog } from "./components/bulk-generate-dialog";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrg } from "../../shell/org-provider";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type { PageAction, PageEntity } from "../../stores/page-context-store";


// ─── Status configuration ────────────────────────────────────────────
// Label is derived at render time via t(`dashboard.requests.statuses.${status}`)
// so no hardcoded text here — only style tokens.
const STATUS_CONFIG: Record<
	string,
	{ i18nKey: string; color: string; bgClass: string; textClass: string }
> = {
	[RequestStatus.Draft]: {
		i18nKey: "dashboard.requests.statuses.draft",
		color: "slate",
		bgClass: "bg-slate-100 dark:bg-slate-800",
		textClass: "text-slate-700 dark:text-slate-300",
	},
	[RequestStatus.Submitted]: {
		i18nKey: "dashboard.requests.statuses.submitted",
		color: "blue",
		bgClass: "bg-blue-100 dark:bg-blue-900/40",
		textClass: "text-blue-700 dark:text-blue-300",
	},
	[RequestStatus.Pending]: {
		i18nKey: "dashboard.requests.statuses.pending",
		color: "amber",
		bgClass: "bg-amber-100 dark:bg-amber-900/40",
		textClass: "text-amber-700 dark:text-amber-300",
	},
	[RequestStatus.UnderReview]: {
		i18nKey: "dashboard.requests.statuses.under_review",
		color: "purple",
		bgClass: "bg-purple-100 dark:bg-purple-900/40",
		textClass: "text-purple-700 dark:text-purple-300",
	},
	[RequestStatus.InProduction]: {
		i18nKey: "dashboard.requests.statuses.in_production",
		color: "cyan",
		bgClass: "bg-cyan-100 dark:bg-cyan-900/40",
		textClass: "text-cyan-700 dark:text-cyan-300",
	},
	[RequestStatus.Validated]: {
		i18nKey: "dashboard.requests.statuses.validated",
		color: "emerald",
		bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
	},
	[RequestStatus.Rejected]: {
		i18nKey: "dashboard.requests.statuses.rejected",
		color: "red",
		bgClass: "bg-red-100 dark:bg-red-900/40",
		textClass: "text-red-700 dark:text-red-300",
	},
	[RequestStatus.AppointmentScheduled]: {
		i18nKey: "dashboard.requests.statuses.appointment_scheduled",
		color: "teal",
		bgClass: "bg-teal-100 dark:bg-teal-900/40",
		textClass: "text-teal-700 dark:text-teal-300",
	},
	[RequestStatus.ReadyForPickup]: {
		i18nKey: "dashboard.requests.statuses.ready_for_pickup",
		color: "green",
		bgClass: "bg-green-100 dark:bg-green-900/40",
		textClass: "text-green-700 dark:text-green-300",
	},
	[RequestStatus.Completed]: {
		i18nKey: "dashboard.requests.statuses.completed",
		color: "emerald",
		bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
	},
	[RequestStatus.Cancelled]: {
		i18nKey: "dashboard.requests.statuses.cancelled",
		color: "gray",
		bgClass: "bg-gray-100 dark:bg-gray-800",
		textClass: "text-gray-600 dark:text-gray-400",
	},
};

// Status tabs — grouped for quick filtering
const STATUS_TABS: { key: string; labelKey: string }[] = [
	{ key: "all", labelKey: "dashboard.requests.tabs.all" },
	...[
		RequestStatus.Submitted,
		RequestStatus.Pending,
		RequestStatus.UnderReview,
		RequestStatus.InProduction,
		RequestStatus.Validated,
		RequestStatus.ReadyForPickup,
		RequestStatus.Completed,
		RequestStatus.Rejected,
		RequestStatus.Cancelled,
	].map((key) => ({ key, labelKey: `dashboard.requests.statuses.${key}` })),
];

// ─── Kanban column type ──────────────────────────────────────────────
interface KanbanColumnDef {
	id: string;
	labelKey: string;
	icon: string;
	statuses: RequestStatus[];
	headerColor: string;
	dotColor: string;
}

// ─── Kanban column definitions ──────────────────────────────────────
const KANBAN_COLUMNS: KanbanColumnDef[] = [
	{
		id: "incoming",
		labelKey: "dashboard.requests.kanban.columns.incoming",
		icon: "",
		statuses: [
			RequestStatus.Draft,
			RequestStatus.Submitted,
			RequestStatus.Pending,
		],
		headerColor:
			"bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
		dotColor: "bg-amber-400",
	},
	{
		id: "review",
		labelKey: "dashboard.requests.kanban.columns.review",
		icon: "",
		statuses: [RequestStatus.UnderReview],
		headerColor:
			"bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
		dotColor: "bg-purple-400",
	},
	{
		id: "production",
		labelKey: "dashboard.requests.kanban.columns.production",
		icon: "",
		statuses: [
			RequestStatus.InProduction,
			RequestStatus.AppointmentScheduled,
			RequestStatus.Validated,
			RequestStatus.ReadyForPickup,
		],
		headerColor:
			"bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800",
		dotColor: "bg-cyan-400",
	},
	{
		id: "done",
		labelKey: "dashboard.requests.kanban.columns.done",
		icon: "",
		statuses: [RequestStatus.Completed],
		headerColor:
			"bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
		dotColor: "bg-emerald-400",
	},
	{
		id: "closed",
		labelKey: "dashboard.requests.kanban.columns.closed",
		icon: "",
		statuses: [RequestStatus.Rejected, RequestStatus.Cancelled],
		headerColor:
			"bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
		dotColor: "bg-gray-400",
	},
];

// ─── Helpers ─────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
	return (
		STATUS_CONFIG[status] ?? {
			i18nKey: `dashboard.requests.statuses.${status}`,
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

export default function RequestsPage() {
	const { activeOrgId, activeMembershipId } = useOrg();
	// router used inside sub-views
	const { t } = useTranslation();

	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [serviceFilter, setServiceFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
	const { activePositionGrade } = useOrg();
	const [showMyRequests, setShowMyRequests] = useState(
		() => activePositionGrade === "agent",
	);

	// ── Table mode: paginated query (only active in table mode) ──
	const {
		results: requests,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.requests.listByOrg,
		viewMode === "table" && activeOrgId
			? {
					orgId: activeOrgId,
					status: statusFilter !== "all" ? (statusFilter as any) : undefined,
					assignedTo:
						showMyRequests && activeMembershipId
							? activeMembershipId
							: undefined,
				}
			: "skip",
		{ initialNumItems: 50 },
	);

	const { data: services } = useAuthenticatedConvexQuery(
		api.functions.services.listByOrg,
		activeOrgId ? { orgId: activeOrgId, activeOnly: true } : "skip",
	);

	// Client-side filtering for Service & Search (table mode only)
	const filteredRequests = useMemo(
		() =>
			requests?.filter((req: any) => {
				const matchesService =
					serviceFilter === "all" || req.orgServiceId === serviceFilter;
				const matchesSearch =
					searchQuery === "" ||
					req.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					req.user?.firstName
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					req.user?.lastName
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					req.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

				return matchesService && matchesSearch;
			}),
		[requests, serviceFilter, searchQuery],
	);

	// Count per status (from aggregate-powered query, NOT paginated results)
	const { data: requestStats } = useAuthenticatedConvexQuery(
		api.functions.requests.getStatsByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const statusCounts = requestStats?.statusCounts ?? {};
	const totalCount = requestStats?.total ?? 0;

	// ─── iAsted page context ──────────────────────────────
	const router = useRouter();
	const pageEntities = useMemo<PageEntity[]>(() => {
		// En vue table, on expose les demandes filtrées (cap 30).
		if (viewMode === "table" && filteredRequests) {
			return filteredRequests.slice(0, 30).map((r: any) => ({
				id: r.reference ?? r._id,
				type: "request",
				label: `${r.reference ?? "—"} · ${(r.serviceName as any)?.fr ?? "Service"}`,
				data: {
					_id: r._id,
					reference: r.reference,
					status: r.status,
					userName: r.user
						? `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim()
						: undefined,
					userEmail: r.user?.email,
					assignedTo: r.assignedTo,
					submittedAt: r.submittedAt,
					pendingActionsCount: r.pendingActionsCount,
				},
			}));
		}
		return [];
	}, [viewMode, filteredRequests]);

	const pageActions = useMemo<PageAction[]>(() => {
		const statusList = STATUS_TABS.map((t) => t.key).join("','");
		return [
			{
				id: "set-status-filter",
				label: "Filtrer par statut",
				description: `Change le filtre de statut. params.status ∈ ['${statusList}']`,
			},
			{
				id: "set-service-filter",
				label: "Filtrer par service",
				description:
					"Change le filtre service. params.serviceId = id du service ou 'all'.",
			},
			{
				id: "set-search",
				label: "Rechercher",
				description:
					"Met à jour la barre de recherche. params.query (string, vide pour reset).",
			},
			{
				id: "toggle-view-mode",
				label: "Basculer vue",
				description:
					"Bascule entre table et kanban. params.mode ∈ ['table','kanban'] (optionnel, sinon toggle).",
			},
			{
				id: "toggle-my-requests",
				label: "Mes demandes uniquement",
				description:
					"Active/désactive le filtre 'mes demandes assignées'. params.value (bool, optionnel).",
			},
			{
				id: "open-request",
				label: "Ouvrir une demande",
				description:
					"Navigue vers la page détail d'une demande. params.reference requis (depuis les entités visibles).",
			},
		];
	}, []);

	const pageSummary = useMemo(() => {
		const parts: string[] = [];
		parts.push(`${totalCount} demande${totalCount > 1 ? "s" : ""} au total.`);
		const topStatuses = Object.entries(statusCounts)
			.filter(([, c]) => (c as number) > 0)
			.sort(([, a], [, b]) => (b as number) - (a as number))
			.slice(0, 4)
			.map(([s, c]) => `${s}=${c}`)
			.join(", ");
		if (topStatuses) parts.push(`Répartition: ${topStatuses}.`);
		parts.push(`Vue: ${viewMode === "kanban" ? "kanban" : "table"}.`);
		if (statusFilter !== "all") parts.push(`Filtre statut: ${statusFilter}.`);
		if (serviceFilter !== "all") parts.push(`Filtre service appliqué.`);
		if (searchQuery) parts.push(`Recherche: "${searchQuery}".`);
		if (showMyRequests) parts.push(`Filtre "mes demandes" actif.`);
		return parts.join(" ");
	}, [
		totalCount,
		statusCounts,
		viewMode,
		statusFilter,
		serviceFilter,
		searchQuery,
		showMyRequests,
	]);

	usePageContext({
		module: "requests",
		title: "Demandes",
		summary: pageSummary,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [
			"getRequestsList",
			"getRequestDetail",
			"getPendingRequests",
			"getOrgDashboardStats",
		],
	});

	useRegisterPageAction("set-status-filter", async (params) => {
		const status = params?.status as string | undefined;
		if (!status) return;
		const valid = STATUS_TABS.some((t) => t.key === status);
		if (valid) setStatusFilter(status);
	});
	useRegisterPageAction("set-service-filter", async (params) => {
		const serviceId = params?.serviceId as string | undefined;
		if (serviceId) setServiceFilter(serviceId);
	});
	useRegisterPageAction("set-search", async (params) => {
		const query = (params?.query as string | undefined) ?? "";
		setSearchQuery(query);
	});
	useRegisterPageAction("toggle-view-mode", async (params) => {
		const mode = params?.mode as "table" | "kanban" | undefined;
		setViewMode((curr) =>
			mode === "table" || mode === "kanban"
				? mode
				: curr === "table"
					? "kanban"
					: "table",
		);
	});
	useRegisterPageAction("toggle-my-requests", async (params) => {
		const value = params?.value as boolean | undefined;
		setShowMyRequests((curr) => (typeof value === "boolean" ? value : !curr));
	});
	useRegisterPageAction("open-request", async (params) => {
		const reference = params?.reference as string | undefined;
		if (reference) router.push(`/requests/${reference}`);
	});

	return (
		<div className="flex min-h-full flex-col gap-6 p-4 md:p-6">
			{/* ── Back breadcrumb ─────────────────────────── */}
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Link href="/affaires-consulaires" className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer">
					<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
					Affaires Consulaires
				</Link>
				<span className="text-muted-foreground/30">/</span>
				<span className="font-medium text-foreground/80">{t("dashboard.requests.title", "Demandes")}</span>
			</div>
			{/* ── Header ─────────────────────────────────── */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.requests.title")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t(
							"dashboard.requests.description",
							"Gérez les demandes de services de votre organisation",
						)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{totalCount > 0 && (
						<Badge variant="outline" className="text-sm px-3 py-1 font-medium">
							{totalCount} demande{totalCount > 1 ? "s" : ""}
						</Badge>
					)}
					{/* View mode toggle */}
					<div className="flex items-center border rounded-lg overflow-hidden">
						<Button
							variant={viewMode === "table" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("table")}
							className="rounded-none gap-1.5 h-9"
						>
							<LayoutList className="h-4 w-4" />
							<span className="hidden sm:inline text-xs">
								{t("dashboard.requests.viewTable")}
							</span>
						</Button>
						<Button
							variant={viewMode === "kanban" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("kanban")}
							className="rounded-none gap-1.5 h-9"
						>
							<Kanban className="h-4 w-4" />
							<span className="hidden sm:inline text-xs">
								{t("dashboard.requests.viewKanban")}
							</span>
						</Button>
					</div>
				</div>
			</div>

			{/* ── Filters Container ────────────────────── */}
			<div className="space-y-4">
				{/* Search bar - prominent */}
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={t(
								"dashboard.requests.search",
								"Rechercher par référence, nom ou email…",
							)}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 h-11 text-sm bg-[#FDFCFA] dark:bg-[#21201E]/77 border-border"
						/>
					</div>
					<Combobox
						value={serviceFilter}
						onValueChange={setServiceFilter}
						placeholder={t("dashboard.requests.allServices")}
						searchPlaceholder={t("common.search")}
						emptyText={t("dashboard.services.noResults")}
						className="w-full sm:w-[240px] h-11 bg-[#FDFCFA] dark:bg-[#21201E]/77 border-border"
						options={[
							{ value: "all", label: t("dashboard.requests.allServices") },
							...(services?.map((service: any) => ({
								value: service._id,
								label: service.service?.name?.fr ?? "Service",
							})) ?? []),
						]}
					/>
					{/* Toggle: show only my assigned requests */}
					<div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-border bg-[#FDFCFA] dark:bg-[#21201E]/77 shrink-0">
						<Switch
							id="show-my-requests"
							checked={showMyRequests}
							onCheckedChange={setShowMyRequests}
						/>
						<Label
							htmlFor="show-my-requests"
							className="text-sm font-medium cursor-pointer whitespace-nowrap"
						>
							{t("dashboard.requests.myRequests")}
						</Label>
					</div>
				</div>

				{/* Status pill tabs — only in table mode */}
				{viewMode === "table" && (
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
									{t(tab.labelKey)}
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
				)}
			</div>

			{/* ── Content Area ───────────────────────── */}
			{viewMode === "table" ? (
				<TableView
					requests={filteredRequests}
					isLoading={isLoading}
					paginationStatus={paginationStatus}
					loadMore={loadMore}
					searchQuery={searchQuery}
					statusFilter={statusFilter}
					activeOrgId={activeOrgId ?? undefined}
					t={t}
				/>
			) : (
				<KanbanView
					activeOrgId={activeOrgId}
					activeMembershipId={activeMembershipId}
					showMyRequests={showMyRequests}
					searchQuery={searchQuery}
					serviceFilter={serviceFilter}
					t={t}
				/>
			)}
		</div>
	);
}

// ─── Table View Component ────────────────────────────────────────────

function TableView({
	requests,
	isLoading,
	paginationStatus,
	loadMore,
	searchQuery,
	statusFilter,
	activeOrgId,
	t,
}: {
	requests: any[] | undefined;
	isLoading: boolean;
	paginationStatus: string;
	loadMore: (n: number) => void;
	searchQuery: string;
	statusFilter: string;
	activeOrgId: Id<"orgs"> | undefined;
	t: any;
}) {
	const router = useRouter();
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [bulkOpen, setBulkOpen] = useState(false);

	// Ids visible in the current filtered list — used for select-all.
	const visibleIds = useMemo(
		() => (requests ?? []).map((r: any) => r._id as string),
		[requests],
	);
	const allSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
	const someSelected =
		!allSelected && visibleIds.some((id) => selected.has(id));

	function toggleOne(id: string, checked: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}

	function toggleAll(checked: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			for (const id of visibleIds) {
				if (checked) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	}

	function clearSelection() {
		setSelected(new Set());
	}

	const selectionCount = selected.size;

	return (
		<div className="flex flex-col gap-2">
			{/* Bulk action bar — appears only when selection > 0 */}
			{selectionCount > 0 ? (
				<div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2 pl-3">
					<span className="text-sm font-medium">
						{selectionCount} demande{selectionCount > 1 ? "s" : ""} sélectionnée
						{selectionCount > 1 ? "s" : ""}
					</span>
					<div className="ml-auto flex items-center gap-2">
						<Button
							size="sm"
							onClick={() => setBulkOpen(true)}
							disabled={!activeOrgId}
						>
							<Sparkles className="mr-2 h-4 w-4" />
							Générer un document
						</Button>
						<Button size="sm" variant="ghost" onClick={clearSelection}>
							<XIcon className="mr-1.5 h-4 w-4" />
							Effacer
						</Button>
					</div>
				</div>
			) : null}

			<div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/30 hover:bg-muted/30">
							<TableHead className="w-10">
								<Checkbox
									checked={allSelected ? true : someSelected ? "indeterminate" : false}
									onCheckedChange={(v) => toggleAll(v === true)}
									aria-label="Tout sélectionner"
								/>
							</TableHead>
							<TableHead className="font-semibold">
								{t("dashboard.requests.table.reference")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("dashboard.requests.table.service")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("dashboard.requests.table.requester")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("dashboard.requests.table.date")}
							</TableHead>
							<TableHead className="font-semibold">
								{t("dashboard.requests.table.status")}
							</TableHead>
							<TableHead className="text-right font-semibold">
								{t("dashboard.requests.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
				<TableBody>
					{isLoading && (requests?.length ?? 0) === 0 ? (
						<TableRow>
							<TableCell colSpan={7} className="h-32 text-center">
								<div className="flex flex-col items-center gap-2">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										{t(
											"dashboard.requests.loading",
											"Chargement des demandes…",
										)}
									</span>
								</div>
							</TableCell>
						</TableRow>
					) : requests?.length === 0 ? (
						<TableRow>
							<TableCell colSpan={7} className="h-32 text-center">
								<div className="flex flex-col items-center gap-3 py-8">
									<div className="rounded-full bg-muted/60 p-3">
										<Inbox className="h-6 w-6 text-muted-foreground" />
									</div>
									<div>
										<p className="font-medium text-foreground/80">
											{t("dashboard.requests.empty")}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{searchQuery || statusFilter !== "all"
												? t(
														"dashboard.requests.emptyFiltered",
														"Essayez de modifier vos filtres",
													)
												: t(
														"dashboard.requests.emptyAll",
														"Les nouvelles demandes apparaîtront ici",
													)}
										</p>
									</div>
								</div>
							</TableCell>
						</TableRow>
					) : (
						requests?.map((request: any) => {
							const statusConf = getStatusConfig(request.status);
							const userName = request.user
								? `${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()
								: null;

							return (
								<TableRow
									key={request._id}
									className="cursor-pointer hover:bg-muted/40 transition-colors group"
									data-selected={selected.has(request._id as string) ? "true" : undefined}
									onClick={() =>
										router.push(`/requests/${request.reference}`)
									}
								>
									{/* Selection checkbox */}
									<TableCell
										className="w-10"
										onClick={(e) => e.stopPropagation()}
									>
										<Checkbox
											checked={selected.has(request._id as string)}
											onCheckedChange={(v) =>
												toggleOne(request._id as string, v === true)
											}
											aria-label="Sélectionner la demande"
										/>
									</TableCell>

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
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold shrink-0">
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
										<div className="flex items-center gap-2">
											<span
												className={cn(
													"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
													statusConf.bgClass,
													statusConf.textClass,
												)}
											>
												{t(statusConf.i18nKey)}
											</span>
											{request.pendingActionsCount > 0 && (
												<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
													<AlertCircle className="h-3 w-3" />
													{request.pendingActionsCount}
												</span>
											)}
										</div>
									</TableCell>

									{/* Actions */}
									<TableCell className="text-right">
										<Button
											size="sm"
											variant="ghost"
											className="opacity-0 group-hover:opacity-100 transition-opacity"
											asChild
										>
											<Link
												href={`/requests/${request.reference}`}
											>
												{t("dashboard.requests.manage")}
												<ChevronRight className="h-4 w-4 ml-1" />
											</Link>
										</Button>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>

			{/* Load More — now using auto-trigger pattern */}
			{paginationStatus === "CanLoadMore" && (
				<div className="flex justify-center py-4 border-t border-border/40">
					<Button
						variant="outline"
						size="sm"
						onClick={() => loadMore(50)}
						className="gap-2"
					>
						<Calendar className="h-4 w-4" />
						{t("dashboard.requests.loadMore")}
					</Button>
				</div>
			)}
			{paginationStatus === "LoadingMore" && (
				<div className="flex justify-center py-4 border-t border-border/40">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			)}
			</div>

			{activeOrgId ? (
				<BulkGenerateDialog
					open={bulkOpen}
					onOpenChange={setBulkOpen}
					orgId={activeOrgId}
					selectedIds={Array.from(selected) as Id<"requests">[]}
					onCompleted={clearSelection}
				/>
			) : null}
		</div>
	);
}

// ─── Kanban View Component ───────────────────────────────────────────

function KanbanView({
	activeOrgId,
	activeMembershipId,
	showMyRequests,
	searchQuery,
	serviceFilter,
	t,
}: {
	activeOrgId: Id<"orgs"> | null;
	activeMembershipId: Id<"memberships"> | null;
	showMyRequests: boolean;
	searchQuery: string;
	serviceFilter: string;
	t: any;
}) {
	return (
		<div className="flex-1 flex flex-col min-h-0">
			<ScrollArea className="w-full flex-1">
				<div className="flex gap-4 pb-4 h-[calc(100vh-240px)]">
					{KANBAN_COLUMNS.map((column) => (
						<KanbanColumn
							key={column.id}
							column={column}
							activeOrgId={activeOrgId}
							activeMembershipId={activeMembershipId}
							showMyRequests={showMyRequests}
							searchQuery={searchQuery}
							serviceFilter={serviceFilter}
							t={t}
						/>
					))}
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	);
}

// ─── Kanban Column Component (each column has its own paginated query) ───

function KanbanColumn({
	column,
	activeOrgId,
	activeMembershipId,
	showMyRequests,
	searchQuery,
	serviceFilter,
	t,
}: {
	column: (typeof KANBAN_COLUMNS)[number];
	activeOrgId: Id<"orgs"> | null;
	activeMembershipId: Id<"memberships"> | null;
	showMyRequests: boolean;
	searchQuery: string;
	serviceFilter: string;
	t: any;
}) {
	const {
		results: rawCards,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.requests.listByOrgStatuses,
		activeOrgId
			? {
					orgId: activeOrgId,
					statuses: column.statuses,
					assignedTo:
						showMyRequests && activeMembershipId
							? activeMembershipId
							: undefined,
				}
			: "skip",
		{ initialNumItems: 10 },
	);

	// Client-side filtering for search & service (lightweight, on loaded data only)
	const cards = useMemo(
		() =>
			rawCards?.filter((req: any) => {
				const matchesService =
					serviceFilter === "all" || req.orgServiceId === serviceFilter;
				const matchesSearch =
					searchQuery === "" ||
					req.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					req.user?.firstName
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					req.user?.lastName
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					req.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
				return matchesService && matchesSearch;
			}) ?? [],
		[rawCards, serviceFilter, searchQuery],
	);

	return (
		<div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
			{/* Column Header */}
			<div
				className={cn(
					"flex items-center gap-2 px-3 py-2.5 rounded-t-lg border border-b-0",
					column.headerColor,
				)}
			>
				<div className={cn("w-2 h-2 rounded-full", column.dotColor)} />
				<span className="text-sm font-semibold">{t(column.labelKey)}</span>
				<Badge
					variant="secondary"
					className="ml-auto text-[10px] h-5 min-w-[20px] justify-center"
				>
					{cards.length}
					{paginationStatus === "CanLoadMore" ? "+" : ""}
				</Badge>
			</div>

			{/* Column Body */}
			<div className="flex-1 bg-muted/20 border border-t-0 border-border/60 rounded-b-lg p-2 space-y-2 overflow-y-auto">
				{isLoading && cards.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50 mb-2" />
					</div>
				) : cards.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Inbox className="h-5 w-5 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground/50">
							{t("dashboard.requests.kanban.empty")}
						</p>
					</div>
				) : (
					<>
						{cards.map((request: any) => (
							<KanbanCard
								key={request._id}
								request={request}
								t={t}
							/>
						))}
						{paginationStatus === "CanLoadMore" && (
							<Button
								variant="ghost"
								size="sm"
								className="w-full text-xs text-muted-foreground"
								onClick={() => loadMore(10)}
							>
								{t("dashboard.requests.loadMore")}
							</Button>
						)}
						{paginationStatus === "LoadingMore" && (
							<div className="flex justify-center py-2">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// ─── Kanban Card Component ───────────────────────────────────────────

function KanbanCard({
	request,
	t,
}: {
	request: any;
	t: any;
}) {
	const router = useRouter();
	const statusConf = getStatusConfig(request.status);
	const userName = request.user
		? `${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()
		: null;

	const serviceName =
		(request.serviceName as any)?.fr ??
		(request.service as any)?.name?.fr ??
		"Service";

	return (
		<div
			onClick={() =>
				router.push(`/requests/${request.reference}`)
			}
			className="group cursor-pointer bg-secondary rounded-lg border border-border/60 p-3 hover:border-border transition-all duration-200"
		>
			{/* Service name (like "Product area" in Refero) */}
			<div className="flex items-center justify-between gap-2 mb-2">
				<span
					className={cn(
						"inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
						statusConf.bgClass,
						statusConf.textClass,
					)}
				>
					{t(statusConf.i18nKey)}
				</span>
				<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
			</div>

			{/* Reference (title) */}
			<p className="text-sm font-medium leading-snug mb-1.5 line-clamp-2">
				{request.reference || "Sans référence"}
			</p>

			{/* Service tag */}
			<Badge
				variant="secondary"
				className="text-[10px] font-normal mb-2 max-w-full truncate"
			>
				{serviceName}
			</Badge>

			{/* Pending actions indicator */}
			{request.pendingActionsCount > 0 && (
				<div className="flex items-center gap-1.5 mb-2 rounded-md bg-amber-500/10 px-2 py-1">
					<AlertCircle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
					<span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
						{request.pendingActionsCount} action{request.pendingActionsCount > 1 ? "s" : ""} en attente
					</span>
				</div>
			)}

			{/* Footer: user avatar + metadata */}
			<div className="flex items-center justify-between pt-2 border-t border-border/40">
				<div className="flex items-center gap-2 min-w-0">
					<div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-primary text-[9px] font-bold shrink-0">
						{userName ? (
							getInitials(request.user?.firstName, request.user?.lastName)
						) : (
							<User className="h-3 w-3" />
						)}
					</div>
					<span className="text-xs text-muted-foreground truncate">
						{userName || "Inconnu"}
					</span>
				</div>
				<span className="text-[10px] text-muted-foreground whitespace-nowrap">
					{request.submittedAt
						? timeAgo(request.submittedAt)
						: request._creationTime
							? timeAgo(request._creationTime)
							: ""}
				</span>
			</div>
		</div>
	);
}
