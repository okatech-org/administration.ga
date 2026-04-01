/**
 * PrintQueueContent — Print job queue table (embedded in ImpressionPage)
 * Adapted from PrintQueuePage — same UI, but not a standalone page.
 */

import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Printer,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useOrg } from "../../hooks/useOrg"
import { usePrintQueue } from "../../hooks/usePrintQueue"

type Tab = "all" | "queued" | "printing" | "completed" | "failed"

const tabs: { id: Tab; labelKey: string }[] = [
  { id: "all", labelKey: "desktop.impression.tabs.all" },
  { id: "queued", labelKey: "desktop.impression.tabs.queued" },
  { id: "printing", labelKey: "desktop.impression.tabs.printing" },
  { id: "completed", labelKey: "desktop.impression.tabs.completed" },
  { id: "failed", labelKey: "desktop.impression.tabs.failed" },
]

interface PrintQueueContentProps {
  onPrintJob?: (jobId: string) => Promise<void>
  isPrinterConnected: boolean
}

export function PrintQueueContent({ onPrintJob, isPrinterConnected }: PrintQueueContentProps) {
  const { t } = useTranslation()
  const { orgId, isLoading: orgLoading } = useOrg()
  const { jobs, stats, isLoading, filterByStatus, cancelJob, retryJob, removeJob } = usePrintQueue(orgId)
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [printingJobId, setPrintingJobId] = useState<string | null>(null)

  if (orgLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filteredJobs = activeTab === "all" ? jobs : filterByStatus(activeTab)

  const handlePrint = async (jobId: string) => {
    if (!onPrintJob) return
    setPrintingJobId(jobId)
    try {
      await onPrintJob(jobId)
    } finally {
      setPrintingJobId(null)
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Stats line */}
      <div className="px-4 py-3 text-sm text-muted-foreground border-b border-border/50">
        {stats.queued} {t("desktop.impression.queued", "en attente")} · {stats.printing} {t("desktop.impression.printing", "en cours")} · {stats.failed} {t("desktop.impression.failed", "échoués")}
      </div>

      {/* Status filter tabs */}
      <div className="px-4 py-3 flex gap-1 bg-muted/20">
        {tabs.map((tab) => {
          const count = tab.id === "all" ? jobs.length : filterByStatus(tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {t(tab.labelKey, tab.id)}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Printer className="size-10 mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {t("desktop.impression.noJobs", "Aucun job dans cette catégorie")}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                  {t("desktop.impression.profile", "Profil")}
                </th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                  {t("desktop.impression.design", "Design")}
                </th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                  {t("desktop.impression.priority", "Priorité")}
                </th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                  {t("desktop.impression.status", "Statut")}
                </th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                  {t("desktop.impression.copies", "Copies")}
                </th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                  {t("desktop.impression.date", "Date")}
                </th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job: any) => (
                <tr key={job._id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 px-4 text-foreground font-medium">{job.profileName || "—"}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{job.designName}</td>
                  <td className="py-2.5 px-4">
                    <PriorityBadge priority={job.priority} />
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{job.copies}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground text-xs">
                    {formatDate(job.queuedAt)}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {job.status === "queued" && (
                        <>
                          <ActionButton
                            icon={Play}
                            title={t("desktop.impression.print", "Imprimer")}
                            onClick={() => handlePrint(job._id)}
                            disabled={!isPrinterConnected || printingJobId === job._id}
                            loading={printingJobId === job._id}
                          />
                          <ActionButton
                            icon={X}
                            title={t("desktop.impression.cancel", "Annuler")}
                            onClick={() => cancelJob(job._id)}
                          />
                        </>
                      )}
                      {job.status === "failed" && (
                        <ActionButton
                          icon={RotateCcw}
                          title={t("desktop.impression.retry", "Réessayer")}
                          onClick={() => retryJob(job._id)}
                        />
                      )}
                      {(job.status === "completed" || job.status === "cancelled" || job.status === "failed") && (
                        <ActionButton
                          icon={Trash2}
                          title={t("desktop.impression.remove", "Supprimer")}
                          onClick={() => removeJob(job._id)}
                          destructive
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// --- Sub-components ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    queued: { label: "En attente", className: "bg-blue-50 text-blue-700", icon: Clock },
    printing: { label: "Impression", className: "bg-amber-50 text-amber-700", icon: Loader2 },
    completed: { label: "Terminé", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
    failed: { label: "Échoué", className: "bg-red-50 text-red-700", icon: AlertTriangle },
    cancelled: { label: "Annulé", className: "bg-gray-100 text-gray-600", icon: X },
  }
  const c = config[status] || config.queued
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.className}`}>
      <c.icon className="size-3" />
      {c.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; className: string }> = {
    normal: { label: "Normal", className: "bg-gray-100 text-gray-600" },
    high: { label: "Haute", className: "bg-amber-50 text-amber-700" },
    urgent: { label: "Urgent", className: "bg-red-50 text-red-700" },
  }
  const c = config[priority] || config.normal
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.className}`}>
      {c.label}
    </span>
  )
}

function ActionButton({
  icon: Icon,
  title,
  onClick,
  destructive,
  disabled,
  loading,
}: {
  icon: React.ElementType
  title: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`size-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40
        ${destructive
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }
      `}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
    </button>
  )
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
