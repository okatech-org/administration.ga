"use client";

/**
 * RepresentationCorrespondanceSettings — Réglages iCorrespondance d'une
 * représentation. Combine le sélecteur d'org et les deux sections existantes
 * (`CorrespondanceSection` + `CorrespondanceTypesSection`) précédemment
 * affichées dans `/reps/[orgId]/edit`.
 *
 * Wrappé dans `SettingsFormProvider` pour bénéficier du debounced save
 * commun (mêmes hooks que l'ancien panneau).
 */

import { SettingsFormProvider } from "@workspace/settings-form";
import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CorrespondanceSection } from "@/components/admin/settings/sections/CorrespondanceSection";
import { CorrespondanceTypesSection } from "@/components/admin/settings/sections/CorrespondanceTypesSection";
import { FlatCard } from "@/components/design-system/flat-card";
import { useOrgSelector } from "@/hooks/use-org-selector";

export function RepresentationCorrespondanceSettings() {
  const { activeOrgId, activeOrg, OrgSelector, isPending, setSelectedOrgId } =
    useOrgSelector();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Si la query string contient ?orgId=X (depuis un lien NetworkHub),
  // on synchronise une seule fois le sélecteur sur cet org.
  useEffect(() => {
    const orgParam = searchParams.get("orgId");
    if (orgParam && orgParam !== activeOrgId) {
      setSelectedOrgId(orgParam);
    }
  }, [searchParams, activeOrgId, setSelectedOrgId]);

  // Quand l'utilisateur change manuellement via le dropdown, on met à jour
  // l'URL pour rester partageable.
  useEffect(() => {
    if (!activeOrgId) return;
    const orgParam = searchParams.get("orgId");
    if (orgParam !== activeOrgId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("orgId", activeOrgId);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [activeOrgId, pathname, router, searchParams]);

  if (isPending) {
    return (
      <FlatCard className="p-6 text-sm text-muted-foreground">
        Chargement des représentations…
      </FlatCard>
    );
  }

  if (!activeOrgId) {
    return (
      <FlatCard className="p-6 text-sm text-muted-foreground">
        Aucune représentation accessible.
      </FlatCard>
    );
  }

  return (
    <SettingsFormProvider>
      <div className="space-y-4">
        <FlatCard>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Réglages pour :
              </span>
              <span className="font-semibold">
                {activeOrg?.name ?? "—"}
              </span>
            </div>
            <OrgSelector />
          </div>
          <div className="border-t border-[color:var(--border-soft)] bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            Les champs non personnalisés héritent automatiquement de la
            configuration réseau (onglet « Réseau »).
          </div>
        </FlatCard>

        <CorrespondanceSection orgId={activeOrgId} />
        <CorrespondanceTypesSection orgId={activeOrgId} />
      </div>
    </SettingsFormProvider>
  );
}
