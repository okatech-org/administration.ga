import { useState, useCallback, useEffect } from "react"
import type {
  EvolisDevice,
  EvolisInfo,
  PrinterStatus,
  PrintResult,
} from "@workspace/desktop-shared/printer-types"

export function usePrinter() {
  const [devices, setDevices] = useState<EvolisDevice[]>([])
  const [connectedInfo, setConnectedInfo] = useState<EvolisInfo | null>(null)
  const [status, setStatus] = useState<PrinterStatus | null>(null)
  const [printResult, setPrintResult] = useState<PrintResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-reconnect: check if main process still has a printer connected
  useEffect(() => {
    window.desktopApi?.printer?.getConnectedInfo?.().then((info: EvolisInfo | null) => {
      if (info) {
        setConnectedInfo(info)
        // Also fetch fresh status
        window.desktopApi.printer.getStatus().then((s: PrinterStatus) => setStatus(s)).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const scanDevices = useCallback(async () => {
    setIsScanning(true)
    setError(null)
    try {
      const result = await window.desktopApi.printer.listDevices()
      setDevices(result)
    } catch (err) {
      setError(`Erreur scan : ${err}`)
    } finally {
      setIsScanning(false)
    }
  }, [])

  const connect = useCallback(async (name: string) => {
    setIsConnecting(true)
    setError(null)
    setPrintResult(null)
    try {
      const info = await window.desktopApi.printer.connect(name)
      setConnectedInfo(info)
      const s = await window.desktopApi.printer.getStatus()
      setStatus(s)
    } catch (err) {
      setError(`Erreur connexion : ${err}`)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    setError(null)
    try {
      await window.desktopApi.printer.disconnect()
      setConnectedInfo(null)
      setStatus(null)
      setPrintResult(null)
    } catch (err) {
      setError(`Erreur deconnexion : ${err}`)
    }
  }, [])

  const getStatus = useCallback(async () => {
    setError(null)
    try {
      const s = await window.desktopApi.printer.getStatus()
      setStatus(s)
    } catch (err) {
      setError(`Erreur status : ${err}`)
    }
  }, [])

  const print = useCallback(
    async (options: {
      frontImagePath: string
      backImagePath?: string
      duplex?: boolean
    }) => {
      setIsPrinting(true)
      setError(null)
      setPrintResult(null)
      try {
        const result = await window.desktopApi.printer.print(options)
        setPrintResult(result)
      } catch (err) {
        setError(`Erreur impression : ${err}`)
      } finally {
        setIsPrinting(false)
      }
    },
    []
  )

  const printFromBuffer = useCallback(
    async (options: {
      frontBuffer: ArrayBuffer
      backBuffer?: ArrayBuffer
      duplex?: boolean
    }) => {
      setIsPrinting(true)
      setError(null)
      setPrintResult(null)
      try {
        const result = await window.desktopApi.printer.printFromBuffer(options)
        setPrintResult(result)
        return result
      } catch (err) {
        setError(`Erreur impression : ${err}`)
        return { success: false, errorCode: -999, errorMessage: String(err) } as PrintResult
      } finally {
        setIsPrinting(false)
      }
    },
    []
  )

  return {
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
    printFromBuffer,
  }
}
