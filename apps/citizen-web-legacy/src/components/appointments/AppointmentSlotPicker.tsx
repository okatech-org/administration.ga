"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Check, Clock, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

/**
 * Selected dynamic slot: no slotId, just date + time
 */
export interface DynamicSlotSelection {
	date: string; // YYYY-MM-DD
	startTime: string; // HH:mm
	endTime: string; // HH:mm
}

interface AppointmentSlotPickerProps {
	orgId: Id<"orgs">;
	orgServiceId: Id<"orgServices">;
	appointmentType?: "deposit" | "pickup";
	onSlotSelected: (slot: DynamicSlotSelection | null) => void;
	selectedSlot: DynamicSlotSelection | null;
}

export function AppointmentSlotPicker({
	orgId,
	orgServiceId,
	appointmentType = "deposit",
	onSlotSelected,
	selectedSlot,
}: AppointmentSlotPickerProps) {
	const { t } = useTranslation();
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	});

	// Get available dates for the month (lightweight query for calendar highlights)
	const { data: availableDates, isPending: isLoadingDates } =
		useAuthenticatedConvexQuery(api.functions.slots.computeAvailableDates, {
			orgId,
			orgServiceId,
			month: selectedMonth,
			appointmentType,
		});

	// Get available time slots for the selected date
	const { data: daySlots, isPending: isLoadingSlots } =
		useAuthenticatedConvexQuery(
			api.functions.slots.computeAvailableSlots,
			selectedDate
				? { orgId, orgServiceId, date: selectedDate, appointmentType }
				: "skip",
		);

	// Available dates as a Set for fast lookup
	const availableDateSet = useMemo(() => {
		return new Set(availableDates ?? []);
	}, [availableDates]);

	// Calendar days for the selected month
	const calendarDays = useMemo(() => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const firstDay = new Date(year, month - 1, 1);
		const lastDay = new Date(year, month, 0);
		const daysInMonth = lastDay.getDate();
		const startPad = firstDay.getDay();
		const today = new Date().toISOString().split("T")[0];

		const days: {
			date: string;
			day: number;
			isCurrentMonth: boolean;
			isPast: boolean;
			hasSlots: boolean;
		}[] = [];

		for (let i = 0; i < startPad; i++) {
			days.push({
				date: `pad-${i}`,
				day: 0,
				isCurrentMonth: false,
				isPast: false,
				hasSlots: false,
			});
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			days.push({
				date: dateStr,
				day: d,
				isCurrentMonth: true,
				isPast: dateStr < today,
				hasSlots: availableDateSet.has(dateStr),
			});
		}

		return days;
	}, [selectedMonth, availableDateSet]);

	const handlePrevMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const prev =
			month === 1 ? new Date(year - 1, 11, 1) : new Date(year, month - 2, 1);
		setSelectedMonth(
			`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
		);
	};

	const handleNextMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const next =
			month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
		setSelectedMonth(
			`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
		);
	};

	const formatMonthYear = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
			month: "long",
			year: "numeric",
		});
	};

	const handleSelectDate = (date: string) => {
		setSelectedDate(date);
		onSlotSelected(null);
	};

	const handleSelectSlot = (slot: { startTime: string; endTime: string }) => {
		onSlotSelected({
			date: selectedDate,
			startTime: slot.startTime,
			endTime: slot.endTime,
		});
	};

	if (isLoadingDates) {
		return (
			<Card>
				<CardContent className="py-8 flex justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</CardContent>
			</Card>
		);
	}

	// Cast daySlots to the right shape (convex skip conditional returns never[])
	const slots = (daySlots ?? []) as {
		startTime: string;
		endTime: string;
		availableCount: number;
	}[];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2">
					<Calendar className="h-5 w-5" />
					{t("appointments.selectSlot")}
				</CardTitle>
				<CardDescription>{t("appointments.slotRequired")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* If slot already selected, show confirmation */}
				{selectedSlot && (
					<div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
									<Check className="h-5 w-5 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<p className="font-medium text-green-800 dark:text-green-300">
										{t("appointments.slotSelected")}
									</p>
									<p className="text-sm text-green-700 dark:text-green-400">
										{format(new Date(selectedSlot.date), "EEEE d MMMM yyyy", {
											locale: fr,
										})}{" "}
										à {selectedSlot.startTime}
									</p>
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									onSlotSelected(null);
									setSelectedDate("");
								}}
							>
								{t("common.change")}
							</Button>
						</div>
					</div>
				)}

				{/* Calendar - hide if slot is selected */}
				{!selectedSlot && (
					<>
						{/* Calendar Navigation */}
						<div className="flex items-center justify-between">
							<Button variant="outline" size="sm" onClick={handlePrevMonth}>
								←
							</Button>
							<span className="font-medium capitalize">
								{formatMonthYear()}
							</span>
							<Button variant="outline" size="sm" onClick={handleNextMonth}>
								→
							</Button>
						</div>

						{/* Calendar Grid */}
						<div className="grid grid-cols-7 gap-1 text-center text-sm">
							{["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => (
								<div
									key={day}
									className="py-2 font-medium text-muted-foreground text-xs"
								>
									{day}
								</div>
							))}
							{calendarDays.map((day) => (
								<button
									key={day.date}
									type="button"
									disabled={!day.isCurrentMonth || day.isPast || !day.hasSlots}
									onClick={() => day.hasSlots && handleSelectDate(day.date)}
									className={`
                    p-2 rounded-md text-sm transition-colors
                    ${!day.isCurrentMonth ? "text-transparent" : ""}
                    ${day.isPast ? "text-muted-foreground/30" : ""}
                    ${
											day.hasSlots && !day.isPast
												? "bg-primary/10 text-primary hover:bg-primary/20 font-medium cursor-pointer"
												: "cursor-default"
										}
                    ${selectedDate === day.date ? "ring-2 ring-primary" : ""}
                  `}
								>
									{day.day || ""}
								</button>
							))}
						</div>

						{/* Time Slots for selected date */}
						{selectedDate && (
							<div className="pt-4 border-t">
								<p className="text-sm font-medium mb-3">
									{t("appointments.availableSlots")}{" "}
									{format(new Date(selectedDate), "d MMMM", { locale: fr })}
								</p>
								{isLoadingSlots ? (
									<div className="flex justify-center py-4">
										<Loader2 className="h-5 w-5 animate-spin text-amber-600" />
									</div>
								) : slots.length > 0 ? (
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
										{slots.map((slot) => {
											const isSelected =
												(selectedSlot as DynamicSlotSelection | null)
													?.startTime === slot.startTime &&
												(selectedSlot as DynamicSlotSelection | null)?.date ===
													selectedDate;
											return (
												<button
													key={slot.startTime}
													type="button"
													onClick={() => handleSelectSlot(slot)}
													className={`
                            p-3 rounded-lg border text-center transition-all
                            ${
															isSelected
																? "border-primary bg-primary/10 ring-2 ring-primary"
																: "hover:border-primary/50 hover:bg-muted/50"
														}
                          `}
												>
													<div className="flex items-center justify-center gap-1 font-medium text-sm">
														<Clock className="h-3.5 w-3.5" />
														{slot.startTime}
													</div>
													<div className="text-xs text-muted-foreground">
														→ {slot.endTime}
													</div>
													<Badge
														variant="outline"
														className="mt-1.5 text-[10px]"
													>
														{slot.availableCount} place(s)
													</Badge>
												</button>
											);
										})}
									</div>
								) : (
									<p className="text-center text-muted-foreground py-4">
										{t("appointments.noSlotsForDate")}
									</p>
								)}
							</div>
						)}

						{/* No dates message */}
						{availableDates?.length === 0 && (
							<p className="text-center text-muted-foreground py-4">
								{t("appointments.noSlotsAvailable")}
							</p>
						)}

						{/* Legend */}
						<div className="flex items-center gap-4 text-xs text-muted-foreground justify-center pt-2">
							<div className="flex items-center gap-1">
								<div className="h-3 w-3 rounded bg-primary/10" />
								<span>{t("appointments.available")}</span>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
