"use client";

/**
 * StepFinalSetup — Étape 5 (finale) du wizard /reps/new (Phase B6)
 *
 * Récap de la configuration + bouton de création + redirection vers Dashboard.
 */

import { Bot, CalendarDays, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Switch } from "@/components/ui/switch";

export interface StepFinalSetupProps {
  orgName: string;
  orgType: string;
  onCreate: (options: {
    activateIAsted: boolean;
    initializeCalendar: boolean;
  }) => Promise<void>;
  onBack: () => void;
  isCreating?: boolean;
}

export function StepFinalSetup({
  orgName,
  orgType,
  onCreate,
  onBack,
  isCreating,
}: StepFinalSetupProps) {
  const [activateIAsted, setActivateIAsted] = useState(true);
  const [initializeCalendar, setInitializeCalendar] = useState(true);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Sparkles className="h-4 w-4 text-amber-600" />}
            title="Dernière étape avant création"
          />
          <p className="text-xs text-muted-foreground mb-4">
            Tu vas créer la représentation <strong>{orgName}</strong>{" "}
            (<em>{orgType}</em>). Choisis les options d'initialisation
            automatique avant de finaliser.
          </p>

          <div className="space-y-3">
            {/* Calendrier */}
            <label className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/50 cursor-pointer hover:bg-muted/30">
              <div className="flex items-start gap-3 flex-1">
                <CalendarDays className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">
                    Initialiser le calendrier
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Charge les horaires standards (9h-17h Lun-Ven) et les jours
                    fériés gabonais officiels.
                  </p>
                </div>
              </div>
              <Switch
                checked={initializeCalendar}
                onCheckedChange={setInitializeCalendar}
              />
            </label>

            {/* iAsted */}
            <label className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/50 cursor-pointer hover:bg-muted/30">
              <div className="flex items-start gap-3 flex-1">
                <Bot className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Activer iAsted</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Crée la configuration par défaut du chatbot IA pour cette
                    représentation (persona contextualisée).
                  </p>
                </div>
              </div>
              <Switch
                checked={activateIAsted}
                onCheckedChange={setActivateIAsted}
              />
            </label>
          </div>
        </div>
      </FlatCard>

      <FlatCard className="border-emerald-500/30 bg-emerald-500/5">
        <div className="p-3 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-emerald-700">
              Tu pourras ajuster tous ces paramètres après création
            </p>
            <p className="text-muted-foreground mt-0.5">
              Depuis l'onglet « Paramètres » de la représentation, tu auras
              accès à 14 sections de configuration détaillée.
            </p>
          </div>
        </div>
      </FlatCard>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isCreating}>
          Retour
        </Button>
        <Button
          onClick={() =>
            onCreate({ activateIAsted, initializeCalendar })
          }
          disabled={isCreating}
          className="min-w-[180px]"
        >
          {isCreating ? (
            <>
              <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Création en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Créer la représentation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
