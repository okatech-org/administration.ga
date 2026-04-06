"use client";

import { CountryCode } from "@convex/lib/constants";
import { Loader2, MapPin, X } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
  usePlacesAutocomplete,
  type PlaceDetails,
} from "@/hooks/use-places-autocomplete";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Map country codes from Places API to our CountryCode enum
const mapCountryCode = (code: string): CountryCode => {
  const upperCode = code.toUpperCase();
  if (Object.values(CountryCode).includes(upperCode as CountryCode)) {
    return upperCode as CountryCode;
  }
  return CountryCode.FR;
};

interface AddressWithAutocompleteProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, defaultValue?: any) => any;
}

export function AddressWithAutocomplete({
  form,
  t,
}: AddressWithAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { input, setInput, predictions, isLoading, getPlaceDetails, clear } =
    usePlacesAutocomplete({
      components: "country:fr|country:ga",
      debounceMs: 350,
    });

  // Sync input with form value on mount
  useEffect(() => {
    const streetValue = form.getValues("contactInfo.street");
    if (streetValue && !input) {
      setInput(streetValue);
    }
  }, [form, input, setInput]);

  const handleSelectPrediction = useCallback(
    async (placeId: string) => {
      setIsLoadingDetails(true);
      setShowSuggestions(false);

      const details: PlaceDetails | null = await getPlaceDetails(placeId);
      if (details) {
        // Update all address fields
        form.setValue("contactInfo.street", details.street || "");
        form.setValue("contactInfo.city", details.city || "");
        form.setValue("contactInfo.postalCode", details.postalCode || "");
        if (details.countryCode) {
          form.setValue(
            "contactInfo.country",
            mapCountryCode(details.countryCode),
          );
        }
        clear();
        setInput(details.street || "");
      }
      setIsLoadingDetails(false);
    },
    [getPlaceDetails, form, clear, setInput],
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    form.setValue("contactInfo.street", value);
    if (value.length >= 3) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <>
      {/* Street Address with Autocomplete */}
      <Controller
        name="contactInfo.street"
        control={form.control}
        render={({ fieldState }) => (
          <Field className="relative" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="street">
              {t("profile.address.street")} *
            </FieldLabel>
            <div className="relative">
              <Input
                ref={inputRef}
                id="street"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={t(
                  "profile.address.streetPlaceholder",
                  "Numéro, Rue, Apt",
                )}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                className="pr-10"
              />
              {(isLoading || isLoadingDetails) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && !isLoadingDetails && input && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => {
                    clear();
                    form.setValue("contactInfo.street", "");
                    setInput("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && predictions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    type="button"
                    className="w-full px-3 py-2.5 text-left hover:bg-muted focus:bg-muted outline-none flex items-start gap-2 border-b border-border/30 last:border-0 transition-colors"
                    onClick={() => handleSelectPrediction(prediction.placeId)}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-foreground">
                        {prediction.mainText}
                      </div>
                      {prediction.secondaryText && (
                        <div className="text-xs text-muted-foreground">
                          {prediction.secondaryText}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* City and Postal Code */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="contactInfo.city"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="city">
                {t("profile.address.city")} *
              </FieldLabel>
              <Input id="city" aria-invalid={fieldState.invalid} {...field} />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="contactInfo.postalCode"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="postalCode">
                {t("common.postalCode")} *
              </FieldLabel>
              <Input id="postalCode" {...field} />
            </Field>
          )}
        />
      </div>

      {/* Country */}
      <Controller
        name="contactInfo.country"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="country">
              {t("profile.address.country")}
            </FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="country">
                <SelectValue
                  placeholder={t(
                    "common.selectCountry",
                    "Sélectionner un pays",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CountryCode.FR}>France</SelectItem>
                <SelectItem value={CountryCode.GA}>Gabon</SelectItem>
                <SelectItem value={CountryCode.BE}>Belgique</SelectItem>
                <SelectItem value={CountryCode.CH}>Suisse</SelectItem>
                <SelectItem value={CountryCode.CA}>Canada</SelectItem>
                <SelectItem value={CountryCode.US}>États-Unis</SelectItem>
                <SelectItem value={CountryCode.GB}>Royaume-Uni</SelectItem>
                <SelectItem value={CountryCode.DE}>Allemagne</SelectItem>
                <SelectItem value={CountryCode.ES}>Espagne</SelectItem>
                <SelectItem value={CountryCode.IT}>Italie</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      />
    </>
  );
}
