import { cn } from "@workspace/ui/lib/utils";
import { FileText, Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

/** Taille max par fichier. Au-delà, rejet côté client (pas d'upload inutile). */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo

/** MIME types acceptés. Liste close — on refuse tout autre format. */
const ALLOWED_MIME_TYPES = new Set<string>([
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export interface UploadedAttachment {
	storageId: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	uploadedAt: number;
}

interface AttachmentUploaderProps {
	attachments: UploadedAttachment[];
	onAttachmentsChange: (attachments: UploadedAttachment[]) => void;
	onGenerateUploadUrl: () => Promise<string>;
	minRequired?: number;
	acceptedTypes?: string[];
	showError?: boolean;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return bytes + " o";
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
	return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

export function AttachmentUploader({
	attachments,
	onAttachmentsChange,
	onGenerateUploadUrl,
	minRequired = 1,
	acceptedTypes = [".pdf", "application/pdf"],
	showError = false,
}: AttachmentUploaderProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const hasError = showError && attachments.length < minRequired;

	const uploadFile = useCallback(
		async (file: File) => {
			const uploadUrl = await onGenerateUploadUrl();

			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			const { storageId } = (await response.json()) as {
				storageId: string;
			};

			const attachment: UploadedAttachment = {
				storageId,
				filename: file.name,
				mimeType: file.type,
				sizeBytes: file.size,
				uploadedAt: Date.now(),
			};

			return attachment;
		},
		[onGenerateUploadUrl],
	);

	const handleFiles = useCallback(
		async (files: FileList | File[]) => {
			const fileArray = Array.from(files);
			if (fileArray.length === 0) return;

			// ── Validation client : on rejette AVANT l'upload ──
			// (defense in depth — le backend doit aussi valider).
			const validFiles: File[] = [];
			for (const file of fileArray) {
				if (file.size > MAX_FILE_SIZE_BYTES) {
					toast.error(
						`${file.name} dépasse la taille max autorisée (50 Mo).`,
					);
					continue;
				}
				if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
					toast.error(
						`${file.name} : type de fichier non autorisé (${file.type || "inconnu"}).`,
					);
					continue;
				}
				validFiles.push(file);
			}

			if (validFiles.length === 0) return;

			setIsUploading(true);
			try {
				// Upload en parallèle pour accélérer les lots (limite naturelle
				// côté navigateur : 6 connexions simultanées par domaine).
				const uploaded = await Promise.all(
					validFiles.map((file) => uploadFile(file)),
				);
				onAttachmentsChange([...attachments, ...uploaded]);
			} catch (error) {
				console.error("Upload error:", error);
				toast.error("Erreur pendant le téléversement.");
			} finally {
				setIsUploading(false);
			}
		},
		[attachments, onAttachmentsChange, uploadFile],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (!isDragOver) setIsDragOver(true);
		},
		[isDragOver],
	);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				handleFiles(files);
			}
		},
		[handleFiles],
	);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				handleFiles(files);
			}
			// Reset input so the same file can be re-selected
			e.target.value = "";
		},
		[handleFiles],
	);

	const handleRemove = useCallback(
		(index: number) => {
			const updated = attachments.filter((_, i) => i !== index);
			onAttachmentsChange(updated);
		},
		[attachments, onAttachmentsChange],
	);

	const handleDropZoneClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	return (
		<div className="space-y-3">
			{/* Drop zone */}
			<div
				role="button"
				tabIndex={0}
				onClick={handleDropZoneClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleDropZoneClick();
					}
				}}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={cn(
					"relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors",
					"border-border/50 hover:border-border",
					isDragOver && "border-blue-500/50 bg-blue-500/5",
					hasError &&
						!isDragOver &&
						"border-red-500/30 bg-red-500/5",
				)}
			>
				{isUploading ? (
					<>
						<Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
						<p className="text-sm text-muted-foreground">
							Téléversement en cours...
						</p>
					</>
				) : (
					<>
						<Upload className="h-8 w-8 text-muted-foreground" />
						<p className="text-sm font-medium text-foreground">
							Déposez vos fichiers PDF ici
						</p>
						<p className="text-xs text-muted-foreground">
							ou cliquez pour parcourir
						</p>
					</>
				)}
			</div>

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept={acceptedTypes.join(",")}
				onChange={handleInputChange}
				className="hidden"
			/>

			{/* Uploaded file list */}
			{attachments.length > 0 && (
				<div className="space-y-2">
					{attachments.map((attachment, index) => (
						<div
							key={attachment.storageId}
							className="flex items-center gap-3 border border-border/50 rounded-lg p-3 bg-card"
						>
							<FileText className="h-5 w-5 shrink-0 text-red-500" />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium truncate text-foreground">
									{attachment.filename}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatBytes(attachment.sizeBytes)}
								</p>
							</div>
							<button
								type="button"
								onClick={() => handleRemove(index)}
								className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Validation error */}
			{hasError && (
				<div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
					<AlertTriangle className="h-4 w-4 shrink-0" />
					<span>Au moins un document PDF est requis</span>
				</div>
			)}
		</div>
	);
}
