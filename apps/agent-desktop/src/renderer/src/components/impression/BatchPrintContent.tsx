/**
 * BatchPrintContent — Batch card printing from CSV.
 * Ported from Agent macOS BatchPrintView.swift.
 *
 * Workflow:
 * 1. Import CSV file
 * 2. Map columns to template dynamic fields
 * 3. Select records to print
 * 4. Preview and print
 */

import { useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Upload,
  Columns3,
  CheckSquare,
  Square,
  Play,
  Eye,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { parseCSV, type CSVData } from "../../lib/csv-import"
import {
  autoMap,
  applyMappings,
  type ColumnMapping,
} from "../../lib/column-mapping"
import { ColumnMappingDialog } from "./ColumnMappingDialog"

interface BatchPrintContentProps {
  isPrinterConnected: boolean
  onPrintBatch: (records: Record<string, string>[]) => Promise<void>
  templateFields: string[]
}

export function BatchPrintContent({
  isPrinterConnected,
  onPrintBatch,
  templateFields,
}: BatchPrintContentProps) {
  const { t } = useTranslation()

  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0 })

  // --- Import CSV ---

  const handleImportCSV = useCallback(async () => {
    try {
      const result = await window.desktopApi?.fileDialog?.open({
        title: "Importer un fichier CSV",
        filters: [{ name: "CSV", extensions: ["csv", "txt"] }],
      })

      if (!result?.filePaths?.length) return

      const text = await window.desktopApi?.fileDialog?.readText(result.filePaths[0])
      if (!text) return
      const data = parseCSV(text)

      if (data.rowCount === 0) {
        toast.error("Fichier CSV vide")
        return
      }

      setCsvData(data)
      setSelectedIndices(new Set(data.rows.map((_, i) => i)))

      // Auto-map if template fields are available
      if (templateFields.length > 0) {
        setMappings(autoMap(data.headers, templateFields))
      }

      toast.success(`${data.rowCount} enregistrement(s) importé(s)`)
    } catch (err) {
      console.error("[BatchPrint] CSV import error:", err)
      toast.error("Erreur d'import CSV", { description: String(err) })
    }
  }, [templateFields])

  // --- Selection ---

  const toggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (!csvData) return
    setSelectedIndices(new Set(csvData.rows.map((_, i) => i)))
  }, [csvData])

  const selectNone = useCallback(() => {
    setSelectedIndices(new Set())
  }, [])

  // --- Mapped records ---

  const mappedRecords = useMemo(() => {
    if (!csvData || mappings.length === 0) return []
    return csvData.rows.map((row) => applyMappings(row, mappings))
  }, [csvData, mappings])

  const mappedCount = useMemo(
    () => mappings.filter((m) => m.templateField).length,
    [mappings]
  )

  // --- Print ---

  const handlePrint = useCallback(async () => {
    const selected = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((i) => mappedRecords[i])
      .filter(Boolean)

    if (selected.length === 0) {
      toast.error("Aucun enregistrement sélectionné")
      return
    }

    if (!isPrinterConnected) {
      toast.error("Aucune imprimante connectée")
      return
    }

    setIsPrinting(true)
    setPrintProgress({ current: 0, total: selected.length })

    try {
      await onPrintBatch(selected)
    } finally {
      setIsPrinting(false)
      setPrintProgress({ current: 0, total: 0 })
    }
  }, [selectedIndices, mappedRecords, isPrinterConnected, onPrintBatch])

  // --- No CSV imported yet ---

  if (!csvData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Impression batch
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Importez un fichier CSV contenant les données des cartes à imprimer.
            Les colonnes seront automatiquement mappées aux champs du template.
          </p>
        </div>
        <button
          onClick={handleImportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Importer CSV
        </button>
      </div>
    )
  }

  // --- CSV imported ---

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 p-4 border-b border-border">
        <button
          onClick={handleImportCSV}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
        >
          <Upload className="h-3.5 w-3.5" />
          Nouveau CSV
        </button>
        <button
          onClick={() => setShowMappingDialog(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50"
        >
          <Columns3 className="h-3.5 w-3.5" />
          Mapping ({mappedCount})
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          onClick={selectAll}
          className="text-xs text-primary hover:underline"
        >
          Tout
        </button>
        <button
          onClick={selectNone}
          className="text-xs text-muted-foreground hover:underline"
        >
          Aucun
        </button>

        <span className="ml-auto text-xs text-muted-foreground">
          {selectedIndices.size}/{csvData.rowCount} sélectionné(s)
        </span>

        <button
          onClick={handlePrint}
          disabled={!isPrinterConnected || selectedIndices.size === 0 || isPrinting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPrinting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {printProgress.current}/{printProgress.total}
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Imprimer ({selectedIndices.size})
            </>
          )}
        </button>
      </div>

      {/* Records list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {mappedCount === 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-orange-600 text-sm mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Aucun mapping configuré. Cliquez sur "Mapping" pour associer les colonnes CSV aux champs du template.
          </div>
        )}

        <div className="space-y-1">
          {csvData.rows.map((row, index) => {
            const isSelected = selectedIndices.has(index)
            const mapped = mappedRecords[index]
            const displayName = mapped?.firstName
              ? `${mapped.firstName} ${mapped.lastName ?? ""}`.trim()
              : Object.values(row)[0] ?? `Enregistrement ${index + 1}`

            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => toggleSelect(index)}
              >
                <button className="shrink-0 text-primary">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {csvData.headers.slice(0, 3).map((h) => row[h]).filter(Boolean).join(" · ")}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewIndex(previewIndex === index ? null : index)
                  }}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Preview panel */}
        {previewIndex !== null && csvData.rows[previewIndex] && (
          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              Aperçu enregistrement #{previewIndex + 1}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {mappings
                .filter((m) => m.templateField)
                .map((m) => (
                  <div key={m.csvColumn}>
                    <span className="text-xs text-muted-foreground">{m.templateField}</span>
                    <p className="font-medium text-foreground">
                      {csvData.rows[previewIndex][m.csvColumn] || "—"}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Column mapping dialog */}
      <ColumnMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        csvHeaders={csvData.headers}
        templateFields={templateFields}
        sampleRow={csvData.rows[0] ?? null}
        onApply={setMappings}
      />
    </div>
  )
}
