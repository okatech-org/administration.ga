/**
 * useDirectPrint — Renders a card and sends it to the Evolis printer
 * without going through the printJobs intermediary table.
 *
 * Flow:
 * 1. Load the card design from Convex
 * 2. Render design to BMP via off-screen Konva canvas
 * 3. Send BMP to Evolis printer
 * 4. On success, mark the registration as printed
 */

import { useCallback, useState } from "react"
import { useConvex, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { toast } from "sonner"
import type { usePrinter } from "./usePrinter"
import { renderDesignToBmp } from "../lib/card-renderer"
import type { CardDesign } from "../lib/card-types"
import type { CitizenProfileData } from "../lib/dynamic-fields"

type PrinterHook = ReturnType<typeof usePrinter>

interface UseDirectPrintOptions {
  printer: PrinterHook
}

export function useDirectPrint({ printer }: UseDirectPrintOptions) {
  const convex = useConvex()
  const markAsPrinted = useMutation(api.functions.consularRegistrations.markAsPrinted)
  const [printingId, setPrintingId] = useState<string | null>(null)

  const printCard = useCallback(
    async (
      registrationId: Id<"consularRegistrations">,
      designId: Id<"cardDesigns">,
      profileData: CitizenProfileData,
      profileName: string,
    ) => {
      if (!printer.connectedInfo) {
        toast.error("Aucune imprimante connectée")
        return false
      }

      setPrintingId(registrationId)

      try {
        // Show indeterminate progress in taskbar/dock
        window.desktopApi?.window?.setProgressBar(2)

        // 1. Load the full design
        const fullDesign = await convex.query(
          api.functions.cardDesigns.getById,
          { designId },
        )
        if (!fullDesign) {
          toast.error("Design introuvable")
          return false
        }
        const design = fullDesign as unknown as CardDesign

        // 2. Render to BMP
        const result = await renderDesignToBmp(design, undefined, profileData)

        // 2b. Save debug BMP (if API available)
        try {
          const printerApi = window.desktopApi?.printer as any
          if (printerApi?.saveDebugBmp) {
            await printerApi.saveDebugBmp({
              frontBuffer: result.front,
              backBuffer: result.back,
              label: profileName.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 40),
            })
          }
        } catch (dbgErr) {
          console.warn("[DirectPrint] Debug BMP save failed:", dbgErr)
        }

        // 3. Send to printer
        console.log(`[DirectPrint] Sending to printer: front=${result.front.byteLength} bytes, duplex=${design.printDuplex}`)
        const printResult = await printer.printFromBuffer({
          frontBuffer: result.front,
          backBuffer: result.back,
          duplex: design.printDuplex ?? false,
        })
        console.log("[DirectPrint] Print result:", JSON.stringify(printResult))

        // Clear progress bar
        window.desktopApi?.window?.setProgressBar(-1)

        if (printResult.success) {
          // 4. Mark as printed in Convex
          await markAsPrinted({ registrationId })
          toast.success("Carte imprimée", { description: profileName })
          return true
        } else {
          toast.error("Échec d'impression", {
            description: printResult.errorMessage ?? "Erreur inconnue",
          })
          return false
        }
      } catch (err) {
        window.desktopApi?.window?.setProgressBar(-1)
        toast.error("Erreur d'impression", { description: String(err) })
        return false
      } finally {
        setPrintingId(null)
      }
    },
    [printer, convex, markAsPrinted],
  )

  return { printCard, printingId }
}
