import { useCallback, useEffect, useRef, useState } from "react"
import { useConvexAuth } from "convex/react"
import type Konva from "konva"
import { useCardDesigner } from "../../hooks/useCardDesigner"
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts"
import { useDesignPersistence } from "../../hooks/useDesignPersistence"
import { useOrg } from "../../hooks/useOrg"
import type { CardElement, ElementType } from "../../lib/card-types"
import { createDefaultElement } from "../../lib/card-types"
import { canvasToBmp } from "../../lib/bmp-encoder"
import { SAMPLE_PROFILES, type CitizenProfileData } from "../../lib/dynamic-fields"
import { DesignerCanvas } from "./DesignerCanvas"
import { DesignerToolbar } from "./DesignerToolbar"
import { PropertiesPanel } from "./PropertiesPanel"
import { DesignListDialog } from "./DesignListDialog"
import { toast } from "../../lib/toast"

export function CardDesigner() {
  const stageRef = useRef<Konva.Stage>(null)
  const [zoom, setZoom] = useState(0.7)
  const [clipboard, setClipboard] = useState<CardElement | null>(null)
  const [showDesignList, setShowDesignList] = useState(false)

  // Preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewProfile, setPreviewProfile] = useState<CitizenProfileData | null>(
    SAMPLE_PROFILES[0].data
  )

  // Auth & org
  const { isAuthenticated } = useConvexAuth()
  const { orgId } = useOrg()

  // Card designer state (local reducer + undo/redo)
  const {
    state,
    elements,
    selectedElement,
    dispatch,
    addElement,
    updateElement,
    removeElement,
    selectElement,
    duplicateElement,
    getDesignForSave,
    canUndo,
    canRedo,
  } = useCardDesigner()

  // Convex persistence
  const persistence = useDesignPersistence(orgId)

  // Load design from Convex when selected
  useEffect(() => {
    if (persistence.currentDesignData) {
      const d = persistence.currentDesignData
      dispatch({
        type: "LOAD_DESIGN",
        design: {
          name: d.name,
          description: d.description,
          backgroundColor: d.backgroundColor,
          frontBackgroundImage: d.frontBackgroundImage,
          backBackgroundImage: d.backBackgroundImage,
          backgroundOpacity: d.backgroundOpacity,
          frontElements: d.frontElements as CardElement[],
          backElements: d.backElements as CardElement[],
          printDuplex: d.printDuplex,
          magneticTracks: d.magneticTracks,
          version: d.version,
        },
      })
    }
  }, [persistence.currentDesignData, dispatch])

  const handleAddDynamicField = useCallback(
    (fieldKey: string, type: ElementType) => {
      const el = createDefaultElement(type)
      el.isDynamicField = true
      el.fieldKey = fieldKey
      if (type === "text") {
        el.textContent = `{${fieldKey}}`
      }
      dispatch({ type: "ADD_ELEMENT", element: el })
    },
    [dispatch]
  )

  const handleSave = useCallback(async () => {
    const design = getDesignForSave()

    // Try Convex first, fall back to localStorage
    if (isAuthenticated && orgId) {
      await persistence.saveDesign(design)
    } else {
      // Offline fallback — localStorage
      const saved = JSON.parse(localStorage.getItem("card-designs") ?? "[]")
      const existingIdx = saved.findIndex((d: any) => d.name === design.name)
      if (existingIdx >= 0) {
        saved[existingIdx] = design
      } else {
        saved.push(design)
      }
      localStorage.setItem("card-designs", JSON.stringify(saved))
      toast.success("Design sauvegardé localement")
    }
  }, [getDesignForSave, isAuthenticated, orgId, persistence])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleExportBmp = useCallback(
    async (face: "front" | "back" = "front") => {
      if (!stageRef.current) return
      if (face !== state.activeFace) {
        dispatch({ type: "SET_ACTIVE_FACE", face })
        await new Promise((r) => setTimeout(r, 100))
      }
      const canvas = stageRef.current.toCanvas({ pixelRatio: 1 })
      const bmp = canvasToBmp(canvas)
      const blob = new Blob([bmp], { type: "image/bmp" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${state.name.replace(/\s+/g, "_")}_${face}.bmp`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`BMP ${face} exporté`)
    },
    [state.activeFace, state.name, dispatch]
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handlePrint = useCallback(async () => {
    if (!stageRef.current) return
    dispatch({ type: "SET_ACTIVE_FACE", face: "front" })
    dispatch({ type: "SELECT_ELEMENT", id: null })
    await new Promise((r) => setTimeout(r, 150))
    const frontCanvas = stageRef.current.toCanvas({ pixelRatio: 1 })
    const _frontBmp = canvasToBmp(frontCanvas)
    const frontPath = `/tmp/card_front_${Date.now()}.bmp`
    try {
      const result = await window.desktopApi.printer.print({
        frontImagePath: frontPath,
        duplex: false,
      })
      if (result.success) {
        toast.success("Impression lancée !")
      } else {
        toast.error(`Erreur : ${result.errorMessage}`)
      }
    } catch (err) {
      toast.error(`Erreur impression: ${err}`)
    }
  }, [dispatch])

  // --- Copy / Paste ---
  const handleCopy = useCallback(() => {
    if (selectedElement) {
      setClipboard({ ...selectedElement })
      toast.info("Copié")
    }
  }, [selectedElement])

  const handlePaste = useCallback(() => {
    if (!clipboard) return
    const el = createDefaultElement(clipboard.type)
    Object.assign(el, {
      ...clipboard,
      id: el.id,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
    })
    dispatch({ type: "ADD_ELEMENT", element: el })
    toast.info("Collé")
  }, [clipboard, dispatch])

  // --- Zoom ---
  const zoomIn = useCallback(() => setZoom((z) => Math.min(2, z + 0.1)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.3, z - 0.1)), [])
  const zoomReset = useCallback(() => setZoom(0.7), [])

  // --- Preview toggle ---
  const togglePreview = useCallback(() => {
    setIsPreviewMode((prev) => !prev)
  }, [])

  // --- Keyboard shortcuts ---
  useKeyboardShortcuts({
    selectedElement,
    elements,
    onUpdateElement: updateElement,
    onRemoveElement: removeElement,
    onDuplicateElement: duplicateElement,
    onSelectElement: selectElement,
    onMoveLayer: (id, dir) => dispatch({ type: "MOVE_LAYER", id, direction: dir }),
    onUndo: () => dispatch({ type: "UNDO" }),
    onRedo: () => dispatch({ type: "REDO" }),
    onSave: handleSave,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomReset: zoomReset,
    onCopy: handleCopy,
    onPaste: handlePaste,
  })

  const backgroundImage =
    state.activeFace === "front" ? state.frontBackgroundImage : state.backBackgroundImage

  return (
    <div className="flex flex-col h-full">
      <DesignerToolbar
        name={state.name}
        activeFace={state.activeFace}
        printDuplex={state.printDuplex}
        selectedElementId={state.selectedElementId}
        canUndo={canUndo}
        canRedo={canRedo}
        onSetName={(name) => dispatch({ type: "SET_NAME", name })}
        onSetActiveFace={(face) => dispatch({ type: "SET_ACTIVE_FACE", face })}
        onSetDuplex={(duplex) => dispatch({ type: "SET_DUPLEX", duplex })}
        onAddElement={addElement}
        onAddDynamicField={handleAddDynamicField}
        onDuplicateElement={() => state.selectedElementId && duplicateElement(state.selectedElementId)}
        onRemoveElement={() => state.selectedElementId && removeElement(state.selectedElementId)}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onSave={handleSave}
        isPreviewMode={isPreviewMode}
        onTogglePreview={togglePreview}
        previewProfile={previewProfile}
        onSelectPreviewProfile={setPreviewProfile}
        onOpenDesignList={() => setShowDesignList(true)}
        isConnected={isAuthenticated}
      />

      <div className="flex flex-1 overflow-hidden">
        <DesignerCanvas
          elements={elements}
          selectedElementId={isPreviewMode ? null : state.selectedElementId}
          backgroundColor={state.backgroundColor}
          backgroundImage={backgroundImage}
          backgroundOpacity={state.backgroundOpacity}
          activeFace={state.activeFace}
          onSelectElement={isPreviewMode ? () => {} : selectElement}
          onUpdateElement={updateElement}
          stageRef={stageRef}
          zoom={zoom}
          onZoomChange={setZoom}
          previewProfile={isPreviewMode ? previewProfile : undefined}
        />

        {!isPreviewMode && (
          <PropertiesPanel
            element={selectedElement}
            backgroundColor={state.backgroundColor}
            backgroundOpacity={state.backgroundOpacity}
            onUpdateElement={updateElement}
            onMoveLayer={(id, dir) => dispatch({ type: "MOVE_LAYER", id, direction: dir })}
            onSetBackgroundColor={(color) => dispatch({ type: "SET_BACKGROUND_COLOR", color })}
            onSetBackgroundOpacity={(opacity) => dispatch({ type: "SET_BACKGROUND_OPACITY", opacity })}
          />
        )}
      </div>

      {/* Shortcuts help — subtle hint at bottom */}
      <div className="flex items-center justify-center gap-6 px-4 py-1.5 bg-muted/50 border-t border-border text-[10px] text-muted-foreground/60">
        <span>⌘S Sauvegarder</span>
        <span>⌘Z/⌘⇧Z Annuler/Rétablir</span>
        <span>⌘D Dupliquer</span>
        <span>⌘C/⌘V Copier/Coller</span>
        <span>↑↓←→ Déplacer (⇧×10)</span>
        <span>⌥+↑↓←→ Redimensionner</span>
        <span>Del Supprimer</span>
        <span>Tab Élément suivant</span>
        <span>⌘[/] Ordre</span>
        <span>⌘+/- Zoom</span>
      </div>

      {/* Design list dialog */}
      <DesignListDialog
        open={showDesignList}
        onClose={() => setShowDesignList(false)}
        designs={persistence.designs as any}
        currentDesignId={persistence.currentDesignId}
        isLoading={persistence.isLoading}
        onLoad={(id) => {
          persistence.loadDesign(id)
          setShowDesignList(false)
        }}
        onDelete={persistence.deleteDesign}
        onDuplicate={persistence.duplicateDesign}
        onNew={() => {
          persistence.newDesign()
          dispatch({
            type: "LOAD_DESIGN",
            design: {
              name: "Nouveau design",
              backgroundColor: "#ffffff",
              frontBackgroundImage: null,
              backBackgroundImage: null,
              backgroundOpacity: 1,
              frontElements: [],
              backElements: [],
              printDuplex: false,
              magneticTracks: ["", "", ""],
              version: 1,
            },
          })
          setShowDesignList(false)
        }}
        onNewFromTemplate={(design) => {
          persistence.newDesign()
          dispatch({ type: "LOAD_DESIGN", design })
          setShowDesignList(false)
        }}
      />
    </div>
  )
}
