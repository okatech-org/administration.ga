/**
 * CorrespondanceDetail — Vue détaillée d'un dossier de correspondance.
 *
 * Layout 2 colonnes : [Liste documents | Viewer/Infos]
 * Barre d'actions à deux niveaux : correspondance (haut) + document (par item)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DocumentSheetFile } from "@workspace/ui/components/document-sheet";
import {
	ArrowLeft,
	Archive,
	Download,
	FileText,
	FolderOpen,
	Loader2,
	MessageSquare,
	MoreHorizontal,
	Paperclip,
	Send,
	Trash2,
	UserCheck,
	Maximize,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { InlineAISuggestion } from "@/components/ai/proactive/InlineAISuggestion";

// Type local — évite le problème HMR avec l'export ViewerDoc
interface ViewerDoc {
	id: string;
	title: string;
	url?: string;
	mimeType?: string;
}

// Import dynamique du modal pour éviter le crash HMR
const DocumentViewerModal = ({ isOpen, onClose, document: doc }: { isOpen: boolean; onClose: () => void; document: ViewerDoc | null }) => {
	if (!isOpen || !doc) return null;
	const url = doc.url ?? "";
	return (
		<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
			<div className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between p-4 border-b">
					<h3 className="font-semibold truncate">{doc.title}</h3>
					<button type="button" onClick={onClose} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted"></button>
				</div>
				{doc.mimeType === "application/pdf" ? (
					<iframe src={`${url}#view=FitH`} className="w-full h-[75vh] border-0" title={doc.title} />
				) : doc.mimeType?.startsWith("image/") ? (
					<div className="flex items-center justify-center p-4 h-[75vh]">
						<img src={url} alt={doc.title} className="max-w-full max-h-full object-contain" />
					</div>
				) : (
					<div className="flex items-center justify-center h-[75vh]">
						<p className="text-muted-foreground">Aperçu non disponible</p>
					</div>
				)}
			</div>
		</div>
	);
};
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { ApprovalPanel } from "./ApprovalPanel";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { TrackingTimeline } from "./TrackingTimeline";
import { cn } from "@/lib/utils";

interface CorrespondanceDetailProps {
	itemId: Id<"correspondanceItems">;
	currentUserId: string;
	currentOrgId: string;
	onBack: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
	draft: { label: "Brouillon", color: "text-amber-400 bg-amber-500/15" },
	pending: { label: "En attente", color: "text-blue-400 bg-blue-500/15" },
	approved: { label: "Approuvé", color: "text-emerald-400 bg-emerald-500/15" },
	sent: { label: "Envoyé", color: "text-violet-400 bg-violet-500/15" },
	received: { label: "Reçu", color: "text-indigo-400 bg-indigo-500/15" },
	archived: { label: "Archivé", color: "text-zinc-400 bg-zinc-500/15" },
};

export function CorrespondanceDetail({
	itemId,
	currentUserId,
	currentOrgId,
	onBack,
}: CorrespondanceDetailProps) {
	const [selectedDocIndex, setSelectedDocIndex] = useState(0);
	const [selectedDocViewer, setSelectedDocViewer] = useState<ViewerDoc | null>(null);

	const { data: item, isPending } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getItem,
		{ itemId },
	);

	const { mutateAsync: sendCorrespondance, isPending: isSending } = useConvexMutationQuery(
		api.functions.correspondance.sendCorrespondance,
	);

	const { mutateAsync: deleteItem, isPending: isDeleting } = useConvexMutationQuery(
		api.functions.correspondance.deleteItem,
	);

	const { mutateAsync: classerDansIDocument } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.classerCorrespondanceDansIDocument,
	);

	const { mutateAsync: removeDocument } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.removeDocumentFromCorrespondance,
	);

	if (isPending || !item) {
		return (
			<div className="flex items-center justify-center h-96">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const isCopy = (item as any).isCopy === true;
	const docs = (item as any).documents ?? [];
	const attachments = item.attachments ?? [];
	const allDocs = docs.length > 0 ? docs : attachments.map((a: any, i: number) => ({
		...a,
		ordre: i + 1,
		isMainDocument: i === 0,
		label: a.filename,
	}));

	const selectedDoc = allDocs[selectedDocIndex] ?? allDocs[0];
	const stCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;

	const handleSend = async () => {
		try {
			await sendCorrespondance({ itemId });
			toast.success("Correspondance envoyée ");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'envoi");
		}
	};

	const handleClasser = async () => {
		try {
			await classerDansIDocument({ itemId });
			toast.success("Dossier classé dans iDocument ");
			onBack();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du classement");
		}
	};

	const handleDelete = async () => {
		try {
			await deleteItem({ itemId });
			toast.success("Correspondance supprimée");
			onBack();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur");
		}
	};

	const handleRemoveDoc = async (docIndex: number) => {
		try {
			await removeDocument({ itemId, documentIndex: docIndex });
			toast.success("Document retiré et classé dans iDocument ");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur");
		}
	};

	return (
		<div className="space-y-4">
			{/* ── Barre navigation + actions CORRESPONDANCE ── */}
			<div className="flex items-center gap-3 flex-wrap">
				<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
					<ArrowLeft className="h-3.5 w-3.5" />
					Retour
				</Button>

				<div className="flex-1" />

				<InlineAISuggestion
					targetType="correspondanceItem"
					targetId={itemId}
				/>

				{/* Actions correspondance selon le contexte */}
				{item.status === "draft" && !isCopy && (
					<Button size="sm" onClick={handleSend} disabled={isSending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
						{isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
						Envoyer
					</Button>
				)}

				{item.status === "received" && !isCopy && (
					<>
						<Button variant="outline" size="sm" className="gap-1.5">
							<MessageSquare className="h-3.5 w-3.5" />
							Répondre
						</Button>
						<Button variant="outline" size="sm" className="gap-1.5">
							<Send className="h-3.5 w-3.5" />
							Transmettre
						</Button>
					</>
				)}

				<Button variant="outline" size="sm" onClick={handleClasser} className="gap-1.5">
					<Archive className="h-3.5 w-3.5" />
					Classer dans iDocument
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
							<Trash2 className="mr-2 h-3.5 w-3.5" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* ── En-tête du dossier ── */}
			<div className={cn("rounded-xl border p-5 space-y-3", isCopy && "opacity-75 bg-muted/20")}>
				<div className="flex items-start gap-3">
					<div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", isCopy ? "bg-zinc-500/10" : "bg-primary/10")}>
						<FolderOpen className={cn("h-6 w-6", isCopy ? "text-zinc-400" : "text-primary")} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							{isCopy && (
								<span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-muted/40 px-1.5 py-0.5 rounded">Copie</span>
							)}
							<span className="text-[10px] font-mono text-muted-foreground">{item.reference}</span>
							<Badge className={cn("text-[9px]", stCfg.color)}>{stCfg.label}</Badge>
						</div>
						<h2 className="text-lg font-semibold mt-1">{item.title}</h2>
						<div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
							<span><strong>De :</strong> {item.senderName} {item.senderOrg && `(${item.senderOrg})`}</span>
							<span><strong>À :</strong> {item.recipientName} {item.recipientOrg && `(${item.recipientOrg})`}</span>
						</div>
					</div>
				</div>

				{item.comment && (
					<p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 italic">
						{item.comment}
					</p>
				)}
			</div>

			{/* ── Contenu : Documents + Viewer ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Liste des documents — vignettes A4 fidèles */}
				<div className="space-y-3">
					<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
						<Paperclip className="h-3 w-3" />
						Documents ({allDocs.length})
					</h3>
					<div className="grid grid-cols-1 gap-3">
						{allDocs.map((doc: any, i: number) => {
							const label = doc.label ?? doc.filename;
							const subtitle = `${doc.isMainDocument ? "Document principal" : "Annexe"}${doc.copyWatermark ? " • COPIE" : ""}`;
							const isSelected = selectedDocIndex === i;
							return (
								<div key={doc.storageId ?? i} className="flex flex-col gap-1.5">
									<div
										className={cn(
											"relative",
											isSelected && "ring-2 ring-primary/60 ring-offset-2",
										)}
									>
										<DocumentSheetFile
											fileName={doc.filename ?? label}
											mimeType={doc.mimeType}
											url={doc.url ?? null}
											subtitle={subtitle}
											onClick={() => setSelectedDocIndex(i)}
											ariaLabel={`Sélectionner ${label}`}
											overlays={
												<>
													{doc.isMainDocument ? (
														<div className="absolute left-2 top-2">
															<span className="inline-flex rounded bg-primary/90 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase text-primary-foreground shadow-sm">
																Principal
															</span>
														</div>
													) : null}
													{!isCopy ? (
														<div className="absolute right-2 top-2">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-7 w-7 bg-white/90 shadow-sm"
																		onClick={(e) => e.stopPropagation()}
																	>
																		<MoreHorizontal className="h-3.5 w-3.5" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem>
																		<Download className="mr-2 h-3.5 w-3.5" />
																		Télécharger
																	</DropdownMenuItem>
																	<DropdownMenuSeparator />
																	<DropdownMenuItem
																		onClick={() => handleRemoveDoc(i)}
																		className="text-destructive"
																	>
																		<Trash2 className="mr-2 h-3.5 w-3.5" />
																		Retirer du dossier
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
														</div>
													) : null}
												</>
											}
										/>
									</div>
									<div className="px-1">
										<p className="text-xs font-medium truncate" title={label}>
											{label}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{subtitle}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Zone viewer / infos */}
				<div className="lg:col-span-2 space-y-4">
					{/* Aperçu document sélectionné */}
					{selectedDoc && (
						<div className={cn("rounded-xl border bg-card overflow-hidden", isCopy && "relative")}>
							{/* Filigrane COPIE overlay côté client */}
							{isCopy && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
									<span className="text-6xl font-black text-muted-foreground/10 rotate-[-30deg] select-none">
										COPIE
									</span>
								</div>
							)}
							<div className="p-4 border-b flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">{selectedDoc.label ?? selectedDoc.filename}</p>
									<p className="text-[10px] text-muted-foreground">
										{(selectedDoc.sizeBytes / 1024).toFixed(0)} Ko • {selectedDoc.mimeType}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{!isCopy && selectedDoc.url && (
										<>
											<Button variant="outline" size="sm" onClick={() => setSelectedDocViewer({ id: selectedDoc.id || String(selectedDocIndex), title: selectedDoc.filename, url: selectedDoc.url, mimeType: selectedDoc.mimeType })} className="gap-1.5 hidden sm:flex">
												<Maximize className="h-3.5 w-3.5" />
												Agrandir
											</Button>
											<Button variant="outline" size="sm" asChild className="gap-1.5">
												<a href={selectedDoc.url} download={selectedDoc.filename} target="_blank" rel="noopener noreferrer">
													<Download className="h-3.5 w-3.5" />
													Télécharger
												</a>
											</Button>
										</>
									)}
								</div>
							</div>
							{/* Zone d'affichage PDF */}
							{selectedDoc.url ? (
								<motion.div layoutId={`doc-card-${selectedDoc.id || selectedDocIndex}`} className="h-[650px] w-full bg-muted/5 border-t">
									{selectedDoc.mimeType === "application/pdf" ? (
										<iframe 
											src={`${selectedDoc.url}#view=FitH`} 
											className="w-full h-full border-0" 
											title={selectedDoc.filename}
										/>
									) : selectedDoc.mimeType?.startsWith("image/") ? (
										<div className="w-full h-full flex items-center justify-center overflow-auto p-4">
											<img 
												src={selectedDoc.url} 
												alt={selectedDoc.filename} 
												className="max-w-full max-h-[600px] object-contain shadow-md border border-border/50 rounded-sm" 
											/>
										</div>
									) : (
										<div className="h-full flex items-center justify-center">
											<div className="text-center space-y-3">
												<FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
												<p className="text-sm font-medium">{selectedDoc.filename}</p>
												<p className="text-xs text-muted-foreground/60 max-w-[250px] mx-auto">
													Aperçu non disponible pour ce format de fichier ({selectedDoc.mimeType}).
												</p>
												<Button variant="outline" size="sm" asChild className="mt-4 gap-1.5">
													<a href={selectedDoc.url} download={selectedDoc.filename} target="_blank" rel="noopener noreferrer">
														<Download className="h-3.5 w-3.5" />
														Télécharger
													</a>
												</Button>
											</div>
										</div>
									)}
								</motion.div>
							) : (
								<div className="h-[500px] flex items-center justify-center bg-muted/10 border-t">
									<div className="text-center space-y-2">
										<Loader2 className="h-8 w-8 text-muted-foreground/30 animate-spin mx-auto" />
										<p className="text-sm text-muted-foreground">Chargement du document...</p>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Approbation (si en attente) */}
					{item.status === "pending" && (
						<ApprovalPanel
							itemId={itemId}
							currentUserId={currentUserId}
							status={item.status}
						/>
					)}

					{/* Suivi (si copie envoyée) */}
					{isCopy && (
						<TrackingTimeline
							itemId={itemId}
							sentAt={(item as any).sentAt}
							recipientStatus={(item as any).recipientStatus}
							recipientStatusUpdatedAt={(item as any).recipientStatusUpdatedAt}
							arrivalReference={(item as any).arrivalReference}
							arrivalDate={(item as any).arrivalDate}
						/>
					)}

					{/* Historique workflow */}
					<WorkflowTimelineWrapper itemId={itemId} />
				</div>
			</div>
			
			<DocumentViewerModal isOpen={!!selectedDocViewer} onClose={() => setSelectedDocViewer(null)} document={selectedDocViewer} />
		</div>
	);
}

/** Wrapper qui fetch les workflow steps et les passe au WorkflowTimeline */
function WorkflowTimelineWrapper({ itemId }: { itemId: Id<"correspondanceItems"> }) {
	const { data: steps } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getWorkflowHistory,
		{ itemId },
	);

	if (!steps || steps.length === 0) return null;

	const mappedSteps = (steps as any[]).map((s) => ({
		id: s._id as string,
		action: s.stepType,
		actorName: s.actorName,
		targetName: s.targetName,
		comment: s.comment,
		timestamp: s.createdAt,
	}));

	return <WorkflowTimeline steps={mappedSteps} />;
}
