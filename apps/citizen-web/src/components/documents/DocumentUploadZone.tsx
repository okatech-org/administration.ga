/**
 * DocumentUploadZone Component
 * Reusable drop zone for document uploads with progress indicator
 * Supports multi-file documents with proper deletion
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	DetailedDocumentType,
	DocumentTypeCategory,
} from "@convex/lib/constants";
import { useMutation, useQuery } from "convex/react";
import {
	AlertCircle,
	File as FileIcon,
	Loader2,
	Plus,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./ImageCropDialog";

interface UploadedFile {
	storageId: Id<"_storage">;
	filename: string;
	mimeType: string;
}

interface UploadProgress {
	filename: string;
	progress: number;
	status: "pending" | "uploading" | "success" | "error";
	error?: string;
}

interface DocumentUploadZoneProps {
	/** Document type for classification */
	documentType?: DetailedDocumentType;
	/** Category for organization */
	category?: DocumentTypeCategory;
	/** Label to display */
	label: string;
	/** File format hint */
	formatHint?: string;
	/** Whether multiple files can be uploaded to this document */
	multiple?: boolean;
	/** Called when upload completes */
	onUploadComplete?: (documentId: Id<"documents">) => void;
	/** Called when document is deleted */
	onDelete?: () => void;
	/** Custom class name */
	className?: string;
	/** Whether the field is required */
	required?: boolean;
	/** Disabled state */
	disabled?: boolean;
	/** Current document ID (if already exists) */
	value?: Id<"documents">;
	/** Maximum file size in bytes */
	maxSize?: number;
	/** Accepted MIME types */
	accept?: string;
	/** Maximum number of files per document */
	maxFiles?: number;
	/**
	 * When true, files are stored locally instead of uploaded to Convex.
	 * Used during registration to prevent orphaned documents.
	 */
	localOnly?: boolean;
	/** Callback for local-only mode: returns the File object */
	onLocalFileSelected?: (file: File) => void;
	/** For local-only mode: display existing local file info */
	localFile?: { filename: string; mimeType: string } | null;
	/** External validation error message (set by parent form) */
	externalError?: string | null;
	/** Test identifier for E2E tests */
	"data-testid"?: string;
}

export interface DocumentUploadZoneRef {
	reset: () => void;
	getDocumentId: () => Id<"documents"> | undefined;
}

export const DocumentUploadZone = forwardRef<
	DocumentUploadZoneRef,
	DocumentUploadZoneProps
>(
	(
		{
			documentType,
			category,
			label,
			formatHint = "JPG, PNG, PDF - Max 5MB",
			multiple = true,
			onUploadComplete,
			onDelete,
			className,
			required = false,
			disabled = false,
			value,
			maxSize = 5 * 1024 * 1024, // 5MB default
			accept = "image/*,application/pdf",
			maxFiles = 10,
			localOnly = false,
			onLocalFileSelected,
			localFile,
			externalError,
			"data-testid": dataTestId,
		},
		ref,
	) => {
		const inputRef = useRef<HTMLInputElement>(null);
		const [documentId, setDocumentId] = useState<Id<"documents"> | undefined>(
			value,
		);
		const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
		const [localFiles, setLocalFiles] = useState<
			Array<{ filename: string; mimeType: string; previewUrl?: string }>
		>([]);
		const [uploads, setUploads] = useState<Map<string, UploadProgress>>(
			new Map(),
		);
		const [isDragOver, setIsDragOver] = useState(false);
		const [error, setError] = useState<string | undefined>();
		const [isDeleting, setIsDeleting] = useState(false);

		// Cropping state
		const [cropFile, setCropFile] = useState<File | null>(null);

		// Sync localFile prop to local state
		useEffect(() => {
			if (localOnly && localFile) {
				setLocalFiles([localFile]);
			} else if (localOnly && !localFile) {
				setLocalFiles([]);
			}
		}, [localOnly, localFile]);

		// Convex mutations
		const generateUploadUrl = useMutation(
			api.functions.documents.generateUploadUrl,
		);
		const createDocument = useMutation(api.functions.documents.create);
		const addFileToDocument = useMutation(api.functions.documents.addFile);
		const removeFileFromDocument = useMutation(
			api.functions.documents.removeFile,
		);
		const deleteDocument = useMutation(api.functions.documents.remove);

		// Fetch existing document data if value is provided
		const existingDoc = useQuery(
			api.functions.documents.getById,
			value ? { documentId: value } : "skip",
		);

		// Sync with existing document
		useEffect(() => {
			if (existingDoc) {
				setDocumentId(existingDoc._id);
				setUploadedFiles(
					existingDoc.files.map((f) => ({
						storageId: f.storageId,
						filename: f.filename,
						mimeType: f.mimeType,
					})),
				);
			}
		}, [existingDoc]);

		// Expose methods via ref
		useImperativeHandle(ref, () => ({
			reset: () => {
				setDocumentId(undefined);
				setUploadedFiles([]);
				setUploads(new Map());
				setError(undefined);
			},
			getDocumentId: () => documentId,
		}));

		// Handle a file in local-only mode (no Convex upload)
		const handleLocalFile = useCallback(
			(file: File) => {
				setLocalFiles([{ filename: file.name, mimeType: file.type }]);
				onLocalFileSelected?.(file);
			},
			[onLocalFileSelected],
		);

		// Upload a single file (Convex mode)
		const uploadFile = useCallback(
			async (file: File) => {
				// In local-only mode, skip all Convex logic
				if (localOnly) {
					handleLocalFile(file);
					return null;
				}

				const filename = file.name;

				// Update progress
				setUploads((prev) => {
					const newMap = new Map(prev);
					newMap.set(filename, { filename, progress: 0, status: "pending" });
					return newMap;
				});

				try {
					// Update to uploading
					setUploads((prev) => {
						const newMap = new Map(prev);
						newMap.set(filename, {
							filename,
							progress: 10,
							status: "uploading",
						});
						return newMap;
					});

					// Step 1: Get upload URL
					const uploadUrl = await generateUploadUrl();
					setUploads((prev) => {
						const newMap = new Map(prev);
						newMap.set(filename, {
							filename,
							progress: 30,
							status: "uploading",
						});
						return newMap;
					});

					// Step 2: Upload file to storage
					const response = await fetch(uploadUrl, {
						method: "POST",
						headers: { "Content-Type": file.type },
						body: file,
					});

					if (!response.ok) {
						throw new Error(`Upload failed: ${response.statusText}`);
					}

					const { storageId } = await response.json();
					setUploads((prev) => {
						const newMap = new Map(prev);
						newMap.set(filename, {
							filename,
							progress: 70,
							status: "uploading",
						});
						return newMap;
					});

					// Step 3: Create document or add file to existing document
					let docId = documentId;

					if (!docId) {
						// Create new document with this file
						docId = await createDocument({
							storageId,
							filename: file.name,
							mimeType: file.type,
							sizeBytes: file.size,
							documentType: documentType as DetailedDocumentType | undefined,
							category: category as DocumentTypeCategory | undefined,
						});
						setDocumentId(docId);
						onUploadComplete?.(docId);
					} else {
						// Add file to existing document
						await addFileToDocument({
							documentId: docId,
							storageId,
							filename: file.name,
							mimeType: file.type,
							sizeBytes: file.size,
						});
					}

					// Update local state
					setUploadedFiles((prev) => [
						...prev,
						{ storageId, filename: file.name, mimeType: file.type },
					]);

					// Mark as success
					setUploads((prev) => {
						const newMap = new Map(prev);
						newMap.set(filename, {
							filename,
							progress: 100,
							status: "success",
						});
						return newMap;
					});

					// Clear from uploads after delay
					setTimeout(() => {
						setUploads((prev) => {
							const newMap = new Map(prev);
							newMap.delete(filename);
							return newMap;
						});
					}, 1500);

					return docId;
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : "Upload failed";
					setUploads((prev) => {
						const newMap = new Map(prev);
						newMap.set(filename, {
							filename,
							progress: 0,
							status: "error",
							error: errorMsg,
						});
						return newMap;
					});
					setError(`Erreur: ${errorMsg}`);
					return null;
				}
			},
			[
				localOnly,
				handleLocalFile,
				documentId,
				documentType,
				category,
				generateUploadUrl,
				createDocument,
				addFileToDocument,
				onUploadComplete,
			],
		);

		// Handle file selection
		const handleFiles = useCallback(
			async (files: FileList | File[]) => {
				if (disabled) return;

				const fileArray = Array.from(files);
				setError(undefined);

				// Check max files limit
				const totalFiles = uploadedFiles.length + fileArray.length;
				if (totalFiles > maxFiles) {
					setError(`Maximum ${maxFiles} fichiers par document`);
					return;
				}

				// Validate files
				for (const file of fileArray) {
					if (file.size > maxSize) {
						setError(
							`Fichier trop volumineux. Max: ${Math.round(maxSize / 1024 / 1024)}MB`,
						);
						return;
					}
				}

				// If it's an identity photo and it's a single image, intercept for cropping
				if (
					documentType === DetailedDocumentType.IdentityPhoto &&
					fileArray.length === 1 &&
					fileArray[0].type.startsWith("image/")
				) {
					setCropFile(fileArray[0]);
					return;
				}

				// Upload files normally
				for (const file of fileArray) {
					await uploadFile(file);
				}
			},
			[
				disabled,
				maxSize,
				maxFiles,
				uploadedFiles.length,
				uploadFile,
				documentType,
			],
		);

		// Remove a single file from document
		const handleRemoveFile = useCallback(
			async (storageId: Id<"_storage">) => {
				if (!documentId) return;

				setIsDeleting(true);
				try {
					await removeFileFromDocument({ documentId, storageId });

					// Update local state
					const newFiles = uploadedFiles.filter(
						(f) => f.storageId !== storageId,
					);
					setUploadedFiles(newFiles);

					// If no files left, document was deleted by backend
					if (newFiles.length === 0) {
						setDocumentId(undefined);
						onDelete?.();
					}
				} catch (err) {
					setError("Erreur lors de la suppression");
				} finally {
					setIsDeleting(false);
				}
			},
			[documentId, uploadedFiles, removeFileFromDocument, onDelete],
		);

		// Remove local file (local-only mode)
		const handleRemoveLocalFile = useCallback(() => {
			setLocalFiles([]);
			onDelete?.();
		}, [onDelete]);

		// Delete entire document
		const handleDeleteDocument = useCallback(async () => {
			if (localOnly) {
				handleRemoveLocalFile();
				return;
			}

			if (!documentId) return;

			setIsDeleting(true);
			try {
				await deleteDocument({ documentId });
				setDocumentId(undefined);
				setUploadedFiles([]);
				onDelete?.();
			} catch (err) {
				setError("Erreur lors de la suppression du document");
			} finally {
				setIsDeleting(false);
			}
		}, [
			localOnly,
			handleRemoveLocalFile,
			documentId,
			deleteDocument,
			onDelete,
		]);

		// Drag handlers
		const handleDragOver = useCallback(
			(e: React.DragEvent) => {
				e.preventDefault();
				if (!disabled) {
					setIsDragOver(true);
				}
			},
			[disabled],
		);

		const handleDragLeave = useCallback((e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
		}, []);

		const handleDrop = useCallback(
			(e: React.DragEvent) => {
				e.preventDefault();
				setIsDragOver(false);
				if (!disabled && e.dataTransfer.files.length > 0) {
					handleFiles(e.dataTransfer.files);
				}
			},
			[disabled, handleFiles],
		);

		const handleInputChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				if (e.target.files && e.target.files.length > 0) {
					handleFiles(e.target.files);
				}
				// Reset input so same file can be selected again
				if (inputRef.current) {
					inputRef.current.value = "";
				}
			},
			[handleFiles],
		);

		const openFilePicker = useCallback(() => {
			if (!disabled && !isDeleting) {
				inputRef.current?.click();
			}
		}, [disabled, isDeleting]);

		// States
		const isUploading = Array.from(uploads.values()).some(
			(u) => u.status === "uploading",
		);
		const hasFiles = localOnly
			? localFiles.length > 0
			: uploadedFiles.length > 0;
		const displayFiles = localOnly ? localFiles : uploadedFiles;
		const canAddMore = multiple && displayFiles.length < maxFiles;

		return (
			<div className={cn("relative", className)} data-testid={dataTestId}>
				<input
					ref={inputRef}
					type="file"
					className="hidden"
					accept={accept}
					multiple={multiple}
					onChange={handleInputChange}
					disabled={disabled}
				/>

				<div
					className={cn(
						"relative border-2 border-dashed rounded-lg p-4 transition-all",
						!hasFiles &&
							"cursor-pointer hover:border-primary/50 hover:bg-primary/5",
						isDragOver && "border-primary bg-primary/10",
						hasFiles && !externalError && "border-green-500/50 bg-green-50/50",
						(error || externalError) &&
							"border-destructive/50 bg-destructive/5",
						disabled && "opacity-50 cursor-not-allowed",
					)}
					onClick={!hasFiles ? openFilePicker : undefined}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					{/* Label header - always visible */}
					<div className="flex items-center justify-between mb-3">
						<p className="text-sm font-medium">
							{label}
							{required && <span className="text-destructive ml-1">*</span>}
						</p>
						{hasFiles && (
							<span className="text-xs text-green-600 font-medium">
								{displayFiles.length} fichier
								{displayFiles.length > 1 ? "s" : ""}
							</span>
						)}
					</div>

					{/* Error message */}
					{error && (
						<div className="flex items-center gap-2 text-destructive text-sm mb-3">
							<AlertCircle className="h-4 w-4" />
							{error}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setError(undefined)}
								className="ml-auto h-6 px-2"
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					)}

					{/* Files list */}
					{hasFiles && (
						<div className="space-y-2 mb-3">
							{localOnly
								? // Local-only mode: show local file entries
									localFiles.map((file, idx) => (
										<div
											key={`local-${idx}`}
											className="flex items-center gap-2 bg-white dark:bg-muted/30 rounded-md px-3 py-2 border"
										>
											<FileIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
											<span className="text-sm truncate flex-1">
												{file.filename}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleRemoveLocalFile();
												}}
												className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
											>
												<X className="h-3 w-3" />
											</Button>
										</div>
									))
								: // Normal mode: show uploaded file entries
									uploadedFiles.map((file) => (
										<div
											key={file.storageId}
											className="flex items-center gap-2 bg-white dark:bg-muted/30 rounded-md px-3 py-2 border"
										>
											<File className="h-4 w-4 text-green-600 flex-shrink-0" />
											<span className="text-sm truncate flex-1">
												{file.filename}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleRemoveFile(file.storageId);
												}}
												disabled={isDeleting}
												className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
											>
												{isDeleting ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													<X className="h-3 w-3" />
												)}
											</Button>
										</div>
									))}
						</div>
					)}

					{/* Upload progress */}
					{Array.from(uploads.values()).map((upload) => (
						<div key={upload.filename} className="mb-3">
							<div className="flex items-center gap-2 mb-1">
								<Loader2 className="h-4 w-4 animate-spin text-primary" />
								<span className="text-sm truncate">{upload.filename}</span>
							</div>
							<Progress value={upload.progress} className="h-1" />
						</div>
					))}

					{/* Add more files button (when files exist and can add more) */}
					{hasFiles && canAddMore && !isUploading && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								openFilePicker();
							}}
							disabled={disabled}
							className="w-full"
						>
							<Plus className="h-4 w-4 mr-2" />
							Ajouter un fichier
						</Button>
					)}

					{/* Delete all button (single file mode or to clear all) */}
					{hasFiles && !multiple && !isUploading && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteDocument();
							}}
							disabled={isDeleting}
							className="w-full mt-2 text-muted-foreground hover:text-destructive"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Supprimer
						</Button>
					)}

					{/* Empty state - dropzone */}
					{!hasFiles && !isUploading && (
						<div className="text-center py-4">
							<Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
							<p className="text-xs text-muted-foreground">{formatHint}</p>
							{multiple && (
								<p className="text-xs text-muted-foreground mt-1">
									Max {maxFiles} fichiers
								</p>
							)}
						</div>
					)}
				</div>

				{/* External validation error */}
				{externalError && (
					<p className="mt-1.5 text-sm text-destructive flex items-center gap-1.5">
						<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
						{externalError}
					</p>
				)}

				{/* Cropping Dialog */}
				{cropFile && (
					<ImageCropDialog
						open={!!cropFile}
						imageFile={cropFile}
						onClose={() => setCropFile(null)}
						onCropComplete={async (croppedFile) => {
							await uploadFile(croppedFile);
							setCropFile(null);
						}}
					/>
				)}
			</div>
		);
	},
);

DocumentUploadZone.displayName = "DocumentUploadZone";
