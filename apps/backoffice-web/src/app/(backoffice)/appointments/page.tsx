"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
	Calendar,
	CalendarDays,
	Download,
	LineChart,
	Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { FlatCard } from "@/components/design-system/flat-card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/design-system/page-header";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

function todayISO() {
	return new Date().toISOString().split("T")[0];
}

function isoMinusDays(days: number) {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString().split("T")[0];
}

function toCsv(rows: Array<Record<string, unknown>>): string {
	if (rows.length === 0) return "";
	const keys = Object.keys(rows[0]);
	const esc = (v: unknown) => {
		const s = v == null ? "" : String(v);
		return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	return [
		keys.join(","),
		...rows.map((r) => keys.map((k) => esc(r[k])).join(",")),
	].join("\n");
}

export default function BackofficeAppointmentsPage() {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	const [orgFilter, setOrgFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [startDate, setStartDate] = useState<string>(isoMinusDays(30));
	const [endDate, setEndDate] = useState<string>(todayISO());

	const orgId = orgFilter === "all" ? undefined : (orgFilter as any);
	const status = statusFilter === "all" ? undefined : statusFilter;

	const { data: orgs } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const { data: stats } = useAuthenticatedConvexQuery(
		api.functions.appointmentReports.getGlobalStats,
		{ orgId, startDate, endDate },
	);

	const { data: rows } = useAuthenticatedConvexQuery(
		api.functions.appointmentReports.listAll,
		{ orgId, status, startDate, endDate, limit: 200 },
	);

	const orgOptions: ComboboxOption[] = useMemo(() => {
		const opts: ComboboxOption[] = [
			{
				value: "all",
				label: lang === "fr" ? "Tous les organismes" : "All organizations",
			},
		];
		if (orgs)
			for (const org of orgs as any[])
				opts.push({ value: org._id, label: org.name });
		return opts;
	}, [orgs, lang]);

	const filteredRows = useMemo(() => {
		if (!rows) return [] as any[];
		if (!searchQuery) return rows as any[];
		const q = searchQuery.toLowerCase();
		return (rows as any[]).filter((r) =>
			[r.attendeeName, r.attendeeEmail, r.orgName]
				.filter(Boolean)
				.some((v: string) => v.toLowerCase().includes(q)),
		);
	}, [rows, searchQuery]);

	const handleExportCsv = () => {
		if (!rows) return;
		const csv = toCsv(
			(rows as any[]).map((r) => ({
				date: r.date,
				time: r.time,
				org: r.orgName,
				attendee: r.attendeeName,
				email: r.attendeeEmail,
				status: r.status,
				mode: r.mode ?? "",
				channel: r.creationChannel ?? "",
			})),
		);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `appointments-${startDate}-${endDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const total = stats?.total ?? 0;
	const noShowPct = stats ? Math.round(stats.noShowRate * 100) : 0;
	const reschedulePct = stats ? Math.round(stats.rescheduleRate * 100) : 0;

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
			<PageHeader
				icon={<CalendarDays className="h-5 w-5" />}
				title={lang === "fr" ? "Supervision des rendez-vous" : "Appointments supervision"}
				subtitle={
					lang === "fr"
						? "Vue globale, KPIs et export consolidés."
						: "Global view, KPIs and consolidated exports."
				}
			/>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<FlatCard>
					<div className="p-3 space-y-1">
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Volume" : "Volume"}
						</div>
						<div className="text-2xl font-bold">{total}</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 space-y-1">
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Honorés" : "Attended"}
						</div>
						<div className="text-2xl font-bold">
							{stats?.statusCounts.completed ?? 0}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 space-y-1">
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Taux no-show" : "No-show rate"}
						</div>
						<div className="text-2xl font-bold">{noShowPct}%</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 space-y-1">
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Reprogrammés" : "Rescheduled"}
						</div>
						<div className="text-2xl font-bold">{reschedulePct}%</div>
					</div>
				</FlatCard>
			</div>

			<FlatCard>
				<div className="p-3 flex flex-col lg:flex-row gap-3 lg:items-end">
					<div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">
								{lang === "fr" ? "Du" : "From"}
							</label>
							<Input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="h-9"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">
								{lang === "fr" ? "Au" : "To"}
							</label>
							<Input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="h-9"
							/>
						</div>
						<Combobox
							options={orgOptions}
							value={orgFilter}
							onValueChange={setOrgFilter}
							placeholder={
								lang === "fr" ? "Tous les organismes" : "All orgs"
							}
							searchPlaceholder={
								lang === "fr" ? "Rechercher un organisme…" : "Search org…"
							}
							emptyText={
								lang === "fr" ? "Aucun organisme trouvé" : "No org found"
							}
							className="h-9"
						/>
						<Combobox
							options={[
								{ value: "all", label: lang === "fr" ? "Tous statuts" : "All statuses" },
								{ value: "pending", label: lang === "fr" ? "En attente" : "Pending" },
								{ value: "confirmed", label: lang === "fr" ? "Confirmés" : "Confirmed" },
								{ value: "completed", label: lang === "fr" ? "Terminés" : "Completed" },
								{ value: "cancelled", label: lang === "fr" ? "Annulés" : "Cancelled" },
								{ value: "no_show", label: "No-show" },
								{ value: "rescheduled", label: lang === "fr" ? "Reprogrammés" : "Rescheduled" },
							]}
							value={statusFilter}
							onValueChange={setStatusFilter}
							placeholder={lang === "fr" ? "Statut" : "Status"}
							searchPlaceholder=""
							emptyText=""
							className="h-9"
						/>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link href="/appointments/reports">
								<LineChart className="mr-2 h-4 w-4" />
								{lang === "fr" ? "Rapports" : "Reports"}
							</Link>
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExportCsv}
							disabled={!rows}
						>
							<Download className="mr-2 h-4 w-4" />
							{lang === "fr" ? "Export CSV" : "Export CSV"}
						</Button>
					</div>
				</div>
			</FlatCard>

			<FlatCard>
				<div className="p-3 flex items-center gap-2 border-b border-border/40">
					<Search className="h-4 w-4 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={
							lang === "fr"
								? "Rechercher un usager, un email ou un organisme…"
								: "Search user, email, org…"
						}
						className="h-8 border-0 focus-visible:ring-0 bg-transparent"
					/>
				</div>
				<div className="divide-y divide-border/40 max-h-[60vh] overflow-auto">
					{filteredRows.length === 0 && (
						<div className="p-6 text-sm text-center text-muted-foreground">
							{lang === "fr"
								? "Aucun rendez-vous ne correspond aux filtres."
								: "No appointments match the filters."}
						</div>
					)}
					{filteredRows.map((r) => (
						<Link
							key={r._id}
							href={`/appointments/${r._id}`}
							className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
						>
							<div className="shrink-0 flex flex-col items-center w-14">
								<span className="text-[10px] text-muted-foreground uppercase">
									{new Date(r.date + "T00:00:00").toLocaleDateString(
										lang === "fr" ? "fr-FR" : "en-US",
										{ month: "short" },
									)}
								</span>
								<span className="text-xl font-bold leading-none">
									{new Date(r.date + "T00:00:00").getDate()}
								</span>
							</div>
							<div className="flex-1 min-w-0">
								<div className="font-medium truncate">{r.attendeeName}</div>
								<div className="text-xs text-muted-foreground truncate">
									{r.time} · {r.orgName}
								</div>
							</div>
							<Badge variant="outline" className="text-[10px]">
								{r.status}
							</Badge>
						</Link>
					))}
				</div>
			</FlatCard>
		</div>
	);
}
