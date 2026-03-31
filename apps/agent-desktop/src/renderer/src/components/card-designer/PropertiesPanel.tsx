import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronsDown,
  ChevronsUp,
  Italic,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from "lucide-react"
import type { CardElement, TextAlignment } from "../../lib/card-types"
import { DYNAMIC_FIELDS } from "../../lib/dynamic-fields"

interface PropertiesPanelProps {
  element: CardElement | null
  backgroundColor: string
  backgroundOpacity: number
  onUpdateElement: (id: string, changes: Partial<CardElement>) => void
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void
  onSetBackgroundColor: (color: string) => void
  onSetBackgroundOpacity: (opacity: number) => void
}

export function PropertiesPanel({
  element,
  backgroundColor,
  backgroundOpacity,
  onUpdateElement,
  onMoveLayer,
  onSetBackgroundColor,
  onSetBackgroundOpacity,
}: PropertiesPanelProps) {
  if (!element) {
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
          <Field label="Opacité image">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={backgroundOpacity}
              onChange={(e) => onSetBackgroundOpacity(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-[10px] text-muted-foreground">{Math.round(backgroundOpacity * 100)}%</span>
          </Field>
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
          <NumberField label="L" value={element.width} onChange={(v) => update({ width: v })} />
          <NumberField label="H" value={element.height} onChange={(v) => update({ height: v })} />
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
                {DYNAMIC_FIELDS.filter((f) => f.key !== "citizen.photo").map((f) => (
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
            <NumberField label="Taille" value={element.fontSize} onChange={(v) => update({ fontSize: v })} />
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
          {element.isDynamicField ? (
            <p className="text-xs text-muted-foreground">Photo dynamique du citoyen</p>
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
                    reader.onload = () => update({ imageData: reader.result as string })
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
          <NumberField
            label="Arrondi"
            value={element.cornerRadius}
            onChange={(v) => update({ cornerRadius: v })}
          />
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
              />
            </div>
          </Field>
          {element.type === "rectangle" && (
            <NumberField
              label="Arrondi"
              value={element.cornerRadius}
              onChange={(v) => update({ cornerRadius: v })}
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
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
      <div className="flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full text-xs px-2 py-1.5 bg-muted border border-border rounded-md text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
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
