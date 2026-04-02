"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DetailedDocumentType } from "@convex/lib/constants";
import { Check, Eye, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

// Document type mapping for profile documents
type ProfileDocumentKey =
	| "passport"
	| "identityPhoto"
	| "proofOfAddress"
	| "birthCertificate"
	| "proofOfResidency";

// Map document key to documentType for upload
const DOC_KEY_TO_TYPE: Record<ProfileDocumentKey, DetailedDocumentType> = {
	passport: DetailedDocumentType.Passport,
	identityPhoto: DetailedDocumentType.IdentityPhoto,
	proofOfAddress: DetailedDocumentType.ProofOfAddress,
	birthCertificate: DetailedDocumentType.BirthCertificate,
	proofOfResidency: DetailedDocumentType.ResidencePermit,
};

interface DocumentFieldProps {
	/** The key in profile.documents object */
	documentKey: ProfileDocumentKey;
	/** Current document ID (if any) */
	documentId?: Id<"documents">;
	/** Label to display */
	label: string;
	/** Optional description */
	description?: string;
	/** Callback when document changes */
	onChange?: (documentId: Id<"documents"> | undefined) => void;
	/** Whether the field is disabled */
	disabled?: boolean;
	/** Analytics request type (if uploaded as part of a request) */
	requestType?: string;
}

/**
 * DocumentField - Reusable component for managing a single document
 *
 * Features:
 * - Shows upload zone when no document
 * - Shows document preview with actions when document exists
 * - Handles upload, preview, delete, and replace
 * - Documents are owned by the current user automatically
 */
export function DocumentField({
	documentKey,
	documentId,
	label,
	description,
	onChange,
	disabled = false,
	requestType,
}: DocumentFieldProps) {
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);

	// Fetch document data if ID provided
	const { data: document } = useAuthenticatedConvexQuery(
		api.functions.documents.getById,
		documentId ? { documentId } : "skip",
	);

	// Mutations
	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
		api.functions.documents.generateUploadUrl,
	);
	const { mutateAsync: createDocument } = useConvexMutationQuery(
		api.functions.documents.create,
	);
	const { mutateAsync: deleteDocument } = useConvexMutationQuery(
		api.functions.documents.remove,
	);

	// Get first file from document (for display)
	const firstFile = document?.files?.[0];

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			setUploading(true);

			// Generate upload URL
			const uploadUrl = await generateUploadUrl({});

			// Upload file
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});

			if (!result.ok) {
				throw new Error("Upload failed");
			}

			const { storageId } = await result.json();

			// Le backend renomme automatiquement le fichier avec le matricule consulaire
			const newDocId = await createDocument({
				storageId,
				filename: file.name,
				mimeType: file.type,
				sizeBytes: file.size,
				documentType: DOC_KEY_TO_TYPE[documentKey] as any,
			});

			if (requestType) {
				captureEvent("myspace_request_document_uploaded", {
					request_type: requestType,
					document_type: DOC_KEY_TO_TYPE[documentKey],
				});
			}

			onChange?.(newDocId);
			toast.success(t("documents.uploadSuccess"));
		} catch (error) {
			console.error("Upload error:", error);
			toast.error(t("documents.uploadError"));
		} finally {
			setUploading(false);
			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleDelete = async () => {
		if (!documentId) return;

		try {
			setDeleting(true);
			await deleteDocument({ documentId });
			onChange?.(undefined);
			toast.success(t("documents.deleteSuccess"));
		} catch (error) {
			console.error("Delete error:", error);
			toast.error(t("documents.deleteError"));
		} finally {
			setDeleting(false);
		}
	};

	const handleReplace = () => {
		fileInputRef.current?.click();
	};

	const triggerUpload = () => {
		fileInputRef.current?.click();
	};

	// Hidden file input
	const fileInput = (
		<input
			ref={fileInputRef}
			type="file"
			accept="image/*,application/pdf"
			onChange={handleFileSelect}
			className="hidden"
			disabled={disabled || uploading}
		/>
	);

	// No document - show upload zone
	if (!documentId) {
		return (
			<Card
				className={cn(
					"border-2 border-dashed transition-colors",
					disabled
						? "opacity-50 cursor-not-allowed"
						: "hover:border-primary/50 cursor-pointer",
				)}
				onClick={disabled ? undefined : triggerUpload}
			>
				<CardContent className="p-4">
					{fileInput}
					<div className="flex items-center gap-4">
						<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
							{uploading ? (
								<Loader2 className="h-6 w-6 animate-spin text-primary" />
							) : (
								<Upload className="h-6 w-6 text-muted-foreground" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm">{label}</p>
							{description && (
								<p className="text-xs text-muted-foreground mt-0.5">
									{description}
								</p>
							)}
							<p className="text-xs text-muted-foreground mt-1">
								{uploading
									? t("documents.uploading")
									: t("documents.clickToUpload")}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Document exists - show preview with actions
	return (
		<>
			<Card className="border">
				<CardContent className="p-4">
					{fileInput}
					<div className="flex items-center gap-4">
						<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
							<Check className="h-6 w-6 text-green-600 dark:text-green-400" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm flex items-center gap-2">
								{label}
								<span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
									{t("documents.uploaded")}
								</span>
							</p>
							{firstFile && (
								<p className="text-xs text-muted-foreground mt-0.5 truncate">
									{firstFile.filename}
								</p>
							)}
						</div>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setPreviewOpen(true)}
								title={t("documents.preview")}
							>
								<Eye className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleReplace}
								disabled={disabled || uploading}
								title={t("documents.replace")}
							>
								{uploading ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleDelete}
								disabled={disabled || deleting}
								className="text-destructive hover:text-destructive"
								title={t("documents.delete")}
							>
								{deleting ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Trash2 className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Preview Modal */}
			{firstFile && (
				<DocumentPreviewModal
					open={previewOpen}
					onOpenChange={setPreviewOpen}
					storageId={firstFile.storageId}
					filename={firstFile.filename}
					mimeType={firstFile.mimeType}
				/>
			)}
		</>
	);
}
