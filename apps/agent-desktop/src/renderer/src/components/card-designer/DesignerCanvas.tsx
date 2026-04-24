import { useCallback, useEffect, useRef, useState } from "react"
import { Stage, Layer, Rect, Text, Circle, Line, Image as KImage, Transformer, Group } from "react-konva"
import type Konva from "konva"
import type { CardElement, ActiveFace } from "../../lib/card-types"
import { CARD_WIDTH, CARD_HEIGHT } from "../../lib/card-types"
import { resolveFieldValue, type CitizenProfileData } from "../../lib/dynamic-fields"

interface DesignerCanvasProps {
  elements: CardElement[]
  selectedElementId: string | null
  backgroundColor: string
  backgroundImage: string | null
  backgroundOpacity: number
  activeFace: ActiveFace
  onSelectElement: (id: string | null) => void
  onUpdateElement: (id: string, changes: Partial<CardElement>) => void
  stageRef: React.RefObject<Konva.Stage | null>
  zoom: number
  onZoomChange: (zoom: number) => void
  /** When set, dynamic fields resolve against this profile instead of showing preview placeholders */
  previewProfile?: CitizenProfileData | null
}

/** Load an HTMLImageElement from a data URL or URL */
function useLoadedImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) { setImage(null); return }
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.onerror = () => setImage(null)
    img.src = src
  }, [src])
  return image
}

function CardElementRenderer({
  element,
  isSelected,
  onSelect,
  onChange,
  previewProfile,
}: {
  element: CardElement
  isSelected: boolean
  onSelect: () => void
  onChange: (changes: Partial<CardElement>) => void
  previewProfile?: CitizenProfileData | null
}) {
  const shapeRef = useRef<Konva.Shape>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const image = useLoadedImage(element.type === "image" ? element.imageData : null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  if (!element.isVisible) return null

  const commonProps = {
    ref: shapeRef as any,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    draggable: !element.isLocked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: Math.round(e.target.x()), y: Math.round(e.target.y()) })
    },
    onTransformEnd: () => {
      const node = shapeRef.current
      if (!node) return
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      onChange({
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.round(Math.max(10, node.width() * scaleX)),
        height: Math.round(Math.max(10, node.height() * scaleY)),
        rotation: Math.round(node.rotation()),
      })
    },
  }

  let shape: React.ReactNode = null

  switch (element.type) {
    case "text": {
      const displayText = element.isDynamicField
        ? resolveFieldValue(element.fieldKey, previewProfile ?? null)
        : element.textContent
      shape = (
        <Text
          {...commonProps}
          text={displayText}
          width={element.width}
          fontSize={element.fontSize}
          fontFamily={element.fontName}
          fontStyle={`${element.isBold ? "bold" : "normal"} ${element.isItalic ? "italic" : ""}`}
          fill={element.textColor}
          align={element.textAlignment}
        />
      )
      break
    }
    case "image": {
      if (image) {
        const mask = element.mask ?? "none"
        if (mask === "none") {
          shape = (
            <KImage
              {...commonProps}
              image={image}
              width={element.width}
              height={element.height}
              cornerRadius={element.cornerRadius}
            />
          )
        } else {
          // Masque circle live via clipFunc sur un Group — s'applique aussi au rendu d'export
          const w = element.width
          const h = element.height
          const clipFunc = (ctx: Konva.Context) => {
            ctx.beginPath()
            ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2)
            ctx.closePath()
          }
          shape = (
            <Group {...commonProps} width={w} height={h} clipFunc={clipFunc}>
              <KImage image={image} width={w} height={h} />
            </Group>
          )
        }
      } else {
        // Placeholder
        shape = (
          <Group {...commonProps}>
            <Rect
              width={element.width}
              height={element.height}
              fill={element.fillColor}
              stroke={element.strokeColor}
              strokeWidth={element.strokeWidth}
              cornerRadius={element.cornerRadius}
            />
            <Text
              text={element.isDynamicField ? " Photo" : " Image"}
              width={element.width}
              height={element.height}
              align="center"
              verticalAlign="middle"
              fontSize={14}
              fill="#6b7280"
            />
          </Group>
        )
      }
      break
    }
    case "rectangle":
      shape = (
        <Rect
          {...commonProps}
          width={element.width}
          height={element.height}
          fill={element.fillColor}
          stroke={element.strokeColor}
          strokeWidth={element.strokeWidth}
          cornerRadius={element.cornerRadius}
        />
      )
      break
    case "circle":
      shape = (
        <Circle
          {...(commonProps as any)}
          x={element.x + element.width / 2}
          y={element.y + element.height / 2}
          radius={element.width / 2}
          fill={element.fillColor}
          stroke={element.strokeColor}
          strokeWidth={element.strokeWidth}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            onChange({
              x: Math.round(e.target.x() - element.width / 2),
              y: Math.round(e.target.y() - element.height / 2),
            })
          }}
        />
      )
      break
    case "line":
      shape = (
        <Line
          {...commonProps}
          points={[0, 0, element.width, 0]}
          stroke={element.strokeColor}
          strokeWidth={element.strokeWidth}
        />
      )
      break
    case "qrCode": {
      // Simple placeholder for QR code
      shape = (
        <Group {...commonProps}>
          <Rect
            width={element.width}
            height={element.height}
            fill="#ffffff"
            stroke="#000000"
            strokeWidth={1}
          />
          <Text
            text="QR"
            width={element.width}
            height={element.height}
            align="center"
            verticalAlign="middle"
            fontSize={Math.min(element.width, element.height) * 0.3}
            fontStyle="bold"
            fill="#000000"
          />
        </Group>
      )
      break
    }
    case "barcode": {
      shape = (
        <Group {...commonProps}>
          <Rect
            width={element.width}
            height={element.height}
            fill="#ffffff"
            stroke="#000000"
            strokeWidth={1}
          />
          {/* Simple barcode visual */}
          {Array.from({ length: 20 }).map((_, i) => (
            <Rect
              key={i}
              x={8 + i * (element.width - 16) / 20}
              y={5}
              width={i % 3 === 0 ? 3 : 1.5}
              height={element.height - 10}
              fill="#000000"
            />
          ))}
        </Group>
      )
      break
    }
  }

  return (
    <>
      {shape}
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(_, newBox) => ({
            ...newBox,
            width: Math.max(10, newBox.width),
            height: Math.max(10, newBox.height),
          })}
          anchorStyleFunc={(anchor) => {
            anchor.cornerRadius(3)
            anchor.fill("#009639")
            anchor.stroke("#006b28")
            anchor.strokeWidth(1)
          }}
          borderStroke="#009639"
          borderStrokeWidth={1.5}
        />
      )}
    </>
  )
}

export function DesignerCanvas({
  elements,
  selectedElementId,
  backgroundColor,
  backgroundImage,
  backgroundOpacity,
  activeFace,
  onSelectElement,
  onUpdateElement,
  stageRef,
  zoom,
  onZoomChange,
  previewProfile,
}: DesignerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgImage = useLoadedImage(backgroundImage)

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage() || e.target.attrs?.id === "card-bg") {
        onSelectElement(null)
      }
    },
    [onSelectElement]
  )

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? -0.05 : 0.05
    onZoomChange(Math.min(2, Math.max(0.3, zoom + delta)))
  }, [zoom, onZoomChange])

  return (
    <div className="flex-1 flex flex-col items-center overflow-auto bg-muted/30 relative">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-1.5 text-xs">
        <button
          onClick={() => onZoomChange(Math.max(0.3, zoom - 0.1))}
          className="text-muted-foreground hover:text-foreground px-1"
          title="Zoom arrière (⌘-)"
        >
          −
        </button>
        <span className="w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
          className="text-muted-foreground hover:text-foreground px-1"
          title="Zoom avant (⌘+)"
        >
          +
        </button>
      </div>

      {/* Face indicator */}
      <div className="absolute top-3 left-3 z-10">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border
          ${activeFace === "front"
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-orange-500/10 text-orange-600 border-orange-500/20"
          }`}
        >
          {activeFace === "front" ? "Recto" : "Verso"}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex items-center justify-center flex-1 p-8"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <Stage
            ref={stageRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            onClick={handleStageClick}
            onWheel={handleWheel}
          >
            {/* Background layer */}
            <Layer>
              <Rect
                id="card-bg"
                x={0}
                y={0}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                fill={backgroundColor}
                cornerRadius={24}
              />
              {bgImage && (
                <KImage
                  image={bgImage}
                  x={0}
                  y={0}
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  opacity={backgroundOpacity}
                />
              )}
            </Layer>
            {/* Elements layer */}
            <Layer>
              {sortedElements.map((el) => (
                <CardElementRenderer
                  key={el.id}
                  element={el}
                  isSelected={el.id === selectedElementId}
                  onSelect={() => onSelectElement(el.id)}
                  onChange={(changes) => onUpdateElement(el.id, changes)}
                  previewProfile={previewProfile}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  )
}
