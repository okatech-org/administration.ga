import { Upload } from "lucide-react"
import { cn } from "../../lib/utils"

interface DropZoneProps {
  isDragOver: boolean
  label?: string
  className?: string
}

/**
 * Visual overlay shown when files are being dragged over a drop target.
 */
export function DropZone({ isDragOver, label = "Deposer les fichiers ici", className }: DropZoneProps) {
  if (!isDragOver) return null

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center",
        "bg-primary/5 border-2 border-dashed border-primary/40 rounded-2xl",
        "backdrop-blur-sm pointer-events-none",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-primary">
        <Upload className="size-10 opacity-60" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
