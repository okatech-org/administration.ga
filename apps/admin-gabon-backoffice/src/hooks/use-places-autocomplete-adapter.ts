"use client";

/**
 * usePlacesAutocompleteAdapter — Adapter prêt à passer à `<AddressInput>`.
 *
 * Wrap `usePlacesAutocomplete` pour produire l'interface `AutocompleteAdapter`
 * attendue par le composant partagé `@workspace/ui/components/address-input`.
 * Mutualisé entre les écrans qui exposent une saisie d'adresse autocomplétée
 * (settings → AddressesSection, création de représentation, etc.).
 */

import { useMemo } from "react";
import type { AutocompleteAdapter } from "@workspace/ui/components/address-input";
import { usePlacesAutocomplete } from "./use-places-autocomplete";

export function usePlacesAutocompleteAdapter(): AutocompleteAdapter {
	const hook = usePlacesAutocomplete({ debounceMs: 350 });
	return useMemo(
		() => ({
			setInput: hook.setInput,
			predictions: hook.predictions.map((p) => ({
				placeId: p.placeId,
				mainText: p.mainText,
				secondaryText: p.secondaryText,
			})),
			isLoading: hook.isLoading,
			getPlaceDetails: async (placeId: string) => {
				const details = await hook.getPlaceDetails(placeId);
				if (!details) return null;
				return {
					street: details.street,
					city: details.city,
					postalCode: details.postalCode,
					countryCode: details.countryCode,
					formattedAddress: details.formattedAddress,
					lat: details.lat,
					lng: details.lng,
				};
			},
			clear: hook.clear,
		}),
		[
			hook.setInput,
			hook.predictions,
			hook.isLoading,
			hook.getPlaceDetails,
			hook.clear,
		],
	);
}
