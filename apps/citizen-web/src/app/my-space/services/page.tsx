"use client";

import { sanitizeHtml } from "@workspace/shared/utils/sanitize";
import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import { useRouter } from "next/navigation";
import {
	BookOpen,
	BookOpenCheck,
	Building2,
	Calendar,
	CheckCircle2,
	Clock,
	FileCheck,
	FileText,
	Globe,
	Loader2,
	type LucideIcon,
	MapPin,
	Search,
	ShieldAlert,
	SlidersHorizontal,
	Users,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ServiceCard } from "@/components/home/ServiceCard";
import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

// Category configuration
const CATEGORIES: {
	id: string;
	icon: LucideIcon;
	labelKey: string;
}[] = [
	{
		id: "ALL",
		icon: SlidersHorizontal,
		labelKey: "services.category.all",
	},
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

// Category colors for badges
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

// Type for service from listCatalog
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

export default function ServicesPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();

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
		router.push(`/my-space/services/${selectedService.slug}/new`);
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
					{CATEGORIES.map((cat) => {
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
										? "bg-primary text-primary-foreground"
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
								const colors =
									CATEGORY_COLORS[service.category] ||
									CATEGORY_COLORS[ServiceCategory.Other];
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
										icon={
											CATEGORIES.find((c) => c.id === service.category)?.icon ||
											FileText
										}
										title={serviceName}
										description={serviceDesc}
										color={`${colors.bgColor} ${colors.color}`}
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

			{/* Service Detail Modal */}
			<ServiceDetailModal
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

// ---------------------------------------------------------------------------
// SERVICE DETAIL MODAL
// ---------------------------------------------------------------------------

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
		CATEGORY_COLORS[service.category] || CATEGORY_COLORS[ServiceCategory.Other];
	const Icon =
		CATEGORIES.find((c) => c.id === service.category)?.icon || FileText;
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
					{/* Service header with icon */}
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
										{t("services.appointmentRequired")}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<DialogDescription className="mt-3 text-sm leading-relaxed">
						{serviceDescription}
					</DialogDescription>
				</DialogHeader>

				{/* Online availability banner */}
				{!isAvailableInJurisdiction && (
					<div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
						<MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-amber-800 dark:text-amber-300">
								{t("services.notAvailableOnlineTitle")}
							</p>
							<p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
								{t("services.notAvailableOnlineDesc")}
							</p>
						</div>
					</div>
				)}

				{isAvailableInJurisdiction && (
					<div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
						<Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
							{t("services.availableOnline")}
						</p>
					</div>
				)}

				{/* Detailed content */}
				{serviceContent && (
					<>
						<Separator />
						<div>
							<h4 className="text-sm font-semibold mb-2">
								{t("services.detailsTitle")}
							</h4>
							<div
								className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: <Needed for rich content>
								dangerouslySetInnerHTML={{ __html: sanitizeHtml(serviceContent) }}
							/>
						</div>
					</>
				)}

				{/* Required Documents */}
				{service.joinedDocuments && service.joinedDocuments.length > 0 && (
					<>
						<Separator />
						<div>
							<h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
								<FileText className="h-4 w-4 text-muted-foreground" />
								{t("services.requiredDocuments")} (
								{service.joinedDocuments.length})
							</h4>
							<ul className="space-y-2">
								{service.joinedDocuments.map((doc, index) => (
									<li
										key={`${doc.type}-${index}`}
										className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg"
									>
										<div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
											{index + 1}
										</div>
										<span className="flex-1 text-sm">
											{getLocalizedValue(doc.label, i18n.language)}
										</span>
										{doc.required && (
											<Badge
												variant="destructive"
												className="text-[10px] shrink-0"
											>
												{t("services.required")}
											</Badge>
										)}
									</li>
								))}
							</ul>
						</div>
					</>
				)}

				{/* Beneficiaries */}
				{service.eligibleProfiles && service.eligibleProfiles.length > 0 && (
					<>
						<Separator />
						<div>
							<h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
								<Users className="h-4 w-4 text-muted-foreground" />
								{t("services.modal.eligibleBeneficiaries")}
							</h4>
							<div className="flex flex-wrap gap-2">
								{service.eligibleProfiles.map((profileType: string) => {
									const colorMap: Record<string, string> = {
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
											{t(`services.modal.profileTypes.${profileType}`)}
										</Badge>
									);
								})}
							</div>
						</div>
					</>
				)}

				{/* Important Info */}
				<div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
					<p className="font-medium text-foreground mb-1.5 text-sm">
						{t("services.modal.importantInfo")}
					</p>
					<ul className="list-disc list-inside space-y-0.5">
						<li>{t("services.modal.infoPoints.docs")}</li>
						<li>{t("services.modal.infoPoints.delay")}</li>
						<li>{t("services.modal.infoPoints.identity")}</li>
					</ul>
				</div>

				{/* Actions */}
				<DialogFooter className="sm:justify-between">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="sm:order-1"
					>
						{t("common.close")}
					</Button>
					{!isAvailableInJurisdiction ? (
						<div className="flex items-center gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm sm:order-2">
							<ShieldAlert className="h-4 w-4 shrink-0" />
							<span>{t("services.notAvailableInJurisdiction")}</span>
						</div>
					) : !isEligible ? (
						<div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm sm:order-2">
							<ShieldAlert className="h-4 w-4 shrink-0" />
							<span>{t("services.notEligible")}</span>
						</div>
					) : (
						<Button onClick={onCreateRequest} className="gap-2 sm:order-2">
							<FileText className="h-4 w-4" />
							{t("services.modal.createRequest")}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
