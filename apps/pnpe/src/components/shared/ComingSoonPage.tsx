/**
 * Page "Coming soon" partagée pour les routes squelettes (Phase 7+).
 * Permet de stabiliser la nav PNPE sans tout implémenter d'un coup.
 */
import { Construction } from "lucide-react";

export function ComingSoonPage({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features?: string[];
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-4">
        <Construction className="size-8 text-amber-500 shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {features && features.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">À venir</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-current mt-2 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Cette page est un squelette. L'implémentation complète est planifiée
        dans une itération ultérieure.
      </p>
    </div>
  );
}
