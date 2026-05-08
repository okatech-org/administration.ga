"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
	getAllCountriesSorted,
	getCountryFlag,
} from "@workspace/shared/utils/country";
import type { ComboboxOption } from "@workspace/ui/components/combobox";

interface UseCountryOptionsOpts {
	/**
	 * Valeur sentinelle pour l'option « tous les pays ». Doit être unique
	 * (par défaut `"__all__"`). Le composant appelant compare contre cette
	 * valeur pour distinguer la sélection vide.
	 */
	allValue?: string;
	/** Libellé de l'option « tous ». Si fourni, écrase la traduction. */
	allLabelOverride?: string;
}

/**
 * Construit la liste des options pays pour un <Combobox>.
 *
 * Utilise les clés i18n `common.countryCodes.{ISO}` (~250 pays référencés
 * dans `packages/i18n/locales/fr.json`) au lieu d'une carte hardcodée
 * partielle. Les pays sont triés par nom traduit dans la locale active,
 * avec drapeau emoji + code ISO en suffixe.
 */
export function useCountryOptions({
	allValue = "__all__",
	allLabelOverride,
}: UseCountryOptionsOpts = {}): ComboboxOption[] {
	const { t, i18n } = useTranslation();

	return useMemo(() => {
		const codes = getAllCountriesSorted().map((c) => c.code);

		const labels = codes.map((code) => {
			const translated = t(`common.countryCodes.${code}`, {
				defaultValue: code,
			});
			return { code, name: translated };
		});

		labels.sort((a, b) => a.name.localeCompare(b.name, i18n.language || "fr"));

		const allLabel =
			allLabelOverride ?? t("common.allCountries", { defaultValue: "Tous les pays" });

		return [
			{ value: allValue, label: allLabel },
			...labels.map(({ code, name }) => ({
				value: code,
				label: `${getCountryFlag(code)} ${name} (${code})`,
			})),
		];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [t, i18n.language, allValue, allLabelOverride]);
}
