"use client";

/**
 * Affaires Consulaires — Hub de navigation + Vue d'ensemble intelligente
 *
 * Shared between agent-web (Next.js) and agent-desktop (Electron).
 */

import { useMemo } from "react";
import { api } from "@convex/_generated/api";
import { Link, useRouter } from "@workspace/routing";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type { PageAction, PageEntity } from "../../stores/page-context-store";
import {
	ClipboardList,
	IdCard,
	UserSearch,
	Users,
	CheckCircle2,
	TrendingUp,
	FileText,
	CreditCard,
	Hourglass,
	ChevronRight,
	ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { useOrg } from "../../shell/org-provider";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import { Skeleton } from "@workspace/ui/components/skeleton";


// "Rendez-vous" intentionally excluded — lives in iAgenda
const MODULES = [
	{
		id: "demandes",
		label: "Demandes",
		desc: "Traitement des demandes consulaires",
		icon: ClipboardList,
		href: "/requests",
		taskCode: "requests.view",
		color: "text-primary",
		bg: "bg-primary/10",
		hoverBorder: "hover:border-primary/30",
	},
	{
		id: "profils",
		label: "Profils Citoyens",
		desc: "Accès aux dossiers citoyens",
		icon: UserSearch,
		href: "/affaires-consulaires/profiles",
		taskCode: "profiles.view",
		color: "text-accent-blue",
		bg: "bg-accent-blue/10",
		hoverBorder: "hover:border-accent-blue/30",
	},
	{
		id: "registre",
		label: "Registre Consulaire",
		desc: "Registre d'inscription consulaire",
		icon: IdCard,
		href: "/consular-registry",
		taskCode: "consular_registrations.view",
		color: "text-success",
		bg: "bg-success/10",
		hoverBorder: "hover:border-success/30",
	},
] as const;

export default function AffairesConsulairesPage() {
	const { activeOrgId } = useOrg();
	const router = useRouter();
	const { canDo, isReady } = useCanDoTask(activeOrgId ?? undefined);

	const visibleModules = useMemo(() => {
		if (!isReady) return [];
		return MODULES.filter((m) => canDo(m.taskCode));
	}, [isReady, canDo]);

	// ─── iAsted page context ──────────────────────────────
	const pageEntities = useMemo<PageEntity[]>(
		() =>
			visibleModules.map((m) => ({
				id: m.id,
				type: "consular-module",
				label: m.label,
				data: { href: m.href, desc: m.desc },
			})),
		[visibleModules],
	);
	const pageActions = useMemo<PageAction[]>(
		() => [
			{
				id: "open-module",
				label: "Ouvrir un module consulaire",
				description:
					"Navigue vers un module. params.moduleId ∈ ['demandes','profils','registre']",
			},
		],
		[],
	);
	usePageContext({
		module: "affaires-consulaires",
		title: "Affaires Consulaires",
		summary: `Hub consulaire — ${visibleModules.length} module(s) accessible(s) avec vos permissions.`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: ["getOrgDashboardStats"],
	});
	useRegisterPageAction("open-module", async (params) => {
		const id = params?.moduleId as string | undefined;
		const mod = MODULES.find((m) => m.id === id);
		if (mod) router.push(mod.href);
	});

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6">
			{/* Page title */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18 }}
				className="flex items-center gap-3"
			>
				<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
					<Users className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h1 className="text-xl font-bold">Affaires Consulaires</h1>
					<p className="text-sm text-muted-foreground">Vue d'ensemble et gestion consulaire</p>
				</div>
			</motion.div>

			{/* KPI Overview */}
			{activeOrgId && <ConsularOverview orgId={activeOrgId} canViewRequests={canDo("requests.view")} canViewRegistry={canDo("consular_registrations.view")} />}

			{/* Module navigation cards */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18, delay: 0.15 }}
			>
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modules</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{isReady ? (
						visibleModules.length > 0 ? (
							visibleModules.map((mod, i) => {
								const Icon = mod.icon;
								return (
									<motion.div
										key={mod.id}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.15, delay: 0.18 + i * 0.05 }}
									>
										<Link
											href={mod.href}
											className={`flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 ${mod.hoverBorder}  transition-all cursor-pointer group`}
										>
											<div className={`h-10 w-10 rounded-xl ${mod.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
												<Icon className={`h-5 w-5 ${mod.color}`} />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-sm">{mod.label}</p>
												<p className="text-[12px] text-muted-foreground mt-0.5">{mod.desc}</p>
											</div>
											<ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
										</Link>
									</motion.div>
								);
							})
						) : (
							<div className="col-span-3 text-center py-10 text-sm text-muted-foreground">
								Aucun module accessible avec vos permissions actuelles.
							</div>
						)
					) : (
						[1, 2, 3].map((i) => (
							<div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
						))
					)}
				</div>
			</motion.div>
		</div>
	);
}

// ─── Consular Overview (KPIs + quick stats) ───────────────────────────────────

function ConsularOverview({
	orgId,
	canViewRequests,
	canViewRegistry,
}: {
	orgId: string;
	canViewRequests: boolean;
	canViewRegistry: boolean;
}) {
	// Requests stats — O(log n) via aggregate
	const requestStats = useQuery(
		api.functions.requests.getStatsByOrg,
		canViewRequests ? { orgId: orgId as any } : "skip",
	);

	// Registration stats — O(log n) via aggregate
	const registryStats = useQuery(
		api.functions.consularRegistrations.getStatsByOrg,
		canViewRegistry ? { orgId: orgId as any } : "skip",
	);

	// Profiles count (lightweight)
	const profiles = useQuery(
		api.functions.profiles.searchConsularProfiles,
		{ orgId: orgId as any },
	);

	const isLoadingReq = requestStats === undefined && canViewRequests;
	const isLoadingReg = registryStats === undefined && canViewRegistry;

	// Computed KPIs from requests
	const pending = requestStats
		? (requestStats.statusCounts?.["submitted"] ?? 0) +
		  (requestStats.statusCounts?.["pending"] ?? 0) +
		  (requestStats.statusCounts?.["under_review"] ?? 0)
		: null;
	const inProgress = requestStats
		? (requestStats.statusCounts?.["processing"] ?? 0) +
		  (requestStats.statusCounts?.["in_production"] ?? 0) +
		  (requestStats.statusCounts?.["validated"] ?? 0)
		: null;
	const readyPickup = requestStats?.statusCounts?.["ready_for_pickup"] ?? null;
	const completedTotal = requestStats?.statusCounts?.["completed"] ?? null;

	const kpis = [
		canViewRequests && {
			id: "total_requests",
			label: "Demandes totales",
			value: requestStats?.total,
			icon: FileText,
			color: "text-primary",
			bg: "bg-primary/10",
			href: "/requests",
			loading: isLoadingReq,
			desc: completedTotal != null ? `${completedTotal} traitées` : undefined,
		},
		canViewRequests && {
			id: "pending",
			label: "En attente",
			value: pending,
			icon: Hourglass,
			color: "text-warning",
			bg: "bg-warning/10",
			href: "/requests",
			loading: isLoadingReq,
			alert: pending != null && pending > 0,
			desc: "Soumises / en cours",
		},
		canViewRequests && {
			id: "in_progress",
			label: "En traitement",
			value: inProgress,
			icon: TrendingUp,
			color: "text-accent-purple",
			bg: "bg-accent-purple/10",
			href: "/requests",
			loading: isLoadingReq,
			desc: "Production / validées",
		},
		canViewRequests && {
			id: "ready",
			label: "Prêtes à retirer",
			value: readyPickup,
			icon: CheckCircle2,
			color: "text-success",
			bg: "bg-success/10",
			href: "/requests",
			loading: isLoadingReq,
			alert: readyPickup != null && readyPickup > 0,
			desc: "En attente de retrait",
		},
		{
			id: "profiles",
			label: "Profils citoyens",
			value: profiles?.length,
			icon: Users,
			color: "text-accent-blue",
			bg: "bg-accent-blue/10",
			href: "/affaires-consulaires/profiles",
			loading: profiles === undefined,
			desc: "Rattachés au consulat",
		},
		canViewRegistry && {
			id: "registrations",
			label: "Inscrits au registre",
			value: registryStats?.active,
			icon: CreditCard,
			color: "text-success",
			bg: "bg-success/10",
			href: "/consular-registry",
			loading: isLoadingReg,
			desc: registryStats ? `${registryStats.total} au total` : undefined,
		},
	].filter(Boolean) as Array<{
		id: string;
		label: string;
		value: number | null | undefined;
		icon: any;
		color: string;
		bg: string;
		href: string;
		loading: boolean;
		alert?: boolean;
		desc?: string;
	}>;

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: 0.06 }}
			className="flex flex-col gap-4"
		>
			<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vue d'ensemble</h2>

			{/* KPI Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
				{kpis.map((kpi, i) => {
					const Icon = kpi.icon;
					return (
						<motion.div
							key={kpi.id}
							initial={{ opacity: 0, scale: 0.97 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.15, delay: 0.08 + i * 0.04 }}
						>
							<Link
								href={kpi.href}
								className={`flex flex-col gap-2 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer group ${kpi.alert ? "border-warning/30" : "border-border/50"}`}
							>
								<div className="flex items-center justify-between">
									<div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
										<Icon className={`h-4 w-4 ${kpi.color}`} />
									</div>
									{kpi.alert && (
										<span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
									)}
								</div>
								{kpi.loading ? (
									<Skeleton className="h-6 w-16" />
								) : (
									<p className="text-2xl font-bold tabular-nums">
										{kpi.value != null ? kpi.value : "—"}
									</p>
								)}
								<div>
									<p className="text-xs font-medium leading-tight">{kpi.label}</p>
									{kpi.desc && (
										<p className="text-[11px] text-muted-foreground mt-0.5">{kpi.desc}</p>
									)}
								</div>
							</Link>
						</motion.div>
					);
				})}
			</div>

			{/* Activity split: requests by top statuses */}
			{requestStats && (requestStats.total > 0) && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.35 }}
					className="rounded-xl border border-border/50 bg-card p-4"
				>
					<div className="flex items-center justify-between mb-3">
						<p className="text-sm font-semibold">Répartition des demandes</p>
						<Link href="/requests" className="text-xs text-primary hover:underline flex items-center gap-1">
							Tout voir <ArrowRight className="h-3 w-3" />
						</Link>
					</div>
					<StatusBar statusCounts={requestStats.statusCounts} total={requestStats.total} />
				</motion.div>
			)}
		</motion.div>
	);
}

// ─── Status bar visual ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bar: string; label: string; text: string }> = {
	submitted:        { bar: "bg-primary",        label: "Soumise",    text: "text-primary" },
	pending:          { bar: "bg-warning",        label: "En attente", text: "text-warning" },
	under_review:     { bar: "bg-accent-purple",  label: "En revue",   text: "text-accent-purple" },
	in_production:    { bar: "bg-accent-blue",    label: "Production", text: "text-accent-blue" },
	validated:        { bar: "bg-success",        label: "Validée",    text: "text-success" },
	ready_for_pickup: { bar: "bg-accent-orange",  label: "À retirer",  text: "text-accent-orange" },
	completed:        { bar: "bg-success",        label: "Terminée",   text: "text-success" },
	rejected:         { bar: "bg-destructive",    label: "Rejetée",    text: "text-destructive" },
	cancelled:        { bar: "bg-muted-foreground", label: "Annulée",  text: "text-muted-foreground" },
};

function StatusBar({ statusCounts, total }: { statusCounts: Record<string, number>; total: number }) {
	const entries = Object.entries(statusCounts)
		.filter(([, count]) => count > 0)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 6);

	return (
		<div className="flex flex-col gap-3">
			{/* Proportional bar */}
			<div className="flex h-2 rounded-full overflow-hidden bg-muted gap-0.5">
				{entries.map(([status, count]) => {
					const cfg = STATUS_COLORS[status] ?? { bar: "bg-muted-foreground", label: status, text: "text-muted-foreground" };
					const pct = Math.max(2, (count / total) * 100);
					return (
						<div
							key={status}
							className={`${cfg.bar} transition-all`}
							style={{ width: `${pct}%` }}
							title={`${cfg.label}: ${count}`}
						/>
					);
				})}
			</div>

			{/* Legend */}
			<div className="flex flex-wrap gap-x-4 gap-y-1.5">
				{entries.map(([status, count]) => {
					const cfg = STATUS_COLORS[status] ?? { bar: "bg-muted-foreground", label: status, text: "text-muted-foreground" };
					const pct = Math.round((count / total) * 100);
					return (
						<div key={status} className="flex items-center gap-1.5">
							<span className={`inline-block h-2 w-2 rounded-full ${cfg.bar}`} />
							<span className={`text-[11px] font-medium ${cfg.text}`}>
								{cfg.label}
							</span>
							<span className="text-[11px] text-muted-foreground">
								{count} ({pct}%)
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
