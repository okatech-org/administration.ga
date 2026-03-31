import {
  Circle,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FolderOpen,
  Image,
  Minus,
  QrCode,
  Redo2,
  RectangleHorizontal,
  Save,
  Trash2,
  Type,
  Undo2,
  ChevronDown,
  Cloud,
  CloudOff,
} from "lucide-react"
import type { ActiveFace, ElementType } from "../../lib/card-types"
import { getFieldsByCategory, SAMPLE_PROFILES, type CitizenProfileData } from "../../lib/dynamic-fields"
import { useState } from "react"

interface DesignerToolbarProps {
  name: string
  activeFace: ActiveFace
  printDuplex: boolean
  selectedElementId: string | null
  canUndo: boolean
  canRedo: boolean
  onSetName: (name: string) => void
  onSetActiveFace: (face: ActiveFace) => void
  onSetDuplex: (duplex: boolean) => void
  onAddElement: (type: ElementType) => void
  onAddDynamicField: (fieldKey: string, type: ElementType) => void
  onDuplicateElement: () => void
  onRemoveElement: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  // Preview
  isPreviewMode: boolean
  onTogglePreview: () => void
  previewProfile: CitizenProfileData | null
  onSelectPreviewProfile: (profile: CitizenProfileData | null) => void
  // Design list
  onOpenDesignList: () => void
  isConnected: boolean
}

export function DesignerToolbar({
  name,
  activeFace,
  printDuplex,
  selectedElementId,
  canUndo,
  canRedo,
  onSetName,
  onSetActiveFace,
  onSetDuplex,
  onAddElement,
  onAddDynamicField,
  onDuplicateElement,
  onRemoveElement,
  onUndo,
  onRedo,
  onSave,
  isPreviewMode,
  onTogglePreview,
  previewProfile,
  onSelectPreviewProfile,
  onOpenDesignList,
  isConnected,
}: DesignerToolbarProps) {
  const [showFieldMenu, setShowFieldMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const fieldGroups = getFieldsByCategory()

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0">
      {/* Design list / Open */}
      <button
        onClick={onOpenDesignList}
        className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Ouvrir un design"
      >
        <FolderOpen className="size-4" />
      </button>

      {/* Design name */}
      <input
        type="text"
        value={name}
        onChange={(e) => onSetName(e.target.value)}
        className="text-sm font-semibold bg-transparent border-none outline-none w-40 text-foreground placeholder:text-muted-foreground"
        placeholder="Nom du design..."
      />

      {/* Connection indicator */}
      <span title={isConnected ? "Connecté au cloud" : "Hors ligne"}>
        {isConnected ? (
          <Cloud className="size-3.5 text-primary/60" />
        ) : (
          <CloudOff className="size-3.5 text-muted-foreground/40" />
        )}
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Face toggle */}
      <div className="flex bg-muted rounded-lg p-0.5">
        <button
          onClick={() => onSetActiveFace("front")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
            ${activeFace === "front"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Recto
        </button>
        <button
          onClick={() => {
            onSetActiveFace("back")
            if (!printDuplex) onSetDuplex(true)
          }}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
            ${activeFace === "back"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Verso
        </button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Add elements */}
      <ToolButton icon={Type} label="Texte" onClick={() => onAddElement("text")} />
      <ToolButton icon={Image} label="Image" onClick={() => onAddElement("image")} />
      <ToolButton icon={RectangleHorizontal} label="Rectangle" onClick={() => onAddElement("rectangle")} />
      <ToolButton icon={Circle} label="Cercle" onClick={() => onAddElement("circle")} />
      <ToolButton icon={Minus} label="Ligne" onClick={() => onAddElement("line")} />
      <ToolButton icon={QrCode} label="QR Code" onClick={() => onAddElement("qrCode")} />

      {/* Dynamic fields */}
      <div className="relative">
        <button
          onClick={() => setShowFieldMenu(!showFieldMenu)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg
            border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
        >
          <FlipHorizontal2 className="size-3.5" />
          Champ dynamique
        </button>
        {showFieldMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFieldMenu(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 w-56 max-h-72 overflow-y-auto">
              {Object.entries(fieldGroups).map(([category, fields]) => (
                <div key={category}>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground/60 px-2 pt-2 pb-1">
                    {category}
                  </p>
                  {fields.map((field) => (
                    <button
                      key={field.key}
                      onClick={() => {
                        const type = field.key === "citizen.photo" ? "image" : "text"
                        onAddDynamicField(field.key, type)
                        setShowFieldMenu(false)
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      {field.label}
                      <span className="text-muted-foreground ml-1">— {field.preview || "📷"}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Preview mode */}
      <div className="flex items-center gap-1">
        <button
          onClick={onTogglePreview}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors
            ${isPreviewMode
              ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          title="Aperçu avec données (⌘P)"
        >
          {isPreviewMode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {isPreviewMode ? "Quitter aperçu" : "Aperçu"}
        </button>

        {isPreviewMode && (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              <span className="max-w-28 truncate">
                {previewProfile
                  ? `${previewProfile.firstName} ${previewProfile.lastName}`
                  : "Profil..."}
              </span>
              <ChevronDown className="size-3" />
            </button>
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-1.5 w-56">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground/60 px-2 pt-1 pb-1">
                    Profils exemples
                  </p>
                  {SAMPLE_PROFILES.map((sp, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSelectPreviewProfile(sp.data)
                        setShowProfileMenu(false)
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors
                        ${previewProfile === sp.data
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                        }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Selection actions */}
      {selectedElementId && (
        <div className="flex items-center gap-1">
          <ToolButton icon={Copy} label="Dupliquer" onClick={onDuplicateElement} />
          <ToolButton icon={Trash2} label="Supprimer" onClick={onRemoveElement} danger />
          <div className="w-px h-6 bg-border mx-1" />
        </div>
      )}

      {/* Undo/Redo */}
      <ToolButton icon={Undo2} label="Annuler" onClick={onUndo} disabled={!canUndo} />
      <ToolButton icon={Redo2} label="Rétablir" onClick={onRedo} disabled={!canRedo} />

      <div className="w-px h-6 bg-border mx-1" />

      {/* Save */}
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
          bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Save className="size-3.5" />
        Sauvegarder
      </button>
    </div>
  )
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center justify-center size-8 rounded-lg transition-colors
        ${disabled
          ? "text-muted-foreground/40 cursor-not-allowed"
          : danger
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
    >
      <Icon className="size-4" />
    </button>
  )
}
