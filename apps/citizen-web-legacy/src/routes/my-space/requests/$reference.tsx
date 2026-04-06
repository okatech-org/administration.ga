import { api } from "@convex/_generated/api";
import { RequestStatus, ServiceCategory } from "@convex/lib/constants";
import { getLocalized } from "@convex/lib/utils";
import type { FormField } from "@convex/lib/validators";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Building2,
	Calendar,
	Clock,
	CreditCard,
	Eye,
	FileText,
	Globe,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Sparkles,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useFormFillOptional } from "@/components/ai/FormFillContext";
import { ActiveCallBanner } from "@/components/meetings/active-call-banner";
import { OrgCallButton } from "@/components/meetings/org-call-button";
import { ActionRequiredCard } from "@/components/my-space/action-required-card";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { DocumentChecklist } from "@/components/shared/DocumentChecklist";
import { DynamicForm } from "@/components/services/DynamicForm";
import { RegistrationForm } from "@/components/services/RegistrationForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCitizenData } from "@/hooks/use-citizen-data";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { getLocalizedValue } from "@/lib/i18n-utils";

export const Route = createFileRoute("/my-space/requests/$reference")({
	component: UserRequestDetail,
});

function resolveFieldValue(
	value: unknown,
	lang: string,
	t: (key: string) => string,
	field?: FormField,
): string {
	if (value === null || value === undefined || value === "") return "—";
	if (typeof value === "boolean")
		return value ? t("common.yes") : t("common.no");
	if (typeof value === "object") {
		if ("fr" in (value as Record<string, unknown>)) {
			return getLocalized(value as Record<string, string>, lang);
		}
		return JSON.stringify(value);
	}

	const str = String(value);
	const locale = lang === "fr" ? "fr-FR" : "en-US";

	// Resolve select/radio option labels
	if (field?.options) {
		const opt = field.options.find((o) => o.value === str);
		if (opt?.label) return getLocalized(opt.label, lang) || str;
	}

	// Country code resolution (2-letter ISO)
	if (/^[A-Z]{2}$/.test(str)) {
		try {
			const countryNames = new Intl.DisplayNames([locale], {
				type: "region",
			});
			const name = countryNames.of(str);
			if (name) return name;
		} catch {
			/* fallback */
		}
	}

	// Date resolution (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
		try {
			return new Date(str + "T00:00:00").toLocaleDateString(locale, {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
		} catch {
			/* fallback */
		}
	}

	return str;
}

// ─── Main Component ─────────────────────────────────────────────────

function UserRequestDetail() {
	const { reference } = Route.useParams();
	const { t, i18n } = useTranslation();
	const { profile } = useCitizenData();
	const formFillContext = useFormFillOptional();
	const lang = i18n.language;

	// Look up the request by reference string
	const { data: request, isPending, isError } = useAuthenticatedConvexQuery(
		api.functions.requests.getByReferenceId,
		{ referenceId: reference },
	);

	const { mutateAsync: cancelRequest } = useConvexMutationQuery(
		api.functions.requests.cancel,
	);
	const { mutateAsync: deleteDraft } = useConvexMutationQuery(
		api.functions.requests.deleteDraft,
	);
	const { mutateAsync: submitRequest } = useConvexMutationQuery(
		api.functions.requests.submit,
	);
	const navigate = useNavigate();

	const [isSubmitting, setIsSubmitting] = useState(false);

	const isDraft = request?.status === RequestStatus.Draft;
	const canCancel =
		request?.status === RequestStatus.Draft ||
		request?.status === RequestStatus.Pending;

	// ─── Build schema-driven sections ────────────────────────────────

	const formSchema = request?.service?.formSchema;
	const formData = request?.formData as Record<string, unknown> | undefined;

	const sections = useMemo(() => {
		if (!formData) return [];

		const buildRows = (
			_sectionId: string,
			sectionData: unknown,
			fields: FormField[],
		) => {
			const rows = fields.map((field) => {
				let value: unknown;
				if (
					sectionData &&
					typeof sectionData === "object" &&
					!Array.isArray(sectionData)
				) {
					value = (sectionData as Record<string, unknown>)[field.id];
				}
				if (value === undefined) {
					value = formData[field.id];
				}
				return {
					key: field.id,
					label: getLocalized(field.label, lang) || field.id,
					value: resolveFieldValue(value, lang, t, field),
				};
			});
			// Add any extra fields not in schema
			if (
				sectionData &&
				typeof sectionData === "object" &&
				!Array.isArray(sectionData)
			) {
				const schemaFieldIds = new Set(fields.map((f) => f.id));
				for (const [key, val] of Object.entries(
					sectionData as Record<string, unknown>,
				)) {
					if (!schemaFieldIds.has(key)) {
						rows.push({
							key,
							label: key,
							value: resolveFieldValue(val, lang, t),
						});
					}
				}
			}
			return rows;
		};

		// If schema has sections, use them (same as admin page)
		if (formSchema?.sections && formSchema.sections.length > 0) {
			// Merge contact_info + residence_address + homeland_address into one "Coordonnées" section
			const mergedContactIds = new Set([
				"contact_info",
				"residence_address",
				"homeland_address",
			]);
			const skippedIds = new Set([
				"emergency_residence",
				"emergency_homeland",
				...mergedContactIds,
			]);

			const templateSections = formSchema.sections
				.filter((s) => !skippedIds.has(s.id))
				.map((section) => ({
					id: section.id,
					title: getLocalized(section.title, lang) || section.id,
					rows: buildRows(
						section.id,
						formData[section.id],
						section.fields || [],
					),
				}))
				.filter((s) => s.rows.length > 0);

			// Build merged "Coordonnées" section
			const coordRows: typeof templateSections[0]["rows"] = [];
			for (const sId of [
				"contact_info",
				"residence_address",
				"homeland_address",
			] as const) {
				const schemaSection = formSchema.sections.find((s) => s.id === sId);
				if (schemaSection) {
					coordRows.push(
						...buildRows(sId, formData[sId], schemaSection.fields ?? []),
					);
				}
			}
			if (coordRows.length > 0) {
				const insertAfter = templateSections.findIndex(
					(s) => s.id === "family_info",
				);
				const pos = insertAfter >= 0 ? insertAfter + 1 : 0;
				templateSections.splice(pos, 0, {
					id: "coordinates",
					title: lang === "fr" ? "Coordonnées" : "Contact & Addresses",
					rows: coordRows,
				});
			}

			// Inject "Emergency Contacts" section from formData array
			const ecArray = formData["emergency_contacts"];
			if (Array.isArray(ecArray) && ecArray.length > 0) {
				const ecRows: typeof templateSections[0]["rows"] = [];
				ecArray.forEach((c: any, i: number) => {
					if (!c || typeof c !== "object") return;
					for (const key of [
						"last_name",
						"first_name",
						"phone",
						"email",
						"country",
					]) {
						const val = c[key];
						const display = resolveFieldValue(val, lang, t);
						if (display !== "—") {
							ecRows.push({
								key: `ec_${i}_${key}`,
								label: key,
								value: display,
							});
						}
					}
				});
				if (ecRows.length > 0) {
					const insertIdx = templateSections.findIndex(
						(s) => s.id === "coordinates",
					);
					const pos =
						insertIdx >= 0 ? insertIdx + 1 : templateSections.length;
					templateSections.splice(pos, 0, {
						id: "emergency_contacts",
						title:
							lang === "fr"
								? "Contacts d'urgence"
								: "Emergency Contacts",
						rows: ecRows,
					});
				}
			}

			return templateSections;
		}

		// Fallback: iterate formData keys
		return Object.entries(formData)
			.filter(([key]) => key !== "type" && key !== "profileId")
			.map(([sectionId, sectionData]) => {
				if (
					typeof sectionData === "object" &&
					sectionData !== null &&
					!Array.isArray(sectionData) &&
					!("fr" in sectionData)
				) {
					const rows = Object.entries(
						sectionData as Record<string, unknown>,
					).map(([fieldId, value]) => ({
						key: fieldId,
						label: fieldId,
						value: resolveFieldValue(value, lang, t),
					}));
					return {
						id: sectionId,
						title: sectionId,
						rows,
					};
				}
				return {
					id: sectionId,
					title: sectionId,
					rows: [
						{
							key: sectionId,
							label: sectionId,
							value: resolveFieldValue(sectionData, lang, t),
						},
					],
				};
			});
	}, [formData, formSchema, lang, t]);

	// ─── Action handlers ─────────────────────────────────────────────

	const handleAction = async () => {
		try {
			if (!request) {
				toast.error(t("requests.detail.cancelError"));
				return;
			}
			if (isDraft) {
				await deleteDraft({ requestId: request._id });
				toast.success(t("requests.detail.deleted"));
				navigate({ to: "/my-space/requests" });
			} else {
				await cancelRequest({ requestId: request._id });
				toast.success(t("requests.detail.cancelled"));
			}
		} catch (e) {
			const error = e as Error;
			toast.error(error.message || t("requests.detail.cancelError"));
		}
	};

	const getStatusBadge = (status: RequestStatus) => {
		const variants: Record<
			RequestStatus,
			"default" | "secondary" | "destructive" | "outline"
		> = {
			[RequestStatus.Draft]: "secondary",
			[RequestStatus.Pending]: "secondary",
			[RequestStatus.UnderReview]: "default",
			[RequestStatus.Completed]: "default",
			[RequestStatus.Cancelled]: "outline",
			[RequestStatus.ReadyForPickup]: "default",
			[RequestStatus.AppointmentScheduled]: "default",
			[RequestStatus.Validated]: "default",
			[RequestStatus.Submitted]: "default",
			[RequestStatus.InProduction]: "default",
			[RequestStatus.Rejected]: "default",
		};

		return (
			<Badge variant={variants[status] || "outline"}>
				{t(`requests.statuses.${status}`)}
			</Badge>
		);
	};

	if (isError) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<AlertTriangle className="h-8 w-8 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h2 className="text-lg font-semibold">{t("requestDetail.notFound")}</h2>
					<p className="text-sm text-muted-foreground max-w-md">
						{t("requestDetail.notFoundDesc")}
					</p>
				</div>
				<Button variant="outline" onClick={() => navigate({ to: "/my-space" })}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("requestDetail.backToList")}
				</Button>
			</div>
		);
	}

	if (isPending || !request) {
		return (
			<div className="flex flex-1 items-center justify-center p-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Check service type for rendering
	const isRegistrationService =
		request.service?.category === ServiceCategory.Registration;
	const orgService = request.orgService;

	// Handle Form Submission for drafts
	const handleSubmit = async (data: Record<string, unknown>) => {
		setIsSubmitting(true);
		try {
			await submitRequest({
				requestId: request._id,
				formData: data,
			});
			captureEvent("myspace_request_submitted", {
				request_type: (request.service as { slug: string }).slug,
			});

			const requiresAppointment = (
				request.service as { requiresAppointment?: boolean } | undefined
			)?.requiresAppointment;

			if (requiresAppointment) {
				toast.success(t("request.submitted_success"), {
					description: t("request.appointment_required"),
				});
				navigate({ to: `/my-space/requests/${request._id}/appointment` });
			} else {
				toast.success(t("request.submitted_success"), {
					description: t("request.submitted_description"),
				});
				navigate({ to: "/my-space/requests" });
			}
		} catch (error) {
			console.error("Failed to submit request:", error);
			toast.error(t("error.generic"), {
				description: t("error.request_failed"),
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Trigger AI Fill
	const handleAIFill = () => {
		toast.info(t("form.aiAssistantTitle"), {
			description: t("form.aiAssistantDescription"),
		});
	};

	// ===== DRAFT MODE: Show form for editing =====
	if (isDraft) {
		return (
			<div className="space-y-6">
				{/* Header - MySpace Style */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
					className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
				>
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<FileText className="h-6 w-6 text-primary" />
							{getLocalizedValue(
								request.service?.name as
									| { fr: string; en?: string }
									| undefined,
								i18n.language,
							) || t("requests.detail.newRequest")}
						</h1>
						<p className="text-muted-foreground text-sm mt-1">
							{t("requests.draft.subtitle")}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{/* AI Fill Button */}
						{formFillContext && (
							<Button variant="outline" size="sm" onClick={handleAIFill}>
								<Sparkles className="mr-2 h-4 w-4 text-amber-500" />
								{t("form.fillWithAI")}
							</Button>
						)}
						{getStatusBadge(request.status)}
					</div>
				</motion.div>

				{/* Main Content */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.05 }}
					className="max-w-2xl mx-auto"
				>
					{/* Service Info Card */}
					<Card className="mb-6 border-primary/20 bg-primary/5">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between gap-4">
								<div>
									<CardTitle className="text-lg">
										{getLocalizedValue(
											request.service?.name as
												| { fr: string; en?: string }
												| undefined,
											i18n.language,
										)}
									</CardTitle>
									<CardDescription className="mt-1">
										{getLocalizedValue(
											request.service?.description as
												| { fr: string; en?: string }
												| undefined,
											i18n.language,
										)}
									</CardDescription>
								</div>
								{orgService?.estimatedDays && (
									<Badge variant="secondary" className="shrink-0">
										~{orgService.estimatedDays} {t("common.daysUnit")}
									</Badge>
								)}
							</div>
						</CardHeader>
					</Card>

					{/* Form - Registration or Dynamic */}
					{isRegistrationService && profile ? (
						<RegistrationForm
							profile={profile}
							requestType={(request.service as { slug: string })?.slug}
							requiredDocuments={
								request.service?.formSchema?.joinedDocuments || []
							}
							onSubmit={async () => {
								await handleSubmit({});
							}}
							isSubmitting={isSubmitting}
						/>
					) : (
						<DynamicForm
							schema={request.service?.formSchema}
							requestType={(request.service as { slug: string })?.slug}
							defaultValues={
								request.formData as Record<string, unknown> | undefined
							}
							onSubmit={handleSubmit}
							isSubmitting={isSubmitting}
						/>
					)}
				</motion.div>
			</div>
		);
	}

	// ===== READ-ONLY MODE: Show request details =====
	const dateLocale = lang === "fr" ? "fr-FR" : "en-US";

	return (
		<div className="space-y-4 sm:space-y-6 animate-in fade-in px-0 sm:p-1 min-w-0 overflow-hidden">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link to="/my-space/requests">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex-1 min-w-0">
					<h1 className="text-2xl font-bold tracking-tight">
						{getLocalizedValue((request.service as any)?.name, i18n.language) ||
							t("requests.detail.title")}
					</h1>
					<div className="flex flex-wrap items-center gap-2 mt-1">
						{request.reference && (
							<Badge variant="outline" className="font-mono text-xs">
								{request.reference}
							</Badge>
						)}
						<p className="text-sm text-muted-foreground">
							{t("requests.detail.submittedOn", {
								date: new Date(request._creationTime).toLocaleDateString(
									dateLocale,
									{
										day: "numeric",
										month: "long",
										year: "numeric",
									},
								),
							})}
						</p>
					</div>
				</div>
				{getStatusBadge(request.status)}
			</div>

			{/* Appointment Required Banner */}
			{request.status !== RequestStatus.Draft &&
				request.status !== RequestStatus.Cancelled &&
				request.status !== RequestStatus.Completed &&
				(orgService as any)?.requiresAppointment &&
				!(request as any)?.depositAppointmentId && (
					<Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
						<CardContent className="flex items-center justify-between gap-4 py-4">
							<div className="flex items-center gap-3">
								<Calendar className="h-6 w-6 text-amber-600 shrink-0" />
								<div>
									<p className="font-medium text-amber-800 dark:text-amber-200">
										{t("appointment.required_title")}
									</p>
									<p className="text-sm text-amber-600 dark:text-amber-400">
										{t("appointment.required_desc")}
									</p>
								</div>
							</div>
							<Button
								size="sm"
								onClick={() =>
									navigate({
										to: `/my-space/requests/${request._id}/appointment`,
									})
								}
							>
								<Calendar className="mr-2 h-4 w-4" />
								{t("appointment.book_now")}
							</Button>
						</CardContent>
					</Card>
				)}

			{/* Action Required Cards */}
			{request.actionsRequired
				?.filter((a: any) => !a.completedAt)
				.map((action: any) => (
					<ActionRequiredCard
						key={action.id}
						requestId={request._id}
						actionRequired={action}
					/>
				))}

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3 min-w-0">
				{/* Main Content */}
				<div className="md:col-span-2 space-y-4 sm:space-y-6 min-w-0">
					{/* Form Data — Tabbed */}
					{sections.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									{t("requestDetail.formData.title")}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Tabs defaultValue={sections[0].id} className="w-full">
									<div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
										<TabsList className="h-auto justify-start w-max">
											{sections.map((section) => (
												<TabsTrigger
													key={section.id}
													value={section.id}
													className="shrink-0 text-xs sm:text-sm"
												>
													{section.title}
												</TabsTrigger>
											))}
										</TabsList>
									</div>

									{sections.map((section) => (
										<TabsContent key={section.id} value={section.id}>
											{(() => {
												// ── Helper: field row ──
												const FieldRow = ({
													label,
													value,
												}: {
													label: string;
													value: string;
												}) => (
													<div className="flex flex-col sm:flex-row sm:justify-between py-1 text-sm gap-0.5 sm:gap-4">
														<span className="text-muted-foreground text-xs sm:text-sm shrink-0">
															{label}
														</span>
														<span className="font-medium sm:text-right break-words">
															{value}
														</span>
													</div>
												);

												// ── Card wrapper ──
												const InfoCard = ({
													title,
													badge,
													children,
												}: {
													title: string;
													badge?: React.ReactNode;
													children: React.ReactNode;
												}) => (
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
													const ecData = formData?.[
														"emergency_contacts"
													] as any[] | undefined;
													if (
														!ecData ||
														!Array.isArray(ecData)
													)
														return null;
													const ecLabels: Record<
														string,
														{ fr: string; en: string }
													> = {
														last_name: {
															fr: "Nom",
															en: "Last Name",
														},
														first_name: {
															fr: "Prénom",
															en: "First Name",
														},
														phone: {
															fr: "Téléphone",
															en: "Phone",
														},
														email: {
															fr: "Email",
															en: "Email",
														},
													};
													return (
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
															{ecData.map(
																(
																	contact: any,
																	idx: number,
																) => {
																	if (
																		!contact ||
																		typeof contact !==
																			"object"
																	)
																		return null;
																	return (
																		<InfoCard
																			key={idx}
																			title={`Contact ${idx + 1}`}
																			badge={
																				contact.country ? (
																					<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
																						{resolveFieldValue(
																							contact.country,
																							lang,
																							t,
																						)}
																					</span>
																				) : undefined
																			}
																		>
																			{(
																				[
																					"last_name",
																					"first_name",
																					"phone",
																					"email",
																				] as const
																			).map(
																				(
																					key,
																				) => {
																					const val =
																						contact[
																							key
																						];
																					if (
																						!val
																					)
																						return null;
																					return (
																						<FieldRow
																							key={
																								key
																							}
																							label={
																								lang ===
																								"fr"
																									? ecLabels[
																											key
																										]
																											.fr
																									: ecLabels[
																											key
																										]
																											.en
																							}
																							value={resolveFieldValue(
																								val,
																								lang,
																								t,
																							)}
																						/>
																					);
																				},
																			)}
																		</InfoCard>
																	);
																},
															)}
														</div>
													);
												}

												// ── Family Info ──
												if (section.id === "family_info") {
													const fam = formData?.[
														"family_info"
													] as
														| Record<string, any>
														| undefined;
													if (
														!fam ||
														typeof fam !== "object"
													)
														return null;

													const maritalRow = section.rows.find(
														(r) =>
															r.key ===
															"marital_status",
													);
													const maritalDisplay =
														maritalRow
															? maritalRow.value
															: resolveFieldValue(
																	fam.marital_status,
																	lang,
																	t,
																);

													const familyCards: Array<{
														title: string;
														content: React.ReactNode[];
													}> = [];

													if (
														fam.father_last_name ||
														fam.father_first_name
													) {
														familyCards.push({
															title:
																lang === "fr"
																	? "Père"
																	: "Father",
															content: [
																fam.father_last_name && (
																	<FieldRow
																		key="fln"
																		label={
																			lang ===
																			"fr"
																				? "Nom"
																				: "Last Name"
																		}
																		value={
																			fam.father_last_name
																		}
																	/>
																),
																fam.father_first_name && (
																	<FieldRow
																		key="ffn"
																		label={
																			lang ===
																			"fr"
																				? "Prénom"
																				: "First Name"
																		}
																		value={
																			fam.father_first_name
																		}
																	/>
																),
															].filter(Boolean),
														});
													}

													if (
														fam.mother_last_name ||
														fam.mother_first_name
													) {
														familyCards.push({
															title:
																lang === "fr"
																	? "Mère"
																	: "Mother",
															content: [
																fam.mother_last_name && (
																	<FieldRow
																		key="mln"
																		label={
																			lang ===
																			"fr"
																				? "Nom"
																				: "Last Name"
																		}
																		value={
																			fam.mother_last_name
																		}
																	/>
																),
																fam.mother_first_name && (
																	<FieldRow
																		key="mfn"
																		label={
																			lang ===
																			"fr"
																				? "Prénom"
																				: "First Name"
																		}
																		value={
																			fam.mother_first_name
																		}
																	/>
																),
															].filter(Boolean),
														});
													}

													if (
														fam.spouse_last_name ||
														fam.spouse_first_name
													) {
														familyCards.push({
															title:
																lang === "fr"
																	? "Conjoint(e)"
																	: "Spouse",
															content: [
																fam.spouse_last_name && (
																	<FieldRow
																		key="sln"
																		label={
																			lang ===
																			"fr"
																				? "Nom"
																				: "Last Name"
																		}
																		value={
																			fam.spouse_last_name
																		}
																	/>
																),
																fam.spouse_first_name && (
																	<FieldRow
																		key="sfn"
																		label={
																			lang ===
																			"fr"
																				? "Prénom"
																				: "First Name"
																		}
																		value={
																			fam.spouse_first_name
																		}
																	/>
																),
															].filter(Boolean),
														});
													}

													return (
														<div className="space-y-4 pt-3">
															{fam.marital_status && (
																<FieldRow
																	label={
																		lang ===
																		"fr"
																			? "Situation"
																			: "Status"
																	}
																	value={
																		maritalDisplay
																	}
																/>
															)}
															{familyCards.length >
																0 && (
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	{familyCards.map(
																		(
																			card,
																		) => (
																			<InfoCard
																				key={
																					card.title
																				}
																				title={
																					card.title
																				}
																			>
																				{
																					card.content
																				}
																			</InfoCard>
																		),
																	)}
																</div>
															)}
														</div>
													);
												}

												// ── Coordinates (merged contact + addresses) ──
												if (section.id === "coordinates") {
													const contact = formData?.[
														"contact_info"
													] as
														| Record<string, any>
														| undefined;
													const residence = formData?.[
														"residence_address"
													] as
														| Record<string, any>
														| undefined;
													const homeland = formData?.[
														"homeland_address"
													] as
														| Record<string, any>
														| undefined;

													return (
														<div className="space-y-4 pt-3">
															{contact && (
																<div className="space-y-1">
																	{contact.phone && (
																		<FieldRow
																			label={
																				lang ===
																				"fr"
																					? "Téléphone"
																					: "Phone"
																			}
																			value={
																				contact.phone
																			}
																		/>
																	)}
																	{contact.email && (
																		<FieldRow
																			label={
																				lang ===
																				"fr"
																					? "Email"
																					: "Email"
																			}
																			value={
																				contact.email
																			}
																		/>
																	)}
																</div>
															)}
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																{residence &&
																	Object.values(
																		residence,
																	).some(
																		Boolean,
																	) && (
																	<InfoCard
																		title={
																			lang ===
																			"fr"
																				? "Adresse de résidence"
																				: "Residence Address"
																		}
																	>
																		{residence.residence_street && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Rue"
																						: "Street"
																				}
																				value={
																					residence.residence_street
																				}
																			/>
																		)}
																		{residence.residence_city && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Ville"
																						: "City"
																				}
																				value={
																					residence.residence_city
																				}
																			/>
																		)}
																		{residence.residence_postal_code && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Code postal"
																						: "Postal Code"
																				}
																				value={
																					residence.residence_postal_code
																				}
																			/>
																		)}
																		{residence.residence_country && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Pays"
																						: "Country"
																				}
																				value={resolveFieldValue(
																					residence.residence_country,
																					lang,
																					t,
																				)}
																			/>
																		)}
																	</InfoCard>
																)}
																{homeland &&
																	Object.values(
																		homeland,
																	).some(
																		Boolean,
																	) && (
																	<InfoCard
																		title={
																			lang ===
																			"fr"
																				? "Adresse au Gabon"
																				: "Address in Gabon"
																		}
																	>
																		{homeland.homeland_street && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Rue"
																						: "Street"
																				}
																				value={
																					homeland.homeland_street
																				}
																			/>
																		)}
																		{homeland.homeland_city && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Ville"
																						: "City"
																				}
																				value={
																					homeland.homeland_city
																				}
																			/>
																		)}
																		{homeland.homeland_postal_code && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Code postal"
																						: "Postal Code"
																				}
																				value={
																					homeland.homeland_postal_code
																				}
																			/>
																		)}
																		{homeland.homeland_country && (
																			<FieldRow
																				label={
																					lang ===
																					"fr"
																						? "Pays"
																						: "Country"
																				}
																				value={resolveFieldValue(
																					homeland.homeland_country,
																					lang,
																					t,
																				)}
																			/>
																		)}
																	</InfoCard>
																)}
															</div>
														</div>
													);
												}

												// ── Default: simple rows ──
												return (
													<div className="divide-y">
														{section.rows.map(
															(row) => (
																<FieldRow
																	key={
																		row.key
																	}
																	label={
																		row.label
																	}
																	value={
																		row.value
																	}
																/>
															),
														)}
													</div>
												);
											})()}
										</TabsContent>
									))}
								</Tabs>
							</CardContent>
						</Card>
					)}
					{/* Payment Section */}
					{(() => {
						const pricing = (request.orgService as any)?.pricing;
						const needsPayment =
							pricing &&
							pricing.amount > 0 &&
							request.paymentStatus !== "succeeded";
						const serviceName =
							getLocalizedValue(
								(request.service as any)?.name,
								i18n.language,
							) || "Service";

						if (!needsPayment) return null;

						return (
							<Card className="border-primary/20">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<CreditCard className="h-5 w-5" />
										{t("payment.title")}
									</CardTitle>
									<CardDescription>
										{request.paymentStatus === "pending" ||
										request.paymentStatus === "processing"
											? t("payment.pending")
											: t("payment.required")}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{request.paymentStatus === "failed" && (
										<Alert variant="destructive" className="mb-4">
											<AlertTriangle className="h-4 w-4" />
											<AlertDescription>{t("payment.failed")}</AlertDescription>
										</Alert>
									)}
									<PaymentForm
										requestId={request._id}
										amount={pricing.amount}
										currency={pricing.currency || "eur"}
										serviceName={serviceName}
										onSuccess={() => {
											toast.success(t("payment.successToast"));
										}}
									/>
								</CardContent>
							</Card>
						);
					})()}

					{/* Documents Checklist — shows required documents from schema + submitted docs */}
					{((request.service?.formSchema?.joinedDocuments?.length ?? 0) > 0 ||
						(request.documents && request.documents.length > 0)) && (
						<DocumentChecklist
							requiredDocuments={
								request.service?.formSchema?.joinedDocuments || []
							}
							submittedDocuments={
								(request.documents || []).map((doc: any) => ({
									_id: doc._id,
									documentType: doc.documentType || doc.type || "",
									filename:
										doc.files?.[0]?.filename ||
										doc.filename ||
										doc.name ||
										"Document",
									status: doc.status || "pending",
									mimeType:
										doc.files?.[0]?.mimeType || doc.mimeType || "",
									sizeBytes:
										doc.files?.[0]?.sizeBytes || doc.sizeBytes || 0,
									url: doc.fileUrls?.[0]?.url || doc.url,
									storageId: doc.storageId,
									rejectionReason: doc.rejectionReason,
								}))
							}
						/>
					)}
				</div>

				<div className="space-y-4 sm:space-y-6 min-w-0">
					{/* Active Call Banner — if an agent initiated a call on this request */}
					{request._id && <ActiveCallBanner requestId={request._id} />}

					{/* Organization Contact Card - In Sidebar */}
					{request.org && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Building2 className="h-5 w-5" />
									{t("requests.detail.orgContact.title")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3 text-sm">
									<p className="font-medium">{(request.org as any)?.name}</p>

									{/* Address */}
									{(request.org as any)?.address && (
										<div className="flex gap-2 text-muted-foreground">
											<MapPin className="h-4 w-4 shrink-0 mt-0.5" />
											<span>
												{(request.org as any).address.street && (
													<>
														{(request.org as any).address.street}
														<br />
													</>
												)}
												{(request.org as any).address.postalCode}{" "}
												{(request.org as any).address.city}
												<br />
												{(request.org as any).address.country}
											</span>
										</div>
									)}

									{/* Email */}
									{(request.org as any)?.email && (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Mail className="h-4 w-4 shrink-0" />
											<a
												href={`mailto:${(request.org as any).email}`}
												className="hover:text-primary transition-colors truncate"
											>
												{(request.org as any).email}
											</a>
										</div>
									)}

									{/* Phone */}
									{(request.org as any)?.phone && (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Phone className="h-4 w-4 shrink-0" />
											<a
												href={`tel:${(request.org as any).phone}`}
												className="hover:text-primary transition-colors"
											>
												{(request.org as any).phone}
											</a>
										</div>
									)}

									{/* Website */}
									{(request.org as any)?.website && (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Globe className="h-4 w-4 shrink-0" />
											<a
												href={(request.org as any).website}
												target="_blank"
												rel="noopener noreferrer"
												className="hover:text-primary transition-colors truncate"
											>
												{(request.org as any).website}
											</a>
										</div>
									)}

									{/* Opening Hours */}
									{(request.org as any)?.openingHours &&
										Object.values((request.org as any).openingHours).some(
											(day: any) => day && !day.closed,
										) && (
											<div className="flex items-start gap-2 text-muted-foreground mt-2 pt-2 border-t">
												<Clock className="h-4 w-4 shrink-0 mt-0.5" />
												<div className="space-y-1 w-full flex-1 min-w-0">
													<p className="font-medium text-foreground text-xs mb-1">
														{t("requests.detail.orgContact.openingHours")}
													</p>
													{(() => {
														const daysRaw = [
															{ key: "monday", idx: 1 },
															{ key: "tuesday", idx: 2 },
															{ key: "wednesday", idx: 3 },
															{ key: "thursday", idx: 4 },
															{ key: "friday", idx: 5 },
															{ key: "saturday", idx: 6 },
															{ key: "sunday", idx: 7 },
														];

														const groups: {
															startIdx: number;
															endIdx: number;
															hours: string;
														}[] = [];

														for (const d of daysRaw) {
															const h = (request.org as any).openingHours[
																d.key
															];
															if (!h || h.closed) continue;
															const hourString = `${h.open} - ${h.close}`;

															const lastGroup = groups[groups.length - 1];
															if (
																lastGroup &&
																lastGroup.hours === hourString &&
																lastGroup.endIdx === d.idx - 1
															) {
																lastGroup.endIdx = d.idx;
															} else {
																groups.push({
																	startIdx: d.idx,
																	endIdx: d.idx,
																	hours: hourString,
																});
															}
														}

														return groups.map((g, i) => {
															const formatDay = (idx: number) =>
																new Intl.DateTimeFormat(i18n.language, {
																	weekday: "short",
																}).format(new Date(`2024-01-0${idx}T12:00:00`));

															const formattedStart = formatDay(g.startIdx);
															const formattedEnd = formatDay(g.endIdx);
															const displayRange =
																g.startIdx === g.endIdx
																	? formattedStart
																	: `${formattedStart} - ${formattedEnd}`;

															return (
																<div
																	key={g.startIdx}
																	className="flex items-center justify-between text-xs"
																>
																	<span className="capitalize w-20 shrink-0">
																		{displayRange}
																	</span>
																	<span className="text-right flex-1 break-words">
																		{g.hours}
																	</span>
																</div>
															);
														});
													})()}
												</div>
											</div>
										)}

									{/* Fallback if no contact info */}
									{!(request.org as any)?.address &&
										!(request.org as any)?.email &&
										!(request.org as any)?.phone && (
											<p className="text-muted-foreground italic">
												{t("requests.detail.orgContact.noContact")}
											</p>
										)}
								</div>

								{/* Call Button (if org has meetings module) */}
								{((request.org as any)?.modules || []).includes("meetings") && (
									<div className="pt-4 border-t">
										<OrgCallButton
											orgId={request.org._id}
											orgName={(request.org as any).name}
											className="w-full"
											variant="secondary"
											label={t(
												`requests.detail.orgContact.callAction.${(request.org as any).type}`,
												"Contacter l'organisme",
											)}
										/>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Timeline */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								{t("requests.detail.timeline")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3 text-sm">
								{/* Creation */}
								<div className="flex justify-between gap-2">
									<span className="text-muted-foreground">
										{t("requests.detail.created")}
									</span>
									<span className="text-right">
										{new Date(request._creationTime).toLocaleDateString(
											dateLocale,
											{
												day: "numeric",
												month: "short",
												year: "numeric",
											},
										)}
									</span>
								</div>

								{/* Status changes from history */}
								{request.statusHistory?.map(
									(event: {
										_id: string;
										type: string;
										from?: string;
										to?: string;
										createdAt: number;
									}) => (
										<div
											key={event._id}
											className="flex justify-between gap-2 border-t pt-2"
										>
											<span className="text-muted-foreground">
												{t(`requests.statuses.${event.to || event.type}`)}
											</span>
											<span>
												{new Date(event.createdAt).toLocaleDateString(
													dateLocale,
													{
														day: "numeric",
														month: "short",
														year: "numeric",
													},
												)}
											</span>
										</div>
									),
								)}

								{/* Fallback if no status history */}
								{(!request.statusHistory ||
									request.statusHistory.length === 0) &&
									request.submittedAt && (
										<div className="flex justify-between gap-2 border-t pt-2">
											<span className="text-muted-foreground">
												{t("requests.detail.submitted")}
											</span>
											<span>
												{new Date(request.submittedAt).toLocaleDateString(
													dateLocale,
													{
														day: "numeric",
														month: "short",
														year: "numeric",
													},
												)}
											</span>
										</div>
									)}
							</div>
						</CardContent>
					</Card>

					{/* Associated Appointments (Multiple possible) */}
					{(request as any).appointments &&
						(request as any).appointments.length > 0 && (
							<div className="space-y-4">
								{(request as any).appointments.map((apt: any) => (
									<Card
										key={apt._id}
										className="border-primary/20 bg-primary/5"
									>
										<CardContent className="flex flex-col gap-4 py-4">
											<div className="flex items-start justify-between gap-4">
												<div className="flex items-center gap-3">
													<Calendar className="h-6 w-6 text-primary shrink-0" />
													<div>
														<p className="font-medium text-primary text-sm">
															{t("requests.detail.appointmentScheduled")}
														</p>
														<p className="text-xs text-primary/80 mt-0.5">
															{new Date(apt.date).toLocaleDateString(
																dateLocale,
																{
																	day: "numeric",
																	month: "long",
																	year: "numeric",
																},
															)}{" "}
															{t("common.at")} {apt.time}
														</p>
													</div>
												</div>
												<Badge
													variant="outline"
													className="text-[10px] shrink-0 bg-background"
												>
													{t(`dashboard.appointments.statuses.${apt.status}`)}
												</Badge>
											</div>
											<Button
												size="sm"
												variant="secondary"
												className="w-full"
												onClick={() =>
													navigate({
														to: "/my-space/appointments/$appointmentId",
														params: { appointmentId: apt._id },
													})
												}
											>
												<Eye className="mr-2 h-4 w-4" />
												{t("requests.detail.viewAppointment")}
											</Button>
										</CardContent>
									</Card>
								))}
							</div>
						)}

					{/* Actions */}
					{canCancel && (
						<Card className="border-destructive/20">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-destructive">
									<AlertTriangle className="h-5 w-5" />
									{t("requests.detail.actions")}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="destructive" className="w-full">
											<X className="mr-2 h-4 w-4" />
											{isDraft
												? t("requests.detail.delete")
												: t("requests.detail.cancel")}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												{isDraft
													? t("requests.detail.deleteConfirmTitle")
													: t("requests.detail.cancelConfirmTitle")}
											</AlertDialogTitle>
											<AlertDialogDescription>
												{isDraft
													? t("requests.detail.deleteConfirmDesc")
													: t("requests.detail.cancelConfirmDesc")}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>
												{t("common.cancel")}
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleAction}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												{isDraft
													? t("requests.detail.confirmDelete")
													: t("requests.detail.confirmCancel")}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
