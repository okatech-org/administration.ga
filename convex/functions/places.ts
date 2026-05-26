/**
 * Google Places API (New) integration for address autocomplete
 * Uses GOOGLE_CLOUD_MAPS_API with Places API (New) enabled in Google Cloud Console
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview
 */
import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";

const AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export type PlaceAutocompleteResult = {
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

/**
 * Search for address suggestions using Google Places Autocomplete (New)
 */
export const autocomplete = action({
  args: {
    input: v.string(),
    types: v.optional(v.string()),
    language: v.optional(v.string()),
    components: v.optional(v.string()), // e.g., "country:fr|country:ga"
  },
  handler: async (
    _,
    { input, types: _types, language, components },
  ): Promise<{
    success: boolean;
    predictions: PlaceAutocompleteResult[];
    error?: string;
  }> => {
    if (!input || input.length < 3) {
      return { success: true, predictions: [] };
    }

    const apiKey = process.env.GOOGLE_CLOUD_MAPS_API;
    if (!apiKey) {
      return {
        success: false,
        predictions: [],
        error: "API key not configured",
      };
    }

    try {
      // Parse "country:fr|country:ga" → ["fr", "ga"]
      const regionCodes = components
        ? components
            .split("|")
            .map((c) => c.replace("country:", "").trim())
            .filter(Boolean)
        : undefined;

      const body: Record<string, unknown> = {
        input,
        languageCode: language || "fr",
      };

      if (regionCodes && regionCodes.length > 0) {
        body.includedRegionCodes = regionCodes;
      }

      // Note: "address" is not a valid includedPrimaryTypes value in Places API (New).
      // Omitting it returns all types including addresses, which is the desired behavior.

      const response = await fetch(AUTOCOMPLETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Places API error:", data.error?.message || data);
        return {
          success: false,
          predictions: [],
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      const predictions: PlaceAutocompleteResult[] = (
        data.suggestions || []
      )
        .filter((s: any) => s.placePrediction)
        .map((s: any) => {
          const p = s.placePrediction;
          return {
            placeId: p.placeId,
            description: p.text?.text || "",
            mainText: p.structuredFormat?.mainText?.text || p.text?.text || "",
            secondaryText: p.structuredFormat?.secondaryText?.text || "",
          };
        });

      return { success: true, predictions };
    } catch (error) {
      console.error("Places autocomplete error:", error);
      return {
        success: false,
        predictions: [],
        error: (error as Error).message,
      };
    }
  },
});

/**
 * Geocode a free-form address string → { lat, lng } via Google Geocoding API.
 * Used by the superadmin profiles backfill to populate
 * `addresses.residence.coordinates` for profiles that have a textual address
 * but no GPS coordinates.
 */
export const geocodeAddress = internalAction({
  args: {
    address: v.string(),
    region: v.optional(v.string()), // ISO-2 region biasing, e.g. "fr"
    language: v.optional(v.string()),
  },
  handler: async (
    _,
    { address, region, language },
  ): Promise<{
    success: boolean;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    error?: string;
  }> => {
    const apiKey = process.env.GOOGLE_CLOUD_MAPS_API;
    if (!apiKey) {
      return { success: false, error: "API key not configured" };
    }
    if (!address || address.trim().length < 3) {
      return { success: false, error: "Address too short" };
    }

    try {
      const params = new URLSearchParams({
        address: address.trim(),
        key: apiKey,
        language: language || "fr",
      });
      if (region) params.set("region", region.toLowerCase());

      const response = await fetch(`${GEOCODE_URL}?${params.toString()}`);
      const data = await response.json();

      if (data.status === "ZERO_RESULTS") {
        return { success: false, error: "ZERO_RESULTS" };
      }
      if (data.status !== "OK" || !data.results?.length) {
        return {
          success: false,
          error: data.error_message || data.status || `HTTP ${response.status}`,
        };
      }

      const top = data.results[0];
      const loc = top.geometry?.location;
      if (loc?.lat == null || loc?.lng == null) {
        return { success: false, error: "No location in geocoding result" };
      }

      return {
        success: true,
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: top.formatted_address,
      };
    } catch (error) {
      console.error("Geocoding error:", error);
      return { success: false, error: (error as Error).message };
    }
  },
});

/**
 * Get detailed address components from a place ID (New)
 */
export const getDetails = action({
  args: {
    placeId: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (
    _,
    { placeId, language },
  ): Promise<{
    success: boolean;
    details?: PlaceDetails;
    error?: string;
  }> => {
    const apiKey = process.env.GOOGLE_CLOUD_MAPS_API;
    if (!apiKey) {
      return { success: false, error: "API key not configured" };
    }

    try {
      const url = `${DETAILS_URL}/${placeId}?languageCode=${language || "fr"}`;

      const response = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "addressComponents,formattedAddress,location",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      const components = data.addressComponents || [];

      const getComponent = (types: string[]): string => {
        const component = components.find((c: { types: string[] }) =>
          types.some((t) => c.types.includes(t)),
        );
        return component?.longText || "";
      };

      const getShortComponent = (types: string[]): string => {
        const component = components.find((c: { types: string[] }) =>
          types.some((t) => c.types.includes(t)),
        );
        return component?.shortText || "";
      };

      const streetNumber = getComponent(["street_number"]);
      const route = getComponent(["route"]);
      const street = streetNumber ? `${streetNumber} ${route}` : route;

      const details: PlaceDetails = {
        street,
        city:
          getComponent(["locality"]) ||
          getComponent(["administrative_area_level_2"]),
        postalCode: getComponent(["postal_code"]),
        country: getComponent(["country"]),
        countryCode: getShortComponent(["country"]),
        formattedAddress: data.formattedAddress || "",
        lat: data.location?.latitude,
        lng: data.location?.longitude,
      };

      return { success: true, details };
    } catch (error) {
      console.error("Places details error:", error);
      return { success: false, error: (error as Error).message };
    }
  },
});
