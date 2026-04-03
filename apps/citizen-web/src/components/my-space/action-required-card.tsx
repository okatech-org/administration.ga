"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalized } from "@convex/lib/utils";

import {
	Calendar,
	Check,
	CreditCard,
	FileText,
	FileUp,
	Loader2,
	Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DocumentUploadZoneRef } from "@/components/documents/DocumentUploadZone";
import { DocumentUploadZone } from "@/components/documents/DocumentUploadZone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

// ─── Types ──────────────────────────────────────────────────────────

interface RichField {
	fieldPath: string;
	label?: { fr: string; en?: string } | string;
	type?: string;
	options?: Array<{ value: string; label: { fr: string; en?: string } }>;
	currentValue?: unknown;
}

interface RichDocumentType {
	type: string;
	label?: { fr: string; en?: string } | string;
	required?: boolean;
}

interface ActionRequired {
	id: string;
	type:
		| "upload_document"
		| "complete_info"
		| "schedule_appointment"
		| "make_payment"
		| "confirm_info";
	message: string;
	// Rich metadata
	documentTypes?: RichDocumentType[];
	fields?: RichField[];
	infoToConfirm?: string;
	deadline?: number;
	completedAt?: number;
}

interface ActionRequiredCardProps {
	requestId: Id<"requests">;
	actionRequired: ActionRequired;
	onComplete?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getLabel(
	label: { fr: string; en?: string } | string | undefined,
	lang: string,
): string {
	if (!label) return "";
	if (typeof label === "string") return label;
	return getLocalized(label, lang) || label.fr || "";
}

// ─── Component ──────────────────────────────────────────────────────

export function ActionRequiredCard({
	requestId,
	actionRequired,
	onComplete,
}: ActionRequiredCardProps) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	const { mutateAsync: respondToAction } = useConvexMutationQuery(
		api.functions.requests.respondToAction,
	);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmed, setConfirmed] = useState(false);
	const [formData, setFormData] = useState<Record<string, string>>(() => {
		// Pre-fill with current values if available
		const initial: Record<string, string> = {};
		for (const field of actionRequired.fields || []) {
			if (field.currentValue !== undefined && field.currentValue !== null) {
				initial[field.fieldPath] = String(field.currentValue);
			}
		}
		return initial;
	});

	// Track uploaded document IDs
	const [uploadedDocIds, setUploadedDocIds] = useState<
		Map<string, Id<"documents">>
	>(new Map());
	const uploadRefs = useRef<Map<string, DocumentUploadZoneRef>>(new Map());

	const getTypeInfo = () => {
		switch (actionRequired.type) {
			case "upload_document":
				return {
					icon: <FileUp className="h-5 w-5 text-amber-600" />,
					label: t("requests.actionTypes.documents"),
				};
			case "complete_info":
				return {
					icon: <FileText className="h-5 w-5 text-amber-600" />,
					label: t("requests.actionTypes.info"),
				};
			case "schedule_appointment":
				return {
					icon: <Calendar className="h-5 w-5 text-amber-600" />,
					label: t("requests.actionTypes.appointment"),
				};
			case "make_payment":
				return {
					icon: <CreditCard className="h-5 w-5 text-amber-600" />,
					label: t("requests.actionTypes.payment"),
				};
			case "confirm_info":
				return {
					icon: <Check className="h-5 w-5 text-amber-600" />,
					label: t("requests.actionTypes.confirm"),
				};
		}
	};

	const typeInfo = getTypeInfo();

	// Build structured formData with section.field nesting for deep merge
	const buildStructuredFormData = (): Record<string, unknown> | undefined => {
		if (
			actionRequired.type !== "complete_info" ||
			!actionRequired.fields?.length
		)
			return undefined;

		const structured: Record<string, Record<string, unknown>> = {};
		for (const field of actionRequired.fields) {
			const value = formData[field.fieldPath];
			if (value === undefined) continue;

			const [sectionId, fieldId] = field.fieldPath.split(".");
			if (!sectionId || !fieldId) continue;

			if (!structured[sectionId]) structured[sectionId] = {};
			structured[sectionId][fieldId] = value;
		}
		return Object.keys(structured).length > 0 ? structured : undefined;
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			const structuredFormData = buildStructuredFormData();
			const docIds = Array.from(uploadedDocIds.values());

			await respondToAction({
				requestId,
				actionId: actionRequired.id,
				formData: structuredFormData,
				documentIds: docIds.length > 0 ? docIds : undefined,
				confirmed:
					actionRequired.type === "confirm_info" ? confirmed : undefined,
			});
			toast.success(t("requests.actionSent"));
			onComplete?.();
		} catch (error) {
			toast.error(t("requests.actionError"));
			console.error("Error responding to action:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDocUploadComplete = useCallback(
		(docType: string, documentId: Id<"documents">) => {
			setUploadedDocIds((prev) => {
				const next = new Map(prev);
				next.set(docType, documentId);
				return next;
			});
		},
		[],
	);

	// ─── Dynamic Field Renderer ─────────────────────────────────────

	const renderDynamicField = (field: RichField) => {
		const fieldLabel = getLabel(field.label, lang) || field.fieldPath;
		const fieldValue = formData[field.fieldPath] || "";

		switch (field.type) {
			case "date":
				return (
					<div key={field.fieldPath} className="space-y-1.5">
						<Label htmlFor={`field-${field.fieldPath}`}>{fieldLabel}</Label>
						<Input
							id={`field-${field.fieldPath}`}
							type="date"
							value={fieldValue}
							onChange={(e) =>
								setFormData({
									...formData,
									[field.fieldPath]: e.target.value,
								})
							}
						/>
						{field.currentValue !== undefined &&
							field.currentValue !== null && (
								<p className="text-xs text-muted-foreground">
									Valeur actuelle :{" "}
									<span className="font-medium">
										{String(field.currentValue)}
									</span>
								</p>
							)}
					</div>
				);

			case "select":
				return (
					<div key={field.fieldPath} className="space-y-1.5">
						<Label htmlFor={`field-${field.fieldPath}`}>{fieldLabel}</Label>
						<Select
							value={fieldValue}
							onValueChange={(v) =>
								setFormData({
									...formData,
									[field.fieldPath]: v,
								})
							}
						>
							<SelectTrigger id={`field-${field.fieldPath}`}>
								<SelectValue
									placeholder={`Sélectionnez ${fieldLabel.toLowerCase()}`}
								/>
							</SelectTrigger>
							<SelectContent>
								{field.options?.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{getLabel(opt.label, lang) || opt.value}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{field.currentValue !== undefined &&
							field.currentValue !== null && (
								<p className="text-xs text-muted-foreground">
									Valeur actuelle :{" "}
									<span className="font-medium">
										{String(field.currentValue)}
									</span>
								</p>
							)}
					</div>
				);

			case "textarea":
				return (
					<div key={field.fieldPath} className="space-y-1.5">
						<Label htmlFor={`field-${field.fieldPath}`}>{fieldLabel}</Label>
						<Textarea
							id={`field-${field.fieldPath}`}
							value={fieldValue}
							onChange={(e) =>
								setFormData({
									...formData,
									[field.fieldPath]: e.target.value,
								})
							}
							placeholder={`Entrez ${fieldLabel.toLowerCase()}`}
							rows={3}
						/>
						{field.currentValue !== undefined &&
							field.currentValue !== null && (
								<p className="text-xs text-muted-foreground">
									Valeur actuelle :{" "}
									<span className="font-medium">
										{String(field.currentValue)}
									</span>
								</p>
							)}
					</div>
				);

			case "number":
				return (
					<div key={field.fieldPath} className="space-y-1.5">
						<Label htmlFor={`field-${field.fieldPath}`}>{fieldLabel}</Label>
						<Input
							id={`field-${field.fieldPath}`}
							type="number"
							value={fieldValue}
							onChange={(e) =>
								setFormData({
									...formData,
									[field.fieldPath]: e.target.value,
								})
							}
							placeholder={`Entrez ${fieldLabel.toLowerCase()}`}
						/>
						{field.currentValue !== undefined &&
							field.currentValue !== null && (
								<p className="text-xs text-muted-foreground">
									Valeur actuelle :{" "}
									<span className="font-medium">
										{String(field.currentValue)}
									</span>
								</p>
							)}
					</div>
				);

			// Default: text, email, phone, etc.
			default:
				return (
					<div key={field.fieldPath} className="space-y-1.5">
						<Label htmlFor={`field-${field.fieldPath}`}>{fieldLabel}</Label>
						<Input
							id={`field-${field.fieldPath}`}
							type={
								field.type === "email"
									? "email"
									: field.type === "phone"
										? "tel"
										: "text"
							}
							value={fieldValue}
							onChange={(e) =>
								setFormData({
									...formData,
									[field.fieldPath]: e.target.value,
								})
							}
							placeholder={`Entrez ${fieldLabel.toLowerCase()}`}
						/>
						{field.currentValue !== undefined &&
							field.currentValue !== null && (
								<p className="text-xs text-muted-foreground">
									Valeur actuelle :{" "}
									<span className="font-medium">
										{String(field.currentValue)}
									</span>
								</p>
							)}
					</div>
				);
		}
	};

	// ─── Render form per type ───────────────────────────────────────

	const renderForm = () => {
		switch (actionRequired.type) {
			case "upload_document":
				return (
					<div className="mt-4 space-y-4">
						{actionRequired.documentTypes?.map((docType) => {
							const docLabel = getLabel(docType.label, lang) || docType.type;
							const isUploaded = uploadedDocIds.has(docType.type);

							return (
								<div key={docType.type} className="space-y-2">
									<div className="flex items-center gap-2">
										<Upload className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm font-medium">{docLabel}</span>
										{docType.required && (
											<Badge
												variant="outline"
												className="text-xs text-amber-600"
											>
												{t("requests.required")}
											</Badge>
										)}
										{isUploaded && (
											<Badge
												variant="outline"
												className="text-xs text-green-600 border-green-300"
											>
												<Check className="h-3 w-3 mr-1" />
												{t("requests.uploaded")}
											</Badge>
										)}
									</div>
									<DocumentUploadZone
										ref={(ref) => {
											if (ref) {
												uploadRefs.current.set(docType.type, ref);
											}
										}}
										label={docLabel}
										documentType={docType.type as any}
										onUploadComplete={(docId) =>
											handleDocUploadComplete(docType.type, docId)
										}
										required={docType.required}
									/>
								</div>
							);
						})}
						{(!actionRequired.documentTypes ||
							actionRequired.documentTypes.length === 0) && (
							<p className="text-xs text-muted-foreground mt-2">
								{t(
									"requests.uploadHint",
									"Utilisez la section 'Pièces jointes' ci-dessous pour télécharger vos documents, puis cliquez sur 'Envoyer ma réponse'.",
								)}
							</p>
						)}
						<Button
							onClick={handleSubmit}
							disabled={
								isSubmitting ||
								(actionRequired.documentTypes &&
									actionRequired.documentTypes.length > 0 &&
									actionRequired.documentTypes
										.filter((d) => d.required !== false)
										.some((d) => !uploadedDocIds.has(d.type)))
							}
							className="w-full mt-4"
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Check className="h-4 w-4 mr-2" />
							)}
							{t("requests.confirmUpload")}
						</Button>
					</div>
				);

			case "complete_info":
				return (
					<div className="mt-4 space-y-4">
						{actionRequired.fields && actionRequired.fields.length > 0 ? (
							(() => {
								// Group fields by sectionTitle
								const groups: Array<{
									title: string;
									fields: typeof actionRequired.fields;
								}> = [];
								let currentGroup: (typeof groups)[number] | null = null;

								for (const field of actionRequired.fields!) {
									const title =
										(field.sectionTitle as { fr?: string })?.fr ?? "";
									if (!currentGroup || currentGroup.title !== title) {
										currentGroup = { title, fields: [] };
										groups.push(currentGroup);
									}
									currentGroup.fields!.push(field);
								}

								return groups.map((group, gi) => (
									<div key={gi} className="space-y-3">
										{group.title && (
											<h4 className="text-sm font-medium text-foreground border-b pb-1">
												{group.title}
											</h4>
										)}
										{group.fields!.map((field) => renderDynamicField(field))}
									</div>
								));
							})()
						) : (
							<p className="text-sm text-muted-foreground">
								{t(
									"requests.noFieldsToComplete",
									"Aucun champ spécifique à compléter. Veuillez contacter le consulat pour plus d'informations.",
								)}
							</p>
						)}
						<Button
							onClick={handleSubmit}
							disabled={
								isSubmitting ||
								!actionRequired.fields?.length ||
								actionRequired.fields.some((f) => !formData[f.fieldPath])
							}
							className="w-full mt-4"
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Check className="h-4 w-4 mr-2" />
							)}
							{t("requests.sendInfo")}
						</Button>
					</div>
				);

			case "schedule_appointment":
				return (
					<div className="mt-4 space-y-3">
						<p className="text-sm text-muted-foreground">
							{t(
								"requests.appointmentHint",
								"Veuillez contacter le consulat pour prendre rendez-vous ou utiliser le système de réservation en ligne si disponible.",
							)}
						</p>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting}
							variant="outline"
							className="w-full"
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Calendar className="h-4 w-4 mr-2" />
							)}
							{t("requests.confirmAppointment")}
						</Button>
					</div>
				);

			case "make_payment":
				return (
					<div className="mt-4 space-y-3">
						<p className="text-sm text-muted-foreground">
							{t(
								"requests.paymentHint",
								"Cliquez sur le bouton ci-dessous pour procéder au paiement sécurisé.",
							)}
						</p>
						<Button className="w-full" variant="default">
							<CreditCard className="h-4 w-4 mr-2" />
							{t("requests.payNow")}
						</Button>
					</div>
				);

			case "confirm_info":
				return (
					<div className="mt-4 space-y-3">
						{actionRequired.infoToConfirm && (
							<div className="p-4 bg-muted/50 rounded-md">
								<p className="text-sm whitespace-pre-wrap">
									{actionRequired.infoToConfirm}
								</p>
							</div>
						)}
						<div className="flex items-start gap-3 mt-4">
							<Checkbox
								id={`confirm-${requestId}`}
								checked={confirmed}
								onCheckedChange={(checked) => setConfirmed(checked === true)}
							/>
							<Label
								htmlFor={`confirm-${requestId}`}
								className="text-sm leading-snug cursor-pointer"
							>
								{t(
									"requests.confirmInfoLabel",
									"Je confirme que les informations ci-dessus sont exactes",
								)}
							</Label>
						</div>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting || !confirmed}
							className="w-full mt-4"
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Check className="h-4 w-4 mr-2" />
							)}
							{t("requests.confirmAndSend")}
						</Button>
					</div>
				);
		}
	};

	// If already completed, show success state
	if (actionRequired.completedAt) {
		return (
			<Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
				<Check className="h-5 w-5 text-green-600" />
				<AlertTitle className="text-green-800 dark:text-green-400">
					{t("requests.actionCompleted")}
				</AlertTitle>
				<AlertDescription className="text-green-700 dark:text-green-300">
					{t(
						"requests.actionCompletedDesc",
						"Votre réponse a bien été prise en compte. Un agent la traitera dans les plus brefs délais.",
					)}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-4">
			{/* Header */}
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
					<div className="scale-125">{typeInfo.icon}</div>
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="font-semibold text-amber-800 dark:text-amber-300 text-base">
							{t(
								"requests.detail.actionRequired",
								"Action requise de votre part",
							)}
						</h3>
						<Badge
							variant="secondary"
							className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
						>
							{typeInfo.label}
						</Badge>
					</div>
					<p className="text-amber-700 dark:text-amber-300/80 text-sm mt-1 leading-relaxed">
						{actionRequired.message}
					</p>
				</div>
			</div>

			{/* Form content with scroll if needed */}
			<div className="max-h-[500px] overflow-y-auto">{renderForm()}</div>
		</div>
	);
}
