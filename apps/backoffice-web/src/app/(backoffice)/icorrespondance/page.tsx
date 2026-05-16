"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { DocumentSheet } from "@workspace/ui/components/document-sheet"
import React, { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
// Backoffice uses org selector instead of useOrg()
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks"
import { motion, AnimatePresence } from "motion/react"
import {
  Mail,
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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  Download,
  MoreHorizontal,
  Share2,
  Send,
  Edit3,
  Info,
  KeyRound,
  Tag,
  Trash2,
  CalendarClock,
  GitBranch,
  Sparkles,
  User,
  AlertOctagon,
  LayoutGrid,
  List,
  Columns3,
  ChevronRight,
  GripVertical,
  FileSpreadsheet,
  ImageIcon,
  Plus,
  Filter,
  BarChart3,
  Settings,
  BookOpen,
  Activity,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { PageHeader } from "@/components/design-system/page-header"
import { cn } from "@/lib/utils"

type ActiveTab =
  | "correspondance"
  | "types-demarches"
  | "dossiers"
  | "audit"
  | "statistiques"


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type CorrStatus =
  | "draft"
  | "pending"
  | "approved"
  | "sent"
  | "received"
  | "archived"
type ViewMode = "grid" | "list" | "column"
type CorrespondenceType =
  | "note_verbale"
  | "lettre_officielle"
  | "circulaire"
  | "telegramme"
  | "memorandum"
  | "communique"
type Priority = "normal" | "urgent" | "confidentiel"

interface CorrespondenceItem {
  id: string
  reference: string
  title: string
  type: CorrespondenceType
  sender: string
  senderInitials: string
  recipient: string
  updatedAt: string
  updatedAtTs: number
  status: CorrStatus
  tags: string[]
  priority: Priority
  folderId: string
  attachments: number
}

interface FolderItem {
  id: string
  name: string
  parentFolderId: string | null
  tags: string[]
  fileCount: number
  subfolderCount: number
  updatedAt: string
  createdBy: string
  isSystem: boolean
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
    label: "Approuv\u00e9",
    class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  sent: {
    label: "Envoy\u00e9",
    class: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    dot: "bg-violet-400",
  },
  received: {
    label: "Re\u00e7u",
    class: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-400",
  },
  archived: {
    label: "Archiv\u00e9",
    class: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
}

const STATUS_FILTERS: { value: CorrStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillons" },
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuv\u00e9s" },
  { value: "sent", label: "Envoy\u00e9s" },
  { value: "received", label: "Re\u00e7us" },
  { value: "archived", label: "Archiv\u00e9s" },
]

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
    label: "T\u00e9l\u00e9gramme",
    color: "text-red-400 bg-red-500/15",
    icon: "Mail",
  },
  memorandum: {
    label: "M\u00e9morandum",
    color: "text-emerald-400 bg-emerald-500/15",
    icon: "Mail",
  },
  communique: {
    label: "Communiqu\u00e9",
    color: "text-blue-400 bg-blue-500/15",
    icon: "Mail",
  },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  normal: { label: "Normal", color: "text-muted-foreground" },
  urgent: { label: "Urgent", color: "text-red-400" },
  confidentiel: { label: "Confidentiel", color: "text-amber-400" },
}

const CATEGORY_OPTIONS = [
  { value: "etat-civil", label: "\u00c9tat civil" },
  { value: "consulaire", label: "Consulaire" },
  { value: "administratif", label: "Administratif" },
  { value: "notarial", label: "Notarial" },
  { value: "social", label: "Social" },
  { value: "autre", label: "Autre" },
]

// ═══════════════════════════════════════════════════════════════
// SYSTEM FOLDERS (virtual, not from Convex)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_FOLDERS: FolderItem[] = [
  {
    id: "__toutes-correspondances",
    name: "Toutes les correspondances",
    parentFolderId: null,
    tags: [],
    fileCount: 0,
    subfolderCount: 0,
    updatedAt: "",
    createdBy: "Syst\u00e8me",
    isSystem: true,
  },
  {
    id: "__brouillons",
    name: "Brouillons",
    parentFolderId: null,
    tags: [],
    fileCount: 0,
    subfolderCount: 0,
    updatedAt: "",
    createdBy: "Syst\u00e8me",
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
    createdBy: "Syst\u00e8me",
    isSystem: true,
  },
]

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
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/* ── DynamicFolderIcon — yellow macOS folder with animated sheets ── */

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

/* ── VaultFolderCard — folder card with yellow icon ── */

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
  label: string
  count: number
  subfolderCount?: number
  onClick?: () => void
  className?: string
  contextMenu?: React.ReactNode
  badges?: React.ReactNode
  tags?: React.ReactNode
  isDragOver?: boolean
  isSelected?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-center rounded-2xl p-2",
        isDragOver ? "bg-primary/10 ring-2 ring-primary/50" : "",
        isSelected && !isDragOver && "bg-violet-500/10 ring-2 ring-violet-500",
        className
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
            className=""
          />
          <div className="absolute -top-1 right-1 z-10 flex flex-col items-end gap-0.5">
            {subfolderCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white"
              >
                <Folder className="h-2.5 w-2.5" />
                {subfolderCount}
              </motion.span>
            )}
            {count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white"
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
  )
}

/* ── VaultFileCard — correspondence card with A4 preview ── */

function VaultFileCard({
  title,
  reference,
  iconColor = "text-stone-600",
  sender,
  senderInitials,
  date,
  statusBadge,
  typeBadge,
  priorityBadge,
  contextMenu,
  badges,
  tags = [],
  onClick,
  isSelected = false,
}: {
  title: string
  reference?: string
  iconColor?: string
  sender?: string
  senderInitials?: string
  date?: string
  statusBadge?: React.ReactNode
  typeBadge?: React.ReactNode
  priorityBadge?: React.ReactNode
  contextMenu?: React.ReactNode
  badges?: React.ReactNode
  tags?: string[]
  onClick?: () => void
  isSelected?: boolean
}) {
  const overlays = (
    <>
      <div className="absolute left-2 top-2 z-10 flex min-w-0 shrink flex-wrap items-center gap-0.5">
        {badges}
      </div>
      <div
        className="pointer-events-auto absolute right-1.5 top-1.5 z-20 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu}
      </div>
    </>
  )
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col transition-transform duration-300",
        isSelected && "ring-2 ring-violet-500 ring-offset-2",
      )}
    >
      <DocumentSheet orientation="portrait" onClick={onClick} ariaLabel={title} overlays={overlays}>
        <div
          className="flex h-full w-full flex-col items-center justify-between"
          style={{ padding: "20mm", fontFamily: "'Times New Roman', serif" }}
        >
          <div />
          <div className="flex flex-col items-center text-center" style={{ gap: "8mm" }}>
            <Mail className={cn("opacity-60", iconColor)} style={{ width: "40mm", height: "40mm" }} />
            <div
              className="font-semibold"
              style={{ fontSize: "14pt", lineHeight: 1.25, wordBreak: "break-word", maxWidth: "140mm" }}
              title={title}
            >
              {title}
            </div>
            {reference && (
              <div style={{ fontSize: "9pt", color: "#6B7280" }}>Ref : {reference}</div>
            )}
          </div>
          <div className="flex w-full flex-wrap items-end justify-between" style={{ gap: "2mm" }}>
            <div className="flex flex-wrap items-center gap-1">
              {statusBadge}
              {typeBadge}
              {priorityBadge}
            </div>
            {date && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ fontSize: "9pt", color: "#6B7280" }}>
                <Clock className="h-3 w-3" />
                {date}
              </span>
            )}
          </div>
        </div>
      </DocumentSheet>
    </div>
  )
}

/* ── ViewModeToggle ── */

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
    <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-secondary p-0.5">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all",
            value === m.value
              ? "bg-primary/10 text-primary"
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

/* ── BreadcrumbPath ── */

function BreadcrumbPath({
  path,
  onNavigate,
  rootLabel = "Correspondances",
  rootIcon: RootIcon = Mail,
}: {
  path: { id: string; name: string }[]
  onNavigate: (id: string | null) => void
  rootLabel?: string
  rootIcon?: React.ElementType
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
  )
}

/* ── FolderContextMenu ── */

function FolderContextMenu({
  itemId,
  itemName,
  itemType,
  onShare,
  onInfo,
  onTransmit,
  onManageAccess,
  onCreateSubfolder,
  onDelete,
  isSystem,
}: {
  itemId: string
  itemName: string
  itemType: "folder" | "correspondence"
  onShare?: (id: string, type: string) => void
  onInfo?: (id: string) => void
  onTransmit?: (id: string) => void
  onManageAccess?: (id: string) => void
  onCreateSubfolder?: (id: string) => void
  onDelete?: (id: string) => void
  isSystem?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-8 right-0 z-50 w-52 rounded-lg border border-border bg-popover py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground/60">
              {itemType === "folder" ? "Dossier" : "Correspondance"} — Actions
            </div>
            {onShare && (
              <button
                onClick={() => {
                  onShare(itemId, itemType)
                  setOpen(false)
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
                  onInfo(itemId)
                  setOpen(false)
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
                  onTransmit(itemId)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                <Send className="h-3.5 w-3.5 text-violet-400" />
                Transmettre
              </button>
            )}
            {itemType === "folder" && !isSystem && onCreateSubfolder && (
              <button
                onClick={() => {
                  onCreateSubfolder(itemId)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
                Cr\u00e9er sous-dossier
              </button>
            )}
            {itemType === "folder" && onManageAccess && (
              <button
                onClick={() => {
                  onManageAccess(itemId)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                G\u00e9rer acc\u00e8s
              </button>
            )}
            {!isSystem && onDelete && (
              <>
                <div className="my-1 border-t border-border/50" />
                <button
                  onClick={() => {
                    onDelete(itemId)
                    setOpen(false)
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
  )
}

// ═══════════════════════════════════════════════════════════════
// DIALOGS
// ═══════════════════════════════════════════════════════════════

/* ── ShareDialog ── */

function ShareDialog({
  open,
  onClose,
  targetName,
}: {
  open: boolean
  onClose: () => void
  targetName: string
}) {
  const [visibility, setVisibility] = useState<"private" | "team" | "shared">(
    "private"
  )
  const visOptions = [
    {
      value: "private" as const,
      label: "Priv\u00e9",
      desc: "Seul vous pouvez voir ce contenu",
      icon: Lock,
      color: "text-zinc-400",
    },
    {
      value: "team" as const,
      label: "\u00c9quipe / Interne",
      desc: "Visible par les membres de l'organisme",
      icon: Users2,
      color: "text-indigo-400",
    },
    {
      value: "shared" as const,
      label: "Partag\u00e9 / Restreint",
      desc: "Visible par les personnes s\u00e9lectionn\u00e9es",
      icon: Building2,
      color: "text-emerald-400",
    },
  ]
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/5 bg-popover"
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
            D\u00e9finissez la visibilit\u00e9 de ce contenu.
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
                    : "border-border/50 hover:border-border"
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
  )
}

/* ── ManageAccessDialog ── */

function ManageAccessDialog({
  open,
  onClose,
  targetName,
}: {
  open: boolean
  onClose: () => void
  targetName: string
}) {
  const [accessLevel, setAccessLevel] = useState("private")
  const options = [
    { value: "private", label: "Priv\u00e9 Restreint" },
    { value: "team", label: "\u00c9quipe (Interne)" },
    { value: "specific", label: "Acc\u00e8s Sp\u00e9cifique" },
  ]
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/50 px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-amber-400" />
            G\u00e9rer les acc\u00e8s du dossier (Admin)
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
                    : "border-border/50 text-muted-foreground hover:border-border"
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
            Appliquer les acc\u00e8s
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── TransmitDialog ── */

function TransmitDialog({
  open,
  onClose,
  targetName,
}: {
  open: boolean
  onClose: () => void
  targetName: string
}) {
  const [recipient, setRecipient] = useState("")
  const recipients = [
    {
      value: "minstry",
      label: "Minist\u00e8re des Affaires \u00c9trang\u00e8res",
    },
    { value: "embassy-paris", label: "Ambassade de France" },
    { value: "embassy-washington", label: "Ambassade des USA" },
    { value: "onu", label: "Mission Permanente aupr\u00e8s de l'ONU" },
    { value: "ue", label: "Ambassade aupr\u00e8s de l'UE" },
    { value: "custom", label: "Destinataire personnalis\u00e9" },
  ]

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-violet-500/20 bg-popover"
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
            S\u00e9lectionnez le destinataire de cette correspondance.
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
                    : "border-border/50 hover:border-border"
                )}
              >
                <div
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
                    recipient === opt.value
                      ? "border-violet-400"
                      : "border-muted-foreground/20"
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
  )
}

/* ── InfoDialog ── */

function InfoDialog({
  open,
  onClose,
  item,
  itemType,
}: {
  open: boolean
  onClose: () => void
  item: any
  itemType: "folder" | "correspondence"
}) {
  if (!open) return null
  const statusLabel = item.status
    ? STATUS_CFG[item.status as CorrStatus]?.label || "\u2014"
    : "\u2014"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/50 bg-popover"
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
                R\u00e9f: {item.reference}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {item.status && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      STATUS_CFG[item.status as CorrStatus]?.dot ||
                        "bg-muted-foreground"
                    )}
                  />
                  {statusLabel}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <User className="h-2.5 w-2.5" />
                {item.createdBy || item.sender || "\u2014"}
              </span>
            </div>
            <p className="pt-0.5 font-mono text-[9px] break-all text-muted-foreground/30">
              {item.id}
            </p>
          </div>

          {itemType === "correspondence" && item.type && (
            <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                Type & Priorit\u00e9
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 text-[9px] font-medium",
                    CORRESPONDENCE_TYPE_CONFIG[item.type as CorrespondenceType]
                      ?.color
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
                        : "border-amber-500/20 bg-amber-500/15 text-amber-400"
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
                    Exp\u00e9diteur
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
                Aucun tag assign\u00e9
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
                  Modifi\u00e9 le
                </p>
                <p className="text-[11px] font-medium">
                  {item.updatedAt || "\u2014"}
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
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ICorrespondancePage() {
  // ─── Org selector (backoffice: admin chooses which org to manage) ──
  const { data: orgsList = [] } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    {}
  )
  const orgs = orgsList as any[]
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const activeOrgId = (selectedOrgId ??
    orgs[0]?._id ??
    null) as Id<"orgs"> | null

  // ─── Active tab ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("correspondance")

  // ─── Convex queries (correspondance) ─────────────────────
  const { data: rawFolders = [] } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getFolders,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )
  const { data: rawItems = [] } = useAuthenticatedConvexQuery(
    api.functions.correspondance.getItems,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  // ─── Convex queries (dossiers) ──────────────────────────
  const { data: dossiers = [] } = useAuthenticatedConvexQuery(
    api.functions.dossierProcedure.listDossiers,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )
  const { data: typeDemarches = [] } = useAuthenticatedConvexQuery(
    api.functions.dossierProcedure.listAllTypeDemarches,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  // ─── Convex queries (dashboard) ─────────────────────────
  const { data: dashboardStats } = useAuthenticatedConvexQuery(
    api.functions.correspondanceDashboard.getDashboardStats,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )
  const { data: recentActivity = [] } = useAuthenticatedConvexQuery(
    api.functions.correspondanceDashboard.getRecentActivity,
    activeOrgId ? { orgId: activeOrgId, limit: 20 } : "skip"
  )
  const { data: dossierStats } = useAuthenticatedConvexQuery(
    api.functions.correspondanceDashboard.getDossierStats,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  // ─── Convex mutations (correspondance) ──────────────────
  const createFolderMutation = useConvexMutationQuery(
    api.functions.correspondance.createFolder
  )
  const createItemMutation = useConvexMutationQuery(
    api.functions.correspondance.createItem
  )
  const deleteFolderMutation = useConvexMutationQuery(
    api.functions.correspondance.deleteFolder
  )
  const deleteItemMutation = useConvexMutationQuery(
    api.functions.correspondance.deleteItem
  )
  const archiveItemMutation = useConvexMutationQuery(
    api.functions.correspondance.archiveItem
  )

  // ─── Convex mutations (typeDemarche) ────────────────────
  const createTypeDemarcheMutation = useConvexMutationQuery(
    api.functions.dossierProcedure.createTypeDemarche
  )
  const updateTypeDemarcheMutation = useConvexMutationQuery(
    api.functions.dossierProcedure.updateTypeDemarche
  )
  const deactivateTypeDemarcheMutation = useConvexMutationQuery(
    api.functions.dossierProcedure.deactivateTypeDemarche
  )

  // ─── Map Convex data to UI types ─────────────────────────
  const correspondences = useMemo(
    (): CorrespondenceItem[] =>
      (rawItems as any[]).map((item) => ({
        id: item._id,
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
        folderId: item.folderId ?? "__toutes-correspondances",
        attachments: item.documents?.length ?? 0,
      })),
    [rawItems]
  )

  const folders = useMemo(
    (): FolderItem[] => [
      ...DEFAULT_FOLDERS,
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
    [rawFolders]
  )

  // ─── State ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<CorrStatus | "all">("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // ─── Dialog states ───────────────────────────────────────
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareTargetName, setShareTargetName] = useState("")
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [manageAccessTargetName, setManageAccessTargetName] = useState("")
  const [transmitDialogOpen, setTransmitDialogOpen] = useState(false)
  const [transmitTargetName, setTransmitTargetName] = useState("")
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [infoItem, setInfoItem] = useState<any>(null)
  const [infoItemType, setInfoItemType] = useState<"folder" | "correspondence">(
    "folder"
  )

  // ─── New folder dialog ───────────────────────────────────
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // ─── New correspondance dialog ───────────────────────────
  const [showNewCorrDialog, setShowNewCorrDialog] = useState(false)
  const [newCorr, setNewCorr] = useState({
    title: "",
    type: "lettre_officielle" as CorrespondenceType,
    priority: "normal" as Priority,
    senderName: "",
    recipientName: "",
    recipientOrg: "",
    recipientEmail: "",
    comment: "",
  })
  const [isCreatingCorr, setIsCreatingCorr] = useState(false)

  // ─── TypeDemarche CRUD state ────────────────────────────
  const [showTypeDemarcheForm, setShowTypeDemarcheForm] = useState(false)
  const [editingTypeDemarche, setEditingTypeDemarche] = useState<any>(null)
  const [typeDemarcheForm, setTypeDemarcheForm] = useState({
    code: "",
    label: "",
    description: "",
    category: "administratif",
    delaiTraitementJours: 30,
  })
  const [isSubmittingTypeDemarche, setIsSubmittingTypeDemarche] =
    useState(false)
  const [typeDemarcheSearch, setTypeDemarcheSearch] = useState("")

  // ─── Dossier filter state ────────────────────────────────
  const [dossierSearch, setDossierSearch] = useState("")
  const [dossierStatusFilter, setDossierStatusFilter] = useState<string>("all")

  // ─── Breadcrumb path ────────────────────────────────────
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

  // ─── Filtered folders at current level ──────────────────
  const currentFolders = useMemo(() => {
    return folders.filter((f) => f.parentFolderId === currentFolderId)
  }, [folders, currentFolderId])

  // ─── Folder counts ──────────────────────────────────────
  const foldersWithCounts = useMemo(() => {
    return currentFolders.map((f) => ({
      ...f,
      fileCount: correspondences.filter((d) => d.folderId === f.id).length,
      subfolderCount: folders.filter((sf) => sf.parentFolderId === f.id).length,
    }))
  }, [currentFolders, correspondences, folders])

  // ─── Filtered correspondences at current level ──────────
  const currentFiles = useMemo(() => {
    if (currentFolderId === null) return []
    let items = correspondences.filter((d) => d.folderId === currentFolderId)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q) ||
          d.sender.toLowerCase().includes(q) ||
          d.recipient.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== "all") {
      items = items.filter((d) => d.status === statusFilter)
    }
    items.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case "name":
          cmp = a.title.localeCompare(b.title, "fr")
          break
        case "sender":
          cmp = a.sender.localeCompare(b.sender, "fr")
          break
        case "date":
          cmp = a.updatedAtTs - b.updatedAtTs
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        default:
          cmp = a.updatedAtTs - b.updatedAtTs
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return items
  }, [correspondences, currentFolderId, search, statusFilter, sortBy, sortDir])

  // ─── Status counts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: correspondences.length }
    for (const corr of correspondences) {
      counts[corr.status] = (counts[corr.status] || 0) + 1
    }
    return counts
  }, [correspondences])

  // ─── Filtered dossiers ──────────────────────────────────
  const filteredDossiers = useMemo(() => {
    let items = [...(dossiers as any[])]
    if (dossierSearch) {
      const q = dossierSearch.toLowerCase()
      items = items.filter(
        (d: any) =>
          d.reference?.toLowerCase().includes(q) ||
          d.typeDemarcheLabel?.toLowerCase().includes(q) ||
          d.status?.toLowerCase().includes(q)
      )
    }
    if (dossierStatusFilter !== "all") {
      items = items.filter((d: any) => d.status === dossierStatusFilter)
    }
    return items
  }, [dossiers, dossierSearch, dossierStatusFilter])

  // ─── Filtered typeDemarches ─────────────────────────────
  const filteredTypeDemarches = useMemo(() => {
    let items = [...(typeDemarches as any[])]
    if (typeDemarcheSearch) {
      const q = typeDemarcheSearch.toLowerCase()
      items = items.filter(
        (t: any) =>
          t.code?.toLowerCase().includes(q) ||
          t.label?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      )
    }
    return items
  }, [typeDemarches, typeDemarcheSearch])

  // ─── Handlers ───────────────────────────────────────────
  const handleOpenFolder = useCallback(
    (folderId: string) => setCurrentFolderId(folderId),
    []
  )
  const handleNavigate = useCallback(
    (folderId: string | null) => setCurrentFolderId(folderId),
    []
  )

  const handleShare = useCallback(
    (id: string, type: string) => {
      const name =
        type === "folder"
          ? folders.find((f) => f.id === id)?.name
          : correspondences.find((d) => d.id === id)?.title
      setShareTargetName(name || "")
      setShareDialogOpen(true)
    },
    [folders, correspondences]
  )

  const handleManageAccess = useCallback(
    (id: string) => {
      const name = folders.find((f) => f.id === id)?.name || ""
      setManageAccessTargetName(name)
      setManageAccessOpen(true)
    },
    [folders]
  )

  const handleOpenTransmit = useCallback(
    (id: string) => {
      const corr = correspondences.find((d) => d.id === id)
      setTransmitTargetName(corr?.title || "")
      setTransmitDialogOpen(true)
    },
    [correspondences]
  )

  const handleOpenInfo = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id)
      const corr = correspondences.find((d) => d.id === id)
      if (folder) {
        setInfoItem({
          id: folder.id,
          name: folder.name,
          createdBy: folder.createdBy,
          tags: folder.tags,
          updatedAt: folder.updatedAt,
        })
        setInfoItemType("folder")
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
        })
        setInfoItemType("correspondence")
      }
      setInfoDialogOpen(true)
    },
    [folders, correspondences]
  )

  // ─── Create folder handler ───────────────────────────────
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !activeOrgId) return
    setIsCreatingFolder(true)
    try {
      const isRealFolder =
        currentFolderId !== null &&
        !DEFAULT_FOLDERS.find((f) => f.id === currentFolderId)
      await createFolderMutation.mutateAsync({
        orgId: activeOrgId,
        name: newFolderName.trim(),
        parentFolderId: isRealFolder
          ? (currentFolderId as Id<"correspondanceFolders">)
          : undefined,
        tags: [],
      })
      setNewFolderName("")
      setShowNewFolderDialog(false)
      toast.success("Dossier cr\u00e9\u00e9")
    } catch {
      toast.error("Erreur lors de la cr\u00e9ation du dossier")
    } finally {
      setIsCreatingFolder(false)
    }
  }, [newFolderName, activeOrgId, currentFolderId, createFolderMutation])

  // ─── Create correspondance handler ───────────────────────
  const handleCreateCorrespondance = useCallback(async () => {
    if (
      !newCorr.title.trim() ||
      !newCorr.senderName.trim() ||
      !newCorr.recipientName.trim() ||
      !activeOrgId
    )
      return
    setIsCreatingCorr(true)
    try {
      const isRealFolder =
        currentFolderId !== null &&
        !DEFAULT_FOLDERS.find((f) => f.id === currentFolderId)
      await createItemMutation.mutateAsync({
        orgId: activeOrgId,
        folderId: isRealFolder
          ? (currentFolderId as Id<"correspondanceFolders">)
          : undefined,
        title: newCorr.title.trim(),
        type: newCorr.type,
        priority: newCorr.priority,
        senderName: newCorr.senderName.trim(),
        recipientName: newCorr.recipientName.trim(),
        recipientOrg: newCorr.recipientOrg.trim() || undefined,
        recipientEmail: newCorr.recipientEmail.trim() || undefined,
        comment: newCorr.comment.trim() || undefined,
        tags: [],
        requiresApproval: false,
        documents: [],
      })
      setNewCorr({
        title: "",
        type: "lettre_officielle",
        priority: "normal",
        senderName: "",
        recipientName: "",
        recipientOrg: "",
        recipientEmail: "",
        comment: "",
      })
      setShowNewCorrDialog(false)
      toast.success("Correspondance cr\u00e9\u00e9e")
    } catch {
      toast.error("Erreur lors de la cr\u00e9ation")
    } finally {
      setIsCreatingCorr(false)
    }
  }, [newCorr, activeOrgId, currentFolderId, createItemMutation])

  // ─── Delete handler ──────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      const isFolder = folders.some((f) => f.id === id && !f.isSystem)
      try {
        if (isFolder) {
          await deleteFolderMutation.mutateAsync({
            folderId: id as Id<"correspondanceFolders">,
          })
          toast.success("Dossier supprim\u00e9")
        } else {
          await deleteItemMutation.mutateAsync({
            itemId: id as Id<"correspondanceItems">,
          })
          toast.success("Correspondance supprim\u00e9e")
        }
      } catch {
        toast.error("Erreur lors de la suppression")
      }
    },
    [folders, deleteFolderMutation, deleteItemMutation]
  )

  // ─── Archive handler ─────────────────────────────────────
  const handleArchive = useCallback(
    async (id: string) => {
      try {
        await archiveItemMutation.mutateAsync({
          itemId: id as Id<"correspondanceItems">,
        })
        toast.success("Correspondance archiv\u00e9e")
      } catch {
        toast.error("Erreur lors de l'archivage")
      }
    },
    [archiveItemMutation]
  )

  // ─── TypeDemarche CRUD handlers ──────────────────────────
  const handleOpenTypeDemarcheForm = useCallback((typeDemarche?: any) => {
    if (typeDemarche) {
      setEditingTypeDemarche(typeDemarche)
      setTypeDemarcheForm({
        code: typeDemarche.code || "",
        label: typeDemarche.label || "",
        description: typeDemarche.description || "",
        category: typeDemarche.category || "administratif",
        delaiTraitementJours: typeDemarche.delaiTraitementJours || 30,
      })
    } else {
      setEditingTypeDemarche(null)
      setTypeDemarcheForm({
        code: "",
        label: "",
        description: "",
        category: "administratif",
        delaiTraitementJours: 30,
      })
    }
    setShowTypeDemarcheForm(true)
  }, [])

  const handleSubmitTypeDemarche = useCallback(async () => {
    if (
      !typeDemarcheForm.code.trim() ||
      !typeDemarcheForm.label.trim() ||
      !activeOrgId
    )
      return
    setIsSubmittingTypeDemarche(true)
    try {
      if (editingTypeDemarche) {
        await updateTypeDemarcheMutation.mutateAsync({
          id: editingTypeDemarche._id as Id<"typeDemarches">,
          label: { fr: typeDemarcheForm.label.trim() },
          description: typeDemarcheForm.description.trim()
            ? { fr: typeDemarcheForm.description.trim() }
            : undefined,
          category: typeDemarcheForm.category as any,
          delaiGlobalJours: typeDemarcheForm.delaiTraitementJours,
        })
        toast.success("Type de d\u00e9marche mis \u00e0 jour")
      } else {
        await createTypeDemarcheMutation.mutateAsync({
          orgId: activeOrgId,
          code: typeDemarcheForm.code.trim(),
          label: { fr: typeDemarcheForm.label.trim() },
          description: typeDemarcheForm.description.trim()
            ? { fr: typeDemarcheForm.description.trim() }
            : undefined,
          category: typeDemarcheForm.category as any,
          referencePattern: `{TYPE}/{YYYY}/{ORG}/{SEQ:5}`,
          confidentialite: "standard" as const,
          delaiGlobalJours: typeDemarcheForm.delaiTraitementJours,
          piecesRequises: [],
          etapesParcours: [],
        })
        toast.success("Type de d\u00e9marche cr\u00e9\u00e9")
      }
      setShowTypeDemarcheForm(false)
      setEditingTypeDemarche(null)
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'enregistrement")
    } finally {
      setIsSubmittingTypeDemarche(false)
    }
  }, [
    typeDemarcheForm,
    activeOrgId,
    editingTypeDemarche,
    createTypeDemarcheMutation,
    updateTypeDemarcheMutation,
  ])

  const handleDeactivateTypeDemarche = useCallback(
    async (id: string) => {
      try {
        await deactivateTypeDemarcheMutation.mutateAsync({
          id: id as Id<"typeDemarches">,
        })
        toast.success("Type de d\u00e9marche d\u00e9sactiv\u00e9")
      } catch {
        toast.error("Erreur lors de la d\u00e9sactivation")
      }
    },
    [deactivateTypeDemarcheMutation]
  )

  const hasActiveFilters = statusFilter !== "all" || search

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="flex w-full flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUp}>
        <PageHeader
          icon={<Mail className="h-5 w-5" />}
          iconBgClass="bg-violet-500/10"
          title="iCorrespondance — Administration"
          subtitle={`Gestion centralis\u00e9e de la correspondance diplomatique  ${correspondences.length} correspondances  ${dossiers.length} dossiers  ${(typeDemarches as any[]).length} types`}
          actions={
            <div className="flex items-center gap-2">
              {activeTab === "correspondance" && (
                <>
                  <button
                    onClick={() => setShowNewFolderDialog(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Nouveau dossier
                  </button>
                  <button
                    onClick={() => setShowNewCorrDialog(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nouvelle correspondance
                  </button>
                </>
              )}
              {activeTab === "types-demarches" && (
                <button
                  onClick={() => handleOpenTypeDemarcheForm()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau type
                </button>
              )}
            </div>
          }
        />
      </motion.div>

      {/* ── Tab Navigation ── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          {[
            {
              key: "correspondance" as ActiveTab,
              label: "Correspondance",
              icon: Mail,
            },
            {
              key: "types-demarches" as ActiveTab,
              label: "Types de d\u00e9marches",
              icon: Settings,
            },
            { key: "dossiers" as ActiveTab, label: "Dossiers", icon: Folder },
            {
              key: "audit" as ActiveTab,
              label: "Journal d'audit",
              icon: Activity,
            },
            {
              key: "statistiques" as ActiveTab,
              label: "Statistiques",
              icon: BarChart3,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.key === "dossiers" && (dossiers as any[]).length > 0 && (
                <span className="ml-1 text-[9px] opacity-60">
                  ({(dossiers as any[]).length})
                </span>
              )}
              {tab.key === "types-demarches" &&
                (typeDemarches as any[]).length > 0 && (
                  <span className="ml-1 text-[9px] opacity-60">
                    ({(typeDemarches as any[]).length})
                  </span>
                )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ═══ TAB: Correspondance ═══ */}
      {activeTab === "correspondance" && (
        <>
          {/* ── Toolbar ── */}
          <motion.div variants={fadeUp}>
            <div className="rounded-xl bg-secondary p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative max-w-[360px] min-w-[200px] flex-1">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Rechercher dans les correspondances..."
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
                        setSearch("")
                        setStatusFilter("all")
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
                {/* Folders */}
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
                                Syst\u00e8me
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
                {/* Correspondences */}
                {currentFiles.length > 0 && (
                  <div>
                    <p className="mb-3 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                      Correspondances
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {currentFiles.map((corr) => {
                        const st = STATUS_CFG[corr.status]
                        const typeConfig = CORRESPONDENCE_TYPE_CONFIG[corr.type]
                        return (
                          <VaultFileCard
                            key={corr.id}
                            title={corr.title}
                            reference={corr.reference}
                            sender={corr.sender}
                            senderInitials={corr.senderInitials}
                            date={corr.updatedAt}
                            statusBadge={
                              <span
                                className={cn(
                                  "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[9px] font-medium",
                                  st.class
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    st.dot
                                  )}
                                />
                                {st.label}
                              </span>
                            }
                            typeBadge={
                              <span
                                className={cn(
                                  "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[9px] font-medium",
                                  typeConfig.color
                                )}
                              >
                                {typeConfig.label}
                              </span>
                            }
                            priorityBadge={
                              corr.priority !== "normal" ? (
                                <span
                                  className={cn(
                                    "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[9px] font-medium",
                                    corr.priority === "urgent"
                                      ? "border-red-500/20 bg-red-500/15 text-red-400"
                                      : "border-amber-500/20 bg-amber-500/15 text-amber-400"
                                  )}
                                >
                                  {PRIORITY_CONFIG[corr.priority].label}
                                </span>
                              ) : undefined
                            }
                            contextMenu={
                              <FolderContextMenu
                                itemId={corr.id}
                                itemName={corr.title}
                                itemType="correspondence"
                                onShare={handleShare}
                                onInfo={handleOpenInfo}
                                onTransmit={handleOpenTransmit}
                                onDelete={handleDelete}
                              />
                            }
                            badges={
                              corr.attachments > 0 ? (
                                <span className="inline-flex h-4 items-center gap-1 rounded-full bg-blue-500/15 px-1.5 text-[9px] font-medium text-blue-400">
                                  <FileText className="h-2.5 w-2.5" />
                                  {corr.attachments}
                                </span>
                              ) : undefined
                            }
                            tags={corr.tags}
                            onClick={() => handleOpenInfo(corr.id)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Empty state */}
                {foldersWithCounts.length === 0 &&
                  currentFiles.length === 0 && (
                    <div className="flex flex-col items-center py-16 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                        <FolderOpen className="h-8 w-8 text-violet-400/60" />
                      </div>
                      <h3 className="mb-1 text-lg font-semibold">
                        Dossier vide
                      </h3>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Ce dossier ne contient aucune correspondance. Cr\u00e9ez
                        une nouvelle correspondance ou importez des fichiers.
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
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 border-b border-border/50 bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <div
                      className="col-span-4 flex cursor-pointer items-center gap-1 hover:text-foreground"
                      onClick={() => {
                        setSortBy("name")
                        setSortDir(
                          sortBy === "name" && sortDir === "asc"
                            ? "desc"
                            : "asc"
                        )
                      }}
                    >
                      Titre{" "}
                      {sortBy === "name" &&
                        (sortDir === "asc" ? "\u2191" : "\u2193")}
                    </div>
                    <div className="col-span-2">Type</div>
                    <div
                      className="col-span-2 cursor-pointer hover:text-foreground"
                      onClick={() => {
                        setSortBy("date")
                        setSortDir(
                          sortBy === "date" && sortDir === "asc"
                            ? "desc"
                            : "asc"
                        )
                      }}
                    >
                      Modifi\u00e9{" "}
                      {sortBy === "date" &&
                        (sortDir === "asc" ? "\u2191" : "\u2193")}
                    </div>
                    <div className="col-span-2">Statut</div>
                    <div className="col-span-2">Priorit\u00e9</div>
                  </div>
                  {/* Folders */}
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
                  {/* Correspondences */}
                  {currentFiles.map((corr) => {
                    const st = STATUS_CFG[corr.status]
                    const typeConfig = CORRESPONDENCE_TYPE_CONFIG[corr.type]
                    return (
                      <div
                        key={corr.id}
                        className="group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                        onClick={() => handleOpenInfo(corr.id)}
                      >
                        <div className="col-span-4 flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                            <Mail className="h-3 w-3 text-violet-400" />
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-medium">
                              {corr.title}
                            </span>
                            <span className="block truncate text-[9px] text-muted-foreground/50">
                              {corr.reference}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span
                            className={cn(
                              "rounded-md px-2 py-1 text-[9px] font-medium",
                              typeConfig.color
                            )}
                          >
                            {typeConfig.label}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {corr.updatedAt}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
                              st.class
                            )}
                          >
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full", st.dot)}
                            />
                            {st.label}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          {corr.priority !== "normal" && (
                            <span
                              className={cn(
                                "rounded-md px-2 py-1 text-[9px] font-medium",
                                corr.priority === "urgent"
                                  ? "text-red-400"
                                  : "text-amber-400"
                              )}
                            >
                              {PRIORITY_CONFIG[corr.priority].label}
                            </span>
                          )}
                        </div>
                      </div>
                    )
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
                    {/* Root column */}
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
                                "bg-primary/10 text-primary"
                            )}
                          >
                            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span className="truncate">{folder.name}</span>
                            <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
                          </button>
                        ))}
                    </div>
                    {/* Subfolder column */}
                    {currentFolderId && (
                      <div className="w-60 overflow-y-auto border-r border-border/50">
                        <div className="p-2 px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase">
                          {folders.find((f) => f.id === currentFolderId)?.name}
                        </div>
                        {folders
                          .filter((f) => f.parentFolderId === currentFolderId)
                          .map((folder) => (
                            <button
                              key={folder.id}
                              onClick={() => handleOpenFolder(folder.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                            >
                              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                              <span className="truncate">{folder.name}</span>
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
                    {/* Preview pane */}
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <Mail className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p>
                          S\u00e9lectionnez une correspondance pour
                          l'aper\u00e7u
                        </p>
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
                className="w-full max-w-md rounded-2xl border border-border/50 bg-popover"
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
                          handleCreateFolder()
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
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    {isCreatingFolder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderPlus className="h-4 w-4" />
                    )}
                    Cr\u00e9er
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── New Correspondance Dialog ── */}
          {showNewCorrDialog && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowNewCorrDialog(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-border/50 bg-popover"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-border/50 px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Mail className="h-5 w-5 text-violet-400" />
                    Nouvelle correspondance
                  </div>
                </div>
                <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-medium">Titre *</label>
                      <input
                        placeholder="Ex: Note verbale — Demande de visa"
                        value={newCorr.title}
                        onChange={(e) =>
                          setNewCorr((p) => ({ ...p, title: e.target.value }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Type *</label>
                      <select
                        value={newCorr.type}
                        onChange={(e) =>
                          setNewCorr((p) => ({
                            ...p,
                            type: e.target.value as CorrespondenceType,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      >
                        {Object.entries(CORRESPONDENCE_TYPE_CONFIG).map(
                          ([v, c]) => (
                            <option key={v} value={v}>
                              {c.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Priorit\u00e9
                      </label>
                      <select
                        value={newCorr.priority}
                        onChange={(e) =>
                          setNewCorr((p) => ({
                            ...p,
                            priority: e.target.value as Priority,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="confidentiel">Confidentiel</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-medium">
                        Exp\u00e9diteur *
                      </label>
                      <input
                        placeholder="Ex: Ambassade du Gabon en France"
                        value={newCorr.senderName}
                        onChange={(e) =>
                          setNewCorr((p) => ({
                            ...p,
                            senderName: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-medium">
                        Destinataire *
                      </label>
                      <input
                        placeholder="Ex: Minist\u00e8re des Affaires \u00c9trang\u00e8res"
                        value={newCorr.recipientName}
                        onChange={(e) =>
                          setNewCorr((p) => ({
                            ...p,
                            recipientName: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Représentation destinataire
                      </label>
                      <input
                        placeholder="Ex: MAE Gabon"
                        value={newCorr.recipientOrg}
                        onChange={(e) =>
                          setNewCorr((p) => ({
                            ...p,
                            recipientOrg: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Email destinataire
                      </label>
                      <input
                        type="email"
                        placeholder="contact@mae.ga"
                        value={newCorr.recipientEmail}
                        onChange={(e) =>
                          setNewCorr((p) => ({
                            ...p,
                            recipientEmail: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-medium">
                        Note / Commentaire
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Commentaire interne ou objet de la correspondance..."
                        value={newCorr.comment}
                        onChange={(e) =>
                          setNewCorr((p) => ({ ...p, comment: e.target.value }))
                        }
                        className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
                  <button
                    onClick={() => setShowNewCorrDialog(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateCorrespondance}
                    disabled={
                      !newCorr.title.trim() ||
                      !newCorr.senderName.trim() ||
                      !newCorr.recipientName.trim() ||
                      isCreatingCorr
                    }
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    {isCreatingCorr ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Cr\u00e9er
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: Types de d\u00e9marches ═══ */}
      {activeTab === "types-demarches" && (
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Search bar */}
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="relative max-w-[360px]">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Rechercher un type de d\u00e9marche..."
                value={typeDemarcheSearch}
                onChange={(e) => setTypeDemarcheSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-border/50 bg-muted/50 px-3 pl-8 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Types list */}
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 border-b border-border/50 bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <div className="col-span-2">Code</div>
              <div className="col-span-3">Libell\u00e9</div>
              <div className="col-span-2">Cat\u00e9gorie</div>
              <div className="col-span-1">Pi\u00e8ces</div>
              <div className="col-span-1">\u00c9tapes</div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-2">Actions</div>
            </div>
            {/* Rows */}
            {filteredTypeDemarches.length > 0 ? (
              filteredTypeDemarches.map((td: any) => (
                <div
                  key={td._id}
                  className="group grid grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="col-span-2 flex items-center">
                    <span className="font-mono text-xs text-muted-foreground">
                      {td.code}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="truncate text-xs font-medium">
                      {td.label}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
                      {td.category || "\u2014"}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs text-muted-foreground">
                      {td.piecesRequises?.length ?? 0}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs text-muted-foreground">
                      {td.etapes?.length ?? 0}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    {td.isActive !== false ? (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-400">
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-500/20 bg-zinc-500/15 px-2 py-0.5 text-[9px] font-medium text-zinc-400">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <button
                      onClick={() => handleOpenTypeDemarcheForm(td)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Modifier"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    {td.isActive !== false && (
                      <button
                        onClick={() => handleDeactivateTypeDemarche(td._id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
                        title="D\u00e9sactiver"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Aucun type de d\u00e9marche trouv\u00e9
              </div>
            )}
          </div>

          {/* TypeDemarche Form Dialog */}
          {showTypeDemarcheForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTypeDemarcheForm(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-border/50 bg-popover"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-border/50 px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Settings className="h-5 w-5 text-violet-400" />
                    {editingTypeDemarche
                      ? "Modifier le type de d\u00e9marche"
                      : "Nouveau type de d\u00e9marche"}
                  </div>
                </div>
                <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Code *</label>
                      <input
                        placeholder="Ex: PASSEPORT"
                        value={typeDemarcheForm.code}
                        onChange={(e) =>
                          setTypeDemarcheForm((p) => ({
                            ...p,
                            code: e.target.value,
                          }))
                        }
                        disabled={!!editingTypeDemarche}
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 font-mono text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none disabled:opacity-50"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Cat\u00e9gorie *
                      </label>
                      <select
                        value={typeDemarcheForm.category}
                        onChange={(e) =>
                          setTypeDemarcheForm((p) => ({
                            ...p,
                            category: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-medium">
                        Libell\u00e9 *
                      </label>
                      <input
                        placeholder="Ex: Demande de passeport"
                        value={typeDemarcheForm.label}
                        onChange={(e) =>
                          setTypeDemarcheForm((p) => ({
                            ...p,
                            label: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-medium">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Description de la d\u00e9marche..."
                        value={typeDemarcheForm.description}
                        onChange={(e) =>
                          setTypeDemarcheForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        D\u00e9lai de traitement (jours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={typeDemarcheForm.delaiTraitementJours}
                        onChange={(e) =>
                          setTypeDemarcheForm((p) => ({
                            ...p,
                            delaiTraitementJours:
                              Number.parseInt(e.target.value) || 30,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
                  <button
                    onClick={() => setShowTypeDemarcheForm(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmitTypeDemarche}
                    disabled={
                      !typeDemarcheForm.code.trim() ||
                      !typeDemarcheForm.label.trim() ||
                      isSubmittingTypeDemarche
                    }
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    {isSubmittingTypeDemarche ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {editingTypeDemarche ? "Mettre \u00e0 jour" : "Cr\u00e9er"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ TAB: Dossiers (supervisor read-only) ═══ */}
      {activeTab === "dossiers" && (
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Toolbar */}
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-[360px] min-w-[200px] flex-1">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Rechercher un dossier..."
                  value={dossierSearch}
                  onChange={(e) => setDossierSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border/50 bg-muted/50 px-3 pl-8 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                />
              </div>
              <div className="hidden h-6 w-px bg-border/50 sm:block" />
              <div className="flex items-center gap-1">
                {[
                  { value: "all", label: "Tous" },
                  { value: "brouillon", label: "Brouillons" },
                  { value: "soumis", label: "Soumis" },
                  { value: "en_cours", label: "En cours" },
                  { value: "complete", label: "Complets" },
                  { value: "rejete", label: "Rejet\u00e9s" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setDossierStatusFilter(f.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                      dossierStatusFilter === f.value
                        ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dossier Table */}
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            <div className="grid grid-cols-12 gap-2 border-b border-border/50 bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <div className="col-span-2">R\u00e9f\u00e9rence</div>
              <div className="col-span-3">Type de d\u00e9marche</div>
              <div className="col-span-2">Statut</div>
              <div className="col-span-2">Priorit\u00e9</div>
              <div className="col-span-1">\u00c9tape</div>
              <div className="col-span-2">Date</div>
            </div>
            {filteredDossiers.length > 0 ? (
              filteredDossiers.map((d: any) => (
                <div
                  key={d._id}
                  className="grid grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="col-span-2 flex items-center">
                    <span className="font-mono text-xs text-muted-foreground">
                      {d.reference || d._id?.slice(-8)}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="truncate text-xs font-medium">
                      {d.typeDemarcheLabel || "\u2014"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        d.status === "brouillon"
                          ? "border-zinc-500/20 bg-zinc-500/15 text-zinc-400"
                          : d.status === "soumis"
                            ? "border-blue-500/20 bg-blue-500/15 text-blue-400"
                            : d.status === "en_cours"
                              ? "border-amber-500/20 bg-amber-500/15 text-amber-400"
                              : d.status === "complete"
                                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                                : d.status === "rejete"
                                  ? "border-red-500/20 bg-red-500/15 text-red-400"
                                  : "border-zinc-500/20 bg-zinc-500/15 text-zinc-400"
                      )}
                    >
                      {d.status || "\u2014"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center">
                    {d.priorite && d.priorite !== "normal" && (
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-[9px] font-medium",
                          d.priorite === "urgent"
                            ? "text-red-400"
                            : "text-amber-400"
                        )}
                      >
                        {d.priorite}
                      </span>
                    )}
                    {(!d.priorite || d.priorite === "normal") && (
                      <span className="text-xs text-muted-foreground/50">
                        Normal
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs text-muted-foreground">
                      {d.currentStepIndex != null
                        ? `${d.currentStepIndex + 1}/${d.totalSteps || "?"}`
                        : "\u2014"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-2.5 w-2.5" />
                    {d._creationTime
                      ? new Date(d._creationTime).toLocaleDateString("fr-FR")
                      : "\u2014"}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Aucun dossier trouv\u00e9
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ TAB: Journal d'audit ═══ */}
      {activeTab === "audit" && (
        <motion.div variants={fadeUp}>
          <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <Activity className="h-8 w-8 text-violet-400/60" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Journal d'audit</h3>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </motion.div>
      )}

      {/* ═══ TAB: Statistiques ═══ */}
      {activeTab === "statistiques" && (
        <motion.div variants={fadeUp}>
          <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <BarChart3 className="h-8 w-8 text-violet-400/60" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Statistiques</h3>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </motion.div>
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
  )
}
