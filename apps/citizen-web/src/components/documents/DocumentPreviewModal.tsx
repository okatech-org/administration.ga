"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useConvexQuery } from "@/integrations/convex/hooks";

interface DocumentPreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	storageId: string;
	filename: string;
	mimeType?: string;
}

/**
 * Modal to preview documents (PDF, images) inline without opening a new page
 */
export function DocumentPreviewModal({
	open,
	onOpenChange,
	storageId,
	filename,
	mimeType,
}: DocumentPreviewModalProps) {
	const { t } = useTranslation();
	const [error, setError] = useState(false);
	const { data: documentUrl, isLoading } = useConvexQuery(
		api.functions.documents.getUrl,
		open ? { storageId: storageId as Id<"_storage"> } : "skip",
	);

	// Determine file type
	const isPdf =
		mimeType?.includes("pdf") || filename?.toLowerCase().endsWith(".pdf");
	const isImage =
		mimeType?.startsWith("image/") ||
		/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename || "");

	const handleDownload = () => {
		if (documentUrl) {
			window.open(documentUrl, "_blank");
		}
	};

	const handleOpenExternal = () => {
		if (documentUrl) {
			window.open(documentUrl, "_blank");
		}
	};

	// Reset error state when modal opens/closes
	useEffect(() => {
		if (open) setError(false);
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[700px]! w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
				{/* Header */}
				<DialogHeader className="px-4 py-3 border-b shrink-0">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-primary" />
							<DialogTitle className="text-base font-medium truncate max-w-[400px]">
								{filename || t("documents.preview.document")}
							</DialogTitle>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleOpenExternal}
								disabled={!documentUrl}
							>
								<ExternalLink className="h-4 w-4 mr-1.5" />
								{t("documents.preview.open")}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleDownload}
								disabled={!documentUrl}
							>
								<Download className="h-4 w-4 mr-1.5" />
								{t("documents.preview.download")}
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onOpenChange(false)}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</DialogHeader>

				{/* Content */}
				<div className="flex-1 overflow-hidden bg-muted/30">
					{isLoading && (
						<div className="h-full flex items-center justify-center">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					)}

					{error && (
						<div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
							<FileText className="h-12 w-12 opacity-20" />
							<p>{t("documents.preview.loadError")}</p>
							<Button variant="outline" size="sm" onClick={handleOpenExternal} disabled={!documentUrl}>
								<ExternalLink className="h-4 w-4 mr-1.5" />
								{t("documents.preview.open")}
							</Button>
						</div>
					)}

					{!isLoading && !error && documentUrl && (
						<>
							{isPdf && (
								<object
									data={documentUrl}
									type="application/pdf"
									className="w-full h-full"
									title={filename}
								>
									<div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
										<FileText className="h-12 w-12 opacity-20" />
										<p className="text-sm">{t("documents.preview.loadError")}</p>
										<Button variant="outline" size="sm" onClick={handleOpenExternal}>
											<ExternalLink className="h-4 w-4 mr-1.5" />
											{t("documents.preview.open")}
										</Button>
									</div>
								</object>
							)}

							{isImage && (
								<div className="h-full overflow-auto flex items-center justify-center p-4">
									<img
										src={documentUrl}
										alt={filename}
										className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
										onError={() => setError(true)}
									/>
								</div>
							)}
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
