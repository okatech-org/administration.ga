"use client";

/**
 * usePlacesAutocomplete — Hook de recherche d'adresses via l'API Places.
 *
 * Appelle les actions Convex `places.autocomplete` et `places.getDetails`
 * (la clé API Google reste privée côté backend). Aucune dépendance Google
 * Maps JS côté client.
 *
 * Copié depuis `apps/citizen-web/src/hooks/use-places-autocomplete.ts` —
 * mêmes endpoints Convex, partagés.
 */

import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "./use-debounce";

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  countryCode: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
};

interface UsePlacesAutocompleteOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Language for results (default: "fr") */
  language?: string;
  /** Restrict to specific countries (e.g., "country:fr|country:ga") */
  components?: string;
  /** Types to search (default: "address") */
  types?: string;
}

export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {},
) {
  const {
    debounceMs = 300,
    language = "fr",
    components,
    types = "address",
  } = options;

  const [input, setInput] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedInput = useDebounce(input, debounceMs);
  const autocompleteAction = useAction(api.functions.places.autocomplete);
  const getDetailsAction = useAction(api.functions.places.getDetails);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!debouncedInput || debouncedInput.length < 3) {
      setPredictions([]);
      return;
    }

    const fetchPredictions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await autocompleteAction({
          input: debouncedInput,
          language,
          components,
          types,
        });

        if (isMounted.current) {
          if (result.success) {
            setPredictions(result.predictions);
          } else {
            setError(result.error || "Failed to fetch predictions");
            setPredictions([]);
          }
        }
      } catch (err) {
        if (isMounted.current) {
          setError((err as Error).message);
          setPredictions([]);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchPredictions();
  }, [debouncedInput, language, components, types, autocompleteAction]);

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      try {
        const result = await getDetailsAction({ placeId, language });
        if (result.success && result.details) {
          return result.details;
        }
        return null;
      } catch {
        return null;
      }
    },
    [getDetailsAction, language],
  );

  const clear = useCallback(() => {
    setInput("");
    setPredictions([]);
    setError(null);
  }, []);

  return {
    input,
    setInput,
    predictions,
    isLoading,
    error,
    getPlaceDetails,
    clear,
  };
}
