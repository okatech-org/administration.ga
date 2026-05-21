"use client";

/**
 * Sélecteur du scope de diffusion d'un modèle global.
 *
 * v1 : deux modes
 *   - "all"              : toutes les représentations (défaut)
 *   - "specificOrgTypes" : restreint à des types précis (ambassade, consulat…)
 *
 * v2 (à venir) : "specificOrgs" avec picker async par organisation.
 *
 * Remplace progressivement `OrgTypeAccessPicker` qui ne gérait que la
 * liste d'`allowedOrgTypes` (legacy).
 */

import { OrganizationType } from "@convex/lib/constants";
import { Globe, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	RadioGroup,
	RadioGroupItem,
} from "@/components/ui/radio-group";

export type Applicability = "all" | "specificOrgTypes";

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
		description: "Postes prioritaires",
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

export interface ApplicabilityPickerProps {
	applicability: Applicability;
	applicableOrgTypes: string[];
	onChange: (next: {
		applicability: Applicability;
		applicableOrgTypes: string[];
	}) => void;
	label?: string;
}

export function ApplicabilityPicker({
	applicability,
	applicableOrgTypes,
	onChange,
	label = "Diffusion du modèle",
}: ApplicabilityPickerProps) {
	const selected = new Set(applicableOrgTypes);

	function handleModeChange(next: Applicability) {
		onChange({
			applicability: next,
			applicableOrgTypes: next === "specificOrgTypes" ? applicableOrgTypes : [],
		});
	}

	function toggleType(code: string, checked: boolean) {
		const next = new Set(selected);
		if (checked) next.add(code);
		else next.delete(code);
		onChange({
			applicability: "specificOrgTypes",
			applicableOrgTypes: Array.from(next),
		});
	}

	return (
		<div className="flex flex-col gap-4 rounded-md border p-4">
			<div>
				<div className="font-medium">{label}</div>
				<div className="text-sm text-muted-foreground">
					Détermine à quelles représentations ce modèle est proposé.
				</div>
			</div>

			<RadioGroup
				value={applicability}
				onValueChange={(v) => handleModeChange(v as Applicability)}
				className="flex flex-col gap-2"
			>
				<label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 hover:bg-muted/30">
					<RadioGroupItem value="all" id="scope-all" className="mt-0.5" />
					<div className="flex flex-1 items-start gap-2">
						<Globe className="mt-0.5 h-4 w-4 text-emerald-600" />
						<div>
							<Label htmlFor="scope-all" className="cursor-pointer font-medium">
								Toutes les représentations
							</Label>
							<div className="text-sm text-muted-foreground">
								Disponible pour ambassades, consulats et missions sans
								distinction.
							</div>
						</div>
					</div>
				</label>

				<label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 hover:bg-muted/30">
					<RadioGroupItem
						value="specificOrgTypes"
						id="scope-types"
						className="mt-0.5"
					/>
					<div className="flex flex-1 items-start gap-2">
						<Lock className="mt-0.5 h-4 w-4 text-amber-600" />
						<div>
							<Label htmlFor="scope-types" className="cursor-pointer font-medium">
								Types spécifiques de représentation
							</Label>
							<div className="text-sm text-muted-foreground">
								Choisir un ou plusieurs types d'organisation (ambassade,
								consulat…).
							</div>
						</div>
					</div>
				</label>
			</RadioGroup>

			{applicability === "specificOrgTypes" ? (
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

			{applicability === "specificOrgTypes" && selected.size === 0 ? (
				<p className="pl-6 text-xs text-amber-700">
					Aucun type coché — ce modèle ne sera pas proposé. Coche au moins un
					type ou sélectionne « Toutes les représentations ».
				</p>
			) : null}
		</div>
	);
}
