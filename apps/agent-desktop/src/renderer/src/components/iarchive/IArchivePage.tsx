/**
 * iArchive — Archivage Diplomatique
 *
 * Migrated from agent-web/src/routes/_app/iarchive.tsx
 * Grid / List / Column views with folder navigation, status filters, and document viewer.
 */

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Archive,
  Search,
  Upload,
  Shield,
  Clock,
  Lock,
  Landmark,
  Users2,
  Scale,
  Building2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Hash,
  X,
  Download,
  LayoutGrid,
  List,
  Columns3,
  ChevronRight,
} from "lucide-react"
import { cn } from "../../lib/utils"

// ===============================================================
// TYPES
// ===============================================================

type ArchiveStatus = "active" | "expiring" | "expired" | "pending"
type ViewMode = "grid" | "list" | "column"

interface ArchiveItem {
  id: string
  title: string
  archivedAt: string
  archivedAtTs: number
  expiresAt: string
  size: string
  hash: string
  status: ArchiveStatus
  certId: string
  archivedBy: string
  archivedByInitials: string
  folderId: string
}

interface FolderItem {
  id: string
  name: string
  parentFolderId: string | null
  tags: string[]
  fileCount: number
  updatedAt: string
  createdBy: string
  isSystem: boolean
}

interface ViewerDoc {
  id: string
  title: string
  url?: string
  mimeType?: string
}

// ===============================================================
// CONFIG
// ===============================================================

const STATUS_CFG: Record<
  ArchiveStatus,
  { label: string; class: string; dot: string }
> = {
  active: {
    label: "Actif",
    class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  expiring: {
    label: "Expiration",
    class: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  expired: {
    label: "Expiré",
    class: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  pending: {
    label: "En attente",
    class: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
}

const STATUS_FILTERS: { value: ArchiveStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "expiring", label: "Expiration" },
  { value: "expired", label: "Expirés" },
  { value: "pending", label: "En attente" },
]

const FOLDER_ICONS: Record<string, React.ElementType> = {
  fiscal: Landmark,
  social: Users2,
  juridique: Scale,
  consulaire: Building2,
  coffre: Lock,
}

const FOLDER_COLORS: Record<string, string> = {
  fiscal: "text-amber-400",
  social: "text-blue-400",
  juridique: "text-emerald-400",
  consulaire: "text-violet-400",
  coffre: "text-rose-400",
}

const FOLDER_BGS: Record<string, string> = {
  fiscal: "bg-amber-500/15",
  social: "bg-blue-500/15",
  juridique: "bg-emerald-500/15",
  consulaire: "bg-violet-500/15",
  coffre: "bg-rose-500/15",
}

// ===============================================================
// MOCK DATA
// ===============================================================

const CATEGORY_FOLDERS: FolderItem[] = [
  {
    id: "fiscal",
    name: "Fiscal",
    parentFolderId: null,
    tags: ["fiscal", "10 ans"],
    fileCount: 0,
    updatedAt: "OHADA",
    createdBy: "Systeme",
    isSystem: false,
  },
  {
    id: "social",
    name: "Social",
    parentFolderId: null,
    tags: ["social", "5 ans"],
    fileCount: 0,
    updatedAt: "OHADA",
    createdBy: "Systeme",
    isSystem: false,
  },
  {
    id: "juridique",
    name: "Juridique",
    parentFolderId: null,
    tags: ["juridique", "30 ans"],
    fileCount: 0,
    updatedAt: "OHADA",
    createdBy: "Systeme",
    isSystem: false,
  },
  {
    id: "consulaire",
    name: "Consulaire",
    parentFolderId: null,
    tags: ["consulaire", "50 ans"],
    fileCount: 0,
    updatedAt: "\u2014",
    createdBy: "Systeme",
    isSystem: false,
  },
  {
    id: "coffre",
    name: "Coffre-fort",
    parentFolderId: null,
    tags: ["coffre", "perpetuel"],
    fileCount: 0,
    updatedAt: "\u2014",
    createdBy: "Systeme",
    isSystem: true,
  },
]

const MOCK_ARCHIVES: ArchiveItem[] = [
  {
    id: "arch-1",
    title: "Budget consulat Paris 2025",
    archivedAt: "15/01/2026",
    archivedAtTs: 1768521600000,
    expiresAt: "15/01/2036",
    size: "2.4 Mo",
    hash: "a1b2c3d4\u2026ef56",
    status: "active",
    certId: "CERT-2026-001",
    archivedBy: "Tresorier ELLA",
    archivedByInitials: "TE",
    folderId: "fiscal",
  },
  {
    id: "arch-2",
    title: "Convention collective agents consulaires",
    archivedAt: "10/02/2026",
    archivedAtTs: 1770681600000,
    expiresAt: "10/02/2031",
    size: "1.8 Mo",
    hash: "f7e8d9c0\u2026ab12",
    status: "active",
    certId: "CERT-2026-002",
    archivedBy: "DRH MOUSSAVOU",
    archivedByInitials: "DM",
    folderId: "social",
  },
  {
    id: "arch-3",
    title: "Accord bilateral Gabon-France 2024",
    archivedAt: "20/03/2025",
    archivedAtTs: 1742428800000,
    expiresAt: "20/03/2055",
    size: "5.1 Mo",
    hash: "1234abcd\u20265678",
    status: "active",
    certId: "CERT-2025-015",
    archivedBy: "Ambassadeur MBOUMBA",
    archivedByInitials: "AM",
    folderId: "juridique",
  },
  {
    id: "arch-4",
    title: "Registre consulaire 2024",
    archivedAt: "01/01/2025",
    archivedAtTs: 1735689600000,
    expiresAt: "01/01/2075",
    size: "12.3 Mo",
    hash: "9876fedc\u20263210",
    status: "active",
    certId: "CERT-2025-001",
    archivedBy: "Consul NZOGHE",
    archivedByInitials: "CN",
    folderId: "consulaire",
  },
  {
    id: "arch-5",
    title: "Traite de Vienne \u2014 Copie certifiee",
    archivedAt: "01/06/2020",
    archivedAtTs: 1590969600000,
    expiresAt: "Illimite",
    size: "3.7 Mo",
    hash: "abcdef01\u20262345",
    status: "active",
    certId: "CERT-2020-VIP",
    archivedBy: "Systeme",
    archivedByInitials: "SY",
    folderId: "coffre",
  },
  {
    id: "arch-6",
    title: "Declaration fiscale 2020",
    archivedAt: "15/04/2021",
    archivedAtTs: 1618444800000,
    expiresAt: "15/04/2026",
    size: "890 Ko",
    hash: "deadbeef\u2026cafe",
    status: "expiring",
    certId: "CERT-2021-042",
    archivedBy: "Tresorier ELLA",
    archivedByInitials: "TE",
    folderId: "fiscal",
  },
  {
    id: "arch-7",
    title: "Contrat agent local \u2014 Exp. 2024",
    archivedAt: "01/03/2020",
    archivedAtTs: 1583020800000,
    expiresAt: "01/03/2025",
    size: "1.2 Mo",
    hash: "c0ffee00\u2026babe",
    status: "expired",
    certId: "CERT-2020-011",
    archivedBy: "DRH MOUSSAVOU",
    archivedByInitials: "DM",
    folderId: "social",
  },
  {
    id: "arch-8",
    title: "Note verbale \u2014 Incident Mars 2026",
    archivedAt: "28/03/2026",
    archivedAtTs: 1774857600000,
    expiresAt: "28/03/2056",
    size: "450 Ko",
    hash: "feed1234\u20265678",
    status: "pending",
    certId: "\u2014",
    archivedBy: "Agent MBAYE",
    archivedByInitials: "AM",
    folderId: "juridique",
  },
]

// ===============================================================
// ANIMATIONS
// ===============================================================

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

// ===============================================================
// SUB-COMPONENTS
// ===============================================================

function DynamicFolderIcon({
  count,
  size = 64,
  hovered = false,
  className = "",
}: {
  count: number
  size?: number
  className?: string
  hovered?: boolean
}) {
  const sheets = Math.min(Math.max(count, 0), 3)
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
  ]
  const visibleSheets =
    sheets === 0
      ? []
      : sheets === 1
        ? [sheetConfigs[1]]
        : sheets === 2
          ? [sheetConfigs[0], sheetConfigs[1]]
          : [sheetConfigs[0], sheetConfigs[1], sheetConfigs[2]]
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
  )
}

function VaultFolderCard({
  label,
  count,
  onClick,
  badges,
  tags,
  isDragOver,
}: {
  label: string
  count: number
  onClick?: () => void
  badges?: React.ReactNode
  tags?: React.ReactNode
  isDragOver?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-center rounded-2xl p-2",
        isDragOver && "bg-primary/10 ring-2 ring-primary/50"
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
            count={count}
            size={96}
            hovered={isHovered}
            className="drop-shadow-lg"
          />
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 right-1 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white shadow-sm"
            >
              <FileText className="h-2.5 w-2.5" />
              {count}
            </motion.span>
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
  )
}

function VaultFileCard({
  title,
  iconColor = "text-stone-600",
  date,
  statusBadge,
  version,
  onClick,
  layoutId,
}: {
  title: string
  iconColor?: string
  date?: string
  statusBadge?: React.ReactNode
  version?: string
  onClick?: () => void
  layoutId?: string
}) {
  return (
    <motion.div
      layoutId={layoutId}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="relative flex aspect-[1/1.414] flex-col overflow-hidden bg-white/[0.03]">
        <div className="flex flex-1 items-center justify-center px-3 py-2">
          <div className="relative flex h-[72px] w-14 flex-col items-center justify-center rounded-[2px] border border-neutral-200 bg-white shadow-sm">
            <div className="absolute top-0 left-0 h-4 w-full border-b border-neutral-100 bg-neutral-50" />
            <Archive className={cn("h-7 w-7 opacity-50", iconColor)} />
            <div className="absolute right-2 bottom-2 left-2 space-y-0.5">
              <div className="h-[2px] w-full rounded-full bg-neutral-100" />
              <div className="h-[2px] w-3/4 rounded-full bg-neutral-100" />
              <div className="h-[2px] w-5/6 rounded-full bg-neutral-100" />
            </div>
          </div>
        </div>
        <div className="px-2.5 pb-1">
          <h3
            className="truncate text-[11px] leading-tight font-semibold text-foreground/90 transition-colors group-hover:text-primary"
            title={title}
          >
            {title}
          </h3>
        </div>
        <div className="mt-auto flex items-center justify-between px-2.5 pb-2">
          <div className="flex items-center gap-1">{statusBadge}</div>
          <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground/50">
            {version && (
              <span className="rounded bg-white/[0.04] px-1 font-mono">
                {version}
              </span>
            )}
            {date && (
              <span className="flex items-center gap-0.5 whitespace-nowrap">
                <Clock className="h-2 w-2" />
                {date}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (v: ViewMode) => void
}) {
  const modes: { value: ViewMode; icon: React.ElementType; label: string }[] = [
    { value: "grid", icon: LayoutGrid, label: "Grille" },
    { value: "list", icon: List, label: "Liste" },
    { value: "column", icon: Columns3, label: "Colonnes" },
  ]
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
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={m.label}
        >
          <m.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

function BreadcrumbPath({
  path,
  onNavigate,
}: {
  path: { id: string; name: string }[]
  onNavigate: (id: string | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Archive className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Archives</span>
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
  )
}

function DocumentViewerModal({
  isOpen,
  onClose,
  document: doc,
}: {
  isOpen: boolean
  onClose: () => void
  document: ViewerDoc | null
}) {
  if (!isOpen || !doc) return null
  const url = doc.url ?? ""
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="truncate font-semibold">{doc.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {doc.mimeType === "application/pdf" ? (
          <iframe
            src={`${url}#view=FitH`}
            className="h-[75vh] w-full border-0"
            title={doc.title}
          />
        ) : doc.mimeType?.startsWith("image/") ? (
          <div className="flex h-[75vh] items-center justify-center p-4">
            <img
              src={url}
              alt={doc.title}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-[75vh] items-center justify-center">
            <p className="text-muted-foreground">Apercu non disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===============================================================
// MAIN COMPONENT
// ===============================================================

export function IArchivePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ArchiveStatus | "all">("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedDocViewer, setSelectedDocViewer] = useState<ViewerDoc | null>(
    null
  )

  const archives = MOCK_ARCHIVES
  const folders = CATEGORY_FOLDERS

  // Folder counts
  const foldersWithCounts = useMemo(() => {
    return folders
      .filter((f) => f.parentFolderId === currentFolderId)
      .map((f) => ({
        ...f,
        fileCount: archives.filter((a) => a.folderId === f.id).length,
      }))
  }, [folders, archives, currentFolderId])

  // Breadcrumb
  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId) return []
    const path: { id: string; name: string }[] = []
    let fId: string | null = currentFolderId
    while (fId) {
      const folder = folders.find((f) => f.id === fId)
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name })
        fId = folder.parentFolderId
      } else break
    }
    return path
  }, [currentFolderId, folders])

  // Current files
  const currentFiles = useMemo(() => {
    if (currentFolderId === null) return []
    let items = archives.filter((a) => a.folderId === currentFolderId)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.hash.toLowerCase().includes(q) ||
          a.archivedBy.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all")
      items = items.filter((a) => a.status === statusFilter)
    items.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case "name":
          cmp = a.title.localeCompare(b.title, "fr")
          break
        case "author":
          cmp = a.archivedBy.localeCompare(b.archivedBy, "fr")
          break
        case "date":
          cmp = a.archivedAtTs - b.archivedAtTs
          break
        default:
          cmp = a.archivedAtTs - b.archivedAtTs
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return items
  }, [archives, currentFolderId, search, statusFilter, sortBy, sortDir])

  const totalArchives = archives.length
  const activeCount = archives.filter((a) => a.status === "active").length
  const alertCount = archives.filter(
    (a) => a.status === "expired" || a.status === "expiring"
  ).length
  const hasActiveFilters = statusFilter !== "all" || search

  // ===============================================================
  // RENDER
  // ===============================================================

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="flex-1 space-y-5 overflow-y-auto p-4"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/20">
            <Archive className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">iArchive</h1>
            <p className="text-sm text-muted-foreground">
              {totalArchives} archive{totalArchives > 1 ? "s" : ""} &middot;{" "}
              {activeCount} active{activeCount > 1 ? "s" : ""} &middot;{" "}
              {alertCount} alerte{alertCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Nouveau dossier
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted">
            <Shield className="h-3.5 w-3.5" />
            Certificats
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 px-3 py-1.5 text-xs text-white transition-colors hover:from-violet-700 hover:to-indigo-600">
            <Upload className="h-3.5 w-3.5" />
            Archiver
          </button>
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-[360px] min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Rechercher dans les archives\u2026"
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
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <>
                <div className="hidden h-6 w-px bg-border/50 sm:block" />
                <button
                  className="flex h-7 items-center gap-1.5 px-2 text-[11px] text-red-400 hover:text-red-300"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("all")
                  }}
                >
                  <X className="h-3 w-3" />
                  Effacer
                </button>
              </>
            )}
            <div className="ml-auto">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <BreadcrumbPath path={breadcrumbPath} onNavigate={setCurrentFolderId} />

      {/* Content */}
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
                  Categories d&apos;archivage
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {foldersWithCounts.map((folder) => (
                    <VaultFolderCard
                      key={folder.id}
                      label={folder.name}
                      count={folder.fileCount}
                      onClick={() => setCurrentFolderId(folder.id)}
                      badges={
                        folder.isSystem ? (
                          <span className="inline-flex h-4 items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 text-[9px] font-medium text-rose-500">
                            Securise
                          </span>
                        ) : null
                      }
                      tags={
                        folder.tags.length > 0
                          ? folder.tags.map((t) => (
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
                  Archives
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {currentFiles.map((item) => {
                    const st = STATUS_CFG[item.status]
                    return (
                      <VaultFileCard
                        key={item.id}
                        layoutId={`doc-card-${item.id}`}
                        title={item.title}
                        iconColor={
                          FOLDER_COLORS[item.folderId] || "text-violet-400"
                        }
                        date={item.archivedAt}
                        version={item.certId}
                        onClick={() =>
                          setSelectedDocViewer({
                            id: item.id,
                            title: item.title,
                            mimeType: "application/pdf",
                          })
                        }
                        statusBadge={
                          <span
                            className={cn(
                              "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[9px] font-medium",
                              st.class
                            )}
                          >
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full", st.dot)}
                            />
                            {st.label}
                          </span>
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )}
            {foldersWithCounts.length === 0 && currentFiles.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                  <FolderOpen className="h-8 w-8 text-violet-400/60" />
                </div>
                <h3 className="mb-1 text-lg font-semibold">Dossier vide</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ce dossier ne contient aucune archive. Glissez-deposez des
                  fichiers ici ou archivez un document.
                </p>
              </div>
            )}
          </motion.div>
        )}

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
                  className="col-span-4 cursor-pointer"
                  onClick={() => {
                    setSortBy("name")
                    setSortDir(
                      sortBy === "name" && sortDir === "asc" ? "desc" : "asc"
                    )
                  }}
                >
                  Nom{" "}
                  {sortBy === "name" &&
                    (sortDir === "asc" ? "\u2191" : "\u2193")}
                </div>
                <div className="col-span-2">Archive par</div>
                <div
                  className="col-span-2 cursor-pointer"
                  onClick={() => {
                    setSortBy("date")
                    setSortDir(
                      sortBy === "date" && sortDir === "asc" ? "desc" : "asc"
                    )
                  }}
                >
                  Date{" "}
                  {sortBy === "date" &&
                    (sortDir === "asc" ? "\u2191" : "\u2193")}
                </div>
                <div className="col-span-1">Statut</div>
                <div className="col-span-1">Taille</div>
                <div className="col-span-2">Hash</div>
              </div>
              {foldersWithCounts.map((folder) => {
                const FIcon = FOLDER_ICONS[folder.id] || Folder
                return (
                  <div
                    key={folder.id}
                    className="grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="col-span-4 flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md",
                          FOLDER_BGS[folder.id] || "bg-violet-500/15"
                        )}
                      >
                        <FIcon
                          className={cn(
                            "h-3 w-3",
                            FOLDER_COLORS[folder.id] || "text-violet-400"
                          )}
                        />
                      </div>
                      <span className="truncate text-xs font-medium">
                        {folder.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50">
                        {folder.fileCount} archives
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                      {folder.createdBy}
                    </div>
                    <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                      {folder.updatedAt}
                    </div>
                    <div className="col-span-1" />
                    <div className="col-span-1" />
                    <div className="col-span-2 flex items-center gap-1">
                      {folder.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border bg-secondary px-1.5 py-0.5 text-[9px] text-secondary-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {currentFiles.map((item) => {
                const st = STATUS_CFG[item.status]
                return (
                  <motion.div
                    layoutId={`doc-card-${item.id}`}
                    key={item.id}
                    className="grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                    onClick={() =>
                      setSelectedDocViewer({ id: item.id, title: item.title })
                    }
                  >
                    <div className="col-span-4 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
                        <FileText className="h-3 w-3 text-violet-400" />
                      </div>
                      <span className="truncate text-xs font-medium">
                        {item.title}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/15">
                        <span className="text-[8px] font-bold text-violet-300">
                          {item.archivedByInitials}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.archivedBy}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {item.archivedAt}
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span
                        className={cn(
                          "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[10px]",
                          st.class
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", st.dot)}
                        />
                        {st.label}
                      </span>
                    </div>
                    <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                      {item.size}
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <Hash className="h-2.5 w-2.5 text-muted-foreground/50" />
                      <span className="font-mono text-[9px] text-muted-foreground/50">
                        {item.hash}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
              {foldersWithCounts.length === 0 && currentFiles.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aucune archive dans ce dossier
                </div>
              )}
            </div>
          </motion.div>
        )}

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
                    Categories
                  </div>
                  {folders
                    .filter((f) => f.parentFolderId === null)
                    .map((folder) => {
                      const FIcon = FOLDER_ICONS[folder.id] || Folder
                      return (
                        <button
                          key={folder.id}
                          onClick={() => setCurrentFolderId(folder.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
                            currentFolderId === folder.id &&
                              "bg-primary/10 text-primary"
                          )}
                        >
                          <FIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              FOLDER_COLORS[folder.id] || "text-violet-400"
                            )}
                          />
                          <span className="truncate">{folder.name}</span>
                          <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
                        </button>
                      )
                    })}
                </div>
                {currentFolderId && (
                  <div className="w-60 overflow-y-auto border-r border-border/50">
                    <div className="p-2 px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase">
                      {folders.find((f) => f.id === currentFolderId)?.name}
                    </div>
                    {currentFiles.map((item) => (
                      <motion.div
                        layoutId={`doc-card-${item.id}`}
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted"
                        onClick={() =>
                          setSelectedDocViewer({
                            id: item.id,
                            title: item.title,
                          })
                        }
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <span className="truncate">{item.title}</span>
                      </motion.div>
                    ))}
                    {currentFiles.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        Aucune archive
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  <div className="space-y-3 p-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10">
                      <Archive className="h-7 w-7 text-violet-400" />
                    </div>
                    <p>Selectionnez une archive pour l&apos;apercu</p>
                    <div className="flex justify-center gap-2">
                      <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted">
                        <Download className="h-3 w-3" />
                        Telecharger
                      </button>
                      <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted">
                        <Shield className="h-3 w-3" />
                        Verifier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Dialog */}
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
              <p className="mt-1 text-[10px] text-muted-foreground">
                Creez un nouveau dossier d&apos;archivage
                {currentFolderId
                  ? ` dans "${folders.find((f) => f.id === currentFolderId)?.name}"`
                  : " a la racine"}
                .
              </p>
            </div>
            <div className="space-y-3 p-5">
              <label className="text-xs font-medium">Nom du dossier *</label>
              <input
                placeholder="Ex: Contrats 2026"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    setNewFolderName("")
                    setShowNewFolderDialog(false)
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
              <button
                onClick={() => setShowNewFolderDialog(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setNewFolderName("")
                  setShowNewFolderDialog(false)
                }}
                disabled={!newFolderName.trim()}
                className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 px-3 py-1.5 text-xs text-white transition-colors disabled:opacity-50"
              >
                <FolderPlus className="h-4 w-4" />
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentViewerModal
        isOpen={!!selectedDocViewer}
        onClose={() => setSelectedDocViewer(null)}
        document={selectedDocViewer}
      />
    </motion.div>
  )
}
