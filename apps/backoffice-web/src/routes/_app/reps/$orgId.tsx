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
	LayoutDashboard,
	Mail,
	MapPin,
	Package,
	Phone,
	Settings2,
	Users,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { CommunicationsTab } from "@/components/admin/communications/CommunicationsTab";
import { RepDashboard } from "@/components/admin/dashboard/RepDashboard";
import { OrgServicesTable } from "@/components/admin/org-services-table";
import { RequestsRegistryTab } from "@/components/admin/requests-registry/RequestsRegistryTab";
import { useCompletionScore } from "@/components/admin/settings/use-completion-score";
import { TeamTab } from "@/components/admin/team/TeamTab";
import { OrgModulesTab } from "@/components/dashboard/org-modules-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { FlagIcon } from "@/components/ui/flag-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
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

// ─── Completion KPI Card ────────────────────────────────────────────────────
// Affiche un score global de complétion du paramétrage. Couleur dynamique selon
// la santé : vert ≥ 80%, ambre ≥ 50%, rose < 50%.
function CompletionKpiCard({ orgId }: { orgId: Id<"orgs"> }) {
	const completion = useCompletionScore(orgId);
	const score = completion.global.score;
	const accent =
		score >= 80
			? "#10b981" // emerald
			: score >= 50
				? "#f59e0b" // amber
				: "#f43f5e"; // rose

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
							Configuration
						</p>
						{completion.isLoading ? (
							<Skeleton className="h-8 w-16 mt-1" />
						) : (
							<p className="text-2xl font-bold tracking-tight mt-0.5">
								{score}%
							</p>
						)}
						{completion.global.criticalMissing.length > 0 && (
							<p
								className="text-[10px] mt-0.5 font-medium"
								style={{ color: accent }}
							>
								{completion.global.criticalMissing.length} section
								{completion.global.criticalMissing.length > 1 ? "s" : ""} à
								compléter
							</p>
						)}
					</div>
					<div
						className="flex h-10 w-10 items-center justify-center rounded-xl"
						style={{ background: `${accent}18` }}
					>
						<Settings2 className="h-5 w-5" style={{ color: accent }} />
					</div>
				</div>
			</div>
		</FlatCard>
	);
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
			<div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
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
				<CompletionKpiCard orgId={orgId as Id<"orgs">} />
			</div>

			{/* ── Tabs ─────────────────────────────────────────────── */}
			<Tabs defaultValue="dashboard" className="space-y-4">
				<div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
					<TabsList className="h-auto justify-start w-max gap-1 bg-[#F4F3ED] dark:bg-[#171616]">
							{/* ━━━━━ ZONE OPÉRATIONNELLE ━━━━━ */}
						<TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
							<LayoutDashboard className="h-4 w-4" />
							Dashboard
						</TabsTrigger>
						<TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
							<Building2 className="h-4 w-4" />
							{t("superadmin.organizations.tabs.overview")}
						</TabsTrigger>
						<TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm">
							<Users className="h-4 w-4" />
							Équipe
							{memberCount > 0 && (
								<Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1 text-[10px]">
									{memberCount}
								</Badge>
							)}
							{positionCount - filledPositions > 0 && (
								<Badge
									variant="default"
									className="ml-0.5 h-5 px-1 text-[10px] bg-amber-500/20 text-amber-700"
									title={`${positionCount - filledPositions} poste(s) vacant(s)`}
								>
									{positionCount - filledPositions} vacant
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="communications" className="gap-1.5 text-xs sm:text-sm">
							<Phone className="h-4 w-4" />
							Communications
						</TabsTrigger>
						<TabsTrigger value="requests-registry" className="gap-1.5 text-xs sm:text-sm">
							<ClipboardList className="h-4 w-4" />
							Demandes & Registre
						</TabsTrigger>

							<div className="mx-1 self-stretch w-px bg-border/40" aria-hidden="true" />
							{/* ━━━━━ ZONE CATALOGUE ━━━━━ */}
						<TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm">
							<FileText className="h-4 w-4" />
							{t("superadmin.organizations.tabs.services")}
							{serviceCount > 0 && (
								<Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1 text-[10px]">
									{serviceCount}
								</Badge>
							)}
						</TabsTrigger>

							<div className="mx-1 self-stretch w-px bg-border/40" aria-hidden="true" />
							{/* ━━━━━ ZONE CONFIGURATION ━━━━━ */}
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
				{/* ─── Tab: Dashboard (Phase B4) ─────────────────── */}
				<TabsContent value="dashboard" className="space-y-4">
					<RepDashboard orgId={orgId as Id<"orgs">} />
				</TabsContent>

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
											`, ${org.address.postalCode}`}
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
												href={`mailto:${org.email}`}
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
												href={`tel:${org.phone}`}
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
								{/* Modules list removed — voir onglet Modules dédié pour la gestion complète. */}
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

				{/* ─── Tab: Équipe (fusion Membres + Postes — Phase B1) ─── */}
				<TabsContent value="team" className="space-y-4">
					<TeamTab orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Services ──────────────────────────────── */}
				<TabsContent value="services">
					<OrgServicesTable orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Requests ──────────────────────────────── */}
				{/* ─── Tab: Demandes & Registre (Phase B3) ───────── */}
				<TabsContent value="requests-registry" className="space-y-4">
					<RequestsRegistryTab orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Modules ───────────────────────────────── */}
				<TabsContent value="modules" className="space-y-4">
					<OrgModulesTab
						orgId={orgId as Id<"orgs">}
						currentModules={(org.modules as string[]) ?? []}
					/>
				</TabsContent>

				{/* ─── Tab: Communications (Phase B2) ────────────── */}
				<TabsContent value="communications" className="space-y-4">
					<CommunicationsTab orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Settings ──────────────────────────────── */}
				<TabsContent value="settings" className="space-y-4">
					{/* CTA vers la page de paramétrage complet */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
								<div>
									<SectionHeader
										icon={<Settings2 className="h-4 w-4" />}
										title={t(
											"superadmin.organizations.tabs.settings",
											"Paramètres",
										)}
									/>
									<p className="text-xs text-muted-foreground">
										{t(
											"superadmin.organizations.settingsDesc",
											"Identité, horaires, juridiction, communication, iAsted…",
										)}
									</p>
								</div>
								<Button size="sm" asChild>
									<Link
										to="/reps/$orgId/edit"
										params={{ orgId }}
									>
										<Edit className="mr-1.5 h-3.5 w-3.5" />
										Configuration complète
									</Link>
								</Button>
							</div>
						</div>
					</FlatCard>

					{/* Résumé organisé des paramètres clés */}
					<div className="grid gap-3 md:grid-cols-2">
						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<Settings2 className="h-4 w-4" />}
									title="Traitement des demandes"
								/>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Assignation des demandes
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.requestAssignment === "auto"
												? "Automatique"
												: "Manuelle"}
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Délai de traitement par défaut
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.defaultProcessingDays ?? "—"} j.
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Limite demandes actives
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.maxActiveRequests ?? "—"}
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Analyse IA activée
										</dt>
										<dd>
											<Badge
												variant={
													org.settings?.aiAnalysisEnabled
														? "default"
														: "secondary"
												}
												className="text-[9px]"
											>
												{org.settings?.aiAnalysisEnabled ? "Activé" : "Désactivé"}
											</Badge>
										</dd>
									</div>
								</dl>
							</div>
						</FlatCard>

						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<Calendar className="h-4 w-4" />}
									title="Rendez-vous & Registre"
								/>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Délai minimum RDV
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.appointmentBuffer ?? "—"} h
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Durée validité registre
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.registrationDurationYears ?? 5} ans
										</dd>
									</div>
								</dl>
							</div>
						</FlatCard>

						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<FileText className="h-4 w-4" />}
									title="iCorrespondance"
								/>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">Activée</dt>
										<dd>
											<Badge
												variant={
													org.settings?.correspondanceConfig?.isEnabled
														? "default"
														: "secondary"
												}
												className="text-[9px]"
											>
												{org.settings?.correspondanceConfig?.isEnabled
													? "Activée"
													: "Désactivée"}
											</Badge>
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Pattern référence
										</dt>
										<dd className="font-mono text-[10px]">
											{org.settings?.correspondanceConfig
												?.defaultReferencePattern ?? "—"}
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Types actifs
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.correspondanceConfig?.typesActifs
												?.length ?? 0}
										</dd>
									</div>
								</dl>
							</div>
						</FlatCard>

						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<IdCard className="h-4 w-4" />}
									title="Carte consulaire & Impression"
								/>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Impression activée
										</dt>
										<dd>
											<Badge
												variant={
													org.settings?.printEnabled ? "default" : "secondary"
												}
												className="text-[9px]"
											>
												{org.settings?.printEnabled ? "Oui" : "Non"}
											</Badge>
										</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-xs text-muted-foreground">
											Design de carte par défaut
										</dt>
										<dd className="text-xs font-medium">
											{org.settings?.defaultCardDesignId
												? "Configuré"
												: "—"}
										</dd>
									</div>
								</dl>
							</div>
						</FlatCard>
					</div>

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
