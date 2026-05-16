/**
 * Gabon flag color stripe (green/yellow/blue) — décor en tête de hero / section
 * Charte officielle Gabon, équivalent .gabon-stripe de la maquette
 */
export function GabonStripe({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`flex h-[3px] w-14 overflow-hidden rounded-full ${className ?? ""}`}
    >
      <span className="flex-1 bg-gabon-green" />
      <span className="flex-1 bg-gabon-yellow" />
      <span className="flex-1 bg-gabon-blue" />
    </div>
  )
}
