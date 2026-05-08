import { useCallback, useRef, useState } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Italic,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ImagePlus,
  Trash2,
} from "lucide-react"
import type { ActiveFace, CardElement, TextAlignment } from "../../lib/card-types"
import { getFieldsByCategory, type DynamicField } from "../../lib/dynamic-fields"

interface PropertiesPanelProps {
  element: CardElement | null
  entityId?: string
  backgroundColor: string
  backgroundOpacity: number
  backgroundImage: string | null
  activeFace: ActiveFace
  onUpdateElement: (id: string, changes: Partial<CardElement>) => void
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void
  onSetBackgroundColor: (color: string) => void
  onSetBackgroundOpacity: (opacity: number) => void
  onSetBackgroundImage: (face: ActiveFace, dataUrl: string | null) => void
}

export function PropertiesPanel({
  element,
  entityId,
  backgroundColor,
  backgroundOpacity,
  backgroundImage,
  activeFace,
  onUpdateElement,
  onMoveLayer,
  onSetBackgroundColor,
  onSetBackgroundOpacity,
  onSetBackgroundImage,
}: PropertiesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Limit to 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop volumineuse (max 5 Mo)")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onSetBackgroundImage(activeFace, reader.result as string)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  if (!element) {
    const faceLabel = activeFace === "front" ? "Recto" : "Verso"

    return (
      <div className="w-64 bg-card border-l border-border p-4 overflow-y-auto shrink-0">
        <h3 className="text-sm font-semibold text-foreground mb-4">Propriétés</h3>

        {/* Background properties */}
        <Section title="Fond de carte">
          <Field label="Couleur">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => onSetBackgroundColor(e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => onSetBackgroundColor(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
              />
            </div>
          </Field>
        </Section>

        <Section title={`Image de fond — ${faceLabel}`}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            onChange={handleImageUpload}
            className="hidden"
          />

          {backgroundImage ? (
            <>
              {/* Preview thumbnail */}
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                <img
                  src={backgroundImage}
                  alt={`Fond ${faceLabel}`}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: 120 }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ImagePlus className="size-3" />
                  Remplacer
                </button>
                <button
                  onClick={() => onSetBackgroundImage(activeFace, null)}
                  className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-destructive/30 text-[11px] font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="size-5" />
              <span className="text-[11px] font-medium">
                Ajouter une image
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                PNG, JPEG, WebP — max 5 Mo
              </span>
            </button>
          )}

          {/* Opacity slider (only shown when an image exists) */}
          {backgroundImage && (
            <Field label="Opacité">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={backgroundOpacity}
                  onChange={(e) => onSetBackgroundOpacity(parseFloat(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {Math.round(backgroundOpacity * 100)}%
                </span>
              </div>
            </Field>
          )}
        </Section>

        <p className="text-xs text-muted-foreground mt-6">
          Sélectionnez un élément pour modifier ses propriétés.
        </p>
      </div>
    )
  }

  const update = (changes: Partial<CardElement>) => onUpdateElement(element.id, changes)

  return (
    <div className="w-64 bg-card border-l border-border p-4 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {element.type === "text" ? "Texte" :
           element.type === "image" ? "Image" :
           element.type === "rectangle" ? "Rectangle" :
           element.type === "circle" ? "Cercle" :
           element.type === "line" ? "Ligne" :
           element.type === "qrCode" ? "QR Code" :
           element.type}
        </h3>
        <div className="flex items-center gap-1">
          <MiniButton
            icon={element.isVisible ? Eye : EyeOff}
            onClick={() => update({ isVisible: !element.isVisible })}
            title={element.isVisible ? "Masquer" : "Afficher"}
          />
          <MiniButton
            icon={element.isLocked ? Lock : Unlock}
            onClick={() => update({ isLocked: !element.isLocked })}
            title={element.isLocked ? "Déverrouiller" : "Verrouiller"}
          />
        </div>
      </div>

      {/* Position & Size */}
      <Section title="Position & Taille">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={element.x} onChange={(v) => update({ x: v })} />
          <NumberField label="Y" value={element.y} onChange={(v) => update({ y: v })} />
          <NumberField label="L" value={element.width} onChange={(v) => update({ width: v })} min={1} />
          <NumberField label="H" value={element.height} onChange={(v) => update({ height: v })} min={1} />
        </div>
        <NumberField label="Rotation" value={element.rotation} onChange={(v) => update({ rotation: v })} suffix="°" />
      </Section>

      {/* Layer order */}
      <Section title="Ordre">
        <div className="flex items-center gap-1">
          <MiniButton icon={ChevronsUp} onClick={() => onMoveLayer(element.id, "top")} title="Premier plan" />
          <MiniButton icon={ArrowUp} onClick={() => onMoveLayer(element.id, "up")} title="Monter" />
          <MiniButton icon={ArrowDown} onClick={() => onMoveLayer(element.id, "down")} title="Descendre" />
          <MiniButton icon={ChevronsDown} onClick={() => onMoveLayer(element.id, "bottom")} title="Arrière-plan" />
        </div>
      </Section>

      {/* Text properties */}
      {(element.type === "text") && (
        <Section title="Texte">
          {element.isDynamicField ? (
            <Field label="Champ dynamique">
              <select
                value={element.fieldKey}
                onChange={(e) => update({ fieldKey: e.target.value })}
                className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
              >
                {Object.values(getFieldsByCategory(entityId)).flat().filter((f: DynamicField) => f.key !== "citizen.photo").map((f: DynamicField) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Contenu">
              <textarea
                value={element.textContent}
                onChange={(e) => update({ textContent: e.target.value })}
                rows={2}
                className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground resize-none"
              />
            </Field>
          )}
          <Field label="Police">
            <select
              value={element.fontName}
              onChange={(e) => update({ fontName: e.target.value })}
              className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
            >
              <option value="Inter">Inter</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>
          </Field>
          <div className="flex items-center gap-2">
            <NumberField label="Taille" value={element.fontSize} onChange={(v) => update({ fontSize: v })} min={1} />
            <Field label="Couleur">
              <input
                type="color"
                value={element.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
            </Field>
          </div>
          <Field label="Style">
            <div className="flex items-center gap-1">
              <ToggleButton
                icon={Bold}
                active={element.isBold}
                onClick={() => update({ isBold: !element.isBold })}
              />
              <ToggleButton
                icon={Italic}
                active={element.isItalic}
                onClick={() => update({ isItalic: !element.isItalic })}
              />
              <div className="w-px h-5 bg-border mx-1" />
              <ToggleButton
                icon={AlignLeft}
                active={element.textAlignment === "left"}
                onClick={() => update({ textAlignment: "left" as TextAlignment })}
              />
              <ToggleButton
                icon={AlignCenter}
                active={element.textAlignment === "center"}
                onClick={() => update({ textAlignment: "center" as TextAlignment })}
              />
              <ToggleButton
                icon={AlignRight}
                active={element.textAlignment === "right"}
                onClick={() => update({ textAlignment: "right" as TextAlignment })}
              />
            </div>
          </Field>
        </Section>
      )}

      {/* Image properties */}
      {element.type === "image" && (
        <Section title="Image">
          {(() => {
            const imageFields = Object.values(getFieldsByCategory(entityId))
              .flat()
              .filter((f: DynamicField) => f.type === "image")
            return (
              <>
                {imageFields.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={element.isDynamicField}
                      onChange={(e) => {
                        if (e.target.checked) {
                          update({
                            isDynamicField: true,
                            fieldKey: element.fieldKey || imageFields[0].key,
                            // imageData garde sa valeur — utilise comme fallback si
                            // le champ resolu est vide cote impression / preview
                          })
                        } else {
                          update({ isDynamicField: false, fieldKey: "" })
                        }
                      }}
                      className="rounded border-border accent-primary"
                    />
                    Champ dynamique
                  </label>
                )}

                {element.isDynamicField ? (
                  <Field label="Champ">
                    <select
                      value={element.fieldKey || imageFields[0]?.key || ""}
                      onChange={(e) => update({ fieldKey: e.target.value })}
                      className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
                    >
                      {imageFields.map((f: DynamicField) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Source">
                    <button
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = () => {
                          const file = input.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = () =>
                            update({ imageData: reader.result as string })
                          reader.readAsDataURL(file)
                        }
                        input.click()
                      }}
                      className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground hover:bg-muted/80 transition-colors"
                    >
                      Choisir une image...
                    </button>
                  </Field>
                )}
              </>
            )
          })()}
          <Field label="Détourage">
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => update({ mask: "none" })}
                className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors
                  ${(element.mask ?? "none") === "none"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Aucun
              </button>
              <button
                onClick={() => update({ mask: "circle" })}
                className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors
                  ${element.mask === "circle"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Cercle
              </button>
            </div>
          </Field>
          {(element.mask ?? "none") === "none" && (
            <NumberField
              label="Arrondi"
              value={element.cornerRadius}
              onChange={(v) => update({ cornerRadius: v })}
              min={0}
            />
          )}
        </Section>
      )}

      {/* Shape properties */}
      {(element.type === "rectangle" || element.type === "circle") && (
        <Section title="Forme">
          <Field label="Remplissage">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.fillColor === "transparent" ? "#ffffff" : element.fillColor}
                onChange={(e) => update({ fillColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={element.fillColor}
                onChange={(e) => update({ fillColor: e.target.value })}
                className="flex-1 text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
              />
            </div>
          </Field>
          <Field label="Contour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.strokeColor}
                onChange={(e) => update({ strokeColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <NumberField
                label="Ép."
                value={element.strokeWidth}
                onChange={(v) => update({ strokeWidth: v })}
                min={0}
              />
            </div>
          </Field>
          {element.type === "rectangle" && (
            <NumberField
              label="Arrondi"
              value={element.cornerRadius}
              onChange={(v) => update({ cornerRadius: v })}
              min={0}
            />
          )}
        </Section>
      )}

      {/* Line properties */}
      {element.type === "line" && (
        <Section title="Ligne">
          <Field label="Couleur">
            <input
              type="color"
              value={element.strokeColor}
              onChange={(e) => update({ strokeColor: e.target.value })}
              className="w-8 h-8 rounded border border-border cursor-pointer"
            />
          </Field>
          <NumberField
            label="Épaisseur"
            value={element.strokeWidth}
            onChange={(v) => update({ strokeWidth: v })}
            min={1}
          />
        </Section>
      )}

      {/* QR Code properties */}
      {(element.type === "qrCode" || element.type === "barcode") && (
        <Section title="Code">
          <Field label="Contenu">
            <input
              type="text"
              value={element.codeContent}
              onChange={(e) => update({ codeContent: e.target.value })}
              className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
              placeholder="URL ou texte..."
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={element.isDynamicField}
              onChange={(e) => update({ isDynamicField: e.target.checked })}
              className="rounded border-border accent-primary"
            />
            Champ dynamique
          </label>
          {element.isDynamicField && (
            <select
              value={element.fieldKey}
              onChange={(e) => update({ fieldKey: e.target.value })}
              className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground"
            >
              <option value="card.qrCode">QR Code vérification</option>
              <option value="card.number">N° Carte</option>
            </select>
          )}
        </Section>
      )}
    </div>
  )
}

// ---- Sub-components ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  step?: number
}) {
  const [localValue, setLocalValue] = useState<string>(String(value))
  const [isFocused, setIsFocused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  // Sync external value when not editing
  const displayValue = isFocused ? localValue : String(value)

  const clamp = useCallback(
    (v: number) => {
      if (min !== undefined && v < min) return min
      return v
    },
    [min],
  )

  const commit = useCallback(
    (raw: string) => {
      const parsed = Number(raw)
      if (!Number.isNaN(parsed)) {
        onChange(clamp(Math.round(parsed)))
      }
    },
    [onChange, clamp],
  )

  const increment = useCallback(
    (delta: number) => {
      const next = clamp(Math.round(valueRef.current + delta))
      onChange(next)
      setLocalValue(String(next))
    },
    [onChange, clamp],
  )

  const startRepeat = useCallback(
    (delta: number) => {
      increment(delta)
      intervalRef.current = setInterval(() => increment(delta), 120)
    },
    [increment],
  )

  const stopRepeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
      <div className="flex items-center gap-0">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onFocus={() => {
              setIsFocused(true)
              setLocalValue(String(value))
            }}
            onBlur={() => {
              setIsFocused(false)
              commit(localValue)
            }}
            onChange={(e) => {
              // Allow digits, minus, dot
              const raw = e.target.value
              if (raw === "" || raw === "-" || /^-?\d*\.?\d*$/.test(raw)) {
                setLocalValue(raw)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(localValue)
                ;(e.target as HTMLInputElement).blur()
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                const delta = e.shiftKey ? step * 10 : step
                increment(delta)
              } else if (e.key === "ArrowDown") {
                e.preventDefault()
                const delta = e.shiftKey ? step * 10 : step
                increment(-delta)
              }
            }}
            className="w-full text-xs px-2 py-1.5 pr-5 bg-muted border border-border rounded-md text-foreground tabular-nums"
          />
          {/* Stepper buttons */}
          <div className="absolute right-px top-px bottom-px flex flex-col w-4 border-l border-border">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                const delta = e.shiftKey ? step * 10 : step
                startRepeat(delta)
              }}
              onMouseUp={stopRepeat}
              onMouseLeave={stopRepeat}
              className="flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 rounded-tr-md transition-colors"
            >
              <ChevronUp className="size-2.5" />
            </button>
            <div className="h-px bg-border" />
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                const delta = e.shiftKey ? step * 10 : step
                startRepeat(-delta)
              }}
              onMouseUp={stopRepeat}
              onMouseLeave={stopRepeat}
              className="flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 rounded-br-md transition-colors"
            >
              <ChevronDown className="size-2.5" />
            </button>
          </div>
        </div>
        {suffix && <span className="text-[10px] text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  )
}

function MiniButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ElementType
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function ToggleButton({
  icon: Icon,
  active,
  onClick,
}: {
  icon: React.ElementType
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center size-7 rounded-md transition-colors
        ${active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
    >
      <Icon className="size-3.5" />
    </button>
  )
}
