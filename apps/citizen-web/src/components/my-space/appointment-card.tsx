import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRightLeft,
	Calendar,
	Clock,
	FileText,
	MapPin,
	Package,
	X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppointmentData {
	_id: Id<"appointments">;
	date: string;
	time: string;
	endTime?: string;
	status: string;
	appointmentType?: "deposit" | "pickup";
	notes?: string;
	requestId?: Id<"requests">;
	service?: { name: string } | null;
	org?: {
		_id: Id<"orgs">;
		name: string;
		address?: { city?: string; street?: string };
	} | null;
}

const STATUS_CONFIG: Record<string, { label: string; tintBg: string; iconColor: string }> = {
	confirmed: {
		label: "Confirme",
		tintBg: "bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/15",
		iconColor: "text-amber-600 dark:text-amber-400",
	},
	completed: {
		label: "Complete",
		tintBg: "bg-foreground/[0.04] dark:bg-foreground/[0.06] hover:bg-foreground/[0.08]",
		iconColor: "text-muted-foreground",
	},
	cancelled: {
		label: "Annule",
		tintBg: "bg-rose-500/[0.06] dark:bg-rose-500/[0.06] hover:bg-rose-500/10",
		iconColor: "text-rose-500 dark:text-rose-400",
	},
	no_show: {
		label: "Absent",
		tintBg: "bg-rose-500/[0.06] dark:bg-rose-500/[0.06] hover:bg-rose-500/10",
		iconColor: "text-rose-500 dark:text-rose-400",
	},
	rescheduled: {
		label: "Reprogramme",
		tintBg: "bg-amber-500/10 dark:bg-amber-500/8 hover:bg-amber-500/20",
		iconColor: "text-amber-600 dark:text-amber-400",
	},
};

const TYPE_LABELS: Record<string, string> = {
	deposit: "Depot",
	pickup: "Retrait",
};

function getReminderBadge(dateStr: string): { label: string; className: string } | null {
	const daysUntil = differenceInCalendarDays(new Date(dateStr + "T00:00:00"), new Date());
	if (daysUntil < 0) return null;
	if (daysUntil === 0) return { label: "Aujourd'hui", className: "bg-green-500/25 text-green-700 dark:text-green-400" };
	if (daysUntil === 1) return { label: "Demain", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400" };
	if (daysUntil <= 3) return { label: `Dans ${daysUntil}j`, className: "bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400" };
	return null;
}

function isPastDate(dateStr: string): boolean {
	return dateStr < new Date().toISOString().split("T")[0];
}

interface AppointmentCardProps {
	appointment: AppointmentData;
	onCancel?: (id: Id<"appointments">) => void;
	showActions?: boolean;
	compact?: boolean;
}

/**
 * Card rendez-vous — met en avant date, heure, lieu, service.
 */
export function AppointmentCard({
	appointment: apt,
	onCancel,
	showActions = true,
	compact = false,
}: AppointmentCardProps) {
	const { t } = useTranslation();
	const statusInfo = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.confirmed;
	const reminder = apt.status !== "cancelled" && apt.status !== "completed" ? getReminderBadge(apt.date) : null;
	const isCancellable = apt.status === "confirmed";
	const past = isPastDate(apt.date);

	const formattedDate = format(new Date(apt.date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: fr });
	const timeRange = apt.endTime ? `${apt.time} — ${apt.endTime}` : apt.time;
	const address = [apt.org?.address?.street, apt.org?.address?.city].filter(Boolean).join(", ");
	const serviceName = apt.service?.name;

	return (
		<Link
			href={`/my-space/appointments/${apt._id}`}
			className="block"
		>
			<div className={cn(
				"flex flex-col rounded-xl transition-colors",
				compact ? "p-3" : "p-3 lg:p-4",
				past
					? "bg-muted hover:bg-muted/80"
					: statusInfo.tintBg,
			)}>
				{/* Top row: badges */}
				<div className="flex items-center justify-between mb-2.5">
					<div className="flex items-center gap-1.5">
						{reminder && (
							<span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", reminder.className)}>
								{reminder.label}
							</span>
						)}
						{apt.appointmentType && (
							<span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground">
								{apt.appointmentType === "deposit" ? <Package className="w-2.5 h-2.5" /> : <ArrowRightLeft className="w-2.5 h-2.5" />}
								{TYPE_LABELS[apt.appointmentType]}
							</span>
						)}
					</div>
					{apt.status !== "confirmed" && (
						<span className={cn(
							"text-[10px] px-2 py-0.5 rounded-full font-semibold",
							apt.status === "completed" && "bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground",
							apt.status === "cancelled" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
							apt.status === "no_show" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
							apt.status === "rescheduled" && "bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
						)}>
							{statusInfo.label}
						</span>
					)}
					{past && apt.status === "confirmed" && (
						<span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground">
							Passe
						</span>
					)}
				</div>

				{/* Date & heure — info principale, grande et visible */}
				<div className="flex items-center gap-3 mb-2">
					<div className={cn(
						"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
						past
							? "bg-foreground/[0.06] dark:bg-foreground/[0.12]"
							: "bg-primary/10 dark:bg-primary/15",
					)}>
						<Calendar className={cn("h-5 w-5", past ? "text-muted-foreground" : "text-primary")} />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold capitalize text-foreground leading-snug">
							{formattedDate}
						</p>
						<p className={cn(
							"text-sm font-semibold flex items-center gap-1.5 mt-0.5",
							past ? "text-muted-foreground" : "text-primary",
						)}>
							<Clock className="w-3.5 h-3.5 shrink-0" />
							{timeRange}
						</p>
					</div>
				</div>

				{/* Infos secondaires: lieu + service */}
				<div className={cn("flex flex-col gap-1.5", compact ? "mt-1" : "mt-1")}>
					{/* Lieu */}
					{(apt.org?.name || address) && (
						<div className="flex items-start gap-2 text-xs text-muted-foreground">
							<MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
							<div className="min-w-0">
								<p className="font-semibold text-foreground/80 leading-snug line-clamp-1">
									{apt.org?.name}
								</p>
								{address && !compact && (
									<p className="text-muted-foreground leading-snug">{address}</p>
								)}
							</div>
						</div>
					)}

					{/* Service / raison du RDV */}
					{serviceName && (
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<FileText className="w-3.5 h-3.5 shrink-0" />
							<p className="font-medium line-clamp-1">{serviceName}</p>
						</div>
					)}
				</div>

				{/* Notes */}
				{apt.notes && !compact && (
					<p className="mt-2 text-xs text-muted-foreground bg-foreground/[0.04] dark:bg-foreground/[0.06] rounded-lg p-2.5 line-clamp-2">
						{apt.notes}
					</p>
				)}

				{/* Actions */}
				{showActions && isCancellable && onCancel && !past && (
					<div className="flex items-center gap-2 mt-2.5">
						<Button
							variant="ghost"
							size="sm"
							className="h-8 px-3.5 text-xs font-medium text-foreground bg-foreground/[0.06] dark:bg-foreground/[0.12] hover:bg-foreground/[0.1] active:scale-[0.97] transition-transform rounded-full gap-1.5"
							asChild
							onClick={(e: React.MouseEvent) => e.stopPropagation()}
						>
							<Link href="/my-space/appointments/new">
								<Calendar className="w-3.5 h-3.5" />
								Reprogrammer
							</Link>
						</Button>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 px-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/[0.06] hover:bg-rose-500/15 active:scale-[0.97] transition-transform rounded-full gap-1.5"
									onClick={(e: React.MouseEvent) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									<X className="w-3.5 h-3.5" />
									Annuler
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
								<AlertDialogHeader>
									<AlertDialogTitle>Annuler ce rendez-vous ?</AlertDialogTitle>
									<AlertDialogDescription>
										Cette action est irreversible. Vous devrez prendre un nouveau rendez-vous.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t("common.cancel", "Retour")}</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => onCancel(apt._id)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Confirmer l'annulation
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)}
			</div>
		</Link>
	);
}
