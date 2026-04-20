/**
 * Explorateur de dossier opérateur économique.
 * Affiche l'arborescence : Fiche → Plans → Lettres → Rapports → Projets
 * avec boutons de téléchargement par document.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	FolderOpen,
	FileText,
	Download,
	Loader2,
	Presentation,
	File,
} from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../../components/my-space/flat-card";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { ExportZipButton } from "./ExportZipButton";

// Icône par format
function FormatIcon({ format }: { format: string }) {
	switch (format) {
		case "pdf":
			return <File className="h-3.5 w-3.5 text-destructive" />;
		case "docx":
			return <FileText className="h-3.5 w-3.5 text-primary" />;
		case "pptx":
			return <Presentation className="h-3.5 w-3.5 text-warning" />;
		default:
			return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
	}
}

// Ordre d'affichage des sous-dossiers
const SUBFOLDER_ORDER = ["", "Plans Stratégiques", "Lettres", "Rapports", "Projets"];
const SUBFOLDER_LABELS: Record<string, string> = {
	"": "Fiche",
	"Fiche": "Fiche",
	"Plans Stratégiques": "Plans Stratégiques",
	"Lettres": "Lettres",
	"Rapports": "Rapports",
	"Projets": "Projets",
};

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function FolderExplorer({
	targetId,
}: {
	targetId: Id<"diplomaticTargets">;
}) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.diplomaticFolders.getTargetDocuments,
		{ targetId },
	);

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!data || data.totalDocuments === 0) {
		return (
			<FlatCard className="bg-muted/20">
				<div className="p-3 lg:p-4 py-6 text-center">
					<FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
					<p className="text-xs text-muted-foreground">
						Aucun document dans le dossier pour l'instant.
					</p>
					<p className="text-[10px] text-muted-foreground/70 mt-1">
						Les documents seront générés automatiquement à chaque étape du pipeline.
					</p>
				</div>
			</FlatCard>
		);
	}

	const { bySubfolder, totalDocuments, totalSize } = data;

	// Trier les sous-dossiers selon l'ordre prédéfini
	const sortedSubfolders = Object.keys(bySubfolder).sort((a, b) => {
		const idxA = SUBFOLDER_ORDER.indexOf(a);
		const idxB = SUBFOLDER_ORDER.indexOf(b);
		return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
	});

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: 0.1 }}
			className="space-y-3"
		>
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{totalDocuments} document{totalDocuments > 1 ? "s" : ""}</span>
					<span>·</span>
					<span>{formatSize(totalSize)}</span>
				</div>
				<ExportZipButton targetId={targetId} />
			</div>

			{/* Arborescence */}
			<div className="space-y-2">
				{sortedSubfolders.map((subfolder) => {
					const docs = bySubfolder[subfolder];
					const label = SUBFOLDER_LABELS[subfolder] || subfolder;

					return (
						<div key={subfolder} className="space-y-1">
							{/* En-tête du sous-dossier */}
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
								<FolderOpen className="h-3.5 w-3.5" />
								<span>{label}</span>
								<Badge variant="secondary" className="text-[9px] ml-1">
									{docs.length}
								</Badge>
							</div>

							{/* Documents */}
							<div className="ml-5 space-y-1">
								{docs.map((doc) => (
									<div
										key={doc._id}
										className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors group"
									>
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<FormatIcon format={doc.format} />
											<div className="min-w-0 flex-1">
												<span
													className="text-xs truncate block max-w-[280px]"
													title={doc.filename}
												>
													{doc.filename}
												</span>
												{/* Metadata toujours visible (important pour mobile) */}
												<span className="text-[10px] text-muted-foreground">
													{formatSize(doc.sizeBytes)} · {formatDate(doc.generatedAt)}
												</span>
											</div>
											{doc.version > 1 && (
												<Badge variant="outline" className="text-[8px] shrink-0">
													v{doc.version}
												</Badge>
											)}
										</div>
										{doc.url && (
											<a
												href={doc.url}
												download={doc.filename}
												target="_blank"
												rel="noopener noreferrer"
												className="shrink-0 ml-2"
											>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6"
													aria-label={`Télécharger ${doc.filename}`}
												>
													<Download className="h-3 w-3" />
												</Button>
											</a>
										)}
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</motion.div>
	);
}
