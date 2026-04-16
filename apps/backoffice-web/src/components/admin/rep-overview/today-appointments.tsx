"use client";

import { Calendar, User2 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { StatusDot } from "./shared/status-dot";

interface TodayAppointmentsProps {
	orgId: Id<"orgs">;
}

type AppointmentStatus = "confirmed" | "cancelled" | "completed" | "no_show" | "rescheduled";

interface EnrichedAppointment {
	_id: string;
	date: string;
	time: string;
	status: AppointmentStatus;
	type?: string;
	user?: { firstName?: string; lastName?: string; email?: string } | null;
}

/**
 * Timeline verticale des RDV du jour.
 */
export function TodayAppointments({ orgId }: TodayAppointmentsProps) {
	const { t } = useTranslation();
	const today = new Date().toISOString().split("T")[0];

	const { data: appointments, isPending } = useAuthenticatedConvexQuery(
		api.functions.appointments.listByOrg,
		{ orgId, date: today },
	);

	const list = (appointments as EnrichedAppointment[] | undefined) ?? [];
	// Tri par heure croissante, exclusion des annulés
	const sorted = [...list]
		.filter((a) => a.status !== "cancelled")
		.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

	const now = new Date();
	const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Calendar className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.appointments.title",
						"RDV du jour",
					)}
					actions={
						<span className="text-[10px] text-muted-foreground uppercase tracking-wider tabular-nums">
							{sorted.length}
						</span>
					}
				/>

				{isPending ? (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : sorted.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
						<Calendar className="h-8 w-8 mb-2 opacity-30" />
						<p className="text-xs">Aucun RDV aujourd'hui</p>
					</div>
				) : (
					<ul className="space-y-1 max-h-[280px] overflow-y-auto citizen-scrollbar -mr-2 pr-2">
						{sorted.slice(0, 8).map((app) => {
							const isPast = app.time < currentTime;
							const statusDotType: "ok" | "warn" | "critical" | "idle" | "info" =
								app.status === "completed"
									? "ok"
									: app.status === "no_show"
										? "critical"
										: app.status === "rescheduled"
											? "warn"
											: isPast
												? "idle"
												: "info";

							const userName = app.user
								? `${app.user.firstName ?? ""} ${app.user.lastName ?? ""}`.trim() ||
									app.user.email ||
									"Citoyen"
								: "Citoyen";

							return (
								<li key={app._id}>
									<Link
										href={`/appointments/${app._id}`}
										className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
									>
										<div className="flex flex-col items-center min-w-[44px]">
											<span className="text-xs font-bold tabular-nums">
												{app.time}
											</span>
											<StatusDot
												status={statusDotType}
												pulse={statusDotType === "info" && !isPast}
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-xs font-medium truncate flex items-center gap-1">
												<User2 className="h-3 w-3 text-muted-foreground" />
												{userName}
											</p>
											{app.type && (
												<p className="text-[10px] text-muted-foreground truncate capitalize">
													{app.type}
												</p>
											)}
										</div>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</FlatCard>
	);
}
