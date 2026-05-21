"use client";

/**
 * StepModulesServices — Étape 4 du wizard /reps/new (Phase B6)
 *
 * Permet de pré-cocher les modules et services activés selon le template choisi.
 * À ce stade l'org est déjà créée donc on peut configurer ses modules + services.
 */

import { Boxes, Info, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";

export interface StepModulesServicesProps {
  /** Type d'org choisi à l'étape 1 (template) */
  orgType: string;
  onNext: () => void;
  onBack: () => void;
}

const RECOMMENDED_BY_TYPE: Record<
  string,
  { modules: string[]; services: string[] }
> = {
  embassy: {
    modules: [
      "consular_affairs",
      "diplomatic_affairs",
      "news",
      "correspondence",
      "community",
    ],
    services: [
      "Demande de visa",
      "Carte consulaire",
      "Acte de naissance",
      "Légalisation",
      "Certificat de vie",
    ],
  },
  general_consulate: {
    modules: [
      "consular_affairs",
      "news",
      "community",
    ],
    services: [
      "Demande de visa",
      "Carte consulaire",
      "Acte de naissance",
      "Certificat de vie",
    ],
  },
  high_commission: {
    modules: ["consular_affairs", "news"],
    services: ["Demande de visa", "Carte consulaire"],
  },
};

export function StepModulesServices({
  orgType,
  onNext,
  onBack,
}: StepModulesServicesProps) {
  const recommended =
    RECOMMENDED_BY_TYPE[orgType] ?? RECOMMENDED_BY_TYPE.embassy;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Boxes className="h-4 w-4 text-emerald-600" />}
            title="Modules recommandés"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Selon le type de représentation choisi (
            <strong>{orgType}</strong>), nous recommandons d'activer les modules
            suivants. Tu pourras les modifier plus tard dans l'onglet Modules.
          </p>
          <div className="flex flex-wrap gap-2">
            {recommended.modules.map((m) => (
              <Badge
                key={m}
                className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              >
                ✓ {m}
              </Badge>
            ))}
          </div>
        </div>
      </FlatCard>

      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Wrench className="h-4 w-4 text-blue-600" />}
            title="Services consulaires recommandés"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Services généralement proposés par ce type de représentation. La
            configuration détaillée (tarifs, SLA) se fait après création.
          </p>
          <ul className="space-y-1 text-sm">
            {recommended.services.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </FlatCard>

      <FlatCard className="border-blue-500/20 bg-blue-500/5">
        <div className="p-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium">À savoir</p>
            <p className="text-muted-foreground mt-1">
              Ces recommandations sont automatiquement appliquées à la création.
              Tu pourras toujours désactiver des modules ou ajouter des services
              spécifiques depuis l'onglet correspondant après création.
            </p>
          </div>
        </div>
      </FlatCard>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={onNext}>Continuer</Button>
      </div>
    </div>
  );
}
