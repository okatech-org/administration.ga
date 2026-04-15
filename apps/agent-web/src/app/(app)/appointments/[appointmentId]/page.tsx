"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import { useParams, useRouter } from "next/navigation";

import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	Clock,
	FileText,
	Link as LinkIcon,
	User,
	X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CallButton } from "@/components/meetings/call-button";
import { useOrg } from "@/components/org/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { SectionHeader } from "@/components/my-space/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";


export default function AppointmentDetail() {
	const { appointmentId } = useParams();
	const router = useRouter();
	const { t } = useTranslation();
	const { activeOrgId } = useOrg();

	const { data: appointment } = useAuthenticatedConvexQuery(
		api.functions.slots.getAppointmentById,
		{
			appointmentId: appointmentId as Id<"appointments">,
		},
	);

	const { mutateAsync: cancelMutation } = useConvexMutationQuery(
		api.functions.slots.cancelAppointment,
	);
	const { mutateAsync: completeMutation } = useConvexMutationQuery(
		api.functions.slots.completeAppointment,
	);
	const { mutateAsync: noShowMutation } = useConvexMutationQuery(
		api.functions.slots.markNoShow,
	);

	const handleCancel = async () => {
		try {
			await cancelMutation({
				appointmentId: appointmentId as Id<"appointments">,
			});
			toast.success(t("dashboard.appointments.success.cancelled"));
		} catch {
			toast.error(t("dashboard.appointments.error.cancel"));
		}
	};

	const handleComplete = async () => {
		try {
			await completeMutation({
				appointmentId: appointmentId as Id<"appointments">,
			});
			toast.success(t("dashboard.appointments.success.completed"));
		} catch {
			toast.error(t("dashboard.appointments.error.complete"));
		}
	};

	const handleNoShow = async () => {
		try {
			await noShowMutation({
				appointmentId: appointmentId as Id<"appointments">,
			});
			toast.success(t("dashboard.appointments.success.noShow"));
		} catch {
			toast.error(t("dashboard.appointments.error.noShow"));
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "confirmed":
				return "default";
			case "scheduled":
				return "secondary";
			case "completed":
				return "default";
			case "cancelled":
				return "destructive";
			case "no_show":
				return "destructive";
			default:
				return "outline";
		}
	};

	if (appointment === undefined) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-[400px] w-full" />
			</div>
		);
	}

	if (!appointment) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<AlertCircle className="h-12 w-12 text-muted-foreground" />
				<p className="text-muted-foreground">
					{t("dashboard.appointments.notFound")}
				</p>
				<Button onClick={() => router.push("/appointments")}>
					{t("common.back")}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/appointments")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.appointments.detail.title")}
					</h1>
					<p className="text-muted-foreground">{appointment.date}</p>
				</div>
				{appointment.status === "confirmed" ? (
					<Badge
						variant={getStatusBadgeVariant(appointment.status)}
						className="text-sm"
					>
						{t(`dashboard.appointments.statuses.${appointment.status}`)}
					</Badge>
				) : (
					<Badge
						variant={getStatusBadgeVariant(appointment.status)}
						className="text-sm"
					>
						{t(`dashboard.appointments.statuses.${appointment.status}`)}
					</Badge>
				)}
				{/* Appel vidéo — si RDV confirmé/planifié */}
				{activeOrgId &&
					appointment.attendee?.userId &&
					appointment.status === "confirmed" && (
						<CallButton
							orgId={activeOrgId}
							participantUserId={appointment.attendee.userId}
							appointmentId={appointmentId as Id<"appointments">}
							label={t("meetings.startVideoCall")}
							variant="default"
							size="sm"
						/>
					)}
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
				<FlatCard>
					<div className="p-3 lg:p-4 space-y-2">
						<SectionHeader icon={Calendar} title={t("dashboard.appointments.detail.dateTime")} />
						<div className="flex items-center gap-2">
							<span className="font-medium">
								{t("dashboard.appointments.detail.date")}:
							</span>
							<span>{appointment.date}</span>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span>
								{appointment.time} - {appointment.endTime}
							</span>
						</div>
					</div>
				</FlatCard>

				<FlatCard>
					<div className="p-3 lg:p-4 space-y-2">
						<SectionHeader icon={User} title={t("dashboard.appointments.detail.user")} />
						{appointment.attendee ? (
							<>
								<p className="font-medium">
									{appointment.attendee.firstName}{" "}
									{appointment.attendee.lastName}
								</p>
								<p className="text-sm text-muted-foreground">
									{appointment.attendee.email}
								</p>
							</>
						) : (
							<p className="text-muted-foreground">-</p>
						)}
					</div>
				</FlatCard>

				{appointment.service && (
					<FlatCard>
						<div className="p-3 lg:p-4 space-y-2">
							<SectionHeader icon={FileText} title={t("dashboard.appointments.detail.service")} />
							<p className="font-medium">
								{appointment.service.name?.fr || "-"}
							</p>
						</div>
					</FlatCard>
				)}

				{appointment.request && (
					<FlatCard>
						<div className="p-3 lg:p-4 space-y-3">
							<SectionHeader icon={LinkIcon} title={t(
								"dashboard.appointments.detail.linkedRequest",
								"Demande associée",
							)} />
							<div className="flex items-center justify-between">
								<span className="font-medium font-mono text-sm">
									{appointment.request.reference}
								</span>
								<Badge variant="outline" className="text-[10px]">
									{t(
										`fields.requestStatus.options.${appointment.request.status}`,
									)}
								</Badge>
							</div>
							<Button
								variant="secondary"
								className="w-full text-xs h-8"
								onClick={() =>
									router.push(`/requests/${appointment.request?.reference}`)
								}
							>
								{t(
									"dashboard.appointments.detail.viewRequest",
									"Voir la demande",
								)}
							</Button>
						</div>
					</FlatCard>
				)}

				{appointment.notes && (
					<FlatCard>
						<div className="p-3 lg:p-4">
							<p className="text-sm font-medium mb-2">{t("dashboard.appointments.detail.notes")}</p>
							<p className="text-sm">{appointment.notes}</p>
						</div>
					</FlatCard>
				)}
			</div>

			{appointment.status === RequestStatus.Completed && (
				<FlatCard>
					<div className="p-3 lg:p-4 space-y-3">
						<p className="text-sm font-medium">{t("dashboard.appointments.detail.actions")}</p>
						<p className="text-xs text-muted-foreground">
							{t("dashboard.appointments.detail.actionsDescription")}
						</p>
						<div className="flex flex-wrap gap-2">
						<Button variant="secondary" onClick={handleComplete}>
							<Clock className="mr-2 h-4 w-4" />
							{t("dashboard.appointments.complete")}
						</Button>
						<Button variant="outline" onClick={handleNoShow}>
							<AlertCircle className="mr-2 h-4 w-4" />
							{t("dashboard.appointments.noShow")}
						</Button>
						{appointment.status === RequestStatus.Completed && (
							<Button variant="destructive" onClick={handleCancel}>
								<X className="mr-2 h-4 w-4" />
								{t("dashboard.appointments.cancel")}
							</Button>
						)}
						</div>
					</div>
				</FlatCard>
			)}
		</div>
	);
}
