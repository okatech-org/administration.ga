import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarDayInfo {
	date: string; // YYYY-MM-DD
	count: number;
	statuses: string[];
}

interface AgendaCalendarProps {
	currentMonth: Date;
	onMonthChange: (date: Date) => void;
	selectedDate: string | null;
	onDateSelect: (date: string) => void;
	dayInfoMap: Map<string, CalendarDayInfo>;
	today: string;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STATUS_DOT_COLORS: Record<string, string> = {
	confirmed: "bg-success",
	completed: "bg-primary",
	cancelled: "bg-destructive",
	no_show: "bg-warning",
	rescheduled: "bg-primary/60",
};

function getDaysInMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOffset(date: Date) {
	const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
	return day === 0 ? 6 : day - 1;
}

/**
 * Calendrier mois complet interactif pour iAgenda.
 * Tailles optimisees pour lisibilite.
 */
export function AgendaCalendar({
	currentMonth,
	onMonthChange,
	selectedDate,
	onDateSelect,
	dayInfoMap,
	today,
}: AgendaCalendarProps) {
	const daysInMonth = getDaysInMonth(currentMonth);
	const firstDayOffset = getFirstDayOffset(currentMonth);

	const goToPrevMonth = () =>
		onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
	const goToNextMonth = () =>
		onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

	return (
		<div className="space-y-4">
			{/* Navigation mois */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={goToPrevMonth}
					className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-foreground/[0.06] dark:hover:bg-foreground/[0.12] transition-colors text-muted-foreground"
				>
					<ChevronLeft className="w-5 h-5" />
				</button>
				<h4 className="text-base font-black capitalize tracking-tight">
					{format(currentMonth, "MMMM yyyy", { locale: fr })}
				</h4>
				<button
					type="button"
					onClick={goToNextMonth}
					className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-foreground/[0.06] dark:hover:bg-foreground/[0.12] transition-colors text-muted-foreground"
				>
					<ChevronRight className="w-5 h-5" />
				</button>
			</div>

			{/* En-tetes jours de la semaine */}
			<div className="grid grid-cols-7 gap-1.5">
				{WEEKDAY_LABELS.map((label, i) => (
					<div
						key={`wh-${i}`}
						className="h-8 flex items-center justify-center text-xs font-bold text-muted-foreground/60 uppercase"
					>
						{label}
					</div>
				))}
			</div>

			{/* Grille des jours */}
			<div className="grid grid-cols-7 gap-1.5">
				{Array.from({ length: firstDayOffset }).map((_, i) => (
					<div key={`empty-${i}`} className="aspect-square" />
				))}

				{Array.from({ length: daysInMonth }).map((_, i) => {
					const day = i + 1;
					const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const info = dayInfoMap.get(dateStr);
					const isToday = dateStr === today;
					const isSelected = dateStr === selectedDate;
					const hasAppointments = info && info.count > 0;
					const uniqueStatuses = info ? [...new Set(info.statuses)].slice(0, 3) : [];

					return (
						<button
							key={day}
							type="button"
							onClick={() => onDateSelect(dateStr)}
							className={cn(
								"aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
								isSelected
									? "bg-primary text-primary-foreground font-black"
									: isToday
										? "bg-green-500/20 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-black ring-1 ring-green-500/30"
										: hasAppointments
											? "bg-foreground/[0.04] dark:bg-foreground/[0.06] font-bold text-foreground hover:bg-foreground/[0.08]"
											: "hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.06] text-muted-foreground",
							)}
						>
							<span className="text-sm leading-none">{day}</span>

							{/* Dots indicateurs de statut */}
							{hasAppointments && !isSelected && (
								<div className="flex gap-0.5 mt-1">
									{uniqueStatuses.map((status) => (
										<span
											key={status}
											className={cn(
												"w-1.5 h-1.5 rounded-full",
												STATUS_DOT_COLORS[status] ?? "bg-primary",
											)}
										/>
									))}
								</div>
							)}

							{/* Badge count */}
							{isSelected && hasAppointments && (
								<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-black flex items-center justify-center">
									{info.count}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
