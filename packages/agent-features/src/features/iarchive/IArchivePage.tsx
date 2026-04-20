"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@workspace/routing";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useOrg } from "../../shell/org-provider";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { toast } from "sonner";
import {
	Archive,
	Search,
	FileText,
	Lock,
	Landmark,
	Users2,
	Scale,
	Building2,
	Shield,
	ChevronRight,
	LayoutGrid,
	List,
	RotateCcw,
	Trash2,
	CalendarClock,
	AlertTriangle,
	CheckCircle2,
	Timer,
	Infinity as InfinityIcon,
	X,
	MoreHorizontal,
	Eye,
	History,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
	DocumentViewerModal,
	type ViewerDoc,
} from "../../components/shared/document-viewer-modal";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ViewMode = "grid" | "list";
type ArchiveStatusFilter =
	| "all"
	| "active"
	| "expiring"
	| "expired"
	| "perpetual";

interface CategoryDef {
	slug: string;
	name: string;
	color: string;
	icon: string;
	retentionYears: number;
	isPerpetual?: boolean;
	description: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ARCHIVE_CATEGORIES: CategoryDef[] = [
	{
		slug: "fiscal",
		name: "Fiscal",
		color: "amber",
		icon: "Landmark",
		retentionYears: 10,
		description: "Documents comptables et fiscaux",
	},
	{
		slug: "social",
		name: "Social",
		color: "blue",
		icon: "Users",
		retentionYears: 5,
		description: "Dossiers du personnel et social",
	},
	{
		slug: "juridique",
		name: "Juridique",
		color: "emerald",
		icon: "Scale",
		retentionYears: 30,
		description: "Contrats, litiges et actes juridiques",
	},
	{
		slug: "consulaire",
		name: "Consulaire",
		color: "violet",
		icon: "Building2",
		retentionYears: 50,
		description: "Documents consulaires et diplomatiques",
	},
	{
		slug: "coffre",
		name: "Coffre-fort",
		color: "rose",
		icon: "Lock",
		retentionYears: 99,
		isPerpetual: true,
		description: "Conservation permanente",
	},
];

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
	fiscal: Landmark,
	social: Users2,
	juridique: Scale,
	consulaire: Building2,
	coffre: Lock,
};

const CATEGORY_COLOR_MAP: Record<
	string,
	{ text: string; bg: string; border: string }
> = {
	amber: {
		text: "text-amber-400",
		bg: "bg-amber-500/15",
		border: "border-amber-500/30",
	},
	blue: {
		text: "text-blue-400",
		bg: "bg-blue-500/15",
		border: "border-blue-500/30",
	},
	emerald: {
		text: "text-emerald-400",
		bg: "bg-emerald-500/15",
		border: "border-emerald-500/30",
	},
	violet: {
		text: "text-violet-400",
		bg: "bg-violet-500/15",
		border: "border-violet-500/30",
	},
	rose: {
		text: "text-rose-400",
		bg: "bg-rose-500/15",
		border: "border-rose-500/30",
	},
};

const STATUS_CFG: Record<
	string,
	{ label: string; icon: React.ElementType; color: string }
> = {
	active: { label: "Actif", icon: CheckCircle2, color: "text-emerald-400" },
	expiring: {
		label: "Expiration proche",
		icon: AlertTriangle,
		color: "text-amber-400",
	},
	expired: { label: "Expiré", icon: Timer, color: "text-red-400" },
	perpetual: {
		label: "Perpétuel",
		icon: InfinityIcon,
		color: "text-violet-400",
	},
};

const FILTER_TABS: { value: ArchiveStatusFilter; label: string }[] = [
	{ value: "all", label: "Tous" },
	{ value: "active", label: "Actifs" },
	{ value: "expiring", label: "Expiration" },
	{ value: "expired", label: "Expirés" },
	{ value: "perpetual", label: "Perpétuels" },
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
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ArchiveStatusBadge({ status }: { status: string }) {
	const cfg = STATUS_CFG[status] ?? STATUS_CFG.active;
	const Icon = cfg.icon;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted/60 border border-border/30",
				cfg.color,
			)}
		>
			<Icon className="h-2.5 w-2.5" />
			{cfg.label}
		</span>
	);
}

function CategoryCard({
	cat,
	count,
	selected,
	onClick,
}: {
	cat: CategoryDef;
	count: number;
	selected: boolean;
	onClick: () => void;
}) {
	const Icon = CATEGORY_ICON_MAP[cat.slug] ?? Archive;
	const colors = CATEGORY_COLOR_MAP[cat.color] ?? CATEGORY_COLOR_MAP.violet;
	return (
		<motion.button
			variants={fadeUp}
			onClick={onClick}
			className={cn(
				"flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center group",
				selected
					? `${colors.border} ${colors.bg} ring-1 ring-current/20`
					: "border-border/50 bg-card hover:border-border hover:bg-muted/30",
			)}
		>
			<div
				className={cn(
					"h-10 w-10 rounded-lg flex items-center justify-center",
					colors.bg,
				)}
			>
				<Icon className={cn("h-5 w-5", colors.text)} />
			</div>
			<div>
				<p className="text-xs font-semibold">{cat.name}</p>
				<p className="text-[10px] text-muted-foreground">
					{cat.isPerpetual ? "Perpétuel" : `${cat.retentionYears} ans`}
				</p>
			</div>
			<span
				className={cn(
					"text-[10px] font-medium px-2 py-0.5 rounded-full",
					count > 0
						? `${colors.bg} ${colors.text}`
						: "bg-muted/40 text-muted-foreground",
				)}
			>
				{count} doc{count !== 1 ? "s" : ""}
			</span>
		</motion.button>
	);
}

function ArchivedDocCard({
	doc,
	onRestore,
	onDelete,
	onView,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: document shape varies
	doc: any;
	onRestore: () => void;
	onDelete: () => void;
	onView: () => void;
}) {
	const [showMenu, setShowMenu] = useState(false);
	const catColors =
		CATEGORY_COLOR_MAP[
			ARCHIVE_CATEGORIES.find((c) => c.slug === doc.archiveCategorySlug)
				?.color ?? "violet"
		] ?? CATEGORY_COLOR_MAP.violet;

	const title = doc.label ?? doc.files?.[0]?.filename ?? "Document";
	const archivedDate = doc.archivedAt
		? new Date(doc.archivedAt).toLocaleDateString("fr-FR")
		: "—";
	const expiresDate = doc.retentionExpiresAt
		? new Date(doc.retentionExpiresAt).toLocaleDateString("fr-FR")
		: "Perpétuel";

	return (
		<motion.div
			variants={fadeUp}
			className="group relative flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-border hover:bg-muted/20 transition-all"
		>
			{/* Icone fichier */}
			<div
				className={cn(
					"h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
					catColors.bg,
				)}
			>
				<FileText className={cn("h-4 w-4", catColors.text)} />
			</div>

			{/* Contenu */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<p className="text-xs font-semibold truncate">{title}</p>
					<ArchiveStatusBadge status={doc.archiveStatus} />
				</div>
				<div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
					<span className="flex items-center gap-1">
						<Archive className="h-2.5 w-2.5" />
						{archivedDate}
					</span>
					<span className="flex items-center gap-1">
						<CalendarClock className="h-2.5 w-2.5" />
						{expiresDate}
					</span>
					{doc.confidentiality && (
						<span className="flex items-center gap-1">
							<Shield className="h-2.5 w-2.5" />
							{doc.confidentiality}
						</span>
					)}
				</div>
				{doc.archiveNote && (
					<p className="text-[10px] text-muted-foreground/70 mt-1 truncate italic">
						{doc.archiveNote}
					</p>
				)}
			</div>

			{/* Actions */}
			<div className="relative shrink-0">
				<button
					onClick={() => setShowMenu(!showMenu)}
					className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
				>
					<MoreHorizontal className="h-3.5 w-3.5" />
				</button>
				{showMenu && (
					<>
						<div
							className="fixed inset-0 z-40"
							onClick={() => setShowMenu(false)}
						/>
						<div className="absolute right-0 top-8 z-50 w-44 border border-border/60 rounded-lg bg-popover shadow-xl py-1">
							<button
								onClick={() => {
									onView();
									setShowMenu(false);
								}}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"
							>
								<Eye className="h-3 w-3" />
								Voir le document
							</button>
							<button
								onClick={() => {
									onRestore();
									setShowMenu(false);
								}}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-emerald-400"
							>
								<RotateCcw className="h-3 w-3" />
								Restaurer
							</button>
							<div className="border-t border-border/40 my-1" />
							<button
								onClick={() => {
									onDelete();
									setShowMenu(false);
								}}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-red-400"
							>
								<Trash2 className="h-3 w-3" />
								Supprimer définitivement
							</button>
						</div>
					</>
				)}
			</div>
		</motion.div>
	);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function IArchivePage() {
	// ─── State ──────────────────────────────────────────────
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] =
		useState<ArchiveStatusFilter>("all");
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
	const [viewerDoc, setViewerDoc] = useState<ViewerDoc | null>(null);

	const { activeOrgId } = useOrg();

	// ─── Convex data ───────────────────────────────────────
	const { data: archivedDocs = [] } = useAuthenticatedConvexQuery(
		api.functions.archive.listArchivedDocuments,
		activeOrgId
			? {
					orgId: activeOrgId,
					categorySlug: selectedCategory ?? undefined,
					search: search || undefined,
				}
			: "skip",
	);

	const { data: stats } = useAuthenticatedConvexQuery(
		api.functions.archive.getArchiveStats,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { data: auditLog = [] } = useAuthenticatedConvexQuery(
		api.functions.archive.getArchiveAuditLog,
		activeOrgId ? { orgId: activeOrgId, limit: 20 } : "skip",
	);

	// ─── Mutations ─────────────────────────────────────────
	const { mutateAsync: restoreDoc } = useConvexMutationQuery(
		api.functions.archive.restoreDocument,
	);
	const { mutateAsync: permanentDelete } = useConvexMutationQuery(
		api.functions.archive.permanentlyDeleteArchived,
	);

	// ─── Derived data ──────────────────────────────────────
	const filteredDocs = useMemo(() => {
		if (statusFilter === "all") return archivedDocs;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic array
		return (archivedDocs as any[]).filter(
			// biome-ignore lint/suspicious/noExplicitAny: doc shape varies
			(d: any) => d.archiveStatus === statusFilter,
		);
	}, [archivedDocs, statusFilter]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const cat of ARCHIVE_CATEGORIES) {
			counts[cat.slug] = stats?.byCategory?.[cat.slug] ?? 0;
		}
		return counts;
	}, [stats]);

	// ─── Handlers ──────────────────────────────────────────
	const handleRestore = async (docId: string) => {
		try {
			await restoreDoc({ documentId: docId as Id<"documents"> });
			toast.success("Document restauré dans iDocument");
		} catch {
			toast.error("Erreur lors de la restauration");
		}
	};

	const handlePermanentDelete = async (docId: string) => {
		try {
			await permanentDelete({ documentId: docId as Id<"documents"> });
			toast.success("Document supprimé définitivement");
			setConfirmDelete(null);
		} catch {
			toast.error("Erreur lors de la suppression");
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: doc shape varies
	const handleView = (doc: any) => {
		const file = doc.files?.[0];
		if (!file) return;
		setViewerDoc({
			id: doc._id,
			title: doc.label ?? file.filename,
			url: file.url,
			mimeType: file.mimeType,
		});
	};

	// ═══════════════════════════════════════════════════════
	// RENDER
	// ═══════════════════════════════════════════════════════

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={stagger}
			className="min-h-screen bg-background text-foreground"
		>
			<div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
				{/* ── Header ── */}
				<motion.div
					variants={fadeUp}
					className="flex items-start justify-between"
				>
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/20">
							<Archive className="h-5 w-5 text-violet-400" />
						</div>
						<div>
							<h1 className="text-lg font-bold tracking-tight">iArchive</h1>
							<p className="text-xs text-muted-foreground">
								{stats?.total ?? 0} documents archivés · {stats?.expiring ?? 0}{" "}
								en expiration
							</p>
						</div>
					</div>

					{/* Stats rapides */}
					<div className="flex items-center gap-3">
						{stats && stats.expiring > 0 && (
							<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
								<AlertTriangle className="h-3 w-3 text-amber-400" />
								<span className="text-[10px] font-medium text-amber-400">
									{stats.expiring} expiration(s)
								</span>
							</div>
						)}
						{stats && stats.expired > 0 && (
							<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
								<Timer className="h-3 w-3 text-red-400" />
								<span className="text-[10px] font-medium text-red-400">
									{stats.expired} expiré(s)
								</span>
							</div>
						)}
					</div>
				</motion.div>

				{/* ── Module Tabs : iDocument | iArchive ── */}
				<motion.div
					variants={fadeUp}
					className="flex items-center border-b border-border/50"
				>
					<div className="flex items-center">
						<Link
							href="/idocument"
							className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-border rounded-t-lg transition-all -mb-px"
						>
							<FileText className="h-3.5 w-3.5" />
							iDocument
						</Link>
						<span className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-primary border-b-2 border-primary -mb-px ml-1 cursor-default">
							<Archive className="h-3.5 w-3.5 text-violet-400" />
							iArchive
						</span>
					</div>
					<div className="ml-auto flex items-center gap-1.5 pb-0.5">
						<span className="text-[10px] text-muted-foreground/40 font-medium px-2 py-0.5 rounded-full bg-muted/40 border border-border/20 tracking-wide">
							iBureau
						</span>
					</div>
				</motion.div>

				{/* ── Toolbar ── */}
				<motion.div
					variants={fadeUp}
					className="flex items-center gap-3 flex-wrap"
				>
					{/* Recherche */}
					<div className="relative flex-1 min-w-[200px] max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<input
							type="text"
							placeholder="Rechercher dans les archives..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full h-8 pl-9 pr-3 text-xs bg-muted/50 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/50"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2"
							>
								<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
							</button>
						)}
					</div>

					{/* Filtres statut */}
					<div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/30">
						{FILTER_TABS.map((tab) => (
							<button
								key={tab.value}
								onClick={() => setStatusFilter(tab.value)}
								className={cn(
									"px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
									statusFilter === tab.value
										? "bg-background text-foreground shadow-sm border border-border/50"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{tab.label}
								{tab.value !== "all" && stats && (
									<span className="ml-1 text-muted-foreground/60">
										(
										{tab.value === "active"
											? stats.active
											: tab.value === "expiring"
												? stats.expiring
												: tab.value === "expired"
													? stats.expired
													: stats.perpetual}
										)
									</span>
								)}
							</button>
						))}
					</div>

					{/* View mode */}
					<div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/30">
						<button
							onClick={() => setViewMode("grid")}
							className={cn(
								"p-1.5 rounded-md transition-colors",
								viewMode === "grid"
									? "bg-background shadow-sm"
									: "hover:bg-muted",
							)}
						>
							<LayoutGrid className="h-3.5 w-3.5" />
						</button>
						<button
							onClick={() => setViewMode("list")}
							className={cn(
								"p-1.5 rounded-md transition-colors",
								viewMode === "list"
									? "bg-background shadow-sm"
									: "hover:bg-muted",
							)}
						>
							<List className="h-3.5 w-3.5" />
						</button>
					</div>
				</motion.div>

				{/* ── Breadcrumb ── */}
				<motion.div
					variants={fadeUp}
					className="flex items-center gap-1.5 text-xs text-muted-foreground"
				>
					<button
						onClick={() => setSelectedCategory(null)}
						className="hover:text-foreground transition-colors font-medium"
					>
						Archives
					</button>
					{selectedCategory && (
						<>
							<ChevronRight className="h-3 w-3" />
							<span className="text-foreground font-medium">
								{
									ARCHIVE_CATEGORIES.find((c) => c.slug === selectedCategory)
										?.name
								}
							</span>
						</>
					)}
				</motion.div>

				{/* ── Categories Grid ── */}
				{!selectedCategory && (
					<motion.div variants={stagger} className="grid grid-cols-5 gap-3">
						{ARCHIVE_CATEGORIES.map((cat) => (
							<CategoryCard
								key={cat.slug}
								cat={cat}
								count={categoryCounts[cat.slug] ?? 0}
								selected={false}
								onClick={() => setSelectedCategory(cat.slug)}
							/>
						))}
					</motion.div>
				)}

				{/* ── Category Header (quand une categorie est selectionnee) ── */}
				{selectedCategory && (
					<motion.div
						variants={fadeUp}
						className="flex items-center gap-3 flex-wrap"
					>
						{ARCHIVE_CATEGORIES.map((cat) => {
							const isActive = cat.slug === selectedCategory;
							const colors =
								CATEGORY_COLOR_MAP[cat.color] ?? CATEGORY_COLOR_MAP.violet;
							const Icon = CATEGORY_ICON_MAP[cat.slug] ?? Archive;
							return (
								<button
									key={cat.slug}
									onClick={() => setSelectedCategory(cat.slug)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
										isActive
											? `${colors.border} ${colors.bg} ${colors.text}`
											: "border-border/40 bg-card text-muted-foreground hover:border-border",
									)}
								>
									<Icon className="h-3 w-3" />
									{cat.name}
									<span className="text-[10px] opacity-70">
										({categoryCounts[cat.slug] ?? 0})
									</span>
								</button>
							);
						})}
					</motion.div>
				)}

				{/* ── Documents List ── */}
				<motion.div variants={stagger}>
					{/* biome-ignore lint/suspicious/noExplicitAny: dynamic array */}
					{(filteredDocs as any[]).length === 0 ? (
						<motion.div
							variants={fadeUp}
							className="flex flex-col items-center justify-center py-16 text-center"
						>
							<div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
								<Archive className="h-7 w-7 text-muted-foreground/50" />
							</div>
							<p className="text-sm font-medium text-muted-foreground">
								Aucun document archivé
							</p>
							<p className="text-xs text-muted-foreground/60 mt-1">
								{selectedCategory
									? "Aucun document dans cette catégorie"
									: "Archivez des documents depuis iDocument pour les retrouver ici"}
							</p>
						</motion.div>
					) : viewMode === "grid" ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{/* biome-ignore lint/suspicious/noExplicitAny: dynamic array */}
							{(filteredDocs as any[]).map((doc: any) => (
								<ArchivedDocCard
									key={doc._id}
									doc={doc}
									onRestore={() => handleRestore(doc._id)}
									onDelete={() => setConfirmDelete(doc._id)}
									onView={() => handleView(doc)}
								/>
							))}
						</div>
					) : (
						<div className="space-y-1.5">
							{/* biome-ignore lint/suspicious/noExplicitAny: dynamic array */}
							{(filteredDocs as any[]).map((doc: any) => (
								<ArchivedDocCard
									key={doc._id}
									doc={doc}
									onRestore={() => handleRestore(doc._id)}
									onDelete={() => setConfirmDelete(doc._id)}
									onView={() => handleView(doc)}
								/>
							))}
						</div>
					)}
				</motion.div>

				{/* ── Recent Audit Log ── */}
				{/* biome-ignore lint/suspicious/noExplicitAny: dynamic array */}
				{(auditLog as any[]).length > 0 && !selectedCategory && (
					<motion.div variants={fadeUp} className="mt-6">
						<div className="flex items-center gap-2 mb-3">
							<History className="h-3.5 w-3.5 text-muted-foreground" />
							<h3 className="text-xs font-semibold text-muted-foreground">
								Activité récente
							</h3>
						</div>
						<div className="space-y-1">
							{/* biome-ignore lint/suspicious/noExplicitAny: dynamic array */}
							{(auditLog as any[]).slice(0, 8).map((entry: any) => (
								<div
									key={entry._id}
									className="flex items-center gap-2 text-[10px] text-muted-foreground py-1 px-2 rounded-md hover:bg-muted/30"
								>
									<span
										className={cn(
											"h-1.5 w-1.5 rounded-full shrink-0",
											entry.action === "archive"
												? "bg-violet-400"
												: entry.action === "restore"
													? "bg-emerald-400"
													: entry.action === "permanent_delete"
														? "bg-red-400"
														: "bg-blue-400",
										)}
									/>
									<span className="font-medium text-foreground/70">
										{entry.actorName ?? "Agent"}
									</span>
									<span>
										{entry.action === "archive"
											? "a archivé"
											: entry.action === "restore"
												? "a restauré"
												: entry.action === "permanent_delete"
													? "a supprimé"
													: entry.action === "policy_update"
														? "a modifié la politique"
														: entry.action === "category_change"
															? "a changé la catégorie"
															: "a prolongé la rétention"}
									</span>
									<span className="ml-auto text-muted-foreground/50">
										{new Date(entry.createdAt).toLocaleDateString("fr-FR")}
									</span>
								</div>
							))}
						</div>
					</motion.div>
				)}
			</div>

			{/* ── Confirm Delete Dialog ── */}
			<AnimatePresence>
				{confirmDelete && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
						onClick={() => setConfirmDelete(null)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="w-full max-w-sm border border-border/50 shadow-2xl bg-popover rounded-2xl p-6"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="h-10 w-10 rounded-xl bg-red-500/15 flex items-center justify-center">
									<Trash2 className="h-5 w-5 text-red-400" />
								</div>
								<div>
									<h3 className="text-sm font-semibold">
										Suppression définitive
									</h3>
									<p className="text-xs text-muted-foreground">
										Cette action est irréversible
									</p>
								</div>
							</div>
							<p className="text-xs text-muted-foreground mb-5">
								Le document sera supprimé définitivement et ne pourra plus
								être restauré. Confirmez-vous cette action ?
							</p>
							<div className="flex justify-end gap-2">
								<button
									onClick={() => setConfirmDelete(null)}
									className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
								>
									Annuler
								</button>
								<button
									onClick={() => handlePermanentDelete(confirmDelete)}
									className="px-3 py-1.5 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
								>
									Supprimer définitivement
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ── Document Viewer Modal ── */}
			<DocumentViewerModal
				isOpen={!!viewerDoc}
				onClose={() => setViewerDoc(null)}
				document={viewerDoc}
			/>
		</motion.div>
	);
}
