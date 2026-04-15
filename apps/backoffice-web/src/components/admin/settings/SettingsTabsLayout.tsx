"use client";

/**
 * SettingsTabsLayout — Layout unifié pour le paramétrage d'une représentation.
 *
 * Structure :
 *   - Navigation verticale (colonne gauche) avec icônes + libellés + badges
 *   - Contenu à droite (section active)
 *   - Indicateur "modifié" par onglet (point ambre animé si dirty)
 *   - SaveStatusIndicator sticky en bas pour feedback visuel fort
 *
 * Pattern : chaque section est un composant indépendant qui gère son propre
 * debounced auto-save via le hook `useDebouncedSave` du package partagé
 * `@workspace/settings-form`. Le layout coordonne via `SettingsFormProvider` :
 *   - `flushAll()` est appelé AVANT démontage de la section sortante (BUG #1)
 *   - Les sections dirty affichent un point visuel dans la nav
 *
 * Cf. plan `partitioned-seeking-steele.md` Phase 0-5.
 */

import type { Id } from "@convex/_generated/dataModel";
import {
  SaveStatusIndicator,
  useSettingsForm,
  type SaveStatus,
} from "@workspace/settings-form";
import type { CSSProperties } from "react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CompletionBadge } from "./CompletionBadge";
import { useCompletionScore, type SectionKey } from "./use-completion-score";

// Re-export pour compat avec les sections existantes
export type { SaveStatus };

export interface SettingsSectionProps {
  orgId: Id<"orgs">;
  onStatusChange?: (status: SaveStatus, errorMessage?: string) => void;
}

export interface SettingsTab {
  /** Identifiant unique (URL-friendly) */
  key: string;
  /** Libellé affiché */
  label: string;
  /** Icône lucide-react */
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  /** Composant de la section */
  component: ComponentType<SettingsSectionProps>;
  /** Badge optionnel (nombre, "NEW", "!") */
  badge?: string | number;
  /** Couleur d'accent (format OKLCh ou hex) */
  accent?: string;
  /** Description courte sous le libellé */
  description?: string;
  /** Masquer cet onglet (feature flag) */
  hidden?: boolean;
  /** Clé pour la complétion (mappe sur SectionKey du hook useCompletionScore) */
  completionKey?: string;
}

export interface SettingsTabGroup {
  /** Titre du groupe (ex: "Identité & Localisation") */
  title: string;
  /** Description optionnelle du groupe */
  description?: string;
  /** Onglets du groupe */
  tabs: SettingsTab[];
}

export interface SettingsTabsLayoutProps {
  orgId: Id<"orgs">;
  groups: SettingsTabGroup[];
  /** Onglet actif par défaut (clé) */
  defaultActiveKey?: string;
  /** Contrôle externe de l'onglet actif */
  activeKey?: string;
  onActiveKeyChange?: (key: string) => void;
  /** En-tête optionnel au-dessus de la liste */
  header?: ReactNode;
}

export function SettingsTabsLayout({
  orgId,
  groups,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onActiveKeyChange,
  header,
}: SettingsTabsLayoutProps) {
  const allTabs = groups.flatMap((g) => g.tabs.filter((t) => !t.hidden));
  const firstKey = allTabs[0]?.key ?? "";
  const [internalActiveKey, setInternalActiveKey] = useState(
    defaultActiveKey ?? firstKey,
  );
  const activeKey = controlledActiveKey ?? internalActiveKey;

  // Contexte du provider — fournit flushAll, dirtySections, aggregateStatus
  const { flushAll, dirtySections, aggregateStatus, aggregateErrorMessage } =
    useSettingsForm();

  // Score de complétion par section
  const completion = useCompletionScore(orgId);

  // État local pour gérer le loading pendant flush (empêche double-clic rapide)
  const [transitioning, setTransitioning] = useState(false);

  /**
   * Changement d'onglet — BUG FIX #1 :
   * Flush les modifications pending de la section sortante AVANT démontage,
   * sinon le cleanup `useEffect` annule le timer et la saisie <1s est perdue.
   */
  const handleTabClick = async (key: string) => {
    if (key === activeKey || transitioning) return;
    setTransitioning(true);
    try {
      await flushAll();
    } finally {
      setTransitioning(false);
      if (controlledActiveKey === undefined) setInternalActiveKey(key);
      onActiveKeyChange?.(key);
    }
  };

  const activeTab = allTabs.find((t) => t.key === activeKey);
  const ActiveComponent = activeTab?.component;

  // onStatusChange legacy — pour les sections qui ne sont pas encore migrées
  // vers useRegisterSection. Le provider s'occupe de l'agrégat, mais on garde
  // ce callback pour compat avec l'API existante des sections.
  const handleStatusChangeLegacy = (_status: SaveStatus, _message?: string) => {
    // No-op : le contexte (via useRegisterSection) agrège désormais le statut.
    // Ce callback est juste passé pour ne pas casser l'API des sections.
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
      {/* ─── Navigation verticale ─────────────────────── */}
      <aside className="lg:w-64 shrink-0">
        {header && <div className="mb-3">{header}</div>}

        <ScrollArea className="lg:h-[calc(100vh-220px)]">
          <nav className="space-y-5 pr-2">
            {groups.map((group) => (
              <div key={group.title}>
                <div className="px-2 mb-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h3>
                  {group.description && (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {group.tabs
                    .filter((tab) => !tab.hidden)
                    .map((tab) => {
                      const isActive = tab.key === activeKey;
                      const Icon = tab.icon;
                      const isDirty = dirtySections.has(tab.key);
                      return (
                        <li key={tab.key}>
                          <button
                            type="button"
                            onClick={() => void handleTabClick(tab.key)}
                            disabled={transitioning}
                            className={cn(
                              "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              "hover:bg-muted/50",
                              "disabled:opacity-70 disabled:cursor-wait",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground/80",
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                              style={
                                tab.accent && isActive
                                  ? { color: tab.accent }
                                  : undefined
                              }
                            />
                            <span className="flex-1 truncate">{tab.label}</span>
                            {/* Point ambre animé si section dirty (BUG FIX #9) */}
                            {isDirty && (
                              <span
                                aria-label="Modifications non enregistrées"
                                className="h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse"
                              />
                            )}
                            {(() => {
                              const ck = (tab.completionKey ??
                                tab.key) as SectionKey;
                              const section = completion.sections[ck];
                              return section && section.total > 0 ? (
                                <CompletionBadge
                                  section={section}
                                  variant="minimal"
                                />
                              ) : null;
                            })()}
                            {tab.badge !== undefined && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 px-1.5"
                              >
                                {tab.badge}
                              </Badge>
                            )}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* ─── Contenu actif ────────────────────────────── */}
      <main className="flex-1 min-w-0">
        <div className="relative flex flex-col">
          {ActiveComponent ? (
            <ActiveComponent
              orgId={orgId}
              onStatusChange={handleStatusChangeLegacy}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Section introuvable
            </div>
          )}

          {/* ─── Barre de statut sauvegarde (agrégée + sticky) ─── */}
          <SaveStatusIndicator
            status={aggregateStatus}
            errorMessage={aggregateErrorMessage}
            position="sticky"
          />
        </div>
      </main>
    </div>
  );
}
