"use client";

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import {
	AlertTriangle,
	Eye,
	Flag,
	Globe,
	Loader2,
	ShieldAlert,
	StickyNote,
	Target,
	UserSearch,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

interface KpiTileProps {
	label: string;
	value: number;
	icon: React.ElementType;
	tone?: "default" | "warning" | "critical" | "info";
	href?: string;
}

const TONE_CLASSES: Record<NonNullable<KpiTileProps["tone"]>, string> = {
	default: "bg-muted/50 text-muted-foreground",
	info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function KpiTile({ label, value, icon: Icon, tone = "default", href }: KpiTileProps) {
	const content = (
		<FlatCard
			className={cn(
				"p-4 transition-colors",
				href && "hover:bg-muted/40 cursor-pointer",
			)}
		>
			<div className="flex items-center gap-3">
				<div className={cn("rounded-md p-2 shrink-0", TONE_CLASSES[tone])}>
					<Icon className="h-4 w-4" />
				</div>
				<div className="min-w-0">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">
						{label}
					</p>
					<p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
				</div>
			</div>
		</FlatCard>
	);
	return href ? <Link href={href}>{content}</Link> : content;
}

const QUICK_LINKS: Array<{
	href: string;
	label: string;
	desc: string;
	icon: React.ElementType;
}> = [
	{
		href: "/agence/profiles",
		label: "Profils surveillés",
		desc: "Recherche multi-cibles",
		icon: UserSearch,
	},
	{
		href: "/agence/watchlists",
		label: "Listes de surveillance",
		desc: "Dossiers thématiques",
		icon: Eye,
	},
	{
		href: "/agence/notes",
		label: "Notes critiques",
		desc: "Flux des signalements",
		icon: StickyNote,
	},
	{
		href: "/agence/map",
		label: "Cartographie",
		desc: "Répartition mondiale",
		icon: Globe,
	},
];

export default function IntelligenceDashboard() {
	const { activeOrgId } = useOrg();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getDashboardCounts,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
				title="Renseignement diplomatique"
				subtitle="Profils surveillés, notes confidentielles et signalements actifs."
			/>

			{/* KPIs */}
			<motion.div
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18 }}
				className="grid grid-cols-2 md:grid-cols-3 gap-3"
			>
				{isPending || !data ? (
					Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-[72px] rounded-xl" />
					))
				) : (
					<>
						<KpiTile
							label="Cibles surveillées"
							value={data.watchedTargetsCount}
							icon={Target}
						/>
						<KpiTile label="Notes vivantes" value={data.totalNotes} icon={StickyNote} />
						<KpiTile
							label="Critiques"
							value={data.criticalNotes}
							icon={AlertTriangle}
							tone="critical"
							href="/agence/notes"
						/>
						<KpiTile
							label="Élevées"
							value={data.highNotes}
							icon={AlertTriangle}
							tone="warning"
							href="/agence/notes"
						/>
						<KpiTile
							label="Signalements"
							value={data.flaggedNotes}
							icon={Flag}
							tone="info"
						/>
						<KpiTile
							label="Risques"
							value={data.riskNotes}
							icon={AlertTriangle}
							tone="warning"
						/>
					</>
				)}
			</motion.div>

			{/* Quick links */}
			<motion.div
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18, delay: 0.05 }}
			>
				<FlatCard>
					<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
						<div className="rounded-md bg-rose-500/10 p-1.5">
							<ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
						</div>
						<span className="text-base font-bold flex-1">Accès rapides</span>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
						{QUICK_LINKS.map((q) => {
							const Icon = q.icon;
							return (
								<Link
									key={q.href}
									href={q.href}
									className="flex flex-col gap-1.5 p-3 rounded-lg bg-background/60 hover:bg-muted/40 border border-border/30 hover:border-rose-500/30 transition-all"
								>
									<div className="flex items-center gap-2">
										<div className="rounded-md bg-rose-500/10 p-1.5">
											<Icon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
										</div>
										<span className="text-sm font-semibold truncate">
											{q.label}
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground">{q.desc}</p>
								</Link>
							);
						})}
					</div>
				</FlatCard>
			</motion.div>

			{/* Cloisonnement notice */}
			<FlatCard className="p-3 border-l-4 border-l-rose-500/70">
				<p className="text-xs font-medium">Cloisonnement strict</p>
				<p className="text-[11px] text-muted-foreground mt-1">
					Ce module est réservé aux porteurs du preset{" "}
					<code className="text-[10px] bg-muted/50 px-1 py-0.5 rounded">
						intelligence_services
					</code>
					. Les notes attachées ici ne sont pas visibles depuis les autres modules
					(Affaires consulaires, Affaires diplomatiques).
				</p>
			</FlatCard>
		</div>
	);
}
