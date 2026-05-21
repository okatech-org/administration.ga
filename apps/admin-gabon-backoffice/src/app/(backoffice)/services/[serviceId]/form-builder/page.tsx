"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import {
	AlignLeft,
	Calendar,
	CheckSquare,
	Eye,
	FileUp,
	GripVertical,
	Hash,
	List,
	Mail,
	Phone,
	Plus,
	Save,
	Sparkles,
	Trash2,
	Type,
	Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

// Field types with their icons and labels
const FIELD_TYPES = [
	{ type: "text", icon: Type, label: "Texte" },
	{ type: "email", icon: Mail, label: "Email" },
	{ type: "phone", icon: Phone, label: "Téléphone" },
	{ type: "date", icon: Calendar, label: "Date" },
	{ type: "select", icon: List, label: "Sélection" },
	{ type: "file", icon: FileUp, label: "Fichier" },
	{ type: "checkbox", icon: CheckSquare, label: "Case à cocher" },
	{ type: "textarea", icon: AlignLeft, label: "Zone de texte" },
	{ type: "number", icon: Hash, label: "Nombre" },
] as const;

type FieldType = (typeof FIELD_TYPES)[number]["type"];

interface FormField {
	id: string;
	type: FieldType;
	label: { fr: string; en?: string };
	description?: { fr?: string; en?: string };
	required: boolean;
	options?: { value: string; label: { fr: string; en?: string } }[];
	validation?: {
		min?: number;
		max?: number;
		pattern?: string;
	}
}

interface FormSchema {
	type: "object";
	properties: Record<string, any>;
	required: string[];
}

function generateId() {
	return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function FormBuilderPage() {
	const { serviceId } = useParams<{ serviceId: string }>();
	const { t } = useTranslation();
	const router = useRouter();

	const [fields, setFields] = useState<FormField[]>([]);
	const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
	const [aiPrompt, setAiPrompt] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const { data: service, isPending: isLoading } = useAuthenticatedConvexQuery(
		api.functions.services.getById,
		{ serviceId: serviceId as Id<"services"> },
	)

	const { mutateAsync: updateService, isPending: isSaving } = useConvexMutationQuery(
		api.functions.services.update,
	)

	// Convert fields to Convex FormSchema format
	const toJsonSchema = useCallback((): FormSchema => {
		const properties: Record<string, any> = {};
		const required: string[] = [];

		for (const field of fields) {
			const prop: any = {
				title: field.label,
				description: field.description,
			}

			switch (field.type) {
				case "text":
				case "email":
				case "phone":
				case "textarea":
					prop.type = "string";
					if (field.type === "email") prop.format = "email";
					break
				case "date":
					prop.type = "string";
					prop.format = "date";
					break
				case "number":
					prop.type = "number";
					if (field.validation?.min !== undefined)
						prop.minimum = field.validation.min;
					if (field.validation?.max !== undefined)
						prop.maximum = field.validation.max;
					break
				case "checkbox":
					prop.type = "boolean";
					break
				case "select":
					prop.type = "string";
					if (field.options?.length) {
						prop.enum = field.options.map((o) => o.value);
						prop.enumLabels = field.options.reduce(
							(acc, o) => {
								acc[o.value] = o.label
								return acc
							},
							{} as Record<string, any>,
						)
					}
					break
				case "file":
					prop.type = "string";
					prop.format = "file";
					break
			}

			properties[field.id] = prop;
			if (field.required) required.push(field.id);
		}

		return { type: "object", properties, required };
	}, [fields]);

	// Add a new field
	const addField = (type: FieldType) => {
		const newField: FormField = {
			id: generateId(),
			type,
			label: { fr: "", en: "" },
			required: false,
			options:
				type === "select"
					? [{ value: "option1", label: { fr: "Option 1" } }]
					: undefined,
		}
		setFields([...fields, newField]);
		setSelectedFieldId(newField.id);
	}

	// Update a field
	const updateField = (id: string, updates: Partial<FormField>) => {
		setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
	}

	// Remove a field
	const removeField = (id: string) => {
		setFields(fields.filter((f) => f.id !== id));
		if (selectedFieldId === id) setSelectedFieldId(null);
	}

	// Add option to select field
	const addOption = (fieldId: string) => {
		const field = fields.find((f) => f.id === fieldId);
		if (field?.options) {
			const newOptions = [
				...field.options,
				{
					value: `option${field.options.length + 1}`,
					label: { fr: `Option ${field.options.length + 1}` },
				},
			]
			updateField(fieldId, { options: newOptions });
		}
	}

	// Remove option from select field
	const removeOption = (fieldId: string, optionIndex: number) => {
		const field = fields.find((f) => f.id === fieldId);
		if (field?.options) {
			const newOptions = field.options.filter((_, i) => i !== optionIndex);
			updateField(fieldId, { options: newOptions });
		}
	}

	// Update option
	const updateOption = (
		fieldId: string,
		optionIndex: number,
		updates: Partial<{ value: string; label: { fr: string; en?: string } }>,
	) => {
		const field = fields.find((f) => f.id === fieldId);
		if (field?.options) {
			const newOptions = [...field.options];
			newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
			updateField(fieldId, { options: newOptions });
		}
	}

	// Save form schema
	const handleSave = async () => {
		try {
			// Convert local fields array to the expected FormSchema structure for Convex
			const formattedSchema = {
				sections: [
					{
						id: "section_main",
						title: { fr: "Formulaire", en: "Form" },
						fields: fields.map(f => ({
							id: f.id,
							type: f.type,
							label: f.label,
							description: f.description,
							required: f.required,
							options: f.options,
							validation: f.validation,
						}))
					}
				],
				showRecap: true,
			}

			console.log("Saving Form Schema:", JSON.stringify(formattedSchema, null, 2));

			await updateService({
				serviceId: serviceId as Id<"services">,
				formSchema: formattedSchema as any, // Type cast to bypass strict validation in frontend momentarily
			})

			toast.success(t("superadmin.services.form.success") || "Formulaire sauvegardé avec succès");
		} catch (error) {
			console.error("Failed to save schema:", error);
			toast.error(t("superadmin.common.error") || "Erreur lors de la sauvegarde");
		}
	}

	// AI Generate (placeholder)
	const handleAiGenerate = async () => {
		if (!aiPrompt.trim()) {
			toast.error("Veuillez entrer une description");
			return
		}
		setIsGenerating(true);
		// TODO: Call AI to generate form fields
		setTimeout(() => {
			toast.info("Génération IA à implémenter");
			setIsGenerating(false);
		}, 1000);
	}

	const selectedField = fields.find((f) => f.id === selectedFieldId);

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col gap-6 p-4 pt-6">
				<Skeleton className="h-8 w-64" />
				<div className="grid grid-cols-12 gap-6">
					<Skeleton className="col-span-3 h-96" />
					<Skeleton className="col-span-5 h-96" />
					<Skeleton className="col-span-4 h-96" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			{/* Header */}
			<PageHeader
				icon={<Wrench className="h-5 w-5" />}
				title="Formulaire de demande"
				subtitle={service?.name?.fr}
				showBackButton
				onBack={() => router.push("/services")}
				actions={
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => console.log(toJsonSchema())}>
							<Eye className="mr-2 h-4 w-4" />
							Aperçu
						</Button>
						<Button onClick={handleSave} disabled={isSaving || isLoading}>
							<Save className="mr-2 h-4 w-4" />
							{isSaving ? "Enregistrement..." : "Enregistrer"}
						</Button>
					</div>
				}
			/>

			<div className="grid grid-cols-12 gap-6 flex-1">
				{/* Left Sidebar - Field Types */}
				<div className="col-span-3 space-y-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<h3 className="text-sm font-medium mb-3">
								Ajouter un champ
							</h3>
							<div className="grid grid-cols-2 gap-2">
							<ScrollArea className="h-full">
								{FIELD_TYPES.map(({ type, icon: Icon, label }) => (
									<Button
										key={type}
										variant="outline"
										size="sm"
										className="h-auto py-3 flex-col gap-1"
										onClick={() => addField(type)}
									>
										<Icon className="h-4 w-4" />
										<span className="text-xs">{label}</span>
									</Button>
								))}
							</ScrollArea>
							</div>
						</div>
					</FlatCard>

					{/* AI Assistant */}
					<FlatCard>
						<div className="p-3 lg:p-4 space-y-3">
							<h3 className="text-sm font-medium flex items-center gap-2">
								<Sparkles className="h-4 w-4 text-yellow-500" />
								Assistant IA
							</h3>
							<Textarea
								placeholder="Décrivez le service ou collez sa description... L'IA générera les champs appropriés."
								value={aiPrompt}
								onChange={(e) => setAiPrompt(e.target.value)}
								rows={4}
							/>
							<Button
								className="w-full"
								variant="secondary"
								onClick={handleAiGenerate}
								disabled={isGenerating}
							>
								{isGenerating ? "Génération..." : "Générer le formulaire"}
							</Button>
						</div>
					</FlatCard>
				</div>

				{/* Center - Form Preview */}
				<div className="col-span-5">
					<FlatCard className="h-full">
						<div className="p-3 lg:p-4 space-y-2">
							<h3 className="text-sm font-medium mb-3">
								Champs du formulaire
							</h3>
							{fields.length === 0 ? (
								<div className="text-center py-12 text-muted-foreground">
									<p>Aucun champ ajouté</p>
									<p className="text-sm">
										Cliquez sur un type de champ pour commencer
									</p>
								</div>
							) : (
								fields.map((field, index) => {
									const FieldIcon =
										FIELD_TYPES.find((t) => t.type === field.type)?.icon ||
										Type
									return (
										<div
											key={field.id}
											className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${
												selectedFieldId === field.id
													? "border-primary bg-primary/5"
													: "hover:border-muted-foreground/50"
											}`}
											onClick={() => setSelectedFieldId(field.id)}
										>
											<GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
											<FieldIcon className="h-4 w-4 text-muted-foreground" />
											<div className="flex-1 min-w-0">
												<p className="font-medium truncate">
													{field.label.fr || "Sans titre"}
												</p>
												<p className="text-xs text-muted-foreground">
													{
														FIELD_TYPES.find((t) => t.type === field.type)
															?.label
													}
												</p>
											</div>
											{field.required && (
												<Badge variant="secondary" className="text-xs">
													Requis
												</Badge>
											)}
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 shrink-0"
												onClick={(e) => {
													e.stopPropagation()
													removeField(field.id)
												}}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									)
								})
							)}
						</div>
					</FlatCard>
				</div>

				{/* Right Sidebar - Field Editor */}
				<div className="col-span-4">
					<FlatCard className="h-full">
						<div className="p-3 lg:p-4">
							<h3 className="text-sm font-medium mb-3">
								{selectedField ? "Éditer le champ" : "Sélectionnez un champ"}
							</h3>
							{selectedField ? (
								<div className="space-y-4">
									{/* Labels */}
									<Tabs defaultValue="fr" className="w-full">
										<TabsList className="grid w-full grid-cols-2">
											<TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
											<TabsTrigger value="en">🇬🇧 English</TabsTrigger>
										</TabsList>
										<TabsContent value="fr" className="space-y-3 mt-3">
											<div className="space-y-2">
												<Label>Label *</Label>
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
													placeholder="Ex: Date de naissance"
												/>
											</div>
											<div className="space-y-2">
												<Label>Description</Label>
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
													placeholder="Aide contextuelle"
												/>
											</div>
										</TabsContent>
										<TabsContent value="en" className="space-y-3 mt-3">
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
													placeholder="Ex: Date of birth"
												/>
											</div>
											<div className="space-y-2">
												<Label>Description</Label>
												<Input
													value={selectedField.description?.en || ""}
													onChange={(e) =>
														updateField(selectedField.id, {
															description: {
																...selectedField.description,
																en: e.target.value,
															},
														})
													}
													placeholder="Help text"
												/>
											</div>
										</TabsContent>
									</Tabs>

									<Separator />

									{/* Required toggle */}
									<div className="flex items-center justify-between">
										<Label>Champ obligatoire</Label>
										<Switch
											checked={selectedField.required}
											onCheckedChange={(v) =>
												updateField(selectedField.id, { required: v })
											}
										/>
									</div>

									{/* Options for select */}
									{selectedField.type === "select" && (
										<>
											<Separator />
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<Label>Options</Label>
													<Button
														variant="outline"
														size="sm"
														onClick={() => addOption(selectedField.id)}
													>
														<Plus className="h-3 w-3 mr-1" />
														Ajouter
													</Button>
												</div>
												<div className="space-y-2">
													{selectedField.options?.map((opt, i) => (
														<div key={i} className="flex gap-2">
															<Input
																value={opt.value}
																onChange={(e) =>
																	updateOption(selectedField.id, i, {
																		value: e.target.value,
																	})
																}
																placeholder="Valeur"
																className="w-1/3"
															/>
															<Input
																value={opt.label.fr}
																onChange={(e) =>
																	updateOption(selectedField.id, i, {
																		label: { ...opt.label, fr: e.target.value },
																	})
																}
																placeholder="Label FR"
																className="flex-1"
															/>
															<Button
																variant="ghost"
																size="icon"
																onClick={() =>
																	removeOption(selectedField.id, i)
																}
															>
																<Trash2 className="h-4 w-4 text-destructive" />
															</Button>
														</div>
													))}
												</div>
											</div>
										</>
									)}

									{/* Validation for number */}
									{selectedField.type === "number" && (
										<>
											<Separator />
											<div className="grid grid-cols-2 gap-3">
												<div className="space-y-2">
													<Label>Min</Label>
													<Input
														type="number"
														value={selectedField.validation?.min ?? ""}
														onChange={(e) =>
															updateField(selectedField.id, {
																validation: {
																	...selectedField.validation,
																	min: e.target.value
																		? Number(e.target.value)
																		: undefined,
																},
															})
														}
													/>
												</div>
												<div className="space-y-2">
													<Label>Max</Label>
													<Input
														type="number"
														value={selectedField.validation?.max ?? ""}
														onChange={(e) =>
															updateField(selectedField.id, {
																validation: {
																	...selectedField.validation,
																	max: e.target.value
																		? Number(e.target.value)
																		: undefined,
																},
															})
														}
													/>
												</div>
											</div>
										</>
									)}
								</div>
							) : (
								<p className="text-center text-muted-foreground py-8">
									Sélectionnez un champ pour l'éditer
								</p>
							)}
						</div>
					</FlatCard>
				</div>
			</div>
		</div>
	)
}
