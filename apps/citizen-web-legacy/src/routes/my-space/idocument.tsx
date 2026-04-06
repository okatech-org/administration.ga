"use client";

import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
	Search, Shield, Clock, AlertTriangle,
	FileText, Folder, FolderOpen,
	Loader2, X, Download, Eye,
	MoreHorizontal, Info, Trash2, User,
	LayoutGrid, List, Columns3, ChevronRight,
	Plus, ScrollText, Flag, Home, Briefcase, Wallet,
	Award, Stamp, Scale, FileCheck, Building2, Car,
	GraduationCap, Heart, Receipt, ClipboardList,
	Languages, UploadCloud, FileIcon,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { useConvex } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	type DetailedDocumentType,
	DOCUMENT_TYPES_BY_CATEGORY,
	DocumentTypeCategory,
} from "@convex/lib/constants";

import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { DynamicFolderIcon } from "@/components/icons/DynamicFolderIcon";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-space/idocument")({
	component: IDocumentPage,
});

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ViewMode = "grid" | "list" | "column";

type VaultFile = {
	storageId: Id<"_storage">;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	uploadedAt: number;
};

type VaultDocument = {
	_id: Id<"documents">;
	files: VaultFile[];
	documentType?: string;
	category?: DocumentTypeCategory;
	label?: string;
	expiresAt?: number;
	status?: string;
	_creationTime: number;
	updatedAt?: number;
};

type SystemFolderId = "__all" | "__trash" | "__vault";
type FolderId = SystemFolderId | SmartFolderId | DocumentTypeCategory;

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CFG: Record<string, { label: string; class: string; dot: string }> = {
	pending: { label: "En attente", class: "badge-warning border-transparent", dot: "bg-warning" },
	validated: { label: "Validé", class: "badge-success border-transparent", dot: "bg-success" },
	rejected: { label: "Rejeté", class: "badge-destructive border-transparent", dot: "bg-destructive" },
	expired: { label: "Expiré", class: "bg-muted text-muted-foreground border-transparent", dot: "bg-muted-foreground" },
	expiring: { label: "Expire bientôt", class: "badge-warning border-transparent", dot: "bg-warning" },
};

// ─── 2 Dossiers métier consulaire ────────────────────────────
// Les documents nécessaires aux démarches consulaires regroupés en 2 dossiers

type SmartFolderId = "identity_civil" | "official_docs";

interface SmartFolder {
	id: SmartFolderId;
	name: string;
	description: string;
	icon: React.ElementType;
	color: string;
	iconColor: string;
	categories: DocumentTypeCategory[];
}

const SMART_FOLDERS: SmartFolder[] = [
	{
		id: "identity_civil",
		name: "Identité & État civil",
		description: "Passeport, acte de naissance, nationalité, résidence, emploi",
		icon: User,
		color: "text-primary",
		iconColor: "text-primary",
		categories: [
			DocumentTypeCategory.Identity,
			DocumentTypeCategory.CivilStatus,
			DocumentTypeCategory.Nationality,
			DocumentTypeCategory.Residence,
			DocumentTypeCategory.Housing,
			DocumentTypeCategory.Employment,
			DocumentTypeCategory.Income,
			DocumentTypeCategory.Education,
			DocumentTypeCategory.LanguageIntegration,
			DocumentTypeCategory.Health,
			DocumentTypeCategory.Vehicle,
		],
	},
	{
		id: "official_docs",
		name: "Documents officiels",
		description: "Attestations, actes, justice, décisions, formulaires",
		icon: Stamp,
		color: "text-warning",
		iconColor: "text-warning",
		categories: [
			DocumentTypeCategory.Certificates,
			DocumentTypeCategory.OfficialCertificates,
			DocumentTypeCategory.Justice,
			DocumentTypeCategory.AdministrativeDecisions,
			DocumentTypeCategory.Forms,
			DocumentTypeCategory.Taxation,
			DocumentTypeCategory.Other,
		],
	},
];

// Legacy mapping for individual category display on document cards
const CATEGORY_CONFIG: Record<string, { name: string; icon: React.ElementType; color: string; iconColor: string }> = {
	[DocumentTypeCategory.Identity]: { name: "Identité", icon: User, color: "text-primary", iconColor: "text-primary" },
	[DocumentTypeCategory.CivilStatus]: { name: "État civil", icon: ScrollText, color: "text-primary", iconColor: "text-primary" },
	[DocumentTypeCategory.Nationality]: { name: "Nationalité", icon: Flag, color: "text-success", iconColor: "text-success" },
	[DocumentTypeCategory.Residence]: { name: "Résidence", icon: Home, color: "text-warning", iconColor: "text-warning" },
	[DocumentTypeCategory.Employment]: { name: "Emploi", icon: Briefcase, color: "text-primary", iconColor: "text-primary" },
	[DocumentTypeCategory.Income]: { name: "Revenus", icon: Wallet, color: "text-success", iconColor: "text-success" },
	[DocumentTypeCategory.Certificates]: { name: "Attestations", icon: Award, color: "text-warning", iconColor: "text-warning" },
	[DocumentTypeCategory.OfficialCertificates]: { name: "Actes officiels", icon: Stamp, color: "text-warning", iconColor: "text-warning" },
	[DocumentTypeCategory.Justice]: { name: "Justice", icon: Scale, color: "text-destructive", iconColor: "text-destructive" },
	[DocumentTypeCategory.AdministrativeDecisions]: { name: "Décisions admin.", icon: FileCheck, color: "text-warning", iconColor: "text-warning" },
	[DocumentTypeCategory.Housing]: { name: "Logement", icon: Building2, color: "text-success", iconColor: "text-success" },
	[DocumentTypeCategory.Vehicle]: { name: "Véhicule", icon: Car, color: "text-muted-foreground", iconColor: "text-muted-foreground" },
	[DocumentTypeCategory.Education]: { name: "Éducation", icon: GraduationCap, color: "text-primary", iconColor: "text-primary" },
	[DocumentTypeCategory.LanguageIntegration]: { name: "Langue & intégration", icon: Languages, color: "text-primary", iconColor: "text-primary" },
	[DocumentTypeCategory.Health]: { name: "Santé", icon: Heart, color: "text-destructive", iconColor: "text-destructive" },
	[DocumentTypeCategory.Taxation]: { name: "Fiscalité", icon: Receipt, color: "text-warning", iconColor: "text-warning" },
	[DocumentTypeCategory.Forms]: { name: "Formulaires", icon: ClipboardList, color: "text-muted-foreground", iconColor: "text-muted-foreground" },
	[DocumentTypeCategory.Other]: { name: "Autres", icon: FileText, color: "text-muted-foreground", iconColor: "text-muted-foreground" },
};

interface SystemFolder {
	id: SystemFolderId;
	name: string;
	icon: React.ElementType;
	isSystem: true;
}

const SYSTEM_FOLDERS: SystemFolder[] = [
	{ id: "__all", name: "Mes Documents", icon: FolderOpen, isSystem: true },
	{ id: "__trash", name: "Poubelle", icon: Trash2, isSystem: true },
	{ id: "__vault", name: "Coffre-fort", icon: Shield, isSystem: true },
];

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const fadeUp = {
	hidden: { opacity: 0, y: 16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};
const stagger = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.04 } },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

function formatSize(bytes: number) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(ts?: number) {
	if (!ts) return "—";
	return format(ts, "dd/MM/yyyy");
}

function getCategoryLabel(cat?: string): string {
	if (!cat) return "Non classé";
	return CATEGORY_CONFIG[cat]?.name ?? cat;
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/* ── VaultFolderCard — folder card with yellow icon ── */

function VaultFolderCard({ label, count, icon: CustomIcon, iconColor, onClick, className, isSelected = false }: {
	label: string; count: number; icon?: React.ElementType; iconColor?: string; onClick?: () => void; className?: string; isSelected?: boolean;
}) {
	const [isHovered, setIsHovered] = useState(false);
	return (
		<div className={cn("group relative flex flex-col items-center justify-center p-2 rounded-2xl w-full h-full", isSelected && "ring-2 ring-primary bg-foreground/[0.06] dark:bg-foreground/[0.12]", className)}>
			<motion.div role="button" tabIndex={0} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="relative flex flex-col items-center justify-center cursor-pointer outline-none rounded-xl p-3 hover:bg-muted/40 transition-colors w-[140px]">
				{CustomIcon ? (
					<div className="relative mt-1 w-full flex justify-center">
						<div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
							<CustomIcon className={cn("h-8 w-8", iconColor || "text-muted-foreground")} />
						</div>
						{count > 0 && (
							<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm">
								{count}
							</motion.span>
						)}
					</div>
				) : (
					<div className="relative mt-1 w-full flex justify-center">
						<DynamicFolderIcon count={count} size={96} hovered={isHovered} className="drop-shadow-lg" />
						{count > 0 && (
							<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 right-1 min-w-5 h-5 px-1 flex items-center justify-center gap-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm">
								<FileText className="h-2.5 w-2.5" />{count}
							</motion.span>
						)}
					</div>
				)}
				<div className="flex flex-col items-center mt-3 w-full">
					<span className="text-sm font-semibold text-foreground text-center leading-tight line-clamp-2 w-full px-1">{label}</span>
				</div>
			</motion.div>
		</div>
	);
}

/* ── VaultFileCard — document card with A4 preview ── */

function VaultFileCard({ title, iconColor = "text-muted-foreground", date, statusBadge, categoryBadge, fileCount, expirationBadge, contextMenu, onClick, isSelected = false }: {
	title: string; iconColor?: string; date?: string; statusBadge?: React.ReactNode; categoryBadge?: React.ReactNode; fileCount?: number; expirationBadge?: React.ReactNode; contextMenu?: React.ReactNode; onClick?: () => void; isSelected?: boolean;
}) {
	return (
		<div className={cn("group hover:shadow-lg transition-all duration-300 overflow-hidden border flat-card-border cursor-pointer h-full flex flex-col bg-card rounded-xl", isSelected && "ring-2 ring-primary border-primary/50 bg-primary/5")} onClick={onClick}>
			<div className="relative aspect-[1/1.414] bg-white/3 flex flex-col overflow-hidden">
				<div className="relative flex items-center px-2.5 pt-2 z-10 min-h-[20px]">
					<div className="flex items-center gap-1 shrink min-w-0">{categoryBadge}</div>
				</div>
				<div className="flex-1 flex items-center justify-center px-3 py-2">
					<div className="relative w-14 h-[72px] bg-white shadow-sm flex flex-col items-center justify-center rounded-[2px] border border-neutral-200">
						<div className="absolute top-0 left-0 w-full h-4 bg-neutral-50 border-b border-neutral-100" />
						<FileText className={cn("h-7 w-7 opacity-50", iconColor)} />
						<div className="absolute bottom-2 left-2 right-2 space-y-0.5">
							<div className="h-[2px] bg-neutral-100 rounded-full w-full" />
							<div className="h-[2px] bg-neutral-100 rounded-full w-3/4" />
							<div className="h-[2px] bg-neutral-100 rounded-full w-5/6" />
						</div>
					</div>
				</div>
				<div className="px-2.5 pb-1">
					<h3 className="font-semibold text-[11px] leading-tight truncate text-foreground/90 group-hover:text-primary transition-colors" title={title}>{title}</h3>
				</div>
				<div className="flex items-center justify-between px-2.5 pb-2 mt-auto">
					<div className="flex items-center gap-1">{statusBadge}</div>
					<div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/50">
						{fileCount !== undefined && fileCount > 1 && <span className="font-mono bg-white/4 px-1 rounded">{fileCount} fichiers</span>}
						{date && <span className="flex items-center gap-0.5 whitespace-nowrap"><Clock className="h-2 w-2" />{date}</span>}
					</div>
				</div>
				{expirationBadge && (
					<div className="px-2.5 pb-1.5">{expirationBadge}</div>
				)}
				<div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto" onClick={(e) => e.stopPropagation()}>
					{contextMenu}
				</div>
			</div>
		</div>
	);
}

/* ── ViewModeToggle ── */

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
	const modes: { value: ViewMode; icon: React.ElementType; label: string }[] = [
		{ value: "grid", icon: LayoutGrid, label: "Grille" },
		{ value: "list", icon: List, label: "Liste" },
		{ value: "column", icon: Columns3, label: "Colonnes" },
	];
	return (
		<div className="flex items-center rounded-full bg-muted p-0.5 gap-0.5">
			{modes.map((m) => (
				<button key={m.value} onClick={() => onChange(m.value)} className={cn("h-7 w-7 flex items-center justify-center rounded-full transition-all", value === m.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} title={m.label}>
					<m.icon className="h-3.5 w-3.5" />
				</button>
			))}
		</div>
	);
}

/* ── BreadcrumbPath ── */

function BreadcrumbPath({ path, onNavigate }: { path: { id: string; name: string }[]; onNavigate: (id: string | null) => void }) {
	return (
		<div className="flex items-center gap-1 text-sm flex-wrap">
			<button onClick={() => onNavigate(null)} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
				<FileText className="h-3.5 w-3.5" />
				<span className="text-xs font-medium">iDocument</span>
			</button>
			{path.map((segment, i) => (
				<React.Fragment key={segment.id}>
					<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
					{i < path.length - 1 ? (
						<button onClick={() => onNavigate(segment.id)} className="px-2 py-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs">
							{segment.name}
						</button>
					) : (
						<span className="px-2 py-1 text-xs font-medium text-foreground">{segment.name}</span>
					)}
				</React.Fragment>
			))}
		</div>
	);
}

/* ── DocumentInfoDialog ── */

function DocumentInfoDialog({ open, onClose, doc, onDownload }: {
	open: boolean; onClose: () => void; doc: VaultDocument | null; onDownload: (storageId: Id<"_storage">) => void;
}) {
	if (!open || !doc) return null;

	const catConfig = CATEGORY_CONFIG[doc.category ?? "other"];
	const statusConfig = STATUS_CFG[doc.status ?? "pending"] ?? STATUS_CFG.pending;
	const isExpired = doc.expiresAt && isPast(doc.expiresAt) && !isToday(doc.expiresAt);
	const isExpiringSoon = doc.expiresAt && !isExpired && differenceInDays(doc.expiresAt, new Date()) <= 30;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md border border-border/50 shadow-2xl bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="px-5 pt-5 pb-3 border-b border-border/50">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Info className="h-4 w-4 text-primary" />
						Détails du document
					</div>
				</div>
				<div className="px-5 py-4 space-y-4">
					{/* Title and label */}
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Nom</p>
						<p className="text-sm font-medium">{doc.label || doc.files[0]?.filename || "Document"}</p>
						{doc.documentType && (
							<p className="text-xs text-muted-foreground">Type : {doc.documentType}</p>
						)}
					</div>

					{/* Category and Status */}
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<div className="flex items-center gap-3">
							{catConfig && (
								<span className={cn("text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-muted", catConfig.color)}>
									{React.createElement(catConfig.icon, { className: "h-3 w-3" })}
									{catConfig.name}
								</span>
							)}
							<span className={cn("text-[10px] h-5 border inline-flex items-center gap-1 px-1.5 rounded-full font-medium", statusConfig.class)}>
								<span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
								{statusConfig.label}
							</span>
						</div>
					</div>

					{/* Expiration */}
					{doc.expiresAt && (
						<div className="rounded-xl bg-card border border-border/50 p-3 space-y-1">
							<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Expiration</p>
							<p className={cn("text-sm font-medium", isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : "text-foreground")}>
								{formatDate(doc.expiresAt)}
								{isExpired && " (expiré)"}
								{isExpiringSoon && ` (dans ${differenceInDays(doc.expiresAt, new Date())} jours)`}
							</p>
						</div>
					)}

					{/* Files list */}
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
							{doc.files.length} fichier(s)
						</p>
						<div className="space-y-1.5">
							{doc.files.map((file, idx) => (
								<div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
									<FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium truncate">{file.filename}</p>
										<p className="text-[10px] text-muted-foreground">{formatSize(file.sizeBytes)}</p>
									</div>
									<button
										onClick={(e) => { e.stopPropagation(); onDownload(file.storageId); }}
										className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
									>
										<Download className="h-3.5 w-3.5" />
									</button>
								</div>
							))}
						</div>
					</div>

					{/* Timestamps */}
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold flex items-center gap-1.5">
							<Clock className="h-3 w-3 text-warning" />Horodatage
						</p>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-lg bg-muted/50 border border-border/50 p-2">
								<p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Créé le</p>
								<p className="text-[11px] font-medium">{formatDate(doc._creationTime)}</p>
							</div>
							<div className="rounded-lg bg-muted/50 border border-border/50 p-2">
								<p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Modifié le</p>
								<p className="text-[11px] font-medium">{formatDate(doc.updatedAt)}</p>
							</div>
						</div>
					</div>
				</div>
				<div className="px-5 py-3 border-t border-border/50 flex justify-end">
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Fermer</button>
				</div>
			</div>
		</div>
	);
}

/* ── DeleteConfirmDialog ── */

function DeleteConfirmDialog({ open, onClose, onConfirm, docName }: {
	open: boolean; onClose: () => void; onConfirm: () => void; docName: string;
}) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-sm border border-border/50 shadow-2xl bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="px-5 pt-5 pb-3 border-b border-border/50">
					<div className="flex items-center gap-2 text-sm font-semibold text-destructive">
						<Trash2 className="h-4 w-4" />
						Confirmer la suppression
					</div>
				</div>
				<div className="px-5 py-4">
					<p className="text-sm text-muted-foreground">
						Voulez-vous vraiment supprimer <span className="font-medium text-foreground">{docName}</span> ? Cette action est irréversible.
					</p>
				</div>
				<div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
					<button onClick={() => { onConfirm(); onClose(); }} className="px-3 py-1.5 text-xs rounded-md bg-destructive hover:bg-destructive/90 text-white transition-colors">Supprimer</button>
				</div>
			</div>
		</div>
	);
}

/* ── UploadDialog ── */

interface StagedFile {
	storageId: Id<"_storage">;
	filename: string;
	mimeType: string;
	sizeBytes: number;
}

function UploadDialog({ defaultCategory, onClose }: { defaultCategory: DocumentTypeCategory; onClose: () => void }) {
	const { t } = useTranslation();

	const [category, setCategory] = useState<DocumentTypeCategory>(defaultCategory);
	const [documentType, setDocumentType] = useState<DetailedDocumentType | undefined>(undefined);
	const [label, setLabel] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
	const [uploading, setUploading] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(api.functions.documents.generateUploadUrl);
	const { mutateAsync: createWithFiles } = useConvexMutationQuery(api.functions.documents.createWithFiles);

	const categoryOptions = useMemo(
		() => Object.values(DocumentTypeCategory).map((cat) => ({
			value: cat,
			label: CATEGORY_CONFIG[cat]?.name ?? cat,
		})),
		[],
	);

	const documentTypeOptions = useMemo(() => {
		const types = DOCUMENT_TYPES_BY_CATEGORY[category] ?? [];
		return types.map((dt) => ({
			value: dt as string,
			label: t(`documentTypes.types.${dt}`, dt),
		}));
	}, [category, t]);

	useEffect(() => {
		setDocumentType(undefined);
	}, [category]);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			for (const file of acceptedFiles) {
				setUploading((prev) => [...prev, file.name]);
				try {
					const postUrl = await generateUploadUrl({});
					const result = await fetch(postUrl, {
						method: "POST",
						headers: { "Content-Type": file.type },
						body: file,
					});
					if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`);
					const { storageId } = await result.json();
					setStagedFiles((prev) => [
						...prev,
						{ storageId: storageId as Id<"_storage">, filename: file.name, mimeType: file.type, sizeBytes: file.size },
					]);
				} catch (err: any) {
					console.error(err);
					toast.error(`Erreur: ${err.message}`);
				} finally {
					setUploading((prev) => prev.filter((n) => n !== file.name));
				}
			}
		},
		[generateUploadUrl],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] },
		maxSize: 5 * 1024 * 1024,
	});

	const removeStagedFile = (idx: number) => {
		setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleSave = async () => {
		if (stagedFiles.length === 0) return;
		setSaving(true);
		try {
			await createWithFiles({
				files: stagedFiles.map(({ storageId, filename, mimeType, sizeBytes }) => ({
					storageId, filename, mimeType, sizeBytes,
				})),
				documentType,
				category,
				label: label.trim() || undefined,
				expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
			});

			toast.success("Document ajouté avec succès");
			onClose();
		} catch (err) {
			console.error(err);
			toast.error("Erreur lors de l'enregistrement");
		} finally {
			setSaving(false);
		}
	};

	const isUploading = uploading.length > 0;

	return (
		<DialogContent className="sm:max-w-[520px]">
			<DialogHeader>
				<DialogTitle>Ajouter un document</DialogTitle>
			</DialogHeader>
			<div className="space-y-4 mt-4">
				{/* Category */}
				<div className="space-y-2">
					<Label>Catégorie *</Label>
					<Combobox
						options={categoryOptions}
						value={category}
						onValueChange={(v) => setCategory(v as DocumentTypeCategory)}
						placeholder="Sélectionner une catégorie..."
						searchPlaceholder="Rechercher..."
						emptyText="Aucune catégorie trouvée"
					/>
				</div>

				{/* Document Type */}
				<div className="space-y-2">
					<Label>Type de document</Label>
					<Combobox
						options={documentTypeOptions}
						value={documentType ?? null}
						onValueChange={(v) => setDocumentType(v as DetailedDocumentType)}
						placeholder="Sélectionner un type..."
						searchPlaceholder="Rechercher un type..."
						emptyText="Aucun type trouvé"
					/>
				</div>

				{/* Label */}
				<div className="space-y-2">
					<Label>Libellé</Label>
					<Input
						value={label}
						onChange={(e) => setLabel(e.target.value)}
						placeholder="Ex: Passeport de Jean, Facture Février 2026..."
					/>
				</div>

				{/* Expiration */}
				<div className="space-y-2">
					<Label>Date d'expiration (optionnel)</Label>
					<Input
						type="date"
						value={expiresAt}
						onChange={(e) => setExpiresAt(e.target.value)}
					/>
				</div>

				{/* Drop zone */}
				<div className="space-y-2">
					<Label>Fichier(s) *</Label>
					<div
						{...getRootProps()}
						className={cn(
							"border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:bg-muted/50",
							isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
						)}
					>
						<input {...getInputProps()} />
						<div className="flex flex-col items-center gap-2">
							<div className="p-3 bg-muted rounded-full">
								<UploadCloud className="h-6 w-6 text-muted-foreground" />
							</div>
							<div className="text-sm font-medium">Glissez vos fichiers ici ou cliquez pour parcourir</div>
							<div className="text-xs text-muted-foreground">PDF, PNG, JPG — max 5 MB</div>
						</div>
					</div>
				</div>

				{/* Uploading */}
				{isUploading && (
					<div className="space-y-1">
						{uploading.map((name) => (
							<div key={name} className="flex items-center gap-3 p-2 border rounded-md bg-muted/20">
								<Loader2 className="h-4 w-4 animate-spin text-primary" />
								<span className="text-sm flex-1 truncate">{name}</span>
							</div>
						))}
					</div>
				)}

				{/* Staged files */}
				{stagedFiles.length > 0 && (
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">
							{stagedFiles.length} fichier(s) prêt(s)
						</Label>
						{stagedFiles.map((f, idx) => (
							<div key={f.storageId} className="flex items-center gap-2 p-2 border rounded-md bg-muted/10">
								<FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="text-sm flex-1 truncate">{f.filename}</span>
								<span className="text-xs text-muted-foreground">{(f.sizeBytes / 1024).toFixed(0)} KB</span>
								<button type="button" onClick={() => removeStagedFile(idx)} className="p-1 hover:bg-destructive/10 rounded transition-colors">
									<X className="h-3.5 w-3.5 text-destructive" />
								</button>
							</div>
						))}
					</div>
				)}

				{/* Actions */}
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
					<Button onClick={handleSave} disabled={stagedFiles.length === 0 || isUploading || saving}>
						{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
						Enregistrer
					</Button>
				</div>
			</div>
		</DialogContent>
	);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

function IDocumentPage() {
	const convex = useConvex();

	// ─── State ──────────────────────────────────────────────
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [currentFolderId, setCurrentFolderId] = useState<FolderId | null>(null);
	const [search, setSearch] = useState("");
	const [showUpload, setShowUpload] = useState(false);

	// Dialog states
	const [infoDoc, setInfoDoc] = useState<VaultDocument | null>(null);
	const [deleteDoc, setDeleteDoc] = useState<VaultDocument | null>(null);
	const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);

	// ─── Convex queries ─────────────────────────────────────
	const { data: vaultDocs = [], isPending } = useAuthenticatedConvexQuery(
		api.functions.documentVault.getMyVault, {},
	);
	const { data: stats } = useAuthenticatedConvexQuery(
		api.functions.documentVault.getStats, {},
	);

	// Mutations
	const { mutateAsync: removeFromVault } = useConvexMutationQuery(
		api.functions.documentVault.removeFromVault,
	);

	// ─── Helpers ────────────────────────────────────────────
	const getUrl = useCallback(
		async (args: { storageId: Id<"_storage"> }) => {
			return await convex.query(api.functions.documents.getUrl, args);
		},
		[convex],
	);

	const handleDownload = useCallback(async (storageId: Id<"_storage">) => {
		try {
			const url = await getUrl({ storageId });
			if (url) window.open(url, "_blank");
		} catch {
			toast.error("Erreur lors du téléchargement");
		}
	}, [getUrl]);

	const handleDelete = useCallback(async (doc: VaultDocument) => {
		try {
			await removeFromVault({ id: doc._id });
			toast.success("Document supprimé");
		} catch {
			toast.error("Erreur lors de la suppression");
		}
	}, [removeFromVault]);

	// ─── Folder config generation ───────────────────────────
	const allFolders = useMemo(() => {
		const now = Date.now();
		const docs = vaultDocs as unknown as VaultDocument[];

		const systemFolderEntries = SYSTEM_FOLDERS.map((sf) => {
			let count = 0;
			if (sf.id === "__all") count = docs.length;
			else if (sf.id === "__trash") count = docs.filter((d) => d.status === "rejected" || (d.expiresAt && d.expiresAt < now)).length;
			else if (sf.id === "__vault") count = docs.filter((d) => d.status === "validated").length;
			return { ...sf, count, isCategory: false as const };
		});

		const categoryFolderEntries = SMART_FOLDERS.map((sf) => {
			const count = sf.categories.reduce(
				(acc, cat) => acc + (stats?.byCategory[cat] ?? 0),
				0,
			);
			return {
				id: sf.id as FolderId,
				name: sf.name,
				description: sf.description,
				icon: sf.icon,
				iconColor: sf.color,
				isSystem: false,
				count,
				isCategory: true as const,
				categories: sf.categories,
			};
		});

		return { systemFolderEntries, categoryFolderEntries };
	}, [vaultDocs, stats]);

	// ─── Current folder label for breadcrumb ────────────────
	const currentFolderName = useMemo(() => {
		if (!currentFolderId) return null;
		const sys = SYSTEM_FOLDERS.find((f) => f.id === currentFolderId);
		if (sys) return sys.name;
		const smart = SMART_FOLDERS.find((f) => f.id === currentFolderId);
		if (smart) return smart.name;
		return CATEGORY_CONFIG[currentFolderId]?.name ?? currentFolderId;
	}, [currentFolderId]);

	const breadcrumbPath = useMemo(() => {
		if (!currentFolderId || !currentFolderName) return [];
		return [{ id: currentFolderId, name: currentFolderName }];
	}, [currentFolderId, currentFolderName]);

	// ─── Filtered documents ─────────────────────────────────
	const currentFiles = useMemo(() => {
		const now = Date.now();
		let docs = vaultDocs as unknown as VaultDocument[];

		// Search filter (applies globally)
		if (search) {
			const q = search.toLowerCase();
			docs = docs.filter((d) =>
				d.label?.toLowerCase().includes(q) ||
				d.files?.[0]?.filename?.toLowerCase().includes(q) ||
				d.documentType?.toLowerCase().includes(q) ||
				getCategoryLabel(d.category).toLowerCase().includes(q)
			);
		}

		// Folder filter
		if (!currentFolderId) {
			return search ? docs : []; // If no folder and no search, show nothing (folder view)
		}

		switch (currentFolderId) {
			case "__all":
				// All docs, no additional filter
				break;
			case "__trash":
				// Rejected or expired documents
				docs = docs.filter((d) => d.status === "rejected" || (d.expiresAt && d.expiresAt < now));
				break;
			case "__vault":
				// Validated/secured documents (coffre-fort)
				docs = docs.filter((d) => d.status === "validated");
				break;
			default: {
				// Smart folder (groups multiple categories) or legacy single category
				const smartFolder = SMART_FOLDERS.find((sf) => sf.id === currentFolderId);
				if (smartFolder) {
					docs = docs.filter((d) => smartFolder.categories.includes((d.category ?? "other") as DocumentTypeCategory));
				} else {
					// Fallback: single category
					docs = docs.filter((d) => (d.category ?? "other") === currentFolderId);
				}
				break;
			}
		}

		return docs;
	}, [vaultDocs, currentFolderId, search]);

	// ─── Handlers ───────────────────────────────────────────
	const handleOpenFolder = useCallback((folderId: FolderId) => {
		setCurrentFolderId(folderId);
		setSearch("");
	}, []);

	const handleNavigate = useCallback((id: string | null) => {
		setCurrentFolderId(id as FolderId | null);
	}, []);

	const handleBack = useCallback(() => {
		setCurrentFolderId(null);
		setSearch("");
	}, []);

	// Default category for upload
	const defaultUploadCategory = useMemo(() => {
		if (currentFolderId && currentFolderId !== "__all" && currentFolderId !== "__trash" && currentFolderId !== "__vault") {
			return currentFolderId as DocumentTypeCategory;
		}
		return DocumentTypeCategory.Other;
	}, [currentFolderId]);

	// ═══════════════════════════════════════════════════════
	// RENDER
	// ═══════════════════════════════════════════════════════

	return (
		<motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-5 max-w-[1400px] mx-auto p-4">
			{/* ── Header ── */}
			<motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<PageHeader
					title={currentFolderName ?? "iDocument"}
					subtitle={currentFolderId ? undefined : "Vos documents personnels et administratifs"}
					icon={
						currentFolderId && CATEGORY_CONFIG[currentFolderId] ? (
							(() => {
								const CatIcon = CATEGORY_CONFIG[currentFolderId].icon;
								return <CatIcon className={cn("h-5 w-5", CATEGORY_CONFIG[currentFolderId].iconColor)} />;
							})()
						) : (
							<Shield className="h-5 w-5 text-primary dark:text-primary" />
						)
					}
					iconBgClass="bg-foreground/[0.06] dark:bg-foreground/[0.12]"
					showBackButton={!!currentFolderId}
					onBack={handleBack}
				/>
				<div className="flex items-center gap-2">
					<Dialog open={showUpload} onOpenChange={setShowUpload}>
						<DialogTrigger asChild>
							<Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5">
								<Plus className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Ajouter un document</span>
								<span className="sm:hidden">Ajouter</span>
							</Button>
						</DialogTrigger>
						<UploadDialog
							key={defaultUploadCategory}
							defaultCategory={defaultUploadCategory}
							onClose={() => setShowUpload(false)}
						/>
					</Dialog>
				</div>
			</motion.div>

			{/* ── Toolbar ── */}
			<motion.div variants={fadeUp}>
				<FlatCard className="p-3">
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative flex-1 min-w-[200px] max-w-[360px]">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<input placeholder="Rechercher dans vos documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-8 pl-8 text-xs bg-muted/50 border-none rounded-full px-3 focus:outline-none focus:ring-1 focus:ring-primary/30" />
						</div>
						{search && (
							<>
								<div className="h-6 w-px bg-border/50 hidden sm:block" />
								<button className="flex items-center gap-1.5 h-7 text-[11px] text-destructive hover:text-destructive/80 px-2" onClick={() => setSearch("")}>
									<X className="h-3 w-3" /> Effacer
								</button>
							</>
						)}
						{stats && (
							<div className="flex items-center gap-2 text-[11px] text-muted-foreground ml-auto mr-2">
								<span>{stats.total} documents</span>
								{stats.expiringSoon > 0 && (
									<span className="text-warning flex items-center gap-1">
										<AlertTriangle className="h-3 w-3" />{stats.expiringSoon} expire(nt) bientôt
									</span>
								)}
								{stats.expired > 0 && (
									<span className="text-destructive flex items-center gap-1">
										<AlertTriangle className="h-3 w-3" />{stats.expired} expiré(s)
									</span>
								)}
							</div>
						)}
						<div className={cn(stats ? "" : "ml-auto")}>
							<ViewModeToggle value={viewMode} onChange={setViewMode} />
						</div>
					</div>
				</FlatCard>
			</motion.div>

			{/* ── Breadcrumb ── */}
			<BreadcrumbPath path={breadcrumbPath} onNavigate={handleNavigate} />

			{/* ── Content ── */}
			<AnimatePresence mode="wait">
				{isPending ? (
					<motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-12">
						<Loader2 className="animate-spin h-8 w-8 text-primary" />
					</motion.div>
				) : (
					<>
						{/* ── Grid View ── */}
						{viewMode === "grid" && (
							<motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
								{/* All 5 folders on a single row — system + métier */}
								{!currentFolderId && !search && (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
										{allFolders.systemFolderEntries.map((folder) => (
											<VaultFolderCard
												key={folder.id}
												label={folder.name}
												count={folder.count}
												onClick={() => handleOpenFolder(folder.id)}
											/>
										))}
										{allFolders.categoryFolderEntries.map((folder) => (
											<VaultFolderCard
												key={folder.id}
												label={folder.name}
												count={folder.count}
												onClick={() => handleOpenFolder(folder.id)}
											/>
										))}
									</div>
								)}

								{/* Files — show when inside a folder or searching */}
								{(currentFolderId || search) && (
									<div>
										<div className="flex items-center justify-between mb-3">
											<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
												{search ? "Résultats de recherche" : "Documents"}
											</p>
											{currentFiles.length > 0 && (
												<span className="text-xs text-muted-foreground">{currentFiles.length} élément(s)</span>
											)}
										</div>
										{currentFiles.length > 0 ? (
											<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
												{currentFiles.map((doc) => {
													const d = doc as unknown as VaultDocument;
													const st = STATUS_CFG[d.status ?? "pending"] ?? STATUS_CFG.pending;
													const catConfig = CATEGORY_CONFIG[d.category ?? "other"];
													const isExpired = d.expiresAt && isPast(d.expiresAt) && !isToday(d.expiresAt);
													const isExpiringSoon = d.expiresAt && !isExpired && differenceInDays(d.expiresAt, new Date()) <= 30;

													return (
														<VaultFileCard
															key={d._id}
															title={d.label || d.files[0]?.filename || "Document"}
															iconColor={catConfig?.iconColor}
															date={formatDate(d.updatedAt ?? d._creationTime)}
															fileCount={d.files?.length}
															categoryBadge={
																catConfig ? (
																	<span className={cn("text-[9px] h-4 gap-1 border-transparent inline-flex items-center px-1.5 rounded-full font-medium bg-muted", catConfig.color)}>
																		{React.createElement(catConfig.icon, { className: "h-2.5 w-2.5" })}
																		{catConfig.name}
																	</span>
																) : null
															}
															statusBadge={
																<span className={cn("text-[9px] h-5 border inline-flex items-center gap-1 px-1.5 rounded-full font-medium", st.class)}>
																	<span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
																	{st.label}
																</span>
															}
															expirationBadge={
																(isExpired || isExpiringSoon) ? (
																	<span className={cn("text-[9px] inline-flex items-center gap-1 font-medium", isExpired ? "text-destructive" : "text-warning")}>
																		<Clock className="h-2.5 w-2.5" />
																		{isExpired ? "Expiré" : `Expire le ${formatDate(d.expiresAt)}`}
																	</span>
																) : null
															}
															contextMenu={
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
																			<MoreHorizontal className="h-4 w-4" />
																		</button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPreviewDoc(d); }}>
																			<Eye className="h-4 w-4 mr-2" />Aperçu
																		</DropdownMenuItem>
																		<DropdownMenuItem onClick={(e) => { e.stopPropagation(); setInfoDoc(d); }}>
																			<Info className="h-4 w-4 mr-2" />Informations
																		</DropdownMenuItem>
																		{d.files[0]?.storageId && (
																			<DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(d.files[0].storageId); }}>
																				<Download className="h-4 w-4 mr-2" />Télécharger
																			</DropdownMenuItem>
																		)}
																		<DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteDoc(d); }} className="text-destructive focus:text-destructive">
																			<Trash2 className="h-4 w-4 mr-2" />Supprimer
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
															}
															onClick={() => setPreviewDoc(d)}
														/>
													);
												})}
											</div>
										) : (
											<div className="flex flex-col items-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/30">
												<div className="h-16 w-16 rounded-2xl bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center mb-4">
													{search ? (
														<Search className="h-8 w-8 text-muted-foreground" />
													) : (
														<FolderOpen className="h-8 w-8 text-primary/60" />
													)}
												</div>
												<h3 className="text-lg font-semibold mb-1">{search ? "Aucun résultat" : "Dossier vide"}</h3>
												<p className="text-sm text-muted-foreground max-w-sm">
													{search
														? "Aucun document ne correspond à votre recherche."
														: "Ce dossier ne contient aucun document."}
												</p>
												{!search && (
													<Button variant="link" onClick={() => setShowUpload(true)} className="mt-2 text-primary">
														Ajouter un document
													</Button>
												)}
											</div>
										)}
									</div>
								)}
							</motion.div>
						)}

						{/* ── List View ── */}
						{viewMode === "list" && (
							<motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
								<FlatCard>
									{/* Header */}
									<div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/50 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
										<div className="col-span-4">Nom</div>
										<div className="col-span-2">Catégorie</div>
										<div className="col-span-2">Modifié</div>
										<div className="col-span-1">Statut</div>
										<div className="col-span-2">Expiration</div>
										<div className="col-span-1">Fichiers</div>
									</div>

									{/* Folder rows (only at root) */}
									{!currentFolderId && !search && (
										<>
											{allFolders.systemFolderEntries.map((folder) => (
												<div key={folder.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => handleOpenFolder(folder.id)}>
													<div className="col-span-4 flex items-center gap-2">
														<div className="h-6 w-6 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center shrink-0">
															<folder.icon className="h-3 w-3 text-primary" />
														</div>
														<span className="text-xs font-medium truncate">{folder.name}</span>
													</div>
													<div className="col-span-2 text-xs text-muted-foreground flex items-center">Système</div>
													<div className="col-span-2" />
													<div className="col-span-1" />
													<div className="col-span-2" />
													<div className="col-span-1 text-xs text-muted-foreground flex items-center">{folder.count}</div>
												</div>
											))}
											{allFolders.categoryFolderEntries.map((folder) => (
												<div key={folder.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => handleOpenFolder(folder.id)}>
													<div className="col-span-4 flex items-center gap-2">
														<div className="h-6 w-6 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0"><Folder className="h-3 w-3 text-warning" /></div>
														<span className="text-xs font-medium truncate">{folder.name}</span>
													</div>
													<div className="col-span-2 text-xs text-muted-foreground flex items-center">{folder.name}</div>
													<div className="col-span-2" />
													<div className="col-span-1" />
													<div className="col-span-2" />
													<div className="col-span-1 text-xs text-muted-foreground flex items-center">{folder.count}</div>
												</div>
											))}
										</>
									)}

									{/* File rows */}
									{(currentFolderId || search) && currentFiles.map((doc) => {
										const d = doc as unknown as VaultDocument;
										const st = STATUS_CFG[d.status ?? "pending"] ?? STATUS_CFG.pending;
										const isExpired = d.expiresAt && isPast(d.expiresAt) && !isToday(d.expiresAt);
										const isExpiringSoon = d.expiresAt && !isExpired && differenceInDays(d.expiresAt, new Date()) <= 30;

										return (
											<div key={d._id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => setPreviewDoc(d)}>
												<div className="col-span-4 flex items-center gap-2">
													<div className="h-6 w-6 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center shrink-0"><FileText className="h-3 w-3 text-primary" /></div>
													<span className="text-xs font-medium truncate">{d.label || d.files[0]?.filename || "Document"}</span>
												</div>
												<div className="col-span-2 text-xs text-muted-foreground flex items-center">{getCategoryLabel(d.category)}</div>
												<div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDate(d.updatedAt ?? d._creationTime)}</div>
												<div className="col-span-1 flex items-center">
													<span className={cn("text-[10px] h-5 border inline-flex items-center gap-1 px-1.5 rounded-full", st.class)}>
														<span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />{st.label}
													</span>
												</div>
												<div className="col-span-2 flex items-center">
													{d.expiresAt ? (
														<span className={cn("text-[10px]", isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : "text-muted-foreground")}>
															{formatDate(d.expiresAt)}
														</span>
													) : (
														<span className="text-[10px] text-muted-foreground/40">—</span>
													)}
												</div>
												<div className="col-span-1 text-xs text-muted-foreground flex items-center">{d.files?.length ?? 0}</div>
											</div>
										);
									})}

									{/* Empty state */}
									{(currentFolderId || search) && currentFiles.length === 0 && (
										<div className="py-12 text-center text-sm text-muted-foreground">Aucun document trouvé</div>
									)}
									{!currentFolderId && !search && allFolders.systemFolderEntries.length === 0 && allFolders.categoryFolderEntries.length === 0 && (
										<div className="py-12 text-center text-sm text-muted-foreground">Aucun contenu</div>
									)}
								</FlatCard>
							</motion.div>
						)}

						{/* ── Column View ── */}
						{viewMode === "column" && (
							<motion.div key="column" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
								<div className="border border-border/50 rounded-xl bg-card overflow-hidden">
									<div className="flex h-[500px]">
										{/* Root column — System + Category folders */}
										<div className="w-64 border-r border-border/50 overflow-y-auto">
											<div className="p-2 text-[10px] font-semibold uppercase text-muted-foreground/60 px-3">Dossiers</div>
											{SYSTEM_FOLDERS.map((folder) => (
												<button key={folder.id} onClick={() => handleOpenFolder(folder.id)} className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left", currentFolderId === folder.id && "bg-foreground/[0.06] dark:bg-foreground/[0.12] text-primary")}>
													<folder.icon className="h-3.5 w-3.5 text-primary shrink-0" />
													<span className="truncate">{folder.name}</span>
													<ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
												</button>
											))}
											<div className="my-1 border-t border-border/30" />
											{SMART_FOLDERS.map((sf) => (
												<button key={sf.id} onClick={() => handleOpenFolder(sf.id)} className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left", currentFolderId === sf.id && "bg-foreground/[0.06] dark:bg-foreground/[0.12] text-primary")}>
													<Folder className="h-3.5 w-3.5 text-warning shrink-0" />
													<span className="truncate">{sf.name}</span>
													<ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
												</button>
											))}
										</div>

										{/* Files column */}
										{currentFolderId && (
											<div className="w-72 border-r border-border/50 overflow-y-auto">
												<div className="p-2 text-[10px] font-semibold uppercase text-muted-foreground/60 px-3">{currentFolderName}</div>
												{currentFiles.length > 0 ? currentFiles.map((doc) => {
													const d = doc as unknown as VaultDocument;
													return (
														<button key={d._id} onClick={() => setPreviewDoc(d)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
															<FileText className="h-3.5 w-3.5 text-primary shrink-0" />
															<span className="truncate">{d.label || d.files[0]?.filename || "Document"}</span>
														</button>
													);
												}) : (
													<div className="px-3 py-4 text-xs text-muted-foreground/50 text-center">Aucun document</div>
												)}
											</div>
										)}

										{/* Preview pane */}
										<div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
											<div className="text-center">
												<FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
												<p>Sélectionnez un document pour l'aperçu</p>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						)}
					</>
				)}
			</AnimatePresence>

			{/* ── Dialogs ── */}
			<DocumentInfoDialog
				open={!!infoDoc}
				onClose={() => setInfoDoc(null)}
				doc={infoDoc}
				onDownload={handleDownload}
			/>

			<DeleteConfirmDialog
				open={!!deleteDoc}
				onClose={() => setDeleteDoc(null)}
				onConfirm={() => { if (deleteDoc) handleDelete(deleteDoc); }}
				docName={deleteDoc?.label || deleteDoc?.files[0]?.filename || "ce document"}
			/>

			{/* Document Preview Modal */}
			{previewDoc && (
				<DocumentPreviewModal
					open={!!previewDoc}
					onOpenChange={(open) => !open && setPreviewDoc(null)}
					storageId={previewDoc.files[0]?.storageId}
					filename={previewDoc.files[0]?.filename ?? "document"}
					mimeType={previewDoc.files[0]?.mimeType ?? "application/octet-stream"}
				/>
			)}
		</motion.div>
	);
}
