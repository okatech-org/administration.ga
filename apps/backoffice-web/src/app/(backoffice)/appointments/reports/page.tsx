"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
	ArrowLeft,
	Download,
	LineChart as LineChartIcon,
} from "lucide-react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
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

function ChartMount({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false);
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		let raf: number;
		const tick = () => {
			const el = wrapperRef.current;
			if (el && el.getBoundingClientRect().width > 0) {
				setReady(true);
			} else {
				raf = requestAnimationFrame(tick);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);
	return (
		<div ref={wrapperRef} className="h-full w-full">
			{ready ? children : null}
		</div>
	);
}

export default function BackofficeAppointmentsReportsPage() {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	const [orgFilter, setOrgFilter] = useState<string>("all");
	const [startDate, setStartDate] = useState<string>(isoMinusDays(90));
	const [endDate, setEndDate] = useState<string>(todayISO());

	const orgId = orgFilter === "all" ? undefined : (orgFilter as any);

	const { data: orgs } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const { data: stats } = useAuthenticatedConvexQuery(
		api.functions.appointmentReports.getGlobalStats,
		{ orgId, startDate, endDate },
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

	const series = (stats?.series ?? []) as Array<{ date: string; count: number }>;

	const handleExportSeriesCsv = () => {
		if (series.length === 0) return;
		const csv = toCsv(series);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `appointments-series-${startDate}-${endDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const total = stats?.total ?? 0;
	const noShowPct = stats ? Math.round(stats.noShowRate * 100) : 0;
	const reschedulePct = stats ? Math.round(stats.rescheduleRate * 100) : 0;
	const completed = stats?.statusCounts.completed ?? 0;

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			<PageHeader
				icon={<LineChartIcon className="h-5 w-5" />}
				title={lang === "fr" ? "Rapports rendez-vous" : "Appointment reports"}
				subtitle={
					lang === "fr"
						? "Séries temporelles et statistiques agrégées."
						: "Time series and aggregated statistics."
				}
			/>

			<div className="flex items-center justify-between">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/appointments">
						<ArrowLeft className="mr-2 h-4 w-4" />
						{lang === "fr" ? "Retour à la supervision" : "Back to supervision"}
					</Link>
				</Button>
			</div>

			<FlatCard>
				<div className="p-3 flex flex-col lg:flex-row gap-3 lg:items-end">
					<div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
							placeholder={lang === "fr" ? "Organisme" : "Organization"}
							searchPlaceholder={
								lang === "fr" ? "Rechercher un organisme…" : "Search org…"
							}
							emptyText={
								lang === "fr" ? "Aucun organisme trouvé" : "No org found"
							}
							className="h-9"
						/>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleExportSeriesCsv}
							disabled={series.length === 0}
						>
							<Download className="mr-2 h-4 w-4" />
							{lang === "fr" ? "Export série CSV" : "Export series CSV"}
						</Button>
					</div>
				</div>
			</FlatCard>

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
						<div className="text-2xl font-bold">{completed}</div>
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
				<div className="p-3 space-y-3">
					<div className="text-sm font-medium">
						{lang === "fr" ? "Volume par jour" : "Volume per day"}
					</div>
					<div className="h-72">
						{series.length === 0 ? (
							<div className="h-full flex items-center justify-center text-sm text-muted-foreground">
								{lang === "fr"
									? "Aucune donnée sur la période."
									: "No data for this period."}
							</div>
						) : (
							<ChartMount>
								<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
									<LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
										<XAxis
											dataKey="date"
											tick={{ fontSize: 11 }}
											tickFormatter={(v) =>
												new Date(v + "T00:00:00").toLocaleDateString(
													lang === "fr" ? "fr-FR" : "en-US",
													{ month: "short", day: "numeric" },
												)
											}
										/>
										<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
										<Tooltip
											contentStyle={{
												background: "hsl(var(--popover))",
												border: "1px solid hsl(var(--border))",
												borderRadius: 6,
												fontSize: 12,
											}}
										/>
										<Line
											type="monotone"
											dataKey="count"
											stroke="#3b82f6"
											strokeWidth={2}
											dot={{ r: 2 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</ChartMount>
						)}
					</div>
				</div>
			</FlatCard>

			<FlatCard>
				<div className="p-3 space-y-3">
					<div className="text-sm font-medium">
						{lang === "fr" ? "Répartition par statut" : "Status breakdown"}
					</div>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
						{stats &&
							Object.entries(stats.statusCounts).map(([k, v]) => (
								<div key={k} className="border border-border/40 rounded-md p-2">
									<div className="text-[10px] uppercase text-muted-foreground">
										{k}
									</div>
									<div className="text-lg font-semibold">{v as number}</div>
								</div>
							))}
					</div>
				</div>
			</FlatCard>
		</div>
	);
}
