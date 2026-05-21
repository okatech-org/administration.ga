"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Check, Clock, Loader2, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AppointmentSlotPicker,
	type DynamicSlotSelection,
} from "@/components/appointments/AppointmentSlotPicker";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function RescheduleAppointmentPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const { appointmentId } = useParams<{ appointmentId: string }>();

	const { data: appointment } = useAuthenticatedConvexQuery(
		api.functions.slots.getAppointmentById,
		{ appointmentId: appointmentId as Id<"appointments"> },
	);

	const { mutateAsync: rescheduleAppointment } = useConvexMutationQuery(
		api.functions.slots.rescheduleAppointment,
	);

	const [selectedSlot, setSelectedSlot] = useState<DynamicSlotSelection | null>(
		null,
	);
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

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
				<Button onClick={() => router.push("/my-space/iagenda")}>
					{t("common.back")}
				</Button>
			</div>
		);
	}

	const handleReschedule = async () => {
		if (!selectedSlot) return;
		setIsSubmitting(true);
		try {
			await rescheduleAppointment({
				appointmentId: appointmentId as Id<"appointments">,
				newDate: selectedSlot.date,
				newStartTime: selectedSlot.startTime,
				reason: reason || undefined,
			});
			toast.success(t("appointments.reschedule.success"));
			router.push("/my-space/iagenda?tab=mes-rdv");
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : t("appointments.reschedule.error"),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			<PageHeader
				title={t("appointments.reschedule.title")}
				subtitle={
					appointment.org ? (
						<span className="flex items-center gap-1">
							<MapPin className="h-4 w-4" />
							{appointment.org.name}
						</span>
					) : undefined
				}
				showBackButton
				onBack={() => router.push(`/my-space/appointments/${appointmentId}`)}
			/>

			<FlatCard className="bg-muted/40">
				<div className="p-3 lg:p-4">
					<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight text-sm">
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

			<AppointmentSlotPicker
				orgId={appointment.orgId}
				orgServiceId={appointment.orgServiceId}
				appointmentType={appointment.appointmentType ?? "deposit"}
				onSlotSelected={setSelectedSlot}
				selectedSlot={selectedSlot}
			/>

			{selectedSlot && (
				<FlatCard>
					<div className="p-3 lg:p-4 pb-0">
						<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
							<Check className="h-5 w-5" />
							{t("appointments.reschedule.confirm")}
						</h3>
						<p className="text-sm text-muted-foreground mt-1.5">
							{t("appointments.reschedule.confirmDesc")}
						</p>
					</div>
					<div className="p-3 lg:p-4 space-y-6">
						<div className="bg-muted/50 p-4 rounded-lg space-y-3">
							<div className="flex items-center gap-3">
								<Calendar className="h-5 w-5 text-primary" />
								<p className="font-medium">
									{format(new Date(selectedSlot.date), "EEEE d MMMM yyyy", {
										locale: fr,
									})}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Clock className="h-5 w-5 text-primary" />
								<p className="font-medium">
									{selectedSlot.startTime} - {selectedSlot.endTime}
								</p>
							</div>
						</div>

						<div className="space-y-2">
							<Label>{t("appointments.reschedule.reason")}</Label>
							<Textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder={t("appointments.reschedule.reasonPlaceholder")}
								rows={3}
							/>
						</div>

						<div className="flex gap-3">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setSelectedSlot(null)}
							>
								{t("common.back")}
							</Button>
							<Button
								className="flex-1"
								onClick={handleReschedule}
								disabled={isSubmitting}
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
			)}
		</div>
	);
}
