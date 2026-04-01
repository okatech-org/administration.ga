import { useCallback } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { toast } from "../lib/toast"

type JobStatus = "queued" | "printing" | "completed" | "failed" | "cancelled"

export function usePrintQueue(orgId: Id<"orgs"> | null) {
  const allJobs = useQuery(
    api.functions.printJobs.listByOrg,
    orgId ? { orgId } : "skip"
  )

  const queueStats = useQuery(
    api.functions.printJobs.queueStats,
    orgId ? { orgId } : "skip"
  )

  const updateStatusMut = useMutation(api.functions.printJobs.updateStatus)
  const cancelMut = useMutation(api.functions.printJobs.cancel)
  const retryMut = useMutation(api.functions.printJobs.retry)
  const removeMut = useMutation(api.functions.printJobs.remove)

  const cancelJob = useCallback(async (jobId: Id<"printJobs">) => {
    try {
      await cancelMut({ jobId })
      toast.success("Job annulé")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'annulation")
    }
  }, [cancelMut])

  const retryJob = useCallback(async (jobId: Id<"printJobs">) => {
    try {
      await retryMut({ jobId })
      toast.success("Job remis en file")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du retry")
    }
  }, [retryMut])

  const removeJob = useCallback(async (jobId: Id<"printJobs">) => {
    try {
      await removeMut({ jobId })
      toast.success("Job supprimé")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression")
    }
  }, [removeMut])

  const updateStatus = useCallback(async (
    jobId: Id<"printJobs">,
    status: "printing" | "completed" | "failed" | "cancelled",
    errorMessage?: string,
  ) => {
    await updateStatusMut({ jobId, status, errorMessage })
  }, [updateStatusMut])

  const filterByStatus = (status?: JobStatus) => {
    if (!allJobs) return []
    if (!status) return allJobs
    return allJobs.filter((j: any) => j.status === status)
  }

  return {
    jobs: allJobs ?? [],
    stats: queueStats ?? { queued: 0, printing: 0, failed: 0, total: 0 },
    isLoading: allJobs === undefined,
    filterByStatus,
    cancelJob,
    retryJob,
    removeJob,
    updateStatus,
  }
}
