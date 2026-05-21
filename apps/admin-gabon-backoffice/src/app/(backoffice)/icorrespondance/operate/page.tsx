"use client";

import ICorrespondancePage from "@workspace/agent-features/features/icorrespondance";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { useOrgSelector } from "@/hooks/use-org-selector";

/**
 * Backoffice — Exploitation iCorrespondance pour une représentation.
 *
 * Sous-route dédiée à l'usage opérationnel (création / approbation / envoi /
 * archivage de correspondances) pour une org sélectionnée. Wrapper fin sur
 * `ICorrespondancePage` du package partagé : mêmes composants que ceux
 * affichés à l'agent web. Le super admin a un accès opérationnel complet
 * (décision produit : pas de read-only mode).
 *
 * Le réglage et la supervision réseau ne sont PAS dans cette page :
 *  - Réglages : /icorrespondance/settings
 *  - Vue réseau : /icorrespondance/network
 */
export default function ICorrespondanceOperatePage() {
  const { activeOrgId, OrgSelector, isPending } = useOrgSelector();

  if (isPending) {
    return (
      <PageHeader
        title="iCorrespondance — Exploitation"
        subtitle="Chargement des organisations…"
        icon={Mail}
      />
    );
  }

  if (!activeOrgId) {
    return (
      <PageHeader
        title="iCorrespondance — Exploitation"
        subtitle="Aucune organisation accessible."
        icon={Mail}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="iCorrespondance — Exploitation"
        subtitle="Courriers et dossiers de l'organisation sélectionnée"
        icon={Mail}
        actions={<OrgSelector />}
      />
      <ICorrespondancePage />
    </>
  );
}
