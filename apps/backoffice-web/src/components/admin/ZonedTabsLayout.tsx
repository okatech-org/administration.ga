"use client";

/**
 * ZonedTabsLayout — Variante de Tabs avec séparateurs visuels par zone (Phase B5)
 *
 * Permet de regrouper les onglets en 3 zones cognitives :
 *   - OPÉRATIONNELLE (vue quotidienne)
 *   - CATALOGUE (services proposés)
 *   - CONFIGURATION (paramétrage)
 *
 * Affiche les zones avec un séparateur vertical et un libellé subtle.
 */

import type { ComponentType, ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ZonedTab {
  /** Identifiant unique */
  value: string;
  /** Libellé affiché */
  label: string;
  /** Icône lucide-react */
  icon?: ComponentType<{ className?: string }>;
  /** Badge optionnel à droite */
  badge?: ReactNode;
}

export interface TabZone {
  /** Titre de la zone (ex: « OPÉRATIONNEL ») */
  title: string;
  /** Description courte (tooltip ou hint) */
  description?: string;
  /** Onglets dans cette zone */
  tabs: ZonedTab[];
}

export interface ZonedTabsLayoutProps {
  zones: TabZone[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  /** Contenu (TabsContent) */
  children: ReactNode;
}

export function ZonedTabsLayout({
  zones,
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: ZonedTabsLayoutProps) {
  // Utilise le premier onglet de la première zone comme défaut
  const firstValue = zones[0]?.tabs[0]?.value ?? "";

  return (
    <Tabs
      defaultValue={defaultValue ?? firstValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("space-y-4", className)}
    >
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList className="h-auto justify-start w-max gap-1 bg-[#F4F3ED] dark:bg-[#171616] p-1">
          {zones.map((zone, zoneIdx) => (
            <ZoneSection
              key={zone.title}
              zone={zone}
              isFirst={zoneIdx === 0}
            />
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

// ─── Section d'une zone (groupe d'onglets) ────────────────
function ZoneSection({
  zone,
  isFirst,
}: {
  zone: TabZone;
  isFirst: boolean;
}) {
  return (
    <>
      {!isFirst && (
        <div
          className="mx-1.5 self-stretch w-px bg-border/60"
          aria-hidden="true"
          title={zone.title}
        />
      )}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={zone.title}
      >
        {zone.tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 text-xs sm:text-sm"
              title={zone.description}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.badge}
            </TabsTrigger>
          );
        })}
      </div>
    </>
  );
}
