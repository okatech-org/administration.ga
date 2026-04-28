"use client";

/**
 * LocalizedField — Champ de saisie multilingue avec onglets de langue.
 *
 * Affiche un seul champ (input ou textarea) et un sélecteur d'onglets
 * compact au-dessus pour basculer entre les langues. Évite la duplication
 * de plusieurs champs côte-à-côte pour les contenus traduits.
 *
 * Pattern :
 *   <LocalizedField
 *     locales={["fr", "en", "local"]}
 *     value={{ fr: "Bonjour", en: "Hello" }}
 *     onChange={(next) => save(next)}
 *     placeholder={{ fr: "...", en: "...", local: "..." }}
 *     multiline
 *   />
 */

import { Globe2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type LocaleKey = "fr" | "en" | "local";

export type LocalizedValue = Partial<Record<LocaleKey, string>>;

interface LocalizedFieldProps {
  /** Codes de langue à afficher comme onglets (ordre = ordre des onglets). */
  locales: LocaleKey[];
  /** Libellés des onglets. Défaut : noms standardisés. */
  labels?: Partial<Record<LocaleKey, string>>;
  /** Placeholders par locale. */
  placeholder?: Partial<Record<LocaleKey, string>>;
  /** Valeur courante (clé = locale). */
  value: LocalizedValue;
  /** Callback à chaque changement, reçoit le nouveau dictionnaire complet. */
  onChange: (next: LocalizedValue) => void;
  /** Textarea si true, Input sinon. */
  multiline?: boolean;
  /** Nombre de lignes pour le textarea. */
  rows?: number;
  /** ID HTML (associé à un FieldLabel externe). */
  id?: string;
  /** Désactive l'édition. */
  disabled?: boolean;
  /** Affiche un indicateur visuel quand des locales secondaires sont remplies. */
  showFilledIndicator?: boolean;
  /** Slot optionnel à droite du sélecteur d'onglets (ex. icône d'aide). */
  trailing?: ReactNode;
}

const DEFAULT_LABELS: Record<LocaleKey, string> = {
  fr: "Français",
  en: "Anglais",
  local: "Langue locale",
};

const SHORT_LABELS: Record<LocaleKey, string> = {
  fr: "FR",
  en: "EN",
  local: "Local",
};

export function LocalizedField({
  locales,
  labels,
  placeholder,
  value,
  onChange,
  multiline = false,
  rows = 4,
  id,
  disabled = false,
  showFilledIndicator = true,
  trailing,
}: LocalizedFieldProps) {
  const [activeLocale, setActiveLocale] = useState<LocaleKey>(locales[0] ?? "fr");

  const filledLocales = useMemo(() => {
    const set = new Set<LocaleKey>();
    for (const loc of locales) {
      if ((value[loc] ?? "").trim().length > 0) set.add(loc);
    }
    return set;
  }, [locales, value]);

  const handleChange = (text: string) => {
    onChange({ ...value, [activeLocale]: text });
  };

  const currentValue = value[activeLocale] ?? "";
  const currentPlaceholder = placeholder?.[activeLocale];
  const resolveLabel = (loc: LocaleKey): string =>
    labels?.[loc] ?? SHORT_LABELS[loc] ?? loc;

  return (
    <div className="space-y-2">
      {/* Onglets de langue */}
      <div className="flex items-center gap-1">
        <div
          className="inline-flex items-center gap-0.5 rounded-md bg-muted/40 p-0.5"
          role="tablist"
          aria-label="Sélection de langue"
        >
          <Globe2
            className="ml-1.5 h-3 w-3 text-muted-foreground"
            aria-hidden="true"
          />
          {locales.map((loc) => {
            const isActive = loc === activeLocale;
            const isFilled = filledLocales.has(loc);
            return (
              <button
                key={loc}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={DEFAULT_LABELS[loc] ?? loc}
                onClick={() => setActiveLocale(loc)}
                className={cn(
                  "relative flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                disabled={disabled}
              >
                {resolveLabel(loc)}
                {showFilledIndicator && isFilled && !isActive && (
                  <span
                    className="h-1 w-1 rounded-full bg-emerald-500"
                    aria-label="Renseigné"
                  />
                )}
              </button>
            );
          })}
        </div>
        {trailing && <div className="ml-auto">{trailing}</div>}
      </div>

      {/* Champ unique partagé entre les langues */}
      {multiline ? (
        <Textarea
          id={id}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={currentPlaceholder}
          rows={rows}
          disabled={disabled}
        />
      ) : (
        <Input
          id={id}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={currentPlaceholder}
          disabled={disabled}
        />
      )}
    </div>
  );
}
