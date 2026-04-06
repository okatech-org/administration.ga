/**
 * AutoPrintQueueContent — Automatic print queue fed by validated registrations.
 *
 * Shows two sub-tabs:
 * - "À imprimer": registrations with a card number but not yet printed
 * - "Imprimées": recently printed registrations
 *
 * Uses the org's single default card design (no design selector dropdown).
 */

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Printer,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Play,
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
  // Only fetch printed list when the user views that tab
  const recentlyPrinted = useQuery(
    api.functions.consularRegistrations.getRecentlyPrinted,
    orgId && subTab === "printed" ? { orgId } : "skip",
  )

  // Org's default card design (single-design-per-org)
  const orgDesign = useQuery(
    api.functions.cardDesigns.getByOrg,
    orgId ? { orgId } : "skip",
  )

  // Printing
  const { printCard, printingId } = useDirectPrint({ printer })

  const handlePrint = async (reg: any) => {
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
  }

  // Loading (only wait for the active tab's data)
  const isLoading =
    readyForPrint === undefined ||
    orgDesign === undefined ||
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
      {/* Design info + stats */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 flex-wrap">
        {/* Design info (read-only) */}
        {orgDesign ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted rounded-lg px-2.5 py-1">
            <CreditCard className="size-3.5 text-muted-foreground" />
            {orgDesign.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Aucun design</span>
        )}

        <div className="w-px h-5 bg-border" />

        {/* Stats */}
        <span className="text-xs text-muted-foreground">
          {toPrintCount} à imprimer · {printedCount} imprimée(s)
        </span>
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
          {toPrintCount > 0 && (
            <span className="ml-1.5 text-[10px] opacity-60">
              ({toPrintCount})
            </span>
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
            <span className="ml-1.5 text-[10px] opacity-60">
              ({printedCount})
            </span>
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
                        ? new Date(reg.cardIssuedAt).toLocaleDateString(
                            "fr-FR",
                          )
                        : "—"}
                    </td>

                    {/* Expiry date */}
                    <td className="py-2.5 px-4 text-muted-foreground text-xs">
                      {reg.cardExpiresAt
                        ? new Date(reg.cardExpiresAt).toLocaleDateString(
                            "fr-FR",
                          )
                        : "—"}
                    </td>

                    {/* Action / Printed date */}
                    <td className="py-2.5 px-4 text-right">
                      {subTab === "toPrint" ? (
                        <button
                          onClick={() => handlePrint(reg)}
                          disabled={
                            !isPrinterConnected || !orgDesign || isPrintingThis
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
        )}
      </div>
    </div>
  )
}
