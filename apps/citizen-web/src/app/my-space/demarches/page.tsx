"use client";

/**
 * Mes Demarches — Liste des dossiers du citoyen
 *
 * Affiche tous les dossiers de l'utilisateur connecte avec filtres par statut,
 * indicateurs de delai, et acces rapide a la creation d'une nouvelle demarche.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	AlertTriangle,
	CalendarClock,
	ChevronRight,
	Clock,
	FileText,
	FolderOpen,
	Plus,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { EmptyState } from "@/components/my-space/empty-state";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { TabSwitcher } from "@/components/my-space/tab-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";

// --- Status config ---

type DossierStatus =
	| "brouillon"
	| "en_cours"
	| "en_attente"
	| "suspendu"
	| "valide"
	| "rejete"
	| "clos"
	| "archive";

const statusConfig: Record<
	DossierStatus,
	{ label: string; color: string; bgColor: string }
> = {
	brouillon: {
		label: "Brouillon",
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor: "bg-zinc-500/10 border-zinc-500/20",
	},
	en_cours: {
		label: "En cours",
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-500/10 border-blue-500/20",
	},
	en_attente: {
		label: "En attente",
		color: "text-amber-600 dark:text-amber-400",
		bgColor: "bg-amber-500/10 border-amber-500/20",
	},
	suspendu: {
		label: "Suspendu",
		color: "text-orange-600 dark:text-orange-400",
		bgColor: "bg-orange-500/10 border-orange-500/20",
	},
	valide: {
		label: "Valide",
		color: "text-green-600 dark:text-green-400",
		bgColor: "bg-green-500/10 border-green-500/20",
	},
	rejete: {
		label: "Rejete",
		color: "text-red-600 dark:text-red-400",
		bgColor: "bg-red-500/10 border-red-500/20",
	},
	clos: {
		label: "Clos",
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor: "bg-zinc-500/10 border-zinc-500/20",
	},
	archive: {
		label: "Archive",
		color: "text-violet-600 dark:text-violet-400",
		bgColor: "bg-violet-500/10 border-violet-500/20",
	},
};

// --- Tab filters ---

type TabFilter = "tous" | "en_cours" | "en_attente" | "termines";

const tabs: { key: TabFilter; label: string }[] = [
	{ key: "tous", label: "Tous" },
	{ key: "en_cours", label: "En cours" },
	{ key: "en_attente", label: "En attente" },
	{ key: "termines", label: "Termines" },
];

function matchFilter(status: DossierStatus, filter: TabFilter): boolean {
	if (filter === "tous") return true;
	if (filter === "en_cours")
		return status === "en_cours" || status === "brouillon";
	if (filter === "en_attente")
		return status === "en_attente" || status === "suspendu";
	// termines
	return (
		status === "valide" ||
		status === "rejete" ||
		status === "clos" ||
		status === "archive"
	);
}

// --- Helpers ---

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

// --- Component ---

export default function DemarchesPage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<TabFilter>("tous");

	const { data: dossiers } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.listMyDossiers,
		{},
	);

	const filtered = (dossiers ?? []).filter((d: any) =>
		matchFilter(d.status as DossierStatus, activeTab),
	);

	return (
		<div className="h-full flex flex-col bg-background">
			<div className="p-4 pb-0">
				<PageHeader
					title="Mes Demarches"
					subtitle="Suivi de vos procedures administratives"
					icon={<FolderOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
					iconBgClass="bg-amber-500/10"
					actions={
						<Button
							className="gap-2 rounded-lg"
							onClick={() => router.push("/my-space/demarches/new")}
						>
							<Plus className="w-4 h-4" />
							Nouvelle demarche
						</Button>
					}
				/>
			</div>

			{/* Tab filters */}
			<div className="px-4 pt-4">
				<TabSwitcher
					tabs={tabs.map((tab) => ({
						key: tab.key,
						label: tab.label,
						count: dossiers
							? (dossiers as any[]).filter((d: any) =>
									matchFilter(d.status as DossierStatus, tab.key),
								).length
							: undefined,
					}))}
					activeTab={activeTab}
					onTabChange={(key) => setActiveTab(key as TabFilter)}
					className="w-fit"
				/>
			</div>

			{/* Content */}
			<div className="flex-1 p-4 overflow-y-auto">
				{dossiers === undefined ? (
					/* Loading skeleton */
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<FlatCard
								key={i}
								className="p-4 animate-pulse"
							>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-muted" />
									<div className="flex-1 space-y-2">
										<div className="h-4 w-48 bg-muted rounded" />
										<div className="h-3 w-32 bg-muted rounded" />
									</div>
								</div>
							</FlatCard>
						))}
					</div>
				) : filtered.length === 0 ? (
					<FlatCard>
						<EmptyState
							icon={<FileText />}
							title="Aucune demarche trouvee"
							description={
								activeTab === "tous"
									? "Vous n'avez pas encore de demarche en cours. Commencez par en creer une."
									: "Aucune demarche ne correspond a ce filtre."
							}
							action={
								activeTab === "tous" ? (
									<Button
										variant="outline"
										size="sm"
										className="gap-2 rounded-lg"
										onClick={() => router.push("/my-space/demarches/new")}
									>
										<Plus className="w-4 h-4" />
										Nouvelle demarche
									</Button>
								) : undefined
							}
						/>
					</FlatCard>
				) : (
					/* Dossier list */
					<div className="space-y-3">
						{filtered.map((dossier: any, index: number) => {
							const status = dossier.status as DossierStatus;
							const config = statusConfig[status];
							const deadline = getDeadlineInfo(dossier.dateLimite);

							return (
								<motion.div
									key={dossier._id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: index * 0.05 }}
								>
									<Link
										href={`/my-space/demarches/${dossier._id}`}
									>
										<FlatCard className="p-4 hover:shadow-sm transition-all cursor-pointer group">
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-start gap-3 flex-1 min-w-0">
													<div
														className={cn(
															"p-2 rounded-lg border shrink-0",
															config.bgColor,
														)}
													>
														<FileText
															className={cn("w-4 h-4", config.color)}
														/>
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 mb-1">
															<span className="text-xs font-mono text-muted-foreground">
																{dossier.reference}
															</span>
															<Badge
																variant="outline"
																className={cn(
																	"text-[10px] border px-1.5 py-0",
																	config.bgColor,
																	config.color,
																)}
															>
																{config.label}
															</Badge>
														</div>
														<p className="text-sm font-medium truncate">
															{dossier.typeLabel?.fr ?? "Demarche"}
														</p>
														<p className="text-xs text-muted-foreground mt-0.5">
															Etape :{" "}
															{dossier.etapeLabel?.fr ?? "---"}
														</p>
													</div>
												</div>

												<div className="flex flex-col items-end gap-1 shrink-0">
													<div className="flex items-center gap-1 text-xs text-muted-foreground">
														<CalendarClock className="w-3 h-3" />
														<span>{formatDateFr(dossier.dateDepot)}</span>
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
															<span>{deadline.label}</span>
														</div>
													)}
													<ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
												</div>
											</div>
										</FlatCard>
									</Link>
								</motion.div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
