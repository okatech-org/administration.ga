import { useCallback, useRef, useState } from "react"
import { useAction } from "convex/react"
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react"
import { api } from "@convex/_generated/api"
import type { CardDesign, CardElement, ElementType } from "../../lib/card-types"
import { createDefaultElement } from "../../lib/card-types"
import { getFieldsByCategory, type DynamicField } from "../../lib/dynamic-fields"
import { toast } from "../../lib/toast"

interface AIGenerationDialogProps {
  open: boolean
  onClose: () => void
  entityId?: string
  /** Nom et description courants — on conserve le nom si l'utilisateur en a mis un. */
  currentName: string
  currentDescription: string
  onApply: (design: CardDesign) => void
}

const ACCEPTED_MIME: Record<string, true> = {
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/gif": true,
  "application/pdf": true,
}
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

export function AIGenerationDialog({
  open,
  onClose,
  entityId,
  currentName,
  currentDescription,
  onApply,
}: AIGenerationDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; base64: string; mimeType: string; size: number } | null>(null)
  const [instructions, setInstructions] = useState("")
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const generate = useAction(api.functions.cardDesignsAI.generateCardDesign)

  const fieldGroups = getFieldsByCategory(entityId)

  const handleFilePicked = useCallback((picked: File) => {
    if (!ACCEPTED_MIME[picked.type]) {
      toast.error("Format non supporté (PNG, JPEG, WebP, GIF ou PDF uniquement)")
      return
    }
    if (picked.size > MAX_FILE_SIZE) {
      toast.error("Fichier trop volumineux (max 10 Mo)")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(",")[1] ?? ""
      setFile({ name: picked.name, base64, mimeType: picked.type, size: picked.size })
    }
    reader.readAsDataURL(picked)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = e.dataTransfer.files?.[0]
      if (dropped) handleFilePicked(dropped)
    },
    [handleFilePicked],
  )

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!file && !instructions.trim()) {
      toast.error("Ajoute un fichier de référence ou des instructions.")
      return
    }
    setIsGenerating(true)
    try {
      const result = await generate({
        entityId,
        fileBase64: file?.base64,
        fileMimeType: file?.mimeType,
        instructions: instructions.trim() || undefined,
        requestedFields: selectedFields.size > 0 ? Array.from(selectedFields) : undefined,
      })

      if (!result.success || !result.design) {
        toast.error(result.error ?? "Génération échouée")
        return
      }

      // Normalisation : chaque élément est mergé avec createDefaultElement pour
      // garantir toutes les clés requises, même si Claude en a omis.
      const normalizeElements = (raw: unknown[]): CardElement[] => {
        return raw
          .map((item, idx) => {
            if (!item || typeof item !== "object") return null
            const e = item as Record<string, unknown>
            const type = (e.type as ElementType) ?? "text"
            const base = createDefaultElement(type, Number(e.x) || 100, Number(e.y) || 100)
            const merged: CardElement = {
              ...base,
              ...(e as Partial<CardElement>),
              id: base.id, // on force un id local unique
              type,
              zIndex: typeof e.zIndex === "number" ? e.zIndex : idx,
              // L'IA ne doit JAMAIS fournir d'imageData — on force null
              imageData: null,
              isVisible: e.isVisible !== false,
              isLocked: e.isLocked === true,
            }
            return merged
          })
          .filter((x): x is CardElement => x !== null)
      }

      const design: CardDesign = {
        name: currentName || "Carte générée par IA",
        description: currentDescription,
        entityId,
        backgroundColor: result.design.backgroundColor || "#ffffff",
        frontBackgroundImage: null,
        backBackgroundImage: null,
        backgroundOpacity: 1,
        frontElements: normalizeElements(result.design.frontElements),
        backElements: normalizeElements(result.design.backElements),
        printDuplex: result.design.backElements.length > 0,
        magneticTracks: ["", "", ""],
        version: 1,
      }

      onApply(design)
      toast.success(
        `Design généré (${design.frontElements.length} éléments recto${design.backElements.length ? `, ${design.backElements.length} verso` : ""})`,
      )
      onClose()
    } catch (err) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsGenerating(false)
    }
  }, [file, instructions, selectedFields, generate, entityId, currentName, currentDescription, onApply, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Générer un design avec l'IA</h2>
              <p className="text-xs text-muted-foreground">
                Fournis une référence visuelle, des instructions, et/ou les champs à inclure.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* File drop zone */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Référence (image ou PDF) <span className="font-normal text-muted-foreground">— optionnel</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              onChange={(e) => {
                const picked = e.target.files?.[0]
                if (picked) handleFilePicked(picked)
                e.target.value = ""
              }}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shrink-0">
                  {file.mimeType === "application/pdf" ? (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} Ko · {file.mimeType}
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="flex items-center justify-center size-7 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  title="Retirer le fichier"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  Glisser un fichier ou cliquer pour choisir
                </p>
                <p className="text-[10px] text-muted-foreground">
                  PNG, JPEG, WebP, GIF, PDF — max 10 Mo
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Instructions <span className="font-normal text-muted-foreground">— optionnel</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Ex. « Carte élégante avec photo ronde à gauche, nom en grand, couleurs du drapeau gabonais en accents subtils »"
              className="w-full text-xs px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Fields */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Champs à inclure <span className="font-normal text-muted-foreground">— optionnel ({selectedFields.size} sélectionnés)</span>
            </label>
            <div className="border border-border rounded-lg p-2 max-h-52 overflow-y-auto bg-muted/30">
              {Object.entries(fieldGroups).map(([category, fields]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 pt-1 pb-1.5">
                    {category}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {fields.map((f: DynamicField) => {
                      const checked = selectedFields.has(f.key)
                      return (
                        <label
                          key={f.key}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors
                            ${checked
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleField(f.key)}
                            className="rounded border-border accent-primary"
                          />
                          <span className="truncate">{f.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground">
            Le design généré remplacera le contenu actuel. Tu pourras l'ajuster avant sauvegarde.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!file && !instructions.trim())}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
