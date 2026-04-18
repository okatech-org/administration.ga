"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Search,
  Shield,
  Clock,
  AlertTriangle,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  X,
  Download,
  Eye,
  MoreHorizontal,
  Info,
  Trash2,
  User,
  LayoutGrid,
  List,
  Columns3,
  ChevronRight,
  Plus,
  ScrollText,
  Flag,
  Home,
  Briefcase,
  Wallet,
  Award,
  Stamp,
  Scale,
  FileCheck,
  Building2,
  Car,
  GraduationCap,
  Heart,
  Receipt,
  ClipboardList,
  Languages,
  UploadCloud,
  FileIcon,
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { format, differenceInDays, isPast, isToday } from "date-fns"
import { useConvex } from "convex/react"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  type DetailedDocumentType,
  DOCUMENT_TYPES_BY_CATEGORY,
  DocumentTypeCategory,
} from "@convex/lib/constants"
import { DocumentSheet } from "@workspace/ui/components/document-sheet"

import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal"
import { ConsulateIssuedDocumentsSection } from "@/components/idocument/ConsulateIssuedDocumentsSection"
import { DynamicFolderIcon } from "@/components/icons/DynamicFolderIcon"
import { PageHeader } from "@/components/my-space/page-header"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

// Route removed — Next.js App Router

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ViewMode = "grid" | "list" | "column"

type VaultFile = {
  storageId: Id<"_storage">
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: number
}

type VaultDocument = {
  _id: Id<"documents">
  files: VaultFile[]
  documentType?: string
  category?: DocumentTypeCategory
  label?: string
  expiresAt?: number
  status?: string
  _creationTime: number
  updatedAt?: number
}

type SystemFolderId = "__all" | "__trash" | "__vault"
type FolderId = SystemFolderId | SmartFolderId | DocumentTypeCategory

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

type StatusCfg = Record<string, { label: string; class: string; dot: string }>

function getStatusCfg(t: (key: string) => string): StatusCfg {
  return {
    pending: {
      label: t("idocument.status.pending"),
      class: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      dot: "bg-amber-500",
    },
    validated: {
      label: t("idocument.status.validated"),
      class: "bg-green-500/10 text-green-600 border-green-500/20",
      dot: "bg-green-500",
    },
    rejected: {
      label: t("idocument.status.rejected"),
      class: "bg-red-500/10 text-red-600 border-red-500/20",
      dot: "bg-red-500",
    },
    expired: {
      label: t("idocument.status.expired"),
      class: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
      dot: "bg-zinc-500",
    },
    expiring: {
      label: t("idocument.status.expiring"),
      class: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      dot: "bg-orange-500",
    },
  }
}

// ─── 2 Dossiers métier consulaire ────────────────────────────
// Les documents nécessaires aux démarches consulaires regroupés en 2 dossiers

type SmartFolderId = "identity_civil" | "official_docs"

interface SmartFolder {
  id: SmartFolderId
  name: string
  description: string
  icon: React.ElementType
  color: string
  iconColor: string
  categories: DocumentTypeCategory[]
}

function getSmartFolders(t: (key: string) => string): SmartFolder[] {
  return [
    {
      id: "identity_civil",
      name: t("idocument.folders.identityCivil"),
      description: t("idocument.folders.identityCivilDesc"),
      icon: User,
      color: "text-blue-400",
      iconColor: "text-violet-600",
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
      name: t("idocument.folders.officialDocs"),
      description: t("idocument.folders.officialDocsDesc"),
      icon: Stamp,
      color: "text-violet-400",
      iconColor: "text-orange-600",
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
  ]
}

// Legacy mapping for individual category display on document cards
type CategoryConfig = Record<
  string,
  { name: string; icon: React.ElementType; color: string; iconColor: string }
>

function getCategoryConfig(t: (key: string) => string): CategoryConfig {
  return {
    [DocumentTypeCategory.Identity]: {
      name: t("idocument.categories.identity"),
      icon: User,
      color: "text-blue-400",
      iconColor: "text-violet-600",
    },
    [DocumentTypeCategory.CivilStatus]: {
      name: t("idocument.categories.civilStatus"),
      icon: ScrollText,
      color: "text-purple-400",
      iconColor: "text-fuchsia-600",
    },
    [DocumentTypeCategory.Nationality]: {
      name: t("idocument.categories.nationality"),
      icon: Flag,
      color: "text-green-400",
      iconColor: "text-cyan-600",
    },
    [DocumentTypeCategory.Residence]: {
      name: t("idocument.categories.residence"),
      icon: Home,
      color: "text-amber-400",
      iconColor: "text-emerald-600",
    },
    [DocumentTypeCategory.Employment]: {
      name: t("idocument.categories.employment"),
      icon: Briefcase,
      color: "text-indigo-400",
      iconColor: "text-sky-600",
    },
    [DocumentTypeCategory.Income]: {
      name: t("idocument.categories.income"),
      icon: Wallet,
      color: "text-emerald-400",
      iconColor: "text-green-600",
    },
    [DocumentTypeCategory.Certificates]: {
      name: t("idocument.categories.certificates"),
      icon: Award,
      color: "text-cyan-400",
      iconColor: "text-amber-600",
    },
    [DocumentTypeCategory.OfficialCertificates]: {
      name: t("idocument.categories.officialCertificates"),
      icon: Stamp,
      color: "text-violet-400",
      iconColor: "text-orange-600",
    },
    [DocumentTypeCategory.Justice]: {
      name: t("idocument.categories.justice"),
      icon: Scale,
      color: "text-red-400",
      iconColor: "text-red-600",
    },
    [DocumentTypeCategory.AdministrativeDecisions]: {
      name: t("idocument.categories.administrativeDecisions"),
      icon: FileCheck,
      color: "text-orange-400",
      iconColor: "text-purple-600",
    },
    [DocumentTypeCategory.Housing]: {
      name: t("idocument.categories.housing"),
      icon: Building2,
      color: "text-teal-400",
      iconColor: "text-teal-600",
    },
    [DocumentTypeCategory.Vehicle]: {
      name: t("idocument.categories.vehicle"),
      icon: Car,
      color: "text-slate-400",
      iconColor: "text-slate-600",
    },
    [DocumentTypeCategory.Education]: {
      name: t("idocument.categories.education"),
      icon: GraduationCap,
      color: "text-pink-400",
      iconColor: "text-amber-600",
    },
    [DocumentTypeCategory.LanguageIntegration]: {
      name: t("idocument.categories.languageIntegration"),
      icon: Languages,
      color: "text-blue-400",
      iconColor: "text-blue-600",
    },
    [DocumentTypeCategory.Health]: {
      name: t("idocument.categories.health"),
      icon: Heart,
      color: "text-rose-400",
      iconColor: "text-rose-600",
    },
    [DocumentTypeCategory.Taxation]: {
      name: t("idocument.categories.taxation"),
      icon: Receipt,
      color: "text-yellow-400",
      iconColor: "text-lime-600",
    },
    [DocumentTypeCategory.Forms]: {
      name: t("idocument.categories.forms"),
      icon: ClipboardList,
      color: "text-zinc-400",
      iconColor: "text-indigo-600",
    },
    [DocumentTypeCategory.Other]: {
      name: t("idocument.categories.other"),
      icon: FileText,
      color: "text-gray-400",
      iconColor: "text-stone-600",
    },
  }
}

interface SystemFolder {
  id: SystemFolderId
  name: string
  icon: React.ElementType
  isSystem: true
}

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
// UTILITY
// ═══════════════════════════════════════════════════════════════

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function formatDate(ts?: number) {
  if (!ts) return "—"
  return format(ts, "dd/MM/yyyy")
}

function getCategoryLabel(cat: string | undefined, categoryConfig: CategoryConfig, fallback: string): string {
  if (!cat) return fallback
  return categoryConfig[cat]?.name ?? cat
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/* ── VaultFolderCard — folder card with yellow icon ── */

function VaultFolderCard({
  label,
  count,
  icon: CustomIcon,
  iconColor,
  onClick,
  className,
  isSelected = false,
}: {
  label: string
  count: number
  icon?: React.ElementType
  iconColor?: string
  onClick?: () => void
  className?: string
  isSelected?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-center rounded-2xl p-2",
        isSelected && "bg-violet-500/10 ring-2 ring-violet-500",
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
        {CustomIcon ? (
          <div className="relative mt-1 flex w-full justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
              <CustomIcon
                className={cn("h-8 w-8", iconColor || "text-muted-foreground")}
              />
            </div>
            {count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
              >
                {count}
              </motion.span>
            )}
          </div>
        ) : (
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
                className="absolute -top-1 right-1 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white"
              >
                <FileText className="h-2.5 w-2.5" />
                {count}
              </motion.span>
            )}
          </div>
        )}
        <div className="mt-3 flex w-full flex-col items-center">
          <span className="line-clamp-2 w-full px-1 text-center text-sm leading-tight font-semibold text-foreground">
            {label}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

/* ── VaultFileCard — document card with A4 preview ── */

function VaultFileCard({
  title,
  iconColor = "text-stone-600",
  date,
  statusBadge,
  categoryBadge,
  fileCount,
  expirationBadge,
  contextMenu,
  onClick,
  isSelected = false,
}: {
  title: string
  iconColor?: string
  date?: string
  statusBadge?: React.ReactNode
  categoryBadge?: React.ReactNode
  fileCount?: number
  expirationBadge?: React.ReactNode
  contextMenu?: React.ReactNode
  onClick?: () => void
  isSelected?: boolean
}) {
  const overlays = (
    <>
      <div className="absolute left-2 top-2 z-10 flex min-w-0 shrink items-center gap-1">
        {categoryBadge}
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
        "group relative flex h-full flex-col transition-transform duration-300 active:scale-[0.97]",
        isSelected && "ring-2 ring-violet-500 ring-offset-2",
      )}
    >
      <DocumentSheet
        orientation="portrait"
        onClick={onClick}
        ariaLabel={title}
        overlays={overlays}
      >
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
              {fileCount !== undefined && fileCount > 1 && (
                <span className="font-mono">{fileCount}</span>
              )}
              {date && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {date}
                </span>
              )}
            </div>
          </div>
        </div>
        {expirationBadge && (
          <div
            className="absolute bottom-0 left-0 right-0 px-3 pb-2"
            style={{ fontSize: "9pt" }}
          >
            {expirationBadge}
          </div>
        )}
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
  const { t } = useTranslation()
  const modes: { value: ViewMode; icon: React.ElementType; label: string }[] = [
    { value: "grid", icon: LayoutGrid, label: t("idocument.viewMode.grid") },
    { value: "list", icon: List, label: t("idocument.viewMode.list") },
    { value: "column", icon: Columns3, label: t("idocument.viewMode.column") },
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
        <FileText className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">iDocument</span>
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

/* ── DocumentInfoDialog ── */

function DocumentInfoDialog({
  open,
  onClose,
  doc,
  onDownload,
  categoryConfig,
  statusCfg,
}: {
  open: boolean
  onClose: () => void
  doc: VaultDocument | null
  onDownload: (storageId: Id<"_storage">) => void
  categoryConfig: CategoryConfig
  statusCfg: StatusCfg
}) {
  const { t } = useTranslation()
  if (!open || !doc) return null

  const catConfig = categoryConfig[doc.category ?? "other"]
  const statusConfig = statusCfg[doc.status ?? "pending"] ?? statusCfg.pending
  const isExpired =
    doc.expiresAt && isPast(doc.expiresAt) && !isToday(doc.expiresAt)
  const isExpiringSoon =
    doc.expiresAt &&
    !isExpired &&
    differenceInDays(doc.expiresAt, new Date()) <= 30

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
            <Info className="h-4 w-4 text-violet-400" />
            {t("idocument.documentDetails")}
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          {/* Title and label */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
            <p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              {t("idocument.info.name")}
            </p>
            <p className="text-sm font-medium">
              {doc.label || doc.files[0]?.filename || "Document"}
            </p>
            {doc.documentType && (
              <p className="text-xs text-muted-foreground">
                {t("idocument.info.type")} : {doc.documentType}
              </p>
            )}
          </div>

          {/* Category and Status */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center gap-3">
              {catConfig && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium",
                    catConfig.color
                  )}
                >
                  {React.createElement(catConfig.icon, {
                    className: "h-3 w-3",
                  })}
                  {catConfig.name}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium",
                  statusConfig.class
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)}
                />
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Expiration */}
          {doc.expiresAt && (
            <div className="space-y-1 rounded-xl border border-border/50 bg-card p-3">
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                {t("idocument.info.expiration")}
              </p>
              <p
                className={cn(
                  "text-sm font-medium",
                  isExpired
                    ? "text-red-400"
                    : isExpiringSoon
                      ? "text-amber-400"
                      : "text-foreground"
                )}
              >
                {formatDate(doc.expiresAt)}
                {isExpired && ` (${t("idocument.expired")})`}
                {isExpiringSoon &&
                  ` (${t("idocument.inDays", { count: differenceInDays(doc.expiresAt, new Date()) })})`}
              </p>
            </div>
          )}

          {/* Files list */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
            <p className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              {doc.files.length} {t("idocument.info.files", { count: doc.files.length })}
            </p>
            <div className="space-y-1.5">
              {doc.files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 p-2"
                >
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {file.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(file.sizeBytes)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(file.storageId)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 rounded-xl border border-border/50 bg-card p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
              <Clock className="h-3 w-3 text-amber-400" />
              {t("idocument.info.timestamps")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/50 bg-muted/50 p-2">
                <p className="mb-0.5 text-[8px] tracking-wider text-muted-foreground/50 uppercase">
                  {t("idocument.info.createdAt")}
                </p>
                <p className="text-[11px] font-medium">
                  {formatDate(doc._creationTime)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/50 p-2">
                <p className="mb-0.5 text-[8px] tracking-wider text-muted-foreground/50 uppercase">
                  {t("idocument.info.updatedAt")}
                </p>
                <p className="text-[11px] font-medium">
                  {formatDate(doc.updatedAt)}
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
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── DeleteConfirmDialog ── */

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  docName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  docName: string
}) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border/50 bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/50 px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <Trash2 className="h-4 w-4" />
            {t("idocument.delete.confirmTitle")}
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {t("idocument.delete.confirmMessage", { name: docName })}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-red-700"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── UploadDialog ── */

interface StagedFile {
  storageId: Id<"_storage">
  filename: string
  mimeType: string
  sizeBytes: number
}

function UploadDialog({
  defaultCategory,
  onClose,
  categoryConfig,
}: {
  defaultCategory: DocumentTypeCategory
  onClose: () => void
  categoryConfig: CategoryConfig
}) {
  const { t } = useTranslation()

  const [category, setCategory] =
    useState<DocumentTypeCategory>(defaultCategory)
  const [documentType, setDocumentType] = useState<
    DetailedDocumentType | undefined
  >(undefined)
  const [label, setLabel] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [uploading, setUploading] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl
  )
  const { mutateAsync: createWithFiles } = useConvexMutationQuery(
    api.functions.documents.createWithFiles
  )

  const categoryOptions = useMemo(
    () =>
      Object.values(DocumentTypeCategory).map((cat) => ({
        value: cat,
        label: categoryConfig[cat]?.name ?? cat,
      })),
    [categoryConfig]
  )

  const documentTypeOptions = useMemo(() => {
    const types = DOCUMENT_TYPES_BY_CATEGORY[category] ?? []
    return types.map((dt) => ({
      value: dt as string,
      label: t(`documentTypes.types.${dt}`, dt),
    }))
  }, [category, t])

  useEffect(() => {
    setDocumentType(undefined)
  }, [category])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploading((prev) => [...prev, file.name])
        try {
          const postUrl = await generateUploadUrl({})
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          })
          if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`)
          const { storageId } = await result.json()
          setStagedFiles((prev) => [
            ...prev,
            {
              storageId: storageId as Id<"_storage">,
              filename: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
            },
          ])
        } catch (err: any) {
          console.error(err)
          toast.error(`${t("idocument.toasts.uploadError")}: ${err.message}`)
        } finally {
          setUploading((prev) => prev.filter((n) => n !== file.name))
        }
      }
    },
    [generateUploadUrl]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: 5 * 1024 * 1024,
  })

  const removeStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (stagedFiles.length === 0) return
    setSaving(true)
    try {
      await createWithFiles({
        files: stagedFiles.map(
          ({ storageId, filename, mimeType, sizeBytes }) => ({
            storageId,
            filename,
            mimeType,
            sizeBytes,
          })
        ),
        documentType,
        category,
        label: label.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
      })

      toast.success(t("idocument.toasts.documentAdded"))
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(t("idocument.toasts.saveError"))
    } finally {
      setSaving(false)
    }
  }

  const isUploading = uploading.length > 0

  return (
    <DialogContent className="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{t("idocument.addDocument")}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        {/* Category */}
        <div className="space-y-2">
          <Label>{t("idocument.labels.category")} *</Label>
          <Combobox
            options={categoryOptions}
            value={category}
            onValueChange={(v) => setCategory(v as DocumentTypeCategory)}
            placeholder={t("idocument.selectCategory")}
            searchPlaceholder={t("common.search")}
            emptyText={t("idocument.noCategoryFound")}
          />
        </div>

        {/* Document Type */}
        <div className="space-y-2">
          <Label>{t("idocument.labels.documentType")}</Label>
          <Combobox
            options={documentTypeOptions}
            value={documentType ?? null}
            onValueChange={(v) => setDocumentType(v as DetailedDocumentType)}
            placeholder={t("idocument.selectType")}
            searchPlaceholder={t("idocument.searchType")}
            emptyText={t("idocument.noTypeFound")}
          />
        </div>

        {/* Label */}
        <div className="space-y-2">
          <Label>{t("idocument.labels.label")}</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("idocument.labelPlaceholder")}
          />
        </div>

        {/* Expiration */}
        <div className="space-y-2">
          <Label>{t("idocument.labels.expiryDate")}</Label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        {/* Drop zone */}
        <div className="space-y-2">
          <Label>{t("idocument.labels.files")} *</Label>
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/50",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-muted p-3">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">
                {t("idocument.dropFiles")}
              </div>
              <div className="text-xs text-muted-foreground">
                PDF, PNG, JPG — max 5 MB
              </div>
            </div>
          </div>
        </div>

        {/* Uploading */}
        {isUploading && (
          <div className="space-y-1">
            {uploading.map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-md border bg-muted/20 p-2"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="flex-1 truncate text-sm">{name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Staged files */}
        {stagedFiles.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {stagedFiles.length} {t("idocument.filesReady", { count: stagedFiles.length })}
            </Label>
            {stagedFiles.map((f, idx) => (
              <div
                key={f.storageId}
                className="flex items-center gap-2 rounded-md border bg-muted/10 p-2"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{f.filename}</span>
                <span className="text-xs text-muted-foreground">
                  {(f.sizeBytes / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeStagedFile(idx)}
                  className="rounded p-1 transition-colors hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={stagedFiles.length === 0 || isUploading || saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function IDocumentPage() {
  const { t } = useTranslation()
  const convex = useConvex()

  // ─── i18n config objects ───────────────────────────────
  const STATUS_CFG = useMemo(() => getStatusCfg(t), [t])
  const SMART_FOLDERS = useMemo(() => getSmartFolders(t), [t])
  const CATEGORY_CONFIG = useMemo(() => getCategoryConfig(t), [t])
  const SYSTEM_FOLDERS: SystemFolder[] = useMemo(
    () => [
      { id: "__all", name: t("idocument.systemFolders.all"), icon: FolderOpen, isSystem: true },
      { id: "__trash", name: t("idocument.systemFolders.trash"), icon: Trash2, isSystem: true },
      { id: "__vault", name: t("idocument.systemFolders.vault"), icon: Shield, isSystem: true },
    ],
    [t]
  )

  // ─── State ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [currentFolderId, setCurrentFolderId] = useState<FolderId | null>(null)
  const [search, setSearch] = useState("")
  const [showUpload, setShowUpload] = useState(false)

  // Dialog states
  const [infoDoc, setInfoDoc] = useState<VaultDocument | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<VaultDocument | null>(null)
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null)

  // ─── Convex queries ─────────────────────────────────────
  const { data: vaultDocs = [], isPending } = useAuthenticatedConvexQuery(
    api.functions.documentVault.getMyVault,
    {}
  )
  const { data: stats } = useAuthenticatedConvexQuery(
    api.functions.documentVault.getStats,
    {}
  )

  // Mutations
  const { mutateAsync: removeFromVault } = useConvexMutationQuery(
    api.functions.documentVault.removeFromVault
  )

  // ─── Helpers ────────────────────────────────────────────
  const getUrl = useCallback(
    async (args: { storageId: Id<"_storage"> }) => {
      return await convex.query(api.functions.documents.getUrl, args)
    },
    [convex]
  )

  const handleDownload = useCallback(
    async (storageId: Id<"_storage">) => {
      try {
        const url = await getUrl({ storageId })
        if (url) window.open(url, "_blank")
      } catch {
        toast.error(t("idocument.toasts.downloadError"))
      }
    },
    [getUrl]
  )

  const handleDelete = useCallback(
    async (doc: VaultDocument) => {
      try {
        await removeFromVault({ id: doc._id })
        toast.success(t("idocument.toasts.documentDeleted"))
      } catch {
        toast.error(t("idocument.toasts.deleteError"))
      }
    },
    [removeFromVault]
  )

  // ─── Folder config generation ───────────────────────────
  const allFolders = useMemo(() => {
    const now = Date.now()
    const docs = vaultDocs as unknown as VaultDocument[]

    const systemFolderEntries = SYSTEM_FOLDERS.map((sf) => {
      let count = 0
      if (sf.id === "__all") count = docs.length
      else if (sf.id === "__trash")
        count = docs.filter(
          (d) => d.status === "rejected" || (d.expiresAt && d.expiresAt < now)
        ).length
      else if (sf.id === "__vault")
        count = docs.filter((d) => d.status === "validated").length
      return { ...sf, count, isCategory: false as const }
    })

    const categoryFolderEntries = SMART_FOLDERS.map((sf) => {
      const count = sf.categories.reduce(
        (acc, cat) => acc + (stats?.byCategory[cat] ?? 0),
        0
      )
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
      }
    })

    return { systemFolderEntries, categoryFolderEntries }
  }, [vaultDocs, stats, SYSTEM_FOLDERS, SMART_FOLDERS])

  // ─── Current folder label for breadcrumb ────────────────
  const currentFolderName = useMemo(() => {
    if (!currentFolderId) return null
    const sys = SYSTEM_FOLDERS.find((f) => f.id === currentFolderId)
    if (sys) return sys.name
    const smart = SMART_FOLDERS.find((f) => f.id === currentFolderId)
    if (smart) return smart.name
    return CATEGORY_CONFIG[currentFolderId]?.name ?? currentFolderId
  }, [currentFolderId, SYSTEM_FOLDERS, SMART_FOLDERS, CATEGORY_CONFIG])

  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId || !currentFolderName) return []
    return [{ id: currentFolderId, name: currentFolderName }]
  }, [currentFolderId, currentFolderName])

  // ─── Filtered documents ─────────────────────────────────
  const currentFiles = useMemo(() => {
    const now = Date.now()
    let docs = vaultDocs as unknown as VaultDocument[]

    // Search filter (applies globally)
    if (search) {
      const q = search.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.label?.toLowerCase().includes(q) ||
          d.files?.[0]?.filename?.toLowerCase().includes(q) ||
          d.documentType?.toLowerCase().includes(q) ||
          getCategoryLabel(d.category, CATEGORY_CONFIG, t("idocument.uncategorized")).toLowerCase().includes(q)
      )
    }

    // Folder filter
    if (!currentFolderId) {
      return search ? docs : [] // If no folder and no search, show nothing (folder view)
    }

    switch (currentFolderId) {
      case "__all":
        // All docs, no additional filter
        break
      case "__trash":
        // Rejected or expired documents
        docs = docs.filter(
          (d) => d.status === "rejected" || (d.expiresAt && d.expiresAt < now)
        )
        break
      case "__vault":
        // Validated/secured documents (coffre-fort)
        docs = docs.filter((d) => d.status === "validated")
        break
      default: {
        // Smart folder (groups multiple categories) or legacy single category
        const smartFolder = SMART_FOLDERS.find(
          (sf) => sf.id === currentFolderId
        )
        if (smartFolder) {
          docs = docs.filter((d) =>
            smartFolder.categories.includes(
              (d.category ?? "other") as DocumentTypeCategory
            )
          )
        } else {
          // Fallback: single category
          docs = docs.filter((d) => (d.category ?? "other") === currentFolderId)
        }
        break
      }
    }

    return docs
  }, [vaultDocs, currentFolderId, search, SMART_FOLDERS, CATEGORY_CONFIG, t])

  // ─── Handlers ───────────────────────────────────────────
  const handleOpenFolder = useCallback((folderId: FolderId) => {
    setCurrentFolderId(folderId)
    setSearch("")
  }, [])

  const handleNavigate = useCallback((id: string | null) => {
    setCurrentFolderId(id as FolderId | null)
  }, [])

  const handleBack = useCallback(() => {
    setCurrentFolderId(null)
    setSearch("")
  }, [])

  // Default category for upload
  const defaultUploadCategory = useMemo(() => {
    if (
      currentFolderId &&
      currentFolderId !== "__all" &&
      currentFolderId !== "__trash" &&
      currentFolderId !== "__vault"
    ) {
      return currentFolderId as DocumentTypeCategory
    }
    return DocumentTypeCategory.Other
  }, [currentFolderId])

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
        <PageHeader
          title={currentFolderName ?? "iDocument"}
          subtitle={
            currentFolderId
              ? undefined
              : t("idocument.subtitle")
          }
          icon={
            currentFolderId && CATEGORY_CONFIG[currentFolderId] ? (
              (() => {
                const CatIcon = CATEGORY_CONFIG[currentFolderId].icon
                return (
                  <CatIcon
                    className={cn(
                      "h-5 w-5",
                      CATEGORY_CONFIG[currentFolderId].iconColor
                    )}
                  />
                )
              })()
            ) : (
              <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            )
          }
          iconBgClass="bg-violet-500/10"
          showBackButton={!!currentFolderId}
          onBack={handleBack}
        />
        <div className="flex items-center gap-2">
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("idocument.addDocument")}</span>
                <span className="sm:hidden">{t("common.add")}</span>
              </Button>
            </DialogTrigger>
            <UploadDialog
              key={defaultUploadCategory}
              defaultCategory={defaultUploadCategory}
              onClose={() => setShowUpload(false)}
              categoryConfig={CATEGORY_CONFIG}
            />
          </Dialog>
        </div>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-[360px] min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder={t("idocument.searchDocuments")}
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
                  <X className="h-3 w-3" /> {t("common.clear")}
                </button>
              </>
            )}
            {stats && (
              <div className="mr-2 ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{stats.total} {t("idocument.stats.documents")}</span>
                {stats.expiringSoon > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.expiringSoon} {t("idocument.stats.expiringSoon")}
                  </span>
                )}
                {stats.expired > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.expired} {t("idocument.stats.expired")}
                  </span>
                )}
              </div>
            )}
            <div className={cn(stats ? "" : "ml-auto")}>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Délivrés par le consulat (only shown at the vault root) ── */}
      {!currentFolderId ? <ConsulateIssuedDocumentsSection /> : null}

      {/* ── Breadcrumb ── */}
      <BreadcrumbPath path={breadcrumbPath} onNavigate={handleNavigate} />

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center p-12"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </motion.div>
        ) : (
          <>
            {/* ── Grid View ── */}
            {viewMode === "grid" && (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* All 5 folders on a single row — system + métier */}
                {!currentFolderId && !search && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
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
                    <div className="mb-3 flex items-center justify-between">
                      <p className="px-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                        {search ? t("idocument.searchResults") : t("idocument.documents")}
                      </p>
                      {currentFiles.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {currentFiles.length} {t("idocument.items", { count: currentFiles.length })}
                        </span>
                      )}
                    </div>
                    {currentFiles.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {currentFiles.map((doc) => {
                          const d = doc as unknown as VaultDocument
                          const st =
                            STATUS_CFG[d.status ?? "pending"] ??
                            STATUS_CFG.pending
                          const catConfig =
                            CATEGORY_CONFIG[d.category ?? "other"]
                          const isExpired =
                            d.expiresAt &&
                            isPast(d.expiresAt) &&
                            !isToday(d.expiresAt)
                          const isExpiringSoon =
                            d.expiresAt &&
                            !isExpired &&
                            differenceInDays(d.expiresAt, new Date()) <= 30

                          return (
                            <VaultFileCard
                              key={d._id}
                              title={
                                d.label || d.files[0]?.filename || "Document"
                              }
                              iconColor={catConfig?.iconColor}
                              date={formatDate(d.updatedAt ?? d._creationTime)}
                              fileCount={d.files?.length}
                              categoryBadge={
                                catConfig ? (
                                  <span
                                    className={cn(
                                      "inline-flex h-4 items-center gap-1 rounded-full border-transparent bg-muted px-1.5 text-[9px] font-medium",
                                      catConfig.color
                                    )}
                                  >
                                    {React.createElement(catConfig.icon, {
                                      className: "h-2.5 w-2.5",
                                    })}
                                    {catConfig.name}
                                  </span>
                                ) : null
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
                              expirationBadge={
                                isExpired || isExpiringSoon ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[9px] font-medium",
                                      isExpired
                                        ? "text-red-400"
                                        : "text-amber-400"
                                    )}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    {isExpired
                                      ? t("idocument.expired")
                                      : `${t("idocument.expiresOn")} ${formatDate(d.expiresAt)}`}
                                  </span>
                                ) : null
                              }
                              contextMenu={
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPreviewDoc(d)
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      {t("idocument.actions.preview")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setInfoDoc(d)
                                      }}
                                    >
                                      <Info className="mr-2 h-4 w-4" />
                                      {t("idocument.actions.info")}
                                    </DropdownMenuItem>
                                    {d.files[0]?.storageId && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDownload(d.files[0].storageId)
                                        }}
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        {t("idocument.actions.download")}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteDoc(d)
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t("idocument.actions.delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              }
                              onClick={() => setPreviewDoc(d)}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center rounded-xl border-2 border-dashed bg-muted/30 py-16 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
                          {search ? (
                            <Search className="h-8 w-8 text-muted-foreground" />
                          ) : (
                            <FolderOpen className="h-8 w-8 text-violet-400/60" />
                          )}
                        </div>
                        <h3 className="mb-1 text-lg font-semibold">
                          {search ? t("idocument.empty.noResults") : t("idocument.empty.emptyFolder")}
                        </h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                          {search
                            ? t("idocument.empty.noResultsDesc")
                            : t("idocument.empty.emptyFolderDesc")}
                        </p>
                        {!search && (
                          <Button
                            variant="link"
                            onClick={() => setShowUpload(true)}
                            className="mt-2 text-primary"
                          >
                            {t("idocument.addDocument")}
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
                    <div className="col-span-4">{t("idocument.table.name")}</div>
                    <div className="col-span-2">{t("idocument.table.category")}</div>
                    <div className="col-span-2">{t("idocument.table.modified")}</div>
                    <div className="col-span-1">{t("idocument.table.status")}</div>
                    <div className="col-span-2">{t("idocument.table.expiration")}</div>
                    <div className="col-span-1">{t("idocument.table.files")}</div>
                  </div>

                  {/* Folder rows (only at root) */}
                  {!currentFolderId && !search && (
                    <>
                      {allFolders.systemFolderEntries.map((folder) => (
                        <div
                          key={folder.id}
                          className="group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                          onClick={() => handleOpenFolder(folder.id)}
                        >
                          <div className="col-span-4 flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/15">
                              <folder.icon className="h-3 w-3 text-violet-400" />
                            </div>
                            <span className="truncate text-xs font-medium">
                              {folder.name}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                            {t("idocument.system")}
                          </div>
                          <div className="col-span-2" />
                          <div className="col-span-1" />
                          <div className="col-span-2" />
                          <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                            {folder.count}
                          </div>
                        </div>
                      ))}
                      {allFolders.categoryFolderEntries.map((folder) => (
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
                          </div>
                          <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                            {folder.name}
                          </div>
                          <div className="col-span-2" />
                          <div className="col-span-1" />
                          <div className="col-span-2" />
                          <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                            {folder.count}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* File rows */}
                  {(currentFolderId || search) &&
                    currentFiles.map((doc) => {
                      const d = doc as unknown as VaultDocument
                      const st =
                        STATUS_CFG[d.status ?? "pending"] ?? STATUS_CFG.pending
                      const isExpired =
                        d.expiresAt &&
                        isPast(d.expiresAt) &&
                        !isToday(d.expiresAt)
                      const isExpiringSoon =
                        d.expiresAt &&
                        !isExpired &&
                        differenceInDays(d.expiresAt, new Date()) <= 30

                      return (
                        <div
                          key={d._id}
                          className="group grid cursor-pointer grid-cols-12 gap-2 border-b border-border/30 px-4 py-2.5 transition-colors hover:bg-muted/30"
                          onClick={() => setPreviewDoc(d)}
                        >
                          <div className="col-span-4 flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                              <FileText className="h-3 w-3 text-violet-400" />
                            </div>
                            <span className="truncate text-xs font-medium">
                              {d.label || d.files[0]?.filename || "Document"}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                            {getCategoryLabel(d.category, CATEGORY_CONFIG, t("idocument.uncategorized"))}
                          </div>
                          <div className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(d.updatedAt ?? d._creationTime)}
                          </div>
                          <div className="col-span-1 flex items-center">
                            <span
                              className={cn(
                                "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[10px]",
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
                          </div>
                          <div className="col-span-2 flex items-center">
                            {d.expiresAt ? (
                              <span
                                className={cn(
                                  "text-[10px]",
                                  isExpired
                                    ? "text-red-400"
                                    : isExpiringSoon
                                      ? "text-amber-400"
                                      : "text-muted-foreground"
                                )}
                              >
                                {formatDate(d.expiresAt)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </div>
                          <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                            {d.files?.length ?? 0}
                          </div>
                        </div>
                      )
                    })}

                  {/* Empty state */}
                  {(currentFolderId || search) && currentFiles.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      {t("idocument.empty.noDocumentFound")}
                    </div>
                  )}
                  {!currentFolderId &&
                    !search &&
                    allFolders.systemFolderEntries.length === 0 &&
                    allFolders.categoryFolderEntries.length === 0 && (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        {t("idocument.empty.noContent")}
                      </div>
                    )}
                </div>
              </motion.div>
            )}

            {/* ── Column View ── */}
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
                    {/* Root column — System + Category folders */}
                    <div className="w-64 overflow-y-auto border-r border-border/50">
                      <div className="p-2 px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase">
                        {t("idocument.folders.title")}
                      </div>
                      {SYSTEM_FOLDERS.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => handleOpenFolder(folder.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
                            currentFolderId === folder.id &&
                              "bg-primary/10 text-primary"
                          )}
                        >
                          <folder.icon className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                          <span className="truncate">{folder.name}</span>
                          <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
                        </button>
                      ))}
                      <div className="my-1 border-t border-border/30" />
                      {SMART_FOLDERS.map((sf) => (
                        <button
                          key={sf.id}
                          onClick={() => handleOpenFolder(sf.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
                            currentFolderId === sf.id &&
                              "bg-primary/10 text-primary"
                          )}
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">{sf.name}</span>
                          <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
                        </button>
                      ))}
                    </div>

                    {/* Files column */}
                    {currentFolderId && (
                      <div className="w-72 overflow-y-auto border-r border-border/50">
                        <div className="p-2 px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase">
                          {currentFolderName}
                        </div>
                        {currentFiles.length > 0 ? (
                          currentFiles.map((doc) => {
                            const d = doc as unknown as VaultDocument
                            return (
                              <button
                                key={d._id}
                                onClick={() => setPreviewDoc(d)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                                <span className="truncate">
                                  {d.label ||
                                    d.files[0]?.filename ||
                                    "Document"}
                                </span>
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">
                            {t("idocument.empty.noDocument")}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preview pane */}
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p>{t("idocument.selectForPreview")}</p>
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
        categoryConfig={CATEGORY_CONFIG}
        statusCfg={STATUS_CFG}
      />

      <DeleteConfirmDialog
        open={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onConfirm={() => {
          if (deleteDoc) handleDelete(deleteDoc)
        }}
        docName={
          deleteDoc?.label || deleteDoc?.files[0]?.filename || t("idocument.thisDocument")
        }
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
  )
}
