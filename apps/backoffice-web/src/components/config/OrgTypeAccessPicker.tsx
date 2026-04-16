"use client";

/**
 * Picker réutilisable pour définir la liste des types d'organisation
 * autorisés à utiliser un modèle global (liste + clone).
 *
 * - Valeur vide ou undefined → « Tous les types » (pas de restriction)
 * - Sinon → seuls les types listés ont accès
 */

import { OrganizationType } from "@convex/lib/constants";
import { Globe, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

/** Types actifs affichés à l'utilisateur (labels FR + description courte). */
const ORG_TYPE_OPTIONS: Array<{
	value: string;
	label: string;
	description: string;
}> = [
	{
		value: OrganizationType.Embassy,
		label: "Ambassade",
		description: "Représentation diplomatique classique",
	},
	{
		value: OrganizationType.HighRepresentation,
		label: "Ambassade — Haute Représentation",
		description: "Postes prioritaires (ex. France, Maroc)",
	},
	{
		value: OrganizationType.GeneralConsulate,
		label: "Consulat Général",
		description: "Services consulaires à l'étranger",
	},
	{
		value: OrganizationType.HighCommission,
		label: "Haut-Commissariat",
		description: "Pays du Commonwealth",
	},
	{
		value: OrganizationType.PermanentMission,
		label: "Mission Permanente",
		description: "Auprès d'organisations internationales (ONU…)",
	},
	{
		value: OrganizationType.ThirdParty,
		label: "Partenaire tiers",
		description: "Organisation externe associée",
	},
];

export interface OrgTypeAccessPickerProps {
	/** Types actuellement autorisés. undefined / vide = tous. */
	value: string[] | undefined;
	onChange: (next: string[] | undefined) => void;
	/** Texte optionnel surtitre. */
	label?: string;
}

export function OrgTypeAccessPicker({
	value,
	onChange,
	label = "Accès par type d'organisation",
}: OrgTypeAccessPickerProps) {
	// Un tableau (même vide) signifie « restriction activée » — l'utilisateur
	// doit cocher au moins un type. `undefined` = aucune restriction.
	const isRestricted = Array.isArray(value);
	const selected = new Set(value ?? []);

	function toggleRestriction(restricted: boolean) {
		if (restricted) {
			// Par défaut, restreindre à aucun type — l'utilisateur doit en cocher.
			onChange([]);
		} else {
			onChange(undefined);
		}
	}

	function toggleType(code: string, checked: boolean) {
		const next = new Set(selected);
		if (checked) next.add(code);
		else next.delete(code);
		onChange(Array.from(next));
	}

	return (
		<div className="flex flex-col gap-3 rounded-md border p-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-start gap-2">
					{isRestricted ? (
						<Lock className="mt-0.5 h-4 w-4 text-amber-600" />
					) : (
						<Globe className="mt-0.5 h-4 w-4 text-emerald-600" />
					)}
					<div>
						<div className="font-medium">{label}</div>
						<div className="text-sm text-muted-foreground">
							{isRestricted
								? "Restreint à certains types d'organisation seulement"
								: "Accessible à toutes les organisations"}
						</div>
					</div>
				</div>
				<Switch
					checked={isRestricted}
					onCheckedChange={(checked) => toggleRestriction(checked)}
					aria-label="Restreindre par type d'organisation"
				/>
			</div>

			{isRestricted ? (
				<div className="grid gap-2 pl-6 sm:grid-cols-2">
					{ORG_TYPE_OPTIONS.map((opt) => {
						const checked = selected.has(opt.value);
						return (
							<label
								key={opt.value}
								className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2 hover:bg-muted/30"
							>
								<Checkbox
									checked={checked}
									onCheckedChange={(v) => toggleType(opt.value, v === true)}
									className="mt-0.5"
								/>
								<div className="flex-1">
									<div className="text-sm font-medium">{opt.label}</div>
									<div className="text-xs text-muted-foreground">
										{opt.description}
									</div>
								</div>
							</label>
						);
					})}
				</div>
			) : null}

			{isRestricted && selected.size === 0 ? (
				<p className="pl-6 text-xs text-amber-700">
					Aucun type coché — personne ne pourra utiliser ce modèle. Coche au moins
					un type ou désactive la restriction.
				</p>
			) : null}
		</div>
	);
}
