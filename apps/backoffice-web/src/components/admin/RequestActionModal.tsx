"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalized } from "@convex/lib/utils";
import type { LocalizedString } from "@convex/lib/validators";
import {
	AlertTriangle,
	CreditCard,
	FileText,
	FileWarning,
	HelpCircle,
	Loader2,
	Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

// ─── Types ──────────────────────────────────────────────────────────

interface FormSchemaField {
	id: string;
	type?: string;
	label?: LocalizedString;
	description?: LocalizedString;
	options?: Array<{ value: string; label: LocalizedString }>;
	required?: boolean;
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
}

// ─── Action Types ───────────────────────────────────────────────────

const ACTION_TYPES = [
	{
		value: "upload_document",
		label: "Documents manquants",
		description: "Le citoyen doit fournir des documents supplémentaires",
		icon: FileWarning,
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
	},
	{
		value: "complete_info",
		label: "Informations à modifier",
		description:
			"Le citoyen doit compléter ou corriger des champs du formulaire",
		icon: HelpCircle,
		color: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
	},
	{
		value: "make_payment",
		label: "Paiement requis",
		description: "Le citoyen doit effectuer un paiement",
		icon: CreditCard,
		color: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
	},
] as const;

type ActionType = (typeof ACTION_TYPES)[number]["value"];

// ─── Field type labels ──────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
	text: "Texte",
	select: "Liste",
	date: "Date",
	country: "Pays",
	phone: "Tél.",
	email: "Email",
	number: "Nombre",
	textarea: "Texte long",
	checkbox: "Case",
	file: "Fichier",
	radio: "Choix",
};

// ─── Props ──────────────────────────────────────────────────────────

interface RequestActionModalProps {
	requestId: Id<"requests">;
	formSchema?: FormSchema;
	formData?: Record<string, unknown>;
	onSuccess?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function RequestActionModal({
	requestId,
	formSchema,
	formData,
	onSuccess,
}: RequestActionModalProps) {
	const { i18n } = useTranslation();
	const lang = i18n.language;

	const [open, setOpen] = useState(false);
	const [type, setType] = useState<ActionType>("upload_document");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
	const [selectedDocTypes, setSelectedDocTypes] = useState<Set<string>>(
		new Set(),
	);

	const { mutateAsync: setActionRequired } = useConvexMutationQuery(
		api.functions.requests.setActionRequired,
	);

	// Build flat list of all form fields from schema
	const allFields = useMemo(() => {
		if (!formSchema?.sections) return [];
		const fields: Array<{
			fieldPath: string;
			sectionTitle: string;
			field: FormSchemaField;
		}> = [];
		for (const section of formSchema.sections) {
			const sectionTitle = getLocalized(section.title, lang) || section.id;
			for (const field of section.fields || []) {
				fields.push({
					fieldPath: `${section.id}.${field.id}`,
					sectionTitle,
					field,
				});
			}
		}
		return fields;
	}, [formSchema, lang]);

	// Get list of required documents from formSchema
	const requiredDocs = useMemo(() => {
		return formSchema?.joinedDocuments || [];
	}, [formSchema]);

	// Get current value for a field path from formData
	const getFieldCurrentValue = (fieldPath: string): unknown => {
		if (!formData) return undefined;
		const [sectionId, fieldId] = fieldPath.split(".");
		const section = formData[sectionId];
		if (section && typeof section === "object" && !Array.isArray(section)) {
			return (section as Record<string, unknown>)[fieldId];
		}
		return undefined;
	};

	const toggleField = (fieldPath: string) => {
		setSelectedFields((prev) => {
			const next = new Set(prev);
			if (next.has(fieldPath)) next.delete(fieldPath);
			else next.add(fieldPath);
			return next;
		});
	};

	const toggleDocType = (docType: string) => {
		setSelectedDocTypes((prev) => {
			const next = new Set(prev);
			if (next.has(docType)) next.delete(docType);
			else next.add(docType);
			return next;
		});
	};

	const handleSubmit = async () => {
		if (!message.trim()) {
			toast.error("Veuillez saisir un message pour le citoyen");
			return;
		}

		if (type === "complete_info" && selectedFields.size === 0) {
			toast.error("Veuillez sélectionner au moins un champ à modifier");
			return;
		}

		if (type === "upload_document" && selectedDocTypes.size === 0) {
			toast.error(
				"Veuillez sélectionner au moins un type de document manquant",
			);
			return;
		}

		setIsSubmitting(true);
		try {
			const fields =
				type === "complete_info"
					? allFields
							.filter((f) => selectedFields.has(f.fieldPath))
							.map((f) => ({
								fieldPath: f.fieldPath,
								label: f.field.label,
								type: f.field.type,
								options: f.field.options,
								currentValue: getFieldCurrentValue(f.fieldPath),
							}))
					: undefined;

			const documentTypes =
				type === "upload_document"
					? requiredDocs
							.filter((d) => selectedDocTypes.has(d.type))
							.map((d) => ({
								type: d.type,
								label: d.label,
								required: d.required,
							}))
					: undefined;

			await setActionRequired({
				requestId,
				type,
				message: message.trim(),
				fields,
				documentTypes,
			});
			toast.success("Action requise envoyée au citoyen");
			setOpen(false);
			setMessage("");
			setType("upload_document");
			setSelectedFields(new Set());
			setSelectedDocTypes(new Set());
			onSuccess?.();
		} catch (error) {
			console.error("Failed to set action required:", error);
			toast.error("Erreur lors de l'envoi de la demande");
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedType = ACTION_TYPES.find((t) => t.value === type);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<AlertTriangle className="h-4 w-4" />
					Demander une action
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
							<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
						</div>
						Demander une action au citoyen
					</DialogTitle>
					<DialogDescription>
						Le citoyen sera notifié et verra l'action à effectuer dans
						sa demande.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-5 py-1 pr-1">
					{/* ─── Action type cards ─── */}
					<div className="space-y-2">
						<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Type d'action
						</Label>
						<div className="grid grid-cols-1 gap-2">
							{ACTION_TYPES.map((actionType) => {
								const Icon = actionType.icon;
								const isActive = type === actionType.value;
								return (
									<button
										key={actionType.value}
										type="button"
										onClick={() => {
											setType(actionType.value as ActionType);
											setSelectedFields(new Set());
											setSelectedDocTypes(new Set());
										}}
										className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
											isActive
												? `${actionType.bg} ring-1 ring-current/20`
												: "border-border hover:bg-muted/50"
										}`}
									>
										<div
											className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
												isActive
													? `${actionType.color} bg-white/60 dark:bg-white/10`
													: "bg-muted text-muted-foreground"
											}`}
										>
											<Icon className="h-4 w-4" />
										</div>
										<div className="min-w-0">
											<p
												className={`text-sm font-medium ${isActive ? actionType.color : ""}`}
											>
												{actionType.label}
											</p>
											<p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
												{actionType.description}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* ─── Field selector for complete_info ─── */}
					{type === "complete_info" && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Champs à modifier
								</Label>
								{selectedFields.size > 0 && (
									<Badge variant="secondary" className="text-xs">
										{selectedFields.size} sélectionné
										{selectedFields.size > 1 ? "s" : ""}
									</Badge>
								)}
							</div>
							{allFields.length > 0 ? (
								<div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
									{(() => {
										let currentSection = "";
										return allFields.map((item) => {
											const showSection =
												item.sectionTitle !== currentSection;
											if (showSection) currentSection = item.sectionTitle;
											const isChecked = selectedFields.has(item.fieldPath);
											return (
												<div key={item.fieldPath}>
													{showSection && (
														<div className="bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground tracking-wider sticky top-0 border-b">
															{item.sectionTitle}
														</div>
													)}
													<label
														className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
															isChecked
																? "bg-primary/5"
																: "hover:bg-muted/30"
														}`}
													>
														<Checkbox
															checked={isChecked}
															onCheckedChange={() =>
																toggleField(item.fieldPath)
															}
														/>
														<span className="flex-1 text-sm">
															{getLocalized(item.field.label, lang) ||
																item.field.id}
														</span>
														{item.field.type && (
															<Badge
																variant="outline"
																className="text-[10px] font-normal px-1.5 py-0 h-5"
															>
																{FIELD_TYPE_LABELS[item.field.type] ??
																	item.field.type}
															</Badge>
														)}
													</label>
												</div>
											);
										});
									})()}
								</div>
							) : (
								<div className="rounded-lg border border-dashed p-4 text-center">
									<p className="text-sm text-muted-foreground">
										Aucun champ disponible dans le formulaire de ce service.
									</p>
								</div>
							)}
						</div>
					)}

					{/* ─── Document selector for upload_document ─── */}
					{type === "upload_document" && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Documents manquants
								</Label>
								{selectedDocTypes.size > 0 && (
									<Badge variant="secondary" className="text-xs">
										{selectedDocTypes.size} sélectionné
										{selectedDocTypes.size > 1 ? "s" : ""}
									</Badge>
								)}
							</div>
							{requiredDocs.length > 0 ? (
								<div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
									{requiredDocs.map((doc) => {
										const isChecked = selectedDocTypes.has(doc.type);
										return (
											<label
												key={doc.type}
												className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
													isChecked
														? "bg-primary/5"
														: "hover:bg-muted/30"
												}`}
											>
												<Checkbox
													checked={isChecked}
													onCheckedChange={() => toggleDocType(doc.type)}
												/>
												<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
												<span className="flex-1 text-sm">
													{getLocalized(doc.label, lang) || doc.type}
												</span>
												{doc.required && (
													<Badge
														variant="outline"
														className="text-[10px] font-normal px-1.5 py-0 h-5 text-amber-600 border-amber-300 dark:border-amber-700"
													>
														Obligatoire
													</Badge>
												)}
											</label>
										);
									})}
								</div>
							) : (
								<div className="rounded-lg border border-dashed p-4 text-center">
									<p className="text-sm text-muted-foreground">
										Aucun document requis configuré pour ce service.
									</p>
								</div>
							)}
						</div>
					)}

					{/* ─── Message ─── */}
					<div className="space-y-2">
						<Label
							htmlFor="action-message"
							className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
						>
							Message pour le citoyen
						</Label>
						<Textarea
							id="action-message"
							placeholder="Expliquez clairement ce que le citoyen doit faire..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
							className="resize-none"
						/>
						<p className="text-[11px] text-muted-foreground">
							Soyez précis et expliquez exactement ce qui est attendu.
						</p>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
					<Button
						variant="ghost"
						onClick={() => setOpen(false)}
						disabled={isSubmitting}
					>
						Annuler
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="gap-2"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Envoi...
							</>
						) : (
							<>
								<Send className="h-4 w-4" />
								Envoyer la demande
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
