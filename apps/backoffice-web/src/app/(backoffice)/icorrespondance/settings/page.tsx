"use client";

import { Building2, Globe2, Settings2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/design-system/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import { NetworkCorrespondanceSettings } from "@/components/icorrespondance/settings/NetworkCorrespondanceSettings";
import { RepresentationCorrespondanceSettings } from "@/components/icorrespondance/settings/RepresentationCorrespondanceSettings";

/**
 * Backoffice — Réglages iCorrespondance.
 *
 * Deux onglets :
 *  - Réseau (super_admin / admin_system uniquement) → singleton
 *    `correspondanceNetworkConfig` qui sert de défaut hérité.
 *  - Représentation (visible par tous) → override par-org via les sections
 *    existantes (`CorrespondanceSection` + `CorrespondanceTypesSection`).
 */
export default function ICorrespondanceSettingsPage() {
  const { isSuperAdmin, isAdminSystem } = useCurrentAdminRole();
  const canEditNetwork = isSuperAdmin || isAdminSystem;
  const [tab, setTab] = useState<"network" | "representation">(
    canEditNetwork ? "network" : "representation",
  );

  return (
    <>
      <PageHeader
        title="iCorrespondance — Réglages"
        subtitle="Paramétrage hérité du réseau, surchargeable par représentation"
        icon={Settings2}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "network" | "representation")}
        className="mt-2"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          {canEditNetwork ? (
            <TabsTrigger value="network" className="gap-1.5">
              <Globe2 className="h-4 w-4" />
              Réseau
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="representation" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Représentation
          </TabsTrigger>
        </TabsList>
        {canEditNetwork ? (
          <TabsContent value="network" className="mt-4">
            <NetworkCorrespondanceSettings />
          </TabsContent>
        ) : null}
        <TabsContent value="representation" className="mt-4">
          <RepresentationCorrespondanceSettings />
        </TabsContent>
      </Tabs>
    </>
  );
}
