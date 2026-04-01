/**
 * PrinterConfigDialog — Modal for Evolis printer configuration
 * Extracted from the old PrinterPage. Shows device scanning, connection, status, ribbon info.
 */

import {
  AlertTriangle,
  CheckCircle,
  Plug,
  Printer,
  Search,
  Unplug,
  XCircle,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import type {
  EvolisDevice,
  EvolisInfo,
  PrinterStatus,
} from "@workspace/desktop-shared/printer-types"

interface PrinterConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Shared printer state from parent (usePrinter called in ImpressionPage)
  devices: EvolisDevice[]
  connectedInfo: EvolisInfo | null
  status: PrinterStatus | null
  isScanning: boolean
  isConnecting: boolean
  error: string | null
  scanDevices: () => void
  connect: (name: string) => void
  disconnect: () => void
  getStatus: () => void
}

export function PrinterConfigDialog({
  open,
  onOpenChange,
  devices,
  connectedInfo,
  status,
  isScanning,
  isConnecting,
  error,
  scanDevices,
  connect,
  disconnect,
  getStatus,
}: PrinterConfigDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            {t("desktop.impression.printerConfig", "Configuration imprimante")}
          </DialogTitle>
          <DialogDescription>
            {t("desktop.impression.printerConfigDesc", "Scanner, connecter et vérifier l'état de l'imprimante Evolis")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Scanner section */}
          <section className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {t("desktop.impression.printers", "Imprimantes")}
              </h3>
              <button
                onClick={scanDevices}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                {isScanning ? "Scan..." : t("desktop.impression.scan", "Scanner")}
              </button>
            </div>

            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("desktop.impression.noDevices", "Aucune imprimante détectée. Cliquez sur \"Scanner\".")}
              </p>
            ) : (
              <ul className="space-y-2">
                {devices.map((device) => (
                  <li
                    key={device.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{device.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.model} — {device.link.toUpperCase()} —{" "}
                        {device.isOnline ? (
                          <span className="text-green-600">En ligne</span>
                        ) : (
                          <span className="text-destructive">Hors ligne</span>
                        )}
                      </p>
                    </div>
                    {connectedInfo?.name === device.name ? (
                      <button
                        onClick={disconnect}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        {t("desktop.impression.disconnect", "Déconnecter")}
                      </button>
                    ) : (
                      <button
                        onClick={() => connect(device.name)}
                        disabled={isConnecting || !!connectedInfo}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <Plug className="h-3.5 w-3.5" />
                        {isConnecting ? "Connexion..." : t("desktop.impression.connect", "Connecter")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Connected printer info */}
          {connectedInfo && (
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {connectedInfo.modelName}
                </h3>
                <button
                  onClick={getStatus}
                  className="text-xs text-primary hover:underline"
                >
                  {t("desktop.impression.refresh", "Rafraîchir")}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">N° série</span>
                  <p className="font-medium text-foreground">{connectedInfo.serialNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Firmware</span>
                  <p className="font-medium text-foreground">{connectedInfo.fwVersion}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Capacités</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {connectedInfo.hasFlip && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">Duplex</span>
                    )}
                    {connectedInfo.hasMagEnc && (
                      <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600 font-medium">Mag</span>
                    )}
                    {connectedInfo.hasContactLessEnc && (
                      <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-xs text-orange-600 font-medium">NFC</span>
                    )}
                    {connectedInfo.hasSmartEnc && (
                      <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-xs text-teal-600 font-medium">Smart</span>
                    )}
                    {connectedInfo.hasLaminator && (
                      <span className="rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600 font-medium">Lamination</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ribbon status */}
              {status?.ribbon && (
                <div className="mt-4 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      Ruban : {status.ribbon.description}
                    </span>
                    <span className="text-muted-foreground">
                      {status.ribbon.remaining} / {status.ribbon.capacity}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${status.ribbon.capacity > 0 ? (status.ribbon.remaining / status.ribbon.capacity) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status?.errors && status.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {status.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
