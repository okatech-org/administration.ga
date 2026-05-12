"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { DocumentSheet } from "@workspace/ui/components/document-sheet"
import { Link, useRouter } from "@workspace/routing"
import React, { useState, useMemo, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { useOrg } from "../../shell/org-provider"
import {
  usePageContext,
  useRegisterPageAction,
} from "../../hooks/use-page-context"
import type {
  PageAction,
  PageEntity,
} from "../../stores/page-context-store"
import { useModuleAccess } from "../../components/shared/access-gate"
import { useOrgModules } from "../../hooks/useOrgModules"
import { useCanDoTask } from "../../hooks/useCanDoTask"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@workspace/api/hooks"
import { toast } from "sonner"
import {
  Archive,
  Search,
  Shield,
  Clock,
  Lock,
  Landmark,
  Mail,
  Users2,
  Scale,
  Building2,
  FileText,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  X,
  MoreHorizontal,
  Share2,
  Info,
  KeyRound,
  Tag,
  Trash2,
  CalendarClock,
  GitBranch,
  User,
  Undo2,
  LayoutGrid,
  List,
  Columns3,
  ChevronRight,
  Plus,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { DocumentViewerModal } from "../../components/shared/document-viewer-modal"
import type { ViewerDoc } from "../../components/shared/document-viewer-modal"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type DocStatus = "draft" | "review" | "approved" | "archived" | "trashed"
type ViewMode = "grid" | "list" | "column"
type ConfidentialityLevel = "public" | "internal" | "confidential" | "secret"
type CountingStartEvent =
  | "date_creation"
  | "date_cloture"
  | "date_tag"
  | "date_gel"
  | "date_manuelle"

interface DocOrigin {
  type: "correspondance" | "upload" | "inbound-email" | "scan"
  correspondanceReference?: string
  correspondanceArrivalRef?: string
  senderName?: string
  recipientName?: string
  sourceDate?: number
  classedAt?: number
  classedByUserId?: string
}

interface DocItem {
  id: string
  title: string
  excerpt: string
  author: string
  authorInitials?: string
  updatedAt: string
  updatedAtTs: number
  status: DocStatus
  tags: string[]
  version: number
  folderId: string | null
  archiveCategorySlug?: string | null
  mimeType?: string
  url?: string | null
  /** Back-pointer vers le courrier source (Phase 1 — alignement iCorr). */
  linkedCorrespondanceItemId?: string
  /** Provenance dénormalisée pour affichage (Phase 1 — alignement iCorr). */
  origin?: DocOrigin
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

interface ArchiveCategoryOption {
  _id: string
  name: string
  slug: string
  color: string
  icon: string
  retentionYears: number
  description?: string
  isPerpetual?: boolean
}

interface ArchivePolicyData {
  categoryId: string
  categorySlug: string
  countingStartEvent: CountingStartEvent
  manualDate?: number
  confidentiality: ConfidentialityLevel
  inheritToChildren: boolean
  inheritToDocuments: boolean
}

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CFG: Record<
  DocStatus,
  { label: string; class: string; dot: string }
> = {
  draft: {
    label: "Brouillon",
    class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  review: {
    label: "En révision",
    class: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  approved: {
    label: "Approuvé",
    class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  archived: {
    label: "Archivé",
    class: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  trashed: {
    label: "Corbeille",
    class: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
}

const STATUS_FILTERS: { value: DocStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillons" },
  { value: "review", label: "En révision" },
  { value: "approved", label: "Approuvés" },
  { value: "archived", label: "Archivés" },
]

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  fiscal: Landmark,
  social: Users2,
  juridique: Scale,
  consulaire: Building2,
  coffre: Lock,
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  amber: "text-amber-400 bg-amber-500/15",
  blue: "text-blue-400 bg-blue-500/15",
  emerald: "text-emerald-400 bg-emerald-500/15",
  violet: "text-violet-400 bg-violet-500/15",
  rose: "text-rose-400 bg-rose-500/15",
}

const CONFIDENTIALITY_OPTIONS: {
  value: ConfidentialityLevel
  label: string
  color: string
}[] = [
  { value: "public", label: "Public", color: "text-emerald-400" },
  { value: "internal", label: "Interne", color: "text-blue-400" },
  { value: "confidential", label: "Confidentiel", color: "text-amber-400" },
  { value: "secret", label: "Secret", color: "text-red-400" },
]

const COUNTING_START_OPTIONS: {
  value: CountingStartEvent
  label: string
  description: string
}[] = [
  {
    value: "date_creation",
    label: "Date de création",
    description: "Début du comptage à la création du document",
  },
  {
    value: "date_cloture",
    label: "Date de clôture",
    description: "Début du comptage à la clôture du dossier",
  },
  {
    value: "date_tag",
    label: "Date d'étiquetage",
    description: "Début lors du premier étiquetage",
  },
  {
    value: "date_gel",
    label: "Date de gel",
    description: "Début lors du gel juridique",
  },
  {
    value: "date_manuelle",
    label: "Date manuelle",
    description: "Choisir une date personnalisée",
  },
]

const ARCHIVE_CATEGORIES: ArchiveCategoryOption[] = [
  {
    _id: "cat-1",
    name: "Fiscal",
    slug: "fiscal",
    color: "amber",
    icon: "Landmark",
    retentionYears: 10,
    description: "Documents comptables et fiscaux",
  },
  {
    _id: "cat-2",
    name: "Social",
    slug: "social",
    color: "blue",
    icon: "Users",
    retentionYears: 5,
    description: "Dossiers du personnel et social",
  },
  {
    _id: "cat-3",
    name: "Juridique",
    slug: "juridique",
    color: "emerald",
    icon: "Scale",
    retentionYears: 30,
    description: "Contrats, litiges et actes juridiques",
  },
  {
    _id: "cat-4",
    name: "Consulaire",
    slug: "consulaire",
    color: "violet",
    icon: "Building2",
    retentionYears: 50,
    description: "Documents consulaires et diplomatiques",
  },
  {
    _id: "cat-5",
    name: "Coffre-fort",
    slug: "coffre",
    color: "rose",
    icon: "Lock",
    retentionYears: 99,
    isPerpetual: true,
    description: "Conservation permanente",
  },
]

// ═══════════════════════════════════════════════════════════════
// MOCK DATA — Contexte diplomatique
// ═══════════════════════════════════════════════════════════════

const DEFAULT_FOLDERS: FolderItem[] = [
  {
    id: "__mes-documents",
    name: "Mes Documents",
    parentFolderId: null,
    tags: [],
    fileCount: 0,
    subfolderCount: 0,
    updatedAt: "",
    createdBy: "Système",
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
    createdBy: "Système",
    isSystem: true,
  },
  {
    id: "__poubelle",
    name: "Poubelle",
    parentFolderId: null,
    tags: [],
    fileCount: 0,
    subfolderCount: 0,
    updatedAt: "",
    createdBy: "Système",
    isSystem: true,
  },
  {
    id: "f-visas",
    name: "Visas & Laissez-passer",
    parentFolderId: null,
    tags: ["consulaire", "visa"],
    fileCount: 3,
    subfolderCount: 1,
    updatedAt: "25/03/2026",
    createdBy: "Ambassade",
    isSystem: false,
  },
  {
    id: "f-passeports",
    name: "Passeports",
    parentFolderId: null,
    tags: ["consulaire", "identité"],
    fileCount: 5,
    subfolderCount: 0,
    updatedAt: "24/03/2026",
    createdBy: "Consulat Paris",
    isSystem: false,
  },
  {
    id: "f-etat-civil",
    name: "État Civil",
    parentFolderId: null,
    tags: ["état-civil", "actes"],
    fileCount: 8,
    subfolderCount: 2,
    updatedAt: "23/03/2026",
    createdBy: "Consulat Paris",
    isSystem: false,
  },
  {
    id: "f-cooperation",
    name: "Coopération Internationale",
    parentFolderId: null,
    tags: ["diplomatie", "accords"],
    fileCount: 4,
    subfolderCount: 1,
    updatedAt: "22/03/2026",
    createdBy: "MAE Gabon",
    isSystem: false,
  },
  {
    id: "f-contentieux",
    name: "Contentieux Diplomatique",
    parentFolderId: null,
    tags: ["juridique", "contentieux"],
    fileCount: 2,
    subfolderCount: 0,
    updatedAt: "20/03/2026",
    createdBy: "Service Juridique",
    isSystem: false,
  },
  {
    id: "f-finances",
    name: "Finances & Budget",
    parentFolderId: null,
    tags: ["fiscal", "budget"],
    fileCount: 6,
    subfolderCount: 0,
    updatedAt: "21/03/2026",
    createdBy: "Trésorier",
    isSystem: false,
  },
  {
    id: "sf-visas-urgents",
    name: "Visas Urgents",
    parentFolderId: "f-visas",
    tags: ["urgent"],
    fileCount: 2,
    subfolderCount: 0,
    updatedAt: "25/03/2026",
    createdBy: "Consul",
    isSystem: false,
  },
  {
    id: "sf-naissances",
    name: "Actes de Naissance",
    parentFolderId: "f-etat-civil",
    tags: ["naissance"],
    fileCount: 4,
    subfolderCount: 0,
    updatedAt: "23/03/2026",
    createdBy: "Officier EC",
    isSystem: false,
  },
  {
    id: "sf-mariages",
    name: "Actes de Mariage",
    parentFolderId: "f-etat-civil",
    tags: ["mariage"],
    fileCount: 3,
    subfolderCount: 0,
    updatedAt: "22/03/2026",
    createdBy: "Officier EC",
    isSystem: false,
  },
  {
    id: "sf-accords",
    name: "Accords Bilatéraux",
    parentFolderId: "f-cooperation",
    tags: ["bilatéral"],
    fileCount: 2,
    subfolderCount: 0,
    updatedAt: "22/03/2026",
    createdBy: "Diplomate",
    isSystem: false,
  },
]

const MOCK_DOCUMENTS: DocItem[] = [
  {
    id: "doc-1",
    title: "Demande de visa diplomatique - M. NDONG",
    excerpt: "Demande de visa diplomatique pour mission officielle",
    author: "Agent MBAYE",
    authorInitials: "AM",
    updatedAt: "25/03/2026",
    updatedAtTs: 1774567200000,
    status: "review",
    tags: ["visa", "diplomatique"],
    version: 2,
    folderId: "f-visas",
    mimeType: "application/pdf",
  },
  {
    id: "doc-2",
    title: "Passeport de service - Dossier 2026-0142",
    excerpt: "Renouvellement passeport de service",
    author: "Agent ONDO",
    authorInitials: "AO",
    updatedAt: "24/03/2026",
    updatedAtTs: 1774480800000,
    status: "approved",
    tags: ["passeport", "service"],
    version: 3,
    folderId: "f-passeports",
  },
  {
    id: "doc-3",
    title: "Acte de naissance - Transcription consulaire",
    excerpt: "Transcription d'acte de naissance",
    author: "Officier BOUANGA",
    authorInitials: "OB",
    updatedAt: "23/03/2026",
    updatedAtTs: 1774394400000,
    status: "draft",
    tags: ["naissance", "transcription"],
    version: 1,
    folderId: "sf-naissances",
  },
  {
    id: "doc-4",
    title: "Convention bilatérale Gabon-France 2026",
    excerpt: "Projet de convention de coopération",
    author: "Ambassadeur MBOUMBA",
    authorInitials: "AM",
    updatedAt: "22/03/2026",
    updatedAtTs: 1774308000000,
    status: "review",
    tags: ["convention", "france", "coopération"],
    version: 4,
    folderId: "sf-accords",
    archiveCategorySlug: "juridique",
  },
  {
    id: "doc-5",
    title: "Budget prévisionnel Q2 2026",
    excerpt: "Budget du consulat pour le 2ème trimestre",
    author: "Trésorier ELLA",
    authorInitials: "TE",
    updatedAt: "21/03/2026",
    updatedAtTs: 1774221600000,
    status: "approved",
    tags: ["budget", "Q2"],
    version: 2,
    folderId: "f-finances",
    archiveCategorySlug: "fiscal",
  },
  {
    id: "doc-6",
    title: "Note verbale — Incident protocolaire",
    excerpt: "Note verbale suite à l'incident du 15 mars",
    author: "Consul NZOGHE",
    authorInitials: "CN",
    updatedAt: "20/03/2026",
    updatedAtTs: 1774135200000,
    status: "draft",
    tags: ["note-verbale", "protocole"],
    version: 1,
    folderId: "f-contentieux",
  },
  {
    id: "doc-7",
    title: "Acte de mariage — Dossier MOUSSAVOU/LECLERC",
    excerpt: "Célébration de mariage consulaire",
    author: "Officier BOUANGA",
    authorInitials: "OB",
    updatedAt: "22/03/2026",
    updatedAtTs: 1774308000000,
    status: "approved",
    tags: ["mariage", "consulaire"],
    version: 1,
    folderId: "sf-mariages",
  },
  {
    id: "doc-8",
    title: "Laissez-passer d'urgence — M. OBAME",
    excerpt: "Délivrance laissez-passer en urgence",
    author: "Agent MBAYE",
    authorInitials: "AM",
    updatedAt: "25/03/2026",
    updatedAtTs: 1774567200000,
    status: "approved",
    tags: ["laissez-passer", "urgence"],
    version: 1,
    folderId: "sf-visas-urgents",
  },
  {
    id: "doc-9",
    title: "Rapport annuel du Consulat 2025",
    excerpt: "Rapport d'activité annuel",
    author: "Consul NZOGHE",
    authorInitials: "CN",
    updatedAt: "20/03/2026",
    updatedAtTs: 1774135200000,
    status: "archived",
    tags: ["rapport", "annuel"],
    version: 5,
    folderId: "__mes-documents",
    archiveCategorySlug: "consulaire",
  },
  {
    id: "doc-10",
    title: "Brouillon — Circulaire interne",
    excerpt: "Circulaire sur les nouvelles procédures",
    author: "Agent ONDO",
    authorInitials: "AO",
    updatedAt: "26/03/2026",
    updatedAtTs: 1774653600000,
    status: "draft",
    tags: ["circulaire", "interne"],
    version: 1,
    folderId: "__brouillons",
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

const FOLDER_COLORS = {
  default: {
    back: "#f6c012",
    front: "#fbd87c",
    sheets: ["#ffeac5", "#fff7e6", "#ffffff"],
  },
  blue: {
    back: "#3b82f6",
    front: "#60a5fa",
    sheets: ["#dbeafe", "#eff6ff", "#ffffff"],
  },
  gray: {
    back: "#71717a",
    front: "#a1a1aa",
    sheets: ["#e4e4e7", "#f4f4f5", "#ffffff"],
  },
} as const

function DynamicFolderIcon({
  count,
  size = 64,
  hovered = false,
  className = "",
  colorScheme = "default",
}: {
  count: number
  size?: number
  className?: string
  hovered?: boolean
  colorScheme?: keyof typeof FOLDER_COLORS
}) {
  const sheets = Math.min(Math.max(count, 0), 3)
  const colors = FOLDER_COLORS[colorScheme]
  const sheetConfigs = [
    {
      x: 62,
      y: 148,
      w: 300,
      h: 200,
      rx: 15,
      rotate: -3,
      fill: colors.sheets[0],
      hoverY: -18,
    },
    {
      x: 42,
      y: 168,
      w: 300,
      h: 200,
      rx: 15,
      rotate: 0,
      fill: colors.sheets[1],
      hoverY: -14,
    },
    {
      x: 52,
      y: 158,
      w: 290,
      h: 195,
      rx: 15,
      rotate: 3,
      fill: colors.sheets[2],
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
        fill={colors.back}
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
        fill={colors.front}
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
  systemType,
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
  systemType?: "mes-documents" | "brouillons" | "poubelle"
}) {
  const [isHovered, setIsHovered] = useState(false)

  const folderColorScheme =
    systemType === "mes-documents"
      ? "blue"
      : systemType === "brouillons"
        ? "gray"
        : "default"

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
          {systemType === "poubelle" ? (
            <div className="flex h-24 w-24 items-center justify-center">
              <svg
                width="72"
                height="80"
                viewBox="0 0 72 80"
                fill="none"
                className={cn(
                  "drop-shadow-lg transition-transform",
                  isHovered && "scale-110"
                )}
              >
                <rect
                  x="10"
                  y="6"
                  width="52"
                  height="6"
                  rx="2"
                  fill={isHovered ? "#ef4444" : "#3a3a3a"}
                  className="transition-colors"
                />
                <rect
                  x="28"
                  y="2"
                  width="16"
                  height="6"
                  rx="2"
                  fill={isHovered ? "#dc2626" : "#2a2a2a"}
                  className="transition-colors"
                />
                <path
                  d="M14 16h44l-4 56a4 4 0 01-4 4H22a4 4 0 01-4-4L14 16z"
                  fill={isHovered ? "#fca5a5" : "#333333"}
                  className="transition-colors"
                />
                <line
                  x1="28"
                  y1="26"
                  x2="28"
                  y2="66"
                  stroke={isHovered ? "#ef4444" : "#252525"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-colors"
                />
                <line
                  x1="36"
                  y1="26"
                  x2="36"
                  y2="66"
                  stroke={isHovered ? "#ef4444" : "#252525"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-colors"
                />
                <line
                  x1="44"
                  y1="26"
                  x2="44"
                  y2="66"
                  stroke={isHovered ? "#ef4444" : "#252525"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-colors"
                />
              </svg>
            </div>
          ) : (
            <DynamicFolderIcon
              count={count + subfolderCount}
              size={96}
              hovered={isHovered}
              className="drop-shadow-lg"
              colorScheme={folderColorScheme}
            />
          )}
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
                <FileText className="h-2.5 w-2.5" />
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

/* ── VaultFileCard — document card with A4 preview ── */

function VaultFileCard({
  title,
  iconColor = "text-stone-600",
  author,
  authorInitials,
  date,
  statusBadge,
  version,
  contextMenu,
  badges,
  tags = [],
  retentionCategory,
  retentionColor,
  onClick,
  isSelected = false,
  layoutId,
}: {
  title: string
  iconColor?: string
  author?: string
  authorInitials?: string
  date?: string
  statusBadge?: React.ReactNode
  version?: number | string
  contextMenu?: React.ReactNode
  badges?: React.ReactNode
  tags?: string[]
  retentionCategory?: string
  retentionColor?: string
  onClick?: () => void
  isSelected?: boolean
  layoutId?: string
}) {
  const overlays = (
    <>
      <div className="absolute left-2 top-2 z-10 flex min-w-0 shrink items-center gap-1">{badges}</div>
      {retentionCategory ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <span
            className={cn(
              "pointer-events-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] leading-tight font-medium shadow-sm",
              retentionColor || "bg-cyan-500/10 text-cyan-700",
            )}
          >
            {retentionCategory}
          </span>
        </div>
      ) : null}
      <div
        className="pointer-events-auto absolute right-1.5 top-1.5 z-20 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu}
      </div>
    </>
  )
  return (
    <motion.div
      layoutId={layoutId}
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
            <FileText className={cn("opacity-60", iconColor)} style={{ width: "40mm", height: "40mm" }} />
            <div
              className="font-semibold"
              style={{ fontSize: "14pt", lineHeight: 1.25, wordBreak: "break-word", maxWidth: "140mm" }}
              title={title}
            >
              {title}
            </div>
          </div>
          <div className="flex w-full items-end justify-between">
            <div className="flex items-center gap-1">{statusBadge}</div>
            <div className="flex items-center gap-2" style={{ fontSize: "9pt", color: "#6B7280" }}>
              {version !== undefined && <span className="font-mono">v{version}</span>}
              {date && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {date}
                </span>
              )}
            </div>
          </div>
        </div>
      </DocumentSheet>
    </motion.div>
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

/* ── BreadcrumbPath ── */

function BreadcrumbPath({
  path,
  onNavigate,
  rootLabel = "Documents",
  rootIcon: RootIcon = FileText,
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
  onSavePolicy,
  onInfo,
  onManageAccess,
  onCreateSubfolder,
  onDelete,
  isSystem,
}: {
  itemId: string
  itemName: string
  itemType: "folder" | "document"
  onShare?: (id: string, type: string) => void
  onSavePolicy?: (id: string) => void
  onInfo?: (id: string) => void
  onManageAccess?: (id: string) => void
  onCreateSubfolder?: (id: string) => void
  onDelete?: (id: string) => void
  isSystem?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const menuH = 250 // hauteur estimée du menu
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < menuH && rect.top > menuH
      setPos({
        top: openUp ? rect.top - menuH : rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 220),
      })
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-foreground"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[9999] w-52 rounded-lg border border-border bg-popover py-1 shadow-xl"
              style={{ top: pos.top, left: pos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground/60">
                {itemType === "folder" ? "Dossier" : "Document"} — Actions
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
              {onSavePolicy && (
                <button
                  onClick={() => {
                    onSavePolicy(itemId)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  <Archive className="h-3.5 w-3.5 text-cyan-400" />
                  {itemType === "document"
                    ? "Archiver"
                    : "Politique d'archivage"}
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
              {itemType === "folder" && !isSystem && onCreateSubfolder && (
                <button
                  onClick={() => {
                    onCreateSubfolder(itemId)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
                  Créer sous-dossier
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
                  Gérer accès
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
          </>,
          document.body
        )}
    </div>
  )
}

/* ── RetentionCategoryBadge ── */

function RetentionCategoryBadge({ categorySlug }: { categorySlug?: string }) {
  if (!categorySlug) return null
  const cat = ARCHIVE_CATEGORIES.find((c) => c.slug === categorySlug)
  if (!cat) return null
  const Icon = CATEGORY_ICON_MAP[cat.slug] || Archive
  const colorClasses =
    CATEGORY_COLOR_MAP[cat.color] || "text-zinc-400 bg-zinc-500/15"
  return (
    <span
      className={cn(
        "inline-flex h-4 items-center gap-1 rounded-full border-transparent px-1.5 text-[9px] font-medium",
        colorClasses
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {cat.name}
    </span>
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
  ]
  if (!open) return null
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
    { value: "private", label: "Privé Restreint" },
    { value: "team", label: "Équipe (Interne)" },
    { value: "specific", label: "Accès Spécifique" },
  ]
  if (!open) return null
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
            Appliquer les accès
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── ArchivePolicyDialog ── */

function ArchivePolicyDialog({
  open,
  onClose,
  targetName,
  itemType,
  onArchive,
  isSubmitting,
}: {
  open: boolean
  onClose: () => void
  targetName: string
  itemType: "folder" | "document"
  onArchive?: (data: {
    categorySlug: string
    confidentiality: string
    countingStartEvent: string
  }) => void
  isSubmitting?: boolean
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [countingStart, setCountingStart] =
    useState<CountingStartEvent>("date_creation")
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [confidentiality, setConfidentiality] =
    useState<ConfidentialityLevel>("internal")
  const [inheritChildren, setInheritChildren] = useState(true)
  const [inheritDocuments, setInheritDocuments] = useState(true)

  const handleSubmit = () => {
    const selectedCat = ARCHIVE_CATEGORIES.find(
      (c) => c._id === selectedCategoryId
    )
    if (!selectedCat) {
      toast.error("Veuillez sélectionner une catégorie")
      return
    }
    if (onArchive) {
      onArchive({
        categorySlug: selectedCat.slug,
        confidentiality,
        countingStartEvent: countingStart,
      })
    } else {
      onClose()
    }
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border/50 bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/50 px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
              <Archive className="h-4 w-4 text-cyan-400" />
            </div>
            Politique d'archivage
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {itemType === "folder" ? (
              <Folder className="mr-1 inline h-3 w-3" />
            ) : (
              <FileText className="mr-1 inline h-3 w-3" />
            )}
            <span className="font-medium text-foreground/60">{targetName}</span>
            <span className="text-foreground/30">
              {" "}
              — configurez la rétention, le cycle de vie et la confidentialité
            </span>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Tag className="h-3 w-3 text-violet-400" />
                  Catégorie de rétention
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ARCHIVE_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICON_MAP[cat.slug] || Archive
                    const colorClasses =
                      CATEGORY_COLOR_MAP[cat.color] ||
                      "text-zinc-400 bg-zinc-500/15"
                    const isSelected = cat._id === selectedCategoryId
                    return (
                      <button
                        key={cat._id}
                        onClick={() => setSelectedCategoryId(cat._id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2 text-left transition-all",
                          isSelected
                            ? "border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/20"
                            : "border-border/50 bg-card hover:border-border"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded",
                            colorClasses.split(" ")[1]
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3 w-3",
                              colorClasses.split(" ")[0]
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs">{cat.name}</span>
                          <p className="text-[9px] text-muted-foreground">
                            {cat.isPerpetual
                              ? "Perpétuel"
                              : `${cat.retentionYears} ans`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <CalendarClock className="h-3 w-3 text-amber-400" />
                  Début du cycle de vie
                </p>
                <div className="space-y-1">
                  {COUNTING_START_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCountingStart(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-all",
                        countingStart === opt.value
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-border/50 bg-card hover:border-border"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
                          countingStart === opt.value
                            ? "border-amber-400"
                            : "border-muted-foreground/20"
                        )}
                      >
                        {countingStart === opt.value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium">{opt.label}</p>
                        <p className="text-[9px] leading-tight text-muted-foreground">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {countingStart === "date_manuelle" && (
                  <div className="mt-1 flex items-center gap-2 pl-6">
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="h-7 rounded-md border border-border bg-card px-2 text-xs"
                      aria-label="Date de comptage manuelle"
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Right Column */}
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Shield className="h-3 w-3 text-rose-400" />
                  Confidentialité
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONFIDENTIALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setConfidentiality(opt.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-[11px] font-medium transition-all",
                        confidentiality === opt.value
                          ? `border-border bg-muted ${opt.color}`
                          : "border-border/50 bg-card text-muted-foreground hover:border-border"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {itemType === "folder" && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <GitBranch className="h-3 w-3 text-teal-400" />
                    Héritage
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-2.5">
                      <div>
                        <p className="text-[11px] font-medium">Sous-dossiers</p>
                        <p className="text-[9px] text-muted-foreground">
                          Héritent de cette politique
                        </p>
                      </div>
                      <button
                        onClick={() => setInheritChildren(!inheritChildren)}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          inheritChildren
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        )}
                        aria-label="Héritage sous-dossiers"
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            inheritChildren
                              ? "translate-x-4"
                              : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-2.5">
                      <div>
                        <p className="text-[11px] font-medium">
                          Documents enfants
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          Héritent de la catégorie
                        </p>
                      </div>
                      <button
                        onClick={() => setInheritDocuments(!inheritDocuments)}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          inheritDocuments
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        )}
                        aria-label="Héritage documents enfants"
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            inheritDocuments
                              ? "translate-x-4"
                              : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-md bg-linear-to-r from-cyan-600 to-teal-500 px-3 py-1.5 text-xs text-white transition-colors hover:from-cyan-700 hover:to-teal-600 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            {isSubmitting
              ? "Archivage..."
              : itemType === "document"
                ? "Archiver le document"
                : "Enregistrer la politique"}
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
  onNavigateCorrespondance,
}: {
  open: boolean
  onClose: () => void
  item: {
    id: string
    name: string
    createdBy?: string
    status?: string
    tags?: string[]
    updatedAt?: string
    linkedCorrespondanceItemId?: string
    origin?: DocOrigin
  }
  itemType: "folder" | "document"
  onNavigateCorrespondance?: (itemId: string) => void
}) {
  if (!open) return null
  const statusLabel =
    item.status === "draft"
      ? "Brouillon"
      : item.status === "review"
        ? "En révision"
        : item.status === "approved"
          ? "Approuvé"
          : item.status === "archived"
            ? "Archivé"
            : "—"
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
              <FileText className="h-4 w-4 text-violet-400" />
            )}
            Informations
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          {/* ── Bandeau de provenance (Phase 3 — alignement iCorr) ── */}
          {itemType === "document" && item.origin?.type === "correspondance" && (
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Mail className="h-3 w-3" />
                Pièce d'un courrier
              </div>
              <div className="space-y-0.5 text-xs">
                {item.origin.correspondanceReference && (
                  <p className="font-mono text-[11px] text-foreground/90">
                    {item.origin.correspondanceReference}
                    {item.origin.correspondanceArrivalRef
                      ? ` (${item.origin.correspondanceArrivalRef})`
                      : ""}
                  </p>
                )}
                {(item.origin.senderName || item.origin.recipientName) && (
                  <p className="text-[11px] text-muted-foreground">
                    {item.origin.senderName ? `de ${item.origin.senderName}` : ""}
                    {item.origin.senderName && item.origin.recipientName ? " → " : ""}
                    {item.origin.recipientName ?? ""}
                  </p>
                )}
                {item.origin.classedAt && (
                  <p className="text-[10px] text-muted-foreground/70">
                    classé le{" "}
                    {new Date(item.origin.classedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {item.linkedCorrespondanceItemId && onNavigateCorrespondance && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateCorrespondance(item.linkedCorrespondanceItemId!)
                    onClose()
                  }}
                  className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Mail className="h-3 w-3" />
                  Ouvrir le courrier
                </button>
              )}
            </div>
          )}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                {itemType === "folder" ? (
                  <Folder className="h-3 w-3 text-violet-400" />
                ) : (
                  <FileText className="h-3 w-3 text-violet-400" />
                )}
                Nom
              </p>
            </div>
            <p className="truncate text-sm font-medium">{item.name}</p>
            <div className="flex items-center gap-3 pt-1">
              {item.status && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      item.status === "draft"
                        ? "bg-zinc-400"
                        : item.status === "review"
                          ? "bg-blue-400"
                          : item.status === "approved"
                            ? "bg-emerald-400"
                            : item.status === "archived"
                              ? "bg-amber-400"
                              : "bg-red-400"
                    )}
                  />
                  {statusLabel}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <User className="h-2.5 w-2.5" />
                {item.createdBy || "—"}
              </span>
            </div>
            <p className="pt-0.5 font-mono text-[9px] break-all text-muted-foreground/30">
              {item.id}
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              <Tag className="h-3 w-3 text-emerald-400" />
              Tags
            </p>
            {item.tags && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
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
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function IDocumentPage() {
  // ─── State ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all")
  type SourceFilter =
    | "all"
    | "correspondance"
    | "upload"
    | "inbound-email"
    | "scan"
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const { activeOrgId } = useOrg()
  const router = useRouter()
  const { hasMin: hasDocAccess } = useModuleAccess("documents")
  const canEditDocs = hasDocAccess("editor")
  const canAdminDocs = hasDocAccess("admin")
  const { canDo } = useCanDoTask(activeOrgId ?? undefined)
  const canManageTemplates = canDo("documents.manage_templates")
  const { hasCapability } = useOrgModules()
  const showArchive = hasCapability("documents", "archive")

  // Convex queries — données réelles
  const { data: rawDocuments = [] } = useAuthenticatedConvexQuery(
    api.functions.documentVault.getOrgVault,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  const pageEntities: PageEntity[] = (rawDocuments as any[])
    .slice(0, 30)
    .map((d: any) => ({
      id: d._id,
      type: "document",
      label: d.title ?? d.fileName ?? "Document sans titre",
      data: {
        status: d.status,
        confidentiality: d.confidentialityLevel,
        source: d.source,
        folderId: d.folderId,
        mimeType: d.mimeType,
        createdAt: d._creationTime,
      },
    }))
  const pageActions: PageAction[] = [
    {
      id: "idocument.set_search",
      label: "Rechercher dans le coffre",
      description: "Filtre les documents par titre. params.query (string).",
      params: { query: { type: "string" } },
    },
    {
      id: "idocument.set_status_filter",
      label: "Filtrer par statut",
      description:
        "Filtre la vue par statut de document. params.status ∈ ['all','draft','final','signed','archived'].",
      params: { status: { type: "string" } },
    },
    {
      id: "idocument.open_folder",
      label: "Ouvrir un dossier",
      description:
        "Navigue dans l'arborescence du coffre. params.folderId requis (ou null pour la racine).",
      params: { folderId: { type: "string" } },
    },
    {
      id: "idocument.set_view_mode",
      label: "Changer la vue",
      description:
        "Bascule entre la vue grille et la vue liste. params.mode ∈ ['grid','list'].",
      params: { mode: { type: "string" } },
    },
  ]
  usePageContext({
    module: "idocument",
    title: "iDocument",
    summary: `${(rawDocuments as any[]).length} document(s) dans le coffre.${search ? ` Recherche: "${search}".` : ""}${statusFilter !== "all" ? ` Statut: ${statusFilter}.` : ""}`,
    visibleEntities: pageEntities,
    availableActions: pageActions,
    scopedToolNames: [],
  })
  useRegisterPageAction("idocument.set_search", async (params) => {
    setSearch(String(params?.query ?? ""))
    return { success: true }
  })
  useRegisterPageAction("idocument.set_status_filter", async (params) => {
    const status = params?.status as string | undefined
    if (!status) throw new Error("status requis")
    setStatusFilter(status as DocStatus | "all")
    return { success: true }
  })
  useRegisterPageAction("idocument.open_folder", async (params) => {
    const folderId = params?.folderId
    setCurrentFolderId(folderId === null ? null : String(folderId ?? ""))
    return { success: true }
  })
  useRegisterPageAction("idocument.set_view_mode", async (params) => {
    const mode = params?.mode as string | undefined
    if (mode !== "grid" && mode !== "list") {
      throw new Error("mode must be 'grid' or 'list'")
    }
    setViewMode(mode as ViewMode)
    return { success: true }
  })

  // Upload mutation
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documentVault.generateOrgUploadUrl
  )
  const { mutateAsync: addToVault } = useConvexMutationQuery(
    api.functions.documentVault.addToOrgVault
  )
  const { mutateAsync: deleteDoc } = useConvexMutationQuery(
    api.functions.documentVault.deleteFromOrgVault
  )
  const { mutateAsync: createFolderMut } = useConvexMutationQuery(
    api.functions.documentVault.createFolder
  )
  const { mutateAsync: ensureSystemFoldersMut } = useConvexMutationQuery(
    api.functions.documentVault.ensureSystemFolders
  )

  // Archive mutations
  const { mutateAsync: archiveDocMut } = useConvexMutationQuery(
    api.functions.archive.archiveDocument
  )
  const { mutateAsync: setFolderPolicyMut } = useConvexMutationQuery(
    api.functions.archive.setFolderArchivePolicy
  )

  // Trash mutations
  const { mutateAsync: softDeleteDocMut } = useConvexMutationQuery(
    api.functions.documentVault.softDeleteDocument
  )
  const { mutateAsync: softDeleteFolderMut } = useConvexMutationQuery(
    api.functions.documentVault.softDeleteFolder
  )
  const { mutateAsync: restoreDocMut } = useConvexMutationQuery(
    api.functions.documentVault.restoreFromTrash
  )
  const { mutateAsync: restoreFolderMut } = useConvexMutationQuery(
    api.functions.documentVault.restoreFolderFromTrash
  )
  const { mutateAsync: permanentDeleteDocMut } = useConvexMutationQuery(
    api.functions.documentVault.permanentlyDeleteFromTrash
  )
  const { mutateAsync: permanentDeleteFolderMut } = useConvexMutationQuery(
    api.functions.documentVault.permanentlyDeleteFolderFromTrash
  )
  const { mutateAsync: emptyTrashMut } = useConvexMutationQuery(
    api.functions.documentVault.emptyTrash
  )

  // Trash query
  const { data: trashData } = useAuthenticatedConvexQuery(
    api.functions.documentVault.getTrashItems,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  // Super admin check
  const { data: me } = useAuthenticatedConvexQuery(
    api.functions.users.getMe,
    {}
  )
  const isSuperAdmin = Boolean(me?.isSuperadmin)

  // Mapper les données Convex → types UI
  const documents = useMemo(
    (): DocItem[] =>
      (rawDocuments as any[]).map((doc) => ({
        id: doc._id,
        title: doc.label ?? doc.files?.[0]?.filename ?? "Document",
        excerpt: "",
        author: "",
        updatedAt: doc.updatedAt
          ? new Date(doc.updatedAt).toLocaleDateString("fr-FR")
          : "",
        updatedAtTs: doc.updatedAt ?? doc._creationTime,
        status: (doc.status === "validated"
          ? "approved"
          : doc.status === "pending"
            ? "draft"
            : doc.status) as DocStatus,
        tags: doc.tags ?? [],
        version: 1,
        folderId: doc.folderId ?? null,
        archiveCategorySlug: doc.category ?? null,
        mimeType: doc.files?.[0]?.mimeType ?? "application/pdf",
        url: doc.files?.[0]?.url,
        linkedCorrespondanceItemId: doc.linkedCorrespondanceItemId ?? undefined,
        origin: doc.origin ?? undefined,
      })),
    [rawDocuments]
  )

  // Dossiers réels depuis Convex (avec fallback mock pendant le chargement)
  const { data: dbFolders } = useAuthenticatedConvexQuery(
    api.functions.documentVault.getOrgFolders,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  )

  // Seed auto : créer les dossiers système si la table est vide
  const [seedDone, setSeedDone] = useState(false)
  useEffect(() => {
    if (activeOrgId && dbFolders && dbFolders.length === 0 && !seedDone) {
      setSeedDone(true)
      ensureSystemFoldersMut({ orgId: activeOrgId }).catch(() => {})
    }
  }, [activeOrgId, dbFolders, seedDone, ensureSystemFoldersMut])
  const folders = useMemo((): FolderItem[] => {
    if (!dbFolders || dbFolders.length === 0) return [...DEFAULT_FOLDERS]
    return dbFolders.map((f) => ({
      id: f._id,
      name: f.name,
      parentFolderId: (f.parentFolderId as string) ?? null,
      tags: f.tags,
      fileCount: f.documentCount ?? 0,
      subfolderCount: f.subfolderCount ?? 0,
      updatedAt: f.updatedAt
        ? new Date(f.updatedAt).toLocaleDateString("fr-FR")
        : "",
      createdBy: f.isSystem ? "Système" : "Agent",
      isSystem: f.isSystem,
    }))
  }, [dbFolders])

  // Dialog states
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareTargetName, setShareTargetName] = useState("")
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [manageAccessTargetName, setManageAccessTargetName] = useState("")
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [policyTargetName, setPolicyTargetName] = useState("")
  const [policyItemType, setPolicyItemType] = useState<"folder" | "document">(
    "folder"
  )
  const [policyTargetId, setPolicyTargetId] = useState<string>("")
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [infoItem, setInfoItem] = useState<any>(null)
  const [infoItemType, setInfoItemType] = useState<"folder" | "document">(
    "folder"
  )
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedDocViewer, setSelectedDocViewer] = useState<ViewerDoc | null>(
    null
  )
  const [trashConfirm, setTrashConfirm] = useState<{
    type: "soft_delete" | "permanent_delete" | "empty_trash"
    itemType: "folder" | "document"
    itemId: string
    itemName: string
  } | null>(null)

  // ─── Detecter le dossier Poubelle ───────────────────────
  const poubelleFolder = useMemo(
    () => folders.find((f) => f.name === "Poubelle" && f.isSystem),
    [folders]
  )
  const isInPoubelle = currentFolderId === poubelleFolder?.id

  // ─── Trash handlers ─────────────────────────────────────
  const handleSoftDeleteDoc = useCallback(
    (docId: string) => {
      const doc = documents.find((d) => d.id === docId)
      setTrashConfirm({
        type: "soft_delete",
        itemType: "document",
        itemId: docId,
        itemName: doc?.title ?? "Document",
      })
    },
    [documents]
  )

  const handleSoftDeleteFolder = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId)
      setTrashConfirm({
        type: "soft_delete",
        itemType: "folder",
        itemId: folderId,
        itemName: folder?.name ?? "Dossier",
      })
    },
    [folders]
  )

  const handleConfirmTrashAction = useCallback(async () => {
    if (!trashConfirm) return
    try {
      if (trashConfirm.type === "soft_delete") {
        if (trashConfirm.itemType === "document") {
          await softDeleteDocMut({
            documentId: trashConfirm.itemId as Id<"documents">,
          })
          toast.success("Document deplace dans la corbeille")
        } else {
          await softDeleteFolderMut({
            folderId: trashConfirm.itemId as Id<"documentFolders">,
          })
          toast.success("Dossier et contenu deplaces dans la corbeille")
        }
      } else if (trashConfirm.type === "permanent_delete") {
        if (trashConfirm.itemType === "document") {
          await permanentDeleteDocMut({
            documentId: trashConfirm.itemId as Id<"documents">,
          })
          toast.success("Document supprime definitivement")
        } else {
          await permanentDeleteFolderMut({
            folderId: trashConfirm.itemId as Id<"documentFolders">,
          })
          toast.success("Dossier supprime definitivement")
        }
      } else if (trashConfirm.type === "empty_trash" && activeOrgId) {
        const result = await emptyTrashMut({ orgId: activeOrgId })
        toast.success(
          `Corbeille videe (${result.deletedDocs} documents, ${result.deletedFolders} dossiers)`
        )
      }
    } catch (e: any) {
      const msg = e?.data ?? e?.message ?? "Erreur"
      toast.error(typeof msg === "string" ? msg : "Une erreur est survenue")
    }
    setTrashConfirm(null)
  }, [
    trashConfirm,
    softDeleteDocMut,
    softDeleteFolderMut,
    permanentDeleteDocMut,
    permanentDeleteFolderMut,
    emptyTrashMut,
    activeOrgId,
  ])

  const handleRestoreDoc = useCallback(
    async (docId: string) => {
      try {
        await restoreDocMut({ documentId: docId as Id<"documents"> })
        toast.success("Document restaure")
      } catch (e: any) {
        toast.error(e?.data ?? "Erreur lors de la restauration")
      }
    },
    [restoreDocMut]
  )

  const handleRestoreFolder = useCallback(
    async (folderId: string) => {
      try {
        await restoreFolderMut({ folderId: folderId as Id<"documentFolders"> })
        toast.success("Dossier restaure")
      } catch (e: any) {
        toast.error(e?.data ?? "Erreur lors de la restauration")
      }
    },
    [restoreFolderMut]
  )

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
      fileCount: documents.filter((d) => d.folderId === f.id).length,
      subfolderCount: folders.filter((sf) => sf.parentFolderId === f.id).length,
    }))
  }, [currentFolders, documents, folders])

  // ─── Filtered documents at current level ────────────────
  const currentFiles = useMemo(() => {
    if (currentFolderId === null) return []
    let items = documents.filter((d) => d.folderId === currentFolderId)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.author.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== "all") {
      items = items.filter((d) => d.status === statusFilter)
    }
    if (sourceFilter !== "all") {
      items = items.filter((d) => d.origin?.type === sourceFilter)
    }
    items.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case "name":
          cmp = a.title.localeCompare(b.title, "fr")
          break
        case "author":
          cmp = a.author.localeCompare(b.author, "fr")
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
  }, [documents, currentFolderId, search, statusFilter, sourceFilter, sortBy, sortDir])

  // ─── Status counts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length }
    for (const doc of documents) {
      counts[doc.status] = (counts[doc.status] || 0) + 1
    }
    return counts
  }, [documents])

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
          : documents.find((d) => d.id === id)?.title
      setShareTargetName(name || "")
      setShareDialogOpen(true)
    },
    [folders, documents]
  )

  const handleManageAccess = useCallback(
    (id: string) => {
      const name = folders.find((f) => f.id === id)?.name || ""
      setManageAccessTargetName(name)
      setManageAccessOpen(true)
    },
    [folders]
  )

  const handleOpenPolicy = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id)
      const doc = documents.find((d) => d.id === id)
      setPolicyTargetName(folder?.name || doc?.title || "")
      setPolicyItemType(folder ? "folder" : "document")
      setPolicyTargetId(id)
      setPolicyDialogOpen(true)
    },
    [folders, documents]
  )

  const handleOpenInfo = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id)
      const doc = documents.find((d) => d.id === id)
      if (folder) {
        setInfoItem({
          id: folder.id,
          name: folder.name,
          createdBy: folder.createdBy,
          tags: folder.tags,
          updatedAt: folder.updatedAt,
        })
        setInfoItemType("folder")
      } else if (doc) {
        setInfoItem({
          id: doc.id,
          name: doc.title,
          createdBy: doc.author,
          status: doc.status,
          tags: doc.tags,
          updatedAt: doc.updatedAt,
          linkedCorrespondanceItemId: doc.linkedCorrespondanceItemId,
          origin: doc.origin,
        })
        setInfoItemType("document")
      }
      setInfoDialogOpen(true)
    },
    [folders, documents]
  )

  const hasActiveFilters =
    statusFilter !== "all" || sourceFilter !== "all" || search

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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">iDocument</h1>
            <p className="text-sm text-muted-foreground">
              {documents.length} documents ·{" "}
              {folders.filter((f) => !f.isSystem).length} dossiers
            </p>
          </div>
        </div>
        {canEditDocs && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nouveau dossier
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-linear-to-r from-violet-600 to-indigo-500 px-3 py-1.5 text-xs text-white transition-colors hover:from-violet-700 hover:to-indigo-600">
              <Plus className="h-3.5 w-3.5" />
              Nouveau document
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Module Tabs: iDocument | iArchive | Modèles de documents ── */}
      <motion.div
        variants={fadeUp}
        className="flex items-center border-b border-border/50"
      >
        <div className="flex items-center">
          {/* iDocument — onglet actif */}
          <span className="-mb-px flex cursor-default items-center gap-1.5 border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary">
            <FileText className="h-3.5 w-3.5" />
            iDocument
          </span>
          {/* iArchive — onglet conditionné par capability "archive" */}
          {showArchive && (
            <Link
              href="/iarchive"
              id="idocument-tab-iarchive"
              className="-mb-px ml-1 flex items-center gap-1.5 rounded-t-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
            >
              <Archive className="h-3.5 w-3.5 text-violet-400" />
              iArchive
            </Link>
          )}
          {/* Modèles de documents — gated documents.manage_templates */}
          {canManageTemplates ? (
            <Link
              href="/itemplates"
              id="idocument-tab-itemplates"
              className="-mb-px ml-1 flex items-center gap-1.5 rounded-t-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
            >
              <Files className="h-3.5 w-3.5 text-primary" />
              Modèles de documents
            </Link>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-1.5 pb-0.5">
          <span className="rounded-full border border-border/20 bg-muted/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground/40">
            iBureau
          </span>
        </div>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-[360px] min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Rechercher dans les documents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-border/50 bg-muted/50 px-3 pl-8 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
              />
            </div>
            {search && (
              <>
                <div className="hidden h-6 w-px bg-border/50 sm:block" />
                <button
                  className="flex h-7 items-center gap-1.5 px-2 text-[11px] text-red-400 hover:text-red-300"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" /> Effacer
                </button>
              </>
            )}
            <div className="hidden h-6 w-px bg-border/50 sm:block" />
            <div className="flex items-center gap-1">
              {(
                [
                  { value: "all", label: "Toutes sources" },
                  { value: "correspondance", label: "Courrier" },
                  { value: "upload", label: "Upload" },
                  { value: "inbound-email", label: "Email entrant" },
                  { value: "scan", label: "Scan" },
                ] as { value: SourceFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSourceFilter(f.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    sourceFilter === f.value
                      ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
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
        rootLabel="Documents"
        rootIcon={FileText}
      />

      {/* ── Vue Poubelle ── */}
      {isInPoubelle && trashData ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Toolbar Poubelle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium">
                {trashData.totalCount} element
                {trashData.totalCount > 1 ? "s" : ""} dans la corbeille
              </span>
            </div>
            {isSuperAdmin && trashData.totalCount > 0 && (
              <button
                onClick={() =>
                  setTrashConfirm({
                    type: "empty_trash",
                    itemType: "document",
                    itemId: "",
                    itemName: "",
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Vider la corbeille
              </button>
            )}
          </div>

          {/* Dossiers en corbeille */}
          {trashData.folders.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                Dossiers supprimes
              </p>
              <div className="space-y-1">
                {trashData.folders.map((folder: any) => (
                  <div
                    key={folder._id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Folder className="h-4 w-4 text-amber-400/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {folder.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {folder.documentCount} doc
                        {folder.documentCount > 1 ? "s" : ""} · Supprime le{" "}
                        {new Date(folder.deletedAt).toLocaleDateString("fr-FR")}
                        {folder.deletedByName && (
                          <span> par {folder.deletedByName}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestoreFolder(folder._id)}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-emerald-400 transition-colors hover:bg-emerald-500/10"
                        title="Restaurer"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Restaurer
                      </button>
                      <button
                        onClick={() =>
                          setTrashConfirm({
                            type: "permanent_delete",
                            itemType: "folder",
                            itemId: folder._id,
                            itemName: folder.name,
                          })
                        }
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
                        title="Supprimer definitivement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents en corbeille */}
          {trashData.documents.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                Documents supprimes
              </p>
              <div className="space-y-1">
                {trashData.documents.map((doc: any) => (
                  <div
                    key={doc._id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                      <FileText className="h-4 w-4 text-violet-400/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {doc.label ?? doc.files?.[0]?.filename ?? "Document"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Supprime le{" "}
                        {new Date(doc.deletedAt).toLocaleDateString("fr-FR")}
                        {doc.deletedByName && (
                          <span> par {doc.deletedByName}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestoreDoc(doc._id)}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-emerald-400 transition-colors hover:bg-emerald-500/10"
                        title="Restaurer"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Restaurer
                      </button>
                      <button
                        onClick={() =>
                          setTrashConfirm({
                            type: "permanent_delete",
                            itemType: "document",
                            itemId: doc._id,
                            itemName:
                              doc.label ??
                              doc.files?.[0]?.filename ??
                              "Document",
                          })
                        }
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
                        title="Supprimer definitivement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty trash state */}
          {trashData.totalCount === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-500/10">
                <Trash2 className="h-8 w-8 text-zinc-400/40" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">Corbeille vide</h3>
              <p className="text-sm text-muted-foreground">
                Aucun element dans la corbeille.
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <>
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
                          systemType={
                            folder.name === "Mes Documents"
                              ? "mes-documents"
                              : folder.name === "Brouillons"
                                ? "brouillons"
                                : folder.name === "Poubelle"
                                  ? "poubelle"
                                  : undefined
                          }
                          contextMenu={
                            <FolderContextMenu
                              itemId={folder.id}
                              itemName={folder.name}
                              itemType="folder"
                              onShare={handleShare}
                              onSavePolicy={handleOpenPolicy}
                              onInfo={handleOpenInfo}
                              onManageAccess={handleManageAccess}
                              onCreateSubfolder={(id) => {
                                setCurrentFolderId(id)
                                setShowNewFolderDialog(true)
                              }}
                              onDelete={handleSoftDeleteFolder}
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
                            folder.tags.filter(
                              (t) => !t.startsWith("diplomatic:")
                            ).length > 0
                              ? folder.tags
                                  .filter((t) => !t.startsWith("diplomatic:"))
                                  .slice(0, 2)
                                  .map((t) => (
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
                {/* Files */}
                {currentFiles.length > 0 && (
                  <div>
                    <p className="mb-3 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                      Documents
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {currentFiles.map((doc) => {
                        const st = STATUS_CFG[doc.status]
                        const cat = ARCHIVE_CATEGORIES.find(
                          (c) => c.slug === doc.archiveCategorySlug
                        )
                        return (
                          <VaultFileCard
                            key={doc.id}
                            layoutId={`doc-card-${doc.id}`}
                            title={doc.title}
                            author={doc.author}
                            authorInitials={doc.authorInitials}
                            date={doc.updatedAt}
                            version={doc.version}
                            retentionCategory={cat?.name}
                            retentionColor={
                              cat ? CATEGORY_COLOR_MAP[cat.color] : undefined
                            }
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
                            onClick={() =>
                              setSelectedDocViewer({
                                id: doc.id,
                                title: doc.title,
                                url: doc.url ?? undefined,
                                mimeType: doc.mimeType,
                              })
                            }
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
                        Ce dossier ne contient aucun document. Créez un nouveau
                        document ou importez des fichiers.
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
                      className="col-span-5 flex cursor-pointer items-center gap-1 hover:text-foreground"
                      onClick={() => {
                        setSortBy("name")
                        setSortDir(
                          sortBy === "name" && sortDir === "asc"
                            ? "desc"
                            : "asc"
                        )
                      }}
                    >
                      Nom {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}
                    </div>
                    <div className="col-span-2">Auteur</div>
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
                      Modifié{" "}
                      {sortBy === "date" && (sortDir === "asc" ? "↑" : "↓")}
                    </div>
                    <div className="col-span-1">Statut</div>
                    <div className="col-span-2">Tags</div>
                  </div>
                  {/* Folders */}
                  {foldersWithCounts.map((folder) => (
                    <div
                      key={folder.id}
                      className="group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                      onClick={() => handleOpenFolder(folder.id)}
                    >
                      <div className="col-span-5 flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
                          <Folder className="h-3 w-3 text-amber-400" />
                        </div>
                        <span className="truncate text-xs font-medium">
                          {folder.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">
                          {folder.fileCount} fichiers
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                        {folder.createdBy}
                      </div>
                      <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {folder.updatedAt}
                      </div>
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
                  ))}
                  {/* Files */}
                  {currentFiles.map((doc) => {
                    const st = STATUS_CFG[doc.status]
                    return (
                      <div
                        key={doc.id}
                        className="group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                        onClick={() => handleOpenInfo(doc.id)}
                      >
                        <div className="col-span-5 flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                            <FileText className="h-3 w-3 text-violet-400" />
                          </div>
                          <span className="truncate text-xs font-medium">
                            {doc.title}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/15">
                            <span className="text-[8px] font-bold text-violet-300">
                              {doc.authorInitials}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {doc.author}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {doc.updatedAt}
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
                        <div className="col-span-2 flex flex-wrap items-center gap-1">
                          {doc.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                          {doc.tags.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{doc.tags.length - 2}
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
                        {currentFiles.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleOpenInfo(doc.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                            <span className="truncate">{doc.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Preview pane */}
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setTrashConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border/50 bg-popover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border/50 px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Trash2 className="h-4 w-4 text-red-400" />
                {trashConfirm.type === "soft_delete"
                  ? "Deplacer vers la corbeille"
                  : trashConfirm.type === "empty_trash"
                    ? "Vider la corbeille"
                    : "Suppression definitive"}
              </div>
            </div>
            <div className="p-5">
              {trashConfirm.type === "soft_delete" ? (
                <p className="text-sm text-muted-foreground">
                  Voulez-vous deplacer{" "}
                  <span className="font-medium text-foreground">
                    {trashConfirm.itemName}
                  </span>{" "}
                  dans la corbeille ?
                </p>
              ) : trashConfirm.type === "empty_trash" ? (
                <p className="text-sm text-muted-foreground">
                  Voulez-vous supprimer definitivement{" "}
                  <span className="font-medium text-red-400">
                    tous les elements
                  </span>{" "}
                  de la corbeille ? Cette action est irreversible.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Voulez-vous supprimer definitivement{" "}
                  <span className="font-medium text-red-400">
                    {trashConfirm.itemName}
                  </span>{" "}
                  ? Cette action est irreversible.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
              <button
                onClick={() => setTrashConfirm(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmTrashAction}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs text-white transition-colors",
                  trashConfirm.type === "soft_delete"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                {trashConfirm.type === "soft_delete" ? "Deplacer" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label className="text-xs font-medium">Nom du dossier *</label>
                <input
                  placeholder="Ex: Visas 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFolderName.trim())
                      setShowNewFolderDialog(false)
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
                onClick={async () => {
                  if (!activeOrgId || !newFolderName.trim()) return
                  try {
                    await createFolderMut({
                      orgId: activeOrgId,
                      name: newFolderName.trim(),
                      parentFolderId: currentFolderId
                        ? (currentFolderId as any)
                        : undefined,
                    })
                    toast.success(`Dossier "${newFolderName.trim()}" créé`)
                    setNewFolderName("")
                    setShowNewFolderDialog(false)
                  } catch (e) {
                    toast.error("Erreur lors de la création du dossier")
                  }
                }}
                disabled={!newFolderName.trim()}
                className="flex items-center gap-1.5 rounded-md bg-linear-to-r from-violet-600 to-indigo-500 px-3 py-1.5 text-xs text-white transition-colors disabled:opacity-50"
              >
                <FolderPlus className="h-4 w-4" />
                Créer
              </button>
            </div>
          </div>
        </div>
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
      <ArchivePolicyDialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        targetName={policyTargetName}
        itemType={policyItemType}
        onArchive={async (data) => {
          try {
            if (policyItemType === "document" && policyTargetId) {
              await archiveDocMut({
                documentId: policyTargetId as Id<"documents">,
                categorySlug: data.categorySlug,
                confidentiality: data.confidentiality,
                countingStartEvent: data.countingStartEvent,
              })
              toast.success("Document archivé avec succès")
            } else if (policyItemType === "folder" && policyTargetId) {
              await setFolderPolicyMut({
                folderId: policyTargetId as Id<"documentFolders">,
                archiveCategorySlug: data.categorySlug,
                confidentiality: data.confidentiality,
                countingStartEvent: data.countingStartEvent,
              })
              toast.success("Politique d'archivage enregistrée")
            }
            setPolicyDialogOpen(false)
          } catch {
            toast.error("Erreur lors de l'opération d'archivage")
          }
        }}
      />
      <InfoDialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        item={infoItem || { id: "", name: "" }}
        itemType={infoItemType}
        onNavigateCorrespondance={(itemId) =>
          router.push(`/icorrespondance?tab=correspondance&id=${itemId}`)
        }
      />
      <DocumentViewerModal
        isOpen={!!selectedDocViewer}
        onClose={() => setSelectedDocViewer(null)}
        document={selectedDocViewer}
      />
    </motion.div>
  )
}
