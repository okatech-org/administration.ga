import { useState } from "react"
import {
  X,
  FolderOpen,
  Trash2,
  Copy,
  Plus,
  FileText,
  Clock,
  Loader2,
} from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"

interface DesignSummary {
  _id: Id<"cardDesigns">
  _creationTime: number
  name: string
  description?: string
  version: number
  updatedAt: number
  printDuplex: boolean
  frontElements: any[]
  backElements: any[]
}

interface DesignListDialogProps {
  open: boolean
  onClose: () => void
  designs: DesignSummary[]
  currentDesignId: Id<"cardDesigns"> | null
  isLoading: boolean
  onLoad: (id: Id<"cardDesigns">) => void
  onDelete: (id: Id<"cardDesigns">) => void
  onDuplicate: (id: Id<"cardDesigns">) => void
  onNew: () => void
}

export function DesignListDialog({
  open,
  onClose,
  designs,
  currentDesignId,
  isLoading,
  onLoad,
  onDelete,
  onDuplicate,
  onNew,
}: DesignListDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState<Id<"cardDesigns"> | null>(null)

  if (!open) return null

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Mes designs</h2>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {designs.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Aucun design sauvegardé</p>
              <p className="text-xs mt-1">Créez votre premier template de carte</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {designs.map((design) => {
                const isCurrent = design._id === currentDesignId
                const isConfirmingDelete = confirmDelete === design._id
                const elCount = design.frontElements.length + design.backElements.length

                return (
                  <div
                    key={design._id}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer
                      ${isCurrent
                        ? "border-primary/30 bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/50"
                      }`}
                    onClick={() => {
                      onLoad(design._id)
                      onClose()
                    }}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">
                          {design.name}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          v{design.version}
                        </span>
                        {design.printDuplex && (
                          <span className="shrink-0 text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5">
                            Recto/Verso
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(design.updatedAt)}
                        </span>
                        <span>{elCount} élément{elCount > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onDuplicate(design._id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Dupliquer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {isConfirmingDelete ? (
                        <button
                          onClick={() => {
                            onDelete(design._id)
                            setConfirmDelete(null)
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        >
                          Confirmer
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(design._id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
