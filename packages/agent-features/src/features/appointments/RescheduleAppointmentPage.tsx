"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "@workspace/routing";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, Loader2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";

export default function AgentRescheduleAppointmentPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const { appointmentId } = useParams() as { appointmentId: string };

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

	// ─── iAsted page context ──────────────────────────────
	const pageEntities: PageEntity[] = [
		...(appointment
			? [
				{
					id: appointment._id,
					type: "appointment-current",
					label: `RDV courant ${appointment.date} ${appointment.time}`,
					data: {
						date: appointment.date,
						time: appointment.time,
						status: appointment.status,
						serviceId: appointment.orgServiceId,
						appointmentType: appointment.appointmentType,
					},
				} as PageEntity,
			]
			: []),
		...((availableSlots as any[] | undefined) ?? [])
			.slice(0, 20)
			.map((slot: any) => ({
				id: `${date}T${slot.startTime}`,
				type: "available-slot" as const,
				label: `${date} ${slot.startTime}`,
				data: {
					startTime: slot.startTime,
					selected: slot.startTime === startTime,
				},
			})),
	];
	const pageActions: PageAction[] = [
		{
			id: "appointment-reschedule.set_date",
			label: "Choisir une nouvelle date",
			description: "params.date au format YYYY-MM-DD.",
			params: { date: { type: "string" } },
		},
		{
			id: "appointment-reschedule.select_slot",
			label: "Choisir un créneau",
			description: "params.startTime requis (HH:MM).",
			params: { startTime: { type: "string" } },
		},
		{
			id: "appointment-reschedule.set_reason",
			label: "Indiquer le motif",
			description: "params.reason (string).",
			params: { reason: { type: "string" } },
		},
		{
			id: "appointment-reschedule.submit",
			label: "Confirmer la reprogrammation",
			description:
				"Reprogramme le rendez-vous avec la nouvelle date et le créneau choisis.",
			requiresConfirmation: true,
		},
	];
	usePageContext({
		module: "appointment-reschedule",
		title: "Reprogrammer un rendez-vous",
		summary: appointment
			? `RDV du ${appointment.date} ${appointment.time} → ${date || "(nouvelle date)"} ${startTime || ""}${reason ? ` · Motif: « ${reason} »` : ""}.`
			: "Chargement du rendez-vous…",
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("appointment-reschedule.set_date", async (params) => {
		const d = params?.date as string | undefined;
		if (!d) throw new Error("date requise");
		setDate(d);
		return { success: true };
	});
	useRegisterPageAction(
		"appointment-reschedule.select_slot",
		async (params) => {
			const st = params?.startTime as string | undefined;
			if (!st) throw new Error("startTime requis");
			setStartTime(st);
			return { success: true };
		},
	);
	useRegisterPageAction("appointment-reschedule.set_reason", async (params) => {
		setReason(String(params?.reason ?? ""));
		return { success: true };
	});
	useRegisterPageAction("appointment-reschedule.submit", async () => {
		await handleSubmit();
		return { success: true };
	});

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
