"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrg } from "@/components/org/org-provider";
import { FlatCard } from "@/components/my-space/flat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function AgentNewAppointmentPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const { activeOrgId } = useOrg();

	const [searchTerm, setSearchTerm] = useState("");
	const [attendeeProfileId, setAttendeeProfileId] = useState<string>("");
	const [orgServiceId, setOrgServiceId] = useState<string>("");
	const [date, setDate] = useState<string>("");
	const [startTime, setStartTime] = useState<string>("");
	const [mode, setMode] = useState<"in_person" | "remote" | "phone">(
		"in_person",
	);
	const [channel, setChannel] = useState<"walk_in" | "phone_call" | "admin">(
		"walk_in",
	);
	const [appointmentType, setAppointmentType] = useState<"deposit" | "pickup">(
		"deposit",
	);
	const [notes, setNotes] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data: profiles } = useAuthenticatedConvexQuery(
		api.functions.profiles.searchConsularProfiles,
		activeOrgId
			? { orgId: activeOrgId, searchTerm: searchTerm || undefined }
			: "skip",
	);

	const { data: services } = useAuthenticatedConvexQuery(
		api.functions.services.listByOrg,
		activeOrgId ? { orgId: activeOrgId, activeOnly: true } : "skip",
	);

	const { data: availableSlots } = useAuthenticatedConvexQuery(
		api.functions.slots.computeAvailableSlots,
		activeOrgId && orgServiceId && date
			? {
					orgId: activeOrgId,
					orgServiceId: orgServiceId as Id<"orgServices">,
					date,
					appointmentType,
				}
			: "skip",
	);

	const { mutateAsync: bookByAgent } = useConvexMutationQuery(
		api.functions.slots.bookByAgent,
	);

	const selectedProfile = useMemo(
		() => (profiles as any[] | undefined)?.find((p) => p._id === attendeeProfileId),
		[profiles, attendeeProfileId],
	);

	const selectedService = useMemo(
		() => (services as any[] | undefined)?.find((s) => s._id === orgServiceId),
		[services, orgServiceId],
	);

	const allowedModes = selectedService?.allowedAppointmentModes ?? [
		"in_person",
	];

	const handleSubmit = async () => {
		if (!activeOrgId || !attendeeProfileId || !orgServiceId || !date || !startTime) {
			return;
		}
		setIsSubmitting(true);
		try {
			const id = await bookByAgent({
				orgId: activeOrgId,
				orgServiceId: orgServiceId as Id<"orgServices">,
				attendeeProfileId: attendeeProfileId as Id<"profiles">,
				date,
				startTime,
				appointmentType,
				mode,
				channel,
				notes: notes || undefined,
			});
			toast.success(t("appointments.manualBooking.success"));
			router.push(`/appointments/${id}`);
		} catch (err: unknown) {
			toast.error(
				err instanceof Error
					? err.message
					: t("appointments.manualBooking.error"),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const canSubmit =
		!!activeOrgId &&
		!!attendeeProfileId &&
		!!orgServiceId &&
		!!date &&
		!!startTime &&
		!isSubmitting;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-4xl mx-auto w-full">
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
						{t("appointments.manualBooking.title")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t("appointments.manualBooking.subtitle")}
					</p>
				</div>
			</div>

			<FlatCard>
				<div className="p-3 lg:p-4 space-y-3">
					<h3 className="font-semibold">
						{t("appointments.manualBooking.citizen")}
					</h3>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t("appointments.manualBooking.searchPlaceholder")}
							className="pl-9"
						/>
					</div>
					<div className="max-h-56 overflow-y-auto divide-y divide-border rounded-md border">
						{((profiles ?? []) as any[]).slice(0, 20).map((p: any) => {
							const fullName = [p.identity?.firstName, p.identity?.lastName]
								.filter(Boolean)
								.join(" ") || p.user?.name || p.user?.email || "—";
							const isSelected = attendeeProfileId === p._id;
							return (
								<button
									type="button"
									key={p._id}
									onClick={() => setAttendeeProfileId(p._id)}
									className={`w-full px-3 py-2 text-left text-sm transition-colors ${
										isSelected
											? "bg-primary/10 border-l-2 border-primary"
											: "hover:bg-muted"
									}`}
								>
									<div className="font-medium">{fullName}</div>
									<div className="text-xs text-muted-foreground">
										{p.user?.email || p.contacts?.email || "—"}
									</div>
								</button>
							);
						})}
						{profiles && profiles.length === 0 && (
							<div className="p-3 text-sm text-muted-foreground">
								{t("appointments.manualBooking.noProfiles")}
							</div>
						)}
					</div>
					{selectedProfile && (
						<p className="text-xs text-muted-foreground">
							{t("appointments.manualBooking.selected")}:{" "}
							<span className="font-medium">
								{[
									selectedProfile.identity?.firstName,
									selectedProfile.identity?.lastName,
								]
									.filter(Boolean)
									.join(" ")}
							</span>
						</p>
					)}
				</div>
			</FlatCard>

			<FlatCard>
				<div className="p-3 lg:p-4 grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label>{t("appointments.manualBooking.service")}</Label>
						<Select
							value={orgServiceId}
							onValueChange={(v) => {
								setOrgServiceId(v);
								setStartTime("");
							}}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t("appointments.manualBooking.selectService")}
								/>
							</SelectTrigger>
							<SelectContent>
								{((services ?? []) as any[]).map((s: any) => (
									<SelectItem key={s._id} value={s._id}>
										{(typeof s.name === "object" ? s.name?.fr : s.name) ??
											"Service"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>{t("appointments.manualBooking.type")}</Label>
						<Select
							value={appointmentType}
							onValueChange={(v) =>
								setAppointmentType(v as "deposit" | "pickup")
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="deposit">
									{t("appointments.manualBooking.typeDeposit")}
								</SelectItem>
								<SelectItem value="pickup">
									{t("appointments.manualBooking.typePickup")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

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

					<div className="space-y-2">
						<Label>{t("appointments.manualBooking.channel")}</Label>
						<Select
							value={channel}
							onValueChange={(v) =>
								setChannel(v as "walk_in" | "phone_call" | "admin")
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="walk_in">
									{t("appointments.manualBooking.channelWalkIn")}
								</SelectItem>
								<SelectItem value="phone_call">
									{t("appointments.manualBooking.channelPhone")}
								</SelectItem>
								<SelectItem value="admin">
									{t("appointments.manualBooking.channelAdmin")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 md:col-span-2">
						<Label>{t("appointments.manualBooking.mode")}</Label>
						<Select
							value={mode}
							onValueChange={(v) =>
								setMode(v as "in_person" | "remote" | "phone")
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{allowedModes.includes("in_person") && (
									<SelectItem value="in_person">
										{t("appointments.mode.inPerson")}
									</SelectItem>
								)}
								{allowedModes.includes("remote") && (
									<SelectItem value="remote">
										{t("appointments.mode.remote")}
									</SelectItem>
								)}
								{allowedModes.includes("phone") && (
									<SelectItem value="phone">
										{t("appointments.mode.phone")}
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>
				</div>

				{date && availableSlots && (
					<div className="p-3 lg:p-4 pt-0 space-y-2">
						<Label>{t("appointments.availableSlots")}</Label>
						{availableSlots.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{t("appointments.noSlotsForDate")}
							</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{(availableSlots as any[]).map((slot: any) => (
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

				<div className="p-3 lg:p-4 pt-0 space-y-2">
					<Label htmlFor="notes">{t("appointments.manualBooking.notes")}</Label>
					<Textarea
						id="notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder={t("appointments.manualBooking.notesPlaceholder")}
						rows={3}
					/>
				</div>

				<div className="p-3 lg:p-4 pt-0 flex gap-3 justify-end">
					<Button variant="outline" onClick={() => router.back()}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t("common.loading")}
							</>
						) : (
							<>
								<CalendarPlus className="mr-2 h-4 w-4" />
								{t("appointments.manualBooking.submit")}
							</>
						)}
					</Button>
				</div>
			</FlatCard>
		</div>
	);
}
