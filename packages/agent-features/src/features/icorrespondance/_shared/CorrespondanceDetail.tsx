/**
 * CorrespondanceDetail — Vue détaillée d'un dossier de correspondance.
 *
 * Layout 3 colonnes pleine hauteur :
 *   [Documents groupés | Viewer PDF/Image | Sidebar onglets]
 *
 * Documents : groupés par fonction (Pièce maîtresse / Annexes / Pièces signées).
 * Viewer    : PdfViewer (react-pdf) avec pagination + zoom + fallback image/doc.
 * Sidebar   : onglets Détails / Activité / Signatures (+ Approbation, Suivi
 *             conditionnels). L'onglet par défaut s'adapte au statut.
 *
 * Barre d'actions condensée : actions primaires visibles, secondaires dans
 * un menu ⋯.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	ArrowLeft,
	ArrowDown,
	ArrowUp,
	Archive,
	BookmarkCheck,
	Download,
	FileCheck2,
	FileText,
	FolderOpen,
	Forward,
	GripVertical,
	Import,
	Loader2,
	MessageCircle,
	MoreHorizontal,
	Paperclip,
	Pencil,
	Plus,
	Reply,
	RotateCcw,
	ScanText,
	Send,
	ShieldCheck,
	Stamp,
	Trash2,
	Undo2,
	X,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useRouter } from "@workspace/routing";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { PdfViewer } from "@workspace/ui/components/pdf-viewer";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

import { AnnotationsPanel } from "./AnnotationsPanel";
import { ApprovalPanel } from "./ApprovalPanel";
import { DisperseDialog } from "./DisperseDialog";
import { EditDraftDialog } from "./EditDraftDialog";
import { ImportFromIDocumentDialog } from "./ImportFromIDocumentDialog";
import { RespondDialog } from "./RespondDialog";
import { ReturnToSenderDialog } from "./ReturnToSenderDialog";
import { SignaturesPanel } from "./SignaturesPanel";
import { TrackingTimeline } from "./TrackingTimeline";
import { TransmitDialog } from "./TransmitDialog";
import { WorkflowTimeline } from "./WorkflowTimeline";

export interface InlineAISuggestionProps {
	targetType: string;
	targetId: string | undefined;
	className?: string;
}

interface ViewerDoc {
	id: string;
	title: string;
	url?: string;
	mimeType?: string;
}

interface CorrespondanceDetailProps {
	itemId: Id<"correspondanceItems">;
	currentUserId: string;
	currentOrgId: string;
	onBack: () => void;
	InlineAISuggestion?: ComponentType<InlineAISuggestionProps>;
}

interface DocItem {
	storageId: string;
	filename: string;
	label?: string;
	mimeType?: string;
	sizeBytes: number;
	url?: string | null;
	isMainDocument?: boolean;
	copyWatermark?: boolean;
	id?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
	draft: { label: "Brouillon", color: "text-amber-400 bg-amber-500/15" },
	pending: { label: "En attente", color: "text-blue-400 bg-blue-500/15" },
	approved: { label: "Approuvé", color: "text-emerald-400 bg-emerald-500/15" },
	sent: { label: "Envoyé", color: "text-primary bg-primary/15" },
	received: { label: "Reçu", color: "text-primary bg-primary/15" },
	archived: { label: "Archivé", color: "text-zinc-400 bg-zinc-500/15" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
	urgent: { label: "Urgent", color: "text-rose-400 bg-rose-500/15" },
	confidentiel: { label: "Confidentiel", color: "text-violet-400 bg-violet-500/15" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

interface SignatureLike {
	documentIndex?: number;
}

function isSignedDoc(index: number, signatures?: SignatureLike[]): boolean {
	if (!signatures || signatures.length === 0) return false;
	return signatures.some((s) => s.documentIndex === index);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(ts?: number): string {
	if (!ts) return "—";
	return new Date(ts).toLocaleString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ── Modal plein écran (Agrandir) ───────────────────────────────────────────

function DocumentViewerModal({
	isOpen,
	onClose,
	document: doc,
}: {
	isOpen: boolean;
	onClose: () => void;
	document: ViewerDoc | null;
}) {
	if (!isOpen || !doc) return null;
	const url = doc.url ?? "";
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="dialog"
			aria-modal="true"
			tabIndex={-1}
		>
			<div
				className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-card"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div className="flex items-center justify-between border-b p-4">
					<h3 className="truncate font-semibold">{doc.title}</h3>
					<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Fermer">
						<X className="h-4 w-4" />
					</Button>
				</div>
				<div className="h-[85vh] w-full bg-muted/10">
					{doc.mimeType === "application/pdf" && url ? (
						<PdfViewer url={url} mode="full" />
					) : doc.mimeType?.startsWith("image/") && url ? (
						<div className="flex h-full items-center justify-center p-4">
							<img src={url} alt={doc.title} className="max-h-full max-w-full object-contain" />
						</div>
					) : (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							Aperçu non disponible
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

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
	const [expandedDoc, setExpandedDoc] = useState<ViewerDoc | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [respondOpen, setRespondOpen] = useState(false);
	const [transmitOpen, setTransmitOpen] = useState(false);
	const [returnOpen, setReturnOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [disperseOpen, setDisperseOpen] = useState(false);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	// ── Queries / Mutations ──────────────────────────────────────────────
	const { data: item, isPending } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getItem,
		{ itemId },
	);

	const { mutateAsync: sendCorrespondance, isPending: isSending } = useConvexMutationQuery(
		api.functions.correspondanceCore.sendCorrespondance,
	);
	const { mutateAsync: deleteItem } = useConvexMutationQuery(
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

	// ── Données dérivées (calculs purs sans hooks) ───────────────────────
	const isCopy = item ? (item as any).isCopy === true : false;
	const isDeleted = item ? !!(item as any).deletedAt : false;
	const allDocs: DocItem[] = item ? ((item as any).documents ?? []) : [];

	// ── Groupements documents (hook AVANT le early return) ───────────────
	const groups = useMemo(() => {
		const principal: Array<{ doc: DocItem; index: number }> = [];
		const annexes: Array<{ doc: DocItem; index: number }> = [];
		const signed: Array<{ doc: DocItem; index: number }> = [];
		allDocs.forEach((doc, index) => {
			if (isSignedDoc(index, signatures as SignatureLike[] | undefined)) {
				signed.push({ doc, index });
			} else if (doc.isMainDocument) {
				principal.push({ doc, index });
			} else {
				annexes.push({ doc, index });
			}
		});
		return { principal, annexes, signed };
	}, [allDocs, signatures]);

	// ── Loader (toujours après tous les hooks) ───────────────────────────
	if (isPending || !item) {
		return (
			<div className="flex h-96 items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const selectedDoc = allDocs[selectedDocIndex] ?? allDocs[0];
	const stCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;
	const prCfg =
		item.priority && PRIORITY_LABELS[item.priority]
			? PRIORITY_LABELS[item.priority]
			: null;

	// ── Onglet par défaut ────────────────────────────────────────────────
	const defaultTab: string =
		item.status === "pending"
			? "approval"
			: isCopy
				? "tracking"
				: "activity";

	// ── Handlers ─────────────────────────────────────────────────────────
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
					? { label: "Voir", onClick: () => router.push(`/idocument?id=${firstDocId}`) }
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
				| { ok: true; provider: string; charsExtracted: number; pageCount?: number }
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
		input.accept = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx";
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
		const order = allDocs.map((_, i) => i);
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
		const order = allDocs.map((_, i) => i);
		const [moved] = order.splice(fromIndex, 1);
		order.splice(toIndex, 0, moved);
		try {
			await reorderDocuments({ itemId, newOrder: order });
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du réordonnancement");
		}
	};

	// ── Conditions actions ───────────────────────────────────────────────
	const canShowOcr =
		item.status === "received" &&
		!isDeleted &&
		!(item.tags ?? []).includes("ocr-processed") &&
		(item.documents ?? []).some(
			(d: any) =>
				d.mimeType === "application/pdf" || (d.mimeType ?? "").startsWith("image/"),
		);
	const canDisperse =
		item.status === "received" && !isDeleted && allDocs.length > 1;
	const canRegister =
		item.status === "received" && !isDeleted && !(item as any).arrivalReference;

	// ── Render ───────────────────────────────────────────────────────────
	return (
		<div className="flex h-[calc(100vh-9rem)] min-h-[640px] flex-col gap-3">
			{/* ── Barre de navigation + actions ─────────────────────── */}
			<div className="flex items-center gap-2 rounded-xl border bg-card/40 px-3 py-2">
				<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
					<ArrowLeft className="h-3.5 w-3.5" />
					{t("icorrespondance.actions.back")}
				</Button>

				<div className="flex min-w-0 flex-1 items-center gap-2">
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
							isCopy ? "bg-zinc-500/10" : "bg-primary/10",
						)}
					>
						<FolderOpen className={cn("h-4 w-4", isCopy ? "text-zinc-400" : "text-primary")} />
					</div>
					<div className="flex min-w-0 flex-col">
						<div className="flex items-center gap-2">
							<span className="font-mono text-[10px] text-muted-foreground">{item.reference}</span>
							<Badge className={cn("text-[9px]", stCfg.color)}>{stCfg.label}</Badge>
							{prCfg ? <Badge className={cn("text-[9px]", prCfg.color)}>{prCfg.label}</Badge> : null}
							{isCopy ? (
								<span className="rounded bg-muted/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
									{t("icorrespondance.detail.copy")}
								</span>
							) : null}
						</div>
						<h2 className="truncate text-sm font-semibold">{item.title}</h2>
					</div>
				</div>

				{InlineAISuggestion ? (
					<InlineAISuggestion targetType="correspondanceItem" targetId={itemId} />
				) : null}

				{/* Actions primaires (toujours visibles selon contexte) */}
				{item.status === "received" && !isDeleted && !isCopy ? (
					<>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setTransmitOpen(true)}
							className="gap-1.5"
						>
							<Forward className="h-3.5 w-3.5" />
							{t("icorrespondance.actions.transmit")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setRespondOpen(true)}
							className="gap-1.5"
						>
							<Reply className="h-3.5 w-3.5" />
							{t("icorrespondance.actions.reply")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setReturnOpen(true)}
							className="gap-1.5"
						>
							<Undo2 className="h-3.5 w-3.5" />
							{t("icorrespondance.actions.return")}
						</Button>
					</>
				) : null}

				{item.status === "draft" && !isCopy && !isDeleted ? (
					<Button
						size="sm"
						onClick={handleSend}
						disabled={isSending}
						className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
					>
						{isSending ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Send className="h-3.5 w-3.5" />
						)}
						{t("icorrespondance.actions.send")}
					</Button>
				) : null}

				{isDeleted ? (
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
				) : null}

				{/* Menu actions secondaires */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Plus d'actions">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						{item.status === "draft" && !isCopy && !isDeleted ? (
							<>
								<DropdownMenuItem onClick={() => setEditOpen(true)}>
									<Pencil className="mr-2 h-3.5 w-3.5" />
									{t("icorrespondance.actions.edit")}
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
									{isGeneratingPdf ? (
										<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
									) : (
										<FileText className="mr-2 h-3.5 w-3.5" />
									)}
									{t("icorrespondance.actions.generateOfficial")}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
							</>
						) : null}

						{canRegister ? (
							<DropdownMenuItem onClick={handleRegisterIncoming} disabled={isRegistering}>
								{isRegistering ? (
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
								) : (
									<BookmarkCheck className="mr-2 h-3.5 w-3.5" />
								)}
								{t("icorrespondance.actions.register")}
							</DropdownMenuItem>
						) : null}

						{canShowOcr ? (
							<DropdownMenuItem onClick={handleRunOcr} disabled={isOcrRunning}>
								{isOcrRunning ? (
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
								) : (
									<ScanText className="mr-2 h-3.5 w-3.5" />
								)}
								OCR
							</DropdownMenuItem>
						) : null}

						{canDisperse ? (
							<DropdownMenuItem onClick={() => setDisperseOpen(true)}>
								<Send className="mr-2 h-3.5 w-3.5" />
								{t("icorrespondance.disperse.action")}
							</DropdownMenuItem>
						) : null}

						<DropdownMenuItem onClick={handleClasser}>
							<Archive className="mr-2 h-3.5 w-3.5" />
							{t("icorrespondance.actions.classify")}
						</DropdownMenuItem>

						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleDelete}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 className="mr-2 h-3.5 w-3.5" />
							{t("icorrespondance.actions.delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* ── Layout 3 colonnes ─────────────────────────────────── */}
			<div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_380px]">
				{/* ───── Colonne 1 : Documents groupés ───── */}
				<DocumentsColumn
					groups={groups}
					selectedIndex={selectedDocIndex}
					onSelect={setSelectedDocIndex}
					isCopy={isCopy}
					isDeleted={isDeleted}
					totalCount={allDocs.length}
					isAddingDoc={isAddingDoc}
					onAdd={handleAddDoc}
					onImport={() => setImportOpen(true)}
					onRemove={handleRemoveDoc}
					onMoveUp={(i) => moveDoc(i, -1)}
					onMoveDown={(i) => moveDoc(i, 1)}
					draggingIndex={draggingIndex}
					dragOverIndex={dragOverIndex}
					setDraggingIndex={setDraggingIndex}
					setDragOverIndex={setDragOverIndex}
					reorderTo={reorderTo}
				/>

				{/* ───── Colonne 2 : Viewer ───── */}
				<ViewerArea
					doc={selectedDoc}
					index={selectedDocIndex}
					isCopy={isCopy}
					itemStatus={item.status}
					isSigning={isSigning}
					onSign={() => handleSignDoc(selectedDocIndex)}
					onExpand={() =>
						setExpandedDoc({
							id: selectedDoc?.id || String(selectedDocIndex),
							title: selectedDoc?.filename ?? "",
							url: selectedDoc?.url ?? undefined,
							mimeType: selectedDoc?.mimeType,
						})
					}
				/>

				{/* ───── Colonne 3 : Sidebar onglets ───── */}
				<SidebarTabs
					item={item}
					itemId={itemId}
					currentUserId={currentUserId}
					signatures={signatures}
					isCopy={isCopy}
					defaultTab={defaultTab}
				/>
			</div>

			{/* ── Modal plein écran ─────────────────────────────────── */}
			<DocumentViewerModal
				isOpen={!!expandedDoc}
				onClose={() => setExpandedDoc(null)}
				document={expandedDoc}
			/>

			{/* ── Dialogs existants ─────────────────────────────────── */}
			{item.status === "draft" && !isCopy ? (
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
			) : null}

			{item.status === "received" ? (
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
						priority: item.priority as "normal" | "urgent" | "confidentiel" | undefined,
					}}
				/>
			) : null}

			{item.status === "received" && !isCopy ? (
				<TransmitDialog
					open={transmitOpen}
					onClose={() => setTransmitOpen(false)}
					item={{
						_id: item._id as Id<"correspondanceItems">,
						reference: item.reference,
						title: item.title,
						priority: item.priority as
							| "normal"
							| "urgent"
							| "confidentiel"
							| undefined,
						confidentialite: item.confidentialite as
							| "standard"
							| "confidentiel"
							| "secret"
							| undefined,
						documents: allDocs.map((d) => ({
							storageId: d.storageId,
							filename: d.filename,
							label: d.label,
							sizeBytes: d.sizeBytes,
							isMainDocument: !!d.isMainDocument,
						})),
					}}
					currentOrgId={currentOrgId as Id<"orgs">}
				/>
			) : null}

			{item.status === "received" && !isCopy ? (
				<ReturnToSenderDialog
					open={returnOpen}
					onClose={() => setReturnOpen(false)}
					item={{
						_id: item._id as Id<"correspondanceItems">,
						reference: item.reference,
						title: item.title,
						senderName: item.senderName,
						senderOrg: item.senderOrg,
					}}
				/>
			) : null}

			{!isCopy && !isDeleted ? (
				<ImportFromIDocumentDialog
					open={importOpen}
					onClose={() => setImportOpen(false)}
					correspondanceItemId={item._id as Id<"correspondanceItems">}
					orgId={currentOrgId as Id<"orgs">}
				/>
			) : null}

			{canDisperse ? (
				<DisperseDialog
					open={disperseOpen}
					onOpenChange={setDisperseOpen}
					itemId={item._id as Id<"correspondanceItems">}
					documents={allDocs.map((d) => ({
						filename: d.filename,
						label: d.label,
						storageId: d.storageId,
						isMainDocument: !!d.isMainDocument,
					}))}
				/>
			) : null}
		</div>
	);
}

// ═════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═════════════════════════════════════════════════════════════════════════════

// ── Colonne documents groupés + drag-drop ──────────────────────────────────

interface DocumentsColumnProps {
	groups: {
		principal: Array<{ doc: DocItem; index: number }>;
		annexes: Array<{ doc: DocItem; index: number }>;
		signed: Array<{ doc: DocItem; index: number }>;
	};
	selectedIndex: number;
	onSelect: (index: number) => void;
	isCopy: boolean;
	isDeleted: boolean;
	totalCount: number;
	isAddingDoc: boolean;
	onAdd: () => void;
	onImport: () => void;
	onRemove: (index: number) => void;
	onMoveUp: (index: number) => void;
	onMoveDown: (index: number) => void;
	draggingIndex: number | null;
	dragOverIndex: number | null;
	setDraggingIndex: (i: number | null) => void;
	setDragOverIndex: (i: number | null) => void;
	reorderTo: (from: number, to: number) => Promise<void>;
}

function DocumentsColumn({
	groups,
	selectedIndex,
	onSelect,
	isCopy,
	isDeleted,
	totalCount,
	isAddingDoc,
	onAdd,
	onImport,
	onRemove,
	onMoveUp,
	onMoveDown,
	draggingIndex,
	dragOverIndex,
	setDraggingIndex,
	setDragOverIndex,
	reorderTo,
}: DocumentsColumnProps) {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/30">
			<div className="flex items-center justify-between border-b px-3 py-2">
				<h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
					<Paperclip className="h-3 w-3" />
					{t("icorrespondance.detail.documents")} ({totalCount})
				</h3>
				{!isCopy && !isDeleted ? (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={onImport}
							className="h-7 gap-1 px-2 text-[11px]"
							title={t("icorrespondance.import.title")}
						>
							<Import className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={onAdd}
							disabled={isAddingDoc}
							className="h-7 gap-1 px-2 text-[11px]"
						>
							{isAddingDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
						</Button>
					</div>
				) : null}
			</div>

			<div className="flex-1 space-y-4 overflow-y-auto p-3">
				{groups.principal.length > 0 ? (
					<DocGroup
						title="Pièce maîtresse"
						icon={<Stamp className="h-3 w-3" />}
						count={groups.principal.length}
						entries={groups.principal}
						selectedIndex={selectedIndex}
						onSelect={onSelect}
						onRemove={onRemove}
						onMoveUp={onMoveUp}
						onMoveDown={onMoveDown}
						isCopy={isCopy}
						isDeleted={isDeleted}
						totalCount={totalCount}
						size="large"
						draggingIndex={draggingIndex}
						dragOverIndex={dragOverIndex}
						setDraggingIndex={setDraggingIndex}
						setDragOverIndex={setDragOverIndex}
						reorderTo={reorderTo}
					/>
				) : null}
				{groups.annexes.length > 0 ? (
					<DocGroup
						title="Annexes"
						icon={<Paperclip className="h-3 w-3" />}
						count={groups.annexes.length}
						entries={groups.annexes}
						selectedIndex={selectedIndex}
						onSelect={onSelect}
						onRemove={onRemove}
						onMoveUp={onMoveUp}
						onMoveDown={onMoveDown}
						isCopy={isCopy}
						isDeleted={isDeleted}
						totalCount={totalCount}
						size="small"
						draggingIndex={draggingIndex}
						dragOverIndex={dragOverIndex}
						setDraggingIndex={setDraggingIndex}
						setDragOverIndex={setDragOverIndex}
						reorderTo={reorderTo}
					/>
				) : null}
				{groups.signed.length > 0 ? (
					<DocGroup
						title="Pièces signées"
						icon={<ShieldCheck className="h-3 w-3" />}
						count={groups.signed.length}
						entries={groups.signed}
						selectedIndex={selectedIndex}
						onSelect={onSelect}
						onRemove={onRemove}
						onMoveUp={onMoveUp}
						onMoveDown={onMoveDown}
						isCopy={isCopy}
						isDeleted={isDeleted}
						totalCount={totalCount}
						size="large"
						draggingIndex={draggingIndex}
						dragOverIndex={dragOverIndex}
						setDraggingIndex={setDraggingIndex}
						setDragOverIndex={setDragOverIndex}
						reorderTo={reorderTo}
					/>
				) : null}
				{totalCount === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground">
						<FileText className="h-8 w-8 text-muted-foreground/30" />
						Aucun document attaché
					</div>
				) : null}
			</div>
		</div>
	);
}

// ── Groupe de documents (sous-section) ─────────────────────────────────────

interface DocGroupProps {
	title: string;
	icon: React.ReactNode;
	count: number;
	entries: Array<{ doc: DocItem; index: number }>;
	selectedIndex: number;
	onSelect: (index: number) => void;
	onRemove: (index: number) => void;
	onMoveUp: (index: number) => void;
	onMoveDown: (index: number) => void;
	isCopy: boolean;
	isDeleted: boolean;
	totalCount: number;
	size: "large" | "small";
	draggingIndex: number | null;
	dragOverIndex: number | null;
	setDraggingIndex: (i: number | null) => void;
	setDragOverIndex: (i: number | null) => void;
	reorderTo: (from: number, to: number) => Promise<void>;
}

function DocGroup({
	title,
	icon,
	count,
	entries,
	selectedIndex,
	onSelect,
	onRemove,
	onMoveUp,
	onMoveDown,
	isCopy,
	isDeleted,
	totalCount,
	size,
	draggingIndex,
	dragOverIndex,
	setDraggingIndex,
	setDragOverIndex,
	reorderTo,
}: DocGroupProps) {
	const [open, setOpen] = useState(true);
	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="mb-2 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
			>
				<span className="flex items-center gap-1.5">
					{icon}
					{title}
					<span className="text-muted-foreground/60">({count})</span>
				</span>
				<span className="text-muted-foreground/60">{open ? "−" : "+"}</span>
			</button>
			{open ? (
				<div
					className={cn(
						"grid gap-2",
						size === "small" ? "grid-cols-2" : "grid-cols-1",
					)}
				>
					{entries.map(({ doc, index }) => (
						<Thumbnail
							key={doc.storageId ?? index}
							doc={doc}
							index={index}
							isSelected={selectedIndex === index}
							onSelect={onSelect}
							onRemove={onRemove}
							onMoveUp={onMoveUp}
							onMoveDown={onMoveDown}
							isCopy={isCopy}
							isDeleted={isDeleted}
							canReorderUp={index > 0}
							canReorderDown={index < totalCount - 1}
							draggingIndex={draggingIndex}
							dragOverIndex={dragOverIndex}
							setDraggingIndex={setDraggingIndex}
							setDragOverIndex={setDragOverIndex}
							reorderTo={reorderTo}
							canDrag={!isCopy && !isDeleted && totalCount > 1}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

// ── Vignette unitaire ──────────────────────────────────────────────────────

interface ThumbnailProps {
	doc: DocItem;
	index: number;
	isSelected: boolean;
	onSelect: (index: number) => void;
	onRemove: (index: number) => void;
	onMoveUp: (index: number) => void;
	onMoveDown: (index: number) => void;
	isCopy: boolean;
	isDeleted: boolean;
	canReorderUp: boolean;
	canReorderDown: boolean;
	canDrag: boolean;
	draggingIndex: number | null;
	dragOverIndex: number | null;
	setDraggingIndex: (i: number | null) => void;
	setDragOverIndex: (i: number | null) => void;
	reorderTo: (from: number, to: number) => Promise<void>;
}

function Thumbnail({
	doc,
	index,
	isSelected,
	onSelect,
	onRemove,
	onMoveUp,
	onMoveDown,
	isCopy,
	isDeleted: _isDeleted,
	canReorderUp,
	canReorderDown,
	canDrag,
	draggingIndex,
	dragOverIndex,
	setDraggingIndex,
	setDragOverIndex,
	reorderTo,
}: ThumbnailProps) {
	const { t } = useTranslation();
	const label = doc.label ?? doc.filename;
	const isDragging = draggingIndex === index;
	const isDragTarget =
		dragOverIndex === index && draggingIndex !== null && draggingIndex !== index;
	const isPdf =
		doc.mimeType === "application/pdf" || doc.filename.toLowerCase().endsWith(".pdf");
	const isImage = doc.mimeType?.startsWith("image/");

	return (
		<div
			className={cn(
				"group flex flex-col gap-1 transition-all",
				canDrag && "cursor-grab active:cursor-grabbing",
				isDragging && "opacity-40",
				isDragTarget && "rounded ring-2 ring-primary/60 ring-offset-1",
			)}
			draggable={canDrag}
			onDragStart={(e) => {
				if (!canDrag) return;
				setDraggingIndex(index);
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", String(index));
			}}
			onDragEnd={() => {
				setDraggingIndex(null);
				setDragOverIndex(null);
			}}
			onDragOver={(e) => {
				if (!canDrag || draggingIndex === null) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				if (dragOverIndex !== index) setDragOverIndex(index);
			}}
			onDragLeave={() => {
				if (dragOverIndex === index) setDragOverIndex(null);
			}}
			onDrop={(e) => {
				if (!canDrag || draggingIndex === null) return;
				e.preventDefault();
				const from = draggingIndex;
				setDraggingIndex(null);
				setDragOverIndex(null);
				if (from !== index) reorderTo(from, index);
			}}
		>
			<div
				className={cn(
					"relative cursor-pointer overflow-hidden rounded border bg-white shadow-sm transition aspect-[210/297] hover:shadow-md",
					isSelected && "ring-2 ring-primary/70 ring-offset-2",
				)}
				onClick={() => onSelect(index)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") onSelect(index);
				}}
				role="button"
				tabIndex={0}
				aria-label={`Sélectionner ${label}`}
			>
				{isPdf && doc.url ? (
					<PdfViewer url={doc.url} mode="thumbnail" />
				) : isImage && doc.url ? (
					// biome-ignore lint/a11y/useAltText: alt défini ci-dessous
					<img src={doc.url} alt={label} className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
						<FileText className="h-8 w-8 text-muted-foreground/40" />
						<span className="break-words text-[10px] font-medium text-muted-foreground">
							{label}
						</span>
					</div>
				)}

				{/* Badge type */}
				<div className="absolute left-1 top-1">
					<span className="rounded bg-background/90 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
						{isPdf ? "PDF" : isImage ? "IMG" : "DOC"}
					</span>
				</div>

				{/* Drag handle visible au hover */}
				{canDrag ? (
					<div
						className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-background/90 px-1 py-0.5 text-[8px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
						title={t("icorrespondance.detail.dragToReorder")}
					>
						<GripVertical className="h-2.5 w-2.5" />
					</div>
				) : null}

				{/* Menu actions */}
				{!isCopy ? (
					<div className="absolute right-1 top-1">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 bg-background/90 shadow-sm"
									onClick={(e) => e.stopPropagation()}
									aria-label="Actions document"
								>
									<MoreHorizontal className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{doc.url ? (
									<DropdownMenuItem asChild>
										<a href={doc.url} download={doc.filename} target="_blank" rel="noopener noreferrer">
											<Download className="mr-2 h-3.5 w-3.5" />
											{t("icorrespondance.actions.download")}
										</a>
									</DropdownMenuItem>
								) : null}
								{canReorderUp ? (
									<DropdownMenuItem onClick={() => onMoveUp(index)}>
										<ArrowUp className="mr-2 h-3.5 w-3.5" />
										{t("icorrespondance.detail.moveUp")}
									</DropdownMenuItem>
								) : null}
								{canReorderDown ? (
									<DropdownMenuItem onClick={() => onMoveDown(index)}>
										<ArrowDown className="mr-2 h-3.5 w-3.5" />
										{t("icorrespondance.detail.moveDown")}
									</DropdownMenuItem>
								) : null}
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => onRemove(index)} className="text-destructive">
									<Trash2 className="mr-2 h-3.5 w-3.5" />
									{t("icorrespondance.detail.removeFromFolder")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				) : null}
			</div>
			<p className="truncate px-0.5 text-[10px] font-medium" title={label}>
				{label}
			</p>
		</div>
	);
}

// ── Zone viewer central ────────────────────────────────────────────────────

interface ViewerAreaProps {
	doc: DocItem | undefined;
	index: number;
	isCopy: boolean;
	itemStatus: string;
	isSigning: boolean;
	onSign: () => void;
	onExpand: () => void;
}

function ViewerArea({ doc, isCopy, itemStatus, isSigning, onSign, onExpand }: ViewerAreaProps) {
	if (!doc) {
		return (
			<div className="flex h-full flex-col items-center justify-center rounded-xl border bg-card/30 text-center text-sm text-muted-foreground">
				<FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
				Sélectionnez un document à gauche pour le visualiser
			</div>
		);
	}

	const isPdf =
		doc.mimeType === "application/pdf" || doc.filename.toLowerCase().endsWith(".pdf");
	const isImage = doc.mimeType?.startsWith("image/");
	const canSign =
		!isCopy && isPdf && ["draft", "pending", "approved"].includes(itemStatus);

	return (
		<div
			className={cn(
				"relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card",
				isCopy && "relative",
			)}
		>
			{/* Filigrane COPIE */}
			{isCopy ? (
				<div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
					<span className="rotate-[-30deg] select-none text-6xl font-black text-muted-foreground/10">
						COPIE
					</span>
				</div>
			) : null}

			{/* Header viewer */}
			<div className="flex items-center justify-between gap-2 border-b px-3 py-2">
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium" title={doc.filename}>
						{doc.label ?? doc.filename}
					</p>
					<p className="text-[10px] text-muted-foreground">
						{formatBytes(doc.sizeBytes)} • {doc.mimeType ?? "fichier"}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					{canSign ? (
						<Button
							variant="outline"
							size="sm"
							onClick={onSign}
							disabled={isSigning}
							className="gap-1.5"
							title="Signer électroniquement ce document"
						>
							{isSigning ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<FileCheck2 className="h-3.5 w-3.5" />
							)}
							Signer
						</Button>
					) : null}
					{doc.url ? (
						<Button variant="outline" size="sm" asChild className="gap-1.5">
							<a
								href={doc.url}
								download={doc.filename}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Download className="h-3.5 w-3.5" />
								Télécharger
							</a>
						</Button>
					) : null}
				</div>
			</div>

			{/* Contenu viewer */}
			<motion.div
				layoutId={`doc-card-${doc.id || doc.storageId}`}
				className="min-h-0 flex-1 bg-muted/10"
			>
				{!doc.url ? (
					<div className="flex h-full items-center justify-center">
						<div className="space-y-2 text-center">
							<Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/30" />
							<p className="text-sm text-muted-foreground">Chargement du document…</p>
						</div>
					</div>
				) : isPdf ? (
					<PdfViewer url={doc.url} mode="full" onExpand={onExpand} />
				) : isImage ? (
					<div className="flex h-full w-full items-center justify-center overflow-auto p-4">
						<img
							src={doc.url}
							alt={doc.filename}
							className="max-h-full max-w-full object-contain shadow-md"
						/>
					</div>
				) : (
					<div className="flex h-full items-center justify-center">
						<div className="space-y-3 text-center">
							<FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
							<p className="text-sm font-medium">{doc.filename}</p>
							<p className="mx-auto max-w-[250px] text-xs text-muted-foreground/60">
								Aperçu non disponible pour ce format ({doc.mimeType}).
							</p>
							<Button variant="outline" size="sm" asChild className="mt-4 gap-1.5">
								<a
									href={doc.url}
									download={doc.filename}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Download className="h-3.5 w-3.5" />
									Télécharger
								</a>
							</Button>
						</div>
					</div>
				)}
			</motion.div>
		</div>
	);
}

// ── Sidebar onglets ────────────────────────────────────────────────────────

interface SidebarTabsProps {
	item: any;
	itemId: Id<"correspondanceItems">;
	currentUserId: string;
	signatures: any;
	isCopy: boolean;
	defaultTab: string;
}

function SidebarTabs({
	item,
	itemId,
	currentUserId,
	signatures,
	isCopy,
	defaultTab,
}: SidebarTabsProps) {
	return (
		<div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/30">
			<Tabs defaultValue={defaultTab} className="flex h-full min-h-0 flex-col gap-0">
				<TabsList className="m-2 grid w-auto grid-cols-3 lg:grid-cols-4">
					<TabsTrigger value="details" className="text-xs">
						Détails
					</TabsTrigger>
					<TabsTrigger value="activity" className="text-xs">
						<MessageCircle className="mr-1 h-3 w-3" />
						Activité
					</TabsTrigger>
					<TabsTrigger value="signatures" className="text-xs">
						<ShieldCheck className="mr-1 h-3 w-3" />
						Sceaux
					</TabsTrigger>
					{item.status === "pending" ? (
						<TabsTrigger value="approval" className="text-xs">
							Validation
						</TabsTrigger>
					) : null}
					{isCopy ? (
						<TabsTrigger value="tracking" className="text-xs">
							Suivi
						</TabsTrigger>
					) : null}
				</TabsList>

				<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
					<TabsContent value="details" className="mt-0 space-y-3">
						<DetailsPanel item={item} />
					</TabsContent>

					<TabsContent value="activity" className="mt-0 space-y-4">
						<AnnotationsPanel itemId={itemId} currentUserId={currentUserId} />
						<WorkflowTimelineWrapper itemId={itemId} />
					</TabsContent>

					<TabsContent value="signatures" className="mt-0">
						<SignaturesPanel signatures={signatures} />
					</TabsContent>

					{item.status === "pending" ? (
						<TabsContent value="approval" className="mt-0">
							<ApprovalPanel
								itemId={itemId}
								currentUserId={currentUserId}
								status={item.status}
							/>
						</TabsContent>
					) : null}

					{isCopy ? (
						<TabsContent value="tracking" className="mt-0">
							<TrackingTimeline
								itemId={itemId}
								sentAt={(item as any).sentAt}
								recipientStatus={(item as any).recipientStatus}
								recipientStatusUpdatedAt={(item as any).recipientStatusUpdatedAt}
								arrivalReference={(item as any).arrivalReference}
								arrivalDate={(item as any).arrivalDate}
							/>
						</TabsContent>
					) : null}
				</div>
			</Tabs>
		</div>
	);
}

// ── Panneau détails (métadonnées dossier) ──────────────────────────────────

function DetailsPanel({ item }: { item: any }) {
	return (
		<div className="space-y-3 text-xs">
			<Field label="Référence" value={<span className="font-mono">{item.reference}</span>} />
			<Field label="Type" value={item.type ?? "—"} />
			<div className="grid grid-cols-2 gap-3">
				<Field label="Créé le" value={formatDate(item._creationTime)} />
				{item.sentAt ? <Field label="Envoyé le" value={formatDate(item.sentAt)} /> : null}
				{item.arrivalDate ? (
					<Field label="Reçu le" value={formatDate(item.arrivalDate)} />
				) : null}
				{item.dateReponseAttendue ? (
					<Field label="Réponse attendue" value={formatDate(item.dateReponseAttendue)} />
				) : null}
			</div>
			{item.arrivalReference ? (
				<Field
					label="N° d'arrivée"
					value={<span className="font-mono">{item.arrivalReference}</span>}
				/>
			) : null}

			<div className="pt-2">
				<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					Expéditeur
				</p>
				<p className="font-medium">{item.senderName}</p>
				{item.senderOrg ? <p className="text-muted-foreground">{item.senderOrg}</p> : null}
				{item.senderEmail ? (
					<p className="text-muted-foreground">{item.senderEmail}</p>
				) : null}
			</div>

			<div>
				<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					Destinataire
				</p>
				<p className="font-medium">{item.recipientName}</p>
				{item.recipientOrg ? (
					<p className="text-muted-foreground">{item.recipientOrg}</p>
				) : null}
				{item.recipientEmail ? (
					<p className="text-muted-foreground">{item.recipientEmail}</p>
				) : null}
			</div>

			{item.comment ? (
				<div className="pt-2">
					<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Commentaire
					</p>
					<p className="border-l-2 border-primary/30 pl-2 italic text-muted-foreground">
						{item.comment}
					</p>
				</div>
			) : null}

			{item.tags && item.tags.length > 0 ? (
				<div className="pt-2">
					<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Tags
					</p>
					<div className="flex flex-wrap gap-1">
						{item.tags.map((tag: string) => (
							<Badge key={tag} variant="outline" className="text-[9px]">
								{tag}
							</Badge>
						))}
					</div>
				</div>
			) : null}

			{item.transmissionBordereauStorageId ? (
				<BordereauDownloadField itemId={item._id as Id<"correspondanceItems">} />
			) : null}

			{item.returnedReason ? (
				<div className="pt-2">
					<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Motif du renvoi
					</p>
					{item.returnedCategory ? (
						<Badge variant="outline" className="mb-1 text-[9px]">
							{item.returnedCategory}
						</Badge>
					) : null}
					<p className="border-l-2 border-destructive/40 pl-2 italic text-muted-foreground">
						{item.returnedReason}
					</p>
				</div>
			) : null}
		</div>
	);
}

function BordereauDownloadField({
	itemId,
}: {
	itemId: Id<"correspondanceItems">;
}) {
	const { data: url } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.getTransmissionBordereauUrl,
		{ itemId },
	);
	if (!url) {
		return (
			<div className="pt-2">
				<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					Bordereau de transmission
				</p>
				<p className="text-[10px] italic text-muted-foreground">
					Génération en cours…
				</p>
			</div>
		);
	}
	return (
		<div className="pt-2">
			<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				Bordereau de transmission
			</p>
			<a
				href={url as string}
				download
				className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
			>
				<Download className="h-3 w-3" />
				Télécharger le PDF
			</a>
		</div>
	);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div>
			<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</p>
			<p>{value}</p>
		</div>
	);
}

// ── Wrapper Workflow timeline ──────────────────────────────────────────────

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
