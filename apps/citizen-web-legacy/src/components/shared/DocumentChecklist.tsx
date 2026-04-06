import type { Id } from "@convex/_generated/dataModel";
import type { DocumentStatus } from "@convex/lib/constants";
import { getLocalized } from "@convex/lib/utils";
import type { FormDocument } from "@convex/lib/validators";
import { Check, Circle, Clock, Eye, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SubmittedDocument {
	_id: Id<"documents">;
	documentType: string;
	filename: string;
	status: DocumentStatus;
	mimeType: string;
	sizeBytes: number;
	url?: string;
	storageId?: string;
	rejectionReason?: string;
}

interface DocumentChecklistProps {
	requiredDocuments: FormDocument[];
	submittedDocuments: SubmittedDocument[];
	onValidate?: (docId: Id<"documents">) => void;
	onReject?: (docId: Id<"documents">, reason: string) => void;
	isAgent?: boolean;
	className?: string;
}

export function DocumentChecklist({
	requiredDocuments,
	submittedDocuments,
	onValidate,
	onReject,
	isAgent = false,
	className,
}: DocumentChecklistProps) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language as "fr" | "en";

	// State for document preview modal
	const [previewDoc, setPreviewDoc] = useState<SubmittedDocument | null>(null);

	// Helper to get localized label
	const getLabel = (label: { fr: string; en?: string }) => {
		return label[lang] || label.fr;
	};

	// Map submitted documents by type
	const docsByType = submittedDocuments.reduce(
		(acc, doc) => {
			if (!acc[doc.documentType]) {
				acc[doc.documentType] = [];
			}
			acc[doc.documentType].push(doc);
			return acc;
		},
		{} as Record<string, SubmittedDocument[]>,
	);

	// Calculate completion stats
	const totalRequired = requiredDocuments.filter((d) => d.required).length;
	const completedRequired = requiredDocuments.filter(
		(d) =>
			d.required &&
			docsByType[d.type]?.some((doc) => doc.status === "validated"),
	).length;
	const pendingDocs = submittedDocuments.filter(
		(d) => d.status === "pending",
	).length;
	const progress =
		totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0;

	const getStatusIcon = (status: DocumentStatus | "missing") => {
		switch (status) {
			case "validated":
				return <Check className="h-4 w-4 text-green-600" />;
			case "rejected":
				return <XCircle className="h-4 w-4 text-red-600" />;
			case "pending":
				return <Clock className="h-4 w-4 text-amber-600" />;
			default:
				return <Circle className="h-4 w-4 text-muted-foreground" />;
		}
	};

	const getStatusBadge = (status: DocumentStatus | "missing") => {
		switch (status) {
			case "validated":
				return (
					<Badge
						variant="outline"
						className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
					>
						{t("documents.status.validated")}
					</Badge>
				);
			case "rejected":
				return (
					<Badge
						variant="outline"
						className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
					>
						{t("documents.status.rejected")}
					</Badge>
				);
			case "pending":
				return (
					<Badge
						variant="outline"
						className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
					>
						{t("documents.status.pending")}
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="bg-muted text-muted-foreground">
						{t("documents.status.missing")}
					</Badge>
				);
		}
	};

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							{t("documents.checklist.title")}
						</CardTitle>
						<CardDescription>
							{completedRequired}/{totalRequired}{" "}
							{t("documents.checklist.required")}
							{pendingDocs > 0 && (
								<span className="ml-1 text-amber-600">
									• {pendingDocs} {t("documents.checklist.pending")}
								</span>
							)}
						</CardDescription>
					</div>
				</div>
				<Progress value={progress} className="h-2 mt-2" />
			</CardHeader>

			<CardContent className="space-y-3">
				{requiredDocuments.map((reqDoc) => {
					const submitted = docsByType[reqDoc.type] || [];
					const hasSubmitted = submitted.length > 0;
					const latestDoc = submitted[submitted.length - 1];
					const status: DocumentStatus | "missing" = hasSubmitted
						? latestDoc.status
						: "missing";

					return (
						<div
							key={reqDoc.type}
							className={cn(
								"flex items-start gap-3 p-3 rounded-lg border border-border transition-colors",
							)}
						>
							<div className="shrink-0 mt-0.5">{getStatusIcon(status)}</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="font-medium text-sm">
										{getLocalized(reqDoc.label, i18n.language)}
									</span>
									{reqDoc.required && (
										<Badge variant="secondary" className="text-xs">
											{t("common.required")}
										</Badge>
									)}
								</div>

								{hasSubmitted && latestDoc && (
									<div className="mt-2 space-y-1">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<span className="truncate">{latestDoc.filename}</span>
											<span className="text-xs">
												({(latestDoc.sizeBytes / 1024).toFixed(0)} KB)
											</span>
										</div>

										{latestDoc.status === "rejected" &&
											latestDoc.rejectionReason && (
												<p className="text-sm text-red-600 mt-1">
													{t("documents.rejectionReason")}{" "}
													{latestDoc.rejectionReason}
												</p>
											)}

										{/* View button - ALWAYS visible for agents when document is submitted */}
										{isAgent && (latestDoc.url || latestDoc.storageId) && (
											<div className="flex flex-wrap gap-2 mt-2">
												<Button
													size="sm"
													variant="outline"
													className="h-7"
													onClick={() => setPreviewDoc(latestDoc)}
												>
													<Eye className="h-3 w-3 mr-1" />
													{t("documents.view")}
												</Button>
												{/* Validate/Reject buttons - only for pending documents */}
												{latestDoc.status === "pending" && (
													<>
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-green-600 dark:text-green-400 hover:bg-green-500/10"
															onClick={() => onValidate?.(latestDoc._id)}
														>
															<Check className="h-3 w-3 mr-1" />
															{t("documents.validate")}
														</Button>
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-red-600 dark:text-red-400 hover:bg-red-500/10"
															onClick={() => {
																const reason = prompt(
																	t(
																		"documents.rejectPrompt",
																		"Motif du rejet :",
																	),
																);
																if (reason) {
																	onReject?.(latestDoc._id, reason);
																}
															}}
														>
															<XCircle className="h-3 w-3 mr-1" />
															{t("documents.reject")}
														</Button>
													</>
												)}
											</div>
										)}
									</div>
								)}
							</div>

							<div className="shrink-0">{getStatusBadge(status)}</div>
						</div>
					);
				})}

				{requiredDocuments.length === 0 && (
					<p className="text-center text-muted-foreground py-4">
						{t(
							"documents.checklist.noRequirements",
							"Aucun document requis pour ce service",
						)}
					</p>
				)}
			</CardContent>

			{/* Document Preview Modal */}
			{previewDoc?.storageId && (
				<DocumentPreviewModal
					open={!!previewDoc}
					onOpenChange={(open) => !open && setPreviewDoc(null)}
					storageId={previewDoc.storageId}
					filename={previewDoc.filename}
					mimeType={previewDoc.mimeType}
				/>
			)}
		</Card>
	);
}
