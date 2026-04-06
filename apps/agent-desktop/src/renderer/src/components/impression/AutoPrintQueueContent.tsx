/**
 * AutoPrintQueueContent — Automatic print queue fed by validated registrations.
 *
 * Shows two sub-tabs:
 * - "À imprimer": registrations with a card number but not yet printed
 * - "Imprimées": recently printed registrations
 *
 * Replaces the manual printJobs-based PrintQueueContent for the main queue tab.
 */

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Printer,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Play,
  Palette,
  CreditCard,
} from "lucide-react"
import { useDirectPrint } from "../../hooks/useDirectPrint"
import { buildProfileDataFromRegistration } from "../../lib/dynamic-fields"
import type { usePrinter } from "../../hooks/usePrinter"

type PrinterHook = ReturnType<typeof usePrinter>
type SubTab = "toPrint" | "printed"

interface AutoPrintQueueContentProps {
  printer: PrinterHook
  isPrinterConnected: boolean
  orgId: Id<"orgs"> | null
}

const DESIGN_STORAGE_KEY = "printDesignId"

export function AutoPrintQueueContent({
  printer,
  isPrinterConnected,
  orgId,
}: AutoPrintQueueContentProps) {
  const [subTab, setSubTab] = useState<SubTab>("toPrint")

  // Data sources
  const readyForPrint = useQuery(
    api.functions.consularRegistrations.getReadyForPrint,
    orgId ? { orgId } : "skip",
  )
  // Only fetch printed list when the user views that tab (avoids crash if function not deployed yet)
  const recentlyPrinted = useQuery(
    api.functions.consularRegistrations.getRecentlyPrinted,
    orgId && subTab === "printed" ? { orgId } : "skip",
  )
  const designs = useQuery(
    api.functions.cardDesigns.listByOrg,
    orgId ? { orgId } : "skip",
  )

  // Design selection (persisted in localStorage)
  const [selectedDesignId, setSelectedDesignId] = useState<string>("")

  useEffect(() => {
    if (!orgId) return
    const saved = localStorage.getItem(`${DESIGN_STORAGE_KEY}:${orgId}`)
    if (saved && designs?.some((d: any) => d._id === saved)) {
      setSelectedDesignId(saved)
    } else if (designs?.length === 1) {
      setSelectedDesignId(designs[0]._id)
    }
  }, [designs, orgId])

  const handleDesignChange = (id: string) => {
    setSelectedDesignId(id)
    if (orgId) {
      localStorage.setItem(`${DESIGN_STORAGE_KEY}:${orgId}`, id)
    }
  }

  // Printing
  const { printCard, printingId } = useDirectPrint({ printer })

  const handlePrint = async (reg: any) => {
    if (!selectedDesignId) return
    const profileData = buildProfileDataFromRegistration(reg)
    const name = [
      reg.profile?.identity?.firstName,
      reg.profile?.identity?.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Carte"

    await printCard(
      reg._id as Id<"consularRegistrations">,
      selectedDesignId as Id<"cardDesigns">,
      profileData,
      name,
    )
  }

  // Loading (only wait for the active tab's data)
  const isLoading =
    readyForPrint === undefined ||
    (subTab === "printed" && recentlyPrinted === undefined)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const toPrintCount = readyForPrint.length
  const printedCount = recentlyPrinted?.length ?? 0
  const items = subTab === "toPrint" ? readyForPrint : (recentlyPrinted ?? [])

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Design selector + stats */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 flex-wrap">
        {/* Design picker */}
        <div className="flex items-center gap-2 text-sm">
          <Palette className="size-4 text-muted-foreground" />
          {designs && designs.length > 0 ? (
            <select
              value={selectedDesignId}
              onChange={(e) => handleDesignChange(e.target.value)}
              className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Choisir un design...</option>
              {designs.map((d: any) => (
                <option key={d._id} value={d._id}>
                  {d.name || "Sans nom"}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun design</span>
          )}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Stats */}
        <span className="text-xs text-muted-foreground">
          {toPrintCount} à imprimer · {printedCount} imprimée(s)
        </span>
      </div>

      {/* No design warning */}
      {!selectedDesignId && designs && designs.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-orange-600 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Sélectionnez un design de carte pour pouvoir imprimer.
        </div>
      )}

      {designs && designs.length === 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-orange-600 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Aucun design de carte. Créez-en un dans l'onglet "Designer".
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
          {toPrintCount > 0 && (
            <span className="ml-1.5 text-[10px] opacity-60">({toPrintCount})</span>
          )}
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
          {printedCount > 0 && (
            <span className="ml-1.5 text-[10px] opacity-60">({printedCount})</span>
          )}
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
                    {/* Citizen */}
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

                    {/* Card number */}
                    <td className="py-2.5 px-4">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {reg.cardNumber ?? "—"}
                      </code>
                    </td>

                    {/* Issue date */}
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {reg.cardIssuedAt
                        ? new Date(reg.cardIssuedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>

                    {/* Expiry date */}
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {reg.cardExpiresAt
                        ? new Date(reg.cardExpiresAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>

                    {/* Action / Printed date */}
                    <td className="py-2.5 px-4 text-right">
                      {subTab === "toPrint" ? (
                        <button
                          onClick={() => handlePrint(reg)}
                          disabled={
                            !isPrinterConnected ||
                            !selectedDesignId ||
                            isPrintingThis
                          }
                          title={
                            !isPrinterConnected
                              ? "Aucune imprimante connectée"
                              : !selectedDesignId
                                ? "Sélectionnez un design"
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
                            ? new Date(reg.printedAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
