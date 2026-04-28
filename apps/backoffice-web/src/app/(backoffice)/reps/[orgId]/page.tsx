"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Building2,
	Crown,
	FileStack,
	FileText,
	Info,
	Package,
	Phone,
	Settings2,
	ShieldAlert,
	Users,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTranslation } from "react-i18next";
import { OrgMembersTable } from "@/components/admin/org-members-table";
import { OrgServicesTable } from "@/components/admin/org-services-table";
import { OrgTemplatesTab } from "@/components/admin/OrgTemplatesTab";
import { RepOverviewPanel } from "@/components/admin/rep-overview";
import { OrgSettingsPanel } from "@/components/admin/settings/OrgSettingsPanel";
import { OrgCallsTab } from "@/components/dashboard/org-calls-tab";
import { OrgModulesTab } from "@/components/dashboard/org-modules-tab";
import { OrgPositionsTab } from "@/components/dashboard/org-positions-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

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

// ─── Error Boundary ─────────────────────────────────────────────────────────

class QueryErrorBoundary extends Component<
	{ children: ReactNode; fallback: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode; fallback: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.warn("[QueryErrorBoundary]", error.message, info.componentStack);
	}
	render() {
		if (this.state.hasError) return this.props.fallback;
		return this.props.children;
	}
}

// ─── Main Component ─────────────────────────────────────────────────────────

function PermissionFallback({ message }: { message?: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
			<ShieldAlert className="h-10 w-10 mb-3 opacity-30" />
			<p className="text-sm font-medium">Permissions insuffisantes</p>
			<p className="text-xs mt-1 opacity-60">
				{message || "Vous n'avez pas les droits pour accéder à ces données."}
			</p>
		</div>
	);
}

export default function OrgDetailPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const { orgId } = useParams<{ orgId: string }>();
	const searchParams = useSearchParams();
	const lang = i18n.language === "fr" ? "fr" : "en";

	// Synchronisation onglet actif ↔ query string `?tab=…`. Permet aux
	// dialogs (AssignTemplatesDialog) de rediriger directement vers
	// l'onglet Modèles après une attribution.
	const ALLOWED_TABS = [
		"overview",
		"agents",
		"positions",
		"services",
		"templates",
		"modules",
		"calls",
		"settings",
	] as const;
	type RepTab = (typeof ALLOWED_TABS)[number];
	const urlTab = searchParams.get("tab");
	const activeTab: RepTab = (ALLOWED_TABS.includes(urlTab as RepTab)
		? urlTab
		: "overview") as RepTab;
	function onTabChange(next: string) {
		const params = new URLSearchParams(searchParams.toString());
		if (next === "overview") params.delete("tab");
		else params.set("tab", next);
		const qs = params.toString();
		router.replace(qs ? `?${qs}` : "?", { scroll: false });
	}

	// ── Data ─────────────────────────────────────────────────────
	const {
		data: org,
		isPending: isOrgLoading,
		error: orgError,
	} = useAuthenticatedConvexQuery(api.functions.orgs.getById, {
		orgId: orgId as Id<"orgs">,
	})

	// Counts pour les badges des onglets (RepOverviewPanel gère ses propres queries).
	const { data: members } = useAuthenticatedConvexQuery(
		api.functions.orgs.getMembers,
		{ orgId: orgId as Id<"orgs"> },
	)
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		{ orgId: orgId as Id<"orgs"> },
	)
	const { data: orgServices } = useAuthenticatedConvexQuery(
		api.functions.services.listByOrg,
		{ orgId: orgId as Id<"orgs"> },
	)

	// Consular registry stats (utilisées dans l'onglet Registre).
	const { data: registryStats } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.getStatsByOrg,
		{ orgId: orgId as Id<"orgs"> },
	)

	// ── Derived counts pour les badges d'onglets ────────────────
	const memberCount = members?.length ?? 0;
	const positionCount = orgChart?.totalPositions ?? 0;
	const serviceCount = orgServices?.length ?? 0;

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
					onClick={() => router.push("/reps")}
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
			{/* ── Breadcrumbs accessibles (Phase F3.2) ─────────────── */}
			<nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
				<ol className="flex items-center gap-1.5">
					<li>
						<a
							href="/reps"
							className="hover:text-foreground transition-colors"
						>
							{t("superadmin.nav.allOrganizations", "Toutes les représentations")}
						</a>
					</li>
					<li aria-hidden="true" className="opacity-50">
						/
					</li>
					<li aria-current="page" className="text-foreground font-medium">
						{org.name}
					</li>
				</ol>
			</nav>

			{/* ── Header ───────────────────────────────────────────── */}
			<PageHeader
				icon={<Building2 className="h-5 w-5" />}
				title={
					<span className="inline-flex items-center gap-1.5">
						{org.name}
						<TooltipProvider delayDuration={200}>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
										aria-label="Métadonnées de la représentation"
									>
										<Info className="h-3.5 w-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="bottom" className="text-xs">
									<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
										<dt className="text-muted-foreground">Créé le</dt>
										<dd className="font-medium">
											{new Date(org._creationTime).toLocaleDateString(
												lang === "fr" ? "fr-FR" : "en-US",
												{ day: "numeric", month: "long", year: "numeric" },
											)}
										</dd>
										<dt className="text-muted-foreground">Mis à jour</dt>
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
										<dt className="text-muted-foreground">Slug</dt>
										<dd className="font-mono">{org.slug}</dd>
									</dl>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</span>
				}
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
				onBack={() => router.push("/reps")}
			/>

			{/* ── Tabs ─────────────────────────────────────────────── */}
			{/* Les anciens KPI globaux (Agents/Postes/Services/Inscrits) ont été
			    remplacés par le Hero KPI du RepOverviewPanel (onglet Vue d'ensemble).
			    Les stats au format KpiCard sont conservées dans l'onglet Registre. */}
			<Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
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
						<TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm">
							<FileStack className="h-4 w-4" />
							Modèles
						</TabsTrigger>
						<TabsTrigger value="modules" className="gap-1.5 text-xs sm:text-sm">
							<Package className="h-4 w-4" />
							{t("superadmin.organizations.tabs.modules", "Modules")}
						</TabsTrigger>
						<TabsTrigger value="calls" className="gap-1.5 text-xs sm:text-sm">
							<Phone className="h-4 w-4" />
							{t("superadmin.organizations.tabs.calls", "Appels")}
						</TabsTrigger>
						<TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
							<Settings2 className="h-4 w-4" />
							{t("superadmin.organizations.tabs.settings", "Paramètres")}
						</TabsTrigger>
					</TabsList>
				</div>

				{/* ─── Tab: Overview ──────────────────────────────── */}
				<TabsContent value="overview" className="space-y-4">
					<QueryErrorBoundary fallback={<PermissionFallback />}>
						<RepOverviewPanel orgId={orgId as Id<"orgs">} org={org} />
					</QueryErrorBoundary>
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

				{/* ─── Tab: Modèles de documents (attribution + vignettes A4) ─── */}
				<TabsContent value="templates" className="space-y-4">
					<OrgTemplatesTab orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Modules ───────────────────────────────── */}
				<TabsContent value="modules" className="space-y-4">
					<OrgModulesTab
						orgId={orgId as Id<"orgs">}
						currentModules={(org.modules as string[]) ?? []}
					/>
				</TabsContent>

				{/* ─── Tab: Calls ────────────────────────────────── */}
				<TabsContent value="calls" className="space-y-4">
					<OrgCallsTab orgId={orgId as Id<"orgs">} />
				</TabsContent>

				{/* ─── Tab: Settings ──────────────────────────────── */}
				<TabsContent value="settings" className="space-y-4">
					<OrgSettingsPanel orgId={orgId as Id<"orgs">} />

					{/* Quick info — métadonnées techniques */}
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
