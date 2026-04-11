"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";

import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	Clock,
	FileText,
	Info,
	Link as LinkIcon,
	MapPin,
	User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

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
				</div>
			</div>
		</div>
	);
}
