"use client";

/**
 * CorrespondanceTypesSection — Wrapper de la config détaillée des types de
 * correspondance (correspondanceTypeConfigs : workflow d'approbation, header,
 * template, etc.) dans le panneau Paramètres de l'organisation.
 */

import { OrgCorrespondanceConfigTab } from "@/components/dashboard/org-correspondance-config-tab";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

export function CorrespondanceTypesSection({ orgId }: SettingsSectionProps) {
  return <OrgCorrespondanceConfigTab orgId={orgId} />;
}
