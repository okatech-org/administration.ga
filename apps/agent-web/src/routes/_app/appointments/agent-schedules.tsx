import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Clock,
	Plus,
	Power,
	PowerOff,
	Save,
	Trash2,
	UserCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/appointments/agent-schedules")({
	component: AgentSchedules,
});

const DAYS = [
	{ key: "monday" as const, labelKey: "common.days.monday" },
	{ key: "tuesday" as const, labelKey: "common.days.tuesday" },
	{ key: "wednesday" as const, labelKey: "common.days.wednesday" },
	{ key: "thursday" as const, labelKey: "common.days.thursday" },
	{ key: "friday" as const, labelKey: "common.days.friday" },
	{ key: "saturday" as const, labelKey: "common.days.saturday" },
	{ key: "sunday" as const, labelKey: "common.days.sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

interface TimeRange {
	start: string;
	end: string;
}

interface DaySchedule {
	day: DayKey;
	timeRanges: TimeRange[];
}

const DEFAULT_WEEKDAYS: DaySchedule[] = DAYS.filter(
	(d) => !["saturday", "sunday"].includes(d.key),
).map((d) => ({
	day: d.key,
	timeRanges: [
		{ start: "09:00", end: "12:00" },
		{ start: "14:00", end: "17:00" },
	],
}));

function AgentSchedules() {
	const { activeOrgId } = useOrg();
	const { t } = useTranslation();

	// --- UI State ---
	const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
		undefined,
	);
	const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(
		null,
	);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const [isExcDialogOpen, setIsExcDialogOpen] = useState(false);
	const [excScheduleId, setExcScheduleId] = useState<string>("");

	// --- Queries ---
	const { data: agents } = useAuthenticatedConvexQuery(
		api.functions.agentSchedules.listOrgAgents,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { data: schedules } = useAuthenticatedConvexQuery(
		api.functions.agentSchedules.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { data: orgServices } = useConvexQuery(
		api.functions.services.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// --- Mutations ---
	const { mutateAsync: upsertSchedule } = useConvexMutationQuery(
		api.functions.agentSchedules.upsert,
	);
	const { mutateAsync: toggleActive } = useConvexMutationQuery(
		api.functions.agentSchedules.toggleActive,
	);
	const { mutateAsync: deleteSchedule } = useConvexMutationQuery(
		api.functions.agentSchedules.deleteSchedule,
	);
	const { mutateAsync: addException } = useConvexMutationQuery(
		api.functions.agentSchedules.addException,
	);
	const { mutateAsync: removeException } = useConvexMutationQuery(
		api.functions.agentSchedules.removeException,
	);

	// --- Derived options ---
	const agentOptions = useMemo(() => {
		if (!agents || !Array.isArray(agents)) return [];
		return agents.map((a: any) => ({
			value: a._id as string,
			label: `${a.firstName} ${a.lastName}`,
		}));
	}, [agents]);

	const serviceOptions = useMemo(() => {
		if (!orgServices || !Array.isArray(orgServices)) return [];
		return orgServices.map((os: any) => ({
			value: os._id as string,
			label: os.name?.fr || os.name?.en || "Service",
		}));
	}, [orgServices]);

	const filteredSchedules = useMemo(() => {
		if (!schedules || !Array.isArray(schedules)) return [];
		if (!selectedAgentId) return schedules;
		return schedules.filter((s: any) => s.agentId === selectedAgentId);
	}, [schedules, selectedAgentId]);

	// --- Create Schedule Form ---
	const createForm = useForm({
		defaultValues: {
			agentId: "" as string,
			orgServiceId: undefined as string | undefined,
			weeklySchedule: DEFAULT_WEEKDAYS as DaySchedule[],
		},
		onSubmit: async ({ value }) => {
			if (!activeOrgId || !value.agentId) return;
			try {
				await upsertSchedule({
					orgId: activeOrgId,
					agentId: value.agentId as Id<"memberships">,
					orgServiceId: value.orgServiceId
						? (value.orgServiceId as Id<"orgServices">)
						: undefined,
					weeklySchedule: value.weeklySchedule,
				});
				toast.success(t("dashboard.appointments.schedules.created"));
				setIsCreateDialogOpen(false);
				createForm.reset();
			} catch {
				toast.error(t("dashboard.appointments.schedules.createError"));
			}
		},
	});

	// --- Exception Form ---
	const exceptionForm = useForm({
		defaultValues: {
			date: "",
			available: false,
			reason: "",
		},
		onSubmit: async ({ value }) => {
			if (!excScheduleId || !value.date) return;
			try {
				await addException({
					scheduleId: excScheduleId as Id<"agentSchedules">,
					exception: {
						date: value.date,
						available: value.available,
						reason: value.reason || undefined,
					},
				});
				toast.success(t("dashboard.appointments.schedules.exceptionAdded"));
				setIsExcDialogOpen(false);
				exceptionForm.reset();
			} catch {
				toast.error(t("common.error"));
			}
		},
	});

	// --- Action Handlers ---
	const handleToggle = async (scheduleId: Id<"agentSchedules">) => {
		try {
			const result = await toggleActive({ scheduleId });
			toast.success(
				result.isActive
					? t("dashboard.appointments.schedules.activated")
					: t("dashboard.appointments.schedules.deactivated"),
			);
		} catch {
			toast.error(t("common.error"));
		}
	};

	const handleDelete = async (scheduleId: Id<"agentSchedules">) => {
		try {
			await deleteSchedule({ scheduleId });
			toast.success(t("dashboard.appointments.schedules.deleted"));
		} catch {
			toast.error(t("common.error"));
		}
	};

	const handleRemoveException = async (
		scheduleId: Id<"agentSchedules">,
		date: string,
	) => {
		try {
			await removeException({ scheduleId, date });
			toast.success(t("dashboard.appointments.schedules.exceptionRemoved"));
		} catch {
			toast.error(t("common.error"));
		}
	};

	// --- Weekly schedule helpers (for create form) ---
	const updateTimeRange = (
		schedule: DaySchedule[],
		dayIndex: number,
		rangeIndex: number,
		field: "start" | "end",
		value: string,
	): DaySchedule[] => {
		const copy = [...schedule];
		const dayEntry = { ...copy[dayIndex] };
		dayEntry.timeRanges = [...dayEntry.timeRanges];
		dayEntry.timeRanges[rangeIndex] = {
			...dayEntry.timeRanges[rangeIndex],
			[field]: value,
		};
		copy[dayIndex] = dayEntry;
		return copy;
	};

	const addTimeRange = (
		schedule: DaySchedule[],
		dayIndex: number,
	): DaySchedule[] => {
		const copy = [...schedule];
		const dayEntry = { ...copy[dayIndex] };
		dayEntry.timeRanges = [
			...dayEntry.timeRanges,
			{ start: "14:00", end: "17:00" },
		];
		copy[dayIndex] = dayEntry;
		return copy;
	};

	const removeTimeRange = (
		schedule: DaySchedule[],
		dayIndex: number,
		rangeIndex: number,
	): DaySchedule[] => {
		const copy = [...schedule];
		const dayEntry = { ...copy[dayIndex] };
		dayEntry.timeRanges = dayEntry.timeRanges.filter(
			(_, i) => i !== rangeIndex,
		);
		copy[dayIndex] = dayEntry;
		return copy;
	};

	const toggleDay = (
		schedule: DaySchedule[],
		dayKey: DayKey,
	): DaySchedule[] => {
		const idx = schedule.findIndex((d) => d.day === dayKey);
		if (idx >= 0) {
			return schedule.filter((d) => d.day !== dayKey);
		}
		const newEntry: DaySchedule = {
			day: dayKey,
			timeRanges: [{ start: "09:00", end: "12:00" }],
		};
		return [...schedule, newEntry].sort(
			(a, b) =>
				DAYS.findIndex((d) => d.key === a.day) -
				DAYS.findIndex((d) => d.key === b.day),
		);
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<UserCircle className="h-6 w-6" />
						{t("dashboard.appointments.schedules.title")}
					</h1>
					<p className="text-muted-foreground">
						{t("dashboard.appointments.schedules.description")}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{/* Agent filter */}
					<MultiSelect
						type="single"
						options={agentOptions}
						selected={selectedAgentId}
						onChange={setSelectedAgentId}
						placeholder={t("dashboard.appointments.schedules.allAgents")}
						searchPlaceholder={t("common.search")}
						className="w-[200px]"
					/>

					{/* Create button */}
					<Dialog
						open={isCreateDialogOpen}
						onOpenChange={(open) => {
							setIsCreateDialogOpen(open);
							if (!open) createForm.reset();
						}}
					>
						<DialogTrigger asChild>
							<Button className="gap-2">
								<Plus className="h-4 w-4" />
								{t("dashboard.appointments.schedules.create")}
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									createForm.handleSubmit();
								}}
							>
								<DialogHeader>
									<DialogTitle>
										{t("dashboard.appointments.schedules.createTitle")}
									</DialogTitle>
									<DialogDescription>
										{t("dashboard.appointments.schedules.createDescription")}
									</DialogDescription>
								</DialogHeader>

								<div className="space-y-4 py-4">
									{/* Agent selector */}
									<createForm.Field
										name="agentId"
										validators={{
											onSubmit: ({ value }) =>
												!value
													? t("dashboard.appointments.schedules.agentRequired")
													: undefined,
										}}
										children={(field) => {
											const isInvalid =
												field.state.meta.isTouched &&
												field.state.meta.errors.length > 0;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel>
														{t("dashboard.appointments.schedules.agent")}
													</FieldLabel>
													<MultiSelect
														type="single"
														options={agentOptions}
														selected={field.state.value || undefined}
														onChange={(val) => field.handleChange(val ?? "")}
														placeholder={t(
															"dashboard.appointments.schedules.selectAgent",
														)}
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									/>

									{/* Service selector (optional) */}
									<createForm.Field
										name="orgServiceId"
										children={(field) => (
											<Field>
												<FieldLabel>
													{t("dashboard.appointments.schedules.service")}
												</FieldLabel>
												<MultiSelect
													type="single"
													options={serviceOptions}
													selected={field.state.value}
													onChange={field.handleChange}
													placeholder={t(
														"dashboard.appointments.schedules.allServices",
													)}
												/>
											</Field>
										)}
									/>

									{/* Day toggles */}
									<createForm.Field
										name="weeklySchedule"
										children={(field) => (
											<Field>
												<FieldLabel>
													{t("dashboard.appointments.schedules.workingDays")}
												</FieldLabel>
												<div className="flex gap-1 flex-wrap">
													{DAYS.map((d) => {
														const active = field.state.value.some(
															(ws) => ws.day === d.key,
														);
														return (
															<Button
																key={d.key}
																type="button"
																variant={active ? "default" : "outline"}
																size="sm"
																className="text-xs"
																onClick={() =>
																	field.handleChange(
																		toggleDay(field.state.value, d.key),
																	)
																}
															>
																{t(d.labelKey).slice(0, 3)}
															</Button>
														);
													})}
												</div>

												{/* Time ranges per day */}
												<div className="space-y-3 mt-3">
													<Label>
														{t("dashboard.appointments.schedules.timeRanges")}
													</Label>
													{field.state.value.map((dayEntry, dayIdx) => (
														<div
															key={dayEntry.day}
															className="rounded-lg border p-3 space-y-2"
														>
															<p className="text-sm font-medium">
																{t(
																	DAYS.find((d) => d.key === dayEntry.day)
																		?.labelKey ?? "",
																)}
															</p>
															{dayEntry.timeRanges.map((range, rangeIdx) => (
																<div
																	key={rangeIdx}
																	className="flex items-center gap-2"
																>
																	<Input
																		type="time"
																		value={range.start}
																		onChange={(e) =>
																			field.handleChange(
																				updateTimeRange(
																					field.state.value,
																					dayIdx,
																					rangeIdx,
																					"start",
																					e.target.value,
																				),
																			)
																		}
																		className="w-28"
																	/>
																	<span className="text-muted-foreground">
																		-
																	</span>
																	<Input
																		type="time"
																		value={range.end}
																		onChange={(e) =>
																			field.handleChange(
																				updateTimeRange(
																					field.state.value,
																					dayIdx,
																					rangeIdx,
																					"end",
																					e.target.value,
																				),
																			)
																		}
																		className="w-28"
																	/>
																	{dayEntry.timeRanges.length > 1 && (
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon"
																			className="h-8 w-8"
																			onClick={() =>
																				field.handleChange(
																					removeTimeRange(
																						field.state.value,
																						dayIdx,
																						rangeIdx,
																					),
																				)
																			}
																		>
																			<Trash2 className="h-3 w-3" />
																		</Button>
																	)}
																</div>
															))}
															<Button
																type="button"
																variant="ghost"
																size="sm"
																className="text-xs gap-1"
																onClick={() =>
																	field.handleChange(
																		addTimeRange(field.state.value, dayIdx),
																	)
																}
															>
																<Plus className="h-3 w-3" />
																{t("dashboard.appointments.schedules.addRange")}
															</Button>
														</div>
													))}
												</div>
											</Field>
										)}
									/>
								</div>

								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsCreateDialogOpen(false)}
									>
										{t("common.cancel")}
									</Button>
									<Button type="submit" className="gap-2">
										<Save className="h-4 w-4" />
										{t("common.save")}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Schedule list */}
			{filteredSchedules.length === 0 ? (
				<FlatCard>
					<div className="p-3 lg:p-4 flex flex-col items-center justify-center py-12 text-center">
						<Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-muted-foreground">
							{t("dashboard.appointments.schedules.empty")}
						</p>
						<p className="text-sm text-muted-foreground/70 mt-1">
							{t("dashboard.appointments.schedules.emptyHint")}
						</p>
					</div>
				</FlatCard>
			) : (
				<div className="space-y-3">
					{filteredSchedules.map((schedule: any) => {
						const isExpanded = expandedScheduleId === schedule._id;
						return (
							<FlatCard
								key={schedule._id}
								className={!schedule.isActive ? "opacity-60" : ""}
							>
								<div className="p-3 lg:p-4 pb-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											{schedule.agent && (
												<Avatar className="h-9 w-9">
													<AvatarImage
														src={schedule.agent.avatarUrl ?? undefined}
													/>
													<AvatarFallback className="text-xs">
														{schedule.agent.firstName?.[0] ?? ""}
														{schedule.agent.lastName?.[0] ?? ""}
													</AvatarFallback>
												</Avatar>
											)}
											<div>
												<p className="text-base font-medium">
													{schedule.agent?.firstName} {schedule.agent?.lastName}
												</p>
												<div className="text-xs text-muted-foreground flex items-center gap-2">
													{schedule.serviceName ? (
														<Badge variant="outline" className="text-xs">
															{typeof schedule.serviceName === "object"
																? schedule.serviceName?.fr ||
																	schedule.serviceName?.en
																: schedule.serviceName}
														</Badge>
													) : (
														<span className="text-xs">
															{t(
																"dashboard.appointments.schedules.allServices",
															)}
														</span>
													)}
													<Badge
														variant={
															schedule.isActive ? "default" : "secondary"
														}
														className="text-xs"
													>
														{schedule.isActive
															? t("dashboard.appointments.schedules.active")
															: t("dashboard.appointments.schedules.inactive")}
													</Badge>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-1">
											{/* Toggle active */}
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleToggle(schedule._id)}
												title={
													schedule.isActive
														? t("dashboard.appointments.schedules.deactivate")
														: t("dashboard.appointments.schedules.activate")
												}
											>
												{schedule.isActive ? (
													<Power className="h-4 w-4 text-green-600" />
												) : (
													<PowerOff className="h-4 w-4 text-muted-foreground" />
												)}
											</Button>

											{/* Delete */}
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDelete(schedule._id)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>

											{/* Expand */}
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													setExpandedScheduleId(
														isExpanded ? null : schedule._id,
													)
												}
											>
												{isExpanded ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
											</Button>
										</div>
									</div>

									{/* Quick schedule overview */}
									<div className="flex gap-1 mt-2 flex-wrap">
										{schedule.weeklySchedule.map((day: any) => (
											<Badge
												key={day.day}
												variant="secondary"
												className="text-xs gap-1"
											>
												<Clock className="h-3 w-3" />
												{t(
													DAYS.find((d) => d.key === day.day)?.labelKey ?? "",
												).slice(0, 3)}{" "}
												{day.timeRanges
													.map((r: any) => `${r.start}-${r.end}`)
													.join(", ")}
											</Badge>
										))}
									</div>
								</div>

								{/* Expanded view with exceptions */}
								{isExpanded && (
									<div className="border-t pt-4 space-y-3 px-3 lg:px-4 pb-3 lg:pb-4">
										<div className="flex items-center justify-between">
											<h4 className="text-sm font-medium">
												{t("dashboard.appointments.schedules.exceptions")}
											</h4>
											<Button
												variant="outline"
												size="sm"
												className="gap-1"
												onClick={() => {
													setExcScheduleId(schedule._id);
													setIsExcDialogOpen(true);
												}}
											>
												<Plus className="h-3 w-3" />
												{t("dashboard.appointments.schedules.addException")}
											</Button>
										</div>

										{!schedule.exceptions ||
										schedule.exceptions.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												{t("dashboard.appointments.schedules.noExceptions")}
											</p>
										) : (
											<div className="space-y-1">
												{schedule.exceptions.map((exc: any) => (
													<div
														key={exc.date}
														className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
															exc.available
																? "bg-blue-50 dark:bg-blue-950/30"
																: "bg-destructive/10"
														}`}
													>
														<div className="flex items-center gap-2">
															<span className="font-medium">{exc.date}</span>
															<Badge
																variant={
																	exc.available ? "outline" : "destructive"
																}
																className="text-xs"
															>
																{exc.available
																	? t(
																			"dashboard.appointments.schedules.modifiedHours",
																		)
																	: t(
																			"dashboard.appointments.schedules.dayOff",
																		)}
															</Badge>
															{exc.reason && (
																<span className="text-muted-foreground text-xs">
																	{exc.reason}
																</span>
															)}
														</div>
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6"
															onClick={() =>
																handleRemoveException(schedule._id, exc.date)
															}
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													</div>
												))}
											</div>
										)}
									</div>
								)}
							</FlatCard>
						);
					})}
				</div>
			)}

			{/* Add exception dialog */}
			<Dialog
				open={isExcDialogOpen}
				onOpenChange={(open) => {
					setIsExcDialogOpen(open);
					if (!open) exceptionForm.reset();
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							exceptionForm.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>
								{t("dashboard.appointments.schedules.addExceptionTitle")}
							</DialogTitle>
							<DialogDescription>
								{t("dashboard.appointments.schedules.addExceptionDescription")}
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<exceptionForm.Field
								name="date"
								validators={{
									onSubmit: ({ value }) =>
										!value
											? t("dashboard.appointments.schedules.dateRequired")
											: undefined,
								}}
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched &&
										field.state.meta.errors.length > 0;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel>
												{t("dashboard.appointments.schedules.date")}
											</FieldLabel>
											<Input
												type="date"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors as any} />
											)}
										</Field>
									);
								}}
							/>

							<exceptionForm.Field
								name="available"
								children={(field) => (
									<Field orientation="horizontal">
										<FieldLabel htmlFor="excAvailable">
											{t("dashboard.appointments.schedules.modifiedHoursCheck")}
										</FieldLabel>
										<Switch
											id="excAvailable"
											checked={field.state.value}
											onCheckedChange={field.handleChange}
										/>
									</Field>
								)}
							/>

							<exceptionForm.Field
								name="reason"
								children={(field) => (
									<Field>
										<FieldLabel>
											{t("dashboard.appointments.schedules.reason")}
										</FieldLabel>
										<Input
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={t(
												"dashboard.appointments.schedules.reasonPlaceholder",
											)}
										/>
									</Field>
								)}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsExcDialogOpen(false)}
							>
								{t("common.cancel")}
							</Button>
							<Button type="submit">{t("common.save")}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
