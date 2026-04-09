"use client";

/**
 * Services & Demarches — Design iProfil strict.
 *
 * Patterns iProfil :
 * - FlatCard : rounded-xl bg-card border flat-card-border
 * - Section headers : icon dans bg-foreground/[0.06] + text-sm font-semibold text-muted-foreground
 * - Boutons Type A : variant="ghost" h-8 px-3 text-xs font-medium bg-muted rounded-full
 * - Micro labels : text-[10px] font-semibold uppercase tracking-widest
 * - Items actifs : bg-amber-500/15 dark:bg-amber-500/10
 * - Compteurs : bg-foreground/[0.06] text-muted-foreground font-bold rounded-full
 */

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	FolderOpen,
	Globe,
	Loader2,
	Search,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { CardGridSkeleton, ListSkeleton } from "@/components/skeletons";
import type { CatalogService } from "@/components/my-space/service-detail-sheet";
import { ServiceDetailSheet } from "@/components/my-space/service-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import {
	DEMARCHE_FILTER_TABS,
	type DemarcheSubFilter,
	type DossierStatus,
	DOSSIER_STATUS_CONFIG,
	formatDateFr,
	getDeadlineInfo,
	getRequestProgressPercent,
	matchDossierFilter,
	matchRequestFilter,
} from "@/lib/dossier-status-config";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { REQUEST_STATUS_CONFIG } from "@/lib/request-status-config";
import { getCategoryConfig, SERVICE_CATEGORIES } from "@/lib/service-categories";
import { cn } from "@/lib/utils";

// ─── Types & Constants ──────────────────────────────────────────────────────

type TabKey = "services" | "demarches";
const SERVICES_PER_PAGE = 16;

// ─── Main ───────────────────────────────────────────────────────────────────

export default function ServicesDemarchesPage() {
	const { i18n } = useTranslation();
	const router = useRouter();

	const [activeTab, setActiveTab] = useState<TabKey>("services");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("ALL");
	const [selectedService, setSelectedService] =
		useState<CatalogService | null>(null);
	const [demarcheFilter, setDemarcheFilter] =
		useState<DemarcheSubFilter>("tous");
	const [currentPage, setCurrentPage] = useState(1);

	// ── Data ──
	const { data: services } = useConvexQuery(
		api.functions.services.listCatalog,
		{},
	);
	const { data: myProfile } = useAuthenticatedConvexQuery(
		api.functions.profiles.getMine,
		{},
	);
	const userType = myProfile?.userType;
	const userCountry = myProfile?.countryOfResidence;
	const { data: availableServiceIds } = useConvexQuery(
		api.functions.services.getAvailableServiceIdsForCountry,
		userCountry ? { userCountry } : "skip",
	);
	const {
		results: requests,
		status: paginationStatus,
		loadMore,
		isLoading: requestsLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.requests.listMine,
		{},
		{ initialNumItems: 20 },
	);
	const { data: dossiers = [] } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.listMyDossiers,
		{},
	);

	// ── Services disponibles pour l'utilisateur (representation + eligibilite) ──
	const userServices = useMemo(() => {
		if (!services) return [];
		return services.filter((svc) => {
			if (availableServiceIds && !availableServiceIds.includes(svc._id))
				return false;
			if (svc.eligibleProfiles?.length && userType && !svc.eligibleProfiles.includes(userType))
				return false;
			return true;
		});
	}, [services, availableServiceIds, userType]);

	// ── Services filtres par categorie + recherche UI ──
	const filteredServices = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return userServices.filter((svc) => {
			if (selectedCategory !== "ALL" && svc.category !== selectedCategory)
				return false;
			if (q) {
				const name = getLocalizedValue(svc.name, i18n.language);
				const desc = getLocalizedValue(svc.description, i18n.language);
				if (!name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q))
					return false;
			}
			return true;
		});
	}, [userServices, searchQuery, selectedCategory, i18n.language]);

	const handleCategoryChange = (cat: string) => {
		setSelectedCategory(cat);
		setCurrentPage(1);
	};

	// ── Stats ──
	const stats = useMemo(() => {
		const allD = dossiers as Array<{ status: string }>;
		return {
			totalServices: userServices.length,
			inProgress:
				requests.filter((r) => matchRequestFilter(r.status, "en_cours"))
					.length +
				allD.filter((d) =>
					matchDossierFilter(d.status as DossierStatus, "en_cours"),
				).length,
			actionsCount: requests.filter((r: any) =>
				r.actionsRequired?.some((a: any) => !a.completedAt),
			).length,
			completed:
				requests.filter((r) =>
					matchRequestFilter(r.status, "termines"),
				).length +
				allD.filter((d) =>
					matchDossierFilter(
						d.status as DossierStatus,
						"termines",
					),
				).length,
		};
	}, [userServices, requests, dossiers]);

	const totalDemarches = requests.length + (dossiers as any[]).length;

	const handleServiceClick = (svc: CatalogService) => {
		setSelectedService(svc);
		captureEvent("myspace_service_viewed", { service_type: svc.slug });
	};
	const handleCreateRequest = () => {
		if (!selectedService) return;
		router.push(`/my-space/services/${selectedService.slug}/new`);
	};

	// ─── Render ─────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="shrink-0">
				<PageHeader
					title="Services & Demarches"
					subtitle="Consultez les services consulaires et suivez vos demarches"
					icon={<Globe className="h-6 w-6 text-primary" />}
				/>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex-1 min-h-0 overflow-hidden mt-4 flex flex-col gap-3"
			>
				{/* ── Stats ── */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 stagger-children shrink-0">
					<StatCard
						icon={
							<Globe className="h-3.5 w-3.5 text-muted-foreground" />
						}
						value={stats.totalServices}
						label="Services disponibles"
					/>
					<StatCard
						icon={
							<Clock className="h-3.5 w-3.5 text-muted-foreground" />
						}
						value={stats.inProgress}
						label="En cours"
					/>
					<StatCard
						icon={
							<AlertTriangle
								className={cn(
									"h-3.5 w-3.5",
									stats.actionsCount > 0
										? "text-rose-600 dark:text-rose-400"
										: "text-muted-foreground",
								)}
							/>
						}
						iconBg={
							stats.actionsCount > 0
								? "bg-rose-500/10"
								: undefined
						}
						value={stats.actionsCount}
						label="Actions requises"
						valueClass={
							stats.actionsCount > 0
								? "text-rose-600 dark:text-rose-400"
								: undefined
						}
					/>
					<StatCard
						icon={
							<CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
						}
						value={stats.completed}
						label="Completees"
					/>
				</div>

				{/* ── Tabs ── */}
				<div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 shrink-0">
					<TabBtn
						active={activeTab === "services"}
						onClick={() => setActiveTab("services")}
					>
						<Globe className="h-3.5 w-3.5" />
						Services Consulaires
					</TabBtn>
					<TabBtn
						active={activeTab === "demarches"}
						onClick={() => setActiveTab("demarches")}
					>
						<FolderOpen className="h-3.5 w-3.5" />
						Mes Demarches
						{totalDemarches > 0 && (
							<span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full ml-1.5 min-w-6 text-center">
								{totalDemarches}
							</span>
						)}
					</TabBtn>
				</div>

				{/* ── Content ── */}
				{activeTab === "services" ? (
					<CatalogueContent
						services={userServices}
						filteredServices={filteredServices}
						currentPage={currentPage}
						setCurrentPage={setCurrentPage}
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						selectedCategory={selectedCategory}
						handleCategoryChange={handleCategoryChange}
						handleServiceClick={handleServiceClick}
					/>
				) : (
					<DemarchesContent
						requests={requests}
						requestsLoading={requestsLoading}
						paginationStatus={paginationStatus}
						loadMore={loadMore}
						dossiers={dossiers as any[]}
						demarcheFilter={demarcheFilter}
						setDemarcheFilter={setDemarcheFilter}
					/>
				)}
			</motion.div>

			<ServiceDetailSheet
				service={selectedService}
				open={!!selectedService}
				onOpenChange={(open) => !open && setSelectedService(null)}
				onCreateRequest={handleCreateRequest}
				isEligible={
					!selectedService?.eligibleProfiles ||
					selectedService.eligibleProfiles.length === 0 ||
					(!!userType &&
						selectedService.eligibleProfiles.includes(userType))
				}
				isAvailableInJurisdiction={
					!!availableServiceIds &&
					!!selectedService &&
					availableServiceIds.includes(selectedService._id)
				}
			/>
		</div>
	);
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
	icon,
	iconBg,
	value,
	label,
	valueClass,
}: {
	icon: React.ReactNode;
	iconBg?: string;
	value: number;
	label: string;
	valueClass?: string;
}) {
	return (
		<FlatCard>
			<div className="p-4 flex items-center gap-3">
				<div
					className={cn(
						"p-2 rounded-lg shrink-0",
						iconBg ??
							"bg-foreground/[0.06] dark:bg-foreground/[0.12]",
					)}
				>
					{icon}
				</div>
				<p className={cn("text-2xl font-bold leading-none shrink-0", valueClass)}>
					{value}
				</p>
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
					{label}
				</p>
			</div>
		</FlatCard>
	);
}

// ─── Tab Button ─────────────────────────────────────────────────────────────

function TabBtn({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all flex-1 justify-center",
				active
					? "bg-card text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

function CatalogueContent({
	services,
	filteredServices,
	currentPage,
	setCurrentPage,
	searchQuery,
	setSearchQuery,
	selectedCategory,
	handleCategoryChange,
	handleServiceClick,
}: {
	services: any;
	filteredServices: any[];
	currentPage: number;
	setCurrentPage: (n: number) => void;
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	selectedCategory: string;
	handleCategoryChange: (c: string) => void;
	handleServiceClick: (s: CatalogService) => void;
}) {
	const { t, i18n } = useTranslation();

	if (services === undefined) {
		return <CardGridSkeleton cols={3} count={6} className="flex-1" />;
	}

	const totalPages = Math.max(1, Math.ceil(filteredServices.length / SERVICES_PER_PAGE));
	const safePage = Math.min(currentPage, totalPages);
	const startIdx = (safePage - 1) * SERVICES_PER_PAGE;
	const pageServices = filteredServices.slice(startIdx, startIdx + SERVICES_PER_PAGE);

	return (
		<div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
			{/* Search + Categories — shrink-0 */}
			<FlatCard className="shrink-0">
				<div className="p-3.5 flex items-center gap-3">
					{/* Recherche */}
					<div className="relative w-56 shrink-0">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Rechercher..."
							value={searchQuery}
							onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
							className="w-full pl-10 pr-8 py-2 rounded-lg border-0 bg-muted outline-none transition-all text-sm focus:ring-2 focus:ring-primary/20"
						/>
						{searchQuery && (
							<button type="button" onClick={() => { setSearchQuery(""); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-foreground/[0.06] transition-colors">
								<X className="h-3.5 w-3.5 text-muted-foreground" />
							</button>
						)}
					</div>
					{/* Separateur vertical */}
					<div className="w-px h-6 bg-foreground/[0.08] shrink-0" />
					{/* Categories */}
					<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1">
						{SERVICE_CATEGORIES.map((cat) => {
							const CatIcon = cat.icon;
							const isActive = selectedCategory === cat.id;
							const count = cat.id === "ALL" ? (services?.length ?? 0) : (services?.filter((s: any) => s.category === cat.id).length ?? 0);
							// Masquer les categories sans services disponibles
							if (cat.id !== "ALL" && count === 0) return null;
							return (
								<button key={cat.id} type="button" onClick={() => handleCategoryChange(cat.id)}
									className={cn(
										"flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
										isActive ? "bg-primary text-primary-foreground" : "bg-foreground/[0.04] dark:bg-foreground/[0.08] text-muted-foreground hover:bg-foreground/[0.08]",
									)}>
									<CatIcon className="h-3.5 w-3.5" />
									{t(cat.labelKey)}
									<span className={cn("text-[10px] font-bold px-1.5 rounded-full min-w-[20px] text-center",
										isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground",
									)}>
										{count}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</FlatCard>

			{/* Grille — flex-1 pour remplir l'espace restant */}
			{pageServices.length > 0 ? (
				<div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
					<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-fr content-start">
						{pageServices.map((service: any) => {
							const { icon: SvcIcon, style } = getCategoryConfig(service.category);
							const serviceName = getLocalizedValue(service.name, i18n.language);
							return (
								<button key={service._id} type="button" onClick={() => handleServiceClick(service as CatalogService)} className="group text-left h-full">
									<FlatCard className="h-full hover:border-primary/20 hover:shadow-sm transition-all">
										<div className="p-4 flex items-center gap-3.5 h-full">
											<div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", style.bgColor)}>
												<SvcIcon className={cn("w-5.5 h-5.5", style.color)} />
											</div>
											<div className="flex-1 min-w-0">
												<span className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors block">
													{serviceName}
												</span>
												{service.estimatedDays && (
													<span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
														<Clock className="h-3 w-3 shrink-0" />{service.estimatedDays} jours
													</span>
												)}
											</div>
										</div>
									</FlatCard>
								</button>
							);
						})}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="shrink-0 flex items-center justify-center gap-4">
							<p className="text-xs text-muted-foreground shrink-0">
								{startIdx + 1}-{Math.min(startIdx + SERVICES_PER_PAGE, filteredServices.length)} sur {filteredServices.length}
							</p>
							<div className="flex items-center gap-1.5">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-full"
									disabled={safePage <= 1}
									onClick={() => setCurrentPage(safePage - 1)}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
									<button
										key={page}
										type="button"
										onClick={() => setCurrentPage(page)}
										className={cn(
											"h-8 min-w-8 px-2 rounded-full text-xs font-bold transition-all",
											page === safePage
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:bg-foreground/[0.06]",
										)}
									>
										{page}
									</button>
								))}
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-full"
									disabled={safePage >= totalPages}
									onClick={() => setCurrentPage(safePage + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</div>
			) : (
				<FlatCard className="flex-1">
					<div className="flex flex-col items-center justify-center h-full text-center px-4">
						<div className="p-3 rounded-full bg-muted inline-flex mb-3">
							<Search className="h-6 w-6 text-muted-foreground/40" />
						</div>
						<p className="text-sm font-semibold mb-1">Aucun service trouve</p>
						<p className="text-xs text-muted-foreground mb-3">Modifiez vos filtres ou votre recherche.</p>
						<Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium bg-muted hover:bg-muted/70 rounded-full"
							onClick={() => { setSearchQuery(""); handleCategoryChange("ALL"); }}>
							Reinitialiser
						</Button>
					</div>
				</FlatCard>
			)}
		</div>
	);
}

// ─── Demarches ──────────────────────────────────────────────────────────────

function DemarchesContent({
	requests,
	requestsLoading,
	paginationStatus,
	loadMore,
	dossiers,
	demarcheFilter,
	setDemarcheFilter,
}: {
	requests: any[];
	requestsLoading: boolean;
	paginationStatus: string;
	loadMore: (n: number) => void;
	dossiers: any[];
	demarcheFilter: DemarcheSubFilter;
	setDemarcheFilter: (f: DemarcheSubFilter) => void;
}) {
	const { t, i18n } = useTranslation();
	const filteredR = useMemo(
		() =>
			requests.filter((r: any) =>
				matchRequestFilter(r.status, demarcheFilter),
			),
		[requests, demarcheFilter],
	);
	const filteredD = useMemo(
		() =>
			dossiers.filter((d: any) =>
				matchDossierFilter(
					d.status as DossierStatus,
					demarcheFilter,
				),
			),
		[dossiers, demarcheFilter],
	);
	const total = filteredR.length + filteredD.length;
	const isEmpty =
		!requestsLoading && requests.length === 0 && dossiers.length === 0;
	const countFor = (f: DemarcheSubFilter) =>
		requests.filter((r: any) => matchRequestFilter(r.status, f)).length +
		dossiers.filter((d: any) =>
			matchDossierFilter(d.status as DossierStatus, f),
		).length;

	if (requestsLoading && requests.length === 0 && dossiers.length === 0) {
		return <ListSkeleton count={4} />;
	}

	if (isEmpty) {
		return (
			<FlatCard>
				<div className="flex flex-col items-center justify-center py-14 text-center px-4">
					<div className="p-4 rounded-full bg-muted mb-4">
						<FolderOpen className="h-10 w-10 text-muted-foreground/30" />
					</div>
					<h3 className="text-base font-semibold mb-1.5">
						Aucune demarche en cours
					</h3>
					<p className="text-sm text-muted-foreground mb-5 max-w-xs">
						Parcourez les services disponibles pour commencer.
					</p>
					<Button
						variant="ghost"
						className="h-8 px-4 text-xs font-medium bg-muted hover:bg-muted/70 rounded-full gap-1.5"
					>
						<Globe className="h-3.5 w-3.5" />
						Voir les services
					</Button>
				</div>
			</FlatCard>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
				{DEMARCHE_FILTER_TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setDemarcheFilter(tab.key)}
						className={cn(
							"px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
							demarcheFilter === tab.key
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{t(tab.labelKey, tab.fallback)}
						<span className="ml-1.5 text-[10px] opacity-60">
							{countFor(tab.key)}
						</span>
					</button>
				))}
			</div>

			{total === 0 ? (
				<FlatCard>
					<div className="flex flex-col items-center justify-center py-10 text-center">
						<div className="p-3 rounded-full bg-muted mb-3">
							<FolderOpen className="w-6 h-6 text-muted-foreground/40" />
						</div>
						<p className="text-sm font-semibold mb-1">
							Aucune demarche trouvee
						</p>
						<p className="text-xs text-muted-foreground">
							Aucune demarche ne correspond a ce filtre.
						</p>
					</div>
				</FlatCard>
			) : (
				<div className="space-y-2">
					{filteredR.map((r: any) => (
						<RequestItemCard
							key={r._id}
							request={r}
							lang={i18n.language}
							t={t}
						/>
					))}

					{filteredR.length > 0 && filteredD.length > 0 && (
						<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 block pt-2 px-0.5">
							Procedures administratives
						</span>
					)}

					{filteredD.map((d: any) => (
						<DossierItemCard key={d._id} dossier={d} />
					))}

					{paginationStatus === "CanLoadMore" && (
						<div className="flex justify-center pt-2">
							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-3 text-xs font-medium bg-muted hover:bg-muted/70 rounded-full"
								onClick={() => loadMore(20)}
							>
								{t("common.loadMore", "Charger plus")}
							</Button>
						</div>
					)}
					{paginationStatus === "LoadingMore" && (
						<div className="flex justify-center pt-2">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Request Item — iProfil activity card pattern ───────────────────────────

function RequestItemCard({
	request,
	lang,
	t,
}: {
	request: any;
	lang: string;
	t: any;
}) {
	const cfg =
		REQUEST_STATUS_CONFIG[
			request.status as keyof typeof REQUEST_STATUS_CONFIG
		];
	const progress = getRequestProgressPercent(request.status);
	const name = request.service?.name
		? getLocalizedValue(request.service.name, lang)
		: "Service consulaire";
	const pending = (request.actionsRequired ?? []).filter(
		(a: any) => !a.completedAt,
	);

	return (
		<Link
			href={`/my-space/requests/${request.reference || request._id}`}
			className="block group"
		>
			<FlatCard className="hover:shadow-sm transition-all">
				<div className="p-3.5">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
								<FileText className="h-3.5 w-3.5 text-muted-foreground" />
							</div>
							{request.reference && (
								<span className="text-[10px] font-mono text-muted-foreground">
									{request.reference}
								</span>
							)}
						</div>
						{cfg && (
							<Badge
								variant="outline"
								className={cn(
									"text-[10px] h-5 px-1.5",
									cfg.className,
								)}
							>
								{t(cfg.i18nKey, cfg.fallback)}
							</Badge>
						)}
					</div>
					<p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors mb-2">
						{name}
					</p>
					<div className="flex items-center gap-2.5 mb-2">
						<div className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted">
							<div
								className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-green-500/[0.27]" : "bg-primary")}
								style={{ width: `${progress}%` }}
							/>
						</div>
						<span className={cn("text-[10px] font-bold", progress >= 100 ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
							{progress}%
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[10px] text-muted-foreground">
							{formatDateFr(request._creationTime)}
						</span>
						{pending.length > 0 && (
							<span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
								<AlertTriangle className="h-2.5 w-2.5" />
								{pending.length} action
								{pending.length > 1 ? "s" : ""}
							</span>
						)}
					</div>
				</div>
			</FlatCard>
		</Link>
	);
}

// ─── Dossier Item — iProfil ─────────────────────────────────────────────────

function DossierItemCard({ dossier }: { dossier: any }) {
	const status = dossier.status as DossierStatus;
	const cfg = DOSSIER_STATUS_CONFIG[status];
	const deadline = getDeadlineInfo(dossier.dateLimite);
	const StatusIcon = cfg?.icon ?? FileText;

	return (
		<Link
			href={`/my-space/demarches/${dossier._id}`}
			className="block group"
		>
			<FlatCard className="hover:shadow-sm transition-all">
				<div className="p-3.5">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"p-1 rounded-md",
									cfg?.bgColor ?? "bg-muted",
								)}
							>
								<StatusIcon
									className={cn(
										"h-3.5 w-3.5",
										cfg?.color ?? "text-muted-foreground",
									)}
								/>
							</div>
							<span className="text-[10px] font-mono text-muted-foreground">
								{dossier.reference ?? "---"}
							</span>
						</div>
						<Badge
							variant="outline"
							className={cn(
								"text-[10px] h-5 px-1.5",
								cfg?.bgColor,
								cfg?.color,
							)}
						>
							{cfg?.label ?? status}
						</Badge>
					</div>
					<p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors mb-1">
						{dossier.typeLabel?.fr ?? "Demarche"}
					</p>
					<p className="text-xs text-muted-foreground mb-2">
						Etape : {dossier.etapeLabel?.fr ?? "---"}
					</p>
					<div className="flex items-center justify-between">
						<span className="text-[10px] text-muted-foreground">
							{formatDateFr(dossier.dateDepot)}
						</span>
						{deadline && (
							<span
								className={cn(
									"text-[10px] font-bold flex items-center gap-1",
									deadline.color,
								)}
							>
								{deadline.urgent ? (
									<AlertTriangle className="h-2.5 w-2.5" />
								) : (
									<Clock className="h-2.5 w-2.5" />
								)}
								{deadline.label}
							</span>
						)}
					</div>
				</div>
			</FlatCard>
		</Link>
	);
}
