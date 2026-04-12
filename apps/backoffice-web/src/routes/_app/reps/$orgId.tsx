"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { CountryCode } from "@convex/lib/constants";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Building2,
	Calendar,
	ClipboardList,
	Crown,
	Edit,
	ExternalLink,
	FileText,
	Globe,
	IdCard,
	Mail,
	MapPin,
	Package,
	Phone,
	Settings2,
	Users,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { OrgMembersTable } from "@/components/admin/org-members-table";
import { OrgServicesTable } from "@/components/admin/org-services-table";
import { OrgModulesTab } from "@/components/dashboard/org-modules-tab";
import { OrgPositionsTab } from "@/components/dashboard/org-positions-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { FlagIcon } from "@/components/ui/flag-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reps/$orgId")({
	component: OrgDetailPage,
});

// ─── Org Type Config ────────────────────────────────────────────────────────
const ORG_TYPE_STYLE: Record<string, { color: string; bg: string }> = {
	embassy: { color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
	general_consulate: { color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30" },
	consulate: { color: "text-sky-700", bg: "bg-sky-100 dark:bg-sky-900/30" },
	high_commission: { color: "text-purple-700", bg: "bg-purple-100 dark:bg-purple-900/30" },
	permanent_mission: { color: "text-indigo-700", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
	honorary_consulate: { color: "text-gray-700", bg: "bg-gray-100 dark:bg-gray-900/30" },
};

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({
	icon: Icon,
	label,
	value,
	accent,
	loading,
}: {
	icon: React.ElementType;
	label: string;
	value: number | string;
	accent: string;
	loading?: boolean;
}) {
	return (
		<FlatCard className="relative overflow-hidden">
			<div
				className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
				style={{ background: accent }}
			/>
			<div className="p-4 pl-5">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{label}
						</p>
						{loading ? (
							<Skeleton className="h-8 w-16 mt-1" />
						) : (
							<p className="text-2xl font-bold tracking-tight mt-0.5">
								{value}
							</p>
						)}
					</div>
					<div
						className="flex h-10 w-10 items-center justify-center rounded-xl"
						style={{ background: `${accent}18` }}
					>
						<Icon className="h-5 w-5" style={{ color: accent }} />
					</div>
				</div>
			</div>
		</FlatCard>
	)
}

// ─── Main Component ─────────────────────────────────────────────────────────

function OrgDetailPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { orgId } = Route.useParams();
	const lang = i18n.language === "fr" ? "fr" : "en";

	// ── Data ─────────────────────────────────────────────────────
	const {
		data: org,
		isPending: isOrgLoading,
		error: orgError,
	} = useAuthenticatedConvexQuery(api.functions.orgs.getById, {
		orgId: orgId as Id<"orgs">,
	})

	const { data: members, isPending: isMembersLoading } =
		useAuthenticatedConvexQuery(api.functions.orgs.getMembers, {
			orgId: orgId as Id<"orgs">,
		})

	const { data: orgChart, isPending: isOrgChartLoading } =
		useAuthenticatedConvexQuery(api.functions.orgs.getOrgChart, {
			orgId: orgId as Id<"orgs">,
		})

	const { data: orgServices } = useAuthenticatedConvexQuery(
		api.functions.services.listByOrg,
		{ orgId: orgId as Id<"orgs"> },
	)

	// Requests for this org (paginated)
	const { results: requests, isLoading: isRequestsLoading } =
		useAuthenticatedPaginatedQuery(
			api.functions.requests.listByOrg,
			{ orgId: orgId as Id<"orgs"> },
			{ initialNumItems: 10 },
		)

	// Consular registry stats
	const { data: registryStats } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.getStatsByOrg,
		{ orgId: orgId as Id<"orgs"> },
	)

	// ── Derived counts ──────────────────────────────────────────
	const memberCount = members?.length ?? 0;
	const positionCount = orgChart?.totalPositions ?? 0;
	const filledPositions = orgChart?.filledPositions ?? 0;
	const serviceCount = orgServices?.length ?? 0;
	const activeServiceCount =
		orgServices?.filter((s: any) => s.isActive).length ?? 0;

	const registryTotal = registryStats?.total ?? 0;

	// ── Loading ─────────────────────────────────────────────────
	if (isOrgLoading) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
				<div className="flex items-center gap-4">
					<Skeleton className="h-9 w-24" />
				</div>
				<div className="flex items-center gap-4">
					<Skeleton className="h-16 w-16 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-5 w-48" />
					</div>
				</div>
				<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
			</div>
		)
	}

	if (orgError || !org) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-3 md:p-4">
				<Building2 className="h-12 w-12 text-muted-foreground/30" />
				<p className="text-muted-foreground">
					{t("superadmin.common.error")}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => navigate({ to: "/reps" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
			</div>
		)
	}

	const typeStyle = ORG_TYPE_STYLE[org.type] ?? {
		color: "text-gray-700",
		bg: "bg-gray-100",
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
			{/* ── Header ───────────────────────────────────────────── */}
			<PageHeader
				icon={<Building2 className="h-5 w-5" />}
				title={org.name}
				subtitle={
					<div className="flex flex-wrap items-center gap-2 mt-0.5">
						<Badge
							className={cn(
								"text-xs font-medium",
								typeStyle.bg,
								typeStyle.color,
							)}
						>
							{t(`superadmin.types.${org.type}`, org.type)}
						</Badge>
						<Badge
							variant={org.isActive ? "default" : "outline"}
							className={
								org.isActive
									? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15"
									: "text-muted-foreground"
							}
						>
							{org.isActive
								? t("superadmin.common.active")
								: t("superadmin.common.inactive")}
						</Badge>
						{org.country && (
							<span className="text-sm text-muted-foreground">
								{t(`superadmin.countryCodes.${org.country}`, org.country)}
							</span>
						)}
						<code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
							{org.slug}
						</code>
					</div>
				}
				showBackButton
				onBack={() => navigate({ to: "/reps" })}
				actions={
					<div className="flex items-center gap-2 shrink-0">
						<Button variant="outline" size="sm" asChild>
							<a href={`/reps/${org.slug}`} target="_blank" rel="noopener noreferrer">
								<ExternalLink className="mr-1.5 h-3.5 w-3.5" />
								{t("superadmin.organizations.viewPublic", "Page publique")}
							</a>
						</Button>
						<Button size="sm" asChild>
							<Link
								to="/reps/$orgId/edit"
								params={{ orgId }}
							>
								<Edit className="mr-1.5 h-3.5 w-3.5" />
								{t("superadmin.common.edit")}
							</Link>
						</Button>
					</div>
				}
			/>

			{/* ── KPI Cards ────────────────────────────────────────── */}
			<div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
				<KpiCard
					icon={Users}
					label={t("superadmin.organizations.kpi.agents", "Agents")}
					value={memberCount}
					accent="#6366f1"
					loading={isMembersLoading}
				/>
				<KpiCard
					icon={Crown}
					label={t("superadmin.organizations.kpi.positions", "Postes")}
					value={`${filledPositions}/${positionCount}`}
					accent="#f59e0b"
					loading={isOrgChartLoading}
				/>
				<KpiCard
					icon={FileText}
					label={t("superadmin.organizations.kpi.services", "Services")}
					value={`${activeServiceCount}/${serviceCount}`}
					accent="#3b82f6"
				/>
				<KpiCard
					icon={IdCard}
					label={t(
						"superadmin.organizations.kpi.registry",
						"Inscrits",
					)}
					value={registryTotal}
					accent="#10b981"
				/>
			</div>

			{/* ── Tabs ─────────────────────────────────────────────── */}
			<Tabs defaultValue="overview" className="space-y-4">
				<div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
					<TabsList className="h-auto justify-start w-max gap-1">
						<TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
							<Building2 className="h-4 w-4" />
							{t("superadmin.organizations.tabs.overview")}
						</TabsTrigger>
						<TabsTrigger value="agents" className="gap-1.5 text-xs sm:text-sm">
							<Users className="h-4 w-4" />
							{t("superadmin.organizations.tabs.members")}
							{memberCount > 0 && (
								<Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1 text-[10px]">
									{memberCount}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="positions" className="gap-1.5 text-xs sm:text-sm">
							<Crown className="h-4 w-4" />
							{t("superadmin.organizations.tabs.positions", "Postes")}
							{positionCount > 0 && (
								<Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1 text-[10px]">
									{positionCount}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm">
							<FileText className="h-4 w-4" />
							{t("superadmin.organizations.tabs.services")}
							{serviceCount > 0 && (
								<Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1 text-[10px]">
									{serviceCount}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
							<ClipboardList className="h-4 w-4" />
							{t("superadmin.organizations.tabs.requests", "Demandes")}
						</TabsTrigger>
						<TabsTrigger value="registry" className="gap-1.5 text-xs sm:text-sm">
							<IdCard className="h-4 w-4" />
							{t("superadmin.organizations.tabs.registry", "Registre")}
						</TabsTrigger>
						<TabsTrigger value="modules" className="gap-1.5 text-xs sm:text-sm">
							<Package className="h-4 w-4" />
							{t("superadmin.organizations.tabs.modules", "Modules")}
						</TabsTrigger>
						<TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
							<Settings2 className="h-4 w-4" />
							{t("superadmin.organizations.tabs.settings", "Paramètres")}
						</TabsTrigger>
					</TabsList>
				</div>

				{/* ─── Tab: Overview ──────────────────────────────── */}
				<TabsContent value="overview" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Address */}
						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<MapPin className="h-4 w-4" />}
									title={t("superadmin.organizations.form.address")}
								/>
								<div className="space-y-1 text-sm">
									<p>{org.address?.street}</p>
									<p>
										{org.address?.city}
										{org.address?.postalCode &&
											", ${org.address.postalCode}"}
									</p>
									<p className="font-medium">
										{org.address?.country &&
											t(
												`superadmin.countryCodes.${org.address.country}`,
												org.address.country,
											)}
									</p>
								</div>
							</div>
						</FlatCard>

						{/* Contact */}
						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<Mail className="h-4 w-4" />}
									title={t("superadmin.organizations.form.contact")}
								/>
								<div className="space-y-2.5 text-sm">
									{org.email && (
										<div className="flex items-center gap-2">
											<Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<a
												href={"mailto:${org.email}"}
												className="text-primary hover:underline truncate"
											>
												{org.email}
											</a>
										</div>
									)}
									{org.phone && (
										<div className="flex items-center gap-2">
											<Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<a
												href={"tel:${org.phone}"}
												className="text-primary hover:underline"
											>
												{org.phone}
											</a>
										</div>
									)}
									{org.website && (
										<div className="flex items-center gap-2">
											<Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<a
												href={org.website}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline truncate"
											>
												{org.website}
											</a>
										</div>
									)}
									{!org.email && !org.phone && !org.website && (
										<p className="text-muted-foreground italic">
											{t("superadmin.common.noData")}
										</p>
									)}
								</div>
							</div>
						</FlatCard>
					</div>

					{/* Details */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Building2 className="h-4 w-4" />}
								title={t("superadmin.organizations.details")}
							/>
							<p className="text-xs text-muted-foreground mb-3">
								{t("superadmin.organizations.detailsDesc")}
							</p>
							<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										{t("superadmin.organizations.form.timezone")}
									</dt>
									<dd className="mt-0.5 text-sm font-medium">
										{org.timezone || "—"}
									</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										{t("superadmin.organizations.form.country", "Pays")}
									</dt>
									<dd className="mt-0.5 text-sm font-medium">
										{org.country
											? t(
													`superadmin.countryCodes.${org.country}`,
													org.country,
												)
											: "—"}
									</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										{t("superadmin.table.createdAt")}
									</dt>
									<dd className="mt-0.5 text-sm font-medium">
										{new Date(org._creationTime).toLocaleDateString(
											lang === "fr" ? "fr-FR" : "en-US",
										)}
									</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										{t("superadmin.organizations.form.modules", "Modules")}
									</dt>
									<dd className="mt-0.5 flex flex-wrap gap-1">
										{(org.modules as string[] | undefined)?.length ? (
											(org.modules as string[]).map((mod) => (
												<Badge
													key={mod}
													variant="secondary"
													className="text-[10px] px-1.5"
												>
													{mod}
												</Badge>
											))
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</dd>
								</div>
							</dl>
						</div>
					</FlatCard>

					{/* Jurisdiction Countries */}
					{(org.jurisdictionCountries as string[] | undefined)?.length ? (
						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<Globe className="h-4 w-4" />}
									title={t(
										"superadmin.organizations.form.jurisdictionCountries",
										"Pays de juridiction",
									)}
								/>
								<div className="flex flex-wrap gap-2">
									{(org.jurisdictionCountries as string[]).map((code) => (
										<div
											key={code}
											className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-sm"
										>
											<FlagIcon
												countryCode={code as CountryCode}
												size={16}
												className="w-4 !h-auto rounded-sm"
											/>
											{t(`superadmin.countryCodes.${code}`, code)}
										</div>
									))}
								</div>
							</div>
						</FlatCard>
					) : null}
				</TabsContent>

				{/* ─── Tab: Agents ────────────────────────────────── */}
				<TabsContent value="agents">
					<OrgMembersTable orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Positions & Roles ─────────────────────── */}
				<TabsContent value="positions" className="space-y-4">
					<OrgPositionsTab orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Services ──────────────────────────────── */}
				<TabsContent value="services">
					<OrgServicesTable orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Requests ──────────────────────────────── */}
				<TabsContent value="requests" className="space-y-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<ClipboardList className="h-4 w-4" />}
								title={t("superadmin.organizations.tabs.requests", "Demandes")}
							/>
							<p className="text-xs text-muted-foreground mb-3">
								{t(
									"superadmin.organizations.requestsDesc",
									"Dernières demandes de services pour cet organisme",
								)}
							</p>
							{isRequestsLoading && requests.length === 0 ? (
								<div className="space-y-2">
									{[1, 2, 3].map((i) => (
										<Skeleton key={i} className="h-12 w-full" />
									))}
								</div>
							) : requests.length > 0 ? (
								<div className="space-y-2">
									{requests.slice(0, 20).map((req: any) => (
										<div
											key={req._id}
											role="button"
											tabIndex={0}
											className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
											onClick={() =>
												navigate({
													to: "/requests/$requestId",
													params: { requestId: req._id },
												})
											}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault()
													navigate({
														to: "/requests/$requestId",
														params: { requestId: req._id },
													})
												}
											}}
										>
											<div className="flex items-center gap-3 min-w-0">
												<div className="rounded-md bg-primary/10 p-1.5 shrink-0">
													<FileText className="h-3.5 w-3.5 text-primary" />
												</div>
												<div className="min-w-0">
													<p className="text-sm font-medium font-mono truncate">
														{req.reference || req._id.slice(-8)}
													</p>
													<p className="text-xs text-muted-foreground truncate">
														{req.user
															? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim()
															: "—"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<Badge
													variant="secondary"
													className="text-[10px] px-1.5"
												>
													{String(t(
														`fields.requestStatus.options.${req.status}`,
														req.status,
													))}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{new Date(req._creationTime).toLocaleDateString(
														lang === "fr" ? "fr-FR" : "en-US",
														{ day: "numeric", month: "short" },
													)}
												</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
									<ClipboardList className="h-10 w-10 mb-3 opacity-30" />
									<p className="text-sm">
										{t(
											"superadmin.organizations.requestsEmpty",
											"Aucune demande pour cet organisme",
										)}
									</p>
								</div>
							)}
						</div>
					</FlatCard>
				</TabsContent>

				{/* ─── Tab: Registry ──────────────────────────────── */}
				<TabsContent value="registry" className="space-y-4">
					<div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
						<KpiCard
							icon={Users}
							label={t("dashboard.consularRegistry.stats.total", "Total")}
							value={registryStats?.total ?? "—"}
							accent="#6366f1"
						/>
						<KpiCard
							icon={Calendar}
							label={t(
								"dashboard.consularRegistry.stats.requested",
								"Demandés",
							)}
							value={registryStats?.requested ?? "—"}
							accent="#f59e0b"
						/>
						<KpiCard
							icon={IdCard}
							label={t(
								"dashboard.consularRegistry.stats.active",
								"Actifs",
							)}
							value={registryStats?.active ?? "—"}
							accent="#10b981"
						/>
						<KpiCard
							icon={FileText}
							label={t(
								"dashboard.consularRegistry.stats.expired",
								"Expirés",
							)}
							value={registryStats?.expired ?? "—"}
							accent="#ef4444"
						/>
					</div>

					<FlatCard>
						<div className="flex flex-col items-center justify-center py-8 text-muted-foreground p-3 lg:p-4">
							<IdCard className="h-10 w-10 mb-3 opacity-30" />
							<p className="text-sm">
								{t(
									"superadmin.organizations.registryInfo",
									"Vue détaillée du registre consulaire disponible dans la page de gestion de l'organisme.",
								)}
							</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								asChild
							>
								<Link to="/admin/consular-registry">
									{t("superadmin.organizations.openRegistry", "Ouvrir le registre")}
								</Link>
							</Button>
						</div>
					</FlatCard>
				</TabsContent>

				{/* ─── Tab: Modules ───────────────────────────────── */}
				<TabsContent value="modules" className="space-y-4">
					<OrgModulesTab
						orgId={orgId as Id<"orgs">}
						currentModules={(org.modules as string[]) ?? []}
					/>
				</TabsContent>

				{/* ─── Tab: Settings ──────────────────────────────── */}
				<TabsContent value="settings" className="space-y-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Settings2 className="h-4 w-4" />}
								title={t(
									"superadmin.organizations.tabs.settings",
									"Paramètres",
								)}
							/>
							<p className="text-xs text-muted-foreground mb-3">
								{t(
									"superadmin.organizations.settingsDesc",
									"Configuration et paramètres de l'organisme",
								)}
							</p>
							{org.settings ? (
								<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{Object.entries(
										org.settings as Record<string, unknown>,
									).map(([key, value]) => (
										<div key={key}>
											<dt className="text-xs font-medium text-muted-foreground">
												{key}
											</dt>
											<dd className="mt-0.5 text-sm">
												{typeof value === "boolean" ? (
													<Badge
														variant={value ? "default" : "secondary"}
														className="text-[10px]"
													>
														{value ? "Activé" : "Désactivé"}
													</Badge>
												) : typeof value === "object" ? (
													<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
														{JSON.stringify(value, null, 2).slice(0, 100)}
													</code>
												) : (
													String(value)
												)}
											</dd>
										</div>
									))}
								</dl>
							) : (
								<p className="text-sm text-muted-foreground italic">
									{t("superadmin.common.noData")}
								</p>
							)}
						</div>
					</FlatCard>

					{/* Quick info */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
								<div>
									<dt className="text-xs text-muted-foreground">
										{t("superadmin.table.createdAt")}
									</dt>
									<dd className="font-medium">
										{new Date(org._creationTime).toLocaleDateString(
											lang === "fr" ? "fr-FR" : "en-US",
											{ day: "numeric", month: "long", year: "numeric" },
										)}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-muted-foreground">
										{t("superadmin.table.updatedAt")}
									</dt>
									<dd className="font-medium">
										{org.updatedAt
											? new Date(org.updatedAt).toLocaleDateString(
													lang === "fr" ? "fr-FR" : "en-US",
													{
														day: "numeric",
														month: "long",
														year: "numeric",
													},
												)
											: "—"}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-muted-foreground">ID</dt>
									<dd className="font-mono text-xs truncate">
										{org._id}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-muted-foreground">Slug</dt>
									<dd className="font-mono text-xs">{org.slug}</dd>
								</div>
							</dl>
						</div>
					</FlatCard>
				</TabsContent>
			</Tabs>
		</div>
	)
}
