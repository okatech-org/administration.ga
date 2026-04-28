"use client";

/**
 * AddressInput — Champ d'adresse partagé avec autocomplétion intégrée.
 *
 * Pattern (aligné sur l'inscription citoyen) :
 *   - Le champ "Rue et numéro" est le champ principal qui propose une
 *     autocomplétion via un dropdown de suggestions.
 *   - À la sélection d'une suggestion, les autres champs (ville, code postal,
 *     pays, coordonnées GPS) sont remplis automatiquement.
 *   - Tous les champs restent éditables manuellement.
 *   - Un indicateur de complétion (% des champs requis renseignés) est affiché
 *     en haut, avec un anneau de progression.
 *
 * UI pure — l'autocomplétion est branchée par le parent via une prop
 * `autocomplete` adaptateur (interface `AutocompleteAdapter` ci-dessous).
 * Si non fournie, le composant fonctionne en saisie 100% manuelle.
 */

import { Loader2, MapPin, Navigation, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@workspace/ui/components/button";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

export interface AddressValue {
	street: string;
	city: string;
	postalCode: string;
	country: string;
	lat?: string | number;
	lng?: string | number;
}

export interface AddressPrediction {
	placeId: string;
	mainText: string;
	secondaryText?: string;
}

export interface ResolvedPlace {
	street: string;
	city: string;
	postalCode: string;
	/** Code ISO alpha-2 majuscule. */
	countryCode: string;
	formattedAddress?: string;
	lat?: number;
	lng?: number;
}

/**
 * Adapter d'autocomplétion fourni par l'app.
 * Permet au composant de rester découplé de Convex / Google Places côté
 * package partagé.
 */
export interface AutocompleteAdapter {
	/** Met à jour la saisie courante (déclenche le debounce de prédictions). */
	setInput: (text: string) => void;
	/** Prédictions courantes. */
	predictions: AddressPrediction[];
	/** Vrai pendant le fetch de prédictions. */
	isLoading: boolean;
	/** Récupère les détails complets d'un lieu sélectionné. */
	getPlaceDetails: (placeId: string) => Promise<ResolvedPlace | null>;
	/** Réinitialise les prédictions et la saisie interne. */
	clear: () => void;
}

interface AddressInputProps {
	value: AddressValue;
	onChange: (next: AddressValue) => void;
	/** Adapter d'autocomplétion. Si absent, saisie manuelle uniquement. */
	autocomplete?: AutocompleteAdapter;
	/** Slot pour le sélecteur de pays (Combobox propre à l'app). */
	countrySelector?: ReactNode;
	/** Affiche les coordonnées GPS et le score de complétion. */
	showCoordinates?: boolean;
	/** Affiche l'anneau de complétion en haut (défaut : true). */
	showCompletion?: boolean;
	disabled?: boolean;
	/** Préfixe d'ID pour générer des htmlFor cohérents. */
	idPrefix?: string;
	/** Libellés des champs (i18n côté app). */
	labels?: {
		street?: string;
		streetPlaceholder?: string;
		city?: string;
		postalCode?: string;
		country?: string;
		coordinates?: string;
		latitude?: string;
		longitude?: string;
		completionLabel?: string;
	};
}

const DEFAULT_LABELS = {
	street: "Rue et numéro",
	streetPlaceholder: "Tapez le nom du bâtiment ou une adresse…",
	city: "Ville",
	postalCode: "Code postal",
	country: "Pays",
	coordinates: "Coordonnées GPS",
	latitude: "Latitude",
	longitude: "Longitude",
	completionLabel: "Adresse renseignée",
};

/**
 * Calcule le score de complétion (4 ou 6 champs selon `showCoordinates`).
 */
function computeCompletion(
	value: AddressValue,
	withCoords: boolean,
): { filled: number; total: number; percent: number } {
	const fields = [
		Boolean(value.street?.trim()),
		Boolean(value.city?.trim()),
		Boolean(value.postalCode?.trim()),
		Boolean(value.country?.trim()),
	];
	if (withCoords) {
		fields.push(value.lat !== undefined && String(value.lat).length > 0);
		fields.push(value.lng !== undefined && String(value.lng).length > 0);
	}
	const filled = fields.filter(Boolean).length;
	const total = fields.length;
	return {
		filled,
		total,
		percent: total === 0 ? 0 : Math.round((filled / total) * 100),
	};
}

export function AddressInput({
	value,
	onChange,
	autocomplete,
	countrySelector,
	showCoordinates = true,
	showCompletion = true,
	disabled = false,
	idPrefix,
	labels,
}: AddressInputProps) {
	const L = { ...DEFAULT_LABELS, ...labels };
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [isLoadingDetails, setIsLoadingDetails] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const idStreet = `${idPrefix ?? "addr"}-street`;
	const idCity = `${idPrefix ?? "addr"}-city`;
	const idPostal = `${idPrefix ?? "addr"}-postal`;
	const idLat = `${idPrefix ?? "addr"}-lat`;
	const idLng = `${idPrefix ?? "addr"}-lng`;

	const completion = useMemo(
		() => computeCompletion(value, showCoordinates),
		[value, showCoordinates],
	);

	const updateField = <K extends keyof AddressValue>(
		key: K,
		next: AddressValue[K],
	) => {
		onChange({ ...value, [key]: next });
	};

	const handleStreetChange = (text: string) => {
		updateField("street", text);
		if (autocomplete) {
			autocomplete.setInput(text);
			if (text.length >= 3) setShowSuggestions(true);
		}
	};

	const handleSelect = async (placeId: string) => {
		if (!autocomplete) return;
		setIsLoadingDetails(true);
		setShowSuggestions(false);
		try {
			const details = await autocomplete.getPlaceDetails(placeId);
			if (details) {
				onChange({
					street: details.street || value.street,
					city: details.city || value.city,
					postalCode: details.postalCode || value.postalCode,
					country: (details.countryCode || value.country).toUpperCase(),
					lat: details.lat !== undefined ? String(details.lat) : value.lat,
					lng: details.lng !== undefined ? String(details.lng) : value.lng,
				});
			}
		} finally {
			autocomplete.clear();
			setIsLoadingDetails(false);
		}
	};

	const handleClear = () => {
		updateField("street", "");
		autocomplete?.clear();
	};

	return (
		<FieldGroup>
			{showCompletion && (
				<CompletionBadge
					percent={completion.percent}
					filled={completion.filled}
					total={completion.total}
					label={L.completionLabel}
				/>
			)}

			{/* Rue + autocomplétion */}
			<Field className="relative">
				<FieldLabel htmlFor={idStreet}>{L.street}</FieldLabel>
				<div className="relative">
					<MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						ref={inputRef}
						id={idStreet}
						value={value.street}
						onChange={(e) => handleStreetChange(e.target.value)}
						onFocus={() => {
							if (autocomplete && autocomplete.predictions.length > 0)
								setShowSuggestions(true);
						}}
						onBlur={() => {
							setTimeout(() => setShowSuggestions(false), 200);
						}}
						placeholder={L.streetPlaceholder}
						disabled={disabled || isLoadingDetails}
						autoComplete="off"
						className="pl-8 pr-10"
					/>
					{(autocomplete?.isLoading || isLoadingDetails) && (
						<Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
					)}
					{!autocomplete?.isLoading &&
						!isLoadingDetails &&
						value.street &&
						!disabled && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleClear}
								className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
								aria-label="Effacer"
							>
								<X className="h-3 w-3" />
							</Button>
						)}
				</div>

				{autocomplete &&
					showSuggestions &&
					autocomplete.predictions.length > 0 && (
						<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
							{autocomplete.predictions.map((p) => (
								<button
									key={p.placeId}
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => handleSelect(p.placeId)}
									className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2 text-left outline-none last:border-0 hover:bg-accent focus:bg-accent"
								>
									<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
									<div className="min-w-0">
										<div className="truncate text-sm font-medium">
											{p.mainText}
										</div>
										{p.secondaryText && (
											<div className="truncate text-xs text-muted-foreground">
												{p.secondaryText}
											</div>
										)}
									</div>
								</button>
							))}
						</div>
					)}
			</Field>

			{/* Ville + Code postal */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<Field>
					<FieldLabel htmlFor={idCity}>{L.city}</FieldLabel>
					<Input
						id={idCity}
						value={value.city}
						onChange={(e) => updateField("city", e.target.value)}
						disabled={disabled}
						autoComplete="address-level2"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={idPostal}>{L.postalCode}</FieldLabel>
					<Input
						id={idPostal}
						value={value.postalCode}
						onChange={(e) => updateField("postalCode", e.target.value)}
						disabled={disabled}
						autoComplete="postal-code"
					/>
				</Field>
			</div>

			{/* Pays — slot externe (l'app fournit son Combobox) */}
			{countrySelector && (
				<Field>
					<FieldLabel>{L.country}</FieldLabel>
					{countrySelector}
				</Field>
			)}

			{/* Coordonnées GPS */}
			{showCoordinates && (
				<div className="rounded-lg border border-border/40 p-3 space-y-2">
					<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
						<Navigation className="h-3.5 w-3.5" />
						{L.coordinates}
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Field>
							<FieldLabel
								htmlFor={idLat}
								className="text-xs text-muted-foreground"
							>
								{L.latitude}
							</FieldLabel>
							<Input
								id={idLat}
								type="number"
								step="0.000001"
								value={value.lat ?? ""}
								onChange={(e) => updateField("lat", e.target.value)}
								placeholder="40.416775"
								disabled={disabled}
							/>
						</Field>
						<Field>
							<FieldLabel
								htmlFor={idLng}
								className="text-xs text-muted-foreground"
							>
								{L.longitude}
							</FieldLabel>
							<Input
								id={idLng}
								type="number"
								step="0.000001"
								value={value.lng ?? ""}
								onChange={(e) => updateField("lng", e.target.value)}
								placeholder="-3.703790"
								disabled={disabled}
							/>
						</Field>
					</div>
				</div>
			)}
		</FieldGroup>
	);
}

// ─── Anneau de complétion ──────────────────────────────────────────

function CompletionBadge({
	percent,
	filled,
	total,
	label,
}: {
	percent: number;
	filled: number;
	total: number;
	label: string;
}) {
	// SVG circular progress
	const size = 32;
	const stroke = 3;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (percent / 100) * circumference;
	const colorClass =
		percent >= 100
			? "text-emerald-500"
			: percent >= 60
				? "text-amber-500"
				: "text-muted-foreground";

	return (
		<div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-2">
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="shrink-0"
				role="img"
				aria-label={`${percent}% renseigné`}
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeOpacity={0.15}
					strokeWidth={stroke}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={stroke}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
					className={cn("transition-all", colorClass)}
				/>
				<text
					x="50%"
					y="50%"
					textAnchor="middle"
					dominantBaseline="central"
					className={cn("text-[9px] font-semibold", colorClass)}
					fill="currentColor"
				>
					{percent}%
				</text>
			</svg>
			<div className="text-xs">
				<div className="font-medium">{label}</div>
				<div className="text-[10px] text-muted-foreground">
					{filled} / {total} champs renseignés
				</div>
			</div>
		</div>
	);
}
