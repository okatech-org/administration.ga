"use client";

import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	ChevronRight,
	Clock,
	Inbox,
	LifeBuoy,
	Loader2,
	MessageSquare,
	Search,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { PageHeader } from "@/components/design-system/page-header";
import { TabSwitcher } from "@/components/design-system/tab-switcher";
import type { TabItem } from "@/components/design-system/tab-switcher";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Status configuration ────────────────────────────────────────────
const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; bgClass: string; textClass: string }
> = {
	open: {
		label: "Ouvert",
		color: "blue",
		bgClass: "bg-blue-100 dark:bg-blue-900/40",
		textClass: "text-blue-700 dark:text-blue-300",
	},
	in_progress: {
		label: "En cours",
		color: "amber",
		bgClass: "bg-amber-100 dark:bg-amber-900/40",
		textClass: "text-amber-700 dark:text-amber-300",
	},
	waiting_for_user: {
		label: "En attente client",
		color: "purple",
		bgClass: "bg-purple-100 dark:bg-purple-900/40",
		textClass: "text-purple-700 dark:text-purple-300",
	},
	resolved: {
		label: "Résolu",
		color: "emerald",
		bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
	},
	closed: {
		label: "Fermé",
		color: "gray",
		bgClass: "bg-gray-100 dark:bg-gray-800",
		textClass: "text-gray-600 dark:text-gray-400",
	},
};

const STATUS_TABS = [
	{ key: "all", label: "Tous" },
	{ key: "open", label: "Ouverts" },
	{ key: "in_progress", label: "En cours" },
	{ key: "waiting_for_user", label: "En attente" },
	{ key: "resolved", label: "Résolus" },
	{ key: "closed", label: "Fermés" },
];

function getStatusConfig(status: string) {
	return (
		STATUS_CONFIG[status] ?? {
			label: status,
			color: "gray",
			bgClass: "bg-gray-100 dark:bg-gray-800",
			textClass: "text-gray-600 dark:text-gray-400",
		}
	);
}

function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "À l'instant";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `il y a ${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `il y a ${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `il y a ${days}j`;
	if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
	return new Date(timestamp).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
	});
}

function getInitials(firstName?: string, lastName?: string): string {
	const f = firstName?.[0]?.toUpperCase() ?? "";
	const l = lastName?.[0]?.toUpperCase() ?? "";
	return f + l || "?";
}

export default function SuperadminTickets() {
	const router = useRouter();
	const { t, i18n } = useTranslation();
	const dateLocale = i18n.language === "en" ? enUS : fr;

	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const {
		results: tickets,
		status: paginationStatus,
		loadMore,
		isLoading,
	} = useAuthenticatedPaginatedQuery(
		api.functions.tickets.listAll,
		{
			status: statusFilter !== "all" ? (statusFilter as any) : undefined,
		},
		{ initialNumItems: 50 },
	);

	const filteredTickets = useMemo(
		() =>
			tickets?.filter((ticket: any) => {
				if (searchQuery === "") return true;
				const q = searchQuery.toLowerCase();
				return (
					ticket.reference?.toLowerCase().includes(q) ||
					ticket.subject?.toLowerCase().includes(q)
				);
			}),
		[tickets, searchQuery],
	);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const ticket of tickets ?? []) {
			counts[(ticket as any).status] =
				(counts[(ticket as any).status] || 0) + 1;
		}
		return counts;
	}, [tickets]);

	const totalCount = tickets?.length ?? 0;

	const tabItems: TabItem[] = STATUS_TABS.map((tab) => ({
		key: tab.key,
		label: tab.label,
		count: tab.key === "all" ? totalCount : (statusCounts[tab.key] ?? 0),
	}));

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
			{/* ── Header ──────────────────── */}
			<PageHeader
				icon={<LifeBuoy className="h-5 w-5" />}
				title="Support & Tickets"
				subtitle="Gestion globale des tickets d'assistance"
				actions={
					totalCount > 0 ? (
						<Badge variant="outline" className="text-sm px-3 py-1 font-medium">
							{totalCount} ticket{totalCount > 1 ? "s" : ""}
						</Badge>
					) : undefined
				}
			/>

			{/* ── Search + Tabs ───────────── */}
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Rechercher par référence ou sujet..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 h-11 text-sm border-border max-w-md"
						/>
					</div>
				</div>

				<TabSwitcher
					tabs={tabItems}
					activeTab={statusFilter}
					onTabChange={setStatusFilter}
				/>
			</div>

			{/* ── Table ───────────────────── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader icon={<MessageSquare className="h-3.5 w-3.5" />} title="Tickets" />
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="font-semibold">Référence</TableHead>
								<TableHead className="font-semibold">Sujet</TableHead>
								<TableHead className="font-semibold">Catégorie</TableHead>
								<TableHead className="font-semibold">Créé le</TableHead>
								<TableHead className="font-semibold">Statut</TableHead>
								<TableHead className="text-right font-semibold">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (filteredTickets?.length ?? 0) === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-32 text-center">
										<div className="flex flex-col items-center gap-2">
											<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
											<span className="text-sm text-muted-foreground">
												Chargement des tickets...
											</span>
										</div>
									</TableCell>
								</TableRow>
							) : filteredTickets?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-32 text-center">
										<div className="flex flex-col items-center gap-3 py-8">
											<div className="rounded-full bg-muted/60 p-3">
												<Inbox className="h-6 w-6 text-muted-foreground" />
											</div>
											<div>
												<p className="font-medium text-foreground/80">
													Aucun ticket trouvé
												</p>
												<p className="text-xs text-muted-foreground mt-1">
													Essayez de modifier vos filtres
												</p>
											</div>
										</div>
									</TableCell>
								</TableRow>
							) : (
								filteredTickets?.map((ticket: any) => {
									const statusConf = getStatusConfig(ticket.status);

									return (
										<TableRow
											key={ticket._id}
											className="cursor-pointer hover:bg-muted/40 transition-colors group"
											onClick={() =>
												router.push(`/support/${ticket._id}`)
											}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="rounded-md bg-primary/10 p-1.5">
														<LifeBuoy className="h-3.5 w-3.5 text-primary" />
													</div>
													<span className="font-mono text-xs font-semibold">
														{ticket.reference}
													</span>
												</div>
											</TableCell>

											<TableCell>
												<div className="flex flex-col max-w-sm">
													<span className="text-sm font-medium truncate">
														{ticket.subject}
													</span>
													{ticket.messages?.length > 0 && (
														<span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
															<MessageSquare className="h-3 w-3" />
															{ticket.messages.length} réponse
															{ticket.messages.length > 1 ? "s" : ""}
														</span>
													)}
												</div>
											</TableCell>

											<TableCell>
												<Badge variant="secondary" className="font-normal">
													{t(`support.ticketCategory.${ticket.category}`)}
												</Badge>
											</TableCell>

											<TableCell>
												<div className="flex items-center gap-1.5 text-muted-foreground">
													<Clock className="h-3.5 w-3.5 shrink-0" />
													<span className="text-xs whitespace-nowrap">
														{timeAgo(ticket._creationTime)}
													</span>
												</div>
											</TableCell>

											<TableCell>
												<span
													className={cn(
														"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
														statusConf.bgClass,
														statusConf.textClass,
													)}
												>
													{statusConf.label}
												</span>
											</TableCell>

											<TableCell className="text-right">
												<Button
													size="sm"
													variant="ghost"
													className="opacity-0 group-hover:opacity-100 transition-opacity"
												>
													Gérer
													<ChevronRight className="h-4 w-4 ml-1" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>

					{paginationStatus === "CanLoadMore" && (
						<div className="flex justify-center py-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() => loadMore(25)}
								className="gap-2"
							>
								Charger plus
							</Button>
						</div>
					)}
					{paginationStatus === "LoadingMore" && (
						<div className="flex justify-center py-4">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					)}
				</div>
			</FlatCard>
		</div>
	);
}
