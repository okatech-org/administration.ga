"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FormSchema } from "@convex/lib/validators";
import { ServiceCategory } from "@convex/lib/validators";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, FileText as FileIcon, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FormBuilder } from "@/components/admin/FormBuilder";
import { RichTextEditor } from "@/components/common/lazy-rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_app/services/$serviceId_/edit")({
	component: EditServicePageWrapper,
});

// Wrapper component that provides the key prop
function EditServicePageWrapper() {
	const { serviceId } = Route.useParams();

	// Using serviceId as key forces component recreation when navigating between services
	return (
		<EditServiceForm key={serviceId} serviceId={serviceId as Id<"services">} />
	);
}

interface EditServiceFormProps {
	serviceId: Id<"services">;
}

function EditServiceForm({ serviceId }: EditServiceFormProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [contentFr, setContentFr] = useState("");
	const [contentEn, setContentEn] = useState("");
	const [requiresAppointment, setRequiresAppointment] = useState(true);
	const [requiresPickupAppointment, setRequiresPickupAppointment] =
		useState(false);
	const [formSchema, setFormSchema] = useState<FormSchema | undefined>(
		undefined,
	);
	const [isInitialized, setIsInitialized] = useState(false);

	// Form files state
	type FormFile = {
		storageId: string;
		filename: string;
		mimeType: string;
		sizeBytes: number;
		uploadedAt: number;
	};
	const [formFiles, setFormFiles] = useState<FormFile[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const formFileInputRef = useRef<HTMLInputElement>(null);
	const generateUploadUrl = useMutation(
		api.functions.documents.generateUploadUrl,
	);

	const { data: service, isPending: isLoading } = useAuthenticatedConvexQuery(
		api.functions.services.getById,
		{ serviceId },
	);

	const { mutateAsync: updateService, isPending } = useConvexMutationQuery(
		api.functions.services.update,
	);

	const form = useForm({
		defaultValues: {
			nameFr: "",
			nameEn: "",
			descriptionFr: "",
			descriptionEn: "",
			category: ServiceCategory.Other as string,
			icon: "",
			estimatedDays: "7",
		},
		onSubmit: async ({ value }) => {
			if (!value.nameFr || value.nameFr.length < 3) {
				toast.error(t("superadmin.organizations.form.error.nameLength"));
				return;
			}
			if (!value.descriptionFr) {
				toast.error(
					t("superadmin.services.form.description") +
						" (FR) " +
						t("superadmin.organizations.form.error.required"),
				);
				return;
			}

			try {
				await updateService({
					serviceId,
					name: { fr: value.nameFr, en: value.nameEn || undefined },
					description: {
						fr: value.descriptionFr,
						en: value.descriptionEn || undefined,
					},
					content: contentFr
						? { fr: contentFr, en: contentEn || undefined }
						: undefined,
					category: value.category as any,
					icon: value.icon || undefined,
					estimatedDays: parseInt(value.estimatedDays) || 7,
					requiresAppointment,
					formSchema,
					formFiles: formFiles.length > 0 ? formFiles : undefined,
				});
				toast.success(t("superadmin.services.form.updated"));
				navigate({ to: "/services" });
			} catch (error: any) {
				const errorKey = error.message || null;
				toast.error(
					errorKey ? t(errorKey, errorKey) : t("superadmin.common.error"),
				);
			}
		},
	});

	// Initialize form when service loads
	useEffect(() => {
		if (service && !isInitialized) {
			form.setFieldValue("nameFr", service.name?.fr || "");
			form.setFieldValue("nameEn", service.name?.en || "");
			form.setFieldValue("descriptionFr", service.description?.fr || "");
			form.setFieldValue("descriptionEn", service.description?.en || "");
			form.setFieldValue("category", service.category || ServiceCategory.Other);
			form.setFieldValue("icon", service.icon || "");
			form.setFieldValue("estimatedDays", String(service.estimatedDays || 7));

			setContentFr(service.content?.fr || "");
			setContentEn(service.content?.en || "");
			setRequiresAppointment(service.requiresAppointment ?? true);
			setRequiresPickupAppointment(service.requiresPickupAppointment ?? false);
			setFormSchema(service.formSchema as FormSchema | undefined);
			setFormFiles((service.formFiles as FormFile[]) ?? []);

			setIsInitialized(true);
		}
	}, [service, isInitialized, form]);

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col gap-6 p-4 pt-6">
				<Skeleton className="h-8 w-64" />
				<Card className="flex-1">
					<CardContent className="pt-6 space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-40 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!service) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/services" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
				<div className="text-destructive">{t("superadmin.common.noData")}</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/services" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
			</div>

			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					{t("superadmin.common.edit")}
				</h1>
				<p className="text-muted-foreground">{service.name.fr}</p>
			</div>

			<Tabs defaultValue="general" className="flex-1">
				<TabsList className="mb-4">
					<TabsTrigger value="general">Général</TabsTrigger>
					<TabsTrigger value="form">Formulaire</TabsTrigger>
				</TabsList>

				<TabsContent value="general">
					<Card>
						<CardContent className="pt-6">
							<form
								id="service-form"
								onSubmit={(e) => {
									e.preventDefault();
									form.handleSubmit();
								}}
								className="space-y-8"
							>
								{/* Name & Description with Tabs */}
								<FieldGroup>
									<div className="space-y-2">
										<Label className="text-base font-semibold">
											{t("superadmin.services.form.name")} &{" "}
											{t("superadmin.services.form.description")}
										</Label>
										<Tabs defaultValue="fr" className="w-full">
											<TabsList>
												<TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
												<TabsTrigger value="en">🇬🇧 English</TabsTrigger>
											</TabsList>
											<TabsContent value="fr" className="space-y-4 mt-4">
												<form.Field
													name="nameFr"
													children={(field) => {
														const isInvalid =
															field.state.meta.isTouched &&
															!field.state.meta.isValid;
														return (
															<Field data-invalid={isInvalid}>
																<FieldLabel htmlFor={field.name}>
																	{t("superadmin.services.form.name")} *
																</FieldLabel>
																<Input
																	id={field.name}
																	name={field.name}
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																	autoComplete="off"
																/>
																{isInvalid && (
																	<FieldError
																		errors={field.state.meta.errors}
																	/>
																)}
															</Field>
														);
													}}
												/>
												<form.Field
													name="descriptionFr"
													children={(field) => {
														const isInvalid =
															field.state.meta.isTouched &&
															!field.state.meta.isValid;
														return (
															<Field data-invalid={isInvalid}>
																<FieldLabel htmlFor={field.name}>
																	{t("superadmin.services.form.description")} *
																</FieldLabel>
																<Textarea
																	id={field.name}
																	name={field.name}
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																	rows={3}
																/>
																{isInvalid && (
																	<FieldError
																		errors={field.state.meta.errors}
																	/>
																)}
															</Field>
														);
													}}
												/>
											</TabsContent>
											<TabsContent value="en" className="space-y-4 mt-4">
												<form.Field
													name="nameEn"
													children={(field) => (
														<Field>
															<FieldLabel htmlFor={field.name}>
																{t("superadmin.services.form.name")}
															</FieldLabel>
															<Input
																id={field.name}
																name={field.name}
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
																autoComplete="off"
															/>
														</Field>
													)}
												/>
												<form.Field
													name="descriptionEn"
													children={(field) => (
														<Field>
															<FieldLabel htmlFor={field.name}>
																{t("superadmin.services.form.description")}
															</FieldLabel>
															<Textarea
																id={field.name}
																name={field.name}
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
																rows={3}
															/>
														</Field>
													)}
												/>
											</TabsContent>
										</Tabs>
									</div>
								</FieldGroup>

								<Separator />

								{/* Slug (read-only), Category & Icon */}
								<FieldGroup>
									<Field>
										<FieldLabel>
											{t("superadmin.services.form.slug")}
										</FieldLabel>
										<div className="flex items-center h-10 px-3 bg-muted rounded-md">
											<code className="text-sm">{service.slug}</code>
										</div>
										<p className="text-xs text-muted-foreground">
											{t("superadmin.organizations.form.slugHelp")}
										</p>
									</Field>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<form.Field
											name="category"
											children={(field) => (
												<Field>
													<FieldLabel>
														{t("superadmin.services.form.category")}
													</FieldLabel>
													<Select
														value={field.state.value}
														onValueChange={(value) => field.handleChange(value)}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="passport">
																{t("superadmin.services.categories.passport")}
															</SelectItem>
															<SelectItem value="identity">
																{t("superadmin.services.categories.identity")}
															</SelectItem>
															<SelectItem value="visa">
																{t("superadmin.services.categories.visa")}
															</SelectItem>
															<SelectItem value="civil_status">
																{t(
																	"superadmin.services.categories.civil_status",
																)}
															</SelectItem>
															<SelectItem value="registration">
																{t(
																	"superadmin.services.categories.registration",
																)}
															</SelectItem>
															<SelectItem value="certification">
																{t(
																	"superadmin.services.categories.legalization",
																)}
															</SelectItem>
															<SelectItem value="transcript">
																Transcription
															</SelectItem>
															<SelectItem value="travel_document">
																Document de voyage
															</SelectItem>
															<SelectItem value="assistance">
																{t("superadmin.services.categories.emergency")}
															</SelectItem>
															<SelectItem value="other">
																{t("superadmin.services.categories.other")}
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
											)}
										/>
										<form.Field
											name="icon"
											children={(field) => (
												<Field>
													<FieldLabel>
														{t("superadmin.services.form.icon")}
													</FieldLabel>
													<Input
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="passport, file-text, etc."
													/>
												</Field>
											)}
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<form.Field
											name="estimatedDays"
											children={(field) => (
												<Field>
													<FieldLabel>
														{t("superadmin.services.form.estimatedDays") ||
															"Délai estimé (jours)"}
													</FieldLabel>
													<Input
														type="number"
														min="0"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
												</Field>
											)}
										/>
										<Field>
											<FieldLabel>
												{t("superadmin.services.form.requiresAppointment") ||
													"Rendez-vous requis (dépôt)"}
											</FieldLabel>
											<div className="flex items-center gap-2 h-10">
												<Switch
													checked={requiresAppointment}
													onCheckedChange={setRequiresAppointment}
												/>
												<span className="text-sm text-muted-foreground">
													{requiresAppointment ? "Oui" : "Non"}
												</span>
											</div>
										</Field>
										<Field>
											<FieldLabel>Rendez-vous requis (retrait)</FieldLabel>
											<div className="flex items-center gap-2 h-10">
												<Switch
													checked={requiresPickupAppointment}
													onCheckedChange={setRequiresPickupAppointment}
												/>
												<span className="text-sm text-muted-foreground">
													{requiresPickupAppointment ? "Oui" : "Non"}
												</span>
											</div>
										</Field>
									</div>
								</FieldGroup>

								<Separator />

								{/* Content (Rich Text) with Tabs */}
								<div className="space-y-2">
									<Label className="text-base font-semibold">
										{t("superadmin.services.form.content") ||
											"Contenu détaillé"}
									</Label>
									<p className="text-sm text-muted-foreground">
										Informations détaillées, procédures, documents nécessaires,
										etc.
									</p>
									<Tabs defaultValue="fr" className="w-full">
										<TabsList>
											<TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
											<TabsTrigger value="en">🇬🇧 English</TabsTrigger>
										</TabsList>
										<TabsContent value="fr" className="mt-2">
											<RichTextEditor
												content={contentFr}
												onChange={setContentFr}
												placeholder="Contenu détaillé du service..."
											/>
										</TabsContent>
										<TabsContent value="en" className="mt-2">
											<RichTextEditor
												content={contentEn}
												onChange={setContentEn}
												placeholder="Detailed service content..."
											/>
										</TabsContent>
									</Tabs>
								</div>

								<Separator />

								{/* Downloadable form files */}
								<div className="space-y-2">
									<Label className="text-base font-semibold">
										Formulaire téléchargeable
									</Label>
									<p className="text-sm text-muted-foreground">
										Fichiers de formulaire que les usagers pourront télécharger
										depuis la page publique du service (PDF, Word, etc.).
									</p>

									{/* File list */}
									{formFiles.length > 0 && (
										<div className="space-y-2 mt-3">
											{formFiles.map((file) => (
												<div
													key={file.storageId}
													className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
												>
													<FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium truncate">
															{file.filename}
														</p>
														<p className="text-xs text-muted-foreground">
															{file.mimeType} •{" "}
															{(file.sizeBytes / 1024).toFixed(0)} Ko
														</p>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
														onClick={() =>
															setFormFiles((prev) =>
																prev.filter(
																	(f) => f.storageId !== file.storageId,
																),
															)
														}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}

									{/* Upload button */}
									<input
										ref={formFileInputRef}
										type="file"
										multiple
										className="hidden"
										accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
										onChange={async (e) => {
											const files = e.target.files;
											if (!files || files.length === 0) return;

											setIsUploading(true);
											try {
												const newFiles: FormFile[] = [];
												for (const file of Array.from(files)) {
													const uploadUrl = await generateUploadUrl();
													const result = await fetch(uploadUrl, {
														method: "POST",
														headers: {
															"Content-Type": file.type,
														},
														body: file,
													});
													const { storageId } = await result.json();
													newFiles.push({
														storageId,
														filename: file.name,
														mimeType: file.type,
														sizeBytes: file.size,
														uploadedAt: Date.now(),
													});
												}
												setFormFiles((prev) => [...prev, ...newFiles]);
												toast.success(
													`${newFiles.length} fichier(s) ajouté(s)`,
												);
											} catch {
												toast.error("Erreur lors de l'upload du fichier");
											} finally {
												setIsUploading(false);
												// Reset input
												if (formFileInputRef.current) {
													formFileInputRef.current.value = "";
												}
											}
										}}
									/>
									<Button
										type="button"
										variant="outline"
										disabled={isUploading}
										onClick={() => formFileInputRef.current?.click()}
										className="gap-2"
									>
										<Upload className="h-4 w-4" />
										{isUploading
											? "Upload en cours..."
											: "Ajouter des fichiers"}
									</Button>
								</div>
							</form>
						</CardContent>
						<CardFooter className="flex justify-between border-t pt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/services" })}
							>
								{t("superadmin.services.form.cancel")}
							</Button>
							<Button type="submit" form="service-form" disabled={isPending}>
								{isPending
									? t("superadmin.organizations.form.saving")
									: t("superadmin.services.form.save")}
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>

				<TabsContent value="form">
					<Card>
						<CardContent className="pt-6">
							<FormBuilder
								initialSchema={service.formSchema as FormSchema | undefined}
								onSchemaChange={setFormSchema}
							/>
						</CardContent>
						<CardFooter className="flex justify-between border-t pt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/services" })}
							>
								{t("superadmin.services.form.cancel")}
							</Button>
							<Button
								disabled={isPending}
								onClick={async () => {
									if (!formSchema) {
										toast.error(
											"Veuillez configurer le formulaire avant de sauvegarder.",
										);
										return;
									}
									try {
										await updateService({ serviceId, formSchema });
										toast.success("Formulaire sauvegardé avec succès.");
									} catch (error: any) {
										toast.error(
											error.message || "Erreur lors de la sauvegarde.",
										);
									}
								}}
							>
								{isPending
									? t("superadmin.organizations.form.saving")
									: t("superadmin.services.form.save")}
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
