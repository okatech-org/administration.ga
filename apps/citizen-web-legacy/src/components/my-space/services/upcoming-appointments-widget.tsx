/**
 * Upcoming Appointments Widget — Prochains RDV confirmes
 */

import { Link } from "@tanstack/react-router";
import {
	Calendar,
	ChevronRight,
	MapPin,
	Package,
} from "lucide-react";
import { FlatCard } from "@/components/my-space/flat-card";
import { SectionHeader } from "@/components/my-space/section-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpcomingAppointment {
	_id: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	appointmentType: "deposit" | "pickup";
	serviceName?: string;
	orgName?: string;
	status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateFr(dateStr: string): string {
	const date = new Date(dateStr + "T00:00:00");
	return new Intl.DateTimeFormat("fr-FR", {
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(date);
}

function isToday(dateStr: string): boolean {
	return dateStr === new Date().toISOString().slice(0, 10);
}

function isTomorrow(dateStr: string): boolean {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return dateStr === tomorrow.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UpcomingAppointmentsWidgetProps {
	appointments: UpcomingAppointment[];
}

export function UpcomingAppointmentsWidget({
	appointments,
}: UpcomingAppointmentsWidgetProps) {
	// Prendre les 3 prochains confirmes
	const upcoming = appointments
		.filter((a) => a.status === "confirmed" && a.date >= new Date().toISOString().slice(0, 10))
		.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
		.slice(0, 3);

	return (
		<FlatCard className="p-3.5">
			<SectionHeader
				icon={<Calendar className="w-3.5 h-3.5" />}
				iconBgClass="bg-indigo-500/10"
				iconTextClass="text-indigo-600 dark:text-indigo-400"
				title="Prochains RDV"
				actions={
					upcoming.length > 0 ? (
						<Link
							to="/my-space/iagenda"
							className="text-[10px] text-primary font-medium hover:underline"
						>
							Voir tous
						</Link>
					) : undefined
				}
			/>

			{upcoming.length === 0 ? (
				<div className="flex items-center gap-2.5 py-6 justify-center">
					<Calendar className="w-5 h-5 text-muted-foreground/30" />
					<p className="text-xs text-muted-foreground">
						Aucun RDV prevu
					</p>
				</div>
			) : (
				<div className="space-y-2 mt-2">
					{upcoming.map((apt) => {
						const today = isToday(apt.date);
						const tomorrow = isTomorrow(apt.date);
						const isDeposit = apt.appointmentType === "deposit";

						return (
							<Link
								key={apt._id}
								to="/my-space/appointments/$appointmentId"
								params={{ appointmentId: apt._id }}
								className="group"
							>
								<div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
									{/* Date box */}
									<div
										className={cn(
											"flex flex-col items-center justify-center w-11 h-11 rounded-lg shrink-0 text-center",
											today
												? "bg-primary/10 border border-primary/20"
												: "bg-muted",
										)}
									>
										<span
											className={cn(
												"text-xs font-bold leading-none",
												today ? "text-primary" : "text-foreground",
											)}
										>
											{apt.time}
										</span>
										<span className="text-[9px] text-muted-foreground mt-0.5">
											{today ? "Auj." : tomorrow ? "Dem." : formatDateFr(apt.date).split(" ").slice(0, 2).join(" ")}
										</span>
									</div>

									{/* Details */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<Badge
												variant="outline"
												className={cn(
													"text-[9px] h-4 px-1.5 py-0 gap-0.5",
													isDeposit
														? "text-blue-600 dark:text-blue-400 border-blue-500/20"
														: "text-green-600 dark:text-green-400 border-green-500/20",
												)}
											>
												{isDeposit ? (
													<>
														<MapPin className="w-2.5 h-2.5" />
														Depot
													</>
												) : (
													<>
														<Package className="w-2.5 h-2.5" />
														Retrait
													</>
												)}
											</Badge>
										</div>
										{apt.serviceName && (
											<p className="text-xs font-medium line-clamp-1 mt-1 group-hover:text-primary transition-colors">
												{apt.serviceName}
											</p>
										)}
										{apt.orgName && (
											<p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
												{apt.orgName}
											</p>
										)}
									</div>

									<ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1 transition-colors" />
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</FlatCard>
	);
}
