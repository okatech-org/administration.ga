"use client";

import { api } from "@convex/_generated/api";
import { getLocalized } from "@convex/lib/utils";
import type { LocalizedString } from "@convex/lib/validators";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	ArrowLeft,
	Bot,
	CheckCircle,
	Loader2,
	Send,
} from "lucide-react";
import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RequestActionModal } from "@/components/admin/RequestActionModal";
import { GenerateDocumentDialog } from "@/components/dashboard/GenerateDocumentDialog";
import { UserProfilePreviewCard } from "@/components/dashboard/UserProfilePreviewCard";
import { DocumentChecklist } from "@/components/shared/DocumentChecklist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

// Error boundary to prevent full page crash
class RequestErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}
	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[RequestDetail] Render error:", error, info);
	}
	render() {
		if (this.state.hasError) {
			return (
				<div className="p-8 space-y-4">
					<h2 className="text-lg font-semibold text-destructive">
						Erreur d'affichage
					</h2>
					<p className="text-muted-foreground text-sm">
						Impossible d'afficher les détails de cette demande. L'erreur a été
						enregistrée.
					</p>
					<pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-40">
						{this.state.error?.message}
					</pre>
					<Button
						variant="outline"
						onClick={() => this.setState({ hasError: false, error: null })}
					>
						Réessayer
					</Button>
				</div>
			);
		}
		return this.props.children;
	}
}

export const Route = createFileRoute("/_app/requests/$requestId")({
	component: () => (
		<RequestErrorBoundary>
			<RequestDetailPage />
		</RequestErrorBoundary>
	),
});

// Helper to render form data values properly
function renderValue(value: unknown): string | null {
	if (value === null || value === undefined) return "-";
	if (typeof value === "boolean") return value ? "Oui" : "Non";

	// Skip document ID arrays (they're displayed in Pièces jointes section)
	if (Array.isArray(value)) {
		// Check if it looks like an array of document IDs (long alphanumeric strings)
		if (
			value.every((v) => typeof v === "string" && /^[a-z0-9]{20,}$/i.test(v))
		) {
			return null; // Signal to skip rendering this field
		}
		return value.join(", ");
	}

	if (typeof value === "object") {
		// Handle localized objects like { fr: "...", en: "..." }
		if ("fr" in (value as object)) {
			return String((value as { fr: string }).fr);
		}
		return JSON.stringify(value);
	}
	return String(value);
}

// Types for new FormSchema structure (sections-based)
interface FormSchemaField {
	id: string;
	type?: string;
	label?: LocalizedString;
	description?: LocalizedString;
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

function RequestDetailPage() {
	const { i18n } = useTranslation();
	const { requestId } = Route.useParams();
	const navigate = useNavigate();

	const { data: request, isError } = useAuthenticatedConvexQuery(
		api.functions.requests.getById,
		{
			requestId: requestId as any,
		},
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

	const [noteContent, setNoteContent] = useState("");

	// Build lookup maps from new sections-based schema
	function buildSchemaLookups(schema: FormSchema | undefined) {
		const sectionLabels: Record<string, string> = {};
		const fieldLabels: Record<string, string> = {};

		if (!schema?.sections) return { sectionLabels, fieldLabels };

		for (const section of schema.sections) {
			// Get section title
			sectionLabels[section.id] =
				getLocalized(section.title, i18n.language) || section.id;

			// Get field labels within section
			if (section.fields) {
				for (const field of section.fields) {
					fieldLabels[`${section.id}.${field.id}`] =
						getLocalized(field.label, i18n.language) || field.id;
					// Also store just the field ID for simpler lookup
					fieldLabels[field.id] =
						getLocalized(field.label, i18n.language) || field.id;
				}
			}
		}

		return { sectionLabels, fieldLabels };
	}

	// Build label lookups from formSchema
	const { sectionLabels, fieldLabels } = useMemo(() => {
		const schema = request?.orgService?.formSchema as FormSchema | undefined;
		return buildSchemaLookups(schema);
	}, [request?.orgService?.formSchema]);

	if (request === undefined) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (request === null || isError) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				Demande introuvable
			</div>
		);
	}

	const handleStatusChange = async (newStatus: string) => {
		try {
			await updateStatus({ requestId: request._id, status: newStatus as any });
			toast.success("Statut mis à jour");
		} catch (e) {
			toast.error("Erreur");
		}
	};

	// Get service name from the catalog service (not orgService)
	const serviceName =
		getLocalized(request.service?.name, i18n.language) ||
		getLocalized(request.orgService?.name, i18n.language) ||
		"Service inconnu";

	// Parse formData
	let formDataObj: Record<string, unknown> = {};
	if (request.formData) {
		if (typeof request.formData === "string") {
			try {
				formDataObj = JSON.parse(request.formData);
			} catch {
				formDataObj = { données: request.formData };
			}
		} else if (typeof request.formData === "object") {
			formDataObj = request.formData as Record<string, unknown>;
		}
	}

	// Helper to get display label for section
	const getSectionLabel = (sectionId: string): string => {
		return sectionLabels[sectionId] || sectionId.replace(/^section_\d+_/i, "");
	};

	// Helper to get display label for field
	const getFieldLabel = (sectionId: string, fieldId: string): string => {
		return (
			fieldLabels[`${sectionId}.${fieldId}`] ||
			fieldLabels[fieldId] ||
			fieldId.replace(/^field_\d+_/i, "")
		);
	};

	return (
		<div className="flex flex-col min-h-0 h-full">
			{/* Header */}
			<header className="shrink-0 flex h-14 items-center gap-4 border-b bg-background px-6">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => navigate({ to: "/requests" })}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h1 className="text-lg font-semibold flex items-center gap-2">
						{serviceName}
						<Badge variant="outline" className="ml-1 font-mono text-xs">
							{request.reference}
						</Badge>
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<GenerateDocumentDialog request={request as any} />
					<RequestActionModal
						requestId={request._id}
						formSchema={request.service?.formSchema as any}
						formData={formDataObj}
					/>
					<Select value={request.status} onValueChange={handleStatusChange}>
						<SelectTrigger className="w-[180px]">
							<SelectValue>{request.status}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="draft">Brouillon</SelectItem>
							<SelectItem value="pending">En attente</SelectItem>
							<SelectItem value="processing">En traitement</SelectItem>
							<SelectItem value="completed">Terminé</SelectItem>
							<SelectItem value="cancelled">Annulé</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</header>

			{/* Action Required Banners */}
			{request.actionsRequired
				?.filter((a: any) => !a.completedAt)
				.map((action: any) => {
					const typeLabels: Record<string, string> = {
						upload_document: "Documents",
						complete_info: "Informations",
						schedule_appointment: "Rendez-vous",
						make_payment: "Paiement",
						confirm_info: "Confirmation",
					};
					return (
						<div key={action.id} className="px-6 pt-4">
							<Alert
								variant="destructive"
								className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
							>
								<AlertTriangle className="h-4 w-4 text-amber-600" />
								<AlertTitle className="text-amber-800 dark:text-amber-400">
									Action requise du citoyen
									<Badge variant="outline" className="ml-1 text-xs">
										{typeLabels[action.type] || action.type}
									</Badge>
								</AlertTitle>
								<AlertDescription className="text-amber-700 dark:text-amber-300">
									{action.message}
								</AlertDescription>
							</Alert>
						</div>
					);
				})}

			{/* Action Completed Banners - Citizen has responded */}
			{request.actionsRequired
				?.filter((a: any) => a.completedAt)
				.map((action: any) => (
					<div key={action.id} className="px-6 pt-4">
						<Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<AlertTitle className="text-green-800 dark:text-green-400">
								Réponse reçue du citoyen
								<Badge
									variant="outline"
									className="ml-1 text-xs text-green-600"
								>
									À traiter
								</Badge>
							</AlertTitle>
							<AlertDescription className="text-green-700 dark:text-green-300">
								Le citoyen a fourni les éléments demandés. Vérifiez et validez
								sa réponse.
							</AlertDescription>
						</Alert>
					</div>
				))}

			{/* Main Content - Scrollable */}
			<div className="flex-1 overflow-y-auto p-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
					{/* LEFT: Form Data */}
					<div className="lg:col-span-2 space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Données du formulaire</CardTitle>
								<CardDescription>
									Soumis le{" "}
									{format(
										request.submittedAt || request._creationTime || Date.now(),
										"dd MMMM yyyy 'à' HH:mm",
										{ locale: fr },
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{Object.keys(formDataObj).length > 0 ? (
									<div className="space-y-6">
										{Object.entries(formDataObj).map(
											([sectionId, sectionData]) => {
												// Handle nested section (object with fields)
												if (
													typeof sectionData === "object" &&
													sectionData !== null &&
													!Array.isArray(sectionData) &&
													!("fr" in sectionData)
												) {
													return (
														<div
															key={sectionId}
															className="border rounded-lg overflow-hidden"
														>
															<div className="bg-muted/50 px-4 py-2.5 border-b">
																<h3 className="font-medium text-sm">
																	{getSectionLabel(sectionId)}
																</h3>
															</div>
															<div className="p-4">
																<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
																	{Object.entries(
																		sectionData as Record<string, unknown>,
																	)
																		.filter(
																			([, value]) =>
																				renderValue(value) !== null,
																		)
																		.map(([fieldId, value]) => (
																			<div key={fieldId}>
																				<dt className="text-xs font-medium text-muted-foreground mb-1">
																					{getFieldLabel(sectionId, fieldId)}
																				</dt>
																				<dd className="text-sm">
																					{renderValue(value)}
																				</dd>
																			</div>
																		))}
																</dl>
															</div>
														</div>
													);
												}

												// Handle flat field (no nesting)
												return (
													<div
														key={sectionId}
														className="flex justify-between py-2 border-b last:border-0"
													>
														<span className="text-sm text-muted-foreground">
															{getSectionLabel(sectionId)}
														</span>
														<span className="text-sm font-medium">
															{renderValue(sectionData)}
														</span>
													</div>
												);
											},
										)}
									</div>
								) : (
									<div className="text-muted-foreground italic text-center py-8">
										Aucune donnée de formulaire
									</div>
								)}
							</CardContent>
						</Card>

						{/* Documents Checklist */}
						<DocumentChecklist
							requiredDocuments={(request.joinedDocuments || []) as any}
							submittedDocuments={(request.documents || []).map((doc: any) => ({
								...doc,
								url: doc.url || undefined,
							}))}
							isAgent={true}
							onValidate={async (docId) => {
								try {
									await validateDocument({
										documentId: docId,
										status: "validated" as any,
									});
									toast.success("Document validé");
								} catch (err) {
									toast.error("Erreur lors de la validation");
								}
							}}
							onReject={async (docId, reason) => {
								try {
									await validateDocument({
										documentId: docId,
										status: "rejected" as any,
										rejectionReason: reason,
									});
									toast.success("Document rejeté");
								} catch (err) {
									toast.error("Erreur lors du rejet");
								}
							}}
						/>
					</div>

					{/* RIGHT: Context & Notes */}
					<div className="space-y-6">
						{/* User Profile Card */}
						{request.userId && (
							<UserProfilePreviewCard userId={request.userId} />
						)}

						{/* Notes */}
						<Card className="flex flex-col max-h-[400px]">
							<CardHeader className="shrink-0 pb-3">
								<CardTitle className="text-base flex items-center gap-2">
									Notes internes
									<Badge variant="secondary" className="text-xs font-normal">
										{agentNotes?.length || 0}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 overflow-y-auto space-y-3">
								{!agentNotes || agentNotes.length === 0 ? (
									<p className="text-sm text-muted-foreground text-center py-4">
										Aucune note
									</p>
								) : (
									agentNotes.map((note) => (
										<div
											key={note._id}
											className={`p-3 rounded-md text-sm ${
												note.source === "ai"
													? "bg-primary/10 border border-primary/20"
													: "bg-muted/50"
											}`}
										>
											{note.source === "ai" && (
												<div className="flex items-center gap-1.5 mb-2">
													<Bot className="h-3.5 w-3.5 text-primary" />
													<span className="text-xs font-medium text-primary">
														Analyse IA
													</span>
													{note.aiConfidence && (
														<Badge
															variant="outline"
															className="text-xs ml-auto"
														>
															{note.aiConfidence}% confiance
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
														locale: fr,
													})}
												</span>
											</div>
										</div>
									))
								)}
							</CardContent>
							<CardFooter className="shrink-0 pt-3">
								<div className="flex w-full gap-2">
									<Textarea
										placeholder="Ajouter une note..."
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
												setNoteContent("");
												toast.success("Note ajoutée");
											} catch {
												toast.error("Erreur lors de l'ajout");
											}
										}}
									>
										<Send className="h-4 w-4" />
									</Button>
								</div>
							</CardFooter>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
