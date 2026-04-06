import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, Loader2, MapPin, X } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/components/my-space/page-header";
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
import { Card, CardContent } from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

export const Route = createFileRoute("/my-space/appointments/")({
	component: AppointmentsPage,
});

function AppointmentsPage() {
	const { t } = useTranslation();

	// Use the new slots-based appointments query
	const { data: appointments, isPending } = useAuthenticatedConvexQuery(
		api.functions.slots.listMyAppointments,
		{},
	);

	const { mutateAsync: cancelAppointment } = useConvexMutationQuery(
		api.functions.slots.cancelAppointment,
	);

	const handleCancel = async (appointmentId: Id<"appointments">) => {
		try {
			await cancelAppointment({ appointmentId });
			captureEvent("myspace_appointment_cancelled");
			toast.success(t("appointments.cancelled"));
		} catch {
			toast.error(t("appointments.cancelError"));
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "confirmed":
				return (
					<Badge className="bg-green-500 hover:bg-green-600">
						{t("appointments.status.confirmed")}
					</Badge>
				);
			case "completed":
				return (
					<Badge variant="outline">{t("appointments.status.completed")}</Badge>
				);
			case "cancelled":
				return (
					<Badge variant="destructive">
						{t("appointments.status.cancelled")}
					</Badge>
				);
			case "no_show":
				return (
					<Badge variant="destructive">{t("appointments.status.noShow")}</Badge>
				);
			case "rescheduled":
				return (
					<Badge className="bg-amber-500 hover:bg-amber-600">
						{t("appointments.status.rescheduled")}
					</Badge>
				);
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	if (isPending) {
		return (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin h-8 w-8 text-primary" />
			</div>
		);
	}

	// Separate upcoming and past appointments
	const now = new Date().toISOString().split("T")[0];
	const upcomingAppointments =
		appointments?.filter(
			(apt) => apt.date >= now && apt.status !== "cancelled",
		) || [];
	const pastAppointments =
		appointments?.filter(
			(apt) => apt.date < now || apt.status === "cancelled",
		) || [];

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("mySpace.screens.appointments.heading")}
				subtitle={t("mySpace.screens.appointments.subtitle")}
				icon={<Calendar className="h-6 w-6 text-primary" />}
				actions={
					<Button asChild>
						<Link to="/my-space/appointments/new">
							<Calendar className="mr-2 h-4 w-4" />
							{t("appointments.newButton")}
						</Link>
					</Button>
				}
			/>

			{/* Upcoming Appointments */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.1 }}
			>
				<h2 className="text-lg font-semibold mb-4">
					{t("appointments.upcoming")}
				</h2>
				<div className="grid gap-4">
					{upcomingAppointments.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
								<Calendar className="h-12 w-12 mb-4 opacity-20" />
								<p>{t("appointments.empty")}</p>
							</CardContent>
						</Card>
					) : (
						upcomingAppointments.map((apt) => (
							<Link
								key={apt._id}
								to="/my-space/appointments/$appointmentId"
								params={{ appointmentId: apt._id }}
								className="block transition-transform hover:scale-[1.01] active:scale-[0.99]"
							>
								<Card className="overflow-hidden">
									<div className="flex flex-col sm:flex-row border-l-4 border-l-primary h-full">
										<div className="bg-muted p-4 flex flex-col items-center justify-center min-w-[120px] text-center border-b sm:border-b-0 sm:border-r">
											<span className="text-3xl font-bold text-primary">
												{format(new Date(apt.date), "dd", { locale: fr })}
											</span>
											<span className="text-sm uppercase font-medium text-muted-foreground">
												{format(new Date(apt.date), "MMM yyyy", { locale: fr })}
											</span>
											<div className="mt-2 flex items-center gap-1 text-sm font-semibold">
												<Clock className="h-3 w-3" />
												{apt.time}
											</div>
										</div>
										<div className="flex-1 p-4 sm:p-6 flex flex-col justify-between gap-4">
											<div>
												<div className="flex justify-between items-start mb-2">
													<h3 className="font-semibold text-lg">
														{t("appointments.consularAppointment")}
													</h3>
													{getStatusBadge(apt.status)}
												</div>
												{apt.org && (
													<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
														<MapPin className="h-4 w-4" />
														<span>
															{apt.org.name}
															{apt.org.address && ` — ${apt.org.address.city}`}
														</span>
													</div>
												)}
												{apt.endTime && (
													<p className="text-xs text-muted-foreground">
														{apt.time} - {apt.endTime}
													</p>
												)}
												{apt.notes && (
													<p className="text-sm mt-3 bg-muted/50 p-2 rounded-md italic">
														"{apt.notes}"
													</p>
												)}
											</div>

											{apt.status === "confirmed" && (
												<div className="flex justify-end">
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button
																variant="outline"
																size="sm"
																className="text-destructive hover:text-destructive"
																onClick={(e) => {
																	// Prevent navigation when clicking the cancel button
																	e.preventDefault();
																	e.stopPropagation();
																}}
															>
																<X className="mr-2 h-4 w-4" />
																{t("appointments.cancel")}
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent
															onClick={(e) => e.stopPropagation()}
														>
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
																	onClick={() => handleCancel(apt._id)}
																	className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																>
																	{t("appointments.confirmCancel")}
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</div>
											)}
										</div>
									</div>
								</Card>
							</Link>
						))
					)}
				</div>
			</motion.div>

			{/* Past Appointments */}
			{pastAppointments.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.2 }}
				>
					<h2 className="text-lg font-semibold mb-4 text-muted-foreground">
						{t("appointments.past")}
					</h2>
					<div className="grid gap-4 opacity-70">
						{pastAppointments.map((apt) => (
							<Link
								key={apt._id}
								to="/my-space/appointments/$appointmentId"
								params={{ appointmentId: apt._id }}
								className="block transition-transform hover:scale-[1.01] active:scale-[0.99]"
							>
								<Card className="overflow-hidden">
									<div className="flex flex-col sm:flex-row border-l-4 border-l-muted h-full">
										<div className="bg-muted/50 p-4 flex flex-col items-center justify-center min-w-[120px] text-center border-b sm:border-b-0 sm:border-r">
											<span className="text-2xl font-bold text-muted-foreground">
												{format(new Date(apt.date), "dd", { locale: fr })}
											</span>
											<span className="text-xs uppercase font-medium text-muted-foreground">
												{format(new Date(apt.date), "MMM yyyy", { locale: fr })}
											</span>
											<div className="mt-2 flex items-center gap-1 text-xs">
												<Clock className="h-3 w-3" />
												{apt.time}
											</div>
										</div>
										<div className="flex-1 p-4 flex items-center justify-between">
											<div>
												<h3 className="font-medium">
													{t("appointments.consularAppointment")}
												</h3>
												{apt.org && (
													<p className="text-sm text-muted-foreground">
														{apt.org.name}
													</p>
												)}
											</div>
											{getStatusBadge(apt.status)}
										</div>
									</div>
								</Card>
							</Link>
						))}
					</div>
				</motion.div>
			)}
		</div>
	);
}
