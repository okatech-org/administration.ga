"use client";

/**
 * AddressAutocomplete — Recherche d'adresses via l'API Places (côté backend).
 *
 * Utilise les actions Convex `places.autocomplete` et `places.getDetails`
 * exposées dans `convex/functions/places.ts`. La clé Google API reste
 * privée côté serveur — aucun script chargé dans le navigateur.
 *
 * À la sélection d'une suggestion, `onResolve` reçoit l'adresse parsée
 * (street, city, postalCode, country ISO, lat/lng, formatted) que le
 * formulaire parent peut utiliser pour préremplir tous ses champs.
 */

import { CountryCode } from "@convex/lib/validators";
import { Loader2, MapPin, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  usePlacesAutocomplete,
  type PlaceDetails,
} from "@/hooks/use-places-autocomplete";
import { cn } from "@/lib/utils";

export interface ResolvedAddress {
  street: string;
  city: string;
  postalCode: string;
  /** ISO-3166-1 alpha-2 mappé vers CountryCode si possible. */
  country: CountryCode | undefined;
  lat: number | undefined;
  lng: number | undefined;
  formatted: string;
}

interface AddressAutocompleteProps {
  /** Texte affiché. */
  value: string;
  /** Émis à chaque frappe (avant choix de suggestion). */
  onTextChange: (text: string) => void;
  /** Émis à la sélection d'une suggestion : adresse complète parsée. */
  onResolve: (address: ResolvedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Restreindre la recherche à un ou plusieurs pays.
   * Format Places API : `"country:fr|country:ga"`
   */
  restrictCountries?: string;
  className?: string;
}

function mapToCountryCode(iso2: string | undefined): CountryCode | undefined {
  if (!iso2) return undefined;
  const upper = iso2.toUpperCase();
  return (Object.values(CountryCode) as string[]).includes(upper)
    ? (upper as CountryCode)
    : undefined;
}

function detailsToResolved(details: PlaceDetails): ResolvedAddress {
  return {
    street: details.street ?? "",
    city: details.city ?? "",
    postalCode: details.postalCode ?? "",
    country: mapToCountryCode(details.countryCode),
    lat: typeof details.lat === "number" ? details.lat : undefined,
    lng: typeof details.lng === "number" ? details.lng : undefined,
    formatted: details.formattedAddress ?? "",
  };
}

export function AddressAutocomplete({
  value,
  onTextChange,
  onResolve,
  placeholder = "Saisir une adresse…",
  disabled = false,
  restrictCountries,
  className,
}: AddressAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setInput, predictions, isLoading, getPlaceDetails, clear, error } =
    usePlacesAutocomplete({
      components: restrictCountries,
      debounceMs: 350,
    });

  const handleInputChange = (next: string) => {
    setInput(next);
    onTextChange(next);
    if (next.length >= 3) setShowSuggestions(true);
  };

  const handleFocus = () => {
    if (predictions.length > 0) setShowSuggestions(true);
  };

  const handleBlur = () => {
    // Délai pour laisser le clic sur une suggestion se déclencher
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSelect = async (placeId: string) => {
    setIsLoadingDetails(true);
    setShowSuggestions(false);
    try {
      const details = await getPlaceDetails(placeId);
      if (details) {
        const resolved = detailsToResolved(details);
        onResolve(resolved);
        // Affiche l'adresse formatée comme valeur visible
        onTextChange(resolved.formatted || resolved.street);
      }
    } finally {
      setIsLoadingDetails(false);
      clear();
    }
  };

  const handleClear = () => {
    clear();
    onTextChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || isLoadingDetails}
          autoComplete="off"
          className="pl-8 pr-10"
        />
        {(isLoading || isLoadingDetails) && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!isLoading && !isLoadingDetails && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            aria-label="Effacer la recherche"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showSuggestions && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // évite le blur prématuré
              onClick={() => handleSelect(prediction.placeId)}
              className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2 text-left outline-none last:border-0 hover:bg-accent focus:bg-accent"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {prediction.mainText}
                </div>
                {prediction.secondaryText && (
                  <div className="truncate text-xs text-muted-foreground">
                    {prediction.secondaryText}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-[10px] text-destructive">
          Recherche indisponible : {error}. Saisie manuelle possible.
        </p>
      )}
    </div>
  );
}
