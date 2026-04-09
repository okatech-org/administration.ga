/**
 * ColumnMappingDialog — Map CSV columns to card template dynamic fields.
 * Ported from Agent macOS ColumnMappingView.swift.
 */

import { useState, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ArrowRight, Wand2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import type { ColumnMapping } from "../../lib/column-mapping"
import { autoMap } from "../../lib/column-mapping"

interface ColumnMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  csvHeaders: string[]
  templateFields: string[]
  sampleRow: Record<string, string> | null
  onApply: (mappings: ColumnMapping[]) => void
}

export function ColumnMappingDialog({
  open,
  onOpenChange,
  csvHeaders,
  templateFields,
  sampleRow,
  onApply,
}: ColumnMappingDialogProps) {
  const { t } = useTranslation()

  const [mappings, setMappings] = useState<ColumnMapping[]>(() =>
    csvHeaders.map((h) => ({ csvColumn: h, templateField: null }))
  )

  const handleAutoMap = useCallback(() => {
    setMappings(autoMap(csvHeaders, templateFields))
  }, [csvHeaders, templateFields])

  const handleClear = useCallback(() => {
    setMappings(csvHeaders.map((h) => ({ csvColumn: h, templateField: null })))
  }, [csvHeaders])

  const handleFieldChange = useCallback(
    (csvColumn: string, templateField: string | null) => {
      setMappings((prev) =>
        prev.map((m) =>
          m.csvColumn === csvColumn ? { ...m, templateField } : m
        )
      )
    },
    []
  )

  const mappedCount = useMemo(
    () => mappings.filter((m) => m.templateField).length,
    [mappings]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapping des colonnes</DialogTitle>
          <DialogDescription>
            Associez les colonnes du CSV aux champs dynamiques du template de carte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoMap}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Auto-map
            </button>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <X className="h-3.5 w-3.5" />
              Effacer tout
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              {mappedCount}/{csvHeaders.length} colonnes mappées
            </span>
          </div>

          {/* Mapping table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Colonne CSV
                  </th>
                  <th className="w-8" />
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Champ template
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Exemple
                  </th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.csvColumn} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {mapping.csvColumn}
                    </td>
                    <td className="text-center">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={mapping.templateField ?? ""}
                        onChange={(e) =>
                          handleFieldChange(
                            mapping.csvColumn,
                            e.target.value || null
                          )
                        }
                        className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
                      >
                        <option value="">— Non mappé —</option>
                        {templateFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[150px]">
                      {sampleRow?.[mapping.csvColumn] ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onApply(mappings)
              onOpenChange(false)
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Appliquer ({mappedCount} mappings)
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
