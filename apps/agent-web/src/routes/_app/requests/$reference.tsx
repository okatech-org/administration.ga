"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalized } from "@convex/lib/utils";
import type { LocalizedString, RequestStatus } from "@convex/lib/validators";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	AlertTriangle,
	ArrowLeft,
	Bot,
	Calendar,
	Check,
	CheckCircle,
	Clock,
	Eye,
	FileText,
	Loader2,
	Send,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RequestActionModal } from "@/components/admin/RequestActionModal";
import { UserProfilePreviewCard } from "@/components/dashboard/UserProfilePreviewCard";
import { CallButton } from "@/components/meetings/call-button";
import { PageHeader } from "@/components/my-space/page-header";
import { useOrg } from "@/components/org/org-provider";
import { DocumentChecklist } from "@/components/shared/DocumentChecklist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCanDoTask } from "@/hooks/useCanDoTask";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getValidNextStatuses } from "@convex/lib/requestWorkflow";

export const Route = createFileRoute("/_app/requests/$reference")({
	component: RequestDetailPage,
});

// ─── Status styling (reuses palette from list page) ──────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> =
	{
		draft: {
			bg: "bg-slate-100 dark:bg-slate-800",
			text: "text-slate-700 dark:text-slate-300",
			dot: "bg-slate-400",
		},
		submitted: {
			bg: "bg-blue-100 dark:bg-blue-900/40",
			text: "text-blue-700 dark:text-blue-300",
			dot: "bg-blue-500",
		},
		pending: {
			bg: "bg-amber-100 dark:bg-amber-900/40",
			text: "text-amber-700 dark:text-amber-300",
			dot: "bg-amber-500",
		},
		pending_completion: {
			bg: "bg-orange-100 dark:bg-orange-900/40",
			text: "text-orange-700 dark:text-orange-300",
			dot: "bg-orange-500",
		},
		edited: {
			bg: "bg-indigo-100 dark:bg-indigo-900/40",
			text: "text-indigo-700 dark:text-indigo-300",
			dot: "bg-indigo-500",
		},
		under_review: {
			bg: "bg-purple-100 dark:bg-purple-900/40",
			text: "text-purple-700 dark:text-purple-300",
			dot: "bg-purple-500",
		},
		in_production: {
			bg: "bg-cyan-100 dark:bg-cyan-900/40",
			text: "text-cyan-700 dark:text-cyan-300",
			dot: "bg-cyan-500",
		},
		validated: {
			bg: "bg-emerald-100 dark:bg-emerald-900/40",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		},
		rejected: {
			bg: "bg-red-100 dark:bg-red-900/40",
			text: "text-red-700 dark:text-red-300",
			dot: "bg-red-500",
		},
		appointment_scheduled: {
			bg: "bg-teal-100 dark:bg-teal-900/40",
			text: "text-teal-700 dark:text-teal-300",
			dot: "bg-teal-500",
		},
		ready_for_pickup: {
			bg: "bg-green-100 dark:bg-green-900/40",
			text: "text-green-700 dark:text-green-300",
			dot: "bg-green-500",
		},
		completed: {
			bg: "bg-emerald-100 dark:bg-emerald-900/40",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		},
		cancelled: {
			bg: "bg-gray-100 dark:bg-gray-800",
			text: "text-gray-600 dark:text-gray-400",
			dot: "bg-gray-400",
		},
		processing: {
			bg: "bg-purple-100 dark:bg-purple-900/40",
			text: "text-purple-700 dark:text-purple-300",
			dot: "bg-purple-500",
		},
	};

function getStatusStyle(status: string) {
	return (
		STATUS_STYLE[status] ?? {
			bg: "bg-gray-100 dark:bg-gray-800",
			text: "text-gray-600 dark:text-gray-400",
			dot: "bg-gray-400",
		}
	);
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Format a raw value for display */
function renderValue(value: unknown, lang: string): string {
	if (value === null || value === undefined || value === "") return "—";
	if (typeof value === "boolean") return value ? "Oui" : "Non";
	if (Array.isArray(value))
		return value.map((v) => renderValue(v, lang)).join(", ");
	if (typeof value === "object") {
		if ("fr" in (value as object)) {
			return String(
				(value as Record<string, string>)[lang] ||
					(value as Record<string, string>).fr,
			);
		}
		return JSON.stringify(value);
	}
	const str = String(value);
	// Country code (2-letter ISO)
	if (/^[A-Z]{2}$/.test(str)) {
		try {
			const name = new Intl.DisplayNames([lang], { type: "region" }).of(str);
			if (name) return name;
		} catch {
			/* fallback */
		}
	}
	// Date string (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
		try {
			return new Date(str).toLocaleDateString(
				lang === "fr" ? "fr-FR" : "en-US",
				{
					day: "numeric",
					month: "long",
					year: "numeric",
				},
			);
		} catch {
			/* fallback */
		}
	}
	return str;
}

// Types for FormSchema
interface FormSchemaField {
	id: string;
	type?: string;
	label?: LocalizedString;
	description?: LocalizedString;
	options?: Array<{ value: string; label?: LocalizedString }>;
}

interface FormSchemaSection {
	id: string;
	title?: LocalizedString;
	description?: LocalizedString;
	fields?: FormSchemaField[];
}

interface FormSchema {
	sections?: FormSchemaSection[];
	joinedDocuments?: Array<{
		type: string;
		label: LocalizedString;
		required: boolean;
	}>;
	showRecap?: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────

function RequestDetailPage() {
	const { i18n, t } = useTranslation();
	const { reference } = Route.useParams();
	const navigate = useNavigate();
	const { activeOrgId } = useOrg();
	const { canDo } = useCanDoTask(activeOrgId ?? undefined);

	const { data: request, isError } = useAuthenticatedConvexQuery(
		api.functions.requests.getByReferenceId,
		{ referenceId: reference },
	);
	const { data: agentNotes } = useAuthenticatedConvexQuery(
		api.functions.agentNotes.listByRequest,
		request?._id ? { requestId: request._id } : "skip",
	);
	const { mutateAsync: updateStatus } = useConvexMutationQuery(
		api.functions.requests.updateStatus,
	);
	const { mutateAsync: createNote } = useConvexMutationQuery(
		api.functions.agentNotes.create,
	);
	const { mutateAsync: validateDocument } = useConvexMutationQuery(
		api.functions.documents.validate,
	);
	const { mutate: toggleFieldValidation } = useConvexMutationQuery(
		api.functions.requests.validateField,
	);
	const { mutateAsync: assignAgent } = useConvexMutationQuery(
		api.functions.requests.assign,
	);

	const { data: members } = useAuthenticatedConvexQuery(
		api.functions.orgs.getMembers,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const [noteContent, setNoteContent] = useState("");
	const [isStatusUpdating, setIsStatusUpdating] = useState(false);
	const viewedRequestId = useRef<string | null>(null);

	const lang = i18n.language;
	const dateFnsLocale = lang === "fr" ? fr : enUS;

	const formSchema = useMemo(
		() => request?.service?.formSchema as FormSchema | undefined,
		[request?.service?.formSchema],
	);

	// Parse formData
	const formDataObj: Record<string, unknown> = useMemo(() => {
		if (!request?.formData) return {};
		if (typeof request.formData === "string") {
			try {
				return JSON.parse(request.formData);
			} catch {
				return {};
			}
		}
		if (typeof request.formData === "object")
			return request.formData as Record<string, unknown>;
		return {};
	}, [request?.formData]);

	// Build sections from formSchema, with values from formData
	const sections = useMemo(() => {
		if (!formSchema?.sections) return [];

		const buildFields = (
			sectionId: string,
			sectionData: unknown,
			fields: FormSchemaField[],
		) =>
			fields.map((field) => {
				let value: unknown;
				if (
					sectionData &&
					typeof sectionData === "object" &&
					!Array.isArray(sectionData)
				) {
					value = (sectionData as Record<string, unknown>)[field.id];
				}
				if (value === undefined) {
					value = formDataObj[field.id];
				}
				const label = getLocalized(field.label, lang) || field.id;
				let display: string;
				if (field.options && typeof value === "string") {
					const opt = field.options.find((o) => o.value === value);
					display = opt
						? getLocalized(opt.label, lang) || value
						: renderValue(value, lang);
				} else {
					display = renderValue(value, lang);
				}
				const fieldPath = `${sectionId}.${field.id}`;
				return {
					id: field.id,
					fieldPath,
					label,
					display,
					isEmpty: display === "—",
				};
			});

		// Merge contact_info + residence_address + homeland_address into one "Coordonnées" section
		const mergedContactIds = new Set(["contact_info", "residence_address", "homeland_address"]);
		const skippedIds = new Set(["emergency_residence", "emergency_homeland", ...mergedContactIds]);

		const templateSections = formSchema.sections
			.filter((s) => !skippedIds.has(s.id))
			.map((section) => {
				const sectionData = formDataObj[section.id];
				return {
					id: section.id,
					title: getLocalized(section.title, lang) || section.id,
					fields: buildFields(section.id, sectionData, section.fields ?? []),
				};
			})
			.filter((s) => s.fields.length > 0);

		// Build merged "Coordonnées" section
		const coordFields: typeof templateSections[0]["fields"] = [];
		for (const sId of ["contact_info", "residence_address", "homeland_address"] as const) {
			const schemaSection = formSchema.sections.find((s) => s.id === sId);
			if (schemaSection) {
				coordFields.push(
					...buildFields(sId, formDataObj[sId], schemaSection.fields ?? []),
				);
			}
		}
		if (coordFields.length > 0) {
			// Insert after family_info or at the start
			const insertAfter = templateSections.findIndex((s) => s.id === "family_info");
			const pos = insertAfter >= 0 ? insertAfter + 1 : 0;
			templateSections.splice(pos, 0, {
				id: "coordinates",
				title: lang === "fr" ? "Coordonnées" : "Contact & Addresses",
				fields: coordFields,
			});
		}

		// Inject "Emergency Contacts" section from formData array
		const ecArray = formDataObj["emergency_contacts"];
		if (Array.isArray(ecArray) && ecArray.length > 0) {
			const fieldKeys = ["last_name", "first_name", "phone", "email", "country"] as const;
			const ecFields: typeof templateSections[0]["fields"] = [];
			ecArray.forEach((c: any, i: number) => {
				if (!c || typeof c !== "object") return;
				for (const key of fieldKeys) {
					const value = c[key];
					const display = renderValue(value, lang);
					if (display !== "—") {
						ecFields.push({
							id: `ec_${i}_${key}`,
							fieldPath: `emergency_contacts.${i}.${key}`,
							label: key,
							display,
							isEmpty: false,
						});
					}
				}
			});

			if (ecFields.length > 0) {
				const insertIdx = templateSections.findIndex((s) => s.id === "coordinates");
				const pos = insertIdx >= 0 ? insertIdx + 1 : templateSections.length;
				templateSections.splice(pos, 0, {
					id: "emergency_contacts",
					title: lang === "fr" ? "Contacts d'urgence" : "Emergency Contacts",
					fields: ecFields,
				});
			}
		}

		return templateSections;
	}, [formSchema, formDataObj, lang]);

	// Field validation tracking
	const fieldValidations = (request?.fieldValidations ?? {}) as Record<
		string,
		{ validatedAt: number; validatedBy: string }
	>;
	const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
	const validatedFields = sections.reduce(
		(sum, s) =>
			sum + s.fields.filter((f) => fieldValidations[f.fieldPath]).length,
		0,
	);
	const fieldProgress =
		totalFields > 0 ? (validatedFields / totalFields) * 100 : 0;

	// Prepare Agent Options for Combobox
	const agentOptions = useMemo(() => {
		if (!members) return [];
		return members.map((m) => {
			const posStr = m.positionTitle
				? getLocalized(m.positionTitle, lang)
				: "Sans poste";
			return {
				value: m.membershipId,
				label: `${m.firstName} ${m.lastName} - ${posStr}`,
			};
		});
	}, [members, lang]);

	const assignedToId = useMemo(() => {
		if (!request?.assignedTo) return null;
		const rawAssignedTo = request.assignedTo as any;
		return typeof rawAssignedTo === "string"
			? rawAssignedTo
			: rawAssignedTo._id;
	}, [request?.assignedTo]);

	const assignedAgent = useMemo(() => {
		if (!assignedToId || !members) return null;
		return members.find((m) => m.membershipId === assignedToId);
	}, [assignedToId, members]);

	useEffect(() => {
		if (request?._id && viewedRequestId.current !== request._id) {
			viewedRequestId.current = request._id;
			captureEvent("admin_request_opened", {
				request_type: (request.service as any)?.name?.fr || "Unknown",
				current_status: request.status,
			});
		}
	}, [request]);

	// ─── Loading / Not found ────────────────────────────────────────
	if (request === undefined) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (request === null || isError) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3">
				<FileText className="h-10 w-10 text-muted-foreground/40" />
				<p className="text-muted-foreground">{t("requestDetail.notFound")}</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => navigate({ to: "/requests" })}
				>
					<ArrowLeft className="h-4 w-4 mr-1" />
					{t("requestDetail.backToList")}
				</Button>
			</div>
		);
	}

	const handleStatusUpdate = async (newStatus: string) => {
		setIsStatusUpdating(true);
		try {
			const oldStatus = request.status;
			await updateStatus({ requestId: request._id, status: newStatus as any });
			captureEvent("admin_request_status_changed", {
				request_type: (request.service as any)?.name?.fr || "Unknown",
				old_status: oldStatus,
				new_status: newStatus,
			});
			toast.success(t("requestDetail.statusUpdated"));
		} catch {
			toast.error(t("common.error"));
		} finally {
			setIsStatusUpdating(false);
		}
	};

	const statusHistory = (request as any).statusHistory ?? [];

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 md:p-6 min-w-0 overflow-hidden">
			<PageHeader
				title={
					<div className="flex items-center gap-3">
						<span className="truncate max-w-[200px] sm:max-w-[400px]">
							<h2 className="text-xl font-semibold">
								{t("requestDetail.title")}
							</h2>
						</span>
						<Badge variant="outline" className="font-mono text-xs shadow-sm">
							# {request.reference || request._id.slice(-6).toUpperCase()}
						</Badge>
					</div>
				}
				actions={
					<div className="flex items-center gap-3">
						{canDo("requests.process") && (
							<MultiSelect
								type="single"
								selected={request.status}
								onChange={(value) => {
									if (value && value !== request.status) {
										handleStatusUpdate(value);
									}
								}}
								disabled={isStatusUpdating}
								className="w-[220px] h-9"
								placeholder={t(
									"fields.requestStatus.placeholder",
									"Changer le statut",
								)}
								searchPlaceholder={t("common.search")}
								emptyText={t("common.noResults")}
								showSelected={false}
								options={[
									request.status,
									...getValidNextStatuses(request.status as RequestStatus),
								].map((status) => ({
									value: status,
									label: t(`fields.requestStatus.options.${status}`, status),
									component: (
										<div className="flex items-center gap-2">
											<div
												className={cn(
													"w-2 h-2 rounded-full shrink-0",
													getStatusStyle(status).dot,
												)}
											/>
											<span>
												{t(`fields.requestStatus.options.${status}`, status)}
											</span>
										</div>
									),
								}))}
							/>
						)}
						{/* Request Action */}
						{canDo("requests.process") && (
							<RequestActionModal
								requestId={request._id}
								formSchema={request.service?.formSchema as any}
								formData={formDataObj}
							/>
						)}
						{/* Call Button */}
						{request.userId && activeOrgId && (
							<CallButton
								orgId={activeOrgId}
								participantUserId={request.userId as any}
								requestId={request._id}
								variant="outline"
								size="sm"
							/>
						)}
					</div>
				}
			/>

			{/* ── Action Banners ─────────────────────────────────────── */}
			{request.actionsRequired
				?.filter((a: any) => !a.completedAt)
				.map((action: any) => (
					<Alert
						key={action.id}
						variant="destructive"
						className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
					>
						<AlertTriangle className="h-4 w-4 text-amber-600" />
						<AlertTitle className="text-amber-800 dark:text-amber-400">
							{t(
								"requestDetail.actionRequired.title",
								"Action requise du citoyen",
							)}
							<Badge variant="outline" className="ml-1 text-xs">
								{String(
									t(
										`requestDetail.actionRequired.types.${action.type}`,
										action.type,
									),
								)}
							</Badge>
						</AlertTitle>
						<AlertDescription className="text-amber-700 dark:text-amber-300">
							{action.message}
							{/* Structured details: documents requested */}
							{action.documentTypes?.length > 0 && (
								<ul className="mt-2 ml-4 list-disc text-xs space-y-0.5">
									{action.documentTypes.map((doc: any) => (
										<li key={doc.type}>
											{getLocalized(doc.label, lang) || doc.type}
											{doc.required && (
												<span className="text-amber-600 ml-1">*</span>
											)}
										</li>
									))}
								</ul>
							)}
							{/* Structured details: fields requested */}
							{action.fields?.length > 0 && (
								<ul className="mt-2 ml-4 list-disc text-xs space-y-0.5">
									{action.fields.map((field: any) => (
										<li key={field.fieldPath}>
											{getLocalized(field.label, lang) || field.fieldPath}
											{field.currentValue != null && (
												<span className="text-muted-foreground ml-1">
													({t("requestDetail.actionRequired.currentValue", "actuel")}: {String(field.currentValue)})
												</span>
											)}
										</li>
									))}
								</ul>
							)}
						</AlertDescription>
					</Alert>
				))}

			{request.actionsRequired
				?.filter((a: any) => a.completedAt)
				.map((action: any) => (
					<Alert key={action.id} className="border-border bg-muted/30">
						<CheckCircle className="h-4 w-4 text-green-600" />
						<AlertTitle>
							{t(
								"requestDetail.actionCompleted.title",
								"Réponse reçue du citoyen",
							)}
							<Badge variant="outline" className="ml-1 text-xs text-green-600">
								{t("requestDetail.actionCompleted.badge")}
							</Badge>
						</AlertTitle>
						<AlertDescription className="text-muted-foreground">
							{t(
								"requestDetail.actionCompleted.description",
								"Le citoyen a fourni les éléments demandés. Vérifiez et validez sa réponse.",
							)}
						</AlertDescription>
					</Alert>
				))}

			{/* ── Main Content ───────────────────────────────────────── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
				{/* ── LEFT: Form Data + Documents ── */}
				<div className="lg:col-span-2 space-y-6 min-w-0">
					{/* Form Data */}
					<div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
						<div className="px-5 py-4 border-b border-border/40 bg-muted/20">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="rounded-md bg-primary/10 p-1.5">
										<FileText className="h-4 w-4 text-primary" />
									</div>
									<div>
										<h2 className="font-semibold text-sm">
											{t(
												"requestDetail.formData.title",
												"Données du formulaire",
											)}
										</h2>
										<p className="text-xs text-muted-foreground">
											{validatedFields}/{totalFields}{" "}
											{t(
												"requestDetail.formData.fieldsVerified",
												"champs vérifiés",
											)}
										</p>
									</div>
								</div>
								{fieldProgress === 100 && (
									<Badge
										variant="outline"
										className="bg-green-500/10 text-green-600 border-green-500/30"
									>
										<Check className="h-3 w-3 mr-1" />
										{t("requestDetail.formData.allVerified")}
									</Badge>
								)}
							</div>
							<Progress value={fieldProgress} className="h-2 mt-3" />
						</div>

						<div className="p-5">
							{sections.length > 0 ? (
								<Tabs defaultValue={sections[0].id} className="w-full">
									<div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
										<TabsList className="h-auto justify-start w-max">
											{sections.map((section) => {
												const sectionValidated = section.fields.filter(
													(f) => fieldValidations[f.fieldPath],
												).length;
												const sectionTotal = section.fields.length;
												return (
													<TabsTrigger
														key={section.id}
														value={section.id}
														className="shrink-0 gap-1.5 text-xs sm:text-sm"
													>
														{section.title}
														<Badge
															variant="secondary"
															className={cn(
																"text-[10px] px-1.5 py-0 h-4 min-w-[28px] justify-center",
																sectionValidated === sectionTotal
																	? "bg-green-500/20 text-green-600"
																	: "",
															)}
														>
															{sectionValidated}/{sectionTotal}
														</Badge>
													</TabsTrigger>
												);
											})}
										</TabsList>
									</div>

									{sections.map((section) => (
										<TabsContent key={section.id} value={section.id}>
											{(() => {
												// ── Helper: validated checkbox field row ──
												const ValidatedField = ({ fieldPath, label, value }: { fieldPath: string; label: string; value: string }) => {
													const isValidated = !!fieldValidations[fieldPath];
													return (
														<div className="flex items-center gap-2 py-1">
															<Checkbox
																checked={isValidated}
																disabled={!canDo("requests.validate")}
																onCheckedChange={(checked) => {
																	toggleFieldValidation({ requestId: request._id, fieldPath, validated: !!checked });
																}}
																className="shrink-0 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
															/>
															<span className="text-muted-foreground text-sm w-28 shrink-0">{label}</span>
															<span className="text-sm truncate">{value}</span>
														</div>
													);
												};

												// ── Card wrapper ──
												const Card = ({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) => (
													<div className="rounded-lg border border-border/60 bg-muted/30 p-4">
														<div className="flex items-center justify-between mb-3">
															<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
																{title}
															</span>
															{badge}
														</div>
														<div className="space-y-1">
															{children}
														</div>
													</div>
												);

												// ── Emergency Contacts ──
												if (section.id === "emergency_contacts") {
													const ecData = formDataObj["emergency_contacts"] as any[] | undefined;
													if (!ecData || !Array.isArray(ecData)) return null;
													const ecLabels: Record<string, { fr: string; en: string }> = {
														last_name: { fr: "Nom", en: "Last Name" },
														first_name: { fr: "Prénom", en: "First Name" },
														phone: { fr: "Téléphone", en: "Phone" },
														email: { fr: "Email", en: "Email" },
													};
													return (
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
															{ecData.map((contact: any, idx: number) => {
																if (!contact || typeof contact !== "object") return null;
																return (
																	<Card
																		key={idx}
																		title={`Contact ${idx + 1}`}
																		badge={contact.country ? (
																			<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
																				{renderValue(contact.country, lang)}
																			</span>
																		) : undefined}
																	>
																		{(["last_name", "first_name", "phone", "email"] as const).map((key) => {
																			const val = contact[key];
																			if (!val) return null;
																			return (
																				<ValidatedField
																					key={key}
																					fieldPath={`emergency_contacts.${idx}.${key}`}
																					label={lang === "fr" ? ecLabels[key].fr : ecLabels[key].en}
																					value={renderValue(val, lang)}
																				/>
																			);
																		})}
																	</Card>
																);
															})}
														</div>
													);
												}

												// ── Family Info ──
												if (section.id === "family_info") {
													const fam = formDataObj["family_info"] as Record<string, any> | undefined;
													if (!fam || typeof fam !== "object") return null;

													const maritalField = section.fields.find((f) => f.id === "marital_status");
													const maritalDisplay = maritalField ? maritalField.display : renderValue(fam.marital_status, lang);

													const familyCards: Array<{ title: string; content: React.ReactNode[] }> = [];

													if (fam.father_last_name || fam.father_first_name) {
														familyCards.push({
															title: lang === "fr" ? "Père" : "Father",
															content: [
																fam.father_last_name && <ValidatedField key="fln" fieldPath="family_info.father_last_name" label={lang === "fr" ? "Nom" : "Last Name"} value={fam.father_last_name} />,
																fam.father_first_name && <ValidatedField key="ffn" fieldPath="family_info.father_first_name" label={lang === "fr" ? "Prénom" : "First Name"} value={fam.father_first_name} />,
															].filter(Boolean),
														});
													}

													if (fam.mother_last_name || fam.mother_first_name) {
														familyCards.push({
															title: lang === "fr" ? "Mère" : "Mother",
															content: [
																fam.mother_last_name && <ValidatedField key="mln" fieldPath="family_info.mother_last_name" label={lang === "fr" ? "Nom" : "Last Name"} value={fam.mother_last_name} />,
																fam.mother_first_name && <ValidatedField key="mfn" fieldPath="family_info.mother_first_name" label={lang === "fr" ? "Prénom" : "First Name"} value={fam.mother_first_name} />,
															].filter(Boolean),
														});
													}

													if (fam.spouse_last_name || fam.spouse_first_name) {
														familyCards.push({
															title: lang === "fr" ? "Conjoint(e)" : "Spouse",
															content: [
																fam.spouse_last_name && <ValidatedField key="sln" fieldPath="family_info.spouse_last_name" label={lang === "fr" ? "Nom" : "Last Name"} value={fam.spouse_last_name} />,
																fam.spouse_first_name && <ValidatedField key="sfn" fieldPath="family_info.spouse_first_name" label={lang === "fr" ? "Prénom" : "First Name"} value={fam.spouse_first_name} />,
															].filter(Boolean),
														});
													}

													return (
														<div className="space-y-4 pt-3">
															{fam.marital_status && (
																<ValidatedField
																	fieldPath="family_info.marital_status"
																	label={lang === "fr" ? "Situation" : "Status"}
																	value={maritalDisplay}
																/>
															)}
															{familyCards.length > 0 && (
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	{familyCards.map((card) => (
																		<Card key={card.title} title={card.title}>
																			{card.content}
																		</Card>
																	))}
																</div>
															)}
														</div>
													);
												}

												// ── Coordinates (merged contact + addresses) ──
												if (section.id === "coordinates") {
													const contact = formDataObj["contact_info"] as Record<string, any> | undefined;
													const residence = formDataObj["residence_address"] as Record<string, any> | undefined;
													const homeland = formDataObj["homeland_address"] as Record<string, any> | undefined;

													return (
														<div className="space-y-4 pt-3">
															{/* Phone & Email */}
															{contact && (
																<div className="space-y-1">
																	{contact.phone && <ValidatedField fieldPath="contact_info.phone" label={lang === "fr" ? "Téléphone" : "Phone"} value={contact.phone} />}
																	{contact.email && <ValidatedField fieldPath="contact_info.email" label={lang === "fr" ? "Email" : "Email"} value={contact.email} />}
																</div>
															)}
															{/* Address cards */}
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																{residence && Object.values(residence).some(Boolean) && (
																	<Card title={lang === "fr" ? "Adresse de résidence" : "Residence Address"}>
																		{residence.residence_street && <ValidatedField fieldPath="residence_address.residence_street" label={lang === "fr" ? "Rue" : "Street"} value={residence.residence_street} />}
																		{residence.residence_city && <ValidatedField fieldPath="residence_address.residence_city" label={lang === "fr" ? "Ville" : "City"} value={residence.residence_city} />}
																		{residence.residence_postal_code && <ValidatedField fieldPath="residence_address.residence_postal_code" label={lang === "fr" ? "Code postal" : "Postal Code"} value={residence.residence_postal_code} />}
																		{residence.residence_country && <ValidatedField fieldPath="residence_address.residence_country" label={lang === "fr" ? "Pays" : "Country"} value={renderValue(residence.residence_country, lang)} />}
																	</Card>
																)}
																{homeland && Object.values(homeland).some(Boolean) && (
																	<Card title={lang === "fr" ? "Adresse au Gabon" : "Address in Gabon"}>
																		{homeland.homeland_street && <ValidatedField fieldPath="homeland_address.homeland_street" label={lang === "fr" ? "Rue" : "Street"} value={homeland.homeland_street} />}
																		{homeland.homeland_city && <ValidatedField fieldPath="homeland_address.homeland_city" label={lang === "fr" ? "Ville" : "City"} value={homeland.homeland_city} />}
																		{homeland.homeland_postal_code && <ValidatedField fieldPath="homeland_address.homeland_postal_code" label={lang === "fr" ? "Code postal" : "Postal Code"} value={homeland.homeland_postal_code} />}
																		{homeland.homeland_country && <ValidatedField fieldPath="homeland_address.homeland_country" label={lang === "fr" ? "Pays" : "Country"} value={renderValue(homeland.homeland_country, lang)} />}
																	</Card>
																)}
															</div>
														</div>
													);
												}

												// ── Default: Table ──
												return (
													<Table className="table-fixed w-full">
														<TableBody>
															{section.fields.map((field) => {
																const isValidated = !!fieldValidations[field.fieldPath];
																return (
																	<TableRow key={field.id} className="transition-colors">
																		<TableCell className="w-8 pr-0 align-top">
																			<Checkbox
																				checked={isValidated}
																				disabled={!canDo("requests.validate")}
																				onCheckedChange={(checked) => {
																					toggleFieldValidation({
																						requestId: request._id,
																						fieldPath: field.fieldPath,
																						validated: !!checked,
																					});
																				}}
																				className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
																			/>
																		</TableCell>
																		<TableCell className="text-muted-foreground font-medium w-[40%] truncate">
																			{field.label}
																		</TableCell>
																		<TableCell className="truncate">
																			{field.display}
																		</TableCell>
																	</TableRow>
																);
															})}
														</TableBody>
													</Table>
												);
											})()}
										</TabsContent>
									))}
								</Tabs>
							) : (
								<div className="text-muted-foreground italic text-center py-8 text-sm">
									{t(
										"requestDetail.formData.empty",
										"Aucune donnée de formulaire",
									)}
								</div>
							)}
						</div>
					</div>

					{/* Documents Checklist */}
					<DocumentChecklist
						requiredDocuments={(request.joinedDocuments || []) as any}
						submittedDocuments={(request.documents || []).map((doc: any) => {
							const firstFile = doc.files?.[0];
							return {
								...doc,
								filename: firstFile?.filename ?? doc.filename ?? "document",
								mimeType: firstFile?.mimeType ?? doc.mimeType ?? "",
								sizeBytes: firstFile?.sizeBytes ?? doc.sizeBytes ?? 0,
								url: doc.url || undefined,
								storageId: doc.storageId || firstFile?.storageId || undefined,
							};
						})}
						isAgent={canDo("documents.validate")}
						onValidate={async (docId) => {
							try {
								await validateDocument({
									documentId: docId,
									status: "validated" as any,
								});
								captureEvent("admin_document_verified", {
									document_type: "document",
									verification_action: "accepted",
								});
								toast.success(t("requestDetail.documents.validated"));
							} catch {
								toast.error(
									t(
										"requestDetail.documents.validateError",
										"Erreur lors de la validation",
									),
								);
							}
						}}
						onReject={async (docId, reason) => {
							try {
								await validateDocument({
									documentId: docId,
									status: "rejected" as any,
									rejectionReason: reason,
								});
								captureEvent("admin_document_verified", {
									document_type: "document",
									verification_action: "rejected",
								});
								toast.success(t("requestDetail.documents.rejected"));
							} catch {
								toast.error(
									t(
										"requestDetail.documents.rejectError",
										"Erreur lors du rejet",
									),
								);
							}
						}}
					/>
				</div>

				{/* ── RIGHT: Profile, Timeline, Notes ── */}
				<div className="space-y-6">
					{/* User Profile */}
					{request.userId && <UserProfilePreviewCard userId={request.userId} />}

					{/* Rendez-vous Associés */}
					{(request as any).appointments &&
						(request as any).appointments.length > 0 && (
							<div className="space-y-4">
								{(request as any).appointments.map((apt: any) => (
									<Card key={apt._id} className="border-border">
										<CardHeader className="py-3 px-4 border-b bg-muted/20 border-primary/10">
											<div className="flex items-center justify-between">
												<CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
													<Calendar className="h-4 w-4" />
													{t(
														"requestDetail.appointment.title",
														"Rendez-vous associé",
													)}
												</CardTitle>
												<Badge
													variant="outline"
													className="text-[10px] shrink-0 bg-background"
												>
													{t(`dashboard.appointments.statuses.${apt.status}`)}
												</Badge>
											</div>
										</CardHeader>
										<CardContent className="p-4 flex flex-col gap-4">
											<div>
												<p className="font-medium text-primary">
													{new Date(apt.date).toLocaleDateString(
														lang === "fr" ? "fr-FR" : "en-US",
														{
															day: "numeric",
															month: "long",
															year: "numeric",
														},
													)}
												</p>
												<p className="text-sm text-primary/80">
													{t("common.at")} {apt.time}
												</p>
											</div>
											<Button
												size="sm"
												variant="secondary"
												className="w-full"
												onClick={() =>
													navigate({
														to: "/appointments/$appointmentId",
														params: { appointmentId: apt._id },
													})
												}
											>
												<Eye className="mr-2 h-4 w-4" />
												{t(
													"requestDetail.appointment.view",
													"Détails du rendez-vous",
												)}
											</Button>
										</CardContent>
									</Card>
								))}
							</div>
						)}

					{/* Agent Assigné */}
					{(request.assignedTo || canDo("requests.assign")) && (
						<Card>
							<CardHeader className="py-3 px-4 border-b bg-muted/20">
								<CardTitle className="text-sm font-semibold flex items-center gap-2">
									<Users className="h-4 w-4 text-muted-foreground" />
									{t("requestDetail.agentAssignment.title")}
								</CardTitle>
							</CardHeader>
							<CardContent className="p-4 flex flex-col gap-4">
								{assignedAgent ? (
									<div className="flex items-center gap-3">
										<Avatar className="h-10 w-10">
											<AvatarImage src={assignedAgent.avatarUrl} />
											<AvatarFallback>
												{assignedAgent.firstName?.[0]}
												{assignedAgent.lastName?.[0]}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{assignedAgent.firstName} {assignedAgent.lastName}
											</p>
											{assignedAgent.positionTitle && (
												<p className="text-xs text-muted-foreground truncate">
													{getLocalized(assignedAgent.positionTitle, lang)}
												</p>
											)}
										</div>
									</div>
								) : (
									<div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
										{t(
											"requestDetail.agentAssignment.unassigned",
											"Il n'y a pas d'agent assigné à cette demande pour le moment.",
										)}
									</div>
								)}

								{canDo("requests.assign") && (
									<Combobox
										options={agentOptions}
										value={assignedToId}
										onValueChange={async (value) => {
											try {
												await assignAgent({
													requestId: request._id,
													agentId: value as Id<"memberships">,
												});
												toast.success(
													t(
														"requestDetail.agentAssigned",
														"Agent assigné avec succès",
													),
												);
											} catch {
												toast.error(t("common.error"));
											}
										}}
										placeholder={t(
											"requestDetail.assignAgent",
											"Assigner à un agent...",
										)}
										searchPlaceholder={t("common.search")}
										emptyText={t("common.noResult")}
									/>
								)}
							</CardContent>
						</Card>
					)}

					{/* Status Timeline */}
					{statusHistory.length > 0 && (
						<div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
							<div className="px-4 py-3 border-b border-border/40 bg-muted/20">
								<h3 className="font-semibold text-sm flex items-center gap-2">
									<Clock className="h-4 w-4 text-muted-foreground" />
									{t("requestDetail.timeline.title")}
									<Badge
										variant="secondary"
										className="text-xs font-normal ml-auto"
									>
										{statusHistory.length}
									</Badge>
								</h3>
							</div>
							<div className="p-4">
								<div className="relative">
									{/* Timeline line */}
									<div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

									<div className="space-y-4">
										{statusHistory.map((event: any, idx: number) => {
											const toStyle = getStatusStyle(event.to);
											const isLast = idx === statusHistory.length - 1;

											return (
												<div
													key={event._id}
													className="relative flex gap-3 pl-0"
												>
													{/* Dot */}
													<div
														className={cn(
															"relative z-10 mt-1 h-[15px] w-[15px] rounded-full border-2 border-background shrink-0",
															isLast ? toStyle.dot : "bg-muted-foreground/30",
														)}
													/>

													{/* Content */}
													<div className="flex-1 min-w-0 pb-1">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span
																className={cn(
																	"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
																	toStyle.bg,
																	toStyle.text,
																)}
															>
																{String(
																	t(
																		`fields.requestStatus.options.${event.to}`,
																		event.to,
																	),
																)}
															</span>
															{event.from && (
																<span className="text-[10px] text-muted-foreground">
																	←{" "}
																	{String(
																		t(
																			`fields.requestStatus.options.${event.from}`,
																			event.from,
																		),
																	)}
																</span>
															)}
														</div>
														{event.note && (
															<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
																{event.note}
															</p>
														)}
														<span className="text-[10px] text-muted-foreground/70">
															{formatDistanceToNow(event.createdAt, {
																addSuffix: true,
																locale: dateFnsLocale,
															})}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Internal Notes */}
					<Card className="flex flex-col max-h-[400px]">
						<CardHeader className="shrink-0 pb-3">
							<CardTitle className="text-sm flex items-center gap-2">
								{t("requestDetail.notes.title")}
								<Badge
									variant="secondary"
									className="text-xs font-normal ml-auto"
								>
									{agentNotes?.length || 0}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 overflow-y-auto space-y-3">
							{!agentNotes || agentNotes.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									{t("requestDetail.notes.empty")}
								</p>
							) : (
								agentNotes.map((note) => (
									<div
										key={note._id}
										className={cn(
											"p-3 rounded-lg text-sm",
											note.source === "ai"
												? "bg-primary/5 border border-primary/15"
												: "bg-muted/40",
										)}
									>
										{note.source === "ai" && (
											<div className="flex items-center gap-1.5 mb-2">
												<Bot className="h-3.5 w-3.5 text-primary" />
												<span className="text-xs font-medium text-primary">
													{t("requestDetail.notes.aiAnalysis")}
												</span>
												{note.aiConfidence && (
													<Badge variant="outline" className="text-xs ml-auto">
														{note.aiConfidence}%{" "}
														{t("requestDetail.notes.confidence")}
													</Badge>
												)}
											</div>
										)}
										<p className="whitespace-pre-wrap">{note.content}</p>
										<div className="flex justify-between mt-2 text-xs text-muted-foreground">
											<span>
												{note.source === "ai"
													? "IA"
													: note.author
														? `${note.author.firstName} ${note.author.lastName}`
														: "Agent"}
											</span>
											<span>
												{formatDistanceToNow(note.createdAt, {
													addSuffix: true,
													locale: dateFnsLocale,
												})}
											</span>
										</div>
									</div>
								))
							)}
						</CardContent>
						<CardFooter className="shrink-0 pt-3">
							{canDo("requests.process") && (
								<div className="flex w-full gap-2">
									<Textarea
										placeholder={t(
											"requestDetail.notes.placeholder",
											"Ajouter une note...",
										)}
										className="min-h-[40px] text-sm"
										value={noteContent}
										onChange={(e) => setNoteContent(e.target.value)}
									/>
									<Button
										size="icon"
										onClick={async () => {
											if (!noteContent.trim()) return;
											try {
												await createNote({
													requestId: request._id,
													content: noteContent,
												});
												captureEvent("admin_internal_comment_added");
												setNoteContent("");
												toast.success(t("requestDetail.notes.added"));
											} catch {
												toast.error(
													t(
														"requestDetail.notes.addError",
														"Erreur lors de l'ajout",
													),
												);
											}
										}}
									>
										<Send className="h-4 w-4" />
									</Button>
								</div>
							)}
						</CardFooter>
					</Card>
				</div>
			</div>
		</div>
	);
}
