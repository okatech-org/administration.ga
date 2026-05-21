"use client";

export interface FieldCondition {
	fieldPath: string;
	operator: "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty" | "greaterThan" | "lessThan";
	value: string;
}

import { FormFieldType } from "@convex/lib/constants";
import type {
	FormDocument,
	FormField,
	FormSchema,
	FormSection,
} from "@convex/lib/validators";
export type { FormSection };
import {
	AlignLeft,
	Calendar,
	CameraIcon,
	CheckSquare,
	Eye,
	EyeOff,
	FileIcon,
	FlagIcon,
	GripVertical,
	Hash,
	Layers,
	List,
	type LucideIcon,
	Mail,
	MapPin,
	Phone,
	Plus,
	Settings2,
	Sparkles,
	Trash2,
	Type,
	VenusAndMars,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormPreview } from "@/components/admin/FormPreview";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type FormTemplate, formTemplates } from "@/lib/formTemplates";
import { cn } from "@/lib/utils";

export const FieldTypeIcon: Record<FormFieldType, LucideIcon> = {
	text: Type,
	email: Mail,
	tel: Phone,
	date: Calendar,
	number: Hash,
	select: List,
	checkbox: CheckSquare,
	textarea: AlignLeft,
	address: MapPin,
	country: FlagIcon,
	gender: VenusAndMars,
	profile_document: FileIcon,
	image: CameraIcon,
	file: FileIcon,
};

interface FormBuilderProps {
	initialSchema?: FormSchema;
	onSchemaChange?: (schema: FormSchema) => void;
}

/**
 * Generate a human-readable slug from a label
 * Example: "Type de document" → "type_de_document"
 */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/[^a-z0-9]+/g, "_") // Non-alphanumeric → underscore
		.replace(/^_|_$/g, ""); // Trim underscores
}

/**
 * Generate field ID from label
 * Example: "Numéro de passeport" → "numero_de_passeport"
 */
function generateFieldId(label: string): string {
	const slug = slugify(label);
	return slug || `field_${Date.now()}`;
}

/**
 * Generate section ID from title
 * Example: "Informations personnelles" → "informations_personnelles"
 */
function generateSectionId(title?: string): string {
	if (title) {
		const slug = slugify(title);
		if (slug) return slug;
	}
	return `section_${Date.now()}`;
}

export function FormBuilder({
	initialSchema,
	onSchemaChange,
}: FormBuilderProps) {
	const { t } = useTranslation();

	const [sections, setSections] = useState<FormSection[]>([]);
	const [joinedDocuments, setJoinedDocuments] = useState<FormDocument[]>([]);
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
	const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

	// Preview state
	const [showPreview, setShowPreview] = useState(false);
	const [previewData, setPreviewData] = useState<
		Record<string, Record<string, unknown>>
	>({});

	// Initialize from FormSchema - extract sections and joinedDocuments
	useEffect(() => {
		if (initialSchema?.sections && initialSchema.sections.length > 0) {
			setSections(initialSchema.sections);
			if (!activeSectionId) {
				setActiveSectionId(initialSchema.sections[0].id);
			}
		} else if (sections.length === 0) {
			const defaultSection: FormSection = {
				id: generateSectionId(),
				title: { fr: "Section 1" },
				fields: [],
				optional: false,
			};
			setSections([defaultSection]);
			setActiveSectionId(defaultSection.id);
		}
		// Initialize joinedDocuments
		if (initialSchema?.joinedDocuments) {
			setJoinedDocuments(initialSchema.joinedDocuments);
		}
	}, [initialSchema, activeSectionId, sections]);

	// Build FormSchema directly from sections and joinedDocuments state
	const getSchema = useCallback((): FormSchema => {
		return {
			sections,
			joinedDocuments: joinedDocuments.length > 0 ? joinedDocuments : undefined,
			showRecap: false,
		};
	}, [sections, joinedDocuments]);

	// Notify parent
	useEffect(() => {
		if (onSchemaChange) onSchemaChange(getSchema());
	}, [getSchema, onSchemaChange]);

	// --- Actions ---

	const addSection = () => {
		const newSection: FormSection = {
			id: generateSectionId(),
			title: { fr: `Section ${sections.length + 1}` },
			fields: [],
			optional: false,
		};
		setSections([...sections, newSection]);
		setActiveSectionId(newSection.id);
		setSelectedFieldId(null);
	};

	const updateSection = (id: string, updates: Partial<FormSection>) => {
		setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
	};

	const removeSection = (id: string) => {
		if (sections.length <= 1) return; // Prevent deleting last section
		const newSections = sections.filter((s) => s.id !== id);
		setSections(newSections);
		if (activeSectionId === id) setActiveSectionId(newSections[0].id);
	};

	const addField = (type: FormFieldType) => {
		if (!activeSectionId) return;

		const newField: FormField = {
			id: generateFieldId("nouveau_champ"),
			type,
			label: { fr: "Nouveau champ", en: "New field" },
			required: false,
			options:
				type === FormFieldType.Select
					? [{ value: "option1", label: { fr: "Option 1" } }]
					: undefined,
		};

		setSections(
			sections.map((s) =>
				s.id === activeSectionId
					? { ...s, fields: [...s.fields, newField] }
					: s,
			),
		);
		setSelectedFieldId(newField.id);
	};

	const updateField = (id: string, updates: Partial<FormField>) => {
		setSections(
			sections.map((s) => ({
				...s,
				fields: s.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
			})),
		);
	};

	const removeField = (id: string) => {
		setSections(
			sections.map((s) => ({
				...s,
				fields: s.fields.filter((f) => f.id !== id),
			})),
		);
		if (selectedFieldId === id) setSelectedFieldId(null);
	};

	// Select Option helpers
	const updateFieldOptions = (
		fieldId: string,
		newOptions: NonNullable<FormField["options"]>,
	) => {
		updateField(fieldId, { options: newOptions });
	};

	// --- Document Actions ---
	const addDocument = () => {
		const newDoc: FormDocument = {
			type: `document_${Date.now()}` as any,
			label: { fr: "Nouveau document" },
			required: true,
		};
		setJoinedDocuments([...joinedDocuments, newDoc]);
	};

	const updateDocument = (type: string, updates: Partial<FormDocument>) => {
		setJoinedDocuments(
			joinedDocuments.map((doc) =>
				doc.type === type ? { ...doc, ...updates } : doc,
			),
		);
	};

	const removeDocument = (type: string) => {
		setJoinedDocuments(joinedDocuments.filter((doc) => doc.type !== type));
	};

	// Load a template into the form builder
	const loadTemplate = (template: FormTemplate) => {
		// Generate new IDs for each section and field to avoid conflicts
		const newSections = template.sections.map((section) => ({
			...section,
			id: generateSectionId(),
			fields: section.fields.map((field) => ({
				...field,
				id: generateFieldId(field.label?.fr || "champ"),
			})),
		}));
		setSections(newSections);
		setActiveSectionId(newSections[0]?.id || null);
		setSelectedFieldId(null);
		// Load joinedDocuments from template
		setJoinedDocuments(template.joinedDocuments ?? []);
	};

	// AI Generation placeholder - opens the main AI assistant
	const handleAIGenerate = () => {
		// This could integrate with the Gemini assistant to generate form fields
		// For now, show a helpful message
		alert(
			' Fonctionnalité IA\n\nOuvrez l\'assistant IA et décrivez le formulaire souhaité.\nExemple: "Crée un formulaire pour une demande de passeport avec sections identité, ancien passeport et coordonnées."',
		);
	};

	const activeSection = sections.find((s) => s.id === activeSectionId);
	const selectedField = activeSection?.fields.find(
		(f) => f.id === selectedFieldId,
	);

	// Contextual Title for Right Panel
	const configPanelTitle = selectedField
		? t("superadmin.services.formBuilder.editField")
		: activeSection
			? "Configuration de la Section"
			: "Sélectionnez un élément";

	return (
		<div className="space-y-4">
			{/* Header with Template Selector + Preview Toggle */}
			<div className="flex items-center justify-between gap-4">
				{/* Template Selector & AI Generator */}
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Layers className="h-4 w-4" />
								Modèles
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64">
							<DropdownMenuLabel>Choisir un modèle</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{formTemplates.map((template) => (
								<DropdownMenuItem
									key={template.id}
									onClick={() => loadTemplate(template)}
									className="flex flex-col items-start gap-0.5 cursor-pointer"
								>
									<span className="font-medium">{template.name.fr}</span>
									<span className="text-xs text-muted-foreground line-clamp-1">
										{template.description.fr}
									</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						type="button"
						onClick={handleAIGenerate}
					>
						<Sparkles className="h-4 w-4 text-amber-500" />
						Générer avec l'IA
					</Button>
				</div>

				{/* Preview Toggle */}
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowPreview(!showPreview)}
					className="gap-2"
					type="button"
				>
					{showPreview ? (
						<>
							<EyeOff className="h-4 w-4" />
							Masquer prévisualisation
						</>
					) : (
						<>
							<Eye className="h-4 w-4" />
							Prévisualisation
						</>
					)}
				</Button>
			</div>

			<div
				className={cn(
					"grid gap-6",
					showPreview ? "grid-cols-12" : "grid-cols-12",
				)}
			>
				{/* LEFT: Sections List + Field Toolbox */}
				<div
					className={cn(
						"flex flex-col gap-4",
						showPreview ? "col-span-2" : "col-span-3",
					)}
				>
					<FlatCard className="p-0 flex-1 flex flex-col min-h-0">
						<div className="p-2 px-4 border-b border-muted">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">Sections</p>
								<Button
									variant="ghost"
									size="sm"
									onClick={addSection}
									type="button"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-2 space-y-1">
								{sections.map((section) => (
									<button
										key={section.id}
										type="button"
										onClick={() => {
											setActiveSectionId(section.id);
											setSelectedFieldId(null); // Deselect field when switching section
										}}
										className={cn(
											"w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
											activeSectionId === section.id
												? "bg-primary/10 text-primary font-medium"
												: "hover:bg-muted text-muted-foreground",
										)}
									>
										<Layers className="h-4 w-4 shrink-0" />
										<span className="truncate flex-1 text-left">
											{section.title.fr || "Sans titre"}
										</span>
									</button>
								))}
							</div>
						</ScrollArea>
					</FlatCard>

					{/* Documents Required */}
					<FlatCard className="py-0 flex-1 flex flex-col min-h-0">
						<div className="p-4 pb-0 border-b border-muted">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">
									Documents requis
								</p>
								<Button
									variant="ghost"
									size="sm"
									onClick={addDocument}
									type="button"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-2 space-y-1">
								{joinedDocuments.map((doc) => (
									<div
										key={doc.type}
										className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-muted/50"
									>
										<FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 min-w-0">
											<Input
												value={doc.label.fr || ""}
												onChange={(e) =>
													updateDocument(doc.type, {
														label: { ...doc.label, fr: e.target.value },
													})
												}
												className="h-6 text-xs"
												placeholder="Nom du document"
											/>
										</div>
										<div className="flex items-center gap-1">
											<Switch
												checked={doc.required}
												onCheckedChange={(checked) =>
													updateDocument(doc.type, { required: checked })
												}
												className="scale-75"
											/>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												onClick={() => removeDocument(doc.type)}
												type="button"
											>
												<Trash2 className="h-3 w-3 text-destructive" />
											</Button>
										</div>
									</div>
								))}
								{joinedDocuments.length === 0 && (
									<p className="text-xs text-muted-foreground text-center py-4">
										Aucun document requis
									</p>
								)}
							</div>
						</ScrollArea>
					</FlatCard>

					<FlatCard className="p-0 flex-1 flex flex-col min-h-0">
						<div className="py-4 px-3 border-b border-muted">
							<p className="text-xs font-medium uppercase text-muted-foreground">
								{t("superadmin.services.formBuilder.addField")}
							</p>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-2 grid grid-cols-2 gap-2">
								{Object.values(FormFieldType).map((fieldType) => {
									const Icon = FieldTypeIcon[fieldType];
									return (
										<Button
											key={fieldType}
											variant="outline"
											size="sm"
											className="justify-start h-auto py-2 px-2"
											onClick={() => addField(fieldType)}
											type="button"
											disabled={!activeSectionId}
										>
											<Icon className="h-3 w-3 mr-2 shrink-0" />
											<span className="text-xs truncate capitalize">
												{fieldType.replace(/_/g, " ")}
											</span>
										</Button>
									);
								})}
							</div>
						</ScrollArea>
					</FlatCard>
				</div>

				{/* CENTER: Active Section Canvas */}
				<div
					className={cn(
						"flex flex-col min-h-0",
						showPreview ? "col-span-4" : "col-span-5",
					)}
				>
					<FlatCard className="p-0 h-full flex flex-col border-2 border-dashed border-muted">
						<div className="py-4 px-3 lg:px-4 border-b">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-base font-semibold">
										{activeSection?.title.fr || "Section"}
									</p>
									<p className="text-xs text-muted-foreground">
										{activeSection?.fields.length} champs
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setSelectedFieldId(null)} // Click header to edit section props
									className={!selectedFieldId ? "bg-accent" : ""}
									type="button"
								>
									<Settings2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<ScrollArea className="flex-1 p-4">
							<div className="space-y-3">
								{activeSection?.fields.length === 0 ? (
									<div className="text-center py-12 text-muted-foreground">
										<p>{t("superadmin.services.formBuilder.noFields")}</p>
									</div>
								) : (
									activeSection?.fields.map((field) => {
										const FieldIcon = FieldTypeIcon[field.type] || Type;
										return (
											<button
												key={field.id}
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedFieldId(field.id);
												}}
												className={cn(
													"group relative w-full flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all text-left",
													selectedFieldId === field.id
														? "ring-2 ring-primary border-primary"
														: "hover:border-primary/50",
												)}
											>
												<GripVertical className="h-4 w-4 text-muted-foreground/30" />
												<div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
													<FieldIcon className="h-4 w-4 text-foreground" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														{field.label.fr || "Nom du champ"}
													</p>
													<p className="text-xs text-muted-foreground truncate">
														Type: {field.type}
														{field.required && " • Requis"}
													</p>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
													onClick={(e) => {
														e.stopPropagation();
														removeField(field.id);
													}}
													type="button"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</button>
										);
									})
								)}
							</div>
						</ScrollArea>
					</FlatCard>
				</div>

				{/* RIGHT: Properties Editor (Section OR Field) */}
				<div
					className={cn(
						"flex flex-col min-h-0",
						showPreview ? "col-span-3" : "col-span-4",
					)}
				>
					<FlatCard className="p-0 h-full flex flex-col">
						<div className="py-4 px-3 lg:px-4 border-b border-muted">
							<p className="text-sm font-medium">
								{configPanelTitle}
							</p>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-4 space-y-6">
								{selectedField ? (
									// FIELD EDITOR
									<div className="space-y-4">
										<Tabs defaultValue="fr" className="w-full">
											<TabsList className="grid w-full grid-cols-2">
												<TabsTrigger value="fr">🇫🇷 FR</TabsTrigger>
												<TabsTrigger value="en">🇬🇧 EN</TabsTrigger>
											</TabsList>
											<TabsContent value="fr" className="space-y-3 mt-3">
												<div className="space-y-2">
													<Label>Libellé (Question)</Label>
													<Input
														value={selectedField.label.fr}
														onChange={(e) =>
															updateField(selectedField.id, {
																label: {
																	...selectedField.label,
																	fr: e.target.value,
																},
															})
														}
													/>
												</div>
												<div className="space-y-2">
													<Label>Description / Aide</Label>
													<Input
														value={selectedField.description?.fr || ""}
														onChange={(e) =>
															updateField(selectedField.id, {
																description: {
																	...selectedField.description,
																	fr: e.target.value,
																},
															})
														}
													/>
												</div>
											</TabsContent>
											<TabsContent value="en" className="space-y-3 mt-3">
												{/* English inputs */}
												<div className="space-y-2">
													<Label>Label</Label>
													<Input
														value={selectedField.label.en || ""}
														onChange={(e) =>
															updateField(selectedField.id, {
																label: {
																	...selectedField.label,
																	en: e.target.value,
																},
															})
														}
													/>
												</div>
											</TabsContent>
										</Tabs>

										<Separator />

										<div className="flex items-center justify-between">
											<Label>Champ obligatoire</Label>
											<Switch
												checked={selectedField.required}
												onCheckedChange={(v) =>
													updateField(selectedField.id, { required: v })
												}
											/>
										</div>

										{/* Type Specific Configs */}
										{selectedField.type === FormFieldType.Select && (
											<div className="space-y-2 pt-2">
												<div className="flex justify-between items-center">
													<Label>Options</Label>
													<Button
														size="sm"
														variant="outline"
														onClick={() => {
															const opts = selectedField.options || [];
															updateFieldOptions(selectedField.id, [
																...opts,
																{
																	value: `opt${opts.length}`,
																	label: { fr: "Nouvelle option" },
																},
															]);
														}}
														type="button"
													>
														<Plus className="h-3 w-3" />
													</Button>
												</div>
												<div className="space-y-2">
													{selectedField.options?.map((opt, idx) => (
														<div key={opt.value} className="flex gap-2">
															<Input
																value={opt.value}
																onChange={(e) => {
																	const newOpts = [
																		...(selectedField.options || []),
																	];
																	newOpts[idx] = {
																		...newOpts[idx],
																		value: e.target.value,
																	};
																	updateFieldOptions(selectedField.id, newOpts);
																}}
																className="w-1/3 text-xs"
															/>
															<Input
																value={opt.label.fr}
																onChange={(e) => {
																	const newOpts = [
																		...(selectedField.options || []),
																	];
																	newOpts[idx] = {
																		...newOpts[idx],
																		label: {
																			...newOpts[idx].label,
																			fr: e.target.value,
																		},
																	};
																	updateFieldOptions(selectedField.id, newOpts);
																}}
																className="flex-1 text-xs"
															/>
															<Button
																size="icon"
																variant="ghost"
																type="button"
																onClick={() => {
																	const newOpts = (
																		selectedField.options || []
																	).filter((_, i) => i !== idx);
																	updateFieldOptions(selectedField.id, newOpts);
																}}
															>
																<Trash2 className="h-3 w-3 text-destructive" />
															</Button>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								) : null}

								{!selectedField && activeSection ? (
									// SECTION EDITOR
									<div className="space-y-6">
										<div className="space-y-2">
											<Label>Titre de la section</Label>
											<Input
												value={activeSection.title.fr}
												onChange={(e) =>
													updateSection(activeSection.id, {
														title: {
															...activeSection.title,
															fr: e.target.value,
														},
													})
												}
											/>
										</div>
										<div className="space-y-2">
											<Label>Description</Label>
											<Textarea
												value={activeSection.description?.fr || ""}
												onChange={(e) =>
													updateSection(activeSection.id, {
														description: {
															...activeSection.description,
															fr: e.target.value,
														},
													})
												}
												rows={3}
											/>
										</div>
										<Separator />
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Section Optionnelle</Label>
												<p className="text-xs text-muted-foreground">
													L'utilisateur peut sauter cette étape
												</p>
											</div>
											<Switch
												checked={activeSection.optional}
												onCheckedChange={(v) =>
													updateSection(activeSection.id, { optional: v })
												}
											/>
										</div>
										<div className="pt-8">
											<Button
												variant="destructive"
												className="w-full"
												onClick={() => removeSection(activeSection.id)}
												disabled={sections.length <= 1}
												type="button"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Supprimer la section
											</Button>
										</div>
									</div>
								) : null}

								{!selectedField && !activeSection && (
									<div className="text-center text-muted-foreground py-10">
										Sélectionnez une section ou un champ pour éditer ses
										propriétés.
									</div>
								)}
							</div>
						</ScrollArea>
					</FlatCard>
				</div>

				{/* PREVIEW PANEL (conditional) */}
				{showPreview && (
					<div className="col-span-3 flex flex-col min-h-0">
						<FlatCard className="flex-1 flex flex-col overflow-hidden">
							<div className="p-3 lg:p-4 pb-2 border-b">
								<p className="text-sm font-medium">
									Prévisualisation
								</p>
							</div>
							<ScrollArea className="flex-1 p-4">
								<FormPreview
									sections={sections}
									previewData={previewData}
									onPreviewDataChange={setPreviewData}
									currentSectionId={activeSectionId ?? undefined}
								/>
							</ScrollArea>
						</FlatCard>
					</div>
				)}
			</div>
		</div>
	);
}
