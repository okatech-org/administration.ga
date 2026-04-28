"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DocumentSheet } from "@workspace/ui/components/document-sheet";
import React, { useState, useMemo, useCallback } from "react";
import type { ComponentType } from "react";
import { toast } from "sonner";
import { useOrg } from "../../shell/org-provider";
import { useModuleAccess } from "../../components/shared/access-gate";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type { PageAction, PageEntity } from "../../stores/page-context-store";
import { motion, AnimatePresence } from "motion/react";
import {
	Mail,
	Search,
	Clock,
	Lock,
	Users2,
	Building2,
	Folder,
	FolderOpen,
	FolderPlus,
	Loader2,
	X,
	MoreHorizontal,
	Share2,
	Send,
	Info,
	KeyRound,
	Tag,
	Trash2,
	User,
	LayoutGrid,
	List,
	Columns3,
	ChevronRight,
	Plus,
	BarChart3,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// Sub-components
import { DossierList } from "./_shared/DossierList";
import { DossierDetail } from "./_shared/DossierDetail";
import { DossierCreateWizard } from "./_shared/DossierCreateWizard";
import { Dashboard } from "./_shared/Dashboard";
import { NewCorrespondanceWizard } from "./_shared/NewCorrespondanceWizard";
import { CorrespondanceDossier } from "./_shared/CorrespondanceDossier";
import { CorrespondanceDetail } from "./_shared/CorrespondanceDetail";
import type { InlineAISuggestionProps } from "./_shared/CorrespondanceDetail";

type ActiveTab = "correspondance" | "dossiers" | "dashboard";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type CorrStatus =
	| "draft"
	| "pending"
	| "approved"
	| "sent"
	| "received"
	| "archived";
type ViewMode = "grid" | "list" | "column";
type CorrespondenceType =
	| "note_verbale"
	| "lettre_officielle"
	| "circulaire"
	| "telegramme"
	| "memorandum"
	| "communique";
type Priority = "normal" | "urgent" | "confidentiel";

interface CorrespondenceItem {
	id: string;
	reference: string;
	title: string;
	type: CorrespondenceType;
	sender: string;
	senderInitials: string;
	recipient: string;
	updatedAt: string;
	updatedAtTs: number;
	status: CorrStatus;
	tags: string[];
	priority: Priority;
	folderId: string;
	attachments: number;
	isCopy?: boolean;
	recipientStatus?: string;
	copyOwnerOrgId?: string;
	documents?: any[];
	deletedAt?: number;
	_id?: string;
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

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CFG: Record<
	CorrStatus,
	{ label: string; class: string; dot: string }
> = {
	draft: {
		label: "Brouillon",
		class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
		dot: "bg-zinc-400",
	},
	pending: {
		label: "En attente",
		class: "bg-blue-500/15 text-blue-400 border-blue-500/20",
		dot: "bg-blue-400",
	},
	approved: {
		label: "Approuvé",
		class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
		dot: "bg-emerald-400",
	},
	sent: {
		label: "Envoyé",
		class: "bg-violet-500/15 text-violet-400 border-violet-500/20",
		dot: "bg-violet-400",
	},
	received: {
		label: "Reçu",
		class: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
		dot: "bg-indigo-400",
	},
	archived: {
		label: "Archivé",
		class: "bg-amber-500/15 text-amber-400 border-amber-500/20",
		dot: "bg-amber-400",
	},
};

const STATUS_FILTERS: { value: CorrStatus | "all"; label: string }[] = [
	{ value: "all", label: "Tous" },
	{ value: "draft", label: "Brouillons" },
	{ value: "pending", label: "En attente" },
	{ value: "approved", label: "Approuvés" },
	{ value: "sent", label: "Envoyés" },
	{ value: "received", label: "Reçus" },
	{ value: "archived", label: "Archivés" },
];

const CORRESPONDENCE_TYPE_CONFIG: Record<
	CorrespondenceType,
	{ label: string; color: string; icon: string }
> = {
	note_verbale: {
		label: "Note Verbale",
		color: "text-cyan-400 bg-cyan-500/15",
		icon: "Mail",
	},
	lettre_officielle: {
		label: "Lettre Officielle",
		color: "text-violet-400 bg-violet-500/15",
		icon: "Mail",
	},
	circulaire: {
		label: "Circulaire",
		color: "text-amber-400 bg-amber-500/15",
		icon: "Mail",
	},
	telegramme: {
		label: "Télégramme",
		color: "text-red-400 bg-red-500/15",
		icon: "Mail",
	},
	memorandum: {
		label: "Mémorandum",
		color: "text-emerald-400 bg-emerald-500/15",
		icon: "Mail",
	},
	communique: {
		label: "Communiqué",
		color: "text-blue-400 bg-blue-500/15",
		icon: "Mail",
	},
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
	normal: { label: "Normal", color: "text-muted-foreground" },
	urgent: { label: "Urgent", color: "text-red-400" },
	confidentiel: { label: "Confidentiel", color: "text-amber-400" },
};

const RECIPIENT_STATUS_CFG: Record<
	string,
	{ label: string; class: string; dot: string }
> = {
	en_transit: {
		label: "En transit",
		class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
		dot: "bg-zinc-400",
	},
	recu: {
		label: "Reçu",
		class: "bg-blue-500/15 text-blue-400 border-blue-500/20",
		dot: "bg-blue-400",
	},
	en_attente: {
		label: "En attente",
		class: "bg-orange-500/15 text-orange-400 border-orange-500/20",
		dot: "bg-orange-400",
	},
	approuve: {
		label: "Approuvé",
		class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
		dot: "bg-emerald-400",
	},
	repondu: {
		label: "Répondu",
		class: "bg-violet-500/15 text-violet-400 border-violet-500/20",
		dot: "bg-violet-400",
	},
};

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const SYSTEM_FOLDERS: FolderItem[] = [
	{
		id: "__brouillon",
		name: "Brouillons",
		parentFolderId: null,
		tags: [],
		fileCount: 0,
		subfolderCount: 0,
		updatedAt: "",
		createdBy: "Système",
		isSystem: true,
	},
	{
		id: "__envoye",
		name: "Envoyés",
		parentFolderId: null,
		tags: [],
		fileCount: 0,
		subfolderCount: 0,
		updatedAt: "",
		createdBy: "Système",
		isSystem: true,
	},
	{
		id: "__recu",
		name: "Reçus",
		parentFolderId: null,
		tags: [],
		fileCount: 0,
		subfolderCount: 0,
		updatedAt: "",
		createdBy: "Système",
		isSystem: true,
	},
	{
		id: "__corbeille",
		name: "Corbeille",
		parentFolderId: null,
		tags: [],
		fileCount: 0,
		subfolderCount: 0,
		updatedAt: "",
		createdBy: "Système",
		isSystem: true,
	},
];

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const fadeUp = {
	hidden: { opacity: 0, y: 16 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.35, ease: "easeOut" as const },
	},
};
const stagger = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.04 } },
};

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS (local — non partagées)
// ═══════════════════════════════════════════════════════════════

function DynamicFolderIcon({
	count,
	size = 64,
	hovered = false,
	className = "",
}: {
	count: number;
	size?: number;
	className?: string;
	hovered?: boolean;
}) {
	const sheets = Math.min(Math.max(count, 0), 3);
	const sheetConfigs = [
		{
			x: 62,
			y: 148,
			w: 300,
			h: 200,
			rx: 15,
			rotate: -3,
			fill: "#ffeac5",
			hoverY: -18,
		},
		{
			x: 42,
			y: 168,
			w: 300,
			h: 200,
			rx: 15,
			rotate: 0,
			fill: "#fff7e6",
			hoverY: -14,
		},
		{
			x: 52,
			y: 158,
			w: 290,
			h: 195,
			rx: 15,
			rotate: 3,
			fill: "#ffffff",
			hoverY: -22,
		},
	];
	const visibleSheets =
		sheets === 0
			? []
			: sheets === 1
				? [sheetConfigs[1]]
				: sheets === 2
					? [sheetConfigs[0], sheetConfigs[1]]
					: [sheetConfigs[0], sheetConfigs[1], sheetConfigs[2]];

	return (
		<motion.svg
			viewBox="0 0 512 512"
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			className={className}
			initial={{ scale: 1 }}
			whileHover={{ scale: 1.08 }}
			transition={{ type: "spring", stiffness: 400, damping: 20 }}
		>
			<path
				d="m214.2 107-40.2-29.9c-9.5-7-20.9-10.8-32.7-10.8h-110.2c-16.6 0-30 13.4-30 30v349.5h404.1c15.2 0 27.4-12.3 27.4-27.4v-270.6c0-16.6-13.4-30-30-30h-155.6c-11.8 0-23.3-3.8-32.8-10.8z"
				fill="#f6c012"
			/>
			{visibleSheets.map((sheet, i) => (
				<motion.rect
					key={i}
					x={sheet.x}
					y={sheet.y}
					width={sheet.w}
					height={sheet.h}
					rx={sheet.rx}
					fill={sheet.fill}
					style={{
						transformOrigin: `${sheet.x + sheet.w / 2}px ${sheet.y + sheet.h}px`,
					}}
					initial={{ opacity: 0, y: 20 }}
					animate={{
						opacity: 1,
						y: hovered ? sheet.hoverY : 0,
						rotate: sheet.rotate + (hovered ? sheet.rotate * 0.5 : 0),
					}}
					transition={{
						opacity: { duration: 0.3, delay: i * 0.08 },
						y: { type: "spring", stiffness: 300, damping: 20 },
						rotate: { type: "spring", stiffness: 300, damping: 20 },
					}}
				/>
			))}
			<path
				d="m85.2 220.1-84.1 225.6h410.8c12.5 0 23.7-7.8 28.1-19.5l69-185.2c7.3-19.6-7.2-40.5-28.1-40.5h-367.6c-12.5.1-23.7 7.8-28.1 19.6z"
				fill="#fbd87c"
			/>
		</motion.svg>
	);
}

function VaultFolderCard({
	label,
	count,
	subfolderCount = 0,
	onClick,
	className,
	contextMenu,
	badges,
	tags,
	isDragOver,
	isSelected = false,
}: {
	label: string;
	count: number;
	subfolderCount?: number;
	onClick?: () => void;
	className?: string;
	contextMenu?: React.ReactNode;
	badges?: React.ReactNode;
	tags?: React.ReactNode;
	isDragOver?: boolean;
	isSelected?: boolean;
}) {
	const [isHovered, setIsHovered] = useState(false);
	return (
		<div
			className={cn(
				"group relative flex h-full w-full flex-col items-center justify-center rounded-2xl p-2",
				isDragOver ? "bg-primary/10 ring-2 ring-primary/50" : "",
				isSelected && !isDragOver && "bg-violet-500/10 ring-2 ring-violet-500",
				className,
			)}
		>
			<motion.div
				role="button"
				tabIndex={0}
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.97 }}
				onClick={onClick}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				className="relative flex w-[140px] cursor-pointer flex-col items-center justify-center rounded-xl p-3 transition-colors outline-none hover:bg-muted/40"
			>
				<div className="pointer-events-none absolute top-1 left-1/2 z-10 flex w-full -translate-x-1/2 flex-col items-center text-center">
					<div className="pointer-events-auto -mt-2 flex scale-90 flex-col items-center justify-center gap-0.5">
						{badges}
					</div>
				</div>
				<div className="relative mt-1 flex w-full justify-center">
					<DynamicFolderIcon
						count={count + subfolderCount}
						size={96}
						hovered={isHovered}
						className="drop-shadow-lg"
					/>
					<div className="absolute -top-1 right-1 z-10 flex flex-col items-end gap-0.5">
						{subfolderCount > 0 && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white shadow-sm"
							>
								<Folder className="h-2.5 w-2.5" />
								{subfolderCount}
							</motion.span>
						)}
						{count > 0 && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white shadow-sm"
							>
								<Mail className="h-2.5 w-2.5" />
								{count}
							</motion.span>
						)}
					</div>
					{contextMenu && (
						<div
							className="pointer-events-auto absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 opacity-0 transition-all group-hover:opacity-100 hover:scale-125"
							onClick={(e) => e.stopPropagation()}
						>
							{contextMenu}
						</div>
					)}
				</div>
				<div className="mt-3 flex w-full flex-col items-center">
					<span className="line-clamp-2 w-full px-1 text-center text-sm leading-tight font-semibold text-foreground">
						{label}
					</span>
					{tags && (
						<div className="mt-1.5 flex w-full flex-wrap items-center justify-center gap-1">
							{tags}
						</div>
					)}
				</div>
			</motion.div>
		</div>
	);
}

function ViewModeToggle({
	value,
	onChange,
}: {
	value: ViewMode;
	onChange: (v: ViewMode) => void;
}) {
	const modes: { value: ViewMode; icon: React.ElementType; label: string }[] = [
		{ value: "grid", icon: LayoutGrid, label: "Grille" },
		{ value: "list", icon: List, label: "Liste" },
		{ value: "column", icon: Columns3, label: "Colonnes" },
	];
	return (
		<div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-card p-0.5">
			{modes.map((m) => (
				<button
					key={m.value}
					onClick={() => onChange(m.value)}
					className={cn(
						"flex h-7 w-7 items-center justify-center rounded-md transition-all",
						value === m.value
							? "bg-primary/10 text-primary shadow-sm"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					title={m.label}
				>
					<m.icon className="h-3.5 w-3.5" />
				</button>
			))}
		</div>
	);
}

function BreadcrumbPath({
	path,
	onNavigate,
	rootLabel = "Correspondances",
	rootIcon: RootIcon = Mail,
}: {
	path: { id: string; name: string }[];
	onNavigate: (id: string | null) => void;
	rootLabel?: string;
	rootIcon?: React.ElementType;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1 text-sm">
			<button
				onClick={() => onNavigate(null)}
				className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<RootIcon className="h-3.5 w-3.5" />
				<span className="text-xs font-medium">{rootLabel}</span>
			</button>
			{path.map((segment, i) => (
				<React.Fragment key={segment.id}>
					<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
					{i < path.length - 1 ? (
						<button
							onClick={() => onNavigate(segment.id)}
							className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							{segment.name}
						</button>
					) : (
						<span className="px-2 py-1 text-xs font-medium text-foreground">
							{segment.name}
						</span>
					)}
				</React.Fragment>
			))}
		</div>
	);
}

function FolderContextMenu({
	itemId,
	itemName,
	itemType,
	onShare,
	onInfo,
	onTransmit,
	onManageAccess,
	onDelete,
	isSystem,
}: {
	itemId: string;
	itemName: string;
	itemType: "folder" | "correspondence";
	onShare?: (id: string, type: string) => void;
	onInfo?: (id: string) => void;
	onTransmit?: (id: string) => void;
	onManageAccess?: (id: string) => void;
	onDelete?: (id: string) => void;
	isSystem?: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative">
			<button
				onClick={(e) => {
					e.stopPropagation();
					setOpen(!open);
				}}
				className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-foreground"
				title="Actions"
				aria-label="Actions"
			>
				<MoreHorizontal className="h-4 w-4" />
			</button>
			{open && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					<div
						className="absolute top-8 right-0 z-50 w-52 rounded-lg border border-border bg-popover py-1 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="px-3 py-1.5 text-[10px] text-muted-foreground/60">
							{itemType === "folder" ? "Dossier" : "Correspondance"} — Actions
						</div>
						{onShare && (
							<button
								onClick={() => {
									onShare(itemId, itemType);
									setOpen(false);
								}}
								className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
							>
								<Share2 className="h-3.5 w-3.5 text-blue-400" />
								Partager
							</button>
						)}
						{onInfo && (
							<button
								onClick={() => {
									onInfo(itemId);
									setOpen(false);
								}}
								className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
							>
								<Info className="h-3.5 w-3.5 text-sky-400" />
								Informations
							</button>
						)}
						{onTransmit && (
							<button
								onClick={() => {
									onTransmit(itemId);
									setOpen(false);
								}}
								className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
							>
								<Send className="h-3.5 w-3.5 text-violet-400" />
								Transmettre
							</button>
						)}
						{itemType === "folder" && onManageAccess && (
							<button
								onClick={() => {
									onManageAccess(itemId);
									setOpen(false);
								}}
								className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
							>
								<KeyRound className="h-3.5 w-3.5 text-amber-400" />
								Gérer accès
							</button>
						)}
						{!isSystem && onDelete && (
							<>
								<div className="my-1 border-t border-border/50" />
								<button
									onClick={() => {
										onDelete(itemId);
										setOpen(false);
									}}
									className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-muted"
								>
									<Trash2 className="h-3.5 w-3.5" />
									Supprimer
								</button>
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// DIALOGS
// ═══════════════════════════════════════════════════════════════

function ShareDialog({
	open,
	onClose,
	targetName,
}: {
	open: boolean;
	onClose: () => void;
	targetName: string;
}) {
	const [visibility, setVisibility] = useState<"private" | "team" | "shared">(
		"private",
	);
	const visOptions = [
		{
			value: "private" as const,
			label: "Privé",
			desc: "Seul vous pouvez voir ce contenu",
			icon: Lock,
			color: "text-zinc-400",
		},
		{
			value: "team" as const,
			label: "Équipe / Interne",
			desc: "Visible par les membres de l'organisme",
			icon: Users2,
			color: "text-indigo-400",
		},
		{
			value: "shared" as const,
			label: "Partagé / Restreint",
			desc: "Visible par les personnes sélectionnées",
			icon: Building2,
			color: "text-emerald-400",
		},
	];
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-white/5 bg-popover shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-border/50 px-5 pt-5 pb-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Share2 className="h-4 w-4 text-blue-400" />
						Partager — {targetName}
					</div>
				</div>
				<div className="space-y-3 p-5">
					<p className="text-xs text-muted-foreground">
						Définissez la visibilité de ce contenu.
					</p>
					<div className="space-y-2">
						{visOptions.map((opt) => (
							<button
								key={opt.value}
								onClick={() => setVisibility(opt.value)}
								className={cn(
									"flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
									visibility === opt.value
										? "border-primary/40 bg-primary/10"
										: "border-border/50 hover:border-border",
								)}
							>
								<opt.icon className={cn("h-5 w-5 shrink-0", opt.color)} />
								<div>
									<p className="text-xs font-medium">{opt.label}</p>
									<p className="text-[10px] text-muted-foreground">
										{opt.desc}
									</p>
								</div>
							</button>
						))}
					</div>
				</div>
				<div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
					<button
						onClick={onClose}
						className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
					>
						Annuler
					</button>
					<button
						onClick={onClose}
						className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
					>
						Appliquer
					</button>
				</div>
			</div>
		</div>
	);
}

function ManageAccessDialog({
	open,
	onClose,
	targetName,
}: {
	open: boolean;
	onClose: () => void;
	targetName: string;
}) {
	const [accessLevel, setAccessLevel] = useState("private");
	const options = [
		{ value: "private", label: "Privé Restreint" },
		{ value: "team", label: "Équipe (Interne)" },
		{ value: "specific", label: "Accès Spécifique" },
	];
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-popover shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-border/50 px-5 pt-5 pb-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<KeyRound className="h-4 w-4 text-amber-400" />
						Gérer les accès du dossier (Admin)
					</div>
					<p className="mt-1 text-[10px] text-muted-foreground">{targetName}</p>
				</div>
				<div className="space-y-3 p-5">
					<div className="space-y-2">
						{options.map((opt) => (
							<button
								key={opt.value}
								onClick={() => setAccessLevel(opt.value)}
								className={cn(
									"w-full rounded-lg border p-3 text-left text-xs font-medium transition-all",
									accessLevel === opt.value
										? "border-amber-500/20 bg-amber-500/10 text-amber-300"
										: "border-border/50 text-muted-foreground hover:border-border",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
				<div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
					<button
						onClick={onClose}
						className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
					>
						Annuler
					</button>
					<button
						onClick={onClose}
						className="rounded-md bg-amber-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-amber-700"
					>
						Appliquer les accès
					</button>
				</div>
			</div>
		</div>
	);
}

function TransmitDialog({
	open,
	onClose,
	targetName,
}: {
	open: boolean;
	onClose: () => void;
	targetName: string;
}) {
	const [recipient, setRecipient] = useState("");
	const recipients = [
		{ value: "minstry", label: "Ministère des Affaires Étrangères" },
		{ value: "embassy-paris", label: "Ambassade de France" },
		{ value: "embassy-washington", label: "Ambassade des USA" },
		{ value: "onu", label: "Mission Permanente auprès de l'ONU" },
		{ value: "ue", label: "Ambassade auprès de l'UE" },
		{ value: "custom", label: "Destinataire personnalisé" },
	];

	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-violet-500/20 bg-popover shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-border/50 px-5 pt-5 pb-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Send className="h-4 w-4 text-violet-400" />
						Transmettre — {targetName}
					</div>
				</div>
				<div className="space-y-3 p-5">
					<p className="text-xs text-muted-foreground">
						Sélectionnez le destinataire de cette correspondance.
					</p>
					<div className="space-y-2">
						{recipients.map((opt) => (
							<button
								key={opt.value}
								onClick={() => setRecipient(opt.value)}
								className={cn(
									"flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
									recipient === opt.value
										? "border-violet-500/40 bg-violet-500/10"
										: "border-border/50 hover:border-border",
								)}
							>
								<div
									className={cn(
										"flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
										recipient === opt.value
											? "border-violet-400"
											: "border-muted-foreground/20",
									)}
								>
									{recipient === opt.value && (
										<div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
									)}
								</div>
								<div>
									<p className="text-xs font-medium">{opt.label}</p>
								</div>
							</button>
						))}
					</div>
					{recipient === "custom" && (
						<input
							placeholder="Adresse e-mail du destinataire"
							className="mt-2 h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
						/>
					)}
				</div>
				<div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
					<button
						onClick={onClose}
						className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
					>
						Annuler
					</button>
					<button
						onClick={onClose}
						disabled={!recipient}
						className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
					>
						<Send className="h-3.5 w-3.5" />
						Transmettre
					</button>
				</div>
			</div>
		</div>
	);
}

function InfoDialog({
	open,
	onClose,
	item,
	itemType,
}: {
	open: boolean;
	onClose: () => void;
	item: any;
	itemType: "folder" | "correspondence";
}) {
	if (!open) return null;
	const statusLabel = item.status
		? STATUS_CFG[item.status as CorrStatus]?.label || "—"
		: "—";

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-border/50 bg-popover shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-border/50 px-5 pt-5 pb-3">
					<div className="flex items-center gap-2 text-sm font-semibold">
						{itemType === "folder" ? (
							<Folder className="h-4 w-4 text-violet-400" />
						) : (
							<Mail className="h-4 w-4 text-violet-400" />
						)}
						Informations
					</div>
				</div>
				<div className="space-y-4 px-5 py-4">
					<div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
						<div className="flex items-center justify-between">
							<p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
								{itemType === "folder" ? (
									<Folder className="h-3 w-3 text-violet-400" />
								) : (
									<Mail className="h-3 w-3 text-violet-400" />
								)}
								Titre/Nom
							</p>
						</div>
						<p className="truncate text-sm font-medium">
							{item.name || item.title}
						</p>
						{itemType === "correspondence" && item.reference && (
							<p className="text-[9px] text-muted-foreground/50">
								Réf: {item.reference}
							</p>
						)}
						<div className="flex flex-wrap items-center gap-3 pt-1">
							{item.status && (
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
									<span
										className={cn(
											"h-1.5 w-1.5 rounded-full",
											STATUS_CFG[item.status as CorrStatus]?.dot ||
												"bg-muted-foreground",
										)}
									/>
									{statusLabel}
								</span>
							)}
							<span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
								<User className="h-2.5 w-2.5" />
								{item.createdBy || item.sender || "—"}
							</span>
						</div>
						<p className="pt-0.5 font-mono text-[9px] break-all text-muted-foreground/30">
							{item.id}
						</p>
					</div>

					{itemType === "correspondence" && item.type && (
						<div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
							<p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
								Type & Priorité
							</p>
							<div className="flex flex-wrap gap-2">
								<span
									className={cn(
										"rounded-md border px-2 py-1 text-[9px] font-medium",
										CORRESPONDENCE_TYPE_CONFIG[item.type as CorrespondenceType]
											?.color,
									)}
								>
									{CORRESPONDENCE_TYPE_CONFIG[item.type as CorrespondenceType]
										?.label || item.type}
								</span>
								{item.priority && item.priority !== "normal" && (
									<span
										className={cn(
											"rounded-md border px-2 py-1 text-[9px] font-medium",
											item.priority === "urgent"
												? "border-red-500/20 bg-red-500/15 text-red-400"
												: "border-amber-500/20 bg-amber-500/15 text-amber-400",
										)}
									>
										{PRIORITY_CONFIG[item.priority as Priority]?.label ||
											item.priority}
									</span>
								)}
							</div>
						</div>
					)}

					{itemType === "correspondence" && (item.sender || item.recipient) && (
						<div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
							<p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
								Correspondance
							</p>
							{item.sender && (
								<div>
									<p className="text-[9px] text-muted-foreground/60">
										Expéditeur
									</p>
									<p className="text-[11px] font-medium">{item.sender}</p>
								</div>
							)}
							{item.recipient && (
								<div>
									<p className="text-[9px] text-muted-foreground/60">
										Destinataire
									</p>
									<p className="text-[11px] font-medium">{item.recipient}</p>
								</div>
							)}
						</div>
					)}

					{itemType === "correspondence" && item.attachments !== undefined && (
						<div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
							<p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
								Pièces jointes
							</p>
							<p className="text-sm font-medium">
								{item.attachments} fichier{item.attachments !== 1 ? "s" : ""}
							</p>
						</div>
					)}

					<div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
						<p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
							<Tag className="h-3 w-3 text-emerald-400" />
							Tags
						</p>
						{item.tags && item.tags.length > 0 ? (
							<div className="flex flex-wrap gap-1">
								{item.tags.map((tag: string) => (
									<span
										key={tag}
										className="rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-300"
									>
										{tag}
									</span>
								))}
							</div>
						) : (
							<p className="text-[10px] text-muted-foreground/40 italic">
								Aucun tag assigné
							</p>
						)}
					</div>

					<div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
						<p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
							<Clock className="h-3 w-3 text-amber-400" />
							Horodatage
						</p>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-lg border border-border/50 bg-muted/50 p-2">
								<p className="mb-0.5 text-[8px] tracking-wider text-muted-foreground/50 uppercase">
									Modifié le
								</p>
								<p className="text-[11px] font-medium">
									{item.updatedAt || "—"}
								</p>
							</div>
						</div>
					</div>
				</div>
				<div className="flex justify-end border-t border-border/50 px-5 py-3">
					<button
						onClick={onClose}
						className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
					>
						Fermer
					</button>
				</div>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface ICorrespondancePageProps {
	/** Optional: inject AI suggestion badge (agent-web only). */
	InlineAISuggestion?: ComponentType<InlineAISuggestionProps>;
}

export default function ICorrespondancePage({
	InlineAISuggestion,
}: ICorrespondancePageProps = {}) {
	// ─── Org context ────────────────────────────────────────
	const { activeOrgId } = useOrg();
	const { hasMin: hasCorrAccess } = useModuleAccess("correspondence");
	const canCreateCorr = hasCorrAccess("editor");
	const canAdminCorr = hasCorrAccess("admin");

	// ─── Active tab ──────────────────────────────────────────
	const [activeTab, setActiveTab] = useState<ActiveTab>("correspondance");

	// ─── Dossier state ──────────────────────────────────────
	const [selectedDossierId, setSelectedDossierId] = useState<string | null>(
		null,
	);
	const [showDossierWizard, setShowDossierWizard] = useState(false);

	// ─── Dossier queries ────────────────────────────────────
	const { data: dossiers = [] } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.listDossiers,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: typeDemarches = [] } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.listTypeDemarches,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: selectedDossier } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.getDossier,
		selectedDossierId
			? { dossierId: selectedDossierId as Id<"dossierProcedures"> }
			: "skip",
	);
	const { data: dossierTransitions = [] } = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.getTransitions,
		selectedDossierId
			? { dossierId: selectedDossierId as Id<"dossierProcedures"> }
			: "skip",
	);

	// ─── Dashboard queries ──────────────────────────────────
	const { data: dashboardStats } = useAuthenticatedConvexQuery(
		api.functions.correspondanceDashboard.getDashboardStats,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: recentActivity = [] } = useAuthenticatedConvexQuery(
		api.functions.correspondanceDashboard.getRecentActivity,
		activeOrgId ? { orgId: activeOrgId, limit: 20 } : "skip",
	);

	// ─── iAsted page context (avant les mutations pour rester groupé en haut) ──
	const pageEntities = useMemo<PageEntity[]>(() => {
		if (activeTab === "dossiers" && Array.isArray(dossiers)) {
			return (dossiers as any[]).slice(0, 30).map((d) => ({
				id: d._id,
				type: "dossier",
				label: d.title ?? d.reference ?? "Dossier",
				data: { status: d.status, currentStep: d.currentStep },
			}));
		}
		return [];
	}, [activeTab, dossiers]);
	const pageActions = useMemo<PageAction[]>(() => {
		const actions: PageAction[] = [
			{
				id: "switch-tab",
				label: "Changer d'onglet",
				description:
					"params.tab ∈ ['correspondance','dossiers','dashboard']",
			},
			{
				id: "open-dossier",
				label: "Ouvrir un dossier",
				description: "params.dossierId requis (depuis les entités visibles).",
			},
		];
		if (canCreateCorr) {
			actions.push({
				id: "open-dossier-wizard",
				label: "Créer un nouveau dossier",
				description: "Ouvre l'assistant de création de dossier.",
			});
		}
		return actions;
	}, [canCreateCorr]);
	usePageContext({
		module: "icorrespondance",
		title: "iCorrespondance",
		summary: `Onglet: ${activeTab}. ${(dossiers as any[]).length} dossier(s) disponible(s).${selectedDossierId ? ` Dossier sélectionné.` : ""}`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("switch-tab", async (params) => {
		const t = params?.tab as ActiveTab | undefined;
		if (t === "correspondance" || t === "dossiers" || t === "dashboard") {
			setActiveTab(t);
		}
	});
	useRegisterPageAction("open-dossier", async (params) => {
		const id = params?.dossierId as string | undefined;
		if (id) setSelectedDossierId(id);
	});
	useRegisterPageAction("open-dossier-wizard", async () => {
		if (canCreateCorr) setShowDossierWizard(true);
	});

	// ─── Dossier mutations ──────────────────────────────────
	const createDossierMutation = useConvexMutationQuery(
		api.functions.dossierProcedure.createDossier,
	);
	const advanceStepMutation = useConvexMutationQuery(
		api.functions.dossierProcedure.advanceStep,
	);
	const uploadPieceMutation = useConvexMutationQuery(
		api.functions.dossierProcedure.uploadPiece,
	);
	const validatePieceMutation = useConvexMutationQuery(
		api.functions.dossierProcedure.validatePiece,
	);
	const rejectPieceMutation = useConvexMutationQuery(
		api.functions.dossierProcedure.rejectPiece,
	);
	const generateDossierUploadUrl = useConvexMutationQuery(
		api.functions.dossierProcedure.generateUploadUrl,
	);
	const submitDossierMutation = useConvexMutationQuery(
		api.functions.dossierProcedure.submitDossier,
	);

	// ─── Dossier handlers ───────────────────────────────────
	const handleCreateDossier = useCallback(
		async (data: {
			typeDemarcheId: string;
			metadata?: Record<string, any>;
			priorite?: string;
		}) => {
			if (!activeOrgId) return;
			try {
				const id = await createDossierMutation.mutateAsync({
					orgId: activeOrgId,
					typeDemarcheId: data.typeDemarcheId as Id<"typeDemarches">,
					metadata: data.metadata,
					priorite: data.priorite as any,
				});
				setShowDossierWizard(false);
				setSelectedDossierId(id as string);
				toast.success("Dossier créé avec succès");
			} catch {
				toast.error("Erreur lors de la création du dossier");
			}
		},
		[activeOrgId, createDossierMutation],
	);

	const handleDossierAction = useCallback(
		async (action: string, commentaire?: string) => {
			if (!selectedDossierId) return;
			try {
				if (action === "soumettre") {
					await submitDossierMutation.mutateAsync({
						dossierId: selectedDossierId as Id<"dossierProcedures">,
						commentaire,
					});
				} else {
					await advanceStepMutation.mutateAsync({
						dossierId: selectedDossierId as Id<"dossierProcedures">,
						action: action as any,
						commentaire,
					});
				}
				toast.success("Action effectuée");
			} catch (e: any) {
				toast.error(e?.message ?? "Erreur lors de l'action");
			}
		},
		[selectedDossierId, advanceStepMutation, submitDossierMutation],
	);

	const handleUploadDossierPiece = useCallback(
		async (pieceCode: string) => {
			if (!selectedDossierId) return;
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".pdf,.jpg,.jpeg,.png";
			input.onchange = async () => {
				const file = input.files?.[0];
				if (!file) return;
				try {
					const uploadUrl = await generateDossierUploadUrl.mutateAsync({});
					const res = await fetch(uploadUrl as string, {
						method: "POST",
						headers: { "Content-Type": file.type },
						body: file,
					});
					const { storageId } = await res.json();
					await uploadPieceMutation.mutateAsync({
						dossierId: selectedDossierId as Id<"dossierProcedures">,
						pieceCode,
						storageId,
						filename: file.name,
						mimeType: file.type,
						sizeBytes: file.size,
					});
					toast.success("Pièce déposée");
				} catch {
					toast.error("Erreur lors du dépôt de la pièce");
				}
			};
			input.click();
		},
		[selectedDossierId, generateDossierUploadUrl, uploadPieceMutation],
	);

	const handleValidateDossierPiece = useCallback(
		async (pieceCode: string) => {
			if (!selectedDossierId) return;
			try {
				await validatePieceMutation.mutateAsync({
					dossierId: selectedDossierId as Id<"dossierProcedures">,
					pieceCode,
				});
				toast.success("Pièce validée");
			} catch {
				toast.error("Erreur lors de la validation");
			}
		},
		[selectedDossierId, validatePieceMutation],
	);

	const handleRejectDossierPiece = useCallback(
		async (pieceCode: string) => {
			if (!selectedDossierId) return;
			const reason = prompt("Motif du rejet :");
			if (!reason) return;
			try {
				await rejectPieceMutation.mutateAsync({
					dossierId: selectedDossierId as Id<"dossierProcedures">,
					pieceCode,
					reason,
				});
				toast.success("Pièce rejetée");
			} catch {
				toast.error("Erreur lors du rejet");
			}
		},
		[selectedDossierId, rejectPieceMutation],
	);

	// ─── Convex queries — 4 espaces exclusifs ──────────────────
	const { data: rawFolders = [] } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getFolders,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: brouillons = [] } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.getBrouillons,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: envoyes = [] } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.getEnvoyes,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: recus = [] } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.getRecus,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: corbeille = [] } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.getCorbeille,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { data: espaceCounts } = useAuthenticatedConvexQuery(
		api.functions.correspondanceCore.getEspaceCounts,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const rawItems = useMemo(
		() => [
			...(brouillons as any[]),
			...(envoyes as any[]),
			...(recus as any[]),
			...(corbeille as any[]),
		],
		[brouillons, envoyes, recus, corbeille],
	);

	// ─── Convex mutations ────────────────────────────────────
	const createFolderMutation = useConvexMutationQuery(
		api.functions.correspondance.createFolder,
	);
	const createItemMutation = useConvexMutationQuery(
		api.functions.correspondance.createItem,
	);
	const deleteFolderMutation = useConvexMutationQuery(
		api.functions.correspondance.deleteFolder,
	);
	const deleteItemMutation = useConvexMutationQuery(
		api.functions.correspondance.deleteItem,
	);
	const archiveItemMutation = useConvexMutationQuery(
		api.functions.correspondance.archiveItem,
	);

	// ─── Map Convex data → UI types ─────────────────────────
	const correspondences = useMemo(
		(): (CorrespondenceItem & {
			isCopy?: boolean;
			recipientStatus?: string;
			copyOwnerOrgId?: string;
			documents?: any[];
			deletedAt?: number;
			_id?: string;
		})[] =>
			(rawItems as any[]).map((item) => ({
				id: item._id,
				_id: item._id,
				reference: item.reference,
				title: item.title,
				type: item.type as CorrespondenceType,
				sender: item.senderName,
				senderInitials: item.senderName
					.split(" ")
					.map((w: string) => w[0] ?? "")
					.join("")
					.substring(0, 2)
					.toUpperCase(),
				recipient: item.recipientName,
				updatedAt: new Date(item.updatedAt).toLocaleDateString("fr-FR"),
				updatedAtTs: item.updatedAt,
				status: item.status as CorrStatus,
				tags: item.tags,
				priority: item.priority as Priority,
				folderId: item.folderId ?? "__brouillon",
				attachments: item.documents?.length ?? 0,
				isCopy: item.isCopy ?? false,
				recipientStatus: item.recipientStatus,
				copyOwnerOrgId: item.copyOwnerOrgId,
				documents: item.documents ?? [],
				deletedAt: item.deletedAt,
			})),
		[rawItems],
	);

	const folders = useMemo(
		(): FolderItem[] => [
			...SYSTEM_FOLDERS,
			...(rawFolders as any[]).map((f) => ({
				id: f._id as string,
				name: f.name,
				parentFolderId: f.parentFolderId ?? null,
				tags: f.tags,
				fileCount: 0,
				subfolderCount: 0,
				updatedAt: new Date(f.updatedAt).toLocaleDateString("fr-FR"),
				createdBy: "",
				isSystem: false,
			})),
		],
		[rawFolders],
	);

	// ─── State ──────────────────────────────────────────────
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(
		"__brouillon",
	);
	const [openDetailId, setOpenDetailId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<CorrStatus | "all">("all");
	const [sortBy, setSortBy] = useState("date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

	// ─── Dialog states ───────────────────────────────────────
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [shareTargetName, setShareTargetName] = useState("");
	const [manageAccessOpen, setManageAccessOpen] = useState(false);
	const [manageAccessTargetName, setManageAccessTargetName] = useState("");
	const [transmitDialogOpen, setTransmitDialogOpen] = useState(false);
	const [transmitTargetName, setTransmitTargetName] = useState("");
	const [infoDialogOpen, setInfoDialogOpen] = useState(false);
	const [infoItem, setInfoItem] = useState<any>(null);
	const [infoItemType, setInfoItemType] = useState<"folder" | "correspondence">(
		"folder",
	);

	// ─── New folder dialog ───────────────────────────────────
	const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);

	// ─── New correspondance wizard ──────────────────────────
	const [showNewCorrWizard, setShowNewCorrWizard] = useState(false);

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

	const currentFolders = useMemo(() => {
		return folders.filter((f) => f.parentFolderId === currentFolderId);
	}, [folders, currentFolderId]);

	const foldersWithCounts = useMemo(() => {
		return currentFolders.map((f) => ({
			...f,
			fileCount: correspondences.filter((d) => d.folderId === f.id).length,
			subfolderCount: folders.filter((sf) => sf.parentFolderId === f.id).length,
		}));
	}, [currentFolders, correspondences, folders]);

	const currentFiles = useMemo(() => {
		if (currentFolderId === null) return [];

		let items: CorrespondenceItem[];

		if (currentFolderId === "__brouillon") {
			items = correspondences.filter(
				(d) => d.status === "draft" && !d.isCopy && !d.deletedAt,
			);
		} else if (currentFolderId === "__envoye") {
			items = correspondences.filter((d) => d.isCopy === true && !d.deletedAt);
		} else if (currentFolderId === "__recu") {
			items = correspondences.filter(
				(d) => d.status === "received" && !d.isCopy && !d.deletedAt,
			);
		} else if (currentFolderId === "__corbeille") {
			items = correspondences.filter((d) => !!d.deletedAt);
		} else {
			items = correspondences.filter(
				(d) => d.folderId === currentFolderId && !d.deletedAt,
			);
		}
		if (search) {
			const q = search.toLowerCase();
			items = items.filter(
				(d) =>
					d.title.toLowerCase().includes(q) ||
					d.reference.toLowerCase().includes(q) ||
					d.sender.toLowerCase().includes(q) ||
					d.recipient.toLowerCase().includes(q) ||
					d.tags.some((t) => t.toLowerCase().includes(q)),
			);
		}
		if (statusFilter !== "all") {
			items = items.filter((d) => d.status === statusFilter);
		}
		items.sort((a, b) => {
			let cmp = 0;
			switch (sortBy) {
				case "name":
					cmp = a.title.localeCompare(b.title, "fr");
					break;
				case "sender":
					cmp = a.sender.localeCompare(b.sender, "fr");
					break;
				case "date":
					cmp = a.updatedAtTs - b.updatedAtTs;
					break;
				case "status":
					cmp = a.status.localeCompare(b.status);
					break;
				default:
					cmp = a.updatedAtTs - b.updatedAtTs;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
		return items;
	}, [correspondences, currentFolderId, search, statusFilter, sortBy, sortDir]);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = { all: correspondences.length };
		for (const corr of correspondences) {
			counts[corr.status] = (counts[corr.status] || 0) + 1;
		}
		return counts;
	}, [correspondences]);

	// ─── Handlers ───────────────────────────────────────────
	const handleOpenFolder = useCallback(
		(folderId: string) => setCurrentFolderId(folderId),
		[],
	);
	const handleNavigate = useCallback(
		(folderId: string | null) => setCurrentFolderId(folderId),
		[],
	);

	const handleShare = useCallback(
		(id: string, type: string) => {
			const name =
				type === "folder"
					? folders.find((f) => f.id === id)?.name
					: correspondences.find((d) => d.id === id)?.title;
			setShareTargetName(name || "");
			setShareDialogOpen(true);
		},
		[folders, correspondences],
	);

	const handleManageAccess = useCallback(
		(id: string) => {
			const name = folders.find((f) => f.id === id)?.name || "";
			setManageAccessTargetName(name);
			setManageAccessOpen(true);
		},
		[folders],
	);

	const handleOpenTransmit = useCallback(
		(id: string) => {
			const corr = correspondences.find((d) => d.id === id);
			setTransmitTargetName(corr?.title || "");
			setTransmitDialogOpen(true);
		},
		[correspondences],
	);

	const handleOpenInfo = useCallback(
		(id: string) => {
			const folder = folders.find((f) => f.id === id);
			const corr = correspondences.find((d) => d.id === id);
			if (folder) {
				setInfoItem({
					id: folder.id,
					name: folder.name,
					createdBy: folder.createdBy,
					tags: folder.tags,
					updatedAt: folder.updatedAt,
				});
				setInfoItemType("folder");
			} else if (corr) {
				setInfoItem({
					id: corr.id,
					title: corr.title,
					reference: corr.reference,
					type: corr.type,
					sender: corr.sender,
					recipient: corr.recipient,
					status: corr.status,
					tags: corr.tags,
					priority: corr.priority,
					attachments: corr.attachments,
					updatedAt: corr.updatedAt,
				});
				setInfoItemType("correspondence");
			}
			setInfoDialogOpen(true);
		},
		[folders, correspondences],
	);

	const handleCreateFolder = useCallback(async () => {
		if (!newFolderName.trim() || !activeOrgId) return;
		setIsCreatingFolder(true);
		try {
			const isRealFolder =
				currentFolderId !== null &&
				!SYSTEM_FOLDERS.find((f) => f.id === currentFolderId);
			await createFolderMutation.mutateAsync({
				orgId: activeOrgId,
				name: newFolderName.trim(),
				parentFolderId: isRealFolder
					? (currentFolderId as Id<"correspondanceFolders">)
					: undefined,
				tags: [],
			});
			setNewFolderName("");
			setShowNewFolderDialog(false);
			toast.success("Dossier créé");
		} catch {
			toast.error("Erreur lors de la création du dossier");
		} finally {
			setIsCreatingFolder(false);
		}
	}, [newFolderName, activeOrgId, currentFolderId, createFolderMutation]);

	const handleDelete = useCallback(
		async (id: string) => {
			const isFolder = folders.some((f) => f.id === id && !f.isSystem);
			try {
				if (isFolder) {
					await deleteFolderMutation.mutateAsync({
						folderId: id as Id<"correspondanceFolders">,
					});
					toast.success("Dossier supprimé");
				} else {
					await deleteItemMutation.mutateAsync({
						itemId: id as Id<"correspondanceItems">,
					});
					toast.success("Correspondance supprimée");
				}
			} catch {
				toast.error("Erreur lors de la suppression");
			}
		},
		[folders, deleteFolderMutation, deleteItemMutation],
	);

	const handleArchive = useCallback(
		async (id: string) => {
			try {
				await archiveItemMutation.mutateAsync({
					itemId: id as Id<"correspondanceItems">,
				});
				toast.success("Correspondance archivée");
			} catch {
				toast.error("Erreur lors de l'archivage");
			}
		},
		[archiveItemMutation],
	);

	const hasActiveFilters = statusFilter !== "all" || search;

	// ═══════════════════════════════════════════════════════
	// RENDER
	// ═══════════════════════════════════════════════════════

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={stagger}
			className="space-y-5"
		>
			{/* ── Header ── */}
			<motion.div
				variants={fadeUp}
				className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
			>
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/20">
						<Mail className="h-5 w-5 text-white" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							iCorrespondance
						</h1>
						<p className="text-sm text-muted-foreground">
							{correspondences.length} correspondances · {dossiers.length}{" "}
							dossiers de procédure
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{activeTab === "correspondance" && canCreateCorr && (
						<>
							<button
								onClick={() => setShowNewFolderDialog(true)}
								className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
							>
								<FolderPlus className="h-3.5 w-3.5" />
								Nouveau dossier
							</button>
							<button
								onClick={() => setShowNewCorrWizard(true)}
								className="flex items-center gap-1.5 rounded-lg bg-linear-to-r from-indigo-600 to-violet-500 px-3 py-1.5 text-xs text-white transition-colors hover:from-indigo-700 hover:to-violet-600"
							>
								<Plus className="h-3.5 w-3.5" />
								Nouvelle correspondance
							</button>
						</>
					)}
					{activeTab === "dossiers" && !selectedDossierId && canCreateCorr && (
						<button
							onClick={() => setShowDossierWizard(true)}
							className="flex items-center gap-1.5 rounded-lg bg-linear-to-r from-indigo-600 to-violet-500 px-3 py-1.5 text-xs text-white transition-colors hover:from-indigo-700 hover:to-violet-600"
						>
							<Plus className="h-3.5 w-3.5" />
							Nouveau dossier de procédure
						</button>
					)}
				</div>
			</motion.div>

			{/* ── Tab Navigation ── */}
			<motion.div variants={fadeUp}>
				<div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card p-1">
					{[
						{
							key: "correspondance" as ActiveTab,
							label: "Correspondance",
							icon: Mail,
						},
						{ key: "dossiers" as ActiveTab, label: "Dossiers", icon: Folder },
						{
							key: "dashboard" as ActiveTab,
							label: "Tableau de bord",
							icon: BarChart3,
						},
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => {
								setActiveTab(tab.key);
								setSelectedDossierId(null);
							}}
							className={cn(
								"flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all",
								activeTab === tab.key
									? "bg-violet-500/15 text-violet-300 shadow-sm"
									: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
							)}
						>
							<tab.icon className="h-3.5 w-3.5" />
							{tab.label}
							{tab.key === "dossiers" && dossiers.length > 0 && (
								<span className="ml-1 text-[9px] opacity-60">
									({dossiers.length})
								</span>
							)}
						</button>
					))}
				</div>
			</motion.div>

			{/* ═══ TAB: Correspondance ═══ */}
			{activeTab === "correspondance" && (
				<>
					{/* ── Vue détail dossier ── */}
					{openDetailId && activeOrgId && (
						<CorrespondanceDetail
							itemId={openDetailId as Id<"correspondanceItems">}
							currentUserId=""
							currentOrgId={activeOrgId as string}
							onBack={() => setOpenDetailId(null)}
							InlineAISuggestion={InlineAISuggestion}
						/>
					)}

					{/* ── Liste (masquée quand détail ouvert) ── */}
					{!openDetailId && (
						<>
							{/* ── Toolbar ── */}
							<motion.div variants={fadeUp}>
								<div className="rounded-xl border border-border/50 bg-card p-3">
									<div className="flex flex-wrap items-center gap-2">
										<div className="relative max-w-[360px] min-w-[200px] flex-1">
											<Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
											<input
												placeholder="Rechercher dans les correspondances…"
												value={search}
												onChange={(e) => setSearch(e.target.value)}
												className="h-8 w-full rounded-lg border border-border/50 bg-muted/50 px-3 pl-8 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
											/>
										</div>
										<div className="hidden h-6 w-px bg-border/50 sm:block" />
										<div className="flex items-center gap-1">
											{STATUS_FILTERS.map((f) => (
												<button
													key={f.value}
													onClick={() => setStatusFilter(f.value)}
													className={cn(
														"rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
														statusFilter === f.value
															? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
															: "text-muted-foreground hover:bg-muted",
													)}
												>
													{f.label}
													{statusCounts[f.value] !== undefined && (
														<span className="ml-1 text-[9px] opacity-60">
															({statusCounts[f.value]})
														</span>
													)}
												</button>
											))}
										</div>
										{hasActiveFilters && (
											<>
												<div className="hidden h-6 w-px bg-border/50 sm:block" />
												<button
													className="flex h-7 items-center gap-1.5 px-2 text-[11px] text-red-400 hover:text-red-300"
													onClick={() => {
														setSearch("");
														setStatusFilter("all");
													}}
												>
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
							<BreadcrumbPath
								path={breadcrumbPath}
								onNavigate={handleNavigate}
								rootLabel="Correspondances"
								rootIcon={Mail}
							/>

							{/* ── Content — Grid View ── */}
							<AnimatePresence mode="wait">
								{viewMode === "grid" && (
									<motion.div
										key="grid"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.2 }}
									>
										{foldersWithCounts.length > 0 && (
											<div className="mb-6">
												<p className="mb-3 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
													Dossiers
												</p>
												<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
																	onInfo={handleOpenInfo}
																	onManageAccess={handleManageAccess}
																	onDelete={
																		!folder.isSystem ? handleDelete : undefined
																	}
																	isSystem={folder.isSystem}
																/>
															}
															badges={
																folder.isSystem ? (
																	<span className="inline-flex h-4 items-center rounded-full bg-zinc-500/15 px-1.5 text-[9px] font-medium text-zinc-400">
																		Système
																	</span>
																) : null
															}
															tags={
																folder.tags.length > 0
																	? folder.tags.slice(0, 2).map((t) => (
																			<span
																				key={t}
																				className="rounded-full border bg-secondary px-1.5 py-0.5 text-[9px] text-secondary-foreground"
																			>
																				{t}
																			</span>
																		))
																	: null
															}
														/>
													))}
												</div>
											</div>
										)}
										{currentFiles.length > 0 && (
											<div>
												<p className="mb-3 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
													Dossiers de correspondance ({currentFiles.length})
												</p>
												<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
													{currentFiles.map((corr) => (
														<CorrespondanceDossier
															key={corr.id}
															reference={corr.reference}
															title={corr.title}
															type={corr.type}
															sender={corr.sender}
															recipient={corr.recipient}
															date={corr.updatedAt}
															status={corr.status}
															priority={corr.priority}
															documentCount={corr.documents?.length ?? corr.attachments}
															isCopy={corr.isCopy}
															recipientStatus={corr.recipientStatus}
															onClick={() => setOpenDetailId(corr.id)}
														/>
													))}
												</div>
											</div>
										)}
										{foldersWithCounts.length === 0 &&
											currentFiles.length === 0 && (
												<div className="flex flex-col items-center py-16 text-center">
													<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
														<FolderOpen className="h-8 w-8 text-indigo-400/60" />
													</div>
													<h3 className="mb-1 text-lg font-semibold">
														Dossier vide
													</h3>
													<p className="max-w-sm text-sm text-muted-foreground">
														Ce dossier ne contient aucune correspondance. Créez
														une nouvelle correspondance ou importez des
														fichiers.
													</p>
												</div>
											)}
									</motion.div>
								)}

								{/* ── Content — List View ── */}
								{viewMode === "list" && (
									<motion.div
										key="list"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.2 }}
									>
										<div className="overflow-hidden rounded-xl border border-border/50 bg-card">
											<div className="grid grid-cols-12 gap-2 border-b border-border/50 bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
												<div
													className="col-span-4 flex cursor-pointer items-center gap-1 hover:text-foreground"
													onClick={() => {
														setSortBy("name");
														setSortDir(
															sortBy === "name" && sortDir === "asc"
																? "desc"
																: "asc",
														);
													}}
												>
													Titre{" "}
													{sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}
												</div>
												<div className="col-span-2">Type</div>
												<div
													className="col-span-2 cursor-pointer hover:text-foreground"
													onClick={() => {
														setSortBy("date");
														setSortDir(
															sortBy === "date" && sortDir === "asc"
																? "desc"
																: "asc",
														);
													}}
												>
													Modifié{" "}
													{sortBy === "date" && (sortDir === "asc" ? "↑" : "↓")}
												</div>
												<div className="col-span-2">Statut</div>
												<div className="col-span-2">Priorité</div>
											</div>
											{foldersWithCounts.map((folder) => (
												<div
													key={folder.id}
													className="group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
													onClick={() => handleOpenFolder(folder.id)}
												>
													<div className="col-span-4 flex items-center gap-2">
														<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
															<Folder className="h-3 w-3 text-amber-400" />
														</div>
														<span className="truncate text-xs font-medium">
															{folder.name}
														</span>
														<span className="text-[9px] text-muted-foreground/50">
															{folder.fileCount} items
														</span>
													</div>
													<div className="col-span-2" />
													<div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
														<Clock className="h-2.5 w-2.5" />
														{folder.updatedAt}
													</div>
													<div className="col-span-2" />
													<div className="col-span-2" />
												</div>
											))}
											{currentFiles.map((corr) => {
												const st = STATUS_CFG[corr.status];
												const typeConfig = CORRESPONDENCE_TYPE_CONFIG[corr.type];
												const isCopyItem =
													(corr as any).isCopy === true ||
													currentFolderId === "__envoye";
												const recipientSt = (corr as any).recipientStatus as
													| string
													| undefined;
												const rsCfg = recipientSt
													? RECIPIENT_STATUS_CFG[recipientSt]
													: null;
												return (
													<div
														key={corr.id}
														className={cn(
															"group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30",
															isCopyItem && "opacity-70",
														)}
														onClick={() => handleOpenInfo(corr.id)}
													>
														<div className="col-span-4 flex items-center gap-2">
															<div
																className={cn(
																	"flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
																	isCopyItem
																		? "bg-zinc-500/10"
																		: "bg-violet-500/10",
																)}
															>
																<Mail
																	className={cn(
																		"h-3 w-3",
																		isCopyItem
																			? "text-zinc-400"
																			: "text-violet-400",
																	)}
																/>
															</div>
															<div className="min-w-0">
																<div className="flex items-center gap-1.5">
																	{isCopyItem && (
																		<span className="rounded bg-muted/40 px-1 text-[7px] font-bold tracking-widest text-muted-foreground/40 uppercase">
																			Copie
																		</span>
																	)}
																	<span className="block truncate text-xs font-medium">
																		{corr.title}
																	</span>
																</div>
																<span className="block truncate text-[9px] text-muted-foreground/50">
																	{corr.reference}
																</span>
															</div>
														</div>
														<div className="col-span-2 flex items-center">
															<span
																className={cn(
																	"rounded-md px-2 py-1 text-[9px] font-medium",
																	typeConfig.color,
																)}
															>
																{typeConfig.label}
															</span>
														</div>
														<div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
															<Clock className="h-2.5 w-2.5" />
															{corr.updatedAt}
														</div>
														<div className="col-span-2 flex items-center gap-1">
															{isCopyItem && rsCfg ? (
																<span
																	className={cn(
																		"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
																		rsCfg.class,
																	)}
																>
																	<span
																		className={cn(
																			"h-1.5 w-1.5 rounded-full",
																			rsCfg.dot,
																		)}
																	/>
																	{rsCfg.label}
																</span>
															) : (
																<span
																	className={cn(
																		"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
																		st.class,
																	)}
																>
																	<span
																		className={cn(
																			"h-1.5 w-1.5 rounded-full",
																			st.dot,
																		)}
																	/>
																	{st.label}
																</span>
															)}
														</div>
														<div className="col-span-2 flex items-center">
															{corr.priority !== "normal" && (
																<span
																	className={cn(
																		"rounded-md px-2 py-1 text-[9px] font-medium",
																		corr.priority === "urgent"
																			? "text-red-400"
																			: "text-amber-400",
																	)}
																>
																	{PRIORITY_CONFIG[corr.priority].label}
																</span>
															)}
														</div>
													</div>
												);
											})}
											{foldersWithCounts.length === 0 &&
												currentFiles.length === 0 && (
													<div className="py-12 text-center text-sm text-muted-foreground">
														Aucun contenu dans ce dossier
													</div>
												)}
										</div>
									</motion.div>
								)}

								{/* ── Content — Column View ── */}
								{viewMode === "column" && (
									<motion.div
										key="column"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.2 }}
									>
										<div className="overflow-hidden rounded-xl border border-border/50 bg-card">
											<div className="flex h-[500px]">
												<div className="w-60 overflow-y-auto border-r border-border/50">
													<div className="p-2 px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase">
														Racine
													</div>
													{folders
														.filter((f) => f.parentFolderId === null)
														.map((folder) => (
															<button
																key={folder.id}
																onClick={() => handleOpenFolder(folder.id)}
																className={cn(
																	"flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
																	currentFolderId === folder.id &&
																		"bg-primary/10 text-primary",
																)}
															>
																<Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
																<span className="truncate">{folder.name}</span>
																<ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
															</button>
														))}
												</div>
												{currentFolderId && (
													<div className="w-60 overflow-y-auto border-r border-border/50">
														<div className="p-2 px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase">
															{
																folders.find((f) => f.id === currentFolderId)
																	?.name
															}
														</div>
														{folders
															.filter(
																(f) => f.parentFolderId === currentFolderId,
															)
															.map((folder) => (
																<button
																	key={folder.id}
																	onClick={() => handleOpenFolder(folder.id)}
																	className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
																>
																	<Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
																	<span className="truncate">
																		{folder.name}
																	</span>
																	<ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
																</button>
															))}
														{currentFiles.map((corr) => (
															<button
																key={corr.id}
																onClick={() => handleOpenInfo(corr.id)}
																className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
															>
																<Mail className="h-3.5 w-3.5 shrink-0 text-violet-400" />
																<span className="truncate">{corr.title}</span>
															</button>
														))}
													</div>
												)}
												<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
													<div className="text-center">
														<Mail className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
														<p>Sélectionnez une correspondance pour l'aperçu</p>
													</div>
												</div>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							{/* ── New Folder Dialog ── */}
							{showNewFolderDialog && (
								<div
									className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
									onClick={() => setShowNewFolderDialog(false)}
								>
									<div
										className="w-full max-w-md rounded-2xl border border-border/50 bg-popover shadow-2xl"
										onClick={(e) => e.stopPropagation()}
									>
										<div className="border-b border-border/50 px-5 pt-5 pb-3">
											<div className="flex items-center gap-2 text-sm font-semibold">
												<FolderPlus className="h-5 w-5 text-violet-400" />
												Nouveau Dossier
											</div>
										</div>
										<div className="space-y-3 p-5">
											<div className="space-y-2">
												<label className="text-xs font-medium">
													Nom du dossier *
												</label>
												<input
													placeholder="Ex: Notes Verbales 2026"
													value={newFolderName}
													onChange={(e) => setNewFolderName(e.target.value)}
													className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
													autoFocus
													onKeyDown={(e) => {
														if (e.key === "Enter" && newFolderName.trim())
															setShowNewFolderDialog(false);
													}}
												/>
											</div>
										</div>
										<div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
											<button
												onClick={() => setShowNewFolderDialog(false)}
												className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
											>
												Annuler
											</button>
											<button
												onClick={handleCreateFolder}
												disabled={!newFolderName.trim() || isCreatingFolder}
												className="flex items-center gap-1.5 rounded-md bg-linear-to-r from-indigo-600 to-violet-500 px-3 py-1.5 text-xs text-white transition-colors disabled:opacity-50"
											>
												{isCreatingFolder ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<FolderPlus className="h-4 w-4" />
												)}
												Créer
											</button>
										</div>
									</div>
								</div>
							)}

							{/* ── New Correspondance Wizard ── */}
							{activeOrgId && (
								<NewCorrespondanceWizard
									open={showNewCorrWizard}
									onClose={() => setShowNewCorrWizard(false)}
									orgId={activeOrgId as string}
								/>
							)}
						</>
					)}
				</>
			)}

			{/* ═══ TAB: Dossiers de procédure ═══ */}
			{activeTab === "dossiers" && (
				<motion.div variants={fadeUp}>
					{selectedDossierId && selectedDossier ? (
						<DossierDetail
							dossier={selectedDossier}
							transitions={dossierTransitions}
							onBack={() => setSelectedDossierId(null)}
							onAction={handleDossierAction}
							onUploadPiece={handleUploadDossierPiece}
							onValidatePiece={handleValidateDossierPiece}
							onRejectPiece={handleRejectDossierPiece}
							canValidate={true}
						/>
					) : (
						<DossierList
							dossiers={dossiers}
							onSelectDossier={(id) => setSelectedDossierId(id)}
							onCreateDossier={() => setShowDossierWizard(true)}
						/>
					)}
				</motion.div>
			)}

			{/* ═══ TAB: Tableau de bord ═══ */}
			{activeTab === "dashboard" && (
				<motion.div variants={fadeUp}>
					<Dashboard
						stats={
							dashboardStats ?? {
								correspondance: {
									total: 0,
									byStatus: {},
									overdue: 0,
									pendingApprovals: 0,
								},
								dossiers: { total: 0, byStatus: {}, overdue: 0, myDossiers: 0 },
							}
						}
						recentActivity={recentActivity}
						onNavigateCorrespondance={() => setActiveTab("correspondance")}
						onNavigateDossiers={() => setActiveTab("dossiers")}
					/>
				</motion.div>
			)}

			{/* ── Dossier Create Wizard ── */}
			{showDossierWizard && (
				<DossierCreateWizard
					typeDemarches={typeDemarches as any[]}
					onClose={() => setShowDossierWizard(false)}
					onSubmit={handleCreateDossier}
					isSubmitting={createDossierMutation.isPending}
				/>
			)}

			{/* ── Dialogs ── */}
			<ShareDialog
				open={shareDialogOpen}
				onClose={() => setShareDialogOpen(false)}
				targetName={shareTargetName}
			/>
			<ManageAccessDialog
				open={manageAccessOpen}
				onClose={() => setManageAccessOpen(false)}
				targetName={manageAccessTargetName}
			/>
			<TransmitDialog
				open={transmitDialogOpen}
				onClose={() => setTransmitDialogOpen(false)}
				targetName={transmitTargetName}
			/>
			<InfoDialog
				open={infoDialogOpen}
				onClose={() => setInfoDialogOpen(false)}
				item={infoItem || { id: "", name: "" }}
				itemType={infoItemType}
			/>
		</motion.div>
	);
}
