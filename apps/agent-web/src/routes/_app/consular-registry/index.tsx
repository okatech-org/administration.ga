import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RegistrationStatus } from "@convex/lib/validators";
import {
	createFileRoute,
	Link,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";

import {
	Baby,
	Bell,
	CheckCircle2,
	Clock,
	CreditCard,
	FileText,
	Printer,
	User,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	getNotificationColumns,
	NotificationActionsCell,
	type NotificationRow,
} from "@/components/admin/consular-notifications-columns";
import {
	getRegistrationColumns,
	RegistrationActionsCell,
	type RegistrationRow,
} from "@/components/admin/consular-registrations-columns";
import { ProfileViewSheet } from "@/components/dashboard/ProfileViewSheet";
import { useOrg } from "@/components/org/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
	usePaginatedConvexQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// Search params schema for URL persistence
interface RegistrySearchParams {
	status?: string;
	profileType?: "all" | "adult" | "child";
	page?: number;
	pageSize?: number;
}

export const Route = createFileRoute("/_app/consular-registry/")({
	component: ConsularRegistryPage,
	validateSearch: (search: Record<string, unknown>): RegistrySearchParams => ({
		status: typeof search.status === "string" ? search.status : undefined,
		profileType:
			search.profileType === "adult" || search.profileType === "child"
				? search.profileType
				: undefined,
		page:
			typeof search.page === "number" && search.page > 0
				? search.page
				: undefined,
		pageSize:
			typeof search.pageSize === "number" &&
			[10, 20, 30, 40, 50].includes(search.pageSize)
				? search.pageSize
				: undefined,
	}),
});

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

const REGISTRY_STATUS_TABS = [
	{ key: "all", labelKey: "dashboard.consularRegistry.tabs.all" },
	{
		key: "requested",
		labelKey: "dashboard.consularRegistry.statuses.requested",
	},
	{ key: "active", labelKey: "dashboard.consularRegistry.statuses.active" },
	{ key: "expired", labelKey: "dashboard.consularRegistry.statuses.expired" },
];

function ConsularRegistryPage() {
	const { t, i18n } = useTranslation();
	const { activeOrgId } = useOrg();
	const navigate = useNavigate();

	// ── Read state from URL search params ───────────────────────
	const search = useSearch({ from: "/_app/consular-registry/" });
	const statusFilter = search.status ?? "all";
	const profileTypeFilter = (search.profileType ?? "all") as
		| "all"
		| "adult"
		| "child";
	const pagination: PaginationState = {
		pageIndex: (search.page ?? 1) - 1, // URL is 1-indexed, TanStack is 0-indexed
		pageSize: search.pageSize ?? 10,
	};

	// ── Dialog State ────────────────────────────────────────────
	const [selectedRegistration, setSelectedRegistration] =
		useState<RegistrationRow | null>(null);
	const [selectedNotification, setSelectedNotification] =
		useState<NotificationRow | null>(null);
	const [showCardDialog, setShowCardDialog] = useState(false);
	const [showPrintDialog, setShowPrintDialog] = useState(false);
	const [showProfileDialog, setShowProfileDialog] = useState(false);

	// ── Search State ────────────────────────────────────────────
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const isSearching = debouncedSearch.trim().length >= 2;

	// ── Server-side pagination: cursor map ──────────────────────
	const cursorsRef = useRef<Map<number, string>>(new Map());

	// Helper: update URL search params without reload
	const updateSearch = useCallback(
		(updates: Partial<RegistrySearchParams>) => {
			navigate({
				search: (prev) => {
					const next = { ...prev, ...updates };
					// Clean up defaults so URL stays tidy
					if (next.status === "all" || !next.status) delete next.status;
					if (next.profileType === "all" || !next.profileType)
						delete next.profileType;
					if (!next.page || next.page <= 1) delete next.page;
					if (next.pageSize === 10 || !next.pageSize) delete next.pageSize;
					return next as RegistrySearchParams;
				},
				replace: false, // create history entry for back/forward
			});
		},
		[navigate],
	);

	// Filter change handlers (reset page + clear cursors)
	const handleStatusFilterChange = useCallback(
		(newFilter: string) => {
			cursorsRef.current = new Map();
			updateSearch({ status: newFilter, page: 1 });
		},
		[updateSearch],
	);

	const handleProfileTypeFilterChange = useCallback(
		(newFilter: "all" | "adult" | "child") => {
			cursorsRef.current = new Map();
			updateSearch({ profileType: newFilter, page: 1 });
		},
		[updateSearch],
	);

	// Pagination change handler
	const handlePaginationChange = useCallback(
		(newPagination: PaginationState) => {
			updateSearch({
				page: newPagination.pageIndex + 1, // Convert back to 1-indexed
				pageSize: newPagination.pageSize,
			});
		},
		[updateSearch],
	);

	// Current cursor for the active page
	const currentCursor =
		pagination.pageIndex === 0
			? undefined
			: cursorsRef.current.get(pagination.pageIndex);

	// ── Data (aggregate-powered server pagination) ──────────────
	const { data: listResult, isPending: isLoadingList } =
		useAuthenticatedConvexQuery(
			api.functions.consularRegistrations.paginatedListByOrg,
			activeOrgId && !isSearching
				? {
						orgId: activeOrgId,
						status: (statusFilter === "all" ? undefined : statusFilter) as any,
						profileType: profileTypeFilter,
						cursor: currentCursor,
						pageSize: pagination.pageSize,
					}
				: "skip",
		);

	const { data: searchResult, isPending: isLoadingSearch } =
		useAuthenticatedConvexQuery(
			api.functions.consularRegistrations.searchRegistrations,
			activeOrgId && isSearching
				? {
						orgId: activeOrgId,
						searchQuery: searchInput,
						status: (statusFilter === "all" ? undefined : statusFilter) as
							| RegistrationStatus
							| undefined,
						profileType: profileTypeFilter,
					}
				: "skip",
		);

	const activeResult = isSearching ? searchResult : listResult;
	const isLoading = isSearching ? isLoadingSearch : isLoadingList;

	// Store the next cursor when we get a result
	if (!isSearching && listResult?.nextCursor) {
		cursorsRef.current.set(pagination.pageIndex + 1, listResult.nextCursor);
	}

	// keepPreviousData: show old data while new page is loading to prevent flash
	const previousResultRef = useRef(activeResult);
	if (activeResult !== undefined) {
		previousResultRef.current = activeResult;
	}
	const displayResult = activeResult ?? previousResultRef.current;
	const isPageTransitioning =
		activeResult === undefined && previousResultRef.current !== undefined;

	const registrations = displayResult?.page ?? [];

	const { results: notifications, isLoading: isLoadingNotifs } =
		usePaginatedConvexQuery(
			api.functions.consularNotifications.listByOrg,
			activeOrgId ? { orgId: activeOrgId } : "skip",
			{ initialNumItems: 100 },
		);

	// ── Mutations ───────────────────────────────────────────────
	const { mutateAsync: generateCard } = useConvexMutationQuery(
		api.functions.consularRegistrations.generateCard,
	);
	const { mutateAsync: markAsPrinted } = useConvexMutationQuery(
		api.functions.consularRegistrations.markAsPrinted,
	);

	// ── Handlers ────────────────────────────────────────────────
	const handleGenerateCard = async (
		registrationId: Id<"consularRegistrations">,
	) => {
		try {
			const result = await generateCard({ registrationId });
			if (result.success) {
				toast.success(t("dashboard.consularRegistry.cardDialog.success"), {
					description: t(
						"dashboard.consularRegistry.cardDialog.successDescription",
						{ cardNumber: result.cardNumber },
					),
				});
			} else {
				toast.error(t("dashboard.consularRegistry.cardDialog.error"), {
					description: result.message,
				});
			}
			setShowCardDialog(false);
		} catch {
			toast.error(t("dashboard.consularRegistry.cardDialog.errorGeneric"));
		}
	};

	const handleMarkAsPrinted = async (
		registrationId: Id<"consularRegistrations">,
	) => {
		try {
			await markAsPrinted({ registrationId });
			toast.success(t("dashboard.consularRegistry.printDialog.success"));
			setShowPrintDialog(false);
		} catch {
			toast.error(t("dashboard.consularRegistry.printDialog.error"));
		}
	};

	// ── Columns (with action callbacks wired in) ────────────────
	const registrationColumns = useMemo((): ColumnDef<RegistrationRow>[] => {
		const base = getRegistrationColumns(t, i18n.language);
		// Replace the placeholder actions column with a real one
		return base.map((col) =>
			col.id === "actions"
				? {
						...col,
						cell: ({ row }) => (
							<RegistrationActionsCell
								row={row.original}
								onViewProfile={(reg) => {
									setSelectedRegistration(reg);
									setShowProfileDialog(true);
								}}
								onGenerateCard={(reg) => {
									setSelectedRegistration(reg);
									setShowCardDialog(true);
								}}
								onMarkPrinted={(reg) => {
									setSelectedRegistration(reg);
									setShowPrintDialog(true);
								}}
							/>
						),
					}
				: col,
		);
	}, [t, i18n.language]);

	const notificationColumns = useMemo((): ColumnDef<NotificationRow>[] => {
		const base = getNotificationColumns(t, i18n.language);
		return base.map((col) =>
			col.id === "actions"
				? {
						...col,
						cell: ({ row }) => (
							<NotificationActionsCell
								row={row.original}
								onViewProfile={(notif) => {
									setSelectedNotification(notif);
									setShowProfileDialog(true);
								}}
							/>
						),
					}
				: col,
		);
	}, [t, i18n.language]);

	// ── Filterable Columns ──────────────────────────────────────
	// Client-side filtering is no longer used for status.
	// ────────────────────────────────────────────────────────────

	// ── Stats (from aggregate-powered query, NOT paginated results) ─────
	const { data: stats } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.getStatsByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const selectedName = selectedRegistration
		? `${selectedRegistration?.profile?.identity?.firstName ?? ""} ${selectedRegistration?.profile?.identity?.lastName ?? ""}`.trim()
		: selectedNotification
			? `${selectedNotification?.profile?.identity?.firstName ?? ""} ${selectedNotification?.profile?.identity?.lastName ?? ""}`.trim()
			: "";

	const selectedProfileId =
		selectedRegistration?.profileId ?? selectedNotification?.profileId;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			{/* Back breadcrumb */}
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Link to="/affaires-consulaires" className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer">
					<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
					Affaires Consulaires
				</Link>
				<span className="text-muted-foreground/30">/</span>
				<span className="font-medium text-foreground/80">{t("dashboard.consularRegistry.title", "Registre Consulaire")}</span>
			</div>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.consularRegistry.title")}
					</h1>
					<p className="text-muted-foreground">
						{t("dashboard.consularRegistry.description")}
					</p>
				</div>
				<Button asChild>
					<Link to="/consular-registry/print-queue">
						<Printer className="h-4 w-4 mr-2" />
						{t("dashboard.consularRegistry.printQueue")}
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("dashboard.consularRegistry.stats.total")}
						</CardTitle>
						<User className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("dashboard.consularRegistry.stats.requested")}
						</CardTitle>
						<Clock className="h-4 w-4 text-amber-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.requested ?? "—"}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("dashboard.consularRegistry.stats.active")}
						</CardTitle>
						<CheckCircle2 className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.active ?? "—"}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("dashboard.consularRegistry.stats.expired")}
						</CardTitle>
						<CreditCard className="h-4 w-4 text-blue-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats?.expired ?? "—"}</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs: Registrations / Notifications */}
			<Tabs defaultValue="registrations" className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<TabsList>
						<TabsTrigger value="registrations" className="gap-1.5">
							<FileText className="h-4 w-4" />
							{t("dashboard.consularRegistry.tabs.registrations")}
						</TabsTrigger>
						<TabsTrigger value="notifications" className="gap-1.5">
							<Bell className="h-4 w-4" />
							{t("dashboard.consularRegistry.tabs.notifications")}
						</TabsTrigger>
					</TabsList>

					{/* Status Filter Tabs (acting like pill toggles) */}
					<div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
						{/* Profile type segmented control */}
						<div className="flex items-center border rounded-lg overflow-hidden shrink-0">
							<button
								type="button"
								onClick={() => handleProfileTypeFilterChange("all")}
								className={cn(
									"inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
									profileTypeFilter === "all"
										? "bg-primary text-primary-foreground"
										: "bg-background hover:bg-muted text-muted-foreground",
								)}
							>
								<Users className="h-3.5 w-3.5" />
								{t("dashboard.consularRegistry.filters.allProfiles", "Tous")}
							</button>
							<button
								type="button"
								onClick={() => handleProfileTypeFilterChange("adult")}
								className={cn(
									"inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l",
									profileTypeFilter === "adult"
										? "bg-primary text-primary-foreground"
										: "bg-background hover:bg-muted text-muted-foreground",
								)}
							>
								<User className="h-3.5 w-3.5" />
								{t("dashboard.consularRegistry.filters.adults", "Adultes")}
							</button>
							<button
								type="button"
								onClick={() => handleProfileTypeFilterChange("child")}
								className={cn(
									"inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l",
									profileTypeFilter === "child"
										? "bg-primary text-primary-foreground"
										: "bg-background hover:bg-muted text-muted-foreground",
								)}
							>
								<Baby className="h-3.5 w-3.5" />
								{t("dashboard.consularRegistry.filters.children", "Enfants")}
							</button>
						</div>

						<div className="h-5 w-px bg-border shrink-0" />

						{/* Status pills */}
						{REGISTRY_STATUS_TABS.map((tab) => {
							const isActive = statusFilter === tab.key;
							// Find count from stats (default to 0 if not loaded, fallback to "total" for "all")
							let count = 0;
							if (stats) {
								if (tab.key === "all") count = stats.total;
								else count = (stats as any)[tab.key] || 0;
							}

							return (
								<button
									key={tab.key}
									onClick={() => handleStatusFilterChange(tab.key)}
									className={cn(
										"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border",
										isActive
											? "bg-primary text-primary-foreground border-primary shadow-sm"
											: "bg-background hover:bg-muted/60 text-muted-foreground border-transparent hover:border-border/60",
									)}
								>
									{t(tab.labelKey)}
									{count > 0 && (
										<span
											className={cn(
												"inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
												isActive
													? "bg-primary-foreground/20 text-primary-foreground"
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

				{/* ── Tab 1: Registrations ──────────────────────────────── */}
				<TabsContent value="registrations">
					<DataTable
						columns={registrationColumns}
						data={registrations as RegistrationRow[]}
						searchPlaceholder={t(
							"dashboard.consularRegistry.table.searchPlaceholder",
						)}
						searchValue={searchInput}
						onSearchChange={(val) => {
							setSearchInput(val);
							// Reset to page 1 on search change
							updateSearch({ page: 1 });
						}}
						isLoading={isLoading && registrations.length === 0}
						isPageTransitioning={isPageTransitioning}
						totalRowCount={
							displayResult?.totalCount ??
							(stats
								? statusFilter === "all"
									? stats.total
									: ((stats as any)[statusFilter] ?? 0)
								: undefined)
						}
						pagination={pagination}
						onPaginationChange={handlePaginationChange}
					/>
				</TabsContent>

				{/* ── Tab 2: Notifications ──────────────────────────────── */}
				<TabsContent value="notifications">
					<DataTable
						columns={notificationColumns}
						data={(notifications ?? []) as NotificationRow[]}
						searchKey="citizen"
						searchPlaceholder={t(
							"dashboard.consularRegistry.notificationsTable.searchPlaceholder",
						)}
						isLoading={isLoadingNotifs && notifications.length === 0}
						// notifications don't have stats yet, so we don't pass totalRowCount
					/>
				</TabsContent>
			</Tabs>

			{/* ── Dialogs ──────────────────────────────────────────── */}

			{/* Generate Card Dialog */}
			<Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("dashboard.consularRegistry.cardDialog.title")}
						</DialogTitle>
						<DialogDescription>
							<Trans
								i18nKey="dashboard.consularRegistry.cardDialog.description"
								values={{ name: selectedName }}
								components={{ strong: <strong /> }}
							/>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCardDialog(false)}>
							{t("dashboard.consularRegistry.cardDialog.cancel")}
						</Button>
						<Button
							onClick={() =>
								selectedRegistration &&
								handleGenerateCard(selectedRegistration._id)
							}
						>
							<CreditCard className="h-4 w-4 mr-2" />
							{t("dashboard.consularRegistry.cardDialog.confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Print Dialog */}
			<Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("dashboard.consularRegistry.printDialog.title")}
						</DialogTitle>
						<DialogDescription>
							<Trans
								i18nKey="dashboard.consularRegistry.printDialog.description"
								values={{
									cardNumber: selectedRegistration?.cardNumber ?? "",
								}}
								components={{ code: <code /> }}
							/>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowPrintDialog(false)}>
							{t("dashboard.consularRegistry.printDialog.cancel")}
						</Button>
						<Button
							onClick={() =>
								selectedRegistration &&
								handleMarkAsPrinted(selectedRegistration._id)
							}
						>
							<Printer className="h-4 w-4 mr-2" />
							{t("dashboard.consularRegistry.printDialog.confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Profile Sheet */}
			{selectedProfileId && (
				<ProfileViewSheet
					profileId={selectedProfileId}
					open={showProfileDialog}
					onOpenChange={setShowProfileDialog}
				/>
			)}
		</div>
	);
}
