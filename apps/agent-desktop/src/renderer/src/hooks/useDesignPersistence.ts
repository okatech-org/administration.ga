import { useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { CardDesign } from "../lib/card-types"
import { toast } from "../lib/toast"

/**
 * Hook for persisting card designs to Convex.
 * Manages the current design ID (null = new design) and provides
 * save / load / list / delete operations.
 */
export function useDesignPersistence(orgId: Id<"orgs"> | null) {
  const [currentDesignId, setCurrentDesignId] = useState<Id<"cardDesigns"> | null>(null)

  // Queries
  const designs = useQuery(
    api.functions.cardDesigns.listByOrg,
    orgId ? { orgId } : "skip"
  )

  const currentDesignData = useQuery(
    api.functions.cardDesigns.getById,
    currentDesignId ? { designId: currentDesignId } : "skip"
  )

  // Mutations
  const createDesign = useMutation(api.functions.cardDesigns.create)
  const updateDesign = useMutation(api.functions.cardDesigns.update)
  const removeDesign = useMutation(api.functions.cardDesigns.remove)
  const duplicateDesign = useMutation(api.functions.cardDesigns.duplicate)

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
          // Create new design
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
    [orgId, currentDesignId, createDesign, updateDesign]
  )

  const loadDesign = useCallback(
    (designId: Id<"cardDesigns">) => {
      setCurrentDesignId(designId)
    },
    []
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
    [currentDesignId, removeDesign]
  )

  const duplicateDesignFn = useCallback(
    async (designId: Id<"cardDesigns">, name?: string) => {
      try {
        const newId = await duplicateDesign({ designId, name })
        setCurrentDesignId(newId)
        toast.success("Design dupliqué")
        return newId
      } catch (err: any) {
        toast.error(`Erreur : ${err?.message || err}`)
        return null
      }
    },
    [duplicateDesign]
  )

  const newDesign = useCallback(() => {
    setCurrentDesignId(null)
  }, [])

  return {
    designs: designs ?? [],
    currentDesignId,
    currentDesignData,
    isLoading: designs === undefined,
    saveDesign,
    loadDesign,
    deleteDesign,
    duplicateDesign: duplicateDesignFn,
    newDesign,
  }
}
