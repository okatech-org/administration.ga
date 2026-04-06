"use client";

import { CountryCode } from "@convex/lib/constants";
import { Loader2, MapPin, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  usePlacesAutocomplete,
  type PlaceDetails,
} from "@/hooks/use-places-autocomplete";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: CountryCode;
}

interface AddressAutocompleteProps {
  /** Unique identifier for the field */
  fieldId: string;
  /** Label for the address section */
  label?: string;
  /** Current address value */
  address?: Address;
  /** Callback when address changes */
  onChange: (address: Address) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional list of countries to show */
  countries?: CountryCode[];
  /** Restrict autocomplete to specific countries (e.g., "country:fr|country:ga") */
  autocompleteCountries?: string;
  /** Optional class name for the container */
  className?: string;
  /** Error messages for individual fields */
  errors?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

// Map country codes from Places API to our CountryCode enum
const mapCountryCode = (code: string): CountryCode => {
  const upperCode = code.toUpperCase();
  // Check if it's a valid CountryCode
  if (Object.values(CountryCode).includes(upperCode as CountryCode)) {
    return upperCode as CountryCode;
  }
  return CountryCode.FR; // Default fallback
};

export function AddressAutocomplete({
  fieldId,
  label,
  address,
  onChange,
  disabled,
  countries,
  autocompleteCountries,
  className,
  errors,
}: AddressAutocompleteProps) {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { input, setInput, predictions, isLoading, getPlaceDetails, clear } =
    usePlacesAutocomplete({
      components: autocompleteCountries,
      debounceMs: 350,
    });

  const handleChange = (field: keyof Address, value: string | CountryCode) => {
    onChange({
      street: address?.street ?? "",
      city: address?.city ?? "",
      postalCode: address?.postalCode ?? "",
      country: address?.country ?? CountryCode.FR,
      [field]: value,
    });
  };

  const handleSelectPrediction = useCallback(
    async (placeId: string) => {
      setIsLoadingDetails(true);
      setShowSuggestions(false);

      const details: PlaceDetails | null = await getPlaceDetails(placeId);
      if (details) {
        onChange({
          street: details.street || address?.street || "",
          city: details.city || address?.city || "",
          postalCode: details.postalCode || address?.postalCode || "",
          country:
            details.countryCode ?
              mapCountryCode(details.countryCode)
            : address?.country || CountryCode.FR,
        });
        clear();
      }
      setIsLoadingDetails(false);
    },
    [getPlaceDetails, onChange, clear, address],
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    handleChange("street", value);
    if (value.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <FieldSet className={cn("col-span-full grid grid-cols-2 gap-4", className)}>
      {label && <FieldLegend variant="label">{label}</FieldLegend>}

      {/* Street Address with Autocomplete */}
      <Field className="col-span-full relative" data-invalid={!!errors?.street}>
        <FieldLabel htmlFor={`${fieldId}-street`}>
          {t("inputs.address.street.label")} *
        </FieldLabel>
        <div className="relative">
          <Input
            ref={inputRef}
            id={`${fieldId}-street`}
            value={input || address?.street || ""}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={t(
              "inputs.address.street.placeholder",
              "Numéro, Rue, Apt",
            )}
            disabled={disabled || isLoadingDetails}
            aria-invalid={!!errors?.street}
            autoComplete="off"
            className="pr-10"
          />
          {(isLoading || isLoadingDetails) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && !isLoadingDetails && (address?.street || input) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                clear();
                handleChange("street", "");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && predictions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent outline-none flex items-start gap-2 border-b border-border/50 last:border-0"
                onClick={() => handleSelectPrediction(prediction.placeId)}
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {prediction.mainText}
                  </div>
                  {prediction.secondaryText && (
                    <div className="text-xs text-muted-foreground truncate">
                      {prediction.secondaryText}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {errors?.street && <FieldError errors={[{ message: errors.street }]} />}
      </Field>

      {/* City and Postal Code */}
      <Field data-invalid={!!errors?.city}>
        <FieldLabel htmlFor={`${fieldId}-city`}>
          {t("inputs.address.city.label")} *
        </FieldLabel>
        <Input
          id={`${fieldId}-city`}
          value={address?.city ?? ""}
          onChange={(e) => handleChange("city", e.target.value)}
          placeholder={t("inputs.address.city.placeholder")}
          disabled={disabled}
          aria-invalid={!!errors?.city}
          autoComplete="address-level2"
        />
        {errors?.city && <FieldError errors={[{ message: errors.city }]} />}
      </Field>

      <Field data-invalid={!!errors?.postalCode}>
        <FieldLabel htmlFor={`${fieldId}-postalCode`}>
          {t("inputs.address.postalCode.label")} *
        </FieldLabel>
        <Input
          id={`${fieldId}-postalCode`}
          value={address?.postalCode ?? ""}
          onChange={(e) => handleChange("postalCode", e.target.value)}
          placeholder={t("inputs.address.postalCode.placeholder")}
          disabled={disabled}
          aria-invalid={!!errors?.postalCode}
          autoComplete="postal-code"
        />
        {errors?.postalCode && (
          <FieldError errors={[{ message: errors.postalCode }]} />
        )}
      </Field>

      {/* Country */}
      <Field className="col-span-full" data-invalid={!!errors?.country}>
        <FieldLabel htmlFor={`${fieldId}-country`}>
          {t("inputs.address.country.label")}
        </FieldLabel>
        <CountrySelect
          id={`${fieldId}-country`}
          type="single"
          selected={address?.country}
          onChange={(value) => handleChange("country", value)}
          {...(countries && { options: countries })}
          disabled={disabled}
        />
        {errors?.country && (
          <FieldError errors={[{ message: errors.country }]} />
        )}
      </Field>
    </FieldSet>
  );
}
