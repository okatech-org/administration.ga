import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

interface DocumentListProps {
	documentIds: Id<"documents">[];
	docType: string;
	onRemove: (documentId: Id<"documents">) => Promise<void>;
}

export function DocumentList({ documentIds, onRemove }: DocumentListProps) {
	const { data: documents } = useAuthenticatedConvexQuery(
		api.functions.documents.getDocumentsByIds,
		{ ids: documentIds },
	);

	const handleOpen = (url: string | null) => {
		if (url) window.open(url, "_blank");
	};

	if (documentIds.length === 0) return null;

	if (!documents)
		return (
			<div className="py-2">
				<Loader2 className="h-4 w-4 animate-spin" />
			</div>
		);

	return (
		<div className="space-y-2 mt-4">
			{documents.map((doc) => {
				const firstFile = doc.files?.[0];
				return (
					<div
						key={doc._id}
						className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-accent/5 transition-colors group"
					>
						<div className="flex items-center gap-3 overflow-hidden">
							<div className="p-2 bg-primary/10 rounded-md">
								<FileText className="h-4 w-4 text-primary" />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs">
									{firstFile?.filename ?? doc.label ?? "Document"}
								</span>
								{firstFile && (
									<span className="text-xs text-muted-foreground">
										{(firstFile.sizeBytes / 1024).toFixed(0)} KB
									</span>
								)}
							</div>
						</div>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleOpen(firstFile?.url ?? null)}
							>
								<ExternalLink className="h-4 w-4 text-muted-foreground" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="hover:text-destructive hover:bg-destructive/10"
								onClick={() => {
									toast.promise(onRemove(doc._id), {
										loading: "Suppression...",
										success: "Fichier supprimé",
										error: "Erreur lors de la suppression",
									});
								}}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
