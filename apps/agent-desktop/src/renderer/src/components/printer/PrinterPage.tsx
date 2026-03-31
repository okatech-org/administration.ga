import { useState } from "react"
import { usePrinter } from "../../hooks/usePrinter"
import {
  Printer,
  Search,
  Plug,
  Unplug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileImage,
} from "lucide-react"

export function PrinterPage() {
  const {
    devices,
    connectedInfo,
    status,
    printResult,
    isScanning,
    isConnecting,
    isPrinting,
    error,
    scanDevices,
    connect,
    disconnect,
    getStatus,
    print,
  } = usePrinter()

  const [frontImagePath, setFrontImagePath] = useState("")
  const [backImagePath, setBackImagePath] = useState("")
  const [duplex, setDuplex] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Printer className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Imprimante</h1>
            <p className="text-sm text-muted-foreground">
              Gestion et test de l'imprimante Evolis
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Section: Scanner les imprimantes */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Imprimantes</h2>
            <button
              onClick={scanDevices}
              disabled={isScanning}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Search className="h-4 w-4" />
              {isScanning ? "Scan en cours..." : "Scanner"}
            </button>
          </div>

          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune imprimante détectée. Cliquez sur "Scanner".
            </p>
          ) : (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{device.displayName}</p>
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <Unplug className="h-4 w-4" />
                      Déconnecter
                    </button>
                  ) : (
                    <button
                      onClick={() => connect(device.name)}
                      disabled={isConnecting || !!connectedInfo}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <Plug className="h-4 w-4" />
                      {isConnecting ? "Connexion..." : "Connecter"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section: Infos imprimante connectée */}
        {connectedInfo && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Imprimante connectée</h2>
              <button
                onClick={getStatus}
                className="text-sm text-primary hover:underline"
              >
                Rafraîchir status
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Modèle</span>
                <p className="font-medium text-foreground">{connectedInfo.modelName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">N° série</span>
                <p className="font-medium text-foreground">{connectedInfo.serialNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Firmware</span>
                <p className="font-medium text-foreground">{connectedInfo.fwVersion}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Capabilities</span>
                <div className="flex flex-wrap gap-1">
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
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Ruban : {status.ribbon.description}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {status.ribbon.remaining} / {status.ribbon.capacity}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(status.ribbon.remaining / status.ribbon.capacity) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {status?.errors && status.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                {status.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section: Impression */}
        {connectedInfo && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">Impression</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Image recto (chemin BMP)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={frontImagePath}
                    onChange={(e) => setFrontImagePath(e.target.value)}
                    placeholder="/chemin/vers/front.bmp"
                    className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <FileImage className="mt-2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {connectedInfo.hasFlip && (
                <>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={duplex}
                      onChange={(e) => setDuplex(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    Impression recto/verso
                  </label>
                  {duplex && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Image verso (chemin BMP)</label>
                      <input
                        type="text"
                        value={backImagePath}
                        onChange={(e) => setBackImagePath(e.target.value)}
                        placeholder="/chemin/vers/back.bmp"
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => print({ frontImagePath, backImagePath: duplex ? backImagePath : undefined, duplex })}
                disabled={isPrinting || !frontImagePath}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? "Impression en cours..." : "Imprimer"}
              </button>
            </div>

            {printResult && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
                  printResult.success
                    ? "border border-green-500/20 bg-green-500/5 text-green-700"
                    : "border border-destructive/20 bg-destructive/5 text-destructive"
                }`}
              >
                {printResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {printResult.success
                  ? "Impression réussie !"
                  : `Erreur : ${printResult.errorMessage} (code ${printResult.errorCode})`}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
