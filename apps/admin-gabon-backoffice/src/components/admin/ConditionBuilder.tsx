"use client";

import type { FieldCondition } from "@/components/admin/FormBuilder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const OPERATORS = [
	{ value: "equals", label: "Égal à" },
	{ value: "notEquals", label: "Différent de" },
	{ value: "contains", label: "Contient" },
	{ value: "isEmpty", label: "Est vide" },
	{ value: "isNotEmpty", label: "N'est pas vide" },
] as const;

interface ConditionBuilderProps {
	condition?: FieldCondition;
	onChange: (condition: FieldCondition | undefined) => void;
	availableFields?: { path: string; label: string }[];
}

export function ConditionBuilder({
	condition,
	onChange,
	availableFields,
}: ConditionBuilderProps) {
	const handleToggle = (enabled: boolean) => {
		if (enabled) {
			onChange({
				fieldPath: "",
				operator: "equals",
				value: "",
			});
		} else {
			onChange(undefined);
		}
	};

	const updateCondition = (updates: Partial<FieldCondition>) => {
		if (!condition) return;
		onChange({ ...condition, ...updates });
	};

	const showValueInput = !["isEmpty", "isNotEmpty"].includes(
		condition?.operator || "",
	);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs uppercase text-muted-foreground">
					Affichage conditionnel
				</Label>
				<Switch checked={!!condition} onCheckedChange={handleToggle} />
			</div>

			{condition && (
				<div className="space-y-2 p-3 bg-muted/50 rounded-md">
					<div className="space-y-1">
						<Label className="text-xs">Champ à vérifier</Label>
						{availableFields && availableFields.length > 0 ? (
							<select
								className="w-full h-9 px-2 text-sm rounded-md border bg-background"
								value={condition.fieldPath}
								onChange={(e) => updateCondition({ fieldPath: e.target.value })}
							>
								<option value="">Sélectionner un champ...</option>
								{availableFields.map((field) => (
									<option key={field.path} value={field.path}>
										{field.label}
									</option>
								))}
							</select>
						) : (
							<Input
								placeholder="section.fieldId"
								value={condition.fieldPath}
								onChange={(e) => updateCondition({ fieldPath: e.target.value })}
							/>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-xs">Opérateur</Label>
							<select
								className="w-full h-9 px-2 text-sm rounded-md border bg-background"
								value={condition.operator}
								onChange={(e) =>
									updateCondition({
										operator: e.target.value as FieldCondition["operator"],
									})
								}
							>
								{OPERATORS.map((op) => (
									<option key={op.value} value={op.value}>
										{op.label}
									</option>
								))}
							</select>
						</div>

						{showValueInput && (
							<div className="space-y-1">
								<Label className="text-xs">Valeur</Label>
								<Input
									placeholder="Valeur attendue"
									value={String(condition.value || "")}
									onChange={(e) => updateCondition({ value: e.target.value })}
								/>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
