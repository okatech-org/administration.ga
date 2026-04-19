"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, Loader2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function AgentRescheduleAppointmentPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const { appointmentId } = useParams<{ appointmentId: string }>();

	const { data: appointment } = useAuthenticatedConvexQuery(
		api.functions.slots.getAppointmentById,
		{ appointmentId: appointmentId as Id<"appointments"> },
	);

	const [date, setDate] = useState<string>("");
	const [startTime, setStartTime] = useState<string>("");
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const appointmentType = useMemo(
		() => appointment?.appointmentType ?? "deposit",
		[appointment],
	);

	const { data: availableSlots } = useAuthenticatedConvexQuery(
		api.functions.slots.computeAvailableSlots,
		appointment && appointment.orgServiceId && date
			? {
					orgId: appointment.orgId,
					orgServiceId: appointment.orgServiceId,
					date,
					appointmentType,
				}
			: "skip",
	);

	const { mutateAsync: rescheduleAppointment } = useConvexMutationQuery(
		api.functions.slots.rescheduleAppointment,
	);

	if (appointment === undefined) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-[400px] w-full" />
			</div>
		);
	}

	if (!appointment || !appointment.orgServiceId) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<p className="text-muted-foreground">
					{t("appointments.reschedule.notFound")}
				</p>
				<Button onClick={() => router.back()}>{t("common.back")}</Button>
			</div>
		);
	}

	const handleSubmit = async () => {
		if (!date || !startTime) return;
		setIsSubmitting(true);
		try {
			await rescheduleAppointment({
				appointmentId: appointmentId as Id<"appointments">,
				newDate: date,
				newStartTime: startTime,
				reason: reason || undefined,
			});
			toast.success(t("appointments.reschedule.success"));
			router.push(`/appointments/${appointmentId}`);
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : t("appointments.reschedule.error"),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-4xl mx-auto w-full">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push(`/appointments/${appointmentId}`)}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold tracking-tight">
						{t("appointments.reschedule.title")}
					</h1>
					<p className="text-muted-foreground">{appointment.org?.name}</p>
				</div>
			</div>

			<FlatCard className="bg-muted/40">
				<div className="p-3 lg:p-4">
					<h3 className="flex items-center gap-2 font-semibold text-sm">
						<RotateCcw className="h-4 w-4" />
						{t("appointments.reschedule.currentSlot")}
					</h3>
					<div className="mt-3 flex flex-col gap-2 text-sm">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium">
								{format(
									new Date(appointment.date + "T00:00:00"),
									"EEEE d MMMM yyyy",
									{ locale: fr },
								)}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium">
								{appointment.time} - {appointment.endTime}
							</span>
						</div>
					</div>
				</div>
			</FlatCard>

			<FlatCard>
				<div className="p-3 lg:p-4 space-y-4">
					<h3 className="font-semibold">
						{t("appointments.reschedule.newSlot")}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="new-date">
								{t("dashboard.appointments.detail.date")}
							</Label>
							<Input
								id="new-date"
								type="date"
								value={date}
								min={new Date().toISOString().split("T")[0]}
								onChange={(e) => {
									setDate(e.target.value);
									setStartTime("");
								}}
							/>
						</div>
					</div>

					{date && availableSlots && (
						<div className="space-y-2">
							<Label>{t("appointments.availableSlots")}</Label>
							{availableSlots.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{t("appointments.noSlotsForDate")}
								</p>
							) : (
								<div className="flex flex-wrap gap-2">
									{availableSlots.map((slot) => (
										<button
											type="button"
											key={slot.startTime}
											onClick={() => setStartTime(slot.startTime)}
											className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
												startTime === slot.startTime
													? "border-primary bg-primary text-primary-foreground"
													: "hover:bg-muted"
											}`}
										>
											{slot.startTime}
										</button>
									))}
								</div>
							)}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="reason">
							{t("appointments.reschedule.reason")}
						</Label>
						<Textarea
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder={t("appointments.reschedule.reasonPlaceholder")}
							rows={3}
						/>
					</div>

					<div className="flex gap-3 justify-end">
						<Button variant="outline" onClick={() => router.back()}>
							{t("common.cancel")}
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={!date || !startTime || isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("common.loading")}
								</>
							) : (
								<>
									<RotateCcw className="mr-2 h-4 w-4" />
									{t("appointments.reschedule.confirmButton")}
								</>
							)}
						</Button>
					</div>
				</div>
			</FlatCard>
		</div>
	);
}
