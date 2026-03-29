import { useState } from "react"
import { usePrinter } from "./hooks/usePrinter"
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

export function App() {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Printer className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Agent Desktop — Test Imprimante
            </h1>
            <p className="text-sm text-gray-500">
              Phase 1 : Detection et impression Evolis
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Section: Scanner les imprimantes */}
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Imprimantes
            </h2>
            <button
              onClick={scanDevices}
              disabled={isScanning}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isScanning ? "Scan en cours..." : "Scanner"}
            </button>
          </div>

          {devices.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucune imprimante detectee. Cliquez sur "Scanner".
            </p>
          ) : (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {device.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {device.model} — {device.link.toUpperCase()} —{" "}
                      {device.isOnline ? (
                        <span className="text-green-600">En ligne</span>
                      ) : (
                        <span className="text-red-600">Hors ligne</span>
                      )}
                    </p>
                  </div>
                  {connectedInfo?.name === device.name ? (
                    <button
                      onClick={disconnect}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Unplug className="h-4 w-4" />
                      Deconnecter
                    </button>
                  ) : (
                    <button
                      onClick={() => connect(device.name)}
                      disabled={isConnecting || !!connectedInfo}
                      className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
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

        {/* Section: Infos imprimante connectee */}
        {connectedInfo && (
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Imprimante connectee
              </h2>
              <button
                onClick={getStatus}
                className="text-sm text-blue-600 hover:underline"
              >
                Rafraichir status
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Modele</span>
                <p className="font-medium">{connectedInfo.modelName}</p>
              </div>
              <div>
                <span className="text-gray-500">N° serie</span>
                <p className="font-medium">{connectedInfo.serialNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Firmware</span>
                <p className="font-medium">{connectedInfo.fwVersion}</p>
              </div>
              <div>
                <span className="text-gray-500">Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {connectedInfo.hasFlip && (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      Duplex
                    </span>
                  )}
                  {connectedInfo.hasMagEnc && (
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                      Mag
                    </span>
                  )}
                  {connectedInfo.hasContactLessEnc && (
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      NFC
                    </span>
                  )}
                  {connectedInfo.hasSmartEnc && (
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-700">
                      Smart
                    </span>
                  )}
                  {connectedInfo.hasLaminator && (
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                      Lamination
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ribbon status */}
            {status?.ribbon && (
              <div className="mt-4 rounded-md border bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Ruban : {status.ribbon.description}
                  </span>
                  <span className="text-sm text-gray-600">
                    {status.ribbon.remaining} / {status.ribbon.capacity}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${(status.ribbon.remaining / status.ribbon.capacity) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Errors */}
            {status?.errors && status.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                {status.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-red-700"
                  >
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
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Impression
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Image recto (chemin BMP)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={frontImagePath}
                    onChange={(e) => setFrontImagePath(e.target.value)}
                    placeholder="/chemin/vers/front.bmp"
                    className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <FileImage className="mt-2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {connectedInfo.hasFlip && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={duplex}
                      onChange={(e) => setDuplex(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Impression recto/verso
                  </label>

                  {duplex && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Image verso (chemin BMP)
                      </label>
                      <input
                        type="text"
                        value={backImagePath}
                        onChange={(e) => setBackImagePath(e.target.value)}
                        placeholder="/chemin/vers/back.bmp"
                        className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() =>
                  print({
                    frontImagePath,
                    backImagePath: duplex ? backImagePath : undefined,
                    duplex,
                  })
                }
                disabled={isPrinting || !frontImagePath}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? "Impression en cours..." : "Imprimer"}
              </button>
            </div>

            {/* Print result */}
            {printResult && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-md p-3 text-sm ${
                  printResult.success
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {printResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                {printResult.success
                  ? "Impression reussie !"
                  : `Erreur : ${printResult.errorMessage} (code ${printResult.errorCode})`}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
