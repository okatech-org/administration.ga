/**
 * ImpressionPage — Single page for all printing operations
 *
 * Tabs:
 * - File d'impression (default): print job queue with real Evolis printing
 * - Designer: card template designer (existing CardDesigner)
 *
 * Header button: Printer config (opens modal for device scan/connect/status)
 */

import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ListOrdered, Palette, Printer, Settings2, Wifi, WifiOff, FileSpreadsheet } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { usePrinter } from "../../hooks/usePrinter"
import { useOrg } from "../../hooks/useOrg"
import { cn } from "../../lib/utils"
import { CardDesigner } from "../card-designer/CardDesigner"
import { AutoPrintQueueContent } from "./AutoPrintQueueContent"
import { PrinterConfigDialog } from "./PrinterConfigDialog"
import { BatchPrintContent } from "./BatchPrintContent"

type Tab = "queue" | "designer" | "batch"

export function ImpressionPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>("queue")
  const [showPrinterConfig, setShowPrinterConfig] = useState(false)

  const { orgId } = useOrg()

  // Shared printer state — called once here, passed to children
  const printer = usePrinter()

  const isPrinterConnected = !!printer.connectedInfo

  // Batch print handler: iterate records, render + print each
  const handlePrintBatch = useCallback(
    async (records: Record<string, string>[]) => {
      const errors: string[] = []
      for (let i = 0; i < records.length; i++) {
        try {
          // Use printCard with field values for each record
          const result = await window.desktopApi?.printer?.printCard({
            // TODO: render card from active design + fieldValues
            // For now, use the printCard API directly
            frontBuffer: undefined,
            duplex: false,
          })
          if (result && !result.success) {
            errors.push(`#${i + 1}: ${result.errorMessage}`)
          }
        } catch (err) {
          errors.push(`#${i + 1}: ${String(err)}`)
        }
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} erreur(s) d'impression`, {
          description: errors.slice(0, 3).join("\n"),
        })
      } else {
        toast.success(`${records.length} carte(s) imprimée(s)`)
      }
    },
    []
  )

  // Template fields available for batch mapping
  // TODO: derive from the active card design's dynamic field keys
  const templateFields = [
    "firstName", "lastName", "nip", "cardNumber",
    "photoUrl", "birthdate", "nationality", "passport",
  ]

  const tabs: { id: Tab; labelKey: string; icon: React.ElementType }[] = [
    { id: "queue", labelKey: "desktop.impression.tabs.queue", icon: ListOrdered },
    { id: "designer", labelKey: "desktop.impression.tabs.designer", icon: Palette },
    { id: "batch", labelKey: "desktop.impression.tabs.batch", icon: FileSpreadsheet },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 lg:p-6 pb-0 flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Printer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {t("desktop.impression.title", "Impression")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("desktop.impression.subtitle", "File d'impression, designer de cartes et configuration imprimante")}
              </p>
            </div>
          </div>

          {/* Printer status + config button */}
          <button
            onClick={() => setShowPrinterConfig(true)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
              isPrinterConnected
                ? "border-green-500/30 bg-green-500/5 text-green-700 hover:bg-green-500/10"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {isPrinterConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                {printer.connectedInfo?.modelName}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                {t("desktop.impression.noPrinter", "Aucune imprimante")}
              </>
            )}
            <Settings2 className="h-3.5 w-3.5 opacity-50" />
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border border-border/50 rounded-xl bg-card p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(tab.labelKey, tab.id === "queue" ? "File d'impression" : tab.id === "designer" ? "Designer" : "Batch")}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "queue" && (
          <AutoPrintQueueContent
            printer={printer}
            isPrinterConnected={isPrinterConnected}
            orgId={orgId}
          />
        )}
        {activeTab === "designer" && <CardDesigner />}
        {activeTab === "batch" && (
          <BatchPrintContent
            isPrinterConnected={isPrinterConnected}
            onPrintBatch={handlePrintBatch}
            templateFields={templateFields}
          />
        )}
      </div>

      {/* Printer config modal */}
      <PrinterConfigDialog
        open={showPrinterConfig}
        onOpenChange={setShowPrinterConfig}
        devices={printer.devices}
        connectedInfo={printer.connectedInfo}
        status={printer.status}
        isScanning={printer.isScanning}
        isConnecting={printer.isConnecting}
        error={printer.error}
        scanDevices={printer.scanDevices}
        connect={printer.connect}
        disconnect={printer.disconnect}
        getStatus={printer.getStatus}
      />
    </div>
  )
}
