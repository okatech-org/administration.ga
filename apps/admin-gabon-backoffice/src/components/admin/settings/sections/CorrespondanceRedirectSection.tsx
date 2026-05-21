"use client";

/**
 * CorrespondanceRedirectSection — Stub remplaçant les anciennes sections
 * `CorrespondanceSection` et `CorrespondanceTypesSection` dans
 * `OrgSettingsPanel`.
 *
 * Le paramétrage iCorrespondance a sa propre page dédiée
 * (`/icorrespondance/settings`) qui combine la config réseau et l'override
 * par représentation. Ce stub garde un point d'entrée découvrable pour les
 * utilisateurs habitués à `/reps/[orgId]/edit` en redirigeant vers la
 * page dédiée avec l'orgId pré-sélectionné.
 */

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

export function CorrespondanceRedirectSection({
  orgId,
}: SettingsSectionProps) {
  return (
    <FlatCard>
      <div className="flex flex-col items-start gap-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">
              Réglages iCorrespondance
            </h3>
            <p className="text-sm text-muted-foreground">
              Le paramétrage de la correspondance officielle est désormais
              centralisé dans sa propre page, avec héritage automatique de
              la configuration réseau.
            </p>
          </div>
        </div>
        <Button asChild className="gap-1.5">
          <Link href={`/icorrespondance/settings?orgId=${orgId}`}>
            Ouvrir les réglages iCorrespondance
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </FlatCard>
  );
}
