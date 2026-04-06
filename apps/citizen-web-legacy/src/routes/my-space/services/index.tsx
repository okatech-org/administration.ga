import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	FileText,
	Loader2,
	Search,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ServiceCard } from "@/components/home/ServiceCard";
import { PageHeader } from "@/components/my-space/page-header";
import type { CatalogService } from "@/components/my-space/service-detail-sheet";
import { ServiceDetailSheet } from "@/components/my-space/service-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { getLocalizedValue } from "@/lib/i18n-utils";
import {
	SERVICE_CATEGORIES,
	getCategoryConfig,
} from "@/lib/service-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-space/services/")({
	component: ServicesPage,
});

// Categories et styles importes depuis la source partagee
// (voir @/lib/service-categories)

function ServicesPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();

	const { data: services } = useConvexQuery(
		api.functions.services.listCatalog,
		{},
	);

	// Get user profile for eligibility filtering
	const { data: myProfile } = useAuthenticatedConvexQuery(
		api.functions.profiles.getMine,
		{},
	);
	const userType = myProfile?.userType;
	const userCountry = myProfile?.countryOfResidence;

	// Get service IDs available in user's jurisdiction (org has service active + covers user's country)
	const { data: availableServiceIds } = useConvexQuery(
		api.functions.services.getAvailableServiceIdsForCountry,
		userCountry ? { userCountry } : "skip",
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("ALL");
	const [selectedService, setSelectedService] = useState<CatalogService | null>(
		null,
	);

	const isLoading = services === undefined;

	// Filtered services (by category, search, AND eligibility)
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

			// Eligibility filter: show if no eligibleProfiles set, or user's type is in the list
			const matchesEligibility =
				!service.eligibleProfiles ||
				service.eligibleProfiles.length === 0 ||
				(userType && service.eligibleProfiles.includes(userType));

			return matchesCategory && matchesSearch && matchesEligibility;
		});
	}, [services, searchQuery, selectedCategory, i18n.language, userType]);

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

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title={t("mySpace.screens.services.heading")}
				subtitle={t("mySpace.screens.services.subtitle")}
				icon={<FileText className="h-6 w-6 text-primary" />}
			/>

			{/* Search + Category Tabs */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.05 }}
				className="bg-card border border-border rounded-xl p-4 space-y-4"
			>
				{/* Search Bar */}
				<div className="relative">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
					<input
						type="text"
						placeholder={t("mySpace.screens.services.searchPlaceholder")}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-background outline-none transition-all text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							aria-label="Effacer la recherche"
							className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
						>
							<X className="h-4 w-4 text-muted-foreground" />
						</button>
					)}
				</div>

				{/* Category Tabs */}
				<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
					{SERVICE_CATEGORIES.map((cat) => {
						const Icon = cat.icon;
						const isActive = selectedCategory === cat.id;
						const count =
							cat.id === "ALL"
								? (services?.length ?? 0)
								: (services?.filter((s) => s.category === cat.id).length ?? 0);

						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={cn(
									"flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
									isActive
										? "bg-primary text-primary-foreground shadow-sm"
										: "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-3.5 w-3.5" />
								<span>{t(cat.labelKey)}</span>
								<Badge
									variant="secondary"
									className={cn(
										"ml-1 h-4 min-w-4 flex items-center justify-center text-[10px]",
										isActive
											? "bg-primary-foreground/20 text-primary-foreground"
											: "",
									)}
								>
									{count}
								</Badge>
							</button>
						);
					})}
				</div>
			</motion.div>

			{/* Loading State */}
			{isLoading && (
				<div className="flex flex-col items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
					<p className="text-muted-foreground">{t("common.loading")}</p>
				</div>
			)}

			{/* Results Count */}
			{!isLoading && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{t("services.availableCount", { count: filteredServices.length })}
						{searchQuery && (
							<span className="ml-1">
								{t("mySpace.screens.services.forQuery")} «
								<span className="text-primary font-medium">{searchQuery}</span>»
							</span>
						)}
					</p>
					{(searchQuery || selectedCategory !== "ALL") && (
						<button
							type="button"
							onClick={handleClearSearch}
							className="text-sm text-primary hover:underline flex items-center gap-1"
						>
							<X className="h-4 w-4" /> {t("mySpace.screens.services.reset")}
						</button>
					)}
				</div>
			)}

			{/* Services Grid */}
			{!isLoading && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					{filteredServices.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredServices.map((service) => {
								const { icon: SvcIcon, style } = getCategoryConfig(service.category);
								const serviceName = getLocalizedValue(
									service.name,
									i18n.language,
								);
								const serviceDesc = getLocalizedValue(
									service.description,
									i18n.language,
								);

								const categoryLabel = t(
									`services.categoriesMap.${service.category}`,
								);

								const isAvailableOnline =
									!!availableServiceIds &&
									availableServiceIds.includes(service._id);

								return (
									<ServiceCard
										key={service._id}
										icon={SvcIcon}
										title={serviceName}
										description={serviceDesc}
										color={`${style.bgColor} ${style.color}`}
										badge={categoryLabel}
										price={t("services.free")}
										delay={
											service.estimatedDays
												? `${service.estimatedDays} ${t("services.days", { count: service.estimatedDays })}`
												: undefined
										}
										isAvailableOnline={
											availableServiceIds !== undefined
												? isAvailableOnline
												: undefined
										}
										onClick={() =>
											handleServiceClick(service as CatalogService)
										}
									/>
								);
							})}
						</div>
					) : (
						<div className="text-center py-12 rounded-xl bg-muted/30 border-2 border-dashed">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
								<Search className="h-8 w-8 text-muted-foreground/50" />
							</div>
							<h3 className="text-lg font-semibold mb-2">
								{t("mySpace.screens.services.noResults")}
							</h3>
							<p className="text-muted-foreground mb-4">
								{t("mySpace.screens.services.noResultsDesc")}
							</p>
							<Button onClick={handleClearSearch}>
								{t("mySpace.screens.services.viewAll")}
							</Button>
						</div>
					)}
				</motion.div>
			)}

			{/* Service Detail Sheet */}
			<ServiceDetailSheet
				service={selectedService}
				open={!!selectedService}
				onOpenChange={(open) => !open && setSelectedService(null)}
				onCreateRequest={handleCreateRequest}
				isEligible={
					!selectedService?.eligibleProfiles ||
					selectedService.eligibleProfiles.length === 0 ||
					(!!userType && selectedService.eligibleProfiles.includes(userType))
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

// ServiceDetailSheet importe depuis @/components/my-space/service-detail-sheet
