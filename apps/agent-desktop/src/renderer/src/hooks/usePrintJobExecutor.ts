/**
 * usePrintJobExecutor — Executes a print job by rendering the card design
 * and sending it to the connected Evolis printer.
 *
 * Flow:
 * 1. Mark job as "printing" in Convex
 * 2. Fetch full design (with element data)
 * 3. Render design to BMP using off-screen Konva canvas
 * 4. Send BMP to Evolis via printFromBuffer IPC
 * 5. Mark job as "completed" or "failed"
 */

import { useCallback } from "react"
import { useConvex, useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { toast } from "sonner"
import type { usePrinter } from "./usePrinter"
import { renderDesignToBmp } from "../lib/card-renderer"
import type { CardDesign } from "../lib/card-types"

type PrinterHook = ReturnType<typeof usePrinter>

interface UsePrintJobExecutorOptions {
  printer: PrinterHook
  orgId: Id<"orgs"> | null
}

export function usePrintJobExecutor({ printer, orgId }: UsePrintJobExecutorOptions) {
  const convex = useConvex()
  const updateStatus = useMutation(api.functions.printJobs.updateStatus)

  // Fetch all jobs to get fieldValues when executing
  const jobs = useQuery(
    api.functions.printJobs.listByOrg,
    orgId ? { orgId } : "skip",
  )

  const executeJob = useCallback(
    async (jobId: string) => {
      // Find the job
      const job = (jobs as any[])?.find((j: any) => j._id === jobId)
      if (!job) {
        toast.error("Job introuvable")
        return
      }

      if (!printer.connectedInfo) {
        toast.error("Aucune imprimante connectée")
        return
      }

      try {
        // Show indeterminate progress in taskbar/dock
        window.desktopApi?.window?.setProgressBar(2)

        // 1. Mark as printing
        await updateStatus({
          jobId: jobId as Id<"printJobs">,
          status: "printing",
        })

        // 2. Load the full design from Convex (imperatively via client.query)
        let designData: CardDesign | null = null
        try {
          const fullDesign = await convex.query(
            api.functions.cardDesigns.getById,
            { designId: job.designId },
          )
          if (fullDesign) {
            designData = fullDesign as unknown as CardDesign
          }
        } catch (err) {
          console.warn("[PrintJobExecutor] Could not load design:", err)
        }

        // 3. Render to BMP
        let frontBuffer: ArrayBuffer
        let backBuffer: ArrayBuffer | undefined

        if (designData && designData.frontElements?.length > 0) {
          // Real Konva rendering
          const result = await renderDesignToBmp(
            designData,
            job.fieldValues as Record<string, string> | undefined,
          )
          frontBuffer = result.front
          backBuffer = result.back
        } else {
          // Fallback: white card (design not available)
          frontBuffer = createMinimalBmp(1016, 648)
          if (job.printDuplex) {
            backBuffer = createMinimalBmp(1016, 648)
          }
        }

        // 4. Send to printer
        const result = await printer.printFromBuffer({
          frontBuffer,
          backBuffer,
          duplex: job.printDuplex,
        })

        // 4. Update status + clear progress bar
        window.desktopApi?.window?.setProgressBar(-1)

        if (result.success) {
          await updateStatus({
            jobId: jobId as Id<"printJobs">,
            status: "completed",
          })
          toast.success("Impression terminée", {
            description: job.profileName ?? "Carte imprimée",
          })
        } else {
          await updateStatus({
            jobId: jobId as Id<"printJobs">,
            status: "failed",
            errorMessage: result.errorMessage ?? "Erreur inconnue",
          })
          toast.error("Échec d'impression", {
            description: result.errorMessage ?? "Erreur inconnue",
          })
        }
      } catch (err) {
        // Clear progress bar on error
        window.desktopApi?.window?.setProgressBar(-1)
        // Mark as failed
        try {
          await updateStatus({
            jobId: jobId as Id<"printJobs">,
            status: "failed",
            errorMessage: String(err),
          })
        } catch {
          // Ignore update failure
        }
        toast.error("Erreur d'impression", {
          description: String(err),
        })
      }
    },
    [jobs, printer, updateStatus, convex],
  )

  return { executeJob }
}

/**
 * Create a minimal 24-bit BMP file (white background)
 * Standard bottom-up format (positive height) — required by Evolis SDK
 * CR-80 card at 300 DPI = 1016 × 648 px
 */
function createMinimalBmp(width: number, height: number): ArrayBuffer {
  const rowSize = Math.ceil((width * 3) / 4) * 4 // Rows padded to 4 bytes
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize // 54 = BMP header size

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  // BMP File Header (14 bytes)
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4d) // 'M'
  view.setUint32(2, fileSize, true) // File size
  view.setUint32(6, 0, true) // Reserved
  view.setUint32(10, 54, true) // Pixel data offset

  // DIB Header (40 bytes) — BITMAPINFOHEADER
  view.setUint32(14, 40, true) // DIB header size
  view.setInt32(18, width, true) // Width
  view.setInt32(22, height, true) // Height (POSITIVE = bottom-up, required by Evolis)
  view.setUint16(26, 1, true) // Color planes
  view.setUint16(28, 24, true) // Bits per pixel
  view.setUint32(30, 0, true) // No compression (BI_RGB)
  view.setUint32(34, pixelDataSize, true) // Image size
  view.setUint32(38, 11811, true) // X pixels per meter (300 DPI)
  view.setUint32(42, 11811, true) // Y pixels per meter (300 DPI)
  view.setUint32(46, 0, true) // Colors in color table
  view.setUint32(50, 0, true) // Important color count

  // Pixel data (white) — bottom-up row order
  const pixels = new Uint8Array(buffer, 54)
  pixels.fill(0xff) // All white

  return buffer
}
