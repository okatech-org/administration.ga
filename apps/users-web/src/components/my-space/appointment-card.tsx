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
 * Card rendez-vous — design iProfil, tailles lisibles.
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

	return (
		<Link
			href={`/my-space/appointments/${apt._id}`}
			className="block"
		>
			<div className={cn(
				"flex flex-col gap-2.5 p-3 lg:p-4 rounded-xl transition-colors",
				past
					? "bg-muted hover:bg-muted/80"
					: statusInfo.tintBg,
			)}>
				{/* Row 1 : Icon + titre + badges */}
				<div className="flex items-start gap-3">
					<div className={cn(
						"p-1.5 lg:p-2 rounded-lg shrink-0",
						past
							? "bg-foreground/[0.06] dark:bg-foreground/[0.12]"
							: apt.status === "confirmed"
								? "bg-amber-500/10"
								: "bg-foreground/[0.06] dark:bg-foreground/[0.12]",
					)}>
						<Calendar className={cn("h-5 w-5", past ? "text-muted-foreground" : statusInfo.iconColor)} />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-bold leading-snug text-foreground line-clamp-2">
							{apt.org?.name || "Rendez-vous consulaire"}
						</p>
						{apt.org?.address?.city && !compact && (
							<p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
								<MapPin className="w-3 h-3 shrink-0" />
								{apt.org.address.city}
							</p>
						)}
					</div>
					<div className="flex flex-col items-end gap-1 shrink-0">
						{reminder && (
							<span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", reminder.className)}>
								{reminder.label}
							</span>
						)}
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
				</div>

				{/* Row 2 : Date + heure + type */}
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
					<span className="font-semibold text-foreground/80">
						{format(new Date(apt.date + "T00:00:00"), "dd MMM yyyy", { locale: fr })}
					</span>
					<span className="flex items-center gap-1.5">
						<Clock className="w-3.5 h-3.5" />
						{apt.time}
						{apt.endTime && ` — ${apt.endTime}`}
					</span>
					{apt.appointmentType && (
						<span className="flex items-center gap-1.5">
							{apt.appointmentType === "deposit" ? <Package className="w-3.5 h-3.5" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
							{TYPE_LABELS[apt.appointmentType]}
						</span>
					)}
					{apt.requestId && (
						<span className="flex items-center gap-1.5 text-primary dark:text-primary">
							<FileText className="w-3.5 h-3.5" />
							Demande liee
						</span>
					)}
				</div>

				{/* Notes */}
				{apt.notes && !compact && (
					<p className="text-xs text-muted-foreground bg-foreground/[0.04] dark:bg-foreground/[0.06] rounded-lg p-2.5 line-clamp-2">
						{apt.notes}
					</p>
				)}

				{/* Actions */}
				{showActions && isCancellable && onCancel && !past && (
					<div className="flex items-center gap-2 pt-0.5">
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
