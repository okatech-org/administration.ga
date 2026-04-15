"use client";

import type { FormSection } from "@/components/admin/FormBuilder";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
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
import { evaluateCondition } from "@/lib/conditionEvaluator";
import { cn } from "@/lib/utils";

interface FormPreviewProps {
	sections: FormSection[];
	previewData?: Record<string, Record<string, unknown>>;
	onPreviewDataChange?: (data: Record<string, Record<string, unknown>>) => void;
	currentSectionId?: string;
	language?: "fr" | "en";
}

const getLocalized = (
	obj: { fr?: string; en?: string } | undefined,
	lang: string,
): string => {
	if (!obj) return "";
	return lang === "en" && obj.en ? obj.en : obj.fr || "";
};

export function FormPreview({
	sections,
	previewData = {},
	onPreviewDataChange,
	currentSectionId,
	language = "fr",
}: FormPreviewProps) {
	const updateField = (sectionId: string, fieldId: string, value: unknown) => {
		if (!onPreviewDataChange) return;
		onPreviewDataChange({
			...previewData,
			[sectionId]: {
				...previewData[sectionId],
				[fieldId]: value,
			},
		});
	};

	const getFieldValue = (sectionId: string, fieldId: string) => {
		return previewData[sectionId]?.[fieldId] ?? "";
	};

	// Filter visible sections based on conditions
	const visibleSections = sections.filter((section) =>
		evaluateCondition(section.conditions?.[0] as import("@/components/admin/FormBuilder").FieldCondition | undefined, previewData),
	);

	return (
		<div className="space-y-4">
			{visibleSections.map((section, sectionIdx) => {
				const isActive = currentSectionId === section.id;

				// Filter visible fields based on conditions
				const visibleFields = section.fields.filter((field) =>
					evaluateCondition(field.conditions?.[0] as import("@/components/admin/FormBuilder").FieldCondition | undefined, previewData),
				);

				return (
					<FlatCard
						key={section.id}
						className={cn(
							"transition-all duration-200",
							isActive && "ring-2 ring-primary",
						)}
					>
						<div className="p-3 lg:p-4 pb-0">
							<div className="flex items-center gap-2">
								<Badge variant="outline" className="text-xs">
									{sectionIdx + 1}
								</Badge>
								<h3 className="text-sm font-bold">
									{getLocalized(section.title, language) ||
										"Section sans titre"}
								</h3>
								{section.optional && (
									<Badge variant="secondary" className="text-[10px]">
										Optionnel
									</Badge>
								)}
							</div>
						</div>
						<div className="p-3 lg:p-4 space-y-4">
							{visibleFields.length === 0 ? (
								<p className="text-xs text-muted-foreground italic">
									Aucun champ visible
								</p>
							) : (
								visibleFields.map((field) => (
									<div key={field.id} className="space-y-1.5">
										<Label className="text-xs font-medium">
											{getLocalized(field.label, language)}
											{field.required && (
												<span className="text-destructive ml-1">*</span>
											)}
										</Label>
										{renderFieldInput(
											field,
											section.id,
											getFieldValue,
											updateField,
											language,
										)}
									</div>
								))
							)}
						</div>
					</FlatCard>
				);
			})}

			{visibleSections.length === 0 && (
				<div className="text-center py-8 text-muted-foreground">
					<p className="text-sm">Aucune section à afficher</p>
					<p className="text-xs mt-1">
						Ajoutez des sections dans le panneau de gauche
					</p>
				</div>
			)}
		</div>
	);
}

function renderFieldInput(
	field: FormSection["fields"][0],
	sectionId: string,
	getValue: (sectionId: string, fieldId: string) => unknown,
	setValue: (sectionId: string, fieldId: string, value: unknown) => void,
	lang: string,
) {
	const value = getValue(sectionId, field.id);

	switch (field.type) {
		case "textarea":
			return (
				<Textarea
					className="text-xs min-h-[60px] resize-none"
					placeholder={
						field.description ? getLocalized(field.description, lang) : ""
					}
					value={String(value || "")}
					onChange={(e) => setValue(sectionId, field.id, e.target.value)}
				/>
			);

		case "select":
			return (
				<Select
					value={String(value || "")}
					onValueChange={(v) => setValue(sectionId, field.id, v)}
				>
					<SelectTrigger className="text-xs h-8">
						<SelectValue placeholder="Sélectionner..." />
					</SelectTrigger>
					<SelectContent>
						{field.options?.map((opt) => (
							<SelectItem key={opt.value} value={opt.value} className="text-xs">
								{getLocalized(opt.label, lang)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);

		case "checkbox":
			return (
				<div className="flex items-center gap-2">
					<Checkbox
						checked={Boolean(value)}
						onCheckedChange={(v) => setValue(sectionId, field.id, v)}
					/>
					<span className="text-xs text-muted-foreground">
						{field.description ? getLocalized(field.description, lang) : ""}
					</span>
				</div>
			);

		case "date":
			return (
				<Input
					type="date"
					className="text-xs h-8"
					value={String(value || "")}
					onChange={(e) => setValue(sectionId, field.id, e.target.value)}
				/>
			);

		case "number":
			return (
				<Input
					type="number"
					className="text-xs h-8"
					placeholder={
						field.description ? getLocalized(field.description, lang) : ""
					}
					value={String(value || "")}
					onChange={(e) => setValue(sectionId, field.id, e.target.value)}
				/>
			);

		case "email":
			return (
				<Input
					type="email"
					className="text-xs h-8"
					placeholder={
						field.description
							? getLocalized(field.description, lang) || "email@example.com"
							: "email@example.com"
					}
					value={String(value || "")}
					onChange={(e) => setValue(sectionId, field.id, e.target.value)}
				/>
			);

		case "tel":
			return (
				<Input
					type="tel"
					className="text-xs h-8"
					placeholder="+33 6 00 00 00 00"
					value={String(value || "")}
					onChange={(e) => setValue(sectionId, field.id, e.target.value)}
				/>
			);

		default: // text
			return (
				<Input
					type="text"
					className="text-xs h-8"
					placeholder={
						field.description ? getLocalized(field.description, lang) : ""
					}
					value={String(value || "")}
					onChange={(e) => setValue(sectionId, field.id, e.target.value)}
				/>
			);
	}
}
