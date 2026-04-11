"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowLeft,
	Calendar,
	Check,
	Clock,
	Loader2,
	MapPin,
} from "lucide-react";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AppointmentSlotPicker,
	type DynamicSlotSelection,
} from "@/components/appointments/AppointmentSlotPicker";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

function BookAppointmentPageContent() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const orgId = searchParams.get("orgId") ?? undefined;
	const orgServiceId = searchParams.get("orgServiceId") ?? undefined;
	const requestId = searchParams.get("requestId") ?? undefined;

	const [selectedSlot, setSelectedSlot] = useState<DynamicSlotSelection | null>(
		null,
	);
	const [notes, setNotes] = useState("");
	const [isBooking, setIsBooking] = useState(false);

	// Get org info
	const { data: org } = useConvexQuery(
		api.functions.orgs.getById,
		orgId ? { orgId: orgId as Id<"orgs"> } : "skip",
	);

	// Mutations
	const { mutateAsync: bookDynamicAppointment } = useConvexMutationQuery(
		api.functions.slots.bookDynamicAppointment,
	);

	const handleBook = async () => {
		if (!selectedSlot || !orgId || !orgServiceId) return;

		setIsBooking(true);
		try {
			await bookDynamicAppointment({
				orgId: orgId as Id<"orgs">,
				orgServiceId: orgServiceId as Id<"orgServices">,
				date: selectedSlot.date,
				startTime: selectedSlot.startTime,
				appointmentType: "deposit",
				requestId: requestId ? (requestId as Id<"requests">) : undefined,
				notes: notes || undefined,
			});

			captureEvent("myspace_appointment_scheduled", {
				office_location: org?.name,
				is_online_meeting: false,
			});

			toast.success(t("appointments.book.success"));
			router.push("/my-space/appointments");
		} catch (err: unknown) {
			if (err instanceof Error) {
				toast.error(err.message);
			} else {
				toast.error(t("appointments.book.error"));
			}
		} finally {
			setIsBooking(false);
		}
	};

	if (!orgId || !orgServiceId) {
		return (
			<div className="flex flex-col items-center justify-center p-8 space-y-4">
				<Calendar className="h-16 w-16 text-muted-foreground opacity-30" />
				<p className="text-muted-foreground text-center">
					{t("appointments.book.noOrg")}
				</p>
				<Button onClick={() => router.push("/reps")}>
					{t("appointments.book.selectOrg")}
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/my-space/appointments")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold tracking-tight">
						{t("appointments.book.title")}
					</h1>
					{org && (
						<p className="text-muted-foreground flex items-center gap-1">
							<MapPin className="h-4 w-4" />
							{org.name}
						</p>
					)}
				</div>
			</div>

			{/* Slot picker */}
			<AppointmentSlotPicker
				orgId={orgId as Id<"orgs">}
				orgServiceId={orgServiceId as Id<"orgServices">}
				appointmentType="deposit"
				onSlotSelected={setSelectedSlot}
				selectedSlot={selectedSlot}
			/>

			{/* Confirmation */}
			{selectedSlot && (
				<FlatCard>
					<div className="p-3 lg:p-4 pb-0">
						<h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
							<Check className="h-5 w-5" />
							{t("appointments.book.confirm")}
						</h3>
						<p className="text-sm text-muted-foreground mt-1.5">
							{t("appointments.book.confirmDesc")}
						</p>
					</div>
					<div className="p-3 lg:p-4 space-y-6">
						{/* Summary */}
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
							{org && (
								<div className="flex items-center gap-3">
									<MapPin className="h-5 w-5 text-primary" />
									<div>
										<p className="font-medium">{org.name}</p>
										{org.address && (
											<p className="text-sm text-muted-foreground">
												{org.address.street}, {org.address.city}
											</p>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Notes */}
						<div className="space-y-2">
							<Label>{t("appointments.book.notes")}</Label>
							<Textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder={t("appointments.book.notesPlaceholder")}
								rows={3}
							/>
						</div>

						{/* Actions */}
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
								onClick={handleBook}
								disabled={isBooking}
							>
								{isBooking ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("common.loading")}
									</>
								) : (
									<>
										<Check className="mr-2 h-4 w-4" />
										{t("appointments.book.bookNow")}
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

export default function BookAppointmentPage() {
	return (
		<Suspense fallback={null}>
			<BookAppointmentPageContent />
		</Suspense>
	);
}
