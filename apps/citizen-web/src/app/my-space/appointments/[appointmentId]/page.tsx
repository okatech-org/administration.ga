"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";

import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	CalendarPlus,
	Clock,
	FileText,
	Info,
	Link as LinkIcon,
	MapPin,
	RotateCcw,
	User,
	Video,
	X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function AppointmentDetail() {
	const { appointmentId } = useParams<{ appointmentId: string }>();
	const router = useRouter();
	const { t, i18n } = useTranslation();

	const { data: appointment } = useAuthenticatedConvexQuery(
		api.functions.slots.getAppointmentById,
		{
			appointmentId: appointmentId as Id<"appointments">,
		},
	);

	const { mutateAsync: cancelAppointment, isPending: isCancelling } =
		useConvexMutationQuery(api.functions.slots.cancelAppointment);

	const { data: icalData } = useAuthenticatedConvexQuery(
		api.functions.slots.createIcalToken,
		appointment && appointment.status !== "cancelled"
			? { appointmentId: appointmentId as Id<"appointments"> }
			: "skip",
	);

	const handleCancel = async () => {
		try {
			await cancelAppointment({
				appointmentId: appointmentId as Id<"appointments">,
			});
			toast.success(t("appointments.cancelled"));
			router.push("/my-space/iagenda?tab=mes-rdv");
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : t("appointments.cancelError"),
			);
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
			<div key="skeleton" className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-[400px] w-full" />
			</div>
		);
	}

	if (!appointment) {
		return (
			<div
				key="not-found"
				className="flex flex-1 flex-col items-center justify-center gap-4 p-4"
			>
				<AlertCircle className="h-12 w-12 text-muted-foreground" />
				<p className="text-muted-foreground">
					{t("dashboard.appointments.notFound")}
				</p>
				<Button onClick={() => router.push("/")}>
					{t("common.back")}
				</Button>
			</div>
		);
	}

	return (
		<div key="content" className="flex flex-1 flex-col gap-4 p-4 md:p-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.appointments.detail.title")}
					</h1>
					<p className="text-muted-foreground">
						{new Date(appointment.date + "T00:00:00").toLocaleDateString(
							i18n.language === "fr" ? "fr-FR" : "en-US",
							{
								weekday: "long",
								day: "numeric",
								month: "long",
								year: "numeric",
							},
						)}
					</p>
				</div>
				<Badge
					variant={getStatusBadgeVariant(appointment.status)}
					className="text-sm"
				>
					{t(`dashboard.appointments.statuses.${appointment.status}`)}
				</Badge>
			</div>

			<div className="grid gap-6 md:grid-cols-3 max-w-6xl">
				{/* Left Column: Main Details */}
				<div className="md:col-span-2 space-y-6">
					{appointment.request && (
						<FlatCard>
							<div className="p-3 lg:p-4 pb-0">
								<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
									<LinkIcon className="h-5 w-5" />
									<span>
										{t("dashboard.appointments.detail.linkedRequest")}
									</span>
								</h3>
							</div>
							<div className="p-3 lg:p-4 space-y-3">
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
										router.push(
											`/my-space/requests/${appointment.request?.reference}`,
										)
									}
								>
									{t("dashboard.appointments.detail.viewRequest")}
								</Button>
							</div>
						</FlatCard>
					)}

					{((appointment.appointmentType === "deposit" &&
						appointment.orgService?.depositInstructions) ||
						(appointment.appointmentType === "pickup" &&
							appointment.orgService?.pickupInstructions)) && (
						<FlatCard className="bg-primary/5">
							<div className="p-3 lg:p-4 pb-0">
								<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight text-primary">
									<Info className="h-5 w-5" />
									<span>
										{t("dashboard.appointments.detail.instructionsTitle")}
									</span>
								</h3>
							</div>
							<div className="p-3 lg:p-4">
								<p className="text-sm whitespace-pre-wrap">
									{appointment.appointmentType === "deposit"
										? appointment.orgService.depositInstructions
										: appointment.orgService.pickupInstructions}
								</p>
							</div>
						</FlatCard>
					)}

					{appointment.org && (
						<FlatCard>
							<div className="p-3 lg:p-4 pb-0">
								<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
									<MapPin className="h-5 w-5" />
									<span>{t("dashboard.appointments.detail.location")}</span>
								</h3>
							</div>
							<div className="p-3 lg:p-4 space-y-4">
								<div>
									<p className="font-medium">{appointment.org.name}</p>
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										<span>{appointment.org.address?.street}</span>
										<br />
										<span>
											{`${appointment.org.address?.postalCode || ""} ${appointment.org.address?.city || ""}`.trim()}
										</span>
										<br />
										<span>{appointment.org.address?.country}</span>
									</p>
								</div>
								{appointment.org.address &&
									(() => {
										const address = appointment.org?.address;
										let mapUrl = "";
										if (
											address?.coordinates?.lat &&
											address?.coordinates?.lng
										) {
											mapUrl = `https://www.google.com/maps/search/?api=1&query=${address.coordinates.lat},${address.coordinates.lng}`;
										} else if (address) {
											const query = `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`;
											mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
										}
										return mapUrl ? (
											<Button variant="outline" className="w-full" asChild>
												<a
													href={mapUrl}
													target="_blank"
													rel="noopener noreferrer"
												>
													<MapPin className="mr-2 h-4 w-4" />
													<span>
														{t("dashboard.appointments.detail.itinerary")}
													</span>
												</a>
											</Button>
										) : null;
									})()}
							</div>
						</FlatCard>
					)}

					{appointment.notes && (
						<FlatCard>
							<div className="p-3 lg:p-4 pb-0">
								<h3 className="font-semibold leading-none tracking-tight">
									{t("dashboard.appointments.detail.notes")}
								</h3>
							</div>
							<div className="p-3 lg:p-4">
								<p className="text-sm">{appointment.notes}</p>
							</div>
						</FlatCard>
					)}
				</div>

				{/* Right Column: Metadata */}
				<div className="space-y-6">
					<FlatCard>
						<div className="p-3 lg:p-4 pb-0">
							<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
								<Calendar className="h-5 w-5" />
								<span>{t("dashboard.appointments.detail.dateTime")}</span>
							</h3>
						</div>
						<div className="p-3 lg:p-4 space-y-2">
							<div className="flex items-center justify-between">
								<span className="font-medium text-muted-foreground">
									{t("dashboard.appointments.detail.date")}:
								</span>
								<span className="font-medium">
									{new Date(appointment.date + "T00:00:00").toLocaleDateString(
										i18n.language === "fr" ? "fr-FR" : "en-US",
										{ day: "numeric", month: "long", year: "numeric" },
									)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="flex items-center gap-2 text-muted-foreground">
									<Clock className="h-4 w-4" />
									<span>{t("dashboard.appointments.detail.time")}</span>
								</span>
								<span className="font-medium">
									{appointment.time} - {appointment.endTime}
								</span>
							</div>
						</div>
					</FlatCard>

					<FlatCard>
						<div className="p-3 lg:p-4 pb-0">
							<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
								<User className="h-5 w-5" />
								<span>{t("dashboard.appointments.detail.user")}</span>
							</h3>
						</div>
						<div className="p-3 lg:p-4 space-y-2">
							{appointment.attendee ? (
								<div className="flex flex-col">
									<p className="font-medium">
										{`${appointment.attendee.firstName} ${appointment.attendee.lastName}`}
									</p>
									<p className="text-sm text-muted-foreground">
										{appointment.attendee.email}
									</p>
								</div>
							) : (
								<p className="text-muted-foreground">-</p>
							)}
						</div>
					</FlatCard>

					{appointment.service && (
						<FlatCard>
							<div className="p-3 lg:p-4 pb-0">
								<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
									<FileText className="h-5 w-5" />
									<span>{t("dashboard.appointments.detail.service")}</span>
								</h3>
							</div>
							<div className="p-3 lg:p-4">
								<p className="font-medium">
									{appointment.service.name?.fr || "-"}
								</p>
							</div>
						</FlatCard>
					)}

					{(() => {
						const today = new Date().toISOString().split("T")[0];
						const isFuture = appointment.date >= today;
						const isActive =
							appointment.status === "confirmed" ||
							appointment.status === "pending";
						if (!isFuture || !isActive) return null;
						const isRemote = appointment.mode === "remote";
						return (
							<FlatCard>
								<div className="p-3 lg:p-4 pb-0">
									<h3 className="font-semibold leading-none tracking-tight">
										{t("common.actions", "Actions")}
									</h3>
								</div>
								<div className="p-3 lg:p-4 flex flex-col gap-2">
									{isRemote && (
										<Button asChild className="w-full">
											<Link
												href={`/my-space/appointments/${appointment._id}/join`}
											>
												<Video className="mr-2 h-4 w-4" />
												{t("appointments.actions.joinVideo")}
											</Link>
										</Button>
									)}
									<Button variant="outline" className="w-full" asChild>
										<Link
											href={`/my-space/appointments/${appointment._id}/reschedule`}
										>
											<RotateCcw className="mr-2 h-4 w-4" />
											{t("appointments.actions.reschedule")}
										</Link>
									</Button>
									{icalData?.url && (
										<Button variant="outline" className="w-full" asChild>
											<a href={icalData.url} download>
												<CalendarPlus className="mr-2 h-4 w-4" />
												{t("appointments.actions.addToCalendar")}
											</a>
										</Button>
									)}
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="outline"
												className="w-full text-destructive hover:text-destructive"
											>
												<X className="mr-2 h-4 w-4" />
												{t("appointments.actions.cancel")}
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													{t("appointments.cancelConfirmTitle")}
												</AlertDialogTitle>
												<AlertDialogDescription>
													{t("appointments.cancelConfirmDesc")}
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>
													{t("common.cancel")}
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={handleCancel}
													disabled={isCancelling}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													{t("appointments.confirmCancel")}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</FlatCard>
						);
					})()}
				</div>
			</div>
		</div>
	);
}
