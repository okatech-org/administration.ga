import { useCallback, useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { CardDesign } from "../lib/card-types"
import { toast } from "../lib/toast"

/**
 * Hook for persisting card designs to Convex.
 * Single-design-per-org model: auto-loads the org's default design.
 */
export function useDesignPersistence(orgId: Id<"orgs"> | null) {
  const [currentDesignId, setCurrentDesignId] = useState<Id<"cardDesigns"> | null>(null)

  // Query the org's single default design (lightweight summary)
  const orgDesign = useQuery(
    api.functions.cardDesigns.getByOrg,
    orgId ? { orgId } : "skip",
  )

  // Full design data for the editor (loaded when currentDesignId is set)
  const currentDesignData = useQuery(
    api.functions.cardDesigns.getById,
    currentDesignId ? { designId: currentDesignId } : "skip",
  )

  // Auto-load the org's default design
  useEffect(() => {
    if (orgDesign && !currentDesignId) {
      setCurrentDesignId(orgDesign._id)
    }
  }, [orgDesign, currentDesignId])

  // Mutations
  const createDesign = useMutation(api.functions.cardDesigns.create)
  const updateDesign = useMutation(api.functions.cardDesigns.update)
  const removeDesign = useMutation(api.functions.cardDesigns.remove)

  const saveDesign = useCallback(
    async (design: CardDesign) => {
      if (!orgId) {
        toast.error("Aucune organisation sélectionnée")
        return null
      }

      try {
        if (currentDesignId) {
          // Update existing design
          await updateDesign({
            designId: currentDesignId,
            name: design.name,
            description: design.description,
            backgroundColor: design.backgroundColor,
            frontBackgroundImage: design.frontBackgroundImage,
            backBackgroundImage: design.backBackgroundImage,
            backgroundOpacity: design.backgroundOpacity,
            frontElements: design.frontElements,
            backElements: design.backElements,
            printDuplex: design.printDuplex,
            magneticTracks: design.magneticTracks,
          })
          toast.success("Design mis à jour")
          return currentDesignId
        } else {
          // Create new design (will be auto-set as default by backend)
          const id = await createDesign({
            name: design.name,
            description: design.description,
            orgId,
            backgroundColor: design.backgroundColor,
            frontBackgroundImage: design.frontBackgroundImage,
            backBackgroundImage: design.backBackgroundImage,
            backgroundOpacity: design.backgroundOpacity,
            frontElements: design.frontElements,
            backElements: design.backElements,
            printDuplex: design.printDuplex,
            magneticTracks: design.magneticTracks,
          })
          setCurrentDesignId(id)
          toast.success("Design créé")
          return id
        }
      } catch (err: any) {
        toast.error(`Erreur : ${err?.message || err}`)
        return null
      }
    },
    [orgId, currentDesignId, createDesign, updateDesign],
  )

  const deleteDesign = useCallback(
    async (designId: Id<"cardDesigns">) => {
      try {
        await removeDesign({ designId })
        if (currentDesignId === designId) {
          setCurrentDesignId(null)
        }
        toast.success("Design supprimé")
      } catch (err: any) {
        toast.error(`Erreur : ${err?.message || err}`)
      }
    },
    [currentDesignId, removeDesign],
  )

  return {
    /** The org's default design summary (null if none exists) */
    orgDesign,
    currentDesignId,
    currentDesignData,
    isLoading: orgDesign === undefined,
    /** Whether the org has a design configured */
    hasDesign: !!orgDesign,
    saveDesign,
    deleteDesign,
  }
}
