"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
	Archive, Search, Upload, Shield, Clock, Lock, Landmark, Users2, Scale,
	Building2, FileText, Folder, FolderOpen, FolderPlus, Hash,
	CheckCircle2, AlertTriangle, XCircle, Loader2, X, Download,
	MoreHorizontal, Share2, Send, Edit3, Info, KeyRound, Tag,
	Trash2, CalendarClock, GitBranch, Sparkles, User, Undo2,
	LayoutGrid, List, Columns3, ChevronRight, GripVertical,
	FileSpreadsheet, ImageIcon, Plus, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/design-system/page-header";
import { useOrgSelector } from "@/hooks/use-org-selector";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type DocStatus = "draft" | "review" | "approved" | "archived" | "trashed";
type ViewMode = "grid" | "list" | "column";
type ConfidentialityLevel = "public" | "internal" | "confidential" | "secret";
type CountingStartEvent = "date_creation" | "date_cloture" | "date_tag" | "date_gel" | "date_manuelle";

interface DocItem {
	id: string;
	title: string;
	excerpt: string;
	author: string;
	authorInitials: string;
	updatedAt: string;
	updatedAtTs: number;
	status: DocStatus;
	tags: string[];
	version: number;
	folderId: string;
	archiveCategorySlug?: string;
	mimeType?: string;
}

interface FolderItem {
	id: string;
	name: string;
	parentFolderId: string | null;
	tags: string[];
	fileCount: number;
	subfolderCount: number;
	updatedAt: string;
	createdBy: string;
	isSystem: boolean;
}

interface ArchiveCategoryOption {
	_id: string;
	name: string;
	slug: string;
	color: string;
	icon: string;
	retentionYears: number;
	description?: string;
	isPerpetual?: boolean;
}

interface ArchivePolicyData {
	categoryId: string;
	categorySlug: string;
	countingStartEvent: CountingStartEvent;
	manualDate?: number;
	confidentiality: ConfidentialityLevel;
	inheritToChildren: boolean;
	inheritToDocuments: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CFG: Record<DocStatus, { label: string; class: string; dot: string }> = {
	draft: { label: "Brouillon", class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", dot: "bg-zinc-400" },
	review: { label: "En révision", class: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
	approved: { label: "Approuvé", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
	archived: { label: "Archivé", class: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
	trashed: { label: "Corbeille", class: "bg-red-500/15 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

const STATUS_FILTERS: { value: DocStatus | "all"; label: string }[] = [
	{ value: "all", label: "Tous" },
	{ value: "draft", label: "Brouillons" },
	{ value: "review", label: "En révision" },
	{ value: "approved", label: "Approuvés" },
	{ value: "archived", label: "Archivés" },
];

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
	fiscal: Landmark,
	social: Users2,
	juridique: Scale,
	consulaire: Building2,
	coffre: Lock,
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
	amber: "text-amber-400 bg-amber-500/15",
	blue: "text-blue-400 bg-blue-500/15",
	emerald: "text-emerald-400 bg-emerald-500/15",
	violet: "text-violet-400 bg-violet-500/15",
	rose: "text-rose-400 bg-rose-500/15",
};

const CONFIDENTIALITY_OPTIONS: { value: ConfidentialityLevel; label: string; color: string }[] = [
	{ value: "public", label: "Public", color: "text-emerald-400" },
	{ value: "internal", label: "Interne", color: "text-blue-400" },
	{ value: "confidential", label: "Confidentiel", color: "text-amber-400" },
	{ value: "secret", label: "Secret", color: "text-red-400" },
];

const COUNTING_START_OPTIONS: { value: CountingStartEvent; label: string; description: string }[] = [
	{ value: "date_creation", label: "Date de création", description: "Début du comptage à la création du document" },
	{ value: "date_cloture", label: "Date de clôture", description: "Début du comptage à la clôture du dossier" },
	{ value: "date_tag", label: "Date d'étiquetage", description: "Début lors du premier étiquetage" },
	{ value: "date_gel", label: "Date de gel", description: "Début lors du gel juridique" },
	{ value: "date_manuelle", label: "Date manuelle", description: "Choisir une date personnalisée" },
];

const ARCHIVE_CATEGORIES: ArchiveCategoryOption[] = [
	{ _id: "cat-1", name: "Fiscal", slug: "fiscal", color: "amber", icon: "Landmark", retentionYears: 10, description: "Documents comptables et fiscaux" },
	{ _id: "cat-2", name: "Social", slug: "social", color: "blue", icon: "Users", retentionYears: 5, description: "Dossiers du personnel et social" },
	{ _id: "cat-3", name: "Juridique", slug: "juridique", color: "emerald", icon: "Scale", retentionYears: 30, description: "Contrats, litiges et actes juridiques" },
	{ _id: "cat-4", name: "Consulaire", slug: "consulaire", color: "violet", icon: "Building2", retentionYears: 50, description: "Documents consulaires et diplomatiques" },
	{ _id: "cat-5", name: "Coffre-fort", slug: "coffre", color: "rose", icon: "Lock", retentionYears: 99, isPerpetual: true, description: "Conservation permanente" },
];

// ═══════════════════════════════════════════════════════════════
// MOCK DATA — Contexte diplomatique avec documents admin
// ═══════════════════════════════════════════════════════════════

const DEFAULT_FOLDERS: FolderItem[] = [
	{ id: "__mes-documents", name: "Mes Documents", parentFolderId: null, tags: [], fileCount: 0, subfolderCount: 0, updatedAt: "", createdBy: "Système", isSystem: true },
	{ id: "__brouillons", name: "Brouillons", parentFolderId: null, tags: [], fileCount: 0, subfolderCount: 0, updatedAt: "", createdBy: "Système", isSystem: true },
	{ id: "__poubelle", name: "Poubelle", parentFolderId: null, tags: [], fileCount: 0, subfolderCount: 0, updatedAt: "", createdBy: "Système", isSystem: true },
	{ id: "f-visas", name: "Visas & Laissez-passer", parentFolderId: null, tags: ["consulaire", "visa"], fileCount: 3, subfolderCount: 1, updatedAt: "25/03/2026", createdBy: "Ambassade", isSystem: false },
	{ id: "f-passeports", name: "Passeports", parentFolderId: null, tags: ["consulaire", "identité"], fileCount: 5, subfolderCount: 0, updatedAt: "24/03/2026", createdBy: "Consulat Paris", isSystem: false },
	{ id: "f-etat-civil", name: "État Civil", parentFolderId: null, tags: ["état-civil", "actes"], fileCount: 8, subfolderCount: 2, updatedAt: "23/03/2026", createdBy: "Consulat Paris", isSystem: false },
	{ id: "f-cooperation", name: "Coopération Internationale", parentFolderId: null, tags: ["diplomatie", "accords"], fileCount: 4, subfolderCount: 1, updatedAt: "22/03/2026", createdBy: "MAE Gabon", isSystem: false },
	{ id: "f-contentieux", name: "Contentieux Diplomatique", parentFolderId: null, tags: ["juridique", "contentieux"], fileCount: 2, subfolderCount: 0, updatedAt: "20/03/2026", createdBy: "Service Juridique", isSystem: false },
	{ id: "f-finances", name: "Finances & Budget", parentFolderId: null, tags: ["fiscal", "budget"], fileCount: 6, subfolderCount: 0, updatedAt: "21/03/2026", createdBy: "Trésorier", isSystem: false },
	{ id: "sf-visas-urgents", name: "Visas Urgents", parentFolderId: "f-visas", tags: ["urgent"], fileCount: 2, subfolderCount: 0, updatedAt: "25/03/2026", createdBy: "Consul", isSystem: false },
	{ id: "sf-naissances", name: "Actes de Naissance", parentFolderId: "f-etat-civil", tags: ["naissance"], fileCount: 4, subfolderCount: 0, updatedAt: "23/03/2026", createdBy: "Officier EC", isSystem: false },
	{ id: "sf-mariages", name: "Actes de Mariage", parentFolderId: "f-etat-civil", tags: ["mariage"], fileCount: 3, subfolderCount: 0, updatedAt: "22/03/2026", createdBy: "Officier EC", isSystem: false },
	{ id: "sf-accords", name: "Accords Bilatéraux", parentFolderId: "f-cooperation", tags: ["bilatéral"], fileCount: 2, subfolderCount: 0, updatedAt: "22/03/2026", createdBy: "Diplomate", isSystem: false },
];

const MOCK_DOCUMENTS: DocItem[] = [
	{ id: "doc-1", title: "Demande de visa diplomatique - M. NDONG", excerpt: "Demande de visa diplomatique pour mission officielle", author: "Agent MBAYE", authorInitials: "AM", updatedAt: "25/03/2026", updatedAtTs: 1774567200000, status: "review", tags: ["visa", "diplomatique"], version: 2, folderId: "f-visas", mimeType: "application/pdf" },
	{ id: "doc-2", title: "Passeport de service - Dossier 2026-0142", excerpt: "Renouvellement passeport de service", author: "Agent ONDO", authorInitials: "AO", updatedAt: "24/03/2026", updatedAtTs: 1774480800000, status: "approved", tags: ["passeport", "service"], version: 3, folderId: "f-passeports" },
	{ id: "doc-3", title: "Acte de naissance - Transcription consulaire", excerpt: "Transcription d'acte de naissance", author: "Officier BOUANGA", authorInitials: "OB", updatedAt: "23/03/2026", updatedAtTs: 1774394400000, status: "draft", tags: ["naissance", "transcription"], version: 1, folderId: "sf-naissances" },
	{ id: "doc-4", title: "Convention bilatérale Gabon-France 2026", excerpt: "Projet de convention de coopération", author: "Ambassadeur MBOUMBA", authorInitials: "AM", updatedAt: "22/03/2026", updatedAtTs: 1774308000000, status: "review", tags: ["convention", "france", "coopération"], version: 4, folderId: "sf-accords", archiveCategorySlug: "juridique" },
	{ id: "doc-5", title: "Budget prévisionnel Q2 2026", excerpt: "Budget du consulat pour le 2ème trimestre", author: "Trésorier ELLA", authorInitials: "TE", updatedAt: "21/03/2026", updatedAtTs: 1774221600000, status: "approved", tags: ["budget", "Q2"], version: 2, folderId: "f-finances", archiveCategorySlug: "fiscal" },
	{ id: "doc-6", title: "Note verbale — Incident protocolaire", excerpt: "Note verbale suite à l'incident du 15 mars", author: "Consul NZOGHE", authorInitials: "CN", updatedAt: "20/03/2026", updatedAtTs: 1774135200000, status: "draft", tags: ["note-verbale", "protocole"], version: 1, folderId: "f-contentieux" },
	{ id: "doc-7", title: "Acte de mariage — Dossier MOUSSAVOU/LECLERC", excerpt: "Célébration de mariage consulaire", author: "Officier BOUANGA", authorInitials: "OB", updatedAt: "22/03/2026", updatedAtTs: 1774308000000, status: "approved", tags: ["mariage", "consulaire"], version: 1, folderId: "sf-mariages" },
	{ id: "doc-8", title: "Laissez-passer d'urgence — M. OBAME", excerpt: "Délivrance laissez-passer en urgence", author: "Agent MBAYE", authorInitials: "AM", updatedAt: "25/03/2026", updatedAtTs: 1774567200000, status: "approved", tags: ["laissez-passer", "urgence"], version: 1, folderId: "sf-visas-urgents" },
	{ id: "doc-9", title: "Rapport annuel du Consulat 2025", excerpt: "Rapport d'activité annuel", author: "Consul NZOGHE", authorInitials: "CN", updatedAt: "20/03/2026", updatedAtTs: 1774135200000, status: "archived", tags: ["rapport", "annuel"], version: 5, folderId: "__mes-documents", archiveCategorySlug: "consulaire" },
	{ id: "doc-10", title: "Brouillon — Circulaire interne", excerpt: "Circulaire sur les nouvelles procédures", author: "Agent ONDO", authorInitials: "AO", updatedAt: "26/03/2026", updatedAtTs: 1774653600000, status: "draft", tags: ["circulaire", "interne"], version: 1, folderId: "__brouillons" },
	{ id: "doc-11", title: "Directive ministérielle N°2026-03", excerpt: "Directives sur la gestion des documents diplomatiques", author: "Ministère des Affaires Étrangères", authorInitials: "MAE", updatedAt: "26/03/2026", updatedAtTs: 1774653600000, status: "approved", tags: ["directive", "ministérielle"], version: 1, folderId: "__mes-documents", archiveCategorySlug: "juridique" },
	{ id: "doc-12", title: "Rapport d'audit - Exercice 2025", excerpt: "Audit annuel des procédures de sécurité et conformité", author: "Service d'Audit Interne", authorInitials: "SAI", updatedAt: "24/03/2026", updatedAtTs: 1774480800000, status: "approved", tags: ["audit", "conformité"], version: 2, folderId: "__mes-documents", archiveCategorySlug: "fiscal" },
	{ id: "doc-13", title: "Politique de sécurité des documents", excerpt: "Cadre de sécurité pour la gestion des documents sensibles", author: "Directeur Sécurité", authorInitials: "DS", updatedAt: "23/03/2026", updatedAtTs: 1774394400000, status: "approved", tags: ["sécurité", "politique"], version: 3, folderId: "__mes-documents", archiveCategorySlug: "secret" },
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
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/* ── DynamicFolderIcon — yellow macOS folder with animated sheets ── */

function DynamicFolderIcon({ count, size = 64, hovered = false, className = "" }: { count: number; size?: number; className?: string; hovered?: boolean }) {
	const sheets = Math.min(Math.max(count, 0), 3);
	const sheetConfigs = [
		{ x: 62, y: 148, w: 300, h: 200, rx: 15, rotate: -3, fill: "#ffeac5", hoverY: -18 },
		{ x: 42, y: 168, w: 300, h: 200, rx: 15, rotate: 0, fill: "#fff7e6", hoverY: -14 },
		{ x: 52, y: 158, w: 290, h: 195, rx: 15, rotate: 3, fill: "#ffffff", hoverY: -22 },
	];
	const visibleSheets = sheets === 0 ? [] : sheets === 1 ? [sheetConfigs[1]] : sheets === 2 ? [sheetConfigs[0], sheetConfigs[1]] : [sheetConfigs[0], sheetConfigs[1], sheetConfigs[2]];

	return (
		<motion.svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className} initial={{ scale: 1 }} whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
			<path d="m214.2 107-40.2-29.9c-9.5-7-20.9-10.8-32.7-10.8h-110.2c-16.6 0-30 13.4-30 30v349.5h404.1c15.2 0 27.4-12.3 27.4-27.4v-270.6c0-16.6-13.4-30-30-30h-155.6c-11.8 0-23.3-3.8-32.8-10.8z" fill="#f6c012" />
			{visibleSheets.map((sheet, i) => (
				<motion.rect key={i} x={sheet.x} y={sheet.y} width={sheet.w} height={sheet.h} rx={sheet.rx} fill={sheet.fill} style={{ transformOrigin: `${sheet.x + sheet.w / 2}px ${sheet.y + sheet.h}px` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: hovered ? sheet.hoverY : 0, rotate: sheet.rotate + (hovered ? sheet.rotate * 0.5 : 0) }} transition={{ opacity: { duration: 0.3, delay: i * 0.08 }, y: { type: "spring", stiffness: 300, damping: 20 }, rotate: { type: "spring", stiffness: 300, damping: 20 } }} />
			))}
			<path d="m85.2 220.1-84.1 225.6h410.8c12.5 0 23.7-7.8 28.1-19.5l69-185.2c7.3-19.6-7.2-40.5-28.1-40.5h-367.6c-12.5.1-23.7 7.8-28.1 19.6z" fill="#fbd87c" />
		</motion.svg>
	);
}

/* ── VaultFolderCard — folder card with yellow icon ── */

function VaultFolderCard({ label, count, subfolderCount = 0, onClick, className, contextMenu, badges, tags, isDragOver, isSelected = false }: {
	label: string; count: number; subfolderCount?: number; onClick?: () => void; className?: string; contextMenu?: React.ReactNode; badges?: React.ReactNode; tags?: React.ReactNode; isDragOver?: boolean; isSelected?: boolean;
}) {
	const [isHovered, setIsHovered] = useState(false);
	return (
		<div className={cn("group relative flex flex-col items-center justify-center p-2 rounded-2xl w-full h-full", isDragOver ? "bg-primary/10 ring-2 ring-primary/50" : "", isSelected && !isDragOver && "ring-2 ring-violet-500 bg-violet-500/10", className)}>
			<motion.div role="button" tabIndex={0} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="relative flex flex-col items-center justify-center cursor-pointer outline-none rounded-xl p-3 hover:bg-muted/40 transition-colors w-[140px]">
				<div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10 w-full text-center">
					<div className="flex flex-col gap-0.5 items-center justify-center pointer-events-auto scale-90 -mt-2">{badges}</div>
				</div>
				<div className="relative mt-1 w-full flex justify-center">
					<DynamicFolderIcon count={count + subfolderCount} size={96} hovered={isHovered} className="" />
					<div className="absolute -top-1 right-1 flex flex-col gap-0.5 items-end z-10">
						{subfolderCount > 0 && (
							<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="min-w-5 h-5 px-1 flex items-center justify-center gap-0.5 rounded-full bg-violet-500 text-white text-[9px] font-bold">
								<Folder className="h-2.5 w-2.5" />{subfolderCount}
							</motion.span>
						)}
						{count > 0 && (
							<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="min-w-5 h-5 px-1 flex items-center justify-center gap-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold">
								<FileText className="h-2.5 w-2.5" />{count}
							</motion.span>
						)}
					</div>
					{contextMenu && (
						<div className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all hover:scale-125 pointer-events-auto z-10" onClick={(e) => e.stopPropagation()}>
							{contextMenu}
						</div>
					)}
				</div>
				<div className="flex flex-col items-center mt-3 w-full">
					<span className="text-sm font-semibold text-foreground text-center leading-tight line-clamp-2 w-full px-1">{label}</span>
					{tags && <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5 w-full">{tags}</div>}
				</div>
			</motion.div>
		</div>
	);
}

/* ── VaultFileCard — document card with A4 preview ── */

function VaultFileCard({ title, iconColor = "text-stone-600", author, authorInitials, date, statusBadge, version, contextMenu, badges, tags = [], retentionCategory, retentionColor, onClick, isSelected = false }: {
	title: string; iconColor?: string; author?: string; authorInitials?: string; date?: string; statusBadge?: React.ReactNode; version?: number | string; contextMenu?: React.ReactNode; badges?: React.ReactNode; tags?: string[]; retentionCategory?: string; retentionColor?: string; onClick?: () => void; isSelected?: boolean;
}) {
	return (
		<div className={cn("group transition-all duration-300 overflow-hidden border border-border/50 cursor-pointer h-full flex flex-col bg-card rounded-xl", isSelected && "ring-2 ring-violet-500 border-violet-500/50 bg-violet-500/5")} onClick={onClick}>
			<div className="relative aspect-[1/1.414] bg-white/[0.03] flex flex-col overflow-hidden">
				<div className="relative flex items-center px-2.5 pt-2 z-10 min-h-[20px]">
					<div className="flex items-center gap-1 shrink min-w-0">{badges}</div>
					<div className="absolute inset-x-0 flex justify-center pointer-events-none">
						{retentionCategory ? (
							<span className={cn("text-[8px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1 leading-tight pointer-events-auto", retentionColor || "bg-cyan-500/10 text-cyan-400")}>{retentionCategory}</span>
						) : (
							<span className="text-[8px] text-muted-foreground/30 italic pointer-events-auto">Non classé</span>
						)}
					</div>
				</div>
				<div className="flex-1 flex items-center justify-center px-3 py-2">
					<div className="relative w-14 h-[72px] bg-[#FDFCFA] dark:bg-[#21201E]/77 flex flex-col items-center justify-center rounded-[2px] border border-neutral-200">
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
						{version !== undefined && <span className="font-mono bg-white/[0.04] px-1 rounded">v{version}</span>}
						{date && <span className="flex items-center gap-0.5 whitespace-nowrap"><Clock className="h-2 w-2" />{date}</span>}
					</div>
				</div>
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
		<div className="flex items-center rounded-lg border border-border/50 bg-secondary p-0.5 gap-0.5">
			{modes.map((m) => (
				<button key={m.value} onClick={() => onChange(m.value)} className={cn("h-7 w-7 flex items-center justify-center rounded-md transition-all", value === m.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title={m.label}>
					<m.icon className="h-3.5 w-3.5" />
				</button>
			))}
		</div>
	);
}

/* ── BreadcrumbPath ── */

function BreadcrumbPath({ path, onNavigate, rootLabel = "Documents", rootIcon: RootIcon = FileText }: { path: { id: string; name: string }[]; onNavigate: (id: string | null) => void; rootLabel?: string; rootIcon?: React.ElementType }) {
	return (
		<div className="flex items-center gap-1 text-sm flex-wrap">
			<button onClick={() => onNavigate(null)} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
				<RootIcon className="h-3.5 w-3.5" />
				<span className="text-xs font-medium">{rootLabel}</span>
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

/* ── FolderContextMenu ── */

function FolderContextMenu({ itemId, itemName, itemType, onShare, onSavePolicy, onInfo, onManageAccess, onCreateSubfolder, onDelete, isSystem }: {
	itemId: string; itemName: string; itemType: "folder" | "document"; onShare?: (id: string, type: string) => void; onSavePolicy?: (id: string) => void; onInfo?: (id: string) => void; onManageAccess?: (id: string) => void; onCreateSubfolder?: (id: string) => void; onDelete?: (id: string) => void; isSystem?: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative">
			<button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground">
				<MoreHorizontal className="h-4 w-4" />
			</button>
			{open && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					<div className="absolute right-0 top-8 z-50 w-52 bg-popover border border-border rounded-lg py-1" onClick={(e) => e.stopPropagation()}>
						<div className="px-3 py-1.5 text-[10px] text-muted-foreground/60">{itemType === "folder" ? "Dossier" : "Document"} — Actions</div>
						{onShare && <button onClick={() => { onShare(itemId, itemType); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"><Share2 className="h-3.5 w-3.5 text-blue-400" />Partager</button>}
						{onSavePolicy && <button onClick={() => { onSavePolicy(itemId); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"><Archive className="h-3.5 w-3.5 text-cyan-400" />Politique d'archivage</button>}
						{onInfo && <button onClick={() => { onInfo(itemId); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"><Info className="h-3.5 w-3.5 text-sky-400" />Informations</button>}
						{itemType === "folder" && !isSystem && onCreateSubfolder && <button onClick={() => { onCreateSubfolder(itemId); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"><FolderPlus className="h-3.5 w-3.5 text-emerald-400" />Créer sous-dossier</button>}
						{itemType === "folder" && onManageAccess && <button onClick={() => { onManageAccess(itemId); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"><KeyRound className="h-3.5 w-3.5 text-amber-400" />Gérer accès</button>}
						{!isSystem && onDelete && (
							<>
								<div className="my-1 border-t border-border/50" />
								<button onClick={() => { onDelete(itemId); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-red-400"><Trash2 className="h-3.5 w-3.5" />Supprimer</button>
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}

/* ── RetentionCategoryBadge ── */

function RetentionCategoryBadge({ categorySlug }: { categorySlug?: string }) {
	if (!categorySlug) return null;
	const cat = ARCHIVE_CATEGORIES.find((c) => c.slug === categorySlug);
	if (!cat) return null;
	const Icon = CATEGORY_ICON_MAP[cat.slug] || Archive;
	const colorClasses = CATEGORY_COLOR_MAP[cat.color] || "text-zinc-400 bg-zinc-500/15";
	return (
		<span className={cn("text-[9px] h-4 gap-1 border-transparent inline-flex items-center px-1.5 rounded-full font-medium", colorClasses)}>
			<Icon className="h-2.5 w-2.5" />{cat.name}
		</span>
	);
}

// ═══════════════════════════════════════════════════════════════
// DIALOGS
// ═══════════════════════════════════════════════════════════════

/* ── ShareDialog ── */

function ShareDialog({ open, onClose, targetName }: { open: boolean; onClose: () => void; targetName: string }) {
	const [visibility, setVisibility] = useState<"private" | "team" | "shared">("private");
	const visOptions = [
		{ value: "private" as const, label: "Privé", desc: "Seul vous pouvez voir ce contenu", icon: Lock, color: "text-zinc-400" },
		{ value: "team" as const, label: "Équipe / Interne", desc: "Visible par les membres de l'organisme", icon: Users2, color: "text-indigo-400" },
		{ value: "shared" as const, label: "Partagé / Restreint", desc: "Visible par les personnes sélectionnées", icon: Building2, color: "text-emerald-400" },
	];
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md border border-white/5 bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="px-5 pt-5 pb-3 border-b border-border/50">
					<div className="flex items-center gap-2 text-sm font-semibold"><Share2 className="h-4 w-4 text-blue-400" />Partager — {targetName}</div>
				</div>
				<div className="p-5 space-y-3">
					<p className="text-xs text-muted-foreground">Définissez la visibilité de ce contenu.</p>
					<div className="space-y-2">
						{visOptions.map((opt) => (
							<button key={opt.value} onClick={() => setVisibility(opt.value)} className={cn("w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left", visibility === opt.value ? "border-primary/40 bg-primary/10" : "border-border/50 hover:border-border")}>
								<opt.icon className={cn("h-5 w-5 shrink-0", opt.color)} />
								<div>
									<p className="text-xs font-medium">{opt.label}</p>
									<p className="text-[10px] text-muted-foreground">{opt.desc}</p>
								</div>
							</button>
						))}
					</div>
				</div>
				<div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Appliquer</button>
				</div>
			</div>
		</div>
	);
}

/* ── ManageAccessDialog ── */

function ManageAccessDialog({ open, onClose, targetName }: { open: boolean; onClose: () => void; targetName: string }) {
	const [accessLevel, setAccessLevel] = useState("private");
	const options = [
		{ value: "private", label: "Privé Restreint" },
		{ value: "team", label: "Équipe (Interne)" },
		{ value: "specific", label: "Accès Spécifique" },
	];
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md border border-amber-500/20 bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="px-5 pt-5 pb-3 border-b border-border/50">
					<div className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-amber-400" />Gérer les accès du dossier (Admin)</div>
					<p className="text-[10px] text-muted-foreground mt-1">{targetName}</p>
				</div>
				<div className="p-5 space-y-3">
					<div className="space-y-2">
						{options.map((opt) => (
							<button key={opt.value} onClick={() => setAccessLevel(opt.value)} className={cn("w-full p-3 rounded-lg border text-left text-xs font-medium transition-all", accessLevel === opt.value ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "border-border/50 text-muted-foreground hover:border-border")}>
								{opt.label}
							</button>
						))}
					</div>
				</div>
				<div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors">Appliquer les accès</button>
				</div>
			</div>
		</div>
	);
}

/* ── ArchivePolicyDialog ── */

function ArchivePolicyDialog({ open, onClose, targetName, itemType }: { open: boolean; onClose: () => void; targetName: string; itemType: "folder" | "document" }) {
	const [selectedCategoryId, setSelectedCategoryId] = useState("");
	const [countingStart, setCountingStart] = useState<CountingStartEvent>("date_creation");
	const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
	const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>("internal");
	const [inheritChildren, setInheritChildren] = useState(true);
	const [inheritDocuments, setInheritDocuments] = useState(true);

	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-2xl max-h-[90vh] border border-border/50 bg-popover rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
				<div className="px-6 pt-6 pb-4 border-b border-border/50">
					<div className="flex items-center gap-2 text-base font-semibold">
						<div className="h-8 w-8 rounded-lg bg-cyan-500/15 flex items-center justify-center"><Archive className="h-4 w-4 text-cyan-400" /></div>
						Politique d'archivage
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{itemType === "folder" ? <Folder className="h-3 w-3 inline mr-1" /> : <FileText className="h-3 w-3 inline mr-1" />}
						<span className="font-medium text-foreground/60">{targetName}</span>
						<span className="text-foreground/30"> — configurez la rétention, le cycle de vie et la confidentialité</span>
					</p>
				</div>
				<div className="overflow-y-auto flex-1 px-6 py-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Left Column */}
						<div className="space-y-5">
							<div className="space-y-2">
								<p className="text-xs font-semibold flex items-center gap-1.5"><Tag className="h-3 w-3 text-violet-400" />Catégorie de rétention</p>
								<div className="grid grid-cols-2 gap-1.5">
									{ARCHIVE_CATEGORIES.map((cat) => {
										const Icon = CATEGORY_ICON_MAP[cat.slug] || Archive;
										const colorClasses = CATEGORY_COLOR_MAP[cat.color] || "text-zinc-400 bg-zinc-500/15";
										const isSelected = cat._id === selectedCategoryId;
										return (
											<button key={cat._id} onClick={() => setSelectedCategoryId(cat._id)} className={cn("flex items-center gap-2 p-2 rounded-lg border transition-all text-left", isSelected ? "border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/20" : "border-border/50 bg-card hover:border-border")}>
												<div className={cn("h-6 w-6 rounded flex items-center justify-center shrink-0", colorClasses.split(" ")[1])}>
													<Icon className={cn("h-3 w-3", colorClasses.split(" ")[0])} />
												</div>
												<div className="min-w-0">
													<span className="text-xs">{cat.name}</span>
													<p className="text-[9px] text-muted-foreground">{cat.isPerpetual ? "Perpétuel" : `${cat.retentionYears} ans`}</p>
												</div>
											</button>
										);
									})}
								</div>
							</div>
							<div className="space-y-2">
								<p className="text-xs font-semibold flex items-center gap-1.5"><CalendarClock className="h-3 w-3 text-amber-400" />Début du cycle de vie</p>
								<div className="space-y-1">
									{COUNTING_START_OPTIONS.map((opt) => (
										<button key={opt.value} onClick={() => setCountingStart(opt.value)} className={cn("w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left", countingStart === opt.value ? "border-amber-500/40 bg-amber-500/10" : "border-border/50 bg-card hover:border-border")}>
											<div className={cn("h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0", countingStart === opt.value ? "border-amber-400" : "border-muted-foreground/20")}>
												{countingStart === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
											</div>
											<div className="min-w-0">
												<p className="text-[11px] font-medium">{opt.label}</p>
												<p className="text-[9px] text-muted-foreground leading-tight">{opt.description}</p>
											</div>
										</button>
									))}
								</div>
								{countingStart === "date_manuelle" && (
									<div className="flex items-center gap-2 mt-1 pl-6">
										<input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="h-7 text-xs bg-card border border-border rounded-md px-2" />
									</div>
								)}
							</div>
						</div>
						{/* Right Column */}
						<div className="space-y-5">
							<div className="space-y-2">
								<p className="text-xs font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3 text-rose-400" />Confidentialité</p>
								<div className="grid grid-cols-2 gap-1.5">
									{CONFIDENTIALITY_OPTIONS.map((opt) => (
										<button key={opt.value} onClick={() => setConfidentiality(opt.value)} className={cn("py-2 px-3 rounded-lg border text-[11px] font-medium transition-all", confidentiality === opt.value ? `border-border bg-muted ${opt.color}` : "border-border/50 bg-card text-muted-foreground hover:border-border")}>
											{opt.label}
										</button>
									))}
								</div>
							</div>
							{itemType === "folder" && (
								<div className="space-y-2">
									<p className="text-xs font-semibold flex items-center gap-1.5"><GitBranch className="h-3 w-3 text-teal-400" />Héritage</p>
									<div className="space-y-1.5">
										<div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/50">
											<div><p className="text-[11px] font-medium">Sous-dossiers</p><p className="text-[9px] text-muted-foreground">Héritent de cette politique</p></div>
											<button onClick={() => setInheritChildren(!inheritChildren)} className={cn("w-9 h-5 rounded-full transition-colors relative", inheritChildren ? "bg-primary" : "bg-muted-foreground/30")}>
												<span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", inheritChildren ? "translate-x-4" : "translate-x-0.5")} />
											</button>
										</div>
										<div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/50">
											<div><p className="text-[11px] font-medium">Documents enfants</p><p className="text-[9px] text-muted-foreground">Héritent de la catégorie</p></div>
											<button onClick={() => setInheritDocuments(!inheritDocuments)} className={cn("w-9 h-5 rounded-full transition-colors relative", inheritDocuments ? "bg-primary" : "bg-muted-foreground/30")}>
												<span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", inheritDocuments ? "translate-x-4" : "translate-x-0.5")} />
											</button>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
					<button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 text-white transition-colors flex items-center gap-1.5">
						<Archive className="h-4 w-4" />Enregistrer la politique
					</button>
				</div>
			</div>
		</div>
	);
}

/* ── InfoDialog ── */

function InfoDialog({ open, onClose, item, itemType }: { open: boolean; onClose: () => void; item: { id: string; name: string; createdBy?: string; status?: string; tags?: string[]; updatedAt?: string }; itemType: "folder" | "document" }) {
	if (!open) return null;
	const statusLabel = item.status === "draft" ? "Brouillon" : item.status === "review" ? "En révision" : item.status === "approved" ? "Approuvé" : item.status === "archived" ? "Archivé" : "—";
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md border border-border/50 bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="px-5 pt-5 pb-3 border-b border-border/50">
					<div className="flex items-center gap-2 text-sm font-semibold">
						{itemType === "folder" ? <Folder className="h-4 w-4 text-violet-400" /> : <FileText className="h-4 w-4 text-violet-400" />}
						Informations
					</div>
				</div>
				<div className="px-5 py-4 space-y-4">
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<div className="flex items-center justify-between">
							<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold flex items-center gap-1.5">
								{itemType === "folder" ? <Folder className="h-3 w-3 text-violet-400" /> : <FileText className="h-3 w-3 text-violet-400" />}Nom
							</p>
						</div>
						<p className="text-sm font-medium truncate">{item.name}</p>
						<div className="flex items-center gap-3 pt-1">
							{item.status && (
								<span className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
									<span className={cn("h-1.5 w-1.5 rounded-full", item.status === "draft" ? "bg-zinc-400" : item.status === "review" ? "bg-blue-400" : item.status === "approved" ? "bg-emerald-400" : item.status === "archived" ? "bg-amber-400" : "bg-red-400")} />
									{statusLabel}
								</span>
							)}
							<span className="text-[10px] text-muted-foreground/50 flex items-center gap-1"><User className="h-2.5 w-2.5" />{item.createdBy || "—"}</span>
						</div>
						<p className="text-[9px] font-mono text-muted-foreground/30 break-all pt-0.5">{item.id}</p>
					</div>
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Tag className="h-3 w-3 text-emerald-400" />Tags</p>
						{item.tags && item.tags.length > 0 ? (
							<div className="flex flex-wrap gap-1">
								{item.tags.map((tag) => (
									<span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20">{tag}</span>
								))}
							</div>
						) : (
							<p className="text-[10px] text-muted-foreground/40 italic">Aucun tag assigné</p>
						)}
					</div>
					<div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
						<p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Clock className="h-3 w-3 text-amber-400" />Horodatage</p>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-lg bg-muted/50 border border-border/50 p-2">
								<p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Modifié le</p>
								<p className="text-[11px] font-medium">{item.updatedAt || "—"}</p>
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

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function IDocumentPage() {
	// ─── Org selector (backoffice) ──────────────────────────
	const { activeOrgId, OrgSelector } = useOrgSelector();

	// ─── State ──────────────────────────────────────────────
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
	const [sortBy, setSortBy] = useState("date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

	// ─── Convex queries (données réelles) ───────────────────
	const { data: rawDocuments = [] } = useAuthenticatedConvexQuery(
		api.functions.documentVault.getOrgVault,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Mapper les données Convex → types UI
	const documents = useMemo((): DocItem[] =>
		(rawDocuments as any[]).map((doc) => ({
			id: doc._id,
			title: doc.label ?? doc.files?.[0]?.filename ?? "Document",
			excerpt: "",
			author: "",
			updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString("fr-FR") : "",
			updatedAtTs: doc.updatedAt ?? doc._creationTime,
			status: (doc.status === "validated" ? "approved" : doc.status === "pending" ? "draft" : doc.status ?? "draft") as DocStatus,
			tags: [],
			version: 1,
			folderId: doc.folderId ?? null,
			mimeType: doc.files?.[0]?.mimeType,
		})),
		[rawDocuments],
	);

	const folders = useMemo(() => DEFAULT_FOLDERS, []);

	// Trash mutations
	const { mutateAsync: softDeleteDocMut } = useConvexMutationQuery(
		api.functions.documentVault.softDeleteDocument,
	);
	const { mutateAsync: restoreDocMut } = useConvexMutationQuery(
		api.functions.documentVault.restoreFromTrash,
	);
	const { mutateAsync: permanentDeleteDocMut } = useConvexMutationQuery(
		api.functions.documentVault.permanentlyDeleteFromTrash,
	);
	const { mutateAsync: emptyTrashMut } = useConvexMutationQuery(
		api.functions.documentVault.emptyTrash,
	);

	// Trash query
	const { data: trashData } = useAuthenticatedConvexQuery(
		api.functions.documentVault.getTrashItems,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Super admin check
	const { isSuperAdmin } = useCurrentAdminRole();

	// Dialog states
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [shareTargetName, setShareTargetName] = useState("");
	const [manageAccessOpen, setManageAccessOpen] = useState(false);
	const [manageAccessTargetName, setManageAccessTargetName] = useState("");
	const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
	const [policyTargetName, setPolicyTargetName] = useState("");
	const [policyItemType, setPolicyItemType] = useState<"folder" | "document">("folder");
	const [infoDialogOpen, setInfoDialogOpen] = useState(false);
	const [infoItem, setInfoItem] = useState<any>(null);
	const [infoItemType, setInfoItemType] = useState<"folder" | "document">("folder");
	const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [trashConfirm, setTrashConfirm] = useState<{ type: "soft_delete" | "permanent_delete" | "empty_trash"; itemType: "folder" | "document"; itemId: string; itemName: string } | null>(null);

	// ─── Detecter le dossier Poubelle ───────────────────────
	const isInPoubelle = currentFolderId === "__poubelle";

	// ─── Trash handlers ─────────────────────────────────────
	const handleSoftDeleteDoc = useCallback((docId: string) => {
		const doc = documents.find((d) => d.id === docId);
		setTrashConfirm({ type: "soft_delete", itemType: "document", itemId: docId, itemName: doc?.title ?? "Document" });
	}, [documents]);

	const handleConfirmTrashAction = useCallback(async () => {
		if (!trashConfirm) return;
		try {
			if (trashConfirm.type === "soft_delete" && trashConfirm.itemType === "document") {
				await softDeleteDocMut({ documentId: trashConfirm.itemId as Id<"documents"> });
				toast.success("Document deplace dans la corbeille");
			} else if (trashConfirm.type === "permanent_delete" && trashConfirm.itemType === "document") {
				await permanentDeleteDocMut({ documentId: trashConfirm.itemId as Id<"documents"> });
				toast.success("Document supprime definitivement");
			} else if (trashConfirm.type === "empty_trash" && activeOrgId) {
				const result = await emptyTrashMut({ orgId: activeOrgId });
				toast.success(`Corbeille videe (${result.deletedDocs} documents, ${result.deletedFolders} dossiers)`);
			}
		} catch (e: any) {
			const msg = e?.data ?? e?.message ?? "Erreur";
			toast.error(typeof msg === "string" ? msg : "Une erreur est survenue");
		}
		setTrashConfirm(null);
	}, [trashConfirm, softDeleteDocMut, permanentDeleteDocMut, emptyTrashMut, activeOrgId]);

	const handleRestoreDoc = useCallback(async (docId: string) => {
		try {
			await restoreDocMut({ documentId: docId as Id<"documents"> });
			toast.success("Document restaure");
		} catch (e: any) {
			toast.error(e?.data ?? "Erreur lors de la restauration");
		}
	}, [restoreDocMut]);

	// ─── Breadcrumb path ────────────────────────────────────
	const breadcrumbPath = useMemo(() => {
		if (!currentFolderId) return [];
		const path: { id: string; name: string }[] = [];
		let fId: string | null = currentFolderId;
		while (fId) {
			const folder = folders.find((f) => f.id === fId);
			if (folder) {
				path.unshift({ id: folder.id, name: folder.name });
				fId = folder.parentFolderId;
			} else break;
		}
		return path;
	}, [currentFolderId, folders]);

	// ─── Filtered folders at current level ──────────────────
	const currentFolders = useMemo(() => {
		return folders.filter((f) => f.parentFolderId === currentFolderId);
	}, [folders, currentFolderId]);

	// ─── Folder counts ──────────────────────────────────────
	const foldersWithCounts = useMemo(() => {
		return currentFolders.map((f) => ({
			...f,
			fileCount: documents.filter((d) => d.folderId === f.id).length,
			subfolderCount: folders.filter((sf) => sf.parentFolderId === f.id).length,
		}));
	}, [currentFolders, documents, folders]);

	// ─── Filtered documents at current level ────────────────
	const currentFiles = useMemo(() => {
		if (currentFolderId === null) return [];
		let items = documents.filter((d) => d.folderId === currentFolderId);
		if (search) {
			const q = search.toLowerCase();
			items = items.filter((d) => d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q)));
		}
		if (statusFilter !== "all") {
			items = items.filter((d) => d.status === statusFilter);
		}
		items.sort((a, b) => {
			let cmp = 0;
			switch (sortBy) {
				case "name": cmp = a.title.localeCompare(b.title, "fr"); break;
				case "author": cmp = a.author.localeCompare(b.author, "fr"); break;
				case "date": cmp = a.updatedAtTs - b.updatedAtTs; break;
				case "status": cmp = a.status.localeCompare(b.status); break;
				default: cmp = a.updatedAtTs - b.updatedAtTs;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
		return items;
	}, [documents, currentFolderId, search, statusFilter, sortBy, sortDir]);

	// ─── Status counts ──────────────────────────────────────
	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = { all: documents.length };
		for (const doc of documents) {
			counts[doc.status] = (counts[doc.status] || 0) + 1;
		}
		return counts;
	}, [documents]);

	// ─── Handlers ───────────────────────────────────────────
	const handleOpenFolder = useCallback((folderId: string) => setCurrentFolderId(folderId), []);
	const handleNavigate = useCallback((folderId: string | null) => setCurrentFolderId(folderId), []);

	const handleShare = useCallback((id: string, type: string) => {
		const name = type === "folder" ? folders.find((f) => f.id === id)?.name : documents.find((d) => d.id === id)?.title;
		setShareTargetName(name || "");
		setShareDialogOpen(true);
	}, [folders, documents]);

	const handleManageAccess = useCallback((id: string) => {
		const name = folders.find((f) => f.id === id)?.name || "";
		setManageAccessTargetName(name);
		setManageAccessOpen(true);
	}, [folders]);

	const handleOpenPolicy = useCallback((id: string) => {
		const folder = folders.find((f) => f.id === id);
		const doc = documents.find((d) => d.id === id);
		setPolicyTargetName(folder?.name || doc?.title || "");
		setPolicyItemType(folder ? "folder" : "document");
		setPolicyDialogOpen(true);
	}, [folders, documents]);

	const handleOpenInfo = useCallback((id: string) => {
		const folder = folders.find((f) => f.id === id);
		const doc = documents.find((d) => d.id === id);
		if (folder) {
			setInfoItem({ id: folder.id, name: folder.name, createdBy: folder.createdBy, tags: folder.tags, updatedAt: folder.updatedAt });
			setInfoItemType("folder");
		} else if (doc) {
			setInfoItem({ id: doc.id, name: doc.title, createdBy: doc.author, status: doc.status, tags: doc.tags, updatedAt: doc.updatedAt });
			setInfoItemType("document");
		}
		setInfoDialogOpen(true);
	}, [folders, documents]);

	const hasActiveFilters = statusFilter !== "all" || search;

	// ═══════════════════════════════════════════════════════
	// RENDER
	// ═══════════════════════════════════════════════════════

	return (
		<motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-1 flex-col gap-4 p-3 md:p-4 w-full">
			{/* ── Header ── */}
			<motion.div variants={fadeUp}>
				<PageHeader
					icon={<FileText className="h-5 w-5" />}
					iconBgClass="bg-violet-500/10"
					title="iDocument"
					subtitle={`${documents.length} documents · ${folders.filter((f) => !f.isSystem).length} dossiers`}
					actions={
						<div className="flex items-center gap-2">
							<OrgSelector />
							<button onClick={() => setShowNewFolderDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
								<FolderPlus className="h-3.5 w-3.5" />Nouveau dossier
							</button>
							<button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
								<Plus className="h-3.5 w-3.5" />Nouveau document
							</button>
						</div>
					}
				/>
			</motion.div>

			{/* ── Toolbar ── */}
			<motion.div variants={fadeUp}>
				<div className="rounded-xl bg-secondary p-3">
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative flex-1 min-w-[200px] max-w-[360px]">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<input placeholder="Rechercher dans les documents…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-8 pl-8 text-xs bg-muted/50 border border-border/50 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-primary/30" />
						</div>
						<div className="h-6 w-px bg-border/50 hidden sm:block" />
						<div className="flex items-center gap-1">
							{STATUS_FILTERS.map((f) => (
								<button key={f.value} onClick={() => setStatusFilter(f.value)} className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-all", statusFilter === f.value ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30" : "text-muted-foreground hover:bg-muted")}>
									{f.label}
									{statusCounts[f.value] !== undefined && <span className="ml-1 text-[9px] opacity-60">({statusCounts[f.value]})</span>}
								</button>
							))}
						</div>
						{hasActiveFilters && (
							<>
								<div className="h-6 w-px bg-border/50 hidden sm:block" />
								<button className="flex items-center gap-1.5 h-7 text-[11px] text-red-400 hover:text-red-300 px-2" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
									<X className="h-3 w-3" /> Effacer
								</button>
							</>
						)}
						<div className="ml-auto">
							<ViewModeToggle value={viewMode} onChange={setViewMode} />
						</div>
					</div>
				</div>
			</motion.div>

			{/* ── Breadcrumb ── */}
			<BreadcrumbPath path={breadcrumbPath} onNavigate={handleNavigate} rootLabel="Documents" rootIcon={FileText} />

			{/* ── Vue Poubelle ── */}
			{isInPoubelle && trashData ? (
				<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Trash2 className="h-4 w-4 text-red-400" />
							<span className="text-sm font-medium">{trashData.totalCount} element{trashData.totalCount > 1 ? "s" : ""} dans la corbeille</span>
						</div>
						{isSuperAdmin && trashData.totalCount > 0 && (
							<button onClick={() => setTrashConfirm({ type: "empty_trash", itemType: "document", itemId: "", itemName: "" })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
								<Trash2 className="h-3.5 w-3.5" />Vider la corbeille
							</button>
						)}
					</div>
					{trashData.folders.length > 0 && (
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">Dossiers supprimes</p>
							<div className="space-y-1">
								{trashData.folders.map((folder: any) => (
									<div key={folder._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
										<div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Folder className="h-4 w-4 text-amber-400/60" /></div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">{folder.name}</p>
											<p className="text-[10px] text-muted-foreground">Supprime le {new Date(folder.deletedAt).toLocaleDateString("fr-FR")}{folder.deletedByName && <span> par {folder.deletedByName}</span>}</p>
										</div>
										<div className="flex items-center gap-1">
											<button onClick={() => handleRestoreDoc(folder._id)} className="h-7 px-2 rounded-md text-[11px] hover:bg-emerald-500/10 text-emerald-400 transition-colors flex items-center gap-1"><Undo2 className="h-3.5 w-3.5" />Restaurer</button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
					{trashData.documents.length > 0 && (
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">Documents supprimes</p>
							<div className="space-y-1">
								{trashData.documents.map((doc: any) => (
									<div key={doc._id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
										<div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-violet-400/60" /></div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">{doc.label ?? doc.files?.[0]?.filename ?? "Document"}</p>
											<p className="text-[10px] text-muted-foreground">Supprime le {new Date(doc.deletedAt).toLocaleDateString("fr-FR")}{doc.deletedByName && <span> par {doc.deletedByName}</span>}</p>
										</div>
										<div className="flex items-center gap-1">
											<button onClick={() => handleRestoreDoc(doc._id)} className="h-7 px-2 rounded-md text-[11px] hover:bg-emerald-500/10 text-emerald-400 transition-colors flex items-center gap-1"><Undo2 className="h-3.5 w-3.5" />Restaurer</button>
											{isSuperAdmin && (
												<button onClick={() => setTrashConfirm({ type: "permanent_delete", itemType: "document", itemId: doc._id, itemName: doc.label ?? "Document" })} className="h-7 px-2 rounded-md text-[11px] hover:bg-red-500/10 text-red-400 transition-colors flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /></button>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
					{trashData.totalCount === 0 && (
						<div className="flex flex-col items-center py-16 text-center">
							<div className="h-16 w-16 rounded-2xl bg-zinc-500/10 flex items-center justify-center mb-4"><Trash2 className="h-8 w-8 text-zinc-400/40" /></div>
							<h3 className="text-lg font-semibold mb-1">Corbeille vide</h3>
							<p className="text-sm text-muted-foreground">Aucun element dans la corbeille.</p>
						</div>
					)}
				</motion.div>
			) : (
			<>
			{/* ── Content — Grid View ── */}
			<AnimatePresence mode="wait">
				{viewMode === "grid" && (
					<motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
						{/* Folders */}
						{foldersWithCounts.length > 0 && (
							<div className="mb-6">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 px-1">Dossiers</p>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
									{foldersWithCounts.map((folder) => (
										<VaultFolderCard
											key={folder.id}
											label={folder.name}
											count={folder.fileCount}
											subfolderCount={folder.subfolderCount}
											onClick={() => handleOpenFolder(folder.id)}
											contextMenu={
												<FolderContextMenu
													itemId={folder.id}
													itemName={folder.name}
													itemType="folder"
													onShare={handleShare}
													onSavePolicy={handleOpenPolicy}
													onInfo={handleOpenInfo}
													onManageAccess={handleManageAccess}
													onCreateSubfolder={(id) => { setCurrentFolderId(id); setShowNewFolderDialog(true); }}
													isSystem={folder.isSystem}
												/>
											}
											badges={
												folder.isSystem ? (
													<span className="text-[9px] h-4 px-1.5 rounded-full bg-zinc-500/15 text-zinc-400 inline-flex items-center font-medium">Système</span>
												) : null
											}
											tags={
												folder.tags.length > 0 ? folder.tags.slice(0, 2).map((t) => (
													<span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border">{t}</span>
												)) : null
											}
										/>
									))}
								</div>
							</div>
						)}
						{/* Files */}
						{currentFiles.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 px-1">Documents</p>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
									{currentFiles.map((doc) => {
										const st = STATUS_CFG[doc.status];
										const cat = ARCHIVE_CATEGORIES.find((c) => c.slug === doc.archiveCategorySlug);
										return (
											<VaultFileCard
												key={doc.id}
												title={doc.title}
												author={doc.author}
												authorInitials={doc.authorInitials}
												date={doc.updatedAt}
												version={doc.version}
												retentionCategory={cat?.name}
												retentionColor={cat ? CATEGORY_COLOR_MAP[cat.color] : undefined}
												statusBadge={
													<span className={cn("text-[9px] h-5 border inline-flex items-center gap-1 px-1.5 rounded-full font-medium", st.class)}>
														<span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
														{st.label}
													</span>
												}
												contextMenu={
													<FolderContextMenu
														itemId={doc.id}
														itemName={doc.title}
														itemType="document"
														onShare={handleShare}
														onSavePolicy={handleOpenPolicy}
														onInfo={handleOpenInfo}
														onDelete={handleSoftDeleteDoc}
													/>
												}
												tags={doc.tags}
												onClick={() => handleOpenInfo(doc.id)}
											/>
										);
									})}
								</div>
							</div>
						)}
						{/* Empty state */}
						{foldersWithCounts.length === 0 && currentFiles.length === 0 && (
							<div className="flex flex-col items-center py-16 text-center">
								<div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
									<FolderOpen className="h-8 w-8 text-violet-400/60" />
								</div>
								<h3 className="text-lg font-semibold mb-1">Dossier vide</h3>
								<p className="text-sm text-muted-foreground max-w-sm">Ce dossier ne contient aucun document. Créez un nouveau document ou importez des fichiers.</p>
							</div>
						)}
					</motion.div>
				)}

				{/* ── Content — List View ── */}
				{viewMode === "list" && (
					<motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
						<div className="border border-border/50 rounded-xl overflow-hidden bg-card">
							{/* Header */}
							<div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/50 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								<div className="col-span-5 flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => { setSortBy("name"); setSortDir(sortBy === "name" && sortDir === "asc" ? "desc" : "asc"); }}>Nom {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}</div>
								<div className="col-span-2">Auteur</div>
								<div className="col-span-2 cursor-pointer hover:text-foreground" onClick={() => { setSortBy("date"); setSortDir(sortBy === "date" && sortDir === "asc" ? "desc" : "asc"); }}>Modifié {sortBy === "date" && (sortDir === "asc" ? "↑" : "↓")}</div>
								<div className="col-span-1">Statut</div>
								<div className="col-span-2">Tags</div>
							</div>
							{/* Folders */}
							{foldersWithCounts.map((folder) => (
								<div key={folder.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => handleOpenFolder(folder.id)}>
									<div className="col-span-5 flex items-center gap-2">
										<div className="h-6 w-6 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0"><Folder className="h-3 w-3 text-amber-400" /></div>
										<span className="text-xs font-medium truncate">{folder.name}</span>
										<span className="text-[9px] text-muted-foreground/50">{folder.fileCount} fichiers</span>
									</div>
									<div className="col-span-2 text-xs text-muted-foreground flex items-center">{folder.createdBy}</div>
									<div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{folder.updatedAt}</div>
									<div className="col-span-1" />
									<div className="col-span-2 flex items-center gap-1">
										{folder.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border">{t}</span>)}
									</div>
								</div>
							))}
							{/* Files */}
							{currentFiles.map((doc) => {
								const st = STATUS_CFG[doc.status];
								return (
									<div key={doc.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => handleOpenInfo(doc.id)}>
										<div className="col-span-5 flex items-center gap-2">
											<div className="h-6 w-6 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0"><FileText className="h-3 w-3 text-violet-400" /></div>
											<span className="text-xs font-medium truncate">{doc.title}</span>
										</div>
										<div className="col-span-2 flex items-center gap-1.5">
											<div className="h-5 w-5 rounded-full bg-violet-500/15 flex items-center justify-center"><span className="text-[8px] text-violet-300 font-bold">{doc.authorInitials}</span></div>
											<span className="text-xs text-muted-foreground">{doc.author}</span>
										</div>
										<div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{doc.updatedAt}</div>
										<div className="col-span-1 flex items-center">
											<span className={cn("text-[10px] h-5 border inline-flex items-center gap-1 px-1.5 rounded-full", st.class)}>
												<span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />{st.label}
											</span>
										</div>
										<div className="col-span-2 flex items-center gap-1 flex-wrap">
											{doc.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}
											{doc.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{doc.tags.length - 2}</span>}
										</div>
									</div>
								);
							})}
							{foldersWithCounts.length === 0 && currentFiles.length === 0 && (
								<div className="py-12 text-center text-sm text-muted-foreground">Aucun contenu dans ce dossier</div>
							)}
						</div>
					</motion.div>
				)}

				{/* ── Content — Column View ── */}
				{viewMode === "column" && (
					<motion.div key="column" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
						<div className="border border-border/50 rounded-xl bg-card overflow-hidden">
							<div className="flex h-[500px]">
								{/* Root column */}
								<div className="w-60 border-r border-border/50 overflow-y-auto">
									<div className="p-2 text-[10px] font-semibold uppercase text-muted-foreground/60 px-3">Racine</div>
									{folders.filter((f) => f.parentFolderId === null).map((folder) => (
										<button key={folder.id} onClick={() => handleOpenFolder(folder.id)} className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left", currentFolderId === folder.id && "bg-primary/10 text-primary")}>
											<Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
											<span className="truncate">{folder.name}</span>
											<ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
										</button>
									))}
								</div>
								{/* Subfolder column */}
								{currentFolderId && (
									<div className="w-60 border-r border-border/50 overflow-y-auto">
										<div className="p-2 text-[10px] font-semibold uppercase text-muted-foreground/60 px-3">{folders.find((f) => f.id === currentFolderId)?.name}</div>
										{folders.filter((f) => f.parentFolderId === currentFolderId).map((folder) => (
											<button key={folder.id} onClick={() => handleOpenFolder(folder.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
												<Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
												<span className="truncate">{folder.name}</span>
												<ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
											</button>
										))}
										{currentFiles.map((doc) => (
											<button key={doc.id} onClick={() => handleOpenInfo(doc.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
												<FileText className="h-3.5 w-3.5 text-violet-400 shrink-0" />
												<span className="truncate">{doc.title}</span>
											</button>
										))}
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
			</AnimatePresence>
			</>
			)}

			{/* ── Trash Confirm Dialog ── */}
			{trashConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTrashConfirm(null)}>
					<div className="w-full max-w-sm border border-border/50 bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="px-5 pt-5 pb-3 border-b border-border/50">
							<div className="flex items-center gap-2 text-sm font-semibold">
								<Trash2 className="h-4 w-4 text-red-400" />
								{trashConfirm.type === "soft_delete" ? "Deplacer vers la corbeille" : trashConfirm.type === "empty_trash" ? "Vider la corbeille" : "Suppression definitive"}
							</div>
						</div>
						<div className="p-5">
							{trashConfirm.type === "soft_delete" ? (
								<p className="text-sm text-muted-foreground">Voulez-vous deplacer <span className="font-medium text-foreground">{trashConfirm.itemName}</span> dans la corbeille ?</p>
							) : trashConfirm.type === "empty_trash" ? (
								<p className="text-sm text-muted-foreground">Voulez-vous supprimer definitivement <span className="font-medium text-red-400">tous les elements</span> de la corbeille ? Cette action est irreversible.</p>
							) : (
								<p className="text-sm text-muted-foreground">Voulez-vous supprimer definitivement <span className="font-medium text-red-400">{trashConfirm.itemName}</span> ? Cette action est irreversible.</p>
							)}
						</div>
						<div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
							<button onClick={() => setTrashConfirm(null)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
							<button onClick={handleConfirmTrashAction} className={cn("px-3 py-1.5 text-xs rounded-md text-white transition-colors", trashConfirm.type === "soft_delete" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700")}>
								{trashConfirm.type === "soft_delete" ? "Deplacer" : "Supprimer"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── New Folder Dialog ── */}
			{showNewFolderDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewFolderDialog(false)}>
					<div className="w-full max-w-md border border-border/50 bg-popover rounded-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="px-5 pt-5 pb-3 border-b border-border/50">
							<div className="flex items-center gap-2 text-sm font-semibold"><FolderPlus className="h-5 w-5 text-violet-400" />Nouveau Dossier</div>
						</div>
						<div className="p-5 space-y-3">
							<div className="space-y-2">
								<label className="text-xs font-medium">Nom du dossier *</label>
								<input placeholder="Ex: Visas 2026" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) setShowNewFolderDialog(false); }} />
							</div>
						</div>
						<div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
							<button onClick={() => setShowNewFolderDialog(false)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors">Annuler</button>
							<button onClick={() => setShowNewFolderDialog(false)} disabled={!newFolderName.trim()} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-50 transition-colors flex items-center gap-1.5">
								<FolderPlus className="h-4 w-4" />Créer
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Dialogs ── */}
			<ShareDialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} targetName={shareTargetName} />
			<ManageAccessDialog open={manageAccessOpen} onClose={() => setManageAccessOpen(false)} targetName={manageAccessTargetName} />
			<ArchivePolicyDialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} targetName={policyTargetName} itemType={policyItemType} />
			<InfoDialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} item={infoItem || { id: "", name: "" }} itemType={infoItemType} />
		</motion.div>
	);
}
