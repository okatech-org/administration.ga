"use client";

/**
 * AddressAutocomplete — Champ de recherche d'adresse alimenté par Google Places.
 *
 * À la sélection d'une suggestion, parse les `address_components` Google et
 * émet un objet structuré { street, city, postalCode, country, lat, lng } pour
 * remplir automatiquement le formulaire d'adresse parent.
 *
 * - Si la clé `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` n'est pas configurée,
 *   le composant se replie sur un Input simple (pas d'autocomplétion) et
 *   affiche un avertissement discret aux super-admins.
 * - Utilise l'API legacy `google.maps.places.Autocomplete` (stable et bien
 *   documentée) — plus simple à intégrer dans un Input contrôlé que le nouveau
 *   `PlaceAutocompleteElement`.
 */

import { CountryCode } from "@convex/lib/validators";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { cn } from "@/lib/utils";

export interface ResolvedAddress {
  /** "12 Rue de la Paix" — composant `street_number` + `route` */
  street: string;
  city: string;
  postalCode: string;
  /** ISO-3166-1 alpha-2 (ex. "FR", "GA"). Mappé vers CountryCode. */
  country: CountryCode | undefined;
  lat: number | undefined;
  lng: number | undefined;
  /** Adresse formatée complète retournée par Google (utile pour audit). */
  formatted: string;
}

interface AddressAutocompleteProps {
  /** Valeur courante (texte affiché dans l'input). */
  value: string;
  /** Émis quand l'utilisateur tape (sans avoir choisi de suggestion). */
  onTextChange: (text: string) => void;
  /** Émis quand une suggestion Google est choisie : adresse complète parsée. */
  onResolve: (address: ResolvedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Restreindre la recherche à un pays (ISO alpha-2). */
  restrictCountry?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Mappe une chaîne ISO alpha-2 vers la valeur du CountryCode enum si elle
 * existe dans le projet, sinon `undefined`.
 */
function mapToCountryCode(iso2: string | undefined): CountryCode | undefined {
  if (!iso2) return undefined;
  const upper = iso2.toUpperCase();
  // CountryCode est un enum string où la valeur est l'ISO alpha-2
  return (Object.values(CountryCode) as string[]).includes(upper)
    ? (upper as CountryCode)
    : undefined;
}

/**
 * Extrait un composant nommé d'un tableau `address_components` Google Places.
 */
function extractComponent(
  components: any[] | undefined,
  type: string,
  short = false,
): string | undefined {
  if (!components) return undefined;
  const comp = components.find((c) => c.types?.includes(type));
  if (!comp) return undefined;
  return short ? comp.short_name : comp.long_name;
}

function buildResolvedAddress(place: any): ResolvedAddress {
  const components = place?.address_components ?? [];
  const streetNumber = extractComponent(components, "street_number") ?? "";
  const route = extractComponent(components, "route") ?? "";
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();

  const city =
    extractComponent(components, "locality") ??
    extractComponent(components, "postal_town") ??
    extractComponent(components, "administrative_area_level_2") ??
    "";

  const postalCode = extractComponent(components, "postal_code") ?? "";
  const countryISO = extractComponent(components, "country", true);

  const loc = place?.geometry?.location;
  const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
  const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;

  return {
    street,
    city,
    postalCode,
    country: mapToCountryCode(countryISO),
    lat: typeof lat === "number" ? lat : undefined,
    lng: typeof lng === "number" ? lng : undefined,
    formatted: place?.formatted_address ?? "",
  };
}

export function AddressAutocomplete({
  value,
  onTextChange,
  onResolve,
  placeholder = "Saisir une adresse…",
  disabled = false,
  restrictCountry,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const id = useId();
  const { loaded, loading, error, hasApiKey } = useGoogleMapsScript({
    libraries: ["places"],
  });
  const [warned, setWarned] = useState(false);

  // Initialise l'autocomplete une fois le script chargé et l'input monté.
  useEffect(() => {
    if (!loaded || !inputRef.current) return;
    if (autocompleteRef.current) return; // déjà attaché
    if (!window.google?.maps?.places?.Autocomplete) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["address"],
      componentRestrictions: restrictCountry
        ? { country: restrictCountry.toLowerCase() }
        : undefined,
    });
    autocompleteRef.current = ac;

    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place?.address_components) {
        setWarned(true);
        return;
      }
      setWarned(false);
      const resolved = buildResolvedAddress(place);
      onResolve(resolved);
    });

    return () => {
      try {
        listener?.remove?.();
      } catch {
        // ignore
      }
      try {
        window.google?.maps?.event?.clearInstanceListeners?.(ac);
      } catch {
        // ignore
      }
      autocompleteRef.current = null;
    };
  }, [loaded, restrictCountry, onResolve]);

  // Empêche la soumission de formulaire à l'Enter quand une suggestion est
  // active (pratique courante pour les Autocomplete Google).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  if (!hasApiKey) {
    return (
      <div className="space-y-1">
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
        <p className="text-[10px] text-muted-foreground italic">
          Autocomplétion Google indisponible — saisie manuelle. Configurez{" "}
          <code className="rounded bg-muted px-1 text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          pour l'activer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loaded ? placeholder : "Chargement…"}
          disabled={disabled || loading || !loaded}
          className={cn("pl-8", className)}
          autoComplete="off"
          aria-busy={loading}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && (
        <p className="text-[10px] text-destructive">
          Erreur Google Maps : {error}. Saisie manuelle possible.
        </p>
      )}
      {warned && (
        <p className="text-[10px] text-amber-600">
          La suggestion sélectionnée n'a pas pu être résolue. Réessayez ou
          complétez les champs ci-dessous manuellement.
        </p>
      )}
    </div>
  );
}
