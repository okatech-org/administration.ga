"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Check, Clock, FileText, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AppointmentSlotPicker,
	type DynamicSlotSelection,
} from "@/components/appointments/AppointmentSlotPicker";
import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

export const Route = createFileRoute("/my-space/appointments/new")({
	component: NewAppointmentPage,
});

function NewAppointmentPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [step, setStep] = useState<
		"select-request" | "select-slot" | "confirm"
	>("select-request");
	const [selectedRequestId, setSelectedRequestId] =
		useState<Id<"requests"> | null>(null);
	const [selectedSlot, setSelectedSlot] = useState<DynamicSlotSelection | null>(
		null,
	);
	const [isBooking, setIsBooking] = useState(false);

	// Get user's requests that may need an appointment
	const { results: userRequests, isLoading: requestsLoading } =
		useAuthenticatedPaginatedQuery(
			api.functions.requests.listMine,
			{},
			{ initialNumItems: 50 },
		);

	// Get user's existing appointments
	const { data: myAppointments } = useAuthenticatedConvexQuery(
		api.functions.slots.listMyAppointments,
		{},
	);

	// Get selected request details
	const selectedRequest = useMemo(() => {
		if (!selectedRequestId || !userRequests) return null;
		return userRequests.find((r) => r._id === selectedRequestId) || null;
	}, [selectedRequestId, userRequests]);

	// Book appointment mutation
	const { mutateAsync: bookDynamicAppointment } = useConvexMutationQuery(
		api.functions.slots.bookDynamicAppointment,
	);

	// Get request IDs that already have an active (confirmed, upcoming) appointment
	const requestsWithActiveAppointment = useMemo(() => {
		if (!myAppointments) return new Set<string>();
		const today = new Date().toISOString().split("T")[0];
		return new Set(
			myAppointments
				.filter((apt) => apt.status === "confirmed" && apt.date >= today)
				.map((apt) => apt.requestId)
				.filter(Boolean) as string[],
		);
	}, [myAppointments]);

	// Filter requests that can have appointments
	const eligibleRequests = useMemo(() => {
		if (!userRequests) return [];
		const eligibleStatuses: RequestStatus[] = [
			RequestStatus.Submitted,
			RequestStatus.ReadyForPickup,
		];

		return userRequests.filter((r) => {
			const isEligibleStatus = eligibleStatuses.includes(r.status);
			const hasActiveAppointment = requestsWithActiveAppointment.has(r._id);
			return isEligibleStatus && !hasActiveAppointment;
		});
	}, [userRequests, requestsWithActiveAppointment]);

	const handleSelectRequest = (requestId: Id<"requests">) => {
		setSelectedRequestId(requestId);
		setSelectedSlot(null);
		setStep("select-slot");
	};

	const handleSlotSelected = (slot: DynamicSlotSelection | null) => {
		setSelectedSlot(slot);
		if (slot) {
			setStep("confirm");
		}
	};

	const handleBook = async () => {
		if (!selectedSlot || !selectedRequestId || !selectedRequest) return;

		setIsBooking(true);
		try {
			await bookDynamicAppointment({
				orgId: selectedRequest.orgId,
				orgServiceId: selectedRequest.orgServiceId,
				date: selectedSlot.date,
				startTime: selectedSlot.startTime,
				appointmentType: "deposit",
				requestId: selectedRequestId,
			});

			captureEvent("myspace_appointment_scheduled", {
				service_type: selectedRequest.service?.name?.fr,
				is_online_meeting: false,
			});

			toast.success(t("appointments.book.success"));
			navigate({ to: "/my-space/appointments" });
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : t("appointments.book.error"),
			);
		} finally {
			setIsBooking(false);
		}
	};

	const getStatusBadge = (status: string) => {
		const colors: Record<string, string> = {
			pending:
				"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
			submitted:
				"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
			processing:
				"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
			ready_for_pickup:
				"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
			completed:
				"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		};
		return (
			<Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
				{t(`fields.requestStatus.options.${status}`)}
			</Badge>
		);
	};

	const handleBack = () => {
		if (step === "confirm") setStep("select-slot");
		else if (step === "select-slot") setStep("select-request");
		else navigate({ to: "/my-space/appointments" });
	};

	if (requestsLoading) {
		return (
			<div className="flex justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title={t("appointments.new.title")}
				subtitle={t("appointments.new.subtitle")}
				icon={<Calendar className="h-6 w-6 text-primary" />}
				showBackButton
				onBack={handleBack}
			/>

			{/* Progress Steps */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.05 }}
				className="flex items-center gap-2 justify-center"
			>
				{["select-request", "select-slot", "confirm"].map((s, idx) => (
					<div key={s} className="flex items-center">
						<div
							className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
								step === s
									? "bg-primary text-primary-foreground"
									: ["select-request", "select-slot", "confirm"].indexOf(step) >
											idx
										? "bg-primary/20 text-primary"
										: "bg-muted text-muted-foreground"
							}`}
						>
							{["select-request", "select-slot", "confirm"].indexOf(step) >
							idx ? (
								<Check className="h-4 w-4" />
							) : (
								idx + 1
							)}
						</div>
						{idx < 2 && (
							<div
								className={`w-12 h-0.5 ${["select-request", "select-slot", "confirm"].indexOf(step) > idx ? "bg-primary/20" : "bg-muted"}`}
							/>
						)}
					</div>
				))}
			</motion.div>

			{/* Step 1: Select Request */}
			{step === "select-request" && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								{t("appointments.new.selectRequest")}
							</CardTitle>
							<CardDescription>
								{t("appointments.new.selectRequestDesc")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{eligibleRequests.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
									<p>{t("appointments.new.noEligibleRequests")}</p>
									<Button
										variant="outline"
										className="mt-4"
										onClick={() => navigate({ to: "/my-space/services" })}
									>
										{t("appointments.new.makeRequest")}
									</Button>
								</div>
							) : (
								<div className="space-y-3">
									{eligibleRequests.map((request) => (
										<button
											type="button"
											key={request._id}
											onClick={() => handleSelectRequest(request._id)}
											className={`w-full p-4 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50 ${
												selectedRequestId === request._id
													? "border-primary bg-primary/5"
													: ""
											}`}
										>
											<div className="flex items-start justify-between gap-4">
												<div className="flex-1 min-w-0">
													<p className="font-medium truncate">
														{request.service?.name?.fr ||
															t("appointments.new.request")}
													</p>
													<p className="text-sm text-muted-foreground">
														{t("common.reference")}: {request.reference}
													</p>
													{(request as any).actionsRequired
														?.filter((a: any) => !a.completedAt)
														.map((action: any) => (
															<p
																key={action.id}
																className="text-xs text-amber-600 mt-1"
															>
																 {action.message}
															</p>
														))}
												</div>
												<div className="flex flex-col items-end gap-1">
													{getStatusBadge(request.status)}
													<span className="text-xs text-muted-foreground">
														{request.submittedAt &&
															format(
																new Date(request.submittedAt),
																"dd/MM/yyyy",
															)}
													</span>
												</div>
											</div>
										</button>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Step 2: Select Slot */}
			{step === "select-slot" && selectedRequest && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					<p className="text-sm text-muted-foreground mb-3">
						{selectedRequest.service?.name?.fr} — {selectedRequest.reference}
					</p>
					<AppointmentSlotPicker
						orgId={selectedRequest.orgId}
						orgServiceId={selectedRequest.orgServiceId}
						appointmentType="deposit"
						onSlotSelected={handleSlotSelected}
						selectedSlot={selectedSlot}
					/>
				</motion.div>
			)}

			{/* Step 3: Confirm */}
			{step === "confirm" && selectedSlot && selectedRequest && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Check className="h-5 w-5" />
								{t("appointments.new.confirm")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="bg-muted/50 p-4 rounded-lg space-y-3">
								<div className="flex items-center gap-3">
									<FileText className="h-5 w-5 text-primary" />
									<div>
										<p className="font-medium">
											{selectedRequest.service?.name?.fr}
										</p>
										<p className="text-sm text-muted-foreground">
											{t("common.reference")}: {selectedRequest.reference}
										</p>
									</div>
								</div>
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

							<div className="flex gap-3">
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => setStep("select-slot")}
								>
									{t("common.back")}
								</Button>
								<Button
									className="flex-1"
									onClick={handleBook}
									disabled={isBooking}
								>
									{isBooking ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Check className="mr-2 h-4 w-4" />
									)}
									{t("appointments.new.confirm")}
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			)}
		</div>
	);
}
