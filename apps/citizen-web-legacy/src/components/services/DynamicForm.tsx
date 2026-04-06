"use client";

import { FormFieldType, Gender } from "@convex/lib/constants";
import type { CountryCode } from "@convex/lib/countryCodeValidator";
import { getLocalized } from "@convex/lib/utils";
import type { Address, FormSchema } from "@convex/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { useFormFillEffect } from "@/components/ai/useFormFillEffect";
import { DocumentField } from "@/components/services/DocumentField";
import { AddressField } from "@/components/ui/address-field";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { captureEvent } from "@/lib/analytics";
import { getFieldSchema } from "@/lib/baseSchemas";
import { evaluateCondition } from "@/lib/conditionEvaluator";
import { cn, scrollToTop } from "@/lib/utils";
import { CountrySelect } from "@/components/ui/country-select";
import { MultiSelect } from "@/components/ui/multi-select";

/**
 * Transform a FormSchema into a Zod schema.
 * Structure: { sectionId: { fieldId: value }, _documents: { docType: string[] } }
 */
function parseZodSchemaFromFormSchema(schema: FormSchema) {
	const sectionsShape: Record<string, z.ZodTypeAny> = {};

	// Build schema for each section
	for (const section of schema.sections) {
		const sectionShape: Record<string, z.ZodTypeAny> = {};

		for (const field of section.fields) {
			const fieldSchema = getFieldSchema(field.type, field.required);

			if (!fieldSchema) {
				console.warn(`Unknown field type: ${field.type}, defaulting to string`);
				sectionShape[field.id] = field.required
					? z.string().min(1)
					: z.string().optional();
				continue;
			}

			sectionShape[field.id] = fieldSchema;
		}

		sectionsShape[section.id] = z.object(sectionShape);
	}

	// NOTE: joinedDocuments are managed via separate state (documentUploads),
	// NOT via react-hook-form. Validation is handled manually at submit time.

	return z.object(sectionsShape);
}

interface DynamicFormProps {
	/** Form schema - optional for documents-only services */
	schema?: FormSchema;
	defaultValues?: Record<string, unknown>;
	onSubmit: (data: Record<string, unknown>) => Promise<void>;
	isSubmitting?: boolean;
	requestType?: string;
	/** Callback when documents are updated */
	onDocumentsChange?: (fieldPath: string, documentIds: string[]) => void;
}

export function DynamicForm({
	schema,
	defaultValues,
	onSubmit,
	isSubmitting,
	requestType,
	onDocumentsChange,
}: DynamicFormProps) {
	const { i18n, t } = useTranslation();
	const lang = i18n.language;
	const [currentStep, setCurrentStep] = useState(0);

	// Track uploaded documents by type: { docType: [documentId1, documentId2] }
	const [documentUploads, setDocumentUploads] = useState<
		Record<string, string[]>
	>({});

	// Get joined documents from schema
	const joinedDocuments = schema?.joinedDocuments ?? [];

	// 1. Parse sections from FormSchema + Zod Schema generation
	const { sections, zodSchema } = useMemo(() => {
		// Handle empty/undefined schema for documents-only services
		if (!schema || !schema.sections || schema.sections.length === 0) {
			return { sections: [], zodSchema: z.object({}) };
		}

		// Map sections with localized titles and fields for UI rendering
		const parsedSections = schema.sections.map((section) => ({
			id: section.id,
			title: getLocalized(section.title, lang),
			description: section.description
				? getLocalized(section.description, lang)
				: undefined,
			fields: section.fields.map((field) => ({
				...field,
				path: `${section.id}.${field.id}`,
				label: getLocalized(field.label, lang),
				description: field.description
					? getLocalized(field.description, lang)
					: undefined,
			})),
		}));

		// Generate Zod schema using the utility function
		const generatedSchema = parseZodSchemaFromFormSchema(schema);

		return {
			sections: parsedSections,
			zodSchema: generatedSchema,
		};
	}, [schema, lang]);

	// 2. Form Initialization
	const form = useForm<z.infer<typeof zodSchema>>({
		resolver: zodResolver(zodSchema),
		defaultValues: defaultValues || {},
		mode: "onChange",
	});

	console.log("form", form.formState.errors);
	console.log("form values", form.getValues());

	// AI Fill Effect - Generate mapping from schema and apply
	const dynamicMapping = useMemo(() => {
		const mapping: Record<string, string> = {};
		sections.forEach((section) => {
			section.fields.forEach((field) => {
				const fieldPath = `${section.id}.${field.id}`;
				const normalizedKey = field.id.toLowerCase().replace(/[_-]/g, "");

				// Map common field names to their paths
				const commonMappings: Record<string, string[]> = {
					firstName: ["firstname", "prenom", "givenname"],
					lastName: ["lastname", "nom", "familyname", "surname"],
					birthDate: ["birthdate", "datenaissance", "dateofbirth", "dob"],
					birthPlace: ["birthplace", "lieunaissance", "placeofbirth"],
					email: ["email", "courriel", "mail"],
					phone: ["phone", "telephone", "tel", "mobile"],
					nationality: ["nationality", "nationalite"],
					gender: ["gender", "sexe"],
				};

				for (const [aiKey, aliases] of Object.entries(commonMappings)) {
					if (aliases.includes(normalizedKey)) {
						mapping[aiKey] = fieldPath;
						break;
					}
				}
			});
		});
		return mapping;
	}, [sections]);

	useFormFillEffect(form, "dynamic", dynamicMapping);

	// Calculate steps: form sections + documents (optional)
	const hasDocumentsStep = joinedDocuments.length > 0;
	const totalSteps = sections.length + (hasDocumentsStep ? 1 : 0);
	const isDocumentsStep = hasDocumentsStep && currentStep === totalSteps - 1;
	const formSectionIndex = currentStep;

	// 3. Navigation Logic
	const nextStep = async () => {
		// If on a schema section, validate it first
		if (formSectionIndex >= 0 && formSectionIndex < sections.length) {
			const currentSectionId = sections[formSectionIndex].id;
			const valid = await form.trigger(
				currentSectionId as keyof z.infer<typeof zodSchema>,
			);
			if (!valid) return;
		}
		setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
		scrollToTop();
	};

	const prevStep = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
		scrollToTop();
	};

	const isLastStep = currentStep === totalSteps - 1;
	const currentSection =
		formSectionIndex >= 0 && formSectionIndex < sections.length
			? sections[formSectionIndex]
			: null;

	// Check if all required documents have been uploaded
	const hasAllRequiredDocs = joinedDocuments
		.filter((doc) => doc.required)
		.every((doc) => (documentUploads[doc.type]?.length ?? 0) > 0);

	// Merge document uploads into form data before submitting
	const handleFormSubmit = form.handleSubmit((data) => {
		// Validate required documents manually
		const missingDocs = joinedDocuments.filter(
			(doc) =>
				doc.required &&
				(!documentUploads[doc.type] || documentUploads[doc.type].length === 0),
		);
		if (missingDocs.length > 0) {
			// Navigate to documents step to show errors
			setCurrentStep(totalSteps - 1);
			return;
		}

		const mergedData = { ...data };
		if (joinedDocuments.length > 0) {
			(mergedData as Record<string, unknown>)._documents = documentUploads;
		}
		return onSubmit(mergedData as Record<string, unknown>);
	});

	return (
		<form onSubmit={handleFormSubmit} className="space-y-6">
			{/* Progress Indicator */}
			<div className="flex items-center justify-between mb-8 px-1">
				<div className="flex space-x-2">
					{Array.from({ length: totalSteps }).map((_, idx) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: <Its alright, we are adding a prefix to the key>
							key={`step-${idx}`}
							className={cn(
								"h-1.5 w-8 rounded-full transition-colors duration-300",
								idx <= currentStep ? "bg-primary" : "bg-muted",
							)}
						/>
					))}
				</div>
				<span className="text-sm text-muted-foreground font-medium">
					{t("step")} {currentStep + 1} / {totalSteps}
				</span>
			</div>

			<AnimatePresence mode="wait">
				<motion.div
					key={currentStep}
					initial={{ opacity: 0, x: 10 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -10 }}
					transition={{ duration: 0.2 }}
				>
					<Card className="border-border/50 shadow-sm">
						{/* Documents Step */}
						{isDocumentsStep ? (
							<>
								<CardHeader>
									<CardTitle>{t("documents.checklist.title")}</CardTitle>
									<CardDescription>
										{t(
											"documents.checklist.description",
											"Veuillez téléverser les documents requis pour compléter votre demande.",
										)}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<FieldGroup>
										{joinedDocuments.map((doc) => {
											const docUploads = documentUploads[doc.type] || [];
											return (
												<DocumentField
													key={doc.type}
													fieldId={`doc-${doc.type}`}
													label={getLocalized(doc.label, lang)}
													description={
														doc.required
															? t("common.required")
															: t("common.optional")
													}
													required={doc.required}
													documentIds={docUploads}
													docType={doc.type}
													isInvalid={doc.required && docUploads.length === 0}
													onUpload={(documentId) => {
														setDocumentUploads((prev) => ({
															...prev,
															[doc.type]: [
																...(prev[doc.type] || []),
																documentId,
															],
														}));
														if (requestType) {
															captureEvent(
																"myspace_request_document_uploaded",
																{
																	request_type: requestType,
																	document_type: doc.type,
																},
															);
														}
													}}
													onRemove={(documentId) => {
														setDocumentUploads((prev) => ({
															...prev,
															[doc.type]: (prev[doc.type] || []).filter(
																(id) => id !== documentId,
															),
														}));
													}}
												/>
											);
										})}
									</FieldGroup>
								</CardContent>
							</>
						) : currentSection ? (
							<>
								<CardHeader>
									<CardTitle>{currentSection.title}</CardTitle>
									{currentSection.description && (
										<CardDescription>
											{currentSection.description}
										</CardDescription>
									)}
								</CardHeader>
								<CardContent>
									<FieldGroup>
										{currentSection.fields
											.filter((field) => {
												// Check if field has conditions and if they're met
												if (!field.conditions || field.conditions.length === 0)
													return true;
												const formValues = form.getValues();
												// Evaluate first condition (simplified - could extend for AND/OR logic)
												return evaluateCondition(
													field.conditions[0] as {
														fieldPath: string;
														operator: string;
														value?: unknown;
													},
													formValues,
												);
											})
											.map((field) => {
												const fieldName =
													`${currentSection.id}.${field.id}` as keyof z.infer<
														typeof zodSchema
													>;
												const fieldId = `form-${currentSection.id}-${field.id}`;

												return (
													<Controller
														key={field.id as string}
														name={fieldName}
														control={form.control}
														render={({ field: formField, fieldState }) => {
															function renderField() {
																switch (field.type) {
																	case FormFieldType.Text:
																		return (
																			<Input
																				{...formField}
																				value={
																					(formField.value as string) ?? ""
																				}
																				id={fieldId}
																				type="text"
																				aria-invalid={fieldState.invalid}
																				placeholder={
																					field.description || undefined
																				}
																			/>
																		);
																	case FormFieldType.Textarea:
																		return (
																			<Textarea
																				{...formField}
																				value={
																					(formField.value as string) ?? ""
																				}
																				id={fieldId}
																				aria-invalid={fieldState.invalid}
																				placeholder={
																					field.description || undefined
																				}
																				autoComplete={formField.name}
																			/>
																		);
																	case FormFieldType.Email:
																		return (
																			<Input
																				{...formField}
																				value={
																					(formField.value as string) ?? ""
																				}
																				id={fieldId}
																				type="email"
																				aria-invalid={fieldState.invalid}
																				placeholder={
																					field.description || undefined
																				}
																				autoComplete="email"
																			/>
																		);
																	case FormFieldType.Phone:
																		return (
																			<Input
																				{...formField}
																				value={
																					(formField.value as string) ?? ""
																				}
																				id={fieldId}
																				type="tel"
																				aria-invalid={fieldState.invalid}
																				placeholder={
																					field.description || undefined
																				}
																				autoComplete="tel"
																			/>
																		);
																	case FormFieldType.Date:
																		return (
																			<Input
																				{...formField}
																				value={
																					(formField.value as string) ?? ""
																				}
																				id={fieldId}
																				type="date"
																				aria-invalid={fieldState.invalid}
																				placeholder={
																					field.description || undefined
																				}
																				autoComplete="date"
																			/>
																		);
																	case FormFieldType.Number:
																		return (
																			<Input
																				{...formField}
																				value={
																					(formField.value as string) ?? ""
																				}
																				id={fieldId}
																				type="number"
																				aria-invalid={fieldState.invalid}
																				placeholder={
																					field.description || undefined
																				}
																				autoComplete="number"
																			/>
																		);
																	case FormFieldType.Select:
																		return (
																			<MultiSelect<string>
																				type="single"
																				options={
																					field.options?.map((option) => ({
																						value: option.value,
																						label: getLocalized(
																							option.label,
																							lang,
																						),
																					})) || []
																				}
																				onChange={formField.onChange}
																				aria-invalid={fieldState.invalid}
																			/>
																		);
																	case FormFieldType.Checkbox:
																		return (
																			<Checkbox
																				{...formField}
																				value={formField.value as any}
																				id={fieldId}
																				aria-invalid={fieldState.invalid}
																			/>
																		);
																	case FormFieldType.File:
																	case FormFieldType.Image:
																	case FormFieldType.ProfileDocument:
																		return (
																			<DocumentField
																				fieldId={fieldId}
																				label={field.label}
																				description={field.description}
																				required={field.required}
																				documentIds={[
																					formField.value as string,
																				]}
																				docType={field.id}
																				isInvalid={fieldState.invalid}
																				onUpload={(documentId) => {
																					const currentIds =
																						(formField.value as string[]) || [];
																					const newIds = [
																						...currentIds,
																						documentId,
																					];
																					formField.onChange(newIds);
																					if (requestType) {
																						captureEvent(
																							"myspace_request_document_uploaded",
																							{
																								request_type: requestType,
																								document_type: field.id,
																							},
																						);
																					}
																					onDocumentsChange?.(
																						fieldName as string,
																						newIds,
																					);
																				}}
																				onRemove={(documentId) => {
																					const currentIds =
																						(formField.value as string[]) || [];
																					const newIds = currentIds.filter(
																						(id) => id !== documentId,
																					);
																					formField.onChange(newIds);
																					onDocumentsChange?.(
																						fieldName as string,
																						newIds,
																					);
																				}}
																			/>
																		);

																	case FormFieldType.Address:
																		return (
																			<AddressField
																				fieldId={fieldId}
																				label={field.label}
																				address={formField.value as Address}
																				onChange={formField.onChange}
																				aria-invalid={fieldState.invalid}
																			/>
																		);
																	case FormFieldType.Country:
																		return (
																			<CountrySelect
																				aria-invalid={fieldState.invalid}
																				id={fieldId}
																				type="single"
																				selected={
																					formField.value as CountryCode
																				}
																				onChange={(value) =>
																					formField.onChange(value)
																				}
																			/>
																		);
																	case FormFieldType.Gender:
																		return (
																			<MultiSelect<Gender>
																				type="single"
																				aria-invalid={fieldState.invalid}
																				selected={
																					formField.value as Gender | undefined
																				}
																				onChange={(value) =>
																					formField.onChange(value)
																				}
																				options={[
																					{
																						value: Gender.Male,
																						label: t(
																							"common.gender.male",
																							"Homme",
																						),
																					},
																					{
																						value: Gender.Female,
																						label: t(
																							"common.gender.female",
																							"Femme",
																						),
																					},
																				]}
																			/>
																		);
																	default:
																		return null;
																}
															}
															return (
																<Field data-invalid={fieldState.invalid}>
																	<FieldLabel htmlFor={fieldId}>
																		{field.label}
																		{field.required && (
																			<span className="text-destructive ml-1">
																				*
																			</span>
																		)}
																	</FieldLabel>

																	{renderField()}

																	{field.description && (
																		<FieldDescription>
																			{field.description}
																		</FieldDescription>
																	)}

																	{/* Error */}
																	{fieldState.invalid && (
																		<FieldError errors={[fieldState.error]} />
																	)}
																</Field>
															);
														}}
													/>
												);
											})}
									</FieldGroup>
								</CardContent>
							</>
						) : null}

						{/* Footer with navigation buttons */}
						<CardFooter className="flex justify-between pt-6 border-t bg-muted/20">
							<Button
								type="button"
								variant="ghost"
								onClick={prevStep}
								disabled={currentStep === 0}
								className={cn(currentStep === 0 && "invisible")}
							>
								<ArrowLeft className="mr-2 size-4" />
								{t("previous")}
							</Button>

							{isLastStep ? (
								<Button
									type="submit"
									disabled={
										isSubmitting || (isDocumentsStep && !hasAllRequiredDocs)
									}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											{t("submitting")}
										</>
									) : (
										<>
											<Check className="mr-2 size-4" />
											{t("submit")}
										</>
									)}
								</Button>
							) : (
								<Button type="button" onClick={nextStep}>
									{t("next")}
									<ArrowRight className="ml-1 size-4" />
								</Button>
							)}
						</CardFooter>
					</Card>
				</motion.div>
			</AnimatePresence>
		</form>
	);
}
