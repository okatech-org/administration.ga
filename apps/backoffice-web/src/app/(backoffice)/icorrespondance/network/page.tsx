"use client";

import { Network } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { NetworkHub } from "@/components/icorrespondance/network/NetworkHub";

/**
 * Backoffice — Hub réseau iCorrespondance (super admin).
 *
 * Vue agrégée multi-représentations : KPI globaux, conformité de
 * configuration, accès rapide à l'exploitation et au réglage par rep.
 */
export default function ICorrespondanceNetworkPage() {
  return (
    <>
      <PageHeader
        title="iCorrespondance — Réseau"
        subtitle="Supervision et conformité de toutes les représentations"
        icon={Network}
      />
      <NetworkHub />
    </>
  );
}
