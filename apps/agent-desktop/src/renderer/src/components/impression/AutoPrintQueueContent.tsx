/**
 * AutoPrintQueueContent — Automatic print queue fed by validated registrations.
 *
 * Features:
 * - Real-time aggregate counts (getPrintCounts) for totals
 * - Paginated lists (100 per page) with "Charger plus"
 * - "Tout imprimer" button to batch-print visible items
 * - Uses the org's single default card design (no dropdown)
 */

import { useState, useCallback, useRef } from "react"
import { useQuery, usePaginatedQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Printer,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Play,
  CreditCard,
  ChevronDown,
  PlayCircle,
} from "lucide-react"
import { useDirectPrint } from "../../hooks/useDirectPrint"
import { buildProfileDataFromRegistration } from "../../lib/dynamic-fields"
import type { usePrinter } from "../../hooks/usePrinter"

type PrinterHook = ReturnType<typeof usePrinter>
type SubTab = "toPrint" | "printed"

const PAGE_SIZE = 100

interface AutoPrintQueueContentProps {
  printer: PrinterHook
  isPrinterConnected: boolean
  orgId: Id<"orgs"> | null
}

export function AutoPrintQueueContent({
  printer,
  isPrinterConnected,
  orgId,
}: AutoPrintQueueContentProps) {
  const [subTab, setSubTab] = useState<SubTab>("toPrint")
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const printAllAbortRef = useRef(false)

  // ── Aggregate counts (lightweight, no enrichment) ──
  const counts = useQuery(
    api.functions.consularRegistrations.getPrintCounts,
    orgId ? { orgId } : "skip",
  )

  // ── Paginated data ──
  const {
    results: readyItems,
    status: readyStatus,
    loadMore: loadMoreReady,
  } = usePaginatedQuery(
    api.functions.consularRegistrations.getReadyForPrint,
    orgId ? { orgId } : "skip",
    { initialNumItems: PAGE_SIZE },
  )

  const {
    results: printedItems,
    status: printedStatus,
    loadMore: loadMorePrinted,
  } = usePaginatedQuery(
    api.functions.consularRegistrations.getRecentlyPrinted,
    orgId && subTab === "printed" ? { orgId } : "skip",
    { initialNumItems: PAGE_SIZE },
  )

  // ── Design ──
  const orgDesign = useQuery(
    api.functions.cardDesigns.getByOrg,
    orgId ? { orgId } : "skip",
  )

  // ── Printing ──
  const { printCard, printingId } = useDirectPrint({ printer })

  const handlePrint = useCallback(
    async (reg: any) => {
      if (!orgDesign) return
      const profileData = buildProfileDataFromRegistration(reg)
      const name =
        [reg.profile?.identity?.firstName, reg.profile?.identity?.lastName]
          .filter(Boolean)
          .join(" ") || "Carte"

      await printCard(
        reg._id as Id<"consularRegistrations">,
        orgDesign._id as Id<"cardDesigns">,
        profileData,
        name,
      )
    },
    [orgDesign, printCard],
  )

  // ── "Tout imprimer" — prints visible items one by one ──
  const handlePrintAll = useCallback(async () => {
    if (!orgDesign || readyItems.length === 0) return
    setIsPrintingAll(true)
    printAllAbortRef.current = false

    for (const reg of readyItems) {
      if (printAllAbortRef.current) break
      try {
        const profileData = buildProfileDataFromRegistration(reg)
        const name =
          [reg.profile?.identity?.firstName, reg.profile?.identity?.lastName]
            .filter(Boolean)
            .join(" ") || "Carte"
        await printCard(
          reg._id as Id<"consularRegistrations">,
          orgDesign._id as Id<"cardDesigns">,
          profileData,
          name,
        )
      } catch {
        // Individual error is handled by printCard via toast
      }
    }

    setIsPrintingAll(false)
  }, [orgDesign, readyItems, printCard])

  const handleStopPrintAll = useCallback(() => {
    printAllAbortRef.current = true
  }, [])

  // ── Derived state ──
  const readyCount = counts?.readyCount ?? 0
  const printedCount = counts?.printedCount ?? 0
  const isLoading =
    readyStatus === "LoadingFirstPage" || orgDesign === undefined
  const items = subTab === "toPrint" ? readyItems : printedItems
  const currentStatus = subTab === "toPrint" ? readyStatus : printedStatus
  const canLoadMore = currentStatus === "CanLoadMore"
  const isLoadingMore = currentStatus === "LoadingMore"

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Design info + stats */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 flex-wrap">
        {orgDesign ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted rounded-lg px-2.5 py-1">
            <CreditCard className="size-3.5 text-muted-foreground" />
            {orgDesign.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Aucun design</span>
        )}

        <div className="w-px h-5 bg-border" />

        <span className="text-xs text-muted-foreground">
          {readyCount} à imprimer · {printedCount} imprimée(s)
        </span>

        {/* "Tout imprimer" button */}
        {subTab === "toPrint" && readyItems.length > 0 && (
          <>
            <div className="w-px h-5 bg-border" />
            {isPrintingAll ? (
              <button
                onClick={handleStopPrintAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                <Loader2 className="size-3.5 animate-spin" />
                Arrêter
              </button>
            ) : (
              <button
                onClick={handlePrintAll}
                disabled={!isPrinterConnected || !orgDesign}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <PlayCircle className="size-3.5" />
                Tout imprimer ({readyItems.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* No design warning */}
      {!orgDesign && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-orange-600 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Aucun design de carte configuré. Créez-en un dans l'onglet
          "Designer".
        </div>
      )}

      {/* Sub-tabs */}
      <div className="px-4 py-3 flex gap-1 bg-muted/20">
        <button
          onClick={() => setSubTab("toPrint")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            subTab === "toPrint"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          À imprimer
          <span className="ml-1.5 text-[10px] opacity-60">({readyCount})</span>
        </button>
        <button
          onClick={() => setSubTab("printed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            subTab === "printed"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Imprimées
          <span className="ml-1.5 text-[10px] opacity-60">
            ({printedCount})
          </span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            {subTab === "toPrint" ? (
              <>
                <CheckCircle2 className="size-10 mb-3 text-green-500/30" />
                <p className="text-sm text-muted-foreground">
                  Aucune carte en attente d'impression
                </p>
              </>
            ) : currentStatus === "LoadingFirstPage" ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Printer className="size-10 mb-3 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  Aucune impression récente
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                    Citoyen
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                    N° Carte
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                    Émission
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                    Expiration
                  </th>
                  <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                    {subTab === "toPrint" ? "Action" : "Imprimé le"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((reg: any) => {
                  const firstName = reg.profile?.identity?.firstName ?? ""
                  const lastName = reg.profile?.identity?.lastName ?? ""
                  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`
                  const isPrintingThis = printingId === reg._id

                  return (
                    <tr
                      key={reg._id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {initials || <CreditCard className="size-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {firstName} {lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {reg.user?.email ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {reg.cardNumber ?? "—"}
                        </code>
                      </td>

                      <td className="py-2.5 px-4 text-muted-foreground text-xs">
                        {reg.cardIssuedAt
                          ? new Date(reg.cardIssuedAt).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </td>

                      <td className="py-2.5 px-4 text-muted-foreground text-xs">
                        {reg.cardExpiresAt
                          ? new Date(reg.cardExpiresAt).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        {subTab === "toPrint" ? (
                          <button
                            onClick={() => handlePrint(reg)}
                            disabled={
                              !isPrinterConnected ||
                              !orgDesign ||
                              isPrintingThis ||
                              isPrintingAll
                            }
                            title={
                              !isPrinterConnected
                                ? "Aucune imprimante connectée"
                                : !orgDesign
                                  ? "Aucun design configuré"
                                  : "Imprimer"
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                          >
                            {isPrintingThis ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Play className="size-3.5" />
                            )}
                            {isPrintingThis ? "Impression..." : "Imprimer"}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                            <CheckCircle2 className="size-3.5" />
                            {reg.printedAt
                              ? new Date(reg.printedAt).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Load more */}
            {canLoadMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() =>
                    subTab === "toPrint"
                      ? loadMoreReady(PAGE_SIZE)
                      : loadMorePrinted(PAGE_SIZE)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronDown className="size-4" />
                  Charger plus
                </button>
              </div>
            )}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
