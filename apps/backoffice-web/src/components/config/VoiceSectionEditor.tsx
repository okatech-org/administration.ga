"use client";

/**
 * Éditeur contrôlé de la facette « Voix / Argumentaire » — métier IA
 * uniquement (pas rendu dans le PDF).
 */

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Register =
	| "administratif"
	| "juridique"
	| "commercial"
	| "diplomatique"
	| "neutre";
type Pronoun = "je" | "nous" | "le_consulat" | "impersonnel";
type Politeness = "neutre" | "courtois" | "solennel";
type TemplateType =
	| "certificate"
	| "attestation"
	| "receipt"
	| "letter"
	| "custom";

interface Formula {
	text: string;
	templateType?: TemplateType;
}

interface VocabularyEntry {
	prefer: string;
	avoid: string[];
}

export interface VoiceSectionValue {
	tone: string;
	register: Register;
	openingFormulas: Formula[];
	closingFormulas: Formula[];
	signatureFormulas: string[];
	personPronoun: Pronoun;
	useFormalAddress: boolean;
	politenessLevel: Politeness;
	argumentationGuidelines: string;
	vocabularyPreferences: VocabularyEntry[];
}

export function createDefaultVoiceSection(): VoiceSectionValue {
	return {
		tone: "Formel et institutionnel",
		register: "administratif",
		openingFormulas: [
			{ text: "Par la présente, il est attesté que…" },
		],
		closingFormulas: [
			{
				text: "Je vous prie d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
			},
		],
		signatureFormulas: ["Fait à [Lieu], le [Date]."],
		personPronoun: "le_consulat",
		useFormalAddress: true,
		politenessLevel: "courtois",
		argumentationGuidelines: [
			"- Toujours citer la référence du dossier en tête de document.",
			"- Rester factuel : énoncer les faits avérés, éviter les suppositions.",
			"- Conclure par une formule de politesse adaptée au destinataire.",
		].join("\n"),
		vocabularyPreferences: [],
	};
}

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
	certificate: "Certificat",
	attestation: "Attestation",
	receipt: "Récépissé",
	letter: "Lettre",
	custom: "Personnalisé",
};

export interface VoiceSectionEditorProps {
	value: VoiceSectionValue;
	onChange: (next: VoiceSectionValue) => void;
}

export function VoiceSectionEditor({ value, onChange }: VoiceSectionEditorProps) {
	function patch<K extends keyof VoiceSectionValue>(
		key: K,
		next: VoiceSectionValue[K],
	) {
		onChange({ ...value, [key]: next });
	}
	function addOpening() {
		patch("openingFormulas", [...value.openingFormulas, { text: "" }]);
	}
	function removeOpening(idx: number) {
		patch(
			"openingFormulas",
			value.openingFormulas.filter((_, i) => i !== idx),
		);
	}
	function patchOpening(idx: number, partial: Partial<Formula>) {
		patch(
			"openingFormulas",
			value.openingFormulas.map((f, i) =>
				i === idx ? { ...f, ...partial } : f,
			),
		);
	}
	function addClosing() {
		patch("closingFormulas", [...value.closingFormulas, { text: "" }]);
	}
	function removeClosing(idx: number) {
		patch(
			"closingFormulas",
			value.closingFormulas.filter((_, i) => i !== idx),
		);
	}
	function patchClosing(idx: number, partial: Partial<Formula>) {
		patch(
			"closingFormulas",
			value.closingFormulas.map((f, i) =>
				i === idx ? { ...f, ...partial } : f,
			),
		);
	}
	function addSignature() {
		patch("signatureFormulas", [...value.signatureFormulas, ""]);
	}
	function removeSignature(idx: number) {
		patch(
			"signatureFormulas",
			value.signatureFormulas.filter((_, i) => i !== idx),
		);
	}
	function addVocab() {
		patch("vocabularyPreferences", [
			...value.vocabularyPreferences,
			{ prefer: "", avoid: [] },
		]);
	}
	function removeVocab(idx: number) {
		patch(
			"vocabularyPreferences",
			value.vocabularyPreferences.filter((_, i) => i !== idx),
		);
	}
	function patchVocab(idx: number, partial: Partial<VocabularyEntry>) {
		patch(
			"vocabularyPreferences",
			value.vocabularyPreferences.map((v, i) =>
				i === idx ? { ...v, ...partial } : v,
			),
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Ton et registre</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-tone">Ton (libellé libre)</Label>
						<Input
							id="voice-tone"
							value={value.tone}
							onChange={(e) => patch("tone", e.target.value)}
							placeholder="Formel et institutionnel"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-register">Registre</Label>
						<Select
							value={value.register}
							onValueChange={(v) => patch("register", v as Register)}
						>
							<SelectTrigger id="voice-register">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="administratif">Administratif</SelectItem>
								<SelectItem value="juridique">Juridique</SelectItem>
								<SelectItem value="commercial">Commercial</SelectItem>
								<SelectItem value="diplomatique">Diplomatique</SelectItem>
								<SelectItem value="neutre">Neutre</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Règles linguistiques</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-pronoun">Personne grammaticale</Label>
						<Select
							value={value.personPronoun}
							onValueChange={(v) => patch("personPronoun", v as Pronoun)}
						>
							<SelectTrigger id="voice-pronoun">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="je">Je</SelectItem>
								<SelectItem value="nous">Nous</SelectItem>
								<SelectItem value="le_consulat">
									Le consulat / L'ambassade
								</SelectItem>
								<SelectItem value="impersonnel">
									Impersonnel (« il est attesté… »)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-politeness">Niveau de politesse</Label>
						<Select
							value={value.politenessLevel}
							onValueChange={(v) =>
								patch("politenessLevel", v as Politeness)
							}
						>
							<SelectTrigger id="voice-politeness">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="neutre">Neutre</SelectItem>
								<SelectItem value="courtois">Courtois</SelectItem>
								<SelectItem value="solennel">Solennel</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex items-center justify-between rounded-md border bg-background p-3">
					<Label className="cursor-pointer">
						Utiliser le vouvoiement systématiquement
					</Label>
					<Switch
						checked={value.useFormalAddress}
						onCheckedChange={(v) => patch("useFormalAddress", v)}
					/>
				</div>
			</section>

			<FormulaEditor
				title="Formules d'ouverture"
				emptyLabel="Aucune formule — l'IA n'utilisera pas de préambule type."
				formulas={value.openingFormulas}
				onAdd={addOpening}
				onRemove={removeOpening}
				onPatch={patchOpening}
				placeholder="Par la présente, il est attesté que…"
			/>

			<FormulaEditor
				title="Formules de clôture"
				emptyLabel="Aucune formule."
				formulas={value.closingFormulas}
				onAdd={addClosing}
				onRemove={removeClosing}
				onPatch={patchClosing}
				placeholder="Je vous prie d'agréer…"
			/>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div className="flex items-center justify-between">
					<h3 className="font-medium">Formules de signature</h3>
					<Button type="button" variant="ghost" size="sm" onClick={addSignature}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Ajouter
					</Button>
				</div>
				<ul className="flex flex-col gap-2">
					{value.signatureFormulas.map((s, idx) => (
						<li key={idx} className="flex items-center gap-2">
							<Input
								value={s}
								onChange={(e) =>
									patch(
										"signatureFormulas",
										value.signatureFormulas.map((v, i) =>
											i === idx ? e.target.value : v,
										),
									)
								}
								placeholder="Fait à [Lieu], le [Date]."
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => removeSignature(idx)}
							>
								<X className="h-4 w-4" />
							</Button>
						</li>
					))}
				</ul>
			</section>

			<section className="flex flex-col gap-3 rounded-md border p-4">
				<div>
					<h3 className="font-medium">Directives d'argumentaire</h3>
					<p className="text-sm text-muted-foreground">
						Contexte injecté dans le prompt IA. Markdown toléré.
					</p>
				</div>
				<Textarea
					rows={6}
					value={value.argumentationGuidelines}
					onChange={(e) => patch("argumentationGuidelines", e.target.value)}
					placeholder="- Toujours citer la référence du dossier…"
				/>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-medium">Préférences lexicales</h3>
						<p className="text-sm text-muted-foreground">
							Termes à privilégier et termes à éviter.
						</p>
					</div>
					<Button type="button" variant="ghost" size="sm" onClick={addVocab}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Ajouter
					</Button>
				</div>
				{value.vocabularyPreferences.length === 0 ? (
					<p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
						Aucune préférence définie.
					</p>
				) : (
					<ul className="flex flex-col gap-3">
						{value.vocabularyPreferences.map((v, idx) => (
							<li
								key={idx}
								className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_auto]"
							>
								<div className="flex flex-col gap-1">
									<Label>Préférer</Label>
									<Input
										value={v.prefer}
										onChange={(e) =>
											patchVocab(idx, { prefer: e.target.value })
										}
										placeholder="usager"
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label>Éviter (séparés par des virgules)</Label>
									<Input
										value={v.avoid.join(", ")}
										onChange={(e) =>
											patchVocab(idx, {
												avoid: e.target.value
													.split(",")
													.map((s) => s.trim())
													.filter(Boolean),
											})
										}
										placeholder="client, consommateur"
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeVocab(idx)}
									className="self-end"
								>
									<X className="h-4 w-4" />
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

// ─── Sous-composant formule ─────────────────────────────────────────────

function FormulaEditor({
	title,
	emptyLabel,
	formulas,
	onAdd,
	onRemove,
	onPatch,
	placeholder,
}: {
	title: string;
	emptyLabel: string;
	formulas: Formula[];
	onAdd: () => void;
	onRemove: (idx: number) => void;
	onPatch: (idx: number, partial: Partial<Formula>) => void;
	placeholder: string;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-md border p-4">
			<div className="flex items-center justify-between">
				<h3 className="font-medium">{title}</h3>
				<Button type="button" variant="ghost" size="sm" onClick={onAdd}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Ajouter
				</Button>
			</div>
			{formulas.length === 0 ? (
				<p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
					{emptyLabel}
				</p>
			) : (
				<ul className="flex flex-col gap-3">
					{formulas.map((f, idx) => (
						<li
							key={idx}
							className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_180px_auto]"
						>
							<Textarea
								rows={2}
								value={f.text}
								onChange={(e) => onPatch(idx, { text: e.target.value })}
								placeholder={placeholder}
							/>
							<Select
								value={f.templateType ?? "__any__"}
								onValueChange={(v) =>
									onPatch(idx, {
										templateType:
											v === "__any__" ? undefined : (v as TemplateType),
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__any__">Tous les types</SelectItem>
									{(Object.keys(TEMPLATE_TYPE_LABELS) as TemplateType[]).map(
										(t) => (
											<SelectItem key={t} value={t}>
												{TEMPLATE_TYPE_LABELS[t]}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => onRemove(idx)}
							>
								<X className="h-4 w-4" />
							</Button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

// ============================================================================
// Sérialiseurs — nettoient les formules vides avant persistance
// ============================================================================

export function serializeVoiceSection(value: VoiceSectionValue) {
	return {
		tone: value.tone,
		register: value.register,
		openingFormulas: value.openingFormulas.filter((f) => f.text.trim().length > 0),
		closingFormulas: value.closingFormulas.filter((f) => f.text.trim().length > 0),
		signatureFormulas: value.signatureFormulas.filter((s) => s.trim().length > 0),
		personPronoun: value.personPronoun,
		useFormalAddress: value.useFormalAddress,
		politenessLevel: value.politenessLevel,
		argumentationGuidelines: value.argumentationGuidelines || undefined,
		vocabularyPreferences: value.vocabularyPreferences.filter(
			(p) => p.prefer.trim().length > 0,
		),
	};
}

export function deserializeVoiceSection(
	raw: Partial<VoiceSectionValue> | undefined,
): VoiceSectionValue {
	if (!raw) return createDefaultVoiceSection();
	const defaults = createDefaultVoiceSection();
	return {
		...defaults,
		...raw,
		openingFormulas: raw.openingFormulas ?? defaults.openingFormulas,
		closingFormulas: raw.closingFormulas ?? defaults.closingFormulas,
		signatureFormulas: raw.signatureFormulas ?? defaults.signatureFormulas,
		vocabularyPreferences: (raw.vocabularyPreferences ?? []).map((v) => ({
			prefer: v.prefer,
			avoid: v.avoid ?? [],
		})),
		argumentationGuidelines:
			raw.argumentationGuidelines ?? defaults.argumentationGuidelines,
	};
}
