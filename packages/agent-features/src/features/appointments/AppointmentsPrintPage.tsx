"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalized } from "@convex/lib/utils";
import { useSearchParams } from "@workspace/routing";
import { Printer, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrg } from "../../shell/org-provider";
import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

type Period = "day" | "week" | "month" | "custom";

const STATUS_LABELS: Record<string, string> = {
	pending: "En attente",
	confirmed: "Confirmé",
	completed: "Terminé",
	cancelled: "Annulé",
	no_show: "Absent",
	rescheduled: "Reprogrammé",
};

const MODE_LABELS: Record<string, string> = {
	in_person: "Sur place",
	remote: "Visio",
	phone: "Téléphone",
};

const TYPE_LABELS: Record<string, string> = {
	deposit: "Dépôt",
	pickup: "Retrait",
};

function todayISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoOffsetDays(base: string, days: number): string {
	const d = new Date(`${base}T12:00:00`);
	d.setDate(d.getDate() + days);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeForPeriod(period: Period, anchor: string): { from: string; to: string } {
	if (period === "day") return { from: anchor, to: anchor };
	if (period === "week") {
		const d = new Date(`${anchor}T12:00:00`);
		// Monday-based week
		const dayIdx = (d.getDay() + 6) % 7;
		const monday = isoOffsetDays(anchor, -dayIdx);
		const sunday = isoOffsetDays(monday, 6);
		return { from: monday, to: sunday };
	}
	if (period === "month") {
		const d = new Date(`${anchor}T12:00:00`);
		const year = d.getFullYear();
		const month = d.getMonth();
		const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
		const lastDay = new Date(year, month + 1, 0).getDate();
		const last = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
		return { from: first, to: last };
	}
	return { from: anchor, to: anchor };
}

function formatDayHeading(dateStr: string, locale: string): string {
	const d = new Date(`${dateStr}T12:00:00`);
	return d.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatRangeLabel(from: string, to: string, locale: string): string {
	if (from === to) return formatDayHeading(from, locale);
	const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
	const a = new Date(`${from}T12:00:00`).toLocaleDateString(locale, opts);
	const b = new Date(`${to}T12:00:00`).toLocaleDateString(locale, opts);
	return `${a} → ${b}`;
}

export default function AppointmentsPrintPage() {
	const { activeOrgId, activeOrg } = useOrg();
	const { t } = useTranslation();
	const locale = t("common.locale", { defaultValue: "fr-FR" });
	const searchParams = useSearchParams();

	const { canDo } = useCanDoTask(activeOrgId ?? undefined);
	const canManage = canDo("appointments.manage");

	// Initial state from URL params
	const initialPeriod = (searchParams?.get("period") as Period) ?? "week";
	const initialAnchor = searchParams?.get("anchor") ?? todayISO();
	const initialFrom = searchParams?.get("from") ?? undefined;
	const initialTo = searchParams?.get("to") ?? undefined;
	const initialAgentId = searchParams?.get("agentId") ?? undefined;

	const [period, setPeriod] = useState<Period>(initialPeriod);
	const [anchor, setAnchor] = useState<string>(initialAnchor);
	const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);

	// Compute range
	const { from, to } = useMemo(() => {
		if (initialFrom && initialTo && period === "custom") {
			return { from: initialFrom, to: initialTo };
		}
		return rangeForPeriod(period, anchor);
	}, [period, anchor, initialFrom, initialTo]);

	// Agents list (manager only)
	const { data: agents } = useAuthenticatedConvexQuery(
		api.functions.slots.listOrgAgentsForAppointments,
		canManage && activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Appointments query
	const queryArgs = activeOrgId
		? {
				orgId: activeOrgId,
				from,
				to,
				agentId: (agentId as Id<"memberships"> | undefined) || undefined,
			}
		: "skip";

	const { data: appointments, isPending } = useAuthenticatedConvexQuery(
		api.functions.slots.listAppointmentsForPrint,
		queryArgs,
	);

	// Group by day
	const grouped = useMemo(() => {
		const map = new Map<string, NonNullable<typeof appointments>>();
		for (const apt of appointments ?? []) {
			const list = map.get(apt.date) ?? [];
			list.push(apt);
			map.set(apt.date, list);
		}
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	}, [appointments]);

	// Resolve title — either current agent (own) or selected agent (manager)
	const selectedAgentLabel = useMemo(() => {
		if (!agentId) return null;
		const a = agents?.find((x) => x._id === agentId);
		if (!a) return null;
		return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "—";
	}, [agentId, agents]);

	// Auto-trigger print dialog once data is loaded (only if requested via URL)
	const autoPrint = searchParams?.get("autoPrint") === "1";
	useEffect(() => {
		if (autoPrint && !isPending && appointments) {
			const t = setTimeout(() => window.print(), 300);
			return () => clearTimeout(t);
		}
	}, [autoPrint, isPending, appointments]);

	return (
		<div className="bg-background min-h-screen">
			<style
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={{
					__html: `
@media print {
  @page { size: A4; margin: 15mm; }
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
  .print-day { page-break-inside: avoid; }
  .print-row { page-break-inside: avoid; }
  .print-table { font-size: 10pt; }
  .print-table th, .print-table td { border: 1px solid #999 !important; }
}
`,
				}}
			/>

			{/* Toolbar (hidden when printing) */}
			<div className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						variant={period === "day" ? "default" : "outline"}
						onClick={() => {
							setPeriod("day");
							setAnchor(todayISO());
						}}
					>
						{t("appointments.print.today", "Aujourd'hui")}
					</Button>
					<Button
						size="sm"
						variant={period === "week" ? "default" : "outline"}
						onClick={() => {
							setPeriod("week");
							setAnchor(todayISO());
						}}
					>
						{t("appointments.print.week", "Cette semaine")}
					</Button>
					<Button
						size="sm"
						variant={period === "month" ? "default" : "outline"}
						onClick={() => {
							setPeriod("month");
							setAnchor(todayISO());
						}}
					>
						{t("appointments.print.month", "Ce mois")}
					</Button>

					<input
						type="date"
						value={anchor}
						onChange={(e) => setAnchor(e.target.value || todayISO())}
						className="ml-2 h-9 rounded-md border bg-background px-3 text-xs"
					/>

					{canManage && agents && agents.length > 0 && (
						<Combobox
							value={agentId ?? "__self"}
							onValueChange={(v) => setAgentId(v === "__self" ? undefined : v)}
							placeholder={t("appointments.print.agentFilter", "Agent")}
							searchPlaceholder={t("common.search", "Rechercher")}
							className="w-[220px] h-9 text-xs"
							options={[
								{
									value: "__self",
									label: t("appointments.print.myself", "Mon planning"),
								},
								...agents.map((a) => ({
									value: a._id,
									label:
										[a.firstName, a.lastName].filter(Boolean).join(" ") ||
										a.email ||
										a._id,
								})),
							]}
						/>
					)}

					<div className="ml-auto flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => window.location.reload()}
						>
							<RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
							{t("common.refresh", "Actualiser")}
						</Button>
						<Button size="sm" onClick={() => window.print()}>
							<Printer className="mr-1.5 h-3.5 w-3.5" />
							{t("appointments.print.printButton", "Imprimer")}
						</Button>
					</div>
				</div>
			</div>

			{/* Print sheet */}
			<div className="mx-auto max-w-5xl px-4 py-6 print:py-0">
				{/* Header */}
				<div className="mb-6 border-b pb-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">
								{t("appointments.print.title", "Planning des rendez-vous")}
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								{activeOrg?.name ?? "—"}
							</p>
							{selectedAgentLabel && (
								<p className="mt-0.5 text-sm">
									<span className="text-muted-foreground">
										{t("appointments.print.agent", "Agent")} :
									</span>{" "}
									<span className="font-medium">{selectedAgentLabel}</span>
								</p>
							)}
							{!selectedAgentLabel && !agentId && (
								<p className="mt-0.5 text-sm text-muted-foreground">
									{t("appointments.print.myself", "Mon planning")}
								</p>
							)}
						</div>
						<div className="text-right">
							<p className="text-sm text-muted-foreground">
								{t("appointments.print.range", "Période")}
							</p>
							<p className="font-medium">{formatRangeLabel(from, to, locale)}</p>
							<p className="mt-1 text-[11px] text-muted-foreground">
								{t("appointments.print.generatedAt", "Généré le")}{" "}
								{new Date().toLocaleString(locale)}
							</p>
						</div>
					</div>
				</div>

				{/* Content */}
				{isPending ? (
					<p className="text-sm text-muted-foreground">
						{t("common.loading", "Chargement…")}
					</p>
				) : grouped.length === 0 ? (
					<div className="rounded-lg border border-dashed p-8 text-center">
						<p className="text-sm text-muted-foreground">
							{t(
								"appointments.print.empty",
								"Aucun rendez-vous sur cette période.",
							)}
						</p>
					</div>
				) : (
					<div className="space-y-6">
						{grouped.map(([day, items]) => (
							<section key={day} className="print-day">
								<h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground capitalize">
									{formatDayHeading(day, locale)}
									<span className="ml-2 normal-case text-xs text-muted-foreground">
										({items.length}{" "}
										{items.length > 1 ? "rendez-vous" : "rendez-vous"})
									</span>
								</h2>
								<table className="print-table w-full border-collapse text-xs">
									<thead>
										<tr className="bg-muted/50 text-left">
											<th className="border px-2 py-1.5 w-[70px]">
												{t("appointments.print.col.time", "Heure")}
											</th>
											<th className="border px-2 py-1.5 w-[70px]">
												{t("appointments.print.col.mode", "Mode")}
											</th>
											<th className="border px-2 py-1.5">
												{t("appointments.print.col.attendee", "Personne")}
											</th>
											<th className="border px-2 py-1.5">
												{t("appointments.print.col.motif", "Motif")}
											</th>
											<th className="border px-2 py-1.5 w-[90px]">
												{t("appointments.print.col.reference", "Dossier")}
											</th>
											<th className="border px-2 py-1.5 w-[90px]">
												{t("appointments.print.col.status", "Statut")}
											</th>
											<th className="border px-2 py-1.5">
												{t("appointments.print.col.notes", "Notes")}
											</th>
										</tr>
									</thead>
									<tbody>
										{items.map((apt) => {
											const fullName = apt.attendee
												? [apt.attendee.firstName, apt.attendee.lastName]
														.filter(Boolean)
														.join(" ") || "—"
												: "—";
											const serviceName =
												getLocalized(apt.service?.name, "fr") ?? "—";
											const modeLabel = apt.mode
												? MODE_LABELS[apt.mode] ?? apt.mode
												: "—";
											const typeLabel = apt.appointmentType
												? TYPE_LABELS[apt.appointmentType]
												: null;
											return (
												<tr key={apt._id} className="print-row align-top">
													<td className="border px-2 py-1.5 font-medium tabular-nums">
														{apt.time}
														{apt.endTime && (
															<>
																<br />
																<span className="text-[10px] text-muted-foreground">
																	→ {apt.endTime}
																</span>
															</>
														)}
													</td>
													<td className="border px-2 py-1.5">
														{modeLabel}
														{typeLabel && (
															<>
																<br />
																<span className="text-[10px] text-muted-foreground">
																	{typeLabel}
																</span>
															</>
														)}
													</td>
													<td className="border px-2 py-1.5">
														<div className="font-medium">{fullName}</div>
														{apt.attendee?.email && (
															<div className="text-[10px] text-muted-foreground">
																{apt.attendee.email}
															</div>
														)}
														{apt.attendee?.phone && (
															<div className="text-[10px] text-muted-foreground">
																{apt.attendee.phone}
															</div>
														)}
													</td>
													<td className="border px-2 py-1.5">{serviceName}</td>
													<td className="border px-2 py-1.5 font-mono text-[10px]">
														{apt.request?.reference ?? "—"}
													</td>
													<td className="border px-2 py-1.5">
														{STATUS_LABELS[apt.status] ?? apt.status}
													</td>
													<td className="border px-2 py-1.5 text-[10px] whitespace-pre-wrap">
														{apt.notes?.trim() || "—"}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</section>
						))}
					</div>
				)}

				{/* Footer */}
				<div className="mt-8 border-t pt-3 text-[10px] text-muted-foreground">
					<p>
						{t(
							"appointments.print.footer",
							"Document interne — à usage des agents pour la préparation des rendez-vous.",
						)}
					</p>
				</div>
			</div>
		</div>
	);
}
