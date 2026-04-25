"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CalendarClock, Eye, Printer, Users } from "lucide-react";
import { Link } from "@workspace/routing";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { QueryError } from "@workspace/ui/components/query-error";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { FlatCard } from "../../../components/my-space/flat-card";
import { getLocalizedValue } from "../../../lib/i18n-utils";

type Props = {
	orgId: Id<"orgs">;
};

export function TeamSupervisionPanel({ orgId }: Props) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const [search, setSearch] = useState("");

	const { data, isPending, error } = useAuthenticatedConvexQuery(
		api.functions.management.listSupervisableMembers,
		{ orgId },
	);

	const filtered = useMemo(() => {
		if (!data?.members) return [];
		const q = search.trim().toLowerCase();
		if (!q) return data.members;
		return data.members.filter((m) => {
			return (
				m.name.toLowerCase().includes(q) ||
				m.email?.toLowerCase().includes(q) ||
				getLocalizedValue(m.positionTitle, lang)?.toLowerCase().includes(q)
			);
		});
	}, [data, search, lang]);

	const aggregateUpcoming = useMemo(
		() => (data?.members ?? []).reduce((sum, m) => sum + m.upcomingAppointmentsCount, 0),
		[data],
	);
	const aggregateAssigned = useMemo(
		() => (data?.members ?? []).reduce((sum, m) => sum + m.assigned, 0),
		[data],
	);

	if (isPending) {
		return (
			<div className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</div>
				<Skeleton className="h-[300px]" />
			</div>
		);
	}

	if (error) return <QueryError error={error} />;
	if (!data) return null;

	return (
		<div className="space-y-6">
			{/* KPI agrégés */}
			<div className="grid gap-3 sm:grid-cols-3">
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
							<Users className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-2xl font-bold">{data.members.length}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.totalMembers", "Membres supervisés")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
							<CalendarClock className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{aggregateUpcoming}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.upcomingAppointments", "RDV à venir")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
							<Users className="h-5 w-5 text-emerald-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{aggregateAssigned}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("admin.team.supervision.totalAssigned", "Demandes assignées")}
							</p>
						</div>
					</div>
				</FlatCard>
			</div>

			{/* Filtre */}
			<div className="flex items-center justify-between gap-3">
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder={t(
						"admin.team.supervision.searchPlaceholder",
						"Rechercher un membre, un poste, un email…",
					)}
					className="max-w-md"
				/>
				{data.scope === "all" && (
					<Badge variant="outline" className="text-xs">
						{t("admin.team.supervision.scopeAll", "Toute l'organisation")}
					</Badge>
				)}
			</div>

			{/* Grille de cards */}
			{filtered.length === 0 ? (
				<FlatCard>
					<div className="p-8 text-center text-muted-foreground text-sm">
						{t(
							"admin.team.supervision.empty",
							"Aucun membre dans votre périmètre de supervision.",
						)}
					</div>
				</FlatCard>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filtered.map((m) => {
						const initials = m.name
							.split(" ")
							.map((s) => s[0])
							.filter(Boolean)
							.slice(0, 2)
							.join("")
							.toUpperCase();
						const positionLabel = getLocalizedValue(m.positionTitle, lang);
						const groupLabel = getLocalizedValue(m.ministryGroupLabel, lang);

						return (
							<FlatCard key={m.membershipId}>
								<div className="flex flex-col h-full p-4 gap-4">
									<div className="flex items-start gap-3">
										<Avatar className="h-12 w-12 shrink-0">
											{m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
											<AvatarFallback>{initials || "?"}</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<p className="font-semibold truncate">{m.name}</p>
											<p className="text-xs text-muted-foreground truncate">
												{positionLabel ?? "—"}
											</p>
											{groupLabel && (
												<Badge variant="outline" className="mt-1 text-[10px] font-normal">
													{groupLabel}
												</Badge>
											)}
										</div>
									</div>

									<div className="grid grid-cols-2 gap-2 text-xs">
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="text-base font-bold tabular-nums leading-none">
												{m.assigned}
											</p>
											<p className="text-[10px] uppercase text-muted-foreground mt-1">
												{t("admin.team.supervision.assigned", "Assignées")}
											</p>
										</div>
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="text-base font-bold tabular-nums leading-none">
												{m.completed}
											</p>
											<p className="text-[10px] uppercase text-muted-foreground mt-1">
												{t("admin.team.supervision.completed", "Traitées")}
											</p>
										</div>
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="text-base font-bold tabular-nums leading-none">
												{m.completionRate}%
											</p>
											<p className="text-[10px] uppercase text-muted-foreground mt-1">
												{t("admin.team.supervision.rate", "Taux")}
											</p>
										</div>
										<div className="rounded-lg bg-muted/40 p-2">
											<p className="text-base font-bold tabular-nums leading-none">
												{m.upcomingAppointmentsCount}
											</p>
											<p className="text-[10px] uppercase text-muted-foreground mt-1">
												{t("admin.team.supervision.rdv", "RDV")}
											</p>
										</div>
									</div>

									<div className="mt-auto flex items-center gap-2">
										<Link
											href={`/team/agents/${m.membershipId}`}
											className="inline-flex flex-1"
										>
											<Button variant="outline" size="sm" className="w-full gap-1">
												<Eye className="h-3.5 w-3.5" />
												{t("admin.team.supervision.view", "Voir")}
											</Button>
										</Link>
										<Link
											href={`/appointments/print?agentId=${m.membershipId}&period=week&autoPrint=1`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex"
										>
											<Button variant="ghost" size="sm" className="gap-1">
												<Printer className="h-3.5 w-3.5" />
											</Button>
										</Link>
									</div>
								</div>
							</FlatCard>
						);
					})}
				</div>
			)}
		</div>
	);
}
