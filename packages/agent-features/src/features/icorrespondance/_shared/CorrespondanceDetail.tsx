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
	ArrowDown,
	ArrowUp,
	Archive,
	BookmarkCheck,
	Download,
	FileText,
	FolderOpen,
	GripVertical,
	Import,
	Loader2,
	MoreHorizontal,
	Paperclip,
	Pencil,
	Plus,
	Reply,
	RotateCcw,
	ScanText,
	Send,
	Trash2,
	UserCheck,
	Maximize,
} from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useRouter } from "@workspace/routing";

export interface InlineAISuggestionProps {
	targetType: string;
	targetId: string | undefined;
	className?: string;
}

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
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { AnnotationsPanel } from "./AnnotationsPanel";
import { ApprovalPanel } from "./ApprovalPanel";
import { AssignDialog } from "./AssignDialog";
import { DisperseDialog } from "./DisperseDialog";
import { EditDraftDialog } from "./EditDraftDialog";
import { ImportFromIDocumentDialog } from "./ImportFromIDocumentDialog";
import { RespondDialog } from "./RespondDialog";
import { SignaturesPanel } from "./SignaturesPanel";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { TrackingTimeline } from "./TrackingTimeline";
import { cn } from "@workspace/ui/lib/utils";

interface CorrespondanceDetailProps {
	itemId: Id<"correspondanceItems">;
	currentUserId: string;
	currentOrgId: string;
	onBack: () => void;
	InlineAISuggestion?: ComponentType<InlineAISuggestionProps>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
	draft: { label: "Brouillon", color: "text-amber-400 bg-amber-500/15" },
	pending: { label: "En attente", color: "text-blue-400 bg-blue-500/15" },
	approved: { label: "Approuvé", color: "text-emerald-400 bg-emerald-500/15" },
	sent: { label: "Envoyé", color: "text-primary bg-primary/15" },
	received: { label: "Reçu", color: "text-primary bg-primary/15" },
	archived: { label: "Archivé", color: "text-zinc-400 bg-zinc-500/15" },
};

export function CorrespondanceDetail({
	itemId,
	currentUserId,
	currentOrgId,
	onBack,
	InlineAISuggestion,
}: CorrespondanceDetailProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const [selectedDocIndex, setSelectedDocIndex] = useState(0);
	const [selectedDocViewer, setSelectedDocViewer] = useState<ViewerDoc | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [respondOpen, setRespondOpen] = useState(false);
	const [assignOpen, setAssignOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [disperseOpen, setDisperseOpen] = useState(false);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	const { data: item, isPending } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getItem,
		{ itemId },
	);

	const { mutateAsync: sendCorrespondance, isPending: isSending } = useConvexMutationQuery(
		api.functions.correspondanceCore.sendCorrespondance,
	);

	const { mutateAsync: deleteItem, isPending: isDeleting } = useConvexMutationQuery(
		api.functions.correspondance.deleteItem,
	);

	const { mutateAsync: restoreItem, isPending: isRestoring } = useConvexMutationQuery(
		api.functions.correspondance.restoreFromTrash,
	);

	const { mutateAsync: registerIncoming, isPending: isRegistering } = useConvexMutationQuery(
		api.functions.correspondanceCore.registerIncoming,
	);

	const { mutateAsync: classerDansIDocument } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.classerCorrespondanceDansIDocument,
	);

	const { mutateAsync: removeDocument } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.removeDocumentFromCorrespondance,
	);

	const { mutateAsync: addDocument, isPending: isAddingDoc } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.addDocumentToCorrespondance,
	);

	const { mutateAsync: reorderDocuments } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.reorderDocuments,
	);

	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
		api.functions.correspondance.generateUploadUrl,
	);

	const { mutateAsync: runOcr, isPending: isOcrRunning } = useConvexActionQuery(
		api.functions.correspondanceOcr.runOcrOnItem,
	);

	const { mutateAsync: generatePdf, isPending: isGeneratingPdf } = useConvexActionQuery(
		api.functions.correspondancePdfGeneration.generateOfficialPdf,
	);

	const { mutateAsync: signDocumentAction, isPending: isSigning } = useConvexActionQuery(
		api.functions.correspondanceSignature.signDocument,
	);

	const { data: signatures } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.listSignatures,
		{ itemId },
	);

	if (isPending || !item) {
		return (
			<div className="flex items-center justify-center h-96">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const isCopy = (item as any).isCopy === true;
	const isDeleted = !!(item as any).deletedAt;
	const allDocs = (item as any).documents ?? [];

	const selectedDoc = allDocs[selectedDocIndex] ?? allDocs[0];
	const stCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;

	const handleSend = async () => {
		try {
			await sendCorrespondance({ itemId });
			toast.success(t("icorrespondance.toasts.correspondanceSent"));
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'envoi");
		}
	};

	const handleClasser = async () => {
		try {
			const result = (await classerDansIDocument({ itemId })) as {
				documentIds?: string[];
			};
			const firstDocId = result?.documentIds?.[0];
			toast.success("Dossier classé dans iDocument", {
				action: firstDocId
					? {
							label: "Voir",
							onClick: () => router.push(`/idocument?id=${firstDocId}`),
						}
					: undefined,
			});
			onBack();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du classement");
		}
	};

	const handleDelete = async () => {
		try {
			await deleteItem({ itemId });
			toast.success(t("icorrespondance.toasts.correspondanceDeleted"));
			onBack();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur");
		}
	};

	const handleRestore = async () => {
		try {
			await restoreItem({ itemId });
			toast.success(t("icorrespondance.toasts.correspondanceRestored"));
			onBack();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la restauration");
		}
	};

	const handleRunOcr = async () => {
		try {
			const result = (await runOcr({ itemId })) as
				| {
						ok: true;
						provider: string;
						charsExtracted: number;
						pageCount?: number;
				  }
				| { error: string }
				| { ok: false; reason: string };
			if ("error" in result) {
				toast.error(result.error);
				return;
			}
			if ("ok" in result && result.ok === false) {
				toast.info(
					result.reason === "already-processed"
						? "OCR déjà appliqué sur ce dossier."
						: result.reason === "no-text-extracted"
							? "Aucun texte n'a pu être extrait des pièces jointes."
							: "OCR ignoré.",
				);
				return;
			}
			toast.success(
				`OCR terminé : ${result.charsExtracted} caractère(s) extraits${
					result.pageCount ? ` sur ${result.pageCount} page(s)` : ""
				}.`,
			);
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.toasts.genericError"));
		}
	};

	const handleRegisterIncoming = async () => {
		try {
			await registerIncoming({ itemId });
			toast.success(t("icorrespondance.toasts.registered"));
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'enregistrement");
		}
	};

	const handleGeneratePdf = async () => {
		try {
			const result = await generatePdf({ itemId });
			if (result && "error" in result) {
				toast.error(result.error);
			} else {
				toast.success(
					(result as { replaced: boolean }).replaced
						? "Document officiel régénéré"
						: "Document officiel généré et attaché",
				);
			}
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la génération");
		}
	};

	const handleSignDoc = async (docIndex: number) => {
		try {
			const result = await signDocumentAction({ itemId, documentIndex: docIndex });
			if (result && "error" in result) {
				toast.error(result.error);
			} else {
				toast.success(
					`Document signé (sceau ${(result as { serialNumber: string }).serialNumber})`,
				);
			}
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la signature");
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

	const handleAddDoc = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept =
			".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const url = (await generateUploadUrl({})) as string;
				const res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				});
				const { storageId } = await res.json();
				await addDocument({
					itemId,
					storageId,
					filename: file.name,
					mimeType: file.type,
					sizeBytes: file.size,
					label: file.name,
				});
				toast.success("Document ajouté");
			} catch (e: any) {
				toast.error(e?.message ?? "Erreur lors de l'ajout du document");
			}
		};
		input.click();
	};

	const moveDoc = async (fromIndex: number, direction: -1 | 1) => {
		const toIndex = fromIndex + direction;
		if (toIndex < 0 || toIndex >= allDocs.length) return;
		const order = allDocs.map((_: unknown, i: number) => i);
		[order[fromIndex], order[toIndex]] = [order[toIndex], order[fromIndex]];
		try {
			await reorderDocuments({ itemId, newOrder: order });
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du réordonnancement");
		}
	};

	const reorderTo = async (fromIndex: number, toIndex: number) => {
		if (
			fromIndex === toIndex ||
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= allDocs.length ||
			toIndex >= allDocs.length
		) {
			return;
		}
		const order = allDocs.map((_: unknown, i: number) => i);
		const [moved] = order.splice(fromIndex, 1);
		order.splice(toIndex, 0, moved);
		try {
			await reorderDocuments({ itemId, newOrder: order });
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du réordonnancement");
		}
	};

	return (
		<div className="space-y-4">
			{/* ── Barre navigation + actions CORRESPONDANCE ── */}
			<div className="flex items-center gap-3 flex-wrap">
				<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
					<ArrowLeft className="h-3.5 w-3.5" />
					{t("icorrespondance.actions.back")}
				</Button>

				<div className="flex-1" />

				{InlineAISuggestion ? (
					<InlineAISuggestion
						targetType="correspondanceItem"
						targetId={itemId}
					/>
				) : null}

				{/* Actions correspondance selon le contexte */}
				{isDeleted && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRestore}
						disabled={isRestoring}
						className="gap-1.5"
					>
						{isRestoring ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<RotateCcw className="h-3.5 w-3.5" />
						)}
						{t("icorrespondance.actions.restore")}
					</Button>
				)}

				{item.status === "draft" && !isCopy && !isDeleted && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setEditOpen(true)}
						className="gap-1.5"
					>
						<Pencil className="h-3.5 w-3.5" />
						{t("icorrespondance.actions.edit")}
					</Button>
				)}

				{item.status === "draft" && !isCopy && !isDeleted && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleGeneratePdf}
						disabled={isGeneratingPdf}
						className="gap-1.5"
					>
						{isGeneratingPdf ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<FileText className="h-3.5 w-3.5" />
						)}
						{t("icorrespondance.actions.generateOfficial")}
					</Button>
				)}

				{item.status === "draft" && !isCopy && !isDeleted && (
					<Button size="sm" onClick={handleSend} disabled={isSending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
						{isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
						{t("icorrespondance.actions.send")}
					</Button>
				)}

				{item.status === "received" && !isDeleted && !(item as any).arrivalReference && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRegisterIncoming}
						disabled={isRegistering}
						className="gap-1.5"
					>
						{isRegistering ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<BookmarkCheck className="h-3.5 w-3.5" />
						)}
						{t("icorrespondance.actions.register")}
					</Button>
				)}

				{item.status === "received" && !isDeleted && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setAssignOpen(true)}
						className="gap-1.5"
					>
						<UserCheck className="h-3.5 w-3.5" />
						{(item as any).assignedToId
							? t("icorrespondance.actions.reassign")
							: t("icorrespondance.actions.assign")}
					</Button>
				)}

				{item.status === "received" && !isDeleted && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setRespondOpen(true)}
						className="gap-1.5"
					>
						<Reply className="h-3.5 w-3.5" />
						{t("icorrespondance.actions.reply")}
					</Button>
				)}

				{item.status === "received" &&
					!isDeleted &&
					!(item.tags ?? []).includes("ocr-processed") &&
					(item.documents ?? []).some(
						(d: any) =>
							d.mimeType === "application/pdf" ||
							(d.mimeType ?? "").startsWith("image/"),
					) && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleRunOcr}
							disabled={isOcrRunning}
							className="gap-1.5"
							title="Extraire le texte des pièces scannées"
						>
							{isOcrRunning ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<ScanText className="h-3.5 w-3.5" />
							)}
							OCR
						</Button>
					)}

				{item.status === "received" && !isDeleted && allDocs.length > 1 && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setDisperseOpen(true)}
						className="gap-1.5"
						title={t("icorrespondance.disperse.hint")}
					>
						<Send className="h-3.5 w-3.5" />
						{t("icorrespondance.disperse.action")}
					</Button>
				)}

				<Button variant="outline" size="sm" onClick={handleClasser} className="gap-1.5">
					<Archive className="h-3.5 w-3.5" />
					{t("icorrespondance.actions.classify")}
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
							{t("icorrespondance.actions.delete")}
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
								<span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-muted/40 px-1.5 py-0.5 rounded">{t("icorrespondance.detail.copy")}</span>
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
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
							<Paperclip className="h-3 w-3" />
							{t("icorrespondance.detail.documents")} ({allDocs.length})
						</h3>
						{!isCopy && !isDeleted && (
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setImportOpen(true)}
									className="h-7 gap-1 px-2 text-[11px]"
									title={t("icorrespondance.import.title")}
								>
									<Import className="h-3 w-3" />
									{t("icorrespondance.actions.import")}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleAddDoc}
									disabled={isAddingDoc}
									className="h-7 gap-1 px-2 text-[11px]"
								>
									{isAddingDoc ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<Plus className="h-3 w-3" />
									)}
									{t("icorrespondance.actions.add")}
								</Button>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 gap-3">
						{allDocs.map((doc: any, i: number) => {
							const label = doc.label ?? doc.filename;
							const subtitle = `${doc.isMainDocument ? t("icorrespondance.detail.mainDocument") : t("icorrespondance.detail.annexe")}${doc.copyWatermark ? ` • ${t("icorrespondance.detail.copy").toUpperCase()}` : ""}`;
							const isSelected = selectedDocIndex === i;
							const canReorder = !isCopy && !isDeleted && allDocs.length > 1;
							const isDragging = draggingIndex === i;
							const isDragTarget =
								dragOverIndex === i && draggingIndex !== null && draggingIndex !== i;
							return (
								<div
									key={doc.storageId ?? i}
									className={cn(
										"group flex flex-col gap-1.5 transition-all",
										canReorder && "cursor-grab active:cursor-grabbing",
										isDragging && "opacity-40",
										isDragTarget && "ring-2 ring-primary/60 ring-offset-2",
									)}
									draggable={canReorder}
									onDragStart={(e) => {
										if (!canReorder) return;
										setDraggingIndex(i);
										e.dataTransfer.effectAllowed = "move";
										// Some browsers need data set to start drag
										e.dataTransfer.setData("text/plain", String(i));
									}}
									onDragEnd={() => {
										setDraggingIndex(null);
										setDragOverIndex(null);
									}}
									onDragOver={(e) => {
										if (!canReorder || draggingIndex === null) return;
										e.preventDefault();
										e.dataTransfer.dropEffect = "move";
										if (dragOverIndex !== i) setDragOverIndex(i);
									}}
									onDragLeave={() => {
										if (dragOverIndex === i) setDragOverIndex(null);
									}}
									onDrop={(e) => {
										if (!canReorder || draggingIndex === null) return;
										e.preventDefault();
										const from = draggingIndex;
										const to = i;
										setDraggingIndex(null);
										setDragOverIndex(null);
										if (from !== to) reorderTo(from, to);
									}}
								>
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
													{canReorder && (
														<div
															className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
															title={t("icorrespondance.detail.dragToReorder")}
														>
															<GripVertical className="h-3 w-3" />
															{t("icorrespondance.detail.dragToReorder")}
														</div>
													)}
													{doc.isMainDocument ? (
														<div className="absolute left-2 top-2">
															<span className="inline-flex rounded bg-primary/90 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase text-primary-foreground shadow-sm">
																{t("icorrespondance.detail.mainDocument")}
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
																		{t("icorrespondance.actions.download")}
																	</DropdownMenuItem>
																	{i > 0 && (
																		<DropdownMenuItem
																			onClick={() => moveDoc(i, -1)}
																		>
																			<ArrowUp className="mr-2 h-3.5 w-3.5" />
																			{t("icorrespondance.detail.moveUp")}
																		</DropdownMenuItem>
																	)}
																	{i < allDocs.length - 1 && (
																		<DropdownMenuItem
																			onClick={() => moveDoc(i, 1)}
																		>
																			<ArrowDown className="mr-2 h-3.5 w-3.5" />
																			{t("icorrespondance.detail.moveDown")}
																		</DropdownMenuItem>
																	)}
																	<DropdownMenuSeparator />
																	<DropdownMenuItem
																		onClick={() => handleRemoveDoc(i)}
																		className="text-destructive"
																	>
																		<Trash2 className="mr-2 h-3.5 w-3.5" />
																		{t("icorrespondance.detail.removeFromFolder")}
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
											{selectedDoc.mimeType === "application/pdf" &&
												["draft", "pending", "approved"].includes(item.status) && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleSignDoc(selectedDocIndex)}
														disabled={isSigning}
														className="gap-1.5"
														title="Signer électroniquement ce document"
													>
														{isSigning ? (
															<Loader2 className="h-3.5 w-3.5 animate-spin" />
														) : (
															<UserCheck className="h-3.5 w-3.5" />
														)}
														Signer
													</Button>
												)}
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

					{/* Signatures électroniques */}
					<SignaturesPanel signatures={signatures} />

					{/* Commentaires internes */}
					<AnnotationsPanel itemId={itemId} currentUserId={currentUserId} />

					{/* Historique workflow */}
					<WorkflowTimelineWrapper itemId={itemId} />
				</div>
			</div>
			
			<DocumentViewerModal isOpen={!!selectedDocViewer} onClose={() => setSelectedDocViewer(null)} document={selectedDocViewer} />

			{item.status === "draft" && !isCopy && (
				<EditDraftDialog
					open={editOpen}
					onClose={() => setEditOpen(false)}
					item={{
						_id: item._id as Id<"correspondanceItems">,
						title: item.title,
						comment: item.comment,
						priority: item.priority as "normal" | "urgent" | "confidentiel" | undefined,
						tags: item.tags,
					}}
				/>
			)}

			{item.status === "received" && (
				<RespondDialog
					open={respondOpen}
					onClose={() => setRespondOpen(false)}
					originalItem={{
						_id: item._id as Id<"correspondanceItems">,
						reference: item.reference,
						title: item.title,
						type: item.type as
							| "note_verbale"
							| "lettre_officielle"
							| "circulaire"
							| "telegramme"
							| "memorandum"
							| "communique",
						priority: item.priority as
							| "normal"
							| "urgent"
							| "confidentiel"
							| undefined,
					}}
				/>
			)}

			{item.status === "received" && (
				<AssignDialog
					open={assignOpen}
					onClose={() => setAssignOpen(false)}
					itemId={item._id as Id<"correspondanceItems">}
					orgId={currentOrgId as Id<"orgs">}
					currentAssignedToId={(item as any).assignedToId}
				/>
			)}

			{!isCopy && !isDeleted && (
				<ImportFromIDocumentDialog
					open={importOpen}
					onClose={() => setImportOpen(false)}
					correspondanceItemId={item._id as Id<"correspondanceItems">}
					orgId={currentOrgId as Id<"orgs">}
				/>
			)}

			{item.status === "received" && !isDeleted && (
				<DisperseDialog
					open={disperseOpen}
					onOpenChange={setDisperseOpen}
					itemId={item._id as Id<"correspondanceItems">}
					documents={(allDocs as any[]).map((d) => ({
						filename: d.filename,
						label: d.label,
						storageId: d.storageId,
						isMainDocument: !!d.isMainDocument,
					}))}
				/>
			)}
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
