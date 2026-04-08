import { api } from "@convex/_generated/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { useUserCountry } from "@/hooks/useUserCountry";
import { getCountryName } from "@/lib/country-utils";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface LocationContextValue {
  /** Pays detecte ou selectionne (code ISO 2 lettres) */
  country: string | null;
  /** Nom lisible du pays ("France", "Espagne") */
  countryName: string;
  /** Organisation consulaire competente */
  org: { _id: string; name: string; website?: string; type: string } | null;
  /** Lien vers le site dedie de l'org */
  orgWebsite: string | null;
  /** Override manuel du pays */
  setJurisdiction: (code: string | null) => void;
  /** true si l'usager a force un pays */
  isManualOverride: boolean;
  /** Chargement en cours */
  isLoading: boolean;
  /** true si des guides existent pour ce pays */
  isSupported: boolean;
  /** Pays ayant des guides disponibles */
  availableCountries: string[];
}

const JURISDICTION_KEY = "citizen_jurisdiction";

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const LocationContext = createContext<LocationContextValue>({
  country: null,
  countryName: "",
  org: null,
  orgWebsite: null,
  setJurisdiction: () => {},
  isManualOverride: false,
  isLoading: true,
  isSupported: false,
  availableCountries: [],
});

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function LocationProvider({ children }: { children: ReactNode }) {
  // Override manuel persiste en localStorage
  const [manualOverride, setManualOverride] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(JURISDICTION_KEY);
  });

  // Detection automatique (profil connecte ou IP)
  const { country: detectedCountry, isLoading: countryLoading } =
    useUserCountry();

  // Le pays effectif = override manuel OU detection auto
  const effectiveCountry = manualOverride ?? detectedCountry;
  const isManualOverride = manualOverride !== null;

  // Charger l'org competente pour le pays
  const { data: jurisdictionOrgs } = useConvexQuery(
    api.functions.orgs.listByJurisdiction,
    effectiveCountry ? { residenceCountry: effectiveCountry } : "skip",
  );

  // Charger les pays avec guides disponibles
  const { data: availableCountries } = useConvexQuery(
    api.functions.guides.listAvailableCountries,
    {},
  );

  // Selectionner la premiere org (la plus pertinente)
  const org = useMemo(() => {
    if (!jurisdictionOrgs || jurisdictionOrgs.length === 0) return null;
    return jurisdictionOrgs[0];
  }, [jurisdictionOrgs]);

  const setJurisdiction = useCallback((code: string | null) => {
    setManualOverride(code);
    if (code) {
      localStorage.setItem(JURISDICTION_KEY, code);
    } else {
      localStorage.removeItem(JURISDICTION_KEY);
    }
  }, []);

  const value = useMemo<LocationContextValue>(() => {
    const countries = availableCountries ?? [];
    return {
      country: effectiveCountry,
      countryName: effectiveCountry
        ? getCountryName(effectiveCountry)
        : "",
      org: org
        ? {
            _id: org._id,
            name: org.name,
            website: org.website,
            type: org.type,
          }
        : null,
      orgWebsite: org?.website ?? null,
      setJurisdiction,
      isManualOverride,
      isLoading: countryLoading,
      isSupported:
        effectiveCountry !== null &&
        countries.includes(effectiveCountry),
      availableCountries: countries,
    };
  }, [
    effectiveCountry,
    org,
    setJurisdiction,
    isManualOverride,
    countryLoading,
    availableCountries,
  ]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useLocationContext() {
  return useContext(LocationContext);
}
