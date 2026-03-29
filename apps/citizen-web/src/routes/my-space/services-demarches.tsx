/**
 * Services Consulaires & Démarches — Unified page
 *
 * Two tabs:
 * 1. Services Consulaires — compact catalogue of available services
 * 2. Mes Démarches — merged view of user requests + dossier procedures
 */

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	BookOpen,
	BookOpenCheck,
	Building2,
	Calendar,
	CalendarClock,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	FileCheck,
	FileText,
	FolderOpen,
	Globe,
	Loader2,
	type LucideIcon,
	MapPin,
	Plus,
	PlusCircle,
	Search,
	ShieldAlert,
	SlidersHorizontal,
	Users,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/my-space/page-header";
import { RequestCard } from "@/components/my-space/request-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/my-space/services-demarches")({
	component: ServicesDemarchesPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type CatalogService = {
	_id: string;
	slug: string;
	name: string | Record<string, string>;
	description: string | Record<string, string>;
	content?: string | Record<string, string>;
	category: string;
	estimatedDays?: number;
	requiresAppointment?: boolean;
	eligibleProfiles?: string[];
	joinedDocuments?: Array<{
		type: string;
		label: { fr: string; en?: string };
		required: boolean;
	}>;
};

type DossierStatus =
	| "brouillon"
	| "en_cours"
	| "en_attente"
	| "suspendu"
	| "valide"
	| "rejete"
	| "clos"
	| "archive";

type TabKey = "services" | "demarches";
type DemarcheSubFilter = "tous" | "en_cours" | "en_attente" | "termines";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES: {
	id: string;
	icon: LucideIcon;
	labelKey: string;
}[] = [
	{ id: "ALL", icon: SlidersHorizontal, labelKey: "services.category.all" },
	{
		id: ServiceCategory.Passport,
		icon: BookOpenCheck,
		labelKey: "services.category.passport",
	},
	{
		id: ServiceCategory.Visa,
		icon: Globe,
		labelKey: "services.category.visa",
	},
	{
		id: ServiceCategory.CivilStatus,
		icon: FileText,
		labelKey: "services.category.civilStatus",
	},
	{
		id: ServiceCategory.Registration,
		icon: BookOpen,
		labelKey: "services.category.registration",
	},
	{
		id: ServiceCategory.Certification,
		icon: FileCheck,
		labelKey: "services.category.certification",
	},
	{
		id: ServiceCategory.Assistance,
		icon: ShieldAlert,
		labelKey: "services.category.assistance",
	},
	{
		id: ServiceCategory.Declaration,
		icon: Building2,
		labelKey: "services.category.declaration",
	},
];

const CATEGORY_COLORS: Record<string, { color: string; bgColor: string }> = {
	[ServiceCategory.Passport]: {
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-500/10",
	},
	[ServiceCategory.Visa]: {
		color: "text-green-600 dark:text-green-400",
		bgColor: "bg-green-500/10",
	},
	[ServiceCategory.CivilStatus]: {
		color: "text-yellow-600 dark:text-yellow-400",
		bgColor: "bg-yellow-500/10",
	},
	[ServiceCategory.Registration]: {
		color: "text-purple-600 dark:text-purple-400",
		bgColor: "bg-purple-500/10",
	},
	[ServiceCategory.Certification]: {
		color: "text-orange-600 dark:text-orange-400",
		bgColor: "bg-orange-500/10",
	},
	[ServiceCategory.Assistance]: {
		color: "text-red-600 dark:text-red-400",
		bgColor: "bg-red-500/10",
	},
	[ServiceCategory.Other]: {
		color: "text-gray-600 dark:text-gray-400",
		bgColor: "bg-gray-500/10",
	},
	[ServiceCategory.Declaration]: {
		color: "text-indigo-600 dark:text-indigo-400",
		bgColor: "bg-indigo-500/10",
	},
};

const DOSSIER_STATUS_CONFIG: Record<
	DossierStatus,
	{ label: string; color: string; bgColor: string }
> = {
	brouillon: {
		label: "Brouillon",
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor:
			"bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
	},
	en_cours: {
		label: "En cours",
		color: "text-blue-600 dark:text-blue-400",
		bgColor:
			"bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
	},
	en_attente: {
		label: "En attente",
		color: "text-amber-600 dark:text-amber-400",
		bgColor:
			"bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
	},
	suspendu: {
		label: "Suspendu",
		color: "text-orange-600 dark:text-orange-400",
		bgColor:
			"bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
	},
	valide: {
		label: "Validé",
		color: "text-emerald-600 dark:text-emerald-400",
		bgColor:
			"bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800",
	},
	rejete: {
		label: "Rejeté",
		color: "text-red-600 dark:text-red-400",
		bgColor: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
	},
	clos: {
		label: "Clos",
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor:
			"bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
	},
	archive: {
		label: "Archivé",
		color: "text-violet-600 dark:text-violet-400",
		bgColor:
			"bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800",
	},
};

const DEMARCHE_FILTER_TABS: { key: DemarcheSubFilter; label: string }[] = [
	{ key: "tous", label: "Tous" },
	{ key: "en_cours", label: "En cours" },
	{ key: "en_attente", label: "En attente" },
	{ key: "termines", label: "Terminés" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchDossierFilter(
	status: DossierStatus,
	filter: DemarcheSubFilter,
): boolean {
	if (filter === "tous") return true;
	if (filter === "en_cours")
		return status === "en_cours" || status === "brouillon";
	if (filter === "en_attente")
		return status === "en_attente" || status === "suspendu";
	return (
		status === "valide" ||
		status === "rejete" ||
		status === "clos" ||
		status === "archive"
	);
}

function matchRequestFilter(
	status: string,
	filter: DemarcheSubFilter,
): boolean {
	if (filter === "tous") return true;
	if (filter === "en_cours")
		return ["submitted", "processing", "draft"].includes(status);
	if (filter === "en_attente")
		return ["action_required", "pending_documents"].includes(status);
	return ["completed", "approved", "rejected", "cancelled"].includes(status);
}

function formatDateFr(ts: number): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(ts));
}

function getDeadlineInfo(dateLimite?: number) {
	if (!dateLimite) return null;
	const now = Date.now();
	const daysLeft = Math.ceil((dateLimite - now) / 86400000);
	if (daysLeft < 0)
		return { label: "En retard", color: "text-red-500", urgent: true };
	if (daysLeft <= 3)
		return {
			label: `${daysLeft}j restant${daysLeft > 1 ? "s" : ""}`,
			color: "text-amber-500",
			urgent: true,
		};
	return {
		label: `${daysLeft}j restants`,
		color: "text-muted-foreground",
		urgent: false,
	};
}

// ─── Main Component ──────────────────────────────────────────────────────────

function ServicesDemarchesPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();

	// ── Tabs state ──
	const [activeTab, setActiveTab] = useState<TabKey>("services");

	// ── Catalog state ──
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("ALL");
	const [selectedService, setSelectedService] =
		useState<CatalogService | null>(null);

	// ── Démarches filter state ──
	const [demarcheFilter, setDemarcheFilter] =
		useState<DemarcheSubFilter>("tous");

	// ── Data: Catalog ──
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

	// ── Data: Requests ──
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

	// ── Data: Dossiers ──
	const { data: dossiers = [] } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.listMyDossiers,
		{},
	);

	// ── Filtered catalog ──
	const filteredServices = useMemo(() => {
		if (!services) return [];
		const query = searchQuery.toLowerCase().trim();
		return services.filter((service) => {
			const matchesCategory =
				selectedCategory === "ALL" || service.category === selectedCategory;
			const name = getLocalizedValue(service.name, i18n.language);
			const desc = getLocalizedValue(service.description, i18n.language);
			const matchesSearch =
				!query ||
				name.toLowerCase().includes(query) ||
				desc.toLowerCase().includes(query) ||
				service.category?.toLowerCase().includes(query);
			const matchesEligibility =
				!service.eligibleProfiles ||
				service.eligibleProfiles.length === 0 ||
				(userType && service.eligibleProfiles.includes(userType));
			return matchesCategory && matchesSearch && matchesEligibility;
		});
	}, [services, searchQuery, selectedCategory, i18n.language, userType]);

	// ── Combined démarches count ──
	const totalDemarches = requests.length + (dossiers as any[]).length;

	// ── Catalog handlers ──
	const handleClearSearch = () => {
		setSearchQuery("");
		setSelectedCategory("ALL");
	};

	const handleServiceClick = (service: CatalogService) => {
		setSelectedService(service);
		captureEvent("myspace_service_viewed", { service_type: service.slug });
	};

	const handleCreateRequest = () => {
		if (!selectedService) return;
		navigate({
			to: "/my-space/services/$slug/new",
			params: { slug: selectedService.slug },
		});
	};

	// ── Tabs config ──
	const mainTabs: {
		key: TabKey;
		label: string;
		icon: LucideIcon;
		count?: number;
	}[] = [
		{
			key: "services",
			label: "Services Consulaires",
			icon: Globe,
		},
		{
			key: "demarches",
			label: "Mes Démarches",
			icon: FolderOpen,
			count: totalDemarches || undefined,
		},
	];

	const catalogLoading = services === undefined;

	return (
		<div className="space-y-5">
			{/* ── Header ── */}
			<PageHeader
				title="Services & Démarches"
				subtitle="Consultez les services consulaires disponibles et suivez vos démarches en cours"
				icon={<Globe className="h-6 w-6 text-primary" />}
			/>

			{/* ── Tab Bar ── */}
			<div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
				{mainTabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setActiveTab(tab.key)}
						className={cn(
							"flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
							activeTab === tab.key
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
						)}
					>
						<tab.icon className="h-4 w-4" />
						{tab.label}
						{tab.count && tab.count > 0 && (
							<Badge
								variant="secondary"
								className="ml-1 h-5 min-w-5 text-[10px]"
							>
								{tab.count}
							</Badge>
						)}
					</button>
				))}
			</div>

			{/* ── Tab Content ── */}
			{activeTab === "services" && (
				<CatalogueTabContent
					services={services}
					filteredServices={filteredServices}
					catalogLoading={catalogLoading}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					selectedCategory={selectedCategory}
					setSelectedCategory={setSelectedCategory}
					handleClearSearch={handleClearSearch}
					handleServiceClick={handleServiceClick}
					availableServiceIds={availableServiceIds}
					t={t}
					i18n={i18n}
				/>
			)}

			{activeTab === "demarches" && (
				<DemarchesTabContent
					requests={requests}
					requestsLoading={requestsLoading}
					paginationStatus={paginationStatus}
					loadMore={loadMore}
					dossiers={dossiers as any[]}
					demarcheFilter={demarcheFilter}
					setDemarcheFilter={setDemarcheFilter}
					navigate={navigate}
					t={t}
				/>
			)}

			{/* ── Service Detail Modal ── */}
			<ServiceDetailModal
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

// ─── Catalogue Tab — Featured services + collapsible others ─────────────────

const FEATURED_SERVICE_NAMES = [
	"Carte Consulaire",
	"Protection et Assistance Consulaire",
	"Déclaration d'Association",
	"Déclaration d'Entreprise",
	"Tenant Lieu de Passeport",
	"Laissez-Passer",
	"Légalisation de Documents",
	"Certificats de Coutume et de Célibat",
];

function CatalogueTabContent({
	services,
	filteredServices,
	catalogLoading,
	searchQuery,
	setSearchQuery,
	selectedCategory,
	setSelectedCategory,
	handleClearSearch,
	handleServiceClick,
	availableServiceIds,
	t,
	i18n,
}: {
	services: any;
	filteredServices: any[];
	catalogLoading: boolean;
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	selectedCategory: string;
	setSelectedCategory: (c: string) => void;
	handleClearSearch: () => void;
	handleServiceClick: (service: CatalogService) => void;
	availableServiceIds: string[] | undefined;
	t: any;
	i18n: any;
}) {
	const [showOthers, setShowOthers] = useState(false);

	// Split into featured and others
	const { featured, others } = useMemo(() => {
		const allSvc = filteredServices ?? [];
		const feat: any[] = [];
		const matchedIds = new Set<string>();

		for (const fname of FEATURED_SERVICE_NAMES) {
			const firstWord = fname.toLowerCase().split(" ")[0];
			const match = allSvc.find((s: any) => {
				const sName = (getLocalizedValue(s.name, i18n.language) || "").toLowerCase();
				return sName.includes(firstWord) && !matchedIds.has(s._id);
			});
			if (match) {
				matchedIds.add(match._id);
				feat.push(match);
			}
		}

		const rest = allSvc.filter((s: any) => !matchedIds.has(s._id));
		return { featured: feat, others: rest };
	}, [filteredServices, i18n.language]);

	if (catalogLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
				<p className="text-muted-foreground">{t("common.loading")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Search bar compact */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<input
					type="text"
					placeholder="Rechercher un service..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background outline-none transition-all text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
				/>
				{searchQuery && (
					<button type="button" onClick={() => setSearchQuery("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors">
						<X className="h-3.5 w-3.5 text-muted-foreground" />
					</button>
				)}
			</div>

			{/* Featured services — prominent grid */}
			{featured.length > 0 && (
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-0.5">Services vedettes</p>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{featured.map((service: any) => {
							const colors = CATEGORY_COLORS[service.category] || CATEGORY_COLORS[ServiceCategory.Other];
							const serviceName = getLocalizedValue(service.name, i18n.language);
							const Icon = SERVICE_CATEGORIES.find((c) => c.id === service.category)?.icon || FileText;

							return (
								<button
									key={service._id}
									type="button"
									onClick={() => handleServiceClick(service as CatalogService)}
									className="group text-left"
								>
									<Card className="h-full hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
										<CardContent className="p-3 flex flex-col items-center text-center gap-2">
											<div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bgColor)}>
												<Icon className={cn("w-5 h-5", colors.color)} />
											</div>
											<span className="text-[11px] font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
												{serviceName}
											</span>
										</CardContent>
									</Card>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Other services — collapsible list */}
			{others.length > 0 && (
				<div>
					<button
						type="button"
						onClick={() => setShowOthers(!showOthers)}
						className="flex items-center justify-between w-full py-2 px-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
					>
						<span className="text-xs font-medium text-muted-foreground">
							{others.length} autre{others.length > 1 ? "s" : ""} service{others.length > 1 ? "s" : ""} disponible{others.length > 1 ? "s" : ""}
						</span>
						<ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showOthers && "rotate-180")} />
					</button>
					<div className={cn("overflow-hidden transition-all duration-200", showOthers ? "max-h-[300px] opacity-100 mt-2" : "max-h-0 opacity-0")}>
						<div className="space-y-1 overflow-y-auto max-h-[280px] pr-1">
							{others.map((service: any) => {
								const serviceName = getLocalizedValue(service.name, i18n.language);
								const serviceDesc = getLocalizedValue(service.description, i18n.language);
								const colors = CATEGORY_COLORS[service.category] || CATEGORY_COLORS[ServiceCategory.Other];
								const Icon = SERVICE_CATEGORIES.find((c) => c.id === service.category)?.icon || FileText;

								return (
									<button
										key={service._id}
										type="button"
										onClick={() => handleServiceClick(service as CatalogService)}
										className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
									>
										<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colors.bgColor)}>
											<Icon className={cn("w-4 h-4", colors.color)} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">{serviceName}</p>
											{serviceDesc && <p className="text-[10px] text-muted-foreground line-clamp-1">{serviceDesc}</p>}
										</div>
										<ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0" />
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Empty state */}
			{featured.length === 0 && others.length === 0 && (
				<div className="text-center py-8 rounded-xl bg-muted/30 border-2 border-dashed">
					<Search className="h-7 w-7 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-sm font-semibold mb-1">Aucun service trouvé</p>
					<Button size="sm" variant="outline" onClick={handleClearSearch}>Réinitialiser</Button>
				</div>
			)}
		</div>
	);
}

// ─── Démarches Tab (merged requests + dossiers) ─────────────────────────────

function DemarchesTabContent({
	requests,
	requestsLoading,
	paginationStatus,
	loadMore,
	dossiers,
	demarcheFilter,
	setDemarcheFilter,
	navigate,
	t,
}: {
	requests: any[];
	requestsLoading: boolean;
	paginationStatus: string;
	loadMore: (n: number) => void;
	dossiers: any[];
	demarcheFilter: DemarcheSubFilter;
	setDemarcheFilter: (f: DemarcheSubFilter) => void;
	navigate: any;
	t: any;
}) {
	// Filter requests
	const filteredRequests = useMemo(
		() =>
			requests.filter((r: any) =>
				matchRequestFilter(r.status, demarcheFilter),
			),
		[requests, demarcheFilter],
	);

	// Filter dossiers
	const filteredDossiers = useMemo(
		() =>
			dossiers.filter((d: any) =>
				matchDossierFilter(d.status as DossierStatus, demarcheFilter),
			),
		[dossiers, demarcheFilter],
	);

	const totalCount = filteredRequests.length + filteredDossiers.length;
	const isEmpty =
		!requestsLoading && requests.length === 0 && dossiers.length === 0;

	// Count per filter
	const countForFilter = (filter: DemarcheSubFilter) => {
		const rCount = requests.filter((r: any) =>
			matchRequestFilter(r.status, filter),
		).length;
		const dCount = dossiers.filter((d: any) =>
			matchDossierFilter(d.status as DossierStatus, filter),
		).length;
		return rCount + dCount;
	};

	if (requestsLoading && requests.length === 0 && dossiers.length === 0) {
		return (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin h-8 w-8 text-primary" />
			</div>
		);
	}

	if (isEmpty) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
			>
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<FolderOpen className="h-14 w-14 mb-4 text-muted-foreground/30" />
						<h3 className="text-lg font-medium mb-2">
							Aucune démarche en cours
						</h3>
						<p className="text-sm text-muted-foreground mb-6 max-w-sm">
							Vous n'avez pas encore effectué de démarche consulaire.
							Parcourez les services disponibles pour commencer.
						</p>
						<Button
							onClick={() =>
								navigate({ to: "/my-space/services-demarches" })
							}
							variant="outline"
							className="gap-2"
						>
							<Globe className="h-4 w-4" />
							Voir les services
						</Button>
					</CardContent>
				</Card>
			</motion.div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Sub-tab filters */}
			<div className="flex items-center justify-between">
				<div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
					{DEMARCHE_FILTER_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							onClick={() => setDemarcheFilter(tab.key)}
							className={cn(
								"px-3 py-1.5 text-xs font-medium rounded-md transition-all",
								demarcheFilter === tab.key
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{tab.label}
							<span className="ml-1.5 text-[10px] opacity-60">
								{countForFilter(tab.key)}
							</span>
						</button>
					))}
				</div>
			</div>

			{totalCount === 0 ? (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.3 }}
					className="flex flex-col items-center justify-center py-12 text-center"
				>
					<div className="p-4 rounded-full bg-muted/50 mb-4">
						<FolderOpen className="w-7 h-7 text-muted-foreground" />
					</div>
					<h3 className="text-sm font-semibold mb-1">
						Aucune démarche trouvée
					</h3>
					<p className="text-xs text-muted-foreground max-w-xs">
						Aucune démarche ne correspond à ce filtre.
					</p>
				</motion.div>
			) : (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
					className="space-y-3"
				>
					{/* Requests (service requests) */}
					{filteredRequests.length > 0 && (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{filteredRequests.map((request: any) => (
								<RequestCard key={request._id} request={request} />
							))}
						</div>
					)}

					{/* Dossier procedures */}
					{filteredDossiers.length > 0 && (
						<div className="space-y-2">
							{filteredRequests.length > 0 &&
								filteredDossiers.length > 0 && (
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
										Procédures administratives
									</p>
								)}
							{filteredDossiers.map(
								(dossier: any, index: number) => {
									const status =
										dossier.status as DossierStatus;
									const config =
										DOSSIER_STATUS_CONFIG[status];
									const deadline = getDeadlineInfo(
										dossier.dateLimite,
									);

									return (
										<motion.div
											key={dossier._id}
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.15,
												delay: index * 0.03,
											}}
										>
											<Link
												to="/my-space/demarches/$dossierId"
												params={{
													dossierId: dossier._id,
												}}
											>
												<Card className="p-3.5 bg-card border-border/50 rounded-xl hover:border-border hover:shadow-sm transition-all cursor-pointer group">
													<div className="flex items-start justify-between gap-3">
														<div className="flex items-start gap-3 flex-1 min-w-0">
															<div
																className={cn(
																	"p-2 rounded-lg border shrink-0",
																	config.bgColor,
																)}
															>
																<FileText
																	className={cn(
																		"w-4 h-4",
																		config.color,
																	)}
																/>
															</div>
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 mb-0.5">
																	<span className="text-xs font-mono text-muted-foreground">
																		{
																			dossier.reference
																		}
																	</span>
																	<Badge
																		variant="outline"
																		className={cn(
																			"text-[10px] border px-1.5 py-0",
																			config.bgColor,
																			config.color,
																		)}
																	>
																		{
																			config.label
																		}
																	</Badge>
																</div>
																<p className="text-sm font-medium truncate">
																	{dossier
																		.typeLabel
																		?.fr ??
																		"Démarche"}
																</p>
																<p className="text-xs text-muted-foreground mt-0.5">
																	Étape :{" "}
																	{dossier
																		.etapeLabel
																		?.fr ??
																		"---"}
																</p>
															</div>
														</div>

														<div className="flex flex-col items-end gap-1 shrink-0">
															<div className="flex items-center gap-1 text-xs text-muted-foreground">
																<CalendarClock className="w-3 h-3" />
																<span>
																	{formatDateFr(
																		dossier.dateDepot,
																	)}
																</span>
															</div>
															{deadline && (
																<div
																	className={cn(
																		"flex items-center gap-1 text-xs",
																		deadline.color,
																	)}
																>
																	{deadline.urgent ? (
																		<AlertTriangle className="w-3 h-3" />
																	) : (
																		<Clock className="w-3 h-3" />
																	)}
																	<span>
																		{
																			deadline.label
																		}
																	</span>
																</div>
															)}
															<ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
														</div>
													</div>
												</Card>
											</Link>
										</motion.div>
									);
								},
							)}
						</div>
					)}

					{/* Load More (for paginated requests) */}
					{paginationStatus === "CanLoadMore" && (
						<div className="flex justify-center pt-2">
							<Button
								variant="outline"
								size="sm"
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
				</motion.div>
			)}
		</div>
	);
}

// ─── Service Detail Modal ────────────────────────────────────────────────────

function ServiceDetailModal({
	service,
	open,
	onOpenChange,
	onCreateRequest,
	isEligible = true,
	isAvailableInJurisdiction = true,
}: {
	service: CatalogService | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateRequest: () => void;
	isEligible?: boolean;
	isAvailableInJurisdiction?: boolean;
}) {
	const { t, i18n } = useTranslation();

	if (!service) return null;

	const colors =
		CATEGORY_COLORS[service.category] ||
		CATEGORY_COLORS[ServiceCategory.Other];
	const Icon =
		SERVICE_CATEGORIES.find((c) => c.id === service.category)?.icon ||
		FileText;
	const serviceName = getLocalizedValue(service.name, i18n.language);
	const serviceDescription = getLocalizedValue(
		service.description,
		i18n.language,
	);
	const serviceContent = service.content
		? getLocalizedValue(service.content, i18n.language)
		: null;
	const categoryLabel = t(`services.categoriesMap.${service.category}`);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-start gap-4">
						<div
							className={`p-3 rounded-xl ${colors.bgColor} ${colors.color} shrink-0`}
						>
							<Icon className="w-7 h-7" />
						</div>
						<div className="flex-1 min-w-0">
							<DialogTitle className="text-xl font-bold leading-tight">
								{serviceName}
							</DialogTitle>
							<div className="flex flex-wrap gap-2 mt-2">
								<Badge
									variant="secondary"
									className={`${colors.bgColor} ${colors.color}`}
								>
									{categoryLabel}
								</Badge>
								{service.estimatedDays && (
									<Badge variant="outline" className="gap-1">
										<Clock className="h-3 w-3" />
										{service.estimatedDays}{" "}
										{t("services.days", {
											count: service.estimatedDays,
										})}
									</Badge>
								)}
								{service.requiresAppointment && (
									<Badge
										variant="outline"
										className="gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
									>
										<Calendar className="h-3 w-3" />
										{t("services.appointmentRequired", "RDV requis")}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<DialogDescription className="mt-3 text-sm leading-relaxed">
						{serviceDescription}
					</DialogDescription>
				</DialogHeader>

				{/* Online availability */}
				{!isAvailableInJurisdiction && (
					<div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
						<MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-amber-800 dark:text-amber-300">
								{t("services.notAvailableOnlineTitle", "Non disponible en ligne")}
							</p>
							<p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
								{t(
									"services.notAvailableOnlineDesc",
									"Ce service nécessite une visite en personne.",
								)}
							</p>
						</div>
					</div>
				)}

				{isAvailableInJurisdiction && (
					<div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
						<Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
							{t("services.availableOnline", "Disponible en ligne")}
						</p>
					</div>
				)}

				{/* Detailed content */}
				{serviceContent && (
					<>
						<Separator />
						<div>
							<h4 className="text-sm font-semibold mb-2">
								{t("services.detailsTitle", "Détails")}
							</h4>
							<div
								className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: <Needed for rich content>
								dangerouslySetInnerHTML={{
									__html: serviceContent,
								}}
							/>
						</div>
					</>
				)}

				{/* Required Documents */}
				{service.joinedDocuments &&
					service.joinedDocuments.length > 0 && (
						<>
							<Separator />
							<div>
								<h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
									<FileText className="h-4 w-4 text-muted-foreground" />
									{t("services.requiredDocuments", "Documents requis")} (
									{service.joinedDocuments.length})
								</h4>
								<ul className="space-y-2">
									{service.joinedDocuments.map(
										(doc, index) => (
											<li
												key={`${doc.type}-${index}`}
												className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg"
											>
												<div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
													{index + 1}
												</div>
												<span className="flex-1 text-sm">
													{getLocalizedValue(
														doc.label,
														i18n.language,
													)}
												</span>
												{doc.required && (
													<Badge
														variant="destructive"
														className="text-[10px] shrink-0"
													>
														{t("services.required", "Requis")}
													</Badge>
												)}
											</li>
										),
									)}
								</ul>
							</div>
						</>
					)}

				{/* Beneficiaries */}
				{service.eligibleProfiles &&
					service.eligibleProfiles.length > 0 && (
						<>
							<Separator />
							<div>
								<h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
									<Users className="h-4 w-4 text-muted-foreground" />
									{t(
										"services.modal.eligibleBeneficiaries",
										"Bénéficiaires éligibles",
									)}
								</h4>
								<div className="flex flex-wrap gap-2">
									{service.eligibleProfiles.map(
										(profileType: string) => {
											const colorMap: Record<
												string,
												string
											> = {
												long_stay:
													"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
												short_stay:
													"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
												visa_tourism:
													"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
												visa_business:
													"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
												visa_long_stay:
													"bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
												admin_services:
													"bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
											};
											return (
												<Badge
													key={profileType}
													variant="secondary"
													className={`gap-1 ${colorMap[profileType] ?? "bg-gray-100 text-gray-700"}`}
												>
													<CheckCircle2 className="h-3 w-3" />
													{t(
														`services.modal.profileTypes.${profileType}`,
													)}
												</Badge>
											);
										},
									)}
								</div>
							</div>
						</>
					)}

				{/* Important Info */}
				<div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
					<p className="font-medium text-foreground mb-1.5 text-sm">
						{t("services.modal.importantInfo", "Informations importantes")}
					</p>
					<ul className="list-disc list-inside space-y-0.5">
						<li>{t("services.modal.infoPoints.docs", "Préparez tous les documents requis avant de commencer")}</li>
						<li>{t("services.modal.infoPoints.delay", "Les délais de traitement sont indicatifs")}</li>
						<li>{t("services.modal.infoPoints.identity", "Une pièce d'identité valide est toujours requise")}</li>
					</ul>
				</div>

				{/* Actions */}
				<DialogFooter className="sm:justify-between">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="sm:order-1"
					>
						{t("common.close", "Fermer")}
					</Button>
					{!isAvailableInJurisdiction ? (
						<div className="flex items-center gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm sm:order-2">
							<ShieldAlert className="h-4 w-4 shrink-0" />
							<span>
								{t(
									"services.notAvailableInJurisdiction",
									"Non disponible dans votre juridiction",
								)}
							</span>
						</div>
					) : !isEligible ? (
						<div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm sm:order-2">
							<ShieldAlert className="h-4 w-4 shrink-0" />
							<span>
								{t(
									"services.notEligible",
									"Vous n'êtes pas éligible à ce service",
								)}
							</span>
						</div>
					) : (
						<Button
							onClick={onCreateRequest}
							className="gap-2 sm:order-2"
						>
							<PlusCircle className="h-4 w-4" />
							Effectuer cette démarche
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
