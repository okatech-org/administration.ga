"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalized } from "@convex/lib/utils";

import {
	Calendar,
	Check,
	ChevronRight,
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
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

interface RichField {
	fieldPath: string;
	label?: { fr: string; en?: string } | string;
	type?: string;
	options?: Array<{ value: string; label: { fr: string; en?: string } }>;
	currentValue?: unknown;
	sectionTitle?: { fr?: string } | string;
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

// ─── Action config ─────────────────────────────────────────────────

function getActionConfig(type: ActionRequired["type"], t: (key: string, fallback?: string) => string) {
	switch (type) {
		case "upload_document":
			return {
				icon: <FileUp className="h-4 w-4" />,
				label: t("requests.actionTypes.documents", "Documents manquants"),
				buttonLabel: t("requests.actionButton.documents", "Joindre les documents"),
				sheetTitle: t("requests.actionSheet.documents", "Documents à fournir"),
				accentClass: "text-amber-600 dark:text-amber-400",
				bgClass: "bg-amber-500/10",
				borderClass: "border-amber-500/30",
			};
		case "complete_info":
			return {
				icon: <FileText className="h-4 w-4" />,
				label: t("requests.actionTypes.info", "Informations à compléter"),
				buttonLabel: t("requests.actionButton.info", "Compléter les informations"),
				sheetTitle: t("requests.actionSheet.info", "Informations manquantes"),
				accentClass: "text-amber-600 dark:text-amber-400",
				bgClass: "bg-amber-500/10",
				borderClass: "border-amber-500/30",
			};
		case "schedule_appointment":
			return {
				icon: <Calendar className="h-4 w-4" />,
				label: t("requests.actionTypes.appointment", "Rendez-vous"),
				buttonLabel: t("requests.actionButton.appointment", "Prendre rendez-vous"),
				sheetTitle: t("requests.actionSheet.appointment", "Rendez-vous"),
				accentClass: "text-primary",
				bgClass: "bg-primary/10",
				borderClass: "border-primary/30",
			};
		case "make_payment":
			return {
				icon: <CreditCard className="h-4 w-4" />,
				label: t("requests.actionTypes.payment", "Paiement"),
				buttonLabel: t("requests.actionButton.payment", "Procéder au paiement"),
				sheetTitle: t("requests.actionSheet.payment", "Paiement"),
				accentClass: "text-primary",
				bgClass: "bg-primary/10",
				borderClass: "border-primary/30",
			};
		case "confirm_info":
			return {
				icon: <Check className="h-4 w-4" />,
				label: t("requests.actionTypes.confirm", "Confirmation"),
				buttonLabel: t("requests.actionButton.confirm", "Confirmer les informations"),
				sheetTitle: t("requests.actionSheet.confirm", "Confirmation requise"),
				accentClass: "text-amber-600 dark:text-amber-400",
				bgClass: "bg-amber-500/10",
				borderClass: "border-amber-500/30",
			};
	}
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

	const [sheetOpen, setSheetOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmed, setConfirmed] = useState(false);
	const [formData, setFormData] = useState<Record<string, string>>(() => {
		const initial: Record<string, string> = {};
		for (const field of actionRequired.fields || []) {
			if (field.currentValue !== undefined && field.currentValue !== null) {
				initial[field.fieldPath] = String(field.currentValue);
			}
		}
		return initial;
	});

	const [uploadedDocIds, setUploadedDocIds] = useState<
		Map<string, Id<"documents">>
	>(new Map());
	const uploadRefs = useRef<Map<string, DocumentUploadZoneRef>>(new Map());

	const config = getActionConfig(actionRequired.type, t);

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
			setSheetOpen(false);
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
									{t("requests.currentValue", "Valeur actuelle")} :{" "}
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
									placeholder={`${t("common.select", "Sélectionnez")} ${fieldLabel.toLowerCase()}`}
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
							placeholder={`${t("common.enter", "Entrez")} ${fieldLabel.toLowerCase()}`}
							rows={3}
						/>
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
							placeholder={`${t("common.enter", "Entrez")} ${fieldLabel.toLowerCase()}`}
						/>
					</div>
				);

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
							placeholder={`${t("common.enter", "Entrez")} ${fieldLabel.toLowerCase()}`}
						/>
					</div>
				);
		}
	};

	// ─── Sheet content per type ─────────────────────────────────────

	const renderSheetContent = () => {
		switch (actionRequired.type) {
			case "upload_document":
				return (
					<div className="space-y-4">
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
							<p className="text-xs text-muted-foreground">
								{t(
									"requests.uploadHint",
									"Utilisez la section 'Pièces jointes' ci-dessous pour télécharger vos documents, puis cliquez sur 'Envoyer ma réponse'.",
								)}
							</p>
						)}
					</div>
				);

			case "complete_info":
				return (
					<div className="space-y-4">
						{actionRequired.fields && actionRequired.fields.length > 0 ? (
							(() => {
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
					</div>
				);

			case "schedule_appointment":
				return (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							{t(
								"requests.appointmentHint",
								"Veuillez contacter le consulat pour prendre rendez-vous ou utiliser le système de réservation en ligne si disponible.",
							)}
						</p>
					</div>
				);

			case "make_payment":
				return (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							{t(
								"requests.paymentHint",
								"Cliquez sur le bouton ci-dessous pour procéder au paiement sécurisé.",
							)}
						</p>
					</div>
				);

			case "confirm_info":
				return (
					<div className="space-y-3">
						{actionRequired.infoToConfirm && (
							<div className="p-4 bg-muted/50 rounded-md">
								<p className="text-sm whitespace-pre-wrap">
									{actionRequired.infoToConfirm}
								</p>
							</div>
						)}
						<div className="flex items-start gap-3">
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
					</div>
				);
		}
	};

	const getSubmitButton = () => {
		const isDisabled = (() => {
			switch (actionRequired.type) {
				case "upload_document":
					return (
						isSubmitting ||
						(actionRequired.documentTypes &&
							actionRequired.documentTypes.length > 0 &&
							actionRequired.documentTypes
								.filter((d) => d.required !== false)
								.some((d) => !uploadedDocIds.has(d.type)))
					);
				case "complete_info":
					return (
						isSubmitting ||
						!actionRequired.fields?.length ||
						actionRequired.fields.some((f) => !formData[f.fieldPath])
					);
				case "confirm_info":
					return isSubmitting || !confirmed;
				default:
					return isSubmitting;
			}
		})();

		const label = (() => {
			switch (actionRequired.type) {
				case "upload_document":
					return t("requests.confirmUpload", "J'ai téléchargé mes documents");
				case "complete_info":
					return t("requests.sendInfo", "Envoyer ma réponse");
				case "schedule_appointment":
					return t("requests.confirmAppointment", "Confirmer");
				case "make_payment":
					return t("requests.payNow", "Payer maintenant");
				case "confirm_info":
					return t("requests.confirmAndSend", "Confirmer");
			}
		})();

		return (
			<Button
				onClick={handleSubmit}
				disabled={isDisabled}
				className="w-full"
			>
				{isSubmitting ? (
					<Loader2 className="h-4 w-4 animate-spin mr-2" />
				) : (
					<Check className="h-4 w-4 mr-2" />
				)}
				{label}
			</Button>
		);
	};

	// If already completed, show compact success state
	if (actionRequired.completedAt) {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
					<Check className="h-4 w-4 text-green-600" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-green-700 dark:text-green-300">
						{t("requests.actionCompleted")}
					</p>
					<p className="text-xs text-green-600/70 dark:text-green-400/70 truncate">
						{config.label}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			{/* Compact action button */}
			<button
				onClick={() => setSheetOpen(true)}
				className={cn(
					"group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
					"hover:shadow-sm active:scale-[0.99]",
					config.borderClass,
					config.bgClass,
				)}
			>
				<div className={cn(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
					config.bgClass,
					config.accentClass,
				)}>
					{config.icon}
				</div>
				<div className="flex-1 min-w-0">
					<p className={cn("text-sm font-semibold", config.accentClass)}>
						{config.buttonLabel}
					</p>
					<p className="text-xs text-muted-foreground truncate mt-0.5">
						{actionRequired.message}
					</p>
				</div>
				<ChevronRight className={cn(
					"h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
					config.accentClass,
				)} />
			</button>

			{/* BottomSheet with form content */}
			<BottomSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				title={config.sheetTitle}
				icon={<span className={config.accentClass}>{config.icon}</span>}
				footer={getSubmitButton()}
				maxHeight="85vh"
			>
				<div className="px-4 py-4 sm:px-5 space-y-4">
					{/* Message from the agent/AI */}
					<p className="text-sm text-muted-foreground leading-relaxed">
						{actionRequired.message}
					</p>

					{/* Form content */}
					{renderSheetContent()}
				</div>
			</BottomSheet>
		</div>
	);
}
